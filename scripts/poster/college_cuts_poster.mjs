// The college-wise closing-rank poster (owner, 2026-10-24: "college wise… main clinical branches 7-8 max…
// multiple page mai banega to bhi chalega lekin data accurate hona chaiye"). MCC's All India Quota, one row per
// college, one column per branch: this year's round's closing rank, last year's under it, and which way it moved.
// Every figure is read from mcc_allotments when the script runs; nothing is typed in.
//
//   node --env-file=.env.local scripts/poster/college_cuts_poster.mjs [--year 2026] [--round "Round 1"]
//        [--category Open|EWS|OBC|SC|ST] [--page-height 2400] [--out <dir>]
//
// Writes <out>/neet-pg-<last>-vs-<year>-<round>-college-wise-<category>-p<N>.png (2160 px wide), one per page.
// Colleges are grouped by state (A–Z) and, within a state, the most competitive first (lowest closing rank in
// any of the branches). Pages break between states where they can; a state that will not fit continues on the
// next page under "(contd.)".
//
// Every cell is one college's closing rank — the thing the website never prints (the chance-view rule of
// 2026-10-12). The poster is the owner's to publish or not.

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
const CAT = arg("category", "Open");
const PAGE_HEIGHT = Number(arg("page-height", "2400"));
const OUT = resolve(arg("out", "."));

// The eight most competitive clinical branches by MCC's 2025 All India Round 1 open closing rank, in that order.
const BRANCHES = [
  { course: "MD Dermatology, Venereology & Leprosy", deg: "MD", head: "Dermatology" },
  { course: "MD Radio Diagnosis", deg: "MD", head: "Radio-Diagnosis" },
  { course: "MD General Medicine", deg: "MD", head: "General Medicine" },
  { course: "MD Paediatrics", deg: "MD", head: "Paediatrics" },
  { course: "MS Obstetrics & Gynaecology", deg: "MS", head: "Obs & Gynae" },
  { course: "MD Tuberculosis & Respiratory Diseases", deg: "MD", head: "Respiratory Med." },
  { course: "MS General Surgery", deg: "MS", head: "General Surgery" },
  { course: "MS Orthopaedics", deg: "MS", head: "Orthopaedics" },
];
const CATS = ["Open", "EWS", "OBC", "SC", "ST"];
if (!CATS.includes(CAT)) throw new Error(`--category must be one of: ${CATS.join(", ")}`);

// MCC's spelling changes by year ("SC" in 2025, "Schedule Caste (SC)" in 2026). PwD seats are their own categories.
const catOf = (c) => {
  if (!c || /disab|pwd/i.test(c)) return null;
  const code = (/\((SC|ST|OBC|EWS)\)/i.exec(c)?.[1] ?? c).trim().toUpperCase();
  return CATS.find((k) => k.toUpperCase() === code) ?? null;
};

// 2025 rows MCC worded differently from every other round, which the import left without a college. Each is the
// 2026 college named here — checked by hand on 2026-10-24: MCC's 2026 wording carries both names (e.g. 2026's
// "Government Medical College, Bharatpur" reads "…SJP MEDICAL COLLEGE BHARATPUR…"), and the id is the MD/MS
// entry, not the hospital's DNB twin.
const ALIAS = [
  [/^govt\.? medical college,? shivpuri/i, 917], // Shrimant Rajmata Vijayaraje Scindia GMC, Shivpuri
  [/^hinduhridayasamrat balasaheb thackeray medical college/i, 82], // HBT Medical College & Dr RN Cooper Hospital
  [/^pimpri chi?n?chwad municipal corporation post ?graduate institute/i, 59], // PCMC PG Institute, YCM Hospital
  [/^post ?graduate institute of medical sciences \(pgims\),\s*navi mumbai/i, 273],
  [/^shri? ?krishna medical college (?:&|and) hospital,\s*muzaffarpur/i, 435],
  [/^sjp medical college,\s*bharatpur/i, 313],
  // MCC's 2025 "GOVERNMENT MEDICAL COLLEGE - KANNUR" was attached to Kannur Medical College (a private college,
  // no All India seats); it is GMC Kannur at Pariyaram, where MCC's 2026 rows sit.
  [/^government medical college\s*-\s*kannur/i, 77],
];

