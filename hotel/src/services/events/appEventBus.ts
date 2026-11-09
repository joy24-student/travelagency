/**
 * Application Event Bus - Shopno Jatra Hotel Management Architecture
 *
 * Provides a lightweight, strictly typed, decoupled pub-sub event bus enabling
 * seamless cross-screen communication, context handoffs, and real-time state re-hydration.
 */

export const APP_EVENTS = {
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  RESERVATION_UPDATED: "RESERVATION_UPDATED",
  ROOM_STATUS_CHANGED: "ROOM_STATUS_CHANGED",
} as const;

export type AppEventType = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

export const BOOKING_STATUS_CHANGED = APP_EVENTS.BOOKING_STATUS_CHANGED;
export const PAYMENT_COMPLETED = APP_EVENTS.PAYMENT_COMPLETED;
export const RESERVATION_UPDATED = APP_EVENTS.RESERVATION_UPDATED;
export const ROOM_STATUS_CHANGED = APP_EVENTS.ROOM_STATUS_CHANGED;

export interface BookingStatusChangedPayload {
  bookingId: string;
  currentStatus: string;
  previousStatus?: string;
  bookingReference?: string;
  userId?: string;
  productType?: string;
  destinationCity?: string;
  totalPrice?: number;
  currency?: string;
  timestamp: number;
  sourceScreen?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentCompletedPayload {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: "completed" | "success";
  bookingId?: string;
  bookingReference?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AppEventPayloadMap {
  [APP_EVENTS.BOOKING_STATUS_CHANGED]: BookingStatusChangedPayload;
  [APP_EVENTS.PAYMENT_COMPLETED]: PaymentCompletedPayload;
  [APP_EVENTS.RESERVATION_UPDATED]: Record<string, unknown>;
  [APP_EVENTS.ROOM_STATUS_CHANGED]: Record<string, unknown>;
}

export type AppEventKey = keyof AppEventPayloadMap;
export type EventListener<T> = (payload: T) => void | Promise<void>;
export type UnsubscribeFunction = () => void;

export class HotelEventBus {
  private subscribers: Map<string, Set<EventListener<any>>> = new Map();
  private lastEvents: Map<string, any> = new Map();

  public subscribe<K extends AppEventKey>(
    event: K,
    listener: EventListener<AppEventPayloadMap[K]>,
    options?: { replayLast?: boolean }
  ): UnsubscribeFunction {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    const set = this.subscribers.get(event)!;
    set.add(listener);

    if (options?.replayLast && this.lastEvents.has(event)) {
      try {
        listener(this.lastEvents.get(event));
      } catch {
        // Safe execution
      }
    }

    return () => {
      const existing = this.subscribers.get(event);
      if (existing) {
        existing.delete(listener);
        if (existing.size === 0) {
          this.subscribers.delete(event);
        }
      }
    };
  }

  public publish<K extends AppEventKey>(
    event: K,
    payload: AppEventPayloadMap[K]
  ): void {
    this.lastEvents.set(event, payload);
    const set = this.subscribers.get(event);
    if (!set || set.size === 0) return;

    set.forEach((listener) => {
      try {
        const result = listener(payload);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        // Safe listener error isolation
      }
    });
  }

  public getLastEvent<K extends AppEventKey>(
    event: K
  ): AppEventPayloadMap[K] | undefined {
    return this.lastEvents.get(event);
  }

  public clear(): void {
    this.subscribers.clear();
    this.lastEvents.clear();
  }
}

export const appEventBus = new HotelEventBus();
export default appEventBus;
