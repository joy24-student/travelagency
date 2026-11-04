import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";
import { userRepository } from "../services/repositories/user";

// Storage Key
const SETTINGS_STORAGE_KEY = "@user_app_settings_v1";

// Localization Datasets
interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

interface CountryOption {
  name: string;
  region: string;
  flag: string;
}

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English (US)" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "简体中文" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

const COUNTRIES: CountryOption[] = [
  { name: "United States", region: "Americas", flag: "🇺🇸" },
  { name: "Bangladesh", region: "Asia", flag: "🇧🇩" },
  { name: "United Kingdom", region: "Europe", flag: "🇬🇧" },
  { name: "Canada", region: "Americas", flag: "🇨🇦" },
  { name: "Australia", region: "Oceania", flag: "🇦🇺" },
  { name: "Singapore", region: "Asia", flag: "🇸🇬" },
  { name: "Malaysia", region: "Asia", flag: "🇲🇾" },
  { name: "United Arab Emirates", region: "Middle East", flag: "🇦🇪" },
  { name: "Japan", region: "Asia", flag: "🇯🇵" },
  { name: "Germany", region: "Europe", flag: "🇩🇪" },
  { name: "France", region: "Europe", flag: "🇫🇷" },
  { name: "Saudi Arabia", region: "Middle East", flag: "🇸🇦" },
  { name: "India", region: "Asia", flag: "🇮🇳" },
  { name: "Switzerland", region: "Europe", flag: "🇨🇭" },
  { name: "Thailand", region: "Asia", flag: "🇹🇭" },
];

const CURRENCIES: CurrencyOption[] = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "AU$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
];

const UNITS = ["Imperial (miles, ft², lb)", "Metric (km, m², kg)"];
const TEMPS = ["Fahrenheit (°F)", "Celsius (°C)"];
const TIME_FORMATS = ["12-hour (am/pm)", "24-hour"];

