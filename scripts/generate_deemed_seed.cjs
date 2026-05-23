const fs = require('fs');
const path = require('path');

// Mocking the data since I can't easily import the .ts file without build steps
// I will extract the data from the viewed file content previously
const deemedUniversities = [
  {
    "state": "Andhra Pradesh",
    "college_name": "GITAM Institute of Medical Sciences and Research, Visakhapatnam",
    "deemed_university_name": "Gandhi Institute of Technology and Management (GITAM University) – Deemed",
    "city": "Visakhapatnam",
    "established_year": 2015,
    "offers_mbbs": true,
    "image_url": "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&q=80&w=800",
    "description": "Established in 2015 under GITAM (Deemed to be University), this college provides MBBS training with modern labs and a teaching hospital. It is known for its focus on community health and research in coastal Andhra."
  },
  {
    "state": "Delhi",
    "college_name": "Hamdard Institute of Medical Sciences & Research, New Delhi",
    "deemed_university_name": "University of Jamia Hamdard (Hamdard University) – Deemed",
    "city": "New Delhi",
    "established_year": 2012,
    "offers_mbbs": true,
    "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800",
    "description": "Founded in 2012 as part of Jamia Hamdard (Deemed to be University), the institute offers MBBS programmes with a range of programmes."
  },
  {
    "state": "Gujarat",
    "college_name": "SBKS Medical Institute & Research Centre, Vadodara",
    "deemed_university_name": "Sumandeep Vidyapeeth University (Deemed)",
    "city": "Vadodara",
    "established_year": 2002,
    "offers_mbbs": true,
    "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800",
    "description": "SBKS Medical Institute, established in 2002 under Sumandeep Vidyapeeth (Deemed to be University), delivers MBBS and courses."
  }
  // ... more would be added here
];

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  return val;
}

let sql = '-- Deemed Universities Restructured Seed Data\n';
sql += 'INSERT INTO public.deemed_universities (college_name, city, state, deemed_university_name, established_year, offers_mbbs, description, image_url, fees_range) VALUES\n';

const rows = deemedUniversities.map(u => 
  `(${escapeSQL(u.college_name)}, ${escapeSQL(u.city)}, ${escapeSQL(u.state)}, ${escapeSQL(u.deemed_university_name)}, ${u.established_year}, ${u.offers_mbbs}, ${escapeSQL(u.description)}, ${escapeSQL(u.image_url)}, 'Contact for Fees')`
);

sql += rows.join(',\n');
sql += '\nON CONFLICT (college_name, city) DO UPDATE SET\n';
sql += '  state = EXCLUDED.state,\n';
sql += '  deemed_university_name = EXCLUDED.deemed_university_name,\n';
sql += '  established_year = EXCLUDED.established_year,\n';
sql += '  offers_mbbs = EXCLUDED.offers_mbbs,\n';
sql += '  description = EXCLUDED.description,\n';
sql += '  image_url = EXCLUDED.image_url,\n';
sql += '  updated_at = now();\n';

fs.writeFileSync('deemed_universities_seed.sql', sql);
console.log('Generated deemed_universities_seed.sql');
