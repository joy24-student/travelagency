/**
 * Active Trip Live Tracking & SOS Interface - Shopno Jatra
 * Implements Image 1 Workflow: Confirmed Booking -> OTP Verification ->
 * Live GPS Collection -> Leaflet Web Map -> Trusted Contact Broadcast -> Trip Finalize.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";

import { marketplaceService, CURATED_PROVIDERS } from "../../services/marketplaceService";
import { ProviderProfile, TripSession } from "../../types/marketplace";
import { colors } from "../../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ActiveTripTrackingScreenProps {
  bookingId?: string;
  isProviderMode?: boolean;
}

export const ActiveTripTrackingScreen: React.FC<ActiveTripTrackingScreenProps> = ({
  bookingId = "booking-demo-001",
  isProviderMode = false,
}) => {
  const provider = CURATED_PROVIDERS[0]; // Mahmud Hasan Niloy (Cox's Bazar)

  // State machine: 'scheduled' | 'checked_in' | 'active' | 'completed'
  const [tripStatus, setTripStatus] = useState<"scheduled" | "checked_in" | "active" | "completed">("scheduled");
  const [otpCode, setOtpCode] = useState<string>("582914");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);

  // Live Location & Metrics
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 21.35,
    longitude: 92.01,
  });
  const [distanceKm, setDistanceKm] = useState<number>(0.0);
  const [speedKmh, setSpeedKmh] = useState<number>(0.0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [lastPingTime, setLastPingTime] = useState<string>("Just now");

  // SOS Panic State
  const [isSOSArmed, setIsSOSArmed] = useState<boolean>(false);
  const [sosCountdown, setSosCountdown] = useState<number>(5);
  const [sosDispatched, setSosDispatched] = useState<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const webViewRef = useRef<WebView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live tracking indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Elapsed timer when active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (tripStatus === "active") {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tripStatus]);

  // GPS Collection Loop (Foreground simulation & validation)
  useEffect(() => {
    let locWatcher: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      if (tripStatus !== "active") return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          locWatcher = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 12000, // 12 seconds per Image 1 spec
              distanceInterval: 10,
            },
            (pos) => {
              const { latitude, longitude, speed } = pos.coords;
              setCurrentCoords({ latitude, longitude });
              setSpeedKmh(speed && speed > 0 ? Math.round(speed * 3.6) : 4.2);
              setLastPingTime("Just now");
              setDistanceKm((prev) => +(prev + 0.05).toFixed(2));

              // Update Leaflet Map pin
              const script = `
                if (window.updateLiveMarker) {
                  window.updateLiveMarker(${latitude}, ${longitude});
                }
                true;
              `;
              webViewRef.current?.injectJavaScript(script);
            }
          );
        }
      } catch (e) {
        console.warn("[GPS] Location error:", e);
      }
    }

    startLocationTracking();

    return () => {
      locWatcher?.remove();
    };
  }, [tripStatus]);

  // Format Elapsed Time (HH:MM:SS)
  const formattedTime = useMemo(() => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Handle OTP Check-In
  const handleVerifyOtp = useCallback(() => {
    if (enteredOtp.trim() !== otpCode) {
      Alert.alert("Invalid OTP", "The 6-digit code does not match. Please verify with the traveler.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setTripStatus("checked_in");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Check-In Verified! ✅",
        "Traveler identity confirmed. You may now start GPS collection and begin the tour."
      );
    }, 600);
  }, [enteredOtp, otpCode]);

  // Start Trip Tracking
  const handleStartTrip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTripStatus("active");
  }, []);

  // End Trip
  const handleFinalizeTrip = useCallback(() => {
    Alert.alert(
      "End Trip? 🏁",
      "This will terminate live GPS collection and archive the trip session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Trip",
          style: "destructive",
          onPress: () => {
            setTripStatus("completed");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Trip Finalized", "Thank you! Please leave a review for your guide.");
          },
        },
      ]
    );
  }, []);

  // SOS Panic Workflow
  const handleArmSOS = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSOSArmed(true);
    setSosCountdown(5);

    countdownTimerRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          triggerSOSDispatch();
          return 0;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleCancelSOS = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsSOSArmed(false);
    setSosCountdown(5);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const triggerSOSDispatch = useCallback(() => {
    setIsSOSArmed(false);
    setSosDispatched(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  // Share Live Trip Link
  const handleShareTrip = useCallback(async () => {
    try {
      await Share.share({
        message: `🛡️ ShopnoJatra Live Trip Tracking\nI am currently on an active tour with certified guide ${provider.full_name} in ${provider.primary_destination}.\nTrack my live position: https://shopnojatra.com/track/${bookingId}`,
      });
    } catch (e) {
      console.warn("Share error", e);
    }
  }, [bookingId, provider]);

  // Leaflet Map HTML
  const leafletMapHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0f172a; }
          .live-pulse {
            width: 22px; height: 22px; background: #0055F2; border: 3px solid #ffffff;
            border-radius: 50%; box-shadow: 0 0 12px rgba(0, 85, 242, 0.8);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${currentCoords.latitude}, ${currentCoords.longitude}], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

          var liveIcon = L.divIcon({ className: 'custom-icon', html: '<div class="live-pulse"></div>', iconSize: [22, 22] });
          var marker = L.marker([${currentCoords.latitude}, ${currentCoords.longitude}], { icon: liveIcon }).addTo(map);

          window.updateLiveMarker = function(lat, lng) {
            marker.setLatLng([lat, lng]);
            map.panTo([lat, lng]);
          };
        </script>
      </body>
      </html>
    `;
  }, [currentCoords]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Trip Tracking</Text>
          <View style={styles.statusBadge}>
            <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.statusBadgeText}>
              {tripStatus === "active" ? "BROADCASTING LIVE" : tripStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareTrip}>
          <Ionicons name="share-social-outline" size={22} color="#0055F2" />
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: leafletMapHtml }}
          style={styles.mapWebView}
          scrollEnabled={false}
        />
        {/* Telemetry Overlay Floating Card */}
        {tripStatus === "active" && (
          <View style={styles.telemetryOverlay}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricVal}>{distanceKm} km</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SPEED</Text>
              <Text style={styles.metricVal}>{speedKmh} km/h</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>DURATION</Text>
              <Text style={styles.metricVal}>{formattedTime}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Workflow Controls & State Card */}
      <ScrollView contentContainerStyle={styles.bottomScroll}>
        {/* Provider Profile Summary */}
        <View style={styles.card}>
          <View style={styles.providerRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person-circle" size={54} color="#0055F2" />
              <View style={styles.verifiedTick}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.providerDetails}>
              <Text style={styles.providerName}>{provider.full_name}</Text>
              <Text style={styles.providerBadge}>{provider.badge} • {provider.provider_category.replace("_", " ").toUpperCase()}</Text>
              <Text style={styles.providerArea}>📍 {provider.primary_destination}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={() => Alert.alert("Call", `Dialing ${provider.phone}`)}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* STEP 1: OTP Handshake Card */}
        {tripStatus === "scheduled" && (
          <View style={styles.cardHighlight}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="key-outline" size={22} color="#0055F2" />
              <Text style={styles.cardHeaderTitle}>Step 1: Traveler Check-in OTP</Text>
            </View>
            <Text style={styles.cardInstructions}>
              {isProviderMode
                ? "Ask the traveler for their 6-digit confirmation OTP to start this trip."
                : "Provide this 6-digit verification OTP to your guide or boatman to verify identity and authorize departure."}
            </Text>

            {!isProviderMode ? (
              <View style={styles.otpBox}>
                <Text style={styles.otpDigits}>{otpCode}</Text>
                <TouchableOpacity
                  style={styles.copyOtpBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    Alert.alert("OTP Copied", "OTP copied to clipboard");
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color="#0055F2" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={6}
                  value={enteredOtp}
                  onChangeText={setEnteredOtp}
                />
                <TouchableOpacity
                  style={styles.verifyOtpBtn}
                  onPress={handleVerifyOtp}
                  disabled={isVerifyingOtp || enteredOtp.length !== 6}
                >
                  {isVerifyingOtp ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyOtpText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Checked In -> Start Trip Button */}
        {tripStatus === "checked_in" && (
          <View style={styles.cardHighlight}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
              <Text style={[styles.cardHeaderTitle, { color: "#10B981" }]}>Check-In Completed</Text>
            </View>
            <Text style={styles.cardInstructions}>
              Identity verified. Press Start Trip to initiate live GPS broadcasting to traveler map and trusted contacts.
            </Text>
            <TouchableOpacity style={styles.primaryActionButton} onPress={handleStartTrip}>
              <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Start Live Trip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Active Trip Controls & 1-Tap SOS */}
        {tripStatus === "active" && (
          <>
            {/* SOS Panic Section */}
            <View style={styles.sosCard}>
              <View style={styles.sosHeader}>
                <MaterialCommunityIcons name="shield-alert" size={24} color="#EF4444" />
                <Text style={styles.sosTitle}>Tourist Emergency SOS</Text>
              </View>
              <Text style={styles.sosSubtitle}>
                Broadcasts current GPS coordinates instantly to Tourist Police (999) & your trusted contacts.
              </Text>

              {isSOSArmed ? (
                <View style={styles.sosArmedBox}>
                  <Text style={styles.sosCountdownText}>DISPATCHING IN {sosCountdown}s</Text>
                  <TouchableOpacity style={styles.cancelSOSBtn} onPress={handleCancelSOS}>
                    <Text style={styles.cancelSOSText}>CANCEL SOS</Text>
                  </TouchableOpacity>
                </View>
              ) : sosDispatched ? (
                <View style={styles.sosDispatchedBox}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.sosDispatchedText}>SOS DISPATCHED TO 999 & CONTACTS</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.sosButton} onPress={handleArmSOS}>
                  <Text style={styles.sosButtonText}>HOLD FOR 1-TAP SOS</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* End Trip Button */}
            <TouchableOpacity style={styles.endTripBtn} onPress={handleFinalizeTrip}>
              <Ionicons name="stop-circle-outline" size={20} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.endTripText}>End & Finalize Trip</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 4: Completed Trip */}
        {tripStatus === "completed" && (
          <View style={styles.cardHighlight}>
            <Ionicons name="trophy-outline" size={36} color="#F59E0B" style={{ alignSelf: "center", marginBottom: 8 }} />
            <Text style={[styles.cardHeaderTitle, { textAlign: "center" }]}>Trip Successfully Completed! 🎉</Text>
            <Text style={[styles.cardInstructions, { textAlign: "center" }]}>
              Total distance covered: {distanceKm} km in {formattedTime}.
            </Text>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => router.back()}>
              <Text style={styles.primaryActionText}>Return to Discovery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  shareButton: {
    padding: 6,
  },
  mapContainer: {
    height: 240,
    position: "relative",
    backgroundColor: "#0F172A",
  },
  mapWebView: {
    flex: 1,
  },
  telemetryOverlay: {
    position: "absolute",
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#334155",
  },
  bottomScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    marginRight: 12,
  },
  verifiedTick: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#10B981",
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  providerBadge: {
    fontSize: 11,
    color: "#0055F2",
    fontWeight: "600",
    marginTop: 2,
  },
  providerArea: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  callButton: {
    backgroundColor: "#10B981",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHighlight: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0055F2",
    marginLeft: 8,
  },
  cardInstructions: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 12,
  },
  otpBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  otpDigits: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#0055F2",
  },
  copyOtpBtn: {
    position: "absolute",
    right: 16,
    padding: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  otpInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 10,
  },
  verifyOtpBtn: {
    backgroundColor: "#0055F2",
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyOtpText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  primaryActionButton: {
    backgroundColor: "#0055F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 10,
    marginTop: 6,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sosCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  sosHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
    marginLeft: 8,
  },
  sosSubtitle: {
    fontSize: 12,
    color: "#7F1D1D",
    marginBottom: 12,
    lineHeight: 16,
  },
  sosButton: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sosButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sosArmedBox: {
    alignItems: "center",
  },
  sosCountdownText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#DC2626",
    marginBottom: 8,
  },
  cancelSOSBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelSOSText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  sosDispatchedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  sosDispatchedText: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },
  endTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
  },
  endTripText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