// One college, two ids: our PG list holds many hospitals twice — the MD/MS entry and a DNB/NBEMS entry named
// with a PIN code — and in one of the two years the import put MCC's All India rows on the second. Split, a
// college shows as two rows with one year each. Each pair checked by hand on 2026-10-24: MCC's own wording in
// the two years names the same college. The id kept is the MD/MS entry.
const SAME_AS = new Map([
  [425, 424], // Jawaharlal Nehru Medical College, Bhagalpur
  [1833, 83], // MP Shah Medical College, Jamnagar
  [407, 263], // Shri Vasantrao Naik GMC, Yavatmal
  [1157, 326], // Shri Bhausaheb Hire GMC, Dhule
  [1861, 188], // Guru Gobind Singh Medical College, Faridkot
  [174, 306], // Government Institute of Medical Sciences, Greater Noida
  [1225, 956], // Maharaja Suheldev ASMC (MCC 2026: Rajkiya Allopathic Medical College), Bahraich
  [1884, 701], // Dr Bhimrao Ramji Ambedkar GMC, Kannauj
  [1262, 60], // Nilratan Sircar Medical College, Kolkata
  [1832, 66], // Medical College, Kolkata (MCC 2026: "Govt. Medical College, Kolkata, MEDICAL COLLEGE, KOLKATA")
  [705, 406], // Atal Bihari Vajpayee GMC, Vidisha (MCC 2026: "Government Medical College, Vidisha", same NH-86 campus)
]);
/** The college a row belongs to: a named correction first, then the import's id, then its MD/MS twin. */
const placeOf = (r) => {
  const id = ALIAS.find(([re]) => re.test(r.mcc ?? ""))?.[1] ?? r.institute_id ?? null;
  return id == null ? null : SAME_AS.get(id) ?? id;
};

// One spelling per state, as the site's own counts fold them.
const STATE_FOLD = { pondicherry: "Puducherry", orissa: "Odisha", chattisgarh: "Chhattisgarh", "jammu & kashmir": "Jammu and Kashmir" };
const foldState = (s) => (s ? STATE_FOLD[s.trim().toLowerCase()] ?? s.trim() : null);

// A college's name for a poster row: no bracketed former names or notes ("(Prev. …)"), no trailing address
// segment carrying a PIN code ("…, Kannur, Kerala-670612"), no double spaces.
// After the first, a segment with a number or an address word is an address ("138", "AJC Bose Road", "Sector 32").
const ADDRESS = /\b(?:road|rd|marg|street|lane|sector|block|plot|no|post|p\.?o|village|vill|dist|district|tehsil|taluk|near|opp|highway|nh)\b/i;
const cleanName = (s) => {
  const segs = s
    .replace(/\s*\([^)]*\)/g, "")
    .split(",")
    .map((x) => x.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
  return [segs[0], ...segs.slice(1).filter((x) => !/\d/.test(x) && !ADDRESS.test(x))].join(", ");
};
// Names worth a second look before the poster goes out: digits left in, or a long run of capitals.
const odd = (s) =>
  /\d/.test(s) || /[A-Z]{6,}/.test(s.replace(/\b(?:AIIMS|JIPMER|PGIMER|SGPGIMS|NEIGRIHMS|SKIMS|PGIMSR|PGIMS|IGIMS|KGMU|GSVM)\b/g, ""));

// ------------------------------------------------------------------ data
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`
  SELECT a.year, c.name AS course, a.allotted_category AS acat, a.rank, a.source_title, a.institute_id, a.mcc_college_name AS mcc
    FROM mcc_allotments a JOIN courses c ON c.id = a.course_id
   WHERE a.round = ${ROUND} AND a.quota = 'All India' AND a.year IN (${LAST}, ${YEAR})
     AND c.name IN ${sql(BRANCHES.map((b) => b.course))}`;
const ids = new Set(rows.map(placeOf).filter(Boolean));
const institutes = new Map(
  (
    await sql`SELECT i.id, i.name, s.name AS state FROM institutes i LEFT JOIN states s ON s.id = i.state_id WHERE i.id IN ${sql([...ids])}`
  ).map((i) => [i.id, i]),
);
await sql.end();
if (!rows.some((r) => r.year === YEAR)) throw new Error(`no ${YEAR} ${ROUND} allotments loaded`);

