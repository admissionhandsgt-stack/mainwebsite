const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. GENERATION TEMPLATE & VALIDATION ENGINE
// ==========================================
function validateBranchData(branches) {
  console.log("Validating relative intelligence rules...");
  let isValid = true;

  const getBranch = (slug) => branches.find(b => b.slug === slug);

  const rad = getBranch('md-radiology');
  const path = getBranch('pathology');
  const med = getBranch('md-general-medicine');
  const derm = getBranch('md-dermatology');
  const surg = getBranch('ms-general-surgery');

  // Rule 1: Radiology > Pathology (earning_score)
  if (rad && path && rad.earning_score <= path.earning_score) {
    console.error("❌ Validation Failed: Radiology earning_score must be > Pathology");
    isValid = false;
  }

  // Rule 2: Medicine > Dermatology (burnout_score)
  if (med && derm && med.burnout_score <= derm.burnout_score) {
    console.error("❌ Validation Failed: Medicine burnout_score must be > Dermatology");
    isValid = false;
  }

  // Rule 3: Surgical > Clinical (difficulty_score & burnout_score)
  if (surg && med && surg.difficulty_score <= med.difficulty_score) {
    console.error("❌ Validation Failed: Surgery difficulty must be > Medicine");
    isValid = false;
  }

  if (isValid) {
    console.log("✅ All validation rules passed.");
  } else {
    console.error("🚨 Seeding aborted due to validation failure.");
    process.exit(1);
  }
}

