/**
 * Screen Collaboration Hook - Shopno Jatra Mobile Architecture
 *
 * Provides a strictly typed React hook enabling seamless cross-screen communication,
 * decoupled event collaboration, state re-hydration, and automatic lifecycle cleanup
 * to prevent memory leaks on screen unmount.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appEventBus,
  type AppEventKey,
  type AppEventPayloadMap,
  type UnsubscribeFunction,
} from "../services/events/appEventBus";

// ============================================================================
// TYPES & HOOK CONFIGURATION
// ============================================================================

export interface UseScreenCollaborationOptions<T> {
  /**
   * If true, immediately invokes the callback on mount with the last known event state
   * (if available in the event bus cache). Essential for re-hydrating screens that mount
   * after an event was published elsewhere (e.g. TripsScreen opening after BookingSystemScreen).
   * @default false
   */
  replayLast?: boolean;

  /**
   * Maximum age (in ms) of a cached event to allow replay.
   * @default 300000 (5 minutes)
   */
  replayMaxAgeMs?: number;

  /**
   * Optional predicate filter. If provided, the callback will only be executed
   * when the filter evaluates to true for the given payload.
   */
  filter?: (payload: T) => boolean;

  /**
   * Whether the event listener is actively subscribed.
   * Allows screens to conditionally pause/resume listening.
   * @default true
   */
  enabled?: boolean;

  /**
   * Priority of the listener relative to other screens. Higher numbers execute earlier.
   * @default 0
   */
  priority?: number;

  /**
   * Optional screen identifier for telemetry and debugging.
   */
  screenId?: string;
}

export interface ScreenCollaborationResult<K extends AppEventKey> {
  /**
   * Strongly typed emitter to publish events directly from the collaborating screen.
   */
  emit: (payload: AppEventPayloadMap[K]) => void;

  /**
   * Manually trigger state re-hydration by re-evaluating the callback with the last
   * known event payload from the bus.
   * Returns true if a cached payload existed and was delivered.
   */
  rehydrate: () => boolean;

  /**
   * Read the last known payload for this event type directly.
   */
  getLastPayload: () => AppEventPayloadMap[K] | undefined;

  /**
   * Imperatively cancel the active subscription prior to unmount.
   */
  unsubscribe: () => void;

  /**
   * Reactive state containing the most recently received payload.
   */
  lastReceivedPayload: AppEventPayloadMap[K] | undefined;
}

// ============================================================================
// MAIN HOOK IMPLEMENTATION
// ============================================================================

/**
 * useScreenCollaboration
 *
 * Subscribes an active screen to typed application events with automatic unsubscription
 * on unmount, preventing memory leaks, circular dependencies, and stale state.
 *
 * @example
 * // In TripsScreen.tsx: Automatically refresh when reservation completes
 * useScreenCollaboration('BOOKING_STATUS_CHANGED', (payload) => {
 *   if (payload.currentStatus === 'confirmed') {
 *     refetchUserTrips();
 *   }
 * }, { replayLast: true });
 *
 * @example
 * // In BookingSystemScreen.tsx: Emit confirmation and return collaboration handles
 * const { emit } = useScreenCollaboration('BOOKING_STATUS_CHANGED', () => {});
 * emit({
 *   bookingId: 'b_123',
 *   currentStatus: 'confirmed',
 *   timestamp: Date.now(),
 * });
 */
export function useScreenCollaboration<K extends AppEventKey>(
  eventName: K,
  callback: (payload: AppEventPayloadMap[K]) => void | Promise<void>,
  options: UseScreenCollaborationOptions<AppEventPayloadMap[K]> = {}
): ScreenCollaborationResult<K> {
  const {
    replayLast = false,
    replayMaxAgeMs = 300000,
    filter,
    enabled = true,
    priority = 0,
    screenId,
  } = options;

  // Track the most recently received payload in reactive state for optional UI binding
  const [lastReceivedPayload, setLastReceivedPayload] = useState<
    AppEventPayloadMap[K] | undefined
  >(() => (replayLast ? appEventBus.getLastEvent(eventName) : undefined));

  // Store the latest callback and filter in refs to avoid re-subscribing on every render
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Store active unsubscribe reference for imperative cleanup
  const unsubscribeRef = useRef<UnsubscribeFunction | null>(null);

  // Subscribe with lifecycle management
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleEvent = (payload: AppEventPayloadMap[K]) => {
      // Evaluate optional filter predicate
      if (filterRef.current && !filterRef.current(payload)) {
        return;
      }

      setLastReceivedPayload(payload);

      // Invoke latest callback without risking stale closures
      callbackRef.current(payload);
    };

    const unsubscribe = appEventBus.subscribe(eventName, handleEvent, {
      replayLast,
      replayMaxAgeMs,
      priority,
      subscriberId: screenId ? `${screenId}_${eventName}` : undefined,
    });

    unsubscribeRef.current = unsubscribe;

    // Automatic unsubscription on screen unmount to prevent memory leaks
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [eventName, enabled, replayLast, replayMaxAgeMs, priority, screenId]);

  // Imperative emit function
  const emit = useCallback(
    (payload: AppEventPayloadMap[K]) => {
      appEventBus.publish(eventName, payload);
    },
    [eventName]
  );

  // Imperative rehydrate function
  const rehydrate = useCallback((): boolean => {
    const cached = appEventBus.getLastEvent(eventName);
    if (!cached) return false;

    if (filterRef.current && !filterRef.current(cached)) {
      return false;
    }

    setLastReceivedPayload(cached);
    callbackRef.current(cached);
    return true;
  }, [eventName]);

  // Read last payload without invoking callback
  const getLastPayload = useCallback(() => {
    return appEventBus.getLastEvent(eventName);
  }, [eventName]);

  // Imperative unsubscribe handle
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  return {
    emit,
    rehydrate,
    getLastPayload,
    unsubscribe,
    lastReceivedPayload,
  };
}

// ============================================================================
// COMPANION UTILITY HOOKS
// ============================================================================

/**
 * useScreenEventEmitter
 *
 * Lightweight hook for screens that solely emit events without listening,
 * guaranteeing zero listener overhead.
 *
 * @example
 * const emitBooking = useScreenEventEmitter('BOOKING_STATUS_CHANGED');
 * emitBooking({ bookingId: '123', currentStatus: 'confirmed', timestamp: Date.now() });
 */
export function useScreenEventEmitter<K extends AppEventKey>(
  eventName: K
): (payload: AppEventPayloadMap[K]) => void {
  return useCallback(
    (payload: AppEventPayloadMap[K]) => {
      appEventBus.publish(eventName, payload);
    },
    [eventName]
  );
}

/**
 * useScreenHandoff
 *
 * Hook for cross-screen data handoffs (e.g. passing draft reservation details
 * or transitional session context between screens without polluting navigation params).
 */
export function useScreenHandoff<T>(
  handoffKey: string
): {
  data: T | undefined;
  setHandoff: (value: T) => void;
  clearHandoff: () => void;
} {
  const [data, setData] = useState<T | undefined>(() =>
    appEventBus.getHandoffContext<T>(handoffKey)
  );

  const setHandoff = useCallback(
    (value: T) => {
      appEventBus.setHandoffContext(handoffKey, value);
      setData(value);
    },
    [handoffKey]
  );

  const clearHandoff = useCallback(() => {
    appEventBus.clearHandoffContext(handoffKey);
    setData(undefined);
  }, [handoffKey]);

  return {
    data,
    setHandoff,
    clearHandoff,
  };
}

export default useScreenCollaboration;
