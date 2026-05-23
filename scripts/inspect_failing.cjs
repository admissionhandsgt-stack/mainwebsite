const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHlud3h3aXBsbXVhaml6d2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mzk5OTYsImV4cCI6MjA2MDExNTk5Nn0.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function inspectBranch(slug) {
  const { data, error } = await supabase
    .from('specializations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error(`Error fetching ${slug}:`, error.message);
  } else {
    console.log(`--- Data for ${slug} ---`);
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectBranch('dermatology');
