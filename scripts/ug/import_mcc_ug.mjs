// MCC's NEET UG allotment results for a whole counselling year -> closing_ranks (2026-11-09).
//
//   node --env-file=.env.local scripts/ug/import_mcc_ug.mjs <dir> [--year 2026] [--apply --backup <file>]
//   node --env-file=.env.local scripts/ug/import_mcc_ug.mjs --restore <backup file>
//
// <dir> holds r1.csv, r2.csv, r3.csv, stray.csv, special_stray.csv (scripts/ug/extract_ug_pdf.py) and matches.json
// (scripts/ug/match_ug_institutes.mjs). Dry run by default: it prints what would be written and compares round 1
// with last year's. --apply replaces that year's rows of MCC's UG counsellings in one transaction (backing up what it
// deletes), then refreshes seat_options.
//
// Why: MBBS college pages said "Cut Off 2025" through and after the 2026 counselling — our UG source carried 2026
// rounds 1–2 for 272 colleges only. MCC's own result PDFs cover every round of its 2026 counselling (rounds 1–3, the
// stray and the special stray round), which was complete on 6 Nov 2026 — so this is a finished year, not a round in
// progress (state rounds of a year in progress stay out of closing_ranks: CLAUDE.md, 2026-11-04).
//
// The shape is the 2025 rows', so a seat lines up year on year:
//   - counselling + quota by MCC's seat type (All India → "All India Quota UG", Open Seat → "Open Seat Quota UG",
//     deemed paid seats → "Deemed UG" Management / NRI / Minority, ESI, DU, IP, AMU, CW, Jamia → their own);
//   - category: UR / OBC / SC / EWS / ST and their PwD codes; a deemed paid seat is OPEN, an NRI seat NRI, a minority
//     seat its minority — as 2025 stored them;
//   - rounds R1, R2, R3, then R4 (stray) and R5 (special stray), as 2025 numbered them;
//   - closing_rank = ai_rank = counselling_rank = the highest All India Rank admitted to that seat in that round, counting
//     fresh allotments and upgrades only — "Retained" (kept an earlier round's seat) and "Did not fill up fresh choices"
//     are not that round's admissions.
// A fee the old 2026 rows carried for a seat (the source printed 2026 fees) is kept on the new rows of that seat.
// B.Sc. Nursing, foreign-country, AMU self-finance and the Jamia/AMU Muslim quotas are left out.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const COUNSELLINGS = [123, 126, 135, 137, 146, 147, 150, 151, 154];

