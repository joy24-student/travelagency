const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

const broken = `                ]}
              >
                Nearby Gems
              </Text>
              {activeFeedTab === "nearby" && <View style={styles.tabActiveIndicator} />}
            </Pressable>
          </View>
        </Animated.View>`;

code = code.replace(broken, '');
fs.writeFileSync('src/screens/HomeScreen.tsx', code, 'utf8');
console.log('Cleaned up broken lines in HomeScreen.tsx');
