// Moves a NEET UG year's state-counselling rounds out of closing_ranks into state_round_cuts (level 'ug').
//
//   node --env-file=.env.local scripts/ug/move_ug_state_rounds.mjs [--year 2026]                  dry run
//   node --env-file=.env.local scripts/ug/move_ug_state_rounds.mjs [--year 2026] --apply --backup <file>
//   node --env-file=.env.local scripts/ug/move_ug_state_rounds.mjs --restore <backup file>
//
// Why (owner, 2026-11-04: "Predictor mai 2026 round 1 ka data use mat karo bas feed karke rakho"): seat_options
// keeps each seat's LATEST year, so a state counselling's 2026 round 1 or 2 in closing_ranks replaces that seat's
// complete 2025 counselling (rounds 1–4) in the predictor, the college bands and the rounds tab. The PG state
// rounds were never put there (migration 0047); the UG ones came in with the September 2026 scrape (R1/R2 of 19
// state counsellings, 300 rows) and are moved here on 2026-11-09. MCC's counsellings are not touched: MCC's NEET UG
// 2026 counselling is complete (special stray round, 6 Nov) and its rows stay in closing_ranks.
//
// Nothing reads state_round_cuts at level 'ug' (lib/stateRoundQueries.ts reads level 'pg' only), so the rows are
// kept, not shown. The backup holds every closing_ranks row with its id; --restore puts them back exactly and
// removes the moved copies (marked by MOVED_NOTE).
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
// MCC's undergraduate counsellings (AIQ, open seat, deemed, ESI, DU, IP, AMU, CW, Jamia) — see import_mcc_ug.mjs.
const MCC = [123, 126, 135, 137, 146, 147, 150, 151, 154];
const MOVED_NOTE =
  "NEET UG state round of a year still in progress, moved out of closing_ranks on 2026-11-09 so the predictor keeps the " +
  "state's complete 2025 counselling (owner's rule of 2026-11-04). From the September 2026 UG scrape.";

if (args[0] === "--restore") {
  const b = JSON.parse(readFileSync(args[1], "utf8"));
  await sql.begin(async (tx) => {
    const gone = await tx`DELETE FROM state_round_cuts WHERE level = 'ug' AND year = ${b.year} AND note = ${MOVED_NOTE}`;
    for (let i = 0; i < b.rows.length; i += 500) await tx`INSERT INTO closing_ranks ${tx(b.rows.slice(i, i + 500))}`;
    console.log(`removed ${gone.count} moved rows from state_round_cuts`);
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`restored ${b.rows.length} closing_ranks rows of ${b.year}; seat_options refreshed`);
  await sql.end();
  process.exit(0);
}

const year = Number(flag("--year") ?? 2026);
const apply = args.includes("--apply");
const backup = flag("--backup");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

const rows = await sql`
  SELECT * FROM closing_ranks
  WHERE level = 'ug' AND year = ${year} AND counselling_id IS NOT NULL AND counselling_id NOT IN ${sql(MCC)}
  ORDER BY id`;
const summary = await sql`
  SELECT co.name AS counselling, cr.round_label, count(*)::int AS rows, count(DISTINCT cr.institute_id)::int AS colleges
  FROM closing_ranks cr JOIN counsellings co ON co.id = cr.counselling_id
  WHERE cr.level = 'ug' AND cr.year = ${year} AND cr.counselling_id NOT IN ${sql(MCC)}
  GROUP BY 1, 2 ORDER BY 1, 2`;
console.table(summary);
const seats = await sql`
  SELECT count(*)::int AS n FROM seat_options
  WHERE level = 'ug' AND latest_year = ${year} AND counselling_id NOT IN ${sql(MCC)}`;
console.log(`${rows.length} closing_ranks rows; ${seats[0].n} seat_options rows now read ${year} from them`);

if (!apply) {
  console.log("dry run — nothing written");
  await sql.end();
  process.exit(0);
}
if (!rows.length) {
  console.log("nothing to move");
  await sql.end();
  process.exit(0);
}

writeFileSync(backup, JSON.stringify({ year, at: new Date().toISOString(), rows }));
await sql.begin(async (tx) => {
  const ids = rows.map((r) => r.id);
  const moved = await tx`
    INSERT INTO state_round_cuts
      (level, state_id, year, round, round_printed, counselling, institute_id, college_printed, course_id, course_printed,
       quota, category, category_printed, pwd, in_service, seats_allotted, closing_air, closing_state_rank, note)
    SELECT 'ug', COALESCE(co.state_id, i.state_id), cr.year, cr.round_label, cr.round_label, co.name,
           cr.institute_id, i.name, cr.course_id, c.name,
           COALESCE(q.label, q.code, 'Not printed'), COALESCE(cat.code, 'Not printed'), COALESCE(cat.label, cat.code, 'Not printed'),
           COALESCE(cat.is_pwd, false), false, cr.seats_allotted, cr.ai_rank, COALESCE(cr.counselling_rank, cr.closing_rank),
           ${MOVED_NOTE}
    FROM closing_ranks cr
    JOIN counsellings co ON co.id = cr.counselling_id
    JOIN institutes i ON i.id = cr.institute_id
    JOIN courses c ON c.id = cr.course_id
    LEFT JOIN quotas q ON q.id = cr.quota_id
    LEFT JOIN categories cat ON cat.id = cr.category_id
    WHERE cr.id IN ${tx(ids)}`;
  if (moved.count !== rows.length) throw new Error(`copied ${moved.count} of ${rows.length} rows — rolled back`);
  const gone = await tx`DELETE FROM closing_ranks WHERE id IN ${tx(ids)}`;
  if (gone.count !== rows.length) throw new Error(`deleted ${gone.count} of ${rows.length} rows — rolled back`);
});
console.log(`moved ${rows.length} rows to state_round_cuts (level 'ug'); backup ${backup}`);
await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
console.log("seat_options refreshed");
await sql.end();
