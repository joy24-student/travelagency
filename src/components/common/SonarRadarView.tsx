import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Pressable,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

export interface RadarNode {
  id: string;
  name: string;
  avatar: string;
  rating?: number;
  distanceKm?: number;
  specialty?: string;
  angle: number; // In degrees: 0 to 360
  radiusFraction: number; // 0.3 to 0.95
}

export interface SonarRadarViewProps {
  nodes: RadarNode[];
  selectedNodeId?: string;
  onSelectNode: (node: RadarNode) => void;
  onConnectPress?: (node: RadarNode) => void;
  centerLabel?: string;
  scanningText?: string;
}

export const SonarRadarView: React.FC<SonarRadarViewProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onConnectPress,
  centerLabel = "You",
  scanningText = "Scanning nearby...",
}) => {
  const { colors, isDark } = useTheme();

  // Animation for radar beam rotation & concentric pulse
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [activeNode, setActiveNode] = useState<RadarNode | null>(
    nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null
  );

  useEffect(() => {
    // 1. Continuous rotation for scan beam
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Continuous pulse for concentric waves
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.7, 0.3, 0],
  });

  const centerCoord = RADAR_SIZE / 2;

  return (
    <View style={styles.container}>
      {/* Radar Disc */}
      <View
        style={[
          styles.radarFrame,
          {
            width: RADAR_SIZE,
            height: RADAR_SIZE,
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          },
        ]}
      >
        {/* Concentric Rings */}
        {[0.35, 0.65, 0.95].map((scale, i) => (
          <View
            key={`ring-${i}`}
            style={[
              styles.concentricRing,
              {
                width: RADAR_SIZE * scale,
                height: RADAR_SIZE * scale,
                borderColor: isDark
                  ? "rgba(40, 125, 250, 0.25)"
                  : "rgba(40, 125, 250, 0.18)",
              },
            ]}
          />
        ))}

        {/* Pulsing wave ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: RADAR_SIZE,
              height: RADAR_SIZE,
              borderColor: colors.primary,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Sweeping Beam */}
        <Animated.View
          style={[
            styles.sweepBeam,
            {
              width: RADAR_SIZE,
              height: RADAR_SIZE,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View
            style={[
              styles.beamQuarter,
              {
                backgroundColor: isDark
                  ? "rgba(40, 125, 250, 0.15)"
                  : "rgba(40, 125, 250, 0.10)",
              },
            ]}
          />
        </Animated.View>

        {/* Center Node (You) */}
        <View
          style={[
            styles.centerNode,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="navigate" size={14} color="#FFFFFF" />
          <Text style={styles.centerNodeText}>{centerLabel}</Text>
        </View>

        {/* Floating Node Avatars */}
        {nodes.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const radius = (RADAR_SIZE / 2) * node.radiusFraction;
          const x = centerCoord + radius * Math.cos(rad) - 20;
          const y = centerCoord + radius * Math.sin(rad) - 20;

          const isSelected = activeNode?.id === node.id;

          return (
            <Pressable
              key={node.id}
              style={[
                styles.nodeAvatarWrap,
                {
                  left: x,
                  top: y,
                  borderColor: isSelected ? colors.primary : "#FFFFFF",
                  borderWidth: isSelected ? 2.5 : 1.5,
                  transform: [{ scale: isSelected ? 1.15 : 1 }],
                },
              ]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setActiveNode(node);
                onSelectNode(node);
              }}
            >
              <Image source={{ uri: node.avatar }} style={styles.nodeAvatar} />
              {isSelected && (
                <View
                  style={[
                    styles.nodeOnlineDot,
                    { backgroundColor: "#10B981" },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected Node Card / Preview Callout */}
      {activeNode ? (
        <View
          style={[
            styles.calloutCard,
            {
              backgroundColor: isDark ? colors.card : "#FFFFFF",
              borderColor: colors.border,
            },
          ]}
        >
          <Image
            source={{ uri: activeNode.avatar }}
            style={styles.calloutAvatar}
          />
          <View style={styles.calloutDetails}>
            <View style={styles.nameRatingRow}>
              <Text style={[styles.calloutName, { color: colors.text }]}>
                {activeNode.name}
              </Text>
              {activeNode.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {activeNode.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.calloutSub, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {activeNode.specialty ||
                (activeNode.distanceKm
                  ? `${activeNode.distanceKm} km away`
                  : "Certified Local Guide")}
            </Text>
          </View>

          <Pressable
            style={[styles.connectBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (Platform.OS !== "web") {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
              }
              onConnectPress?.(activeNode);
            }}
          >
            <Text style={styles.connectBtnText}>Connect</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.scanText, { color: colors.textSecondary }]}>
          {scanningText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
  },
  radarFrame: {
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  concentricRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  pulseRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sweepBeam: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  beamQuarter: {
    position: "absolute",
    top: 0,
    right: 0,
    width: RADAR_SIZE / 2,
    height: RADAR_SIZE / 2,
    borderTopRightRadius: RADAR_SIZE / 2,
  },
  centerNode: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    zIndex: 20,
  },
  centerNodeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1,
  },
  nodeAvatarWrap: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "visible",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 25,
  },
  nodeAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  nodeOnlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  calloutCard: {
    flexDirection: "row",
    alignItems: "center",
    width: "92%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calloutAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  calloutDetails: {
    flex: 1,
  },
  nameRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  calloutSub: {
    fontSize: 12,
    marginTop: 2,
  },
  connectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  connectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scanText: {
    fontSize: 12,
    marginTop: 14,
  },
});

export default SonarRadarView;
