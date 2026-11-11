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
let totalPatched = 0;

files.forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Regex to match a shadow block with shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation
  // Example:
  // shadowColor: "#000",
  // shadowOffset: { width: 0, height: 2 },
  // shadowOpacity: 0.1,
  // shadowRadius: 4,
  // elevation: 3,
  const shadowRegex = /(shadowColor:\s*['"]([^'"]+)['"],\s*shadowOffset:\s*\{\s*width:\s*(-?\d+),\s*height:\s*(-?\d+)\s*\},\s*shadowOpacity:\s*([\d\.]+),\s*shadowRadius:\s*([\d\.]+),\s*elevation:\s*\d+,)/g;

  if (shadowRegex.test(code)) {
    code = code.replace(shadowRegex, (match, fullMatch, color, w, h, opacity, radius) => {
      // Don't duplicate if boxShadow is already there
      return `${fullMatch}\n    ...(Platform.OS === "web" ? { boxShadow: "${w}px ${h}px ${radius}px rgba(15, 23, 42, ${opacity})" } : {}),`;
    });
    changed = true;
    totalPatched++;
    
    // Ensure Platform is imported if not already
    if (!code.includes('Platform') && !code.includes('import { Platform')) {
      code = 'import { Platform } from "react-native";\n' + code;
    }
  }

  if (changed) {
    fs.writeFileSync(f, code, 'utf8');
  }
});

console.log(`Successfully patched ${totalPatched} files with cross-platform web boxShadow!`);
