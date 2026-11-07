const fs = require('fs');
let code = fs.readFileSync('src/screens/ConvertedScreen.tsx', 'utf8');

// Replace Hero title & subtitle
code = code.replace(
  '<Text\n          style={[\n            styles.heroTitle,\n            { color: screen.hero ? "#fff" : theme.text },\n          ]}\n        >\n          {screen.title}\n        </Text>\n        <Text\n          style={[\n            styles.heroSubtitle,\n            { color: screen.hero ? "rgba(255,255,255,0.86)" : "#666" },\n          ]}\n        >\n          {screen.subtitle}\n        </Text>',
  '<Text\n          style={[\n            styles.heroTitle,\n            { color: screen.hero ? "#fff" : theme.text },\n          ]}\n          numberOfLines={2}\n          ellipsizeMode="tail"\n        >\n          {t(screen.title, screen.title)}\n        </Text>\n        <Text\n          style={[\n            styles.heroSubtitle,\n            { color: screen.hero ? "rgba(255,255,255,0.86)" : "#666" },\n          ]}\n          numberOfLines={3}\n          ellipsizeMode="tail"\n        >\n          {t(screen.subtitle, screen.subtitle)}\n        </Text>'
);

// Update TabCard to use useLanguage, ScrollView and t(tab, tab)
const oldTabCard = `function TabCard({ tabs, color }: { tabs: string[]; color: string }) {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <View style={styles.card}>
      <View style={styles.tabRow}>
        {tabs.map((tab, index) => {
          const isSelected = selectedTab === index;
          return (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(index)}
              style={[
                styles.tabItem,
                isSelected && { borderBottomColor: color, borderBottomWidth: 3 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isSelected ? color : "#667085", fontWeight: isSelected ? "700" : "500" },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}`;

const newTabCard = `function TabCard({ tabs, color }: { tabs: string[]; color: string }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const { t } = useLanguage();

  return (
    <View style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollRow}
      >
        {tabs.map((tab, index) => {
          const isSelected = selectedTab === index;
          return (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(index)}
              style={[
                styles.tabItem,
                isSelected && { borderBottomColor: color, borderBottomWidth: 3 },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tabText,
                  { color: isSelected ? color : "#667085", fontWeight: isSelected ? "700" : "500" },
                ]}
              >
                {t(tab, tab)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}`;

code = code.replace(oldTabCard, newTabCard);

// Update SearchCard to use t
const oldSearchCard = `function SearchCard({ fields, color, screenSlug }: { fields: string[]; color: string; screenSlug?: string }) {
  return (
    <View style={styles.card}>
      {fields.map((field, index) => (
        <Pressable
          key={\`\${field}-\${index}\`}
          style={styles.fieldRow}
          onPress={() => router.push({ pathname: "/screens/search" as any, params: { q: field } })}
        >
          <Ionicons color={color} name={iconFor(field)} size={20} />
          <Text style={styles.fieldText}>{field}</Text>
          <Ionicons color="#c8c8c8" name="chevron-forward" size={16} />
        </Pressable>
      ))}
      <Pressable
        onPress={() => {
          if (screenSlug === "booking-system") {
            router.push("/screens/booking-system" as any);
          } else {
            router.push({ pathname: "/screens/search" as any, params: { q: fields[0] || "" } });
          }
        }}
        style={[styles.searchButton, { backgroundColor: color }]}
      >
        <Text style={styles.searchButtonText}>Search Available</Text>
      </Pressable>
    </View>
  );
}`;

const newSearchCard = `function SearchCard({ fields, color, screenSlug }: { fields: string[]; color: string; screenSlug?: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      {fields.map((field, index) => (
        <Pressable
          key={\`\${field}-\${index}\`}
          style={styles.fieldRow}
          onPress={() => router.push({ pathname: "/screens/search" as any, params: { q: field } })}
        >
          <Ionicons color={color} name={iconFor(field)} size={20} />
          <Text style={styles.fieldText} numberOfLines={1}>{t(field, field)}</Text>
          <Ionicons color="#c8c8c8" name="chevron-forward" size={16} />
        </Pressable>
      ))}
      <Pressable
        onPress={() => {
          if (screenSlug === "booking-system") {
            router.push("/screens/booking-system" as any);
          } else {
            router.push({ pathname: "/screens/search" as any, params: { q: fields[0] || "" } });
          }
        }}
        style={[styles.searchButton, { backgroundColor: color }]}
      >
        <Text style={styles.searchButtonText} numberOfLines={1}>{t("Search Available", "Search Available")}</Text>
      </Pressable>
    </View>
  );
}`;

