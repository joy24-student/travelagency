const fs = require('fs');

const screensToUpdate = [
  'src/screens/DigitalPassportScreen.tsx',
  'src/screens/LuggageMeasureScreen.tsx',
  'src/screens/OfflineSurvivalScreen.tsx',
  'src/screens/OnboardingScreen.tsx',
  'src/screens/RewardsScreen.tsx',
  'src/screens/admin/AdminPortalShell.tsx',
  'src/screens/admin/AgencyManagementScreen.tsx',
  'src/screens/admin/HotelManagementScreen.tsx',
  'src/screens/admin/SupportCenterScreen.tsx',
  'src/screens/admin/UserManagementScreen.tsx'
];

screensToUpdate.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // Check if FocusAwareStatusBar is imported
  if (!code.includes('FocusAwareStatusBar')) {
    const importPath = file.includes('admin') ? '../../components/ui/AppStatusBar' : '../components/ui/AppStatusBar';
    code = `import { FocusAwareStatusBar } from "${importPath}";\n` + code;
  }

  // Replace <StatusBar barStyle="light-content" ... /> with <FocusAwareStatusBar style="light" ... />
  code = code.replace(/<StatusBar\s+barStyle="light-content"([^>]*)\/>/g, '<FocusAwareStatusBar style="light"$1/>');
  code = code.replace(/<StatusBar\s+barStyle="dark-content"([^>]*)\/>/g, '<FocusAwareStatusBar style="dark"$1/>');
  code = code.replace(/<StatusBar\s+barStyle=\{([^}]+)\}([^>]*)\/>/g, (match, expr, rest) => {
    return `<FocusAwareStatusBar style={${expr}.includes('light') ? 'light' : 'dark'}$${rest}/>`;
  });

  fs.writeFileSync(file, code, 'utf8');
  console.log(`Updated ${file} with FocusAwareStatusBar`);
});
