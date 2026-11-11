const fs = require('fs');
const file = 'src/screens/admin/AgenPlatformMonitoringScreen.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Verify Agencies')) {
    // Look backwards for <LinearGradient
    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      if (lines[j].includes('<LinearGradient')) {
        // replace lines from j up to before line i with the View tag
        lines.splice(j, i - j - 1, '            <View style={[styles.actionGradient, { backgroundColor: "#667eea" }]}>');
        break;
      }
    }
    break;
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed Verify Agencies gradient tag');
