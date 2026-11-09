import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeColors, lightTokens, darkTokens } from "./tokens";

const SETTINGS_STORAGE_KEY = "@user_app_settings_v1";

interface ThemeContextType {
  isDark: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true, // Default to dark mode as requested by user reference
  theme: darkTokens,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    // Load persisted theme preference
    async function loadTheme() {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.darkTheme !== undefined) {
            setIsDark(Boolean(parsed.darkTheme));
          }
        }
      } catch (e) {
        // Fallback to default dark
      }
    }
    loadTheme();
  }, []);

  const setThemeMode = async (dark: boolean) => {
    setIsDark(dark);
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.darkTheme = dark;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      // Ignore
    }
  };

  const toggleTheme = () => {
    setThemeMode(!isDark);
  };

  const theme = isDark ? darkTokens : lightTokens;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
