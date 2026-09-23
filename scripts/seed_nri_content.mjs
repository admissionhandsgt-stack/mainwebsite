/**
 * Lifts the NRI quota page's timeline and benefit copy into the CMS.
 * Values are verbatim from the components, so the page is unchanged.
 *
 * Run: node scripts/seed_nri_content.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const COLLECTIONS = [
  {
    slug: "nri_steps",
    label: "NRI · Admission timeline",
    description: "The zig-zag timeline. Subtitle is the month range; the step number and which side it sits on are handled automatically.",
    fields: ["title", "subtitle", "body"],
    rows: [
      { title: "NEET Examination", subtitle: "May - June", body: "Appear for NEET-UG exam which is mandatory for most medical institutions. Some deemed universities accept international qualifications." },
      { title: "College Research", subtitle: "June - July", body: "Research and shortlist medical colleges that offer NRI quota seats. Check their eligibility criteria, fee structure, and admission process." },
      { title: "Document Preparation", subtitle: "July - August", body: "Collect and prepare all required documents including NRI status proof, academic certificates, NEET scorecard, and financial documents." },
      { title: "Application Submission", subtitle: "August - September", body: "Apply to multiple institutions to increase your chances. Submit applications along with required documents and application fees." },
      { title: "Selection & Counseling", subtitle: "September - October", body: "Selected candidates will be invited for document verification and counseling. Some institutions may conduct interviews for final selection." },
      { title: "Fee Payment & Admission", subtitle: "October - November", body: "Pay the requisite fees and complete the admission formalities. Ensure all documentation is properly submitted for a smooth process." },
    ],
  },
  {
    slug: "nri_benefits",
    label: "NRI · What you get",
    description: "The points in the closing call-to-action block.",
    fields: ["title", "body"],
    rows: [
      { title: "Personalized Counseling", body: "One-on-one sessions to understand your profile and suggest the best options." },
      { title: "End-to-End Support", body: "From document preparation to final admission, we handle it all." },
      { title: "Direct College Connections", body: "We have established relationships with top medical colleges across India." },
    ],
  },
];

async function main() {
  for (const c of COLLECTIONS) {
    await sql`
      INSERT INTO content_collections (slug, label, description, fields, display_order)
      VALUES (${c.slug}, ${c.label}, ${c.description}, ${JSON.stringify(c.fields)}::jsonb, 300)
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label,
            description = EXCLUDED.description,
            fields = EXCLUDED.fields
    `;

    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${c.slug}
    `;
    if (n > 0) {
      console.log(`  ${c.slug.padEnd(16)} ${n} existing — left alone`);
      continue;
    }

    let order = 1;
    for (const r of c.rows) {
      await sql`
        INSERT INTO content_blocks (collection, title, subtitle, body, display_order, is_active)
        VALUES (${c.slug}, ${r.title}, ${r.subtitle ?? null}, ${r.body}, ${order++}, true)
      `;
    }
    console.log(`  ${c.slug.padEnd(16)} ${c.rows.length} seeded`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
