import React from "react";
import { Platform } from "react-native";
import { StatusBar, StatusBarProps } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";

export interface AppStatusBarProps extends StatusBarProps {
  /**
   * Explicit style override: "light" | "dark" | "auto" | "inverted"
   * If omitted, dynamically adapts to active Theme (light, dark, oled).
   */
  style?: "auto" | "inverted" | "light" | "dark";
  backgroundColor?: string;
  translucent?: boolean;
}

/**
 * FocusAwareStatusBar
 * - Synchronizes StatusBar style with React Navigation screen focus lifecycle
 * - Automatically derives contrast-safe icon colors (light icons for dark headers, dark icons for light headers)
 * - Restores correct status bar appearance upon back-navigation, preventing invisible clock/battery indicators
 */
export const FocusAwareStatusBar: React.FC<AppStatusBarProps> = ({
  style,
  backgroundColor,
  translucent = true,
  ...props
}) => {
  let isFocused = true;
  try {
    isFocused = useIsFocused();
  } catch {
    // If rendered outside NavigationContainer (e.g. root or tests), default to true
    isFocused = true;
  }

  const { isDark, isOled, colors } = useTheme();

  if (!isFocused) {
    return null;
  }

  // Derive status bar style based on override or theme
  const resolvedStyle =
    style ?? (isDark || isOled ? "light" : "dark");

  const resolvedBg =
    backgroundColor ??
    (Platform.OS === "android"
      ? translucent
        ? "transparent"
        : isOled
        ? "#000000"
        : isDark
        ? "#0f172a"
        : "#ffffff"
      : undefined);

  return (
    <StatusBar
      style={resolvedStyle}
      backgroundColor={resolvedBg}
      translucent={translucent}
      {...props}
    />
  );
};

export const AppStatusBar = FocusAwareStatusBar;
export default FocusAwareStatusBar;
