const fs = require('fs');
const path = require('path');

// 1. src/screens/ConvertedScreen.tsx
const convertedPath = path.resolve('src/screens/ConvertedScreen.tsx');
let convertedCode = fs.readFileSync(convertedPath, 'utf8');

if (!convertedCode.includes('import { BottomNav, AiPill }')) {
  convertedCode = convertedCode.replace(
    'import { TopBar } from "./TopBar";',
    'import { TopBar } from "./TopBar";\nimport { BottomNav, AiPill } from "./Navigation";'
  );
}

convertedCode = convertedCode.replace(
  '{screen.kind !== "settings" ?: null}',
  `{screen.kind !== "settings" ? <AiPill color={theme.primary} /> : null}\n      <BottomNav active={screen.activeTab ?? "Home"} color={theme.primary} />`
);

fs.writeFileSync(convertedPath, convertedCode, 'utf8');
console.log('Fixed src/screens/ConvertedScreen.tsx');

// 2. src/screens/ServiceChatScreen.tsx
const serviceChatPath = path.resolve('src/screens/ServiceChatScreen.tsx');
let serviceChatCode = fs.readFileSync(serviceChatPath, 'utf8');

// Replace the closing </TouchableOpacity> for the outer message bubble at line 419
serviceChatCode = serviceChatCode.replace(
  '                {/* Failed Message Retry Pill */}\n                {isMe && msg.status === "failed" && (\n                  <TouchableOpacity\n                    style={styles.retryPill}\n                    onPress={() => handleRetryMessage(msg.id)}\n                    activeOpacity={0.8}\n                  >\n                    <Ionicons name="refresh-outline" size={12} color="#EF4444" />\n                    <Text style={styles.retryPillText}>ব্যর্থ • আবার পাঠান</Text>\n                  </TouchableOpacity>\n                )}\n              </TouchableOpacity>',
  '                {/* Failed Message Retry Pill */}\n                {isMe && msg.status === "failed" && (\n                  <TouchableOpacity\n                    style={styles.retryPill}\n                    onPress={() => handleRetryMessage(msg.id)}\n                    activeOpacity={0.8}\n                  >\n                    <Ionicons name="refresh-outline" size={12} color="#EF4444" />\n                    <Text style={styles.retryPillText}>ব্যর্থ • আবার পাঠান</Text>\n                  </TouchableOpacity>\n                )}\n              </View>'
);

fs.writeFileSync(serviceChatPath, serviceChatCode, 'utf8');
console.log('Fixed src/screens/ServiceChatScreen.tsx');
