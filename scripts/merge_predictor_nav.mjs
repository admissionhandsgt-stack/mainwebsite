/**
 * Point the site's own structure at the one tool.
 *
 * MBBS, BDS and MD/MS each had a predictor and "after round 1" had two more
 * pages — five URLs for one question about one rank. They are now
 * /neet-college-predictor, with the course as a filter and the round movement
 * as a tab, so the menus and the per-route SEO rows have to follow.
 *
 * Three changes:
 *
 *   1. The tool becomes a top-level header item. It was a third-level child of
 *      two different dropdowns, which is where you put a sub-page, not the
 *      thing the site is for. The in-section entries stay, pointed at the
 *      right course, because someone reading about MBBS wants the MBBS tab.
 *
 *   2. "After Round 1" comes out of both dropdowns and out of the footer. It
 *      is a tab inside the tool now; left in place it is a menu item to a 308.
 *
 *   3. `page_seo` gains a row for the new route and loses the five that
 *      describe pages which no longer render. A row for a redirected URL is a
 *      title nobody will ever see, sitting in the admin looking editable.
 *
 * Idempotent: re-running changes nothing that is already correct, and it never
 * overwrites a title someone has edited in the admin.
 *
 * Run: node scripts/merge_predictor_nav.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const TOOL = "/neet-college-predictor";
const LABEL = "College Predictor";

/** The routes the tool replaced. Every one of these now 308s to it. */
const DEAD = [
  "/mbbs-india/predictor",
  "/md-ms-india/predictor",
  "/mbbs-india/rounds",
  "/md-ms-india/rounds",
  "/mbbs-india/cutoffs",
  "/md-ms-india/cutoffs",
];

async function main() {
  let changed = 0;

  /* ---------------------------------------------------------------- header */

  // 1a. The two in-dropdown predictor entries keep their place but point at
  //     the merged tool, on the course tab their section is about.
  for (const [old, course] of [
    ["/mbbs-india/predictor", "mbbs"],
    ["/md-ms-india/predictor", "pg"],
  ]) {
    const moved = await sql`
      UPDATE nav_items
         SET url = ${`${TOOL}?course=${course}`},
             label = 'NEET College Predictor',
             updated_at = now()
       WHERE url = ${old}
      RETURNING menu, label
    `;
    for (const r of moved) console.log(`  ${r.menu}: -> ${TOOL}?course=${course}`);
    changed += moved.length;
  }

  // 1b. Round movement is a tab, so its menu items are gone. Done before the
  //     insert so the display orders below are computed against the final set.
  const droppedRounds = await sql`
    DELETE FROM nav_items
     WHERE url IN ('/mbbs-india/rounds', '/md-ms-india/rounds')
    RETURNING menu, label
  `;
  for (const r of droppedRounds) console.log(`  ${r.menu}: removed "${r.label}" (now a tab)`);
  changed += droppedRounds.length;

  // 1c. Promote the tool to the top level, second only to Home.
  const [existing] = await sql`
    SELECT id FROM nav_items
     WHERE menu = 'header' AND parent_id IS NULL AND url = ${TOOL}
     LIMIT 1
  `;

  if (existing) {
    console.log("  header: top-level item already present");
  } else {
    // Everything after Home shifts down one. Ordered descending so the
    // updates never collide on a (menu, display_order) pair mid-flight.
    await sql`
      UPDATE nav_items
         SET display_order = display_order + 1, updated_at = now()
       WHERE menu = 'header' AND parent_id IS NULL AND display_order >= 2
    `;
    await sql`
      INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active)
      VALUES ('header', NULL, ${LABEL}, ${TOOL}, 2, true)
    `;
    console.log(`  header: "${LABEL}" added as a top-level item at #2`);
    changed += 1;
  }

  /* ---------------------------------------------------------------- footer */

  const droppedFooter = await sql`
    DELETE FROM nav_items
     WHERE menu = 'footer_explore'
       AND (url LIKE ${TOOL + "%"} OR url IN ('/mbbs-india/rounds', '/md-ms-india/rounds'))
    RETURNING label
  `;
  for (const r of droppedFooter) console.log(`  footer: cleared "${r.label}"`);

  // One entry instead of four, at the top of the list.
  await sql`
    UPDATE nav_items
       SET display_order = display_order + 1, updated_at = now()
     WHERE menu = 'footer_explore'
  `;
  await sql`
    INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active)
    VALUES ('footer_explore', NULL, 'NEET College Predictor', ${TOOL}, 1, true)
  `;
  console.log("  footer_explore: one predictor link at #1");
  changed += 1;

  // Close the gaps the deletions left, so the admin's order column reads 1..n.
  const footer = await sql`
    SELECT id FROM nav_items WHERE menu = 'footer_explore' ORDER BY display_order, id
  `;
  for (let i = 0; i < footer.length; i += 1) {
    await sql`UPDATE nav_items SET display_order = ${i + 1} WHERE id = ${footer[i].id}`;
  }

  /* -------------------------------------------------------------- page_seo */

  const [seo] = await sql`SELECT route FROM page_seo WHERE route = ${TOOL} LIMIT 1`;
  if (seo) {
    console.log("  page_seo: row already exists (left untouched)");
  } else {
    await sql`
      INSERT INTO page_seo (route, page_label, title, description, keywords, no_index)
      VALUES (
        ${TOOL},
        'NEET College Predictor',
        'NEET College Predictor 2026 — MBBS, BDS & MD/MS Seats by Rank | AdmissionHands',
        ${"Enter your NEET rank and see the colleges it reaches — MBBS, BDS and MD/MS. Every seat placed against the round it actually closed in, from the counselling authorities' own published results."},
        'NEET college predictor, NEET UG college predictor, NEET PG college predictor, MBBS college predictor, BDS college predictor, MD MS seat predictor, NEET rank wise college',
        false
      )
    `;
    console.log(`  page_seo: row created for ${TOOL}`);
    changed += 1;
  }

  const deadSeo = await sql`
    DELETE FROM page_seo WHERE route IN ${sql(DEAD)} RETURNING route
  `;
  for (const r of deadSeo) console.log(`  page_seo: dropped dead route ${r.route}`);
  changed += deadSeo.length;

  console.log(changed ? `\n${changed} change(s).` : "\nAlready correct.");
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
