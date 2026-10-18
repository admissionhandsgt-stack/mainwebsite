// Creates the admin's NRI document checklist (2026-10-18): the `nri_documents` collection in
// Admin → Content → Sections & lists, filled from src/lib/nriDocuments.ts. Idempotent — the
// rows are written only while the collection is empty, so the team's edits are never replaced.
//
//   node --env-file=.env.local scripts/seed_nri_documents.mjs [--dry-run]
import postgres from "postgres";
import { NRI_DOCUMENTS } from "../src/lib/nriDocuments.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const description =
  "The NRI documents page. Title is the document, subtitle its group (Proof of NRI status / If a relative sponsors you / Exam, school and identity — or a new group of your own), body what it proves or who issues it. Update it when MCC issues the new cycle's notice.";

if (dry) {
  console.log(`would register nri_documents and write ${NRI_DOCUMENTS.length} rows if empty`);
} else {
  // `fields` is stored as a JSON string inside jsonb, like every other collection.
  const c = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT 'nri_documents', 'NRI · Document checklist', ${description}, to_jsonb(${'["title","subtitle","body"]'}::text), 300
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'nri_documents')
    RETURNING id`;
  console.log(c.length ? "collection registered" : "collection already registered");

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'nri_documents'`;
  if (n > 0) {
    console.log(`collection already has ${n} rows — left as the team wrote them`);
  } else {
    let i = 0;
    for (const d of NRI_DOCUMENTS) {
      i++;
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, display_order, is_active)
        VALUES ('nri_documents', ${d.title}, ${d.group}, ${d.body}, ${i}, true)`;
    }
    console.log(`wrote ${i} rows`);
  }
}
await sql.end();
