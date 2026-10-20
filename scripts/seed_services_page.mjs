// Creates the admin's /services list (2026-10-18): the `services_page` collection in Admin →
// Content → Sections & lists, filled from src/lib/servicesDefaults.ts. Idempotent — written only
// while the collection is empty, so the team's edits are never replaced.
//
//   node --env-file=.env.local scripts/seed_services_page.mjs [--dry-run]
import postgres from "postgres";
import { SERVICES } from "../src/lib/servicesDefaults.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const description =
  "The service cards on /services, in order. Title, subtitle = the tagline, body = the description. Icon: target, search, chart, map, landmark, filecheck, shield, banknote, upgrade, graduation or handshake. Features: one per line. Stat value may use {students}, {colleges}, {closing_ranks} or {states} — filled with the team's figures and the live counts.";

if (dry) {
  console.log(`would register services_page and write ${SERVICES.length} rows if empty`);
} else {
  const c = await sql`
    INSERT INTO content_collections (slug, label, description, fields, display_order)
    SELECT 'services_page', 'Services page · Service cards', ${description},
           to_jsonb(${'["title","subtitle","body","icon","data.features","data.stat_value","data.stat_label"]'}::text), 340
     WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'services_page')
    RETURNING id`;
  console.log(c.length ? "collection registered" : "collection already registered");

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = 'services_page'`;
  if (n > 0) {
    console.log(`collection already has ${n} rows — left as the team wrote them`);
  } else {
    let i = 0;
    for (const s of SERVICES) {
      i++;
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, icon, data, display_order, is_active)
        VALUES ('services_page', ${s.title}, ${s.tagline}, ${s.description}, ${s.icon},
                ${sql.json({ features: s.features.join("\n"), stat_value: s.statValue, stat_label: s.statLabel })}, ${i}, true)`;
    }
    console.log(`wrote ${i} rows`);
  }
}
await sql.end();
