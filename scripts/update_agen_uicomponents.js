const fs = require('fs');

let code = fs.readFileSync('AGEN/src/components/ui/UIComponents.tsx', 'utf8');

if (!code.includes('GlassView')) {
  code = code.replace(
    'import { COLORS, TYPOGRAPHY } from "../../App";',
    'import { COLORS, TYPOGRAPHY } from "../../App";\nimport { GlassView } from "../../../../src/components/ui/GlassView";\nexport { GlassView };'
  );

  code = code.replace(
    'export const GradientCard: React.FC<CardProps> = ({ children, style }) => (',
    'export const GlassCard: React.FC<CardProps & { intensity?: number; tint?: "light" | "dark" }> = ({\n  children,\n  style,\n  intensity = 20,\n  tint = "dark",\n}) => (\n  <GlassView intensity={intensity} tint={tint} style={[styles.card, style]}>\n    {children}\n  </GlassView>\n);\n\nexport const GradientCard: React.FC<CardProps> = ({ children, style }) => ('
  );

  fs.writeFileSync('AGEN/src/components/ui/UIComponents.tsx', code, 'utf8');
  console.log('Updated AGEN UIComponents with GlassView and GlassCard');
}
