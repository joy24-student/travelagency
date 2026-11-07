const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.expo') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('.');
let fixedCount = 0;
// Matches marginStart -8, marginEnd 16, paddingStart 12, paddingEnd "100%", etc. where there is NO colon
const pattern = /\b(marginStart|marginEnd|paddingStart|paddingEnd)\s+([a-zA-Z0-9_\-\.\'\"]+)/g;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let matchFound = false;
  const updated = content.replace(pattern, (match, prop, val) => {
    // If it's a type definition like marginStart?: number, don't touch
    if (val.startsWith(':')) return match;
    matchFound = true;
    return `${prop}: ${val}`;
  });

  if (matchFound && updated !== content) {
    fs.writeFileSync(f, updated, 'utf8');
    console.log('Fixed missing colon in:', f);
    fixedCount++;
  }
});

console.log('Total fixed files:', fixedCount);
