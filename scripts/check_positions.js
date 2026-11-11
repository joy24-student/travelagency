const fs = require('fs');

const files = [
  'src/screens/HomeScreen.tsx',
  'src/components/audio/SoundscapePlayer.tsx',
  'src/components/dock/ActiveTripDock.tsx',
  'app/(tabs)/trips.tsx',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  console.log('=== ' + file + ' ===');
  lines.forEach((l, i) => {
    if (l.includes('position: "absolute"') || l.includes("position: 'absolute'") || l.includes('zIndex:')) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  });
}
