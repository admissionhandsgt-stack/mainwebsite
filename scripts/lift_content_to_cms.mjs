/**
 * Moves the copy that was hardcoded in components into the CMS, unchanged.
 *
 * The point is that the site reads identically before and after: this is
 * making existing content editable, not rewriting it. Each collection's
 * `fields` are updated first so the admin form shows the right inputs.
 *
 * Run once: node scripts/lift_content_to_cms.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const COLLECTIONS = {
  faq_pg: {
    label: "FAQ — MD/MS",
    description:
      "Questions on the MD/MS page. The subtitle is the tab a question sits under — reuse the same wording to group questions together.",
    fields: ["title", "subtitle", "body"],
  },
  faq_nri: {
    label: "FAQ — NRI quota",
    description: "Questions in the accordion on the NRI quota page.",
    fields: ["title", "body"],
  },
  testimonials: {
    label: "Testimonials",
    description:
      "Student and parent quotes on the homepage. Initials on the avatar are generated from the name.",
    fields: ["title", "subtitle", "body", "data.outcome", "data.rating"],
  },
};

const FAQ_PG = [
  ["Eligibility & Basics", "What is the eligibility for NEET PG counselling?", "You need an MBBS degree from a recognized institution, completed 1-year compulsory rotating internship, and valid NMC/State Medical Council registration. Your NEET PG score must meet the qualifying cutoff (50th percentile for General/EWS category)."],
  ["Counselling & Process", "What is the difference between AIQ and State Quota?", "All India Quota (AIQ) reserves 50% of government medical college PG seats for candidates from any state, managed by MCC. State Quota is the remaining 50%, reserved for domicile candidates and managed by respective state counselling authorities. We recommend registering for both to maximize options."],
  ["Counselling & Process", "How many counselling rounds are there?", "Typically 4 rounds: Round 1, Round 2, Mop-Up Round, and Stray Vacancy Round. Each round has its own registration, choice filling, and allotment schedule. Seats vacated in earlier rounds become available in subsequent rounds, sometimes at lower cutoffs."],
  ["Eligibility & Basics", "Can I apply for both MD and MS programs?", "Yes, absolutely. During choice filling, you can include both MD (Medicine) and MS (Surgery) programs in your preference list. Your allotment depends on your rank and the availability of seats in your chosen combinations."],
  ["Fees & Bonds", "What is the fee structure for PG medical seats?", "Fees vary dramatically. Government colleges charge ₹15,000-₹1,00,000 per year. Private colleges range from ₹5-25 lakhs per year. Deemed universities can go up to ₹30-50 lakhs per year. Many colleges also have bond clauses requiring rural service or monetary penalties."],
  ["Fees & Bonds", "Do PG students receive a stipend?", "Yes, government medical college PG students receive monthly stipends ranging from ₹40,000 to ₹1,00,000+ depending on the state and year of residency. Most private and deemed universities do not offer stipends, though some provide nominal amounts."],
  ["Fees & Bonds", "What are bond clauses in PG admissions?", "Many state government colleges require PG graduates to serve in rural/government hospitals for 1-3 years after completion, or pay a bond penalty (₹10-50 lakhs). We help you understand each college's bond terms before choice filling so there are no surprises."],
  ["Counselling & Process", "Can I upgrade my seat in later rounds?", "Yes. If you are allotted a seat in Round 1, you can choose to “float” (retain current seat while participating in next round for a better option) or “resign” (give up current seat). Our experts provide round-by-round upgrade strategies based on real-time vacancy analysis."],
  ["Counselling & Process", "What happens if I miss a counselling deadline?", "Missing any deadline — registration, choice filling, fee payment, or reporting — typically results in forfeiture of your seat and security deposit. There is usually no appeal process. This is why our deadline management service is critical."],
  ["Eligibility & Basics", "How is Admission Hands different from other counselling services?", "We are data-first: our recommendations are backed by 5-year cutoff analytics, not opinions. You get a single named expert counsellor from Day 1 through college reporting. We manage AIQ + State + Deemed quotas in parallel. And we have a 100% success rate in documentation across 2100+ students."],
];

const FAQ_NRI = [
  ["What is NRI quota in medical colleges?", "NRI quota refers to seats reserved in medical colleges for Non-Resident Indians (NRIs), Person of Indian Origin (PIO), Overseas Citizens of India (OCI), and foreign nationals. Typically, 15% of seats in private and deemed universities are allocated under the NRI/Management quota."],
  ["Does every medical college have NRI quota seats?", "No, not all medical colleges offer NRI quota seats. Most private medical colleges, deemed universities, and some government medical colleges have NRI quota seats. The availability and number of seats vary by institution and are typically regulated by respective state authorities."],
  ["Is NEET mandatory for NRI quota admissions?", "Yes, as per the Supreme Court ruling, NEET qualification is mandatory for admission to medical courses in India, including through the NRI quota. Some institutions may have specific additional requirements for foreign nationals."],
  ["Can a student sponsored by an NRI apply under NRI quota?", "Yes, many institutions accept NRI-sponsored candidates. The sponsor must be a blood relative (parent, sibling, or specific cousins/uncles/aunts). Relationship requirements vary by institution."],
  ["What documents are required to prove NRI status?", "Common documents include a valid passport with visa stamps, overseas address proof, employment proof, NRI bank statements, and tax documents from the foreign country."],
];

const TESTIMONIALS = [
  ["Dr. Ananya Sharma", "MBBS — AIIMS Jodhpur", "Admission Hands gave me a clear roadmap when I was overwhelmed after NEET. Their data-driven approach helped me fill choices strategically, and I got AIIMS Jodhpur in the very first round.", "Round 1 AIQ Selection"],
  ["Rahul Verma", "MD Radiology — KMC Manipal", "After scoring well in NEET-PG, I was confused between state and deemed options. The team helped me understand cutoff trends and branch probabilities. I'm now pursuing my dream branch.", "Deemed PG Selection"],
  ["Priya Nair", "MBBS — GMC Trivandrum", "My family was worried about the entire counselling process. Admission Hands handled everything — from registration to document verification. Their transparency made the whole experience stress-free.", "State Quota Selection"],
];

async function replaceCollection(slug, rows) {
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${slug}
  `;
  await sql`DELETE FROM content_blocks WHERE collection = ${slug}`;

  let order = 1;
  for (const r of rows) {
    await sql`
      INSERT INTO content_blocks
        (collection, title, subtitle, body, data, display_order, is_active)
      VALUES
        (${slug}, ${r.title}, ${r.subtitle ?? null}, ${r.body},
         ${JSON.stringify(r.data ?? {})}::jsonb, ${order++}, true)
    `;
  }
  console.log(`  ${slug.padEnd(14)} ${n} -> ${rows.length}`);
}

async function main() {
  for (const [slug, c] of Object.entries(COLLECTIONS)) {
    await sql`
      UPDATE content_collections
      SET label = ${c.label},
          description = ${c.description},
          fields = ${JSON.stringify(c.fields)}::jsonb
      WHERE slug = ${slug}
    `;
  }

  await replaceCollection(
    "faq_pg",
    FAQ_PG.map(([category, q, a]) => ({ title: q, subtitle: category, body: a })),
  );
  await replaceCollection(
    "faq_nri",
    FAQ_NRI.map(([q, a]) => ({ title: q, body: a })),
  );
  await replaceCollection(
    "testimonials",
    TESTIMONIALS.map(([name, course, text, outcome]) => ({
      title: name,
      subtitle: course,
      body: text,
      data: { outcome, rating: "5" },
    })),
  );

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
