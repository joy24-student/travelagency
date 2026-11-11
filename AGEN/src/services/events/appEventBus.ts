/**
 * Application Event Bus - Shopno Jatra Agency Portal Architecture
 *
 * Provides a lightweight, strictly typed, decoupled pub-sub event bus enabling
 * seamless cross-screen communication, context handoffs, and real-time state re-hydration.
 */

export const APP_EVENTS = {
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  NEW_MESSAGE_RECEIVED: "NEW_MESSAGE_RECEIVED",
  ITINERARY_UPDATED: "ITINERARY_UPDATED",
  WEATHER_ALERT_TRIGGERED: "WEATHER_ALERT_TRIGGERED",
  CURRENCY_CHANGED: "CURRENCY_CHANGED",
} as const;

export type AppEventType = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

export const BOOKING_STATUS_CHANGED = APP_EVENTS.BOOKING_STATUS_CHANGED;
export const PAYMENT_COMPLETED = APP_EVENTS.PAYMENT_COMPLETED;
export const NEW_MESSAGE_RECEIVED = APP_EVENTS.NEW_MESSAGE_RECEIVED;
export const ITINERARY_UPDATED = APP_EVENTS.ITINERARY_UPDATED;
export const WEATHER_ALERT_TRIGGERED = APP_EVENTS.WEATHER_ALERT_TRIGGERED;
export const CURRENCY_CHANGED = APP_EVENTS.CURRENCY_CHANGED;

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

export interface NewMessageReceivedPayload {
  messageId: string;
  senderId?: string;
  senderName: string;
  content: string;
  conversationId?: string;
  unreadCount?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AppEventPayloadMap {
  [APP_EVENTS.BOOKING_STATUS_CHANGED]: BookingStatusChangedPayload;
  [APP_EVENTS.PAYMENT_COMPLETED]: PaymentCompletedPayload;
  [APP_EVENTS.NEW_MESSAGE_RECEIVED]: NewMessageReceivedPayload;
  [APP_EVENTS.ITINERARY_UPDATED]: any;
  [APP_EVENTS.WEATHER_ALERT_TRIGGERED]: any;
  [APP_EVENTS.CURRENCY_CHANGED]: any;
}

export type AppEventKey = keyof AppEventPayloadMap;
export type EventListener<T> = (payload: T) => void | Promise<void>;
export type UnsubscribeFunction = () => void;

export interface SubscribeOptions {
  replayLast?: boolean;
  replayMaxAgeMs?: number;
  priority?: number;
  subscriberId?: string;
}

export interface PublishOptions {
  cacheForReplay?: boolean;
}

interface SubscriptionRecord<T> {
  id: string;
  listener: EventListener<T>;
  priority: number;
  once?: boolean;
}

interface CachedEvent<T> {
  payload: T;
  timestamp: number;
}

export class AppEventBus {
  private subscribers: Map<string, Set<SubscriptionRecord<any>>> = new Map();
  private replayBuffer: Map<string, CachedEvent<any>> = new Map();
  private idCounter = 0;

  public subscribe<K extends AppEventKey>(
    event: K | string,
    listener: EventListener<any>,
    options: SubscribeOptions = {}
  ): UnsubscribeFunction {
    const { replayLast = false, replayMaxAgeMs = 300000, priority = 0, subscriberId } = options;

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    const subSet = this.subscribers.get(event)!;
    const recordId = subscriberId || `sub_${event}_${++this.idCounter}_${Date.now()}`;
    const record: SubscriptionRecord<any> = {
      id: recordId,
      listener,
      priority,
      once: false,
    };

    subSet.add(record);

    if (replayLast) {
      const cached = this.replayBuffer.get(event);
      if (cached && Date.now() - cached.timestamp <= replayMaxAgeMs) {
        this.executeListener(listener, cached.payload, event);
      }
    }

    return () => {
      subSet.delete(record);
      if (subSet.size === 0) {
        this.subscribers.delete(event);
      }
    };
  }

  public publish<K extends AppEventKey>(
    event: K | string,
    payload: any,
    options: PublishOptions = {}
  ): void {
    const { cacheForReplay = true } = options;

    if (cacheForReplay) {
      this.replayBuffer.set(event, {
        payload,
        timestamp: (payload && typeof payload.timestamp === "number") ? payload.timestamp : Date.now(),
      });
    }

    const subSet = this.subscribers.get(event);
    if (subSet && subSet.size > 0) {
      const records = Array.from(subSet).sort((a, b) => b.priority - a.priority);
      for (const record of records) {
        if (record.once) {
          subSet.delete(record);
        }
        this.executeListener(record.listener, payload, event);
      }
    }
  }

  public emit<K extends AppEventKey>(event: K | string, payload: any): void {
    this.publish(event, payload);
  }

  public getLastEvent<K extends AppEventKey>(event: K | string): any {
    const cached = this.replayBuffer.get(event);
    return cached ? cached.payload : undefined;
  }

  public clear(event?: string): void {
    if (event) {
      this.subscribers.delete(event);
      this.replayBuffer.delete(event);
    } else {
      this.subscribers.clear();
      this.replayBuffer.clear();
    }
  }

  private executeListener<T>(listener: EventListener<T>, payload: T, event: string): void {
    try {
      const result = listener(payload);
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch((err) => {
          console.warn(`[AgencyEventBus] Listener error for ${event}:`, err);
        });
      }
    } catch (err) {
      console.warn(`[AgencyEventBus] Listener error for ${event}:`, err);
    }
  }
}

export const appEventBus = new AppEventBus();
export default appEventBus;
