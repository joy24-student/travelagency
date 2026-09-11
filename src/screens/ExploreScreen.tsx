import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
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

import {
  weatherAssistantService,
  scamDetectionService,
  reviewAnalyzerService,
  budgetPlannerService,
} from "../services/ai";
import { searchRepository } from "../services/repositories";
import { BottomNav, AiPill } from "./Navigation";
import { TopBar } from "./TopBar";
import type { UIScreen } from "../data/screens";

const PRIMARY = "#287dfa";

const DESTINATIONS_DEFAULT: any[] = [
  // ... existing defaults
];

export function ExploreScreen({ screen }: { screen: UIScreen }) {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [selectedDest, setSelectedDest] = useState<any | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [scamData, setScamData] = useState<any[]>([]);

  // Load destinations from Repository
  useEffect(() => {
    const loadDestinations = async () => {
      try {
        setLoadingDestinations(true);
        // Using searchRepository for consistency
        const data = await searchRepository.searchTours({}); // In a real app we'd have searchDestinations
        
        if (data && data.length > 0) {
          setDestinations(data.map((d: any) => ({
            ...d,
            name: d.title || d.name,
            hero: d.image_url || (d.image_urls && d.image_urls[0]),
            gallery: d.image_urls || [],
            attractions: d.highlights || [],
            activities: d.included_services || [],
            safetyScore: d.rating ? d.rating * 20 : 80,
            bestSeason: "Nov - Mar",
            avgBudget: `$${d.price}`,
          })));
        }
      } catch (err) {
        console.error("Error loading destinations:", err);
      } finally {
        setLoadingDestinations(false);
      }
    };

    loadDestinations();
  }, []);

  const loadWeather = async (dest: (typeof DESTINATIONS_DEFAULT)[0]) => {
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

  const loadBudget = async (dest: (typeof DESTINATIONS_DEFAULT)[0]) => {
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

  const loadReviews = async (dest: (typeof DESTINATIONS_DEFAULT)[0]) => {
    setLoading(true);
    try {
      const res = await reviewAnalyzerService.analyze({
        entityName: dest.name,
        entityType: "destination",
        reviews: dest.reviews,
      });
      setReviewData(res.data);
    } catch {
      setReviewData(null);
    }
    setLoading(false);
  };

const loadScams = async (dest: (typeof DESTINATIONS_DEFAULT)[0]) => {
     setLoading(true);
     try {
       const scams = await scamDetectionService.getCommonScams(dest.name);
       setScamData(scams);
     } catch {
       setScamData([]);
     }
     setLoading(false);
   };

   const openDest = (dest: (typeof DESTINATIONS_DEFAULT)[0]) => {
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
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 20 }} />
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
                <Image key={i} source={{ uri: img }} style={s.galleryImg} />
              ))}
            </View>
          )}

          {!loading && activeTab === "weather" && weatherData && (
            <View style={s.section}>
              <InfoCard
                icon="thermometer"
                label="Avg Temperature"
                value={weatherData.avgTemperature}
              />
              <InfoCard
                icon="cloud"
                label="Conditions"
                value={weatherData.conditions}
              />
              <InfoCard
                icon="star"
                label="Overall Rating"
                value={weatherData.overallRating?.toUpperCase()}
              />
              <SectionBlock title="Packing Tips">
                {weatherData.packingTips?.map((t: string, i: number) => (
                  <Text key={i} style={s.bulletItem}>
                    • {t}
                  </Text>
                ))}
              </SectionBlock>
              <SectionBlock title="Best Activities">
                {weatherData.bestActivities?.map((a: string, i: number) => (
                  <Chip key={i} label={a} />
                ))}
              </SectionBlock>
              {weatherData.weatherWarnings?.length > 0 && (
                <SectionBlock title="⚠️ Weather Warnings">
                  {weatherData.weatherWarnings.map((w: string, i: number) => (
                    <Text key={i} style={[s.bulletItem, { color: "#ef4444" }]}>
                      ⚠ {w}
                    </Text>
                  ))}
                </SectionBlock>
              )}
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
                  <View key={i} style={s.budgetRow}>
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
                  <Text key={i} style={s.bulletItem}>
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
                  <Text key={i} style={[s.bulletItem, { color: "#10b981" }]}>
                    ✓ {p}
                  </Text>
                ))}
              </SectionBlock>
              <SectionBlock title="Common Complaints">
                {reviewData.topComplaints?.map((c: string, i: number) => (
                  <Text key={i} style={[s.bulletItem, { color: "#ef4444" }]}>
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
                    <Text key={i} style={s.bulletItem}>
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

        <BottomNav active="Home" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.shell}>
      <TopBar screen={screen} />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.exploreTitle}>Explore Destinations</Text>
        <Text style={s.exploreSub}>Tap a destination to see full details</Text>
        {loadingDestinations ? (
          <ActivityIndicator color={PRIMARY} size="large" style={{ marginTop: 40 }} />
        ) : (
          destinations.map((dest) => (
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
      <AiPill color={PRIMARY} />
      <BottomNav active="Home" color={PRIMARY} />
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
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{title}</Text>
      <View style={s.blockBody}>{children}</View>
    </View>
  );
}

function Chip({ label, color = PRIMARY }: { label: string; color?: string }) {
  return (
    <View
      style={[
        s.chip,
        { backgroundColor: `${color}12`, borderColor: `${color}22` },
      ]}
    >
      <Text style={[s.chipText, { color }]}>{label}</Text>
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
  return (
    <View style={s.infoCard}>
      <Ionicons name={icon as any} size={20} color={PRIMARY} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
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
  exploreCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    height: 220,
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
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
