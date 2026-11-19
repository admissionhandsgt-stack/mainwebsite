// The MD/MS and NRI FAQ answers corrected against MCC's 2026 bulletins and NBEMS's 2026 qualifying notice
// (2026-11-19, with the document checklists — see documents_facts_2026_11_19.mjs). Each row changes only while it still
// holds the shipped answer. node --env-file=.env.local scripts/sql/faq_facts_2026_11_19.mjs [--apply]
import postgres from "postgres";
import { readFileSync } from "node:fs";
const APPLY = process.argv.includes("--apply");
const fix = JSON.parse(readFileSync(new URL("./faq_facts_2026_11_19.json", import.meta.url), "utf8"));
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await sql.begin(async (tx) => {
  for (const f of fix) {
    const r = await tx`UPDATE content_blocks SET body = ${f.new}, updated_at = now() WHERE id = ${f.id} AND body = ${f.old} RETURNING id`;
    console.log(f.id, r.length ? "updated" : "left alone (edited, or already done)");
  }
  if (!APPLY) throw new Error("dry run — nothing written (pass --apply)");
}).catch((e) => console.log(e.message));
await sql.end();
