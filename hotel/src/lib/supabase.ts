import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://htkpmrfhoijznigwimwj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_L-imfE-H1FnYefIOH6_cdQ_nOO2PImv';

/**
 * Hardened hotel staff auth storage using expo-secure-store
 * Enforces WHEN_UNLOCKED_THIS_DEVICE_ONLY on iOS and EncryptedSharedPreferences on Android.
 */
const hotelSecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' && window.sessionStorage
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
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Suppress token leakage
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.sessionStorage) {
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: hotelSecureStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Mutex lock for hotel staff token refresh
let hotelRefreshPromise: Promise<any> | null = null;
export const safeHotelTokenRefresh = async () => {
  if (hotelRefreshPromise) {
    return hotelRefreshPromise;
  }
  hotelRefreshPromise = (async () => {
    try {
      return await supabase.auth.refreshSession();
    } finally {
      hotelRefreshPromise = null;
    }
  })();
  return hotelRefreshPromise;
};
