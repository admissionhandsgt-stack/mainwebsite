const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const branches = [
  {
    name: "MD Pediatrics",
    slug: "md-pediatrics",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1502740479091-635887520276?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1600",
    difficulty_score: 8,
    burnout_score: 8,
    lifestyle_score: 5,
    earning_score: 8,
    private_practice_score: 9,
    future_scope_score: 9,
    saturation_level: "medium",
    seat_availability: "high",
    demand_level: "high",
    neet_pg_rank_min: 1000,
    neet_pg_rank_max: 5000,
    verdict: "High emotional reward and fantastic private practice scope, but physically exhausting due to NICU duties.",
    consultant_note: "A very safe branch if you want independent practice early on. Vaccination alone can sustain a clinic. However, if you hate loud noises (crying) or cannot handle calculating exact drug dosages by weight, avoid this.",
    pros: ["High patient recovery rate", "Excellent private practice potential via vaccinations", "Strong emotional fulfillment"],
    cons: ["High stress in NICU/PICU", "Dealing with anxious parents is exhausting", "Drug dosage math must be perfect"],
    who_should_choose: ["Extremely patient individuals", "Those who love children", "Doctors wanting quick independent practice setup"],
    who_should_avoid: ["Those who absorb emotional trauma easily", "People who hate calculating dosages", "Those annoyed by continuous crying"],
    myths_vs_reality: [
      { myth: "It's just medicine for small adults", reality: "The physiology of a neonate is entirely different. It is a completely separate science." },
      { myth: "Pediatricians just give vaccines", reality: "You will manage crashing premature babies in the NICU during residency." }
    ],
    career_path: ["MD (3 Years)", "Neonatology/PICU Fellowship (1-2 Years)", "Consultant / Clinic Owner"],
    fellowships: ["Neonatology", "Pediatric Intensive Care", "Pediatric Neurology", "Pediatric Cardiology"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,50,000" },
      five_year_projection: "₹3,00,000 - ₹5,00,000",
      ten_year_projection: "₹10,00,000+ (With own clinic)",
      private_practice: { setup_cost: "Low", break_even_years: "1-2 years", scalability: "high" }
    }
  },
  {
    name: "MD Dermatology (DVL)",
    slug: "md-dermatology",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=1600",
    difficulty_score: 4,
    burnout_score: 2,
    lifestyle_score: 10,
    earning_score: 10,
    private_practice_score: 10,
    future_scope_score: 10,
    saturation_level: "high",
    seat_availability: "low",
    demand_level: "high",
    neet_pg_rank_min: 1,
    neet_pg_rank_max: 500,
    verdict: "The absolute best lifestyle branch. Zero emergencies, massive cosmetic income, but fiercely competitive to get.",
    consultant_note: "If you get it, take it. However, understand that traditional clinical dermatology doesn't pay the big bills; cosmetology does. You must be prepared to be half-doctor, half-entrepreneur/influencer to truly scale.",
    pros: ["Zero emergency calls", "Uncapped earning potential via cosmetology", "Excellent work-life balance"],
    cons: ["Very high cost of cosmetic equipment (Lasers)", "Highly commercialized", "Quacks and salons are your competitors"],
    who_should_choose: ["Those prioritizing lifestyle above all", "Entrepreneurs", "Doctors with an aesthetic eye"],
    who_should_avoid: ["Adrenaline junkies", "Those who want to save dying patients", "People who hate business/marketing"],
    myths_vs_reality: [
      { myth: "Dermatologists only treat acne", reality: "Residency involves treating severe leprosy, pemphigus, and STDs." },
      { myth: "It's easy money", reality: "You have to spend ₹1Cr+ on lasers to compete in Metro cities." }
    ],
    career_path: ["MD (3 Years)", "Aesthetic Fellowship / Dermatosurgery", "High-end Clinic Owner"],
    fellowships: ["Aesthetic Medicine", "Dermatosurgery", "Trichology", "Pediatric Dermatology"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,50,000 - ₹2,00,000" },
      five_year_projection: "₹4,00,000 - ₹8,00,000",
      ten_year_projection: "₹20,00,000+ (Successful Aesthetic Practice)",
      private_practice: { setup_cost: "Extreme (₹50L - ₹2Cr for Lasers)", break_even_years: "3-5 years", scalability: "high" }
    }
  },
  {
    name: "MS Obstetrics & Gynaecology",
    slug: "ms-obgyn",
    category: "surgical",
    thumbnail_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1600",
    difficulty_score: 9,
    burnout_score: 10,
    lifestyle_score: 1,
    earning_score: 9,
    private_practice_score: 10,
    future_scope_score: 10,
    saturation_level: "medium",
    seat_availability: "high",
    demand_level: "high",
    neet_pg_rank_min: 1000,
    neet_pg_rank_max: 4000,
    verdict: "Highest patient volume and extremely lucrative (especially IVF), but it completely destroys your sleep schedule.",
    consultant_note: "The most robust surgical branch for private practice. You can open a maternity home anywhere in India and succeed. However, the medico-legal risk is massive, and you will wake up at 3 AM for deliveries for the rest of your life.",
    pros: ["Recession-proof demand", "Highest volume of patients", "Massive income potential through IVF / Maternity Homes"],
    cons: ["Worst work-life balance", "Highest medico-legal risks", "Constant sleep deprivation"],
    who_should_choose: ["High-energy multitaskers", "Those wanting guaranteed private practice success", "Doctors who thrive under pressure"],
    who_should_avoid: ["Anyone who values 8 hours of uninterrupted sleep", "Those who cannot handle legal stress", "Low physical stamina individuals"],
    myths_vs_reality: [
      { myth: "It's just delivering babies", reality: "You are a full-fledged surgeon doing complex hysterectomies and managing severe hemorrhages." },
      { myth: "Only female doctors take it", reality: "Many top IVF specialists and gynecological oncologists are male." }
    ],
    career_path: ["MS (3 Years)", "Fellowship (IVF / Fetal Med / Laparoscopy)", "Maternity Home Owner / Corporate Consultant"],
    fellowships: ["Reproductive Medicine (IVF)", "Fetal Medicine", "Gynae-Oncology", "Minimal Access Surgery"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,50,000" },
      five_year_projection: "₹3,00,000 - ₹5,00,000",
      ten_year_projection: "₹15,00,000+ (IVF Center / Maternity Home)",
      private_practice: { setup_cost: "High (OT + NICU setup)", break_even_years: "3-5 years", scalability: "high" }
    }
  },
  {
    name: "MS Orthopedics",
    slug: "ms-orthopedics",
    category: "surgical",
    thumbnail_url: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=1600",
    difficulty_score: 8,
    burnout_score: 6,
    lifestyle_score: 5,
    earning_score: 9,
    private_practice_score: 8,
    future_scope_score: 9,
    saturation_level: "medium",
    seat_availability: "high",
    demand_level: "high",
    neet_pg_rank_min: 2000,
    neet_pg_rank_max: 6000,
    verdict: "High-action surgical branch with excellent earning potential via implants, but physically demanding.",
    consultant_note: "A fantastic branch if you want quick, definitive surgical results. The money in joint replacements (Arthroplasty) is huge. However, remember you will be exposed to significant radiation (C-arm) throughout your career.",
    pros: ["Instant gratification (fixing fractures)", "Very high income from surgical implants", "No dealing with chronic terminal illnesses"],
    cons: ["Physically exhausting (hammering/drilling)", "Radiation exposure in OT", "Dependent on heavy trauma early in career"],
    who_should_choose: ["Action-oriented individuals", "Those with good physical strength", "People who enjoy biomechanics"],
    who_should_avoid: ["Those who want deep medical/diagnostic puzzles", "Anyone avoiding radiation exposure", "Low stamina individuals"],
    myths_vs_reality: [
      { myth: "Ortho requires brute strength", reality: "It requires technique and leverage more than pure muscle." },
      { myth: "Ortho surgeons don't know medicine", reality: "You must manage DVT, fat embolisms, and complex post-op medical issues." }
    ],
    career_path: ["MS (3 Years)", "Fellowship (Arthroplasty / Arthroscopy / Spine)", "Consultant Surgeon"],
    fellowships: ["Arthroplasty (Joint Replacement)", "Arthroscopy (Sports Medicine)", "Spine Surgery", "Pediatric Orthopedics"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,50,000" },
      five_year_projection: "₹3,00,000 - ₹6,00,000",
      ten_year_projection: "₹15,00,000+ (High volume joint replacements)",
      private_practice: { setup_cost: "Moderate (OPD) to High (OT)", break_even_years: "2-4 years", scalability: "high" }
    }
  },
  {
    name: "MD Psychiatry",
    slug: "md-psychiatry",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1527613426406-0925c483f9ab?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 5,
    burnout_score: 7,
    lifestyle_score: 9,
    earning_score: 6,
    private_practice_score: 10,
    future_scope_score: 10,
    saturation_level: "low",
    seat_availability: "medium",
    demand_level: "high",
    neet_pg_rank_min: 3000,
    neet_pg_rank_max: 9000,
    verdict: "The branch of the future. Zero physical exhaustion, high demand, but high risk of emotional compassion fatigue.",
    consultant_note: "Mental health is the next big pandemic. This branch offers an incredible lifestyle and zero setup cost for private practice. Just ensure you can set firm emotional boundaries, or your patients' trauma will become yours.",
    pros: ["Excellent work-life balance", "Zero setup cost for practice (just a chair)", "Intellectually stimulating"],
    cons: ["Emotional burnout / Compassion fatigue", "Slower financial curve initially compared to surgery", "Stigma still exists in rural areas"],
    who_should_choose: ["Deep thinkers and philosophers", "Highly empathetic listeners", "Those who want a strict 9-to-5 life"],
    who_should_avoid: ["Action-oriented adrenaline junkies", "Those who need to 'cure' instantly", "People who absorb others' stress"],
    myths_vs_reality: [
      { myth: "Psychiatrists just talk to people", reality: "It is a heavily pharmacological branch dealing with complex brain chemistry." },
      { myth: "It's not real medicine", reality: "You are treating the most vital organ: the brain." }
    ],
    career_path: ["MD (3 Years)", "Consultant Psychiatrist"],
    fellowships: ["Child & Adolescent Psychiatry", "Geriatric Psychiatry", "De-addiction Medicine"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,20,000" },
      five_year_projection: "₹2,00,000 - ₹4,00,000",
      ten_year_projection: "₹6,00,000+ (High volume consultations)",
      private_practice: { setup_cost: "Lowest (Just a clinic space)", break_even_years: "1 year", scalability: "medium" }
    }
  },
  {
    name: "MD Anesthesiology",
    slug: "md-anesthesiology",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1600",
    difficulty_score: 8,
    burnout_score: 7,
    lifestyle_score: 6,
    earning_score: 7,
    private_practice_score: 2,
    future_scope_score: 9,
    saturation_level: "medium",
    seat_availability: "high",
    demand_level: "high",
    neet_pg_rank_min: 5000,
    neet_pg_rank_max: 15000,
    verdict: "The unsung heroes of the OT. High adrenaline, instant results, but almost impossible to have an independent OPD practice.",
    consultant_note: "Take Anesthesia if you love the OT but hate the lifelong follow-ups. Freelancing is highly lucrative. However, if you want patients to know your name and thank you, this branch will crush your ego.",
    pros: ["Action-packed critical care", "When shift ends, work ends (no follow-ups)", "Freelancing can be highly lucrative"],
    cons: ["Zero patient recognition", "High stress in the OT when things go wrong", "Dependent on surgeons for work"],
    who_should_choose: ["Calm under extreme pressure", "Lovers of pharmacology and physiology", "Those who don't want an OPD"],
    who_should_avoid: ["Ego-driven individuals needing spotlight", "Those who want their own independent clinic", "People who hate shift work"],
    myths_vs_reality: [
      { myth: "They just put people to sleep", reality: "They keep the patient alive while the surgeon inflicts major trauma." },
      { myth: "It's a relaxed backup branch", reality: "It has moments of sheer terror requiring split-second life-saving decisions." }
    ],
    career_path: ["MD (3 Years)", "Freelance Anesthetist OR ICU Consultant"],
    fellowships: ["Critical Care Medicine", "Pain Management", "Cardiac Anesthesia", "Neuro-Anesthesia"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,50,000" },
      five_year_projection: "₹2,50,000 - ₹4,00,000 (Freelancing)",
      ten_year_projection: "₹5,00,000+ (Corporate Cardiac/Neuro Anesthetist)",
      private_practice: { setup_cost: "N/A (Freelance model)", break_even_years: "N/A", scalability: "low" }
    }
  }
];

async function seedBatch2() {
  console.log("🚀 Starting Decision Engine Seeder (Batch 2)...");
  for (const branch of branches) {
    console.log(`Inserting: ${branch.name}`);
    const { error } = await supabase.from('specializations').upsert(branch, { onConflict: 'slug' });
    if (error) console.error(`❌ Failed to insert ${branch.name}:`, error.message);
    else console.log(`✅ Success: ${branch.name}`);
  }
}

seedBatch2();
