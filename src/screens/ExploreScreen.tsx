import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  weatherAssistantService,
  scamDetectionService,
  reviewAnalyzerService,
  budgetPlannerService,
} from "../services/ai";
import { searchRepository } from "../services/repositories";

import { TopBar } from "./TopBar";
import { screens, type UIScreen } from "../data/screens";
import * as Haptics from "expo-haptics";
import { useDebounce } from "../hooks/useDebounce";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";
import { ListSkeleton, CardSkeleton, ErrorStateCard, EmptyStateView } from "../components/common";
import { WeatherWidget } from "../components/weather/WeatherWidget";

const PRIMARY = "#287dfa";

export function ExploreScreen({ screen }: { screen?: UIScreen } = {}) {
  const { colors, isDark } = useTheme();
  const activeScreen = screen ?? screens.find((s) => s.slug === "explore") ?? screens[0];
  const [destinations, setDestinations] = useState<any[]>([]);
  const [selectedDest, setSelectedDest] = useState<any | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destError, setDestError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Top Rated" | "Budget" | "Popular">("All");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [scamData, setScamData] = useState<any[]>([]);

  // Load destinations from Supabase repository
  const loadDestinations = async () => {
    try {
      setLoadingDestinations(true);
      setDestError(null);
      const data = await searchRepository.getDestinations();
      
      if (data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          ...d,
          name: d.name || d.city || d.title,
          hero: d.cover_image_url || d.image_url || (Array.isArray(d.image_urls) ? d.image_urls[0] : null) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
          gallery: Array.isArray(d.image_urls) ? d.image_urls : (d.images || []),
          attractions: Array.isArray(d.popular_attractions) ? d.popular_attractions : (Array.isArray(d.highlights) ? d.highlights : ["Scenic Viewpoint", "Historic Center", "Local Cuisine"]),
          activities: Array.isArray(d.recommended_activities) ? d.recommended_activities : (Array.isArray(d.included_services) ? d.included_services : ["Sightseeing", "Walking Tour", "Photography"]),
          safetyScore: d.safety_rating ? Math.round(Number(d.safety_rating) * 20) : (d.rating ? Math.round(Number(d.rating) * 20) : 92),
          bestSeason: d.best_travel_months || "Nov - Mar",
          avgBudget: d.average_daily_budget ? `$${d.average_daily_budget}` : "$120",
        }));
        setDestinations(mapped);
      } else {
        setDestinations([]);
      }
    } catch (err: any) {
      console.error("Error loading destinations:", err);
      setDestError(err?.message || "Failed to load destinations. Please try again.");
      setDestinations([]);
    } finally {
      setLoadingDestinations(false);
    }
  };

  useEffect(() => {
    loadDestinations();
  }, []);

  const filteredDestinations = useMemo(() => {
    let list = [...destinations];
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.country?.toLowerCase().includes(q) ||
          d.city?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter === "Top Rated") {
      list = list.filter((d) => d.safetyScore >= 90);
    } else if (categoryFilter === "Budget") {
      list = list.filter((d) => {
        const num = parseInt(d.avgBudget?.replace(/[^0-9]/g, "") || "120", 10);
        return num <= 100;
      });
    } else if (categoryFilter === "Popular") {
      list = list.filter((d) => (d.attractions?.length || 0) >= 3);
    }
    return list;
  }, [destinations, debouncedSearchQuery, categoryFilter]);

  const loadWeather = async (dest: any) => {
    setLoading(true);
    try {
      const res = await weatherAssistantService.forecast({
        destination: dest.name,
        travelDate: "2025-12-01",
        durationDays: 5,
      });
      setWeatherData(res.data);
    } catch {
      setWeatherData(null);
    }
    setLoading(false);
  };

  const loadBudget = async (dest: any) => {
    setLoading(true);
    try {
      const res = await budgetPlannerService.plan({
        destination: dest.name,
        durationDays: 5,
        travelers: 2,
        totalBudget: 500,
        currency: "USD",
        travelStyle: "mid-range",
      });
      setBudgetData(res.data);
    } catch {
      setBudgetData(null);
    }
    setLoading(false);
  };

  const loadReviews = async (dest: any) => {
    setLoading(true);
    try {
      const res = await reviewAnalyzerService.analyze({
        entityName: dest.name,
        entityType: "destination",
        reviews: dest.reviews || [],
      });
      setReviewData(res.data);
    } catch {
      setReviewData(null);
    }
    setLoading(false);
  };

  const loadScams = async (dest: any) => {
    setLoading(true);
    try {
      const scams = await scamDetectionService.getCommonScams(dest.name);
      setScamData(scams);
    } catch {
      setScamData([]);
    }
    setLoading(false);
  };

  const openDest = (dest: any) => {
    setSelectedDest(dest);
    setActiveTab("overview");
    setWeatherData(null);
    setBudgetData(null);
    setReviewData(null);
    setScamData([]);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (!selectedDest) return;
    if (tab === "weather" && !weatherData) loadWeather(selectedDest);
    if (tab === "budget" && !budgetData) loadBudget(selectedDest);
    if (tab === "reviews" && !reviewData) loadReviews(selectedDest);
    if (tab === "safety" && !scamData.length) loadScams(selectedDest);
  };

  if (selectedDest) {
    return (
      <SafeAreaView style={s.shell}>
        <View style={s.destHeader}>
          <Pressable onPress={() => setSelectedDest(null)} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.destHeaderTitle}>{selectedDest.name}</Text>
        </View>

        <Image source={{ uri: selectedDest.hero }} style={s.destHero} />

        {/* Live Weather & Meteorological Advisory Banner */}
        <WeatherWidget location={selectedDest.name} variant="banner" style={{ marginHorizontal: 16 }} />

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabBar}
          contentContainerStyle={s.tabContent}
        >
          {(
            [
              "overview",
              "gallery",
              "weather",
              "budget",
              "reviews",
              "safety",
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => handleTabChange(tab)}
              style={[s.tab, activeTab === tab && s.tabActive]}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.tabBody}
        >
          {loading && (
            <View style={{ marginVertical: 16 }}>
              <CardSkeleton />
            </View>
          )}

          {!loading && activeTab === "overview" && (
            <View style={s.section}>
              <Text style={s.h2}>{selectedDest.tagline}</Text>
              <Text style={s.metaRow}>
                📍 {selectedDest.country} · Best: {selectedDest.bestSeason}
              </Text>
              <Text style={s.metaRow}>
                💰 Avg budget: {selectedDest.avgBudget}
              </Text>

              {/* Real-time Weather & Climate Snapshot */}
              <WeatherWidget location={selectedDest.name} variant="compact" />

              <SectionBlock title="Top Attractions">
                {selectedDest.attractions.map((a: string) => (
                  <Chip key={a} label={a} />
                ))}
              </SectionBlock>
              <SectionBlock title="Activities">
                {selectedDest.activities.map((a: string) => (
                  <Chip key={a} label={a} color="#10b981" />
                ))}
              </SectionBlock>
              <SectionBlock title="Recommended Restaurants">
                {selectedDest.restaurants.map((r: string) => (
                  <View key={r} style={s.listRow}>
                    <Ionicons
                      name="restaurant-outline"
                      size={16}
                      color={PRIMARY}
                    />
                    <Text style={s.listText}>{r}</Text>
                  </View>
                ))}
              </SectionBlock>
            </View>
          )}

          {!loading && activeTab === "gallery" && (
            <View style={s.galleryGrid}>
              {selectedDest.gallery.map((img: string, i: number) => (
                <Image key={`gallery-${img}-${i}`} source={{ uri: img }} style={s.galleryImg} />
              ))}
            </View>
          )}

          {!loading && activeTab === "weather" && (
            <View style={s.section}>
              {/* Real-time Multi-Source Meteorological Dashboard */}
              <WeatherWidget location={selectedDest.name} variant="card" />
            </View>
          )}

          {!loading && activeTab === "budget" && budgetData && (
            <View style={s.section}>
              <InfoCard
                icon="cash"
                label="Total Budget"
                value={`${budgetData.currency} ${budgetData.totalBudget}`}
              />
              <InfoCard
                icon="person"
                label="Per Person/Day"
                value={`${budgetData.currency} ${budgetData.perPersonPerDay}`}
              />
              <SectionBlock title="Budget Breakdown">
                {budgetData.breakdown?.map((b: any, i: number) => (
                  <View key={`budget-${b.category || i}`} style={s.budgetRow}>
                    <Text style={s.budgetCat}>{b.category}</Text>
                    <Text style={s.budgetAmt}>
                      {budgetData.currency} {b.estimated}
                    </Text>
                    <View style={s.budgetBar}>
                      <View
                        style={[s.budgetFill, { width: `${b.percentage}%` }]}
                      />
                    </View>
                  </View>
                ))}
              </SectionBlock>
              <SectionBlock title="Saving Tips">
                {budgetData.savingTips?.map((t: string, i: number) => (
                  <Text key={`tip-${i}`} style={s.bulletItem}>
                    💡 {t}
                  </Text>
                ))}
              </SectionBlock>
            </View>
          )}

          {!loading && activeTab === "reviews" && reviewData && (
            <View style={s.section}>
              <InfoCard
                icon="star"
                label="Overall Sentiment"
                value={reviewData.overallSentiment
                  ?.replace("_", " ")
                  .toUpperCase()}
              />
              <InfoCard
                icon="checkmark-circle"
                label="Trust Score"
                value={`${reviewData.trustworthiness}/10`}
              />
              <Text style={s.reviewSummary}>{reviewData.summary}</Text>
              <SectionBlock title="What People Love">
                {reviewData.topPraises?.map((p: string, i: number) => (
                  <Text key={`praise-${i}`} style={[s.bulletItem, { color: "#10b981" }]}>
                    ✓ {p}
                  </Text>
                ))}
              </SectionBlock>
              <SectionBlock title="Common Complaints">
                {reviewData.topComplaints?.map((c: string, i: number) => (
                  <Text key={`complaint-${i}`} style={[s.bulletItem, { color: "#ef4444" }]}>
                    ✗ {c}
                  </Text>
                ))}
              </SectionBlock>
              <Text
                style={[s.reviewSummary, { color: PRIMARY, fontWeight: "800" }]}
              >
                {reviewData.recommendation}
              </Text>
            </View>
          )}

          {!loading && activeTab === "safety" && (
            <View style={s.section}>
              <InfoCard
                icon="shield-checkmark"
                label="Safety Score"
                value={`${selectedDest.safetyScore}/100`}
              />
              <SectionBlock title="🚨 Common Scams to Avoid">
                {scamData.length ? (
                  scamData.map((sc: string, i: number) => (
                    <Text key={`scam-${i}`} style={s.bulletItem}>
                      ⚠ {sc}
                    </Text>
                  ))
                ) : (
                  <Text style={s.mutedText}>
                    Load safety tips by switching to this tab.
                  </Text>
                )}
              </SectionBlock>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.shell, { backgroundColor: colors.background }]}>
      <TopBar screen={activeScreen} />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text
          style={[
            s.exploreTitle,
            { color: colors.text, fontFamily: FONTS.bengali.bold },
          ]}
        >
          Explore Destinations
        </Text>
        <Text
          style={[
            s.exploreSub,
            { color: colors.textSecondary, fontFamily: FONTS.bengali.regular },
          ]}
        >
          Tap a destination to see full details
        </Text>

        {/* 300ms Debounced Search Bar */}
        <View
          style={[
            s.searchContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginEnd: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by destination or country..."
            placeholderTextColor={colors.textMuted}
            style={[
              s.searchInput,
              { color: colors.text, fontFamily: FONTS.bengali.regular },
            ]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Persistent Category Filter Chips */}
        <View style={s.chipsRow}>
          {(["All", "Top Rated", "Budget", "Popular"] as const).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategoryFilter(cat);
                }}
                style={[
                  s.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    s.filterChipText,
                    { color: active ? "#FFFFFF" : colors.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loadingDestinations ? (
          <View style={{ marginTop: 16 }}>
            <ListSkeleton count={3} type="card" />
          </View>
        ) : destError ? (
          <View style={{ marginTop: 20 }}>
            <ErrorStateCard
              title="Unable to load destinations"
              message={destError}
              onRetry={loadDestinations}
            />
          </View>
        ) : filteredDestinations.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyStateView
              title="No destinations found"
              description="Try adjusting your search query or selecting a different category."
              actionText="Reset Search"
              onAction={() => {
                setSearchQuery("");
                setCategoryFilter("All");
              }}
              icon="compass-outline"
            />
          </View>
        ) : (
          filteredDestinations.map((dest) => (
            <Pressable
              key={dest.name}
              onPress={() => openDest(dest)}
              style={s.exploreCard}
            >
              <Image source={{ uri: dest.hero }} style={s.exploreImg} />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={s.exploreOverlay}
              >
                <Text style={s.exploreName}>{dest.name}</Text>
                <Text style={s.exploreCountry}>
                  {dest.country} · {dest.avgBudget}
                </Text>
                <View style={s.exploreBadges}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      🖼 {dest.attractions.length} attractions
                    </Text>
                  </View>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>🛡 {dest.safetyScore}% safe</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={s.block}>
      <Text style={[s.blockTitle, { color: colors.text, fontFamily: FONTS.bengali.bold }]}>
        {title}
      </Text>
      <View style={s.blockBody}>{children}</View>
    </View>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  const { colors } = useTheme();
  const chipColor = color || colors.primary;
  return (
    <View
      style={[
        s.chip,
        { backgroundColor: colors.primaryLight, borderColor: chipColor },
      ]}
    >
      <Text style={[s.chipText, { color: chipColor }]}>{label}</Text>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle, borderWidth: 1 }]}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[s.infoValue, { color: colors.text, fontFamily: FONTS.bengali.bold }]}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { padding: 16, paddingBottom: 100 },
  destHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    padding: 14,
    gap: 10,
  },
  backBtn: { padding: 4 },
  destHeaderTitle: { color: "#fff", fontSize: 18, fontWeight: "900", flex: 1 },
  destHero: { width: "100%", height: 200 },
  tabBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  tabContent: { paddingHorizontal: 12, gap: 4 },
  tab: { paddingVertical: 12, paddingHorizontal: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, color: "#667085", fontWeight: "700" },
  tabTextActive: { color: PRIMARY },
  tabBody: { padding: 16, paddingBottom: 100 },
  section: { gap: 12 },
  h2: { fontSize: 18, fontWeight: "900", color: "#111827" },
  metaRow: { fontSize: 13, color: "#667085" },
  block: { marginTop: 8 },
  blockTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  blockBody: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  listText: { fontSize: 14, color: "#333" },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryImg: { width: "48%", height: 140, borderRadius: 12 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 12, color: "#667085" },
  infoValue: { fontSize: 15, fontWeight: "900", color: "#111827" },
  bulletItem: { fontSize: 13, color: "#374151", lineHeight: 20 },
  budgetRow: { marginBottom: 10 },
  budgetCat: { fontSize: 13, fontWeight: "700", color: "#374151" },
  budgetAmt: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "800",
    marginBottom: 4,
  },
  budgetBar: { height: 4, backgroundColor: "#e5e7eb", borderRadius: 2 },
  budgetFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  reviewSummary: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
    marginVertical: 4,
  },
  mutedText: { color: "#9ca3af", fontSize: 13 },
  exploreTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  exploreSub: { fontSize: 13, color: "#667085", marginBottom: 16 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  exploreCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    minHeight: 220,
  },
  exploreImg: { width: "100%", height: "100%" },
  exploreOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 16,
  },
  exploreName: { color: "#fff", fontSize: 22, fontWeight: "900" },
  exploreCountry: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  exploreBadges: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
