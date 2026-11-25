/**
 * The official seat-leaving terms per college × seat type into `pg_seat_leaving` (migration 0069, created here if missing).
 *
 *   npx tsx --env-file=.env.local scripts/import_seat_leaving.ts [file] [--apply --backup <f>]
 *
 * Dry run by default. The file is the PG tool session's seat_leaving_terms_2026-27.json: `college_id` = institutes.source_id
 * (level pg), `quota` = pg_seat_terms.seat_type, `public_text` the page wording. A row whose college we do not hold is
 * skipped; two rows for one college × seat type keep the stronger status (official over none-stated over DNB over not
 * confirmed). Any public_text with a source bracket or the tool's Hinglish working words is refused — the whole run stops.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--backup")) ?? "D:/Admisson Hands/pg_handoff/from_pg/seat_leaving_terms_2026-27.json";
const apply = args.includes("--apply");
const backup = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : undefined;
if (apply && !backup) throw new Error("--apply needs --backup <file>");

type Row = { college_id: number; college: string; state: string; counselling: string; quota: string; status: string; public_text?: string; sources?: string[] };
const data = JSON.parse(readFileSync(file, "utf8")) as { as_of?: string; rows: Row[] };
const RANK: Record<string, number> = { official: 4, official_none_stated: 3, dnb_no_sum_set: 2, not_confirmed: 1 };
const BAD = /\[|\]|purane|pakka|kisi official|likha tha/i;

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
await sql.unsafe(readFileSync(new URL("../src/db/migrations/0069_pg_seat_leaving.sql", import.meta.url), "utf8"));
const inst = new Map((await sql<{ id: number; source_id: number }[]>`SELECT id, source_id FROM institutes WHERE level = 'pg' AND source_id IS NOT NULL`).map((r) => [Number(r.source_id), r.id]));

const out = new Map<string, { institute_id: number; seat_type: string; counselling: string; status: string; public_text: string; sources: string[] }>();
let noCollege = 0;
for (const r of data.rows) {
  if (!(r.status in RANK)) throw new Error(`unknown status ${r.status}`);
  const text = (r.public_text ?? "").trim();
  if (BAD.test(text)) throw new Error(`refused public_text (${r.college_id} ${r.quota}): ${text.slice(0, 120)}`);
  const id = inst.get(Number(r.college_id));
  if (!id) { noCollege++; continue; }
  const k = `${id}|${r.quota.trim().toLowerCase()}`;
  const had = out.get(k);
  if (had && RANK[had.status] >= RANK[r.status]) continue;
  out.set(k, { institute_id: id, seat_type: r.quota.trim(), counselling: r.counselling, status: r.status, public_text: r.status === "not_confirmed" ? "" : text, sources: r.sources ?? [] });
}
const rows = [...out.values()];
const by = rows.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
console.log(`file ${data.rows.length} rows (as of ${data.as_of ?? "?"}); college not ours ${noCollege}; to load ${rows.length}`, by);
const old = await sql`SELECT * FROM pg_seat_leaving`;
console.log(`replaces ${old.length} rows${apply ? "" : " (dry run — pass --apply --backup <file>)"}`);
if (apply) {
  writeFileSync(backup!, JSON.stringify(old, null, 1));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM pg_seat_leaving`;
    const asOf = data.as_of ?? null;
    for (let i = 0; i < rows.length; i += 500)
      await tx`INSERT INTO pg_seat_leaving ${tx(rows.slice(i, i + 500).map((r) => ({ ...r, sources: JSON.stringify(r.sources), as_of: asOf })))}`;
  });
  console.log(`written; backup ${backup}. Refresh: bash scripts/revalidate_tags.sh --purge seat-leaving`);
}
await sql.end();
