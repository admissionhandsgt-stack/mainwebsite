/**
 * Registers the UG predictor page in the menu and in the SEO table.
 *
 * Kept separate from the UG import: the import moves data, this moves links.
 * Idempotent — an existing nav item or seo row is left alone.
 *
 * Run: node scripts/seed_ug_predictor_links.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const URL = "/mbbs-india/predictor";

async function main() {
  // --- menu: first sub-link under MBBS India, matching the PG menu's shape ---
  const [parent] = await sql`
    SELECT id FROM nav_items
    WHERE menu = 'header' AND parent_id IS NULL AND url = '/mbbs-india'
    LIMIT 1
  `;

  if (!parent) {
    console.log("  no 'MBBS India' item in the header menu — skipping the link");
  } else {
    const [existing] = await sql`
      SELECT id FROM nav_items WHERE menu='header' AND url = ${URL} LIMIT 1
    `;
    if (existing) {
      console.log("  menu: already present");
    } else {
      // The predictor is the reason most people arrive, so it leads the list.
      await sql`
        UPDATE nav_items SET display_order = display_order + 1
        WHERE menu='header' AND parent_id = ${parent.id}
      `;
      await sql`
        INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
        VALUES ('header', 'MBBS Rank Predictor', ${URL}, ${parent.id}, 1, true)
      `;
      console.log("  menu: added 'MBBS Rank Predictor' under MBBS India");
    }
  }

  // --- SEO row so the page is editable under Search & sharing ---
  const res = await sql`
    INSERT INTO page_seo (route, page_label, title, description)
    VALUES (
      ${URL},
      'NEET UG Rank Predictor',
      'NEET UG College Predictor — Real Closing Ranks, Not Estimates | AdmissionHands',
      'Enter your NEET UG rank and see every MBBS seat it reaches, split into safe, likely, possible and stretch — each backed by the published closing rank it came from.'
    )
    ON CONFLICT (route) DO NOTHING
    RETURNING id
  `;
  console.log(res.length ? "  seo: row added" : "  seo: already present");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
