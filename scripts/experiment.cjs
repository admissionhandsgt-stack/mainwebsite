const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHlud3h3aXBsbXVhaml6d2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mzk5OTYsImV4cCI6MjA2MDExNTk5Nn0.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function runExperiment() {
  // 1. Fetch working data (General Medicine)
  const { data: workingData } = await supabase
    .from('specializations')
    .select('*')
    .eq('slug', 'general-medicine')
    .single();

  // 2. Clone it into 'dermatology' slug
  const experimentalData = { ...workingData, slug: 'dermatology', name: 'Dermatology (Experimental)' };
  delete experimentalData.id;
  delete experimentalData.created_at;

  const { error } = await supabase
    .from('specializations')
    .upsert(experimentalData);

  if (error) console.error("Experiment failed:", error.message);
  else console.log("Experiment ready: Dermatology now has General Medicine's data structure.");
}

runExperiment();
