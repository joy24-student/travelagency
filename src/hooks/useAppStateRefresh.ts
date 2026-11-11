/**
 * useAppStateRefresh Hook
 *
 * Automatically triggers silent data revalidation when user returns to the app from background.
 * Ensures booking status, real-time ticket availability, and dynamic prices are never stale.
 */

import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { networkStatusService } from "../services/network/networkStatusService";

export interface AppStateRefreshOptions {
  /** Minimum elapsed milliseconds before triggering a refresh (default: 15000ms = 15s) */
  minIntervalMs?: number;
  /** Whether the listener is currently active */
  enabled?: boolean;
}

export function useAppStateRefresh(
  onRefresh: (options: { silent: boolean }) => void | Promise<void>,
  options: AppStateRefreshOptions = {}
): void {
  const { minIntervalMs = 15000, enabled = true } = options;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRefreshRef = useRef<number>(Date.now());
  const callbackRef = useRef(onRefresh);

  // Keep callback reference fresh without causing re-subscribes
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // When transitioning from background or inactive into active
      if (
        (prev === "background" || prev === "inactive") &&
        nextAppState === "active"
      ) {
        const now = Date.now();
        if (now - lastRefreshRef.current >= minIntervalMs) {
          lastRefreshRef.current = now;

          // Only refresh if network is currently available
          if (networkStatusService.isOnline()) {
            try {
              callbackRef.current({ silent: true });
            } catch (err) {
              console.warn("[useAppStateRefresh] Error running silent refresh:", err);
            }
          }
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    // Web visibility change fallback
    let webVisibilityHandler: (() => void) | null = null;
    if (Platform.OS === "web" && typeof document !== "undefined") {
      webVisibilityHandler = () => {
        if (document.visibilityState === "visible") {
          const now = Date.now();
          if (now - lastRefreshRef.current >= minIntervalMs) {
            lastRefreshRef.current = now;
            if (networkStatusService.isOnline()) {
              callbackRef.current({ silent: true });
            }
          }
        }
      };
      document.addEventListener("visibilitychange", webVisibilityHandler);
    }

    return () => {
      sub.remove();
      if (webVisibilityHandler && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", webVisibilityHandler);
      }
    };
  }, [enabled, minIntervalMs]);
}
