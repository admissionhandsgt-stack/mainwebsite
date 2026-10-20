// Applies a file of hand-made NMC matches (scripts/data/nmc_decisions_*.json) through the same
// functions Admin → Data sync uses, after checking each one: the NMC code exists at that level,
// the institute is ours at that level and in the same state, and a PG pairing has MD/MS seats.
// Writes nothing without --apply.
//   npx tsx --env-file=.env.local scripts/apply_nmc_decisions.ts scripts/data/nmc_decisions_2026_10_20.json [--apply]
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mapNmc, markNmcNone, nmcStatus } from "@/lib/nmcAdmin";
import { stateKey } from "@/lib/nmcSync";

type Decisions = Record<"ug" | "pg", Record<string, [number | null, string]>>;
const rows = <T,>(r: unknown) => r as unknown as T[];
const file = process.argv[2];
const apply = process.argv.includes("--apply");
const decisions = JSON.parse(readFileSync(file, "utf8")) as Decisions;

const nmc = new Map(
  rows<{ code: string; name: string; state: string; ug: boolean; pg: boolean }>(
    await db.execute(sql`
      SELECT college_code AS code, MIN(college_name) AS name, MIN(state_name) AS state,
             BOOL_OR(course_name = 'M.B.B.S.') AS ug, BOOL_OR(course_type IN ('MD', 'MS', 'Diploma')) AS pg
        FROM nmc_courses GROUP BY 1`),
  ).map((r) => [r.code, r]),
);
const ids = [decisions.ug, decisions.pg].flatMap((d) => Object.values(d).map(([id]) => id).filter((x): x is number => x != null));
const ours = new Map(
  rows<{ id: number; name: string; level: string; state: string; mdms: number }>(
    await db.execute(sql`
      SELECT i.id, i.name, i.level::text AS level, COALESCE(s.name, '') AS state,
             (SELECT COUNT(*)::int FROM seat_options so JOIN courses c ON c.id = so.course_id
               WHERE so.institute_id = i.id AND c.name ~ '^(MD|MS) ') AS mdms
        FROM institutes i LEFT JOIN states s ON s.id = i.state_id
       WHERE i.id IN (${sql.join(ids.map((v) => sql`${v}`), sql`, `)})`),
  ).map((r) => [r.id, r]),
);

const problems: string[] = [];
const seen = new Map<number, string>();
for (const level of ["ug", "pg"] as const) {
  for (const [code, [id, why]] of Object.entries(decisions[level])) {
    const n = nmc.get(code);
    if (!n) { problems.push(`${code}: not in the NMC register`); continue; }
    if (!n[level]) problems.push(`${code}: has no ${level === "ug" ? "MBBS" : "MD/MS"} course in the register`);
    if (id == null) continue;
    const o = ours.get(id);
    if (!o) { problems.push(`${code}: institute ${id} does not exist`); continue; }
    if (o.level !== level) problems.push(`${code}: institute ${id} is ${o.level}, decision is ${level}`);
    if (stateKey(o.state) !== stateKey(n.state)) problems.push(`${code}: ${n.state} against our ${o.state} (${id})`);
    if (level === "pg" && !o.mdms && !/only entry/i.test(why)) problems.push(`${code}: institute ${id} has no MD/MS seats`);
    if (seen.has(id)) problems.push(`${code}: institute ${id} also chosen for ${seen.get(id)}`);
    seen.set(id, code);
  }
}
const count = (l: "ug" | "pg") => Object.values(decisions[l]);
console.log(`ug: ${count("ug").filter(([i]) => i != null).length} pairs, ${count("ug").filter(([i]) => i == null).length} none`);
console.log(`pg: ${count("pg").filter(([i]) => i != null).length} pairs, ${count("pg").filter(([i]) => i == null).length} none`);
if (problems.length) {
  console.log("\nPROBLEMS — nothing applied:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("all checks pass");

if (apply) {
  // Pairs first, so a "none" never lands on a code that one of these pairs is about to claim.
  for (const level of ["ug", "pg"] as const)
    for (const [code, [id]] of Object.entries(decisions[level])) if (id != null) await mapNmc(code, id);
  for (const level of ["ug", "pg"] as const)
    for (const [code, [id]] of Object.entries(decisions[level])) if (id == null) await markNmcNone(code, level);
  const st = await nmcStatus();
  const left = st.unmatched;
  console.log(`\napplied. Coverage: MBBS ${st.coverage.ugMatched}/${st.coverage.ugTotal}, MD/MS ${st.coverage.pgMatched}/${st.coverage.pgTotal}`);
  console.log(`still unmatched: ${left.length}`);
  for (const u of left) console.log(`  ${u.level} ${u.code} ${u.name}`);
}
process.exit(0);
