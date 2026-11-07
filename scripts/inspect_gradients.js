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

const files = walk('./src').concat(walk('./app')).concat(walk('./AGEN')).concat(walk('./hotel'));
const gradientFiles = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/<LinearGradient\b/g) || []).length;
  if (count > 0) gradientFiles.push({ file: f, count });
});

console.log('Top files with LinearGradient:');
gradientFiles.sort((a,b)=>b.count-a.count).slice(0, 15).forEach(item => {
  console.log(`  ${item.file}: ${item.count} gradients`);
});
console.log('Total files with gradients:', gradientFiles.length);
console.log('Total gradients:', gradientFiles.reduce((sum, item) => sum + item.count, 0));
