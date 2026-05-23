// Script to generate pg_colleges seed SQL from college data
// Run: node scripts/generate_pg_seed.js > pg_colleges_seed.sql
const fs = require('fs');
const path = require('path');

const collegeData = require('./pg_colleges_data.json');

function escapeSQL(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

function arrayToSQL(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  const items = arr.map(s => '"' + s.replace(/"/g, '\\"') + '"').join(',');
  return "'{" + items + "}'";
}

const medicalImages = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce2?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519311371416-0394335ce46a?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551601651-2a8555f1a136?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop"
];

let sql = '-- PG Colleges Seed Data (auto-generated)\n';
sql += '-- Run this AFTER pg_colleges_schema.sql\n\n';
sql += 'INSERT INTO public.pg_colleges (college_name, city, state, college_type, ownership, year_established, total_pg_seats, key_specialties, short_description, image_url) VALUES\n';

const rows = [];
let imgIdx = 0;
for (const stateObj of collegeData) {
  for (const c of stateObj.colleges) {
    const imgUrl = medicalImages[imgIdx % medicalImages.length];
    imgIdx++;
    rows.push(
      `(${escapeSQL(c.college_name)}, ${escapeSQL(c.city)}, ${escapeSQL(stateObj.state)}, ${escapeSQL(c.college_type)}, ${escapeSQL(c.ownership)}, ${c.year_established || 'NULL'}, ${c.total_pg_seats || 0}, ${arrayToSQL(c.key_specialties)}, ${escapeSQL(c.short_description)}, ${escapeSQL(imgUrl)})`
    );
  }
}

sql += rows.join(',\n');
sql += '\nON CONFLICT (college_name, city) DO UPDATE SET\n';
sql += '  state = EXCLUDED.state,\n';
sql += '  college_type = EXCLUDED.college_type,\n';
sql += '  ownership = EXCLUDED.ownership,\n';
sql += '  year_established = EXCLUDED.year_established,\n';
sql += '  total_pg_seats = EXCLUDED.total_pg_seats,\n';
sql += '  key_specialties = EXCLUDED.key_specialties,\n';
sql += '  short_description = EXCLUDED.short_description,\n';
sql += '  image_url = EXCLUDED.image_url,\n';
sql += '  updated_at = now();\n';

const outPath = path.join(__dirname, '..', 'pg_colleges_seed.sql');
fs.writeFileSync(outPath, sql, 'utf-8');
console.log(`Generated ${rows.length} college INSERT rows -> ${outPath}`);
