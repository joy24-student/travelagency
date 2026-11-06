/**
 * Application Event Bus - Shopno Jatra Mobile Architecture
 *
 * Provides a lightweight, strictly typed, decoupled pub-sub event bus enabling
 * seamless cross-screen communication, context handoffs, and state re-hydration.
 *
 * Strict Boundaries:
 * - Decoupled from UI components and screen implementations to prevent circular dependencies.
 * - Fault-tolerant: Listener errors are safely isolated so they cannot disrupt emitters or peer listeners.
 * - State Re-Hydration: Stores last-known event states for sticky delivery on late-mounting screens.
 */

import type {
  BookingProductType,
  BookingStatus,
  PaymentMethod,
} from "../../types/domain";

// ============================================================================
// 1. TYPE-SAFE EVENT DEFINITIONS & CONTRACTS
// ============================================================================

export const APP_EVENTS = {
  BOOKING_STATUS_CHANGED: "BOOKING_STATUS_CHANGED",
  ITINERARY_UPDATED: "ITINERARY_UPDATED",
  WEATHER_ALERT_TRIGGERED: "WEATHER_ALERT_TRIGGERED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  CURRENCY_CHANGED: "CURRENCY_CHANGED",
} as const;

export type AppEventType = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

// Named constant aliases for convenient destructuring/imports
export const BOOKING_STATUS_CHANGED = APP_EVENTS.BOOKING_STATUS_CHANGED;
export const ITINERARY_UPDATED = APP_EVENTS.ITINERARY_UPDATED;
export const WEATHER_ALERT_TRIGGERED = APP_EVENTS.WEATHER_ALERT_TRIGGERED;
export const PAYMENT_COMPLETED = APP_EVENTS.PAYMENT_COMPLETED;
export const CURRENCY_CHANGED = APP_EVENTS.CURRENCY_CHANGED;

/**
 * Payload emitted when a booking changes status (e.g., from draft to confirmed,
 * or cancelled). Used to re-hydrate trips, dashboard counters, and itinerary views.
 */
