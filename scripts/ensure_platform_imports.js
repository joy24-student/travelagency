const fs = require('fs');
const path = require('path');

function getFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === '.expo' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, exts));
    } else if (exts.some(ext => file.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = [
  ...getFiles('src', ['.ts', '.tsx']),
  ...getFiles('app', ['.ts', '.tsx']),
  ...getFiles('AGEN', ['.ts', '.tsx']),
  ...getFiles('hotel', ['.ts', '.tsx']),
];

let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Check if Platform is used
  if (!/\bPlatform\b/.test(content)) continue;

  // Check if Platform is already imported
  // matches: import { ... Platform ... } from 'react-native' or similar
  const hasPlatformImport = /import\s+[^;]*?\bPlatform\b[^;]*?from\s+['"]react-native['"]/.test(content);
  if (hasPlatformImport) continue;

  // If react-native is already imported
  const rnImportMatch = content.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]react-native['"]/);
  if (rnImportMatch) {
    const existingImports = rnImportMatch[1];
    if (!existingImports.split(',').map(s => s.trim()).includes('Platform')) {
      const newRnImport = `import { Platform,${existingImports}} from "react-native"`;
      content = content.replace(rnImportMatch[0], newRnImport);
      fs.writeFileSync(file, content, 'utf8');
      updatedCount++;
      console.log(`Added Platform to react-native import in: ${file}`);
    }
  } else {
    // Add import at the top
    content = `import { Platform } from "react-native";\n` + content;
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Prepended Platform import to: ${file}`);
  }
}

console.log(`Total files updated with Platform import: ${updatedCount}`);
