const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');

// Copy static folder
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');

// Copy public folder if exists
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

// Copy .env.local if exists
const envSrc = path.join(rootDir, '.env.local');
const envDest = path.join(standaloneDir, '.env.local');

// Copy data folder (for OwlAgents storage)
const dataSrc = path.join(rootDir, 'data');
const dataDest = path.join(standaloneDir, 'data');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursiveSync(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }

  return true;
}

console.log('Copying files for standalone build...\n');

// Copy static
if (copyRecursiveSync(staticSrc, staticDest)) {
  console.log('✓ Copied .next/static -> .next/standalone/.next/static');
} else {
  console.log('✗ .next/static not found');
}

// Copy public
if (copyRecursiveSync(publicSrc, publicDest)) {
  console.log('✓ Copied public -> .next/standalone/public');
} else {
  console.log('- public folder not found (skipped)');
}

// Copy .env.local
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log('✓ Copied .env.local -> .next/standalone/.env.local');
} else {
  console.log('- .env.local not found (skipped)');
}

// Copy data folder
if (copyRecursiveSync(dataSrc, dataDest)) {
  console.log('✓ Copied data -> .next/standalone/data');
} else {
  console.log('- data folder not found (skipped)');
}

console.log('\n✓ Standalone build complete!');
console.log('\nTo run standalone:');
console.log('  cd .next/standalone');
console.log('  node server.js');
console.log('\nOr use: npm run start:standalone');
