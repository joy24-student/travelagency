const fs = require('fs');

// 1. ActiveTripDock.tsx
{
  const file = 'src/components/dock/ActiveTripDock.tsx';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import \* as Linking from ["']expo-linking["'];\r?\n?/, '');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed ActiveTripDock duplicate Linking');
}

// 2. biometricFaceAuth.ts
{
  const file = 'src/services/vision/biometricFaceAuth.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/width:\s*140,\s*minHeight:\s*180,/, 'width: 140,\n      height: 180,');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed biometricFaceAuth minHeight -> height');
}

// 3. formatters.ts
{
  const file = 'src/utils/formatters.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    'export function formatLocalizedRelativeTime(\n  timestamp: number | string | Date,\n  locale?: string\n): string {',
    'export function formatLocalizedRelativeTime(\n  timestamp: number | string | Date,\n  locale?: string,\n  style?: Intl.DateTimeFormatOptions\n): string {'
  );
  // Also try CRLF
  content = content.replace(
    'export function formatLocalizedRelativeTime(\r\n  timestamp: number | string | Date,\r\n  locale?: string\r\n): string {',
    'export function formatLocalizedRelativeTime(\r\n  timestamp: number | string | Date,\r\n  locale?: string,\r\n  style?: Intl.DateTimeFormatOptions\r\n): string {'
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed formatters.ts style parameter');
}
