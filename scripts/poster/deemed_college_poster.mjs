// The deemed universities' college-wise poster (owner, 2026-10-24: "sirf Deemed universities only college
// wise… more better tarike se format/visualise karo"). One row per deemed college, ranked most competitive
// first; one column per branch; each cell this year's closing rank, last year's under it, and the change in green
// (closed at a later rank) or red (closed earlier, tougher) — the first poster's style; the owner found a shaded
// version too colourful. General / Paid seats only — MCC's "Self-Financed Merit Seat" — which carry no reservation.
// Every figure is read from mcc_allotments when the script runs.
//
//   node --env-file=.env.local scripts/poster/deemed_college_poster.mjs [--year 2026] [--round "Round 1"]
//        [--page-height 2400] [--out <dir>]
//
// Writes <out>/neet-pg-<last>-vs-<year>-<round>-deemed-college-wise-p<N>.png (2160 px wide) and one PDF.

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
const PAGE_HEIGHT = Number(arg("page-height", "2400"));
const OUT = resolve(arg("out", "."));

// ­ is a soft hyphen: a long single-word heading breaks there, and only if it must.
const BRANCHES = [
  { course: "MD Dermatology, Venereology & Leprosy", deg: "MD", head: "Dermato­logy" },
  { course: "MD Radio Diagnosis", deg: "MD", head: "Radio-Diagnosis" },
  { course: "MD General Medicine", deg: "MD", head: "General Medicine" },
  { course: "MD Paediatrics", deg: "MD", head: "Paediatrics" },
  { course: "MS Obstetrics & Gynaecology", deg: "MS", head: "Obs & Gynae" },
  { course: "MD Tuberculosis & Respiratory Diseases", deg: "MD", head: "Respiratory Med." },
  { course: "MS General Surgery", deg: "MS", head: "General Surgery" },
  { course: "MS Orthopaedics", deg: "MS", head: "Ortho­paedics" },
];

const isPaid = (q) => /self.?financed|paid seat|management/i.test(q ?? "");
// MCC's 2025 "SRM MEDICAL COLLEGE HOSPITAL AND RESEARCH CENTRE, SRM IST, KATTANKULATHUR, CHENGALPATTU DIST" was
// attached to Trichy SRM (2061, not a deemed university); it is SRM Kattankulathur (1523), where 2026's rows sit.
// Checked by hand on 2026-10-24 against MCC's full wording in both years.
const SAME_AS = new Map([[2061, 1523]]);
const placeOf = (r) => (r.institute_id == null ? null : SAME_AS.get(r.institute_id) ?? r.institute_id);

