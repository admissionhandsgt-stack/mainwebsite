/**
 * Navigation repairs found in the 2026-09-22 audit.
 *
 * Three separate problems, all of them things a visitor hits:
 *
 *   1. "Rank Predictor" is the wrong name. The tool does not predict a rank —
 *      it takes the rank you already have and finds the seats it reaches.
 *      Every competitor calls theirs a rank predictor, which is also why the
 *      label says nothing. "Seat Predictor" describes what comes out of it,
 *      and it is the same on both sides of the site instead of "MBBS Rank
 *      Predictor" on one and "Rank Predictor" on the other.
 *
 *   2. "Closing Ranks" pointed at the row-level explorer, which has been
 *      removed — the per-college pages carry the same numbers with context,
 *      and the predictor answers the question the explorer made you answer
 *      yourself. Left in place it would be a menu item to a 301.
 *
 *   3. NRI Quota had no children, so `/nri-quota/colleges` and
 *      `/nri-quota/documents` were reachable only by typing the URL. Both
 *      pages exist and neither had a single inbound link.
 *
 * Idempotent: re-running changes nothing that is already correct.
 *
 * Run: node scripts/fix_navigation.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  let changed = 0;

  /* 1. One name for the tool, on both sides. */
  const renamed = await sql`
    UPDATE nav_items
       SET label = 'Seat Predictor', updated_at = now()
     WHERE url IN ('/mbbs-india/predictor', '/md-ms-india/predictor')
       AND label <> 'Seat Predictor'
    RETURNING label, url
  `;
  for (const r of renamed) console.log(`  renamed -> Seat Predictor  (${r.url})`);
  changed += renamed.length;

  /* 2. The explorer is gone; the menu item should not outlive it. */
  const dropped = await sql`
    DELETE FROM nav_items
     WHERE url IN ('/mbbs-india/cutoffs', '/md-ms-india/cutoffs')
    RETURNING label, url
  `;
  for (const r of dropped) console.log(`  removed dead item: ${r.label} (${r.url})`);
  changed += dropped.length;

  /* 3. Give the two orphaned NRI pages a way in. */
  const [nri] = await sql`
    SELECT id FROM nav_items WHERE menu = 'header' AND url = '/nri-quota' AND parent_id IS NULL LIMIT 1
  `;

  if (!nri) {
    console.warn("  ! no NRI Quota parent in the header menu — skipping its children");
  } else {
    const children = [
      { label: "NRI Quota Colleges", url: "/nri-quota/colleges", order: 1 },
      { label: "Documents Required", url: "/nri-quota/documents", order: 2 },
    ];
    for (const c of children) {
      const added = await sql`
        INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
        SELECT 'header', ${c.label}, ${c.url}, ${nri.id}, ${c.order}, true
         WHERE NOT EXISTS (
           SELECT 1 FROM nav_items WHERE menu = 'header' AND url = ${c.url}
         )
        RETURNING label
      `;
      if (added.length) {
        console.log(`  linked orphan page: ${c.label} -> ${c.url}`);
        changed++;
      }
    }
  }

  console.log(changed === 0 ? "\nNothing to change — navigation already correct." : `\n${changed} change(s) applied.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
