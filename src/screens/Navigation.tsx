import React, { useEffect, useRef, useMemo } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Tab Config Matching Reference Screenshots & Clean Expo Router Paths ─────
const TABS = [
  { label: "Home", icon: "home-outline" as const, route: "/" },
  {
    label: "Messages",
    icon: "mail-outline" as const,
    route: "/messages",
  },
  {
    label: "Community",
    icon: "people-outline" as const,
    route: "/community",
  },
  {
    label: "My Trips",
    icon: "briefcase-outline" as const,
    route: "/trips",
  },
  {
    label: "Sign In",
    icon: "person-circle-outline" as const,
    route: "/account",
  },
] as const;

// ─── Floating AI Assistant Pill ───────────────────────────────────────────────
export function AiPill({ color }: { color: string }) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const aiPillBottom = useMemo(
    () => insets.bottom + 68,
    [insets.bottom]
  );

  return (
    <Animated.View
      style={[
        styles.aiWrap,
        {
          bottom: aiPillBottom,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={({ pressed }) => [
          styles.aiPillContainer,
          pressed && styles.aiPillPressed,
        ]}
        onPress={() => router.push("/(screens)/ai-assistant" as any)}
      >
        <LinearGradient
          colors={["#E0F2FE", "#FFFFFF", "#EFF6FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradientBg}
        >
          {/* Robot AI Icon */}
          <View style={styles.aiRobotBadge}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color="#0055F2" />
          </View>
          <Text style={styles.aiText}>Ask AI or hold to speak</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Bottom Navigation Bar ───────────────────────────────────────────────────
export function BottomNav({
  active,
  color,
  isScrolled,
  onScrollToTop,
}: {
  active: string;
  color: string;
  isScrolled?: boolean;
  onScrollToTop?: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabWidth = (width - 16) / TABS.length;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const index = TABS.findIndex((tab) => tab.label === active);
    if (index !== -1) {
      Animated.spring(translateX, {
        toValue: index * tabWidth,
        useNativeDriver: true,
        friction: 10,
        tension: 60,
      }).start();
    }
  }, [active, tabWidth]);

  return (
    <View style={styles.navContainer}>
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 4 }]}>
        <View style={styles.tabWrapper}>
          {TABS.map((tab) => {
            const selected = tab.label === active;
            return (
              <TabItem
                key={tab.label}
                tab={tab}
                selected={selected}
                color={color}
                isScrolled={isScrolled}
                onScrollToTop={onScrollToTop}
              />
            );
          })}
        </View>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

// ─── Individual Tab Item with Morphing Back to Top Logic ─────────────────────
interface TabItemProps {
  tab: (typeof TABS)[number];
  selected: boolean;
  color: string;
  isScrolled?: boolean;
  onScrollToTop?: () => void;
}

function TabItem({ tab, selected, color, isScrolled, onScrollToTop }: TabItemProps) {
  const isHomeTab = tab.label === "Home";
  const isScrolledActive = selected && isScrolled;

  const displayLabel = isScrolledActive ? "Back to top" : tab.label;

  const handlePress = () => {
    if (isScrolledActive && onScrollToTop) {
      onScrollToTop();
    } else {
      router.push(tab.route as any);
    }
  };

  return (
    <Pressable style={styles.bottomItem} onPress={handlePress} hitSlop={8}>
      <View style={styles.tabContentCenter}>
        {isScrolledActive ? (
          // Orange / Yellow circle arrow button for "Back to top" (Screenshot 2)
          <View style={styles.backToTopCircle}>
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons
              name={tab.icon}
              size={22}
              color={selected ? color : "#64748B"}
            />
            {isHomeTab && selected && (
              <View style={styles.homeYellowRoofDot} />
            )}
          </View>
        )}

        <Text
          style={[
            styles.bottomLabel,
            {
              color: isScrolledActive ? "#0055F2" : selected ? color : "#64748B",
              fontWeight: selected || isScrolledActive ? "800" : "500",
            },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aiWrap: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1000,
  },
  aiPillContainer: {
    borderRadius: 999,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    overflow: "hidden",
  },
  aiPillPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  aiGradientBg: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  aiRobotBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  aiText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  navContainer: {
    left: 0,
    right: 0,
    bottom: 0,
    position: "absolute",
    zIndex: 999,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  bottomNav: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  tabWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 56,
    width: "100%",
    paddingHorizontal: 8,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabContentCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  homeYellowRoofDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FACC15",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  backToTopCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EAB308",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EAB308",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomLabel: {
    fontSize: 10,
    textAlign: "center",
  },
  homeIndicator: {
    height: 4,
    backgroundColor: "#D1D5DB",
    width: "36%",
    alignSelf: "center",
    marginBottom: 4,
    borderRadius: 2,
  },
});
