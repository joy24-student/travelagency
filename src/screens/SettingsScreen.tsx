import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import {
  useSettingsStore,
  ThemeMode,
  NotificationPreferences,
} from "../store/settingsStore";
import { CURRENCY_METADATA, formatPrice } from "../utils/currency";
import { SUPPORTED_LANGUAGES } from "../locales/i18n";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";

import { SettingsSection } from "../components/settings/SettingsSection";
import { SettingsToggleRow } from "../components/settings/SettingsToggleRow";
import { LanguageSelectorModal } from "../components/settings/LanguageSelectorModal";
import { CurrencySelectorModal } from "../components/settings/CurrencySelectorModal";
import { CacheManagerModal } from "../components/settings/CacheManagerModal";
import { ActiveDevicesModal } from "../components/settings/ActiveDevicesModal";
import { AccountDeletionModal } from "../components/settings/AccountDeletionModal";
import { RTLIcon } from "../components/ui";

export function SettingsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { width } = useWindowDimensions();
  const isSplitPane = width > 768;

  const { colors, isDark, isOled, themeMode, setThemeMode } = useTheme();
  const { language, t, isRTL } = useLanguage();
  const { user, signOut } = useAuth();

  const {
    currency,
    notifications,
    updateNotificationPreference,
    security,
    toggleBiometric,
    updateSecurityPreference,
    accessibility,
    updateAccessibilityPreference,
    offline,
    updateOfflinePreference,
  } = useSettingsStore();

  // Active Category for Split-Pane Web Navigation
  const [activeCategory, setActiveCategory] = useState<
    | "profile"
    | "appearance"
    | "security"
    | "notifications"
    | "storage"
    | "legal"
  >("appearance");

  // Modals state
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exportingData, setExportingData] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showActiveDevicesModal, setShowActiveDevicesModal] = useState(false);

  const currentLangObj = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === language),
    [language]
  );
  const currentCurrObj = useMemo(
    () => CURRENCY_METADATA[currency],
    [currency]
  );

  // Biometric toggle with authentication verification
  const handleBiometricToggle = async (nextValue: boolean) => {
    if (Platform.OS === "web") {
      toggleBiometric(nextValue);
      return;
    }

    try {
      setBiometricLoading(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          t("biometricLock"),
          "Biometric authentication is not supported or enrolled on this device."
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: nextValue
          ? "Confirm your biometric identity to enable Biometric Lock"
          : "Confirm your biometric identity to disable Biometric Lock",
        fallbackLabel: "Use Passcode",
      });

      if (result.success) {
        toggleBiometric(nextValue);
        if (accessibility.hapticFeedbackEnabled) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
      } else {
        Alert.alert(t("error"), "Biometric verification cancelled or failed.");
      }
    } catch (err) {
      console.warn("Biometric verification error:", err);
      Alert.alert(t("error"), "Unable to verify biometrics.");
    } finally {
      setBiometricLoading(false);
    }
  };

  // Push notifications toggle handler with optional Supabase sync
  const handleNotificationToggle = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    updateNotificationPreference(key, value);

    // Sync to user profile in Supabase if logged in
    if (user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({
            [`notification_${key}`]: value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch {
        // Fail silently or offline queue
      }
    }
  };

  // GDPR Data Download
  const handleDownloadMyData = async () => {
    try {
      setExportingData(true);
      const dataPayload = {
        exportVersion: "1.0",
        exportDate: new Date().toISOString(),
        user: {
          id: user?.id || "guest-traveller",
          email: user?.email || "guest@shopnojatra.com",
          user_metadata: user?.user_metadata || {},
          created_at: user?.created_at,
        },
        preferences: {
          themeMode,
          language,
          currency,
          notifications,
          accessibility,
          offline,
        },
        notice:
          "This data export is generated in compliance with GDPR & General Privacy Regulations.",
      };

      const jsonString = JSON.stringify(dataPayload, null, 2);

      if (Platform.OS === "web") {
        if (typeof document !== "undefined") {
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `shopno-jatra-data-export-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          Alert.alert(t("success"), t("dataExportReady"));
        }
      } else {
        const fileUri = `${FileSystem.Paths?.cache?.uri || ""}/shopno-jatra-data-export.json`;
        if (fileUri) {
          const file = new FileSystem.File(FileSystem.Paths.cache, "shopno-jatra-data-export.json");
          const stream = file.writableStream();
          const writer = stream.getWriter();
          await writer.write(new TextEncoder().encode(jsonString));
          await writer.close();

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, {
              mimeType: "application/json",
              dialogTitle: "Your Personal Data Export",
            });
          } else {
            Alert.alert(t("success"), t("dataExportReady"));
          }
        }
      }
    } catch (err) {
      console.warn("Export data error:", err);
      Alert.alert(t("error"), "Could not generate data export archive.");
    } finally {
      setExportingData(false);
    }
  };

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert(t("error"), "Please type DELETE to confirm deletion.");
      return;
    }

    try {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            deletion_requested_at: new Date().toISOString(),
            status: "pending_deletion",
          })
          .eq("id", user.id);
      }
      setShowDeleteModal(false);
      Alert.alert(t("success"), t("deleteAccountSuccess"), [
        {
          text: t("ok"),
          onPress: () => {
            signOut();
            router.replace("/");
          },
        },
      ]);
    } catch (err) {
      Alert.alert(t("error"), "Failed to schedule account deletion.");
    }
  };

  // Section 1: Profile & Identity
  const renderProfileSection = () => (
    <SettingsSection title={t("profileSection")}>
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {(user?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.nameBadgeRow}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "Valued Traveller"}
              </Text>
              <View
                style={[
                  styles.kycBadge,
                  { backgroundColor: "#10b98120" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={12}
                  color="#10b981"
                  style={{ marginEnd: 4 }}
                />
                <Text style={styles.kycText}>{t("kycVerified")}</Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: colors.subtext }]}>
              {user?.email || "traveler@shopnojatra.com"}
            </Text>
            <View style={styles.vipTagRow}>
              <Ionicons name="sparkles" size={12} color="#f59e0b" />
              <Text style={styles.vipTierText}>
                {t("vipTier")} • {t("memberSince", { year: user?.created_at ? new Date(user.created_at).getFullYear().toString() : new Date().getFullYear().toString() })}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/screens/profile" as any)}
          style={[
            styles.editProfileButton,
            {
              backgroundColor: isDark ? "#334155" : "#f1f5f9",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={colors.primary}
            style={{ marginEnd: 6 }}
          />
          <Text style={[styles.editProfileText, { color: colors.primary }]}>
            {t("editProfile")}
          </Text>
        </TouchableOpacity>
      </View>
    </SettingsSection>
  );

  // Section 2: Appearance & Display
  const renderAppearanceSection = () => (
    <SettingsSection
      title={t("appearanceSection")}
      subtitle={t("themeDescription")}
    >
      {/* Theme Mode Segmented Selector */}
      <View style={styles.themeSelectorContainer}>
        <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
          {t("theme")}
        </Text>
        <View
          style={[
            styles.segmentedControl,
            {
              backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
              borderColor: colors.border,
            },
          ]}
        >
          {(
            [
              { key: "system", label: t("themeSystem"), icon: "phone-portrait-outline" },
              { key: "light", label: t("themeLight"), icon: "sunny-outline" },
              { key: "dark", label: t("themeDark"), icon: "moon-outline" },
              { key: "oled", label: "OLED", icon: "contrast-outline" },
            ] as const
          ).map((item) => {
            const isSelected = themeMode === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={() => {
                  if (accessibility.hapticFeedbackEnabled && Platform.OS !== "web") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setThemeMode(item.key);
                }}
                style={[
                  styles.segmentButton,
                  isSelected && [
                    styles.segmentButtonActive,
                    {
                      backgroundColor: colors.card,
                      shadowColor: "#000",
                    },
                  ],
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
                  color={isSelected ? colors.primary : colors.subtext}
                  style={{ marginEnd: 4 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isSelected ? colors.primary : colors.subtext,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language Picker Row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowLanguageModal(true)}
        style={[styles.clickableRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="language" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("changeLanguage")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {currentLangObj?.nativeName || "English"} ({currentLangObj?.name})
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.flagEmoji}>{currentLangObj?.flag}</Text>
          <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
        </View>
      </TouchableOpacity>

      {/* Currency Selector Row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowCurrencyModal(true)}
        style={styles.clickableRow}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: "#10b98115" },
            ]}
          >
            <Ionicons name="cash-outline" size={18} color="#10b981" />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("currency")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {currentCurrObj?.name} ({currentCurrObj?.code})
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.currencyPreview, { color: colors.primary }]}>
            {formatPrice(1000, currency)}
          </Text>
          <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
        </View>
      </TouchableOpacity>
    </SettingsSection>
  );

  // Section 3: Security & Biometrics
  const renderSecuritySection = () => (
    <SettingsSection title={t("securitySection")}>
      <SettingsToggleRow
        icon={<Ionicons name="finger-print" size={20} color={colors.primary} />}
        title={t("biometricLock")}
        subtitle={t("biometricLockDesc")}
        value={security.biometricLockEnabled}
        loading={biometricLoading}
        onValueChange={handleBiometricToggle}
      />

      <SettingsToggleRow
        icon={<Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />}
        title={t("requireAuthPayment")}
        subtitle={t("requireAuthPaymentDesc")}
        value={security.requireAuthOnPayment}
        onValueChange={(val) => updateSecurityPreference("requireAuthOnPayment", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="lock-closed-outline" size={20} color="#8b5cf6" />}
        title={language === "bn" ? "দ্বি-স্তর বিশিষ্ট নিরাপত্তা (2FA / OTP)" : "Two-Factor Authentication (2FA)"}
        subtitle={
          language === "bn"
            ? "লগইনের সময় অতিরিক্ত OTP বা নিরাপত্তা কোড আবশ্যক"
            : "Require an OTP verification step on login"
        }
        value={security.twoFactorEnabled}
        onValueChange={(val) => updateSecurityPreference("twoFactorEnabled", val)}
      />

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert(
            t("changePassword"),
            "A password reset link will be dispatched to your registered email address.",
            [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("send"),
                onPress: async () => {
                  if (user?.email) {
                    await supabase.auth.resetPasswordForEmail(user.email);
                    Alert.alert(t("success"), "Reset link sent!");
                  }
                },
              },
            ]
          );
        }}
        style={[styles.clickableRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: "#f59e0b15" },
            ]}
          >
            <Ionicons name="key-outline" size={18} color="#f59e0b" />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("changePassword")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              Update your account password
            </Text>
          </View>
        </View>
        <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowActiveDevicesModal(true)}
        style={[styles.clickableRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: "#3b82f615" },
            ]}
          >
            <Ionicons name="hardware-chip-outline" size={18} color="#2563eb" />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {language === "bn" ? "লগইন করা ডিভাইস" : "Logged-in Devices"}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {language === "bn" ? "সক্রিয় সেশনসমূহ ও দূরবর্তী লগআউট" : "Manage active sessions & remote logout"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ backgroundColor: "#22c55e20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700" }}>
              {language === "bn" ? "সক্রিয়" : "Active"}
            </Text>
          </View>
          <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
        </View>
      </TouchableOpacity>

      <View style={styles.deviceInfoRow}>
        <Ionicons name="hardware-chip-outline" size={16} color={colors.subtext} />
        <Text style={[styles.deviceInfoText, { color: colors.subtext }]}>
          {Platform.OS === "web"
            ? "Chrome Web Client • Active Session"
            : `${Platform.OS.toUpperCase()} Mobile Device • Active Session`}
        </Text>
      </View>
    </SettingsSection>
  );

  // Section 4: Notifications
  const renderNotificationsSection = () => (
    <SettingsSection title={t("notificationsSection")}>
      <SettingsToggleRow
        icon={<Ionicons name="notifications" size={20} color={colors.primary} />}
        title={t("pushNotifications")}
        subtitle={t("pushNotificationsDesc")}
        value={notifications.pushEnabled}
        onValueChange={(val) => handleNotificationToggle("pushEnabled", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="trending-down-outline" size={20} color="#10b981" />}
        title={t("priceAlerts")}
        subtitle={t("priceAlertsDesc")}
        disabled={!notifications.pushEnabled}
        value={notifications.priceAlerts}
        onValueChange={(val) => handleNotificationToggle("priceAlerts", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="airplane-outline" size={20} color="#3b82f6" />}
        title={t("tripUpdates")}
        subtitle={t("tripUpdatesDesc")}
        disabled={!notifications.pushEnabled}
        value={notifications.tripUpdates}
        onValueChange={(val) => handleNotificationToggle("tripUpdates", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="pricetag-outline" size={20} color="#f59e0b" />}
        title={t("promoOffers")}
        subtitle={t("promoOffersDesc")}
        disabled={!notifications.pushEnabled}
        value={notifications.promoOffers}
        onValueChange={(val) => handleNotificationToggle("promoOffers", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="chatbubbles-outline" size={20} color="#8b5cf6" />}
        title={t("communityActivity")}
        subtitle={t("communityActivityDesc")}
        disabled={!notifications.pushEnabled}
        isLast
        value={notifications.communityActivity}
        onValueChange={(val) =>
          handleNotificationToggle("communityActivity", val)
        }
      />
    </SettingsSection>
  );

  // Section 5: Storage & Network
  const renderStorageSection = () => (
    <SettingsSection title={t("storageSection")}>
      <SettingsToggleRow
        icon={<Ionicons name="wifi-outline" size={20} color="#3b82f6" />}
        title={t("downloadWifiOnly")}
        subtitle={t("downloadWifiOnlyDesc")}
        value={offline.downloadOverWifiOnly}
        onValueChange={(val) => updateOfflinePreference("downloadOverWifiOnly", val)}
      />

      <SettingsToggleRow
        icon={<Ionicons name="cloud-download-outline" size={20} color="#10b981" />}
        title={t("autoDownloadVouchers")}
        subtitle={t("autoDownloadVouchersDesc")}
        value={offline.autoDownloadVouchers}
        onValueChange={(val) =>
          updateOfflinePreference("autoDownloadVouchers", val)
        }
      />

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowCacheModal(true)}
        style={styles.clickableRow}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: "#ef444415" },
            ]}
          >
            <Ionicons name="trash-bin-outline" size={18} color="#ef4444" />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("clearAppCache")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {t("clearAppCacheDesc")}
            </Text>
          </View>
        </View>
        <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>
    </SettingsSection>
  );

  // Section 6: Privacy, Data & Legal
  const renderLegalSection = () => (
    <SettingsSection title={t("privacySection")}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleDownloadMyData}
        disabled={exportingData}
        style={[styles.clickableRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            {exportingData ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="download-outline"
                size={18}
                color={colors.primary}
              />
            )}
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {t("downloadData")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {t("downloadDataDesc")}
            </Text>
          </View>
        </View>
        <RTLIcon name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowDeleteModal(true)}
        style={[styles.clickableRow, { borderBottomColor: colors.border }]}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: "#ef444415" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
          </View>
          <View>
            <Text style={[styles.rowTitle, { color: "#ef4444" }]}>
              {t("deleteAccount")}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.subtext }]}>
              {t("deleteAccountDesc")}
            </Text>
          </View>
        </View>
        <RTLIcon name="chevron-forward" size={18} color="#ef4444" />
      </TouchableOpacity>

      {/* About & Licenses Links */}
      <View style={styles.legalLinksBlock}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.subtext }]}>
            {t("appVersion")}
          </Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>
            1.1.0-alpha
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert(t("rateApp"), t("ratingThanks"))}
          style={styles.aboutRow}
        >
          <Text style={[styles.aboutLabel, { color: colors.primary }]}>
            ★ {t("rateApp")}
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </SettingsSection>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
      edges={["top"]}
    >
      {/* Top Header */}
      <View
        style={[
          styles.navHeader,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("settingsTitle")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Responsive Split-Pane for Desktop Web vs Mobile */}
      {isSplitPane ? (
        <View style={styles.splitPaneContainer}>
          {/* Left Category Sidebar */}
          <View
            style={[
              styles.sidebar,
              {
                backgroundColor: colors.card,
                borderRightColor: colors.border,
              },
            ]}
          >
            {(
              [
                { key: "profile", label: t("profileSection"), icon: "person-circle-outline" },
                { key: "appearance", label: t("appearanceSection"), icon: "color-palette-outline" },
                { key: "security", label: t("securitySection"), icon: "lock-closed-outline" },
                { key: "notifications", label: t("notificationsSection"), icon: "notifications-outline" },
                { key: "storage", label: t("storageSection"), icon: "server-outline" },
                { key: "legal", label: t("privacySection"), icon: "shield-outline" },
              ] as const
            ).map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  style={[
                    styles.sidebarItem,
                    isActive && [
                      styles.sidebarItemActive,
                      { backgroundColor: colors.primary + "15" },
                    ],
                  ]}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={isActive ? colors.primary : colors.subtext}
                    style={{ marginEnd: 12 }}
                  />
                  <Text
                    style={[
                      styles.sidebarText,
                      {
                        color: isActive ? colors.primary : colors.text,
                        fontWeight: isActive ? "700" : "500",
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Active Panel */}
          <ScrollView
            style={styles.contentPane}
            contentContainerStyle={styles.contentContainer}
          >
            {activeCategory === "profile" && renderProfileSection()}
            {activeCategory === "appearance" && renderAppearanceSection()}
            {activeCategory === "security" && renderSecuritySection()}
            {activeCategory === "notifications" && renderNotificationsSection()}
            {activeCategory === "storage" && renderStorageSection()}
            {activeCategory === "legal" && renderLegalSection()}
          </ScrollView>
        </View>
      ) : (
        /* Mobile Scrollable View */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderProfileSection()}
          {renderAppearanceSection()}
          {renderSecuritySection()}
          {renderNotificationsSection()}
          {renderStorageSection()}
          {renderLegalSection()}
        </ScrollView>
      )}

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

      {/* Currency Selector Modal */}
      <CurrencySelectorModal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
      />

      {/* Cache & Storage Manager Modal */}
      <ActiveDevicesModal
        visible={showActiveDevicesModal}
        onClose={() => setShowActiveDevicesModal(false)}
      />

      <AccountDeletionModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <CacheManagerModal
        visible={showCacheModal}
        onClose={() => setShowCacheModal(false)}
      />

      {/* Delete Account Double Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.deleteModalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.deleteIconWrapper}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>

            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
              {t("deleteAccountConfirmTitle")}
            </Text>

            <Text style={[styles.deleteModalDesc, { color: colors.subtext }]}>
              {t("deleteAccountConfirmMessage")}
            </Text>

            <View style={styles.gracePeriodBox}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.gracePeriodText}>
                30-Day Recovery Grace Period: You may cancel deletion by logging back in within 30 days.
              </Text>
            </View>

            <Text style={[styles.typeToConfirmText, { color: colors.text }]}>
              Type <Text style={{ fontWeight: "800", color: "#ef4444" }}>DELETE</Text> to confirm:
            </Text>

            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.subtext}
              autoCapitalize="characters"
              style={[
                styles.deleteInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: isDark ? "#0f172a" : "#f8f9fa",
                },
              ]}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
                ]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                style={[
                  styles.confirmDeleteBtn,
                  {
                    backgroundColor:
                      deleteConfirmText.trim().toUpperCase() === "DELETE"
                        ? "#ef4444"
                        : "#fca5a5",
                  },
                ]}
              >
                <Text style={styles.confirmDeleteBtnText}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  splitPaneContainer: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarItemActive: {},
  sidebarText: {
    fontSize: 14,
  },
  contentPane: {
    flex: 1,
  },

  // Profile Section Styles
  profileCard: {
    padding: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 14,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  profileDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    marginEnd: 8,
  },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  kycText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  vipTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  vipTierText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
    marginStart: 4,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Appearance Styles
  themeSelectorContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f020",
  },
  sectionSubtitle: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentButtonActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
  },

  // Clickable Rows
  clickableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingEnd: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagEmoji: {
    fontSize: 20,
    marginEnd: 6,
  },
  currencyPreview: {
    fontSize: 14,
    fontWeight: "600",
    marginEnd: 6,
  },

  // Device Info
  deviceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deviceInfoText: {
    fontSize: 12,
    marginStart: 8,
  },

  // Legal Links
  legalLinksBlock: {
    padding: 16,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  aboutLabel: {
    fontSize: 13,
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Delete Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  deleteIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  deleteModalDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  gracePeriodBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  gracePeriodText: {
    fontSize: 11,
    color: "#92400e",
    marginStart: 8,
    flex: 1,
    lineHeight: 15,
  },
  typeToConfirmText: {
    fontSize: 13,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  deleteInput: {
    width: "100%",
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default SettingsScreen;
