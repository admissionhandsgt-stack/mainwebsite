// The "NEET PG <last year> vs <this year>" closing-rank poster (owner, 2026-10-24): MCC's All India Quota,
// branch by branch, the last rank allotted in each category in this year's round against last year's same
// round. Every figure is read from mcc_allotments when the script runs. Nothing is typed in: the hand-made
// first version garbled eleven ranks and carried the Diploma in Radiation Medicine's figures under MD Radiation
// Oncology.
//
//   node --env-file=.env.local scripts/poster/round_cuts_poster.mjs [--set aiq|deemed] [--year 2026] [--round "Round 1"] [--out <dir>]
//
// --set aiq (default): All India Quota, one column group per category, the owner's branch list.
// --set deemed: deemed universities, one group per seat type — general/paid (MCC's "Self-Financed Merit
// Seat"), NRI, and the Jain and Muslim minority quotas (shaded where allotted) — over every MD/MS branch. Deemed seats carry no reservation (every allotment
// is Open), and MCC has no separate "general" deemed seat: the self-financed merit seat is the general one.
//
// Writes <out>/neet-pg-<last>-vs-<year>-<round>[-deemed].html and .png (2160 px wide). Needs the database
// tunnel and network access for the Google Fonts. Rows are ordered by the first group's last-year rank.

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { esc, num, icon, I, logo, page, headerHtml, titleHtml, footerHtml, openBrowser, load, shoot } from "./kit.mjs";

const require = createRequire(import.meta.url);
const postgres = require("postgres");

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const YEAR = Number(arg("year", "2026"));
const LAST = YEAR - 1;
const ROUND = arg("round", "Round 1");
const OUT = resolve(arg("out", "."));

// Our course names (courses.name). The owner's poster had 30; ENT and Pathology were missing.
const BRANCHES = [
  "MD Nuclear Medicine",
  "MS Traumatology and Surgery",
  "MD Dermatology, Venereology & Leprosy",
  "MD Radio Diagnosis",
  "MD Family Medicine",
  "MD General Medicine",
  "MD Paediatrics",
  "MS Obstetrics & Gynaecology",
  "MD Tuberculosis & Respiratory Diseases",
  "MD Sports Medicine",
  "MD Geriatrics",
  "MS General Surgery",
  "MD Tropical Medicine",
  "MS Orthopaedics",
  "MD Palliative Medicine",
  "MD Emergency Medicine",
  "MD Psychiatry",
  "MS Ophthalmology",
  "MD Radiation Oncology",
  "MS ENT",
  "MD Anaesthesiology",
  "MD Physical Medicine & Rehabilitation",
  "MD Immuno Haematology & Blood Transfusion",
  "MD Hospital Administration",
  "MD Pathology",
  "MD Social & Preventive Medicine",
  "MD Microbiology",
  "MD Pharmacology",
  "MD Forensic Medicine",
  "MD Bio-Chemistry",
  "MD Physiology",
  "MD Anatomy",
];
const CATS = ["Open", "EWS", "OBC", "SC", "ST"];

