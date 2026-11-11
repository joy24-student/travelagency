/**
 * Shopno Jatra Cross-App Event Bus
 * Provides typed, decoupled pub/sub event distribution across components, background tasks,
 * and Supabase Realtime listeners for customer, agency, and admin portals.
 */

import { useEffect, useRef } from "react";

export type BookingStatus =
  | "draft"
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded";

export interface BookingPayload {
  id: string;
  booking_reference?: string;
  user_id?: string;
  agency_id?: string;
  status: BookingStatus | string;
  product_type?: string;
  destination_city?: string;
  total_price?: number;
  final_price?: number;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface BookingStatusChangedPayload {
  bookingId: string;
  oldStatus?: string;
  newStatus: BookingStatus | string;
  bookingReference?: string;
  booking: BookingPayload;
  timestamp: number;
  source: "supabase_realtime" | "local_action" | "webhook" | "backend_api";
}

export interface AppEventMap {
  // Booking lifecycle events
  "booking:created": { booking: BookingPayload; source?: string };
  "booking:updated": {
    bookingId: string;
    changes: Partial<BookingPayload>;
    full: BookingPayload;
    source?: string;
  };
  "booking:status_changed": BookingStatusChangedPayload;
  "booking:confirmed": { bookingId: string; reference?: string; booking?: BookingPayload };
  "booking:cancelled": { bookingId: string; reason?: string; booking?: BookingPayload };

  // Payment lifecycle events
  "payment:completed": {
    bookingId?: string;
    transactionId: string;
    amount: number;
    method?: string;
  };
  "payment:failed": { bookingId?: string; error: string };

  // AI & Concierge events
  "ai:itinerary_generated": { destination: string; duration_days: number };
}

type EventListener<T> = (data: T) => void | Promise<void>;

export class EventBus {
  private listeners: Map<keyof AppEventMap, Set<EventListener<any>>> = new Map();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof AppEventMap>(event: K, listener: EventListener<AppEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Subscribe to an event once.
   */
  once<K extends keyof AppEventMap>(event: K, listener: EventListener<AppEventMap[K]>): () => void {
    const wrapper: EventListener<AppEventMap[K]> = (data) => {
      this.off(event, wrapper);
      listener(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe a specific listener.
   */
  off<K extends keyof AppEventMap>(event: K, listener: EventListener<AppEventMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Publish an event to all registered listeners safely.
   */
  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    // Iterate over a snapshot of listeners in case any unsubscribe during dispatch
    const snapshot = Array.from(set);
    for (const listener of snapshot) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(`[EventBus] Async error handling event '${String(event)}':`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error handling event '${String(event)}':`, err);
      }
    }
  }

  /**
   * Get active listener count for an event.
   */
  listenerCount<K extends keyof AppEventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Clear listeners for an event or all events.
   */
  clear<K extends keyof AppEventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Global Singleton Instance
export const eventBus = new EventBus();

/**
 * React Hook: Listen to an EventBus event with automatic cleanup on unmount
 */
export function useEventBusListener<K extends keyof AppEventMap>(
  event: K,
  handler: (data: AppEventMap[K]) => void,
  deps: any[] = []
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener: EventListener<AppEventMap[K]> = (data) => {
      handlerRef.current(data);
    };

    const unsubscribe = eventBus.on(event, listener);
    return () => {
      unsubscribe();
    };
  }, [event, ...deps]);
}
