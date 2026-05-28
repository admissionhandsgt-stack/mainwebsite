/**
 * Convert Supabase Storage Images to AVIF
 * =========================================
 * 
 * Downloads all images from 'media-assets' bucket, converts to AVIF using sharp,
 * uploads back as .avif files, then updates all DB references.
 * 
 * Usage: node scripts/convert_storage_avif.cjs
 * 
 * Steps:
 *  1. List all files in media-assets bucket
 *  2. Download each image
 *  3. Convert to AVIF using sharp (quality 65 for great compression)
 *  4. Upload .avif version to the same bucket
 *  5. Update media_assets table image_url & mobile_image_url
 *  6. Update pg_branches table icon_url
 *  7. Report size savings
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
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

const SUPABASE_URL = 'https://nlxbqseaumhjenlnigxd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = 'media-assets';

// Track stats
let totalOriginalBytes = 0;
let totalAvifBytes = 0;
let convertedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Map: original storage path -> new avif storage path + public URL
const pathMap = new Map();

/**
 * Recursively list all files in a bucket prefix
 */
async function listAllFiles(prefix = '') {
  const files = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 500 });
  if (error) { console.error('  List error:', error.message); return files; }
  
  for (const f of data || []) {
    if (f.id) {
      // It's a file
      files.push({
        name: f.name,
        path: prefix + f.name,
        size: f.metadata?.size || 0,
        mimetype: f.metadata?.mimetype || ''
      });
    } else {
      // It's a folder
      const subFiles = await listAllFiles(prefix + f.name + '/');
      files.push(...subFiles);
    }
  }
  return files;
}

/**
 * Download a file from storage
 */
async function downloadFile(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error('Download failed: ' + error.message);
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Convert image buffer to AVIF
 */
async function convertToAvif(buffer, originalPath) {
  try {
    const avifBuffer = await sharp(buffer)
      .avif({ quality: 65, effort: 4 })
      .toBuffer();
    return avifBuffer;
  } catch (err) {
    console.error('  ⚠️  Sharp conversion failed for', originalPath, ':', err.message);
    return null;
  }
}

/**
 * Upload AVIF file to storage
 */
async function uploadAvif(avifBuffer, storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(storagePath, avifBuffer, {
    contentType: 'image/avif',
    upsert: true
  });
  if (error) throw new Error('Upload failed: ' + error.message);
  
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicUrl;
}

/**
 * Main conversion pipeline for a single file
 */
async function convertFile(file) {
  const ext = path.extname(file.path).toLowerCase();
  
  // Skip if already AVIF
  if (ext === '.avif') {
    console.log('  ⏩ Already AVIF:', file.path);
    skippedCount++;
    return;
  }
  
  // Only convert image types
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    console.log('  ⏩ Not an image:', file.path);
    skippedCount++;
    return;
  }
  
  try {
    // 1. Download
    process.stdout.write('  ⬇️  Downloading: ' + file.path + '... ');
    const originalBuffer = await downloadFile(file.path);
    const originalSize = originalBuffer.length;
    totalOriginalBytes += originalSize;
    console.log((originalSize / 1024).toFixed(1) + 'KB');
    
    // 2. Convert to AVIF
    process.stdout.write('  🔄 Converting to AVIF... ');
    const avifBuffer = await convertToAvif(originalBuffer, file.path);
    if (!avifBuffer) {
      errorCount++;
      return;
    }
    const avifSize = avifBuffer.length;
    totalAvifBytes += avifSize;
    const savings = ((1 - avifSize / originalSize) * 100).toFixed(1);
    console.log((avifSize / 1024).toFixed(1) + 'KB (' + savings + '% smaller)');
    
    // 3. Upload AVIF version
    const avifPath = file.path.replace(/\.[^.]+$/, '.avif');
    process.stdout.write('  ⬆️  Uploading: ' + avifPath + '... ');
    const publicUrl = await uploadAvif(avifBuffer, avifPath);
    console.log('✅');
    
    // Track the mapping
    const originalPublicUrl = supabase.storage.from(BUCKET).getPublicUrl(file.path).data.publicUrl;
    pathMap.set(originalPublicUrl, publicUrl);
    
    convertedCount++;
    console.log('');
  } catch (err) {
    console.error('  ❌ Error:', err.message);
    errorCount++;
  }
}

