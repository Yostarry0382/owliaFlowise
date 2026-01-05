const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const archiver = require('archiver');

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');
const zipFile = path.join(rootDir, 'standalone.zip');

// Check if standalone directory exists
if (!fs.existsSync(standaloneDir)) {
  console.error('Error: .next/standalone directory not found.');
  console.error('Please run "npm run build:standalone" first.');
  process.exit(1);
}

// Check if static directory exists
if (!fs.existsSync(staticDir)) {
  console.error('Error: .next/static directory not found.');
  console.error('Please run "npm run build:standalone" first.');
  process.exit(1);
}

console.log('Packing standalone build to zip...\n');

// Remove existing zip file if exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
  console.log('Removed existing standalone.zip');
}

// Create zip archive
const output = createWriteStream(zipFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ Created standalone.zip (${sizeMB} MB)`);
  console.log('\nTo deploy:');
  console.log('  1. Copy standalone.zip to target machine');
  console.log('  2. Run: npm run start:deploy');
  console.log('     or: node scripts/deploy-standalone.js');
});

archive.on('error', (err) => {
  console.error('Error creating zip archive:', err.message);
  process.exit(1);
});

archive.pipe(output);

// Add standalone directory to archive
console.log('Adding standalone directory...');
archive.directory(standaloneDir, 'standalone');

// Add .next/static to standalone/.next/static (required by Next.js)
console.log('Adding .next/static directory...');
archive.directory(staticDir, 'standalone/.next/static');

// Add public directory if exists
if (fs.existsSync(publicDir)) {
  console.log('Adding public directory...');
  archive.directory(publicDir, 'standalone/public');
}

archive.finalize();
