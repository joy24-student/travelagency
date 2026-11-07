const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

if (!code.includes('FocusAwareStatusBar')) {
  code = 'import { FocusAwareStatusBar } from "../components/ui";\n' + code;
  code = code.replace(
    '<StatusBar\n        barStyle="light-content"\n        backgroundColor={isDark ? colors.background : TRIP_BLUE}\n        animated\n      />',
    '<FocusAwareStatusBar\n        style="light"\n        backgroundColor={isDark ? colors.background : TRIP_BLUE}\n      />'
  );
  fs.writeFileSync('src/screens/HomeScreen.tsx', code, 'utf8');
  console.log('Updated HomeScreen.tsx with FocusAwareStatusBar');
}
