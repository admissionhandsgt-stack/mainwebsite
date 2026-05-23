const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHlud3h3aXBsbXVhaml6d2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mzk5OTYsImV4cCI6MjA2MDExNTk5Nn0.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkData() {
  const slugs = ['md-general-medicine', 'md-radiology', 'ms-general-surgery', 'md-dermatology'];
  
  for (const slug of slugs) {
    const { data, error } = await supabase
      .from('specializations')
      .select('name, verdict')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching ${slug}:`, error.message);
    } else if (!data) {
      console.log(`❌ ${slug} NOT FOUND in database.`);
    } else {
      console.log(`✅ ${slug} FOUND: ${data.name} - ${data.verdict}`);
    }
  }
}

checkData();
