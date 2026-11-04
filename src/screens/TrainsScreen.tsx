import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { AiPill, BottomNav } from "./Navigation";
import { searchRepository } from "../services/repositories/search";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const BD_GREEN = "#006A4E";
const BD_RED = "#F42A41";
const ACCENT_GOLD = "#F59E0B";

const BD_RAILWAY_BASE_URL = "https://eticket.railway.gov.bd/";
const BD_RAILWAY_LOGIN_URL = "https://eticket.railway.gov.bd/login";
const SESSION_STORAGE_KEY = "@bd_railway_session_backup_v2";
const CREDS_STORAGE_KEY = "bd_railway_creds_v2";

// ============================================================================
// Types & Bangladesh Railway Catalog
// ============================================================================

export interface BDStation {
  code: string;
  name: string;
  city: string;
  division: string;
  isPopular?: boolean;
}

export interface BDTrain {
  id: string;
  train_number: string;
  name: string;
  route: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  base_price: number;
  classes: string[];
  days_off: string;
  image: string;
}

export const BD_STATIONS: BDStation[] = [
  { code: "DA", name: "Dhaka (Kamalapur)", city: "Dhaka", division: "Dhaka", isPopular: true },
  { code: "DA-AIR", name: "Dhaka Airport", city: "Dhaka", division: "Dhaka", isPopular: true },
  { code: "CTG", name: "Chattogram", city: "Chattogram", division: "Chattogram", isPopular: true },
  { code: "CXB", name: "Cox's Bazar (Oyster Iconic)", city: "Cox's Bazar", division: "Chattogram", isPopular: true },
  { code: "SYL", name: "Sylhet", city: "Sylhet", division: "Sylhet", isPopular: true },
  { code: "RAJ", name: "Rajshahi", city: "Rajshahi", division: "Rajshahi", isPopular: true },
  { code: "KHL", name: "Khulna", city: "Khulna", division: "Khulna", isPopular: true },
  { code: "RNG", name: "Rangpur", city: "Rangpur", division: "Rangpur", isPopular: true },
  { code: "BOG", name: "Bogura", city: "Bogura", division: "Rajshahi", isPopular: false },
  { code: "CUM", name: "Cumilla", city: "Cumilla", division: "Chattogram", isPopular: false },
  { code: "MYM", name: "Mymensingh", city: "Mymensingh", division: "Mymensingh", isPopular: false },
  { code: "JES", name: "Jashore", city: "Jashore", division: "Khulna", isPopular: false },
  { code: "DIN", name: "Dinajpur", city: "Dinajpur", division: "Rangpur", isPopular: false },
  { code: "SAN", name: "Santahar", city: "Santahar", division: "Rajshahi", isPopular: false },
  { code: "PAN", name: "Panchagarh", city: "Panchagarh", division: "Rangpur", isPopular: false },
  { code: "BEN", name: "Benapole", city: "Benapole", division: "Khulna", isPopular: false },
];

export const BD_CABIN_CLASSES = [
  { id: "SNIGDHA", label: "Snigdha (AC Chair)", code: "AC_S", badge: "Most Popular" },
  { id: "S_CHAIR", label: "Shovon Chair", code: "S_CHAIR", badge: "Best Value" },
  { id: "AC_B", label: "AC Berth (Sleeper)", code: "AC_B", badge: "Luxury Sleeper" },
  { id: "F_BERTH", label: "First Class Berth", code: "F_BERTH", badge: "Spacious" },
  { id: "F_SEAT", label: "First Class Seat", code: "F_SEAT", badge: "Comfortable" },
];

export const BD_POPULAR_TRAINS: BDTrain[] = [];

// Injected JavaScript for session synchronization from railway web portal
const SYNC_SESSION_SCRIPT = `
  (function() {
    function syncSession() {
      try {
        var storage = {};
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k) {
            storage[k] = localStorage.getItem(k);
          }
        }
        var sessionPayload = {
          type: 'RAILWAY_SESSION_SYNC',
          cookies: document.cookie || '',
          storage: storage,
          url: window.location.href,
          title: document.title || '',
          timestamp: Date.now()
        };
        window.ReactNativeWebView.postMessage(JSON.stringify(sessionPayload));
      } catch(e) {}
    }

    // Sync on initial load
    syncSession();

    // Listen to changes & interactions (clicks, form submits, page navigations)
    window.addEventListener('load', syncSession);
    document.addEventListener('click', function() {
      setTimeout(syncSession, 1200);
      setTimeout(syncSession, 3000);
    });
    window.addEventListener('popstate', syncSession);
  })();
  true;
`;

