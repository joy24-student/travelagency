const fs = require('fs');

const files = [
  'src/screens/RecommendedToursScreen.tsx',
  'src/screens/LandmarkScannerScreen.tsx',
  'src/screens/LuggageMeasureScreen.tsx',
  'app/screens/travel-match.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (!code.startsWith('import { Dimensions }') && !code.includes('const GLOBAL_DIMENSIONS =')) {
      code = 'import { Dimensions } from "react-native";\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");\n' + code;
      fs.writeFileSync(file, code, 'utf8');
      console.log('Added top-level dimensions to', file);
    }
  }
}
