import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
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
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";
import { useLanguage } from "../context/LanguageContext";
import { AudioMiniBar } from "../components/audio/AudioMiniBar";

// ─── Tab Config Matching Reference Screenshots & Clean Expo Router Paths ─────
export const TABS = [
  { label: "Home", name: "index", icon: "home-outline" as const, route: "/(tabs)" },
  {
    label: "Messages",
    name: "messages",
    icon: "mail-outline" as const,
    route: "/(tabs)/messages",
  },
  {
    label: "Community",
    name: "community",
    icon: "people-outline" as const,
    route: "/(tabs)/community",
  },
  {
    label: "My Trips",
    name: "trips",
    icon: "briefcase-outline" as const,
    route: "/(tabs)/trips",
  },
  {
    label: "Sign In",
    name: "account",
    icon: "person-circle-outline" as const,
    route: "/(tabs)/account",
  },
] as const;

export function getLocalizedTabLabel(t: (k: string, d?: string) => string, label: string): string {
  switch (label) {
    case "Home":
    case "index":
      return t("nav.home", "Home");
    case "Messages":
    case "messages":
      return t("nav.messages", "Messages");
    case "Community":
    case "community":
      return t("nav.community", "Community");
    case "My Trips":
    case "trips":
      return t("nav.trips", "My Trips");
    case "Sign In":
    case "account":
      return t("nav.account", "Sign In");
    case "Back to top":
      return t("nav.backToTop", "Back to top");
    default:
      return t(label, label);
  }
}

// ─── Floating AI Assistant Pill ───────────────────────────────────────────────
export function AiPill({ color, extraBottomOffset = 0 }: { color: string; extraBottomOffset?: number }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
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
    () => insets.bottom + 68 + extraBottomOffset,
    [insets.bottom, extraBottomOffset]
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
          {
            borderColor: isDark ? colors.borderStrong : "#93C5FD",
            shadowColor: colors.primary,
          },
          pressed && styles.aiPillPressed,
        ]}
        onPress={() => router.push("/screens/trip-planner" as any)}
      >
        <LinearGradient
          colors={
            isDark
              ? [colors.card, colors.surface, colors.background]
              : ["#E0F2FE", "#FFFFFF", "#EFF6FF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradientBg}
        >
          {/* Robot AI Icon */}
          <View
            style={[
              styles.aiRobotBadge,
              { backgroundColor: isDark ? colors.border : "#DBEAFE" },
            ]}
          >
            <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.aiText,
              { color: colors.text, fontFamily: FONTS.bengali.bold },
            ]}
            numberOfLines={1}
          >
            {t("nav.askAi", "Ask AI or hold to speak")}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ─── Official Custom Bottom Tab Bar for React Navigation / Expo Router ────────
