const fs = require('fs');

// SettingsScreen.tsx
{
  let code = fs.readFileSync('AGEN/src/screens/agency/SettingsScreen.tsx', 'utf8');
  code = code.replace("import { BlurView } from 'expo-blur';", "import { GlassView } from '../../components/ui/UIComponents';");
  code = code.replace('<BlurView intensity={10} tint={darkMode ? "dark" : "light"}>', '<GlassView intensity={10} tint={darkMode ? "dark" : "light"}>');
  code = code.replace('</BlurView>', '</GlassView>');
  fs.writeFileSync('AGEN/src/screens/agency/SettingsScreen.tsx', code, 'utf8');
  console.log('Updated AGEN SettingsScreen.tsx to use GlassView');
}

// DashboardScreen.tsx
{
  let code = fs.readFileSync('AGEN/src/screens/agency/DashboardScreen.tsx', 'utf8');
  code = code.replace('import { BlurView } from "expo-blur";', 'import { GlassView } from "../ui/UIComponents";');
  code = code.replace('<BlurView intensity={15} tint="dark" style={styles.miniStatBlur}>', '<GlassView intensity={15} tint="dark" style={styles.miniStatBlur}>');
  code = code.replace('</BlurView>', '</GlassView>');
  fs.writeFileSync('AGEN/src/screens/agency/DashboardScreen.tsx', code, 'utf8');
  console.log('Updated AGEN DashboardScreen.tsx to use GlassView');
}
