const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const url = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const key = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Active Supabase URL:', url);
const supabase = createClient(url, key);

async function checkTables() {
  const tables = ['specializations', 'colleges', 'leads', 'mbbs_colleges', 'contacts', 'live_alerts'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR - ${error.message} (${error.code})`);
    } else {
      console.log(`Table '${table}': OK (found ${data.length} records in limit 1)`);
    }
  }
}

checkTables();
