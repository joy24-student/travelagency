const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      if (['node_modules', '.git'].includes(item)) continue;
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
const imgFiles = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const count = (content.match(/<Image\b/g) || []).length;
  const hasOnError = (content.match(/onError\s*=/g) || []).length;
  if (count > 0) {
    imgFiles.push({ file: f, count, hasOnError });
  }
});

console.log('Top files with Image tags:');
imgFiles.sort((a,b) => b.count - a.count).slice(0, 15).forEach(item => {
  console.log(`  ${item.file}: ${item.count} images, ${item.hasOnError} onError`);
});
