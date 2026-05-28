const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '').trim();
  });
}

const supabase = createClient(
  'https://nlxbqseaumhjenlnigxd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listAll(bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 500 });
  if (error) { console.error('Error:', error.message); return; }
  
  for (const f of data || []) {
    if (f.id) {
      // It's a file
      const size = f.metadata?.size || 0;
      const mime = f.metadata?.mimetype || 'unknown';
      console.log(`  ${prefix}${f.name} | ${(size/1024).toFixed(1)}KB | ${mime}`);
    } else {
      // It's a folder
      await listAll(bucket, prefix + f.name + '/');
    }
  }
}

async function listDBImageUrls() {
  console.log('\n=== DATABASE IMAGE URLs ===\n');
  
  // media_assets
  const { data: media } = await supabase.from('media_assets').select('media_key, image_url, mobile_image_url, is_active');
  console.log('--- media_assets ---');
  for (const m of media || []) {
    console.log(`  ${m.media_key} | active=${m.is_active} | ${m.image_url}`);
    if (m.mobile_image_url) console.log(`    mobile: ${m.mobile_image_url}`);
  }

  // pg_branches
  const { data: branches } = await supabase.from('pg_branches').select('branch_name, icon_url, is_active');
  console.log('\n--- pg_branches ---');
  for (const b of branches || []) {
    console.log(`  ${b.branch_name} | active=${b.is_active} | ${b.icon_url || 'none'}`);
  }

  // colleges tables
  for (const table of ['mbbs_colleges', 'deemed_colleges', 'pg_colleges']) {
    const { data: colleges } = await supabase.from(table).select('college_name, image_url').limit(5);
    console.log(`\n--- ${table} (first 5) ---`);
    for (const c of colleges || []) {
      console.log(`  ${c.college_name} | ${c.image_url || 'none'}`);
    }
  }

  // live_alerts  
  const { data: alerts } = await supabase.from('live_alerts').select('title, image_url');
  console.log('\n--- live_alerts ---');
  for (const a of alerts || []) {
    console.log(`  ${a.title} | ${a.image_url || 'none'}`);
  }
}

async function main() {
  console.log('=== SUPABASE STORAGE: media-assets ===\n');
  await listAll('media-assets');
  
  console.log('\n=== SUPABASE STORAGE: universities ===\n');
  await listAll('universities');
  
  await listDBImageUrls();
}

main().catch(console.error);
