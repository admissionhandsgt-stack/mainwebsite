// Creates the admin's NEET PG process lists (2026-10-18): pg_process_rounds, pg_process_mistakes
// and pg_schedule in Admin → Content → Sections & lists, filled from src/lib/pgProcessDefaults.ts
// and src/lib/neetPgSchedule.ts. Idempotent — each collection is filled only while it is empty.
//
//   node --env-file=.env.local scripts/seed_pg_process.mjs [--dry-run]
import postgres from "postgres";
import { PG_MISTAKES, PG_ROUNDS } from "../src/lib/pgProcessDefaults.ts";
import { NEET_PG_SCHEDULE } from "../src/lib/neetPgSchedule.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const COLLECTIONS = [
  {
    slug: "pg_process_rounds",
    label: "NEET PG process · Rounds",
    description: "The round-by-round timeline on /neet-pg-process. Title is the round, subtitle its tag (R1, R2, R3, R4+), body the one-line summary. Detail: one point per line. Watch: the mistake that costs a seat in that round.",
    fields: '["title","subtitle","body","data.detail","data.watch"]',
    order: 330,
    rows: PG_ROUNDS.map((r) => ({ title: r.title, subtitle: r.tag, body: r.summary, data: { detail: r.detail.join("\n"), ...(r.watch ? { watch: r.watch } : {}) } })),
  },
  {
    slug: "pg_process_mistakes",
    label: "NEET PG process · Mistakes",
    description: "The mistake cards on /neet-pg-process. Title and body. The heading counts them.",
    fields: '["title","body"]',
    order: 331,
    rows: PG_MISTAKES.map((m) => ({ title: m.title, subtitle: null, body: m.body, data: {} })),
  },
  {
    slug: "pg_schedule",
    label: "NEET PG · MCC schedule",
    description: "MCC's NEET PG round dates on /neet-pg-process. Title is the round; AIQ, AIQ join by, State, State join by as MCC's notice gives them. Replace the rows each cycle and revise them whenever MCC does — the year, notice date and source links are in Text & numbers, 'Page: NEET PG process'.",
    fields: '["title","data.aiq","data.aiq_join_by","data.state","data.state_join_by"]',
    order: 332,
    rows: NEET_PG_SCHEDULE.rounds.map((r) => ({
      title: r.round,
      subtitle: null,
      body: null,
      data: { aiq: r.aiq, aiq_join_by: r.aiqJoinBy, state: r.state, state_join_by: r.stateJoinBy },
    })),
  },
];

for (const c of COLLECTIONS) {
  if (dry) {
    console.log(`would register ${c.slug} and write ${c.rows.length} rows if empty`);
    continue;
  }
  const reg = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT ${c.slug}, ${c.label}, ${c.description}, to_jsonb(${c.fields}::text), ${c.order}
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = ${c.slug})
    RETURNING id`;
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${c.slug}`;
  if (n > 0) {
    console.log(`${c.slug}: ${reg.length ? "registered" : "already registered"}, already has ${n} rows — left as written`);
    continue;
  }
  let i = 0;
  for (const r of c.rows) {
    i++;
    await sql`
      INSERT INTO content_blocks (collection, title, subtitle, body, data, display_order, is_active)
      VALUES (${c.slug}, ${r.title}, ${r.subtitle}, ${r.body}, ${sql.json(r.data)}, ${i}, true)`;
  }
  console.log(`${c.slug}: ${reg.length ? "registered" : "already registered"}, wrote ${i} rows`);
}
await sql.end();
