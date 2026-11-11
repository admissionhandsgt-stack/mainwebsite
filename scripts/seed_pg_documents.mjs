// Creates the admin's NEET PG documents lists (2026-11-12): the `pg_documents_official` collection in Admin → Content → Sections &
// lists, one row per counselling authority, filled from src/lib/pgDocuments.ts. Idempotent — rows are written only while
// the collection is empty, so the team's edits are never replaced.
//
//   node --env-file=.env.local scripts/seed_pg_documents.mjs [--dry-run]
import postgres from "postgres";
import { PG_DOCUMENTS } from "../src/lib/pgDocuments.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const description =
  "The /neet-pg-documents page, one row per counselling authority (MCC first). Title is the authority; subtitle the document it comes from, with its date; body the list, one document per line — start a line with \"[E] \" for one the authority marks essential, \"## \" for a sub-heading. The url is the official document; notes are points beside the list, one per line; checked is the date you read it. Update each list when the authority publishes the new year's brochure.";
const fields = JSON.stringify(["title", "subtitle", "body", "data.url", "data.notes", "data.checked"]);

if (dry) {
  console.log(`would register pg_documents and write ${PG_DOCUMENTS.length} rows if empty`);
} else {
  const c = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT 'pg_documents_official', 'NEET PG · documents by authority', ${description}, to_jsonb(${fields}::text), 301
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'pg_documents_official')
    RETURNING id`;
  console.log(c.length ? "collection registered" : "collection already registered");

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'pg_documents_official'`;
  if (n > 0) {
    console.log(`collection already has ${n} rows — left as the team wrote them`);
  } else {
    let i = 0;
    for (const d of PG_DOCUMENTS) {
      i++;
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, data, display_order, is_active)
        VALUES ('pg_documents_official', ${d.title}, ${d.subtitle}, ${d.body},
                ${sql.json({ url: d.url, notes: d.notes, checked: d.checked })}, ${i}, true)`;
    }
    console.log(`wrote ${i} rows`);
  }
}
await sql.end();
