const fs = require('fs');

// 1. RefundManagementScreen.tsx - replace small icon gradients with solid stylish icons
{
  let code = fs.readFileSync('src/screens/admin/RefundManagementScreen.tsx', 'utf8');
  
  // Replace approve icon gradient
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#43e97b",\s*"#38f9d7"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#10b981" }]}>$1</View>'
  );

  // Replace process icon gradient
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#3b82f6",\s*"#2563eb"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#3b82f6" }]}>$1</View>'
  );

  // Replace hold icon gradient
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#8b5cf6",\s*"#7c3aed"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#8b5cf6" }]}>$1</View>'
  );

  // Replace reject icon gradient
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#ef4444",\s*"#dc2626"\]\}[^>]*style=\{styles\.actionOptionIcon\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.actionOptionIcon, { backgroundColor: "#ef4444" }]}>$1</View>'
  );

  fs.writeFileSync('src/screens/admin/RefundManagementScreen.tsx', code, 'utf8');
  console.log('Optimized icon gradients in RefundManagementScreen.tsx');
}

// 2. AgenPlatformMonitoringScreen.tsx - replace action button gradients with clean solid brand surfaces
{
  let code = fs.readFileSync('src/screens/admin/AgenPlatformMonitoringScreen.tsx', 'utf8');

  code = code.replace(
    /<LinearGradient\s+colors=\{\["#667eea",\s*"#764ba2"\]\}[^>]*style=\{styles\.actionGradient\}>/g,
    '<View style={[styles.actionGradient, { backgroundColor: "#6366f1" }]}>'
  );
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#f59e0b",\s*"#f97316"\]\}[^>]*style=\{styles\.actionGradient\}>/g,
    '<View style={[styles.actionGradient, { backgroundColor: "#f59e0b" }]}>'
  );
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#10b981",\s*"#34d399"\]\}[^>]*style=\{styles\.actionGradient\}>/g,
    '<View style={[styles.actionGradient, { backgroundColor: "#10b981" }]}>'
  );
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#3b82f6",\s*"#60a5fa"\]\}[^>]*style=\{styles\.actionGradient\}>/g,
    '<View style={[styles.actionGradient, { backgroundColor: "#3b82f6" }]}>'
  );

  // Replace corresponding closing tags
  code = code.replace(/<\/LinearGradient>\s*<\/TouchableOpacity>/g, '</View>\n          </TouchableOpacity>');

  fs.writeFileSync('src/screens/admin/AgenPlatformMonitoringScreen.tsx', code, 'utf8');
  console.log('Optimized action button gradients in AgenPlatformMonitoringScreen.tsx');
}

// 3. DigitalPassportScreen.tsx - replace small button/badge gradients
{
  let code = fs.readFileSync('src/screens/DigitalPassportScreen.tsx', 'utf8');

  // Flex story button gradient -> clean stylish solid gold button
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#F59E0B",\s*"#D97706"\]\}[^>]*style=\{styles\.storyShareGradient\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.storyShareGradient, { backgroundColor: "#F59E0B" }]}>$1</View>'
  );

  // Avatar gradient -> solid deep navy
  code = code.replace(
    /<LinearGradient\s+colors=\{\["#1E3A8A",\s*"#3B82F6"\]\}[^>]*style=\{styles\.avatarGradient\}>([\s\S]*?)<\/LinearGradient>/,
    '<View style={[styles.avatarGradient, { backgroundColor: "#1E3A8A" }]}>$1</View>'
  );

  fs.writeFileSync('src/screens/DigitalPassportScreen.tsx', code, 'utf8');
  console.log('Optimized button and avatar gradients in DigitalPassportScreen.tsx');
}
