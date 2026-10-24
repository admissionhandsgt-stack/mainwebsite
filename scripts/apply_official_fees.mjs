// Write official fees into `fees` (owner, 2026-10-25: "hamare DB mai update karlo fees and all").
//
//   node --env-file=.env.local scripts/poster/state_fees_doc.mjs --state Maharashtra --json <mh.json>
//   node --env-file=.env.local scripts/apply_official_fees.mjs <mh.json> scripts/data/fees_official_maharashtra_2026_27.json \
//        [--rate 96] [--backup <file.json>] [--apply]
//   node --env-file=.env.local scripts/apply_official_fees.mjs --restore <file.json>
//
// The official file holds each college's own 2026-27 notice (government colleges: the CET Cell brochure; deemed
// universities: the university's notice) — never FRA, never a compiled listing. Every existing `fees` row it names is
// updated in place (one row per institute × course × quota, checked) — a "-" in a private college's notice blanks the
// row with a reason instead of leaving last year's figure: the fee, its US$ for an NRI seat, "per year" where
// the notice says or the state's one-year rule applies, session 2026, no longer carried forward, and `fee_source`
// naming the notice (migration 0043; seat_options then prefers this fee). Hostel figures go into the hostel columns.
// No row is inserted: a notice that prices a seat our data has no row for is reported. Without --apply nothing is
// written; with it the old values are saved to --backup first, the whole update is one transaction, and seat_options
// is refreshed. Colleges with no notice are not touched.

import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const argv = process.argv.slice(2);
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

