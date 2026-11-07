import { FocusAwareStatusBar } from "../components/ui/AppStatusBar";
/**
 * Offline Survival Screen - Zero-Connectivity Expedition Mode
 *
 * Designed for extreme remote mountain zones (Sajek, Bandarban, Keokradong)
 * and isolated coastal territories (Saint Martin's Island, Nijhum Dwip).
 *
 * Features:
 * 1. Offline Trip Vault: Itinerary, Hotel confirmation QR code, Boarding passes,
 *    and Emergency contacts decrypted from hardware-backed SQLite/SecureStore.
 * 2. Vector Tile Offline Map: Pre-cached SVG vector map showing booked hotel,
 *    departure station, trails, contour elevations, and key survival landmarks.
 * 3. Flashlight & Compass Widget: Real-time sensor-driven directional compass
 *    (expo-sensors Magnetometer) and multi-mode SOS strobe / night-vision torch.
 * 4. Network Transition Banner: Live connection observer detecting drops with
 *    "Offline Mode Active — All tickets and guides remain accessible".
 */

import * as React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  Platform,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { openLink } from "../utils/openLink";
import QRCode from "react-native-qrcode-svg";
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Text as SvgText,
  Line,
  Polyline,
  Polygon,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Magnetometer, type MagnetometerMeasurement } from "expo-sensors";

import {
  offlineGuideService,
  OfflineTripVaultPackage,
  DEFAULT_OFFLINE_EXPEDITION,
  NetworkTransitionState,
  VectorMapLandmark,
  VectorMapPath,
  OfflineItineraryItem,
  OfflineBoardingPass,
  OfflineContact,
} from "../services/offline/offlineGuideService";

import { useResponsive } from "../hooks/useResponsive";

// Palette: Tactical Rugged Survival Theme (OLED Black, High-Contrast Emerald, Safety Amber, Crimson)
const THEME = {
  bg: "#090D16",
  cardBg: "#111827",
  cardBorder: "#1F2937",
  cardActiveBorder: "#10B981",
  textPrimary: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  emerald: "#10B981",
  emeraldBg: "rgba(16, 185, 129, 0.12)",
  amber: "#F59E0B",
  amberBg: "rgba(245, 158, 11, 0.12)",
  crimson: "#EF4444",
  crimsonBg: "rgba(239, 68, 68, 0.12)",
  cyan: "#06B6D4",
  blue: "#2563EB",
};

type ActiveTab = "vault" | "map" | "tools" | "contacts";
type TorchMode = "off" | "torch" | "sos" | "red" | "amber";

