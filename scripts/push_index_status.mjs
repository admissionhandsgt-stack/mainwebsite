// Push Google's index status (URL Inspection results) into index_status — the newest result per page wins, and an
// older result never overwrites a newer one. Run after each `scripts/gsc_coverage.mjs run`:
//   node --env-file=.env.local scripts/push_index_status.mjs "D:/Admisson Hands/seo_data/gsc_coverage_2026-11.jsonl" [more.jsonl]
import postgres from "postgres";
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) throw new Error("give the coverage .jsonl file(s)");
const latest = new Map();
for (const f of files)
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r.url || !r.coverage || !r.at) continue;
    const path = new URL(r.url).pathname.replace(/\/$/, "") || "/";
    const had = latest.get(path);
    if (!had || had.at < r.at) latest.set(path, { path, coverage: r.coverage, verdict: r.verdict ?? null, crawl: r.crawl ?? null, at: r.at });
  }
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
let n = 0;
for (const r of latest.values()) {
  await sql`
    INSERT INTO index_status (path, coverage, verdict, last_crawl, checked_at)
    VALUES (${r.path}, ${r.coverage}, ${r.verdict}, ${r.crawl}, ${r.at})
    ON CONFLICT (path) DO UPDATE SET coverage = EXCLUDED.coverage, verdict = EXCLUDED.verdict, last_crawl = EXCLUDED.last_crawl, checked_at = EXCLUDED.checked_at
     WHERE index_status.checked_at < EXCLUDED.checked_at`;
  n++;
}
const sum = await sql`SELECT coverage, COUNT(*)::int AS n FROM index_status GROUP BY coverage ORDER BY n DESC`;
console.log(`pushed ${n} pages`, sum.map((x) => `${x.coverage}: ${x.n}`).join(" · "));
await sql.end();
