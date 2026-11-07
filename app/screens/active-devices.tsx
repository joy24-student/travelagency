import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../src/context/LanguageContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/hooks/useAuth";
import { showLocalizedAlert } from "../../src/utils/localizedAlert";
import {
  deviceSessionService,
  DeviceSession,
} from "../../src/services/deviceSessionService";

export default function ActiveDevicesRoute() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const uid = user?.id || "guest-traveller";
      await deviceSessionService.registerOrUpdateSession(uid);
      const list = await deviceSessionService.getActiveSessions(uid);
      setSessions(list);
    } catch (err) {
      console.warn("Failed to load active sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user?.id]);

  const handleRevokeSingle = (session: DeviceSession) => {
    showLocalizedAlert(
      isBn ? "ডিভাইস লগআউট" : "Revoke Session",
      isBn
        ? `আপনি কি '${session.deviceName}' ডিভাইস থেকে আপনার অ্যাকাউন্ট লগআউট করতে চান?`
        : `Are you sure you want to sign out '${session.deviceName}' remotely?`,
      [
        { text: isBn ? "বাতিল" : "Cancel", style: "cancel" },
        {
          text: isBn ? "লগআউট" : "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              setRevokingId(session.id);
              await deviceSessionService.revokeSession(
                session.id,
                user?.id || ""
              );
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
              showLocalizedAlert(
                isBn ? "সফল" : "Success",
                isBn
                  ? "নির্বাচিত ডিভাইসটি সফলভাবে লগআউট করা হয়েছে।"
                  : "The device session has been revoked."
              );
            } catch {
              showLocalizedAlert(
                isBn ? "ত্রুটি" : "Error",
                isBn ? "লগআউট ব্যর্থ হয়েছে।" : "Failed to revoke session."
              );
            } finally {
              setRevokingId(null);
            }
          },
        },
      ]
    );
  };

  const handleRevokeAllEverywhere = () => {
    showLocalizedAlert(
      isBn ? "সব জায়গা থেকে লগআউট?" : "Log out from all devices?",
      isBn
        ? "ফোন হারালে বা নিরাপত্তা ঝুঁকির ক্ষেত্রে এটি করুন। আপনার বর্তমান ডিভাইসসহ সমস্ত ডিভাইস থেকে অ্যাকাউন্ট অবিলম্বে লগআউট হয়ে যাবে।"
        : "Recommended if your device was lost. This will immediately terminate all active sessions across every device including this one.",
      [
        { text: isBn ? "বাতিল" : "Cancel", style: "cancel" },
        {
          text: isBn ? "সব ডিভাইস থেকে লগআউট" : "Log Out Everywhere",
          style: "destructive",
          onPress: async () => {
            try {
              setRevokingAll(true);
              await deviceSessionService.revokeAllSessions(user?.id);
              await signOut();
              showLocalizedAlert(
                isBn ? "লগআউট সম্পন্ন" : "Signed Out",
                isBn
                  ? "সব ডিভাইস থেকে আপনার অ্যাকাউন্ট সফলভাবে লগআউট করা হয়েছে।"
                  : "You have been logged out from all devices.",
                [
                  {
                    text: isBn ? "ঠিক আছে" : "OK",
                    onPress: () => router.replace("/(auth)/login"),
                  },
                ]
              );
            } catch {
              showLocalizedAlert(
                isBn ? "ত্রুটি" : "Error",
                isBn
                  ? "লগআউট প্রক্রিয়া ব্যর্থ হয়েছে।"
                  : "Failed to log out from all devices."
              );
            } finally {
              setRevokingAll(false);
            }
          },
        },
      ]
    );
  };

  const getDeviceIcon = (platform: string, name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("pad") || lowerName.includes("tablet")) {
      return "tablet-portrait-outline";
    }
    if (
      platform === "web" ||
      lowerName.includes("windows") ||
      lowerName.includes("mac") ||
      lowerName.includes("desktop")
    ) {
      return "desktop-outline";
    }
    return "phone-portrait-outline";
  };

  const currentSession = sessions.find((s) => s.isCurrentDevice);
  const otherSessions = sessions.filter((s) => !s.isCurrentDevice);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isBn ? "লগইন করা ডিভাইস" : "Logged-in Devices"}
        </Text>
        <TouchableOpacity onPress={loadSessions} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>
            {isBn ? "ডিভাইস তালিকা লোড হচ্ছে..." : "Loading active devices..."}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Lost Phone Security Banner */}
          <View style={styles.safetyBox}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.safetyText}>
              {isBn
                ? "ফোন হারিয়ে গেলে দূর থেকে সমস্ত সেশন বাতিল করতে নিচের লাল বাটনটি চাপুন।"
                : "Lost your phone? Use the master button below to immediately terminate all active sessions."}
            </Text>
          </View>

          {/* Current Device */}
          {currentSession && (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
                {isBn ? "এই ডিভাইস (সক্রিয়)" : "THIS DEVICE (ACTIVE)"}
              </Text>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? "#1e293b" : "#f0fdf4",
                    borderColor: isDark ? "#059669" : "#86efac",
                  },
                ]}
              >
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: "#dcfce7" }]}>
                    <Ionicons
                      name={getDeviceIcon(currentSession.platform, currentSession.deviceName)}
                      size={22}
                      color="#16a34a"
                    />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: colors.text }]}>
                        {currentSession.deviceName}
                      </Text>
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>
                          {isBn ? "বর্তমান" : "Current"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.meta, { color: colors.subtext }]}>
                      {currentSession.osVersion} • {currentSession.location}
                    </Text>
                    <Text style={styles.activeNowText}>
                      ● {isBn ? "এখনই সক্রিয়" : "Active now"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Other Devices */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.subtext }]}>
              {isBn ? "অন্যান্য ডিভাইস" : "OTHER LOGGED-IN DEVICES"} ({otherSessions.length})
            </Text>

            {otherSessions.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor: colors.border },
                ]}
              >
                <Ionicons name="phone-portrait-outline" size={28} color="#94a3b8" />
                <Text style={[styles.emptyText, { color: colors.subtext }]}>
                  {isBn ? "অন্য কোনো ডিভাইসে লগইন নেই" : "No other active sessions detected"}
                </Text>
              </View>
            ) : (
              otherSessions.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.card,
                    { backgroundColor: isDark ? "#1e293b" : "#ffffff", borderColor: colors.border },
                  ]}
                >
                  <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? "#334155" : "#f1f5f9" }]}>
                      <Ionicons
                        name={getDeviceIcon(s.platform, s.deviceName)}
                        size={22}
                        color="#64748b"
                      />
                    </View>
                    <View style={styles.info}>
                      <Text style={[styles.name, { color: colors.text }]}>{s.deviceName}</Text>
                      <Text style={[styles.meta, { color: colors.subtext }]}>
                        {s.osVersion} • {s.location}
                      </Text>
                      <Text style={[styles.timeText, { color: colors.subtext }]}>
                        {isBn ? "সর্বশেষ সক্রিয়: " : "Last active: "}
                        {new Date(s.lastActiveAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRevokeSingle(s)}
                      disabled={revokingId === s.id}
                      style={styles.revokeBtn}
                    >
                      {revokingId === s.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Text style={styles.revokeBtnText}>{isBn ? "লগআউট" : "Revoke"}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Master Remote Logout Action */}
          <TouchableOpacity
            onPress={handleRevokeAllEverywhere}
            disabled={revokingAll}
            style={styles.masterLogoutBtn}
            activeOpacity={0.8}
          >
            {revokingAll ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-out" size={18} color="#ffffff" />
                <Text style={styles.masterLogoutText}>
                  {isBn ? "সব জায়গা থেকে লগআউট" : "Log Out From All Devices"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.masterDesc}>
            {isBn
              ? "ফোন হারিয়ে গেলে বা সন্দেহজনক সেশন বন্ধ করতে এটি অবিলম্বে সমস্ত ডিভাইস থেকে লগআউট করবে।"
              : "Use this to immediately revoke all refresh tokens and sign out of all devices."}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  safetyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  safetyText: { fontSize: 12, color: "#065f46", flex: 1, lineHeight: 17 },
  sectionWrap: { marginBottom: 20 },
  sectionHeading: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 14, fontWeight: "700" },
  currentBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  timeText: { fontSize: 11, marginTop: 2 },
  activeNowText: { fontSize: 11, color: "#16a34a", fontWeight: "600", marginTop: 3 },
  revokeBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  revokeBtnText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13 },
  masterLogoutBtn: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  masterLogoutText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  masterDesc: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
});
