import { getMediaAsset } from '../src/lib/mediaService';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nlxbqseaumhjenlnigxd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seGJxc2VhdW1oamVubG5pZ3hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY2NDcxMCwiZXhwIjoyMDk0MjQwNzEwfQ.s9GjFXqSSZwq8cHs_kaHiShOrHux29k-U4LHrgN9VtQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Setting inactive...');
  await supabase.from('media_assets').update({ is_active: false }).eq('media_key', 'pg_hero_doctors');
  
  console.log('Calling getMediaAsset...');
  const asset = await getMediaAsset('pg_hero_doctors');
  console.log('Result of getMediaAsset:', asset);
  
  console.log('Setting active back...');
  await supabase.from('media_assets').update({ is_active: true }).eq('media_key', 'pg_hero_doctors');
}

run().catch(console.error);
