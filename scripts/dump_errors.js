const { execSync } = require('child_process');
const fs = require('fs');

try {
  const out = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  console.log('Zero errors!');
  fs.writeFileSync('scripts/ts_errors.txt', '');
} catch (err) {
  const lines = (err.stdout || '').split('\n').filter(l => l.includes('error TS'));
  console.log(`Writing ${lines.length} errors to scripts/ts_errors.txt`);
  fs.writeFileSync('scripts/ts_errors.txt', lines.join('\n'));
}
