const { execSync } = require('child_process');
const fs = require('fs');
const commitHash = execSync('git rev-parse HEAD').toString().trim();

// Write or update .env.local
const envPath = '.env.local';
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  // Remove any existing NEXT_PUBLIC_COMMIT_HASH line
  envContent = envContent.replace(/^NEXT_PUBLIC_COMMIT_HASH=.*$/m, '');
  envContent = envContent.trim() + '\n';
}
envContent += `NEXT_PUBLIC_COMMIT_HASH=${commitHash}\n`;
fs.writeFileSync(envPath, envContent);

console.log('Wrote commit hash:', commitHash);
