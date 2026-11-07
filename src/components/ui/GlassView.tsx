import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import { BlurView, BlurViewProps } from "expo-blur";
import { useTheme } from "../../context/ThemeContext";

export interface GlassViewProps {
  children?: React.ReactNode;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  borderWidth?: number;
  testID?: string;
}

/**
 * High-Performance Cross-Platform Glassmorphism (Frosted Glass) Surface:
 * - iOS: Uses native Expo BlurView for crisp Apple-grade backdrop blur
 * - Android: Gracefully falls back to high-performance translucent tinted surface
 *   with subtle border, eliminating Android GPU overdraw and severe blur lag
 * - Web: Uses hardware-accelerated CSS backdrop-filter: blur(16px)
 */
export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 24,
  tint,
  style,
  borderRadius = 16,
  borderWidth = StyleSheet.hairlineWidth,
  testID,
}) => {
  let themeContext: { isDark?: boolean; isOled?: boolean } = {};
  try {
    themeContext = useTheme();
  } catch {
    // Fallback if rendered outside ThemeProvider (e.g. submodules)
    themeContext = { isDark: false };
  }

  const isDark =
    tint === "dark" || (tint === undefined && (themeContext.isDark || themeContext.isOled));

  const resolvedTint = tint || (isDark ? "dark" : "light");

  // Web implementation using CSS backdrop-filter
  if (Platform.OS === "web") {
    const webGlassStyle: ViewStyle | any = {
      backgroundColor: isDark
        ? `rgba(15, 23, 42, ${Math.min(0.85, 0.4 + intensity * 0.01)})`
        : `rgba(255, 255, 255, ${Math.min(0.9, 0.5 + intensity * 0.01)})`,
      backdropFilter: `blur(${Math.max(8, intensity * 0.6)}px)`,
      WebkitBackdropFilter: `blur(${Math.max(8, intensity * 0.6)}px)`,
      borderRadius,
      borderWidth,
      borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.6)",
      overflow: "hidden",
    };

    return (
      <View testID={testID} style={[webGlassStyle, style]}>
        {children}
      </View>
    );
  }

  // Android implementation: Avoid expo-blur on Android to eliminate severe scroll frame drops and GPU lag
  if (Platform.OS === "android") {
    const androidGlassStyle: ViewStyle = {
      backgroundColor: isDark
        ? `rgba(15, 23, 42, ${Math.min(0.92, 0.75 + intensity * 0.005)})`
        : `rgba(255, 255, 255, ${Math.min(0.94, 0.82 + intensity * 0.004)})`,
      borderRadius,
      borderWidth,
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
    };

    return (
      <View testID={testID} style={[androidGlassStyle, style]}>
        {children}
      </View>
    );
  }

  // iOS native BlurView implementation
  return (
    <BlurView
      testID={testID}
      intensity={intensity}
      tint={resolvedTint}
      style={[
        {
          borderRadius,
          borderWidth,
          borderColor: isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.5)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

export default GlassView;
