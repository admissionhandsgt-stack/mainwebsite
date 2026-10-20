// Loads NEET score → rank ranges (migration 0040) from the PG data session's export of NBEMS's
// published NEET-PG results. Replaces the rows of each (exam, year) in the file, in one transaction.
// Refuses a file whose bands overlap or run backwards — a higher score must always mean a better rank.
//
//   npx tsx --env-file=.env.local scripts/import_score_ranks.ts [file] [--dry-run]
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const file = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "D:/Admisson Hands/pg_handoff/from_pg/neet_pg_score_rank_2025_2026.csv";
const dry = process.argv.includes("--dry-run");

function parseCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); out.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const [head, ...body] = out;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""])));
}

const examOf = (s: string) => (/neet\s*pg/i.test(s) ? "pg" : /neet\s*(ug)?$/i.test(s) ? "ug" : null);
const rows = parseCsv(file).map((r) => ({
  exam: examOf(r.exam),
  year: Number(r.year),
  score: Number(r.score),
  score_out_of: Number(r.score_out_of),
  rank_min: Number(r.rank_min),
  rank_max: Number(r.rank_max),
  candidates_at_score: r.candidates_at_score ? Number(r.candidates_at_score) : null,
  source_title: r.source_title,
  source_url: r.source_url || null,
  fetched_on: /^\d{4}-\d{2}-\d{2}$/.test(r.fetched_on ?? "") ? r.fetched_on : null,
}));

const bad = rows.filter((r) => !r.exam || !Number.isInteger(r.year) || !Number.isInteger(r.score) || !(r.rank_min >= 1) || r.rank_max < r.rank_min);
if (bad.length) throw new Error(`${bad.length} malformed rows, e.g. ${JSON.stringify(bad[0])}`);
const groups = new Map<string, typeof rows>();
for (const r of rows) {
  const k = `${r.exam}|${r.year}`;
  const g = groups.get(k);
  if (g) g.push(r);
  else groups.set(k, [r]);
}
for (const [k, list] of groups) {
  const byScore = [...list].sort((a, b) => b.score - a.score);
  for (let i = 1; i < byScore.length; i++) {
    if (byScore[i].rank_min <= byScore[i - 1].rank_max) throw new Error(`${k}: score ${byScore[i].score} overlaps score ${byScore[i - 1].score}`);
  }
  console.log(`${k}: ${list.length} scores, ${byScore[0].score} = rank ${byScore[0].rank_min} … ${byScore.at(-1)!.score} = rank ${byScore.at(-1)!.rank_max}`);
}
if (dry) process.exit(0);

await db.transaction(async (tx) => {
  for (const [k] of groups) {
    const [exam, year] = k.split("|");
    await tx.execute(sql`DELETE FROM score_ranks WHERE exam = ${exam} AND year = ${Number(year)}`);
  }
  const cols = Object.keys(rows[0]);
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    await tx.execute(sql`
      INSERT INTO score_ranks (${sql.raw(cols.join(", "))})
      VALUES ${sql.join(chunk.map((r) => sql`(${sql.join(cols.map((c) => sql`${(r as Record<string, unknown>)[c] ?? null}`), sql`, `)})`), sql`, `)}`);
  }
});
const n = (await db.execute(sql`SELECT exam, year, COUNT(*)::int AS n FROM score_ranks GROUP BY 1, 2 ORDER BY 1, 2`)) as unknown as object[];
console.log("loaded:", JSON.stringify(n));
process.exit(0);
