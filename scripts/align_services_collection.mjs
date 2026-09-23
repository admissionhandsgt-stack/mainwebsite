/**
 * Aligns the `services` collection with the cards the homepage actually shows.
 *
 * The collection was seeded speculatively before anything rendered it. The live
 * section is three cards, two of which navigate to the UG and PG pages — the
 * seeded rows carried no link at all, so wiring them in as-is would have
 * silently removed those two links from the homepage.
 *
 * Run once: node scripts/align_services_collection.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const SERVICES = [
  {
    title: "MBBS Admission (UG)",
    subtitle: "Govt · Private · Deemed",
    body: "Govt | Private | Deemed Colleges — Complete guidance from NEET registration to final seat allotment across all categories.",
    icon: "BookOpen",
    link_url: "/mbbs-india",
    link_label: "Explore MBBS Admissions",
  },
  {
    title: "MD/MS Admission (PG)",
    subtitle: "Branch selection + AIQ strategy",
    body: "Branch Selection + AIQ Strategy — Data-backed counselling to secure your dream PG branch at the best institution.",
    icon: "GraduationCap",
    link_url: "/md-ms-india",
    link_label: "Explore PG Admissions",
  },
  {
    title: "1:1 Counselling",
    subtitle: "A plan built around your rank",
    body: "Personalized Admission Strategy — A dedicated expert analyzes your rank, budget, and goals to build your unique roadmap.",
    icon: "Users",
    // No link: the card opens the consultation modal instead.
    link_url: null,
    link_label: "Book Consultation",
  },
];

async function main() {
  // The collection needs the link fields before an editor can set them.
  await sql`
    UPDATE content_collections
    SET fields = ${JSON.stringify([
      "title",
      "subtitle",
      "body",
      "icon",
      "link_url",
      "link_label",
    ])}::jsonb,
        description = 'The three cards in the homepage services grid. Leave the link empty to make a card open the consultation pop-up.'
    WHERE slug = 'services'
  `;

  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'services'
  `;
  console.log(`  services: replacing ${n} placeholder rows`);

  await sql`DELETE FROM content_blocks WHERE collection = 'services'`;

  let order = 1;
  for (const s of SERVICES) {
    await sql`
      INSERT INTO content_blocks
        (collection, title, subtitle, body, icon, link_url, link_label, display_order, is_active)
      VALUES
        ('services', ${s.title}, ${s.subtitle}, ${s.body}, ${s.icon},
         ${s.link_url}, ${s.link_label}, ${order++}, true)
    `;
  }
  console.log(`  services: ${SERVICES.length} rows now match the live homepage`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