// MCC's spelling changes by year ("SC" in 2025, "Schedule Caste (SC)" in 2026). PwD seats are not columns here.
const catOf = (c) => {
  if (!c || /disab|pwd/i.test(c)) return null;
  const code = (/\((SC|ST|OBC|EWS)\)/i.exec(c)?.[1] ?? c).trim().toUpperCase();
  return CATS.find((k) => k.toUpperCase() === code) ?? null;
};
const isPaid = (q) => /self.?financed|paid seat|management/i.test(q ?? "");
const isNri = (q) => /non.?resident|\bnri\b/i.test(q ?? "");
const notPwd = (r) => !/disab|pwd/i.test(r.acat ?? "");
const SETS = {
  aiq: {
    pill: "ALL INDIA QUOTA",
    suffix: "",
    branches: BRANCHES,
    groups: CATS.map((c) => ({ tone: c.toLowerCase(), label: `${c} Closing Rank`, has: (r) => r.quota === "All India" && catOf(r.acat) === c })),
    what: "in that branch and category on All India Quota seats",
    note: "",
  },
  deemed: {
    pill: "DEEMED UNIVERSITIES",
    suffix: "-deemed",
    branches: null,
    breakHead: true,
    // The minority quotas are one or two colleges each; the owner asked for them highlighted, not left off.
    groups: [
      { tone: "open", label: "General / Paid Seat Closing Rank", sub: "MCC: Self-Financed Merit Seat", has: (r) => isPaid(r.quota) && notPwd(r) },
      { tone: "sc", label: "NRI Seat Closing Rank", sub: "MCC: Non-Resident Indian", has: (r) => isNri(r.quota) && notPwd(r) },
      { tone: "ews", label: "Jain Minority Seat Closing Rank", sub: "Jain candidates only", community: "Jain", has: (r) => /jain minority/i.test(r.quota ?? "") && notPwd(r) },
      { tone: "st", label: "Muslim Minority Seat Closing Rank", sub: "Muslim candidates only", community: "Muslim", has: (r) => /muslim minority/i.test(r.quota ?? "") && notPwd(r) },
    ],
    what: "in that branch on deemed universities' seats of that type",
    note: " Paid seats are MCC's “Self-Financed Merit Seat” (2025: “Self-Financed Merit Seat/(Paid Seat Quota)”), open to all categories.",
  },
};
const SET = SETS[arg("set", "aiq")];
if (!SET) throw new Error(`--set must be one of: ${Object.keys(SETS).join(", ")}`);
const GROUPS = SET.groups;
const cleanLabel = (s) => s.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim();

// ------------------------------------------------------------------ data
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`
  SELECT a.year, c.name AS course, a.mcc_course, a.quota, a.allotted_category AS acat, a.rank, a.source_title,
         COALESCE(a.institute_id::text, a.mcc_college_name) AS inst, a.mcc_college_name AS cname
    FROM mcc_allotments a JOIN courses c ON c.id = a.course_id
   WHERE a.round = ${ROUND} AND a.year IN (${LAST}, ${YEAR})`;
await sql.end();
if (!rows.some((r) => r.year === YEAR)) throw new Error(`no ${YEAR} ${ROUND} allotments loaded`);

// course -> { labels: Map<MCC label, n>, cut: per group { [year]: { rank, colleges } } }
const data = new Map();
// For a community quota, the colleges that hold it: institute -> { name (this year's wording), years }.
const holders = GROUPS.map(() => new Map());
for (const r of rows) {
  const gi = GROUPS.findIndex((g) => g.has(r));
  if (gi < 0) continue;
  if (GROUPS[gi].community) {
    const h = holders[gi].get(r.inst) ?? { name: "", years: new Set() };
    if (!h.name || r.year === YEAR) h.name = (r.cname ?? "").split(",")[0].trim();
    h.years.add(r.year);
    holders[gi].set(r.inst, h);
  }
  const d = data.get(r.course) ?? { labels: new Map(), cut: GROUPS.map(() => ({})) };
  if (r.year === YEAR && r.mcc_course) d.labels.set(r.mcc_course, (d.labels.get(r.mcc_course) ?? 0) + 1);
  const c = (d.cut[gi][r.year] ??= { rank: 0, colleges: new Set() });
  c.rank = Math.max(c.rank, r.rank);
  c.colleges.add(r.inst);
  data.set(r.course, d);
}
const titleOf = (y) => rows.find((r) => r.year === y)?.source_title ?? "";
const provisional = /provisional/i.test(titleOf(YEAR));
const dated = /dated\s+([\d.]+)/i.exec(titleOf(YEAR))?.[1] ?? null;

