const fs = require('fs');
let code = fs.readFileSync('app/(auth)/login.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!code.includes('showLocalizedAlert')) {
  code = code.replace(
    'import { loginSchema, LoginFormValues } from "../../src/auth/schemas";',
    'import { loginSchema, LoginFormValues } from "../../src/auth/schemas";\nimport { showLocalizedAlert } from "../../src/utils/localizedAlert";'
  );
  code = code.replace(/Alert\.alert\(/g, 'showLocalizedAlert(');
  fs.writeFileSync('app/(auth)/login.tsx', code, 'utf8');
  console.log('Successfully updated login.tsx with showLocalizedAlert');
}
