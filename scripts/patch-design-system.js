/**
 * Patches known type issues in @challengerco/challenger-fitness-design-system.
 * Run as a postinstall step.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@challengerco',
  'challenger-fitness-design-system',
  'components',
  'biometric-radar',
  'biometric-radar.component.tsx',
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace textTransform prop with style prop on SVG text element
  if (content.includes('textTransform="uppercase"')) {
    content = content.replace(
      'textTransform="uppercase"',
      'style={{ textTransform: "uppercase" }}',
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched BiometricRadar textTransform type issue.');
  }
}
