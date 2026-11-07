const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      if (['node_modules', '.git', '.pytest_cache', '.ruff_cache'].includes(item)) continue;
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

const allFiles = walk('.');
console.log('Total files checked:', allFiles.length);

const summary = {};
const directories = {};

allFiles.forEach(f => {
  const topDir = f.split(path.sep)[0] || f;
  directories[topDir] = (directories[topDir] || 0) + 1;
});
console.log('Files by directory:', directories);

let counts = {
  linearGradient: 0,
  shadowColor: 0,
  elevation: 0,
  absolute: 0,
  zIndex: 0,
  activeOpacity: 0,
  androidRipple: 0,
  setTimeout: 0,
  setInterval: 0,
  switchTag: 0,
  onError: 0,
  defaultSource: 0,
  blurView: 0,
  statusBar: 0,
  heightLiterals3Digits: 0,
  widthLiterals: 0
};

const heightMatches = [];

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('LinearGradient')) counts.linearGradient += (content.match(/<LinearGradient/g) || []).length;
  if (content.includes('shadowColor')) counts.shadowColor += (content.match(/shadowColor/g) || []).length;
  if (content.includes('elevation')) counts.elevation += (content.match(/elevation\s*:\s*\d+/g) || []).length;
  if (content.includes('position')) {
    counts.absolute += (content.match(/position\s*:\s*['"]absolute['"]/g) || []).length;
  }
  if (content.includes('zIndex')) counts.zIndex += (content.match(/zIndex\s*:\s*\d+/g) || []).length;
  if (content.includes('activeOpacity')) counts.activeOpacity += (content.match(/activeOpacity/g) || []).length;
  if (content.includes('android_ripple')) counts.androidRipple += (content.match(/android_ripple/g) || []).length;
  if (content.includes('setTimeout')) counts.setTimeout += (content.match(/setTimeout\s*\(/g) || []).length;
  if (content.includes('setInterval')) counts.setInterval += (content.match(/setInterval\s*\(/g) || []).length;
  if (content.includes('Switch')) counts.switchTag += (content.match(/<Switch\b/g) || []).length;
  if (content.includes('onError')) counts.onError += (content.match(/onError\s*=/g) || []).length;
  if (content.includes('defaultSource')) counts.defaultSource += (content.match(/defaultSource/g) || []).length;
  if (content.includes('BlurView')) counts.blurView += (content.match(/<BlurView/g) || []).length;
  if (content.includes('StatusBar')) counts.statusBar += (content.match(/<StatusBar\b/g) || []).length;
});

console.log('Audit counts:', counts);