export function SettingsScreen() {
  const { user, signOut, updatePassword } = useAuth();

  // Settings values
  const [language, setLanguage] = useState<string>("English");
  const [country, setCountry] = useState<string>("United States");
  const [currency, setCurrency] = useState<string>("USD");
  const [units, setUnits] = useState<string>("Imperial (miles, ft², lb)");
  const [tempScale, setTempScale] = useState<string>("Fahrenheit (°F)");
  const [timeFormat, setTimeFormat] = useState<string>("12-hour (am/pm)");
  const [darkTheme, setDarkTheme] = useState<boolean>(false);
  const [targetedAdsOptOut, setTargetedAdsOptOut] = useState<boolean>(true);

  // Notification Granular Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [flightAlerts, setFlightAlerts] = useState<boolean>(true);
  const [dealsPromos, setDealsPromos] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<boolean>(true);
  const [emailDigest, setEmailDigest] = useState<boolean>(true);

  // Accessibility Preferences
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [largeText, setLargeText] = useState<boolean>(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);

  // Cache Management
  const [cacheSize, setCacheSize] = useState<string>("24.8 MB");

  // Search filter inside selection drawer
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [qrTab, setQrTab] = useState<"scan" | "pass">("scan");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showAdsOptOutModal, setShowAdsOptOutModal] = useState<boolean>(false);

  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Dynamic Theme Colors
  const colors = useMemo(() => {
    return {
      bg: darkTheme ? "#0B0F19" : "#FFFFFF",
      card: darkTheme ? "#161F30" : "#FFFFFF",
      headerBg: darkTheme ? "#0B0F19" : "#FFFFFF",
      text: darkTheme ? "#F8FAFC" : "#0F172A",
      subText: darkTheme ? "#94A3B8" : "#64748B",
      border: darkTheme ? "#1E293B" : "#F1F5F9",
      separator: darkTheme ? "#1E293B" : "#F1F5F9",
      itemBg: darkTheme ? "#1E293B" : "#F8FAFC",
      primary: "#2563EB",
      danger: "#EF4444",
      modalBg: darkTheme ? "#161F30" : "#FFFFFF",
      modalOverlay: "rgba(15, 23, 42, 0.65)",
    };
  }, [darkTheme]);

  // Load Saved Settings on Mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // 1. Load from AsyncStorage
        const localSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (localSettings && isMounted) {
          const parsed = JSON.parse(localSettings);
          if (parsed.language) setLanguage(parsed.language);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.currency) setCurrency(parsed.currency);
          if (parsed.units) setUnits(parsed.units);
          if (parsed.tempScale) setTempScale(parsed.tempScale);
          if (parsed.timeFormat) setTimeFormat(parsed.timeFormat);
          if (parsed.darkTheme !== undefined) setDarkTheme(parsed.darkTheme);
          if (parsed.targetedAdsOptOut !== undefined) setTargetedAdsOptOut(parsed.targetedAdsOptOut);
          if (parsed.notificationsEnabled !== undefined) setNotificationsEnabled(parsed.notificationsEnabled);
          if (parsed.flightAlerts !== undefined) setFlightAlerts(parsed.flightAlerts);
          if (parsed.dealsPromos !== undefined) setDealsPromos(parsed.dealsPromos);
          if (parsed.chatMessages !== undefined) setChatMessages(parsed.chatMessages);
          if (parsed.emailDigest !== undefined) setEmailDigest(parsed.emailDigest);
          if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
          if (parsed.largeText !== undefined) setLargeText(parsed.largeText);
          if (parsed.reduceMotion !== undefined) setReduceMotion(parsed.reduceMotion);
          if (parsed.hapticFeedback !== undefined) setHapticFeedback(parsed.hapticFeedback);
        }

        // 2. If user is logged in, sync with Supabase user_settings
        if (user) {
          const remoteSettings = await userRepository.getSettings().catch(() => null);
          if (remoteSettings && isMounted) {
            if (remoteSettings.language) setLanguage(remoteSettings.language);
            if (remoteSettings.currency) setCurrency(remoteSettings.currency);
            if (remoteSettings.darkMode !== undefined) setDarkTheme(remoteSettings.darkMode);
            if (remoteSettings.notifications !== undefined) setNotificationsEnabled(remoteSettings.notifications);
            if (remoteSettings.emailNotifications !== undefined) setEmailDigest(remoteSettings.emailNotifications);
          }
        }

        // Compute simulated dynamic cache size
        const keys = await AsyncStorage.getAllKeys();
        const estimatedBytes = keys.length * 1024 * 128 + 18 * 1024 * 1024;
        const formatted = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
        if (isMounted) setCacheSize(formatted);
      } catch (err) {
        console.warn("Failed to load settings:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Persist settings changes
  const persistSettings = useCallback(
    async (updatedPartial: Record<string, any>) => {
      try {
        const currentData = {
          language,
          country,
          currency,
          units,
          tempScale,
          timeFormat,
          darkTheme,
          targetedAdsOptOut,
          notificationsEnabled,
          flightAlerts,
          dealsPromos,
          chatMessages,
          emailDigest,
          highContrast,
          largeText,
          reduceMotion,
          hapticFeedback,
          ...updatedPartial,
        };
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentData));

        // Sync to Supabase user_settings if authenticated
        if (user) {
          const remotePayload: Record<string, any> = {};
          if (currentData.language !== undefined) remotePayload.language = currentData.language;
          if (currentData.currency !== undefined) remotePayload.currency = currentData.currency;
          if (currentData.darkTheme !== undefined) remotePayload.darkMode = currentData.darkTheme;
          if (currentData.notificationsEnabled !== undefined) remotePayload.notifications = currentData.notificationsEnabled;
          if (currentData.emailDigest !== undefined) remotePayload.emailNotifications = currentData.emailDigest;

          userRepository.saveAllSettings(remotePayload).catch((e) => console.log("Supabase settings sync error:", e));
        }
      } catch (err) {
        console.error("Error saving settings:", err);
      }
    },
    [
      language,
      country,
      currency,
      units,
      tempScale,
      timeFormat,
      darkTheme,
      targetedAdsOptOut,
      notificationsEnabled,
      flightAlerts,
      dealsPromos,
      chatMessages,
      emailDigest,
      highContrast,
      largeText,
      reduceMotion,
      hapticFeedback,
      user,
    ]
  );

  // Clear Cache Action
  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache & Offline Data",
      "This will remove temporary image files, offline search indexes, and network cache. Your login credentials and saved preferences will remain intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Now",
          style: "destructive",
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToClear = allKeys.filter(
                (k) =>
                  k !== SETTINGS_STORAGE_KEY &&
                  !k.includes("auth") &&
                  !k.includes("session") &&
                  !k.includes("token")
              );
              if (keysToClear.length > 0) {
                await AsyncStorage.multiRemove(keysToClear);
              }
              setCacheSize("0.0 KB");
              Alert.alert("Success", "Cache and temporary data have been cleared successfully.");
            } catch (e) {
              setCacheSize("0.0 KB");
              Alert.alert("Success", "Cache cleared.");
            }
          },
        },
      ]
    );
  };

  // Sign Out Action
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            setShowAccountModal(false);
            Alert.alert("Signed Out", "You have been logged out.");
          } catch (err: any) {
            Alert.alert("Error", err?.message || "Failed to sign out.");
          }
        },
      },
    ]);
  };

  // Change Password Action
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match.");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await updatePassword(newPassword);
      setIsUpdatingPassword(false);
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Your password has been successfully updated.");
    } catch (err: any) {
      setIsUpdatingPassword(false);
      Alert.alert("Password Update Failed", err?.message || "Could not update password. Please try again.");
    }
  };

  // Check For App Updates
  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setTimeout(() => {
      setCheckingUpdate(false);
      Alert.alert("Up to Date", "You are running the latest version 8.55.2 (Build 2026.04). No new updates found.");
    }, 1200);
  };

  // Filtered lists for modal selection
  const filteredLanguages = useMemo(() => {
    if (!searchFilter.trim()) return LANGUAGES;
    const q = searchFilter.toLowerCase();
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  const filteredCountries = useMemo(() => {
    if (!searchFilter.trim()) return COUNTRIES;
    const q = searchFilter.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  const filteredCurrencies = useMemo(() => {
    if (!searchFilter.trim()) return CURRENCIES;
    const q = searchFilter.toLowerCase();
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      {/* ─── Top Navigation Header ───────────────────────────────────────── */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Group 0: Account Status Card ──────────────────────────────── */}
        <View style={styles.sectionGroup}>
          <View style={[styles.accountCard, { backgroundColor: colors.itemBg, borderColor: colors.border }]}>
            <View style={styles.accountCardLeft}>
              <View style={[styles.accountAvatar, { backgroundColor: user ? "#2563EB" : "#94A3B8" }]}>
                {user ? (
                  <Text style={styles.avatarInitials}>
                    {user.email ? user.email.slice(0, 2).toUpperCase() : "U"}
                  </Text>
                ) : (
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.accountDetails}>
                <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                  {user ? user.email : "Guest Traveler"}
                </Text>
                <Text style={[styles.accountStatus, { color: user ? "#10B981" : colors.subText }]}>
                  {user ? "● Verified Member (Supabase)" : "Not signed in"}
                </Text>
              </View>
            </View>

            {user ? (
              <TouchableOpacity
                style={[styles.accountActionBtn, { backgroundColor: "#2563EB" }]}
                onPress={() => setShowAccountModal(true)}
              >
                <Text style={styles.accountActionBtnText}>Manage</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.accountActionBtn, { backgroundColor: "#2563EB" }]}
                onPress={() => router.push("/(auth)/login" as any)}
              >
                <Text style={styles.accountActionBtnText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Separator */}
        <View style={[styles.groupSeparator, { backgroundColor: colors.separator }]} />

        {/* ─── Group 1: Preferences / Localization ───────────────────────── */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionTitle, { color: colors.subText }]}>LOCALIZATION</Text>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("language");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="globe-outline" size={20} color="#2563EB" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Language</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{language}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("country");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="location-outline" size={20} color="#0D9488" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Country or Region</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{country}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("currency");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="cash-outline" size={20} color="#16A34A" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Currency</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{currency}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("units");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="speedometer-outline" size={20} color="#EA580C" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Units</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{units}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("tempScale");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="thermometer-outline" size={20} color="#E11D48" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Temperature Scale</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{tempScale}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              setSearchFilter("");
              setActiveModal("timeFormat");
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="time-outline" size={20} color="#7C3AED" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Time format</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{timeFormat}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Separator */}
        <View style={[styles.groupSeparator, { backgroundColor: colors.separator }]} />

        {/* ─── Group 2: Account & Travel Tools ────────────────────────────── */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionTitle, { color: colors.subText }]}>ACCOUNT & TOOLS</Text>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              if (user) {
                setShowAccountModal(true);
              } else {
                router.push("/(auth)/login" as any);
              }
            }}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="person-circle-outline" size={20} color="#2563EB" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Manage my account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowQRModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="qr-code-outline" size={20} color="#0284C7" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Scan QR Code & Travel Pass</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.rowLabelGroup}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#059669" style={styles.rowIcon} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Password & Security</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Separator */}
        <View style={[styles.groupSeparator, { backgroundColor: colors.separator }]} />

        {/* ─── Group 3: Preferences & Accessibility ────────────────────────── */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionTitle, { color: colors.subText }]}>APP PREFERENCES</Text>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowNotificationsModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="notifications-outline" size={20} color="#F59E0B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>
                {notificationsEnabled ? "Enabled" : "Off"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Ionicons name="moon-outline" size={20} color="#6366F1" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Theme</Text>
            </View>
            <Switch
              value={darkTheme}
              onValueChange={(val) => {
                setDarkTheme(val);
                persistSettings({ darkTheme: val });
              }}
              trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              thumbColor={darkTheme ? "#FFFFFF" : "#F8FAFC"}
            />
          </View>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowAccessibilityModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="body-outline" size={20} color="#8B5CF6" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Accessibility</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={handleClearCache}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="trash-outline" size={20} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Clear Cache & Temporary Files</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: colors.subText }]}>{cacheSize}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Separator */}
        <View style={[styles.groupSeparator, { backgroundColor: colors.separator }]} />

        {/* ─── Group 4: Legal & Version Info ──────────────────────────────── */}
        <View style={styles.sectionGroup}>
          <Text style={[styles.sectionTitle, { color: colors.subText }]}>ABOUT & LEGAL</Text>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowTermsModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="document-text-outline" size={20} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Terms & Conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowPrivacyModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Privacy Statement</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowAdsOptOutModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="shield-outline" size={20} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Opt-out of Sales and Targeted Advertising</Text>
            </View>
            <View style={styles.rowValueRight}>
              <Text style={[styles.rowValueText, { color: targetedAdsOptOut ? "#16A34A" : colors.subText }]}>
                {targetedAdsOptOut ? "Opted Out" : "Active"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowVersionModal(true)}
          >
            <View style={styles.rowLabelGroup}>
              <Ionicons name="information-circle-outline" size={20} color="#64748B" style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Version</Text>
            </View>
            <View style={styles.versionValueRight}>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW!</Text>
              </View>
              <Text style={[styles.versionNumberText, { color: colors.subText }]}>8.55.2</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── Group 5: Bottom Sign Out / Sign In ─────────────────────────── */}
        <View style={styles.authActionContainer}>
          {user ? (
            <TouchableOpacity
              style={[styles.signOutBtn, { borderColor: "#EF4444" }]}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.signOutBtnText}>Log Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: "#2563EB" }]}
              onPress={() => router.push("/(auth)/login" as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.signInBtnText}>Sign In / Register</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ─── MODAL 1: Selection Drawer (Language, Country, Currency, etc.) ── */}
      <Modal
        visible={!!activeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setActiveModal(null);
          setSearchFilter("");
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Select {activeModal === "country" ? "Country or Region" : activeModal === "tempScale" ? "Temperature Scale" : activeModal === "timeFormat" ? "Time Format" : activeModal}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveModal(null);
                  setSearchFilter("");
                }}
              >
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input for lists with > 5 items */}
            {(activeModal === "language" || activeModal === "country" || activeModal === "currency") && (
              <View style={[styles.searchBox, { backgroundColor: colors.itemBg, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder={`Search ${activeModal}...`}
                  placeholderTextColor="#94A3B8"
                  value={searchFilter}
                  onChangeText={setSearchFilter}
                  style={[styles.searchInput, { color: colors.text }]}
                  clearButtonMode="while-editing"
                />
              </View>
            )}

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {activeModal === "language" &&
                filteredLanguages.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setLanguage(item.name);
                      persistSettings({ language: item.name });
                      setActiveModal(null);
                      setSearchFilter("");
                    }}
                  >
                    <View>
                      <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                      <Text style={styles.optionSub}>{item.nativeName}</Text>
                    </View>
                    {language === item.name && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "country" &&
                filteredCountries.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setCountry(item.name);
                      persistSettings({ country: item.name });
                      setActiveModal(null);
                      setSearchFilter("");
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                      <View>
                        <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                        <Text style={styles.optionSub}>{item.region}</Text>
                      </View>
                    </View>
                    {country === item.name && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "currency" &&
                filteredCurrencies.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setCurrency(item.code);
                      persistSettings({ currency: item.code });
                      setActiveModal(null);
                      setSearchFilter("");
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={styles.currencyBadge}>
                        <Text style={styles.currencySymbol}>{item.symbol}</Text>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.optionText, { color: colors.text }]}>{item.code}</Text>
                        <Text style={styles.optionSub}>{item.name}</Text>
                      </View>
                    </View>
                    {currency === item.code && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "units" &&
                UNITS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setUnits(item);
                      persistSettings({ units: item });
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
                    {units === item && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "tempScale" &&
                TEMPS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setTempScale(item);
                      persistSettings({ tempScale: item });
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
                    {tempScale === item && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "timeFormat" &&
                TIME_FORMATS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.optionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setTimeFormat(item);
                      persistSettings({ timeFormat: item });
                      setActiveModal(null);
                    }}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{item}</Text>
                    {timeFormat === item && <Ionicons name="checkmark-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 2: QR Scanner & Travel Pass ───────────────────────────── */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowQRModal(false);
          setScanResult(null);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>QR Code & Digital Pass</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={[styles.segmentedWrap, { backgroundColor: colors.itemBg }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, qrTab === "scan" && styles.segmentBtnActive]}
                onPress={() => {
                  setQrTab("scan");
                  setScanResult(null);
                }}
              >
                <Ionicons name="scan-outline" size={16} color={qrTab === "scan" ? "#FFFFFF" : colors.subText} style={{ marginRight: 6 }} />
                <Text style={[styles.segmentBtnText, qrTab === "scan" && styles.segmentBtnTextActive]}>Scan Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, qrTab === "pass" && styles.segmentBtnActive]}
                onPress={() => setQrTab("pass")}
              >
                <Ionicons name="card-outline" size={16} color={qrTab === "pass" ? "#FFFFFF" : colors.subText} style={{ marginRight: 6 }} />
                <Text style={[styles.segmentBtnText, qrTab === "pass" && styles.segmentBtnTextActive]}>My Travel Pass</Text>
              </TouchableOpacity>
            </View>

            {qrTab === "scan" ? (
              <View style={styles.qrScannerBox}>
                <View style={styles.viewfinderFrame}>
                  <Ionicons name="scan" size={160} color="#2563EB" />
                  <View style={styles.laserScanLine} />
                </View>
                <Text style={[styles.qrScannerText, { color: colors.subText }]}>
                  Align ticket, boarding pass, or hotel check-in QR within frame
                </Text>

                <View style={styles.qrControlRow}>
                  <TouchableOpacity
                    style={[styles.qrControlBtn, flashEnabled && styles.qrControlBtnActive]}
                    onPress={() => setFlashEnabled(!flashEnabled)}
                  >
                    <Ionicons name={flashEnabled ? "flash" : "flash-outline"} size={20} color={flashEnabled ? "#FFFFFF" : "#2563EB"} />
                    <Text style={[styles.qrControlText, flashEnabled && { color: "#FFFFFF" }]}>
                      Flash {flashEnabled ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.qrControlBtn}
                    onPress={() => {
                      setScanResult("✈️ Boarding Pass: BG-043 (DAC -> DXB)\nPassenger: " + (user?.email || "Traveler") + "\nSeat: 12B | Gate 4 | Status: Ready for Boarding");
                    }}
                  >
                    <Ionicons name="airplane-outline" size={20} color="#2563EB" />
                    <Text style={styles.qrControlText}>Simulate Flight Pass</Text>
                  </TouchableOpacity>
                </View>

                {scanResult && (
                  <View style={styles.scanResultBanner}>
                    <Ionicons name="checkmark-circle" size={24} color="#16A34A" style={{ marginRight: 10 }} />
                    <Text style={styles.scanResultText}>{scanResult}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.travelPassCard}>
                <View style={styles.passHeader}>
                  <View>
                    <Text style={styles.passAppBrand}>TRIP PASS</Text>
                    <Text style={styles.passMemberName}>{user ? user.email : "GUEST PASS"}</Text>
                  </View>
                  <View style={styles.passBadge}>
                    <Text style={styles.passBadgeText}>VIP VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.passQrContainer}>
                  <Ionicons name="qr-code" size={140} color="#0F172A" />
                </View>

                <Text style={styles.passInstruction}>
                  Present this QR code at hotel check-in counters and airport concierge gates for fast-track recognition.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 3: Manage Account Sheet ──────────────────────────────── */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Manage Account</Text>
              <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.accountProfilePreview}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
                </Text>
              </View>
              <Text style={[styles.profileEmailText, { color: colors.text }]}>{user?.email}</Text>
              <Text style={[styles.profileIdText, { color: colors.subText }]}>User ID: {user?.id?.slice(0, 16)}...</Text>
            </View>

            <View style={styles.accountModalOptions}>
              <TouchableOpacity
                style={[styles.accountOptionBtn, { backgroundColor: colors.itemBg, borderColor: colors.border }]}
                onPress={() => {
                  setShowAccountModal(false);
                  router.push("/screens/profile" as any);
                }}
              >
                <Ionicons name="person-outline" size={20} color="#2563EB" style={{ marginRight: 12 }} />
                <Text style={[styles.accountOptionText, { color: colors.text }]}>View Full Profile & Bookings</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountOptionBtn, { backgroundColor: colors.itemBg, borderColor: colors.border }]}
                onPress={() => {
                  setShowAccountModal(false);
                  setShowPasswordModal(true);
                }}
              >
                <Ionicons name="key-outline" size={20} color="#10B981" style={{ marginRight: 12 }} />
                <Text style={[styles.accountOptionText, { color: colors.text }]}>Update Password</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountOptionBtn, { backgroundColor: colors.itemBg, borderColor: colors.border }]}
                onPress={() => {
                  setShowAccountModal(false);
                  router.push("/screens/customer-support" as any);
                }}
              >
                <Ionicons name="headset-outline" size={20} color="#F59E0B" style={{ marginRight: 12 }} />
                <Text style={[styles.accountOptionText, { color: colors.text }]}>Customer Support 24/7</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountOptionBtn, { backgroundColor: "#FEE2E2", borderColor: "#FECACA", marginTop: 12 }]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                <Text style={[styles.accountOptionText, { color: "#EF4444", fontWeight: "700" }]}>Log Out of Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 4: Change Password ────────────────────────────────────── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              Enter a new secure password for your Supabase authenticated account ({user?.email}).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.itemBg, color: colors.text, borderColor: colors.border }]}
                placeholder="At least 6 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.itemBg, color: colors.text, borderColor: colors.border }]}
                placeholder="Re-enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: "#2563EB", opacity: isUpdatingPassword ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 5: Granular Notification Preferences ─────────────────── */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Master switch for all push notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => {
                  setNotificationsEnabled(val);
                  persistSettings({ notificationsEnabled: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Flight & Booking Alerts</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Gate changes, delays, and boarding time updates</Text>
              </View>
              <Switch
                value={flightAlerts}
                disabled={!notificationsEnabled}
                onValueChange={(val) => {
                  setFlightAlerts(val);
                  persistSettings({ flightAlerts: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Exclusive Deals & Price Drops</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Notifies when prices drop on saved hotels and flights</Text>
              </View>
              <Switch
                value={dealsPromos}
                disabled={!notificationsEnabled}
                onValueChange={(val) => {
                  setDealsPromos(val);
                  persistSettings({ dealsPromos: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Chat & Community Mentions</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Messages from 24/7 concierge and fellow travelers</Text>
              </View>
              <Switch
                value={chatMessages}
                disabled={!notificationsEnabled}
                onValueChange={(val) => {
                  setChatMessages(val);
                  persistSettings({ chatMessages: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Email Receipts & Itineraries</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Receive PDF confirmations and booking invoices</Text>
              </View>
              <Switch
                value={emailDigest}
                onValueChange={(val) => {
                  setEmailDigest(val);
                  persistSettings({ emailDigest: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 6: Accessibility Settings ────────────────────────────── */}
      <Modal
        visible={showAccessibilityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccessibilityModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Accessibility</Text>
              <TouchableOpacity onPress={() => setShowAccessibilityModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>High Contrast Colors</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Increases contrast on buttons and text labels</Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(val) => {
                  setHighContrast(val);
                  persistSettings({ highContrast: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Large Text Scaling</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Magnifies body copy for enhanced readability</Text>
              </View>
              <Switch
                value={largeText}
                onValueChange={(val) => {
                  setLargeText(val);
                  persistSettings({ largeText: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Reduce Motion</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Minimizes screen transitions and UI animations</Text>
              </View>
              <Switch
                value={reduceMotion}
                onValueChange={(val) => {
                  setReduceMotion(val);
                  persistSettings({ reduceMotion: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Haptic Feedback</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>Tactile vibrations on button clicks and booking confirms</Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={(val) => {
                  setHapticFeedback(val);
                  persistSettings({ hapticFeedback: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 7: Terms & Conditions ────────────────────────────────── */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg, maxHeight: "85%" }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ paddingVertical: 10 }}>
              <Text style={[styles.legalHeading, { color: colors.text }]}>1. Acceptance of Terms</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                By accessing or using the Travel application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
              </Text>

              <Text style={[styles.legalHeading, { color: colors.text }]}>2. Booking & Travel Services</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                All flight reservations, hotel room bookings, Bangladesh Railway train passes, and tour packages booked via this platform are executed directly with licensed airline, hotel, and railway partners through Supabase database integrations.
              </Text>

              <Text style={[styles.legalHeading, { color: colors.text }]}>3. Cancellations & Refund Policies</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                Cancellations and refunds are subject to the fare rules of the individual operator. Standard refundable fares are returned to the original payment method within 5 to 10 business days.
              </Text>

              <Text style={[styles.legalHeading, { color: colors.text }]}>4. User Responsibilities & Safety</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                You are responsible for ensuring that all passport details, visa requirements, and contact phone numbers provided during checkout are strictly accurate.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 8: Privacy Statement ─────────────────────────────────── */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg, maxHeight: "85%" }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Privacy Statement</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ paddingVertical: 10 }}>
              <Text style={[styles.legalHeading, { color: colors.text }]}>1. Information We Collect</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                We collect personal information you provide when registering, including email address, name, phone number, passport details for airline ticketing, and encrypted authentication tokens.
              </Text>

              <Text style={[styles.legalHeading, { color: colors.text }]}>2. Data Storage & Supabase Security</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                User data is stored using industry-standard Row Level Security (RLS) policies within Supabase Postgres, ensuring that your bookings and private messages can only be accessed by your authenticated session.
              </Text>

              <Text style={[styles.legalHeading, { color: colors.text }]}>3. Third-Party Sharing</Text>
              <Text style={[styles.legalBody, { color: colors.subText }]}>
                We share travel information strictly with service fulfillment providers (airlines, hotel managers, Bangladesh Railway API services) solely for issuing valid e-tickets and reservation vouchers. We never sell your personal data.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 9: Opt-Out of Targeted Advertising ───────────────────── */}
      <Modal
        visible={showAdsOptOutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdsOptOutModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Privacy & Advertising Controls</Text>
              <TouchableOpacity onPress={() => setShowAdsOptOutModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              Control how your activity is used for personalized promotions, flight recommendations, and partner advertisements.
            </Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>Opt-Out of Targeted Ads</Text>
                <Text style={[styles.toggleDesc, { color: colors.subText }]}>
                  {targetedAdsOptOut
                    ? "Targeted advertising and third-party data tracking are disabled."
                    : "Targeted advertising is active based on your search history."}
                </Text>
              </View>
              <Switch
                value={targetedAdsOptOut}
                onValueChange={(val) => {
                  setTargetedAdsOptOut(val);
                  persistSettings({ targetedAdsOptOut: val });
                }}
                trackColor={{ false: "#E2E8F0", true: "#16A34A" }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL 10: Version & Release Notes ───────────────────────────── */}
      <Modal
        visible={showVersionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVersionModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>App Version 8.55.2</Text>
              <TouchableOpacity onPress={() => setShowVersionModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.versionReleaseBox}>
              <Text style={[styles.versionDesc, { color: colors.text }]}>
                Production Build 8.55.2 (Build 2026.04)
              </Text>
              <Text style={[styles.versionChangelogHeader, { color: colors.subText }]}>WHAT'S NEW:</Text>
              <Text style={[styles.changelogItem, { color: colors.subText }]}>
                • Complete database integration with Supabase for Hotels, Agencies & Tours
              </Text>
              <Text style={[styles.changelogItem, { color: colors.subText }]}>
                • Bangladesh Railway live ticket booking with persistent session & cookies
              </Text>
              <Text style={[styles.changelogItem, { color: colors.subText }]}>
                • WebRTC VoIP calling & 24/7 AI Concierge Support
              </Text>
              <Text style={[styles.changelogItem, { color: colors.subText }]}>
                • Dark Theme & Offline Storage Synchronization
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: "#2563EB", marginTop: 16 }]}
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Check for Updates</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 2,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  /* Scroll Container */
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* Account Card */
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  accountCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
  },
  accountStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  accountActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  accountActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Section Groups */
  sectionGroup: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 8,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "400",
    flex: 1,
  },
  rowValueRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValueText: {
    fontSize: 14,
    fontWeight: "400",
  },

  /* Separators */
  groupSeparator: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 6,
  },

  /* Version Badge */
  versionValueRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newBadge: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  versionNumberText: {
    fontSize: 14,
  },

  /* Bottom Auth Button */
  authActionContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#FEF2F2",
  },
  signOutBtnText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  optionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  currencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* Segmented Control */
  segmentedWrap: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#2563EB",
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },

  /* QR Scanner */
  qrScannerBox: {
    alignItems: "center",
    paddingVertical: 16,
  },
  viewfinderFrame: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  laserScanLine: {
    position: "absolute",
    width: "80%",
    height: 2,
    backgroundColor: "#EF4444",
  },
  qrScannerText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 20,
  },
  qrControlRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  qrControlBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    gap: 6,
  },
  qrControlBtnActive: {
    backgroundColor: "#2563EB",
  },
  qrControlText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  scanResultBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    width: "100%",
  },
  scanResultText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
    flex: 1,
  },

  /* Travel Pass Card */
  travelPassCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  passHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  passAppBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
  passMemberName: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  passBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  passQrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 12,
  },
  passInstruction: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
  },

  /* Account Profile Preview */
  accountProfilePreview: {
    alignItems: "center",
    paddingVertical: 12,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  largeAvatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  profileEmailText: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileIdText: {
    fontSize: 12,
    marginTop: 2,
  },
  accountModalOptions: {
    marginTop: 12,
    gap: 8,
  },
  accountOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountOptionText: {
    fontSize: 15,
  },

  /* Password Form */
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Toggle Rows */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 3,
  },

  /* Legal Text */
  legalHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  legalBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },

  /* Version Box */
  versionReleaseBox: {
    paddingVertical: 10,
  },
  versionDesc: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  versionChangelogHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  changelogItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
});
