const fs = require('fs');
const path = require('path');

function safeWrite(filePath, modifier) {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const updated = modifier(content);
  if (updated !== content) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No change: ${filePath}`);
  }
}

// 1. app/screens/travel-match.tsx: remove duplicate Dimensions in main react-native import
safeWrite('app/screens/travel-match.tsx', (code) => {
  return code.replace(
    /(\n\s*StatusBar,\n)\s*Dimensions,\n/m,
    '$1'
  );
});

// 2. src/screens/LandmarkScannerScreen.tsx: remove duplicate Dimensions
safeWrite('src/screens/LandmarkScannerScreen.tsx', (code) => {
  return code.replace(
    /(\n\s*ScrollView,\n)\s*Dimensions,\n/m,
    '$1'
  );
});

// 3. src/screens/LuggageMeasureScreen.tsx: remove duplicate Dimensions
safeWrite('src/screens/LuggageMeasureScreen.tsx', (code) => {
  return code.replace(
    /(\n\s*ScrollView,\n)\s*Dimensions,\n/m,
    '$1'
  );
});

// 4. src/screens/RecommendedToursScreen.tsx: remove duplicate Dimensions
safeWrite('src/screens/RecommendedToursScreen.tsx', (code) => {
  return code.replace(
    /(\n\s*Alert,\n)\s*Dimensions,\n/m,
    '$1'
  );
});

// 5. src/components/UserProfileModal.tsx: define SCREEN_WIDTH
safeWrite('src/components/UserProfileModal.tsx', (code) => {
  if (code.includes('const { width: SCREEN_WIDTH }')) return code;
  return code.replace(
    'const TRIP_BLUE = "#0055F2";',
    'const { width: SCREEN_WIDTH } = Dimensions.get("window");\nconst TRIP_BLUE = "#0055F2";'
  );
});

// 6. src/utils/a11y/a11yProps.ts: fix tabIndex type and accessibilityInvalid
safeWrite('src/utils/a11y/a11yProps.ts', (code) => {
  let updated = code.replace(
    /tabIndex:\s*disabled\s*\?\s*-1\s*:\s*0,/,
    'tabIndex: (disabled ? -1 : 0) as 0 | -1,'
  );
  updated = updated.replace(
    /accessibilityInvalid:\s*isInvalid,/,
    'accessibilityState: { disabled, invalid: isInvalid },'
  );
  return updated;
});

// 7. src/components/ui/Card.tsx: destructure accessibilityLabel and accessibilityHint
safeWrite('src/components/ui/Card.tsx', (code) => {
  return code.replace(
    /padding\s*=\s*"md"\s*as\s*CardPadding,\s*\n\s*onPress,\s*\n\s*className,\s*\n\s*style,\s*\n\s*testID,/,
    `padding = "md" as CardPadding,\n  onPress,\n  className,\n  style,\n  testID,\n  accessibilityLabel,\n  accessibilityHint,`
  );
});

// 8. src/components/ui/Dialog.tsx: accessibilityRole="alert"
safeWrite('src/components/ui/Dialog.tsx', (code) => {
  return code.replace(
    'accessibilityRole="alertdialog"',
    'accessibilityRole="alert"'
  );
});

// 9. src/components/ui/Input.tsx: accessibilityInvalid
safeWrite('src/components/ui/Input.tsx', (code) => {
  return code.replace(
    'accessibilityInvalid={!!activeError}',
    'accessibilityState={{ invalid: !!activeError, disabled }}'
  );
});

// 10. src/components/layout/ResponsiveLayout.tsx: DimensionValue
safeWrite('src/components/layout/ResponsiveLayout.tsx', (code) => {
  let updated = code;
  if (!updated.includes('DimensionValue')) {
    updated = updated.replace(
      'import { View, StyleSheet, StyleProp, ViewStyle, ScrollView, ScrollViewProps } from "react-native";',
      'import { View, StyleSheet, StyleProp, ViewStyle, ScrollView, ScrollViewProps, DimensionValue } from "react-native";'
    );
  }
  updated = updated.replace(
    'const widthPercent = `${(effectiveSpan / 12) * 100}%`;',
    'const widthPercent = `${(effectiveSpan / 12) * 100}%` as DimensionValue;'
  );
  updated = updated.replace(
    'width: widthPercent as any,',
    'width: widthPercent,'
  );
  return updated;
});

// 11. src/screens/admin/AdvertisementScreen.tsx: component name, error state, EmptyState import, withErrorBoundary
safeWrite('src/screens/admin/AdvertisementScreen.tsx', (code) => {
  let updated = code;
  if (!updated.includes('import { EmptyState } from "@/components/ui/EmptyState";')) {
    updated = updated.replace(
      'import { Advertisement, AdminUser } from "@/types/admin";',
      'import { Advertisement, AdminUser } from "@/types/admin";\nimport { EmptyState } from "@/components/ui/EmptyState";\nimport { withErrorBoundary } from "@/components/common";'
    );
  }
  // Component declaration
  updated = updated.replace(
    'export const AdvertisementScreen: React.FC<{ admin: AdminUser | null }> = ({',
    'const AdvertisementScreenComponent: React.FC<{ admin: AdminUser | null }> = ({'
  );
  // error state
  if (!updated.includes('const [error, setError] = useState')) {
    updated = updated.replace(
      'const [loading, setLoading] = useState(false);',
      'const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);'
    );
  }
  // Bottom export
  updated = updated.replace(
    /export default AdvertisementScreen;\s*\n*\s*export const AdvertisementScreen = withErrorBoundary\(AdvertisementScreenComponent, \{\s*screenName: "AdvertisementScreen",\s*\}\);/,
    `export const AdvertisementScreen = withErrorBoundary(AdvertisementScreenComponent, {\n  screenName: "AdvertisementScreen",\n});\n\nexport default AdvertisementScreen;`
  );
  return updated;
});

// 12. src/screens/admin/AgencyManagementScreen.tsx: const styles: any
safeWrite('src/screens/admin/AgencyManagementScreen.tsx', (code) => {
  return code.replace(
    'const styles = StyleSheet.create({',
    'const styles: any = StyleSheet.create({'
  );
});

console.log('Script completed.');
