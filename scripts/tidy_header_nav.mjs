/**
 * Make the header fit on one line, and stop the tool appearing three times.
 *
 * Two problems, both visible at a glance:
 *
 *   1. The predictor was promoted to a top-level item, but the old in-section
 *      entries stayed — so "NEET College Predictor" appeared under MBBS, under
 *      PG, *and* in the main bar. Three doors to one page reads as three
 *      different pages, and it pushed both dropdowns down for nothing.
 *
 *   2. Every label carried a qualifier the section header already implies
 *      ("MBBS India", "PG – MD/MS", "NRI Quota"), so the bar wrapped to two
 *      lines and looked broken. The shorter label says the same thing.
 *
 * Idempotent, and it only renames the exact labels it expects — a label
 * someone has since edited in the admin is left alone.
 *
 * Run: node scripts/tidy_header_nav.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/** url -> [expectedLabel, newLabel] for top-level items. */
const RENAMES = [
  ["/neet-college-predictor", "College Predictor", "NEET College Predictor"],
  ["/mbbs-india", "MBBS India", "MBBS"],
  ["/md-ms-india", "PG – MD/MS", "MD/MS"],
  ["/nri-quota", "NRI Quota", "NRI"],
];

async function main() {
  let changed = 0;

  // 1. The duplicates inside the dropdowns.
  const dropped = await sql`
    DELETE FROM nav_items
     WHERE parent_id IS NOT NULL
       AND url LIKE '/neet-college-predictor%'
    RETURNING label, url
  `;
  for (const r of dropped) console.log(`  removed duplicate: "${r.label}" (${r.url})`);
  changed += dropped.length;

  // 2. Shorter labels, so the bar stays on one line.
  for (const [url, expected, next] of RENAMES) {
    const rows = await sql`
      UPDATE nav_items
         SET label = ${next}, updated_at = now()
       WHERE url = ${url} AND parent_id IS NULL AND label = ${expected}
      RETURNING label
    `;
    if (rows.length) {
      console.log(`  "${expected}" -> "${next}"`);
      changed += 1;
    } else {
      const [cur] = await sql`
        SELECT label FROM nav_items WHERE url = ${url} AND parent_id IS NULL LIMIT 1
      `;
      console.log(
        cur?.label === next
          ? `  "${next}" already set`
          : `  ${url}: label is "${cur?.label ?? "missing"}" — left alone`,
      );
    }
  }

  // 3. Close the gaps the deletions left in each dropdown.
  const parents = await sql`
    SELECT DISTINCT parent_id FROM nav_items WHERE menu = 'header' AND parent_id IS NOT NULL
  `;
  for (const { parent_id } of parents) {
    const kids = await sql`
      SELECT id FROM nav_items WHERE parent_id = ${parent_id} ORDER BY display_order, id
    `;
    for (let i = 0; i < kids.length; i += 1) {
      await sql`UPDATE nav_items SET display_order = ${i + 1} WHERE id = ${kids[i].id}`;
    }
  }

  console.log("\nHeader now reads:");
  const rows = await sql`
    SELECT id, parent_id, label, url, display_order
      FROM nav_items WHERE menu = 'header'
     ORDER BY COALESCE(parent_id, 0), display_order
  `;
  const top = rows.filter((r) => !r.parent_id);
  for (const t of top) {
    console.log(`  ${t.label}`);
    for (const k of rows.filter((r) => r.parent_id === t.id)) {
      console.log(`      ${k.label}  ->  ${k.url}`);
    }
  }

  console.log(changed ? `\n${changed} change(s).` : "\nAlready correct.");
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
