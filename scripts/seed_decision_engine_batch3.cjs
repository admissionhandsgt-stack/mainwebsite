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
    name: "MS Ophthalmology",
    slug: "ms-ophthalmology",
    category: "surgical",
    thumbnail_url: "https://images.unsplash.com/photo-1576089297298-500f40bfb72a?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=1600",
    difficulty_score: 4,
    burnout_score: 3,
    lifestyle_score: 9,
    earning_score: 8,
    private_practice_score: 9,
    future_scope_score: 8,
    saturation_level: "high",
    seat_availability: "medium",
    demand_level: "medium",
    neet_pg_rank_min: 4000,
    neet_pg_rank_max: 10000,
    verdict: "The perfect 'clean' surgical branch. Excellent lifestyle, zero mortality, but extremely equipment-heavy and saturated in metros.",
    consultant_note: "Take Ophthalmology if you want surgical satisfaction without the life-or-death stress of General Surgery. However, you MUST secure a good fellowship in Phaco (Cataract) after MS, as many colleges don't provide enough hands-on cutting chances.",
    pros: ["Zero mortality rate", "Excellent work-life balance", "Clean micro-surgery (sit down and operate)"],
    cons: ["High initial setup cost (Microscopes/Phaco machines)", "Steep micro-surgical learning curve", "Corporate eye chains dominating metros"],
    who_should_choose: ["Perfectionists with fine motor skills", "Those prioritizing lifestyle but wanting surgery", "Tech-savvy individuals"],
    who_should_avoid: ["Adrenaline junkies", "Those with hand tremors", "People wanting to manage systemic diseases"],
    myths_vs_reality: [
      { myth: "They just prescribe glasses", reality: "It is a highly skilled micro-surgical branch." },
      { myth: "You learn everything in MS", reality: "You almost certainly need a paid fellowship post-MS to learn modern Phacoemulsification." }
    ],
    career_path: ["MS (3 Years)", "Fellowship (Phaco/Retina/Cornea) (1-2 Years)", "Consultant / Eye Center Owner"],
    fellowships: ["Cataract & Refractive (LASIK)", "Vitreo-Retina", "Cornea", "Glaucoma", "Oculoplasty"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,20,000" },
      five_year_projection: "₹2,50,000 - ₹4,00,000",
      ten_year_projection: "₹10,00,000+ (High-volume Phaco/LASIK)",
      private_practice: { setup_cost: "High (₹30L - ₹1Cr for Phaco/Lasers)", break_even_years: "3-5 years", scalability: "high" }
    }
  },
  {
    name: "MS ENT (Otorhinolaryngology)",
    slug: "ms-ent",
    category: "surgical",
    thumbnail_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=1600",
    difficulty_score: 5,
    burnout_score: 4,
    lifestyle_score: 8,
    earning_score: 7,
    private_practice_score: 8,
    future_scope_score: 8,
    saturation_level: "medium",
    seat_availability: "medium",
    demand_level: "medium",
    neet_pg_rank_min: 5000,
    neet_pg_rank_max: 12000,
    verdict: "A highly balanced micro-surgical branch with manageable emergencies, but a steep learning curve for endoscopic procedures.",
    consultant_note: "ENT is underrated. It offers a great mix of OPD and quick surgeries. The real money lies in Head & Neck Oncology or Cochlear Implants, not just removing tonsils. Be prepared to buy expensive endoscopes for your clinic.",
    pros: ["Great work-life balance", "Mix of medical and surgical management", "Short, definitive surgeries"],
    cons: ["Narrow anatomical field", "High equipment cost (Endoscopes)", "Dependent on referrals for major cases"],
    who_should_choose: ["Detail-oriented individuals", "Those who enjoy endoscopic procedures", "Doctors wanting a balanced life"],
    who_should_avoid: ["Those wanting to do large open surgeries", "People who hate narrow, dark spaces", "Adrenaline junkies"],
    myths_vs_reality: [
      { myth: "It's just tonsils and ear wax", reality: "Modern ENT involves complex endoscopic skull base surgeries entering the brain." }
    ],
    career_path: ["MS (3 Years)", "Fellowship (Head & Neck / Skull Base)", "Consultant Surgeon"],
    fellowships: ["Head & Neck Oncology", "Otology (Cochlear Implants)", "Rhinology (FESS)", "Facial Plastic Surgery"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹1,00,000", private: "₹1,20,000" },
      five_year_projection: "₹2,00,000 - ₹4,00,000",
      ten_year_projection: "₹8,00,000+ (Head & Neck / Cochlear Specialist)",
      private_practice: { setup_cost: "Moderate to High (₹10L - ₹30L)", break_even_years: "2-4 years", scalability: "medium" }
    }
  },
  {
    name: "MD Pathology",
    slug: "md-pathology",
    category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1579154235602-3c3755f949c8?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 6,
    burnout_score: 3,
    lifestyle_score: 9,
    earning_score: 5,
    private_practice_score: 6,
    future_scope_score: 7,
    saturation_level: "low",
    seat_availability: "high",
    demand_level: "medium",
    neet_pg_rank_min: 15000,
    neet_pg_rank_max: 30000,
    verdict: "The diagnostic backbone of medicine. Perfect 9-to-5 lifestyle, but lower starting pay and zero patient interaction.",
    consultant_note: "Choose Pathology if you love the science of medicine but hate the chaos of patients. You will dictate the cancer treatment for the surgeon. However, setting up an independent lab is tough due to corporate monopolies (like Lal PathLabs).",
    pros: ["Perfect work-life balance", "Zero patient conflict or emergencies", "Intellectually highly satisfying"],
    cons: ["Lower salary than clinical branches", "No direct patient interaction or recognition", "Corporate lab monopolies make private practice hard"],
    who_should_choose: ["Introverts", "Academically inclined students", "Those wanting a strict 9-to-5"],
    who_should_avoid: ["Extroverts needing patient gratitude", "Action-oriented individuals", "Those seeking high financial rewards early"],
    myths_vs_reality: [
      { myth: "Pathologists only do autopsies", reality: "95% of your work is diagnosing biopsies from living patients to guide surgeons." },
      { myth: "It's a low-tier branch", reality: "No surgeon cuts a cancer without a Pathologist's biopsy report." }
    ],
    career_path: ["MD (3 Years)", "Fellowship (Oncopathology / Hematopath)", "Lab Consultant / Professor"],
    fellowships: ["Oncopathology", "Hematopathology", "Neuropathology", "Molecular Genetics"],
    financials: {
      residency_stipend_range: "₹50,000 - ₹1,20,000",
      first_year_salary: { govt: "₹80,000", private: "₹1,00,000" },
      five_year_projection: "₹1,50,000 - ₹2,50,000",
      ten_year_projection: "₹4,00,000+ (Corporate Lab Head)",
      private_practice: { setup_cost: "Moderate to High (Lab Equipment)", break_even_years: "4-6 years", scalability: "low" }
    }
  }
];

async function seedBatch3() {
  console.log("🚀 Starting Decision Engine Seeder (Batch 3)...");
  for (const branch of branches) {
    console.log(`Inserting: ${branch.name}`);
    const { error } = await supabase.from('specializations').upsert(branch, { onConflict: 'slug' });
    if (error) console.error(`❌ Failed to insert ${branch.name}:`, error.message);
    else console.log(`✅ Success: ${branch.name}`);
  }
}

seedBatch3();
