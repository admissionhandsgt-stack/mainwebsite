/**
 * A state's NEET PG round from the PG data session's round-closing feed into `state_round_cuts` (2026-11-17, owner: "4
 * karo" — the state Round 1 lists we did not hold yet). The feed (GET …/round-closing?c=<key>, X-AH-Sync-Key) gives one
 * line per college × branch × seat type × category with each round's closing and opening AIR and seats, built from the
 * state's own list (AIR joined from NBEMS where the list prints a state rank). Its `college_id` is our institutes.source_id
 * and its quota labels are ours, so lines map directly; PwD and in-service lines keep their flags (the read side leaves
 * them out of the open-merit figures). Only group figures over 3+ colleges ever reach a page (lib/stateRoundQueries.ts).
 *
 *   npx tsx --env-file=.env.local scripts/import_state_round_feed.ts "<feed key>" --round R1 \
 *       --printed "<round as the list names it>" --counselling "<authority>" [--note "<line for the page>"] [--apply --backup <f>]
 *
 * Dry run by default (prints what maps and what does not). --apply replaces that state's year × round in one transaction.
 */
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("--"));
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const round = opt("--round") ?? "R1";
const printed = opt("--printed");
const counselling = opt("--counselling");
const note = opt("--note") ?? null;
const apply = args.includes("--apply");
const backup = opt("--backup");
const YEAR = 2026;
if (!key || !printed || !counselling) throw new Error('usage: import_state_round_feed.ts "<key>" --printed "…" --counselling "…" [--note "…"] [--apply --backup f]');
if (apply && !backup) throw new Error("--apply needs --backup <file>");

type Line = {
  college_id: number;
  college: string;
  state: string;
  type: string;
  branch: string;
  quota: string;
  quota_label: string;
  category: string;
  pwd: boolean;
  in_service: boolean;
  women_only: boolean;
  rounds: Record<string, { closing_air: number | null; opening_air: number | null; seats: number | null; label: string }>;
};

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const sync = (await sql<{ value: string }[]>`SELECT value FROM integrations WHERE key IN ('zyn.notices.key','counselor.sync_key') ORDER BY key DESC`)[0]?.value;
if (!sync) throw new Error("no sync key in integrations");
const res = await fetch(`https://ah.aismartscan.in/api/integrations/website/round-closing?c=${encodeURIComponent(key)}`, { headers: { "X-AH-Sync-Key": sync } });
if (!res.ok) throw new Error(`feed answered ${res.status}`);
const feed = (await res.json()) as { counselling: string; label: string; lines: Line[] };
const lines = feed.lines.filter((l) => l.rounds?.[round]?.closing_air);
const stateName = lines[0]?.state;
if (!stateName) throw new Error(`no ${round} lines for ${key}`);

const state = (await sql<{ id: number }[]>`SELECT id FROM states WHERE name = ${stateName}`)[0];
if (!state) throw new Error(`no state ${stateName}`);
const inst = new Map(
  (await sql<{ id: number; source_id: number }[]>`SELECT id, source_id FROM institutes WHERE level = 'pg' AND source_id IN ${sql([...new Set(lines.map((l) => l.college_id))])}`).map((r) => [r.source_id, r.id]),
);
const courses = new Map((await sql<{ id: number; name: string }[]>`SELECT id, name FROM courses WHERE level = 'pg'`).map((r) => [r.name, r.id]));

const noInst = new Map<string, number>();
const noCourse = new Map<string, number>();
const rows = lines.map((l) => {
  const r = l.rounds[round];
  const instituteId = inst.get(l.college_id) ?? null;
  const courseId = courses.get(l.branch) ?? null;
  if (!instituteId) noInst.set(`${l.college_id} ${l.college}`, (noInst.get(`${l.college_id} ${l.college}`) ?? 0) + 1);
  if (!courseId) noCourse.set(l.branch, (noCourse.get(l.branch) ?? 0) + 1);
  return {
    level: "pg",
    state_id: state.id,
    year: YEAR,
    round,
    round_printed: printed,
    counselling,
    source_url: null as string | null,
    institute_id: instituteId,
    college_printed: l.college,
    inst_code: null as string | null,
    course_id: courseId,
    course_printed: l.branch,
    quota: l.quota,
    seat_type_printed: l.quota_label,
    category: l.category,
    category_printed: l.category,
    pwd: !!l.pwd,
    additional_category: l.women_only ? "women" : null,
    in_service: !!l.in_service,
    seats_allotted: r.seats ?? null,
    opening_air: r.opening_air ?? null,
    closing_air: r.closing_air ?? null,
    opening_state_rank: null as number | null,
    closing_state_rank: null as number | null,
    note,
    note_url: null as string | null,
  };
});

console.log(`${key} (${stateName}) ${round}: ${lines.length} lines, ${new Set(lines.map((l) => l.college_id)).size} colleges`);
console.log(`  colleges not in our PG list (kept by name, no institute): ${noInst.size}`, [...noInst].slice(0, 10));
console.log(`  branch names not in our courses (kept as printed): ${noCourse.size}`, [...noCourse].slice(0, 10));
console.log(`  pwd lines ${rows.filter((r) => r.pwd).length}, in-service lines ${rows.filter((r) => r.in_service).length}`);
const old = await sql`SELECT * FROM state_round_cuts WHERE level = 'pg' AND state_id = ${state.id} AND year = ${YEAR} AND round = ${round}`;
console.log(`  replaces ${old.length} existing rows${apply ? "" : " (dry run — pass --apply --backup <file>)"}`);

if (apply) {
  writeFileSync(backup!, JSON.stringify(old, null, 1));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM state_round_cuts WHERE level = 'pg' AND state_id = ${state.id} AND year = ${YEAR} AND round = ${round}`;
    for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO state_round_cuts ${tx(rows.slice(i, i + 500))}`;
  });
  console.log(`  written; backup ${backup}. Refresh: bash scripts/revalidate_tags.sh --purge <the state-round tag>`);
}
await sql.end();
