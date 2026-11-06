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

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  surface: string;
  accent: string;
  danger: string;
}

const LIGHT_COLORS: ThemeColors = {
  background: "#f8f9fa",
  card: "#ffffff",
  text: "#0f172a",
  subtext: "#64748b",
  border: "#e2e8f0",
  primary: "#287dfa",
  surface: "#f1f5f9",
  accent: "#fed65b",
  danger: "#ef4444",
};

const DARK_COLORS: ThemeColors = {
  background: "#0f172a",
  card: "#1e293b",
  text: "#f8fafc",
  subtext: "#94a3b8",
  border: "#334155",
  primary: "#3b82f6",
  surface: "#1e293b",
  accent: "#fed65b",
  danger: "#ef4444",
};

const OLED_COLORS: ThemeColors = {
  background: "#000000",
  card: "#0a0a0a",
  text: "#ffffff",
  subtext: "#a1a1aa",
  border: "#27272a",
  primary: "#3b82f6",
  surface: "#050505",
  accent: "#fed65b",
  danger: "#ef4444",
};

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

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