const STATE_FOLD = { pondicherry: "Puducherry", orissa: "Odisha", chattisgarh: "Chhattisgarh" };
const foldState = (s) => (s ? STATE_FOLD[s.trim().toLowerCase()] ?? s.trim() : "");
const ADDRESS = /\b(?:road|rd|marg|street|lane|sector|block|plot|no|post|p\.?o|village|vill|dist|district|tehsil|taluk|near|opp|highway|nh)\b/i;
const cleanName = (s) => {
  const segs = s
    .replace(/\s*\([^)]*\)/g, "")
    .split(",")
    .map((x) => x.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
  return [segs[0], ...segs.slice(1).filter((x) => !/\d/.test(x) && !ADDRESS.test(x))].join(", ");
};
const median = (xs) => {
  if (!xs.length) return Infinity;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// ------------------------------------------------------------------ data
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`
  SELECT a.year, c.name AS course, a.quota, a.allotted_category AS acat, a.rank, a.source_title, a.institute_id,
         i.name, s.name AS state
    FROM mcc_allotments a JOIN courses c ON c.id = a.course_id
    LEFT JOIN institutes i ON i.id = a.institute_id
    LEFT JOIN states s ON s.id = i.state_id
   WHERE a.round = ${ROUND} AND a.year IN (${LAST}, ${YEAR})
     AND a.quota ~* 'self.?financed|paid seat|management|non.?resident|minority'`;
await sql.end();
if (!rows.some((r) => r.year === YEAR)) throw new Error(`no ${YEAR} ${ROUND} allotments loaded`);

const colleges = new Map();
let unplaced = 0;
for (const r of rows) {
  const id = placeOf(r);
  if (!id) {
    unplaced++;
    continue;
  }
  const c = colleges.get(id) ?? { id, name: "", state: "", cut: BRANCHES.map(() => ({})), nri: false, minority: new Set(), paid: false };
  // The name and state are the college's own record, never a row placed on it by SAME_AS.
  if (r.institute_id === id && r.name && !c.name) {
    c.name = cleanName(r.name);
    c.state = foldState(r.state);
  }
  if (isPaid(r.quota)) {
    if (/disab|pwd/i.test(r.acat ?? "")) continue;
    c.paid = true;
    const bi = BRANCHES.findIndex((b) => b.course === r.course);
    if (bi >= 0) c.cut[bi][r.year] = Math.max(c.cut[bi][r.year] ?? 0, r.rank);
  } else if (r.year === YEAR) {
    if (/non.?resident/i.test(r.quota)) c.nri = true;
    const m = /(jain|muslim) minority/i.exec(r.quota);
    if (m) c.minority.add(m[1][0].toUpperCase() + m[1].slice(1).toLowerCase());
  }
  colleges.set(id, c);
}
if (unplaced) console.warn(`! ${unplaced} rows with no college, left out`);

// Only colleges with paid seats in these branches; most competitive first (median of this year's ranks).
const list = [...colleges.values()]
  .filter((c) => c.paid && c.cut.some((y) => y[YEAR] != null || y[LAST] != null))
  .map((c) => ({ ...c, key: median(c.cut.map((y) => y[YEAR]).filter((v) => v != null)), keyLast: median(c.cut.map((y) => y[LAST]).filter((v) => v != null)) }))
  .sort((a, b) => a.key - b.key || a.keyLast - b.keyLast || a.name.localeCompare(b.name));
const lastOnly = list.filter((c) => !c.cut.some((y) => y[YEAR] != null));
if (lastOnly.length) console.log(`  ${LAST} only: ${lastOnly.map((c) => `${c.id} ${c.name}`).join("; ")}`);

const titleOf = (y) => rows.find((r) => r.year === y)?.source_title ?? "";
const provisional = /provisional/i.test(titleOf(YEAR));
const dated = /dated\s+([\d.]+)/i.exec(titleOf(YEAR))?.[1] ?? null;

// The figures in the insight strip, all counted from the same rows.
const paidRows = rows.filter((r) => isPaid(r.quota) && !/disab|pwd/i.test(r.acat ?? ""));
const collegesIn = (y) => new Set(paidRows.filter((r) => r.year === y).map(placeOf)).size;
const seatsIn = (y) => paidRows.filter((r) => r.year === y).length;
const cellRanks = (y) => list.flatMap((c) => c.cut.map((x) => x[y]).filter((v) => v != null));
const stats = [
  { label: "Deemed universities", a: collegesIn(LAST), b: collegesIn(YEAR) },
  { label: "Paid seats allotted (all branches)", a: seatsIn(LAST), b: seatsIn(YEAR) },
  { label: "Median closing rank (these 8 branches)", a: median(cellRanks(LAST)), b: median(cellRanks(YEAR)) },
];

// ------------------------------------------------------------------ html
const TABLE_CSS = `/* ---------- a tighter title, since every page carries it */
.title{padding-top:20px}
h1{font-size:86px;letter-spacing:-2.8px}
h1 .vs{font-size:52px;margin:0 15px 0 13px}
.ribbon{margin-top:14px;padding:7px 7px 7px 26px}
.ribbon .l{font-size:29px}
.ribbon .r{font-size:26px;padding:11px 26px}
.prov{margin-top:12px;padding:8px 18px 8px 14px;font-size:17px}
.prov svg{width:21px;height:21px}
.pg{display:inline-flex;align-items:center;margin:12px 0 0 10px;padding:8px 16px;border-radius:999px;background:#fff;border:1.5px solid #cfdae8;
  font:800 16px/1 Figtree,sans-serif;color:var(--navy-2);vertical-align:top}

/* ---------- the year in three figures (page 1) */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 16px 0}
.stat{padding:12px 16px;border-radius:14px;background:#fff;border:1px solid #d9e2ee}
.stat .k{font:700 12px/1.2 Inter,sans-serif;letter-spacing:.4px;text-transform:uppercase;color:var(--muted)}
.stat .v{margin-top:6px;font:800 30px/1 Figtree,sans-serif;color:var(--navy);font-variant-numeric:tabular-nums}
.stat .v small{font:600 14px/1 Inter,sans-serif;color:var(--muted);margin-left:8px}

/* ---------- the table: plain cells, the change in green or red */
.t{width:calc(100% - 32px);margin:14px 16px 0;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;
  border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(11,36,71,.10),0 0 0 1px #d4deeb}
col.c-no{width:34px}col.c-name{width:262px}
thead th{color:#fff;text-align:center;background:var(--navy);font:800 14px/1.12 Figtree,sans-serif;padding:9px 3px 10px;vertical-align:middle}
thead th + th + th{border-left:1px solid rgba(255,255,255,.18)}
thead th small{display:block;font:700 10.5px/1 Inter,sans-serif;letter-spacing:1.2px;opacity:.75;margin-bottom:4px}
thead th.name{text-align:left;padding-left:10px}
thead th.name small{letter-spacing:0;opacity:1;color:#a9bad1;font-size:11px;margin:3px 0 0}
tbody td{text-align:center;vertical-align:middle;white-space:nowrap;padding:6px 2px;border-bottom:1px solid var(--line);background:#fff}
tbody td + td + td{border-left:1px solid var(--line)}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even) td{background:#f6f8fb}
td.no{font:700 12.5px/1 Inter,sans-serif;color:var(--muted)}
td.name{text-align:left;white-space:normal;padding:6px 8px 6px 10px}
td.name b{display:block;font:700 13px/1.2 Inter,sans-serif;color:var(--navy);letter-spacing:-.1px}
td.name span{display:block;margin-top:3px;font:500 11px/1.3 Inter,sans-serif;color:var(--muted)}
td.name i{display:inline-block;font-style:normal;margin-left:5px;padding:0 5px;border-radius:4px;border:1px solid #cdd6e3;
  font:700 9.5px/1.5 Inter,sans-serif;letter-spacing:.3px;color:#4a5a72;vertical-align:1px}
td.r{font-family:'Roboto Condensed',sans-serif;font-variant-numeric:tabular-nums}
td.r b{display:block;font-weight:700;font-size:16px;line-height:1.1;color:var(--navy)}
td.r em{display:block;font-style:normal;font-size:11px;line-height:1.25;margin-top:2px;color:#5d6c82}
td.r i{display:block;font-style:normal;font-weight:700;font-size:12px;line-height:1.25}
td.r i.up{color:var(--up)}td.r i.down{color:var(--down)}td.r i.zero{color:var(--muted)}
td.r .na{color:#a3b0c1;font-weight:400}
`;

const head =
  `<tr><th class="no">#</th><th class="name">Deemed university<small>Most competitive first (median of its ${YEAR} ranks)</small></th>` +
  BRANCHES.map((b) => `<th><small>${b.deg}</small>${esc(b.head)}</th>`).join("") +
  `</tr>`;

// The change as the first poster printed it: green + when the rank closed later, red − when it closed earlier.
const change = (a, b) => {
  if (a == null || b == null) return "";
  const d = b - a;
  return d > 0 ? `<i class="up">+${num(d)}</i>` : d < 0 ? `<i class="down">−${num(-d)}</i>` : `<i class="zero">0</i>`;
};
const cellHtml = (cut) => {
  const a = cut[LAST] ?? null;
  const b = cut[YEAR] ?? null;
  const last = `<em>${LAST}: ${a == null ? "–" : num(a)}</em>`;
  if (b == null) return `<td class="r"><b><span class="na">–</span></b>${a != null ? last : ""}</td>`;
  return `<td class="r"><b>${num(b)}</b>${last}${change(a, b)}</td>`;
};
const rowHtml = (c, n) => {
  const tags = (c.nri ? `<i class="nri">NRI SEATS</i>` : "") + [...c.minority].map((m) => `<i class="min">${m.toUpperCase()} MINORITY</i>`).join("");
  return `<tr><td class="no">${n}</td><td class="name"><b>${esc(c.name)}</b><span>${esc(c.state)}${tags}</span></td>${c.cut.map(cellHtml).join("")}</tr>`;
};

const basis = `General / Paid seats · ${provisional ? `${YEAR} rank based on provisional result` : `${LAST} and ${YEAR}: MCC's final results`}`;
const sourceLine =
  `Closing rank = the highest All India Rank allotted in that branch at that college on its General / Paid seats — MCC's “Self-Financed Merit Seat” ` +
  `(${LAST}: “Self-Financed Merit Seat/(Paid Seat Quota)”), open to all categories — in MCC's ${esc(ROUND)} ` +
  `(${LAST}: final result; ${YEAR}: ${provisional ? "provisional" : "final"} result${dated ? ` dated ${dated}` : ""}). ` +
  `Tags: the college also allotted NRI or minority seats in ${YEAR}.`;

const statsHtml =
  `<div class="stats">` +
  stats.map((s) => `<div class="stat"><div class="k">${esc(s.label)}</div><div class="v">${num(Math.round(s.b))}<small>${LAST}: ${num(Math.round(s.a))}</small></div></div>`).join("") +
  `</div>`;

const logoB64 = logo();
const doc = (bodyRows, pageNo, pages, span, first) =>
  page({
    title: `NEET PG ${LAST} vs ${YEAR} — MCC ${ROUND} — deemed universities, college-wise`,
    css: TABLE_CSS,
    body: `${headerHtml(logoB64)}

${titleHtml({ last: LAST, year: YEAR, ribbon: `MCC ${ROUND.toUpperCase()} CLOSING RANKS`, pill: "DEEMED UNIVERSITIES", basis,
  after: pages ? `<span class="pg">Page ${pageNo} of ${pages} · ${esc(span)}</span>` : "" })}
  ${first ? statsHtml : ""}

  <div class="legend">${icon(I.info)}<p><b>How to read:</b> big number = ${YEAR} ${esc(ROUND)} closing rank on General / Paid seats, small = ${LAST}.
    <span class="up">Green change (+)</span> = closing rank went higher in ${YEAR} (seat closed at a later rank); <span class="down">Red change (−)</span> = closing rank went lower in ${YEAR} (more competitive).
    “–” = no paid seat allotted in that branch that year.</p></div>

  <table class="t">
    <colgroup><col class="c-no"><col class="c-name">${"<col>".repeat(BRANCHES.length)}</colgroup>
    <thead>${head}</thead>
    <tbody>
${bodyRows}
    </tbody>
  </table>
  <p class="src">${sourceLine}</p>

${footerHtml()}`,
  });

// ------------------------------------------------------------------ measure, paginate, render
mkdirSync(OUT, { recursive: true });
const base = `neet-pg-${LAST}-vs-${YEAR}-${ROUND.toLowerCase().replace(/\s+/g, "-")}-deemed-college-wise`;
let { browser, tab } = await openBrowser();
async function renderPage(htmlPath, pngPath) {
  for (let attempt = 1; ; attempt++) {
    try {
      await load(tab, htmlPath);
      await shoot(tab, pngPath);
      return await tab.evaluate(() => Math.round(document.querySelector(".poster").getBoundingClientRect().height));
    } catch (e) {
      if (attempt > 1) throw e;
      await browser.close().catch(() => {});
      ({ browser, tab } = await openBrowser());
    }
  }
}

// Every row's height, and the frame's on the first page (with the three figures) and on the others.
const allRows = list.map((c, i) => rowHtml(c, i + 1));
const measure = async (first) => {
  const p = join(OUT, `${base}-measure.html`);
  writeFileSync(p, doc(allRows.join("\n"), 1, 9, "Measuring", first));
  const fonts = await load(tab, p);
  if (fonts.length) console.warn("! fonts not loaded:", fonts.join(", "));
  return tab.evaluate(() => {
    const body = document.querySelector(".t tbody");
    const tight = [...body.querySelectorAll("td.r b")].filter((b) => b.scrollWidth > b.clientWidth + 0.5).length;
    return {
      frame: document.querySelector(".poster").getBoundingClientRect().height - body.getBoundingClientRect().height,
      heights: [...body.rows].map((r) => r.getBoundingClientRect().height),
      tight,
    };
  });
};
const m1 = await measure(true);
const m2 = await measure(false);
if (m1.tight) console.warn(`! ${m1.tight} figures wider than their tile`);

// Fill the pages evenly: as many pages as the budget needs, the rows split as equally as heights allow.
const total = m1.heights.reduce((s, h) => s + h, 0);
const pagesNeeded = Math.max(1, Math.ceil((total + m1.frame - m2.frame) / (PAGE_HEIGHT - m2.frame)));
const target = total / pagesNeeded;
const pages = Array.from({ length: pagesNeeded }, () => []);
let before = 0;
list.forEach((c, i) => {
  // A row goes to the page its middle falls on.
  pages[Math.min(pagesNeeded - 1, Math.floor((before + m1.heights[i] / 2) / target))].push(i);
  before += m1.heights[i];
});

const files = [];
const bodies = [];
let tallest = 0;
for (let p = 0; p < pages.length; p++) {
  const from = pages[p][0] + 1;
  const to = pages[p][pages[p].length - 1] + 1;
  const span = `colleges ${from}–${to}`;
  const htmlPath = join(OUT, `${base}-p${p + 1}.html`);
  const pngPath = join(OUT, `${base}-p${p + 1}.png`);
  const html = doc(pages[p].map((i) => allRows[i]).join("\n"), p + 1, pages.length, span, p === 0);
  writeFileSync(htmlPath, html);
  bodies.push(html.slice(html.indexOf('<div class="poster">') + '<div class="poster">'.length, html.lastIndexOf("</div>")));
  const h = await renderPage(htmlPath, pngPath);
  tallest = Math.max(tallest, h);
  files.push(pngPath);
  console.log(`  page ${p + 1}/${pages.length}: ${span} · ${h}px`);
}

// One PDF of the same pages; a shorter page keeps its footer at the bottom.
const PDF_CSS = `@page{size:1080px ${tallest}px;margin:0}
html,body{background:#f4f7fb}
.poster{height:${tallest}px;display:flex;flex-direction:column;break-after:page}
.poster:last-child{break-after:auto}
.poster>.ft{margin-top:auto}`;
const pdfHtmlPath = join(OUT, `${base}.html`);
writeFileSync(
  pdfHtmlPath,
  page({ title: `NEET PG ${LAST} vs ${YEAR} — deemed universities, college-wise`, css: TABLE_CSS + PDF_CSS, body: bodies.join(`\n</div>\n<div class="poster">\n`) }),
);
await load(tab, pdfHtmlPath);
const pdfPath = join(OUT, `${base}.pdf`);
await tab.pdf({ path: pdfPath, width: "1080px", height: `${tallest}px`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
files.push(pdfPath);
await browser.close();

const cells = list.flatMap((c) => c.cut);
console.log(
  `${list.length} deemed colleges · ${BRANCHES.length} branches · ${cells.filter((c) => c[YEAR] != null).length} ${YEAR} ranks, ` +
    `${cells.filter((c) => c[LAST] != null).length} ${LAST} ranks · ${pages.length} pages · ` +
    stats.map((s) => `${s.label}: ${Math.round(s.a)} → ${Math.round(s.b)}`).join(" · "),
);
for (const f of files) console.log(f);