const lines = [];
let thin = 0;
for (const course of SET.branches ?? [...data.keys()].filter((c) => /^M[DS] /.test(c))) {
  const d = data.get(course);
  if (!d) {
    console.warn(`! ${course}: no allotment in ${LAST} or ${YEAR} ${ROUND} — left out`);
    continue;
  }
  const label = d.labels.size ? cleanLabel([...d.labels].sort((a, b) => b[1] - a[1])[0][0]) : course;
  const cells = d.cut.map((byYear) => {
    const a = byYear[LAST]?.rank ?? null;
    const b = byYear[YEAR]?.rank ?? null;
    for (const y of [LAST, YEAR]) if (byYear[y] && byYear[y].colleges.size < 3) thin++;
    return { a, b, change: a != null && b != null ? b - a : null };
  });
  lines.push({ course, label, cells });
}
const key = (l) => l.cells[0].a ?? l.cells[0].b ?? Infinity;
lines.sort((x, y) => key(x) - key(y));
if (SET.branches) {
  const unused = [...data.keys()].filter((c) => !SET.branches.includes(c) && /^M[DS] /.test(c));
  if (unused.length) console.log(`  MD/MS branches with ${ROUND} allotments not on the poster: ${unused.join(", ")}`);
}

// ------------------------------------------------------------------ html
const logoB64 = logo();

const roundWord = ROUND.toUpperCase();
const cell = (cls, v) => `<td class="${cls}">${v}</td>`;
const body = lines
  .map((l, i) => {
    const tds = l.cells
      .map((c, j) => {
        // A community quota's cells are filled in where its seats were allotted, so they read at a glance.
        const g = GROUPS[j].tone + (GROUPS[j].community && (c.a != null || c.b != null) ? " hit" : "");
        const ch =
          c.change == null
            ? `<span class="na">–</span>`
            : c.change > 0
              ? `<span class="up">+${num(c.change)}</span>`
              : c.change < 0
                ? `<span class="down">−${num(-c.change)}</span>`
                : `<span class="zero">0</span>`;
        return (
          cell(`${g} v1 gs`, c.a == null ? `<span class="na">–</span>` : num(c.a)) +
          cell(`${g} v2`, c.b == null ? `<span class="na">–</span>` : num(c.b)) +
          cell(`${g} chg`, ch)
        );
      })
      .join("");
    const long = l.label.length > 50 ? " long" : "";
    return `<tr><td class="no">${i + 1}</td><td class="name${long}">${esc(l.label).replace(/\//g, "/<wbr>")}</td>${tds}</tr>`;
  })
  .join("\n");

// The deemed headings are too long for one line at four groups: break every one before "Closing Rank", never
// mid-phrase. The category headings ("Open Closing Rank") fit, and stay on one line.
const headLabel = (g) => (SET.breakHead ? esc(g.label).replace(/ Closing Rank$/, "<br>Closing Rank") : esc(g.label));
const groupHead = GROUPS.map(
  (g) => `<th colspan="3" class="g ${g.tone} gs">${headLabel(g)}${g.sub ? `<small>${esc(g.sub)}</small>` : ""}</th>`,
).join("");
const subHead = GROUPS.map(({ tone: g }) => `<th class="${g} gs">${LAST}</th><th class="${g}">${YEAR}</th><th class="${g}">Change</th>`).join("");

// Who a community quota's seats are for, and which colleges hold them (a college new this year is marked so).
const onlyIn = (ys) => (ys.size > 1 ? "" : ` (${[...ys][0]} only)`);
const minorityNote = GROUPS.map((g, gi) =>
  g.community
    ? `<span><i class="chip ${g.tone}"></i><b>${g.community} Minority</b> — only ${g.community} candidates: ` +
      `${[...holders[gi].values()].map((h) => esc(h.name) + onlyIn(h.years)).join("; ")}</span>`
    : "",
)
  .filter(Boolean)
  .join("");

const basis = provisional ? `${YEAR} rank based on provisional result` : `${LAST} and ${YEAR}: MCC's final results`;
const sourceLine =
  `Closing rank = the highest All India Rank allotted ${SET.what} in MCC's ${esc(ROUND)} ` +
  `(${LAST}: final result; ${YEAR}: ${provisional ? `provisional result${dated ? ` dated ${dated}` : ""}` : "final result"}).${SET.note}`;

