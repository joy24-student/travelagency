const fs = require('fs');
const file = 'src/screens/admin/AgenPlatformMonitoringScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<LinearGradient[^>]*colors=\{\["#667eea",\s*"#764ba2"\]\}[^>]*>/, '<View style={[styles.actionGradient, { backgroundColor: "#667eea" }]}>');
content = content.replace(/<LinearGradient[^>]*colors=\{\["#f59e0b",\s*"#f97316"\]\}[^>]*>/, '<View style={[styles.actionGradient, { backgroundColor: "#f59e0b" }]}>');
content = content.replace(/<LinearGradient[^>]*colors=\{\["#10b981",\s*"#34d399"\]\}[^>]*>/, '<View style={[styles.actionGradient, { backgroundColor: "#10b981" }]}>');
content = content.replace(/<LinearGradient[^>]*colors=\{\["#3b82f6",\s*"#60a5fa"\]\}[^>]*>/, '<View style={[styles.actionGradient, { backgroundColor: "#3b82f6" }]}>');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed tags successfully');