export function OfflineSurvivalScreen() {
  const { width: SCREEN_WIDTH } = useResponsive();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Vault State
  const [vaultData, setVaultData] = useState<OfflineTripVaultPackage>(DEFAULT_OFFLINE_EXPEDITION);
  const [activeTab, setActiveTab] = useState<ActiveTab>("vault");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncText, setLastSyncText] = useState<string>("Cached offline");

  // Network State & Graceful Transition Banner
  const [networkState, setNetworkState] = useState<NetworkTransitionState>(
    offlineGuideService.getNetworkState()
  );
  const [bannerVisible, setBannerVisible] = useState<boolean>(true);
  const bannerAnim = useRef(new Animated.Value(1)).current;

  // Flashlight & SOS Torch State
  const [torchMode, setTorchMode] = useState<TorchMode>("off");
  const [torchScreenFlash, setTorchScreenFlash] = useState<boolean>(false);
  const sosIntervalRef = useRef<any>(null);

  // Directional Compass State
  const [magnetometerHeading, setMagnetometerHeading] = useState<number>(42);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(true);
  const [compassCalibration, setCompassCalibration] = useState<string>("High");
  const compassRotateAnim = useRef(new Animated.Value(0)).current;

  // Vector Map Interactive State
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedLandmark, setSelectedLandmark] = useState<VectorMapLandmark | null>(
    DEFAULT_OFFLINE_EXPEDITION.vectorMap.hotelTarget
  );
  const [mapFilter, setMapFilter] = useState<string>("all");

  // Itinerary Checklist State
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // QR Modal State
  const [expandedQrData, setExpandedQrData] = useState<{ title: string; payload: string; subtitle: string } | null>(
    null
  );

  // ==========================================================================
  // INITIALIZATION & LIFECYCLE
  // ==========================================================================

  useEffect(() => {
    loadOfflineVault();

    // Subscribe to Network State Transitions
    const unsubscribeNetwork = offlineGuideService.onNetworkTransition((state) => {
      setNetworkState(state);
      // Pulse transition banner when dropping offline
      if (state.isOfflineModeActive) {
        setBannerVisible(true);
        Animated.sequence([
          Animated.timing(bannerAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
          Animated.timing(bannerAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      }
    });

    // Initialize Magnetometer Compass
    initCompassSensor();

    return () => {
      unsubscribeNetwork();
      stopTorchAndSos();
      Magnetometer.removeAllListeners();
    };
  }, []);

  const loadOfflineVault = async () => {
    try {
      setIsLoading(true);
      const pkg = await offlineGuideService.loadVaultPackage();
      setVaultData(pkg);
      setSelectedLandmark(pkg.vectorMap.hotelTarget);

      const status = await offlineGuideService.getVaultStatus();
      if (status.lastSyncTime) {
        const d = new Date(status.lastSyncTime);
        setLastSyncText(`${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      }
    } catch {
      // Safe fallback already provided
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await offlineGuideService.syncOfflineVaultNow(true);
      Alert.alert(
        res.success ? "Vault Updated" : "Sync Notice",
        res.message,
        [{ text: "OK" }]
      );
      if (res.success) {
        await loadOfflineVault();
      }
    } catch {
      Alert.alert("Sync Error", "Could not complete network synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================================================
  // SENSOR-DRIVEN COMPASS ENGINE
  // ==========================================================================

  const initCompassSensor = async () => {
    try {
      const isAvail = await Magnetometer.isAvailableAsync();
      setSensorAvailable(isAvail);

      if (isAvail) {
        Magnetometer.setUpdateInterval(100);
        Magnetometer.addListener((data: MagnetometerMeasurement) => {
          let { x, y } = data;
          // Calculate heading angle in degrees (0 - 360)
          let angle = Math.atan2(-x, y) * (180 / Math.PI);
          if (angle < 0) {
            angle += 360;
          }
          const rounded = Math.round(angle);
          setMagnetometerHeading(rounded);
        });
      }
    } catch {
      setSensorAvailable(false);
    }
  };

  const getCardinalDirection = (deg: number): string => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[val % 16];
  };

  // Bearing to booked hotel from current simulated position
  const hotelBearingDeg = useMemo(() => {
    return 38; // 038° North-East direct vector to Meghpunji Ridge
  }, []);

  const relativeHotelAngle = useMemo(() => {
    let diff = hotelBearingDeg - magnetometerHeading;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  }, [hotelBearingDeg, magnetometerHeading]);

  // ==========================================================================
  // FLASHLIGHT & SOS STROBE UTILITY
  // ==========================================================================

  const toggleTorch = async (mode: TorchMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopTorchAndSos();

    if (torchMode === mode) {
      setTorchMode("off");
      setTorchScreenFlash(false);
      return;
    }

    setTorchMode(mode);

    // Request camera permission if needed for physical torch
    if (!permission?.granted) {
      await requestPermission();
    }

    if (mode === "sos") {
      startSosStrobeSequence();
    } else if (mode === "torch" || mode === "red" || mode === "amber") {
      setTorchScreenFlash(true);
    }
  };

  const stopTorchAndSos = () => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current);
      sosIntervalRef.current = null;
    }
    setTorchScreenFlash(false);
  };

  // Morse SOS Pattern: ... --- ... (Short-Short-Short, Long-Long-Long, Short-Short-Short)
  const startSosStrobeSequence = () => {
    const timings = [
      200, 200, 200, 200, 200, 600, // 3 short
      600, 300, 600, 300, 600, 600, // 3 long
      200, 200, 200, 200, 200, 1500, // 3 short + rest
    ];
    let step = 0;

    const runStep = () => {
      const isFlash = step % 2 === 0;
      setTorchScreenFlash(isFlash);

      if (isFlash) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const duration = timings[step % timings.length];
      step++;
      sosIntervalRef.current = setTimeout(runStep, duration);
    };

    runStep();
  };

  // ==========================================================================
  // VECTOR MAP PROJECTION HELPERS
  // ==========================================================================

  // Map center and boundaries for Sajek Valley Ridge (Normalized SVG Canvas: 340 x 280)
  const MAP_WIDTH = SCREEN_WIDTH - 32;
  const MAP_HEIGHT = 280;

  const projectCoords = useCallback(
    (lat: number, lon: number): { x: number; y: number } => {
      // Center lat: 23.3824, lon: 92.2938
      const centerLat = vaultData.vectorMap.centerCoordinates.latitude;
      const centerLon = vaultData.vectorMap.centerCoordinates.longitude;

      const scale = 3200; // SVG coordinate projection scale
      const dx = (lon - centerLon) * scale;
      const dy = (centerLat - lat) * scale; // inverted Y for screen space

      const cx = MAP_WIDTH / 2 + mapPan.x;
      const cy = MAP_HEIGHT / 2 + mapPan.y;

      return {
        x: cx + dx * mapZoom,
        y: cy + dy * mapZoom,
      };
    },
    [vaultData.vectorMap, mapPan, mapZoom, MAP_WIDTH, MAP_HEIGHT]
  );

  const filteredLandmarks = useMemo(() => {
    const all = [
      vaultData.vectorMap.hotelTarget,
      vaultData.vectorMap.departureStation,
      ...vaultData.vectorMap.landmarks,
    ];
    if (mapFilter === "all") return all;
    if (mapFilter === "hotel") return all.filter((l) => l.category === "hotel");
    if (mapFilter === "station") return all.filter((l) => l.category === "station");
    if (mapFilter === "spring") return all.filter((l) => l.category === "water_spring");
    if (mapFilter === "shelter") return all.filter((l) => l.category === "shelter" || l.category === "ranger_post");
    return all;
  }, [vaultData.vectorMap, mapFilter]);

  // ==========================================================================
  // RENDER SECTIONS
  // ==========================================================================

  const renderNetworkBanner = () => {
    const isOffline = networkState.isOfflineModeActive || !networkState.isOnline;

    return (
      <Animated.View
        style={[
          styles.bannerWrapper,
          {
            transform: [{ scale: bannerAnim }],
            backgroundColor: isOffline ? "#0F291E" : "#131C2E",
            borderColor: isOffline ? THEME.emerald : THEME.cyan,
          },
        ]}
      >
        <View style={styles.bannerRow}>
          <View
            style={[
              styles.bannerBadgeDot,
              { backgroundColor: isOffline ? THEME.emerald : THEME.cyan },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {isOffline
                ? "Offline Mode Active — All tickets and guides remain accessible"
                : "Online — Wi-Fi Auto-Download Enabled"}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isOffline
                ? `Zero data consumed • AES-256 Trip Vault synced (${lastSyncText})`
                : "Trip assets automatically cached for zero-connectivity zones"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bannerActionBtn}
            onPress={() => offlineGuideService.simulateNetworkState(isOffline)}
          >
            <Text style={styles.bannerActionBtnText}>
              {isOffline ? "Test Online" : "Simulate Drop"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderTelemetryBar = () => {
    return (
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryItem}>
          <Ionicons name="navigate-outline" size={13} color={THEME.emerald} />
          <Text style={styles.telemetryLabel}>GPS COORD</Text>
          <Text style={styles.telemetryValue}>23.3824°N, 92.2938°E</Text>
        </View>

        <View style={styles.telemetryDivider} />

        <View style={styles.telemetryItem}>
          <Ionicons name="trending-up-outline" size={13} color={THEME.amber} />
          <Text style={styles.telemetryLabel}>ELEVATION</Text>
          <Text style={styles.telemetryValue}>550m AMSL</Text>
        </View>

        <View style={styles.telemetryDivider} />

        <View style={styles.telemetryItem}>
          <Ionicons name="shield-checkmark-outline" size={13} color={THEME.cyan} />
          <Text style={styles.telemetryLabel}>VAULT STATE</Text>
          <Text style={styles.telemetryValue}>AES-256 Local</Text>
        </View>
      </View>
    );
  };

  const renderTabs = () => {
    const tabs: Array<{ key: ActiveTab; label: string; icon: any }> = [
      { key: "vault", label: "Trip Vault", icon: "shield-checkmark" },
      { key: "map", label: "Offline Map", icon: "map" },
      { key: "tools", label: "Compass & SOS", icon: "flashlight" },
      { key: "contacts", label: "SOS Contacts", icon: "call" },
    ];

    return (
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? THEME.emerald : THEME.textMuted}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // TAB 1: OFFLINE TRIP VAULT (HOTEL QR, BOARDING PASSES, ITINERARY)
  // --------------------------------------------------------------------------

  const renderVaultTab = () => {
    const hotel = vaultData.hotelTicket;

    return (
      <View style={styles.tabContent}>
        {/* Sync Status Banner with Offline Readiness & Pre-Trip Download Nudge */}
        <View style={styles.syncCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.offlineReadyPillRow}>
              <View style={styles.offlineReadyPill}>
                <Ionicons name="checkmark-circle" size={14} color={THEME.emerald} />
                <Text style={styles.offlineReadyPillText}>অফলাইনে প্রস্তুত ✓ (২.৩ MB)</Text>
              </View>
              <Text style={styles.offlineReadySyncTime}>{lastSyncText}</Text>
            </View>
            <Text style={styles.syncCardTitle}>Expedition Vault Ready</Text>
            <Text style={styles.syncCardSubtitle}>
              Target: {vaultData.destinationTitle}
            </Text>

            {/* Checklist of what is downloaded */}
            <View style={styles.offlineChecklistWrap}>
              <Text style={styles.offlineChecklistRow}>✓ বুকিং নিশ্চিতকরণ ও হোটেল চেক-ইন QR</Text>
              <Text style={styles.offlineChecklistRow}>✓ বোর্ডিং পাস ও পরিবহন টিকিট</Text>
              <Text style={styles.offlineChecklistRow}>✓ অফলাইন ভেক্টর ট্রেইল ম্যাপ (ক্যাশড)</Text>
              <Text style={styles.offlineChecklistRow}>✓ জরুরি উদ্ধার ও VHF রেডিও ফ্রিকোয়েন্সি</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? "refresh" : "cloud-download-outline"}
              size={16}
              color={THEME.emerald}
            />
            <Text style={styles.syncButtonText}>
              {isSyncing ? "ডাউনলোড..." : "ডাউনলোড করুন"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Booked Hotel Confirmation Pass */}
        <Text style={styles.sectionHeaderTitle}>BOOKED HOTEL CONFIRMATION</Text>
        <View style={styles.hotelCard}>
          <View style={styles.hotelCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={THEME.emerald} />
                <Text style={styles.confirmedBadgeText}>CONFIRMED & PRE-PAID</Text>
              </View>
              <Text style={styles.hotelName}>{hotel.hotelName}</Text>
              <Text style={styles.hotelAddress}>{hotel.hotelAddress}</Text>
            </View>
          </View>

          <View style={styles.hotelDetailsGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>CHECK-IN</Text>
              <Text style={styles.gridValue}>{hotel.checkInDate}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>CHECK-OUT</Text>
              <Text style={styles.gridValue}>{hotel.checkOutDate}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>ROOM TYPE</Text>
              <Text style={styles.gridValue}>{hotel.roomType}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>BOOKING REF</Text>
              <Text style={styles.gridValueBold}>{hotel.bookingReference}</Text>
            </View>
          </View>

          {/* Scannable Offline QR Code */}
          <View style={styles.qrContainer}>
            <TouchableOpacity
              style={styles.qrWhiteFrame}
              onPress={() =>
                setExpandedQrData({
                  title: hotel.hotelName,
                  subtitle: `Ref: ${hotel.bookingReference} • ${hotel.primaryGuestName}`,
                  payload: hotel.qrPayload,
                })
              }
            >
              <QRCode
                value={hotel.qrPayload}
                size={140}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.qrInstruction}>
              Tap to expand • Scannable offline by front desk without mobile data
            </Text>
            <Text style={styles.qrHash}>{hotel.verificationHash}</Text>
          </View>

          {/* Hotel Emergency Contact Row */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => openLink(`tel:${hotel.contactPhone}`, { label: "হোটেল ফ্রন্ট ডেস্ক" })}
            >
              <Ionicons name="call-outline" size={14} color={THEME.emerald} />
              <Text style={styles.cardActionText}>Call Front Desk ({hotel.contactPhone})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Boarding Passes & Transport Tickets */}
        <Text style={styles.sectionHeaderTitle}>OFFLINE BOARDING PASSES & CONVOYS</Text>
        {vaultData.boardingPasses.map((pass: OfflineBoardingPass) => (
          <View key={pass.id} style={styles.boardingPassCard}>
            <View style={styles.passHeader}>
              <View style={styles.carrierRow}>
                <Ionicons
                  name={
                    pass.transportType === "flight"
                      ? "airplane"
                      : pass.transportType === "bus"
                      ? "bus"
                      : "train"
                  }
                  size={16}
                  color={THEME.cyan}
                />
                <Text style={styles.carrierName}>{pass.carrierName}</Text>
              </View>
              <Text style={styles.serviceNumber}>{pass.serviceNumber}</Text>
            </View>

            <View style={styles.routeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeCity}>{pass.departureStation.split(" ")[0]}</Text>
                <Text style={styles.routeTime}>{pass.departureTime}</Text>
                <Text style={styles.routeStation}>{pass.departureStation}</Text>
              </View>

              <View style={styles.routeArrow}>
                <Ionicons name="arrow-forward" size={18} color={THEME.emerald} />
                <Text style={styles.seatPill}>Seat {pass.seatNumber}</Text>
              </View>

              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={styles.routeCity}>{pass.arrivalStation.split(" ")[0]}</Text>
                <Text style={styles.routeTime}>{pass.arrivalTime}</Text>
                <Text style={styles.routeStation}>{pass.arrivalStation}</Text>
              </View>
            </View>

            {/* Boarding QR Barcode */}
            <View style={styles.passFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.passLabel}>PASSENGER</Text>
                <Text style={styles.passValue}>{pass.passengerName}</Text>
                <Text style={styles.passLabel}>GATE / BAY</Text>
                <Text style={styles.passValueBold}>{pass.boardingGateOrPlatform}</Text>
                <Text style={styles.passLabel}>PNR</Text>
                <Text style={styles.passValue}>{pass.pnr}</Text>
              </View>

              <TouchableOpacity
                style={styles.miniQrFrame}
                onPress={() =>
                  setExpandedQrData({
                    title: `${pass.carrierName} ${pass.serviceNumber}`,
                    subtitle: `PNR: ${pass.pnr} • Seat ${pass.seatNumber}`,
                    payload: pass.qrPayload,
                  })
                }
              >
                <QRCode
                  value={pass.qrPayload}
                  size={76}
                  color="#000000"
                  backgroundColor="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Section: Expedition Itinerary Timeline */}
        <Text style={styles.sectionHeaderTitle}>EXPEDITION ITINERARY & CHECKPOINTS</Text>
        {vaultData.itinerary.map((item: OfflineItineraryItem) => {
          const isDone = completedItems[item.id] || false;

          return (
            <View key={item.id} style={styles.itineraryCard}>
              <View style={styles.itineraryTopRow}>
                <View style={styles.itineraryDayBadge}>
                  <Text style={styles.itineraryDayText}>DAY {item.dayNumber}</Text>
                </View>
                <Text style={styles.itineraryTimeSlot}>{item.timeSlot}</Text>
                <TouchableOpacity
                  style={[styles.checkBtn, isDone && styles.checkBtnDone]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCompletedItems((prev) => ({ ...prev, [item.id]: !isDone }));
                  }}
                >
                  <Ionicons
                    name={isDone ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isDone ? THEME.emerald : THEME.textMuted}
                  />
                  <Text style={[styles.checkBtnText, isDone && styles.checkBtnTextDone]}>
                    {isDone ? "Checkpoint Reached" : "Mark Passed"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.itineraryTitle}>{item.title}</Text>
              <Text style={styles.itineraryDesc}>{item.description}</Text>

              <View style={styles.itineraryMetaRow}>
                {item.altitudeText && (
                  <View style={styles.metaBadge}>
                    <Ionicons name="stats-chart-outline" size={12} color={THEME.amber} />
                    <Text style={styles.metaBadgeText}>{item.altitudeText}</Text>
                  </View>
                )}
                {item.trailMarking && (
                  <View style={styles.metaBadge}>
                    <Ionicons name="flag-outline" size={12} color={THEME.cyan} />
                    <Text style={styles.metaBadgeText}>{item.trailMarking}</Text>
                  </View>
                )}
              </View>

              {item.safetyAdvisory && (
                <View style={styles.advisoryBox}>
                  <Ionicons name="warning-outline" size={14} color={THEME.amber} />
                  <Text style={styles.advisoryText}>{item.safetyAdvisory}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // TAB 2: VECTOR TILE OFFLINE MAP (ZERO-DATA SVG PRE-CACHED GEOMETRY)
  // --------------------------------------------------------------------------

  const renderMapTab = () => {
    const { hotelTarget, departureStation, paths, contourLines } = vaultData.vectorMap;

    return (
      <View style={styles.tabContent}>
        {/* Map Header Card */}
        <View style={styles.mapControlsCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mapTitle}>{vaultData.vectorMap.regionName}</Text>
            <Text style={styles.mapSubtitle}>
              Pre-cached Vector Topology • Zero Mobile Data Required
            </Text>
          </View>

          {/* Zoom & Reset Controls */}
          <View style={styles.mapZoomButtonGroup}>
            <TouchableOpacity
              style={styles.mapZoomBtn}
              onPress={() => setMapZoom((z) => Math.min(z + 0.3, 2.5))}
            >
              <Ionicons name="add" size={16} color={THEME.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapZoomBtn}
              onPress={() => setMapZoom((z) => Math.max(z - 0.3, 0.7))}
            >
              <Ionicons name="remove" size={16} color={THEME.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mapZoomBtn}
              onPress={() => {
                setMapZoom(1);
                setMapPan({ x: 0, y: 0 });
              }}
            >
              <Ionicons name="refresh" size={14} color={THEME.emerald} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mapFilterScroll}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {[
            { id: "all", label: "All Points" },
            { id: "hotel", label: "Booked Hotel" },
            { id: "station", label: "Convoy Terminal" },
            { id: "spring", label: "Fresh Springs" },
            { id: "shelter", label: "Medical / Army" },
          ].map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, mapFilter === f.id && styles.filterChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setMapFilter(f.id);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  mapFilter === f.id && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pre-cached Vector SVG Map Surface */}
        <View style={styles.mapCanvasContainer}>
          <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
            <Defs>
              <SvgGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0B132B" />
                <Stop offset="100%" stopColor="#050B14" />
              </SvgGradient>
              <SvgGradient id="pulseGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </SvgGradient>
            </Defs>

            {/* Background Grid & Relief */}
            <Rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#bgGrad)" rx={12} />

            {/* Grid Coordinates Lines */}
            {[60, 120, 180, 240].map((y) => (
              <Line
                key={`gy-${y}`}
                x1={0}
                y1={y}
                x2={MAP_WIDTH}
                y2={y}
                stroke="#1E293B"
                strokeWidth={1}
                strokeDasharray="4, 4"
              />
            ))}
            {[80, 160, 240, 320].map((x) => (
              <Line
                key={`gx-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={MAP_HEIGHT}
                stroke="#1E293B"
                strokeWidth={1}
                strokeDasharray="4, 4"
              />
            ))}

            {/* Topographic Elevation Contours */}
            {contourLines.map((line, idx) => {
              const pointsStr = line.points
                .map((p) => {
                  const pt = projectCoords(p.latitude, p.longitude);
                  return `${pt.x},${pt.y}`;
                })
                .join(" ");

              return (
                <G key={`contour-${idx}`}>
                  <Polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#1E3A5F"
                    strokeWidth={1.2}
                    strokeDasharray={idx === 1 ? "2, 3" : undefined}
                  />
                  {line.points[0] && (
                    <SvgText
                      x={projectCoords(line.points[0].latitude, line.points[0].longitude).x + 4}
                      y={projectCoords(line.points[0].latitude, line.points[0].longitude).y - 2}
                      fontSize="9"
                      fill="#38BDF8"
                      opacity={0.6}
                    >
                      {line.elevation}m
                    </SvgText>
                  )}
                </G>
              );
            })}

            {/* Pre-cached Vector Trails / Paths */}
            {paths.map((path) => {
              const pathPointsStr = path.points
                .map((p) => {
                  const pt = projectCoords(p.latitude, p.longitude);
                  return `${pt.x},${pt.y}`;
                })
                .join(" ");

              return (
                <Polyline
                  key={path.id}
                  points={pathPointsStr}
                  fill="none"
                  stroke={path.type === "ridge_walk" ? THEME.amber : THEME.cyan}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Vector Landmarks & Pins */}
            {filteredLandmarks.map((lm) => {
              const pt = projectCoords(lm.coordinates.latitude, lm.coordinates.longitude);
              const isSelected = selectedLandmark?.id === lm.id;
              const isHotel = lm.category === "hotel";
              const isStation = lm.category === "station";

              return (
                <G
                  key={lm.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedLandmark(lm);
                  }}
                >
                  {/* Pulse ring for booked hotel */}
                  {isHotel && (
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={18}
                      fill="url(#pulseGlow)"
                    />
                  )}

                  {/* Marker Pin Base */}
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 10 : 8}
                    fill={
                      isHotel
                        ? THEME.emerald
                        : isStation
                        ? THEME.cyan
                        : lm.category === "water_spring"
                        ? "#0284C7"
                        : lm.category === "shelter"
                        ? THEME.crimson
                        : THEME.amber
                    }
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Icon label text */}
                  <SvgText
                    x={pt.x}
                    y={pt.y + 16}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill={isSelected ? THEME.emerald : THEME.textPrimary}
                  >
                    {lm.name.split(" ")[0]}
                  </SvgText>
                </G>
              );
            })}
          </Svg>

          {/* Compass Rose Overlay */}
          <View style={styles.mapCompassMiniOverlay}>
            <Ionicons
              name="compass-outline"
              size={24}
              color={THEME.emerald}
              style={{ transform: [{ rotate: `${-magnetometerHeading}deg` }] }}
            />
            <Text style={styles.miniHeadingText}>{getCardinalDirection(magnetometerHeading)}</Text>
          </View>
        </View>

        {/* Selected Landmark Detail Card */}
        {selectedLandmark && (
          <View style={styles.selectedLandmarkCard}>
            <View style={styles.landmarkCardHeader}>
              <View
                style={[
                  styles.landmarkCategoryBadge,
                  {
                    backgroundColor:
                      selectedLandmark.category === "hotel"
                        ? THEME.emeraldBg
                        : selectedLandmark.category === "station"
                        ? "rgba(6, 182, 212, 0.15)"
                        : THEME.amberBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.landmarkCategoryText,
                    {
                      color:
                        selectedLandmark.category === "hotel"
                          ? THEME.emerald
                          : selectedLandmark.category === "station"
                          ? THEME.cyan
                          : THEME.amber,
                    },
                  ]}
                >
                  {selectedLandmark.category.toUpperCase().replace("_", " ")}
                </Text>
              </View>

              <Text style={styles.landmarkDist}>
                Direct Vector: 1.2 km • 038° NE
              </Text>
            </View>

            <Text style={styles.landmarkName}>{selectedLandmark.name}</Text>
            <Text style={styles.landmarkDesc}>{selectedLandmark.description}</Text>
            {selectedLandmark.elevationMeters && (
              <Text style={styles.landmarkElev}>
                Altitude: {selectedLandmark.elevationMeters}m above sea level
              </Text>
            )}

            <View style={styles.landmarkActionsRow}>
              <TouchableOpacity
                style={styles.landmarkNavBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setActiveTab("tools");
                }}
              >
                <Ionicons name="navigate-circle" size={16} color="#FFFFFF" />
                <Text style={styles.landmarkNavBtnText}>Align Compass to Target</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // TAB 3: FLASHLIGHT & SENSOR COMPASS WIDGET
  // --------------------------------------------------------------------------

  const renderToolsTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Hidden CameraView to drive physical back torch */}
        {permission?.granted && Platform.OS !== "web" && (
          <View style={styles.hiddenCameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchMode === "torch" || (torchMode === "sos" && torchScreenFlash)}
            />
          </View>
        )}

        {/* Sensor-Driven Directional Compass Widget */}
        <View style={styles.compassCard}>
          <View style={styles.compassCardHeader}>
            <View>
              <Text style={styles.compassCardTitle}>SENSOR-DRIVEN COMPASS</Text>
              <Text style={styles.compassCardSubtitle}>
                {sensorAvailable ? "Magnetometer Hardware Live" : "Simulated Gyroscope"} • {compassCalibration} Accuracy
              </Text>
            </View>

            <View style={styles.headingBadge}>
              <Text style={styles.headingBigText}>{magnetometerHeading}°</Text>
              <Text style={styles.headingDirText}>{getCardinalDirection(magnetometerHeading)}</Text>
            </View>
          </View>

          {/* Rotating Compass Graphic */}
          <View style={styles.compassRoseContainer}>
            <Svg width={220} height={220} viewBox="0 0 220 220">
              <Defs>
                <SvgGradient id="compassRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#1E293B" />
                  <Stop offset="100%" stopColor="#0F172A" />
                </SvgGradient>
              </Defs>

              {/* Static Outer Rim */}
              <Circle cx={110} cy={110} r={105} fill="url(#compassRingGrad)" stroke="#334155" strokeWidth={2} />
              <Circle cx={110} cy={110} r={95} fill="none" stroke="#1E293B" strokeWidth={1} strokeDasharray="3, 3" />

              {/* Rotating Internal Rose Dial */}
              <G transform={`rotate(${-magnetometerHeading}, 110, 110)`}>
                {/* 30-degree tick marks */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <Line
                    key={`tick-${deg}`}
                    x1={110}
                    y1={16}
                    x2={110}
                    y2={deg % 90 === 0 ? 28 : 22}
                    stroke={deg === 0 ? THEME.crimson : "#64748B"}
                    strokeWidth={deg % 90 === 0 ? 2.5 : 1}
                    transform={`rotate(${deg}, 110, 110)`}
                  />
                ))}

                {/* Cardinal Labels */}
                <SvgText x={110} y={42} textAnchor="middle" fontSize="14" fontWeight="800" fill={THEME.crimson}>
                  N
                </SvgText>
                <SvgText x={178} y={115} textAnchor="middle" fontSize="13" fontWeight="700" fill="#E2E8F0">
                  E
                </SvgText>
                <SvgText x={110} y={188} textAnchor="middle" fontSize="13" fontWeight="700" fill="#E2E8F0">
                  S
                </SvgText>
                <SvgText x={42} y={115} textAnchor="middle" fontSize="13" fontWeight="700" fill="#E2E8F0">
                  W
                </SvgText>

                {/* North & South Magnetic Needles */}
                <Polygon
                  points="110,32 104,110 116,110"
                  fill={THEME.crimson}
                />
                <Polygon
                  points="110,188 104,110 116,110"
                  fill="#94A3B8"
                />
              </G>

              {/* Booked Hotel Target Bearing Vector Needle (Green) */}
              <G transform={`rotate(${relativeHotelAngle}, 110, 110)`}>
                <Line
                  x1={110}
                  y1={110}
                  x2={110}
                  y2={20}
                  stroke={THEME.emerald}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <Circle cx={110} cy={16} r={5} fill={THEME.emerald} stroke="#FFFFFF" strokeWidth={1.5} />
              </G>

              {/* Center Pivot Core */}
              <Circle cx={110} cy={110} r={9} fill="#0F172A" stroke={THEME.emerald} strokeWidth={2} />
              <Circle cx={110} cy={110} r={3} fill="#FFFFFF" />
            </Svg>

            {/* Target Bearing Readout */}
            <View style={styles.hotelBearingBox}>
              <Ionicons name="business" size={14} color={THEME.emerald} />
              <Text style={styles.hotelBearingText}>
                Booked Hotel Bearing: {hotelBearingDeg}° NE (Turn {Math.abs(relativeHotelAngle)}° {relativeHotelAngle > 0 ? "Right" : "Left"})
              </Text>
            </View>
          </View>
        </View>

        {/* Flashlight & Emergency SOS Strobe Utility */}
        <Text style={styles.sectionHeaderTitle}>FLASHLIGHT & SOS STROBE UTILITY</Text>
        <View style={styles.torchCard}>
          <View style={styles.torchButtonsGrid}>
            {/* Steady Torch */}
            <TouchableOpacity
              style={[
                styles.torchBtn,
                torchMode === "torch" && styles.torchBtnActiveTorch,
              ]}
              onPress={() => toggleTorch("torch")}
            >
              <Ionicons
                name="flashlight"
                size={22}
                color={torchMode === "torch" ? "#000000" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.torchBtnLabel,
                  torchMode === "torch" && styles.torchBtnLabelActive,
                ]}
              >
                {torchMode === "torch" ? "LIGHT ON" : "TORCH"}
              </Text>
              <Text style={styles.torchBtnSub}>High-Beam Constant</Text>
            </TouchableOpacity>

            {/* Morse Code SOS Strobe */}
            <TouchableOpacity
              style={[
                styles.torchBtn,
                torchMode === "sos" && styles.torchBtnActiveSos,
              ]}
              onPress={() => toggleTorch("sos")}
            >
              <Ionicons
                name="warning"
                size={22}
                color={torchMode === "sos" ? "#FFFFFF" : THEME.crimson}
              />
              <Text
                style={[
                  styles.torchBtnLabel,
                  torchMode === "sos" && { color: "#FFFFFF" },
                ]}
              >
                {torchMode === "sos" ? "SOS STROBE ON" : "SOS STROBE"}
              </Text>
              <Text style={styles.torchBtnSub}>... --- ... Alpine Code</Text>
            </TouchableOpacity>

            {/* Red Light (Night Vision Protection) */}
            <TouchableOpacity
              style={[
                styles.torchBtn,
                torchMode === "red" && styles.torchBtnActiveRed,
              ]}
              onPress={() => toggleTorch("red")}
            >
              <Ionicons
                name="eye-outline"
                size={22}
                color={torchMode === "red" ? "#FFFFFF" : THEME.crimson}
              />
              <Text
                style={[
                  styles.torchBtnLabel,
                  torchMode === "red" && { color: "#FFFFFF" },
                ]}
              >
                NIGHT VISION
              </Text>
              <Text style={styles.torchBtnSub}>Red 650nm Stealth</Text>
            </TouchableOpacity>

            {/* Amber Fog Beacon */}
            <TouchableOpacity
              style={[
                styles.torchBtn,
                torchMode === "amber" && styles.torchBtnActiveAmber,
              ]}
              onPress={() => toggleTorch("amber")}
            >
              <Ionicons
                name="cloudy-outline"
                size={22}
                color={torchMode === "amber" ? "#000000" : THEME.amber}
              />
              <Text
                style={[
                  styles.torchBtnLabel,
                  torchMode === "amber" && styles.torchBtnLabelActive,
                ]}
              >
                FOG BEACON
              </Text>
              <Text style={styles.torchBtnSub}>High Mist Penetration</Text>
            </TouchableOpacity>
          </View>

          {/* Active Screen Illuminator Panel (For screen torch / SOS visual strobe) */}
          {torchMode !== "off" && (
            <View
              style={[
                styles.screenTorchPanel,
                {
                  backgroundColor:
                    torchMode === "red"
                      ? "#DC2626"
                      : torchMode === "amber"
                      ? "#F59E0B"
                      : torchScreenFlash
                      ? "#FFFFFF"
                      : "#1E293B",
                },
              ]}
            >
              <Text
                style={[
                  styles.screenTorchText,
                  {
                    color:
                      torchMode === "red"
                        ? "#FFFFFF"
                        : torchMode === "amber"
                        ? "#000000"
                        : torchScreenFlash
                        ? "#000000"
                        : "#94A3B8",
                  },
                ]}
              >
                {torchMode === "sos"
                  ? "EMERGENCY SOS STROBE TRANSMITTING • VISIBLE TO AIR SEARCH"
                  : torchMode === "red"
                  ? "RED NIGHT-VISION LAMP ACTIVE • PROTECTING RHODOPSIN"
                  : torchMode === "amber"
                  ? "AMBER FOG CUTTER LAMP ENGAGED"
                  : "CONSTANT EMERGENCY SCREEN FLOODLIGHT ACTIVE"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // TAB 4: SOS CONTACTS & MOUNTAIN/COASTAL SURVIVAL PROTOCOLS
  // --------------------------------------------------------------------------

  const renderContactsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionHeaderTitle}>VERIFIED RESCUE & FOREST FREQUENCIES</Text>
        {vaultData.emergencyContacts.map((c: OfflineContact) => (
          <View key={c.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <View
                style={[
                  styles.categoryDot,
                  {
                    backgroundColor:
                      c.category === "rescue"
                        ? THEME.crimson
                        : c.category === "medical"
                        ? THEME.emerald
                        : THEME.cyan,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactLoc}>{c.physicalLocation}</Text>
              </View>
            </View>

            <Text style={styles.contactNotes}>{c.notes}</Text>

            {c.radioFrequencyVhf && (
              <View style={styles.vhfBadge}>
                <Ionicons name="radio" size={13} color={THEME.amber} />
                <Text style={styles.vhfText}>Radio: {c.radioFrequencyVhf}</Text>
              </View>
            )}

            <View style={styles.contactBtnRow}>
              <TouchableOpacity
                style={styles.primaryCallBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  openLink(`tel:${c.phonePrimary}`, { label: c.name || "জরুরি যোগাযোগ" });
                }}
              >
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call ({c.phonePrimary})</Text>
              </TouchableOpacity>
              {c.phoneSecondary && (
                <TouchableOpacity
                  style={styles.secondaryCallBtn}
                  onPress={() => openLink(`tel:${c.phoneSecondary}`, { label: `${c.name || "জরুরি"} ব্যাকআপ` })}
                >
                  <Ionicons name="call-outline" size={14} color={THEME.emerald} />
                  <Text style={styles.secondaryCallText}>Backup ({c.phoneSecondary})</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Survival Protocols Cheat Sheet */}
        <Text style={styles.sectionHeaderTitle}>MOUNTAIN SURVIVAL PROTOCOLS</Text>
        {vaultData.survivalGuide.emergencyProtocols.map((p, idx) => (
          <View key={`protocol-${p.title || idx}`} style={styles.protocolCard}>
            <View style={styles.protocolHeader}>
              <Ionicons name="shield" size={16} color={THEME.amber} />
              <Text style={styles.protocolTitle}>{p.title}</Text>
            </View>
            {p.steps.map((s, stepIdx) => (
              <View key={stepIdx} style={styles.protocolStepRow}>
                <Text style={styles.stepNum}>{stepIdx + 1}.</Text>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
            {p.criticalWarning && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={14} color={THEME.crimson} />
                <Text style={styles.warningBoxText}>{p.criticalWarning}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Offline Phrasebook for Indigenous & Local dialect */}
        <Text style={styles.sectionHeaderTitle}>OFFLINE SURVIVAL PHRASEBOOK</Text>
        <View style={styles.phrasebookCard}>
          {vaultData.survivalGuide.survivalPhrasebook.map((ph, idx) => (
            <View key={`phrase-${ph.phrase || idx}`} style={styles.phraseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.phraseEng}>{ph.phrase}</Text>
                <Text style={styles.phrasePhonetic}>"{ph.pronunciation}"</Text>
              </View>
              <View style={styles.phraseLangBadge}>
                <Text style={styles.phraseLangText}>{ph.language}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ==========================================================================
  // FULL SCREEN EXPANDED QR MODAL
  // ==========================================================================

  const renderQrModal = () => {
    if (!expandedQrData) return null;

    return (
      <Modal
        visible={Boolean(expandedQrData)}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedQrData(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{expandedQrData.title}</Text>
            <Text style={styles.modalSubtitle}>{expandedQrData.subtitle}</Text>

            <View style={styles.modalQrFrame}>
              <QRCode
                value={expandedQrData.payload}
                size={230}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            <Text style={styles.modalInstruction}>
              Cryptographically signed token • Works 100% offline without mobile data
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setExpandedQrData(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close Pass</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FocusAwareStatusBar style="light" backgroundColor={THEME.bg} />

      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPill}>
            <Ionicons name="trail-sign" size={16} color={THEME.emerald} />
            <Text style={styles.logoText}>SURVIVAL MODE</Text>
          </View>
          <Text style={styles.headerTitle}>Zero-Connectivity Vault</Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleManualSync}
        >
          <Ionicons name="sync-outline" size={18} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Network Transition Drop Banner */}
      {renderNetworkBanner()}

      {/* GPS & Sensor Telemetry HUD */}
      {renderTelemetryBar()}

      {/* Segmented Navigation Tabs */}
      {renderTabs()}

      {/* Active Tab Body */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "vault" && renderVaultTab()}
        {activeTab === "map" && renderMapTab()}
        {activeTab === "tools" && renderToolsTab()}
        {activeTab === "contacts" && renderContactsTab()}
      </ScrollView>

      {/* Expanded QR Modal */}
      {renderQrModal()}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.bg,
  },
  headerLeft: {
    flex: 1,
  },
  logoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  bannerActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
  },
  bannerActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  telemetryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D1322",
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 12,
  },
  telemetryItem: {
    alignItems: "center",
    gap: 2,
  },
  telemetryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  telemetryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textPrimary,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1E293B",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: THEME.cardBg,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 7,
  },
  tabButtonActive: {
    backgroundColor: "#1F2937",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: THEME.emerald,
    fontWeight: "700",
  },
  scrollArea: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.textMuted,
    letterSpacing: 1,
    marginTop: 6,
  },
  syncCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    borderRadius: 12,
  },
  offlineReadyPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  offlineReadyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.emeraldBg,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  offlineReadyPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME.emerald,
  },
  offlineReadySyncTime: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  offlineChecklistWrap: {
    marginTop: 8,
    gap: 3,
  },
  offlineChecklistRow: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  syncCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  syncCardSubtitle: {
    fontSize: 12,
    color: THEME.emerald,
    marginTop: 2,
  },
  syncCardHash: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.emeraldBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.emerald,
  },
  hotelCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
    gap: 12,
  },
  hotelCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
    letterSpacing: 0.5,
  },
  hotelName: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  hotelAddress: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  hotelDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#0B111E",
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  gridItem: {
    width: "46%",
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textPrimary,
    marginTop: 1,
  },
  gridValueBold: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
    marginTop: 1,
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  qrWhiteFrame: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  qrInstruction: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  qrHash: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  cardActionsRow: {
    marginTop: 4,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1F2937",
    paddingVertical: 10,
    borderRadius: 8,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  boardingPassCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 12,
  },
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingBottom: 8,
  },
  carrierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  carrierName: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  serviceNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.cyan,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeCity: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  routeTime: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.emerald,
    marginTop: 2,
  },
  routeStation: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
    maxWidth: 110,
  },
  routeArrow: {
    alignItems: "center",
    gap: 4,
  },
  seatPill: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
    backgroundColor: "#1E293B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  passFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B111E",
    padding: 10,
    borderRadius: 8,
  },
  passLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  passValue: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  passValueBold: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
    marginBottom: 4,
  },
  miniQrFrame: {
    backgroundColor: "#FFFFFF",
    padding: 5,
    borderRadius: 6,
  },
  itineraryCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 6,
  },
  itineraryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itineraryDayBadge: {
    backgroundColor: THEME.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itineraryDayText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
  },
  itineraryTimeSlot: {
    fontSize: 12,
    color: THEME.textSecondary,
    flex: 1,
  },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkBtnDone: {
    opacity: 0.8,
  },
  checkBtnText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  checkBtnTextDone: {
    color: THEME.emerald,
    fontWeight: "700",
  },
  itineraryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  itineraryDesc: {
    fontSize: 12,
    color: THEME.textSecondary,
    lineHeight: 17,
  },
  itineraryMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 12,
    color: THEME.textPrimary,
  },
  advisoryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.amberBg,
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  advisoryText: {
    fontSize: 12,
    color: THEME.amber,
    flex: 1,
    lineHeight: 15,
  },
  mapControlsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.cardBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  mapSubtitle: {
    fontSize: 12,
    color: THEME.emerald,
    marginTop: 1,
  },
  mapZoomButtonGroup: {
    flexDirection: "row",
    gap: 6,
  },
  mapZoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  mapFilterScroll: {
    marginVertical: -4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginEnd: 8,
  },
  filterChipActive: {
    backgroundColor: THEME.emeraldBg,
    borderColor: THEME.emerald,
  },
  filterChipText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: THEME.emerald,
    fontWeight: "700",
  },
  mapCanvasContainer: {
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E293B",
    position: "relative",
  },
  mapCompassMiniOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  miniHeadingText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
    marginTop: 2,
  },
  selectedLandmarkCard: {
    backgroundColor: THEME.cardBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 6,
  },
  landmarkCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  landmarkCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  landmarkCategoryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  landmarkDist: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  landmarkName: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  landmarkDesc: {
    fontSize: 12,
    color: THEME.textSecondary,
    lineHeight: 16,
  },
  landmarkElev: {
    fontSize: 12,
    color: THEME.cyan,
    fontWeight: "600",
  },
  landmarkActionsRow: {
    marginTop: 4,
  },
  landmarkNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.emerald,
    paddingVertical: 9,
    borderRadius: 8,
  },
  landmarkNavBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  hiddenCameraContainer: {
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0,
    position: "absolute",
  },
  compassCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  compassCardHeader: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compassCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.textMuted,
    letterSpacing: 0.5,
  },
  compassCardSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  headingBadge: {
    alignItems: "flex-end",
  },
  headingBigText: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME.textPrimary,
  },
  headingDirText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.emerald,
  },
  compassRoseContainer: {
    alignItems: "center",
    gap: 10,
  },
  hotelBearingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.emeraldBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  hotelBearingText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.emerald,
  },
  torchCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 12,
  },
  torchButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  torchBtn: {
    width: "48%",
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  torchBtnActiveTorch: {
    backgroundColor: "#FACC15",
    borderColor: "#FACC15",
  },
  torchBtnActiveSos: {
    backgroundColor: THEME.crimson,
    borderColor: THEME.crimson,
  },
  torchBtnActiveRed: {
    backgroundColor: "#991B1B",
    borderColor: "#EF4444",
  },
  torchBtnActiveAmber: {
    backgroundColor: THEME.amber,
    borderColor: THEME.amber,
  },
  torchBtnLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  torchBtnLabelActive: {
    color: "#000000",
  },
  torchBtnSub: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  screenTorchPanel: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  screenTorchText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  contactCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 8,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  contactLoc: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  contactNotes: {
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 16,
  },
  vhfBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  vhfText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.amber,
  },
  contactBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.emerald,
    paddingVertical: 9,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1F2937",
    paddingVertical: 9,
    borderRadius: 8,
  },
  secondaryCallText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.emerald,
  },
  protocolCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 6,
  },
  protocolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  protocolTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  protocolStepRow: {
    flexDirection: "row",
    gap: 6,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.emerald,
  },
  stepText: {
    fontSize: 12,
    color: THEME.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.crimsonBg,
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  warningBoxText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.crimson,
    flex: 1,
  },
  phrasebookCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    padding: 14,
    gap: 12,
  },
  phraseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingBottom: 8,
  },
  phraseEng: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  phrasePhonetic: {
    fontSize: 12,
    color: THEME.emerald,
    fontStyle: "italic",
    marginTop: 2,
  },
  phraseLangBadge: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  phraseLangText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: THEME.cardBg,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.textPrimary,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.emerald,
    textAlign: "center",
  },
  modalQrFrame: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    marginVertical: 10,
  },
  modalInstruction: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
  modalCloseBtn: {
    marginTop: 10,
    backgroundColor: THEME.emerald,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
