const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHlud3h3aXBsbXVhaml6d2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mzk5OTYsImV4cCI6MjA2MDExNTk5Nn0.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testNewSlugs() {
  const failedSlugs = ['dermatology', 'obgyn', 'anesthesiology', 'ent', 'pmr'];
  
  for (const slug of failedSlugs) {
    const { data } = await supabase.from('specializations').select('*').eq('slug', slug).single();
    if (data) {
      const newData = { ...data, slug: `${slug}-fix` };
      delete newData.id;
      delete newData.created_at;
      await supabase.from('specializations').upsert(newData);
      console.log(`Created: ${slug}-fix`);
    }
  }
}

testNewSlugs();
