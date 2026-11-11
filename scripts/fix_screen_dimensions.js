const fs = require('fs');

const fixes = [
  {
    file: 'src/screens/PackageScreen.tsx',
    target: 'import { useResponsive } from "../hooks/useResponsive";',
    replacement: 'import { useResponsive } from "../hooks/useResponsive";\n\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");',
  },
  {
    file: 'src/screens/RecommendedToursScreen.tsx',
    target: 'import { useResponsive } from "../hooks/useResponsive";',
    replacement: 'import { useResponsive } from "../hooks/useResponsive";\n\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");',
  },
  {
    file: 'src/screens/LandmarkScannerScreen.tsx',
    target: 'import { CameraView, CameraType, useCameraPermissions } from "expo-camera";',
    replacement: 'import { CameraView, CameraType, useCameraPermissions } from "expo-camera";\n\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");',
  },
  {
    file: 'src/screens/LuggageMeasureScreen.tsx',
    target: 'import { LinearGradient } from "expo-linear-gradient";',
    replacement: 'import { LinearGradient } from "expo-linear-gradient";\n\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");',
  },
  {
    file: 'app/screens/travel-match.tsx',
    target: 'import { router } from "expo-router";',
    replacement: 'import { router } from "expo-router";\n\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");',
  },
];

for (const { file, target, replacement } of fixes) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    if (!content.includes('const { width: SCREEN_WIDTH')) {
      content = content.replace(target, replacement);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed dimensions in', file);
    }
  }
}
