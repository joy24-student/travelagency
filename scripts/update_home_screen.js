const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

// Add import
if (!code.includes('import { useLanguage }')) {
  code = code.replace(
    'import { useAuth } from "../hooks/useAuth";',
    'import { useAuth } from "../hooks/useAuth";\nimport { useLanguage } from "../context/LanguageContext";'
  );
}

// In ServiceGridCard: use useLanguage and t
const oldServiceGridCard = `const ServiceGridCard = React.memo<{
  item: ServiceQuickGridItem;
  onPress: (route: string) => void;
}>(({ item, onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.serviceCard,
        pressed && styles.serviceCardPressed,
      ]}
      onPress={() => onPress(item.route)}
    >
      <View style={styles.serviceIconContainer}>
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.serviceIconGradient}
        >
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </LinearGradient>
        {item.tag && (
          <View style={styles.serviceMiniTag}>
            <Text style={styles.serviceMiniTagText}>{item.tag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.serviceCardTitle} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={styles.serviceCardSubtitle} numberOfLines={1}>
        {item.sublabel}
      </Text>
    </Pressable>
  );
});`;

const newServiceGridCard = `const ServiceGridCard = React.memo<{
  item: ServiceQuickGridItem;
  onPress: (route: string) => void;
}>(({ item, onPress }) => {
  const { t } = useLanguage();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.serviceCard,
        pressed && styles.serviceCardPressed,
      ]}
      onPress={() => onPress(item.route)}
    >
      <View style={styles.serviceIconContainer}>
        <LinearGradient
          colors={item.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.serviceIconGradient}
        >
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </LinearGradient>
        {item.tag && (
          <View style={styles.serviceMiniTag}>
            <Text style={styles.serviceMiniTagText}>{item.tag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.serviceCardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {t(item.id, item.label)}
      </Text>
      <Text style={styles.serviceCardSubtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {t(item.sublabel, item.sublabel)}
      </Text>
    </Pressable>
  );
});`;

code = code.replace(oldServiceGridCard, newServiceGridCard);

// In HomeScreen component: add const { t } = useLanguage();
code = code.replace(
  'const { user } = useAuth();',
  'const { user } = useAuth();\n  const { t } = useLanguage();'
);

// In quickGridHeader:
code = code.replace(
  '<Text style={styles.quickGridTitle}>Explore Services</Text>\n              <Text style={styles.quickGridSubtitle}>All-in-one travel platform</Text>',
  '<Text style={styles.quickGridTitle} numberOfLines={1}>{t("exploreServices", "Explore Services")}</Text>\n              <Text style={styles.quickGridSubtitle} numberOfLines={1}>{t("allInOnePlatform", "All-in-one travel platform")}</Text>'
);

// In search input placeholder:
code = code.replace(
  '{searchQuery ? `Searching "${searchQuery}"` : "Where are you going?"}',
  '{searchQuery ? `Searching "${searchQuery}"` : t("Where to?", "Where are you going?")}'
);

fs.writeFileSync('src/screens/HomeScreen.tsx', code, 'utf8');
console.log('Successfully updated HomeScreen.tsx');
