import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface MatchConnectedModalProps {
  visible: boolean;
  onClose: () => void;
  myAvatar?: string;
  myName?: string;
  companionAvatar: string;
  companionName: string;
  matchScore?: number;
  destination?: string;
  commonVibe?: string;
  onStartChat?: () => void;
  onViewLocation?: () => void;
}

export const MatchConnectedModal: React.FC<MatchConnectedModalProps> = ({
  visible,
  onClose,
  myAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
  myName = "You",
  companionAvatar,
  companionName,
  matchScore = 94,
  destination = "Sajek Valley",
  commonVibe = "Adventure & Photography",
  onStartChat,
  onViewLocation,
}) => {
  const { colors, isDark } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const planeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }

      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      planeAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(planeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacityAnim, planeAnim, scaleAnim]);

  if (!visible) return null;

  const planeTranslateX = planeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  const planeTranslateY = planeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [10, -25, 5],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
              borderColor: colors.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </Pressable>

          {/* Subtitle Badge */}
          <View
            style={[
              styles.matchPill,
              { backgroundColor: "rgba(16, 185, 129, 0.15)" },
            ]}
          >
            <Ionicons name="sparkles" size={13} color="#10B981" />
            <Text style={styles.matchPillText}>{matchScore}% Travel Match</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Connected!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You and {companionName} share the same travel vision for {destination}
          </Text>

          {/* Visual Overlapping Avatars & Flight Trajectory */}
          <View style={styles.avatarsWrapper}>
            {/* Trajectory Plane Animation */}
            <Animated.View
              style={[
                styles.airplaneIconWrap,
                {
                  transform: [
                    { translateX: planeTranslateX },
                    { translateY: planeTranslateY },
                    { rotate: "45deg" },
                  ],
                },
              ]}
            >
              <Ionicons name="airplane" size={24} color="#0055F2" />
            </Animated.View>

            {/* User 1 Circle Backdrop */}
            <View style={[styles.circleBackdrop, styles.myCircleBg]}>
              <Image source={{ uri: myAvatar }} style={styles.avatarImage} />
              <View style={styles.nameTag}>
                <Text style={styles.nameTagText}>{myName}</Text>
              </View>
            </View>

            {/* Overlap Linking Pill */}
            <View style={styles.linkPill}>
              <Ionicons name="link" size={16} color="#FFFFFF" />
            </View>

            {/* User 2 Circle Backdrop */}
            <View style={[styles.circleBackdrop, styles.companionCircleBg]}>
              <Image
                source={{ uri: companionAvatar }}
                style={styles.avatarImage}
              />
              <View style={styles.nameTag}>
                <Text style={styles.nameTagText} numberOfLines={1}>
                  {companionName.split(" ")[0]}
                </Text>
              </View>
            </View>
          </View>

          {/* Mutual Travel Vibe Callout */}
          <View
            style={[
              styles.vibeCard,
              {
                backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="compass" size={18} color="#E5A93C" />
            <Text style={[styles.vibeText, { color: colors.text }]}>
              Mutual Travel Vibe:{" "}
              <Text style={{ fontWeight: "700" }}>{commonVibe}</Text>
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            {onViewLocation && (
              <Pressable
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    borderColor: colors.border,
                  },
                ]}
                onPress={onViewLocation}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.text}
                />
                <Text
                  style={[styles.secondaryBtnText, { color: colors.text }]}
                >
                  See Route
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                onClose();
                onStartChat?.();
              }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.primaryBtnText}>Start Chat</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    position: "relative",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  matchPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  avatarsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 140,
    width: "100%",
    marginBottom: 16,
  },
  airplaneIconWrap: {
    position: "absolute",
    top: 6,
    zIndex: 15,
  },
  circleBackdrop: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    position: "relative",
  },
  myCircleBg: {
    backgroundColor: "#60A5FA",
    marginRight: -16,
    zIndex: 5,
  },
  companionCircleBg: {
    backgroundColor: "#FBBF24",
    marginLeft: -16,
    zIndex: 4,
  },
  avatarImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  nameTag: {
    position: "absolute",
    bottom: -8,
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 80,
  },
  nameTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  linkPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1E293B",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 6,
  },
  vibeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    marginBottom: 20,
  },
  vibeText: {
    fontSize: 12,
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    elevation: 2,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default MatchConnectedModal;
