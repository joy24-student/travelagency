const fs = require('fs');

const files = [
  'app/screens/payment-details.tsx',
  'app/screens/bus-launch.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (!code.includes('showLocalizedAlert')) {
      code = 'import { showLocalizedAlert } from "../../src/utils/localizedAlert";\n' + code;
      code = code.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
      fs.writeFileSync(file, code, 'utf8');
      console.log('Successfully updated', file, 'with showLocalizedAlert');
    }
  }
}
