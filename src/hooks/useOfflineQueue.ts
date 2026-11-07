import { useState, useEffect, useCallback } from "react";
import { offlineQueueService, OfflineAction } from "../services/offline/offlineQueueService";

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineAction[]>(() => offlineQueueService.getQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineQueueService.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const pendingCount = queue.filter(
    (a) => a.status === "pending" || a.status === "failed"
  ).length;

  const enqueue = useCallback(
    async (type: string, payload: any, title?: string) => {
      return await offlineQueueService.enqueue(type, payload, title);
    },
    []
  );

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      return await offlineQueueService.syncQueue();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await offlineQueueService.remove(id);
  }, []);

  const clear = useCallback(async () => {
    await offlineQueueService.clear();
  }, []);

  return {
    queue,
    pendingCount,
    isSyncing,
    enqueue,
    syncNow,
    remove,
    clear,
  };
}
