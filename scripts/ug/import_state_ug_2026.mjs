// The states' own NEET UG 2026 counselling (zyn's state_ug_2026.json) -> closing_ranks and state_round_cuts (2026-11-14).
//
//   node --env-file=.env.local scripts/ug/import_state_ug_2026.mjs [--file <json>] [--show] [--apply --backup <file>]
//   node --env-file=.env.local scripts/ug/import_state_ug_2026.mjs --restore <backup file>
//
// Agreed with zyn (2026-11-11) and the owner: one import of the complete 2026 state rounds. The UG counselling year is
// finished (special strays done), so these are a finished year's rows, like MCC's of 2026-11-09.
//
// What goes where:
//   closing_ranks (the predictor, college bands) — a line only when ALL hold:
//     - rank_type is exactly "NEET AIR" (filtered per line, never by state; a state merit or score-order figure is
//       never an All India Rank),
//     - its college is matched to ours (scripts/data/ug_state_2026_matches.json, built by match_state_ug_2026.mjs from
//       the hand decisions) AND that college is in the counselling's own state (North-East central-pool seats sit in
//       colleges all over India; under the state's counselling they would read as that college's home-state seats),
//     - the seat type maps (state_ug_2026_labels.mjs) — a line that is not one seat (a candidate's category, two pools
//       in one line, a converted seat) stays out.
//     One row per seat line per round: round_label R1, R2, … in the state's own order (stray rounds are later numbers,
//     as 2025 numbered them), closing_rank = ai_rank = the furthest AIR given that seat line in that round (zyn's
//     "far": fresh allotments and upgrades, not retained seats), rank_basis 'All India Rank', counselling = the state's
//     UG counselling (the 2025 one). Two lines that map to one seat (the same seat printed two ways) take the furthest.
//   state_round_cuts (level ug, year 2026) — every other line, with the rank kept as what it is: closing_air for an AIR
//   line, closing_state_rank and a note naming the rank type for the rest. Nothing on the site reads level-ug rows.
//
// --apply: in one transaction, backs up and replaces 2026's rows of these state counsellings in closing_ranks and all
// level-ug 2026 rows of state_round_cuts (the September scrape's 300 R1/R2 lines), creates any quota / category rows it
// needs (reusing any row with the same label / code), then refreshes seat_options.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import postgres from "postgres";
import { mapLine } from "./state_ug_2026_labels.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const YEAR = 2026;

