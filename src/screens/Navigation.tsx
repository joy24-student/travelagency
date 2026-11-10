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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "../theme";
import { FONTS } from "../theme/typography";
import { useLanguage } from "../context/LanguageContext";
import { AudioMiniBar } from "../components/audio/AudioMiniBar";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";

// ─── Tab Config Matching Reference Screenshots & Clean Expo Router Paths ─────
export const TABS = [
  { label: "Home", name: "index", icon: "home" as const, outlineIcon: "home-outline" as const, route: "/(tabs)" },
  {
    label: "Messages",
    name: "messages",
    icon: "mail" as const,
    outlineIcon: "mail-outline" as const,
    route: "/(tabs)/messages",
  },
  {
    label: "Community",
    name: "community",
    icon: "people" as const,
    outlineIcon: "people-outline" as const,
    route: "/(tabs)/community",
  },
  {
    label: "My Trips",
    name: "trips",
    icon: "briefcase" as const,
    outlineIcon: "briefcase-outline" as const,
    route: "/(tabs)/trips",
  },
  {
    label: "Account",
    name: "account",
    icon: "person-circle" as const,
    outlineIcon: "person-circle-outline" as const,
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
    case "Account":
      return t("nav.account", "Account");
    case "Sign In":
      return t("nav.signIn", "Sign In");
    case "account":
      return t("nav.account", "Account");
    case "Back to top":
      return t("nav.backToTop", "Back to top");
    default:
      return t(label, label);
  }
}

// ─── Floating AI Assistant Pill with Gold Mic Button ────────────────────────
export function AiPill({ color, extraBottomOffset = 0 }: { color?: string; extraBottomOffset?: number }) {
  const { theme, isDark } = useTheme();
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
    () => insets.bottom + 66 + extraBottomOffset,
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
      <View style={styles.aiRow}>
        {/* Main Pill Button */}
        <Pressable
          style={({ pressed }) => [
            styles.aiPillContainer,
            {
              backgroundColor: isDark ? "rgba(24, 28, 38, 0.95)" : "#FFFFFF",
              borderColor: isDark ? "rgba(229, 169, 60, 0.35)" : "#EAD9C2",
              shadowColor: isDark ? "#000000" : "#D4A03D",
            },
            pressed && styles.aiPillPressed,
          ]}
          onPress={() => router.push("/screens/trip-planner" as any)}
        >
          {/* Subtle audio waveform in light mode */}
          {!isDark && (
            <View style={styles.waveformContainer}>
              <View style={[styles.waveBar, { height: 10, backgroundColor: "#E5B252" }]} />
              <View style={[styles.waveBar, { height: 16, backgroundColor: "#D4A03D" }]} />
              <View style={[styles.waveBar, { height: 12, backgroundColor: "#E5B252" }]} />
              <View style={[styles.waveBar, { height: 7, backgroundColor: "#FDE68A" }]} />
            </View>
          )}

          {/* Robot AI Icon */}
          <View
            style={[
              styles.aiRobotBadge,
              {
                backgroundColor: isDark ? "rgba(229, 169, 60, 0.2)" : "#FEF3C7",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="robot"
              size={16}
              color={theme.gold}
            />
          </View>
          <Text
            style={[
              styles.aiText,
              { color: isDark ? "#F8FAFC" : "#1E293B" },
            ]}
          >
            Ask AI or hold to speak
          </Text>
        </Pressable>

        {/* Circular Gold Microphone Button */}
        <Pressable
          style={({ pressed }) => [
            styles.aiMicBtn,
            pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
          ]}
          onPress={() => router.push("/screens/trip-planner" as any)}
        >
          <LinearGradient
            colors={theme.goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiMicGradient}
          >
            <Ionicons name="mic" size={20} color="#18181B" />
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Official Custom Bottom Tab Bar for React Navigation / Expo Router ────────
export function CustomBottomTabBar(props: BottomTabBarProps) {
  const [isAudioMiniBarVisible, setIsAudioMiniBarVisible] = useState(false);
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

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

  const activeColor = theme.gold;
  const inactiveColor = theme.navInactive;

  return (
    <>
      <AiPill extraBottomOffset={isAudioMiniBarVisible ? 58 : 0} />
      <View
        style={[
          styles.navContainer,
          { backgroundColor: theme.navBg, borderTopColor: theme.navBorder },
        ]}
      >
        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: theme.navBg,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            },
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
                  icon: "ellipse" as const,
                  outlineIcon: "ellipse-outline" as const,
                  route: `/(tabs)/${route.name}` as any,
                };

              const accountLabel = isAuthenticated ? "Account" : "Sign In";
              const rawLabel = options?.title ?? (route.name === "account" ? accountLabel : tabConfig.label);
              const displayLabel = getLocalizedTabLabel(t, rawLabel);
              const badge = route.name === "messages"
                ? (options?.tabBarBadge ?? (unreadCount > 0 ? unreadCount : undefined))
                : options?.tabBarBadge;

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
                        name={isFocused ? tabConfig.icon : tabConfig.outlineIcon}
                        size={22}
                        color={isFocused ? activeColor : inactiveColor}
                      />
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
                          color: isFocused ? activeColor : inactiveColor,
                          fontWeight: isFocused ? "700" : "500",
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

                    {/* Prominent Gold Underline Bar for Active Tab */}
                    {isFocused ? (
                      <View style={[styles.activeUnderlineBar, { backgroundColor: activeColor }]} />
                    ) : (
                      <View style={styles.activeUnderlinePlaceholder} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </>
  );
}

// ─── Standalone Bottom Navigation Bar Matching Reference Screenshots ────────
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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const activeColor = color || theme.gold;

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: theme.navBg,
          borderTopColor: theme.navBorder,
        },
      ]}
    >
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            backgroundColor: theme.navBg,
          },
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
                activeColor={activeColor}
                inactiveColor={theme.navInactive}
                isDark={isDark}
                isScrolled={isScrolled}
                onScrollToTop={onScrollToTop}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Individual Tab Item with Gold Active Indicator Underneath ───────────────
