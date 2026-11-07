import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { showLocalizedAlert } from "../../utils/localizedAlert";
import {
  deviceSessionService,
  DeviceSession,
} from "../../services/deviceSessionService";

interface ActiveDevicesModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ActiveDevicesModal({
  visible,
  onClose,
}: ActiveDevicesModalProps) {
  const { language, t } = useLanguage();
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
    if (visible) {
      loadSessions();
    }
  }, [visible, user?.id]);

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

  const handleRevokeOthers = () => {
    showLocalizedAlert(
      isBn ? "অন্য সব ডিভাইস থেকে লগআউট" : "Log out Other Devices",
      isBn
        ? "বর্তমান ডিভাইস ছাড়া অন্য সব ডিভাইস থেকে আপনার অ্যাকাউন্ট লগআউট করা হবে। আপনি কি নিশ্চিত?"
        : "You will be signed out from all devices except this one. Continue?",
      [
        { text: isBn ? "বাতিল" : "Cancel", style: "cancel" },
        {
          text: isBn ? "সব অন্য ডিভাইস লগআউট" : "Sign Out Others",
          style: "destructive",
          onPress: async () => {
            try {
              setRevokingAll(true);
              await deviceSessionService.revokeAllOtherSessions(
                user?.id || ""
              );
              setSessions((prev) => prev.filter((s) => s.isCurrentDevice));
              showLocalizedAlert(
                isBn ? "সফল" : "Success",
                isBn
                  ? "অন্য সব ডিভাইস থেকে সফলভাবে লগআউট করা হয়েছে।"
                  : "All other sessions were logged out successfully."
              );
            } catch {
              showLocalizedAlert(
                isBn ? "ত্রুটি" : "Error",
                isBn ? "লগআউট ব্যর্থ হয়েছে।" : "Failed to log out others."
              );
            } finally {
              setRevokingAll(false);
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
              onClose();
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

  const otherSessions = sessions.filter((s) => !s.isCurrentDevice);
  const currentSession = sessions.find((s) => s.isCurrentDevice);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconBox}>
                <Ionicons name="hardware-chip" size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  {isBn ? "লগইন করা ডিভাইস" : "Logged-in Devices"}
                </Text>
                <Text style={[styles.subtitle, { color: colors.subtext }]}>
                  {isBn
                    ? "সক্রিয় সেশন ও দূরবর্তী লগআউট নিয়ন্ত্রণ"
                    : "Active sessions and remote revocation"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                {isBn ? "ডিভাইস তালিকা লোড হচ্ছে..." : "Loading active devices..."}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollList}
              showsVerticalScrollIndicator={false}
            >
              {/* Lost Phone Security Banner */}
              <View style={styles.safetyNoticeBox}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.safetyNoticeText}>
                  {isBn
                    ? "ফোন হারিয়ে গেলে বা সন্দেহজনক মনে হলে নিচ থেকে 'সব জায়গা থেকে লগআউট' চাপুন।"
                    : "Lost your phone? Tap 'Log out from all devices' below to protect your account."}
                </Text>
              </View>

              {/* Current Device Card */}
              {currentSession && (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
                    {isBn ? "এই ডিভাইস (সক্রিয়)" : "THIS DEVICE (ACTIVE)"}
                  </Text>
                  <View
                    style={[
                      styles.deviceCard,
                      styles.currentDeviceCard,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f0fdf4",
                        borderColor: isDark ? "#059669" : "#86efac",
                      },
                    ]}
                  >
                    <View style={styles.deviceRow}>
                      <View style={[styles.deviceIconBox, { backgroundColor: "#dcfce7" }]}>
                        <Ionicons
                          name={getDeviceIcon(
                            currentSession.platform,
                            currentSession.deviceName
                          )}
                          size={22}
                          color="#16a34a"
                        />
                      </View>
                      <View style={styles.deviceInfo}>
                        <View style={styles.nameBadgeRow}>
                          <Text
                            style={[styles.deviceName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {currentSession.deviceName}
                          </Text>
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              {isBn ? "বর্তমান" : "Current"}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.deviceMeta, { color: colors.subtext }]}>
                          {currentSession.osVersion} • {currentSession.location}
                        </Text>
                        <View style={styles.liveBadgeRow}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveText}>
                            {isBn ? "এখনই সক্রিয়" : "Active now"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Other Logged-In Devices */}
              <View style={styles.sectionWrap}>
                <View style={styles.otherSectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
                    {isBn ? "অন্যান্য ডিভাইস" : "OTHER LOGGED-IN DEVICES"} (
                    {otherSessions.length})
                  </Text>
                  {otherSessions.length > 0 && (
                    <TouchableOpacity
                      onPress={handleRevokeOthers}
                      disabled={revokingAll}
                    >
                      <Text style={styles.revokeOthersLink}>
                        {isBn ? "অন্য সব লগআউট" : "Log out all others"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {otherSessions.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={28}
                      color="#94a3b8"
                    />
                    <Text style={[styles.emptyText, { color: colors.subtext }]}>
                      {isBn
                        ? "অন্য কোনো ডিভাইসে লগইন নেই"
                        : "No other active sessions detected"}
                    </Text>
                  </View>
                ) : (
                  otherSessions.map((session) => (
                    <View
                      key={session.id}
                      style={[
                        styles.deviceCard,
                        {
                          backgroundColor: isDark ? "#1e293b" : "#ffffff",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.deviceRow}>
                        <View
                          style={[
                            styles.deviceIconBox,
                            { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
                          ]}
                        >
                          <Ionicons
                            name={getDeviceIcon(
                              session.platform,
                              session.deviceName
                            )}
                            size={22}
                            color="#64748b"
                          />
                        </View>
                        <View style={styles.deviceInfo}>
                          <Text
                            style={[styles.deviceName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {session.deviceName}
                          </Text>
                          <Text
                            style={[styles.deviceMeta, { color: colors.subtext }]}
                          >
                            {session.osVersion} • {session.location}
                          </Text>
                          <Text style={[styles.timeMeta, { color: colors.subtext }]}>
                            {isBn ? "সর্বশেষ সক্রিয়: " : "Last active: "}
                            {new Date(session.lastActiveAt).toLocaleDateString()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleRevokeSingle(session)}
                          disabled={revokingId === session.id}
                          style={styles.revokeBtn}
                        >
                          {revokingId === session.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <Text style={styles.revokeBtnText}>
                              {isBn ? "লগআউট" : "Revoke"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Master Danger Action: Log out from all devices */}
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
                    <Text style={styles.masterLogoutBtnText}>
                      {isBn
                        ? "সব জায়গা থেকে লগআউট"
                        : "Log Out From All Devices"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.masterLogoutDesc}>
                {isBn
                  ? "ফোন হারিয়ে গেলে দূর থেকে সমস্ত সেশন অবিলম্বে বাতিল করতে এটি ব্যবহার করুন।"
                  : "Revokes all refresh tokens and sessions everywhere if a device is lost or compromised."}
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  scrollList: {
    marginTop: 12,
  },
  safetyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  safetyNoticeText: {
    fontSize: 12,
    color: "#065f46",
    flex: 1,
    lineHeight: 16,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  otherSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  revokeOthersLink: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  deviceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  currentDeviceCard: {},
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  currentBadge: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "700",
  },
  deviceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  timeMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  liveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16a34a",
  },
  liveText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
  },
  revokeBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },
  emptyBox: {
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
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
  masterLogoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  masterLogoutDesc: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 16,
  },
});
