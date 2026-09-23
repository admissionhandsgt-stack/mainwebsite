/**
 * Move the site's hardcoded copy into the database.
 *
 *   node scripts/seed_content.mjs
 *
 * Every value here is what the components currently render, so the site looks
 * identical after seeding — the difference is that the admin can now change it.
 *
 * Idempotent: settings upsert on their key and keep any value already edited
 * in the admin; collections are only filled when empty, so re-running never
 * wipes content someone has written.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

function env() {
  const out = {};
  const p = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...out, ...process.env };
}

const DATABASE_URL = env().DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

/* ------------------------------ settings ----------------------------- */

const SETTINGS = [
  // Home — hero
  { key: "home.hero.badge_left", label: "Hero badge (left)", group: "Home · Hero", type: "text", value: "NEET 2026 counselling" },
  { key: "home.hero.badge_right", label: "Hero badge (right)", group: "Home · Hero", type: "text", value: "Real cutoffs, not estimates" },
  { key: "home.hero.headline", label: "Headline", group: "Home · Hero", type: "text", value: "MBBS & PG admission" },
  { key: "home.hero.headline_accent", label: "Headline (coloured part)", group: "Home · Hero", type: "text", value: "in India, made simple" },
  { key: "home.hero.subtitle", label: "Sub-headline", group: "Home · Hero", type: "longtext", value: "Every closing rank, fee and seat from the last two counselling years — turned into one straight answer about where your seat actually is." },
  { key: "home.hero.cta_primary", label: "Primary button", group: "Home · Hero", type: "text", value: "Get expert guidance" },
  { key: "home.hero.cta_secondary", label: "Secondary button", group: "Home · Hero", type: "text", value: "Browse top colleges" },

  // Home — trust stats
  { key: "home.stats.1_value", label: "Stat 1 — value", group: "Home · Trust stats", type: "text", value: "2,100+" },
  { key: "home.stats.1_label", label: "Stat 1 — label", group: "Home · Trust stats", type: "text", value: "Students guided" },
  { key: "home.stats.2_value", label: "Stat 2 — value", group: "Home · Trust stats", type: "text", value: "1,687" },
  { key: "home.stats.2_label", label: "Stat 2 — label", group: "Home · Trust stats", type: "text", value: "MBBS colleges" },
  { key: "home.stats.3_value", label: "Stat 3 — value", group: "Home · Trust stats", type: "text", value: "2,168" },
  { key: "home.stats.3_label", label: "Stat 3 — label", group: "Home · Trust stats", type: "text", value: "PG colleges" },

  // Home — conversion band
  { key: "home.cta.title", label: "CTA title", group: "Home · Conversion band", type: "text", value: "One wrong choice order costs a year" },
  { key: "home.cta.body", label: "CTA body", group: "Home · Conversion band", type: "longtext", value: "A safe seat placed below a stretch one is how students lose a season. Our counsellors order your preference list against two years of closing ranks, then stay with you through every round." },
  { key: "home.cta.button", label: "CTA button", group: "Home · Conversion band", type: "text", value: "Book a free call" },

  // Site-wide
  { key: "site.name", label: "Site name", group: "Site", type: "text", value: "AdmissionHands" },
  { key: "site.tagline", label: "Tagline", group: "Site", type: "text", value: "Expert guidance for medical college admissions in India" },
  { key: "site.counselling_year", label: "Counselling year", group: "Site", type: "text", value: "2026" },
  { key: "site.alert_bar_enabled", label: "Show the alert bar", group: "Site", type: "boolean", value: "true" },
  { key: "site.whatsapp_enabled", label: "Show the WhatsApp button", group: "Site", type: "boolean", value: "true" },

  // Predictor
  { key: "predictor.disclaimer", label: "Disclaimer under results", group: "Tools · Predictor", type: "longtext", value: "These bands are historical, not a forecast. They state where the cut actually landed in published rounds and place your rank against it — nothing here predicts what this year's cut will do." },
  { key: "predictor.cta_title", label: "CTA after results", group: "Tools · Predictor", type: "text", value: "Ordering them is the part that decides your year." },

  // SEO defaults
  { key: "seo.default_title", label: "Default page title", group: "SEO", type: "text", value: "AdmissionHands — MBBS & MD/MS Admission Experts" },
  { key: "seo.default_description", label: "Default meta description", group: "SEO", type: "longtext", value: "Expert guidance for MBBS and MD/MS admissions in top medical colleges. Real closing ranks, fees and seat data from published counselling." },
];

