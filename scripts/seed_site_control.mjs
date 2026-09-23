/**
 * Seeds navigation, per-page SEO and section visibility from what the site
 * currently renders.
 *
 * Same rule as the earlier content lift: the site must look identical before
 * and after. These rows describe today's header, footer, metadata and section
 * order — nothing new, just now editable.
 *
 * Idempotent. Rows already present are left alone so a re-run never stamps
 * over an edit someone made in the admin.
 *
 * Run: node scripts/seed_site_control.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/* ----------------------------- navigation ----------------------------- */

const HEADER = [
  { label: "Home", url: "/" },
  {
    label: "MBBS India",
    url: "/mbbs-india",
    children: [
      { label: "Deemed Universities", url: "/mbbs-india/deemed-universities" },
      { label: "Govt & Pvt Colleges", url: "/mbbs-india/colleges" },
      { label: "NEET UG Process", url: "/neet-ug-process" },
    ],
  },
  {
    label: "PG – MD/MS",
    url: "/md-ms-india",
    children: [
      { label: "Rank Predictor", url: "/md-ms-india/predictor" },
      { label: "All PG Colleges", url: "/md-ms-india/colleges" },
      { label: "Closing Ranks", url: "/md-ms-india/cutoffs" },
      { label: "Fees vs Stipend", url: "/md-ms-india/fees" },
    ],
  },
  { label: "NRI Quota", url: "/nri-quota" },
  { label: "Services", url: "/services" },
  { label: "Know Us", url: "/know-us" },
  { label: "Videos", url: "/videos" },
];

const FOOTER_EXPLORE = [
  { label: "MBBS India", url: "/mbbs-india" },
  { label: "MD/MS India", url: "/md-ms-india" },
  { label: "Services", url: "/services" },
  { label: "Know Us", url: "/know-us" },
  { label: "Terms", url: "/terms" },
];

const FOOTER_QUICK = [
  { label: "MBBS India", url: "/mbbs-india" },
  { label: "PG/MD", url: "/md-ms-india" },
  { label: "Services", url: "/services" },
  { label: "Know Us", url: "/know-us" },
];

/* ------------------------------ page SEO ------------------------------ */

const SEO = [
  ["/", "Homepage",
   "AdmissionHands - MBBS & MD/MS Admission Experts | NEET Counselling Guidance",
   "Expert guidance for MBBS, MD/MS admissions in top medical colleges. AIQ, State & Deemed counselling with real seat, fee & cutoff insights.",
   "medical admissions, MBBS admission, MD MS admission, NEET counselling, medical college counseling, NRI quota, AIQ counselling, MCC counselling"],
  ["/mbbs-india", "MBBS in India", null, null, null],
  ["/mbbs-india/colleges", "MBBS Colleges", null, null, null],
  ["/mbbs-india/deemed-universities", "Deemed Universities", null, null, null],
  ["/md-ms-india", "MD/MS in India",
   "MD/MS Admission in India 2026 | NEET PG Counselling – 250+ Colleges | Admission Hands",
   "Complete platform for MD/MS admissions in India. Expert NEET PG counselling with 5-year cutoff intelligence, dual-quota management, strategic choice filling across 250+ PG medical colleges.",
   "MD MS admission India, NEET PG counselling, PG medical colleges, Government medical colleges, Deemed university PG, NEET PG cutoff, AIQ State Quota PG, MD MS seat counselling"],
  ["/md-ms-india/predictor", "NEET PG Rank Predictor", null, null, null],
  ["/md-ms-india/colleges", "PG Colleges", null, null, null],
  ["/md-ms-india/cutoffs", "NEET PG Closing Ranks", null, null, null],
  ["/md-ms-india/fees", "PG Fees vs Stipend", null, null, null],
  ["/nri-quota", "NRI Quota",
   "NRI Quota Medical Admissions - AdmissionHands",
   "Expert guidance for NRI quota MBBS admissions in India. Learn about eligibility, fees, required documents and admission process for NRI students.",
   "NRI quota, medical admissions, MBBS for NRI, NRI sponsored candidates, foreign students medical admission"],
  ["/nri-quota/colleges", "NRI Quota Colleges", null, null, null],
  ["/services", "Services", null, null, null],
  ["/know-us", "Know Us", null, null, null],
  ["/neet-ug-process", "NEET UG Process", null, null, null],
  ["/videos", "Videos", null, null, null],
  ["/terms", "Legal & Terms", null, null, null],
];

/* --------------------------- page sections --------------------------- */

// Order matches src/app/page.tsx today.
const SECTIONS = {
  home: [
    ["hero", "Hero", "Headline, badges, buttons and the trust stats"],
    ["how_it_works", "How admission works", "The numbered NEET journey steps"],
    ["services", "Services", "The three-card services grid"],
    ["data_insights", "Data insights", "The numbers band"],
    ["top_institutes", "Top medical institutes", "Curated college carousel"],
    ["cta_band", "Conversion band", "The full-width call to action"],
    ["why_us", "Why families trust us", "Reasons grid"],
    ["testimonials", "Testimonials", "Student and parent quotes"],
    ["videos", "Featured videos", "YouTube embeds"],
  ],
};

/* ------------------------------ helpers ------------------------------ */

async function seedMenu(menu, items) {
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM nav_items WHERE menu = ${menu}
  `;
  if (n > 0) {
    console.log(`  ${menu.padEnd(16)} ${n} existing — left alone`);
    return;
  }

  let order = 1;
  for (const item of items) {
    const [row] = await sql`
      INSERT INTO nav_items (menu, label, url, display_order, is_active)
      VALUES (${menu}, ${item.label}, ${item.url}, ${order++}, true)
      RETURNING id
    `;
    let childOrder = 1;
    for (const child of item.children ?? []) {
      await sql`
        INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
        VALUES (${menu}, ${child.label}, ${child.url}, ${row.id}, ${childOrder++}, true)
      `;
    }
  }
  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM nav_items WHERE menu = ${menu}
  `;
  console.log(`  ${menu.padEnd(16)} ${total} seeded`);
}

async function main() {
  console.log("navigation");
  await seedMenu("header", HEADER);
  await seedMenu("footer_explore", FOOTER_EXPLORE);
  await seedMenu("footer_quick", FOOTER_QUICK);

  console.log("page SEO");
  let added = 0;
  for (const [route, label, title, description, keywords] of SEO) {
    const res = await sql`
      INSERT INTO page_seo (route, page_label, title, description, keywords)
      VALUES (${route}, ${label}, ${title}, ${description}, ${keywords})
      ON CONFLICT (route) DO NOTHING
      RETURNING id
    `;
    if (res.length) added++;
  }
  console.log(`  ${SEO.length} routes (${added} new, ${SEO.length - added} left as edited)`);

  console.log("page sections");
  for (const [page, rows] of Object.entries(SECTIONS)) {
    let order = 1;
    let fresh = 0;
    for (const [key, label, description] of rows) {
      const res = await sql`
        INSERT INTO page_sections (page, section_key, label, description, display_order)
        VALUES (${page}, ${key}, ${label}, ${description}, ${order++})
        ON CONFLICT (page, section_key) DO NOTHING
        RETURNING id
      `;
      if (res.length) fresh++;
    }
    console.log(`  ${page.padEnd(16)} ${rows.length} sections (${fresh} new)`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
