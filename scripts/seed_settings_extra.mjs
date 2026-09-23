/**
 * Adds the settings that the newly-wired components read.
 *
 * Values are lifted from what those components currently render, so the site
 * is unchanged. Existing keys are never overwritten — a re-run after someone
 * edits a value in the admin leaves their value alone.
 *
 * Run: node scripts/seed_settings_extra.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

// [key, value, type, group, label, help]
const SETTINGS = [
  // --- footer ---
  ["footer.tagline",
   "India’s most trusted partner for MBBS & PG medical admissions. Expert guidance and transparent processes for your career.",
   "longtext", "Footer", "Footer tagline", "The paragraph under the logo in the footer"],
  ["footer.address", "", "text", "Footer", "Office address",
   "Leave blank to keep the address in the code"],

  // --- social ---
  ["social.facebook", "https://facebook.com/admissionhands", "url", "Social links",
   "Facebook URL", "Clear this to hide the Facebook icon"],
  ["social.instagram", "https://www.instagram.com/admissionhandss?igsh=cDEyd2dsdXBpeW5v", "url",
   "Social links", "Instagram URL", "Clear this to hide the Instagram icon"],
  ["social.youtube", "https://youtube.com/@admissionhands", "url", "Social links",
   "YouTube URL", "Clear this to hide the YouTube icon"],

  // --- header ---
  ["header.cta_label", "Talk to a counsellor", "text", "Header",
   "Header button text", "The gradient button on the right of the header"],
  ["header.show_theme_toggle", "true", "boolean", "Header",
   "Show the dark-mode toggle", null],

  // --- homepage section headings the CMS did not cover yet ---
  ["home.services.eyebrow", "What We Offer", "text", "Home · Services", "Eyebrow label", null],
  ["home.services.title", "Our Comprehensive Services", "text", "Home · Services", "Heading", null],
  ["home.services.subtitle",
   "From your first NEET score to the day you wear your white coat — we guide you every step of the way.",
   "longtext", "Home · Services", "Subheading", null],

  ["home.steps.eyebrow", "How We Secure Your Best Seat", "text", "Home · Process", "Eyebrow label", null],
  ["home.steps.title", "Your NEET Journey", "text", "Home · Process", "Heading",
   "The step count is added automatically"],
  ["home.steps.subtitle",
   "The path to your dream medical college is clear with our expert-designed roadmap.",
   "longtext", "Home · Process", "Subheading", null],
  ["home.steps.button", "Detailed NEET Process", "text", "Home · Process", "Button text", null],

  ["home.why.eyebrow", "Why Choose Us", "text", "Home · Why us", "Eyebrow label", null],
  ["home.why.title", "Why Families Trust", "text", "Home · Why us", "Heading",
   "The brand name is appended in the accent colour"],
  ["home.why.title_accent", "Admission Hands", "text", "Home · Why us", "Heading (accent part)", null],
  ["home.why.subtitle",
   "In a landscape full of misinformation, we bring clarity, credibility, and real outcomes. Our track record speaks louder than promises.",
   "longtext", "Home · Why us", "Subheading", null],
  ["home.why.point_1", "95% Success Rate", "text", "Home · Why us", "Checklist point 1", null],
  ["home.why.point_2", "2100+ Families Guided", "text", "Home · Why us", "Checklist point 2", null],
  ["home.why.point_3", "Pan-India Coverage", "text", "Home · Why us", "Checklist point 3", null],
  ["home.why.point_4", "Zero Hidden Fees", "text", "Home · Why us", "Checklist point 4", null],

  ["home.testimonials.eyebrow", "Student Stories", "text", "Home · Testimonials", "Eyebrow label", null],
  ["home.testimonials.title", "Real Results from", "text", "Home · Testimonials", "Heading", null],
  ["home.testimonials.title_accent", "Real Students", "text", "Home · Testimonials",
   "Heading (accent part)", null],
  ["home.testimonials.subtitle",
   "Don’t just take our word for it — hear from families who navigated NEET admissions with our guidance.",
   "longtext", "Home · Testimonials", "Subheading", null],

  // --- PG FAQ ---
  ["pg.faq.eyebrow", "Got Questions? We Have Answers", "text", "MD/MS · FAQ", "Eyebrow label", null],
  ["pg.faq.title", "NEET PG Counselling FAQs", "text", "MD/MS · FAQ", "Heading", null],
  ["pg.faq.subtitle",
   "Quickly find answers to essential questions regarding eligibility, rounds, seat upgrades, stipends, and quotas.",
   "longtext", "MD/MS · FAQ", "Subheading", null],

  // --- NRI FAQ ---
  ["nri.faq.title", "Frequently Asked Questions", "text", "NRI · FAQ", "Heading", null],
  ["nri.faq.subtitle",
   "Get answers to commonly asked questions about NRI quota medical admissions.",
   "longtext", "NRI · FAQ", "Subheading", null],

  // --- lead handling ---
  ["leads.statuses", "New, Contacted, Qualified, Converted, Lost", "text", "Leads",
   "Lead statuses", "Comma-separated. These are the options in the leads screen."],
  ["leads.whatsapp_alerts", "true", "boolean", "Leads",
   "Send a WhatsApp alert on a new lead", null],
];

async function main() {
  let added = 0;
  let order = 0;
  for (const [key, value, type, group, label, help] of SETTINGS) {
    const res = await sql`
      INSERT INTO site_settings (key, value, value_type, group_name, label, help, display_order)
      VALUES (${key}, ${value}, ${type}, ${group}, ${label}, ${help}, ${order++})
      ON CONFLICT (key) DO UPDATE
        SET value_type = EXCLUDED.value_type,
            group_name = EXCLUDED.group_name,
            label = EXCLUDED.label,
            help = EXCLUDED.help
      RETURNING (xmax = 0) AS inserted
    `;
    if (res[0]?.inserted) added++;
  }

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM site_settings`;
  console.log(
    `  site_settings ${SETTINGS.length} keys this run (${added} new, ${SETTINGS.length - added} left as edited) — ${n} total`,
  );

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