// This poster's table styles; the frame's come from kit.mjs, before and after these in the cascade.
const TABLE_CSS = `/* ---------- table */
.t{width:calc(100% - 32px);margin:14px 16px 0;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;
  border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(11,36,71,.10),0 0 0 1px #d4deeb}
col.c-no{width:34px}col.c-name{width:222px}
th{color:#fff;text-align:center;font-weight:800}
thead tr.h1 th{font:800 14.5px/1.15 Figtree,sans-serif;padding:10px 4px;letter-spacing:.1px}
thead tr.h1 th.no,thead tr.h1 th.name{background:var(--navy);font:800 13px/1.2 Figtree,sans-serif}
thead tr.h1 th.name{text-align:left;padding-left:10px}
thead tr.h1 th.name small{display:block;font:600 11px/1.2 Inter,sans-serif;color:#a9bad1;margin-top:2px}
thead tr.h1 th.g small{display:block;font:600 11.5px/1.2 Inter,sans-serif;color:rgba(255,255,255,.86);margin-top:3px;letter-spacing:.2px}
/* Two groups (deemed): the room five category groups need goes to bigger figures and whole branch names. */
.t.n2 col.c-no{width:46px}.t.n2 col.c-name{width:330px}
.t.n2 thead tr.h1 th.g{font-size:16.5px;white-space:nowrap}
.t.n2 tbody td{font-size:18px;height:35px}
.t.n2 td.name{font-size:14.5px;padding-left:12px}
.t.n2 td.no{font-size:13.5px}
.t.n2 thead tr.h1 th{font-size:18px;padding:11px 6px}
.t.n2 thead tr.h1 th.no,.t.n2 thead tr.h1 th.name{font-size:14px}
.t.n2 thead tr.h2 th{font-size:14px;padding:7px 4px}
/* Four groups (deemed with the minority quotas). */
.t.n4 col.c-name{width:236px}
.t.n4 tbody td{font-size:14.5px;height:32px}
.t.n4 thead tr.h1 th.g{font-size:14px;line-height:1.15;padding:8px 4px}
.t.n4 thead tr.h1 th.g small{font-size:10.5px}
.t.n4 thead tr.h2 th{font-size:12px}
/* A community quota's cells, filled in where its seats were allotted. */
.t tbody td.hit.ews{background:#e3d4ff}
.t tbody td.hit.st{background:#c8ebd5}
.t tbody td.hit.v1{color:#24314a;font-weight:500}
.mnote{display:flex;flex-wrap:wrap;gap:4px 22px;align-items:center;margin:10px 16px 0;padding:10px 16px;border-radius:12px;
  background:#fbf8ff;border:1.5px dashed #b9a2ef;font:500 13px/1.45 Inter,sans-serif;color:#33425a}
.mnote b{color:var(--navy);font-weight:800}
.mnote .hint{color:var(--muted);font-size:12.5px}
.chip{display:inline-block;width:13px;height:13px;border-radius:4px;vertical-align:-2px;margin-right:7px}
.chip.ews{background:var(--ews)}.chip.st{background:var(--st)}
thead tr.h2 th{font:700 12px/1 Inter,sans-serif;padding:6px 2px}
th.g.open,th.open{background:var(--open)}tr.h2 th.open{background:var(--open-d)}
th.g.ews,th.ews{background:var(--ews)}tr.h2 th.ews{background:var(--ews-d)}
th.g.obc,th.obc{background:var(--obc)}tr.h2 th.obc{background:var(--obc-d)}
th.g.sc,th.sc{background:var(--sc)}tr.h2 th.sc{background:var(--sc-d)}
th.g.st,th.st{background:var(--st)}tr.h2 th.st{background:var(--st-d)}
th.gs,td.gs{border-left:2px solid #fff}
tbody td{height:31px;padding:0 2px;border-bottom:1px solid var(--line);text-align:center;vertical-align:middle;
  font:400 14px/1 'Roboto Condensed',sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
td.no{font:600 12.5px/1 Inter,sans-serif;color:var(--muted);background:#fff}
td.name{text-align:left;white-space:normal;padding:4px 6px 4px 10px;font:600 12.6px/1.2 Inter,sans-serif;color:var(--navy);background:#fff;letter-spacing:-.1px}
td.name.long{font-size:11.6px;line-height:1.13;letter-spacing:-.15px}
tbody tr:nth-child(even) td.no,tbody tr:nth-child(even) td.name{background:#f4f7fb}
td.v1{color:#3d4b61}
td.v2{color:var(--navy);font-weight:700}
td.chg{font-weight:700}
td .na{color:#9aa8ba;font-weight:400}
td .zero{color:var(--muted)}
td.open{background:var(--open-t)}tbody tr:nth-child(even) td.open{background:var(--open-t2)}
td.ews{background:var(--ews-t)}tbody tr:nth-child(even) td.ews{background:var(--ews-t2)}
td.obc{background:var(--obc-t)}tbody tr:nth-child(even) td.obc{background:var(--obc-t2)}
td.sc{background:var(--sc-t)}tbody tr:nth-child(even) td.sc{background:var(--sc-t2)}
td.st{background:var(--st-t)}tbody tr:nth-child(even) td.st{background:var(--st-t2)}
`;

