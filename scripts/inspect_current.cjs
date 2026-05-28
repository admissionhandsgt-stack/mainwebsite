const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nlxbqseaumhjenlnigxd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seGJxc2VhdW1oamVubG5pZ3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjQ3MTAsImV4cCI6MjA5NDI0MDcxMH0.GG6dnO5WeeQsEfGCnU06fuhAZKb8qvkeqEb083ZqvwM";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log("Checking media_assets...");
  const { data: mediaData, error: mediaError } = await supabase.from('media_assets').select('*').limit(1);
  if (mediaError) {
    console.log("❌ media_assets check failed:", mediaError.message);
  } else {
    console.log("✅ media_assets exists! Row count:", mediaData.length);
  }

  console.log("Checking pg_branches...");
  const { data: pgData, error: pgError } = await supabase.from('pg_branches').select('*').limit(1);
  if (pgError) {
    console.log("❌ pg_branches check failed:", pgError.message);
  } else {
    console.log("✅ pg_branches exists! Row count:", pgData.length);
  }
}

check();
