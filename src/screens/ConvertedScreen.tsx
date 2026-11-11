import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { UIScreen } from "../data/screens";
import { TopBar } from "./TopBar";
import { BottomNav, AiPill } from "./Navigation";
import { useScreenData } from "../hooks/useScreenData";
import { useLanguage } from "../context/LanguageContext";

const themeMap = {
  trip: {
    bg: "#f5f7fa",
    primary: "#287dfa",
    accent: "#ff7d00",
    text: "#333333",
    soft: "#e8f3ff",
  },
  luxe: {
    bg: "#f8f9fa",
    primary: "#000666",
    accent: "#fed65b",
    text: "#191c1d",
    soft: "#e0e0ff",
  },
};

const bottomTabs = [
  { label: "Home", icon: "home-outline" },
  { label: "Messages", icon: "chatbubble-ellipses-outline" },
  { label: "Post", icon: "add-circle-outline" },
  { label: "My Trips", icon: "receipt-outline" },
  { label: "Account", icon: "person-outline" },
] as const;

export function ConvertedScreen({ screen }: { screen: UIScreen }) {
  const theme = themeMap[screen.theme];
  const { t, formatPrice } = useLanguage();
  const { data, loading, error } = useScreenData(screen);

  // Map dynamic data to cards if available
  const dynamicCards = data && Array.isArray(data) && data.length > 0 ? data.map((item: any) => {
    const rawPrice = item.price || item.final_price || item.base_price;
    return {
      title: item.name || item.title || item.hotel_name || (item.flight_number ? `Flight ${item.flight_number}` : "Featured Option"),
      subtitle: item.description || item.destination_city || (item.departure_airport && item.arrival_airport ? `${item.departure_airport.code || 'DEP'} âž” ${item.arrival_airport.code || 'ARR'}` : item.bio || ""),
      meta: item.city || item.category || (item.rating ? `â­ ${item.rating}` : "") || (item.cabin_class ? `Class: ${item.cabin_class}` : ""),
      price: rawPrice ? formatPrice(rawPrice) : "",
      route: "/screens/booking-system",
    };
  }) : null;

  const displayCards = dynamicCards || null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <TopBar screen={screen} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Hero screen={screen} />
        <View style={styles.pageStack}>
          {loading && !displayCards ? (
            <ActivityIndicator color={theme.primary} size="large" style={{ marginVertical: 40 }} />
          ) : null}

          {screen.tabs ? (
            <TabCard tabs={screen.tabs} color={theme.primary} />
          ) : null}
          {screen.chips ? (
            <ChipRail chips={screen.chips} color={theme.primary} />
          ) : null}
          {screen.fields ? (
            <SearchCard fields={screen.fields} color={theme.primary} screenSlug={screen.slug} />
          ) : null}
          {screen.actions ? (
            <ActionGrid actions={screen.actions} color={theme.primary} />
          ) : null}
          {screen.benefits ? (
            <BenefitCard benefits={screen.benefits} color={theme.primary} />
          ) : null}
          {screen.kind === "assistant" ? (
            <AssistantBlocks screen={screen} color={theme.primary} />
          ) : null}
          {screen.image ? (
            <ImageFeature
              image={screen.image}
              title={screen.title}
            />
          ) : null}
          {displayCards ? (
            <ContentCards cards={displayCards} color={theme.primary} />
          ) : null}

          {error ? (
            <Text style={{ color: 'red', textAlign: 'center', margin: 20 }}>
              Connect failed: {error.message}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      {screen.kind !== "settings" ? <AiPill color={theme.primary} /> : null}
      <BottomNav active={screen.activeTab ?? "Home"} color={theme.primary} />
    </SafeAreaView>
  );
}

function TopBar_Old({ screen }: { screen: UIScreen }) {
  const theme = themeMap[screen.theme];

  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        style={styles.iconButton}
      >
        <Ionicons color={theme.text} name="chevron-back" size={22} />
      </Pressable>
      <View style={styles.topTitleWrap}>
        <Text numberOfLines={1} style={styles.sourceText}>
          {screen.source}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.topTitle, { color: theme.text }]}
        >
          {screen.title}
        </Text>
      </View>
      <View
        style={[styles.profileDot, { backgroundColor: `${theme.primary}18` }]}
      >
        <Ionicons color={theme.primary} name="ellipsis-horizontal" size={21} />
      </View>
    </View>
  );
}

