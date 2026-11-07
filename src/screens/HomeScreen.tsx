import { FocusAwareStatusBar } from "../components/ui";
import { generateRealtimeChannelId } from "../utils/idGenerator";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";
import { TravelRepository } from "../repositories/travelRepository";
import { PromoExclusiveModal } from "../components/PromoExclusiveModal";
import { FeatureDiscoveryModal } from "../components/FeatureDiscoveryModal";
import { Badge, Skeleton } from "../components/ui";
import { UnifiedSearchCard } from "../components/search/UnifiedSearchCard";
import { savedItemsService } from "../services/savedItemsService";
import { formatPrice } from "../utils/currency";
import { withNetworkTimeout } from "../utils/networkTimeout";
import { useAppStateRefresh } from "../hooks/useAppStateRefresh";
import { networkStatusService } from "../services/network/networkStatusService";
import { ErrorStateCard, EmptyStateView, OptimizedImage } from "../components/common";
import { recommendationEngine } from "../services/ml/recommendationEngine";

const TRIP_BLUE = "#0055F2";
const TRIP_NAVY = "#0A2540";

const CACHE_KEYS = {
  DESTINATIONS: "@travel:cached_featured_destinations",
  PROMOS: "@travel:cached_promotional_banners",
  POSTS: "@travel:cached_posts",
  HOTELS: "@travel:cached_hotels",
};

export interface DynamicAd {
  id: string;
  title: string;
  banner_url: string;
  target_url: string;
  discount_badge?: string;
}

export interface TrendingDestination {
  id: string;
  name: string;
  city?: string;
  country?: string;
  hero_image_url?: string;
  average_budget?: string;
  rating?: number;
  promotion_text?: string;
}

export interface DynamicPost {
  id: string;
  user_id?: string;
  title: string;
  content?: string;
  location?: string;
  likes_count: number;
  author?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  media?: Array<{
    media_url: string;
  }>;
}

export interface DynamicHotel {
  id: string;
  name: string;
  city: string;
  star_rating: number | string;
  base_price?: number | string;
  image_url?: string;
}