if (args[0] === "--restore") {
  const b = JSON.parse(readFileSync(args[1], "utf8"));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM closing_ranks WHERE level = 'ug' AND year = ${YEAR} AND counselling_id IN ${tx(b.counsellings)}`;
    for (let i = 0; i < b.closing.length; i += 500) await tx`INSERT INTO closing_ranks ${tx(b.closing.slice(i, i + 500))}`;
    await tx`DELETE FROM state_round_cuts WHERE level = 'ug' AND year = ${YEAR}`;
    for (let i = 0; i < b.cuts.length; i += 500) await tx`INSERT INTO state_round_cuts ${tx(b.cuts.slice(i, i + 500))}`;
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`restored ${b.closing.length} closing_ranks rows and ${b.cuts.length} state_round_cuts rows`);
  await sql.end();
  process.exit(0);
}

const FILE = flag("--file") ?? "D:/Zyn/data/reference/state_ug_2026.json";
const apply = args.includes("--apply");
const backup = flag("--backup");
const show = args.includes("--show");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

const J = JSON.parse(readFileSync(FILE, "utf8"));
const MATCHES = JSON.parse(readFileSync("scripts/data/ug_state_2026_matches.json", "utf8"));
const STATE_ALIAS = { "Jammu and Kashmir (with UT of Ladakh)": "Jammu and Kashmir", "Andaman & Nicobar Islands": "Andaman Nicobar Island" };

// ---------------- reference data ----------------
const states = await sql`SELECT id, name FROM states`;
const stateId = new Map(states.map((s) => [s.name, s.id]));
const couns = await sql`SELECT co.id, s.name state FROM counsellings co JOIN states s ON s.id = co.state_id WHERE co.level = 'ug'`;
const counsOf = new Map(couns.map((c) => [c.state, c.id]));
const insts = await sql`SELECT i.id, i.name, s.name state FROM institutes i LEFT JOIN states s ON s.id = i.state_id WHERE i.level = 'ug'`;
const inst = new Map(insts.map((i) => [i.id, i]));
const courses = await sql`SELECT id, name FROM courses WHERE level = 'ug' AND name IN ('MBBS', 'BDS')`;
const courseId = new Map(courses.map((c) => [c.name, c.id]));

// Ownership: NMC's register for MBBS colleges (paired by hand and by matcher), the name for the rest.
const nmc = await sql`
  SELECT DISTINCT ON (ni.institute_id) ni.institute_id id, nc.management_type mt
    FROM nmc_institutes ni JOIN nmc_courses nc ON nc.college_code = ni.college_code
   WHERE ni.institute_id IS NOT NULL ORDER BY ni.institute_id, nc.course_type = 'M.B.B.S.' DESC`;
const nmcOwn = new Map(nmc.map((r) => [r.id, /govern/i.test(r.mt ?? "") ? "govt" : r.mt ? "private" : null]));
const GOVT_NAME = /\b(govt|government|gmc|autonomous state|rajkiya|esic?|municipal|aiims|state medical college|gdc)\b/i;
// UP: the matrix's own [Govt.]/[Private] tag per college (zyn's normalised list, extra.institute_type_in_matrix).
const upType = new Map();
try {
  const up = JSON.parse(readFileSync("D:/Zyn/data/normalized/state_ug_2026/uttar_pradesh.json", "utf8"));
  for (const a of up.allotments ?? []) if (a.extra?.institute_type_in_matrix) upType.set(a.college, /govt/i.test(a.extra.institute_type_in_matrix) ? "govt" : "private");
} catch { /* fall back to NMC / the name */ }
const ownOf = (id, line) => {
  if (line.state === "Uttar Pradesh" && upType.has(line.college)) return upType.get(line.college);
  if (nmcOwn.get(id)) return nmcOwn.get(id);
  const n = inst.get(id)?.name ?? line.college;
  return GOVT_NAME.test(n) ? "govt" : "private";
};

// 2025's labels per state and quota, to reuse the same rows.
const used25 = await sql`
  SELECT s.name state, q.id qid, q.label quota, cat.id cid, cat.code cat
    FROM closing_ranks cr JOIN counsellings co ON co.id = cr.counselling_id JOIN states s ON s.id = co.state_id
    JOIN quotas q ON q.id = cr.quota_id JOIN categories cat ON cat.id = cr.category_id
   WHERE cr.level = 'ug' AND cr.year = 2025 GROUP BY 1, 2, 3, 4, 5`;
const quotaByStateLabel = new Map();
const catByStateQuota = new Map(); // state|quota|code -> cid
const catByState = new Map(); // state|code -> cid
for (const r of used25) {
  quotaByStateLabel.set(`${r.state}|${r.quota}`, r.qid);
  catByStateQuota.set(`${r.state}|${r.quota}|${r.cat}`, r.cid);
  if (!catByState.has(`${r.state}|${r.cat}`)) catByState.set(`${r.state}|${r.cat}`, r.cid);
}
const allQuotas = await sql`SELECT id, code, label FROM quotas`;
const quotaByLabel = new Map();
for (const q of allQuotas) if (!quotaByLabel.has(q.label)) quotaByLabel.set(q.label, q.id);
const quotaCodes = new Set(allQuotas.map((q) => q.code));
const allCats = await sql`SELECT id, code FROM categories`;
const catByCode = new Map();
for (const c of allCats) if (!catByCode.has(c.code)) catByCode.set(c.code, c.id);

const newQuotas = new Map(); // label -> code
const newCats = new Set();
function resolveQuota(state, label) {
  return quotaByStateLabel.get(`${state}|${label}`) ?? quotaByLabel.get(label) ?? (newQuotas.has(label) ? `new:${label}` : (() => {
    let code = `UG26-${label}`.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 48).replace(/-$/, "");
    let i = 2;
    while (quotaCodes.has(code)) code = `${code.slice(0, 44)}-${i++}`;
    quotaCodes.add(code);
    newQuotas.set(label, code);
    return `new:${label}`;
  })());
}
function resolveCat(state, quotaLabel, cats) {
  for (const c of cats) if (catByStateQuota.has(`${state}|${quotaLabel}|${c}`)) return { id: catByStateQuota.get(`${state}|${quotaLabel}|${c}`), code: c };
  for (const c of cats) if (catByState.has(`${state}|${c}`)) return { id: catByState.get(`${state}|${c}`), code: c };
  for (const c of cats) if (catByCode.has(c)) return { id: catByCode.get(c), code: c };
  newCats.add(cats[0]);
  return { id: `new:${cats[0]}`, code: cats[0] };
}

// ---------------- build ----------------
const report = {};
const R = (st) => (report[st] ??= { lines: 0, air: 0, toRanks: 0, rows: 0, toCuts: 0, why: {}, merged: 0 });
const ranks = new Map(); // key -> row (merged by max)
const cuts = [];
const mergedLog = [];
for (const l of J.lines) {
  const st = STATE_ALIAS[l.state] ?? l.state;
  const r = R(st);
  r.lines++;
  const isAir = l.rank_type === "NEET AIR";
  if (isAir) r.air++;
  const mkey = `${l.state}|${l.college}|${l.course}`;
  const iid = MATCHES[mkey]?.id ?? null;
  const course = courseId.get(l.course) ?? null;
  let why = null;
  let mapped = null;
  if (!isAir) why = `rank type: ${l.rank_type}`;
  else if (!course) why = `course ${l.course}`;
  else if (!iid) why = "college not matched";
  else if (inst.get(iid)?.state !== st) why = "college outside the state (central pool / nominated seat)";
  else if (!counsOf.has(st)) why = "no UG counselling of ours for the state";
  else {
    mapped = mapLine(l, { own: ownOf(iid, l) });
    if (mapped.skip) { why = mapped.skip; mapped = null; }
  }
  const order = l.order ?? Object.keys(l.rounds ?? {});
  if (mapped) {
    r.toRanks++;
    const qid = resolveQuota(st, mapped.quota);
    const cat = resolveCat(st, mapped.quota, mapped.cats);
    for (const [rname, x] of Object.entries(l.rounds ?? {})) {
      if (x?.far == null) continue;
      const n = order.indexOf(rname) + 1;
      if (n < 1) continue;
      const key = `${counsOf.get(st)}|${iid}|${course}|${qid}|${cat.id}|${n}`;
      const row = { level: "ug", counselling_id: counsOf.get(st), institute_id: iid, course_id: course, quota_id: qid, category_id: cat.id, year: YEAR, round: n, round_label: `R${n}`, closing_rank: x.far, ai_rank: x.far, counselling_rank: null, seats_allotted: x.new ?? null, fee_inr: null, bond_years: null, low_confidence: Boolean(x.by_eye), rank_basis: "All India Rank", _src: `${l.quota} | ${l.category}` };
      const old = ranks.get(key);
      if (old) {
        if (old._src !== row._src) { r.merged++; mergedLog.push(`${st} | ${inst.get(iid)?.name} | ${l.course} | ${mapped.quota} | ${cat.code} | R${n}: "${old._src}" + "${row._src}"`); }
        if (row.closing_rank > old.closing_rank) { old.closing_rank = row.closing_rank; old.ai_rank = row.ai_rank; }
        old.seats_allotted = (old.seats_allotted ?? 0) + (row.seats_allotted ?? 0);
      } else ranks.set(key, row);
    }
  } else {
    r.toCuts++;
    r.why[why] = (r.why[why] ?? 0) + 1;
    for (const [rname, x] of Object.entries(l.rounds ?? {})) {
      if (x?.far == null) continue;
      const n = order.indexOf(rname) + 1;
      cuts.push({
        level: "ug", state_id: stateId.get(st) ?? null, year: YEAR, round: n >= 1 ? `R${n}` : rname, round_printed: rname,
        counselling: `${l.state} state counselling`, source_url: null, institute_id: iid, college_printed: l.college,
        inst_code: l.college_code ?? null, course_id: course, course_printed: l.course, quota: String(l.quota ?? "-"),
        seat_type_printed: l.quota ?? null, category: String(l.category ?? "-"), category_printed: String(l.category ?? "-"),
        pwd: Boolean(l.pwd), additional_category: null, in_service: false, seats_allotted: x.new ?? null,
        opening_air: isAir ? x.near ?? null : null, closing_air: isAir ? x.far : null,
        // Gujarat's merit list gives candidates added to it later in-between numbers ("2326.5"): a whole number goes in the column, any other
        // figure only in the note, exactly as printed.
        opening_state_rank: isAir || !Number.isInteger(x.near) ? null : x.near, closing_state_rank: isAir || !Number.isInteger(x.far) ? null : x.far,
        note: isAir
          ? `left out of the predictor: ${why}`
          : `rank type: ${l.rank_type} (not an All India Rank)${Number.isInteger(x.far) ? "" : `; printed closing rank ${x.far}`}${x.near != null && !Number.isInteger(x.near) ? `; printed opening rank ${x.near}` : ""}`,
      });
    }
  }
}
for (const row of ranks.values()) report[[...stateId.entries()].find(([, v]) => v)?.[0] ?? ""]; // no-op (keeps lint quiet)
const byState = {};
for (const row of ranks.values()) {
  const st = couns.find((c) => c.id === row.counselling_id)?.state;
  byState[st] = (byState[st] ?? 0) + 1;
}
for (const [st, n] of Object.entries(byState)) R(st).rows = n;

console.log(`built ${J.built}: lines ${J.lines.length}; closing_ranks rows ${ranks.size}; state_round_cuts rows ${cuts.length}`);
console.log("state".padEnd(36), "lines  AIR  ->ranks rows  ->cuts merged | why left out");
for (const [st, r] of Object.entries(report).sort((a, b) => b[1].lines - a[1].lines)) {
  console.log(st.padEnd(36), String(r.lines).padStart(5), String(r.air).padStart(5), String(r.toRanks).padStart(6), String(r.rows).padStart(5), String(r.toCuts).padStart(6), String(r.merged).padStart(5), "|", Object.entries(r.why).map(([k, v]) => `${k}: ${v}`).join("; "));
}
console.log(`\nnew quotas (${newQuotas.size}):`, [...newQuotas.keys()].join(" | "));
console.log(`new categories (${newCats.size}):`, [...newCats].join(" | "));
if (show) { console.log(`\nmerged seat lines (${mergedLog.length}):`); for (const m of mergedLog) console.log("  " + m); }

if (apply) {
  const counsIds = [...new Set([...ranks.values()].map((r) => r.counselling_id))];
  const oldClosing = await sql`SELECT * FROM closing_ranks WHERE level = 'ug' AND year = ${YEAR} AND counselling_id IN ${sql(counsIds)}`;
  const oldCuts = await sql`SELECT * FROM state_round_cuts WHERE level = 'ug' AND year = ${YEAR}`;
  writeFileSync(backup, JSON.stringify({ at: new Date().toISOString(), counsellings: counsIds, closing: oldClosing.map(({ id, ...r }) => r), cuts: oldCuts.map(({ id, ...r }) => r) }));
  console.log(`backup: ${oldClosing.length} closing_ranks rows, ${oldCuts.length} state_round_cuts rows -> ${backup}`);
  await sql.begin(async (tx) => {
    const qmap = new Map();
    for (const [label, code] of newQuotas) {
      const [q] = await tx`INSERT INTO quotas (code, label) VALUES (${code}, ${label}) RETURNING id`;
      qmap.set(`new:${label}`, q.id);
    }
    const cmap = new Map();
    for (const code of newCats) {
      const [c] = await tx`INSERT INTO categories (code, label) VALUES (${code}, ${code}) RETURNING id`;
      cmap.set(`new:${code}`, c.id);
    }
    const rows = [...ranks.values()].map(({ _src, ...r }) => ({ ...r, quota_id: qmap.get(r.quota_id) ?? r.quota_id, category_id: cmap.get(r.category_id) ?? r.category_id }));
    await tx`DELETE FROM closing_ranks WHERE level = 'ug' AND year = ${YEAR} AND counselling_id IN ${tx(counsIds)}`;
    for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO closing_ranks ${tx(rows.slice(i, i + 500))}`;
    await tx`DELETE FROM state_round_cuts WHERE level = 'ug' AND year = ${YEAR}`;
    for (let i = 0; i < cuts.length; i += 500) await tx`INSERT INTO state_round_cuts ${tx(cuts.slice(i, i + 500))}`;
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`applied: ${ranks.size} closing_ranks rows, ${cuts.length} state_round_cuts rows; seat_options refreshed`);
}
await sql.end();