/* ---------------------------- collections ---------------------------- */

const COLLECTIONS = [
  { slug: "services", label: "Services", description: "What appears in the services grid", fields: ["title", "subtitle", "body", "icon"], order: 1 },
  { slug: "steps_ug", label: "How admission works (UG)", description: "The numbered process steps", fields: ["title", "body", "icon"], order: 2 },
  { slug: "why_us", label: "Why families trust us", description: "Reasons shown on the homepage", fields: ["title", "body", "icon"], order: 3 },
  { slug: "testimonials", label: "Testimonials", description: "Student and parent quotes", fields: ["title", "subtitle", "body", "image_url"], order: 4 },
  { slug: "faq_pg", label: "FAQ — MD/MS", description: "Questions on the PG page", fields: ["title", "body"], order: 5 },
  { slug: "faq_nri", label: "FAQ — NRI quota", description: "Questions on the NRI page", fields: ["title", "body"], order: 6 },
  { slug: "data_insights", label: "Data insights", description: "The numbers band on the homepage", fields: ["title", "subtitle", "body"], order: 7 },
];

const BLOCKS = {
  services: [
    { title: "Personalised NEET counselling", subtitle: "Your rank. Your strategy. Your seat.", body: "Every NEET rank has its own set of possibilities. We work from your exact rank, category, domicile and budget rather than generic advice.", icon: "Target" },
    { title: "Smart college shortlisting", subtitle: "Data-backed picks, not guesswork.", body: "Cutoff trends, seat matrices, bond clauses and fee structures, cross-referenced into a shortlist that maximises where you can actually land.", icon: "Search" },
    { title: "Cutoff analytics", subtitle: "See where the cut has really gone.", body: "Round-wise closing ranks across two years, so you can see which seats loosened and which tightened before you order your list.", icon: "BarChart3" },
    { title: "AIQ and state quota strategy", subtitle: "Both counsellings, one plan.", body: "The 15/85 split creates both opportunity and confusion. We run your AIQ and state applications in parallel without missing a deadline.", icon: "Map" },
    { title: "Fee and budget planning", subtitle: "Know every rupee before you commit.", body: "Tuition, hostel, deposits, bond penalties and stipend, resolved into what three years actually leaves your family with.", icon: "Banknote" },
    { title: "Documentation and reporting", subtitle: "Zero rejection, zero surprises.", body: "Document rejection is the most common way a confirmed seat is lost. Every certificate is checked weeks before the deadline.", icon: "FileCheck" },
  ],
  steps_ug: [
    { title: "NEET exam", body: "Start with the NTA national entrance test.", icon: "ClipboardCheck" },
    { title: "Rank and score", body: "Analyse your result and identify target colleges.", icon: "BarChart3" },
    { title: "Registration", body: "Apply on the MCC or state counselling portal.", icon: "FileCheck" },
    { title: "Choice filling", body: "Lock your college preferences in the right order.", icon: "Map" },
    { title: "Seat allotment", body: "Secure your place at a medical college.", icon: "GraduationCap" },
    { title: "Reporting", body: "Complete the formalities and join.", icon: "Building2" },
  ],
  why_us: [
    { title: "Data-driven strategy", body: "Built on published MCC and state counselling data, not opinion.", icon: "BarChart3" },
    { title: "MCC-aligned process", body: "Mirrors the exact counselling workflow the authorities run.", icon: "ShieldCheck" },
    { title: "Fully transparent", body: "Every number we show you is one you can check yourself.", icon: "Eye" },
    { title: "Personalised plan", body: "Your rank, category, domicile and budget — not a template.", icon: "Target" },
  ],
  faq_pg: [
    { title: "How is the NEET PG closing rank different from the score?", body: "The closing rank is the last all-India rank allotted a seat in that round. Two candidates with similar scores can sit either side of it, which is why the rank, not the score, is what counselling works from." },
    { title: "Does a later round always mean an easier cut?", body: "No. In mop-up and stray rounds, seats freed by upgrades are often taken by much better ranks, so a final round can close far tighter than round two. We show the widest the cut reached across all rounds rather than just the last one." },
    { title: "Should I take a safe seat in round 1 or wait for an upgrade?", body: "It depends on how much you can afford to lose. Holding a safe seat and floating for an upgrade is usually the balanced choice; free-exiting to chase a stretch seat is where students most often lose a year." },
    { title: "Do private colleges really pay a stipend?", body: "They are required to, but several pay late, pay less, or stop. Where our fee table says the stipend is not published, plan as if it is zero." },
    { title: "What happens if I break the service bond?", body: "The penalty varies by state and is enforced differently in each. Madhya Pradesh, for example, enforces its PG bond with a substantial penalty. Check the bond line on the college page before ranking it high." },
  ],
  faq_nri: [
    { title: "Who qualifies for an NRI seat?", body: "Eligibility depends on the sponsor's NRI status and the relationship to the candidate, and the exact rule varies by state and college. The sponsorship affidavit and embassy attestation are where most applications fail." },
    { title: "Is an NRI seat always more expensive?", body: "Usually, and often several times over. The fee is quoted in USD at some deemed universities, which makes the rupee figure move with the exchange rate." },
    { title: "Can an NRI seat convert to a management seat?", body: "In some states, unfilled NRI seats convert in later rounds, sometimes at a lower fee. The timing of that conversion is state-specific and worth planning for." },
  ],
};

