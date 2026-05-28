const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local for credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val.trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function run() {
  const csvPath = path.join(__dirname, '..', 'pg_colleges.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV from ${csvPath}...`);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  if (lines.length < 2) {
    console.error("❌ CSV is empty or only contains header");
    process.exit(1);
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log("CSV Columns:", header);

  const colIdx = {};
  header.forEach((h, index) => {
    colIdx[h.trim()] = index;
  });

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(lines[i]);
    if (cells.length < header.length) {
      console.warn(`⚠️ Warning: skipping line ${i+1} due to insufficient columns (${cells.length} < ${header.length})`);
      continue;
    }

    const record = {};
    header.forEach(h => {
      const idx = colIdx[h];
      let val = cells[idx] ? cells[idx].trim() : '';
      record[h] = val;
    });

    // Formatting & validation
    const formatted = {
      id: record.id || undefined,
      college_name: record.college_name,
      city: record.city,
      state: record.state,
      college_type: record.college_type,
      ownership: record.ownership || null,
      year_established: record.year_established ? parseInt(record.year_established, 10) : null,
      total_pg_seats: record.total_pg_seats ? parseInt(record.total_pg_seats, 10) : 0,
      key_specialties: [],
      short_description: record.short_description || null,
      is_active: record.is_active === 'true',
      image_url: record.image_url || null
    };

    // Parse specialties array
    if (record.key_specialties) {
      try {
        formatted.key_specialties = JSON.parse(record.key_specialties);
      } catch (e) {
        // Fallback for comma separated values if not JSON
        formatted.key_specialties = record.key_specialties.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    records.push(formatted);
  }

  console.log(`Parsed ${records.length} records. Uploading in batches to Supabase pg_colleges...`);

  // Batch insert/upsert in sizes of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    const { data, error } = await supabase
      .from('pg_colleges')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error uploading batch starting at index ${i}:`, error.message);
      process.exit(1);
    }
  }

  console.log("✅ Seeding completed successfully!");
}

run().catch(console.error);
