/**
 * Load the stipend / bond research pass into `college_research` (migration 0067).
 *
 *   npx tsx --env-file=.env.local scripts/import_college_research.ts <dir with result_*.json> [--checked 2026-11-16] [--apply]
 *
 * Dry run by default: prints what each file holds and how many rows would be written. --apply upserts one row per
 * institute (the files' "id" is institutes.id), leaving rows for other institutes alone. The files live outside the repo:
 * they hold residents' complaints, which are for counsellors only and must never be committed (the repo is public).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");
const checked = args[args.indexOf("--checked") + 1]?.match(/^\d{4}-\d\d-\d\d$/) ? args[args.indexOf("--checked") + 1] : new Date().toISOString().slice(0, 10);
if (!dir) throw new Error("usage: import_college_research.ts <dir> [--checked YYYY-MM-DD] [--apply]");

type Row = { id: number; state?: string; stipend?: unknown; bond?: unknown; concerns?: unknown; [k: string]: unknown };
const rows: Row[] = [];
for (const f of readdirSync(dir).filter((x) => /^result_[A-Z]+\.json$/.test(x)).sort()) {
  const list = JSON.parse(readFileSync(join(dir, f), "utf8")) as Row[];
  console.log(`${f}: ${list.length} colleges`);
  rows.push(...list);
}
const byStatus = (k: "stipend" | "bond") =>
  rows.reduce<Record<string, number>>((m, r) => {
    const s = (r[k] as { status?: string } | undefined)?.status;
    if (s) m[s] = (m[s] ?? 0) + 1;
    return m;
  }, {});
console.log("stipend:", byStatus("stipend"), "bond:", byStatus("bond"), "with concerns:", rows.filter((r) => Array.isArray(r.concerns) && r.concerns.length).length);

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const known = new Set((await sql<{ id: number }[]>`SELECT id FROM institutes WHERE id IN ${sql(rows.map((r) => r.id))}`).map((r) => r.id));
const missing = rows.filter((r) => !known.has(r.id));
if (missing.length) console.log("not in institutes (skipped):", missing.map((r) => `${r.id} ${r.college}`).join("; "));
const todo = rows.filter((r) => known.has(r.id));
console.log(`${todo.length} rows to write${apply ? "" : " (dry run — pass --apply)"}`);
if (apply) {
  await sql.begin(async (tx) => {
    for (const r of todo) {
      const { id, state, stipend, bond, concerns, college: _c, ...extra } = r;
      await tx`
        INSERT INTO college_research (institute_id, state, stipend, bond, concerns, extra, checked_on)
        VALUES (${id}, ${state ?? null}, ${stipend ? tx.json(stipend as never) : null}, ${bond ? tx.json(bond as never) : null},
                ${Array.isArray(concerns) && concerns.length ? tx.json(concerns as never) : null},
                ${Object.keys(extra).length ? tx.json(extra as never) : null}, ${checked})
        ON CONFLICT (institute_id) DO UPDATE SET state = EXCLUDED.state, stipend = EXCLUDED.stipend, bond = EXCLUDED.bond,
          concerns = EXCLUDED.concerns, extra = EXCLUDED.extra, checked_on = EXCLUDED.checked_on, imported_at = now()`;
    }
  });
  console.log("written. Refresh: bash scripts/revalidate_tags.sh --purge college-research");
}
await sql.end();
