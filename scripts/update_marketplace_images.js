const fs = require('fs');

let code = fs.readFileSync('app/screens/local-marketplace.tsx', 'utf8');

if (!code.includes('AppImage')) {
  code = 'import { AppImage } from "../../src/components/ui/AppImage";\n' + code;
  code = code.replace(/<Image\b/g, '<AppImage placeholderCategory="package"');
  fs.writeFileSync('app/screens/local-marketplace.tsx', code, 'utf8');
  console.log('Updated app/screens/local-marketplace.tsx with AppImage');
}
