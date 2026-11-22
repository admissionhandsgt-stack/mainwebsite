// Round 2 of MCC's NEET PG 2026 counselling: the final result and the last date of reporting (2026-11-22).
//
// MCC posted "Final Allotment Result for PG 2026 Round 2" on the evening of 20 Nov (ingested the same hour: 20,707 seats)
// and Notice No. 12 of 20.11.2026: "the Result of Round-2 of PG Counselling 2026 has been declared. The last date of
// reporting for Round-2 is 25.11.2026 (upto 10:00 P.M) … there will be no extension of reporting time."
// https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/20261120750611410.pdf (page read, not only its text).
//
// The schedule row (Admin → Content → "NEET PG · MCC schedule") still said "20 Nov (provisional); final result awaited",
// "after the final result, till 24 Nov" and join by 24 Nov, with the "dates may change" note for that notice. Now: result
// 20 Nov, reporting till 25 Nov 10 PM, join by 25 Nov, and the note is cleared because the notice is applied.
// Guarded on the row as it stood; prints the old data so it can be put back by hand.
//   node --env-file=.env.local scripts/sql/pg_schedule_round2_final_2026_11_22.mjs [--apply]
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const APPLY = process.argv.includes("--apply");
const WAS = "20 Nov (provisional); final result awaited";

const [row] = await sql`SELECT id, data FROM content_blocks WHERE collection = 'pg_schedule' AND title = 'Round 2'`;
const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
console.log("before:", JSON.stringify(data));
if (data.result !== WAS) {
  console.log(`not changed: result is "${data.result}", not the 20 Nov provisional wording`);
} else {
  const next = { ...data };
  next.result = "20 Nov";
  next.reporting = "till 25 Nov, 10 PM (no extension)";
  next.aiq_join_by = "25 Nov";
  next.source = "MCC Notice No. 12 of 20 Nov 2026 (last date of reporting) and the AIQ & State schedule of 16 Nov 2026";
  delete next.revision;
  delete next.revision_url;
  delete next.revision_on;
  console.log("after: ", JSON.stringify(next));
  if (APPLY) {
    await sql`UPDATE content_blocks SET data = ${sql.json(next)}, updated_at = now() WHERE id = ${row.id}`;
    console.log("applied");
  } else {
    console.log("dry run — add --apply");
  }
}

// Round 1: the "dates may change" note still named MCC's notice of 12 Nov for candidates who had not reported in
// Round 1. Round 1's reporting closed on 2 Nov and that notice moved no date, so the note is cleared (it was shown above
// every table of MCC dates: year page, choice filling, process, the Hinglish guide).
const R1_NOTE = "Notice for Not Reported candidates of Round-1";
const [r1] = await sql`SELECT id, data FROM content_blocks WHERE collection = 'pg_schedule' AND title = 'Round 1'`;
const d1 = typeof r1.data === "string" ? JSON.parse(r1.data) : r1.data;
if (d1.revision !== R1_NOTE) {
  console.log(`Round 1 not changed: its note is "${d1.revision ?? ""}"`);
} else {
  console.log("Round 1 before:", JSON.stringify(d1));
  const next = { ...d1 };
  delete next.revision;
  delete next.revision_url;
  delete next.revision_on;
  if (APPLY) {
    await sql`UPDATE content_blocks SET data = ${sql.json(next)}, updated_at = now() WHERE id = ${r1.id}`;
    console.log("Round 1 note cleared");
  } else {
    console.log("Round 1: dry run — add --apply");
  }
}
await sql.end();
