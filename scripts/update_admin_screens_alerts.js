const fs = require('fs');

const adminFiles = [
  'src/screens/admin/AgencyManagementScreen.tsx',
  'src/screens/admin/HotelManagementScreen.tsx',
  'src/screens/admin/AdminSettingsScreen.tsx',
  'src/screens/admin/UserManagementScreen.tsx',
  'src/screens/admin/SupportCenterScreen.tsx',
];

for (const file of adminFiles) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (!code.includes('showLocalizedAlert')) {
      code = 'import { showLocalizedAlert } from "../../utils/localizedAlert";\n' + code;
      code = code.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
      fs.writeFileSync(file, code, 'utf8');
      console.log('Successfully updated', file, 'with showLocalizedAlert');
    }
  }
}
