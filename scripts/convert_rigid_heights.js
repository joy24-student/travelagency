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
let converted = 0;

files.forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Pattern: in styles for card/item/content/container/box/panel, replace "height: XXX," with "minHeight: XXX," if not image
  const updated = code.replace(
    /((?:card|item|content|panel|row|box|container|banner|tile)[^:]*:\s*\{[^}]*?)(\bheight:\s*([1-9]\d{2})\s*,)([^}]*\})/gis,
    (full, before, heightDecl, num, after) => {
      // Don't replace if it's explicitly an image style like cardImage or bannerImage
      if (/image|img|pic|photo|thumb|avatar|icon|cover|art/i.test(before)) {
        return full;
      }
      changed = true;
      converted++;
      return `${before}minHeight: ${num},${after}`;
    }
  );

  if (changed) {
    fs.writeFileSync(f, updated, 'utf8');
    console.log(`Converted fixed heights to minHeight in ${f}`);
  }
});

console.log(`Total styles converted to minHeight: ${converted}`);
