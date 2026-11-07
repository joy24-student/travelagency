const fs = require('fs');
let code = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!code.includes('showLocalizedAlert')) {
  code = code.replace(
    'import { LanguageSelectorModal } from "../components/settings/LanguageSelectorModal";',
    'import { LanguageSelectorModal } from "../components/settings/LanguageSelectorModal";\nimport { showLocalizedAlert } from "../utils/localizedAlert";'
  );
  code = code.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('src/screens/SettingsScreen.tsx', code, 'utf8');
  console.log('Successfully updated SettingsScreen.tsx with showLocalizedAlert');
}
