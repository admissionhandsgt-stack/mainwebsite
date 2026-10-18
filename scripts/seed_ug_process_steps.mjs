// Creates the admin's NEET UG process steps (2026-10-18): the `ug_process_steps` collection in
// Admin → Content → Sections & lists, filled from src/lib/ugProcessSteps.ts. Idempotent — rows
// are written only while the collection is empty, so the team's edits are never replaced.
//
//   node --env-file=.env.local scripts/seed_ug_process_steps.mjs [--dry-run]
import postgres from "postgres";
import { UG_PHASES } from "../src/lib/ugProcessSteps.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const description =
  "The steps on /neet-ug-process, in order. Title is the step, subtitle its phase (rows with the same subtitle form one tab), body what happens. Short: the phase's tab label. Support: what we do at that step. List: documents, one per line. Rounds: one 'Name: what happens' per line.";

const steps = UG_PHASES.flatMap((p) => p.steps.map((s) => ({ ...s, phase: p.title, short: p.shortTitle })));
if (dry) {
  console.log(`would register ug_process_steps and write ${steps.length} rows if empty`);
} else {
  const c = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT 'ug_process_steps', 'NEET UG process · Steps', ${description},
           to_jsonb(${'["title","subtitle","body","data.short","data.support","data.list","data.rounds"]'}::text), 320
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'ug_process_steps')
    RETURNING id`;
  console.log(c.length ? "collection registered" : "collection already registered");

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'ug_process_steps'`;
  if (n > 0) {
    console.log(`collection already has ${n} rows — left as the team wrote them`);
  } else {
    let i = 0;
    for (const s of steps) {
      i++;
      const data = {
        short: s.short,
        support: s.support,
        ...(s.list ? { list: s.list.join("\n") } : {}),
        ...(s.rounds ? { rounds: s.rounds.map((r) => `${r.name}: ${r.description}`).join("\n") } : {}),
      };
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, data, display_order, is_active)
        VALUES ('ug_process_steps', ${s.title}, ${s.phase}, ${s.description}, ${sql.json(data)}, ${i}, true)`;
    }
    console.log(`wrote ${i} rows`);
  }
}
await sql.end();
