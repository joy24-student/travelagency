/**
 * Supabase Client Configuration & Zero-Trust Session Management
 *
 * Hardened Architecture:
 * 1. Singleton Pattern: Thread-safe, race-condition-free Supabase client instance.
 * 2. Concurrency Lock: Anti-race-condition lock for token refresh during concurrent API bursts.
 * 3. Network Interceptor: Logs sanitized network errors in dev mode without leaking PII in production.
 * 4. Encrypted Storage: Hardware-backed expo-secure-store adapter with async mutex.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform, AppState, AppStateStatus } from "react-native";
import {
  createSecureStoreAdapter,
  withTokenRefreshLock,
} from "../services/secureStorage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (process.env.NODE_ENV === "test" ? "https://placeholder.supabase.co" : "");
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  (process.env.NODE_ENV === "test" ? "placeholder-anon-key" : "");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment configuration! Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are defined in your .env file."
  );
}

// ============================================================================
// PII & CREDENTIAL SANITIZATION INTERCEPTOR
// ============================================================================

const SENSITIVE_FIELD_REGEX =
  /(password|access_token|refresh_token|secret|token|api_key|apiKey|passport|national_id|nid|card_number|cvv|phone|email)/i;

/**
 * Strips PII and sensitive credentials from objects before logging
 */
function sanitizePayload(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return sanitizePayload(parsed);
    } catch {
      if (SENSITIVE_FIELD_REGEX.test(data)) {
        return "[REDACTED_SENSITIVE_DATA]";
      }
      return data;
    }
  }

  if (Array.isArray(data)) {
    return data.map(sanitizePayload);
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_REGEX.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof val === "object" && val !== null) {
        sanitized[key] = sanitizePayload(val);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Sanitizes URLs to remove sensitive query parameters
 */
function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_FIELD_REGEX.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return urlString.split("?")[0];
  }
}

const isDev =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV !== "production";

/**
 * Custom Fetch Interceptor:
 * Logs network errors in dev mode without leaking PII in production.
 */
const hardenedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as any)?.url || "";
  const method = init?.method || "GET";
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutMs = 12000;
  let didTimeout = false;
  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const fetchInit: RequestInit = {
    ...init,
    signal: init?.signal || controller.signal,
  };

  try {
    const response = await fetch(input, fetchInit);
    clearTimeout(timeoutId);

    // If an unexpected server error occurred (5xx) or unauthorized (401)
    if (!response.ok && response.status >= 400) {
      if (isDev) {
        try {
          const cloned = response.clone();
          const errorBody = await cloned.json().catch(() => null);
          console.warn("[Supabase Dev Network Interceptor]", {
            status: response.status,
            method,
            endpoint: sanitizeUrl(url),
            durationMs: Date.now() - startTime,
            sanitizedError: sanitizePayload(errorBody),
          });
        } catch {
          console.warn("[Supabase Dev Network Interceptor]", {
            status: response.status,
            method,
            endpoint: sanitizeUrl(url),
            durationMs: Date.now() - startTime,
          });
        }
      }
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (didTimeout || error?.name === "AbortError") {
      throw new Error("নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?");
    }

    if (isDev) {
      console.error("[Supabase Dev Network Error]", {
        method,
        endpoint: sanitizeUrl(url),
        durationMs: Date.now() - startTime,
        message: error?.message || "Network request failed",
        code: error?.code,
      });
    }
    throw error;
  }
};

// ============================================================================
// SINGLETON SUPABASE CLIENT
// ============================================================================

class SupabaseClientManager {
  private static instance: SupabaseClient | null = null;

  public static getInstance(): SupabaseClient {
    if (!SupabaseClientManager.instance) {
      const storageAdapter = createSecureStoreAdapter();

      SupabaseClientManager.instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: storageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // Prevent token leakage via URL fragments in mobile
        },
        global: {
          fetch: hardenedFetch,
        },
      });
    }

    return SupabaseClientManager.instance;
  }
}

export const supabase: SupabaseClient = SupabaseClientManager.getInstance();

// ============================================================================
// ANTI-RACE-CONDITION TOKEN REFRESH
// ============================================================================

/**
 * Safe, synchronized session refresh with anti-race-condition lock.
 * Ensures overlapping requests never trigger multiple parallel refresh calls.
 */
export const safeRefreshSession = async (): Promise<{ data: any; error: any }> => {
  return withTokenRefreshLock(async () => {
    try {
      const result = await supabase.auth.refreshSession();
      return result;
    } catch {
      return {
        data: { session: null, user: null },
        error: { message: "Failed to refresh session securely" },
      };
    }
  });
};

/**
 * Automatic token refresh scheduler
 * Proactively refreshes JWT 5 minutes before expiration with mutex protection
 */
export const setupTokenRefreshInterceptor = () => {
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  const scheduleRefresh = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return;
      }

      const { expires_at } = session;
      if (!expires_at) return;

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = expires_at - now;

      // Schedule refresh 5 minutes (300s) before expiry, min 5 seconds
      const refreshDelayMs = Math.max((expiresIn - 300) * 1000, 5000);

      if (refreshTimeout) clearTimeout(refreshTimeout);

      refreshTimeout = setTimeout(async () => {
        try {
          const { error: refreshError } = await safeRefreshSession();
          if (!refreshError) {
            scheduleRefresh();
          }
        } catch {
          // Retry in 30 seconds if refresh failed
          if (refreshTimeout) clearTimeout(refreshTimeout);
          refreshTimeout = setTimeout(scheduleRefresh, 30000);
        }
      }, refreshDelayMs);
    } catch {
      // Catch schedule refresh errors safely
    }
  };

  // Listen to auth state changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
      scheduleRefresh();
    } else if (event === "SIGNED_OUT") {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    }
  });

  // Proactively refresh session whenever the app comes back to the foreground
  const appStateSub = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") {
      safeRefreshSession().catch(() => {});
    }
  });

  // Initial schedule run
  scheduleRefresh();

  return () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (subscription) subscription.unsubscribe();
    appStateSub.remove();
  };
};

/**
 * Get current user securely
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return null;
    return user;
  } catch {
    return null;
  }
};

/**
 * Get current session securely
 */
export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

export default supabase;
