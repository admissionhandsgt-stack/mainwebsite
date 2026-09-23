/**
 * Lifts the MD/MS page's section copy into the CMS.
 *
 * The arrays live inside their components (unlike the MBBS page's single data
 * file), so the values are listed here. They are copied verbatim from what the
 * components render — the page must look identical afterwards.
 *
 * Nested lists (a step's bullet points, a quota's facts) are stored as one
 * item per line in the block's `data`, which is what the admin renders as a
 * textarea.
 *
 * Idempotent: a collection that already has rows is left alone.
 *
 * Run: node scripts/seed_pg_content.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const COLLECTIONS = [
  {
    slug: "pg_why_us",
    label: "MD/MS · Why us",
    description: "The differentiator cards. Subtitle is the highlighted claim under each one.",
    fields: ["title", "subtitle", "body"],
    rows: [
      {
        title: "Cutoff Intelligence Engine",
        subtitle: "95%+ prediction accuracy",
        body: "Our proprietary system processes 5 years of closing rank data across 250+ colleges and 60+ branches. We calculate your exact admission probability at each target institution — no guesswork, pure data.",
      },
      {
        title: "Dual Quota Mastery",
        subtitle: "AIQ + State managed in parallel",
        body: "AIQ and State Quota run in parallel with different rules, different deadlines, and different strategies. We manage both simultaneously — registrations, choice filling, seat acceptance — to maximize your allotment probability.",
      },
      {
        title: "Zero Rejection Documentation",
        subtitle: "100% verification success rate",
        body: "Document rejection at verification is the single most common way a confirmed seat is lost. Every certificate is pre-checked weeks before your reporting date so nothing is missing on the day.",
      },
      {
        title: "Round-by-Round Strategy",
        subtitle: "Every round, planned in advance",
        body: "Float, freeze or resign — each decision changes what you can reach next. We plan each round against live vacancy data rather than guessing, so you never give up a seat you cannot get back.",
      },
    ],
  },
  {
    slug: "pg_overview",
    label: "MD/MS · Overview",
    description: "The six explainer cards near the top of the MD/MS page.",
    fields: ["title", "body"],
    rows: [
      { title: "Eligibility", body: "MBBS degree from a recognized institution with completed 1-year internship and NMC/State Medical Council registration." },
      { title: "NEET PG Exam", body: "National-level entrance by NBE. Computer-based, 200 MCQs. Qualifying cutoff at 50th percentile for General/EWS." },
      { title: "Internship", body: "1-year compulsory rotating internship must be completed before counselling. Completion certificate mandatory." },
      { title: "Counselling Bodies", body: "MCC handles AIQ, Deemed & Central seats. State authorities manage State Quota. Both run in parallel." },
      { title: "Reservation", body: "SC, ST, OBC-NCL, EWS, PwD — each category has specific cutoffs, seat pools, and documentation requirements." },
      { title: "Counselling Rounds", body: "4 rounds typically: Round 1, Round 2, Mop-Up, and Stray Vacancy. Each round opens new opportunities." },
    ],
  },
  {
    slug: "pg_quotas",
    label: "MD/MS · Quota system",
    description: "The quota cards. Subtitle is the percentage; put one bullet per line.",
    fields: ["title", "subtitle", "data.bullets"],
    rows: [
      {
        title: "All India Quota",
        subtitle: "50%",
        data: { bullets: "Open to all domiciles\nManaged via MCC portal\nGovernment college seats" },
      },
      {
        title: "State Quota",
        subtitle: "50%",
        data: { bullets: "Domicile-based allocation\nVia state counselling portals\nIncludes institutional preference" },
      },
      {
        title: "Deemed Universities",
        subtitle: "100%",
        data: { bullets: "No domicile requirement\nCounselled through MCC\nHigher fee structure" },
      },
    ],
  },
  {
    slug: "pg_documents",
    label: "MD/MS · Document checklist",
    description: "What to carry to reporting. Body is the note under each document.",
    fields: ["title", "body"],
    rows: [
      { title: "NEET PG Scorecard & Rank Letter", body: "Original + 3 self-attested copies" },
      { title: "MBBS Degree Certificate", body: "Or provisional certificate from university" },
      { title: "Internship Completion Certificate", body: "With exact dates of completion" },
      { title: "NMC/State Medical Council Registration", body: "Valid and current registration" },
      { title: "All MBBS Year Mark Sheets", body: "1st through Final year including supplementary" },
      { title: "Attempt Certificate", body: "Confirming NEET PG attempt number" },
      { title: "Photo ID Proof", body: "Aadhaar / Passport / PAN / Voter ID" },
      { title: "Date of Birth Certificate", body: "Or Class 10th certificate as proof" },
      { title: "Category/Caste Certificate", body: "If applicable — issued by competent authority" },
      { title: "Domicile Certificate", body: "Required for State Quota counselling" },
    ],
  },
  {
    slug: "pg_steps",
    label: "MD/MS · Admission process",
    description: "The phased walkthrough. Subtitle is the phase label; put one bullet per line.",
    fields: ["title", "subtitle", "body", "data.bullets"],
    rows: [
      {
        title: "NEET PG Examination",
        subtitle: "Phase 01",
        body: "Conducted by NBE. Eligibility requires MBBS degree, completed internship, and NMC registration.",
        data: { bullets: "Qualifying cutoff: 50th percentile for General/EWS\nComputer-based exam with 200 MCQs\nResults typically within 2-3 weeks\nScore valid for one counselling cycle" },
      },
      {
        title: "Score Analysis & Strategy",
        subtitle: "Phase 02",
        body: "We analyze your rank against 5-year cutoff trends to build your personalized admission blueprint.",
        data: { bullets: "Rank-based college predictions across all quotas\nBranch recommendations aligned to career goals\nBudget analysis including fees, bonds, and stipends\nRealistic vs aspirational target mapping" },
      },
      {
        title: "Registration & Documentation",
        subtitle: "Phase 03",
        body: "MCC and State portals require separate registrations with specific document formats.",
        data: { bullets: "Dual registration: AIQ (MCC) + State counselling\nSecurity deposit management\nDocument pre-audit against state-specific norms\nDeadline tracking across all portals" },
      },
      {
        title: "Strategic Choice Filling",
        subtitle: "Phase 04",
        body: "Choice order is the single most important decision in PG counselling. We optimize every preference.",
        data: { bullets: "Optimized preference list balancing aspiration & safety\nBranch-college combination analysis\nRound-wise strategy for different rounds\nLive support during choice filling windows" },
      },
      {
        title: "Seat Allotment Decisions",
        subtitle: "Phase 05",
        body: "Results are released round-by-round. Each round requires strategic decisions to secure or upgrade.",
        data: { bullets: "Real-time allotment analysis\nJoin vs Float vs Resign decision support\nUpgrade probability for next rounds\nParallel AIQ + State allotment management" },
      },
      {
        title: "Document Verification",
        subtitle: "Phase 06",
        body: "Physical document verification at allotted college with zero-error compliance.",
        data: { bullets: "Complete document checklist preparation\nCertificate authenticity verification\nBackup copies and attestation management\nLast-mile logistics support" },
      },
      {
        title: "College Reporting",
        subtitle: "Phase 07",
        body: "From allotment letter to physically walking into your college — we ensure zero last-mile failures.",
        data: { bullets: "Allotment letter verification\nFee payment guidance and receipt management\nHostel and anti-ragging compliance\nOnboarding support at new institution" },
      },
    ],
  },
  {
    slug: "pg_cutoff_quotas",
    label: "MD/MS · Cutoff insights",
    description: "The comparison tables. One fact per line as “Label: value”.",
    fields: ["title", "data.facts"],
    rows: [
      {
        title: "All India Quota (AIQ)",
        data: {
          facts: [
            "Counselling Body: MCC (Centralized)",
            "Seat Scope: 50% Govt College Seats",
            "Counselling Rounds: R1, R2, R3, Stray",
            "Upgradation: Allowed R1 to R2 & R3",
            "Domicile Rule: Open to all qualified ranks",
          ].join("\n"),
        },
      },
      {
        title: "State Quota",
        data: {
          facts: [
            "Counselling Body: State authority",
            "Seat Scope: 50% Govt College Seats",
            "Counselling Rounds: Varies by state",
            "Upgradation: State-specific rules",
            "Domicile Rule: Domicile candidates only",
          ].join("\n"),
        },
      },
    ],
  },
];

async function main() {
  for (const c of COLLECTIONS) {
    await sql`
      INSERT INTO content_collections (slug, label, description, fields, display_order)
      VALUES (${c.slug}, ${c.label}, ${c.description}, ${JSON.stringify(c.fields)}::jsonb, 200)
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label,
            description = EXCLUDED.description,
            fields = EXCLUDED.fields
    `;

    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM content_blocks WHERE collection = ${c.slug}
    `;
    if (n > 0) {
      console.log(`  ${c.slug.padEnd(20)} ${n} existing — left alone`);
      continue;
    }

    let order = 1;
    for (const r of c.rows) {
      await sql`
        INSERT INTO content_blocks
          (collection, title, subtitle, body, data, display_order, is_active)
        VALUES
          (${c.slug}, ${r.title ?? null}, ${r.subtitle ?? null}, ${r.body ?? null},
           ${JSON.stringify(r.data ?? {})}::jsonb, ${order++}, true)
      `;
    }
    console.log(`  ${c.slug.padEnd(20)} ${c.rows.length} seeded`);
  }

  // The closing banner on the MD/MS page.
  const SETTINGS = [
    ["pg.cta.title", "Ready to Secure Your Dream PG Seat?", "text", "MD/MS · Closing banner", "Heading"],
    ["pg.cta.body", "Navigate the complex counselling process with data-driven strategies and dedicated 1-on-1 mentorship.", "longtext", "MD/MS · Closing banner", "Body"],
    ["pg.cta.point_1", "5-year cutoff intelligence engine", "text", "MD/MS · Closing banner", "Bullet 1"],
    ["pg.cta.point_2", "AIQ + State + Deemed quota management", "text", "MD/MS · Closing banner", "Bullet 2"],
    ["pg.cta.point_3", "Zero document rejection guarantee", "text", "MD/MS · Closing banner", "Bullet 3"],
    ["pg.cta.point_4", "Round-by-round upgrade strategy", "text", "MD/MS · Closing banner", "Bullet 4"],
  ];

  let added = 0;
  for (const [key, value, type, group, label] of SETTINGS) {
    const res = await sql`
      INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
      VALUES (${key}, ${value}, ${type}, ${group}, ${label}, 0)
      ON CONFLICT (key) DO UPDATE
        SET value_type = EXCLUDED.value_type,
            group_name = EXCLUDED.group_name,
            label = EXCLUDED.label
      RETURNING (xmax = 0) AS inserted
    `;
    if (res[0]?.inserted) added++;
  }
  console.log(`  site_settings        ${SETTINGS.length} keys (${added} new)`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
