export const mbbsData = {
  hero: {
    promisingInfo: [
      { label: "Total MBBS Seats", value: "1,08,940+" },
      { label: "Govt Colleges", value: "380+" },
      { label: "Private Colleges", value: "300+" },
      { label: "Success Rate", value: "98%" },
    ],
  },

  overview: {
    items: [
      { label: "Course Duration", value: "5.5 Yrs", detail: "Including Internship" },
      { label: "Entrance Exam", value: "NEET-UG", detail: "Mandatory for All" },
      { label: "Degree Awarded", value: "MBBS", detail: "NMC Recognized" },
      { label: "Total Colleges", value: "706+", detail: "Across India" },
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
        desc: "Our data models analyze 5+ years of cutoff trends to predict the best colleges you can target with your NEET rank.",
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
      { category: "Govt Colleges", range: "₹10K – ₹50K/yr" },
      { category: "Private Colleges", range: "₹5L – ₹25L/yr" },
      { category: "Deemed Universities", range: "₹10L – ₹30L/yr" },
      { category: "Management Quota", range: "₹15L – ₹40L/yr" },
    ],
    disclaimer:
      "Fee ranges are approximate and vary across states and institutions. Government college fees are significantly subsidized. NRI/Management quota fees are typically higher. Always confirm the exact fee structure from the official college website or counselling authority before making any financial decisions.",
  },

  whyUs: {
    points: [
      {
        title: "Data-Driven Predictions",
        desc: "Powered by 5+ years of cutoff data and real-time analytics",
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
        title: "12+ Years Experience",
        desc: "Trusted by 2100+ families for MBBS admissions across India",
      },
    ],
  },

  topColleges: [
    {
      name: "AIIMS New Delhi",
      location: "New Delhi",
      rank: "AIQ Top 50",
      image: "/assets/images/colleges/aiims-delhi.jpg",
    },
    {
      name: "JIPMER Puducherry",
      location: "Puducherry",
      rank: "AIQ Top 200",
      image: "/assets/images/colleges/jipmer.jpg",
    },
    {
      name: "CMC Vellore",
      location: "Tamil Nadu",
      rank: "AIQ Top 100",
      image: "/assets/images/colleges/cmc-vellore.jpg",
    },
  ],

  seats: {
    distribution: [
      { count: "1,08,940+", label: "Total MBBS Seats" },
      { count: "55,000+", label: "Government Seats" },
      { count: "53,000+", label: "Private Seats" },
    ],
    topStates: [
      "Tamil Nadu",
      "Karnataka",
      "Maharashtra",
      "Uttar Pradesh",
      "Rajasthan",
    ],
    disclaimer:
      "Seat numbers are updated as per the latest NMC data. New colleges are added every year. Actual available seats depend on NMC approval and counselling authority notifications.",
  },

  faqs: [
    {
      question: "What is the eligibility criteria for MBBS admission in India?",
      answer: "Candidates must have passed 10+2 with Physics, Chemistry, and Biology with a minimum of 50% marks (40% for reserved categories). Qualifying NEET-UG is mandatory. The minimum age requirement is 17 years at the time of admission.",
    },
    {
      question: "How many MBBS seats are available in India?",
      answer: "India currently has over 1,08,940 MBBS seats across 706+ medical colleges, including 380+ government and 300+ private institutions recognized by the National Medical Commission (NMC).",
    },
    {
      question: "What is the fee structure for MBBS in government and private colleges?",
      answer: "Government college fees range from ₹10,000 to ₹50,000 per year. Private college fees range from ₹5 Lakh to ₹25 Lakh per year. Deemed universities can charge ₹10–30 Lakh per year. Management quota fees are typically ₹15–40 Lakh per year.",
    },
    {
      question: "What is the difference between AIQ and State Quota counselling?",
      answer: "All India Quota (AIQ) covers 15% of government seats counselled by MCC, open to candidates from any state. State Quota covers 85% of government seats, restricted to domicile candidates of that state and counselled by respective state authorities.",
    },
    {
      question: "How can Admission Hands help with MBBS admissions?",
      answer: "Admission Hands provides end-to-end MBBS admission guidance including NEET score analysis, college prediction, counselling registration, strategic choice filling, and final reporting support — backed by 12+ years of experience and 2100+ successful admissions.",
    },
  ],

  globalDisclaimer:
    "Admission Hands provides counselling and guidance services only. We are not affiliated with NMC, MCC, or any government body. All information is for guidance purposes and sourced from publicly available data. Students and parents must verify all details with official government and institutional sources before making admission decisions.",
};