const colleges = new Map(); // institute id -> { name, state, cut: [{ [year]: rank } per branch] }
const unplaced = new Set();
for (const r of rows) {
  if (catOf(r.acat) !== CAT) continue;
  const id = placeOf(r);
  if (!id || !institutes.has(id)) {
    unplaced.add(`${r.year} ${(r.mcc ?? "").slice(0, 80)}`);
    continue;
  }
  const inst = institutes.get(id);
  const c = colleges.get(id) ?? { id, name: cleanName(inst.name), state: foldState(inst.state) ?? "Other", cut: BRANCHES.map(() => ({})) };
  const bi = BRANCHES.findIndex((b) => b.course === r.course);
  c.cut[bi][r.year] = Math.max(c.cut[bi][r.year] ?? 0, r.rank);
  colleges.set(id, c);
}
if (unplaced.size) console.warn(`! ${unplaced.size} MCC college names placed nowhere (left out):\n  ${[...unplaced].join("\n  ")}`);
// A college with figures in the earlier year only is the shape a split leaves: list them for a look.
const lastOnly = [...colleges.values()].filter((c) => c.cut.some((y) => y[LAST] != null) && !c.cut.some((y) => y[YEAR] != null));
if (lastOnly.length) console.log(`  ${LAST} only (no ${YEAR} ${CAT} allotment in these branches): ${lastOnly.map((c) => `${c.id} ${c.name}`).join("; ")}`);

const titleOf = (y) => rows.find((r) => r.year === y)?.source_title ?? "";
const provisional = /provisional/i.test(titleOf(YEAR));
const dated = /dated\s+([\d.]+)/i.exec(titleOf(YEAR))?.[1] ?? null;