export interface BookingStatusChangedPayload {
  bookingId: string;
  currentStatus: BookingStatus | string;
  previousStatus?: BookingStatus | string;
  bookingReference?: string;
  userId?: string;
  productType?: BookingProductType | string;
  destinationCity?: string;
  totalPrice?: number;
  currency?: string;
  timestamp: number;
  sourceScreen?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payload emitted when an itinerary or trip plan is created, modified, or reordered.
 * Used to notify open itinerary screens, map overviews, and recommendation widgets.
 */
export interface ItineraryUpdatedPayload {
  itineraryId?: string;
  tripId?: string;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "reordered"
    | "item_added"
    | "item_removed"
    | "refresh";
  title?: string;
  destinationCity?: string;
  destinationCountry?: string;
  startDate?: string;
  endDate?: string;
  itemCount?: number;
  timestamp: number;
  sourceScreen?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payload emitted when a regional or trip-specific weather alert is triggered.
 * Used to display warning banners across active exploration and booking screens.
 */
export interface WeatherAlertTriggeredPayload {
  alertId?: string;
  location: string;
  city?: string;
  country?: string;
  severity: "info" | "advisory" | "warning" | "severe" | "critical";
  title: string;
  description: string;
  temperature?: number;
  condition?: string;
  effectiveUntil?: string | number;
  impactedTrips?: string[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Payload emitted when a checkout transaction completes successfully.
 * Triggers wallet balance refresh, receipt availability, and booking confirmation.
 */
export interface PaymentCompletedPayload {
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | string;
  status: "completed" | "success";
  bookingId?: string;
  bookingReference?: string;
  gateway?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Payload emitted when the active user switches application currency or FX rates update.
 * Prompts immediate re-rendering of all price displays without screen reload.
 */
export interface CurrencyChangedPayload {
  currentCurrency: string;
  previousCurrency?: string;
  exchangeRate?: number;
  rates?: Record<string, number>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Strongly typed registry mapping each AppEvent to its corresponding payload contract.
 */
export interface AppEventPayloadMap {
  [APP_EVENTS.BOOKING_STATUS_CHANGED]: BookingStatusChangedPayload;
  [APP_EVENTS.ITINERARY_UPDATED]: ItineraryUpdatedPayload;
  [APP_EVENTS.WEATHER_ALERT_TRIGGERED]: WeatherAlertTriggeredPayload;
  [APP_EVENTS.PAYMENT_COMPLETED]: PaymentCompletedPayload;
  [APP_EVENTS.CURRENCY_CHANGED]: CurrencyChangedPayload;
}

export type AppEventKey = keyof AppEventPayloadMap;

// ============================================================================
// 2. BUS SUBSCRIPTION & PUBLISH CONTRACTS
// ============================================================================

export type EventListener<T> = (payload: T) => void | Promise<void>;
export type WildcardListener = (event: string, payload: unknown) => void | Promise<void>;
export type UnsubscribeFunction = () => void;

export interface SubscribeOptions {
  /**
   * If true, immediately invokes the listener with the latest cached payload for this event
   * (if one exists within the replayMaxAge window). Critical for state re-hydration on late-mounting screens.
   * @default false
   */
  replayLast?: boolean;

  /**
   * Maximum age (in milliseconds) for a cached event to be considered valid for replay.
   * @default 300000 (5 minutes)
   */
  replayMaxAgeMs?: number;

  /**
   * Priority ordering for listener execution. Higher numbers execute first.
   * @default 0
   */
  priority?: number;

  /**
   * Optional unique identifier for logging, telemetry, or debugging.
   */
  subscriberId?: string;
}

export interface PublishOptions {
  /**
   * Whether to persist the payload in the replay buffer for state re-hydration of future subscribers.
   * @default true
   */
  cacheForReplay?: boolean;

  /**
   * If true, skips notifying wildcard listeners.
   * @default false
   */
  silentWildcard?: boolean;
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

export type EventBusErrorHandler = (
  error: unknown,
  context: { event: string; subscriberId?: string }
) => void;

// ============================================================================
// 3. EVENT BUS IMPLEMENTATION
// ============================================================================

export class AppEventBus {
  private subscribers: Map<string, Set<SubscriptionRecord<any>>> = new Map();
  private wildcardSubscribers: Set<WildcardListener> = new Set();
  private replayBuffer: Map<string, CachedEvent<any>> = new Map();
  private handoffContext: Map<string, { value: unknown; timestamp: number }> = new Map();
  private idCounter = 0;

  private errorHandler: EventBusErrorHandler = (error, context) => {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.error(
        `[AppEventBus] Error in listener for event "${context.event}" (subscriber: ${context.subscriberId || "anonymous"}):`,
        error
      );
    }
  };

  /**
   * Configure custom error handling / telemetry for isolated listener exceptions.
   */
  public setErrorHandler(handler: EventBusErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Subscribe to a typed application event.
   * Returns an unsubscription callback to prevent memory leaks on component unmount.
   */
  public subscribe<K extends AppEventKey>(
    event: K,
    listener: EventListener<AppEventPayloadMap[K]>,
    options?: SubscribeOptions
  ): UnsubscribeFunction;
  public subscribe<T = unknown>(
    event: string,
    listener: EventListener<T>,
    options?: SubscribeOptions
  ): UnsubscribeFunction;
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

    // State Re-Hydration: Immediately invoke subscriber if a valid cached event exists
    if (replayLast) {
      const cached = this.replayBuffer.get(event);
      if (cached) {
        const isFresh = Date.now() - cached.timestamp <= replayMaxAgeMs;
        if (isFresh) {
          this.executeListener(listener, cached.payload, event, recordId);
        }
      }
    }

    // Return unsubscription callback
    return () => {
      this.unsubscribeRecord(event, record);
    };
  }

  /**
   * Alias for subscribe().
   */
  public on<K extends AppEventKey>(
    event: K,
    listener: EventListener<AppEventPayloadMap[K]>,
    options?: SubscribeOptions
  ): UnsubscribeFunction {
    return this.subscribe(event, listener, options);
  }

  /**
   * Subscribe to a typed application event for exactly one invocation.
   * Automatically unsubscribes immediately after execution.
   */
  public once<K extends AppEventKey>(
    event: K,
    listener: EventListener<AppEventPayloadMap[K]>,
    options?: Omit<SubscribeOptions, "replayLast">
  ): UnsubscribeFunction;
  public once<T = unknown>(
    event: string,
    listener: EventListener<T>,
    options?: Omit<SubscribeOptions, "replayLast">
  ): UnsubscribeFunction;
  public once<K extends AppEventKey>(
    event: K | string,
    listener: EventListener<any>,
    options: Omit<SubscribeOptions, "replayLast"> = {}
  ): UnsubscribeFunction {
    const { priority = 0, subscriberId } = options;

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    const subSet = this.subscribers.get(event)!;
    const recordId = subscriberId || `once_${event}_${++this.idCounter}_${Date.now()}`;
    const record: SubscriptionRecord<any> = {
      id: recordId,
      listener,
      priority,
      once: true,
    };

    subSet.add(record);

    return () => {
      this.unsubscribeRecord(event, record);
    };
  }

  /**
   * Publish a strongly typed event to all active listeners.
   * Emits without direct coupling to listeners, preventing circular dependencies.
   */
  public publish<K extends AppEventKey>(
    event: K,
    payload: AppEventPayloadMap[K],
    options?: PublishOptions
  ): void;
  public publish<T = unknown>(
    event: string,
    payload: T,
    options?: PublishOptions
  ): void;
  public publish<K extends AppEventKey>(
    event: K | string,
    payload: any,
    options: PublishOptions = {}
  ): void {
    const { cacheForReplay = true, silentWildcard = false } = options;

    // Cache event state for re-hydration of late-mounting screens
    if (cacheForReplay) {
      this.replayBuffer.set(event, {
        payload,
        timestamp: (payload && typeof payload.timestamp === "number") ? payload.timestamp : Date.now(),
      });
    }

    // Retrieve active subscribers
    const subSet = this.subscribers.get(event);
    if (subSet && subSet.size > 0) {
      // Snapshot listener array to prevent race conditions during concurrent mutations
      const records = Array.from(subSet).sort((a, b) => b.priority - a.priority);

      for (const record of records) {
        if (record.once) {
          subSet.delete(record);
        }
        this.executeListener(record.listener, payload, event, record.id);
      }
    }

    // Notify wildcard subscribers (e.g., telemetry, observability, logging)
    if (!silentWildcard && this.wildcardSubscribers.size > 0) {
      const wildcards = Array.from(this.wildcardSubscribers);
      for (const wildcard of wildcards) {
        try {
          const res = wildcard(event, payload);
          if (res && typeof (res as Promise<void>).catch === "function") {
            (res as Promise<void>).catch((err) => {
              this.errorHandler(err, { event, subscriberId: "wildcard" });
            });
          }
        } catch (err) {
          this.errorHandler(err, { event, subscriberId: "wildcard" });
        }
      }
    }
  }

  /**
   * Alias for publish().
   */
  public emit<K extends AppEventKey>(
    event: K,
    payload: AppEventPayloadMap[K],
    options?: PublishOptions
  ): void {
    this.publish(event, payload, options);
  }

  // ============================================================================
  // 4. STATE RE-HYDRATION & CONTEXT HANDOFFS
  // ============================================================================

  /**
   * Retrieve the latest cached payload for a given event, if available.
   * Enables manual polling or verification during screen transitions.
   */
  public getLastEvent<K extends AppEventKey>(event: K): AppEventPayloadMap[K] | undefined;
  public getLastEvent<T = unknown>(event: string): T | undefined;
  public getLastEvent<K extends AppEventKey>(event: K | string): any {
    const cached = this.replayBuffer.get(event);
    return cached ? cached.payload : undefined;
  }

  /**
   * Force re-hydration: Re-emits the last known cached payload of an event to all currently
   * active listeners. Useful when a screen comes into foreground or requires state synchronization.
   * Returns true if a cached event was found and broadcasted.
   */
  public rehydrate<K extends AppEventKey>(event: K): boolean;
  public rehydrate(event: string): boolean;
  public rehydrate<K extends AppEventKey>(event: K | string): boolean {
    const cached = this.replayBuffer.get(event);
    if (!cached) return false;
    this.publish(event, cached.payload, { cacheForReplay: false });
    return true;
  }

  /**
   * Re-hydrates all cached events to currently mounted screens.
   */
  public rehydrateAll(): void {
    for (const [event, cached] of this.replayBuffer.entries()) {
      this.publish(event, cached.payload, { cacheForReplay: false });
    }
  }

  /**
   * Set cross-screen handoff context data (e.g. passing temporary draft state or
   * checkout session tokens across navigation transitions).
   */
  public setHandoffContext<T = unknown>(key: string, value: T): void {
    this.handoffContext.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Retrieve cross-screen handoff context data.
   */
  public getHandoffContext<T = unknown>(key: string): T | undefined {
    const data = this.handoffContext.get(key);
    return data ? (data.value as T) : undefined;
  }

  /**
   * Remove a specific handoff context item, or clear all handoffs.
   */
  public clearHandoffContext(key?: string): void {
    if (key) {
      this.handoffContext.delete(key);
    } else {
      this.handoffContext.clear();
    }
  }

  /**
   * Clear the cached replay buffer for a specific event or all events.
   */
  public clearReplayBuffer(event?: string): void {
    if (event) {
      this.replayBuffer.delete(event);
    } else {
      this.replayBuffer.clear();
    }
  }

  // ============================================================================
  // 5. OBSERVABILITY & LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Register a wildcard subscriber invoked for all application events.
   */
  public subscribeAll(listener: WildcardListener): UnsubscribeFunction {
    this.wildcardSubscribers.add(listener);
    return () => {
      this.wildcardSubscribers.delete(listener);
    };
  }

  /**
   * Count active subscribers for a given event, or total across all events.
   */
  public listenerCount(event?: string): number {
    if (event) {
      return this.subscribers.get(event)?.size ?? 0;
    }
    let total = 0;
    for (const set of this.subscribers.values()) {
      total += set.size;
    }
    return total;
  }

  /**
   * Check if any active subscribers exist for an event.
   */
  public hasListeners(event: string): boolean {
    const set = this.subscribers.get(event);
    return !!set && set.size > 0;
  }

  /**
   * Return a list of all event names with active subscribers.
   */
  public getRegisteredEvents(): string[] {
    const active: string[] = [];
    for (const [event, set] of this.subscribers.entries()) {
      if (set.size > 0) active.push(event);
    }
    return active;
  }

  /**
   * Unsubscribe all listeners for a given event, or clear the entire event bus.
   * Useful during user logout or test teardown.
   */
  public clear(event?: string): void {
    if (event) {
      this.subscribers.delete(event);
      this.replayBuffer.delete(event);
    } else {
      this.subscribers.clear();
      this.wildcardSubscribers.clear();
      this.replayBuffer.clear();
      this.handoffContext.clear();
    }
  }

  // ============================================================================
  // 6. INTERNAL ISOLATION HELPERS
  // ============================================================================

  private unsubscribeRecord(event: string, record: SubscriptionRecord<any>): void {
    const subSet = this.subscribers.get(event);
    if (!subSet) return;
    subSet.delete(record);
    if (subSet.size === 0) {
      this.subscribers.delete(event);
    }
  }

  private executeListener<T>(
    listener: EventListener<T>,
    payload: T,
    event: string,
    subscriberId?: string
  ): void {
    try {
      const result = listener(payload);
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch((err) => {
          this.errorHandler(err, { event, subscriberId });
        });
      }
    } catch (err) {
      this.errorHandler(err, { event, subscriberId });
    }
  }
}

// Global singleton instance for cross-screen communication
export const appEventBus = new AppEventBus();
export default appEventBus;
