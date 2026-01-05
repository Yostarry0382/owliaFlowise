const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const tarFile = path.join(rootDir, 'standalone.tar.gz');

// Convert Windows path to Unix-style for tar command
function toUnixPath(winPath) {
  // Convert C:\path\to\file to /c/path/to/file for Git Bash
  return winPath.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`).replace(/\\/g, '/');
}

// Check if standalone directory exists
if (!fs.existsSync(standaloneDir)) {
  console.error('Error: .next/standalone directory not found.');
  console.error('Please run "npm run build:standalone" first.');
  process.exit(1);
}

console.log('Packing standalone build to tar.gz...\n');

// Remove existing tar file if exists
if (fs.existsSync(tarFile)) {
  fs.unlinkSync(tarFile);
  console.log('Removed existing standalone.tar.gz');
}

try {
  // Use tar command to create compressed archive
  const standaloneParent = path.join(rootDir, '.next');

  // Convert paths for tar command (works with Git Bash on Windows)
  const tarFilePath = toUnixPath(tarFile);
  const parentPath = toUnixPath(standaloneParent);

  // Change to .next directory and tar the standalone folder
  execSync(`tar -czf "${tarFilePath}" -C "${parentPath}" standalone`, {
    stdio: 'inherit',
    shell: true
  });

  const stats = fs.statSync(tarFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n✓ Created standalone.tar.gz (${sizeMB} MB)`);
  console.log('\nTo deploy:');
  console.log('  1. Copy standalone.tar.gz to target machine');
  console.log('  2. Run: npm run start:deploy');
  console.log('     or: node scripts/deploy-standalone.js');
} catch (error) {
  console.error('Error creating tar archive:', error.message);
  console.error('\nMake sure tar command is available (Git Bash, WSL, or native tar)');
  process.exit(1);
}
