/**
 * ActiveTripDock.tsx
 * Persistent Floating Dynamic Island / Activity Dock for Shopno Jatra.
 *
 * Requirements:
 * 1. Contextual State Morphing:
 *    - 4 hours before departure: Flight/Bus countdown & Gate number.
 *    - During trip: Next activity in itinerary & current local weather.
 *    - Check-in day: Hotel room status & one-tap keyless entry.
 * 2. Expandable Micro-Widget: Tapping expands full interactive card without leaving screen.
 * 3. Gesture Controls: Swipe to minimize or dismiss; draggable floating position with Reanimated springs.
 * 4. Clean Overlay: Mounts cleanly above root navigation container with high zIndex & pointerEvents handling.
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { BlurView } from "expo-blur";

import {
  useDockStore,
  DockMode,
  BoardingStatus,
} from "../../store/dockStore";
import { CopyableText } from "../common/CopyableText";
import { openLink } from "../../utils/openLink";
import { RTLIcon } from "../ui/RTLIcon";



// ============================================================================
// HELPER UTILITIES
// ============================================================================

function formatCountdown(targetIsoDate: string): {
  hours: string;
  minutes: string;
  seconds: string;
  totalSeconds: number;
  isPast: boolean;
  isImminent: boolean;
} {
  const diffMs = new Date(targetIsoDate).getTime() - Date.now();
  if (diffMs <= 0) {
    return {
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSeconds: 0,
      isPast: true,
      isImminent: true,
    };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return {
    hours: String(hrs).padStart(2, "0"),
    minutes: String(mins).padStart(2, "0"),
    seconds: String(secs).padStart(2, "0"),
    totalSeconds: totalSec,
    isPast: false,
    isImminent: totalSec <= 3600, // less than 1 hr
  };
}

// ============================================================================
// MAIN COMPONENT: ActiveTripDock
// ============================================================================

export function ActiveTripDock() {
  const insets = useSafeAreaInsets();

  // Store bindings
  const mode = useDockStore((s) => s.mode);
  const isExpanded = useDockStore((s) => s.isExpanded);
  const isMinimized = useDockStore((s) => s.isMinimized);
  const isDismissed = useDockStore((s) => s.isDismissed);
  const autoMorph = useDockStore((s) => s.autoMorph);
  const preDeparture = useDockStore((s) => s.preDeparture);
  const inTrip = useDockStore((s) => s.inTrip);
  const checkInDay = useDockStore((s) => s.checkInDay);

  // Store actions
  const setMode = useDockStore((s) => s.setMode);
  const cycleMode = useDockStore((s) => s.cycleMode);
  const expand = useDockStore((s) => s.expand);
  const collapse = useDockStore((s) => s.collapse);
  const toggleExpand = useDockStore((s) => s.toggleExpand);
  const minimize = useDockStore((s) => s.minimize);
  const restore = useDockStore((s) => s.restore);
  const dismiss = useDockStore((s) => s.dismiss);
  const undismiss = useDockStore((s) => s.undismiss);
  const triggerKeylessEntry = useDockStore((s) => s.triggerKeylessEntry);
  const evaluateContext = useDockStore((s) => s.evaluateContext);

  // Local component states
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const wifiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (wifiTimerRef.current) clearTimeout(wifiTimerRef.current);
    };
  }, []);
  const [tick, setTick] = useState(0);

  // Real-time ticking interval for countdown & context evaluation
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      evaluateContext();
    }, 1000);
    return () => clearInterval(timer);
  }, [evaluateContext]);

  // Derived countdown
  const countdown = useMemo(() => {
    return formatCountdown(preDeparture.departureTime);
  }, [preDeparture.departureTime, tick]);

  // Reanimated Shared Values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const keyPulse = useSharedValue(1);

  // Pulse animation for live indicators
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  // Keyless entry transmission pulsing
  useEffect(() => {
    if (checkInDay.keylessEntry.state === "transmitting") {
      keyPulse.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 400 }),
          withTiming(1.0, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      keyPulse.value = withSpring(1);
    }
  }, [checkInDay.keylessEntry.state, keyPulse]);

  // Spring gesture handlers
  const handleDismissJS = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleMinimizeJS = useCallback(() => {
    minimize();
  }, [minimize]);

  const handleToggleExpandJS = useCallback(() => {
    toggleExpand();
  }, [toggleExpand]);

  // Pan gesture for dragging, swipe to minimize, swipe to dismiss
  const panGesture = Gesture.Pan()
    .enabled(!isExpanded)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      // 1. Horizontal swipe threshold: Dismiss
      if (Math.abs(event.translationX) > 110 || Math.abs(event.velocityX) > 750) {
        const direction = Math.sign(event.translationX || event.velocityX);
        translateX.value = withSpring(direction * (380 + 80), {
          damping: 15,
          stiffness: 120,
        });
        runOnJS(handleDismissJS)();
        return;
      }

      // 2. Vertical upward flick: Minimize
      if (event.translationY < -35 || event.velocityY < -600) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 140 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 140 });
        runOnJS(handleMinimizeJS)();
        return;
      }

      // 3. Normal release: Snap back with Reanimated springs
      translateX.value = withSpring(0, {
        damping: 18,
        stiffness: 150,
        mass: 0.8,
      });
      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 150,
        mass: 0.8,
      });
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (isMinimized) {
        runOnJS(restore)();
      } else {
        runOnJS(handleToggleExpandJS)();
      }
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Animated styles
  const animatedDockTransform = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ] as any,
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }] as any,
    };
  });

  const animatedKeyPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: keyPulse.value }] as any,
    };
  });

  // Calculate top offset safely
  const topAnchor = Math.max(insets.top, 14) + 6;

  // If permanently hidden, return null
  if (mode === "hidden") return null;

  // If dismissed, render a sleek subtle restore indicator pill
  if (isDismissed) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.overlayContainer, { top: topAnchor }]}
      >
        <Pressable
          onPress={undismiss}
          style={({ pressed }) => [
            styles.restorePill,
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Ionicons name="airplane-outline" size={13} color="#38BDF8" />
          <Text style={styles.restoreText}>Trip Dock Snoozed • Tap to restore</Text>
          <Ionicons name="chevron-down" size={13} color="#94A3B8" />
        </Pressable>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.overlayRoot}>
      {/* Semi-transparent backdrop when expanded */}
      {isExpanded && (
        <Pressable
          style={styles.backdrop}
          onPress={collapse}
          accessibilityLabel="Close active trip dock"
        />
      )}

      {/* Draggable & Spring Floating Dynamic Island */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.islandFloatingWrapper,
          { top: topAnchor },
          animatedDockTransform,
        ]}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.dockContainer,
              isExpanded ? styles.dockContainerExpanded : styles.dockContainerCollapsed,
              isMinimized && styles.dockContainerMinimized,
            ]}
          >
            {/* Frosted Glass Background with Platform Fallback */}
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={45}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <View style={styles.androidGlassBackdrop} />
            )}

            {/* Inner Content depending on state */}
            {isMinimized ? (
              // -------------------------------------------------------------
              // 1. MINIMIZED ULTRA-COMPACT PILL
              // -------------------------------------------------------------
              <Pressable
                onPress={restore}
                style={styles.minimizedContent}
                accessibilityLabel="Restore active trip dynamic island"
              >
                <Animated.View style={[styles.minimizedPulseDot, animatedPulseStyle]} />
                {mode === "pre_departure" && (
                  <Ionicons name="airplane" size={16} color="#38BDF8" />
                )}
                {mode === "in_trip" && (
                  <Ionicons name="compass" size={16} color="#34D399" />
                )}
                {mode === "check_in_day" && (
                  <MaterialCommunityIcons name="key-wireless" size={16} color="#FBBF24" />
                )}
              </Pressable>
            ) : !isExpanded ? (
              // -------------------------------------------------------------
              // 2. COLLAPSED DYNAMIC ISLAND PILL
              // -------------------------------------------------------------
              <Pressable
                onPress={toggleExpand}
                style={styles.collapsedContent}
                accessibilityLabel="Expand active trip details"
              >
                {/* STATE 1: PRE-DEPARTURE (FLIGHT/BUS COUNTDOWN & GATE) */}
                {mode === "pre_departure" && (
                  <View style={styles.pillRow}>
                    <View style={styles.pillLeftSection}>
                      <View style={styles.iconCircleCyan}>
                        <Ionicons
                          name={
                            preDeparture.transportType === "flight"
                              ? "airplane"
                              : "bus"
                          }
                          size={14}
                          color="#0284C7"
                        />
                      </View>
                      <Text style={styles.pillBoldText} numberOfLines={1}>
                        {preDeparture.origin.code}
                      </Text>
                      <RTLIcon name="arrow-forward" size={11} color="#64748B" />
                      <Text style={styles.pillBoldText} numberOfLines={1}>
                        {preDeparture.destination.code}
                      </Text>
                    </View>

                    {/* Countdown Ticker */}
                    <View style={styles.pillCenterSection}>
                      <Animated.View
                        style={[
                          styles.liveDot,
                          countdown.isImminent ? styles.liveDotOrange : styles.liveDotGreen,
                          animatedPulseStyle,
                        ]}
                      />
                      <Text style={styles.pillCountdownText}>
                        {countdown.isPast
                          ? "BOARDING"
                          : `${countdown.hours}h ${countdown.minutes}m`}
                      </Text>
                    </View>

                    {/* Gate Badge */}
                    <View style={styles.pillRightBadgeCyan}>
                      <Text style={styles.pillRightBadgeText}>
                        {preDeparture.gate}
                      </Text>
                    </View>
                  </View>
                )}

                {/* STATE 2: DURING TRIP (NEXT ACTIVITY & WEATHER) */}
                {mode === "in_trip" && (
                  <View style={styles.pillRow}>
                    <View style={styles.pillLeftSection}>
                      <View style={styles.iconCircleEmerald}>
                        <Ionicons name="compass" size={14} color="#059669" />
                      </View>
                      <Text style={styles.pillDayTag}>
                        Day {inTrip.currentDay}
                      </Text>
                    </View>

                    {/* Next Activity snippet */}
                    <View style={styles.pillCenterActivity}>
                      <Text style={styles.pillActivityText} numberOfLines={1}>
                        {inTrip.nextActivity.title}
                      </Text>
                      <Text style={styles.pillActivitySub}>
                        {inTrip.nextActivity.scheduledTime}
                      </Text>
                    </View>

                    {/* Weather badge */}
                    <View style={styles.pillWeatherBadge}>
                      <Ionicons
                        name={
                          inTrip.localWeather.condition === "sunny"
                            ? "sunny"
                            : inTrip.localWeather.condition === "rain"
                            ? "rainy"
                            : "partly-sunny"
                        }
                        size={13}
                        color="#F59E0B"
                      />
                      <Text style={styles.pillWeatherText}>
                        {inTrip.localWeather.temperatureC}°C
                      </Text>
                    </View>
                  </View>
                )}

                {/* STATE 3: CHECK-IN DAY (HOTEL ROOM STATUS & KEYLESS ENTRY) */}
                {mode === "check_in_day" && (
                  <View style={styles.pillRow}>
                    <View style={styles.pillLeftSection}>
                      <View style={styles.iconCircleAmber}>
                        <Ionicons name="business" size={13} color="#D97706" />
                      </View>
                      <Text style={styles.pillHotelName} numberOfLines={1}>
                        Sea Pearl
                      </Text>
                    </View>

                    {/* Room Status */}
                    <View style={styles.pillCenterSection}>
                      <View style={styles.roomStatusDot} />
                      <Text style={styles.pillRoomStatusText}>
                        {checkInDay.roomStatus === "ready"
                          ? `${checkInDay.roomNumber} Ready`
                          : checkInDay.roomStatus === "checked_in"
                          ? `${checkInDay.roomNumber} Active`
                          : "Preparing"}
                      </Text>
                    </View>

                    {/* Keyless Entry Trigger */}
                    <View style={styles.pillKeyBadge}>
                      <MaterialCommunityIcons
                        name="key-wireless"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.pillKeyText}>Key</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            ) : (
              // -------------------------------------------------------------
              // 3. EXPANDED MICRO-WIDGET CARD
              // -------------------------------------------------------------
              <View style={styles.expandedContentWrapper}>
                {/* Top Control Bar: Mode badge, Cycle Switcher & Close */}
                <View style={styles.expandedTopBar}>
                  <View style={styles.modePillBadge}>
                    <View
                      style={[
                        styles.modeIndicatorDot,
                        mode === "pre_departure"
                          ? { backgroundColor: "#38BDF8" }
                          : mode === "in_trip"
                          ? { backgroundColor: "#34D399" }
                          : { backgroundColor: "#FBBF24" },
                      ]}
                    />
                    <Text style={styles.modePillText}>
                      {mode === "pre_departure"
                        ? `FLIGHT ${preDeparture.tripReference} • ${preDeparture.boardingStatus.toUpperCase()}`
                        : mode === "in_trip"
                        ? `ACTIVE TRIP • DAY ${inTrip.currentDay} OF ${inTrip.totalDays}`
                        : `HOTEL CHECK-IN • ${checkInDay.roomStatus.toUpperCase()}`}
                    </Text>
                  </View>

                  <View style={styles.topBarActions}>
                    {/* Dev/Demo Context Switcher */}
                    <Pressable
                      onPress={() => {
                        cycleMode();
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch (hapticErr) {
                          if (__DEV__) console.warn("[ActiveTripDock] Haptics unavailable:", hapticErr);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.cycleModeBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityLabel="Switch trip mode preview"
                    >
                      <Ionicons name="swap-horizontal" size={14} color="#94A3B8" />
                      <Text style={styles.cycleModeText}>Mode</Text>
                    </Pressable>

                    {/* Minimize Button */}
                    <Pressable
                      onPress={minimize}
                      style={styles.iconCircleSmall}
                      accessibilityLabel="Minimize dock"
                    >
                      <Ionicons name="remove" size={15} color="#94A3B8" />
                    </Pressable>

                    {/* Collapse Button */}
                    <Pressable
                      onPress={collapse}
                      style={styles.iconCircleSmall}
                      accessibilityLabel="Collapse dock"
                    >
                      <Ionicons name="chevron-up" size={15} color="#E2E8F0" />
                    </Pressable>
                  </View>
                </View>

                {/* SCROLLABLE MICRO-WIDGET BODY */}
                <ScrollView
                  style={styles.expandedScrollArea}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* ======================================================== */}
                  {/* EXPANDED VIEW 1: PRE-DEPARTURE FLIGHT / BUS              */}
                  {/* ======================================================== */}
                  {mode === "pre_departure" && (
                    <View style={styles.cardSection}>
                      {/* Route Header */}
                      <View style={styles.flightHeaderCard}>
                        <View style={styles.routeCol}>
                          <Text style={styles.cityCodeText}>
                            {preDeparture.origin.code}
                          </Text>
                          <Text style={styles.cityNameText} numberOfLines={1}>
                            {preDeparture.origin.city}
                          </Text>
                          <Text style={styles.terminalText}>
                            {preDeparture.origin.terminal || "Terminal 2"}
                          </Text>
                        </View>

                        <View style={styles.routeMidCol}>
                          <Text style={styles.flightDurationText}>1h 05m</Text>
                          <View style={styles.flightProgressLine}>
                            <View style={styles.flightDashedTrack} />
                            <Ionicons
                              name="airplane"
                              size={16}
                              color="#38BDF8"
                              style={{ transform: [{ rotate: "90deg" }] }}
                            />
                          </View>
                          <Text style={styles.flightNumberSub}>
                            {preDeparture.carrier}
                          </Text>
                        </View>

                        <View style={[styles.routeCol, { alignItems: "flex-end" }]}>
                          <Text style={styles.cityCodeText}>
                            {preDeparture.destination.code}
                          </Text>
                          <Text style={styles.cityNameText} numberOfLines={1}>
                            {preDeparture.destination.city}
                          </Text>
                          <Text style={styles.terminalText}>
                            {preDeparture.destination.terminal || "Domestic"}
                          </Text>
                        </View>
                      </View>

                      {/* Live Departure Countdown Banner */}
                      <View style={styles.countdownBanner}>
                        <View style={styles.countdownLeft}>
                          <Text style={styles.countdownLabel}>DEPARTURE COUNTDOWN</Text>
                          <View style={styles.digitalClockRow}>
                            <View style={styles.digitalUnitBox}>
                              <Text style={styles.digitalUnitNumber}>{countdown.hours}</Text>
                              <Text style={styles.digitalUnitSub}>HRS</Text>
                            </View>
                            <Text style={styles.digitalSeparator}>:</Text>
                            <View style={styles.digitalUnitBox}>
                              <Text style={styles.digitalUnitNumber}>{countdown.minutes}</Text>
                              <Text style={styles.digitalUnitSub}>MIN</Text>
                            </View>
                            <Text style={styles.digitalSeparator}>:</Text>
                            <View style={styles.digitalUnitBox}>
                              <Text style={styles.digitalUnitNumber}>{countdown.seconds}</Text>
                              <Text style={styles.digitalUnitSub}>SEC</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.statusPillLarge}>
                          <Animated.View
                            style={[
                              styles.liveDot,
                              countdown.isImminent ? styles.liveDotOrange : styles.liveDotGreen,
                              animatedPulseStyle,
                            ]}
                          />
                          <Text style={styles.statusPillLargeText}>
                            {countdown.isPast ? "BOARDING" : "ON SCHEDULE"}
                          </Text>
                        </View>
                      </View>

                      {/* 4-Column Boarding Detail Grid */}
                      <View style={styles.boardingGrid}>
                        <View style={styles.gridBox}>
                          <Text style={styles.gridBoxLabel}>GATE</Text>
                          <Text style={[styles.gridBoxValue, { color: "#38BDF8" }]}>
                            {preDeparture.gate}
                          </Text>
                        </View>

                        <View style={styles.gridBox}>
                          <Text style={styles.gridBoxLabel}>SEAT</Text>
                          <Text style={styles.gridBoxValue}>{preDeparture.seat}</Text>
                        </View>

                        <View style={styles.gridBox}>
                          <Text style={styles.gridBoxLabel}>GROUP</Text>
                          <Text style={styles.gridBoxValue}>
                            {preDeparture.boardingGroup}
                          </Text>
                        </View>

                        <View style={styles.gridBox}>
                          <Text style={styles.gridBoxLabel}>PNR</Text>
                          <CopyableText
                            text={preDeparture.pnr}
                            label="PNR"
                            textStyle={styles.gridBoxValue}
                            iconSize={12}
                            iconColor="#2563EB"
                          />
                        </View>
                      </View>

                      {/* Toggleable QR Boarding Pass Preview */}
                      {showQrCode ? (
                        <View style={styles.qrPassContainer}>
                          <View style={styles.qrCanvasWrapper}>
                            <QRCode
                              value={preDeparture.qrCodeData}
                              size={120}
                              color="#0F172A"
                              backgroundColor="#FFFFFF"
                            />
                          </View>
                          <Text style={styles.qrPassTitle}>Digital Boarding Pass</Text>
                          <Text style={styles.qrPassSub}>
                            Scan at {preDeparture.gate} • Passenger: MR. TANVIR AHMED
                          </Text>
                        </View>
                      ) : null}

                      {/* Action Row */}
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            setShowQrCode(!showQrCode);
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch (hapticErr) {
                              if (__DEV__) console.warn("[ActiveTripDock] Haptics unavailable:", hapticErr);
                            }
                          }}
                          style={[styles.primaryActionBtn, { flex: 1.2 }]}
                        >
                          <Ionicons
                            name={showQrCode ? "eye-off-outline" : "qr-code-outline"}
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.primaryActionText}>
                            {showQrCode ? "Hide Pass" : "Boarding Pass"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              "Airport Navigation",
                              `Navigating to Hazrat Shahjalal International Airport (DAC), Terminal 2, ${preDeparture.gate}. Recommended security checkpoint: Zone B.`
                            );
                          }}
                          style={[styles.secondaryActionBtn, { flex: 1 }]}
                        >
                          <Ionicons name="navigate-outline" size={16} color="#94A3B8" />
                          <Text style={styles.secondaryActionText}>Airport Map</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* ======================================================== */}
                  {/* EXPANDED VIEW 2: DURING TRIP (ITINERARY & WEATHER)       */}
                  {/* ======================================================== */}
                  {mode === "in_trip" && (
                    <View style={styles.cardSection}>
                      {/* Weather Snapshot Widget */}
                      <View style={styles.weatherCard}>
                        <View style={styles.weatherLeft}>
                          <View style={styles.weatherIconLarge}>
                            <Ionicons
                              name={
                                inTrip.localWeather.condition === "sunny"
                                  ? "sunny"
                                  : inTrip.localWeather.condition === "rain"
                                  ? "rainy"
                                  : "partly-sunny"
                              }
                              size={28}
                              color="#F59E0B"
                            />
                          </View>
                          <View>
                            <Text style={styles.weatherTempText}>
                              {inTrip.localWeather.temperatureC}°C
                            </Text>
                            <Text style={styles.weatherDescText}>
                              {inTrip.localWeather.description}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.weatherRightMetrics}>
                          <Text style={styles.weatherMetricItem}>
                            H: {inTrip.localWeather.highC}° • L: {inTrip.localWeather.lowC}°
                          </Text>
                          <Text style={styles.weatherMetricItem}>
                            Humidity: {inTrip.localWeather.humidityPercent}%
                          </Text>
                          <Text style={styles.weatherMetricItem}>
                            UV Index: {inTrip.localWeather.uvIndex} (Mod)
                          </Text>
                        </View>
                      </View>

                      {/* Next Activity Highlight */}
                      <View style={styles.activityHighlightBox}>
                        <View style={styles.activityHeaderRow}>
                          <View style={styles.activityCategoryBadge}>
                            <Ionicons name="boat-outline" size={12} color="#059669" />
                            <Text style={styles.activityCategoryText}>
                              NEXT ACTIVITY • {inTrip.nextActivity.scheduledTime}
                            </Text>
                          </View>
                          <Text style={styles.durationBadgeText}>
                            ⏱ {inTrip.nextActivity.duration}
                          </Text>
                        </View>

                        <Text style={styles.activityTitleText}>
                          {inTrip.nextActivity.title}
                        </Text>

                        <View style={styles.activityMetaRow}>
                          <Ionicons name="location-outline" size={14} color="#38BDF8" />
                          <Text style={styles.activityLocationText} numberOfLines={1}>
                            {inTrip.nextActivity.locationName}
                          </Text>
                        </View>

                        {inTrip.nextActivity.specialNotes && (
                          <View style={styles.notesBox}>
                            <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
                            <Text style={styles.notesText} numberOfLines={2}>
                              {inTrip.nextActivity.specialNotes}
                            </Text>
                          </View>
                        )}

                        {/* Guide Contact snippet */}
                        {inTrip.nextActivity.leadGuide && (
                          <View style={styles.guideRow}>
                            <View style={styles.guideAvatar}>
                              <Ionicons name="person" size={14} color="#CBD5E1" />
                            </View>
                            <View style={{ flex: 1, marginStart: 8 }}>
                              <Text style={styles.guideName}>
                                Guide: {inTrip.nextActivity.leadGuide.name}
                              </Text>
                              <Text style={styles.guideRating}>
                                ⭐ {inTrip.nextActivity.leadGuide.rating} • Tour Specialist
                              </Text>
                            </View>

                            <Pressable
                              onPress={() => {
                                const tel = inTrip.nextActivity.leadGuide?.phone;
                                if (tel) Linking.openURL(`tel:${tel}`);
                              }}
                              style={styles.callGuideBtn}
                            >
                              <Ionicons name="call" size={12} color="#FFFFFF" />
                              <Text style={styles.callGuideText}>Call</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {/* Today's Remaining Timeline */}
                      <Text style={styles.sectionHeaderTitle}>TODAY'S SCHEDULE</Text>
                      <View style={styles.timelineList}>
                        {inTrip.upcomingMilestones.map((item, idx) => (
                          <View key={idx} style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <Text style={styles.timelineTime}>{item.time}</Text>
                            <Text style={styles.timelineTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Action Row */}
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              "Activity Directions",
                              `Route to ${inTrip.nextActivity.locationName} (${inTrip.nextActivity.address}). ETA is 25 minutes via Marine Drive.`
                            );
                          }}
                          style={[styles.primaryActionBtn, { flex: 1 }]}
                        >
                          <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.primaryActionText}>Directions</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              "Trip Itinerary",
                              `Viewing complete 4-day itinerary for ${inTrip.tripName}. Day 2: Marine Exploration & Inani Coral Sanctuary.`
                            );
                          }}
                          style={[styles.secondaryActionBtn, { flex: 1 }]}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                          <Text style={styles.secondaryActionText}>Full Itinerary</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* ======================================================== */}
                  {/* EXPANDED VIEW 3: CHECK-IN DAY & KEYLESS ENTRY             */}
                  {/* ======================================================== */}
                  {mode === "check_in_day" && (
                    <View style={styles.cardSection}>
                      {/* Hotel Overview */}
                      <View style={styles.hotelCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hotelTitleText}>
                            {checkInDay.hotelName}
                          </Text>
                          <Text style={styles.hotelSubText}>
                            {checkInDay.roomType}
                          </Text>
                          <Text style={styles.hotelFloorText}>
                            {checkInDay.floor} • Conf #{checkInDay.confirmationCode}
                          </Text>
                        </View>

                        <View style={styles.roomStatusTag}>
                          <View style={styles.roomStatusDot} />
                          <Text style={styles.roomStatusTagText}>
                            {checkInDay.roomStatus === "ready"
                              ? "ROOM READY"
                              : checkInDay.roomStatus === "checked_in"
                              ? "CHECKED IN"
                              : "PREPARING"}
                          </Text>
                        </View>
                      </View>

                      {/* ONE-TAP KEYLESS ENTRY INTERACTIVE HERO */}
                      <View style={styles.keylessEntryHero}>
                        <Text style={styles.keylessHeroTitle}>ONE-TAP KEYLESS ENTRY</Text>
                        <Text style={styles.keylessHeroSub}>
                          Hold device near door sensor for {checkInDay.roomNumber}
                        </Text>

                        {/* Interactive Keyless Button */}
                        <Pressable
                          onPress={() => {
                            triggerKeylessEntry();
                          }}
                          disabled={checkInDay.keylessEntry.state === "transmitting"}
                          style={({ pressed }) => [
                            styles.keylessTriggerButton,
                            checkInDay.keylessEntry.state === "unlocked" &&
                              styles.keylessTriggerUnlocked,
                            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                          ]}
                          accessibilityLabel="Unlock hotel room door"
                        >
                          <Animated.View
                            style={[
                              styles.keylessPulseRing,
                              checkInDay.keylessEntry.state === "transmitting" &&
                                animatedKeyPulseStyle,
                            ]}
                          />

                          <View style={styles.keylessIconCenter}>
                            {checkInDay.keylessEntry.state === "transmitting" ? (
                              <MaterialCommunityIcons
                                name="wifi-sync"
                                size={32}
                                color="#38BDF8"
                              />
                            ) : checkInDay.keylessEntry.state === "unlocked" ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={36}
                                color="#10B981"
                              />
                            ) : (
                              <MaterialCommunityIcons
                                name="key-wireless"
                                size={34}
                                color="#FBBF24"
                              />
                            )}
                          </View>

                          <View style={{ marginTop: 10, alignItems: "center" }}>
                            <Text style={styles.keylessStatusMain}>
                              {checkInDay.keylessEntry.state === "transmitting"
                                ? "Transmitting BLE Token..."
                                : checkInDay.keylessEntry.state === "unlocked"
                                ? `${checkInDay.roomNumber} UNLOCKED!`
                                : `Tap to Unlock ${checkInDay.roomNumber}`}
                            </Text>

                            <Text style={styles.keylessStatusSub}>
                              {checkInDay.keylessEntry.state === "unlocked"
                                ? `Welcome! Door unlatched at ${checkInDay.keylessEntry.lastUnlockedAt}`
                                : "NFC / BLE Proximity Access Active"}
                            </Text>
                          </View>
                        </Pressable>

                        {/* Backup Passcode display */}
                        <View style={styles.passcodeFallback}>
                          <Ionicons name="keypad-outline" size={13} color="#94A3B8" />
                          <Text style={styles.passcodeText}>
                            Room PIN: {checkInDay.keylessEntry.passcode}
                          </Text>
                        </View>
                      </View>

                      {/* Hotel Amenities Quick Glance */}
                      <View style={styles.amenitiesCard}>
                        {/* Wi-Fi Credentials */}
                        <Pressable
                          onPress={() => {
                            setCopiedWifi(true);
                            try {
                              Haptics.notificationAsync(
                                Haptics.NotificationFeedbackType.Success
                              );
                            } catch (hapticErr) {
                              if (__DEV__) console.warn("[ActiveTripDock] Haptics unavailable:", hapticErr);
                            }
                            if (wifiTimerRef.current) clearTimeout(wifiTimerRef.current);
                            wifiTimerRef.current = setTimeout(() => setCopiedWifi(false), 2500);
                          }}
                          style={styles.amenityRow}
                        >
                          <Ionicons name="wifi" size={16} color="#38BDF8" />
                          <View style={{ flex: 1, marginStart: 10 }}>
                            <Text style={styles.amenityTitle}>
                              Wi-Fi: {checkInDay.hotelServices.wifiNetwork}
                            </Text>
                            <Text style={styles.amenitySub}>
                              Password: {checkInDay.hotelServices.wifiPassword}
                            </Text>
                          </View>
                          <View style={styles.copyBadge}>
                            <Text style={styles.copyBadgeText}>
                              {copiedWifi ? "Copied!" : "Copy"}
                            </Text>
                          </View>
                        </Pressable>

                        <View style={styles.amenityDivider} />

                        {/* Breakfast Timing */}
                        <View style={styles.amenityRow}>
                          <Ionicons name="restaurant-outline" size={16} color="#FBBF24" />
                          <View style={{ flex: 1, marginStart: 10 }}>
                            <Text style={styles.amenityTitle}>Breakfast Included</Text>
                            <Text style={styles.amenitySub}>
                              {checkInDay.hotelServices.breakfastInfo}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Row */}
                      <View style={styles.actionRow}>
                        <Pressable
                          onPress={() => {
                            Linking.openURL(
                              `tel:${checkInDay.hotelServices.conciergePhone}`
                            );
                          }}
                          style={[styles.primaryActionBtn, { flex: 1 }]}
                        >
                          <Ionicons name="call" size={16} color="#FFFFFF" />
                          <Text style={styles.primaryActionText}>Front Desk</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              "Hotel Directions",
                              `Address: ${checkInDay.hotelAddress}. 15 mins south of Kolatoli Circle along Marine Drive.`
                            );
                          }}
                          style={[styles.secondaryActionBtn, { flex: 1 }]}
                        >
                          <Ionicons name="navigate-outline" size={16} color="#94A3B8" />
                          <Text style={styles.secondaryActionText}>Directions</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    zIndex: 99998,
  },
  overlayContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999,
  },
  islandFloatingWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999,
  },

  // Dock container shapes
  dockContainer: {
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 16px rgba(15, 23, 42, 0.35)" } : {}),
  },
  dockContainerCollapsed: {
    borderRadius: 24,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dockContainerMinimized: {
    borderRadius: 22,
    width: 58,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dockContainerExpanded: {
    width: Math.min(380 - 24, 420),
    maxHeight: 800 * 0.76,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  androidGlassBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F172A",
    opacity: 0.96,
  },

  // Minimized state
  minimizedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    paddingHorizontal: 8,
  },
  minimizedPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
    marginEnd: 6,
  },

  // Collapsed Pill Row
  collapsedContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pillLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    marginEnd: 8,
  },
  iconCircleCyan: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 6,
  },
  iconCircleEmerald: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(52, 211, 153, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 6,
  },
  iconCircleAmber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(251, 191, 36, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 6,
  },
  pillBoldText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginHorizontal: 2,
  },
  pillDayTag: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  pillHotelName: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 80,
  },

  // Center section
  pillCenterSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginEnd: 5,
  },
  liveDotGreen: {
    backgroundColor: "#10B981",
  },
  liveDotOrange: {
    backgroundColor: "#F97316",
  },
  pillCountdownText: {
    color: "#F1F5F9",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pillCenterActivity: {
    alignItems: "center",
    paddingHorizontal: 6,
    maxWidth: 120,
  },
  pillActivityText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  pillActivitySub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  roomStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginEnd: 5,
  },
  pillRoomStatusText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },

  // Right badges
  pillRightBadgeCyan: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginStart: 6,
  },
  pillRightBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pillWeatherBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    marginStart: 6,
    gap: 4,
  },
  pillWeatherText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  pillKeyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginStart: 6,
    gap: 3,
  },
  pillKeyText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
  },

  // Restore Pill when dismissed
  restorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 8px rgba(15, 23, 42, 0.25)" } : {}),
  },
  restoreText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },

  // Expanded View
  expandedContentWrapper: {
    flex: 1,
  },
  expandedTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modePillBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 6,
  },
  modePillText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cycleModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cycleModeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  iconCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  expandedScrollArea: {
    marginTop: 8,
  },
  cardSection: {
    paddingVertical: 4,
  },

  // Flight Route Card
  flightHeaderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 18,
    padding: 12,
    marginVertical: 6,
  },
  routeCol: {
    alignItems: "flex-start",
    flex: 1,
  },
  cityCodeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  cityNameText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  terminalText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  routeMidCol: {
    alignItems: "center",
    flex: 1.2,
    paddingHorizontal: 6,
  },
  flightDurationText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  flightProgressLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  flightDashedTrack: {
    height: 1.5,
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginEnd: 4,
  },
  flightNumberSub: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  // Countdown Banner
  countdownBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 16,
    padding: 10,
    marginVertical: 6,
  },
  countdownLeft: {
    flex: 1,
  },
  countdownLabel: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  digitalClockRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  digitalUnitBox: {
    alignItems: "center",
  },
  digitalUnitNumber: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  digitalUnitSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  digitalSeparator: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 3,
  },
  statusPillLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillLargeText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Boarding Grid
  boardingGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
    gap: 6,
  },
  gridBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  gridBoxLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  gridBoxValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // QR Boarding Pass
  qrPassContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginVertical: 8,
  },
  qrCanvasWrapper: {
    padding: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  qrPassTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  qrPassSub: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },

  // In-Trip Weather Card
  weatherCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
  },
  weatherLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  weatherIconLarge: {
    marginEnd: 10,
  },
  weatherTempText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  weatherDescText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  weatherRightMetrics: {
    alignItems: "flex-end",
  },
  weatherMetricItem: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  // Activity Highlight Box
  activityHighlightBox: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
  },
  activityHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  activityCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  activityCategoryText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  durationBadgeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  activityTitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 4,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  activityLocationText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  notesBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    padding: 8,
    gap: 6,
    marginVertical: 4,
  },
  notesText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 14,
    flex: 1,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  guideAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  guideName: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  guideRating: {
    color: "#94A3B8",
    fontSize: 12,
  },
  callGuideBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  callGuideText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Timeline list
  sectionHeaderTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
  },
  timelineList: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38BDF8",
    marginEnd: 8,
  },
  timelineTime: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    width: 44,
  },
  timelineTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Check-In Day & Hotel
  hotelCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
  },
  hotelTitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  hotelSubText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  hotelFloorText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  roomStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roomStatusTagText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // One-Tap Keyless Entry Hero
  keylessEntryHero: {
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    marginVertical: 6,
  },
  keylessHeroTitle: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  keylessHeroSub: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 10,
  },
  keylessTriggerButton: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keylessTriggerUnlocked: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  keylessPulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  keylessIconCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  keylessStatusMain: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  keylessStatusSub: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  passcodeFallback: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  passcodeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },

  // Amenities card
  amenitiesCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 10,
    marginVertical: 6,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amenityTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  amenitySub: {
    color: "#94A3B8",
    fontSize: 12,
  },
  copyBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  copyBadgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  amenityDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 8,
  },

  // Bottom Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284C7",
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  secondaryActionText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
});
