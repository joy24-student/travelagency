import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL;

const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing required Supabase environment configuration for Agency Portal! Please define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment."
  );
}

/**
 * Hardware-backed secure storage for Agency Portal
 * Enforces Keychain accessibility WHEN_UNLOCKED_THIS_DEVICE_ONLY on iOS
 * and EncryptedSharedPreferences on Android.
 */
const secureAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        return typeof window !== "undefined" && window.sessionStorage
          ? window.sessionStorage.getItem(key)
          : null;
      }
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Avoid leaking token in logs
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Ignored
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: secureAuthStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Anti-race condition lock for agency token refresh
let agencyRefreshPromise: Promise<any> | null = null;

export const safeAgencyTokenRefresh = async () => {
  if (agencyRefreshPromise) {
    return agencyRefreshPromise;
  }
  agencyRefreshPromise = (async () => {
    try {
      return await supabase.auth.refreshSession();
    } finally {
      agencyRefreshPromise = null;
    }
  })();
  return agencyRefreshPromise;
};

// API URL for direct requests
export const API_URL = `${supabaseUrl}/rest/v1`;
export const API_KEY = supabaseKey;
