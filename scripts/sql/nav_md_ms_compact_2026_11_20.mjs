// The MD/MS mega menu, compact (2026-11-20, owner: "menu … organised nhi hai … MD/MS … page mai aa bhi nhi rahe options
// … compact … blank space hatado"). It had 25 links in three columns of 7 / 13 / 5 with two-line descriptions: the middle
// column ran past the bottom of a laptop screen and the right one left a block of white. Now four columns of 6 / 7 / 7 / 5
// with one short line each — every link kept, none hidden:
//   Colleges & seats · Cutoff & results · Counselling guide (new group row) · Fees, stipend & bond.
// Guarded on the ids and the menu as it stood; the old rows are written to a backup first.
//   node --env-file=.env.local scripts/sql/nav_md_ms_compact_2026_11_20.mjs [--apply --backup <file>] | --restore <file>
import fs from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const backupAt = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const restoreFrom = args.includes("--restore") ? args[args.indexOf("--restore") + 1] : null;
const MDMS = 6;

if (restoreFrom) {
  const b = JSON.parse(fs.readFileSync(restoreFrom, "utf8"));
  await sql.begin(async (tx) => {
    for (const r of b.rows) await tx`UPDATE nav_items SET parent_id = ${r.parent_id}, label = ${r.label}, description = ${r.description}, display_order = ${r.display_order}, is_active = ${r.is_active} WHERE id = ${r.id}`;
    if (b.created) await tx`DELETE FROM nav_items WHERE id = ${b.created}`;
  });
  console.log("restored");
  await sql.end();
  process.exit(0);
}

// [group, [id, label, description][]]
const PLAN = [
  [{ id: 82, label: "Colleges & seats" }, [
    [8, "All PG Colleges", "Every MD/MS and DNB college"],
    [64, "PG Colleges by State", "Colleges and cut off, state by state"],
    [103, "Medical Colleges by City", "Fees, seats and stipend by city"],
    [62, "Deemed Universities", "Deemed PG seats and fees"],
    [78, "NEET PG Seat Matrix", "MCC's 2026 seats by quota and branch"],
    [108, "Seat Increase 2026", "Seats MCC added this year"],
  ]],
  [{ id: 83, label: "Cutoff & results" }, [
    [80, "Round Results 2026", "Each MCC round's result and cut off"],
    [55, "NEET PG Cutoff", "All India cut off by category"],
    [48, "Branch-wise Cutoff", "Every branch: seats and cut off"],
    [95, "NEET PG Marks vs Rank", "Your score, its rank and branches"],
    [98, "Low Score Clinical Branches", "Clinical seats at a low rank"],
    [101, "MD vs DNB", "Seats, cut off and stipend compared"],
    [99, "NEET PG Statistics 2026", "Candidates, seats and rounds"],
  ]],
  [{ id: null, label: "Counselling guide" }, [
    [100, "Counselling Updates", "MCC and state notices, newest first"],
    [47, "NEET PG Process", "MCC and state rounds, step by step"],
    [97, "Choice Filling & Free Exit", "Locking, Freeze vs Float, upgrades"],
    [105, "Documents Required", "MCC's and each state's list"],
    [106, "Open States", "States that take outside candidates"],
    [107, "In-Service Quota", "Each state's in-service rule"],
    [104, "Counselling Guide (Hinglish)", "Aasan bhasha mein, step by step"],
  ]],
  [{ id: 84, label: "Fees, stipend & bond" }, [
    [96, "PG Fees by State", "Govt, private and deemed fees"],
    [63, "Private College Fees", "MD/MS fees in private colleges"],
    [51, "Management Quota", "Paid seats and their fees"],
    [52, "Stipend by State", "Monthly PG stipend by state"],
    [79, "Service Bond by State", "Bond years and penalty by state"],
  ]],
];

const ids = PLAN.flatMap(([g, links]) => [...(g.id ? [g.id] : []), ...links.map((l) => l[0])]);
const rows = await sql`SELECT id, parent_id, label, url, description, display_order, is_active, menu FROM nav_items WHERE id IN ${sql(ids)}`;
const byId = new Map(rows.map((r) => [r.id, r]));
const missing = ids.filter((i) => !byId.has(i));
if (missing.length) throw new Error(`rows not found: ${missing.join(", ")}`);
const bad = rows.filter((r) => r.menu !== "header");
if (bad.length) throw new Error(`not header rows: ${bad.map((r) => r.id).join(", ")}`);
// Every active MD/MS link today must be in the plan, so nothing is dropped.
const groupIds = (await sql`SELECT id FROM nav_items WHERE parent_id = ${MDMS} AND is_active`).map((r) => r.id);
const liveLinks = (await sql`SELECT id, label FROM nav_items WHERE parent_id IN ${sql(groupIds)} AND is_active`);
const planned = new Set(PLAN.flatMap(([, links]) => links.map((l) => l[0])));
const left = liveLinks.filter((l) => !planned.has(l.id));
if (left.length) throw new Error(`live links not in the plan: ${left.map((l) => `${l.id} ${l.label}`).join(", ")}`);
console.log(`groups ${PLAN.length}, links ${planned.size} (live today ${liveLinks.length})`);
for (const [g, links] of PLAN) console.log(`  ${g.label}: ${links.length} — ${links.map((l) => l[1]).join(" · ")}`);

if (!APPLY) { console.log("dry run — pass --apply --backup <file>"); await sql.end(); process.exit(0); }
if (!backupAt) throw new Error("--apply needs --backup <file>");
const backup = { rows: [...rows], created: null };
await sql.begin(async (tx) => {
  let order = 0;
  for (const [g, links] of PLAN) {
    let gid = g.id;
    if (!gid) {
      const [made] = await tx`INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
                              VALUES ('header', ${MDMS}, ${g.label}, '#', NULL, ${order}, true) RETURNING id`;
      gid = made.id;
      backup.created = gid;
    } else {
      await tx`UPDATE nav_items SET label = ${g.label}, display_order = ${order}, is_active = true WHERE id = ${gid}`;
    }
    order++;
    let i = 0;
    for (const [id, label, description] of links) {
      await tx`UPDATE nav_items SET parent_id = ${gid}, label = ${label}, description = ${description}, display_order = ${i++}, is_active = true WHERE id = ${id}`;
    }
  }
});
fs.writeFileSync(backupAt, JSON.stringify(backup, null, 1));
console.log("applied; backup:", backupAt);
await sql.end();
