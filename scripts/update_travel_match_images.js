const fs = require('fs');

let code = fs.readFileSync('app/screens/travel-match.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "../../src/components/ui/AppImage";\n' + code;
  code = code.replace(/<Image\b/g, '<AppImage placeholderCategory="avatar"');
  fs.writeFileSync('app/screens/travel-match.tsx', code, 'utf8');
  console.log('Updated app/screens/travel-match.tsx with AppImage');
}