export function CustomBottomTabBar(props: BottomTabBarProps) {
  const [isAudioMiniBarVisible, setIsAudioMiniBarVisible] = useState(false);
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { state, descriptors, navigation, insets } = props;
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options;

  // 1. Hide on deep screen if tabBarStyle has display: "none"
  const tabBarStyle = currentOptions?.tabBarStyle as any;
  if (tabBarStyle?.display === "none") {
    return null;
  }

  // 2. Keyboard visibility awareness: automatically hide when keyboard is shown
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible && currentOptions?.tabBarHideOnKeyboard !== false) {
    return null;
  }

  // Visible routes only (ignore routes with href: null)
  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as any;
    return options?.href !== null;
  });

  return (
    <>
      <AiPill color={colors.primary} extraBottomOffset={isAudioMiniBarVisible ? 58 : 0} />
      <View
        style={[
          styles.navContainer,
          { backgroundColor: colors.tabBarBg, borderTopColor: colors.tabBarBorder },
        ]}
      >
        <View
          style={[
            styles.bottomNav,
            { backgroundColor: colors.tabBarBg, paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <View style={styles.tabWrapper}>
            {visibleRoutes.map((route) => {
              const routeIndex = state.routes.indexOf(route);
              const isFocused = state.index === routeIndex;
              const options = descriptors[route.key]?.options;

              // Find tab configuration or match by name
              const tabConfig =
                TABS.find((t) => t.name === route.name) || {
                  label: options?.title ?? route.name,
                  name: route.name,
                  icon: "ellipse-outline" as const,
                  route: `/(tabs)/${route.name}` as any,
                };

              const rawLabel = options?.title ?? tabConfig.label;
              const displayLabel = getLocalizedTabLabel(t, rawLabel);
              const badge = options?.tabBarBadge;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              const isHomeTab = tabConfig.name === "index" || tabConfig.label === "Home";

              return (
                <Pressable
                  key={route.key}
                  style={styles.bottomItem}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options?.tabBarAccessibilityLabel ?? displayLabel}
                  hitSlop={8}
                >
                  <View style={styles.tabContentCenter}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name={tabConfig.icon}
                        size={22}
                        color={isFocused ? colors.primary : colors.textMuted}
                      />
                      {isHomeTab && isFocused && (
                        <View
                          style={[
                            styles.homeYellowRoofDot,
                            { borderColor: colors.tabBarBg },
                          ]}
                        />
                      )}
                      {badge != null && (
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>
                            {typeof badge === "number" && badge > 99 ? "99+" : String(badge)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.bottomLabel,
                        {
                          color: isFocused ? colors.primary : colors.textMuted,
                          fontWeight: isFocused ? "800" : "500",
                          fontFamily: FONTS.bengali.medium,
                          fontSize: 12,
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {displayLabel}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </>
  );
}

// ─── Legacy Bottom Navigation Bar for Direct In-Screen Standalone Usage ───────
export function BottomNav({
  active,
  color,
  isScrolled,
  onScrollToTop,
}: {
  active: string;
  color?: string;
  isScrolled?: boolean;
  onScrollToTop?: () => void;
}) {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;
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
    <View
      style={[
        styles.navContainer,
        { backgroundColor: colors.tabBarBg, borderTopColor: colors.tabBarBorder },
      ]}
    >
      <View
        style={[
          styles.bottomNav,
          { backgroundColor: colors.tabBarBg, paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <View style={styles.tabWrapper}>
          {TABS.map((tab) => {
            const selected = tab.label === active;
            return (
              <TabItem
                key={tab.label}
                tab={tab}
                selected={selected}
                color={activeColor}
                isScrolled={isScrolled}
                onScrollToTop={onScrollToTop}
              />
            );
          })}
        </View>
        <View
          style={[
            styles.homeIndicator,
            { backgroundColor: colors.borderStrong },
          ]}
        />
      </View>
    </View>
  );
}

// ─── Individual Tab Item with Morphing Back to Top Logic ─────────────────────
interface TabItemProps {
  key?: React.Key;
  tab: any;
  selected: boolean;
  color: string;
  isScrolled?: boolean;
  onScrollToTop?: () => void;
}

function TabItem({ tab, selected, color, isScrolled, onScrollToTop }: TabItemProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const isHomeTab = tab.label === "Home";
  const isScrolledActive = selected && isScrolled;
  const rawLabel = isScrolledActive ? "Back to top" : tab.label;
  const displayLabel = getLocalizedTabLabel(t, rawLabel);

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
          <View style={[styles.backToTopCircle, { backgroundColor: colors.accent }]}>
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons
              name={tab.icon}
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
            {isHomeTab && selected && (
              <View
                style={[
                  styles.homeYellowRoofDot,
                  { borderColor: colors.tabBarBg },
                ]}
              />
            )}
          </View>
        )}

        <Text
          style={[
            styles.bottomLabel,
            {
              color: isScrolledActive ? colors.primary : selected ? colors.primary : colors.textMuted,
              fontWeight: selected || isScrolledActive ? "800" : "500",
              fontFamily: FONTS.bengali.medium,
              fontSize: 12,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.18)" } : {}),
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
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.3)" } : {}),
  },
  bottomLabel: {
    fontSize: 12,
    lineHeight: 14,
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
