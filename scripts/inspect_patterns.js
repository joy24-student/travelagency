const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scripts/analysis_output.json', 'utf8'));

console.log('=== TOP FILES WITH LINEAR GRADIENT ===');
data.linearGradient.slice(0, 15).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/LinearGradient/g) || []).length;
  console.log(`  ${f}: ${count}`);
});

console.log('\n=== TOP FILES WITH SHADOW / ELEVATION ===');
data.shadow.slice(0, 15).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/shadowColor/g) || []).length + (content.match(/elevation/g) || []).length;
  console.log(`  ${f}: ${count}`);
});

console.log('\n=== TOP FILES WITH TIMERS ===');
data.timers.slice(0, 15).forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/setTimeout/g) || []).length + (content.match(/setInterval/g) || []).length;
  console.log(`  ${f}: ${count}`);
});

console.log('\n=== STATUS BAR FILES ===');
data.statusBar.forEach(f => {
  console.log(`  ${f}`);
});
