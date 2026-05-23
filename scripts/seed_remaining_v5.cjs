const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHlud3h3aXBsbXVhaml6d2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mzk5OTYsImV4cCI6MjA2MDExNTk5Nn0.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const branches = [
  {
    name: "MD Forensic Medicine", slug: "md-forensic-medicine", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1582719471327-593255047535?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 5, burnout_score: 4, lifestyle_score: 9, earning_score: 5, private_practice_score: 1, future_scope_score: 6,
    saturation_level: "low", seat_availability: "high", demand_level: "low",
    neet_pg_rank_min: 20000, neet_pg_rank_max: 40000,
    verdict: "A purely academic and medico-legal branch. Zero patient interaction, high job security in govt.",
    consultant_note: "Choose this if you want to work with the legal system. You'll spend your life in mortuaries and courtrooms. Great lifestyle but no private clinic potential.",
    pros: ["Zero patient complaints", "Fixed govt hours", "Court expert status"],
    cons: ["Psychologically heavy work", "Limited private scope", "Requires frequent court visits"],
    who_should_choose: ["Legal-minded doctors", "Those wanting govt tenure"],
    who_should_avoid: ["Action seekers", "Patient-lovers"],
    myths_vs_reality: [{ myth: "It's like CSI", reality: "It's a lot of paperwork and bureaucratic govt protocols." }],
    career_path: ["MD", "Govt Medical Officer / Professor"],
    fellowships: ["Toxicology", "Medical Law"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹90k", private: "₹70k" }, five_year_projection: "₹1.5L", ten_year_projection: "₹3L+", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Microbiology", slug: "md-microbiology", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 6, burnout_score: 3, lifestyle_score: 9, earning_score: 5, private_practice_score: 4, future_scope_score: 7,
    saturation_level: "medium", seat_availability: "high", demand_level: "medium",
    neet_pg_rank_min: 15000, neet_pg_rank_max: 35000,
    verdict: "Essential diagnostic branch. Key in infection control and hospital management.",
    consultant_note: "Increasingly important due to antibiotic resistance. Good for academic careers or infection control roles in corporate hospitals.",
    pros: ["Academic lifestyle", "Hospital administration scope", "Growing demand post-COVID"],
    cons: ["Low patient visibility", "Repetitive lab work"],
    who_should_choose: ["Researchers", "Infection control enthusiasts"],
    who_should_avoid: ["Action seekers", "High-income chasers"],
    myths_vs_reality: [{ myth: "Just seeing slides", reality: "Managing entire hospital antibiotic policies." }],
    career_path: ["MD", "Infection Control Officer / Professor"],
    fellowships: ["Virology", "Immunology"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹1L" }, five_year_projection: "₹1.5L", ten_year_projection: "₹4L+", private_practice: { setup_cost: "Moderate", break_even_years: "3 years", scalability: "low" } }
  },
  {
    name: "MD Pharmacology", slug: "md-pharmacology", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 7, burnout_score: 2, lifestyle_score: 10, earning_score: 6, private_practice_score: 2, future_scope_score: 9,
    saturation_level: "low", seat_availability: "high", demand_level: "high",
    neet_pg_rank_min: 10000, neet_pg_rank_max: 30000,
    verdict: "The bridge to the Pharmaceutical industry. High lifestyle and corporate salary potential.",
    consultant_note: "Do not take this if you want to see patients. Take this if you want to work for Pfizer, Novartis, or run Clinical Trials. Corporate salaries in Pharma can exceed clinical salaries after 10 years.",
    pros: ["Highest lifestyle score", "Corporate growth", "Industry demand"],
    cons: ["Zero clinical practice", "Corporate hierarchy"],
    who_should_choose: ["Corporate-minded doctors", "Researchers"],
    who_should_avoid: ["Patient-lovers"],
    myths_vs_reality: [{ myth: "Just learning drug names", reality: "Managing million-dollar clinical trials and drug safety." }],
    career_path: ["MD", "Medical Advisor in Pharma"],
    fellowships: ["Clinical Research", "Pharmacovigilance"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹1.5L (Pharma)" }, five_year_projection: "₹3L", ten_year_projection: "₹8L+ (Pharma Executive)", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Anatomy", slug: "md-anatomy", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1530213786676-41ad9f7736f6?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 8, burnout_score: 1, lifestyle_score: 10, earning_score: 4, private_practice_score: 1, future_scope_score: 5,
    saturation_level: "high", seat_availability: "high", demand_level: "low",
    neet_pg_rank_min: 30000, neet_pg_rank_max: 60000,
    verdict: "Purely academic. Best for those wanting teaching roles and zero stress.",
    consultant_note: "The foundation of surgery, yet non-clinical. Only choose this if you love teaching 1st-year students and want a stress-free life in a medical college.",
    pros: ["Zero stress", "Teaching satisfaction", "Fixed hours"],
    cons: ["Lowest income potential", "Limited to med colleges"],
    who_should_choose: ["Teachers", "Artists"],
    who_should_avoid: ["Ambitious earners"],
    myths_vs_reality: [{ myth: "Only for failed candidates", reality: "Requires incredible memory and spatial intelligence." }],
    career_path: ["MD", "Professor"],
    fellowships: ["Genetics", "Anthropology"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹60k" }, five_year_projection: "₹1.2L", ten_year_projection: "₹2.5L", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Physiology", slug: "md-physiology", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1532187875605-1398863484f9?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 8, burnout_score: 1, lifestyle_score: 10, earning_score: 4, private_practice_score: 1, future_scope_score: 6,
    saturation_level: "high", seat_availability: "high", demand_level: "low",
    neet_pg_rank_min: 30000, neet_pg_rank_max: 60000,
    verdict: "Understand how the body works. Purely academic/teaching focused.",
    consultant_note: "Similar to Anatomy, it's for those seeking a medical college career. Emerging scope in Sleep Labs and Sports Physiology.",
    pros: ["Stress-free", "Foundation of medicine"],
    cons: ["Low salary", "Repetitive teaching"],
    who_should_choose: ["Academics"],
    who_should_avoid: ["Action seekers"],
    myths_vs_reality: [{ myth: "Easy subject", reality: "Extremely deep biophysics and biochemistry involved." }],
    career_path: ["MD", "Professor"],
    fellowships: ["Neurophysiology", "Sports Physio"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹60k" }, five_year_projection: "₹1.2L", ten_year_projection: "₹2.5L", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Biochemistry", slug: "md-biochemistry", category: "non_clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1532187875605-1398863484f9?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1579154235823-608179b5d1bb?q=80&w=1600",
    difficulty_score: 9, burnout_score: 2, lifestyle_score: 9, earning_score: 6, private_practice_score: 5, future_scope_score: 8,
    saturation_level: "medium", seat_availability: "high", demand_level: "medium",
    neet_pg_rank_min: 25000, neet_pg_rank_max: 50000,
    verdict: "High corporate lab demand. Perfect for those who love machines and chemistry.",
    consultant_note: "More lucrative than Anatomy/Physio because you can run high-end diagnostic labs and supervise metabolic testing in corporate hospitals.",
    pros: ["Corporate hospital demand", "High tech lab work"],
    cons: ["Purely lab based", "No patient interaction"],
    who_should_choose: ["Tech lovers", "Chemistry geeks"],
    who_should_avoid: ["Patient-lovers"],
    myths_vs_reality: [{ myth: "Just blood tests", reality: "Managing DNA testing and molecular diagnostics." }],
    career_path: ["MD", "Lab Director"],
    fellowships: ["Molecular Biology", "Genetics"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹80k", private: "₹1.2L" }, five_year_projection: "₹2L", ten_year_projection: "₹5L+", private_practice: { setup_cost: "High", break_even_years: "4 years", scalability: "medium" } }
  },
  {
    name: "MD Transfusion Medicine", slug: "md-transfusion-medicine", category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1536856780183-09559c3a3721?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1600",
    difficulty_score: 5, burnout_score: 3, lifestyle_score: 9, earning_score: 7, private_practice_score: 1, future_scope_score: 8,
    saturation_level: "low", seat_availability: "low", demand_level: "high",
    neet_pg_rank_min: 12000, neet_pg_rank_max: 25000,
    verdict: "Highly specialized. Managing blood banks and advanced cell therapies.",
    consultant_note: "The 'Blood Specialist'. Every major hospital needs a Transfusion MD to run their Blood Bank. Zero competition, stable corporate life.",
    pros: ["Unique niche", "Corporate stability", "Zero emergencies"],
    cons: ["Locked to large hospitals", "No private clinic"],
    who_should_choose: ["Niche hunters"],
    who_should_avoid: ["Independent practice seekers"],
    myths_vs_reality: [{ myth: "Just blood donation", reality: "Managing complex transplant immunology and stem cell storage." }],
    career_path: ["MD", "Blood Bank Director"],
    fellowships: ["Immunology", "Stem Cell"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.5L" }, five_year_projection: "₹2.5L", ten_year_projection: "₹5L+", private_practice: { setup_cost: "N/A", break_even_years: "N/A", scalability: "low" } }
  },
  {
    name: "MD Palliative Medicine", slug: "md-palliative-medicine", category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1600",
    difficulty_score: 6, burnout_score: 8, lifestyle_score: 7, earning_score: 6, private_practice_score: 4, future_scope_score: 9,
    saturation_level: "low", seat_availability: "low", demand_level: "high",
    neet_pg_rank_min: 15000, neet_pg_rank_max: 28000,
    verdict: "Emotional and compassionate care for terminal patients. Growing corporate demand.",
    consultant_note: "Requires extreme emotional maturity. You help people die with dignity. High demand in metros for home-care and hospice setups.",
    pros: ["Meaningful work", "Growing corporate demand", "Niche"],
    cons: ["Emotional toll", "Dealing with death daily"],
    who_should_choose: ["Highly empathetic listeners"],
    who_should_avoid: ["Action seekers", "Emotional sponges"],
    myths_vs_reality: [{ myth: "Giving up on patients", reality: "Active pain management and quality of life improvement." }],
    career_path: ["MD", "Palliative Consultant"],
    fellowships: ["Pain Medicine", "Geriatrics"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.2L" }, five_year_projection: "₹2L", ten_year_projection: "₹5L+", private_practice: { setup_cost: "Low", break_even_years: "2 years", scalability: "medium" } }
  },
  {
    name: "MD Geriatric Medicine", slug: "md-geriatric-medicine", category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1600",
    difficulty_score: 7, burnout_score: 6, lifestyle_score: 8, earning_score: 8, private_practice_score: 9, future_scope_score: 10,
    saturation_level: "low", seat_availability: "low", demand_level: "high",
    neet_pg_rank_min: 8000, neet_pg_rank_max: 18000,
    verdict: "Treating the elderly. Massive future growth as India's population ages.",
    consultant_note: "The 'Medicine of the Future'. High demand for private home-visits and geriatric OPDs in cities. Very safe and lucrative path.",
    pros: ["Evergreen demand", "Excellent lifestyle", "High patient loyalty"],
    cons: ["Slow progress in chronic cases", "Patient loss is inevitable"],
    who_should_choose: ["Patient doctors", "Medicine lovers"],
    who_should_avoid: ["Adrenaline seekers"],
    myths_vs_reality: [{ myth: "Just General Medicine", reality: "Complex poly-pharmacy and social medicine management." }],
    career_path: ["MD", "Senior Consultant"],
    fellowships: ["Dementia Care", "Rehabilitation"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.5L" }, five_year_projection: "₹3L", ten_year_projection: "₹8L+", private_practice: { setup_cost: "Low", break_even_years: "1 year", scalability: "high" } }
  },
  {
    name: "MD Physical Medicine & Rehabilitation (PMR)", slug: "md-pmr", category: "clinical",
    thumbnail_url: "https://images.unsplash.com/photo-1530213786676-41ad9f7736f6?q=80&w=800",
    banner_url: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=1600",
    difficulty_score: 4, burnout_score: 3, lifestyle_score: 10, earning_score: 7, private_practice_score: 9, future_scope_score: 9,
    saturation_level: "low", seat_availability: "low", demand_level: "high",
    neet_pg_rank_min: 10000, neet_pg_rank_max: 20000,
    verdict: "Restoring function. Best work-life balance for a clinical branch.",
    consultant_note: "The 'lifestyle king' of clinical medicine. You manage sports injuries, strokes, and spinal rehab. Zero emergencies, high demand in sports and neuro-rehab centers.",
    pros: ["Best clinical lifestyle", "High patient gratitude", "Niche practice"],
    cons: ["Requires long-term patient follow-up", "Low surgical scope"],
    who_should_choose: ["Lifestyle seekers", "Sports medicine enthusiasts"],
    who_should_avoid: ["Action hunters"],
    myths_vs_reality: [{ myth: "It's just physiotherapy", reality: "Physiotherapists follow the PMR doctor's treatment plan." }],
    career_path: ["MD", "Rehab Consultant"],
    fellowships: ["Sports Med", "Spine Rehab"],
    financials: { residency_stipend_range: "₹50k-₹1L", first_year_salary: { govt: "₹1L", private: "₹1.2L" }, five_year_projection: "₹2.5L", ten_year_projection: "₹6L+", private_practice: { setup_cost: "Moderate", break_even_years: "2 years", scalability: "high" } }
  }
];

async function seedRemaining() {
  console.log("🚀 Starting Decision Engine Seeder (REMAINING 10)...");
  for (const branch of branches) {
    console.log(`Upserting: ${branch.name}`);
    const { error } = await supabase.from('specializations').upsert(branch, { onConflict: 'slug' });
    if (error) console.error(`❌ Error in ${branch.name}:`, error.message);
    else console.log(`✅ Success: ${branch.name}`);
  }
}

seedRemaining();
