const fs = require('fs');

const targets = [
  'app/(tabs)/account.tsx',
  'app/screens/bus-launch.tsx',
  'app/screens/payment-success.tsx',
  'app/screens/travel-match.tsx',
  'src/screens/admin/AdminPortalShell.tsx',
  'src/screens/admin/AgencyManagementScreen.tsx',
  'src/screens/admin/PaymentManagementScreen.tsx',
  'src/screens/admin/UserManagementScreen.tsx',
  'src/screens/DigitalPassportScreen.tsx',
  'src/screens/LuggageMeasureScreen.tsx',
  'src/screens/RewardsScreen.tsx',
];

for (const relPath of targets) {
  if (!fs.existsSync(relPath)) continue;
  let content = fs.readFileSync(relPath, 'utf8');

  // Remove `Platform,` from any non-react-native imports
  // e.g. import { Platform, Ionicons } from "@expo/vector-icons"
  content = content.replace(/(import\s*\{[^}]*?)\bPlatform\s*,\s*([^}]*\}\s*from\s*['"](?!react-native)[^'"]+['"])/g, '$1$2');
  content = content.replace(/(import\s*\{[^}]*?),\s*\bPlatform\b([^}]*\}\s*from\s*['"](?!react-native)[^'"]+['"])/g, '$1$2');

  // Now ensure react-native import has Platform
  const rnMatch = content.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]react-native['"]/);
  if (rnMatch) {
    const existing = rnMatch[1];
    if (!/\bPlatform\b/.test(existing)) {
      content = content.replace(rnMatch[0], `import { Platform,${existing}} from "react-native"`);
    }
  } else {
    content = `import { Platform } from "react-native";\n` + content;
  }

  fs.writeFileSync(relPath, content, 'utf8');
  console.log(`Cleaned Platform import in: ${relPath}`);
}