// ==========================================
// 2. DATA LAYER (BATCH 1)
// ==========================================
const branches = [
  {
    name: "MD General Medicine",
    slug: "md-general-medicine",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1576091160550-2173dad99901?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1600",
    
    // Scoring
    difficulty_score: 9,
    burnout_score: 9,
    lifestyle_score: 4,
    earning_score: 7,
    private_practice_score: 6,
    future_scope_score: 10,
    
    // Enums
    saturation_level: "high",
    seat_availability: "high",
    demand_level: "high",
    
    // Numeric Range
    neet_pg_rank_min: 1,
    neet_pg_rank_max: 3000,
    
    // Text
    verdict: "High intellectual satisfaction, but grueling residency. A mandatory stepping stone to lucrative DM branches.",
    consultant_note: "Do not take this if you want an easy life in your 30s. A plain MD Medicine struggles in metros today; be prepared to study for another 3 years for your DM to truly reap the financial rewards.",
    
    // Structured JSON
    pros: [
      "Ultimate diagnostic authority",
      "Gateway to elite DM branches (Cardio/Neuro)",
      "Recession-proof demand"
    ],
    cons: [
      "Extremely toxic residency",
      "High burnout managing chronic/dying patients",
      "Plain MD is saturating in Tier 1 cities"
    ],
    who_should_choose: [
      "Deep analytical thinkers",
      "Students willing to study until age 32+",
      "Those seeking long-term patient relationships"
    ],
    who_should_avoid: [
      "Students wanting a 9-to-5 job",
      "Those who prefer quick surgical fixes",
      "Individuals prone to severe emotional fatigue"
    ],
    myths_vs_reality: [
      { myth: "Medicine doctors are instantly rich", reality: "Peak earning happens very late in career compared to surgeons or dermatologists." },
      { myth: "It's just writing prescriptions", reality: "You manage ICU ventilators, central lines, and cardiac arrests." }
    ],
    career_path: [
      "MD (3 Years)",
      "Senior Residency (1-3 Years)",
      "DM Super Specialization (3 Years)",
      "Senior Consultant"
    ],
    fellowships: [
      "Cardiology", "Neurology", "Gastroenterology", "Endocrinology", "Nephrology"
    ],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: {
        govt: "₹1,00,000",
        private: "₹1,20,000 - ₹1,50,000"
      },
      five_year_projection: "₹2,50,000 - ₹3,50,000 (Plain MD)",
      ten_year_projection: "₹8,000,000+ (With DM in Private Setup)",
      private_practice: {
        setup_cost: "Low",
        break_even_years: "1-2 years",
        scalability: "medium"
      }
    }
  },
  {
    name: "MD Radio-diagnosis",
    slug: "md-radiology",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1600",
    
    // Scoring
    difficulty_score: 7,
    burnout_score: 4,
    lifestyle_score: 10,
    earning_score: 9,
    private_practice_score: 8,
    future_scope_score: 9,
    
    // Enums
    saturation_level: "low",
    seat_availability: "low",
    demand_level: "high",
    
    // Numeric Range
    neet_pg_rank_min: 1,
    neet_pg_rank_max: 800,
    
    // Text
    verdict: "The undisputed king of lifestyle and early ROI, but demands massive capital if you want to be your own boss.",
    consultant_note: "If you have the rank, take it. However, if your dream is to run your own diagnostic center, ensure you have ₹5Cr-₹10Cr in family backing for MRI/CT machines. Otherwise, you will be a highly-paid employee forever.",
    
    // Structured JSON
    pros: [
      "Zero emergency night calls (Diagnostic)",
      "Highest starting salary post-MD",
      "Clean, AC-room environment"
    ],
    cons: [
      "Astronomical setup cost for private practice",
      "Severe eye strain from dark rooms",
      "Isolating; minimal patient interaction"
    ],
    who_should_choose: [
      "Tech-savvy visual thinkers",
      "Students prioritizing family and sleep",
      "Introverts who dislike ward politics"
    ],
    who_should_avoid: [
      "Extroverts needing patient gratitude",
      "Adrenaline junkies",
      "Those who want to perform open surgeries"
    ],
    myths_vs_reality: [
      { myth: "AI will replace Radiologists", reality: "AI will replace Radiologists who don't use AI. The volume of scans is increasing faster than AI development." },
      { myth: "It's an easy subject", reality: "The syllabus is massive, covering anatomy from head to toe in cross-section." }
    ],
    career_path: [
      "MD (3 Years)",
      "Fellowship (1-2 Years)",
      "Corporate Consultant OR Center Owner"
    ],
    fellowships: [
      "Interventional Radiology", "Neuro-Radiology", "Fetal Medicine", "MSK Imaging"
    ],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: {
        govt: "₹1,20,000",
        private: "₹2,50,000 - ₹3,50,000"
      },
      five_year_projection: "₹4,00,000 - ₹6,00,000",
      ten_year_projection: "₹10,00,000+ (Interventional or Owner)",
      private_practice: {
        setup_cost: "Extreme (₹5Cr - ₹15Cr)",
        break_even_years: "5-8 years",
        scalability: "high"
      }
    }
  },
  {
    name: "MS General Surgery",
    slug: "ms-general-surgery",
    category: "surgical",
    thumbnail_url: "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1559839734-2b71f1536780?q=80&w=1600",
    
    // Scoring
    difficulty_score: 10,
    burnout_score: 10,
    lifestyle_score: 2,
    earning_score: 8,
    private_practice_score: 5,
    future_scope_score: 10,
    
    // Enums
    saturation_level: "high",
    seat_availability: "medium",
    demand_level: "high",
    
    // Numeric Range
    neet_pg_rank_min: 500,
    neet_pg_rank_max: 5000,
    
    // Text
    verdict: "The most physically demanding branch in medicine. High adrenaline, but requires a 6-10 year marathon to reach the top.",
    consultant_note: "Never take plain MS Surgery if you plan to settle in a Tier-1 city without doing an MCh (Uro/Onco/GI). The era of the 'General' surgeon in metros is over. Prepare for brutal physical exhaustion.",
    
    // Structured JSON
    pros: [
      "Instant cure (Definitive treatment)",
      "High societal respect and 'God' complex",
      "Gateway to elite MCh surgical branches"
    ],
    cons: [
      "Worst work-life balance possible",
      "High medico-legal risk",
      "Severe physical toll (standing 8+ hours)"
    ],
    who_should_choose: [
      "High stamina, action-oriented individuals",
      "Those who can function on zero sleep",
      "Decisive, confident personalities"
    ],
    who_should_avoid: [
      "Students who value their weekends",
      "Those seeking quick financial returns",
      "Individuals with back or knee problems"
    ],
    myths_vs_reality: [
      { myth: "Surgeons are rich immediately", reality: "You are essentially a poorly paid student until age 33+ (post-MCh)." },
      { myth: "You operate from Day 1", reality: "You will do dressings and hold retractors for 2 years before doing a major case." }
    ],
    career_path: [
      "MS (3 Years)",
      "Senior Residency (3 Years)",
      "MCh Super Specialization (3 Years)",
      "Corporate Surgeon"
    ],
    fellowships: [
      "Urology", "Surgical Oncology", "Surgical Gastroenterology", "Plastic Surgery"
    ],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: {
        govt: "₹1,00,000",
        private: "₹1,20,000"
      },
      five_year_projection: "₹2,00,000 - ₹3,00,000 (Plain MS)",
      ten_year_projection: "₹8,00,000 - ₹15,00,000+ (With MCh)",
      private_practice: {
        setup_cost: "High (OT + ICU required)",
        break_even_years: "3-5 years",
        scalability: "medium"
      }
    }
  }
];

// ==========================================
// 3. EXECUTION LOGIC
// ==========================================
async function seedDatabase() {
  console.log("🚀 Starting Decision Engine Seeder...");
  
  validateBranchData(branches);

  for (const branch of branches) {
    console.log(`Inserting: ${branch.name}`);
    
    const { error } = await supabase
      .from('specializations')
      .upsert(branch, { onConflict: 'slug' });

    if (error) {
      console.error(`❌ Failed to insert ${branch.name}:`, error.message);
    } else {
      console.log(`✅ Success: ${branch.name}`);
    }
  }

  console.log("🎉 Seeding complete. To add more branches, append to the 'branches' array in this script.");
}

seedDatabase();
