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
      } else if (/\.(tsx|ts|jsx|js)$/.test(item)) {
        files.push(full);
      }
    }
  } catch (e) {}
  return files;
}

const files = walk('./src').concat(walk('./app')).concat(walk('./hotel')).concat(walk('./AGEN'));
console.log('Total files scanned:', files.length);

const stats = {
  linearGradient: [],
  shadow: [],
  absolute: [],
  zIndex: [],
  activeOpacity: [],
  timers: [],
  switches: [],
  images: [],
  blurView: [],
  statusBar: []
};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('LinearGradient')) stats.linearGradient.push(f);
  if (content.includes('shadowColor') || content.includes('elevation')) stats.shadow.push(f);
  if (/position\s*:\s*['"]absolute['"]/.test(content)) stats.absolute.push(f);
  if (/zIndex\s*:/.test(content)) stats.zIndex.push(f);
  if (content.includes('activeOpacity')) stats.activeOpacity.push(f);
  if (/setTimeout\s*\(/.test(content) || /setInterval\s*\(/.test(content)) stats.timers.push(f);
  if (/<Switch\b/.test(content)) stats.switches.push(f);
  if (/<Image\b/.test(content)) stats.images.push(f);
  if (content.includes('BlurView')) stats.blurView.push(f);
  if (/<StatusBar\b/.test(content)) stats.statusBar.push(f);
});

console.log('Stats breakdown (file counts):');
for (const [k, v] of Object.entries(stats)) {
  console.log(`${k}: ${v.length} files`);
}

fs.writeFileSync('scripts/analysis_output.json', JSON.stringify(stats, null, 2));
console.log('Saved detailed list to scripts/analysis_output.json');
