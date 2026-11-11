const fs = require('fs');

const screens = [
  'src/screens/DigitalPassportScreen.tsx',
  'src/screens/HotelsHomesScreen.tsx',
  'src/screens/SearchStaysScreen.tsx'
];

screens.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(/import\s*\{\s*BlurView\s*\}\s*from\s*['"]expo-blur['"];/g, "import { GlassView } from '../components/ui/GlassView';");
  code = code.replace(/<BlurView\b/g, '<GlassView');
  code = code.replace(/<\/BlurView>/g, '</GlassView>');
  fs.writeFileSync(f, code, 'utf8');
  console.log('Updated ' + f + ' with GlassView');
});
