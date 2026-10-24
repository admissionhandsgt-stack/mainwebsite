// The "NEET PG <last year> vs <this year>" closing-rank poster (owner, 2026-10-24): MCC's All India Quota,
// branch by branch, the last rank allotted in each category in this year's round against last year's same
// round. Every figure is read from mcc_allotments when the script runs. Nothing is typed in: the hand-made
// first version garbled eleven ranks and carried the Diploma in Radiation Medicine's figures under MD Radiation
// Oncology.
//
//   node --env-file=.env.local scripts/poster/round_cuts_poster.mjs [--set aiq|deemed] [--year 2026] [--round "Round 1"] [--out <dir>]
//
// --set aiq (default): All India Quota, one column group per category, the owner's branch list.
// --set deemed: deemed universities, one group per seat type — paid/management (MCC's "Self-Financed Merit
// Seat") and NRI — over every MD/MS branch they allotted. Deemed seats carry no reservation (every allotment
// is Open), and MCC has no separate "general" deemed seat: the self-financed merit seat is the general one.
//
// Writes <out>/neet-pg-<last>-vs-<year>-<round>[-deemed].html and .png (2160 px wide). Needs the database
// tunnel and network access for the Google Fonts. Rows are ordered by the first group's last-year rank.

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const postgres = require("postgres");
const { chromium } = require("playwright");

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const YEAR = Number(arg("year", "2026"));
const LAST = YEAR - 1;
const ROUND = arg("round", "Round 1");
const OUT = resolve(arg("out", "."));
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

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
    groups: [
      { tone: "open", label: "Paid / Management Seat Closing Rank", sub: "MCC: Self-Financed Merit Seat", has: (r) => isPaid(r.quota) && notPwd(r) },
      { tone: "sc", label: "NRI Seat Closing Rank", sub: "MCC: Non-Resident Indian", has: (r) => isNri(r.quota) && notPwd(r) },
    ],
    what: "in that branch on deemed universities' seats of that type",
    note: " Paid seats are MCC's “Self-Financed Merit Seat” (2025: “Self-Financed Merit Seat/(Paid Seat Quota)”), open to all categories.",
  },
};
const SET = SETS[arg("set", "aiq")];
if (!SET) throw new Error(`--set must be one of: ${Object.keys(SETS).join(", ")}`);
const GROUPS = SET.groups;
const cleanLabel = (s) => s.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (n) => n.toLocaleString("en-US");

// ------------------------------------------------------------------ data
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`
  SELECT a.year, c.name AS course, a.mcc_course, a.quota, a.allotted_category AS acat, a.rank, a.source_title,
         COALESCE(a.institute_id::text, a.mcc_college_name) AS inst
    FROM mcc_allotments a JOIN courses c ON c.id = a.course_id
   WHERE a.round = ${ROUND} AND a.year IN (${LAST}, ${YEAR})`;
await sql.end();
if (!rows.some((r) => r.year === YEAR)) throw new Error(`no ${YEAR} ${ROUND} allotments loaded`);

