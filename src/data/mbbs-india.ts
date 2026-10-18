// Seat, college and fee figures are {tokens}, filled from NMC's register and the fee
// tables when the page renders (lib/liveFigures.ts, via getMbbsContent). Typed numbers
// had drifted — "1 lakh+ seats" and "750+ colleges" against NMC's 1.4 lakh and 834.
export const mbbsData = {
  hero: {
    promisingInfo: [
      { label: "Total MBBS Seats", value: "{mbbs_seats}" },
      { label: "Govt Colleges", value: "{govt_mbbs_colleges}" },
      { label: "Private Colleges", value: "{private_mbbs_colleges}" },
      { label: "Closing Ranks", value: "{closing_ranks_lakh}" },
    ],
  },

  overview: {
    items: [
      { label: "Course Duration", value: "5.5 Yrs", detail: "Including Internship" },
      { label: "Entrance Exam", value: "NEET-UG", detail: "Mandatory for All" },
      { label: "Degree Awarded", value: "MBBS", detail: "NMC Recognized" },
      { label: "Total Colleges", value: "{mbbs_colleges}", detail: "NMC register, {nmc_date}" },
      { label: "Counselling", value: "AIQ + State", detail: "Dual Pathway" },
    ],
  },

  process: {
    timeline: "May – November",
    steps: [
      "Register & Appear for NEET-UG Exam",
      "Analyze Your Score & Category Rank",
      "Research Best-Fit Colleges & Quotas",
      "Register for AIQ & State Counselling",
      "Lock Your Preferred College Choice",
      "Report to Allotted College & Start MBBS",
    ],
  },

  whatWeDo: {
    title: "How We Help You Secure the Best MBBS Seat",
    subtitle:
      "From NEET score analysis to final allotment — we manage every critical step so you don't miss a single opportunity.",
    points: [
      {
        title: "Rank-Based College Prediction",
        desc: "We set your NEET rank against the counselling authorities' own published closing ranks to show which colleges it has reached.",
      },
      {
        title: "Counselling Strategy & Registration",
        desc: "We handle AIQ, state, and deemed counselling registrations and form-filling so you never miss a deadline.",
      },
      {
        title: "Choice Filling Optimization",
        desc: "Our experts create a strategic choice list maximizing your chance of the best possible seat with zero guesswork.",
      },
      {
        title: "End-to-End Support",
        desc: "From document verification to final reporting — one team handles everything until you're seated in your college.",
      },
    ],
  },

  counselling: {
    types: [
      {
        title: "All India Quota (AIQ) — 15%",
        body: "15% of government medical college seats are reserved under AIQ. Counselled by MCC, this is your gateway to top government colleges across India regardless of domicile.",
        goalStrategy:
          "If your NEET rank is within the top 20,000, AIQ Round 1 should be your primary target. We help you lock the best possible government seat before state counselling even starts.",
      },
      {
        title: "State Quota — 85%",
        body: "85% of government seats are allotted through respective state counselling. Your domicile state determines eligibility. Each state has its own schedule and process.",
        goalStrategy:
          "Domicile candidates should maximize their state quota advantage. We map your rank against state-specific cutoffs and optimize your choice list for the highest-ranked college possible.",
      },
      {
        title: "Private / Deemed Universities",
        body: "Private medical colleges and Deemed Universities conduct counselling through MCC or their own processes. Fees are higher but seats are more accessible at certain rank ranges.",
        goalStrategy:
          "For ranks between 50K–2L, private colleges offer excellent infrastructure. We identify NMC-approved colleges with the best fee-to-quality ratio and manage the entire admission process.",
      },
      {
        title: "Management / NRI Quota",
        body: "A percentage of seats in private colleges are reserved under Management and NRI quotas. These require separate applications and often have different fee structures.",
        goalStrategy:
          "If budget is flexible, management quota seats in top-tier private colleges can be strategic. We negotiate and verify legitimacy to ensure a transparent, hassle-free admission.",
      },
    ],
    disclaimer:
      "Seat percentages and counselling processes are subject to change based on NMC/MCC/state government notifications. Always verify with official sources.",
  },

  eligibility: {
    criteria: [
      "Must have passed 10+2 with Physics, Chemistry, and Biology with a minimum of 50% marks (40% for SC/ST/OBC).",
      "Must qualify NEET-UG with the minimum required percentile as per NMC norms.",
      "Age must be 17 years or above at the time of admission (as per NMC guidelines).",
    ],
    usefulInfo: [
      {
        title: "Domicile Importance",
        desc: "Your domicile state determines your eligibility for 85% state quota seats. Ensure your domicile certificate is accurate and up-to-date to maximize seat options.",
      },
      {
        title: "Category Benefits",
        desc: "SC, ST, OBC, and EWS candidates get relaxed cutoffs and reserved seats in both AIQ and state counselling rounds. Proper documentation is critical.",
      },
      {
        title: "NEET Validity",
        desc: "NEET scores are valid for the admission year only. There is no provision for carrying forward scores to subsequent years.",
      },
    ],
  },

  documents: {
    list: [
      "NEET-UG Scorecard & Admit Card",
      "Class 10 Marksheet & Certificate",
      "Class 12 Marksheet & Certificate",
      "Transfer Certificate (TC)",
      "Domicile / Residence Certificate",
      "Category Certificate (SC/ST/OBC/EWS)",
      "Aadhaar Card / Photo ID",
      "Passport Size Photographs (8-10)",
      "Income Certificate (if applicable)",
      "Migration Certificate",
    ],
    disclaimer:
      "Document requirements may vary by state and college. Always verify with the official counselling authority.",
  },

  fees: {
    ranges: [
      { category: "Government colleges", range: "{govt_mbbs_fee} a year" },
      { category: "Private colleges", range: "{private_mbbs_fee} a year" },
      { category: "Deemed universities", range: "{deemed_mbbs_fee} a year" },
      { category: "Management & NRI quota", range: "Set by each college" },
    ],
    disclaimer:
      "The middle 80% of the yearly fees colleges published for the latest session: a government college's lowest published fee, and every fee a private college or deemed university publishes, because which one applies depends on your quota. Hostel, deposits and university charges are extra. Confirm the exact fee with the college or counselling authority before you plan around it.",
  },

  whyUs: {
    points: [
      {
        title: "Published Ranks, Not Estimates",
        desc: "Built on the published closing ranks of every round, not estimates",
      },

      {
        title: "Pan-India Coverage",
        desc: "Expertise across AIQ, all 36 state counsellings & private",
      },
      {
        title: "Dedicated Mentor",
        desc: "One-on-one guidance from NEET score analysis to college reporting",
      },
      {
        title: "15+ Years Experience",
        desc: "Trusted by 2100+ families for MBBS admissions across India",
      },
    ],
  },

  topColleges: [] as { name: string; location: string; rank: string; image: string }[],

  seats: {
    distribution: [
      { count: "{mbbs_seats}", label: "Total MBBS Seats" },
      { count: "{govt_mbbs_seats}", label: "Government Seats" },
      { count: "{private_mbbs_seats}", label: "Private Seats" },
    ],
    // The five states with the most MBBS seats, from NMC's register.
    topStates: ["{top_state_1}", "{top_state_2}", "{top_state_3}", "{top_state_4}", "{top_state_5}"],
    disclaimer:
      "Approved MBBS seats from the National Medical Commission's college register, as of {nmc_date}. New colleges and seats are added every year; the seats a counselling round offers come from that year's seat matrix.",
  },

  faqs: [
    {
      question: "What is the eligibility criteria for MBBS admission in India?",
      answer: "Candidates must have passed 10+2 with Physics, Chemistry, and Biology with a minimum of 50% marks (40% for reserved categories). Qualifying NEET-UG is mandatory. The minimum age requirement is 17 years at the time of admission.",
    },
    {
      question: "How many MBBS seats are available in India?",
      answer: "NMC's register lists {mbbs_seats} MBBS seats across {mbbs_colleges} medical colleges — {govt_mbbs_seats} in {govt_mbbs_colleges} government colleges and {private_mbbs_seats} in {private_mbbs_colleges} private ones (as of {nmc_date}). The count changes every year as NMC approves new colleges and seats, so your counsellor works from the current year's seat matrix.",
    },
    {
      question: "What is the fee structure for MBBS in government and private colleges?",
      answer: "From the fees colleges published for the latest session: a government college usually charges {govt_mbbs_fee} a year (median {govt_mbbs_fee_median}). A private college publishes several fees, one per quota, most of them {private_mbbs_fee} a year (median {private_mbbs_fee_median}). Deemed universities mostly charge {deemed_mbbs_fee} a year (median {deemed_mbbs_fee_median}). Hostel, deposits and university charges are extra.",
    },
    {
      question: "What is the difference between AIQ and State Quota counselling?",
      answer: "All India Quota (AIQ) covers 15% of government seats counselled by MCC, open to candidates from any state. State Quota covers 85% of government seats, restricted to domicile candidates of that state and counselled by respective state authorities.",
    },
    {
      question: "How can Admission Hands help with MBBS admissions?",
      answer: "Admission Hands provides end-to-end MBBS admission guidance including NEET score analysis, college prediction, counselling registration, strategic choice filling, and final reporting support — backed by 15+ years of experience and 2100+ successful admissions.",
    },
  ],

  globalDisclaimer:
    "Admission Hands provides counselling and guidance services only. We are not affiliated with NMC, MCC, or any government body. All information is for guidance purposes and sourced from publicly available data. Students and parents must verify all details with official government and institutional sources before making admission decisions.",
};
