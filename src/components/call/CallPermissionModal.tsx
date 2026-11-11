import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useCameraPermissions } from "expo-camera";
import { Audio } from "../../utils/media/expoMedia";
import { FONTS } from "../../theme/typography";
import { useTheme } from "../../context/ThemeContext";

export interface CallPermissionModalProps {
  visible: boolean;
  callType?: "audio" | "video";
  onGranted: () => void;
  onDenied: () => void;
}

export function CallPermissionModal({
  visible,
  callType = "audio",
  onGranted,
  onDenied,
}: CallPermissionModalProps) {
  const { colors, isDark } = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isVideo = callType === "video";

  // Pre-check permissions on modal open
  useEffect(() => {
    if (visible) {
      checkInitialStatus();
    }
  }, [visible, isVideo]);

  const checkInitialStatus = async () => {
    try {
      const micStatus = await Audio.checkMicrophonePermissionAsync();
      const camGranted = isVideo ? cameraPermission?.granted ?? false : true;

      if (micStatus.granted && camGranted) {
        onGranted();
      }
    } catch (err) {
      console.warn("[CallPermission] Check status error:", err);
    }
  };

  const handleRequestPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRequesting(true);

    try {
      // 1. Request Microphone permission
      const micResult = await Audio.requestMicrophonePermissionAsync();

      // 2. Request Camera permission if it is a video call
      let camGranted = true;
      if (isVideo) {
        const camResult = await requestCameraPermission();
        camGranted = camResult.granted;
      }

      if (micResult.granted && camGranted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onGranted();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (!micResult.canAskAgain) {
          setIsBlocked(true);
        } else {
          onDenied();
        }
      }
    } catch (err) {
      console.error("[CallPermission] Request failed:", err);
      onDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn("Unable to open settings:", err);
    }
    onDenied();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDenied}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0",
            },
          ]}
        >
          {/* Header Icon Pill */}
          <LinearGradient
            colors={["#0055F2", "#2563EB"]}
            style={styles.headerIconCircle}
          >
            <Ionicons
              name={isVideo ? "videocam" : "mic"}
              size={28}
              color="#ffffff"
            />
          </LinearGradient>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: isDark ? "#f8fafc" : "#0f172a" },
            ]}
          >
            {isVideo
              ? "ভিডিও কলের জন্য অনুমতি প্রয়োজন"
              : "ভয়েস কলের জন্য অনুমতি প্রয়োজন"}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: isDark ? "#94a3b8" : "#64748b" },
            ]}
          >
            কল পরিচালনার জন্য অ্যাপটিকে প্রয়োজনীয় অডিও ও ডিভাইসের অনুমতি দিন।
          </Text>

          {/* Explanatory Feature Cards */}
          <View style={styles.featuresList}>
            {/* Microphone Permission */}
            <View
              style={[
                styles.featureItem,
                { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
              ]}
            >
              <View style={styles.featureIconWrap}>
                <Ionicons name="mic-outline" size={20} color="#0055F2" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? "#f1f5f9" : "#1e293b" },
                  ]}
                >
                  মাইক্রোফোন অনুমতি (অপরিহার্য)
                </Text>
                <Text
                  style={[
                    styles.featureDesc,
                    { color: isDark ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  ভ্রমণ গাইড, ট্যুর অপারেটর বা সাপোর্টের সাথে স্পষ্ট কথা বলতে মাইক্রোফোন অ্যাক্সেস প্রয়োজন।
                </Text>
              </View>
            </View>

            {/* Camera Permission (if video call) */}
            {isVideo && (
              <View
                style={[
                  styles.featureItem,
                  { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
                ]}
              >
                <View style={styles.featureIconWrap}>
                  <Ionicons name="camera-outline" size={20} color="#0055F2" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isDark ? "#f1f5f9" : "#1e293b" },
                    ]}
                  >
                    ক্যামেরা অনুমতি
                  </Text>
                  <Text
                    style={[
                      styles.featureDesc,
                      { color: isDark ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    ভিডিও কলের মাধ্যমে লাইভ দৃশ্য এবং নির্দেশিকা দেখার জন্য ক্যামেরা সক্রিয় করুন।
                  </Text>
                </View>
              </View>
            )}

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNoteRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text
                style={[
                  styles.privacyNoteText,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                আপনার গোপনীয়তা সুরক্ষিত — কোনো অডিও বা ভিডিও রেকর্ড বা সংরক্ষণ করা হয় না।
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsCol}>
            {isBlocked ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleOpenSettings}
                activeOpacity={0.88}
              >
                <Ionicons name="settings-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>ডিভাইস সেটিংস খুলুন</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRequestPermissions}
                disabled={isRequesting}
                activeOpacity={0.88}
              >
                {isRequesting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>অনুমতি দিন ও কল শুরু করুন</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Pressable
              style={styles.cancelBtn}
              onPress={onDenied}
              disabled={isRequesting}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
              >
                এখনই নয় / বাতিল
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.3)" } : {}),
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 10px rgba(15, 23, 42, 0.35)" } : {}),
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bengali.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.bengali.regular,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  featuresList: {
    width: "100%",
    gap: 10,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 85, 242, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: FONTS.bengali.bold,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: FONTS.bengali.regular,
    lineHeight: 15,
  },
  privacyNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.bengali.medium,
    lineHeight: 14,
  },
  actionButtonsCol: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#0055F2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: FONTS.bengali.bold,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bengali.medium,
  },
});
