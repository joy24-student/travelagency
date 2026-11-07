import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

export type ThemeMode = "system" | "light" | "dark" | "oled";
export type LanguageCode = "en" | "bn" | "ar" | "hi";
export type CurrencyCode = "BDT" | "USD" | "EUR" | "INR" | "GBP" | "SAR";

export interface NotificationPreferences {
  pushEnabled: boolean;
  bookingUpdates: boolean;
  priceAlerts: boolean;
  tripUpdates: boolean;
  promoOffers: boolean;
  communityActivity: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
}

export function isQuietHourActive(
  start = "22:00",
  end = "07:00"
): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = (startH || 22) * 60 + (startM || 0);
  const endMinutes = (endH || 7) * 60 + (endM || 0);

  if (startMinutes > endMinutes) {
    // Crosses midnight: e.g. 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export interface SecuritySettings {
  biometricLockEnabled: boolean;
  requireAuthOnPayment: boolean;
  twoFactorEnabled: boolean;
}

export interface AccessibilitySettings {
  hapticFeedbackEnabled: boolean;
  largeTextEnabled: boolean;
}

export interface OfflineSettings {
  downloadOverWifiOnly: boolean;
  autoDownloadVouchers: boolean;
  dataSaverMode: boolean;
}

export interface SettingsState {
  themeMode: ThemeMode;
  language: LanguageCode;
  currency: CurrencyCode;
  notifications: NotificationPreferences;
  security: SecuritySettings;
  accessibility: AccessibilitySettings;
  offline: OfflineSettings;
  dataSaverMode: boolean;
  isHydrated: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setDataSaverMode: (enabled: boolean) => void;
  updateNotificationPreference: (
    key: keyof NotificationPreferences,
    value: boolean | string
  ) => void;
  toggleBiometric: (enabled: boolean) => void;
  updateSecurityPreference: (
    key: keyof SecuritySettings,
    value: boolean
  ) => void;
  updateAccessibilityPreference: (
    key: keyof AccessibilitySettings,
    value: boolean
  ) => void;
  updateOfflinePreference: (key: keyof OfflineSettings, value: boolean) => void;
  clearAppCache: () => Promise<void>;
  setHydrated: (hydrated: boolean) => void;
}

// Universal Secure Storage Adapter
const universalStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(name);
        }
      } catch (err) {
        console.warn("[settingsStore] Web localStorage read error:", err);
      }
      return null;
    }

    try {
      return await SecureStore.getItemAsync(name);
    } catch (err) {
      console.warn("[settingsStore] SecureStore getItem error:", err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(name, value);
        }
      } catch (err) {
        console.warn("[settingsStore] Web localStorage write error:", err);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(name, value);
    } catch (err) {
      console.warn("[settingsStore] SecureStore setItem error:", err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(name);
        }
      } catch (err) {
        console.warn("[settingsStore] Web localStorage remove error:", err);
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(name);
    } catch (err) {
      console.warn("[settingsStore] SecureStore deleteItem error:", err);
    }
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "system",
      language: "en",
      currency: "BDT",
      notifications: {
        pushEnabled: true,
        bookingUpdates: true,
        priceAlerts: true,
        tripUpdates: true,
        promoOffers: false,
        communityActivity: true,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      },
      security: {
        biometricLockEnabled: false,
        requireAuthOnPayment: true,
        twoFactorEnabled: false,
      },
      accessibility: {
        hapticFeedbackEnabled: true,
        largeTextEnabled: false,
      },
      offline: {
        downloadOverWifiOnly: true,
        autoDownloadVouchers: true,
        dataSaverMode: false,
      },
      dataSaverMode: false,
      isHydrated: false,

      setThemeMode: (themeMode: ThemeMode) => set({ themeMode }),

      setLanguage: (language: LanguageCode) => set({ language }),

      setCurrency: (currency: CurrencyCode) => set({ currency }),

      setDataSaverMode: (dataSaverMode: boolean) =>
        set((state) => ({
          dataSaverMode,
          offline: {
            ...state.offline,
            dataSaverMode,
          },
        })),

      updateNotificationPreference: (key, value) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        })),

      toggleBiometric: (enabled: boolean) =>
        set((state) => ({
          security: {
            ...state.security,
            biometricLockEnabled: enabled,
          },
        })),

      updateSecurityPreference: (key, value) =>
        set((state) => ({
          security: {
            ...state.security,
            [key]: value,
          },
        })),

      updateAccessibilityPreference: (key, value) =>
        set((state) => ({
          accessibility: {
            ...state.accessibility,
            [key]: value,
          },
        })),

      updateOfflinePreference: (key, value) =>
        set((state) => {
          const nextOffline = {
            ...state.offline,
            [key]: value,
          };
          return {
            offline: nextOffline,
            dataSaverMode:
              key === "dataSaverMode" ? Boolean(value) : state.dataSaverMode,
          };
        }),

      clearAppCache: async () => {
        try {
          if (Platform.OS !== "web") {
            if (FileSystem.Paths?.cache) {
              try {
                const items = FileSystem.Paths.cache.list();
                for (const item of items) {
                  try {
                    item.delete();
                  } catch {
                    // Ignore deletion error for busy file
                  }
                }
              } catch {
                // Ignore directory list error
              }
            } else if ((FileSystem as any).cacheDirectory) {
              const cacheDir = (FileSystem as any).cacheDirectory;
              const files = await (FileSystem as any).readDirectoryAsync(
                cacheDir
              );
              await Promise.all(
                files.map(async (file: string) => {
                  try {
                    await (FileSystem as any).deleteAsync(
                      `${cacheDir}${file}`,
                      { idempotent: true }
                    );
                  } catch {
                    // Ignore deletion error
                  }
                })
              );
            }
          }
        } catch (err) {
          console.warn("[settingsStore] clearAppCache error:", err);
        }
      },

      setHydrated: (isHydrated: boolean) => set({ isHydrated }),
    }),
    {
      name: "@travel_app_unified_settings_v2",
      storage: createJSONStorage(() => universalStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export const useDataSaver = (): boolean =>
  useSettingsStore(
    (state) => state.dataSaverMode || state.offline?.dataSaverMode || false
  );
