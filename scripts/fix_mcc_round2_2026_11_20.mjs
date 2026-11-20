// NEET PG 2026 Round 2 provisional result (MCC, 20 Nov 2026) — two repairs to what the worker loaded, and the
// round's schedule row brought up to MCC's notices of the day.
//   1. "Retained" rows are not Round 2 allotments: a candidate who floated and got no upgrade keeps the Round 1
//      seat. MCC's 2025 PDFs printed "-" there (not counted); 2026 prints "Retained" with the old seat. 8,585 rows.
//   2. The Round 2 PDF prints a college's short name only ("SMS Medical College, Jaipur"), where Round 1 printed
//      "<short name>,<official name / address>". So the whole-name match found 37%. A Round 2 name now takes the
//      institute of every earlier name that starts with it and a comma — only when they all agree on one institute
//      (same DNB-or-not, a hospital's DNB entry is its own).
//   3. pg_schedule "Round 2": the hold is over (MCC Notice No. 11 of 20.11.2026: the Madras High Court's stay of 17 Nov
//      applies to Sri Venkateshwaraa alone; the result is declared for every other college). The result date is MCC's
//      own (Notice No. 12), and the "dates may change" line names that notice.
//   node --env-file=.env.local scripts/fix_mcc_round2_2026_11_20.mjs [--apply --backup <file>] | --restore <file>
import fs from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const backupAt = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const restoreFrom = args.includes("--restore") ? args[args.indexOf("--restore") + 1] : null;
const YEAR = 2026, ROUND = "Round 2";

