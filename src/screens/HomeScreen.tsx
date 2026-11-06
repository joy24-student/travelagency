import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  runOnJS,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";
import { TravelRepository } from "../repositories/travelRepository";
import { PromoExclusiveModal } from "../components/PromoExclusiveModal";
import { Badge, Button, Card, Skeleton, EmptyState } from "../components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_NAVY = "#0A2540";
const TRIP_LIGHT_BLUE = "#EEF5FF";
const ACCENT_YELLOW = "#FACC15";

// Offline Cache Keys
const CACHE_KEYS = {
  CHIPS: "@travel:cached_travel_chips",
  DESTINATIONS: "@travel:cached_featured_destinations",
  PROMOS: "@travel:cached_promotional_banners",
  POSTS: "@travel:cached_posts",
  HOTELS: "@travel:cached_hotels",
};

const DEFAULT_TRAVEL_CHIPS = [
  "Bali",
  "Cox's Bazar",
  "Tokyo",
  "Sylhet",
  "Bangkok",
  "Dubai",
  "Singapore",
  "Sajek Valley",
  "Paris",
  "Sreemangal",
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & REPOSITORY INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicAd {
  id: string;
  title: string;
  banner_url: string;
  target_url: string;
  placement?: string;
  status?: string;
  discount_badge?: string;
  click_count?: number;
}

export interface TrendingDestination {
  id: string;
  name: string;
  city?: string;
  country?: string;
  tagline?: string;
  promotion_text?: string;
  hero_image_url?: string;
  average_budget?: string;
  rating?: number;
  is_trending?: boolean;
}

export interface DynamicPost {
  id: string;
  user_id?: string;
  title: string;
  content?: string;
  location?: string;
  likes_count: number;
  comments_count?: number;
  metadata?: {
    views_count?: number;
    rating?: number;
    tags?: string[];
  };
  author?: {
    id?: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
    is_influencer?: boolean;
  };
  media?: Array<{
    id?: string;
    media_url: string;
    media_type?: string;
  }>;
}

export interface DynamicHotel {
  id: string;
  name: string;
  city: string;
  star_rating: number | string;
  base_price?: number | string;
  image_url?: string;
  discount_percent?: number;
}

interface ServiceQuickGridItem {
  id: string;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradientColors: [string, string];
  iconColor: string;
  tag?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME REPOSITORY ENHANCEMENT
// ─────────────────────────────────────────────────────────────────────────────

declare module "../repositories/travelRepository" {
  interface TravelRepository {
    getFeaturedDestinations(limit?: number): Promise<TrendingDestination[]>;
    getPromotionalBanners(): Promise<DynamicAd[]>;
  }
  namespace TravelRepository {
    function getFeaturedDestinations(limit?: number): Promise<TrendingDestination[]>;
    function getPromotionalBanners(): Promise<DynamicAd[]>;
  }
}

if (!("getFeaturedDestinations" in TravelRepository.prototype)) {
  (TravelRepository.prototype as any).getFeaturedDestinations = async function (
    limit = 10
  ): Promise<TrendingDestination[]> {
    try {
      const { data, error } = await this.client
        .from("destinations")
        .select("*")
        .order("is_trending", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as TrendingDestination[];
    } catch {
      try {
        const fallback = await this.findAll(undefined, { limit });
        return (fallback || []) as TrendingDestination[];
      } catch {
        return [];
      }
    }
  };
}

if (!("getPromotionalBanners" in TravelRepository.prototype)) {
  (TravelRepository.prototype as any).getPromotionalBanners = async function (): Promise<
    DynamicAd[]
  > {
    try {
      const { data, error } = await this.client
        .from("advertisements")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DynamicAd[];
    } catch {
      return [];
    }
  };
}

if (!("getFeaturedDestinations" in TravelRepository)) {
  (TravelRepository as any).getFeaturedDestinations = async function (limit = 10) {
    const repo = new TravelRepository();
    return (repo as any).getFeaturedDestinations(limit);
  };
}

if (!("getPromotionalBanners" in TravelRepository)) {
  (TravelRepository as any).getPromotionalBanners = async function () {
    const repo = new TravelRepository();
    return (repo as any).getPromotionalBanners();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULAR SERVICE QUICK-GRID DATA
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_GRID_ITEMS: ServiceQuickGridItem[] = [
  {
    id: "flights",
    label: "Flights",
    sublabel: "Best Fares",
    icon: "airplane",
    route: "/screens/flights",
    gradientColors: ["#0055F2", "#1E40AF"],
    iconColor: "#FFFFFF",
    tag: "PROMO",
  },
  {
    id: "stays",
    label: "Stays",
    sublabel: "Hotels & Villas",
    icon: "bed",
    route: "/screens/search-stays",
    gradientColors: ["#0D9488", "#115E59"],
    iconColor: "#FFFFFF",
    tag: "SPECIAL",
  },
  {
    id: "trains",
    label: "Trains",
    sublabel: "Express Seats",
    icon: "train",
    route: "/screens/trains",
    gradientColors: ["#059669", "#065F46"],
    iconColor: "#FFFFFF",
  },
  {
    id: "bus-launch",
    label: "Bus/Launch",
    sublabel: "AC & Sleeper",
    icon: "bus",
    route: "/screens/bus-launch",
    gradientColors: ["#6366F1", "#4338CA"],
    iconColor: "#FFFFFF",
  },
  {
    id: "tour-guides",
    label: "Tour Guides",
    sublabel: "Certified Locals",
    icon: "compass",
    route: "/screens/tour-guides",
    gradientColors: ["#EA580C", "#9A3412"],
    iconColor: "#FFFFFF",
    tag: "VERIFIED",
  },
  {
    id: "abroad-agency",
    label: "Abroad Agency",
    sublabel: "Visa & Hajj/Umrah",
    icon: "globe",
    route: "/screens/abroad-agency",
    gradientColors: ["#0284C7", "#0369A1"],
    iconColor: "#FFFFFF",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS (MEMOIZED FOR 60 FPS SCROLL PERFORMANCE)
// ─────────────────────────────────────────────────────────────────────────────

const ServiceGridCard = React.memo<{
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
});

const DestinationCard = React.memo<{
  dest: TrendingDestination;
  onSelect: (dest: TrendingDestination) => void;
}>(({ dest, onSelect }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.trendingCard,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => onSelect(dest)}
    >
      <Image
        source={{
          uri:
            dest.hero_image_url ||
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",
        }}
        style={styles.trendingCardImage}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(15,23,42,0.85)"]}
        style={styles.trendingCardGradient}
      />

      {/* Top badges */}
      <View style={styles.trendingCardTopRow}>
        <View style={styles.trendingRatingBadge}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={styles.trendingRatingText}>
            {dest.rating ? dest.rating.toFixed(1) : "4.9"}
          </Text>
        </View>
      </View>

      {/* Bottom Content */}
      <View style={styles.trendingCardContent}>
        <Text style={styles.trendingCardName} numberOfLines={1}>
          {dest.name}
        </Text>
        <Text style={styles.trendingCardCountry} numberOfLines={1}>
          {dest.city ? `${dest.city}, ` : ""}{dest.country || "Explore"}
        </Text>
        {dest.promotion_text ? (
          <View style={styles.trendingPromoPill}>
            <Text style={styles.trendingPromoPillText} numberOfLines={1}>
              {dest.promotion_text}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOME SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("Bali");
  const [activeFeedTab, setActiveFeedTab] = useState<"discover" | "nearby">("discover");
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Cached Travel Chips
  const [travelChips, setTravelChips] = useState<string[]>(DEFAULT_TRAVEL_CHIPS);

  // Repository & Dynamic Data
  const [ads, setAds] = useState<DynamicAd[]>([]);
  const [activeHeroAdIndex, setActiveHeroAdIndex] = useState(0);
  const [trendingDestinations, setTrendingDestinations] = useState<TrendingDestination[]>([]);
  const [communityPosts, setCommunityPosts] = useState<DynamicPost[]>([]);
  const [featuredHotels, setFeaturedHotels] = useState<DynamicHotel[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  const travelRepo = useMemo(() => new TravelRepository(), []);

  // ───────────────────────────────────────────────────────────────────────────
  // REANIMATED V4 SCROLL WORKLET & HARDWARE ACCELERATED ANIMATIONS
  // ───────────────────────────────────────────────────────────────────────────

  const scrollY = useSharedValue(0);
  const isScrolledShared = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;

      if (y > 65 && !isScrolledShared.value) {
        isScrolledShared.value = true;
        runOnJS(setIsScrolled)(true);
      } else if (y <= 65 && isScrolledShared.value) {
        isScrolledShared.value = false;
        runOnJS(setIsScrolled)(false);
      }
    },
  });

  // Sticky search container elevation, background & border transition
  const animatedStickySearchStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scrollY.value,
      [30, 90],
      [0, 0.08],
      Extrapolation.CLAMP
    );
    const borderBottomOpacity = interpolate(
      scrollY.value,
      [30, 90],
      [0, 1],
      Extrapolation.CLAMP
    );
    const elevation = interpolate(
      scrollY.value,
      [30, 90],
      [0, 4],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity,
      elevation,
      borderBottomColor: `rgba(226, 232, 240, ${borderBottomOpacity})`,
    };
  });

  // Hero Banner Parallax & Elastic Scale Style (Zero height mutations)
  const animatedHeroBannerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-120, 0, 240],
      [-20, 0, 20],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [-120, 0],
      [1.06, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Silky smooth status bar transitions across iOS and Android
  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(isScrolled ? "#FFFFFF" : TRIP_BLUE, true);
    }
    StatusBar.setBarStyle(isScrolled ? "dark-content" : "light-content", true);
  }, [isScrolled]);

  // ───────────────────────────────────────────────────────────────────────────
  // OFFLINE CACHE RESTORATION
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const restoreOfflineCache = async () => {
      try {
        const [
          cachedChipsJson,
          cachedDestsJson,
          cachedAdsJson,
          cachedPostsJson,
          cachedHotelsJson,
        ] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEYS.CHIPS),
          AsyncStorage.getItem(CACHE_KEYS.DESTINATIONS),
          AsyncStorage.getItem(CACHE_KEYS.PROMOS),
          AsyncStorage.getItem(CACHE_KEYS.POSTS),
          AsyncStorage.getItem(CACHE_KEYS.HOTELS),
        ]);

        if (cachedChipsJson) {
          const parsed = JSON.parse(cachedChipsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setTravelChips(parsed);
        }
        if (cachedDestsJson) {
          const parsed = JSON.parse(cachedDestsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setTrendingDestinations(parsed);
        }
        if (cachedAdsJson) {
          const parsed = JSON.parse(cachedAdsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setAds(parsed);
        }
        if (cachedPostsJson) {
          const parsed = JSON.parse(cachedPostsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setCommunityPosts(parsed);
        }
        if (cachedHotelsJson) {
          const parsed = JSON.parse(cachedHotelsJson);
          if (Array.isArray(parsed) && parsed.length > 0) setFeaturedHotels(parsed);
        }
      } catch (cacheErr) {
        console.warn("HomeScreen offline cache error:", cacheErr);
      }
    };

    restoreOfflineCache();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // CONCURRENT REPOSITORY DATA INGESTION
  // ───────────────────────────────────────────────────────────────────────────

  const fetchHomeScreenData = useCallback(async () => {
    try {
      const [
        destinationsResult,
        promosResult,
        postsResult,
        hotelsResult,
        likesResult,
      ] = await Promise.allSettled([
        // 1. Featured Destinations from TravelRepository
        typeof TravelRepository.getFeaturedDestinations === "function"
          ? TravelRepository.getFeaturedDestinations(10)
          : travelRepo.getFeaturedDestinations(10),

        // 2. Promotional Banners from TravelRepository
        typeof TravelRepository.getPromotionalBanners === "function"
          ? TravelRepository.getPromotionalBanners()
          : travelRepo.getPromotionalBanners(),

        // 3. Published community posts
        supabase
          .from("posts")
          .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(20),

        // 4. Featured hotels
        supabase
          .from("hotels")
          .select("id, name, city, star_rating, base_price, image_url")
          .order("star_rating", { ascending: false })
          .limit(8),

        // 5. User liked posts
        user?.id
          ? supabase.from("post_likes").select("post_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      let networkSuccess = false;

      // Handle Featured Destinations
      if (destinationsResult.status === "fulfilled" && destinationsResult.value) {
        const dests = destinationsResult.value as TrendingDestination[];
        if (dests.length > 0) {
          setTrendingDestinations(dests);
          networkSuccess = true;
          AsyncStorage.setItem(CACHE_KEYS.DESTINATIONS, JSON.stringify(dests)).catch(() => {});

          // Merge and cache travel chips without layout shifting
          const liveChips = dests
            .map((d) => d.city || d.name)
            .filter((name): name is string => Boolean(name && name.trim().length > 0));

          const combinedChips = Array.from(
            new Set([...liveChips, ...DEFAULT_TRAVEL_CHIPS])
          ).slice(0, 10);

          setTravelChips(combinedChips);
          AsyncStorage.setItem(CACHE_KEYS.CHIPS, JSON.stringify(combinedChips)).catch(() => {});
        }
      }

      // Handle Promotional Banners (no hardcoded arrays)
      if (promosResult.status === "fulfilled" && promosResult.value) {
        const bannerAds = promosResult.value as DynamicAd[];
        if (bannerAds.length > 0) {
          setAds(bannerAds);
          networkSuccess = true;
          AsyncStorage.setItem(CACHE_KEYS.PROMOS, JSON.stringify(bannerAds)).catch(() => {});
        }
      }

      // Handle Community Posts
      if (postsResult.status === "fulfilled" && (postsResult.value as any)?.data) {
        const posts = (postsResult.value as any).data;
        if (Array.isArray(posts) && posts.length > 0) {
          setCommunityPosts(posts);
          networkSuccess = true;
          AsyncStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(posts)).catch(() => {});
        }
      }

      // Handle Hotels
      if (hotelsResult.status === "fulfilled" && (hotelsResult.value as any)?.data) {
        const hotels = (hotelsResult.value as any).data;
        if (Array.isArray(hotels) && hotels.length > 0) {
          setFeaturedHotels(hotels);
          networkSuccess = true;
          AsyncStorage.setItem(CACHE_KEYS.HOTELS, JSON.stringify(hotels)).catch(() => {});
        }
      }

      // Handle Likes
      if (likesResult.status === "fulfilled" && (likesResult.value as any)?.data) {
        const userLikes = (likesResult.value as any).data;
        if (Array.isArray(userLikes)) {
          setLikedPostIds(new Set(userLikes.map((l: any) => l.post_id)));
        }
      }

      setIsOffline(!networkSuccess && (destinationsResult.status === "rejected" || promosResult.status === "rejected"));
    } catch (err) {
      console.warn("HomeScreen data fetch warning:", err);
      setIsOffline(true);
    } finally {
      setIsInitialLoading(false);
    }
  }, [user?.id, travelRepo]);

  // Initial fetch and Realtime synchronization
  useEffect(() => {
    fetchHomeScreenData();

    const channelId = `home-live-${Math.random().toString(36).substring(2, 9)}`;
    const liveChannel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "advertisements" }, () => {
        fetchHomeScreenData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "destinations" }, () => {
        fetchHomeScreenData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchHomeScreenData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveChannel);
    };
  }, [fetchHomeScreenData]);

  // Auto-show promo modal once on mount for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPromoModal(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Concurrent Pull-to-Refresh handler
  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await fetchHomeScreenData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn("Refresh execution warning:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHomeScreenData]);

  // Service Quick-Grid press handler with Light haptic feedback
  const handleServicePress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }, []);

  // Destination press handler
  const handleDestinationPress = useCallback((dest: TrendingDestination) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(dest.city || dest.name);
    router.push({
      pathname: "/screens/search" as any,
      params: { q: dest.city || dest.name },
    });
  }, []);

  // Interactive like toggling with haptics and DB persistence
  const handleToggleLike = useCallback(
    async (post: DynamicPost) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isLiked = likedPostIds.has(post.id);
      const nextLiked = !isLiked;

      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });

      setCommunityPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likes_count: Math.max(0, p.likes_count + (nextLiked ? 1 : -1)),
              }
            : p
        )
      );

      try {
        if (user?.id) {
          if (nextLiked) {
            await supabase.from("post_likes").insert([{ post_id: post.id, user_id: user.id }]);
          } else {
            await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
          }
        }
        const newCount = Math.max(0, post.likes_count + (nextLiked ? 1 : -1));
        await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id);
      } catch (err) {
        console.warn("Failed to persist like toggle:", err);
      }
    },
    [likedPostIds, user?.id]
  );

  // Dynamic greeting based on current local hour
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning ☀️";
    if (hour < 18) return "Good afternoon 🌤️";
    return "Good evening 🌙";
  }, []);

  // Filtered community posts based on Discover vs Nearby tabs
  const filteredPosts = useMemo(() => {
    if (activeFeedTab === "discover") return communityPosts;
    const q = searchQuery.toLowerCase().trim();
    const filtered = communityPosts.filter((p) => {
      const loc = (p.location || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      return (
        loc.includes(q) ||
        title.includes(q) ||
        loc.includes("bangladesh") ||
        loc.includes("sylhet") ||
        loc.includes("dhaka") ||
        loc.includes("cox")
      );
    });
    return filtered.length > 0 ? filtered : communityPosts;
  }, [communityPosts, activeFeedTab, searchQuery]);

  const activeHeroAd = ads.length > 0 ? ads[activeHeroAdIndex % ads.length] : null;
  const secondaryAd = ads.length > 1 ? ads[1] : null;

  const leftPosts = useMemo(() => filteredPosts.filter((_, i) => i % 2 === 0), [filteredPosts]);
  const rightPosts = useMemo(() => filteredPosts.filter((_, i) => i % 2 !== 0), [filteredPosts]);

  const leftHotels = useMemo(() => featuredHotels.filter((_, i) => i % 2 === 0), [featuredHotels]);
  const rightHotels = useMemo(() => featuredHotels.filter((_, i) => i % 2 !== 0), [featuredHotels]);

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <StatusBar
        barStyle={isScrolled ? "dark-content" : "light-content"}
        backgroundColor={isScrolled ? "#FFFFFF" : TRIP_BLUE}
        animated
      />

      {/* Main 60 FPS Reanimated ScrollView */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            tintColor={TRIP_BLUE}
            colors={[TRIP_BLUE]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* ================================================================== */}
        {/* Section 0: Luxury Header Bar & 6-Service Quick-Grid                */}
        {/* ================================================================== */}
        <View style={styles.topSectionWrapper}>
          {/* Top Brand & Loyalty Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeftContainer}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePullToRefresh();
                }}
                style={styles.logoPressArea}
              >
                <Text style={styles.brandTitle}>Trip.com</Text>
              </Pressable>
              <Text style={styles.greetingSubtitle}>{greetingText}</Text>
            </View>

            <View style={styles.headerRightActions}>
              {isOffline && (
                <Badge
                  status="warning"
                  variant="subtle"
                  size="sm"
                  label="Offline"
                  style={styles.offlineBadge}
                />
              )}

              {/* Gold Coin / Rewards Badge */}
              <Pressable
                style={styles.rewardsButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/screens/rewards" as any);
                }}
              >
                <LinearGradient
                  colors={["#FDE047", "#EAB308"]}
                  style={styles.goldCoinGradient}
                >
                  <Text style={styles.goldCoinSymbol}>T</Text>
                </LinearGradient>
                <Text style={styles.rewardsLabel}>Points</Text>
              </Pressable>
            </View>
          </View>

          {/* Curved Sheet with Quick-Grid */}
          <View style={styles.curvedSheet}>
            <View style={styles.quickGridHeader}>
              <Text style={styles.quickGridTitle}>Explore Services</Text>
              <Text style={styles.quickGridSubtitle}>All-in-one travel platform</Text>
            </View>

            {/* Modular 6-Service Grid */}
            <View style={styles.serviceGrid}>
              {SERVICE_GRID_ITEMS.map((service) => (
                <ServiceGridCard
                  key={service.id}
                  item={service}
                  onPress={handleServicePress}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ================================================================== */}
        {/* Section 1: Sticky Search Bar, Filter Chips & Segmented Feed Tabs   */}
        {/* ================================================================== */}
        <Animated.View style={[styles.stickySearchWrapper, animatedStickySearchStyle]}>
          {/* Search Pill Input */}
          <View style={styles.searchBarPill}>
            <Pressable
              style={styles.aiAssistantIcon}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/service-chat" as any);
              }}
            >
              <Ionicons name="sparkles" size={15} color="#0055F2" />
            </Pressable>

            <Pressable
              style={styles.searchInputTouchArea}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/screens/search" as any, params: { q: searchQuery } });
              }}
            >
              <Text style={styles.searchInputLabel} numberOfLines={1}>
                {searchQuery ? `Searching "${searchQuery}"` : "Where are you going?"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.searchActionSubmit}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/screens/search" as any, params: { q: searchQuery } });
              }}
            >
              <Ionicons name="search" size={17} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Cached Travel Chips Row */}
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
          >
            {travelChips.map((chip) => {
              const isActive = searchQuery.toLowerCase() === chip.toLowerCase();
              return (
                <Pressable
                  key={chip}
                  style={({ pressed }) => [
                    styles.chipPill,
                    isActive && styles.chipPillActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchQuery(chip);
                    router.push({ pathname: "/screens/search" as any, params: { q: chip } });
                  }}
                >
                  <Ionicons
                    name={isActive ? "location" : "location-outline"}
                    size={12}
                    color={isActive ? TRIP_BLUE : "#64748B"}
                  />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {chip}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={styles.mapActionChip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/explore" as any);
              }}
            >
              <Ionicons name="map" size={13} color={TRIP_BLUE} />
              <Text style={styles.mapActionText}>Map</Text>
            </Pressable>
          </Animated.ScrollView>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsBar}>
            {[
              { label: "Deals", icon: "pricetag" as const, action: () => setShowPromoModal(true) },
              { label: "Events", icon: "calendar" as const, action: () => router.push("/screens/events" as any) },
              { label: "Trip.Planner", icon: "flash" as const, action: () => router.push("/screens/trip-planner" as any) },
              { label: "Trending", icon: "trending-up" as const, action: () => router.push("/(tabs)/community" as any) },
            ].map((qa) => (
              <Pressable
                key={qa.label}
                style={styles.quickActionItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  qa.action();
                }}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons name={qa.icon} size={18} color={TRIP_BLUE} />
                </View>
                <Text style={styles.quickActionLabel}>{qa.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Segmented Feed Switcher */}
          <View style={styles.feedTabsContainer}>
            <Pressable
              style={[
                styles.feedTabPill,
                activeFeedTab === "discover" && styles.feedTabPillActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFeedTab("discover");
              }}
            >
              <Text
                style={[
                  styles.feedTabText,
                  activeFeedTab === "discover" && styles.feedTabTextActive,
                ]}
              >
                Discover
              </Text>
              {activeFeedTab === "discover" && <View style={styles.tabActiveIndicator} />}
            </Pressable>

            <Pressable
              style={[
                styles.feedTabPill,
                activeFeedTab === "nearby" && styles.feedTabPillActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFeedTab("nearby");
              }}
            >
              <Text
                style={[
                  styles.feedTabText,
                  activeFeedTab === "nearby" && styles.feedTabTextActive,
                ]}
              >
                Nearby Gems
              </Text>
              {activeFeedTab === "nearby" && <View style={styles.tabActiveIndicator} />}
            </Pressable>
          </View>
        </Animated.View>

        {/* ================================================================== */}
        {/* Section 2: Trending Destinations Carousel (Repository Data)        */}
        {/* ================================================================== */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="flame" size={19} color="#EF4444" />
              <Text style={styles.sectionHeadingTitle}>Trending Destinations</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/explore" as any);
              }}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          {isInitialLoading && trendingDestinations.length === 0 ? (
            <View style={styles.trendingCardsRow}>
              {[1, 2, 3].map((skelId) => (
                <View key={`dest-skel-${skelId}`} style={styles.trendingSkeletonBox}>
                  <Skeleton variant="rect" width={145} height={190} borderRadius={18} />
                </View>
              ))}
            </View>
          ) : trendingDestinations.length > 0 ? (
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingCardsRow}
            >
              {trendingDestinations.map((dest) => (
                <DestinationCard
                  key={dest.id}
                  dest={dest}
                  onSelect={handleDestinationPress}
                />
              ))}
            </Animated.ScrollView>
          ) : null}
        </View>

        {/* ================================================================== */}
        {/* Section 3: Dual Column Masonry Discovery Feed                      */}
        {/* ================================================================== */}
        <View style={styles.masonryFeedGrid}>
          {/* Left Column */}
          <View style={styles.masonryColumn}>
            {/* Card L1: Dynamic Hero Banner (Reanimated Transform, Strictly Dynamic) */}
            {activeHeroAd ? (
              <Animated.View style={[styles.cardContainer, animatedHeroBannerStyle]}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (activeHeroAd.target_url) {
                      router.push(activeHeroAd.target_url as any);
                    } else {
                      setShowPromoModal(true);
                    }
                  }}
                >
                  <View style={styles.heroCardImageWrapper}>
                    {activeHeroAd.banner_url ? (
                      <Image
                        source={{ uri: activeHeroAd.banner_url }}
                        style={styles.heroCardImage}
                      />
                    ) : null}
                    <LinearGradient
                      colors={["rgba(0,0,0,0.15)", "rgba(10,37,64,0.85)"]}
                      style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.heroOverlayContent}>
                      <Badge
                        status="vip"
                        variant="solid"
                        size="sm"
                        label="Exclusive Offer"
                        style={{ alignSelf: "flex-start", marginBottom: 6 }}
                      />
                      <Text style={styles.heroBannerTitle} numberOfLines={2}>
                        {activeHeroAd.title.split("—")[0].trim()}
                      </Text>
                    </View>

                    <View style={styles.dealPillBanner}>
                      <Text style={styles.dealPillText}>Special Deals</Text>
                    </View>

                    {/* Pagination Indicator */}
                    {ads.length > 1 && (
                      <Pressable
                        style={styles.pageCountBadge}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveHeroAdIndex((prev) => (prev + 1) % ads.length);
                        }}
                      >
                        <Text style={styles.pageCountText}>
                          {(activeHeroAdIndex % ads.length) + 1}/{ads.length}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.heroCardFooter}>
                    <Button
                      label="Claim Deal"
                      size="sm"
                      variant="primary"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (activeHeroAd.target_url) {
                          router.push(activeHeroAd.target_url as any);
                        } else {
                          setShowPromoModal(true);
                        }
                      }}
                    />
                    <Text style={styles.disclaimerText}>
                      *Verified inventory. Terms & Conditions apply.
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            ) : isInitialLoading ? (
              <View style={styles.heroSkeletonWrap}>
                <Skeleton variant="card" width="100%" height={180} borderRadius={18} />
              </View>
            ) : null}

            {/* Left Column Feed Items: Interleaving Posts and Hotels */}
            {leftPosts.map((post, postIdx) => {
              const matchedHotel = leftHotels[postIdx];
              const isLiked = likedPostIds.has(post.id);
              const postImage =
                post.media?.[0]?.media_url ||
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500";
              const authorAvatar =
                post.author?.avatar_url ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";
              const authorName =
                post.author?.username || post.author?.display_name || "Traveler";
              const viewsCount = post.metadata?.views_count || post.likes_count * 2 || 350;

              return (
                <React.Fragment key={`l-feed-${post.id}`}>
                  {/* Community Post Card */}
                  <Pressable
                    style={styles.cardContainer}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({
                        pathname: "/(tabs)/community" as any,
                        params: { postId: post.id },
                      });
                    }}
                  >
                    <Image source={{ uri: postImage }} style={styles.postCardImage} />
                    <View style={styles.cardContentPadding}>
                      <Text style={styles.postCardTitle} numberOfLines={2}>
                        {post.title}
                      </Text>

                      <View style={styles.postAuthorRow}>
                        <Pressable
                          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const authorId = post.author?.id || post.user_id;
                            if (authorId) {
                              router.push({
                                pathname: "/screens/user-profile" as any,
                                params: { userId: authorId },
                              });
                            }
                          }}
                        >
                          <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                          <Text style={styles.authorName} numberOfLines={1}>
                            {authorName}
                          </Text>
                        </Pressable>

                        <View style={styles.postStatsContainer}>
                          <View style={styles.viewsCounter}>
                            <Ionicons name="eye-outline" size={11} color="#94A3B8" />
                            <Text style={styles.viewsCountText}>{viewsCount}</Text>
                          </View>

                          {/* Like Button */}
                          <Pressable
                            style={styles.likeButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleLike(post);
                            }}
                          >
                            <Ionicons
                              name={isLiked ? "heart" : "heart-outline"}
                              size={14}
                              color={isLiked ? "#EF4444" : "#94A3B8"}
                            />
                            <Text
                              style={[
                                styles.likeCountNumber,
                                isLiked && styles.likeCountNumberActive,
                              ]}
                            >
                              {post.likes_count}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Pressable>

                  {/* Interleaved Hotel Card (if available) */}
                  {matchedHotel && (
                    <Pressable
                      key={`l-hotel-${matchedHotel.id}`}
                      style={styles.cardContainer}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/screens/search-stays" as any,
                          params: { hotelId: matchedHotel.id },
                        });
                      }}
                    >
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{
                            uri:
                              matchedHotel.image_url ||
                              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",
                          }}
                          style={styles.hotelCardImage}
                        />
                        <View style={styles.hotelLocationPill}>
                          <Ionicons name="location-sharp" size={10} color="#FFFFFF" />
                          <Text style={styles.hotelLocationText}>{matchedHotel.city}</Text>
                        </View>
                      </View>
                      <View style={styles.cardContentPadding}>
                        <Text style={styles.hotelCardName} numberOfLines={2}>
                          {matchedHotel.name}
                        </Text>
                        <View style={styles.hotelPriceRow}>
                          <View style={styles.starRow}>
                            {Array.from({
                              length: Math.min(5, Math.round(Number(matchedHotel.star_rating) || 5)),
                            }).map((_, i) => (
                              <Ionicons key={i} name="star" size={10} color="#F59E0B" />
                            ))}
                          </View>
                          {matchedHotel.base_price ? (
                            <Text style={styles.hotelPrice}>
                              ${matchedHotel.base_price}
                              <Text style={styles.hotelNightText}>/nt</Text>
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Right Column */}
          <View style={styles.masonryColumn}>
            {/* Card R1: Dynamic Secondary Promo Card from Repository */}
            {secondaryAd ? (
              <Pressable
                style={styles.cardContainer}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push((secondaryAd.target_url || "/screens/flights") as any);
                }}
              >
                <LinearGradient
                  colors={["#0284C7", "#0369A1"]}
                  style={styles.dealGradientCard}
                >
                  <View style={styles.dealHeaderRow}>
                    <Text style={styles.dealHeaderTitle} numberOfLines={1}>
                      {secondaryAd.title ? secondaryAd.title.split("—")[0].trim() : "Featured Deal"}
                    </Text>
                    <Badge
                      status="verified"
                      variant="solid"
                      size="sm"
                      label="VERIFIED"
                    />
                  </View>

                  <Text style={styles.dealSubtitle} numberOfLines={2}>
                    {secondaryAd.title}
                  </Text>

                  <View style={styles.promoTagBox}>
                    <Text style={styles.promoTagText}>SPECIAL OFFER</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {/* Right Column Feed Items: Interleaving Hotels and Posts */}
            {rightPosts.map((post, postIdx) => {
              const matchedHotel = rightHotels[postIdx];
              const isLiked = likedPostIds.has(post.id);
              const postImage =
                post.media?.[0]?.media_url ||
                "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500";
              const authorAvatar =
                post.author?.avatar_url ||
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100";
              const authorName =
                post.author?.username || post.author?.display_name || "Traveler";
              const viewsCount = post.metadata?.views_count || post.likes_count * 2 || 210;

              return (
                <React.Fragment key={`r-feed-${post.id}`}>
                  {/* Interleaved Hotel Card (if available) */}
                  {matchedHotel && (
                    <Pressable
                      key={`r-hotel-${matchedHotel.id}`}
                      style={styles.cardContainer}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/screens/search-stays" as any,
                          params: { hotelId: matchedHotel.id },
                        });
                      }}
                    >
                      <View style={{ position: "relative" }}>
                        <Image
                          source={{
                            uri:
                              matchedHotel.image_url ||
                              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
                          }}
                          style={styles.featuredHotelImage}
                        />
                        <View style={styles.hotelSelectBadgeBox}>
                          <Text style={styles.hotelSelectCity}>{matchedHotel.city}</Text>
                          <Text style={styles.hotelSelectSubtitle}>Top Choice</Text>
                        </View>
                      </View>

                      <View style={styles.cardContentPadding}>
                        <Text style={styles.hotelCardName} numberOfLines={2}>
                          {matchedHotel.name}
                        </Text>

                        <View style={styles.hotelPriceRow}>
                          <Badge
                            status="warning"
                            variant="subtle"
                            size="sm"
                            label="Trip.Best"
                          />
                          {matchedHotel.base_price ? (
                            <Text style={styles.hotelPrice}>
                              ${matchedHotel.base_price}
                              <Text style={styles.hotelNightText}>/nt</Text>
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.recentViewersText}>
                          Viewed by travelers recently
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Dynamic Community Post Card */}
                  <Pressable
                    style={styles.cardContainer}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({
                        pathname: "/(tabs)/community" as any,
                        params: { postId: post.id },
                      });
                    }}
                  >
                    <Image source={{ uri: postImage }} style={styles.postCardImageTall} />
                    <View style={styles.cardContentPadding}>
                      <Text style={styles.postCardTitle} numberOfLines={2}>
                        {post.title}
                      </Text>

                      <View style={styles.postAuthorRow}>
                        <Pressable
                          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}
                          onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const authorId = post.author?.id || post.user_id;
                            if (authorId) {
                              router.push({
                                pathname: "/screens/user-profile" as any,
                                params: { userId: authorId },
                              });
                            }
                          }}
                        >
                          <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                          <Text style={styles.authorName} numberOfLines={1}>
                            {authorName}
                          </Text>
                        </Pressable>

                        <View style={styles.postStatsContainer}>
                          <View style={styles.viewsCounter}>
                            <Ionicons name="eye-outline" size={11} color="#94A3B8" />
                            <Text style={styles.viewsCountText}>{viewsCount}</Text>
                          </View>

                          {/* Interactive Like Button */}
                          <Pressable
                            style={styles.likeButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleLike(post);
                            }}
                          >
                            <Ionicons
                              name={isLiked ? "heart" : "heart-outline"}
                              size={14}
                              color={isLiked ? "#EF4444" : "#94A3B8"}
                            />
                            <Text
                              style={[
                                styles.likeCountNumber,
                                isLiked && styles.likeCountNumberActive,
                              ]}
                            >
                              {post.likes_count}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Bottom Tab Inset Spacer */}
        <View style={{ height: 110, backgroundColor: "#F8FAFC" }} />
      </Animated.ScrollView>

      {/* Promo Voucher Overlay Modal */}
      <PromoExclusiveModal
        visible={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onClaimAll={() => setShowPromoModal(false)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT STYLESHEET (PRODUCTION-TIER TYPOGRAPHY & LAYOUT STABILITY)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: TRIP_BLUE,
  },
  scrollContent: {
    backgroundColor: TRIP_BLUE,
  },
  topSectionWrapper: {
    backgroundColor: TRIP_BLUE,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: TRIP_BLUE,
  },
  headerLeftContainer: {
    justifyContent: "center",
  },
  logoPressArea: {
    paddingVertical: 1,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  greetingSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  offlineBadge: {
    marginRight: 8,
  },
  rewardsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  goldCoinGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goldCoinSymbol: {
    color: "#78350F",
    fontWeight: "900",
    fontSize: 12,
  },
  rewardsLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  curvedSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 16,
    paddingBottom: 12,
    marginTop: -1,
  },
  quickGridHeader: {
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  quickGridTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  quickGridSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  // Modular 6-Service Grid
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    rowGap: 12,
  },
  serviceCard: {
    width: "31%",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  serviceCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  serviceIconContainer: {
    position: "relative",
    marginBottom: 6,
  },
  serviceIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  serviceMiniTag: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#EF4444",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  serviceMiniTagText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  serviceCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  serviceCardSubtitle: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginTop: 1,
  },
  // Sticky Search Bar & Sub-Actions
  stickySearchWrapper: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchBarPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  aiAssistantIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputTouchArea: {
    flex: 1,
    paddingHorizontal: 10,
  },
  searchInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  searchActionSubmit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TRIP_BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  chipsScrollContent: {
    gap: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  chipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipPillActive: {
    backgroundColor: TRIP_LIGHT_BLUE,
    borderColor: TRIP_BLUE,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  mapActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: TRIP_LIGHT_BLUE,
  },
  mapActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  quickActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 6,
  },
  quickActionItem: {
    alignItems: "center",
    gap: 4,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  feedTabsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 2,
  },
  feedTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  feedTabPillActive: {},
  feedTabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
  },
  feedTabTextActive: {
    color: "#0F172A",
    fontWeight: "900",
  },
  tabActiveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_YELLOW,
  },
  // Trending Section
  trendingSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeadingTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  trendingCardsRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingSkeletonBox: {
    width: 145,
    height: 190,
  },
  trendingCard: {
    width: 145,
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  trendingCardImage: {
    width: "100%",
    height: "100%",
  },
  trendingCardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
  },
  trendingCardTopRow: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  trendingRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendingRatingText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  trendingCardContent: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
  },
  trendingCardName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  trendingCardCountry: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  trendingPromoPill: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  trendingPromoPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  // Masonry Discovery Feed
  masonryFeedGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  masonryColumn: {
    flex: 1,
    gap: 10,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  heroSkeletonWrap: {
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
  },
  heroCardImageWrapper: {
    position: "relative",
    height: 155,
    backgroundColor: TRIP_NAVY,
  },
  heroCardImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlayContent: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
  },
  heroBannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  dealPillBanner: {
    position: "absolute",
    bottom: 8,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dealPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  heroCardFooter: {
    padding: 10,
  },
  disclaimerText: {
    fontSize: 9,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
  },
  pageCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pageCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  dealGradientCard: {
    padding: 14,
    borderRadius: 18,
  },
  dealHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dealHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    flex: 1,
    marginRight: 6,
  },
  dealSubtitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  promoTagBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  promoTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  postCardImage: {
    width: "100%",
    height: 155,
  },
  postCardImageTall: {
    width: "100%",
    height: 175,
  },
  cardContentPadding: {
    padding: 10,
  },
  postCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 18,
    marginBottom: 8,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  authorName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  postStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewsCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewsCountText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  likeCountNumber: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },
  likeCountNumberActive: {
    color: "#EF4444",
  },
  hotelCardImage: {
    width: "100%",
    height: 115,
  },
  featuredHotelImage: {
    width: "100%",
    height: 125,
  },
  hotelLocationPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotelLocationText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  hotelSelectBadgeBox: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hotelSelectCity: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F172A",
  },
  hotelSelectSubtitle: {
    fontSize: 8,
    color: "#475569",
    fontWeight: "600",
  },
  hotelCardName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  hotelPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  starRow: {
    flexDirection: "row",
    gap: 1.5,
  },
  hotelPrice: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  hotelNightText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  recentViewersText: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 2,
  },
});
