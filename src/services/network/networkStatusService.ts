/**
 * Network Status Service
 * Resilient, multi-platform connectivity monitor with offline-to-online transition detection.
 * Works seamlessly on React Native (iOS/Android via expo-network) and Web.
 */

import { Platform } from "react-native";
import * as Network from "expo-network";

export interface NetworkStatus {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: Network.NetworkStateType | string;
  isSlowConnection: boolean;
  lastChangedAt: number;
}

type NetworkListener = (status: NetworkStatus) => void;
type ReconnectListener = () => void;

class NetworkStatusService {
  private status: NetworkStatus = {
    isOnline: true,
    isInternetReachable: true,
    connectionType: Network.NetworkStateType.UNKNOWN,
    isSlowConnection: false,
    lastChangedAt: Date.now(),
  };

  private listeners: Set<NetworkListener> = new Set();
  private reconnectListeners: Set<ReconnectListener> = new Set();
  private initialized = false;
  private unsubscribeNative: (() => void) | null = null;
  private wasPreviouslyOffline = false;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (Platform.OS === "web") {
        this.initWebListeners();
      } else {
        await this.initNativeListeners();
      }
    } catch (err) {
      console.warn("[NetworkStatusService] Failed to initialize network observer:", err);
      // Fallback: assume online initially
      this.updateStatus(true, true, Network.NetworkStateType.UNKNOWN);
    }
  }

  private initWebListeners(): void {
    if (typeof window === "undefined") return;

    const updateWebStatus = () => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      const connection = (navigator as any)?.connection;
      const effectiveType = connection?.effectiveType || "4g";
      const isSlow = effectiveType === "2g" || effectiveType === "slow-2g";

      this.updateStatus(
        isOnline,
        isOnline,
        effectiveType,
        isSlow
      );
    };

    window.addEventListener("online", updateWebStatus);
    window.addEventListener("offline", updateWebStatus);

    // Initial check
    updateWebStatus();

    this.unsubscribeNative = () => {
      window.removeEventListener("online", updateWebStatus);
      window.removeEventListener("offline", updateWebStatus);
    };
  }

  private async initNativeListeners(): Promise<void> {
    try {
      const initial = await Network.getNetworkStateAsync();
      this.handleNativeState(initial);

      const subscription = Network.addNetworkStateListener((state) => {
        this.handleNativeState(state);
      });

      this.unsubscribeNative = () => {
        subscription.remove();
      };
    } catch (err) {
      console.warn("[NetworkStatusService] Native listener error, fallback to polling:", err);
      // Polling fallback every 6 seconds
      const interval = setInterval(async () => {
        try {
          const state = await Network.getNetworkStateAsync();
          this.handleNativeState(state);
        } catch {
          // ignore polling error
        }
      }, 6000);

      this.unsubscribeNative = () => clearInterval(interval);
    }
  }

  private handleNativeState(state: Network.NetworkState): void {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    const isSlow =
      state.type === Network.NetworkStateType.CELLULAR &&
      Boolean((state as any)?.cellularGeneration === "2g");

    this.updateStatus(
      isOnline,
      state.isInternetReachable ?? isOnline,
      state.type || Network.NetworkStateType.UNKNOWN,
      isSlow
    );
  }

  private updateStatus(
    isOnline: boolean,
    isInternetReachable: boolean | null,
    connectionType: string,
    isSlowConnection = false
  ): void {
    const prevOnline = this.status.isOnline;
    const now = Date.now();

    this.status = {
      isOnline,
      isInternetReachable,
      connectionType,
      isSlowConnection,
      lastChangedAt: now,
    };

    // Transition: offline -> online
    if (!prevOnline && isOnline) {
      this.wasPreviouslyOffline = true;
      this.notifyReconnect();
    }

    this.notifyListeners();
  }

  private notifyListeners(): void {
    const current = { ...this.status };
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error("[NetworkStatusService] Listener error:", err);
      }
    });
  }

  private notifyReconnect(): void {
    this.reconnectListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("[NetworkStatusService] Reconnect listener error:", err);
      }
    });
  }

  /**
   * Get synchronous snapshot of current network state
   */
  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Check whether device is currently online
   */
  public isOnline(): boolean {
    return this.status.isOnline;
  }

  /**
   * Subscribe to network state transitions
   */
  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.status });
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Register a callback triggered when device reconnects to internet
   */
  public onReconnect(callback: ReconnectListener): () => void {
    this.reconnectListeners.add(callback);
    return () => {
      this.reconnectListeners.delete(callback);
    };
  }

  /**
   * Force manual refresh of network state
   */
  public async refresh(): Promise<NetworkStatus> {
    try {
      if (Platform.OS === "web") {
        const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
        this.updateStatus(isOnline, isOnline, "web");
      } else {
        const state = await Network.getNetworkStateAsync();
        this.handleNativeState(state);
      }
    } catch {
      // keep current
    }
    return { ...this.status };
  }

  public destroy(): void {
    this.unsubscribeNative?.();
    this.listeners.clear();
    this.reconnectListeners.clear();
    this.initialized = false;
  }
}

export const networkStatusService = new NetworkStatusService();