if (args[0] === "--restore") {
  const b = JSON.parse(readFileSync(args[1], "utf8"));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM closing_ranks WHERE level = 'ug' AND year = ${b.year} AND counselling_id IN ${tx(COUNSELLINGS)}`;
    for (let i = 0; i < b.rows.length; i += 500) await tx`INSERT INTO closing_ranks ${tx(b.rows.slice(i, i + 500))}`;
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`restored ${b.rows.length} rows of ${b.year}`);
  await sql.end();
  process.exit(0);
}

const dir = args[0];
const year = Number(flag("--year") ?? 2026);
const apply = args.includes("--apply");
const backup = flag("--backup");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const ROUNDS = { r1: [1, "R1"], r2: [2, "R2"], r3: [3, "R3"], stray: [4, "R4"], special_stray: [5, "R5"] };
const COURSE = { MBBS: 118, BDS: 119 };
const CAT = { Open: 1292, OBC: 3, SC: 4, EWS: 2, ST: 5, "Open PwD": 1302, "OBC PwD": 1303, "SC PwD": 1370, "EWS PwD": 1319, "ST PwD": 1371 };

// MCC's seat type, spacing as the PDF breaks it, -> [counselling, quota, category rule].
function seatType(quota) {
  const q = quota.replace(/\s+/g, " ").replace(/- /g, "-").replace(/ \)/g, ")").replace(/\( /g, "(").trim().toLowerCase();
  if (q === "all india") return [123, 330, "std"];
  if (q === "open seat quota") return [135, 354, "std"];
  if (/^self-?financed merit seat$/.test(q)) return [137, 343, "open"];
  if (/^non-?resident indian$/.test(q)) return [137, 12, "nri"];
  if (q === "jain minority quota") return [137, 366, 1469];
  if (q === "muslim minority quota") return [137, 366, 1517];
  if (/^employ ?ee ?s state insurance scheme ?\(esi\)$/.test(q)) return [126, 336, "std"];
  if (q === "delhi university quota") return [150, 374, "std"];
  if (q === "ip university quota") return [154, 379, "std"];
  if (q === "aligarh muslim university (amu) quota") return [146, 368, "std"];
  if (/children\/ ?wid ?ows/.test(q)) return [151, 375, "std"];
  if (q === "jamia internal quota") return [147, 369, "std"];
  return null;
}

const matches = JSON.parse(readFileSync(`${dir}/matches.json`, "utf8"));
const seats = new Map(); // key -> row
const skipped = { course: 0, remark: 0, unmatched: 0, quota: {}, category: {} };
let read = 0;
for (const [file, [round, label]] of Object.entries(ROUNDS)) {
  const p = `${dir}/${file}.csv`;
  if (!existsSync(p)) throw new Error(`missing ${p}`);
  for (const r of parseCsv(readFileSync(p, "utf8"))) {
    read++;
    const course = COURSE[r.course];
    if (!course) { skipped.course++; continue; }
    if (!/^(Allotted|Fresh Allotted|Upgraded)/i.test(r.remarks)) { skipped.remark++; continue; }
    const inst = matches[r.institute];
    if (inst == null) { skipped.unmatched++; continue; }
    const st = seatType(r.quota);
    if (!st) { skipped.quota[r.quota] = (skipped.quota[r.quota] ?? 0) + 1; continue; }
    const [cid, qid, rule] = st;
    const cat = typeof rule === "number" ? rule : rule === "nri" ? 52 : rule === "open" ? (r.allotted_category === "Open" ? 1320 : null) : CAT[r.allotted_category];
    if (!cat) { skipped.category[`${r.quota}|${r.allotted_category}`] = (skipped.category[`${r.quota}|${r.allotted_category}`] ?? 0) + 1; continue; }
    const rank = Number(r.rank);
    const key = `${inst}|${course}|${cid}|${qid}|${cat}|${round}`;
    const s = seats.get(key) ?? { institute_id: inst, course_id: course, counselling_id: cid, quota_id: qid, category_id: cat, round, round_label: label, closing_rank: 0, n: 0 };
    s.closing_rank = Math.max(s.closing_rank, rank);
    s.n++;
    seats.set(key, s);
  }
}

// Fees the old rows of this year carried, per seat.
const oldRows = await sql`SELECT * FROM closing_ranks WHERE level = 'ug' AND year = ${year} AND counselling_id IN ${sql(COUNSELLINGS)}`;
// The old rows filed every deemed seat under one "Deemed" quota (396); 2025, and these rows, split it as 2025 did.
const oldQuota = (o) => (o.quota_id !== 396 ? o.quota_id : o.category_id === 52 ? 12 : o.category_id === 1320 ? 343 : 366);
const fee = new Map();
for (const o of [...oldRows].sort((a, b) => a.round - b.round)) {
  if (o.fee_inr != null) fee.set(`${o.institute_id}|${o.course_id}|${oldQuota(o)}|${o.category_id}`, o.fee_inr);
}
const now = new Date();
const rows = [...seats.values()].map((s) => ({
  level: "ug",
  counselling_id: s.counselling_id,
  institute_id: s.institute_id,
  course_id: s.course_id,
  quota_id: s.quota_id,
  category_id: s.category_id,
  year,
  round: s.round,
  round_label: s.round_label,
  closing_rank: s.closing_rank,
  ai_rank: s.closing_rank,
  counselling_rank: s.closing_rank,
  seats_allotted: null,
  fee_inr: fee.get(`${s.institute_id}|${s.course_id}|${s.quota_id}|${s.category_id}`) ?? null,
  bond_years: null,
  low_confidence: false,
  rank_basis: "All India Rank",
  extracted_at: now,
}));

const count = (f) => rows.reduce((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
console.log({ read, rows: rows.length, institutes: new Set(rows.map((r) => r.institute_id)).size, oldRowsReplaced: oldRows.length, feesCarried: rows.filter((r) => r.fee_inr != null).length });
console.log("skipped", JSON.stringify(skipped));
console.log("by round", count((r) => r.round_label), "by counselling", count((r) => r.counselling_id), "by course", count((r) => (r.course_id === 118 ? "MBBS" : "BDS")));

// Round 1 against last year's round 1, general category, All India / Open Seat — a sanity check by eye.
const prev = await sql`
  SELECT cr.institute_id, cr.course_id, cr.quota_id, cr.closing_rank, i.name
    FROM closing_ranks cr JOIN institutes i ON i.id = cr.institute_id
   WHERE cr.level = 'ug' AND cr.year = ${year - 1} AND cr.round_label = 'R1' AND cr.category_id = 1292 AND cr.quota_id IN (330, 354) AND cr.course_id = 118`;
const now1 = new Map(rows.filter((r) => r.round === 1 && r.category_id === 1292 && r.course_id === 118).map((r) => [`${r.institute_id}|${r.quota_id}`, r.closing_rank]));
const pairs = prev.map((p) => ({ name: p.name, last: p.closing_rank, now: now1.get(`${p.institute_id}|${p.quota_id}`) })).filter((p) => p.now);
pairs.sort((a, b) => a.last - b.last);
console.log(`R1 general MBBS (AIQ / open seat): ${pairs.length} seats in both years; median ratio ${(pairs.map((p) => p.now / p.last).sort((a, b) => a - b)[Math.floor(pairs.length / 2)] ?? 0).toFixed(2)}`);
for (const p of [...pairs.slice(0, 6), ...pairs.slice(-4)]) console.log(`   ${String(p.last).padStart(7)} → ${String(p.now).padStart(7)}  ${p.name.slice(0, 70)}`);
const lost = new Set(oldRows.map((o) => `${o.institute_id}|${o.course_id}|${oldQuota(o)}|${o.category_id}`));
for (const r of rows) lost.delete(`${r.institute_id}|${r.course_id}|${r.quota_id}|${r.category_id}`);
console.log(`old ${year} seats with no row in MCC's results: ${lost.size}`);

if (!apply) {
  console.log("dry run — nothing written");
  await sql.end();
  process.exit(0);
}

writeFileSync(backup, JSON.stringify({ year, at: now.toISOString(), rows: oldRows.map(({ id, ...r }) => r) }));
await sql.begin(async (tx) => {
  await tx`DELETE FROM closing_ranks WHERE level = 'ug' AND year = ${year} AND counselling_id IN ${tx(COUNSELLINGS)}`;
  for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO closing_ranks ${tx(rows.slice(i, i + 500))}`;
});
console.log(`applied: ${oldRows.length} old rows replaced by ${rows.length}; backup ${backup}`);
await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
console.log("seat_options refreshed");
await sql.end();
