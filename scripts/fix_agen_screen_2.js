const fs = require('fs');
const file = 'src/screens/admin/AgenPlatformMonitoringScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix Header
content = content.replace(
  '<View style={[styles.actionGradient, { backgroundColor: "#667eea" }]}>\n        <View style={styles.headerContent}>',
  `<LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>`
);

// Fix Quick Action
content = content.replace(
  `<TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
              <Text style={styles.actionText}>Verify Agencies</Text>
            </View>
          </TouchableOpacity>`,
  `<TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionGradient, { backgroundColor: "#667eea" }]}>
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
              <Text style={styles.actionText}>Verify Agencies</Text>
            </View>
          </TouchableOpacity>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed AgenPlatformMonitoringScreen tags cleanly');
