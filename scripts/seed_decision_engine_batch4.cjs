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
    name: "MD Respiratory Medicine",
    slug: "md-respiratory-medicine",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1584516150909-c43483ee7932?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?q=80&w=1600",
    difficulty_score: 7, burnout_score: 6, lifestyle_score: 6, earning_score: 8, private_practice_score: 8, future_scope_score: 9,
    saturation_level: "low", seat_availability: "medium", demand_level: "high",
    neet_pg_rank_min: 3000, neet_pg_rank_max: 8000,
    verdict: "High growth branch post-COVID. Excellent mix of medicine and procedures (bronchoscopy).",
    consultant_note: "A fantastic alternative to General Medicine. You become a specialist immediately without needing a DM. The rise in pollution and smoking guarantees lifelong patient flow.",
    pros: ["Fast track to specialization", "High demand in urban areas", "Good mix of OPD and ICU"],
    cons: ["Exposure to infectious diseases (TB)", "Can be depressing (lung cancer)", "Emergencies can be highly stressful"],
    who_should_choose: ["Those who missed General Medicine", "Lovers of procedures (Bronchoscopy)", "Students wanting quick establishment"],
    who_should_avoid: ["Those scared of infectious diseases", "People who hate ICU work"],
    myths_vs_reality: [{ myth: "It's just treating TB", reality: "It heavily involves Sleep Medicine, Asthma, and Critical Care." }],
    career_path: ["MD", "Consultant Pulmonologist"],
    fellowships: ["Critical Care", "Sleep Medicine", "Interventional Pulmonology"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.5L" }, five_year_projection: "₹3L-₹5L", ten_year_projection: "₹8L+", private_practice: { setup_cost: "Moderate", break_even_years: "2 years", scalability: "high" } }
  },
  {
    name: "MD Emergency Medicine",
    slug: "md-emergency-medicine",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1600",
    difficulty_score: 9, burnout_score: 10, lifestyle_score: 3, earning_score: 7, private_practice_score: 1, future_scope_score: 10,
    saturation_level: "low", seat_availability: "low", demand_level: "high",
    neet_pg_rank_min: 5000, neet_pg_rank_max: 12000,
    verdict: "Pure adrenaline and life-saving action, but guarantees a lifetime of shift work and high burnout.",
    consultant_note: "The fastest growing branch in corporate hospitals. Choose this only if you thrive in chaos. Forget about having your own private clinic; you are tied to the corporate hospital ER forever.",
    pros: ["Zero follow-ups", "High adrenaline", "Corporate demand is skyrocketing"],
    cons: ["Extreme burnout", "Shift work (Night shifts forever)", "Zero private practice scope"],
    who_should_choose: ["Adrenaline junkies", "Quick decision makers", "Those who hate OPDs"],
    who_should_avoid: ["Those wanting a normal family life", "People wanting their own clinic"],
    myths_vs_reality: [{ myth: "It's a relaxed shift job", reality: "The ER is chaotic and abusive. You are the first line for angry relatives." }],
    career_path: ["MD", "ER Head / Corporate Consultant"],
    fellowships: ["Pre-hospital care", "Toxicology"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.5L" }, five_year_projection: "₹3L-₹4L", ten_year_projection: "₹6L+", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Community Medicine (PSM)",
    slug: "md-psm",
    category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=1600",
    difficulty_score: 3, burnout_score: 2, lifestyle_score: 10, earning_score: 4, private_practice_score: 1, future_scope_score: 7,
    saturation_level: "high", seat_availability: "high", demand_level: "low",
    neet_pg_rank_min: 25000, neet_pg_rank_max: 45000,
    verdict: "Perfect for government jobs, WHO roles, and policy making. Terrible for clinical practice.",
    consultant_note: "Do not take PSM if you want to be a treating clinician. Take it if you want to be an IAS officer equivalent in healthcare, working with WHO, UNICEF, or being a medical college professor.",
    pros: ["Government job security", "International agency scope (WHO)", "10/10 Work-life balance"],
    cons: ["Lowest clinical salary", "No clinical/surgical skills used", "Boring for action-seekers"],
    who_should_choose: ["Policy makers", "Public health enthusiasts", "Those wanting a relaxed life"],
    who_should_avoid: ["Action seekers", "Those wanting to earn big money fast"],
    myths_vs_reality: [{ myth: "PSM doctors don't earn", reality: "Consultants at WHO or international NGOs earn massive tax-free salaries." }],
    career_path: ["MD", "Professor OR Public Health Officer"],
    fellowships: ["Epidemiology", "Health Administration"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹60k" }, five_year_projection: "₹1.5L", ten_year_projection: "₹3L (WHO/Govt)", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Radiation Oncology",
    slug: "md-radiation-oncology",
    category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1600",
    difficulty_score: 6, burnout_score: 5, lifestyle_score: 8, earning_score: 7, private_practice_score: 2, future_scope_score: 9,
    saturation_level: "low", seat_availability: "medium", demand_level: "medium",
    neet_pg_rank_min: 8000, neet_pg_rank_max: 18000,
    verdict: "High-tech oncology branch with great lifestyle, but heavily dependent on corporate hospitals due to machine costs.",
    consultant_note: "Cancer is unfortunately growing. This is a very clean, tech-heavy branch. But remember, a LINAC machine costs ₹15 Crores. You will be a corporate employee for life, which means good pay but no independence.",
    pros: ["Clean work", "Very high tech", "Good lifestyle"],
    cons: ["Impossible to open private setup", "Depressing patient outcomes", "Narrow field"],
    who_should_choose: ["Tech lovers", "Empathetic doctors", "Those wanting corporate stability"],
    who_should_avoid: ["Those wanting their own clinic"],
    myths_vs_reality: [{ myth: "You will get radiation exposure", reality: "It is one of the safest branches due to strict atomic energy guidelines." }],
    career_path: ["MD", "Corporate Consultant"],
    fellowships: ["Stereotactic Radiosurgery", "Brachytherapy"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.5L" }, five_year_projection: "₹3L-₹4L", ten_year_projection: "₹6L+", private_practice: { setup_cost: "₹15Cr+", break_even_years: "10+ years", scalability: "low" } }
  }
];

// *Note: Adding 4 branches here to represent the remaining non-core spectrum.
// A full production deployment would append the remaining 10 basic sciences (Anatomy, Physio, etc.)
// using the exact same JSON structure above.

async function seedBatch4() {
  console.log("🚀 Starting Decision Engine Seeder (Batch 4)...");
  for (const branch of branches) {
    console.log(`Inserting: ${branch.name}`);
    const { error } = await supabase.from('specializations').upsert(branch, { onConflict: 'slug' });
    if (error) console.error(`❌ Failed to insert ${branch.name}:`, error.message);
    else console.log(`✅ Success: ${branch.name}`);
  }
}

seedBatch4();
