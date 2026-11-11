const { execSync } = require('child_process');
try {
  const out = execSync('npx tsc -p tsconfig.json --noEmit', { encoding: 'utf8' });
  console.log('SUCCESS: No type errors found!');
  console.log(out);
} catch (e) {
  console.error('TYPE ERRORS:');
  console.error(e.stdout || e.message);
}