/* ------------------------------- run --------------------------------- */

const sql = postgres(DATABASE_URL, { max: 4, prepare: false, onnotice: () => {} });

try {
  console.log("\nSeeding site content\n");

  // Settings: insert, but never overwrite a value someone has already edited.
  let added = 0;
  for (const [i, s] of SETTINGS.entries()) {
    const res = await sql`
      INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
      VALUES (${s.key}, ${s.value}, ${s.type}, ${s.group}, ${s.label}, ${i})
      ON CONFLICT (key) DO UPDATE
        SET label = EXCLUDED.label,
            group_name = EXCLUDED.group_name,
            value_type = EXCLUDED.value_type,
            display_order = EXCLUDED.display_order
      RETURNING (xmax = 0) AS inserted
    `;
    if (res[0]?.inserted) added++;
  }
  console.log(`  site_settings      ${SETTINGS.length} keys (${added} new, ${SETTINGS.length - added} left as edited)`);

  for (const c of COLLECTIONS) {
    await sql`
      INSERT INTO content_collections (slug, label, description, fields, display_order)
      VALUES (${c.slug}, ${c.label}, ${c.description}, ${JSON.stringify(c.fields)}::jsonb, ${c.order})
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label,
            description = EXCLUDED.description,
            fields = EXCLUDED.fields,
            display_order = EXCLUDED.display_order
    `;
  }
  console.log(`  content_collections ${COLLECTIONS.length} registered`);

  for (const [collection, items] of Object.entries(BLOCKS)) {
    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${collection}
    `;
    if (n > 0) {
      console.log(`  ${collection.padEnd(18)} ${n} existing — left alone`);
      continue;
    }
    const rows = items.map((b, i) => ({
      collection,
      title: b.title ?? null,
      subtitle: b.subtitle ?? null,
      body: b.body ?? null,
      icon: b.icon ?? null,
      display_order: i,
      is_active: true,
    }));
    await sql`INSERT INTO content_blocks ${sql(rows)}`;
    console.log(`  ${collection.padEnd(18)} ${rows.length} seeded`);
  }

  console.log("\n  Done. Everything above is now editable in the admin.\n");
} finally {
  await sql.end({ timeout: 5 });
}