if (restoreFrom) {
  const b = JSON.parse(fs.readFileSync(restoreFrom, "utf8"));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM mcc_allotments WHERE year = ${YEAR} AND round = ${ROUND}`;
    for (let i = 0; i < b.rows.length; i += 1000) await tx`INSERT INTO mcc_allotments ${tx(b.rows.slice(i, i + 1000))}`;
    await tx`UPDATE mcc_round_results SET rows = ${b.result.rows} WHERE year = ${YEAR} AND round = ${ROUND}`;
    await tx`UPDATE content_blocks SET data = ${tx.json(b.schedule)} WHERE id = ${b.scheduleId}`;
    await tx`UPDATE live_alerts SET title = ${b.alert.title} WHERE id = ${b.alert.id}`;
  });
  console.log("restored", b.rows.length, "rows");
  await sql.end();
  process.exit(0);
}

const rows = await sql`SELECT * FROM mcc_allotments WHERE year = ${YEAR} AND round = ${ROUND}`;
const [result] = await sql`SELECT rows FROM mcc_round_results WHERE year = ${YEAR} AND round = ${ROUND}`;
const [sched] = await sql`SELECT id, data FROM content_blocks WHERE collection = 'pg_schedule' AND title = 'Round 2' AND is_active`;
const [alert] = await sql`SELECT id, title FROM live_alerts WHERE source_key = ${`mcc-round:${YEAR}:round-2-result`}`;
const schedule = typeof sched.data === "string" ? JSON.parse(sched.data) : sched.data;
console.log(`Round 2 rows: ${rows.length}, recorded ${result.rows}; alert: ${alert?.title}`);

// 1. Retained.
const retained = rows.filter((r) => /^retained/i.test(r.status ?? ""));
const kept = rows.filter((r) => !/^retained/i.test(r.status ?? ""));
console.log(`Retained (dropped): ${retained.length}; kept: ${kept.length}`);

// 2. Short names against every earlier matched name.
const dnbOf = (course) => /NBEMS|DNB|NBE/i.test(course ?? "");
const known = await sql`SELECT mcc_college_name AS name, (mcc_course ~* 'NBEMS|DNB|NBE') AS dnb, institute_id
                          FROM mcc_allotments WHERE institute_id IS NOT NULL AND NOT (year = ${YEAR} AND round = ${ROUND})
                         GROUP BY 1, 2, 3
                        UNION
                        SELECT mcc_college_name, (seat_matrix = 'DNB'), institute_id FROM mcc_seat_matrix WHERE institute_id IS NOT NULL GROUP BY 1, 2, 3`;
const squash = (s) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const byPrefix = new Map(); // `${dnb}` → [{ k, id }]
for (const k of known) {
  const key = String(k.dnb);
  if (!byPrefix.has(key)) byPrefix.set(key, []);
  byPrefix.get(key).push({ k: squash(k.name), id: k.institute_id });
}
const decide = new Map(); // name|dnb → id | null
const lookups = { matched: 0, ambiguous: 0, none: 0 };
for (const r of kept) {
  if (r.institute_id) continue;
  const dnb = dnbOf(r.mcc_course);
  const key = `${squash(r.mcc_college_name)}|${dnb}`;
  if (decide.has(key)) continue;
  const n = squash(r.mcc_college_name);
  const ids = new Set((byPrefix.get(String(dnb)) ?? []).filter((x) => x.k === n || x.k.startsWith(`${n},`)).map((x) => x.id));
  decide.set(key, ids.size === 1 ? [...ids][0] : null);
  if (ids.size === 1) lookups.matched++;
  else if (ids.size > 1) lookups.ambiguous++;
  else lookups.none++;
}
const stateOf = new Map((await sql`SELECT i.id, s.name FROM institutes i LEFT JOIN states s ON s.id = i.state_id`).map((x) => [x.id, x.name]));
let newly = 0;
const updates = [];
for (const r of kept) {
  if (r.institute_id) continue;
  const id = decide.get(`${squash(r.mcc_college_name)}|${dnbOf(r.mcc_course)}`);
  if (id) {
    newly++;
    updates.push({ id: r.id, inst: id, state: stateOf.get(id) ?? null });
  }
}
const before = kept.filter((r) => r.institute_id).length;
console.log(`names: ${lookups.matched} placed, ${lookups.ambiguous} ambiguous (left), ${lookups.none} unknown (left)`);
console.log(`kept rows matched: ${before} → ${before + newly} of ${kept.length} (${(((before + newly) / kept.length) * 100).toFixed(1)}%)`);
const left = new Map();
for (const r of kept) if (!r.institute_id && !decide.get(`${squash(r.mcc_college_name)}|${dnbOf(r.mcc_course)}`)) left.set(r.mcc_college_name, (left.get(r.mcc_college_name) ?? 0) + 1);
console.log("largest still unmatched:", [...left].sort((a, b) => b[1] - a[1]).slice(0, 12));

// 3. The schedule row.
const NOTICE_12 = "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611202125598388.pdf";
const nextSchedule = { ...schedule };
delete nextSchedule.hold;
delete nextSchedule.hold_on;
delete nextSchedule.hold_url;
nextSchedule.result = "20 Nov (provisional); final result awaited";
nextSchedule.revision =
  "Provisional Allotment Result of NEET PG Round-2 2026 (Notice No. 12): grievances till 6 PM of 20 Nov; approach the allotted college only after the final result";
nextSchedule.revision_url = NOTICE_12;
nextSchedule.revision_on = "2026-11-20";
console.log("schedule: hold cleared; result =", nextSchedule.result);
const total = kept.length;
const alertTitle = alert ? alert.title.replace(/\d{1,3}(?:,\d{2,3})+/, total.toLocaleString("en-IN")) : null;
console.log("alert:", alertTitle);

if (!APPLY) {
  console.log("\ndry run — nothing written (pass --apply --backup <file>)");
  await sql.end();
  process.exit(0);
}
if (!backupAt) throw new Error("--apply needs --backup <file>");
fs.writeFileSync(backupAt, JSON.stringify({ rows, result, scheduleId: sched.id, schedule, alert }, null, 0));
console.log("backup:", backupAt);
await sql.begin(async (tx) => {
  if (retained.length) await tx`DELETE FROM mcc_allotments WHERE year = ${YEAR} AND round = ${ROUND} AND status ILIKE 'Retained%'`;
  for (const u of updates)
    await tx`UPDATE mcc_allotments SET institute_id = ${u.inst}, state = ${u.state}, match_method = 'short-name' WHERE id = ${u.id}`;
  await tx`UPDATE mcc_round_results SET rows = ${total}, updated_at = now() WHERE year = ${YEAR} AND round = ${ROUND}`;
  await tx`UPDATE content_blocks SET data = ${tx.json(nextSchedule)}, updated_at = now() WHERE id = ${sched.id}`;
  if (alert && alertTitle) await tx`UPDATE live_alerts SET title = ${alertTitle} WHERE id = ${alert.id}`;
});
console.log("applied");
await sql.end();
