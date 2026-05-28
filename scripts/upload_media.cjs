/**
 * Upload Script: Migrate Local Images to Supabase Storage + Seed media_assets table
 * 
 * Usage: node scripts/upload_media.cjs
 * 
 * This script is IDEMPOTENT — safe to re-run.
 * Uses ON CONFLICT (media_key) DO NOTHING for media_assets.
 * Uses ON CONFLICT (branch_name) DO NOTHING for pg_branches.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

// Supabase config
const SUPABASE_URL = 'https://nlxbqseaumhjenlnigxd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Media assets to seed — maps media_key to local file path and metadata
const MEDIA_SEEDS = [
  // Hero images
  { media_key: 'homepage_hero_campus', file: 'assets/images/hero/india-medical-college-campus.png', title: 'Homepage Hero - Campus Background', section_type: 'hero', alt_text: 'Medical College Campus' },
  { media_key: 'homepage_hero_doctors', file: 'assets/images/hero/indian_doctors.png', title: 'Homepage Hero - Doctors', section_type: 'hero', alt_text: 'Medical Experts' },
  { media_key: 'pg_hero_campus', file: 'assets/images/hero/dy-patil-mumbai.png', title: 'PG Hero - DY Patil Campus', section_type: 'hero', alt_text: 'DY Patil Mumbai Campus Background' },
  { media_key: 'pg_hero_doctors', file: 'assets/images/hero/indian_doctors.png', title: 'PG Hero - Doctors', section_type: 'hero', alt_text: 'Professional doctors for NEET PG' },
  { media_key: 'mbbs_hero_campus', file: 'assets/images/hero/dy-patil-mumbai.png', title: 'MBBS Hero - Campus', section_type: 'hero', alt_text: 'MBBS Campus Background' },
  { media_key: 'about_hero', file: 'assets/images/hero/neet-counselling-students.png', title: 'About Us Hero', section_type: 'hero', alt_text: 'NEET Counselling Students' },
  { media_key: 'services_hero', file: 'assets/images/hero/medical-admission-counselling-session.png', title: 'Services Hero', section_type: 'hero', alt_text: 'Medical Admission Counselling Session' },
  { media_key: 'nri_hero', file: 'assets/images/hero/india-medical-college-campus.png', title: 'NRI Hero', section_type: 'hero', alt_text: 'Indian Medical College Campus' },
  { media_key: 'neet_hero', file: 'assets/images/hero/neet-hero.webp', title: 'NEET UG Hero', section_type: 'hero', alt_text: 'NEET Hero' },

  // Content images
  { media_key: 'neet_exam', file: 'assets/images/exam/neet-exam.webp', title: 'NEET Exam Image', section_type: 'content', alt_text: 'NEET Exam' },
  { media_key: 'neet_medical_college', file: 'assets/images/colleges/medical-college.webp', title: 'Medical College', section_type: 'content', alt_text: 'Medical College' },
  { media_key: 'mbbs_doctors_stats', file: 'assets/images/misc/indian-doctors-stats.png', title: 'MBBS Doctors Stats', section_type: 'content', alt_text: 'Indian Doctors Statistics' },
  { media_key: 'mbbs_doctors_image', file: 'assets/images/hero/indian_doctors.png', title: 'MBBS Doctors Image', section_type: 'content', alt_text: 'Indian Doctors' },

  // College images
  { media_key: 'college_aiims', file: 'assets/images/colleges/aiims-delhi.png', title: 'AIIMS Delhi', section_type: 'college', alt_text: 'AIIMS Delhi Campus' },
  { media_key: 'college_campus_1', file: 'assets/images/colleges/medical-campus-1.png', title: 'Medical Campus 1', section_type: 'college', alt_text: 'Medical Campus' },
  { media_key: 'college_campus_2', file: 'assets/images/colleges/medical-campus-2.png', title: 'Medical Campus 2', section_type: 'college', alt_text: 'Medical Campus' },
  { media_key: 'college_campus_3', file: 'assets/images/colleges/medical-campus-3.png', title: 'Medical Campus 3', section_type: 'college', alt_text: 'Medical Campus' },
  { media_key: 'deemed_campus_1', file: 'assets/images/colleges/deemed-campus-1.png', title: 'Deemed University Campus', section_type: 'college', alt_text: 'Deemed University Campus' },
  { media_key: 'college_campus_4', file: 'assets/images/colleges/medical-campus-4.png', title: 'Medical Campus 4', section_type: 'college', alt_text: 'Medical Campus' },

  // Marketing images
  { media_key: 'services_carousel_1', file: 'assets/images/hero/medical-admission-counselling-session.png', title: 'Services Carousel 1', section_type: 'marketing', alt_text: 'Medical Admission Counselling' },
  { media_key: 'services_carousel_2', file: 'assets/images/hero/neet-counselling-students.png', title: 'Services Carousel 2', section_type: 'marketing', alt_text: 'NEET Counselling Students' },
];

// PG branches to seed
const PG_BRANCHES = [
  { branch_name: 'General Medicine', category: 'clinical', short_description: 'Diagnosis and treatment of adult diseases', display_order: 1, file: 'images/pg/general-medicine.png' },
  { branch_name: 'Pediatrics', category: 'clinical', short_description: 'Medical care for infants, children, and adolescents', display_order: 2, file: 'images/pg/pediatrics.png' },
  { branch_name: 'Radio-diagnosis', category: 'clinical', short_description: 'Medical imaging and diagnostic radiology', display_order: 3, file: 'images/pg/radiology.png' },
  { branch_name: 'Dermatology', category: 'clinical', short_description: 'Skin diseases and cosmetic dermatology', display_order: 4, file: 'images/pg/dermatology.png' },
  { branch_name: 'General Surgery', category: 'surgical', short_description: 'Surgical procedures for general conditions', display_order: 5, file: 'images/pg/general-surgery.png' },
  { branch_name: 'Orthopedics', category: 'surgical', short_description: 'Musculoskeletal system disorders', display_order: 6, file: 'images/pg/orthopedics.png' },
  { branch_name: 'Obstetrics & Gynae', category: 'surgical', short_description: 'Women\'s reproductive health and childbirth', display_order: 7, file: 'images/pg/obgyn.png' },
  { branch_name: 'Psychiatry', category: 'clinical', short_description: 'Mental health disorders diagnosis and treatment', display_order: 8, file: 'images/pg/psychiatry.png' },
  { branch_name: 'E.N.T.', category: 'surgical', short_description: 'Ear, Nose, and Throat disorders', display_order: 9, file: 'images/pg/ent.png' },
  { branch_name: 'Pathology', category: 'non_clinical', short_description: 'Laboratory medicine and disease diagnosis', display_order: 10, file: 'images/pg/pathology.png' },
  { branch_name: 'Pulmonary Medicine', category: 'clinical', short_description: 'Respiratory system diseases', display_order: 11, file: 'images/pg/pulmonology.png' },
  { branch_name: 'Anesthesiology', category: 'clinical', short_description: 'Anesthesia and perioperative care', display_order: 12, file: 'images/pg/anesthesiology.png' },
  { branch_name: 'Radiation Oncology', category: 'clinical', short_description: 'Cancer treatment using radiation therapy', display_order: 13, file: 'images/pg/radiation-oncology.png' },
  { branch_name: 'Emergency Medicine', category: 'clinical', short_description: 'Acute illness and trauma management', display_order: 14, file: 'images/pg/emergency-medicine.png' },
  { branch_name: 'Nuclear Medicine', category: 'clinical', short_description: 'Radioactive tracers for diagnosis and treatment', display_order: 15, file: 'images/pg/nuclear-medicine.png' },
  { branch_name: 'Geriatrics', category: 'clinical', short_description: 'Healthcare for elderly patients', display_order: 16, file: 'images/pg/geriatrics.png' },
  { branch_name: 'Physical Med & Rehab', category: 'clinical', short_description: 'Physical rehabilitation and medicine', display_order: 17, file: null },
  { branch_name: 'Ophthalmology', category: 'surgical', short_description: 'Eye diseases and vision care', display_order: 18, file: 'images/pg/ophthalmology.png' },
  { branch_name: 'Microbiology', category: 'non_clinical', short_description: 'Study of microorganisms and infections', display_order: 19, file: null },
  { branch_name: 'Pharmacology', category: 'non_clinical', short_description: 'Drug actions and therapeutic uses', display_order: 20, file: null },
  { branch_name: 'Community Medicine', category: 'non_clinical', short_description: 'Public health and preventive medicine', display_order: 21, file: null },
  { branch_name: 'Forensic Medicine', category: 'non_clinical', short_description: 'Medical jurisprudence and legal medicine', display_order: 22, file: null },
  { branch_name: 'Anatomy', category: 'non_clinical', short_description: 'Human body structure', display_order: 23, file: null },
  { branch_name: 'Physiology', category: 'non_clinical', short_description: 'Body functions and mechanisms', display_order: 24, file: null },
  { branch_name: 'Biochemistry', category: 'non_clinical', short_description: 'Chemical processes in organisms', display_order: 25, file: null },
  { branch_name: 'Transfusion Medicine', category: 'non_clinical', short_description: 'Blood banking and transfusion science', display_order: 26, file: null },
];

async function uploadFile(localPath, storagePath) {
  const fullPath = path.join(PUBLIC_DIR, localPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠️  File not found: ${fullPath}`);
    return null;
  }
  const fileBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(localPath).slice(1);
  const contentType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';

  const { data, error } = await supabase.storage
    .from('media-assets')
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  if (error) {
    console.error(`  ❌ Upload failed for ${storagePath}:`, error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage.from('media-assets').getPublicUrl(data.path);
  return publicUrl;
}

async function seedMediaAssets() {
  console.log('\n📸 Seeding media_assets...\n');
  let count = 0;

  for (const seed of MEDIA_SEEDS) {
    const storagePath = `${seed.section_type}/${seed.media_key}${path.extname(seed.file)}`;
    console.log(`  Uploading: ${seed.media_key} → ${storagePath}`);
    
    const publicUrl = await uploadFile(seed.file, storagePath);
    if (!publicUrl) continue;

    const { error } = await supabase
      .from('media_assets')
      .upsert({
        media_key: seed.media_key,
        title: seed.title,
        image_url: publicUrl,
        alt_text: seed.alt_text,
        section_type: seed.section_type,
        display_order: count,
        is_active: true,
      }, { onConflict: 'media_key' });

    if (error) {
      console.error(`  ❌ DB insert failed for ${seed.media_key}:`, error.message);
    } else {
      console.log(`  ✅ ${seed.media_key}`);
      count++;
    }
  }

  console.log(`\n  📊 Seeded ${count}/${MEDIA_SEEDS.length} media assets\n`);
}

async function seedPgBranches() {
  console.log('\n🌿 Seeding pg_branches...\n');
  let count = 0;

  for (const branch of PG_BRANCHES) {
    let iconUrl = null;
    if (branch.file) {
      const storagePath = `branches/${branch.branch_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}${path.extname(branch.file)}`;
      console.log(`  Uploading icon: ${branch.branch_name} → ${storagePath}`);
      iconUrl = await uploadFile(branch.file, storagePath);
    }

    const { error } = await supabase
      .from('pg_branches')
      .upsert({
        branch_name: branch.branch_name,
        short_description: branch.short_description,
        icon_url: iconUrl,
        category: branch.category,
        display_order: branch.display_order,
        is_active: true,
      }, { onConflict: 'branch_name' });

    if (error) {
      console.error(`  ❌ DB insert failed for ${branch.branch_name}:`, error.message);
    } else {
      console.log(`  ✅ ${branch.branch_name}`);
      count++;
    }
  }

  console.log(`\n  📊 Seeded ${count}/${PG_BRANCHES.length} PG branches\n`);
}

async function main() {
  console.log('🚀 AdmissionHands Media Migration Script');
  console.log('=========================================\n');
  
  await seedMediaAssets();
  await seedPgBranches();

  console.log('\n✅ Migration complete!\n');
}

main().catch(console.error);
