// Creates the admin's list of state counselling authorities (2026-10-18): the `state_authorities`
// collection in Admin → Content → Sections & lists, filled from src/lib/stateAuthorityList.ts.
// Idempotent — rows are written only while the collection is empty, so edits are never replaced.
//
//   node --env-file=.env.local scripts/seed_state_authorities.mjs [--dry-run]
import postgres from "postgres";
import { STATE_AUTHORITIES, STATE_AUTHORITIES_CHECKED } from "../src/lib/stateAuthorityList.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const description =
  "The 'Who runs counselling here' card on the MBBS and MD/MS state pages. Title is the state exactly as the site names it, subtitle the authority, link its official website, body an optional note. Scope: 'UG' or 'UG and PG' (the MD/MS page shows the card only for 'UG and PG'). Checked: the month you last confirmed it against the year's notice.";

if (dry) {
  console.log(`would register state_authorities and write ${STATE_AUTHORITIES.length} rows if empty`);
} else {
  const c = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT 'state_authorities', 'States · Counselling authorities', ${description},
           to_jsonb(${'["title","subtitle","link_url","link_label","body","data.scope","data.checked"]'}::text), 310
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'state_authorities')
    RETURNING id`;
  console.log(c.length ? "collection registered" : "collection already registered");

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'state_authorities'`;
  if (n > 0) {
    console.log(`collection already has ${n} rows — left as the team wrote them`);
  } else {
    let i = 0;
    for (const a of STATE_AUTHORITIES) {
      i++;
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, link_url, link_label, data, display_order, is_active)
        VALUES ('state_authorities', ${a.state}, ${a.authority}, ${a.note ?? null}, ${a.url}, ${a.label},
                ${sql.json({ scope: a.scope, checked: STATE_AUTHORITIES_CHECKED })}, ${i}, true)`;
    }
    console.log(`wrote ${i} rows`);
  }
}
await sql.end();
