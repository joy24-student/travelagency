const fs = require('fs');

// 1. DestinationManagementScreen.tsx
{
  let code = fs.readFileSync('src/screens/admin/DestinationManagementScreen.tsx', 'utf8');

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#43e97b",\s*"#38f9d7"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#10b981" }]}>$1</View>'
  );

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#f59e0b",\s*"#f97316"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#f59e0b" }]}>$1</View>'
  );

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#667eea",\s*"#764ba2"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#6366f1" }]}>$1</View>'
  );

  fs.writeFileSync('src/screens/admin/DestinationManagementScreen.tsx', code, 'utf8');
  console.log('Optimized DestinationManagementScreen.tsx');
}

// 2. ReportsScreen.tsx
{
  let code = fs.readFileSync('src/screens/admin/ReportsScreen.tsx', 'utf8');

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#667eea",\s*"#764ba2"\]\}[^>]*style=\{styles\.exportButtonGradient\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.exportButtonGradient, { backgroundColor: "#107c41" }]}>$1</View>'
  );

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#ef4444",\s*"#dc2626"\]\}[^>]*style=\{styles\.exportButtonGradient\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.exportButtonGradient, { backgroundColor: "#dc2626" }]}>$1</View>'
  );

  fs.writeFileSync('src/screens/admin/ReportsScreen.tsx', code, 'utf8');
  console.log('Optimized ReportsScreen.tsx');
}
