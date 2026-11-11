/**
 * useAuth Hook
 * Custom React hook to access authentication context, enhanced with
 * resilient SWR caching, 12s slow network timeout, and silent AppState active revalidation.
 */

import { useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { AuthContext, AuthContextType } from "../auth/context";
import { withNetworkTimeout } from "../utils/networkTimeout";
import { swrCacheService } from "../services/cache/swrCacheService";
import { networkStatusService } from "../services/network/networkStatusService";

/**
 * Hook for accessing auth context
 * Provides all auth functions and state
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

/**
 * Hook for checking if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * Hook for getting current user
 */
export const useCurrentUser = () => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook for loading state
 */
export const useAuthLoading = (): boolean => {
  const { loading } = useAuth();
  return loading;
};

export interface UseQueryOptions {
  enabled?: boolean;
  cacheKey?: string;
  timeoutMs?: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  minFocusIntervalMs?: number;
}

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  isCached: boolean;
  refetch: (silent?: boolean) => Promise<void>;
}

/**
 * Enhanced useQuery hook with Stale-While-Revalidate caching,
 * 12s timeout, network auto-reconnect refresh, and AppState active silent refresh.
 */
export const useQuery = <T,>(
  queryFn: () => Promise<T>,
  deps: any[] = [],
  options?: UseQueryOptions
): UseQueryResult<T> => {
  const {
    enabled = true,
    cacheKey,
    timeoutMs = 12000,
    refetchOnFocus = true,
    refetchOnReconnect = true,
    minFocusIntervalMs = 20000,
  } = options || {};

  const [data, setData] = useState<T | null>(() => {
    if (cacheKey) {
      return swrCacheService.getMemory<T>(cacheKey);
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (cacheKey && swrCacheService.getMemory<T>(cacheKey) !== null) {
      return false; // Stale data ready immediately
    }
    return enabled;
  });

  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);

  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(
    async (silent = false) => {
      if (enabled === false) return;

      // 1. If cacheKey provided and we don't have data yet, try reading from disk cache
      if (cacheKey && data === null) {
        try {
          const cached = await swrCacheService.get<T>(cacheKey);
          if (cached !== null) {
            setData(cached);
            setIsCached(true);
            setIsStale(true);
            if (!silent) setLoading(false);
          }
        } catch {}
      }

      if (!silent && (data === null || !cacheKey)) {
        setLoading(true);
      }
      setError(null);

      try {
        // Enforce 10–15s network timeout with informative error
        const result = await withNetworkTimeout(
          queryFnRef.current(),
          timeoutMs,
          "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?"
        );

        setData(result);
        setIsStale(false);
        setIsCached(false);
        lastFetchRef.current = Date.now();

        // Update persistent & memory cache
        if (cacheKey && result !== undefined && result !== null) {
          swrCacheService.set(cacheKey, result).catch(() => {});
        }
      } catch (err: any) {
        const normalized = err instanceof Error ? err : new Error(String(err));

        // If we already have cached data, don't obliterate the UI; mark as stale
        if (data !== null) {
          setIsStale(true);
          console.warn("[useQuery] Background revalidation failed; showing cached data:", normalized.message);
        } else {
          setError(normalized);
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled, cacheKey, timeoutMs, data]
  );

  useEffect(() => {
    if (enabled === false) return;
    fetchData(false);
  }, deps);

  // Auto-refresh when internet connectivity is restored
  useEffect(() => {
    if (!refetchOnReconnect || enabled === false) return;

    const unsub = networkStatusService.onReconnect(() => {
      fetchData(true);
    });

    return () => unsub();
  }, [refetchOnReconnect, enabled, fetchData]);

  // Silent refresh when AppState transitions to active
  useEffect(() => {
    if (!refetchOnFocus || enabled === false) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        const elapsed = Date.now() - lastFetchRef.current;
        if (elapsed >= minFocusIntervalMs && networkStatusService.isOnline()) {
          fetchData(true);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [refetchOnFocus, enabled, minFocusIntervalMs, fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    isCached,
    refetch: fetchData,
  };
};

/**
 * Simple useMutation hook for data mutations
 */
export const useMutation = <T, V>(
  mutationFn: (variables: V) => Promise<T>
): {
  mutate: (variables: V) => Promise<void>;
  loading: boolean;
  error: Error | null;
  data: T | null;
} => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (variables: V) => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(variables);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, data };
};

/**
 * Simple useRealtimeSubscription hook for Supabase realtime
 */
export const useRealtimeSubscription = <T,>(
  channel: string,
  event: string,
  callback: (payload: T) => void
): { unsubscribe: () => void } => {
  useEffect(() => {
    const unsubscribe = () => {};
    return unsubscribe;
  }, [channel, event]);

  return {
    unsubscribe: () => {},
  };
};
