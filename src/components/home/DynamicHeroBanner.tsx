import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HeroBanner, TrendingSearchItem, UnifiedSearchResult, SearchCategory } from "../../types/heroBanner";
import { heroBannerService, DEFAULT_FALLBACK_BANNER } from "../../services/heroBannerService";
import { trendingSearchService, DEFAULT_FALLBACK_TRENDING } from "../../services/trendingSearchService";
import { unifiedSearchEngine } from "../../services/unifiedSearchEngine";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../theme";

const { width: WINDOW_WIDTH } = Dimensions.get("window");
const RECENT_SEARCHES_KEY = "@antigravity:recent_home_searches_v2";

export interface DynamicHeroBannerProps {
  onCategoryPress?: (category: string) => void;
  onSearchSubmit?: (query: string) => void;
  refreshTrigger?: number;
}

export const DynamicHeroBanner: React.FC<DynamicHeroBannerProps> = ({
  onCategoryPress,
  onSearchSubmit,
  refreshTrigger,
}) => {
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Dynamic Data States
  const [banners, setBanners] = useState<HeroBanner[]>([DEFAULT_FALLBACK_BANNER]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [trendingList, setTrendingList] = useState<TrendingSearchItem[]>(DEFAULT_FALLBACK_TRENDING);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchCategory>("all");

  const activeBanner = banners[currentSlideIndex] || banners[0] || DEFAULT_FALLBACK_BANNER;

  // Search Results States
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const slideFadeAnim = useRef(new Animated.Value(1)).current;
  const slideTranslateX = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<any>(null);

  // 1. Load Dynamic Hero Banner and Trending searches from DB
  const loadDynamicBannerData = useCallback(async () => {
    try {
      const [fetchedBanners, trending] = await Promise.all([
        heroBannerService.getActiveBanners(),
        trendingSearchService.getActiveTrending(),
      ]);

      if (fetchedBanners && fetchedBanners.length > 0) {
        setBanners(fetchedBanners);
      }
      if (trending && trending.length > 0) {
        setTrendingList(trending);
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic hero banner data:", err);
    }
  }, []);

  // 2. Load Recent Searches from AsyncStorage
  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 6));
        }
      }
    } catch {
      // ignore storage error
    }
  }, []);

  const saveRecentSearch = async (query: string) => {
    if (!query || !query.trim()) return;
    const clean = query.trim();
    try {
      const updated = [clean, ...recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadDynamicBannerData();
    loadRecentSearches();
  }, [loadDynamicBannerData, loadRecentSearches, refreshTrigger]);

  // Entrance & Loop Animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse for badge
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  // Dropdown open/close animation
  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFocused, dropdownAnim]);

  // Smooth Slide Transition Function
  const goToSlide = useCallback(
    (nextIndex: number, direction: "next" | "prev" = "next") => {
      if (banners.length <= 1) return;
      const target = (nextIndex + banners.length) % banners.length;

      Animated.parallel([
        Animated.timing(slideFadeAnim, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideTranslateX, {
          toValue: direction === "next" ? -24 : 24,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentSlideIndex(target);
        slideTranslateX.setValue(direction === "next" ? 24 : -24);
        Animated.parallel([
          Animated.timing(slideFadeAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideTranslateX, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [banners.length, slideFadeAnim, slideTranslateX]
  );

  // Automatic Slide Show Timer (every 5.5s, pauses when typing/focused on search)
  useEffect(() => {
    if (isFocused || banners.length <= 1) return;
    const interval = setInterval(() => {
      goToSlide(currentSlideIndex + 1, "next");
    }, 5500);
    return () => clearInterval(interval);
  }, [isFocused, banners.length, currentSlideIndex, goToSlide]);

  // Live Multi-Category Omni Search Engine Debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await unifiedSearchEngine.searchEverything(searchQuery, selectedFilter);
        setSearchResults(results);
      } catch (e) {
        console.warn("Unified search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, selectedFilter]);

  // Execute Search
  const handleExecuteSearch = (targetQuery?: string) => {
    const finalQuery = (targetQuery !== undefined ? targetQuery : searchQuery).trim();
    if (!finalQuery) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveRecentSearch(finalQuery);
    setIsFocused(false);
    Keyboard.dismiss();

    if (onSearchSubmit) {
      onSearchSubmit(finalQuery);
    } else {
      router.push({
        pathname: "/screens/search" as any,
        params: { q: finalQuery },
      });
    }
  };

  // Select Item from search dropdown
  const handleSelectResult = (item: UnifiedSearchResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveRecentSearch(item.title);
    setIsFocused(false);
    Keyboard.dismiss();

    if (item.route) {
      router.push({
        pathname: item.route as any,
        params: item.params || {},
      });
    }
  };

  // Nav Items
  const NAV_LINKS = [
    { label: "Explore", route: "/screens/explore" },
    { label: "Itineraries", route: "/screens/explore-trips" },
    { label: "AI Travel", route: "/screens/travel-intelligence" },
    { label: "More", route: "/screens/packages", hasDropdown: true },
  ];

  // Service categories underneath wave
  const SERVICE_CATEGORIES = [
    {
      id: "hotels",
      label: "Hotels",
      icon: "bed" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#EFF6FF",
      iconColor: "#2563EB",
      route: "/screens/search-stays",
    },
    {
      id: "flights",
      label: "Flights",
      icon: "airplane" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#EBF3FF",
      iconColor: "#0055F2",
      route: "/screens/flights",
    },
    {
      id: "buses",
      label: "Launch & Bus",
      icon: "boat" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#FEF3C7",
      iconColor: "#D97706",
      route: "/screens/bus-launch",
    },
    {
      id: "trains",
      label: "Trains",
      icon: "train" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#F0FDF4",
      iconColor: "#16A34A",
      route: "/screens/trains",
    },
    {
      id: "buddy",
      label: "Travel Buddy",
      icon: "people" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#FDF2F8",
      iconColor: "#DB2777",
      route: "/screens/travel-match",
    },
    {
      id: "packages",
      label: "Packages",
      icon: "earth" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#ECFDF5",
      iconColor: "#059669",
      route: "/screens/packages",
    },
    {
      id: "cars",
      label: "Car Rentals",
      icon: "car" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#FFFBEB",
      iconColor: "#B45309",
      route: "/screens/car-rentals",
    },
    {
      id: "activities",
      label: "Attractions",
      icon: "map" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#F3E8FF",
      iconColor: "#9333EA",
      route: "/screens/recommended-tours",
    },
    {
      id: "more",
      label: "More",
      icon: "grid" as const,
      iconFamily: "Ionicons" as const,
      bgColor: "#F1F5F9",
      iconColor: "#475569",
      route: "/screens/explore",
    },
  ];

  const handleCategoryClick = (cat: typeof SERVICE_CATEGORIES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCategoryPress) {
      onCategoryPress(cat.id);
    } else {
      router.push(cat.route as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* ========================================================================= */}
      {/* 1. HERO BACKGROUND IMAGE WITH PARALLAX & TINT                            */}
      {/* ========================================================================= */}
      <ImageBackground
        source={{ uri: activeBanner.image_url }}
        style={styles.heroBackground}
        resizeMode="cover"
      >
        {/* Multi-layer Dark Gradient for high readability */}
        <LinearGradient
          colors={[
            "rgba(10, 24, 48, 0.65)",
            "rgba(15, 36, 68, 0.45)",
            "rgba(10, 24, 48, 0.8)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Ambient Top Light Beam for realism */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.22)", "transparent"]}
          style={styles.topLightBeam}
          pointerEvents="none"
        />

        {/* ========================================================================= */}
        {/* 2. TOP HEADER BAR: Brand + Nav Links (Web) + Profile, Notification, Theme */}
        {/* ========================================================================= */}
        <View style={styles.topHeaderBar}>
          {/* Brand Logo & Name */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.brandGroup}
            onPress={() => router.push("/(tabs)" as any)}
          >
            <View style={styles.brandIconCircle}>
              <Ionicons name="paper-plane" size={17} color="#0055F2" style={styles.brandIconRotated} />
            </View>
            <Text style={styles.brandTitleText}>
              {activeBanner.brand_title || "ShopnoJatra"}
            </Text>
          </TouchableOpacity>

          {/* Desktop/Tablet Web Navigation Links */}
          {Platform.OS === "web" && (
            <View style={styles.webNavLinks}>
              {NAV_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  activeOpacity={0.7}
                  style={styles.webNavLinkItem}
                  onPress={() => router.push(link.route as any)}
                >
                  <Text style={styles.webNavLinkText}>{link.label}</Text>
                  {link.hasDropdown && (
                    <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.8)" style={{ marginLeft: 3 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Right Action Icons Group */}
          <View style={styles.headerRightGroup}>
            {/* Theme Toggle (Light / Dark) */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerActionBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              accessibilityLabel="Toggle Theme"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Saved / Wishlist Items */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerActionBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/saved" as any);
              }}
              accessibilityLabel="Saved Items"
            >
              <Ionicons name="heart-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Notification Bell with Dynamic Unread Badge */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerActionBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/screens/settings" as any);
              }}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Admin Portal Quick Switcher (For convenience) */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.headerActionBtn, styles.adminPillBtn]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/admin" as any);
              }}
              accessibilityLabel="Admin Portal"
            >
              <MaterialCommunityIcons name="shield-crown" size={16} color="#FDE047" />
            </TouchableOpacity>

            {/* Small Profile Avatar (Matching Screenshot) */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.profileAvatarButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/account" as any);
              }}
              accessibilityLabel="Profile Account"
            >
              <Image
                source={{
                  uri:
                    user?.user_metadata?.avatar_url ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                }}
                style={styles.profileAvatarImg}
              />
              <View style={styles.profileOnlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 3. HERO CONTENT: Headline + Subtitle + Dynamic Badge                      */}
        {/* ========================================================================= */}
        <Animated.View
          style={[
            styles.heroContentBody,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Animated Slide Content (Title, Subtitle, Badge) */}
          <Animated.View
            style={{
              opacity: slideFadeAnim,
              transform: [{ translateX: slideTranslateX }],
            }}
          >
            {/* Badge Tag */}
            {activeBanner.badge_text ? (
              <Animated.View
                style={[
                  styles.badgeContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Ionicons name={"sparkles" as any} size={13} color="#60A5FA" style={{ marginRight: 5 }} />
                <Text style={styles.badgeText}>{activeBanner.badge_text.toUpperCase()}</Text>
              </Animated.View>
            ) : null}

            {/* Main Title (Exact wording & styling from user request) */}
            <Text style={styles.heroTitle}>{activeBanner.title}</Text>

            {/* Subtitle / Description */}
            <Text style={styles.heroSubtitle}>{activeBanner.subtitle}</Text>
          </Animated.View>

          {/* ========================================================================= */}
          {/* 4. SEARCH BAR: Integrated Omnibar with Auto-Suggest & Trending            */}
          {/* ========================================================================= */}
          <View style={styles.searchBarWrapper}>
            <View
              style={[
                styles.searchBarContainer,
                isFocused && styles.searchBarContainerFocused,
              ]}
            >
              {/* Search Icon */}
              <Ionicons
                name="search"
                size={20}
                color={isFocused ? "#0055F2" : "#64748B"}
                style={styles.searchBarIcon}
              />

              {/* Text Input for live search */}
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                placeholder={activeBanner.search_placeholder || "Where do you want to go?"}
                placeholderTextColor="#94A3B8"
                onChangeText={setSearchQuery}
                onFocus={() => setIsFocused(true)}
                onSubmitEditing={() => handleExecuteSearch()}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Clear button when query is present */}
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearBtn}
                  onPress={() => setSearchQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}

              {/* Blue Search Button (Exact shape & vibrant blue from screenshot) */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.searchActionButton}
                onPress={() => handleExecuteSearch()}
              >
                <Text style={styles.searchActionButtonText}>
                  {activeBanner.search_button_text || "Search"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ========================================================================= */}
            {/* 5. AUTO-SUGGESTION & TRENDING DROPDOWN OVERLAY                            */}
            {/* ========================================================================= */}
            {isFocused && (
              <Animated.View
                style={[
                  styles.dropdownOverlay,
                  {
                    opacity: dropdownAnim,
                    transform: [
                      {
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-10, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Category Filter Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterPillsRow}
                >
                  {[
                    { id: "all" as const, label: "All Items", icon: "apps-outline" },
                    { id: "destinations" as const, label: "Destinations", icon: "location-outline" },
                    { id: "hotels" as const, label: "Hotels", icon: "bed-outline" },
                    { id: "packages" as const, label: "Packages", icon: "bag-check-outline" },
                    { id: "trains" as const, label: "Trains", icon: "train-outline" },
                    { id: "flights" as const, label: "Flights", icon: "airplane-outline" },
                  ].map((filter) => {
                    const isSelected = selectedFilter === filter.id;
                    return (
                      <TouchableOpacity
                        key={filter.id}
                        style={[
                          styles.filterPill,
                          isSelected && styles.filterPillActive,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedFilter(filter.id);
                        }}
                      >
                        <Ionicons
                          name={filter.icon as any}
                          size={14}
                          color={isSelected ? "#FFFFFF" : "#64748B"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.filterPillText,
                            isSelected && styles.filterPillTextActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* State A: Loading Indicator */}
                {isSearching && (
                  <View style={styles.dropdownLoadingRow}>
                    <ActivityIndicator size="small" color="#0055F2" />
                    <Text style={styles.dropdownLoadingText}>Searching destinations, hotels & packages...</Text>
                  </View>
                )}

                {/* State B: Live Search Engine Results */}
                {!isSearching && searchQuery.trim().length > 0 && (
                  <ScrollView
                    style={styles.resultsScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.resultItemRow}
                          activeOpacity={0.7}
                          onPress={() => handleSelectResult(item)}
                        >
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.resultThumbnail} />
                          ) : (
                            <View style={styles.resultIconFallback}>
                              <Ionicons
                                name={
                                  item.category === "hotels"
                                    ? "bed"
                                    : item.category === "flights"
                                    ? "airplane"
                                    : item.category === "trains"
                                    ? "train"
                                    : "location"
                                }
                                size={18}
                                color="#0055F2"
                              />
                            </View>
                          )}
                          <View style={styles.resultMetaCol}>
                            <View style={styles.resultTitleLine}>
                              <Text style={styles.resultTitleText} numberOfLines={1}>
                                {item.title}
                              </Text>
                              {item.badge && (
                                <View style={styles.resultBadge}>
                                  <Text style={styles.resultBadgeText}>{item.badge}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.resultSubtitleText} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          </View>
                          {item.price ? (
                            <View style={styles.resultPriceCol}>
                              <Text style={styles.resultPriceText}>
                                {item.currency || "BDT"} {item.price}
                              </Text>
                              <Text style={styles.resultCategoryLabel}>{item.categoryLabel}</Text>
                            </View>
                          ) : (
                            <Ionicons name="arrow-forward-circle-outline" size={20} color="#94A3B8" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyResultsBox}>
                        <Ionicons name="search-outline" size={28} color="#94A3B8" />
                        <Text style={styles.emptyResultsText}>
                          No instant matches found for "{searchQuery}".
                        </Text>
                        <TouchableOpacity
                          style={styles.searchAllBtn}
                          onPress={() => handleExecuteSearch()}
                        >
                          <Text style={styles.searchAllBtnText}>Search all categories ➔</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* State C: Suggestions & Trending (When query is empty or focused) */}
                {searchQuery.trim().length === 0 && (
                  <ScrollView
                    style={styles.suggestionsScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {/* 1. MOST TRENDING SEARCHES (Dynamic from DB!) */}
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="flame" size={17} color="#EA580C" style={{ marginRight: 5 }} />
                        <Text style={styles.sectionTitle}>Most Trending Destinations</Text>
                      </View>
                      <View style={styles.adminBadgeTag}>
                        <Text style={styles.adminBadgeTagText}>DYNAMIC</Text>
                      </View>
                    </View>

                    <View style={styles.trendingWrap}>
                      {trendingList.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          style={styles.trendingPill}
                          onPress={() => {
                            setSearchQuery(item.query_text);
                            handleExecuteSearch(item.query_text);
                          }}
                        >
                          <Ionicons
                            name={(item.icon_name as any) || "trending-up"}
                            size={14}
                            color="#EA580C"
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.trendingPillText}>{item.query_text}</Text>
                          {item.badge_tag && (
                            <View style={styles.hotTag}>
                              <Text style={styles.hotTagText}>{item.badge_tag}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 2. RECENT SEARCHES (Stored in AsyncStorage) */}
                    {recentSearches.length > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <View style={styles.sectionHeaderRow}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 5 }} />
                            <Text style={styles.sectionTitle}>Recent Searches</Text>
                          </View>
                          <TouchableOpacity onPress={clearRecentSearches}>
                            <Text style={styles.clearAllBtnText}>Clear all</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.recentWrap}>
                          {recentSearches.map((term, index) => (
                            <TouchableOpacity
                              key={`${term}-${index}`}
                              style={styles.recentItemRow}
                              onPress={() => {
                                setSearchQuery(term);
                                handleExecuteSearch(term);
                              }}
                            >
                              <Ionicons name="search-outline" size={14} color="#94A3B8" style={{ marginRight: 8 }} />
                              <Text style={styles.recentItemText}>{term}</Text>
                              <Ionicons name="arrow-up-outline" size={14} color="#CBD5E1" style={styles.recentArrowRotated} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Close / Dismiss Bar */}
                    <TouchableOpacity
                      style={styles.dropdownCloseRow}
                      onPress={() => {
                        setIsFocused(false);
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={styles.dropdownCloseText}>Close Suggestions ✕</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </Animated.View>
            )}
          </View>

          {/* Slide Pagination Dots (When multiple banners are active in slideshow) */}
          {banners.length > 1 && (
            <View style={styles.slidePaginationContainer}>
              {banners.map((b, idx) => (
                <TouchableOpacity
                  key={b.id || idx}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    goToSlide(idx, idx > currentSlideIndex ? "next" : "prev");
                  }}
                  style={[
                    styles.paginationDot,
                    idx === currentSlideIndex && styles.paginationDotActive,
                  ]}
                  accessibilityLabel={`Go to slide ${idx + 1}`}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* Previous & Next Slide Controls (Visible when more than 1 banner) */}
        {banners.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.sliderNavBtn, styles.sliderNavBtnLeft]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                goToSlide(currentSlideIndex - 1, "prev");
              }}
              accessibilityLabel="Previous Banner"
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sliderNavBtn, styles.sliderNavBtnRight]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                goToSlide(currentSlideIndex + 1, "next");
              }}
              accessibilityLabel="Next Banner"
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}

        {/* ========================================================================= */}
        {/* 6. BEAUTIFUL WAVY BOTTOM TRANSITION (Exact replica of attached screenshot)*/}
        {/* ========================================================================= */}
        <View style={styles.waveDividerWrapper} pointerEvents="none">
          <Svg
            viewBox="0 0 1440 120"
            style={styles.waveSvg}
            preserveAspectRatio="none"
          >
            <Path
              d="M0,32L48,42.7C96,53,192,75,288,74.7C384,75,480,53,576,42.7C672,32,768,32,864,42.7C960,53,1056,75,1152,80C1248,85,1344,75,1392,69.3L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill={isDark ? "#0A0F1D" : "#FFFFFF"}
            />
          </Svg>
        </View>
      </ImageBackground>

      {/* ========================================================================= */}
      {/* 7. DOCKED CATEGORY SERVICES ROW (Flights, Hotels, Trains, Buses, etc.)   */}
      {/* ========================================================================= */}
      <View
        style={[
          styles.serviceGridContainer,
          { backgroundColor: isDark ? "#0A0F1D" : "#FFFFFF" },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.serviceRowContent}
        >
          {SERVICE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.75}
              style={styles.serviceCategoryBtn}
              onPress={() => handleCategoryClick(cat)}
            >
              <View
                style={[
                  styles.serviceIconCircle,
                  {
                    backgroundColor: isDark ? "#1E293B" : cat.bgColor,
                    borderColor: isDark ? "#334155" : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={isDark ? "#60A5FA" : cat.iconColor}
                />
              </View>
              <Text
                style={[
                  styles.serviceLabelText,
                  { color: isDark ? "#E2E8F0" : "#334155" },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
  },
  heroBackground: {
    width: "100%",
    minHeight: Platform.OS === "web" ? 380 : 350,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  topLightBeam: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },

  // 1. Top Header Bar
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 14,
    paddingBottom: 10,
    zIndex: 20,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  brandIconRotated: {
    transform: [{ rotate: "-20deg" }],
  },
  brandTitleText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Web Navigation Links
  webNavLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  webNavLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  webNavLinkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Right Action Group
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  adminPillBtn: {
    backgroundColor: "rgba(234, 179, 8, 0.25)",
    borderColor: "rgba(253, 224, 71, 0.45)",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  profileAvatarButton: {
    position: "relative",
    marginLeft: 2,
  },
  profileAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  // 2. Hero Content
  heroContentBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    zIndex: 10,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 85, 242, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.5)",
  },
  badgeText: {
    color: "#BAE6FD",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: Platform.OS === "web" ? 34 : 28,
    fontWeight: "900",
    lineHeight: Platform.OS === "web" ? 42 : 34,
    letterSpacing: -0.5,
    marginBottom: 6,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 18,
    maxWidth: 580,
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // 3. Search Bar
  searchBarWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: 680,
    zIndex: 50,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  searchBarContainerFocused: {
    borderColor: "#0055F2",
    shadowColor: "#0055F2",
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    height: 42,
  },
  searchClearBtn: {
    padding: 6,
  },
  searchActionButton: {
    backgroundColor: "#0055F2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  searchActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // 4. Dropdown Auto-Suggest & Trending
  dropdownOverlay: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxHeight: 380,
    zIndex: 999,
  },
  filterPillsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  filterPillActive: {
    backgroundColor: "#0055F2",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  dropdownLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  dropdownLoadingText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
  resultsScroll: {
    maxHeight: 280,
  },
  resultItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resultThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#E2E8F0",
  },
  resultIconFallback: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  resultMetaCol: {
    flex: 1,
    marginRight: 8,
  },
  resultTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  resultTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flexShrink: 1,
  },
  resultBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultBadgeText: {
    color: "#0055F2",
    fontSize: 9,
    fontWeight: "800",
  },
  resultSubtitleText: {
    fontSize: 12,
    color: "#64748B",
  },
  resultPriceCol: {
    alignItems: "flex-end",
  },
  resultPriceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#059669",
  },
  resultCategoryLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  emptyResultsBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyResultsText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  searchAllBtn: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchAllBtnText: {
    color: "#0055F2",
    fontSize: 12,
    fontWeight: "700",
  },

  // Suggestions & Trending
  suggestionsScroll: {
    maxHeight: 300,
    paddingHorizontal: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  adminBadgeTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeTagText: {
    color: "#B45309",
    fontSize: 9,
    fontWeight: "800",
  },
  trendingWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trendingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendingPillText: {
    color: "#C2410C",
    fontSize: 12,
    fontWeight: "600",
  },
  hotTag: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  hotTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  clearAllBtnText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  recentWrap: {
    gap: 6,
  },
  recentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  recentItemText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  recentArrowRotated: {
    transform: [{ rotate: "45deg" }],
  },
  dropdownCloseRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  dropdownCloseText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },

  // 5. Wavy Divider
  waveDividerWrapper: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 48,
    zIndex: 5,
  },
  waveSvg: {
    width: "100%",
    height: "100%",
  },

  // Slideshow Pagination & Nav Arrows
  slidePaginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
    zIndex: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  paginationDotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderNavBtn: {
    position: "absolute",
    top: "42%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  sliderNavBtnLeft: {
    left: 8,
  },
  sliderNavBtnRight: {
    right: 8,
  },

  // 6. Docked Service Categories Row
  serviceGridContainer: {
    width: "100%",
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  serviceRowContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    minWidth: "100%",
    gap: 8,
  },
  serviceCategoryBtn: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  serviceLabelText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
