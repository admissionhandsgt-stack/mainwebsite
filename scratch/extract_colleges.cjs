const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../scripts/pg_colleges_data.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

let extracted = [];
let targetStates = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Andhra Pradesh', 'Gujarat'];

rawData.forEach(stateGroup => {
  if (targetStates.includes(stateGroup.state)) {
    let count = 0;
    stateGroup.colleges.forEach(college => {
      const isDYPatil = college.college_name.includes('DY Patil');
      // Limit to 2 general colleges per state, plus any DY Patil colleges
      if (count < 2 || isDYPatil) {
        extracted.push({
          id: `fallback-${stateGroup.state.toLowerCase().replace(/\s+/g, '-')}-${college.college_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          college_name: college.college_name,
          city: college.city,
          state: stateGroup.state,
          college_type: college.college_type,
          ownership: college.ownership || null,
          year_established: college.year_established || null,
          total_pg_seats: college.total_pg_seats,
          key_specialties: college.key_specialties,
          short_description: college.short_description || null,
          image_url: isDYPatil ? 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800' : null
        });
        if (!isDYPatil) count++;
      }
    });
  }
});

console.log(JSON.stringify(extracted, null, 2));
