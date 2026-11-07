const fs = require('fs');

let code = fs.readFileSync('src/components/ui/SafeContainer.tsx', 'utf8');

code = code.replace(
  'import { StatusBar } from "expo-status-bar";',
  'import { FocusAwareStatusBar } from "./AppStatusBar";'
);

code = code.replace(
  '<StatusBar style={resolvedStatusBarStyle} hidden={statusBarHidden} />',
  '<FocusAwareStatusBar style={resolvedStatusBarStyle} hidden={statusBarHidden} />'
);

fs.writeFileSync('src/components/ui/SafeContainer.tsx', code, 'utf8');
console.log('Updated SafeContainer.tsx to use FocusAwareStatusBar');
