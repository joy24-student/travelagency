const fs = require('fs');
let code = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

code = code.replace(
  'icon={<Ionicons name="finger-print" size={20} color={colors.primary} />',
  'icon={<Ionicons name="finger-print" size={20} color={colors.primary} />}'
);

code = code.replace(
  'icon={<Ionicons name="notifications" size={20} color={colors.primary} />',
  'icon={<Ionicons name="notifications" size={20} color={colors.primary} />}'
);

fs.writeFileSync('src/screens/SettingsScreen.tsx', code, 'utf8');
console.log('Fixed missing prop closing braces!');