export function TrainsScreen() {
  // Screen Tabs
  const [activeTab, setActiveTab] = useState<"BD_Railway" | "HighSpeed_Global">("BD_Railway");

  // Station Selection States
  const [fromStation, setFromStation] = useState<BDStation>(BD_STATIONS[0]); // Dhaka Kamalapur
  const [toStation, setToStation] = useState<BDStation>(BD_STATIONS[3]); // Cox's Bazar
  const [journeyDate, setJourneyDate] = useState("Tomorrow, Oct 17");
  const [selectedClass, setSelectedClass] = useState(BD_CABIN_CLASSES[0]);
  const [passengersCount, setPassengersCount] = useState(1);

  // Modals & Selector States
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationModalMode, setStationModalMode] = useState<"from" | "to">("from");
  const [stationSearchQuery, setStationSearchQuery] = useState("");
  const [showClassModal, setShowClassModal] = useState(false);

  // In-App WebView States
  const [isWebViewOpen, setIsWebViewOpen] = useState(false);
  const [currentWebUrl, setCurrentWebUrl] = useState(BD_RAILWAY_BASE_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [webProgress, setWebProgress] = useState(0);

  // Session Persistence States
  const [savedSessionData, setSavedSessionData] = useState<{
    cookies?: string;
    storage?: Record<string, string>;
    lastSynced?: number;
  } | null>(null);
  const [savedCreds, setSavedCreds] = useState<{ phone?: string; pin?: string } | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [inputPin, setInputPin] = useState("");

  const [trainsList, setTrainsList] = useState<BDTrain[]>([]);
  const [trainsLoading, setTrainsLoading] = useState(true);

  const fetchLiveTrains = async () => {
    setTrainsLoading(true);
    try {
      const data = await searchRepository.searchTrains({});
      if (data && data.length > 0) {
        setTrainsList(
          data.map((t: any) => ({
            id: t.id,
            train_number: t.train_number || "EXP",
            name: t.train_name || "Express Train",
            route: `${t.departure_city} ➔ ${t.arrival_city}`,
            departure_city: t.departure_city || "Dhaka",
            arrival_city: t.arrival_city || "Chittagong",
            departure_time: t.departure_time
              ? new Date(t.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "08:00 AM",
            arrival_time: t.arrival_time
              ? new Date(t.arrival_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "12:00 PM",
            duration: t.duration_text || "4h 00m",
            base_price: t.base_price || 0,
            classes: Array.isArray(t.classes) ? t.classes : ["Second Class", "First Class"],
            days_off: "None",
            image: "https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?w=600",
          }))
        );
      } else {
        setTrainsList([]);
      }
    } catch (err) {
      console.log("Error loading trains from Supabase:", err);
      setTrainsList([]);
    } finally {
      setTrainsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTrains();
  }, []);

  const webViewRef = useRef<WebView>(null);

  // 1. Load Stored Session from AsyncStorage & Credentials from SecureStore on Mount
  useEffect(() => {
    async function loadStoredRailwaySession() {
      try {
        const rawSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          setSavedSessionData(parsed);
        }

        const rawCreds = await SecureStore.getItemAsync(CREDS_STORAGE_KEY);
        if (rawCreds) {
          const parsedCreds = JSON.parse(rawCreds);
          setSavedCreds(parsedCreds);
          if (parsedCreds.phone) setInputPhone(parsedCreds.phone);
        }
      } catch (err) {
        console.log("Error loading stored railway session:", err);
      }
    }
    loadStoredRailwaySession();
  }, []);

  // 2. Pre-load Script to Restore Cookies & LocalStorage into WebView
  const injectedRestoreScript = useMemo(() => {
    if (!savedSessionData) return "true;";

    const storageJson = JSON.stringify(savedSessionData.storage || {});
    const cookiesStr = savedSessionData.cookies || "";

    return `
      (function() {
        try {
          // Restore localStorage keys
          var s = ${storageJson};
          for (var key in s) {
            if (s.hasOwnProperty(key)) {
              localStorage.setItem(key, s[key]);
            }
          }
          // Restore cookies
          var cStr = ${JSON.stringify(cookiesStr)};
          if (cStr) {
            var parts = cStr.split(';');
            for (var i = 0; i < parts.length; i++) {
              var c = parts[i].trim();
              if (c) {
                document.cookie = c + '; path=/; domain=.railway.gov.bd';
              }
            }
          }
        } catch(e) {}
      })();
      true;
    `;
  }, [savedSessionData]);

  // 3. Handle messages from WebView (Sync Session Data)
  const handleWebViewMessage = async (event: any) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === "RAILWAY_SESSION_SYNC") {
        const hasCookies = payload.cookies && payload.cookies.length > 5;
        const hasStorage = payload.storage && Object.keys(payload.storage).length > 0;

        if (hasCookies || hasStorage) {
          const newSession = {
            cookies: payload.cookies || savedSessionData?.cookies || "",
            storage: {
              ...(savedSessionData?.storage || {}),
              ...(payload.storage || {}),
            },
            lastSynced: Date.now(),
          };
          setSavedSessionData(newSession);
          await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
        }
      }
    } catch (err) {
      // Non-JSON message, ignore
    }
  };

  // 4. Save Credentials to SecureStore
  const handleSaveCredentials = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = { phone: inputPhone.trim(), pin: inputPin };
    setSavedCreds(data);
    await SecureStore.setItemAsync(CREDS_STORAGE_KEY, JSON.stringify(data));
    setShowCredsModal(false);
  };

  // 5. Clear Railway Session
  const handleClearSession = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    setSavedSessionData(null);
    if (webViewRef.current) {
      webViewRef.current.clearCache?.(true);
      webViewRef.current.reload();
    }
  };

  // 6. Autofill Credentials in WebView
  const handleAutofillInWebView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!savedCreds?.phone) {
      setShowCredsModal(true);
      return;
    }

    const autofillJS = `
      (function() {
        try {
          var phoneInput = document.querySelector('input[type="tel"]') ||
                           document.querySelector('input[name="mobile_number"]') ||
                           document.querySelector('input[name="phone"]') ||
                           document.querySelector('input[placeholder*="mobile" i]') ||
                           document.querySelector('input[placeholder*="phone" i]');
          var passInput = document.querySelector('input[type="password"]');

          if (phoneInput && "${savedCreds.phone}") {
            phoneInput.value = "${savedCreds.phone}";
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
            phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (passInput && "${savedCreds.pin || ""}") {
            passInput.value = "${savedCreds.pin || ""}";
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch(e) {}
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(autofillJS);
  };

  // Station Modal & Swap Handlers
  const openStationSelector = (mode: "from" | "to") => {
    Haptics.selectionAsync();
    setStationModalMode(mode);
    setStationSearchQuery("");
    setShowStationModal(true);
  };

  const handleSelectStation = (station: BDStation) => {
    Haptics.selectionAsync();
    if (stationModalMode === "from") {
      setFromStation(station);
      if (station.code === toStation.code) {
        const alt = BD_STATIONS.find((s) => s.code !== station.code) || BD_STATIONS[1];
        setToStation(alt);
      }
    } else {
      setToStation(station);
      if (station.code === fromStation.code) {
        const alt = BD_STATIONS.find((s) => s.code !== station.code) || BD_STATIONS[0];
        setFromStation(alt);
      }
    }
    setShowStationModal(false);
  };

  const handleSwapStations = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  // Launch In-App WebView with Route or Homepage
  const launchRailwayWebView = (targetUrl?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = targetUrl || BD_RAILWAY_BASE_URL;
    setCurrentWebUrl(url);
    setIsWebViewOpen(true);
  };

  // Launch Search in WebView
  const handleSearchOnRailwayPortal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Bangladesh Railway e-ticket route query
    const searchUrl = `${BD_RAILWAY_BASE_URL}booking/train/search?fromcity=${encodeURIComponent(
      fromStation.city
    )}&tocity=${encodeURIComponent(toStation.city)}&class=${encodeURIComponent(
      selectedClass.code
    )}`;
    launchRailwayWebView(searchUrl);
  };

  // Filtered Stations for Search
  const filteredStations = useMemo(() => {
    const q = stationSearchQuery.trim().toLowerCase();
    if (!q) return BD_STATIONS;
    return BD_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.division.toLowerCase().includes(q)
    );
  }, [stationSearchQuery]);

  return (
    <SafeAreaView style={styles.shell}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?w=1200",
            }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(0,106,78,0.88)", "rgba(0,40,30,0.65)", "rgba(245,247,250,1)"]}
            style={styles.heroOverlay}
          >
            {/* Top Bar inside hero */}
            <View style={styles.topBarRow}>
              <Pressable
                style={styles.backCircleBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.canGoBack() ? router.back() : router.replace("/");
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>

              <View style={styles.bdBadgeRow}>
                <View style={styles.bdRedFlagCircle} />
                <Text style={styles.bdBadgeText}>BANGLADESH RAILWAY</Text>
              </View>

              <Pressable
                style={styles.goldBadge}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push("/screens/rewards" as any);
                }}
              >
                <Text style={styles.goldBadgeText}>T</Text>
              </Pressable>
            </View>

            {/* Title & E-ticketing subtitle */}
            <View style={styles.heroTitleBox}>
              <Text style={styles.heroTitle}>
                Railway E-Ticketing<Text style={{ color: "#FACC15" }}>.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Official portal integration with auto-login & permanent session storage
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Elevated Booking & Station Card */}
        <View style={styles.searchCardWrapper}>
          {/* Session Persistence Status Banner */}
          <View style={styles.sessionStatusBanner}>
            <View style={styles.sessionIndicatorRow}>
              <View style={[styles.pulseDot, savedSessionData ? styles.pulseDotActive : styles.pulseDotIdle]} />
              <Text style={styles.sessionStatusTitle}>
                {savedSessionData ? "BD Railway Session Preserved" : "Session Auto-Saving Active"}
              </Text>
            </View>
            <Pressable
              style={styles.saveCredsBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowCredsModal(true);
              }}
            >
              <Ionicons name="key-outline" size={13} color={BD_GREEN} />
              <Text style={styles.saveCredsBtnText}>
                {savedCreds?.phone ? "Autofill Configured" : "Remember Account"}
              </Text>
            </Pressable>
          </View>

          {/* Form Content */}
          <View style={styles.formContent}>
            {/* From & To Station Selection Box */}
            <View style={styles.stationsBox}>
              {/* Departure Station */}
              <Pressable style={styles.stationRow} onPress={() => openStationSelector("from")}>
                <View style={styles.stationIconCircle}>
                  <Ionicons name="radio-button-on" size={16} color={BD_GREEN} />
                </View>
                <View style={styles.stationTextCol}>
                  <Text style={styles.fieldLabelText}>From Station</Text>
                  <View style={styles.stationTitleRow}>
                    <Text style={styles.stationCityName}>{fromStation.city}</Text>
                    <View style={styles.stationCodeBadge}>
                      <Text style={styles.stationCodeText}>{fromStation.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.stationFullName} numberOfLines={1}>
                    {fromStation.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              {/* Station Swap Divider */}
              <View style={styles.stationDividerRow}>
                <View style={styles.stationDividerLine} />
                <Pressable style={styles.swapBtn} onPress={handleSwapStations}>
                  <Ionicons name="swap-vertical" size={18} color={BD_GREEN} />
                </Pressable>
                <View style={styles.stationDividerLine} />
              </View>

              {/* Destination Station */}
              <Pressable style={styles.stationRow} onPress={() => openStationSelector("to")}>
                <View style={[styles.stationIconCircle, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="location" size={16} color={BD_RED} />
                </View>
                <View style={styles.stationTextCol}>
                  <Text style={styles.fieldLabelText}>To Station</Text>
                  <View style={styles.stationTitleRow}>
                    <Text style={styles.stationCityName}>{toStation.city}</Text>
                    <View style={[styles.stationCodeBadge, { backgroundColor: "#FEF2F2" }]}>
                      <Text style={[styles.stationCodeText, { color: BD_RED }]}>{toStation.code}</Text>
                    </View>
                  </View>
                  <Text style={styles.stationFullName} numberOfLines={1}>
                    {toStation.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* Date & Class Grid */}
            <View style={styles.dateClassRow}>
              {/* Journey Date Selector */}
              <Pressable
                style={styles.dateBox}
                onPress={() => {
                  Haptics.selectionAsync();
                  setJourneyDate((prev) => (prev.includes("17") ? "Sun, Oct 19" : "Tomorrow, Oct 17"));
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={BD_GREEN} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.fieldLabelText}>Date of Journey</Text>
                  <Text style={styles.dateValueText}>{journeyDate}</Text>
                </View>
              </Pressable>

              <View style={styles.vLine} />

              {/* Cabin Class Selector */}
              <Pressable style={styles.classBox} onPress={() => setShowClassModal(true)}>
                <Ionicons name="ribbon-outline" size={18} color={ACCENT_GOLD} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.fieldLabelText}>Class</Text>
                  <Text style={styles.classValueText} numberOfLines={1}>
                    {selectedClass.label.split("(")[0]}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* Primary Action Button: Open BD Railway Portal */}
            <Pressable style={styles.searchButton} onPress={handleSearchOnRailwayPortal}>
              <View style={styles.btnInnerRow}>
                <Ionicons name="globe-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.searchButtonText}>Book on BD Railway (e-Ticket)</Text>
              </View>
            </Pressable>

            {/* Direct Web Portal Link */}
            <Pressable
              style={styles.openDirectLinkRow}
              onPress={() => launchRailwayWebView(BD_RAILWAY_BASE_URL)}
            >
              <Text style={styles.openDirectLinkText}>Open Official e-Ticket Web App Directly</Text>
              <Ionicons name="open-outline" size={14} color={BD_GREEN} />
            </Pressable>
          </View>
        </View>

        {/* Benefits Badges */}
        <View style={styles.perksRow}>
          {[
            { icon: "shield-checkmark-outline" as const, text: "Permanent Session" },
            { icon: "qr-code-outline" as const, text: "Instant E-Ticket" },
            { icon: "finger-print-outline" as const, text: "Biometric Auto-Fill" },
            { icon: "card-outline" as const, text: "bKash / Nagad Ready" },
          ].map((perk, i) => (
            <View key={i} style={styles.perkItem}>
              <Ionicons name={perk.icon} size={18} color={BD_GREEN} />
              <Text style={styles.perkText}>{perk.text}</Text>
            </View>
          ))}
        </View>

        {/* Live Train Routes */}
        <View style={styles.routesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Intercity Express Trains</Text>
            <Text style={styles.sectionCountText}>{trainsList.length} Available</Text>
          </View>

          <View style={styles.routesStack}>
            {trainsLoading ? (
              <View style={styles.trainLoadingBox}>
                <ActivityIndicator size="small" color={BD_GREEN} />
                <Text style={styles.trainLoadingText}>Loading live railway schedules...</Text>
              </View>
            ) : trainsList.length === 0 ? (
              <View style={styles.trainEmptyContainer}>
                <Ionicons name="train-outline" size={44} color="#94A3B8" />
                <Text style={styles.trainEmptyTitle}>No trains currently scheduled</Text>
                <Text style={styles.trainEmptySubtitle}>
                  There are no scheduled trains available right now. You can book direct tickets on the Bangladesh Railway portal.
                </Text>
                <Pressable
                  style={styles.trainEmptyActionBtn}
                  onPress={fetchLiveTrains}
                >
                  <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.trainEmptyActionText}>Refresh Schedules</Text>
                </Pressable>
              </View>
            ) : (
              trainsList.map((train) => (
                <Pressable
                  key={train.id}
                  style={styles.trainCard}
                  onPress={() => {
                    const searchUrl = `${BD_RAILWAY_BASE_URL}booking/train/search?fromcity=${encodeURIComponent(
                      train.departure_city
                    )}&tocity=${encodeURIComponent(train.arrival_city)}`;
                    launchRailwayWebView(searchUrl);
                  }}
                >
                  <Image source={{ uri: train.image }} style={styles.trainCardImage} />
                  <View style={styles.trainCardBody}>
                    <View style={styles.trainHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.trainName}>{train.name}</Text>
                        <Text style={styles.trainNumberBadge}>No: {train.train_number}</Text>
                      </View>
                      <View style={styles.priceCol}>
                        <Text style={styles.trainPrice}>৳{train.base_price}</Text>
                        <Text style={styles.pricePerPerson}>fare from</Text>
                      </View>
                    </View>

                    {/* Route & Times */}
                    <View style={styles.trainScheduleRow}>
                      <View>
                        <Text style={styles.timeText}>{train.departure_time}</Text>
                        <Text style={styles.cityText}>{train.departure_city}</Text>
                      </View>
                      <View style={styles.durationCol}>
                        <Text style={styles.durationLabel}>{train.duration}</Text>
                        <View style={styles.durationLineWrap}>
                          <View style={styles.lineDot} />
                          <View style={styles.trackLine} />
                          <Ionicons name="train" size={14} color={BD_GREEN} />
                          <View style={styles.trackLine} />
                          <View style={styles.lineDot} />
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.timeText}>{train.arrival_time}</Text>
                        <Text style={styles.cityText}>{train.arrival_city}</Text>
                      </View>
                    </View>

                    <View style={styles.trainCardFooter}>
                      <View style={styles.classesPillRow}>
                        {train.classes.map((cls, idx) => (
                          <View key={idx} style={styles.classPill}>
                            <Text style={styles.classPillText}>{cls}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.bookTicketBtn}>
                        <Text style={styles.bookTicketText}>Book Ticket</Text>
                        <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating AI Pill & Bottom Navigation */}
      <AiPill color={BD_GREEN} />
      <BottomNav active="Home" color={BD_GREEN} />

      {/* =========================================================================
          IN-APP WEBVIEW MODAL (Bangladesh Railway E-Ticketing System)
         ========================================================================= */}
      <Modal
        visible={isWebViewOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsWebViewOpen(false)}
      >
        <SafeAreaView style={styles.webViewModalShell}>
          {/* Browser Navigation Toolbar */}
          <View style={styles.browserToolbar}>
            <View style={styles.toolbarLeft}>
              <Pressable
                style={styles.toolbarIconBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setIsWebViewOpen(false);
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </Pressable>

              <Pressable
                style={[styles.toolbarNavBtn, !canGoBack && styles.toolbarBtnDisabled]}
                disabled={!canGoBack}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  webViewRef.current?.goBack();
                }}
              >
                <Ionicons name="chevron-back" size={20} color={canGoBack ? "#1F2937" : "#CBD5E1"} />
              </Pressable>

              <Pressable
                style={[styles.toolbarNavBtn, !canGoForward && styles.toolbarBtnDisabled]}
                disabled={!canGoForward}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  webViewRef.current?.goForward();
                }}
              >
                <Ionicons name="chevron-forward" size={20} color={canGoForward ? "#1F2937" : "#CBD5E1"} />
              </Pressable>

              <Pressable
                style={styles.toolbarNavBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  webViewRef.current?.reload();
                }}
              >
                <Ionicons name="reload" size={18} color="#1F2937" />
              </Pressable>
            </View>

            {/* URL & Session Indicator */}
            <View style={styles.urlContainer}>
              <Ionicons name="lock-closed" size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.urlText} numberOfLines={1}>
                eticket.railway.gov.bd
              </Text>
            </View>

            {/* Right Action Icons */}
            <View style={styles.toolbarRight}>
              {/* Quick Autofill Action */}
              <Pressable
                style={styles.autofillToolBtn}
                onPress={handleAutofillInWebView}
              >
                <Ionicons name="key" size={16} color={BD_GREEN} />
              </Pressable>

              {/* External Browser */}
              <Pressable
                style={styles.toolbarIconBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  Linking.openURL(currentWebUrl);
                }}
              >
                <Ionicons name="open-outline" size={20} color="#1F2937" />
              </Pressable>
            </View>
          </View>

          {/* Session Sync Notification Strip */}
          <View style={styles.sessionSyncStrip}>
            <View style={styles.syncLeftCol}>
              <View style={styles.activeDotSmall} />
              <Text style={styles.syncStatusText}>
                {savedSessionData?.lastSynced
                  ? `Session Saved (${new Date(savedSessionData.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : "Auto-saving login cookies & local storage"}
              </Text>
            </View>
            <Pressable style={styles.clearSessionPill} onPress={handleClearSession}>
              <Text style={styles.clearSessionPillText}>Reset Session</Text>
            </Pressable>
          </View>

          {/* Web Loading Progress Indicator */}
          {webLoading && (
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${Math.max(webProgress * 100, 15)}%` }]} />
            </View>
          )}

          {/* The Persistent React Native WebView */}
          <WebView
            ref={webViewRef}
            source={{ uri: currentWebUrl }}
            // Critical props for session persistence & cookie synchronization:
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            cacheEnabled={true}
            incognito={false}
            saveFormDataDisabled={false}
            // Injections:
            injectedJavaScriptBeforeContentLoaded={injectedRestoreScript}
            injectedJavaScript={SYNC_SESSION_SCRIPT}
            onMessage={handleWebViewMessage}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
              setCanGoForward(navState.canGoForward);
              setCurrentWebUrl(navState.url);
            }}
            onLoadStart={() => {
              setWebLoading(true);
              setWebProgress(0.2);
            }}
            onLoadProgress={({ nativeEvent }) => setWebProgress(nativeEvent.progress)}
            onLoadEnd={() => {
              setWebLoading(false);
              setWebProgress(1);
            }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webLoadingOverlay}>
                <ActivityIndicator size="large" color={BD_GREEN} />
                <Text style={styles.webLoadingText}>Connecting to Bangladesh Railway...</Text>
              </View>
            )}
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          STATION SELECTOR MODAL
         ========================================================================= */}
      <Modal
        visible={showStationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowStationModal(false)}
      >
        <SafeAreaView style={styles.modalShell}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setShowStationModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </Pressable>
            <Text style={styles.modalTitle}>
              Select {stationModalMode === "from" ? "Departure" : "Arrival"} Station
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Box */}
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search station (Dhaka, CTG, Cox's Bazar...)"
              placeholderTextColor="#9CA3AF"
              value={stationSearchQuery}
              onChangeText={setStationSearchQuery}
              autoCapitalize="words"
            />
            {stationSearchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStationSearchQuery("");
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Quick Major Station Chips */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsSectionLabel}>Major Railway Hubs:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {["DA", "CTG", "CXB", "SYL", "RAJ", "KHL"].map((code) => {
                const target = BD_STATIONS.find((s) => s.code === code);
                const isSelected =
                  (stationModalMode === "from" ? fromStation.code : toStation.code) === code;
                return (
                  <Pressable
                    key={code}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => {
                      if (target) handleSelectStation(target);
                    }}
                  >
                    <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                      {target?.city || code}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Stations List */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.stationsList}>
            {filteredStations.map((station) => {
              const isSelected =
                (stationModalMode === "from" ? fromStation.code : toStation.code) === station.code;

              return (
                <Pressable
                  key={station.code}
                  style={[styles.stationItemRow, isSelected && styles.stationItemRowActive]}
                  onPress={() => handleSelectStation(station)}
                >
                  <View style={[styles.stationCodeBox, isSelected && styles.stationCodeBoxActive]}>
                    <Text style={[styles.stationCodeItemText, isSelected && styles.stationCodeItemTextActive]}>
                      {station.code}
                    </Text>
                  </View>

                  <View style={styles.stationDetailsCol}>
                    <Text style={styles.stationItemName}>{station.name}</Text>
                    <Text style={styles.stationItemSub}>
                      {station.city}, {station.division} Division
                    </Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={BD_GREEN} style={{ marginLeft: 8 }} />
                  )}
                </Pressable>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* =========================================================================
          CABIN CLASS SELECTOR MODAL
         ========================================================================= */}
      <Modal
        visible={showClassModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClassModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowClassModal(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Seat Class</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowClassModal(false);
                }}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <View style={styles.classList}>
              {BD_CABIN_CLASSES.map((cls) => {
                const isSelected = selectedClass.id === cls.id;
                return (
                  <Pressable
                    key={cls.id}
                    style={[styles.classItemCard, isSelected && styles.classItemCardActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedClass(cls);
                      setShowClassModal(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.classItemTitle, isSelected && styles.classItemTitleActive]}>
                        {cls.label}
                      </Text>
                      <Text style={styles.classItemCode}>Code: {cls.code}</Text>
                    </View>
                    <View style={[styles.classItemBadge, isSelected && styles.classItemBadgeActive]}>
                      <Text style={[styles.classItemBadgeText, isSelected && styles.classItemBadgeTextActive]}>
                        {cls.badge}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          CREDENTIALS AUTOFILL CONFIGURATION MODAL
         ========================================================================= */}
      <Modal
        visible={showCredsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCredsModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowCredsModal(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Remember Railway Account</Text>
            <Text style={styles.sheetSubtitle}>
              Save your registered mobile number and password securely in your device's keychain for 1-tap autofill.
            </Text>

            <View style={styles.credsInputWrap}>
              <Text style={styles.fieldLabelText}>Registered Mobile Number</Text>
              <TextInput
                style={styles.credsInput}
                placeholder="01XXXXXXXXX"
                placeholderTextColor="#9CA3AF"
                value={inputPhone}
                onChangeText={setInputPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.credsInputWrap}>
              <Text style={styles.fieldLabelText}>Password / PIN</Text>
              <TextInput
                style={styles.credsInput}
                placeholder="Enter railway password"
                placeholderTextColor="#9CA3AF"
                value={inputPin}
                onChangeText={setInputPin}
                secureTextEntry={true}
              />
            </View>

            <Pressable style={styles.saveCredsSubmitBtn} onPress={handleSaveCredentials}>
              <Text style={styles.saveCredsSubmitText}>Save for Auto-Fill</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Stylesheet
// ============================================================================

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: 220,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bdBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  bdRedFlagCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BD_RED,
  },
  bdBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  goldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  goldBadgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  heroTitleBox: {
    marginTop: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#E2E8F0",
    marginTop: 4,
    lineHeight: 16,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  searchCardWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -38,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sessionStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  sessionIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseDotActive: {
    backgroundColor: "#10B981",
  },
  pulseDotIdle: {
    backgroundColor: "#F59E0B",
  },
  sessionStatusTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },
  saveCredsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveCredsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: BD_GREEN,
  },
  formContent: {},
  stationsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 12,
  },
  stationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  stationIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stationTextCol: {
    flex: 1,
  },
  fieldLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  stationCityName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  stationCodeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stationCodeText: {
    fontSize: 10,
    fontWeight: "800",
    color: BD_GREEN,
  },
  stationFullName: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  stationDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  stationDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dateClassRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginTop: 10,
  },
  dateBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dateValueText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  vLine: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 10,
  },
  classBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  classValueText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  searchButton: {
    backgroundColor: BD_GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: BD_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnInnerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  openDirectLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingVertical: 4,
  },
  openDirectLinkText: {
    fontSize: 12,
    color: BD_GREEN,
    fontWeight: "700",
  },
  perksRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  perkItem: {
    alignItems: "center",
    gap: 4,
  },
  perkText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },
  routesSection: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sectionCountText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  routesStack: {
    gap: 14,
  },
  trainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  trainCardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
  },
  trainCardBody: {
    padding: 14,
  },
  trainHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  trainName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  trainNumberBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 2,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  trainPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: BD_GREEN,
  },
  pricePerPerson: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  trainScheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 10,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F2937",
  },
  cityText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  durationCol: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 10,
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  durationLineWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  lineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BD_GREEN,
  },
  trackLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 2,
  },
  trainCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classesPillRow: {
    flexDirection: "row",
    gap: 6,
  },
  classPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: BD_GREEN,
  },
  bookTicketBtn: {
    backgroundColor: BD_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  bookTicketText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // WebView Modal Styles
  webViewModalShell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  browserToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toolbarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarBtnDisabled: {
    opacity: 0.35,
  },
  urlContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  urlText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  toolbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  autofillToolBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionSyncStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#DCFCE7",
  },
  syncLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  clearSessionPill: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clearSessionPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: BD_RED,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: "#E2E8F0",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: BD_GREEN,
  },
  webLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  webLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },

  // Station Modal Styles
  modalShell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  chipsSection: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chipsSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  chipBtn: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipBtnActive: {
    backgroundColor: BD_GREEN,
  },
  chipBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },
  chipBtnTextActive: {
    color: "#FFFFFF",
  },
  stationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stationItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stationItemRowActive: {
    backgroundColor: "#ECFDF5",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  stationCodeBox: {
    width: 50,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stationCodeBoxActive: {
    backgroundColor: BD_GREEN,
  },
  stationCodeItemText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
  },
  stationCodeItemTextActive: {
    color: "#FFFFFF",
  },
  stationDetailsCol: {
    flex: 1,
  },
  stationItemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  stationItemSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Sheet Modal Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  classList: {
    gap: 10,
  },
  classItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  classItemCardActive: {
    borderColor: BD_GREEN,
    backgroundColor: "#ECFDF5",
  },
  classItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937",
  },
  classItemTitleActive: {
    color: BD_GREEN,
  },
  classItemCode: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  classItemBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classItemBadgeActive: {
    backgroundColor: "#A7F3D0",
  },
  classItemBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  classItemBadgeTextActive: {
    color: "#065F46",
  },
  credsInputWrap: {
    marginBottom: 12,
  },
  credsInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  saveCredsSubmitBtn: {
    backgroundColor: BD_GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveCredsSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  trainLoadingBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  trainLoadingText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
    marginTop: 10,
  },
  trainEmptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  trainEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  trainEmptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  trainEmptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BD_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  trainEmptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