// States A–Z; within a state, the most competitive college first (its lowest closing rank this year, else last).
const best = (c) => Math.min(...c.cut.flatMap((y) => [y[YEAR] ?? Infinity]), Infinity);
const bestLast = (c) => Math.min(...c.cut.flatMap((y) => [y[LAST] ?? Infinity]), Infinity);
const states = new Map();
for (const c of colleges.values()) states.set(c.state, [...(states.get(c.state) ?? []), c]);
const groups = [...states]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([state, list]) => ({ state, list: list.sort((x, y) => best(x) - best(y) || bestLast(x) - bestLast(y) || x.name.localeCompare(y.name)) }));

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
/* ---------- college table */
.t{width:calc(100% - 32px);margin:14px 16px 0;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;
  border-radius:14px;overflow:hidden;box-shadow:0 12px 30px rgba(11,36,71,.10),0 0 0 1px #d4deeb}
col.c-no{width:38px}col.c-name{width:268px}
th{color:#fff;text-align:center;font-weight:800}
thead th{font:800 14px/1.12 Figtree,sans-serif;padding:9px 3px 10px;vertical-align:middle}
thead th small{display:block;font:700 10.5px/1 Inter,sans-serif;letter-spacing:1.2px;opacity:.85;margin-bottom:4px}
thead th.no,thead th.name{background:var(--navy);font:800 13px/1.2 Figtree,sans-serif}
thead th.name{text-align:left;padding-left:10px}
thead th.name small{display:block;font:600 11px/1.2 Inter,sans-serif;letter-spacing:0;color:#a9bad1;opacity:1;margin:2px 0 0}
th.b0{background:var(--open)}th.b1{background:var(--obc)}
th.bs,td.bs{border-left:2px solid #fff}
tbody td{padding:4px 2px;border-bottom:1px solid var(--line);text-align:center;vertical-align:middle;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
td.no{font:600 12px/1 Inter,sans-serif;color:var(--muted)}
td.name{text-align:left;white-space:normal;padding:5px 6px 5px 10px;font:600 12.6px/1.22 Inter,sans-serif;color:var(--navy);letter-spacing:-.1px}
td.r{font-family:'Roboto Condensed',sans-serif;font-variant-numeric:tabular-nums}
td.r b{display:block;font-weight:700;font-size:15.5px;line-height:1.1;color:var(--navy)}
td.r i{display:block;font-style:normal;font-size:11px;line-height:1.2;color:#6a788d;margin-top:2px}
td.r .na{color:#a3b0c1;font-weight:400}
td.r sup{font-size:9px;margin-left:2px;vertical-align:2px}
td.b0{background:var(--open-t)}td.b1{background:var(--obc-t)}
tr.alt td.no,tr.alt td.name{background:#f4f7fb}
tr.alt td.b0{background:var(--open-t2)}tr.alt td.b1{background:var(--obc-t2)}
tr.st td{padding:7px 12px;text-align:left;background:#e3eaf4;border-bottom:1px solid #cfd9e7;
  font:800 13px/1.2 Figtree,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:var(--navy)}
tr.st td span{font:600 11.5px/1 Inter,sans-serif;letter-spacing:0;text-transform:none;color:var(--muted);margin-left:8px}
.up{color:var(--up)}.down{color:var(--down)}
`;

const head =
  `<tr><th class="no">S.No</th><th class="name">College<small>State-wise, most competitive first</small></th>` +
  BRANCHES.map((b, i) => `<th class="b${i % 2} bs"><small>${b.deg}</small>${esc(b.head)}</th>`).join("") +
  `</tr>`;

const cellHtml = (cut, i) => {
  const a = cut[LAST] ?? null;
  const b = cut[YEAR] ?? null;
  if (a == null && b == null) return `<td class="r b${i % 2} bs"><span class="na">–</span></td>`;
  const dir = a != null && b != null && a !== b ? (b > a ? `<sup class="up">▲</sup>` : `<sup class="down">▼</sup>`) : "";
  return (
    `<td class="r b${i % 2} bs"><b>${b == null ? `<span class="na">–</span>` : num(b) + dir}</b>` +
    `<i>${LAST}: ${a == null ? "–" : num(a)}</i></td>`
  );
};

// Every row, in order, with what pagination needs to know about it.
const items = [];
let n = 0;
for (const g of groups) {
  items.push({ kind: "state", state: g.state, html: (contd) => stateRow(g, contd) });
  g.list.forEach((c, k) => {
    n++;
    const no = n;
    items.push({
      kind: "college",
      state: g.state,
      html: () =>
        `<tr class="${k % 2 ? "alt" : ""}"><td class="no">${no}</td><td class="name">${esc(c.name)}</td>${c.cut.map(cellHtml).join("")}</tr>`,
    });
  });
}
function stateRow(g, contd) {
  const count = contd ? "" : `<span>${g.list.length} college${g.list.length === 1 ? "" : "s"}</span>`;
  return `<tr class="st"><td colspan="${2 + BRANCHES.length}">${esc(g.state)}${contd ? " (contd.)" : ""}${count}</td></tr>`;
}
const oddNames = [...colleges.values()].map((c) => c.name).filter(odd);
if (oddNames.length) console.warn(`! names to look at:\n  ${oddNames.join("\n  ")}`);

const basis = `All India Quota · ${CAT} category · ${provisional ? `${YEAR} rank based on provisional result` : `${LAST} and ${YEAR}: MCC's final results`}`;
const sourceLine =
  `Closing rank = the highest All India Rank allotted in that branch at that college on All India Quota seats in the ${esc(CAT)} category, ` +
  `in MCC's ${esc(ROUND)} (${LAST}: final result; ${YEAR}: ${provisional ? `provisional result${dated ? ` dated ${dated}` : ""}` : "final result"}).`;

const logoB64 = logo();
const doc = (bodyRows, pageNo, pages, span) =>
  page({
    title: `NEET PG ${LAST} vs ${YEAR} — MCC ${ROUND} college-wise closing ranks — ${CAT}`,
    css: TABLE_CSS,
    body: `${headerHtml(logoB64)}

${titleHtml({ last: LAST, year: YEAR, ribbon: `MCC ${ROUND.toUpperCase()} CLOSING RANKS`, pill: "COLLEGE-WISE", basis,
  after: pages ? `<span class="pg">Page ${pageNo} of ${pages} · ${esc(span)}</span>` : "" })}

  <div class="legend">${icon(I.info)}<p><b>How to read:</b> big number = ${YEAR} ${esc(ROUND)} closing rank, small = ${LAST}.
    <span class="up">▲ green</span> = closed at a later rank than in ${LAST}; <span class="down">▼ red</span> = closed at an earlier rank (more competitive).
    “–” = no ${esc(CAT)}-category All India Quota allotment in that branch at that college that year.</p></div>

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
const base = `neet-pg-${LAST}-vs-${YEAR}-${ROUND.toLowerCase().replace(/\s+/g, "-")}-college-wise-${CAT.toLowerCase()}`;
let { browser, tab } = await openBrowser();
// Now and then a tall screenshot takes the browser down: start a fresh one and try that page again, once.
async function renderPage(htmlPath, pngPath) {
  for (let attempt = 1; ; attempt++) {
    try {
      await load(tab, htmlPath);
      await shoot(tab, pngPath);
      return await tab.evaluate(() => Math.round(document.querySelector(".poster").getBoundingClientRect().height));
    } catch (e) {
      if (attempt > 1) throw e;
      console.warn(`  (the browser closed on ${pngPath.split(/[\\/]/).pop()}; retrying in a fresh one)`);
      await browser.close().catch(() => {});
      ({ browser, tab } = await openBrowser());
    }
  }
}

// 1. Everything on one page, to measure the frame and every row.
const measurePath = join(OUT, `${base}-measure.html`);
writeFileSync(measurePath, doc(items.map((it) => it.html(false)).join("\n"), 1, 9, "Measuring"));
const fonts = await load(tab, measurePath);
if (fonts.length) console.warn("! fonts not loaded:", fonts.join(", "));
const m = await tab.evaluate(() => {
  const poster = document.querySelector(".poster").getBoundingClientRect().height;
  const body = document.querySelector(".t tbody");
  const heights = [...body.rows].map((r) => r.getBoundingClientRect().height);
  const tight = [...body.querySelectorAll("td.r")].filter((td) => td.scrollWidth > td.clientWidth + 0.5).length;
  return { frame: poster - body.getBoundingClientRect().height, heights, tight };
});
if (m.tight) console.warn(`! ${m.tight} cells wider than their column`);
const budget = PAGE_HEIGHT - m.frame;
const H = (i) => m.heights[i];

// 2. Pages fill to the budget, so they come out the same height. A state starts on a page only if its header
// and at least two of its colleges fit there (or the whole state, if smaller); one that runs over carries on at
// the top of the next page under "(contd.)". So a page never ends on a lone state header.
const pages = [];
let cur = [];
let used = 0;
const flush = () => {
  if (cur.length) pages.push(cur);
  cur = [];
  used = 0;
};
for (let i = 0; i < items.length; ) {
  if (items[i].kind !== "state") throw new Error("pagination out of step");
  let j = i + 1;
  while (j < items.length && items[j].kind === "college") j++;
  const opening = m.heights.slice(i, Math.min(j, i + 3)).reduce((s, h) => s + h, 0); // header + up to two colleges
  if (used + opening > budget) flush();
  cur.push({ item: items[i], contd: false });
  used += H(i);
  for (let k = i + 1; k < j; k++) {
    if (used + H(k) > budget) {
      flush();
      cur.push({ item: items[i], contd: true });
      used += H(i);
    }
    cur.push({ item: items[k], contd: false });
    used += H(k);
  }
  i = j;
}
flush();

// 3. Render each page as a PNG.
const files = [];
const bodies = [];
let tallest = 0;
for (let p = 0; p < pages.length; p++) {
  const statesOn = [...new Set(pages[p].map((x) => x.item.state))];
  const span = statesOn.length === 1 ? statesOn[0] : `${statesOn[0]} – ${statesOn[statesOn.length - 1]}`;
  const htmlPath = join(OUT, `${base}-p${p + 1}.html`);
  const pngPath = join(OUT, `${base}-p${p + 1}.png`);
  const html = doc(pages[p].map((x) => x.item.html(x.contd)).join("\n"), p + 1, pages.length, span);
  writeFileSync(htmlPath, html);
  bodies.push(html.slice(html.indexOf('<div class="poster">') + '<div class="poster">'.length, html.lastIndexOf("</div>")));
  const h = await renderPage(htmlPath, pngPath);
  tallest = Math.max(tallest, h);
  files.push(pngPath);
  console.log(`  page ${p + 1}/${pages.length}: ${pages[p].filter((x) => x.item.kind === "college").length} colleges · ${span} · ${h}px`);
}

// 4. The same pages as one PDF — a document keeps its text sharp where a messaging app would shrink a tall photo.
// Every PDF page is the tallest poster's height; a shorter page keeps its footer at the bottom.
const PDF_CSS = `@page{size:1080px ${tallest}px;margin:0}
html,body{background:#f4f7fb}
.poster{height:${tallest}px;display:flex;flex-direction:column;break-after:page}
.poster:last-child{break-after:auto}
.poster>.ft{margin-top:auto}`;
const pdfHtmlPath = join(OUT, `${base}.html`);
writeFileSync(
  pdfHtmlPath,
  page({
    title: `NEET PG ${LAST} vs ${YEAR} — MCC ${ROUND} college-wise closing ranks — ${CAT}`,
    css: TABLE_CSS + PDF_CSS,
    body: bodies.join(`\n</div>\n<div class="poster">\n`),
  }),
);
await load(tab, pdfHtmlPath);
const pdfPath = join(OUT, `${base}.pdf`);
await tab.pdf({ path: pdfPath, width: "1080px", height: `${tallest}px`, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
files.push(pdfPath);
await browser.close();

const cells = [...colleges.values()].flatMap((c) => c.cut);
console.log(
  `${colleges.size} colleges · ${BRANCHES.length} branches · ${CAT} · ${YEAR} ${provisional ? "provisional" : "final"} · ` +
    `${cells.filter((c) => c[YEAR] != null).length} ${YEAR} ranks, ${cells.filter((c) => c[LAST] != null).length} ${LAST} ranks · ${pages.length} pages`,
);
for (const f of files) console.log(f);
