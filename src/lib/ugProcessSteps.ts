/**
 * The NEET UG admission journey as shipped — the fallback for the admin's
 * `ug_process_steps` collection (2026-10-18). One row per step; its subtitle is
 * the phase it belongs to, `data.short` the phase's tab label, `data.support`
 * what we do at that step, `data.list` / `data.rounds` one item per line.
 * No imports — the seed script reads this file too.
 */

export interface UgStep {
  id: number;
  title: string;
  description: string;
  support: string;
  list?: string[];
  rounds?: { name: string; description: string }[];
}

export interface UgPhase {
  title: string;
  shortTitle: string;
  steps: UgStep[];
}

export const UG_PHASES: UgPhase[] = [
  {
    title: "Phase 1: Before Exam",
    shortTitle: "Before Exam",
    steps: [
      {
        id: 1,
        title: "Check Eligibility Before Applying",
        description: "Verify your eligibility based on age, qualifying marks, and category-specific requirements as per NTA guidelines.",
        support: "Clarifies eligibility based on category and documents. Prevents mistakes in category selection.",
      },
      {
        id: 2,
        title: "Fill NEET UG Application Form",
        description: "Register on the official NTA website and fill in personal, academic, and contact details carefully.",
        support: "Accurate form filling guidance. Prevents document and detail errors.",
      },
      {
        id: 3,
        title: "Use Correction Window Carefully",
        description: "Utilize the one-time opportunity provided by NTA to correct errors in your application form.",
        support: "Identifies critical corrections. Ensures consistency with counselling data.",
      },
      {
        id: 4,
        title: "Download Admit Card & Appear for Exam",
        description: "Download the hall ticket and follow all instructions for the exam day.",
        support: "Pre-exam checklist and document readiness.",
      },
    ],
  },
  {
    title: "Phase 2: After Result",
    shortTitle: "After Result",
    steps: [
      {
        id: 5,
        title: "Result, Rank & Score Analysis",
        description: "Once results are out, analyze your All India Rank (AIR) and Category Rank.",
        support: "Rank-based college feasibility and budget vs college mapping.",
      },
      {
        id: 6,
        title: "Decide Counselling Routes",
        description: "Understand various quotas like AIQ (15%), State Quota (85%), Deemed Universities, and Central Universities.",
        support: "Multi-counselling strategy. Identifies all eligible routes.",
      },
      {
        id: 7,
        title: "Register for Counselling",
        description: "Submit registration fees and security deposits on MCC or respective State portals.",
        support: "Step-by-step registration help and fee/deposit guidance.",
      },
    ],
  },
  {
    title: "Phase 3: Counselling Process",
    shortTitle: "Counselling",
    steps: [
      {
        id: 8,
        title: "Understand Counselling Rules & Schedule",
        description: "Each round has specific rules regarding exit, forfeiture of security deposit, and upgrades.",
        support: "Explains exit rules, upgrade rules, and refunds.",
      },
      {
        id: 9,
        title: "Review Seat Matrix",
        description: "Analyze the available seats in colleges based on your category and rank.",
        support: "Filters colleges by rank, category, and budget.",
      },
      {
        id: 10,
        title: "Choice Filling & Locking",
        description: "List colleges in order of preference. Strategic ordering is key to getting the best possible seat.",
        support: "Strategic preference ordering. Avoids common mistakes.",
      },
      {
        id: 11,
        title: "Seat Allotment Result",
        description: "Check which college has been assigned to you based on your choices and rank.",
        support: "Accept vs upgrade decisions.",
      },
      {
        id: 12,
        title: "Reporting to College",
        description: "Visit the allotted college with original documents and complete admission formalities.",
        support: "Reporting guidance and fee clarification.",
      },
    ],
  },
  {
    title: "Phase 4: Final Admission",
    shortTitle: "Final Admission",
    steps: [
      {
        id: 13,
        title: "Documents Required",
        description: "Ensure you have all necessary documents in original and photocopies.",
        list: ["NEET Admit Card", "Scorecard", "10th & 12th Marksheet", "ID Proof", "Category Certificate", "Allotment Letter"],
        support: "Ensures document readiness.",
      },
      {
        id: 14,
        title: "Counselling Rounds Strategy",
        description: "Strategic planning for each round to maximize your chances.",
        // Corrected 2026-10-18: MCC's late rounds are Round 3 (the old mop-up) and an online
        // stray vacancy round it runs itself — "college-level admissions" was wrong for MCC.
        rounds: [
          { name: "Round 1", description: "The first opportunity to secure a seat." },
          { name: "Round 2", description: "Often sees shifts in cut-offs." },
          { name: "Round 3 / Mop-up", description: "For seats still vacant after round 2 — MCC calls it round 3, many states mop-up." },
          { name: "Stray Vacancy", description: "The last round, for seats left after round 3. MCC runs it online; some states hand theirs to colleges." },
        ],
        support: "Round-wise strategy and risk vs opportunity planning.",
      },
      {
        id: 15,
        title: "Final Admission & Joining",
        description: "Complete the final joining formalities and start your medical journey.",
        support: "End-to-end guidance till joining.",
      },
    ],
  },
];