const html = page({
  title: `NEET PG ${LAST} vs ${YEAR} — MCC ${ROUND} closing ranks — ${SET.pill}`,
  css: TABLE_CSS,
  body: `${headerHtml(logoB64)}

${titleHtml({ last: LAST, year: YEAR, ribbon: `MCC ${roundWord} CLOSING RANKS`, pill: SET.pill, basis })}

  <div class="legend">${icon(I.info)}<p><b>How to read:</b> <span class="up">Green change (+)</span> = closing rank went higher in ${YEAR} (seat closed at a later rank);
    <span class="down">Red change (−)</span> = closing rank went lower in ${YEAR} (more competitive). “–” = no allotment / data not available in that year.</p></div>
  ${minorityNote ? `<div class="mnote">${minorityNote}<span class="hint">Shaded cells = branches where these seats were allotted.</span></div>` : ""}

  <table class="t n${GROUPS.length}">
    <colgroup><col class="c-no"><col class="c-name">${"<col>".repeat(GROUPS.length * 3)}</colgroup>
    <thead>
      <tr class="h1"><th rowspan="2" class="no">S.No</th><th rowspan="2" class="name">Course / Branch<small>(${YEAR} MCC name)</small></th>${groupHead}</tr>
      <tr class="h2">${subHead}</tr>
    </thead>
    <tbody>
${body}
    </tbody>
  </table>
  <p class="src">${sourceLine}</p>

${footerHtml()}`,
});

// ------------------------------------------------------------------ render
mkdirSync(OUT, { recursive: true });
const base = `neet-pg-${LAST}-vs-${YEAR}-${ROUND.toLowerCase().replace(/\s+/g, "-")}${SET.suffix}`;
const htmlPath = join(OUT, `${base}.html`);
const pngPath = join(OUT, `${base}.png`);
writeFileSync(htmlPath, html);

const { browser, tab } = await openBrowser();
const fonts = await load(tab, htmlPath);
const report = await tab.evaluate(() => {
  // A name on more than two lines, or a number wider than its cell, is a layout fault.
  const linesOf = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
  };
  const tall = [...document.querySelectorAll("td.name")].filter((td) => linesOf(td) > 2).map((td) => td.textContent);
  const tight = [...document.querySelectorAll("tbody td:not(.name)")].filter((td) => td.scrollWidth > td.clientWidth + 0.5).map((td) => td.textContent);
  const poster = document.querySelector(".poster").getBoundingClientRect();
  return { tall, tight, w: poster.width, h: Math.round(poster.height) };
});
await shoot(tab, pngPath);
await browser.close();

console.log(`${lines.length} branches · ${YEAR} ${provisional ? "provisional" : "final"} · poster ${report.w}×${report.h} css px`);
console.log(`  ${thin} printed ranks rest on one or two colleges (the website never prints those)`);
if (fonts.length) console.warn("! fonts not loaded:", fonts.join(", "));
if (report.tall.length) console.warn("! names on three lines:", report.tall.join(" | "));
if (report.tight.length) console.warn("! numbers wider than their cell:", report.tight.join(" | "));
for (const l of lines)
  console.log(
    `  ${l.label.padEnd(62)} ${l.cells.map((c) => `${c.a ?? "-"}/${c.b ?? "-"}/${c.change ?? "-"}`).join("  ")}`,
  );
console.log(`
${pngPath}`);