// ------------------------------------------------------------------ restore
if (opt("restore")) {
  const old = JSON.parse(readFileSync(opt("restore"), "utf8"));
  await sql.begin(async (tx) => {
    for (const r of old) {
      await tx`UPDATE fees SET fee_inr = ${r.fee_inr}, fee_usd = ${r.fee_usd}, fee_periodicity = ${r.fee_periodicity},
        fee_session = ${r.fee_session}, year = ${r.year}, is_carried_forward = ${r.is_carried_forward},
        fee_null_reason = ${r.fee_null_reason}, hostel_min_inr = ${r.hostel_min_inr}, hostel_max_inr = ${r.hostel_max_inr},
        hostel_note = ${r.hostel_note}, fee_source = ${r.fee_source} WHERE id = ${r.id}`;
    }
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`restored ${old.length} rows and refreshed seat_options`);
  await sql.end();
  process.exit(0);
}

const [mhPath, offPath] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const APPLY = argv.includes("--apply");
const RATE = Number(opt("rate", "96"));
const data = JSON.parse(readFileSync(mhPath, "utf8"));
const OFFICIAL = JSON.parse(readFileSync(offPath, "utf8"));

// The sheet's columns, and the quota each one is in our data, per kind of college.
const COLUMN_OF = {
  govt: { "Govt Quota": "Gen", AIQ: "AIQ" },
  private: { "Govt Quota": "Gen", "Management Quota": "Mgmt", "NRI Quota": "NRI" },
  deemed: { MNG: "Mgmt", NRI: "NRI" },
};
const QUOTA = {
  govt: { Gen: "MAHA-Govt Quota", AIQ: "AIQ" },
  private: { Gen: "MAHA-Govt Quota", Mgmt: "MAHA Priv-Mgmt Quota", NRI: "MAHA-NRI Quota" },
  deemed: { Mgmt: "MNG", NRI: "NRI" },
};
// Notices that do not say their fee is a year's (the rest say so, or the state's one-year-fee rule applies).
const PERIOD_UNSTATED = ["Dr DY Patil Medical College, Hospital and Research Centre, Pimpri", "Symbiosis Medical College",
  "Bharati Vidyapeeth Deemed University Medical College & Hospital, Sangli"];

const NAME = Object.fromEntries(data.courses.map((c) => [c.course, c.name]));
const COURSE_ID = Object.fromEntries(data.courses.map((c) => [c.course, c.course_id]));
const matrix = data.colleges.filter((c) => c.section in COLUMN_OF);
const collegeOf = (prefix) => {
  const hits = matrix.filter((c) => c.name.toLowerCase().startsWith(prefix.toLowerCase()));
  if (hits.length !== 1) throw new Error(`official entry matches ${hits.length} colleges: ${prefix}`);
  if (hits[0].institute_ids.length !== 1) throw new Error(`${hits[0].name} has ${hits[0].institute_ids.length} institute ids`);
  return hits[0];
};

const insts = [...new Set(matrix.flatMap((c) => c.institute_ids))];
const current = await sql`
  SELECT f.id, f.institute_id, f.course_id, q.code AS quota, f.fee_inr, f.fee_usd, f.fee_periodicity, f.fee_session, f.year,
         f.is_carried_forward, f.fee_null_reason, f.hostel_min_inr, f.hostel_max_inr, f.hostel_note,
         to_jsonb(f) ->> 'fee_source' AS fee_source  -- works before migration 0043 too (the dry run)
    FROM fees f LEFT JOIN quotas q ON q.id = f.quota_id
   WHERE f.level = 'pg' AND f.institute_id IN ${sql(insts)}`;
const seen = new Set();
for (const r of current) {
  const k = `${r.institute_id}|${r.course_id}|${r.quota}`;
  if (seen.has(k)) throw new Error(`two fees rows for ${k}`);
  seen.add(k);
}
const NAME_BY_ID = new Map(data.courses.filter((c) => c.course_id).map((c) => [c.course_id, c.name]));

// Targets are the college's own `fees` rows in the quota: "*" is every one of them (the notice's one fee for every
// branch), named branches match by printed name — also rows for branches the compiled listing lacked, since the
// notice is newer. A deemed university's seats are MCC's, so there only the seats the listing (MCC's matrix) has.
// A "no seat" entry blanks a private college's row: its notice prints "-" there.
const plan = new Map(); // fees row id -> { row, college, branch, column, values }
const blank = new Map(); // fees row id -> { row, college, branch, column, source }
const hostels = new Map(); // institute -> entry
const missing = [];
for (const e of OFFICIAL) {
  if (e.seat === "Note") continue;
  const c = collegeOf(e.college);
  const inst = c.institute_ids[0];
  if (e.seat === "Hostel") {
    if (e.min) hostels.set(inst, { ...e, college: c.name });
    continue;
  }
  const quota = QUOTA[c.section][e.seat];
  if (!quota) throw new Error(`no quota for ${c.section} ${e.seat}`);
  const listedIds = new Set(Object.entries(c.seats).filter(([k]) => COLUMN_OF[c.section][k] === e.seat)
    .flatMap(([, v]) => v.map((x) => COURSE_ID[x.course])));
  let rows = current.filter((r) => r.institute_id === inst && r.quota === quota);
  if (e.branches !== "*") rows = rows.filter((r) => e.branches.includes(NAME_BY_ID.get(r.course_id)));
  if (c.section === "deemed") rows = rows.filter((r) => listedIds.has(r.course_id));
  if (e.branches !== "*" && !e.noseat) {
    const found = new Set(rows.map((r) => NAME_BY_ID.get(r.course_id)));
    for (const b of e.branches) {
      if (!found.has(b) && [...listedIds].some((id) => NAME_BY_ID.get(id) === b)) missing.push(`${c.name} · ${b} · ${e.seat}`);
    }
  }
  for (const r of rows) {
    const branch = NAME_BY_ID.get(r.course_id) ?? `course ${r.course_id}`;
    if (e.noseat) {
      if (c.section !== "deemed") blank.set(r.id, { row: r, college: c.name, branch, column: e.seat, source: e.source });
      continue;
    }
    const feeInr = e.fee_inr ?? Math.round(e.fee_usd * RATE);
    const feeUsd = e.fee_usd ?? (e.seat === "NRI" ? Math.round(feeInr / RATE) : null);
    const source = `${e.source}${e.max ? " — up to this figure" : ""}${e.fee_usd ? ` — US$${e.fee_usd.toLocaleString("en-US")}, ₹ at ${RATE} a dollar` : ""}`;
    plan.set(r.id, { row: r, college: c.name, branch, column: e.seat,
      values: { fee_inr: feeInr, fee_usd: feeUsd, per_year: !PERIOD_UNSTATED.some((p) => c.name.startsWith(p)), source } });
  }
}
for (const id of plan.keys()) blank.delete(id);

const updates = []; // { id, set }
const changed = new Map(); // college -> [lines]
const note = (college, line) => changed.set(college, [...(changed.get(college) ?? []), line]);
for (const [id, p] of plan) {
  const r = p.row, v = p.values;
  updates.push({ id, set: { fee_inr: v.fee_inr, fee_usd: v.fee_usd, fee_periodicity: v.per_year ? "per year" : r.fee_periodicity,
    fee_session: "2026", year: 2026, is_carried_forward: false, fee_null_reason: null, fee_source: v.source } });
  if (Number(r.fee_inr) !== v.fee_inr) note(p.college, `${p.branch} ${p.column}: ${r.fee_inr ?? "—"} → ${v.fee_inr}`);
}
for (const [id, b] of blank) {
  updates.push({ id, set: { fee_inr: null, fee_usd: null, fee_periodicity: b.row.fee_periodicity, fee_session: "2026", year: 2026,
    is_carried_forward: false, fee_null_reason: `No ${b.column === "Mgmt" ? "management" : b.column} seat in the college's 2026-27 fee notice`,
    fee_source: b.source } });
  note(b.college, `${b.branch} ${b.column}: ${b.row.fee_inr ?? "—"} → no seat`);
}
const hostelUpdates = [];
for (const [inst, h] of hostels) {
  for (const r of current.filter((x) => x.institute_id === inst)) {
    hostelUpdates.push({ id: r.id, set: { hostel_min_inr: h.min, hostel_max_inr: h.max, hostel_note: `${h.text} (${h.source})` } });
  }
}

const touched = new Set([...updates, ...hostelUpdates].map((u) => u.id));
console.log(`plan: ${plan.size} fees rows get an official fee, ${blank.size} are blanked as "no seat in the notice" ` +
  `(${missing.length} named seats with no row in our data, not inserted); hostel figures on ${hostelUpdates.length} rows of ${hostels.size} colleges`);
console.log(`value changes: ${[...changed.values()].reduce((n, l) => n + l.length, 0)} rows in ${changed.size} colleges`);
for (const [college, lines] of changed) console.log(`  ${college}: ${lines.length} — e.g. ${lines.slice(0, 3).join(" · ")}`);
if (missing.length) console.log(`  no fees row: ${missing.slice(0, 12).join(" | ")}${missing.length > 12 ? " …" : ""}`);

if (!APPLY) {
  console.log("dry run — nothing written (add --apply)");
  await sql.end();
  process.exit(0);
}

const backup = opt("backup");
if (!backup) throw new Error("--apply needs --backup <file.json> for the old values");
writeFileSync(backup, JSON.stringify(current.filter((r) => touched.has(r.id)), null, 1));
console.log(`old values of ${touched.size} rows saved to ${backup}`);

await sql.begin(async (tx) => {
  for (const u of updates) {
    const s = u.set;
    await tx`UPDATE fees SET fee_inr = ${s.fee_inr}, fee_usd = ${s.fee_usd}, fee_periodicity = ${s.fee_periodicity},
      fee_session = ${s.fee_session}, year = ${s.year}, is_carried_forward = ${s.is_carried_forward},
      fee_null_reason = ${s.fee_null_reason}, fee_source = ${s.fee_source} WHERE id = ${u.id}`;
  }
  for (const u of hostelUpdates) {
    const s = u.set;
    await tx`UPDATE fees SET hostel_min_inr = ${s.hostel_min_inr}, hostel_max_inr = ${s.hostel_max_inr}, hostel_note = ${s.hostel_note}
      WHERE id = ${u.id}`;
  }
});
await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
const [check] = await sql`SELECT count(*)::int AS n FROM fees WHERE fee_source IS NOT NULL`;
console.log(`applied: ${updates.length} fee rows, ${hostelUpdates.length} hostel rows; ${check.n} fees rows now carry a source; seat_options refreshed`);
await sql.end();
