const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      if (['node_modules', '.git', '__tests__'].includes(item)) continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(walk(full));
      } else if (/\.(tsx|ts)$/.test(item)) {
        files.push(full);
      }
    }
  } catch (e) {}
  return files;
}

const files = walk('./src').concat(walk('./app'));
const items = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Check if line defines height or width with 3 digits
    if (/^\s*height\s*:\s*[1-9]\d{2}\s*,/.test(l)) {
      // Find style name
      let styleName = 'unknown';
      for (let k = idx - 1; k >= Math.max(0, idx - 10); k--) {
        const m = lines[k].match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\{/);
        if (m) {
          styleName = m[1];
          break;
        }
      }
      items.push({ file: f, line: idx + 1, styleName, text: l.trim() });
    }
  });
});

console.log('Total fixed 3-digit heights:', items.length);
// Group by styleName
const byName = {};
items.forEach(it => {
  byName[it.styleName] = (byName[it.styleName] || 0) + 1;
});
console.log('Top style names with fixed heights:', Object.entries(byName).sort((a,b)=>b[1]-a[1]).slice(0, 15));
