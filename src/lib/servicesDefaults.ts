/**
 * The services on /services as shipped — the fallback for the admin's
 * `services_page` collection (2026-10-18). `icon` is a name from the page's own
 * icon list; `statValue` may carry {students}, {colleges}, {closing_ranks} or
 * {states}, filled from the owner's figures and the live data counts.
 * No imports — the seed script reads this file too.
 *
 * Corrected while moving them out of the page: no "direct admission
 * negotiation" (every MBBS seat goes through NEET counselling — the site warns
 * families about agents who offer it), no "zero rejection" or "#1 reason"
 * claims, no "bank partners", no "inter-state migration", and MCC's late rounds
 * named as they are now (round 3, then stray vacancy).
 */

export interface ServiceItem {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  statValue: string;
  statLabel: string;
}

export const SERVICES: ServiceItem[] = [
  {
    icon: "target",
    title: "Personalized NEET Counselling",
    tagline: "Your rank. Your strategy. Your seat.",
    description:
      "Every NEET rank has a unique set of possibilities. Our experts analyze your exact rank, category, domicile, and budget to build a customized admission roadmap — not generic advice.",
    features: [
      "1-on-1 sessions with senior NEET counsellors (15+ yrs experience)",
      "Category-specific strategy: General, OBC, SC/ST, EWS, PwD",
      "Domicile advantage mapping for state quota seats",
      "Budget-aligned college recommendations (₹5L to ₹2Cr range)",
      "Multiple scenario planning: best-case, realistic, safety options",
    ],
    statValue: "{students}",
    statLabel: "Students Guided",
  },
  {
    icon: "search",
    title: "Smart College Shortlisting",
    tagline: "Data-backed picks, not guesswork.",
    description:
      "We cross-reference published closing ranks, seat matrices, bond clauses and fee structures to build a shortlist ordered by what the record actually supports.",
    features: [
      "Published closing ranks for every college in the counselling",
      "Bond clause and service obligation transparency",
      "NRI/Management quota seat availability tracking",
      "Location & infrastructure quality scoring",
      "College comparison reports delivered within 24 hours",
    ],
    statValue: "{colleges}",
    statLabel: "Colleges Covered",
  },
  {
    icon: "chart",
    title: "Advanced Cutoff Analytics",
    tagline: "Predict. Plan. Secure.",
    description:
      "Your counsellor places your rank against every published round — round one, the widest the cut reached, and how far it has ever gone — and turns it into your list. Historical, never a forecast.",
    features: [
      "State-wise and AIQ cutoff trend visualization",
      "Round-by-round movement, round 1 through the stray vacancy round",
      "Category and quota-specific closing ranks",
      "Real-time updates during live counselling rounds",
      "Which band each seat falls in for your rank",
    ],
    statValue: "{closing_ranks}",
    statLabel: "Closing ranks checked",
  },
  {
    icon: "map",
    title: "AIQ & State Quota Mastery",
    tagline: "Navigate the 15%/85% maze with confidence.",
    description:
      "The dual counselling system (All India Quota + State Quota) creates both opportunities and confusion. We help you strategically apply to both, maximizing your chances without missing critical deadlines.",
    features: [
      "Parallel AIQ + State quota application management",
      "State-specific eligibility verification (domicile rules vary)",
      "Optimal choice-filling sequence for maximum allotment",
      "Other states' private-seat counselling, where your eligibility allows",
      "MCC vs State counselling timeline synchronization",
    ],
    statValue: "{states}",
    statLabel: "States Covered",
  },
  {
    icon: "landmark",
    title: "Deemed & Private University Strategy",
    tagline: "Premium seats need premium strategy.",
    description:
      "Deemed and private medical colleges have their own counselling calendars, fee structures, and seat matrices. We provide dedicated guidance for students targeting these institutions.",
    features: [
      "Complete deemed university counselling (MCC Deemed track)",
      "Private college seats through the state's management and NRI rounds",
      "Fee structure comparison with hidden cost analysis",
      "Management and NRI quota guidance, through the counselling",
      "Scholarship and fee waiver identification",
    ],
    statValue: "1-1 Guidance",
    statLabel: "Support",
  },
  {
    icon: "filecheck",
    title: "Documentation & Verification",
    tagline: "Checked before the deadline, not at it.",
    description:
      "A missing or wrongly formatted document is the most avoidable way to lose a confirmed seat. We check every certificate, affidavit, and proof weeks before the deadline.",
    features: [
      "A complete document checklist for every counselling you register for",
      "Domicile certificate validity verification",
      "Gap year affidavit preparation and notarization guidance",
      "NRI sponsorship documentation and embassy attestation",
      "Category certificate cross-verification with state norms",
    ],
    statValue: "State-wise",
    statLabel: "Document norms checked",
  },
  {
    icon: "shield",
    title: "MCC Counselling Management",
    tagline: "End-to-end. Every round. Every click.",
    description:
      "From MCC registration to final allotment, we manage every step — choice filling, choice locking, seat acceptance, and upgrade decisions across all rounds including round 3 and the stray vacancy round.",
    features: [
      "MCC portal registration and payment assistance",
      "Strategic choice list preparation (order matters enormously)",
      "Real-time choice locking supervision",
      "Round 1 → Round 2 → Round 3 → Stray vacancy tracking",
      "Seat acceptance vs float vs slide decision guidance",
    ],
    statValue: "4",
    statLabel: "Rounds Managed",
  },
  {
    icon: "banknote",
    title: "Fee & Budget Planning",
    tagline: "Know every rupee before you commit.",
    description:
      "Medical education costs extend far beyond tuition. We provide transparent, complete fee analysis including hostel, mess, security deposits, bank guarantees, and year-on-year escalation clauses.",
    features: [
      "Complete 5-year cost projection for each target college",
      "Hidden fee identification (development fund, caution deposits)",
      "Education loan guidance",
      "Bond clause financial implications analysis",
      "Refund policy and seat surrender cost transparency",
    ],
    statValue: "₹5L-2Cr",
    statLabel: "Budget Range",
  },
  {
    icon: "upgrade",
    title: "Seat Upgrade Strategy",
    tagline: "Good seat today. Better seat tomorrow.",
    description:
      "Knowing when to hold a seat, when to upgrade, and when to exit requires deep understanding of round-wise vacancy patterns. One wrong decision can cost you your dream college or lakhs in fees.",
    features: [
      "Hold vs Upgrade vs Exit decision framework",
      "How far later rounds reached, from the published results",
      "Dual-allotment management (AIQ + State simultaneously)",
      "Fee refund timeline optimization",
      "Emergency seat surrender and re-allotment support",
    ],
    statValue: "Every",
    statLabel: "Round tracked",
  },
  {
    icon: "graduation",
    title: "Post-Allotment & Reporting",
    tagline: "From allotment letter to classroom.",
    description:
      "Getting a seat is half the battle. Physical reporting, document verification at the college, fee payment, hostel allotment, and anti-ragging compliance — we ensure nothing is missed.",
    features: [
      "Physical reporting checklist and timeline management",
      "College-specific document requirement verification",
      "Medical fitness certificate coordination",
      "Anti-ragging undertaking and affidavit preparation",
      "Hostel allotment and initial settling-in guidance",
    ],
    statValue: "Day 1",
    statLabel: "To reporting day",
  },
];
