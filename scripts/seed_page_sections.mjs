/**
 * Registers the sections of every page that has more than one.
 *
 * Order matches what each page renders today, so nothing moves until someone
 * reorders it in the admin. Idempotent — an existing row is left alone.
 *
 * Run: node scripts/seed_page_sections.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const SECTIONS = {
  mbbs: [
    ["hero", "Hero", "The banner at the top of the MBBS page"],
    ["overview", "Quick overview", "The stat cards under the hero"],
    ["eligibility", "Eligibility & cutoff", "Who can apply and what score is needed"],
    ["process", "Admission process", "The step-by-step counselling walkthrough"],
    ["counselling", "Counselling system", "AIQ, state and deemed explained"],
    ["seats", "Seat distribution", "How the seat matrix splits"],
    ["fees", "Fee structure", "What each college type costs"],
    ["selection_guide", "College selection guide", "How to build a shortlist"],
    ["why_us", "Why Admission Hands", "The differentiators block"],
    ["disclaimer", "Disclaimer", "The data-source note at the foot of the page"],
  ],
  pg: [
    ["hero", "Hero", "The banner at the top of the MD/MS page"],
    ["why_us", "Why Admission Hands", "The differentiators block"],
    ["overview", "Overview", "What NEET PG counselling involves"],
    ["process", "Admission process", "The round-by-round walkthrough"],
    ["specializations", "Specialisations", "The branch grid"],
    ["quota", "Quota system", "AIQ vs state quota explained"],
    ["colleges", "College list", "The searchable PG college table"],
    ["documents", "Document checklist", "What to carry to reporting"],
    ["cutoffs", "Cutoff insights", "How closing ranks have moved"],
    ["faq", "FAQ", "Questions, grouped into tabs"],
    ["lead_form", "Enquiry form", "The form at the bottom of the page"],
  ],
  nri: [
    ["hero", "Hero", "The banner at the top of the NRI page"],
    ["eligibility", "Eligibility", "Who qualifies for an NRI seat"],
    ["process", "Process", "How an NRI admission runs"],
    ["fees", "Fees", "What NRI seats cost"],
    ["faq", "FAQ", "The accordion of questions"],
    ["cta", "Call to action", "The closing conversion block"],
  ],
};

async function main() {
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
    console.log(`  ${page.padEnd(8)} ${rows.length} sections (${fresh} new)`);
  }

  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM page_sections`;
  console.log(`  ${n} sections registered in total`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