code = code.replace(oldSearchCard, newSearchCard);

// Update ChipRail to use t
const oldChipRail = `function ChipRail({ chips, color }: { chips: string[]; color: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View
            key={chip}
            style={[
              styles.chip,
              { backgroundColor: \`\${color}12\`, borderColor: \`\${color}22\` },
            ]}
          >
            <Text style={[styles.chipText, { color }]}>{chip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}`;

const newChipRail = `function ChipRail({ chips, color }: { chips: string[]; color: string }) {
  const { t } = useLanguage();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View
            key={chip}
            style={[
              styles.chip,
              { backgroundColor: \`\${color}12\`, borderColor: \`\${color}22\` },
            ]}
          >
            <Text style={[styles.chipText, { color }]} numberOfLines={1}>{t(chip, chip)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}`;

code = code.replace(oldChipRail, newChipRail);

// Update ContentCards to use t and numberOfLines
const oldContentCards = `function ContentCards({
  cards,
  color,
}: {
  cards: NonNullable<UIScreen["cards"]>;
  color: string;
}) {
  return (
    <View style={styles.contentStack}>
      {cards.map((card, index) => (
        <Pressable
          key={\`\${card.title}-\${index}\`}
          onPress={() => {
            if (card.route) {
              router.push(card.route as any);
            } else {
              router.push("/screens/booking-system" as any);
            }
          }}
          style={styles.contentCard}
        >
          <View style={[styles.contentIcon, { backgroundColor: \`\${color}12\` }]}>
            <Ionicons color={color} name={(card.icon as any) || iconFor(card.title)} size={24} />
          </View>
          <View style={styles.contentText}>
            <Text style={styles.contentTitle}>{card.title}</Text>
            {card.subtitle ? (
              <Text style={styles.contentSubtitle}>{card.subtitle}</Text>
            ) : null}
            {card.meta ? (
              <Text style={[styles.contentMeta, { color }]}>{card.meta}</Text>
            ) : null}
          </View>
          {card.price ? (
            <Text style={[styles.priceText, { color }]}>{card.price}</Text>
          ) : (
            <Ionicons color="#c8c8c8" name="chevron-forward" size={18} />
          )}
        </Pressable>
      ))}
    </View>
  );
}`;

const newContentCards = `function ContentCards({
  cards,
  color,
}: {
  cards: NonNullable<UIScreen["cards"]>;
  color: string;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.contentStack}>
      {cards.map((card, index) => (
        <Pressable
          key={\`\${card.title}-\${index}\`}
          onPress={() => {
            if (card.route) {
              router.push(card.route as any);
            } else {
              router.push("/screens/booking-system" as any);
            }
          }}
          style={styles.contentCard}
        >
          <View style={[styles.contentIcon, { backgroundColor: \`\${color}12\` }]}>
            <Ionicons color={color} name={(card.icon as any) || iconFor(card.title)} size={24} />
          </View>
          <View style={styles.contentText}>
            <Text style={styles.contentTitle} numberOfLines={1} ellipsizeMode="tail">{t(card.title, card.title)}</Text>
            {card.subtitle ? (
              <Text style={styles.contentSubtitle} numberOfLines={2} ellipsizeMode="tail">{t(card.subtitle, card.subtitle)}</Text>
            ) : null}
            {card.meta ? (
              <Text style={[styles.contentMeta, { color }]} numberOfLines={1}>{t(card.meta, card.meta)}</Text>
            ) : null}
          </View>
          {card.price ? (
            <Text style={[styles.priceText, { color }]} numberOfLines={1}>{card.price}</Text>
          ) : (
            <Ionicons color="#c8c8c8" name="chevron-forward" size={18} />
          )}
        </Pressable>
      ))}
    </View>
  );
}`;

code = code.replace(oldContentCards, newContentCards);

// Add tabScrollRow style
code = code.replace(
  'tabRow: {',
  'tabScrollRow: {\n    flexDirection: "row",\n    paddingHorizontal: 6,\n  },\n  tabRow: {'
);

fs.writeFileSync('src/screens/ConvertedScreen.tsx', code, 'utf8');
console.log('Successfully updated ConvertedScreen.tsx');