function Hero({ screen }: { screen: UIScreen }) {
  const theme = themeMap[screen.theme];
  const { t } = useLanguage();
  const colors: [string, string] =
    screen.theme === "luxe" ? ["#1a237e", "#000666"] : ["#e8f3ff", "#f5f7fa"];
  const isAssistant = screen.kind === "assistant";

  return (
    <LinearGradient
      colors={colors}
      style={[styles.heroWrap, isAssistant && styles.assistantHero]}
    >
      {screen.hero ? (
        <Image
          source={{ uri: screen.hero }}
          resizeMode="cover"
          style={[styles.heroImage, isAssistant && styles.heroImageDim]}
        />
      ) : null}
      <LinearGradient
        colors={
          screen.hero
            ? ["transparent", "rgba(0,0,0,0.58)"]
            : ["transparent", "transparent"]
        }
        style={styles.heroOverlay}
      >
        <View style={styles.brandRow}>
          <Text
            style={[
              styles.brandText,
              { color: isAssistant ? "#fed65b" : theme.primary },
            ]}
          >
            {screen.theme === "luxe" ? "LuxeStay" : "Trip.com"}
          </Text>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        </View>
        <Text
          style={[
            styles.heroTitle,
            { color: screen.hero ? "#fff" : theme.text },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {t(screen.title, screen.title)}
        </Text>
        <Text
          style={[
            styles.heroSubtitle,
            { color: screen.hero ? "rgba(255,255,255,0.86)" : "#666" },
          ]}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {t(screen.subtitle, screen.subtitle)}
        </Text>
      </LinearGradient>
    </LinearGradient>
  );
}

function TabCard({ tabs, color }: { tabs: string[]; color: string }) {
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
}

function SearchCard({ fields, color, screenSlug }: { fields: string[]; color: string; screenSlug?: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.card}>
      {fields.map((field, index) => (
        <Pressable
          key={`${field}-${index}`}
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
}

function ChipRail({ chips, color }: { chips: string[]; color: string }) {
  const { t } = useLanguage();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View
            key={chip}
            style={[
              styles.chip,
              { backgroundColor: `${color}12`, borderColor: `${color}22` },
            ]}
          >
            <Text style={[styles.chipText, { color }]} numberOfLines={1}>{t(chip, chip)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ActionGrid({ actions, color }: { actions: any[]; color: string }) {
  return (
    <View style={styles.actionGrid}>
      {actions.slice(0, 4).map((action) => {
        const label = typeof action === 'string' ? action : action.label;
        const route = action.route || `/screens/${label.toLowerCase().replace(/ /g, '-')}`;

        return (
          <Pressable
            key={label}
            onPress={() => router.push(route as any)}
            style={styles.actionItem}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${color}12` }]}>
              <Ionicons color={color} name={iconFor(label)} size={23} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BenefitCard({
  benefits,
  color,
}: {
  benefits: string[];
  color: string;
}) {
  const [claimed, setClaimed] = useState(false);

  return (
    <View style={styles.benefitCard}>
      <View style={styles.benefitHeader}>
        <Text style={styles.benefitTitle}>New user benefits</Text>
        <Pressable
          onPress={() => {
            setClaimed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        >
          <Text style={[styles.claimButton, { backgroundColor: claimed ? "#10b981" : color }]}>
            {claimed ? "Claimed âœ“" : "Claim All"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.benefitGrid}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitPill}>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ImageFeature({ image, title }: { image: string; title: string }) {
  return (
    <View style={styles.imageFeature}>
      <Image
        source={{ uri: image }}
        resizeMode="cover"
        style={styles.featureImage}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.featureOverlay}
      >
        <Text style={styles.featureTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );
}

function AssistantBlocks({
  screen,
  color,
}: {
  screen: UIScreen;
  color: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>Intelligence Hub</Text>
      <ChipRail chips={screen.chips ?? []} color={color} />
    </View>
  );
}

function CommunityPost({ screen, color }: { screen: UIScreen; color: string }) {
  if (!screen.hero) return null;

  return (
    <View style={styles.communityCard}>
      <Image
        source={{ uri: screen.hero }}
        resizeMode="cover"
        style={styles.communityImage}
      />
      <View style={styles.communityBody}>
        <Text style={[styles.communityMeta, { color }]}>
          Julianna V. | Influencer
        </Text>
        <Text style={styles.communityTitle}>
          {screen.cards?.[0]?.title ?? "Travel Community"}
        </Text>
        <Text style={styles.communityCopy}>
          Book this experience and save it to your trip board.
        </Text>
      </View>
    </View>
  );
}

function ContentCards({
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
          key={`${card.title}-${index}`}
          onPress={() => {
            if (card.route) {
              router.push(card.route as any);
            } else {
              router.push("/screens/booking-system" as any);
            }
          }}
          style={styles.contentCard}
        >
          <View style={[styles.contentIcon, { backgroundColor: `${color}12` }]}>
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
}

function AiPill_Old({ color }: { color: string }) {
  return (
    <View style={styles.aiWrap} pointerEvents="none">
      <View style={styles.aiPill}>
        <View style={[styles.aiDot, { backgroundColor: color }]} />
        <Text style={styles.aiText}>Ask AI or hold to speak</Text>
      </View>
    </View>
  );
}

function BottomNav_Old({ active, color }: { active: string; color: string }) {
  return (
    <View style={styles.bottomNav}>
      {bottomTabs.map((tab) => {
        const selected = tab.label === active;
        return (
          <View key={tab.label} style={styles.bottomItem}>
            <Ionicons
              color={selected ? color : "#9ca3af"}
              name={tab.icon}
              size={23}
            />
            <Text
              style={[
                styles.bottomLabel,
                { color: selected ? color : "#6b7280" },
              ]}
            >
              {tab.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function iconFor(label: string): keyof typeof Ionicons.glyphMap {
  const value = label.toLowerCase();
  if (value.includes("flight")) return "airplane-outline";
  if (
    value.includes("hotel") ||
    value.includes("home") ||
    value.includes("stay")
  )
    return "bed-outline";
  if (value.includes("train")) return "train-outline";
  if (value.includes("car")) return "car-outline";
  if (
    value.includes("tour") ||
    value.includes("destination") ||
    value.includes("explore")
  )
    return "map-outline";
  if (value.includes("date") || value.includes("booking"))
    return "calendar-outline";
  if (value.includes("alert") || value.includes("notification"))
    return "notifications-outline";
  if (
    value.includes("message") ||
    value.includes("support") ||
    value.includes("chat")
  )
    return "chatbubble-outline";
  if (
    value.includes("account") ||
    value.includes("member") ||
    value.includes("guest")
  )
    return "person-outline";
  if (
    value.includes("reward") ||
    value.includes("silver") ||
    value.includes("benefit")
  )
    return "ribbon-outline";
  if (
    value.includes("budget") ||
    value.includes("payment") ||
    value.includes("price")
  )
    return "card-outline";
  if (value.includes("ai") || value.includes("planner"))
    return "sparkles-outline";
  if (value.includes("setting") || value.includes("security"))
    return "settings-outline";
  if (value.includes("language")) return "language-outline";
  return "compass-outline";
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 116,
  },
  pageStack: {
    gap: 16,
    paddingHorizontal: 16,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomColor: "rgba(0,0,0,0.05)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#f2f4f7",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  topTitleWrap: {
    flex: 1,
  },
  sourceText: {
    color: "#98a2b3",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileDot: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  heroWrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    minHeight: 248,
    overflow: "hidden",
  },
  assistantHero: {
    minHeight: 330,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  heroImageDim: {
    opacity: 0.72,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  brandText: {
    fontSize: 18,
    fontStyle: "italic",
    fontWeight: "900",
  },
  avatar: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  tabScrollRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
  },
  tabRow: {
    borderBottomColor: "#f2f4f7",
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  tabItem: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "800",
  },
  fieldRow: {
    alignItems: "center",
    borderBottomColor: "#f2f4f7",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
  },
  fieldText: {
    color: "#333",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  searchButton: {
    borderRadius: 18,
    marginTop: 16,
    paddingVertical: 15,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionGrid: {
    backgroundColor: "#fff",
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  actionItem: {
    alignItems: "center",
    gap: 7,
    width: "25%",
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionLabel: {
    color: "#475467",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  benefitCard: {
    backgroundColor: "#fff1f3",
    borderColor: "#ffe4e8",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  benefitHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  benefitTitle: {
    color: "#f0446b",
    fontSize: 18,
    fontWeight: "900",
  },
  claimButton: {
    borderRadius: 999,
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  benefitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  benefitPill: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  benefitText: {
    color: "#f0446b",
    fontSize: 13,
    fontWeight: "900",
  },
  imageFeature: {
    borderRadius: 24,
    height: 230,
    overflow: "hidden",
  },
  featureImage: {
    height: "100%",
    width: "100%",
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 18,
  },
  featureTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  communityCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
  },
  communityImage: {
    height: 300,
    width: "100%",
  },
  communityBody: {
    padding: 16,
  },
  communityMeta: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  communityTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  communityCopy: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  contentStack: {
    gap: 12,
  },
  contentCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    padding: 15,
  },
  contentIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  contentText: {
    flex: 1,
  },
  contentTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  contentSubtitle: {
    color: "#667085",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  contentMeta: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "900",
  },
  aiWrap: {
    alignItems: "center",
    bottom: 78,
    left: 0,
    position: "absolute",
    right: 0,
  },
  aiPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "#dbeafe",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  aiDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  aiText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "800",
  },
  bottomNav: {
    backgroundColor: "#fff",
    borderTopColor: "#eef2f7",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingBottom: 16,
    paddingTop: 10,
    position: "absolute",
    right: 0,
  },
  bottomItem: {
    alignItems: "center",
    gap: 3,
  },
  bottomLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
});
