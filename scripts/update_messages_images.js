const fs = require('fs');

let code = fs.readFileSync('app/(tabs)/messages.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "../../src/components/ui/AppImage";\n' + code;
  code = code.replace(/<Image\b/g, '<AppImage placeholderCategory="avatar"');
  fs.writeFileSync('app/(tabs)/messages.tsx', code, 'utf8');
  console.log('Updated app/(tabs)/messages.tsx with AppImage');
}