/**
 * Update media_assets table
 */
async function updateMediaAssets() {
  console.log('\n📝 Updating media_assets table...\n');
  
  const { data: assets, error } = await supabase.from('media_assets').select('*');
  if (error) { console.error('  Error fetching media_assets:', error.message); return; }
  
  let updated = 0;
  for (const asset of assets || []) {
    const updates = {};
    
    if (asset.image_url && pathMap.has(asset.image_url)) {
      updates.image_url = pathMap.get(asset.image_url);
    }
    if (asset.mobile_image_url && pathMap.has(asset.mobile_image_url)) {
      updates.mobile_image_url = pathMap.get(asset.mobile_image_url);
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('media_assets')
        .update(updates)
        .eq('id', asset.id);
      
      if (updateError) {
        console.error('  ❌ Failed to update', asset.media_key, ':', updateError.message);
      } else {
        console.log('  ✅ Updated:', asset.media_key);
        updated++;
      }
    }
  }
  console.log('  📊 Updated ' + updated + '/' + (assets || []).length + ' media_assets records');
}

/**
 * Update pg_branches table
 */
async function updatePgBranches() {
  console.log('\n📝 Updating pg_branches table...\n');
  
  const { data: branches, error } = await supabase.from('pg_branches').select('*');
  if (error) { console.error('  Error fetching pg_branches:', error.message); return; }
  
  let updated = 0;
  for (const branch of branches || []) {
    if (branch.icon_url && pathMap.has(branch.icon_url)) {
      const { error: updateError } = await supabase
        .from('pg_branches')
        .update({ icon_url: pathMap.get(branch.icon_url) })
        .eq('id', branch.id);
      
      if (updateError) {
        console.error('  ❌ Failed to update', branch.branch_name, ':', updateError.message);
      } else {
        console.log('  ✅ Updated:', branch.branch_name);
        updated++;
      }
    }
  }
  console.log('  📊 Updated ' + updated + '/' + (branches || []).length + ' pg_branches records');
}

async function main() {
  console.log('🚀 Supabase Storage → AVIF Conversion');
  console.log('======================================\n');
  
  // 1. List all files
  console.log('📂 Listing all files in "' + BUCKET + '" bucket...\n');
  const files = await listAllFiles();
  console.log('  Found ' + files.length + ' files\n');
  
  // 2. Convert each file
  console.log('🔄 Converting images to AVIF...\n');
  for (const file of files) {
    await convertFile(file);
  }
  
  // 3. Update database references
  if (pathMap.size > 0) {
    await updateMediaAssets();
    await updatePgBranches();
  }
  
  // 4. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CONVERSION SUMMARY');
  console.log('='.repeat(50));
  console.log('  Files converted:  ' + convertedCount);
  console.log('  Files skipped:    ' + skippedCount);
  console.log('  Errors:           ' + errorCount);
  console.log('  Original total:   ' + (totalOriginalBytes / 1024 / 1024).toFixed(2) + ' MB');
  console.log('  AVIF total:       ' + (totalAvifBytes / 1024 / 1024).toFixed(2) + ' MB');
  if (totalOriginalBytes > 0) {
    const pctSaved = ((1 - totalAvifBytes / totalOriginalBytes) * 100).toFixed(1);
    console.log('  Total savings:    ' + pctSaved + '%');
    console.log('  Saved:            ' + ((totalOriginalBytes - totalAvifBytes) / 1024 / 1024).toFixed(2) + ' MB');
  }
  console.log('='.repeat(50));
  console.log('\n✅ Done! All database URLs have been updated to AVIF versions.');
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
