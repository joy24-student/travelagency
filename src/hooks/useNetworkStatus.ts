import { useState, useEffect } from "react";
import { networkStatusService, NetworkStatus } from "../services/network/networkStatusService";

export function useNetworkStatus(): NetworkStatus & { refresh: () => Promise<NetworkStatus> } {
  const [status, setStatus] = useState<NetworkStatus>(() => networkStatusService.getStatus());

  useEffect(() => {
    const unsubscribe = networkStatusService.subscribe((nextStatus) => {
      setStatus(nextStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    refresh: () => networkStatusService.refresh(),
  };
}
