import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as Network from "expo-network";
import { Platform } from "react-native";

export interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean;
  networkType: Network.NetworkStateType | null;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  networkType: null,
  checkConnectivity: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<Network.NetworkStateType | null>(null);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? connected;
      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setNetworkType(state.type ?? null);
      return connected && reachable;
    } catch {
      // Fallback on error
      return true;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let intervalId: any = null;

    checkConnectivity();

    // Regular connectivity polling (every 8s on native, every 10s on web)
    intervalId = setInterval(() => {
      if (mounted) checkConnectivity();
    }, Platform.OS === "web" ? 10000 : 8000);

    // Web offline/online event listeners
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => {
        setIsConnected(true);
        setIsInternetReachable(true);
      };
      const handleOffline = () => {
        setIsConnected(false);
        setIsInternetReachable(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        mounted = false;
        clearInterval(intervalId);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [checkConnectivity]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        networkType,
        checkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