export interface RecommendedItem {
  id: string;
  type: "hotel" | "package" | "flight";
  title: string;
  subtitle: string;
  destination: string;
  rating: number;
  reviewsCount: number;
  basePrice: number;
  taxRate: number; // e.g. 0.08 for 8% tax & service fees
  image_url: string;
  badge?: string;
  route: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 PRIMARY ACTION SERVICES & SECONDARY EXPANDABLE SERVICES
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceActionItem {
  id: string;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradientColors: [string, string];
}

const PRIMARY_4_SERVICES: ServiceActionItem[] = [
  {
    id: "flights",
    label: "ফ্লাইট",
    sublabel: "সর্বনিম্ন ভাড়া",
    icon: "airplane",
    route: "/screens/flights",
    gradientColors: ["#0055F2", "#1E40AF"],
  },
  {
    id: "trains",
    label: "ট্রেন",
    sublabel: "আসন সংরক্ষণ",
    icon: "train",
    route: "/screens/trains",
    gradientColors: ["#059669", "#065F46"],
  },
  {
    id: "stays",
    label: "হোটেল",
    sublabel: "রিসোর্ট ও হোমস্টে",
    icon: "bed",
    route: "/screens/search-stays",
    gradientColors: ["#0D9488", "#115E59"],
  },
  {
    id: "packages",
    label: "প্যাকেজ",
    sublabel: "অল-ইনক্লুসিভ ট্যুর",
    icon: "briefcase",
    route: "/screens/packages",
    gradientColors: ["#EA580C", "#9A3412"],
  },
];

const SECONDARY_SERVICES: ServiceActionItem[] = [
  {
    id: "bus-launch",
    label: "বাস ও লঞ্চ",
    sublabel: "এসি ও স্লিপার",
    icon: "bus",
    route: "/screens/bus-launch",
    gradientColors: ["#6366F1", "#4338CA"],
  },
  {
    id: "tour-guides",
    label: "ট্যুর গাইড",
    sublabel: "স্থানীয় গাইড",
    icon: "compass",
    route: "/screens/tour-guides",
    gradientColors: ["#D97706", "#B45309"],
  },
  {
    id: "abroad-agency",
    label: "বিদেশ ও ভিসা",
    sublabel: "ভিসা ও প্রসেসিং",
    icon: "globe",
    route: "/screens/abroad-agency",
    gradientColors: ["#0284C7", "#0369A1"],
  },
  {
    id: "car-rentals",
    label: "কার রেন্টাল",
    sublabel: "ড্রাইভারসহ গাড়ি",
    icon: "car",
    route: "/screens/car-rentals",
    gradientColors: ["#4F46E5", "#3730A3"],
  },
  {
    id: "trip-planner",
    label: "ট্রিপ প্ল্যানার",
    sublabel: "স্মার্ট ভ্রমণ পরিকল্পনা",
    icon: "flash",
    route: "/screens/trip-planner",
    gradientColors: ["#8B5CF6", "#6D28D9"],
  },
  {
    id: "events",
    label: "ইভেন্টস",
    sublabel: "উৎসব ও কনসার্ট",
    icon: "calendar",
    route: "/screens/events",
    gradientColors: ["#EC4899", "#BE185D"],
  },
];

// Fallback curated recommendations with transparent pricing
const CURATED_RECOMMENDATIONS: RecommendedItem[] = [
  {
    id: "rec-stay-1",
    type: "hotel",
    title: "Sayeman Beach Resort",
    subtitle: "প্রিমিয়াম সি-ভিউ রুম ও ইনফিনিটি পুল",
    destination: "কক্সবাজার (Cox's Bazar)",
    rating: 4.9,
    reviewsCount: 420,
    basePrice: 11500,
    taxRate: 0.1, // 10% VAT & service
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
    badge: "জনপ্রিয় পছন্দ",
    route: "/screens/search-stays",
  },
  {
    id: "rec-pkg-1",
    type: "package",
    title: "সাজেক ভ্যালি ৩ দিন ২ রাত মেঘের রাজ্য ট্যুর",
    subtitle: "রিসোর্ট স্টে, জিপ ভ্রমণ, সকাল-রাতের খাবার ও গাইড",
    destination: "সাজেক ভ্যালি, রাঙ্গামাটি",
    rating: 4.8,
    reviewsCount: 310,
    basePrice: 8500,
    taxRate: 0.05,
    image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
    badge: "বেস্টসেলার",
    route: "/screens/packages",
  },
  {
    id: "rec-stay-2",
    type: "hotel",
    title: "গ্র্যান্ড সুলতান টি রিসোর্ট অ্যান্ড গলফ",
    subtitle: "চা বাগানের মাঝে বিলাসবহুল ৫-স্টার স্টে",
    destination: "শ্রীমঙ্গল, সিলেট",
    rating: 4.9,
    reviewsCount: 580,
    basePrice: 16500,
    taxRate: 0.1,
    image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
    badge: "লাক্সারি চয়েস",
    route: "/screens/search-stays",
  },
  {
    id: "rec-pkg-2",
    type: "package",
    title: "সেন্ট মার্টিন কোরাল আইল্যান্ড ক্রুজ প্যাকেজ",
    subtitle: "জাহাজের টিকিট, রিসোর্ট ও বারবিকিউ ডিনার",
    destination: "সেন্ট মার্টিন দ্বীপ",
    rating: 4.7,
    reviewsCount: 240,
    basePrice: 9800,
    taxRate: 0.05,
    image_url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600",
    badge: "সীমিত আসন",
    route: "/screens/packages",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecondaryServices, setShowSecondaryServices] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [activeRecCategory, setActiveRecCategory] = useState<"all" | "hotel" | "package">("all");
  const [activeCommunityTab, setActiveCommunityTab] = useState<"discover" | "nearby">("discover");
  const [showAllServicesModal, setShowAllServicesModal] = useState(false);

  // Present the 40+ Feature Discovery Guide once for new users after login
  useEffect(() => {
    AsyncStorage.getItem("@app:has_seen_first_time_tour").then((val) => {
      if (!val) {
        setTimeout(() => {
          setShowAllServicesModal(true);
          AsyncStorage.setItem("@app:has_seen_first_time_tour", "true");
        }, 1500);
      }
    });
  }, []);

  // Dynamic Data States
  const [trendingDestinations, setTrendingDestinations] = useState<TrendingDestination[]>([]);
  const [ads, setAds] = useState<DynamicAd[]>([]);
  const [communityPosts, setCommunityPosts] = useState<DynamicPost[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Track saved items from savedItemsService
  useEffect(() => {
    const unsubscribe = savedItemsService.subscribe((items) => {
      setSavedIds(new Set(items.map((i) => i.id)));
    });
    return () => unsubscribe();
  }, []);

  // Greeting text
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "শুভ সকাল ☀️";
    if (hour < 18) return "শুভ অপরাহ্ন 🌤️";
    return "শুভ সন্ধ্যা 🌙";
  }, []);

