const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nlxbqseaumhjenlnigxd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seGJxc2VhdW1oamVubG5pZ3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjQ3MTAsImV4cCI6MjA5NDI0MDcxMH0.GG6dnO5WeeQsEfGCnU06fuhAZKb8qvkeqEb083ZqvwM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. Total count
  const { count: totalCount, error: countErr } = await supabase
    .from('ug_all_colleges')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total rows in ug_all_colleges:', totalCount, countErr ? `Error: ${countErr.message}` : '');

  // 2. Active count
  const { count: activeCount, error: activeErr } = await supabase
    .from('ug_all_colleges')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log('Active rows:', activeCount, activeErr ? `Error: ${activeErr.message}` : '');

  // 3. Active non-deemed count (same filter as page.tsx)
  const { count: nonDeemedCount, error: ndErr } = await supabase
    .from('ug_all_colleges')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('college_type', 'ilike', '%deemed%');
  
  console.log('Active non-deemed rows:', nonDeemedCount, ndErr ? `Error: ${ndErr.message}` : '');

  // 4. Breakdown by college_type (active, non-deemed)
  const { data: all, error: allErr } = await supabase
    .from('ug_all_colleges')
    .select('college_type, state')
    .eq('is_active', true)
    .not('college_type', 'ilike', '%deemed%');
  
  if (allErr) {
    console.error('Fetch error:', allErr.message);
    return;
  }

  console.log('\nActual rows returned by select():', all.length);
  
  // Count by type
  const typeCount = {};
  all.forEach(c => {
    typeCount[c.college_type] = (typeCount[c.college_type] || 0) + 1;
  });
  console.log('By college_type:', typeCount);

  // Count by state
  const stateCount = {};
  all.forEach(c => {
    stateCount[c.state] = (stateCount[c.state] || 0) + 1;
  });
  console.log('States with colleges:', Object.keys(stateCount).length);
  console.log('By state:', JSON.stringify(stateCount, null, 2));

  // 5. Check mbbs_states
  const { data: states, error: stErr } = await supabase
    .from('mbbs_states')
    .select('name, is_active')
    .eq('is_active', true);
  
  console.log('\nActive mbbs_states:', states?.length, stErr ? `Error: ${stErr.message}` : '');
  if (states) {
    const stateNames = states.map(s => s.name);
    console.log('State names:', stateNames);
    
    // Find missing states
    const collegeStates = Object.keys(stateCount);
    const missingStates = collegeStates.filter(s => !stateNames.includes(s));
    console.log('\nStates in colleges but NOT in mbbs_states:', missingStates);
    console.log('Count of colleges in missing states:', missingStates.reduce((sum, s) => sum + stateCount[s], 0));
  }
}

check();
