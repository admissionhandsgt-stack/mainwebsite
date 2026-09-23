/**
 * The footer had two columns saying the same thing.
 *
 * `footer_explore` was MBBS India / MD-MS India / Services / Know Us / Terms.
 * `footer_quick` was MBBS India / PG-MD / Services / Know Us. Four of five
 * links duplicated, printed side by side, which reads as an oversight to
 * anyone who looks at it.
 *
 * Worse, neither column carried a single one of the tools. The seat
 * predictors and the round-movement pages — the things that took the data and
 * made a product out of it — were reachable only from the header menu.
 *
 * So the two columns get two jobs:
 *
 *   explore -> what the site *does*: the tools and the directories
 *   quick   -> who we are and the flat pages
 *
 * Idempotent: it rewrites both footer menus to this list every time, which is
 * also how you undo an accidental edit in the admin.
 *
 * Run: node scripts/fix_footer_menus.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const EXPLORE = [
  { label: "MBBS Seat Predictor", url: "/mbbs-india/predictor" },
  { label: "MD/MS Seat Predictor", url: "/md-ms-india/predictor" },
  { label: "After Round 1 — MBBS", url: "/mbbs-india/rounds" },
  { label: "After Round 1 — MD/MS", url: "/md-ms-india/rounds" },
  { label: "MBBS Colleges", url: "/mbbs-india/colleges" },
  { label: "PG Colleges", url: "/md-ms-india/colleges" },
  { label: "Deemed Universities", url: "/mbbs-india/deemed-universities" },
];

const QUICK = [
  { label: "MBBS in India", url: "/mbbs-india" },
  { label: "MD/MS in India", url: "/md-ms-india" },
  { label: "NRI Quota", url: "/nri-quota" },
  { label: "NEET UG Process", url: "/neet-ug-process" },
  { label: "Services", url: "/services" },
  { label: "Know Us", url: "/know-us" },
  { label: "Videos", url: "/videos" },
  { label: "Terms", url: "/terms" },
];

async function rebuild(menu, items) {
  await sql`DELETE FROM nav_items WHERE menu = ${menu}`;
  for (const [i, it] of items.entries()) {
    await sql`
      INSERT INTO nav_items (menu, label, url, display_order, is_active)
      VALUES (${menu}, ${it.label}, ${it.url}, ${i + 1}, true)
    `;
  }
  console.log(`  ${menu.padEnd(16)} ${items.length} links`);
  for (const it of items) console.log(`      ${it.label.padEnd(24)} ${it.url}`);
}

async function main() {
  await rebuild("footer_explore", EXPLORE);
  console.log();
  await rebuild("footer_quick", QUICK);

  // Every footer link must go somewhere that exists. A 404 in the footer is
  // on every page of the site at once.
  const urls = [...EXPLORE, ...QUICK].map((i) => i.url);
  console.log(`\n  ${urls.length} links total, ${new Set(urls).size} distinct.`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