  // Fetch data with 12s timeout and error distinction
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setFetchError(null);
    try {
      const travelRepo = new TravelRepository();
      const fetchPromise = Promise.allSettled([
        (travelRepo as any).getFeaturedDestinations(8),
        (travelRepo as any).getPromotionalBanners(),
        supabase
          .from("posts")
          .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const [destsResult, promosResult, postsResult] = await withNetworkTimeout(
        fetchPromise,
        12000,
        "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?"
      );

      let hadSuccess = false;

      if (destsResult.status === "fulfilled" && Array.isArray(destsResult.value)) {
        setTrendingDestinations(destsResult.value);
        hadSuccess = true;
        AsyncStorage.setItem(CACHE_KEYS.DESTINATIONS, JSON.stringify(destsResult.value)).catch(() => {});
      }
      if (promosResult.status === "fulfilled" && Array.isArray(promosResult.value)) {
        setAds(promosResult.value);
        hadSuccess = true;
        AsyncStorage.setItem(CACHE_KEYS.PROMOS, JSON.stringify(promosResult.value)).catch(() => {});
      }
      if (postsResult.status === "fulfilled" && (postsResult.value as any)?.data) {
        setCommunityPosts((postsResult.value as any).data);
        hadSuccess = true;
      }

      if (!hadSuccess && destsResult.status === "rejected") {
        const err = (destsResult as any).reason;
        setFetchError(err?.message || "ডাটা লোড করা সম্ভব হয়নি।");
      } else {
        setFetchError(null);
      }
    } catch (e: any) {
      console.warn("HomeScreen fetch error:", e);
      if (trendingDestinations.length === 0) {
        setFetchError(e?.message || "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?");
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [trendingDestinations.length]);

  // Silent refresh when returning from background (Requirement 6)
  useAppStateRefresh(() => {
    fetchData(true);
  });

  // Re-fetch on network reconnection (Requirement 1)
  useEffect(() => {
    const unsub = networkStatusService.onReconnect(() => {
      fetchData(true);
    });
    return () => unsub();
  }, [fetchData]);

  useEffect(() => {
    // Restore offline cache first
    AsyncStorage.getItem(CACHE_KEYS.DESTINATIONS).then((data) => {
      if (data) {
        try {
          setTrendingDestinations(JSON.parse(data));
        } catch {}
      }
    });

    fetchData();

    // Supabase realtime updates
    const channelId = generateRealtimeChannelId("home-realtime");
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "destinations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "advertisements" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  // Handle service button navigation
  const handleServicePress = useCallback((route: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push(route as any);
  }, []);

  // Dynamic ML Recommendations
  const [dynamicRecommendations, setDynamicRecommendations] = useState<RecommendedItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    recommendationEngine
      .getRecommendations({
        limit: 8,
        enable_diversity: true,
      })
      .then((res) => {
        if (isMounted && res.success && res.recommendations.length > 0) {
          const mapped: RecommendedItem[] = res.recommendations.map((rec) => {
            const isHotel = rec.item_type === 'hotel';
            const isTour = rec.item_type === 'tour';
            return {
              id: rec.id,
              type: isHotel ? 'hotel' : isTour ? 'package' : 'flight',
              title: rec.name,
              subtitle: rec.match_reasons[0] || `${rec.city} রিকমেন্ডেশন`,
              destination: `${rec.city}, ${rec.region.toUpperCase()}`,
              rating: rec.rating || 4.8,
              reviewsCount: rec.reviews_count || 150,
              basePrice: rec.price || (isHotel ? 6500 : 3500),
              taxRate: 0.1,
              image_url: rec.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
              badge: rec.relevance_score > 0.85 ? 'স্মার্ট পছন্দ' : 'জনপ্রিয়',
              route: isHotel ? '/screens/search-stays' : '/screens/packages',
            };
          });
          setDynamicRecommendations(mapped);
        }
      })
      .catch((err) => {
        console.debug('HomeScreen dynamic rec load error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle save toggle with haptics + toast & bandit feedback
  const handleToggleSaveRec = useCallback(async (item: RecommendedItem) => {
    const totalWithTax = Math.round(item.basePrice * (1 + item.taxRate));
    await savedItemsService.toggleSaveItem({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      destination: item.destination,
      price: item.basePrice,
      totalPriceWithTax: totalWithTax,
      rating: item.rating,
      image_url: item.image_url,
      route: item.route,
    });

    const arm = item.id.includes('cox')
      ? 'coxs_bazar'
      : item.id.includes('sajek')
      ? 'sajek'
      : item.id.includes('sylhet')
      ? 'sylhet'
      : 'sundarbans';
    recommendationEngine.recordBanditFeedback(arm, 1.0, { itemId: item.id });
  }, []);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    const source = dynamicRecommendations.length > 0 ? dynamicRecommendations : CURATED_RECOMMENDATIONS;
    if (activeRecCategory === 'all') return source;
    return source.filter((r) => r.type === activeRecCategory);
  }, [activeRecCategory, dynamicRecommendations]);

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: isDark ? colors.background : TRIP_BLUE }]}
      edges={["top"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? colors.background : TRIP_BLUE}
        animated
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={[TRIP_BLUE]}
          />
        }
      >
        {/* ================================================================== */}
        {/* 1. Header Bar: Brand, Greeting & Quick Action Icons                */}
        {/* ================================================================== */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.brandTitle}>Trip.com</Text>
            <Text style={styles.greetingText}>{greetingText}</Text>
          </View>

          <View style={styles.headerRightRow}>
            {/* Saved Items Direct Shortcut */}
            <Pressable
              style={styles.savedHeaderBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                router.push("/screens/saved" as any);
              }}
            >
              <Ionicons name="heart" size={16} color="#EF4444" />
              <Text style={styles.savedHeaderText}>সেভ তালিকা ({savedIds.size})</Text>
            </Pressable>

            {/* Points / Rewards */}
            <Pressable
              style={styles.pointsBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                router.push("/screens/rewards" as any);
              }}
            >
              <LinearGradient colors={["#FACC15", "#EAB308"]} style={styles.coinDot}>
                <Text style={styles.coinText}>★</Text>
              </LinearGradient>
              <Text style={styles.pointsText}>পয়েন্টস</Text>
            </Pressable>
          </View>
        </View>

        {/* ================================================================== */}
        {/* 2. Top 4 Primary Action Icons + "আরও দেখুন" (Problem 1)            */}
        {/* ================================================================== */}
        <View style={styles.servicesContainer}>
          <View style={styles.primaryServicesGrid}>
            {PRIMARY_4_SERVICES.map((srv) => (
              <Pressable
                key={srv.id}
                style={({ pressed }) => [
                  styles.serviceActionCard,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => handleServicePress(srv.route)}
              >
                <LinearGradient
                  colors={srv.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.serviceIconCircle}
                >
                  <Ionicons name={srv.icon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.serviceLabel}>{srv.label}</Text>
                <Text style={styles.serviceSublabel}>{srv.sublabel}</Text>
              </Pressable>
            ))}
          </View>

          {/* "আরও দেখুন" (View More) Expandable Toggle */}
          <Pressable
            style={styles.expandServicesBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowSecondaryServices((prev) => !prev);
            }}
          >
            <Text style={styles.expandServicesText}>
              {showSecondaryServices ? "সংক্ষিপ্ত করুন ▲" : "অন্যান্য সেবা দেখুন (বাস, গাইড, ভিসা, কার) ▾"}
            </Text>
          </Pressable>

          {/* Secondary Services Expandable Sheet */}
          {showSecondaryServices && (
            <View style={styles.secondaryServicesGrid}>
              {SECONDARY_SERVICES.map((sec) => (
                <Pressable
                  key={sec.id}
                  style={styles.secondaryServiceItem}
                  onPress={() => handleServicePress(sec.route)}
                >
                  <LinearGradient
                    colors={sec.gradientColors}
                    style={styles.secondaryIconCircle}
                  >
                    <Ionicons name={sec.icon} size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.secondaryLabel}>{sec.label}</Text>
                    <Text style={styles.secondarySublabel}>{sec.sublabel}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ================================================================== */}
        {/* 2b. 40+ Features Interactive Guide & Directory Banner              */}
        {/* ================================================================== */}
        <Pressable
          style={styles.featureGuideBanner}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
            setShowAllServicesModal(true);
          }}
        >
          <LinearGradient
            colors={["#1E3A8A", "#2563EB", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureGuideGradient}
          >
            <View style={styles.featureGuideIconCircle}>
              <Ionicons name="apps" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.featureGuideTitle}>৪০+ ফিচার ডিরেক্টরি ও গাইড</Text>
                <View style={styles.featureCountBadge}>
                  <Text style={styles.featureCountText}>40+ Tools</Text>
                </View>
              </View>
              <Text style={styles.featureGuideSubtitle}>
                সকল ভ্রমণ টুলস, এআই ও জরুরি সার্ভিস এক নজরে ঘুরে দেখুন
              </Text>
            </View>
            <View style={styles.featureGuideArrow}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ================================================================== */}
        {/* 3. Unified Search Card with 1-Tap Fill (Problem 2)                 */}
        {/* ================================================================== */}
        <View style={styles.searchCardWrapper}>
          <UnifiedSearchCard />
        </View>

        {/* ================================================================== */}
        {/* 4. Personalized Recommendations (ব্যক্তিগত সুপারিশ) (Problem 1 & 6) */}
        {/* ================================================================== */}
        <View style={styles.recSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="sparkles" size={20} color="#0055F2" />
              <View>
                <Text style={styles.sectionTitle}>ব্যক্তিগত সুপারিশ (Recommended for You)</Text>
                <Text style={styles.sectionSubtitle}>আপনার জন্য বাছাইকৃত শীর্ষ হোটেল ও হলিডে প্যাকেজ</Text>
              </View>
            </View>
          </View>

          {/* Category Chips */}
          <View style={styles.recTabsRow}>
            {[
              { id: "all", label: "সব সুপারিশ" },
              { id: "hotel", label: "হোটেল ও রিসোর্ট" },
              { id: "package", label: "হলিডে প্যাকেজ" },
            ].map((tab) => {
              const isActive = activeRecCategory === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.recTabChip, isActive && styles.recTabChipActive]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setActiveRecCategory(tab.id as any);
                  }}
                >
                  <Text style={[styles.recTabChipText, isActive && styles.recTabChipTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recommendations Cards */}
          <View style={styles.recCardsList}>
            {filteredRecommendations.map((item) => {
              const isSaved = savedIds.has(item.id);
              const totalWithTax = Math.round(item.basePrice * (1 + item.taxRate));

              return (
                <Pressable
                  key={item.id}
                  style={styles.recCard}
                  onPress={() => router.push(item.route as any)}
                >
                  {/* Image */}
                  <View style={styles.recImageWrap}>
                    <Image source={{ uri: item.image_url }} style={styles.recImage} />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.7)"]}
                      style={StyleSheet.absoluteFill}
                    />

                    {/* Badge */}
                    {item.badge && (
                      <View style={styles.recBadgePill}>
                        <Text style={styles.recBadgeText}>{item.badge}</Text>
                      </View>
                    )}

                    {/* Heart Save Button with Haptic + Toast (Problem 7) */}
                    <Pressable
                      style={styles.heartButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleSaveRec(item);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isSaved ? "heart" : "heart-outline"}
                        size={20}
                        color={isSaved ? "#EF4444" : "#FFFFFF"}
                      />
                    </Pressable>

                    {/* Rating on Image */}
                    <View style={styles.recRatingPill}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.recRatingText}>{item.rating}</Text>
                      <Text style={styles.recReviewsText}>({item.reviewsCount})</Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.recCardBody}>
                    <Text style={styles.recTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.recSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>

                    <View style={styles.recLocRow}>
                      <Ionicons name="location-outline" size={13} color="#64748B" />
                      <Text style={styles.recLocText} numberOfLines={1}>
                        {item.destination}
                      </Text>
                    </View>

                    {/* Transparent Upfront Pricing (Problem 6) */}
                    <View style={styles.recPriceRow}>
                      <View>
                        <Text style={styles.recPriceLabel}>শুরুর মূল্য</Text>
                        <Text style={styles.recBasePrice}>
                          {formatPrice(item.basePrice)}
                          <Text style={styles.recNightUnit}>
                            {item.type === "hotel" ? " / রাত" : " / জন"}
                          </Text>
                        </Text>
                      </View>

                      {/* Prominent Tax Included Badge */}
                      <View style={styles.totalPriceBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#059669" />
                        <Text style={styles.totalPriceBadgeText}>
                          ট্যাক্স ও ফিসহ মোট: {formatPrice(totalWithTax)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ================================================================== */}
        {/* 5. Trending Destinations (জনপ্রিয় গন্তব্য)                         */}
        {/* ================================================================== */}
        {/* ================================================================== */}
        {/* 5. Trending Destinations (জনপ্রিয় গন্তব্য)                         */}
        {/* Distinct 3 states: Loading, Error with Retry, Empty, Success       */}
        {/* ================================================================== */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.sectionTitle}>জনপ্রিয় ভ্রমণ গন্তব্য</Text>
            </View>
            {trendingDestinations.length > 0 && (
              <Pressable onPress={() => router.push("/screens/explore" as any)}>
                <Text style={styles.seeAllText}>সব দেখুন →</Text>
              </Pressable>
            )}
          </View>

          {/* 1. Loading State */}
          {isLoadingData && trendingDestinations.length === 0 && (
            <View style={[styles.trendingCardsRow, { flexDirection: "row" }]}>
              {[1, 2, 3].map((skelId) => (
                <View key={`dest-skel-${skelId}`} style={[styles.destCard, { backgroundColor: colors.card }]}>
                  <Skeleton width={140} height={180} borderRadius={16} />
                </View>
              ))}
            </View>
          )}

          {/* 2. Error State with Retry Button */}
          {!isLoadingData && fetchError && trendingDestinations.length === 0 && (
            <ErrorStateCard
              title="গন্তব্য লোড করা যায়নি"
              message={fetchError}
              onRetry={() => {
                setIsLoadingData(true);
                fetchData();
              }}
              retryText="আবার চেষ্টা করুন"
            />
          )}

          {/* 3. Empty State */}
          {!isLoadingData && !fetchError && trendingDestinations.length === 0 && (
            <EmptyStateView
              title="কোনো গন্তব্য পাওয়া যায়নি"
              description="এই মুহূর্তে কোনো ভ্রমণ গন্তব্য তালিকাভুক্ত নেই।"
              actionText="রিফ্রেশ করুন"
              onAction={() => fetchData()}
            />
          )}

          {/* 4. Success State */}
          {trendingDestinations.length > 0 && (
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingCardsRow}
            >
              {trendingDestinations.map((dest) => (
                <Pressable
                  key={dest.id}
                  style={styles.destCard}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    router.push({
                      pathname: "/screens/search" as any,
                      params: { q: dest.city || dest.name },
                    });
                  }}
                >
                  <OptimizedImage
                    source={
                      dest.hero_image_url ||
                      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500"
                    }
                    style={styles.destImage}
                    targetWidth={180}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(15,23,42,0.85)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.destContent}>
                    <Text style={styles.destName} numberOfLines={1}>
                      {dest.name}
                    </Text>
                    <Text style={styles.destCountry} numberOfLines={1}>
                      {dest.city ? `${dest.city}, ` : ""}{dest.country || "বাংলাদেশ"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Animated.ScrollView>
          )}
        </View>

        {/* ================================================================== */}
        {/* 6. Special Voucher Banner                                          */}
        {/* ================================================================== */}
        <Pressable
          style={styles.bannerContainer}
          onPress={() => setShowPromoModal(true)}
        >
          <LinearGradient
            colors={["#1E3A8A", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerGradient}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Badge status="vip" variant="solid" size="sm" label="এক্সক্লুসিভ অফার" />
              <Text style={styles.bannerTitle}>নতুন ব্যবহারকারীদের জন্য বিশেষ ছাড়!</Text>
              <Text style={styles.bannerSubtitle}>প্রথম বুকিংয়ে সর্বোচ্চ ১৫% পর্যন্ত ভাউচার ক্লেম করুন</Text>
            </View>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>ক্লেম করুন</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Promo Modal */}
      <PromoExclusiveModal
        visible={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onClaimAll={() => setShowPromoModal(false)}
      />

      {/* 40+ Feature Discovery Directory & Tour Guide Modal */}
      <FeatureDiscoveryModal
        visible={showAllServicesModal}
        onClose={() => setShowAllServicesModal(false)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  featureGuideBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.2)" } : {}),
  },
  featureGuideGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  featureGuideIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureGuideTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  featureCountBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  featureCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
  },
  featureGuideSubtitle: {
    fontSize: 11,
    color: "#E0F2FE",
    marginTop: 2,
    lineHeight: 15,
  },
  featureGuideArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  shell: {
    flex: 1,
    backgroundColor: TRIP_BLUE,
  },
  scrollContent: {
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  greetingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savedHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  savedHeaderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pointsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  coinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  coinText: {
    fontSize: 10,
    color: "#854D0E",
    fontWeight: "900",
  },
  pointsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  servicesContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: -8,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.08)" } : {}),
  },
  primaryServicesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  serviceActionCard: {
    flex: 1,
    alignItems: "center",
  },
  serviceIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 6px rgba(15, 23, 42, 0.15)" } : {}),
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  serviceSublabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  expandServicesBtn: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  expandServicesText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },
  secondaryServicesGrid: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  secondaryServiceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  secondaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  secondarySublabel: {
    fontSize: 11,
    color: "#64748B",
  },
  searchCardWrapper: {
    marginTop: 16,
  },
  recSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  recTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  recTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  recTabChipActive: {
    backgroundColor: "#0055F2",
  },
  recTabChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  recTabChipTextActive: {
    color: "#FFFFFF",
  },
  recCardsList: {
    gap: 16,
  },
  recCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 8px rgba(15, 23, 42, 0.06)" } : {}),
  },
  recImageWrap: {
    height: 170,
    position: "relative",
  },
  recImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
  recBadgePill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  recRatingPill: {
    position: "absolute",
    bottom: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  recRatingText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  recReviewsText: {
    fontSize: 11,
    color: "#64748B",
  },
  recCardBody: {
    padding: 14,
    gap: 5,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  recLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  recLocText: {
    fontSize: 12,
    color: "#64748B",
  },
  recPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  recPriceLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  recBasePrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  recNightUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  totalPriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  totalPriceBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#065F46",
  },
  trendingSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0055F2",
  },
  trendingCardsRow: {
    gap: 12,
    paddingVertical: 6,
  },
  destCard: {
    width: 140,
    minHeight: 180,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  destImage: {
    width: "100%",
    height: "100%",
  },
  destContent: {
    position: "absolute",
    bottom: 12,
    left: 10,
    right: 10,
  },
  destName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  destCountry: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 18,
    overflow: "hidden",
  },
  bannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bannerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  bannerBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bannerBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
  },
});
