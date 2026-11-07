import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { Appearance, Platform } from "react-native";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import * as SystemUI from "expo-system-ui";
import { useSettingsStore, ThemeMode } from "../store/settingsStore";
import {
  SemanticThemeColors,
  lightSemanticColors,
  darkSemanticColors,
  oledSemanticColors,
} from "../theme/colors";

export type ThemeColors = SemanticThemeColors;

const LIGHT_COLORS = lightSemanticColors;
const DARK_COLORS = darkSemanticColors;
const OLED_COLORS = oledSemanticColors;

export interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  isOled: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { themeMode, setThemeMode, isHydrated } = useSettingsStore();
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();

  // Determine system appearance
  const systemScheme = Appearance.getColorScheme();

  // Resolved dark state
  const isDark = useMemo(() => {
    if (themeMode === "system") {
      return (colorScheme || systemScheme) === "dark";
    }
    return themeMode === "dark" || themeMode === "oled";
  }, [themeMode, colorScheme, systemScheme]);

  const isOled = themeMode === "oled";

  // Sync with NativeWind and document / SystemUI
  useEffect(() => {
    const targetScheme = isDark ? "dark" : "light";
    setColorScheme(themeMode === "system" ? "system" : targetScheme);

    // Synchronize Web document.documentElement
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        if (isOled) {
          root.classList.add("oled");
          root.style.backgroundColor = "#000000";
        } else {
          root.classList.remove("oled");
          root.style.backgroundColor = "#0f172a";
        }
      } else {
        root.classList.remove("dark");
        root.classList.remove("oled");
        root.style.backgroundColor = "#f8f9fa";
      }
    }

    // Synchronize Mobile Native SystemUI background color
    if (Platform.OS !== "web") {
      const bgColor = isOled ? "#000000" : isDark ? "#0f172a" : "#ffffff";
      SystemUI.setBackgroundColorAsync(bgColor).catch(() => {});
    }
  }, [themeMode, isDark, isOled, setColorScheme]);

  // Listen to appearance changes when in system mode
  useEffect(() => {
    if (themeMode !== "system") return;

    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      setColorScheme(newScheme === "dark" ? "dark" : "light");
    });

    return () => subscription.remove();
  }, [themeMode, setColorScheme]);

  const colors = useMemo(() => {
    if (isOled) return OLED_COLORS;
    if (isDark) return DARK_COLORS;
    return LIGHT_COLORS;
  }, [isDark, isOled]);

  const contextValue = useMemo(
    () => ({
      themeMode,
      isDark,
      isOled,
      colors,
      setThemeMode,
    }),
    [themeMode, isDark, isOled, colors, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

const DEFAULT_THEME_FALLBACK: ThemeContextType = {
  themeMode: "light",
  isDark: false,
  isOled: false,
  colors: LIGHT_COLORS,
  setThemeMode: () => {},
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return DEFAULT_THEME_FALLBACK;
  }
  return context;
};

export const useAppTheme = useTheme;

/**
 * Hook to generate dynamic StyleSheet styles that react to theme / dark mode changes.
 * Memoizes the style object based on current theme colors.
 */
export function useThemedStyles<T>(
  styleFactory: (colors: ThemeColors, isDark: boolean, isOled: boolean) => T
): T {
  const { colors, isDark, isOled } = useTheme();
  return useMemo(
    () => styleFactory(colors, isDark, isOled),
    [colors, isDark, isOled, styleFactory]
  );
}
