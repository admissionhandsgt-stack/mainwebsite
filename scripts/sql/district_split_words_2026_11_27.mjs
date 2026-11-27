/**
 * 32 PG institutes carried a district split by a line break in the source file — "Muzaffarna gar", "Visakhapatn am",
 * "Bhubanesw ar", "Secunderab ad" — which college pages printed as the place ("PG bond at Muzaffarnagar Medical College,
 * Muzaffarna gar"; the owner's screenshot, 2026-11-27). A value is fixed only when its words joined appear in the
 * institute's own name while the value as written does not, and one of its pieces is a stub of four letters or fewer;
 * the fix removes the space ("Muzaffarna gar" → "Muzaffarnagar"). Legitimate two-word districts (East Godavari) are not
 * touched by that rule.
 *
 *   node --env-file=.env.local scripts/sql/district_split_words_2026_11_27.mjs                       # dry run
 *   node --env-file=.env.local scripts/sql/district_split_words_2026_11_27.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/district_split_words_2026_11_27.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    for (const r of b) await tx`UPDATE institutes SET district = ${r.district} WHERE id = ${r.id}`;
  });
  console.log(`restored ${b.length} districts`);
  await sql.end();
  process.exit(0);
}

const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const rows = await sql`SELECT id, level, name, district FROM institutes WHERE district ~ ' '`;
const fix = rows.filter((r) => {
  const v = r.district;
  const joined = norm(v);
  return (
    joined.length > 5 &&
    norm(r.name).includes(joined) &&
    !r.name.toLowerCase().includes(v.toLowerCase()) &&
    v.toLowerCase().split(/\s+/).some((p) => p.length <= 4)
  );
});
for (const r of fix) console.log(String(r.id).padStart(5), r.level, JSON.stringify(r.district), "→", JSON.stringify(r.district.replace(/\s+/g, "")), "|", r.name);
console.log(`\n${fix.length} districts to rejoin`);
if (apply && fix.length) {
  writeFileSync(backup, JSON.stringify(fix.map((r) => ({ id: r.id, district: r.district })), null, 1));
  await sql.begin(async (tx) => {
    for (const r of fix) await tx`UPDATE institutes SET district = ${r.district.replace(/\s+/g, "")} WHERE id = ${r.id} AND district = ${r.district}`;
  });
  console.log(`applied; undo with --restore ${backup}`);
} else if (!apply) console.log("(dry run — pass --apply --backup <file>)");
await sql.end();
