import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../hooks/useAuth";
import { PromoExclusiveModal } from "../components/PromoExclusiveModal";
import { AiPill, BottomNav } from "./Navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_LIGHT_BLUE = "#EAF2FF";
const ACCENT_YELLOW = "#FACC15";

const REFRESH_THRESHOLD = 80;
const REFRESH_MAX_PULL = 135;
const REFRESH_LOCK_HEIGHT = 95;

const elasticPullDistance = (distance: number) =>
  Math.min(REFRESH_MAX_PULL, distance / (1 + distance / 220));

export function HomeScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("Bali");
  const [activeFeedTab, setActiveFeedTab] = useState<"discover" | "nearby">("discover");
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const pullDistance = useRef(new Animated.Value(0)).current;
  const spinnerRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  const isAtTopRef = useRef(true);
  const isArmedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const scrollRef = useRef<any>(null);

  // Auto-show promo modal once on mount for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPromoModal(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Monitor scroll position for sticky header and Back-to-Top morphing tab button
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      isAtTopRef.current = value <= 5;

      // Over-scroll pull distance handling when scrolling past top (value < 0)
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

  // Pulsing ring animation when refresh is armed or loading
  useEffect(() => {
    if (isArmed || isRefreshing) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isArmed, isRefreshing, pulseAnim]);

  // Clean animation completion helper
  const snapBackToZero = useCallback(() => {
    isArmedRef.current = false;
    setIsArmed(false);
    Animated.timing(pullDistance, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      pullDistance.setValue(0);
    });
  }, [pullDistance]);

  // Handle pull to refresh logic with guaranteed completion
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

    // Simulate backend data sync delay
    await new Promise((resolve) => setTimeout(resolve, 1300));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    isRefreshingRef.current = false;
    setIsRefreshing(false);

    Animated.timing(pullDistance, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      pullDistance.setValue(0);
    });
  }, [pullDistance]);

  const triggerRefreshRef = useRef(triggerRefresh);
  useEffect(() => {
    triggerRefreshRef.current = triggerRefresh;
  }, [triggerRefresh]);

  // Continuous Globe Rotation loop when refreshing
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

  // Handle scroll drag end to trigger refresh if armed or snap back cleanly
  const handleScrollEndDrag = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    if (offsetY <= -REFRESH_THRESHOLD || isArmedRef.current) {
      triggerRefreshRef.current();
    } else if (!isRefreshingRef.current) {
      snapBackToZero();
    }
  };

  // Dedicated Header PanResponder capturing downward drag gestures seamlessly
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return !isRefreshingRef.current && isAtTopRef.current && dy > 6 && dy > Math.abs(dx);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return !isRefreshingRef.current && isAtTopRef.current && dy > 10 && dy > Math.abs(dx);
      },
      onPanResponderGrant: () => {
        pullDistance.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isRefreshingRef.current || !isAtTopRef.current) return;
        const nextDistance = elasticPullDistance(Math.max(0, gestureState.dy));
        pullDistance.setValue(nextDistance);

        if (nextDistance >= REFRESH_THRESHOLD && !isArmedRef.current) {
          isArmedRef.current = true;
          setIsArmed(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (nextDistance < REFRESH_THRESHOLD && isArmedRef.current) {
          isArmedRef.current = false;
          setIsArmed(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isRefreshingRef.current) return;
        const nextDistance = elasticPullDistance(Math.max(0, gestureState.dy));
        if (nextDistance >= REFRESH_THRESHOLD) {
          triggerRefreshRef.current();
          return;
        }
        snapBackToZero();
      },
      onPanResponderTerminate: () => {
        if (!isRefreshingRef.current) {
          snapBackToZero();
        }
      },
    })
  ).current;

  // Interpolated Animation Values
  const pullProgress = useMemo(
    () =>
      pullDistance.interpolate({
        inputRange: [0, REFRESH_MAX_PULL],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [pullDistance]
  );

  const containerOpacity = useMemo(
    () =>
      pullDistance.interpolate({
        inputRange: [0, 4, 30],
        outputRange: [0, 0.6, 1],
        extrapolate: "clamp",
      }),
    [pullDistance]
  );

  const globeScale = useMemo(
    () =>
      pullProgress.interpolate({
        inputRange: [0, 0.4, 0.8, 1],
        outputRange: [0.5, 0.85, 1.12, 1.0],
        extrapolate: "clamp",
      }),
    [pullProgress]
  );

  const globeOpacity = useMemo(
    () =>
      pullProgress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 0.8, 1],
        extrapolate: "clamp",
      }),
    [pullProgress]
  );

  const earthRotate = useMemo(
    () =>
      pullProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [pullProgress]
  );

  const spinnerRotateProgress = useMemo(
    () =>
      spinnerRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [spinnerRotate]
  );

  const auraScale = useMemo(
    () =>
      pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.35],
      }),
    [pulseAnim]
  );

  const auraOpacity = useMemo(
    () =>
      pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0],
      }),
    [pulseAnim]
  );

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={TRIP_BLUE} />

      {/* Screenshot 4: Pull Down Refresh Header Overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.refreshContainer,
          {
            height: pullDistance,
            opacity: containerOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={
            isRefreshing
              ? ["#0038A8", "#0055F2"]
              : isArmed
              ? ["#0044C7", "#0055F2"]
              : ["#002D88", "#0055F2"]
          }
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.refreshContent, { opacity: globeOpacity }]}>
          {/* Animated Pulsing Aura Ring */}
          {(isArmed || isRefreshing) && (
            <Animated.View
              style={[
                styles.pulseAuraRing,
                {
                  transform: [{ scale: auraScale }],
                  opacity: auraOpacity,
                },
              ]}
            />
          )}

          {/* Globe Emblem Badge Circle with White Ring */}
          <Animated.View
            style={[
              styles.globeEmblemBadge,
              { transform: [{ scale: globeScale }] },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { rotate: isRefreshing ? spinnerRotateProgress : earthRotate },
                ],
              }}
            >
              <Ionicons name="earth" size={28} color="#FFFFFF" />
            </Animated.View>
          </Animated.View>

          <Text style={styles.refreshStatusText}>
            {isRefreshing
              ? "Updating Trip.com..."
              : isArmed
              ? "Release to refresh"
              : "Pull down to refresh"}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Main Scrollable View */}
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: pullDistance as any },
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={triggerRefresh}
            tintColor="transparent"
            colors={["#0055F2"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* Section 0: Blue Header Bar & Category Grids */}
        <View style={styles.topSectionWrapper} {...headerPanResponder.panHandlers}>
          {/* Screenshot 2 & 4 Header Bar */}
          <View style={styles.blueHeaderBar}>
            <View style={styles.logoRow}>
              <Pressable
                onPress={() => triggerRefresh()}
                style={styles.logoPressArea}
              >
                <Text style={styles.tripLogoText}>
                  Trip.com
                </Text>
              </Pressable>

              {/* Yellow Coin Tier Badge */}
              <Pressable
                style={styles.goldCoinBadge}
                onPress={() => setShowPromoModal(true)}
              >
                <Text style={styles.goldCoinText}>T</Text>
              </Pressable>
            </View>
          </View>

          {/* Curved Body Sheet */}
          <View style={styles.curvedBodySheet}>
            {/* Primary Categories Grid (Row 1) */}
            <View style={styles.primaryGrid}>
              {[
                { label: "Hotels", icon: "bed-outline" as const, route: "/screens/search-stays" },
                { label: "Flights", icon: "airplane-outline" as const, route: "/screens/flights" },
                { label: "Flight + Hotel", icon: "business-outline" as const, route: "/screens/packages" },
                { label: "Trains", icon: "train-outline" as const, route: "/screens/trains" },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  style={styles.primaryItem}
                  onPress={() => item.route && router.push(item.route as any)}
                >
                  <View style={styles.primaryIconCircle}>
                    <Ionicons name={item.icon} size={28} color={TRIP_BLUE} />
                  </View>
                  <Text style={styles.primaryLabel}>
                    {item.label}
                    <Text style={{ color: ACCENT_YELLOW }}>.</Text>
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Secondary Categories Grid (Row 2) */}
            <View style={styles.secondaryGrid}>
              {[
                { label: "Vacation\nRentals", icon: "home-outline" as const, route: "/screens/search-stays" },
                { label: "Attractions\n& Tours", icon: "people-outline" as const, route: "/screens/recommended-tours" },
                { label: "Car Rentals", icon: "car-outline" as const, route: "/screens/search" },
                { label: "Package\nTours", icon: "earth-outline" as const, route: "/screens/packages" },
                { label: "+7 more", icon: "grid-outline" as const, isMore: true, route: "/screens/search" },
              ].map((item, i) => (
                <Pressable
                  key={i}
                  style={styles.secondaryItem}
                  onPress={() => item.route && router.push(item.route as any)}
                >
                  <View style={styles.secondaryIconWrapper}>
                    <View style={item.isMore ? styles.moreIconBg : null}>
                      <Ionicons
                        name={item.icon}
                        size={item.isMore ? 14 : 22}
                        color={item.isMore ? "#FFFFFF" : TRIP_BLUE}
                      />
                    </View>
                  </View>
                  <Text style={styles.secondaryLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Section 1: Sticky Search Bar & Location Pills */}
        <Animated.View style={styles.stickySearchContainer}>
          {/* Main Search Input */}
          <View style={styles.searchBarPill}>
            <View style={styles.robotBadge}>
              <Ionicons name="chatbox-ellipses" size={14} color="#0055F2" />
            </View>

            <Text style={styles.searchInputText}>{searchQuery}</Text>

            <Pressable
              style={styles.searchCircleBtn}
              onPress={() => router.push("/screens/search" as any)}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Location Tags Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationTagsRow}
          >
            {["Lalmonirhat", "Beijing", "Shanghai", "Singapore", "Dubai"].map((tag) => (
              <Pressable
                key={tag}
                style={styles.locationTagPill}
                onPress={() => setSearchQuery(tag)}
              >
                <Text style={styles.locationTagText}>{tag}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.mapBtn}
              onPress={() => router.push("/screens/explore" as any)}
            >
              <Ionicons name="map-outline" size={15} color={TRIP_BLUE} />
              <Text style={styles.mapBtnText}>Map</Text>
            </Pressable>
          </ScrollView>

          {/* Sub-Category Circular Quick Actions */}
          <View style={styles.subCategoryRow}>
            {[
              { label: "Deals", icon: "pricetag-outline" as const },
              { label: "Events", icon: "calendar-outline" as const },
              { label: "Trip.Planner", icon: "flash-outline" as const },
              { label: "Trending", icon: "trending-up-outline" as const },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={styles.subCategoryItem}
                onPress={() => {
                  if (action.label === "Trip.Planner") {
                    router.push("/screens/trip-planner" as any);
                  } else if (action.label === "Events") {
                    router.push("/screens/events" as any);
                  } else {
                    setShowPromoModal(true);
                  }
                }}
              >
                <View style={styles.subCategoryCircle}>
                  <Ionicons name={action.icon} size={20} color={TRIP_BLUE} />
                </View>
                <Text style={styles.subCategoryLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Section Feed Tabs (Discover🟡 / Nearby) */}
          <View style={styles.feedTabsHeader}>
            <Pressable
              style={styles.feedTabBtn}
              onPress={() => setActiveFeedTab("discover")}
            >
              <Text
                style={[
                  styles.feedTabText,
                  activeFeedTab === "discover" && styles.feedTabTextActive,
                ]}
              >
                Discover
              </Text>
              <View style={styles.yellowTabDot} />
            </Pressable>

            <Pressable
              style={styles.feedTabBtn}
              onPress={() => setActiveFeedTab("nearby")}
            >
              <Text
                style={[
                  styles.feedTabText,
                  activeFeedTab === "nearby" && styles.feedTabTextActive,
                ]}
              >
                Nearby
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Section 2: Dual Column Masonry Feed Cards Layout (Screenshots 2 & 3) */}
        <View style={styles.masonryFeedGrid}>
          {/* Left Column */}
          <View style={styles.masonryColumn}>
            {/* Card L1: Explore Asia Banner */}
            <Pressable
              style={styles.cardContainer}
              onPress={() => setShowPromoModal(true)}
            >
              <View style={styles.heroCardImageWrapper}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600",
                  }}
                  style={styles.heroCardImage}
                />
                <View style={styles.heroOverlayContent}>
                  <Text style={styles.exploreSubTitle}>Explore</Text>
                  <Text style={styles.exploreTitle}>Asia</Text>
                </View>

                <View style={styles.dealPillBanner}>
                  <Text style={styles.dealPillText}>
                    Travel deals up to <Text style={{ fontWeight: "900" }}>50% off</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.heroCardFooter}>
                <Pressable
                  style={styles.viewDealsBtn}
                  onPress={() => setShowPromoModal(true)}
                >
                  <Text style={styles.viewDealsBtnText}>View Deals</Text>
                </Pressable>
                <Text style={styles.disclaimerText}>
                  *T&Cs apply. Subject to availability.
                </Text>
              </View>

              <View style={styles.pageCountBadge}>
                <Text style={styles.pageCountText}>1/10</Text>
              </View>
            </Pressable>

            {/* Card L2: Momo Inn Hangout Spot */}
            <Pressable style={styles.cardContainer}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500",
                }}
                style={styles.momoCardImage}
              />
              <View style={styles.cardContentPadding}>
                <Text style={styles.momoTitle} numberOfLines={2}>
                  Momo Inn: Bogura's Must-Visit Hangout Sp...
                </Text>

                <View style={styles.authorRow}>
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
                    style={styles.authorAvatar}
                  />
                  <Text style={styles.authorName}>Elvis.mittra</Text>
                  <View style={styles.viewsRight}>
                    <Ionicons name="eye-outline" size={12} color="#94A3B8" />
                    <Text style={styles.viewsText}>761</Text>
                  </View>
                </View>
              </View>
            </Pressable>

            {/* Card L3: Sea Pearl Beach Resort */}
            <Pressable style={styles.cardContainer}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500",
                  }}
                  style={styles.seaPearlImage}
                />
                <View style={styles.locationBadgePill}>
                  <Ionicons name="location-sharp" size={10} color="#FFFFFF" />
                  <Text style={styles.locationBadgeText}>Ukhiya Upazila</Text>
                </View>
              </View>
              <View style={styles.cardContentPadding}>
                <Text style={styles.seaPearlTitle} numberOfLines={2}>
                  Sea Pearl Beach Resort & Spa Coxs Bazar
                </Text>
                <View style={styles.starRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color="#F59E0B" />
                  ))}
                </View>
              </View>
            </Pressable>
          </View>

          {/* Right Column */}
          <View style={styles.masonryColumn}>
            {/* Card R1: Trip.Tuesday $99 Flights to Canada */}
            <Pressable
              style={styles.cardContainer}
              onPress={() => setShowPromoModal(true)}
            >
              <LinearGradient
                colors={["#0284C7", "#0369A1"]}
                style={styles.canadaPromoCard}
              >
                <View style={styles.canadaHeaderRow}>
                  <Text style={styles.tripTuesdayTitle}>Trip.Tuesday</Text>
                  <View style={styles.couponBadge}>
                    <Text style={styles.couponBadgeText}>$40 COUPON</Text>
                  </View>
                </View>

                <Text style={styles.canadaPriceText}>$99</Text>
                <Text style={styles.canadaSubTitle}>
                  flights to Canada and more
                </Text>

                <View style={styles.dropDateTag}>
                  <Text style={styles.dropDateText}>AUG. 25 DROP</Text>
                </View>
              </LinearGradient>
            </Pressable>

            {/* Card R2: Dhaka 4-Star Select Hotels */}
            <Pressable style={styles.cardContainer}>
              <View style={{ position: "relative" }}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
                  }}
                  style={styles.dhakaHotelImage}
                />
                <View style={styles.dhakaOverlayTitleBox}>
                  <Text style={styles.dhakaOverlayCity}>Dhaka</Text>
                  <Text style={styles.dhakaOverlaySubtitle}>4-Star Select Hotels</Text>
                </View>
              </View>

              <View style={styles.cardContentPadding}>
                <Text style={styles.dhakaHotelTitle}>
                  Top 10 4-Star Select Hotels in Dhaka
                </Text>

                <View style={styles.tripBestBadgeRow}>
                  <Ionicons name="trophy" size={12} color="#D97706" />
                  <Text style={styles.tripBestText}>Trip.Best</Text>
                </View>

                <Text style={styles.viewedCountText}>
                  Viewed by nearly 1,000 people
                </Text>
              </View>
            </Pressable>

            {/* Card R3: Ratargul Swamp Forest */}
            <Pressable style={styles.cardContainer}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500",
                }}
                style={styles.ratargulImage}
              />
              <View style={styles.cardContentPadding}>
                <Text style={styles.ratargulTitle} numberOfLines={2}>
                  🌿 🛶 Ratargul Swamp Forest — Bangladesh's...
                </Text>

                <View style={styles.authorRow}>
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" }}
                    style={styles.authorAvatar}
                  />
                  <Text style={styles.authorName}>RahatGaliv</Text>
                  <View style={styles.viewsRight}>
                    <Ionicons name="eye-outline" size={12} color="#94A3B8" />
                    <Text style={styles.viewsText}>146</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Bottom Scroll Padding for Floating Bar */}
        <View style={{ height: 110, backgroundColor: "#F8FAFC" }} />
      </Animated.ScrollView>

      {/* Screenshot 1: Promo Voucher Overlay Modal */}
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
    backgroundColor: TRIP_BLUE,
  },
  scroll: {
    backgroundColor: TRIP_BLUE,
  },
  refreshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 2,
    backgroundColor: TRIP_BLUE,
  },
  refreshContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    gap: 6,
    position: "relative",
  },
  pulseAuraRing: {
    position: "absolute",
    top: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  globeEmblemBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TRIP_BLUE,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  refreshStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  topSectionWrapper: {
    backgroundColor: TRIP_BLUE,
  },
  blueHeaderBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: TRIP_BLUE,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoPressArea: {
    paddingVertical: 2,
  },
  tripLogoText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  goldCoinBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT_YELLOW,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  goldCoinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  curvedBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: -1,
  },
  primaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  primaryItem: {
    width: "22%",
    alignItems: "center",
  },
  primaryIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: TRIP_LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  primaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: TRIP_BLUE,
    textAlign: "center",
  },
  secondaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  secondaryItem: {
    width: "18%",
    alignItems: "center",
  },
  secondaryIconWrapper: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 12,
  },
  moreIconBg: {
    backgroundColor: TRIP_BLUE,
    borderRadius: 8,
    padding: 4,
  },
  stickySearchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchBarPill: {
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  robotBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  searchCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TRIP_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  locationTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
  },
  locationTagPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationTagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  mapBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  subCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  subCategoryItem: {
    alignItems: "center",
    width: "22%",
  },
  subCategoryCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TRIP_LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  subCategoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  feedTabsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 12,
  },
  feedTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  feedTabText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#94A3B8",
  },
  feedTabTextActive: {
    color: "#0F172A",
    fontWeight: "900",
  },
  yellowTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT_YELLOW,
    marginLeft: 2,
    marginBottom: 8,
  },
  masonryFeedGrid: {
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  masonryColumn: {
    flex: 1,
    gap: 12,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCardImageWrapper: {
    height: 180,
    position: "relative",
  },
  heroCardImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlayContent: {
    position: "absolute",
    top: 10,
    left: 12,
  },
  exploreSubTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    opacity: 0.9,
  },
  exploreTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  dealPillBanner: {
    position: "absolute",
    bottom: 10,
    left: 0,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  dealPillText: {
    color: "#FFFFFF",
    fontSize: 10,
  },
  heroCardFooter: {
    padding: 10,
    alignItems: "center",
  },
  viewDealsBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: TRIP_BLUE,
    width: "100%",
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
  },
  viewDealsBtnText: {
    color: TRIP_BLUE,
    fontSize: 12,
    fontWeight: "800",
  },
  disclaimerText: {
    fontSize: 8,
    color: "#94A3B8",
    marginTop: 4,
  },
  pageCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pageCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  momoCardImage: {
    width: "100%",
    height: 140,
  },
  momoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  cardContentPadding: {
    padding: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  authorName: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  viewsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewsText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  seaPearlImage: {
    width: "100%",
    height: 130,
  },
  locationBadgePill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  locationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  seaPearlTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  canadaPromoCard: {
    padding: 12,
    minHeight: 150,
    justifyContent: "space-between",
  },
  canadaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripTuesdayTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  couponBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  couponBadgeText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 9,
  },
  canadaPriceText: {
    color: "#FACC15",
    fontSize: 34,
    fontWeight: "900",
    marginVertical: 4,
  },
  canadaSubTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dropDateTag: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  dropDateText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  dhakaHotelImage: {
    width: "100%",
    height: 120,
  },
  dhakaOverlayTitleBox: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dhakaOverlayCity: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },
  dhakaOverlaySubtitle: {
    fontSize: 9,
    color: "#475569",
  },
  dhakaHotelTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  tripBestBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  tripBestText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "900",
  },
  viewedCountText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  ratargulImage: {
    width: "100%",
    height: 140,
  },
  ratargulTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
});
