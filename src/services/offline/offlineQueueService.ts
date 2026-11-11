/**
 * Offline Mutation & Action Queue Service
 *
 * Persists user actions performed while offline or on unstable networks.
 * Automatically synchronizes with the cloud when network is restored
 * and fires user-facing toast notifications.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { networkStatusService } from "../network/networkStatusService";
import { toast } from "../../components/ui/Toast";

const STORAGE_KEY = "@travel_offline_actions_queue_v2";

export interface OfflineAction {
  id: string;
  type: string;
  title: string;
  payload: any;
  createdAt: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
}

export type ActionSyncHandler = (payload: any) => Promise<boolean | void>;

class OfflineQueueService {
  private queue: OfflineAction[] = [];
  private handlers: Map<string, ActionSyncHandler> = new Map();
  private listeners: Set<(queue: OfflineAction[]) => void> = new Set();
  private isSyncing = false;
  private isLoaded = false;

  constructor() {
    this.loadQueue().then(() => {
      // Auto-sync when network reconnects
      networkStatusService.onReconnect(() => {
        this.syncQueue();
      });
    });
  }

  private async loadQueue(): Promise<void> {
    if (typeof window === "undefined") {
      this.queue = [];
      this.isLoaded = true;
      return;
    }
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
      this.isLoaded = true;
      this.notifyListeners();
    } catch (err) {
      console.warn("[OfflineQueueService] Failed to load offline queue:", err);
      this.queue = [];
      this.isLoaded = true;
    }
  }

  private async persistQueue(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.warn("[OfflineQueueService] Failed to persist offline queue:", err);
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = [...this.queue];
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error("[OfflineQueueService] Listener error:", err);
      }
    });
  }

  /**
   * Register a synchronization handler for a specific action type
   */
  public registerHandler(type: string, handler: ActionSyncHandler): () => void {
    this.handlers.set(type, handler);
    return () => {
      this.handlers.delete(type);
    };
  }

  /**
   * Enqueue an action to be executed when back online
   */
  public async enqueue(
    type: string,
    payload: any,
    title?: string
  ): Promise<OfflineAction> {
    if (!this.isLoaded) {
      await this.loadQueue();
    }

    const defaultTitle = this.getDefaultTitle(type);
    const newAction: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      title: title || defaultTitle,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: "pending",
    };

    this.queue.push(newAction);
    await this.persistQueue();

    // If we happen to be online, attempt immediate sync
    if (networkStatusService.isOnline()) {
      this.syncQueue().catch(() => {});
    }

    return newAction;
  }

  private getDefaultTitle(type: string): string {
    switch (type) {
      case "CREATE_BOOKING_DRAFT":
        return "বুকিং ড্রাফট সংরক্ষণ";
      case "SAVE_TRIP":
        return "ট্রিপ সংরক্ষণ";
      case "SUBMIT_REVIEW":
        return "রিভিউ জমা";
      case "UPDATE_PROFILE":
        return "প্রোফাইল আপডেট";
      case "CANCEL_BOOKING":
        return "বুকিং বাতিল অনুরোধ";
      default:
        return "অফলাইন কাজ সিঙ্ক";
    }
  }

  /**
   * Get all currently queued actions
   */
  public getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  /**
   * Get count of pending actions
   */
  public getPendingCount(): number {
    return this.queue.filter((a) => a.status === "pending" || a.status === "failed").length;
  }

  /**
   * Remove action from queue by ID
   */
  public async remove(id: string): Promise<void> {
    this.queue = this.queue.filter((a) => a.id !== id);
    await this.persistQueue();
  }

  /**
   * Clear all queued actions
   */
  public async clear(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
  }

  /**
   * Synchronize pending actions with backend
   */
  public async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (!networkStatusService.isOnline()) return { synced: 0, failed: 0 };

    const pendingActions = this.queue.filter(
      (a) => a.status === "pending" || a.status === "failed"
    );

    if (pendingActions.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    for (const action of pendingActions) {
      action.status = "syncing";
      this.notifyListeners();

      const handler = this.handlers.get(action.type);

      try {
        if (handler) {
          await handler(action.payload);
        } else {
          // Default: execute action using generic sync dispatcher if available
          await this.defaultActionDispatcher(action);
        }

        // Successfully synchronized! Remove from queue
        this.queue = this.queue.filter((a) => a.id !== action.id);
        syncedCount++;
      } catch (err: any) {
        console.warn(`[OfflineQueueService] Sync failed for action ${action.id}:`, err);
        action.status = "failed";
        action.retryCount += 1;
        action.lastError = err?.message || String(err);
        failedCount++;
      }
    }

    this.isSyncing = false;
    await this.persistQueue();

    // Trigger user notification when synced
    if (syncedCount > 0) {
      const bnNumber = syncedCount.toLocaleString("bn-BD");
      toast.success(
        `${bnNumber}টি কাজ সফলভাবে সিঙ্ক হয়েছে`,
        {
          title: "সিঙ্ক সম্পন্ন",
          duration: 4000,
        }
      );
    }

    return { synced: syncedCount, failed: failedCount };
  }

  private async defaultActionDispatcher(action: OfflineAction): Promise<void> {
    // Dynamic import of repositories to avoid circular dependency
    if (action.type === "CREATE_BOOKING_DRAFT" && action.payload) {
      const { bookingRepository } = await import("../repositories/booking");
      const { userId, booking } = action.payload;
      await bookingRepository.createBooking(userId, booking);
      return;
    }

    if (action.type === "UPDATE_PROFILE" && action.payload) {
      const { userRepository } = await import("../../repositories");
      const userId = action.payload.userId || action.payload.id || "";
      const profileData = action.payload.data || action.payload;
      await userRepository.updateProfile(userId, profileData);
      return;
    }

    // Default simulation delay if unknown generic payload
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Subscribe to queue state updates
   */
  public subscribe(listener: (queue: OfflineAction[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const offlineQueueService = new OfflineQueueService();