interface TabItemProps {
  tab: (typeof TABS)[number];
  selected: boolean;
  activeColor: string;
  inactiveColor: string;
  isDark: boolean;
  isScrolled?: boolean;
  onScrollToTop?: () => void;
}

function TabItem({
  tab,
  selected,
  activeColor,
  inactiveColor,
  isDark,
  isScrolled,
  onScrollToTop,
}: TabItemProps) {
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
    <Pressable style={styles.bottomItem} onPress={handlePress} hitSlop={6}>
      <View style={styles.tabContentCenter}>
        {isScrolledActive ? (
          <View style={[styles.backToTopCircle, { backgroundColor: activeColor }]}>
            <Ionicons name="arrow-up" size={16} color="#18181B" />
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons
              name={selected ? tab.icon : tab.outlineIcon}
              size={22}
              color={selected ? activeColor : inactiveColor}
            />
          </View>
        )}

        <Text
          style={[
            styles.bottomLabel,
            {
              color: selected ? activeColor : inactiveColor,
              fontWeight: selected ? "700" : "500",
            },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>

        {/* Prominent Gold Underline Bar for Active Tab (as seen in screenshots) */}
        {selected && !isScrolledActive ? (
          <View style={[styles.activeUnderlineBar, { backgroundColor: activeColor }]} />
        ) : (
          <View style={styles.activeUnderlinePlaceholder} />
        )}
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
    paddingHorizontal: 16,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  aiPillContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  aiPillPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginRight: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
  },
  aiRobotBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  aiText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
    flex: 1,
  },
  aiMicBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#E5A93C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  aiMicGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  navContainer: {
    left: 0,
    right: 0,
    bottom: 0,
    position: "absolute",
    zIndex: 999,
    borderTopWidth: 1,
  },
  bottomNav: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  tabWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 54,
    width: "100%",
    paddingHorizontal: 4,
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
    gap: 3,
    position: "relative",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  bottomLabel: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  activeUnderlineBar: {
    width: 24,
    height: 2.5,
    borderRadius: 2,
    marginTop: 1,
  },
  activeUnderlinePlaceholder: {
    width: 24,
    height: 2.5,
    marginTop: 1,
  },
});
