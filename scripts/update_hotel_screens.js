const fs = require('fs');

const hotelScreens = [
  'hotel/src/screens/LoginScreen.tsx',
  'hotel/src/screens/ForgotPasswordScreen.tsx',
  'hotel/src/screens/SignUpScreen.tsx',
  'hotel/src/screens/OnboardingScreen.tsx'
];

hotelScreens.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/import\s*\{\s*BlurView\s*\}\s*from\s*['"]expo-blur['"];/g, "import { GlassView } from '../components/GlassView';");
  code = code.replace(/<BlurView\b/g, '<GlassView');
  code = code.replace(/<\/BlurView>/g, '</GlassView>');
  fs.writeFileSync(f, code, 'utf8');
  console.log('Updated ' + f + ' with GlassView');
});
