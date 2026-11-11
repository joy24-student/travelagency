/**
 * Zustand Storage Engine with SecureStore & Async Caching
 * Provides thread-safe, encrypted persistence adapters for Zustand stores.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";
import {
  deleteSecureItem,
  getSecureItem,
  setSecureItem,
} from "../services/secureStorage";

/**
 * Hardware-backed encrypted storage adapter for sensitive state (Auth, tokens, credentials).
 */
export const secureStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await getSecureItem(`zustand_sec_${name}`);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await setSecureItem(`zustand_sec_${name}`, value);
    } catch {
      // Handled silently without leaking data
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await deleteSecureItem(`zustand_sec_${name}`);
    } catch {
      // Non-critical
    }
  },
};

/**
 * High-performance storage adapter for non-sensitive cached state
 * (Search filters, checkout drafts, notifications).
 */
export const cachedStateStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(`zustand_cache_${name}`);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(`zustand_cache_${name}`, value);
    } catch {
      // Non-critical
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(`zustand_cache_${name}`);
    } catch {
      // Non-critical
    }
  },
};
