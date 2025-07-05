const { execSync } = require('child_process');
const { spawn } = require('child_process');

// Get the current git commit hash
function getCommitHash() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    console.warn('Could not get git commit hash:', error.message);
    return 'unknown';
  }
}

// Set environment variable and run next build
const commitHash = getCommitHash();
process.env.NEXT_PUBLIC_COMMIT_HASH = commitHash;

console.log(`Building with commit hash: ${commitHash}`);

// Run next build
const buildProcess = spawn('npx', ['next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_COMMIT_HASH: commitHash },
});

buildProcess.on('close', (code) => {
  process.exit(code);
});
