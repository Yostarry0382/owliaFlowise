const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const rootDir = process.cwd();
const zipFile = path.join(rootDir, 'standalone.zip');
const extractDir = path.join(rootDir, 'standalone');
const serverFile = path.join(extractDir, 'server.js');

// Parse command line arguments
const args = process.argv.slice(2);
const forceExtract = args.includes('--force') || args.includes('-f');
const skipRun = args.includes('--extract-only');
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : process.env.PORT || '3000';

console.log('OwliaFabrica Standalone Deployment\n');

// Check if zip file exists
if (!fs.existsSync(zipFile)) {
  console.error('Error: standalone.zip not found.');
  console.error('Please run "npm run pack:standalone" first or copy the zip file here.');
  process.exit(1);
}

// Check if extraction is needed
const needsExtraction = forceExtract || !fs.existsSync(serverFile);

async function extractZip() {
  // Remove existing directory if force extract
  if (forceExtract && fs.existsSync(extractDir)) {
    console.log('Removing existing standalone directory...');
    fs.rmSync(extractDir, { recursive: true, force: true });
  }

  console.log('Extracting standalone.zip...');

  await fs.createReadStream(zipFile)
    .pipe(unzipper.Extract({ path: rootDir }))
    .promise();

  console.log('✓ Extraction complete\n');
}

async function main() {
  if (needsExtraction) {
    try {
      await extractZip();
    } catch (error) {
      console.error('Error extracting zip archive:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Using existing standalone directory (use --force to re-extract)\n');
  }

  // Verify server.js exists
  if (!fs.existsSync(serverFile)) {
    console.error('Error: server.js not found in standalone directory.');
    console.error('The zip file may be corrupted. Please rebuild with "npm run pack:standalone"');
    process.exit(1);
  }

  if (skipRun) {
    console.log('Extraction complete. Skipping server start (--extract-only).');
    console.log(`\nTo start manually: node standalone/server.js`);
    process.exit(0);
  }

  // Copy .env.local if exists and not already in standalone
  const envSrc = path.join(rootDir, '.env.local');
  const envDest = path.join(extractDir, '.env.local');
  if (fs.existsSync(envSrc) && !fs.existsSync(envDest)) {
    fs.copyFileSync(envSrc, envDest);
    console.log('✓ Copied .env.local to standalone directory');
  }

  // Start the server
  console.log(`Starting server on port ${port}...`);
  console.log('Press Ctrl+C to stop\n');

  // Set environment variables and spawn server
  const env = { ...process.env, PORT: port };

  const server = spawn('node', ['server.js'], {
    cwd: extractDir,
    env: env,
    stdio: 'inherit'
  });

  server.on('error', (error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`\nServer exited with code ${code}`);
    process.exit(code);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
  });
}

main();
