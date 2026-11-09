/**
 * Screen Collaboration Hook - Shopno Jatra Agency Portal
 *
 * Provides a strictly typed React hook enabling seamless cross-screen communication,
 * decoupled event collaboration, state re-hydration, and automatic lifecycle cleanup.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appEventBus,
  type AppEventKey,
  type AppEventPayloadMap,
  type UnsubscribeFunction,
} from "../services/events/appEventBus";

export interface UseScreenCollaborationOptions<T> {
  replayLast?: boolean;
  replayMaxAgeMs?: number;
  filter?: (payload: T) => boolean;
  enabled?: boolean;
  priority?: number;
  screenId?: string;
}

export interface ScreenCollaborationResult<K extends AppEventKey> {
  emit: (payload: AppEventPayloadMap[K]) => void;
  rehydrate: () => boolean;
  getLastPayload: () => AppEventPayloadMap[K] | undefined;
  unsubscribe: () => void;
  lastReceivedPayload: AppEventPayloadMap[K] | undefined;
}

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

  const [lastReceivedPayload, setLastReceivedPayload] = useState<
    AppEventPayloadMap[K] | undefined
  >(() => (replayLast ? appEventBus.getLastEvent(eventName) : undefined));

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const unsubscribeRef = useRef<UnsubscribeFunction | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleEvent = (payload: AppEventPayloadMap[K]) => {
      if (filterRef.current && !filterRef.current(payload)) return;
      setLastReceivedPayload(payload);
      callbackRef.current(payload);
    };

    const unsubscribe = appEventBus.subscribe(eventName, handleEvent, {
      replayLast,
      replayMaxAgeMs,
      priority,
      subscriberId: screenId ? `${screenId}_${eventName}` : undefined,
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [eventName, enabled, replayLast, replayMaxAgeMs, priority, screenId]);

  const emit = useCallback(
    (payload: AppEventPayloadMap[K]) => {
      appEventBus.publish(eventName, payload);
    },
    [eventName]
  );

  const rehydrate = useCallback((): boolean => {
    const cached = appEventBus.getLastEvent(eventName);
    if (!cached) return false;
    if (filterRef.current && !filterRef.current(cached)) return false;
    setLastReceivedPayload(cached);
    callbackRef.current(cached);
    return true;
  }, [eventName]);

  const getLastPayload = useCallback(() => {
    return appEventBus.getLastEvent(eventName);
  }, [eventName]);

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

export default useScreenCollaboration;