// course -> { labels: Map<MCC label, n>, cut: per group { [year]: { rank, colleges } } }
const data = new Map();
for (const r of rows) {
  const gi = GROUPS.findIndex((g) => g.has(r));
  if (gi < 0) continue;
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
const logo = readFileSync(join(ROOT, "public/icon-512.png")).toString("base64");
const icon = (paths, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
// Lucide icons (ISC licence).
const I = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  college: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

const roundWord = ROUND.toUpperCase();
const cell = (cls, v) => `<td class="${cls}">${v}</td>`;
const body = lines
  .map((l, i) => {
    const tds = l.cells
      .map((c, j) => {
        const g = GROUPS[j].tone;
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

const groupHead = GROUPS.map(
  (g) => `<th colspan="3" class="g ${g.tone} gs">${esc(g.label)}${g.sub ? `<small>${esc(g.sub)}</small>` : ""}</th>`,
).join("");
const subHead = GROUPS.map(({ tone: g }) => `<th class="${g} gs">${LAST}</th><th class="${g}">${YEAR}</th><th class="${g}">Change</th>`).join("");

const basis = provisional ? `${YEAR} rank based on provisional result` : `${LAST} and ${YEAR}: MCC's final results`;
const sourceLine =
  `Closing rank = the highest All India Rank allotted ${SET.what} in MCC's ${esc(ROUND)} ` +
  `(${LAST}: final result; ${YEAR}: ${provisional ? `provisional result${dated ? ` dated ${dated}` : ""}` : "final result"}).${SET.note}`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>NEET PG ${LAST} vs ${YEAR} — MCC ${esc(ROUND)} closing ranks — ${esc(SET.pill)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=Kaushan+Script&family=Montserrat:wght@300;800&family=Roboto+Condensed:wght@400;500;700&display=block" rel="stylesheet">
<style>
:root{
  --navy:#0b2447;--navy-2:#123a66;--ink:#16243b;--muted:#5d6c82;--line:#e3eaf3;
  --mint:#1fd8ae;--teal:#0c9c8b;
  --open:#2f6fe4;--open-d:#2358c2;--open-t:#f0f5ff;--open-t2:#e4edfd;
  --ews:#7a4fe0;--ews-d:#6240c4;--ews-t:#f6f2ff;--ews-t2:#ece4fd;
  --obc:#0f9d8f;--obc-d:#0b8175;--obc-t:#edf9f6;--obc-t2:#dff3ee;
  --sc:#ee6a17;--sc-d:#cf560b;--sc-t:#fff5ed;--sc-t2:#ffe9da;
  --st:#1f9b52;--st-d:#167f41;--st-t:#eef9f2;--st-t2:#e0f2e7;
  --up:#0f7a35;--down:#c8251b;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#dfe6ef}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.poster{width:1080px;background:#f4f7fb;position:relative;overflow:hidden}

/* ---------- header */
.hd{position:relative;height:200px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;color:#fff;
  background:radial-gradient(90% 160% at 0% 0%,#16507f 0%,#0b2447 52%,#071a36 100%)}
.hd::before{content:"";position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);
  background-size:26px 26px;-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 45%,#000 100%)}
.hd::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,var(--mint),#12b5c9 55%,rgba(18,181,201,0))}
.ecg{position:absolute;left:0;right:0;bottom:22px;width:100%;height:70px;color:var(--mint);opacity:.22}
.steth{position:absolute;right:250px;top:-26px;width:250px;height:250px;color:#fff;opacity:.06;stroke-width:1.1}
.brand{position:relative;display:flex;align-items:center;z-index:1}
.shield{width:122px;height:122px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}
.bar{width:3px;height:106px;border-radius:3px;background:var(--mint);margin:0 22px 0 14px}
.w1{font:800 56px/0.95 Montserrat,sans-serif;letter-spacing:1px}
.w2{font:300 47px/1.08 Montserrat,sans-serif;letter-spacing:4px}
.w3{font:700 12.5px/1 Inter,sans-serif;letter-spacing:5.4px;color:#a6efdc;margin-top:12px}
.tag{position:relative;z-index:1;text-align:center;transform:rotate(-7deg);margin-right:6px}
.tag p{font:36px/1.02 'Kaushan Script',cursive;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.25)}
.tag svg{display:block;width:170px;height:16px;margin:4px auto 0;color:var(--mint)}

/* ---------- title */
.title{position:relative;text-align:center;padding:26px 24px 0}
.title::before{content:"";position:absolute;inset:0 0 auto 0;height:220px;pointer-events:none;
  background:radial-gradient(60% 100% at 50% 0%,rgba(31,216,174,.10),transparent 70%)}
h1{position:relative;font:900 104px/1 Figtree,sans-serif;letter-spacing:-3.5px;color:var(--navy);white-space:nowrap}
h1 .y1{color:var(--teal)}
h1 .vs{font-size:62px;letter-spacing:-1px;margin:0 18px 0 16px;color:var(--navy-2)}
.ribbon{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px 14px 0;padding:9px 9px 9px 30px;
  border-radius:20px;background:linear-gradient(90deg,#0b2447,#123a66);box-shadow:0 10px 24px rgba(11,36,71,.22)}
.ribbon .l{font:900 33px/1.1 Figtree,sans-serif;letter-spacing:.4px;color:#fff;white-space:nowrap}
.ribbon .r{font:900 30px/1 Figtree,sans-serif;letter-spacing:.6px;color:#062c2a;white-space:nowrap;padding:13px 30px;border-radius:14px;
  background:linear-gradient(90deg,#3be3bd,#19c3a0)}
.prov{display:inline-flex;align-items:center;gap:10px;margin-top:16px;padding:9px 22px 9px 16px;border-radius:999px;
  background:#e6f8ee;border:1.5px solid #b6e6cb;font:800 21px/1 Figtree,sans-serif;color:var(--navy)}
.prov svg{width:24px;height:24px;color:#14894a}

/* ---------- legend */
.legend{display:flex;gap:10px;align-items:flex-start;margin:16px 16px 0;padding:11px 16px;border-radius:12px;background:#fff;border:1px solid #d9e2ee;
  font:500 13.5px/1.45 Inter,sans-serif;color:#33425a}
.legend svg{flex:none;width:18px;height:18px;margin-top:1px;color:var(--navy-2)}
.legend b{color:var(--navy);font-weight:800}
.legend .up,.legend .down{font-weight:800}
.up{color:var(--up)}.down{color:var(--down)}

/* ---------- table */
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
.src{margin:9px 20px 0;font:500 11.5px/1.4 Inter,sans-serif;color:var(--muted)}

/* ---------- footer */
.ft{position:relative;margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:22px 26px 24px;color:#fff;
  background:radial-gradient(80% 180% at 100% 100%,#0e5a66 0%,#0d3a63 45%,#0b2447 100%)}
.ft::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,rgba(31,216,174,0),var(--mint) 30%,#12b5c9)}
.fi{display:flex;align-items:center;gap:12px}
.ic{flex:none;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:rgba(31,216,174,.13);border:1.5px solid rgba(31,216,174,.55)}
.ic svg{width:26px;height:26px;color:var(--mint)}
.fi b{display:block;font:800 17.5px/1.15 Figtree,sans-serif}
.fi div>span{display:block;font:500 13.5px/1.25 Inter,sans-serif;color:#bccbe0;margin-top:2px}
.sep{width:1px;align-self:stretch;background:rgba(255,255,255,.14)}
.phone{display:flex;align-items:center;gap:12px;padding:8px 22px 8px 8px;border-radius:999px;background:#fff;box-shadow:0 10px 26px rgba(0,0,0,.25)}
.pi{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#18a34a}
.pi svg{width:27px;height:27px;color:#fff}
.phone b{display:block;font:900 35px/1 Figtree,sans-serif;letter-spacing:.6px;color:var(--navy)}
.phone div>span{display:block;font:600 12.5px/1 Inter,sans-serif;color:var(--muted);margin-top:4px;letter-spacing:.3px}
</style></head>
<body>
<div class="poster">
  <header class="hd">
    <svg class="ecg" viewBox="0 0 1080 70" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
      <polyline points="0,40 360,40 380,40 392,22 404,58 418,6 432,52 444,40 700,40 716,40 726,26 736,54 748,14 760,48 770,40 1080,40"/>
    </svg>
    ${icon(I.stethoscope, "steth")}
    <div class="brand">
      <img class="shield" src="data:image/png;base64,${logo}" alt="">
      <span class="bar"></span>
      <div><div class="w1">ADMISSION</div><div class="w2">HANDS</div><div class="w3">YOUR MEDICAL ADMISSION PARTNER</div></div>
    </div>
    <div class="tag"><p>Guiding<br>Your Medical<br>Journey</p>
      <svg viewBox="0 0 170 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 11 C 50 2, 110 2, 166 8"/></svg></div>
  </header>

  <section class="title">
    <h1>NEET PG <span class="y1">${LAST}</span><span class="vs">vs</span>${YEAR}</h1>
    <div class="ribbon"><span class="l">MCC ${esc(roundWord)} CLOSING RANKS</span><span class="r">${esc(SET.pill)}</span></div>
    <div class="prov">${icon(I.megaphone)}${esc(basis)}</div>
  </section>

  <div class="legend">${icon(I.info)}<p><b>How to read:</b> <span class="up">Green change (+)</span> = closing rank went higher in ${YEAR} (seat closed at a later rank);
    <span class="down">Red change (−)</span> = closing rank went lower in ${YEAR} (more competitive). “–” = no allotment / data not available in that year.</p></div>

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

  <footer class="ft">
    <div class="fi"><span class="ic">${icon(I.users)}</span><div><b>Expert Guidance</b><span>for NEET PG Admissions</span></div></div>
    <span class="sep"></span>
    <div class="fi"><span class="ic">${icon(I.clipboard)}</span><div><b>Personalised</b><span>Counselling</span></div></div>
    <span class="sep"></span>
    <div class="fi"><span class="ic">${icon(I.college)}</span><div><b>College Options</b><span>as per your Profile</span></div></div>
    <div class="phone"><span class="pi">${icon(I.phone)}</span><div><b>9310301949</b><span>www.admissionhands.com</span></div></div>
  </footer>
</div>
</body></html>`;

// ------------------------------------------------------------------ render
mkdirSync(OUT, { recursive: true });
const base = `neet-pg-${LAST}-vs-${YEAR}-${ROUND.toLowerCase().replace(/\s+/g, "-")}${SET.suffix}`;
const htmlPath = join(OUT, `${base}.html`);
const pngPath = join(OUT, `${base}.png`);
writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1400 }, deviceScaleFactor: 2 });
await page.route(/google-analytics|googletagmanager|theautoloom/, (r) => r.abort());
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const report = await page.evaluate(() => {
  // Google Fonts registers a face per script subset and loads only the ones the page uses, so a face
  // counts as missing only when no subset of that family and weight loaded.
  const used = [["Figtree", "800"], ["Figtree", "900"], ["Montserrat", "300"], ["Montserrat", "800"], ["Kaushan Script", "400"],
    ["Inter", "500"], ["Inter", "600"], ["Inter", "700"], ["Inter", "800"], ["Roboto Condensed", "400"], ["Roboto Condensed", "700"]];
  const faces = [...document.fonts];
  const fonts = used
    .filter(([f, w]) => !faces.some((x) => x.family.replace(/["']/g, "") === f && String(x.weight) === w && x.status === "loaded"))
    .map(([f, w]) => `${f} ${w}`);
  // A name on more than two lines, or a number wider than its cell, is a layout fault.
  const linesOf = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
  };
  const tall = [...document.querySelectorAll("td.name")].filter((td) => linesOf(td) > 2).map((td) => td.textContent);
  const tight = [...document.querySelectorAll("tbody td:not(.name)")].filter((td) => td.scrollWidth > td.clientWidth + 0.5).map((td) => td.textContent);
  const poster = document.querySelector(".poster").getBoundingClientRect();
  return { fonts, tall, tight, w: poster.width, h: Math.round(poster.height) };
});
await (await page.$(".poster")).screenshot({ path: pngPath });
await browser.close();

console.log(`${lines.length} branches · ${YEAR} ${provisional ? "provisional" : "final"} · poster ${report.w}×${report.h} css px`);
console.log(`  ${thin} printed ranks rest on one or two colleges (the website never prints those)`);
if (report.fonts.length) console.warn("! fonts not loaded:", report.fonts.join(", "));
if (report.tall.length) console.warn("! names on three lines:", report.tall.join(" | "));
if (report.tight.length) console.warn("! numbers wider than their cell:", report.tight.join(" | "));
for (const l of lines)
  console.log(
    `  ${l.label.padEnd(62)} ${l.cells.map((c) => `${c.a ?? "-"}/${c.b ?? "-"}/${c.change ?? "-"}`).join("  ")}`,
  );
console.log(`\n${pngPath}`);
