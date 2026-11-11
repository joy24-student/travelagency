import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";
import { PromoExclusiveModal } from "../components/PromoExclusiveModal";
import { DynamicHeroBanner } from "../components/home/DynamicHeroBanner";
import { DestinationVitalsRow } from "../components/common/DestinationVitalsRow";
import { useTheme } from "../theme";
import { useAppConfig } from "../hooks/useAppConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const REFRESH_THRESHOLD = 80;
const REFRESH_MAX_PULL = 130;
const REFRESH_LOCK_HEIGHT = 90;

const elasticPullDistance = (distance: number) =>
  Math.min(REFRESH_MAX_PULL, distance / (1 + distance / 220));

export interface DynamicAd {
  id: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  button_text?: string;
  banner_url: string;
  target_url: string;
  placement?: string;
  status?: string;
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
  };
  media?: Array<{
    id?: string;
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

// Location tags with thumbnail photos for Light Mode & clean labels for Dark Mode
const LOCATION_TAGS = [
  {
    name: "Lalmonirhat",
    image: "https://images.unsplash.com/photo-1585123388867-3bfe6dd4bdbf?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Beijing",
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Shanghai",
    image: "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "Singapore",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=120&auto=format&fit=crop&q=80",
  },
];

export function HomeScreen() {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { heroTitle, heroSubtitle, announcementTicker, announcementEnabled } = useAppConfig();

  const [searchQuery, setSearchQuery] = useState("Bali");
  const [activeFeedTab, setActiveFeedTab] = useState<"discover" | "nearby">("discover");
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isArmed, setIsArmed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Dynamic Supabase data
  const [ads, setAds] = useState<DynamicAd[]>([]);
  const [communityPosts, setCommunityPosts] = useState<DynamicPost[]>([]);
  const [featuredHotels, setFeaturedHotels] = useState<DynamicHotel[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  const scrollY = useRef(new Animated.Value(0)).current;
  const pullDistance = useRef(new Animated.Value(0)).current;
  const spinnerRotate = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  const isAtTopRef = useRef(true);
  const isArmedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  // Monitor scroll for sticky transitions and Back to Top
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      isAtTopRef.current = value <= 5;

      if (value < 0 && !isRefreshingRef.current) {
        const overscroll = elasticPullDistance(Math.abs(value));
        pullDistance.setValue(overscroll);

        if (overscroll >= REFRESH_THRESHOLD && !isArmedRef.current) {
          isArmedRef.current = true;
          setIsArmed(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (overscroll < REFRESH_THRESHOLD && isArmedRef.current) {
          isArmedRef.current = false;
          setIsArmed(false);
        }
      }

      if (value > 140) {
        if (!isScrolled) setIsScrolled(true);
      } else {
        if (isScrolled) setIsScrolled(false);
      }
    });
    return () => scrollY.removeListener(listenerId);
  }, [isScrolled, pullDistance, scrollY]);

  // Fetch real data from Supabase
  const fetchHomeScreenData = useCallback(async () => {
    try {
      const { data: adData } = await supabase
        .from("advertisements")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (adData) setAds(adData);

      const { data: postData } = await supabase
        .from("posts")
        .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);

      if (postData) setCommunityPosts(postData);

      const { data: hotelData } = await supabase
        .from("hotels")
        .select("id, name, city, star_rating, base_price, image_url")
        .order("star_rating", { ascending: false })
        .limit(6);

      if (hotelData) setFeaturedHotels(hotelData);

      if (user?.id) {
        const { data: userLikes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);

        if (userLikes) {
          setLikedPostIds(new Set(userLikes.map((l: any) => l.post_id)));
        }
      }
    } catch (err) {
      console.warn("HomeScreen data fetch warning:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHomeScreenData();
  }, [fetchHomeScreenData]);

  // Pull to refresh handler
  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsArmed(false);
    isArmedRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.spring(pullDistance, {
      toValue: REFRESH_LOCK_HEIGHT,
      useNativeDriver: false,
      tension: 180,
      friction: 12,
    }).start();

    await fetchHomeScreenData();
    setRefreshCount((prev) => prev + 1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    isRefreshingRef.current = false;
    setIsRefreshing(false);

    Animated.timing(pullDistance, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      pullDistance.setValue(0);
    });
  }, [pullDistance, fetchHomeScreenData]);

  // Globe rotation during refresh
  useEffect(() => {
    if (!isRefreshing) {
      spinnerRotate.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(spinnerRotate, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [isRefreshing, spinnerRotate]);

  const handleScrollEndDrag = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    if (offsetY <= -REFRESH_THRESHOLD || isArmedRef.current) {
      triggerRefresh();
    }
  };

  const handleToggleLike = async (post: DynamicPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isLiked = likedPostIds.has(post.id);
    const nextSet = new Set(likedPostIds);
    if (isLiked) {
      nextSet.delete(post.id);
    } else {
      nextSet.add(post.id);
    }
    setLikedPostIds(nextSet);

    setCommunityPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: Math.max(0, p.likes_count + (isLiked ? -1 : 1)) }
          : p
      )
    );
  };

  const leftPosts = useMemo(
    () => communityPosts.filter((_, i) => i % 2 === 0),
    [communityPosts]
  );
  const rightPosts = useMemo(
    () => communityPosts.filter((_, i) => i % 2 !== 0),
    [communityPosts]
  );

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={triggerRefresh}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
      >
        {/* ========================================================================= */}
        {/* 1. DYNAMIC HERO BANNER: Full Admin Control, Search Engine, Auto-Suggest   */}
        {/* ========================================================================= */}
        <DynamicHeroBanner
          refreshTrigger={refreshCount}
          onSearchSubmit={(q) => {
            setSearchQuery(q);
            router.push({
              pathname: "/screens/search" as any,
              params: { q },
            });
          }}
        />

        <View style={styles.searchSectionWrap}>
          {/* ========================================================================= */}
          {/* 2. LOCATION TAGS ROW: Clean Pill Buttons (with City Photos in Light Mode) */}
          {/* ========================================================================= */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationTagsScroll}
          >
            {LOCATION_TAGS.map((loc) => (
              <Pressable
                key={loc.name}
                style={[
                  styles.locationPillBtn,
                  {
                    backgroundColor: isDark ? "#FFF8EE" : "#FFFFFF",
                    borderColor: isDark ? "rgba(229, 169, 60, 0.25)" : "#E2E8F0",
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchQuery(loc.name);
                  router.push({
                    pathname: "/screens/search" as any,
                    params: { q: loc.name },
                  });
                }}
              >
                {/* City thumbnail photo in light mode matching Screenshot 3 */}
                {!isDark && (
                  <Image source={{ uri: loc.image }} style={styles.locationThumbPhoto} />
                )}
                <Text style={styles.locationPillText}>{loc.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ========================================================================= */}
          {/* 5. SUB-CATEGORY QUICK ACTIONS (Deals, Events, Trip.Planner, Trending)     */}
          {/* ========================================================================= */}
          <View style={styles.quickActionsGrid}>
            {[
              { label: "Deals", icon: "pricetag-outline", route: "deals" },
              { label: "Travel Buddy", icon: "people-outline", route: "/screens/travel-match" },
              { label: "Trip.Planner", icon: "flash-outline", route: "/screens/trip-planner" },
              { label: "Launch & Bus", icon: "boat-outline", route: "/screens/bus-launch" },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={styles.quickActionCol}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (action.route === "deals") {
                    setShowPromoModal(true);
                  } else {
                    router.push(action.route as any);
                  }
                }}
              >
                <View
                  style={[
                    styles.quickActionCircle,
                    {
                      backgroundColor: theme.quickActionBg,
                      borderColor: theme.quickActionBorder,
                      shadowColor: isDark ? "#000000" : "#D4A03D",
                    },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={22}
                    color={theme.quickActionIcon}
                  />
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    { color: isDark ? "#F8FAFC" : "#1E293B" },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Spotlight Cards: Travel Intelligence & 1-Click Itinerary Marketplace */}
          <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 14 }}>
            <Pressable
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                borderWidth: 1,
                borderColor: "#BFDBFE",
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/travel-intelligence" as any);
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Ionicons name="shield-checkmark" size={18} color="#287DFA" />
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#FFFFFF" : "#1E3A8A", marginTop: 8 }}>
                Travel Intelligence
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#3B82F6", marginTop: 2 }}>
                Live disruption alerts & alternatives
              </Text>
            </Pressable>

            <Pressable
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? "#1E293B" : "#FEF3C7",
                borderWidth: 1,
                borderColor: "#FDE68A",
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/explore-trips" as any);
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Ionicons name="sparkles" size={18} color="#D97706" />
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#B45309" }}>1-CLICK</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: isDark ? "#FFFFFF" : "#92400E", marginTop: 8 }}>
                Explore Itineraries
              </Text>
              <Text style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#B45309", marginTop: 2 }}>
                Clone & customize complete trips
              </Text>
            </Pressable>
          </View>

          {/* ========================================================================= */}
          {/* AI INSIGHTS TODAY (Image 4 Curated AI Insights Pattern)                  */}
          {/* ========================================================================= */}
          <View style={{ marginHorizontal: 16, marginTop: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="sparkles" size={15} color="#D97706" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#FFFFFF" : "#0F172A" }}>
                  AI Insights Today
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#64748B" }}>
                Updated 10m ago
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              <Pressable
                style={{
                  width: 140,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#1E293B" : "#FEF3C7",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
                }}
                onPress={() => router.push("/screens/explore-trips" as any)}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F59E0B20", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Ionicons name="flame" size={18} color="#D97706" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#FFFFFF" : "#92400E" }}>
                  Trending Spot
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? "#94A3B8" : "#B45309", marginTop: 2 }}>
                  Sajek Valley (+48% visits)
                </Text>
              </Pressable>

              <Pressable
                style={{
                  width: 140,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#1E293B" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
                }}
                onPress={() => router.push("/screens/explore" as any)}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#10B98120", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Ionicons name="sunny" size={18} color="#059669" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#FFFFFF" : "#065F46" }}>
                  Weather Friendly
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? "#94A3B8" : "#047857", marginTop: 2 }}>
                  Cox's Bazar (Mild 24°C)
                </Text>
              </Pressable>

              <Pressable
                style={{
                  width: 140,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE",
                }}
                onPress={() => router.push("/screens/explore-trips" as any)}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#287DFA20", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Ionicons name="diamond" size={18} color="#1D4ED8" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#FFFFFF" : "#1E40AF" }}>
                  Hidden Gem
                </Text>
                <Text style={{ fontSize: 10, color: isDark ? "#94A3B8" : "#2563EB", marginTop: 2 }}>
                  Tanguar Haor Silence
                </Text>
              </Pressable>
            </ScrollView>

            {/* Live Destination Vitals for Selected Region (Image 1 UX Pattern) */}
            <View style={{ marginTop: 12 }}>
              <DestinationVitalsRow
                compact
                temperature={{ value: "Cold 16°C", condition: "Chilly morning mist" }}
                airQuality={{ aqi: 30, statusText: "Great" }}
                safety={{ statusText: "100% Safe" }}
                connectivity={{ statusText: "4G Active" }}
              />
            </View>
          </View>

          {/* ========================================================================= */}
          {/* 6. DISCOVER HEADER: "Discover ✨ | Nearby", "See All →"                  */}
          {/* ========================================================================= */}
          <View style={styles.discoverHeaderRow}>
            <View style={styles.discoverTitleGroup}>
              <Text
                style={[
                  styles.discoverHeading,
                  { color: isDark ? "#FFFFFF" : "#111827" },
                ]}
              >
                Discover
              </Text>
              <Text style={styles.discoverSparkle}>✨</Text>
              <Text style={styles.discoverDivider}> | </Text>
              <Pressable onPress={() => setActiveFeedTab(activeFeedTab === "discover" ? "nearby" : "discover")}>
                <Text
                  style={[
                    styles.discoverNearbyTab,
                    activeFeedTab === "nearby" && { color: theme.gold, fontWeight: "700" },
                  ]}
                >
                  Nearby
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push("/screens/explore" as any)}
            >
              <Text style={[styles.seeAllText, { color: theme.gold }]}>See All →</Text>
            </Pressable>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 7. FEATURED CARDS CAROUSEL: "Explore Asia" & "Trip.Tuesday" Verified Cards */}
        {/* ========================================================================= */}
        <View style={styles.cardsCarouselWrap}>
          {ads.length > 0 ? (
            ads.map((ad, index) => (
              <Pressable
                key={ad.id || `ad-${index}`}
                style={[
                  styles.featuredCard,
                  {
                    borderColor: theme.cardBorder,
                    shadowColor: isDark ? "#000" : "#94A3B8",
                  },
                ]}
                onPress={() => router.push((ad.target_url || "/screens/explore") as any)}
              >
                <ImageBackground
                  source={{
                    uri: ad.banner_url || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
                  }}
                  style={styles.featuredCardBg}
                  imageStyle={{ borderRadius: 20 }}
                >
                  <LinearGradient
                    colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.85)"]}
                    style={styles.featuredCardGradient}
                  >
                    <View style={styles.cardTopBadgeRow}>
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>
                          {ad.badge_text || "FEATURED"}
                        </Text>
                      </View>
                      <View style={styles.pageCounterPill}>
                        <Text style={styles.pageCounterText}>
                          {index + 1}/{ads.length}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardBottomContent}>
                      <Text style={styles.exploreAsiaTitle} numberOfLines={1}>
                        {ad.title}
                      </Text>
                      <Text style={styles.exploreAsiaSub} numberOfLines={2}>
                        {ad.subtitle || "Special deals & handpicked journeys"}
                      </Text>

                      <Pressable
                        style={[
                          styles.viewDealsBtn,
                          { backgroundColor: theme.ctaButtonBg },
                        ]}
                        onPress={() => router.push((ad.target_url || "/screens/explore") as any)}
                      >
                        <Text
                          style={[
                            styles.viewDealsBtnText,
                            { color: theme.ctaButtonText },
                          ]}
                        >
                          {ad.button_text || "View Deals →"}
                        </Text>
                      </Pressable>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))
          ) : (
            <>
              {/* Card 1: Explore Asia */}
          <Pressable
            style={[
              styles.featuredCard,
              {
                borderColor: theme.cardBorder,
                shadowColor: isDark ? "#000" : "#94A3B8",
              },
            ]}
            onPress={() => router.push("/screens/explore" as any)}
          >
            <ImageBackground
              source={{
                uri: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80",
              }}
              style={styles.featuredCardBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.85)"]}
                style={styles.featuredCardGradient}
              >
                {/* Top Badge & Counter */}
                <View style={styles.cardTopBadgeRow}>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>FEATURED</Text>
                  </View>
                  <View style={styles.pageCounterPill}>
                    <Text style={styles.pageCounterText}>1/3</Text>
                  </View>
                </View>

                {/* Bottom Content */}
                <View style={styles.cardBottomContent}>
                  <Text style={styles.exploreAsiaTitle}>
                    Explore <Text style={{ color: theme.gold }}>Asia</Text>
                  </Text>
                  <Text style={styles.exploreAsiaSub}>
                    Unforgettable journeys across Asia
                  </Text>

                  {/* Deals Pill */}
                  <View style={styles.specialOffersPill}>
                    <Ionicons name="gift" size={12} color="#FDE68A" />
                    <Text style={styles.specialOffersText}>
                      Special Offers & Deals
                    </Text>
                  </View>

                  {/* View Deals CTA Button */}
                  <Pressable
                    style={[
                      styles.viewDealsBtn,
                      { backgroundColor: theme.ctaButtonBg },
                    ]}
                    onPress={() => router.push("/screens/explore" as any)}
                  >
                    <Text
                      style={[
                        styles.viewDealsBtnText,
                        { color: theme.ctaButtonText },
                      ]}
                    >
                      View Deals →
                    </Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          {/* Card 2: Trip.Tuesday */}
          <Pressable
            style={[
              styles.featuredCard,
              {
                borderColor: theme.cardBorder,
                shadowColor: isDark ? "#000" : "#94A3B8",
              },
            ]}
            onPress={() => router.push("/screens/flights" as any)}
          >
            <ImageBackground
              source={{
                uri: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&auto=format&fit=crop&q=80",
              }}
              style={styles.featuredCardBg}
              imageStyle={{ borderRadius: 20 }}
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.88)"]}
                style={styles.featuredCardGradient}
              >
                {/* Top Title & Verified Badge */}
                <View style={styles.cardTopBadgeRow}>
                  <Text style={styles.tripTuesdayTitle}>Trip.Tuesday</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#18181B" />
                    <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                  </View>
                </View>

                {/* Bottom Content */}
                <View style={styles.cardBottomContent}>
                  <Text style={styles.tripTuesdaySub} numberOfLines={2}>
                    Trip.Tuesday – $99 Flights to Canada & Asia ($40 Cou...
                  </Text>

                  {/* Special Promo CTA Button */}
                  <Pressable
                    style={[
                      styles.specialPromoBtn,
                      { backgroundColor: theme.ctaButtonBg },
                    ]}
                    onPress={() => router.push("/screens/flights" as any)}
                  >
                    <Text
                      style={[
                        styles.specialPromoBtnText,
                        { color: theme.ctaButtonText },
                      ]}
                    >
                      SPECIAL PROMO
                    </Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>
            </>
          )} 
        </View>

        {/* ========================================================================= */}
        {/* 8. LIVE COMMUNITY & HOTEL FEED (Dynamic from Supabase)                    */}
        {/* ========================================================================= */}
        {communityPosts.length > 0 && (
          <View style={styles.masonryFeedGrid}>
            {/* Left Column */}
            <View style={styles.masonryColumn}>
              {leftPosts.map((post) => {
                const isLiked = likedPostIds.has(post.id);
                const postImage =
                  post.media?.[0]?.media_url ||
                  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500";
                const authorName =
                  post.author?.username || post.author?.display_name || "Traveler";

                return (
                  <Pressable
                    key={post.id}
                    style={[
                      styles.feedCard,
                      {
                        backgroundColor: isDark ? "#121622" : "#FFFFFF",
                        borderColor: theme.cardBorder,
                      },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/community" as any,
                        params: { postId: post.id },
                      })
                    }
                  >
                    <Image source={{ uri: postImage }} style={styles.feedCardImage} />
                    <View style={styles.feedCardContent}>
                      <Text
                        style={[
                          styles.feedCardTitle,
                          { color: isDark ? "#F8FAFC" : "#0F172A" },
                        ]}
                        numberOfLines={2}
                      >
                        {post.title}
                      </Text>
                      <View style={styles.feedCardAuthorRow}>
                        <Text
                          style={[
                            styles.feedAuthorName,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                          numberOfLines={1}
                        >
                          {authorName}
                        </Text>
                        <Pressable
                          style={styles.feedLikeBtn}
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
                              styles.feedLikeCount,
                              { color: isLiked ? "#EF4444" : "#94A3B8" },
                            ]}
                          >
                            {post.likes_count}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Right Column */}
            <View style={styles.masonryColumn}>
              {rightPosts.map((post) => {
                const isLiked = likedPostIds.has(post.id);
                const postImage =
                  post.media?.[0]?.media_url ||
                  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500";
                const authorName =
                  post.author?.username || post.author?.display_name || "Traveler";

                return (
                  <Pressable
                    key={post.id}
                    style={[
                      styles.feedCard,
                      {
                        backgroundColor: isDark ? "#121622" : "#FFFFFF",
                        borderColor: theme.cardBorder,
                      },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/community" as any,
                        params: { postId: post.id },
                      })
                    }
                  >
                    <Image source={{ uri: postImage }} style={styles.feedCardImage} />
                    <View style={styles.feedCardContent}>
                      <Text
                        style={[
                          styles.feedCardTitle,
                          { color: isDark ? "#F8FAFC" : "#0F172A" },
                        ]}
                        numberOfLines={2}
                      >
                        {post.title}
                      </Text>
                      <View style={styles.feedCardAuthorRow}>
                        <Text
                          style={[
                            styles.feedAuthorName,
                            { color: isDark ? "#94A3B8" : "#64748B" },
                          ]}
                          numberOfLines={1}
                        >
                          {authorName}
                        </Text>
                        <Pressable
                          style={styles.feedLikeBtn}
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
                              styles.feedLikeCount,
                              { color: isLiked ? "#EF4444" : "#94A3B8" },
                            ]}
                          >
                            {post.likes_count}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Space at bottom for floating navigation bar */}
        <View style={{ height: 130 }} />
      </Animated.ScrollView>

      {/* Promo Exclusive Voucher Modal */}
      <PromoExclusiveModal
        visible={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onClaimAll={() => setShowPromoModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 20,
  },
  heroHeaderContainer: {
    width: "100%",
    paddingBottom: 4,
  },
  heroHeaderGradient: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    position: "relative",
  },
  airplaneHorizonOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    height: 120,
    overflow: "hidden",
  },
  earthHorizonCurve: {
    position: "absolute",
    top: 48,
    right: -30,
    width: 280,
    height: 180,
    borderRadius: 140,
    borderWidth: 1.5,
  },
  airplaneContrail: {
    position: "absolute",
    top: 26,
    right: 70,
    width: 90,
    height: 1.5,
    transform: [{ rotate: "-22deg" }],
    borderRadius: 1,
  },
  airplaneIcon: {
    position: "absolute",
    top: 10,
    right: 54,
    transform: [{ rotate: "45deg" }],
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    zIndex: 2,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  goldAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  goldAvatarGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  goldAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18181B",
  },

  // Category Grid Card
  categoryGridCard: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
  },
  categoryCol: {
    alignItems: "center",
    width: "23%",
  },
  categoryColSecondary: {
    alignItems: "center",
    width: "19%",
  },
  goldIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FBF0DC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  goldIconCircleSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FBF0DC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  moreIconCircleBg: {
    backgroundColor: "#18181B",
  },
  categoryLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  categoryLabelTextSecondary: {
    fontSize: 10,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    lineHeight: 12,
  },

  // Search Section
  searchSectionWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  searchBarPill: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 26,
    paddingLeft: 14,
    paddingRight: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  chatIconBox: {
    marginRight: 10,
  },
  searchInputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  goldSearchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  goldSearchGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Location Tags Row
  locationTagsScroll: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
    alignItems: "center",
  },
  locationPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  locationThumbPhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#18181B",
  },

  // Sub-Category Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  quickActionCol: {
    alignItems: "center",
    width: "23%",
  },
  quickActionCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  // Discover Section Header
  discoverHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 12,
  },
  discoverTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  discoverHeading: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  discoverSparkle: {
    fontSize: 16,
    marginLeft: 3,
  },
  discoverDivider: {
    fontSize: 18,
    color: "#64748B",
  },
  discoverNearbyTab: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94A3B8",
  },
  seeAllBtn: {
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Featured Cards Carousel
  cardsCarouselWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  featuredCard: {
    flex: 1,
    height: 250,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  featuredCardBg: {
    width: "100%",
    height: "100%",
  },
  featuredCardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardTopBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredBadge: {
    backgroundColor: "#E5A93C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#18181B",
    letterSpacing: 0.4,
  },
  pageCounterPill: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pageCounterText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardBottomContent: {
    gap: 6,
  },
  exploreAsiaTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  exploreAsiaSub: {
    fontSize: 11,
    color: "#E2E8F0",
    lineHeight: 14,
  },
  specialOffersPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 28, 38, 0.75)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  specialOffersText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FDE68A",
  },
  viewDealsBtn: {
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  viewDealsBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },

  // Trip.Tuesday Card
  tripTuesdayTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5A93C",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#18181B",
  },
  tripTuesdaySub: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 15,
  },
  specialPromoBtn: {
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  specialPromoBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Feed Masonry Grid
  masonryFeedGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  masonryColumn: {
    flex: 1,
    gap: 12,
  },
  feedCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  feedCardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#1E2638",
  },
  feedCardContent: {
    padding: 10,
    gap: 6,
  },
  feedCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  feedCardAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedAuthorName: {
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
  },
  feedLikeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  feedLikeCount: {
    fontSize: 11,
    fontWeight: "600",
  },
});
