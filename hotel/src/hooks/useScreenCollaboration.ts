/**
 * Screen Collaboration Hook - Shopno Jatra Hotel Management Portal
 *
 * Provides a strictly typed React hook enabling seamless cross-screen communication,
 * decoupled event collaboration, state re-hydration, and automatic lifecycle cleanup.
 */

import { useEffect, useRef, useState } from "react";
import {
  appEventBus,
  type AppEventKey,
  type AppEventPayloadMap,
} from "../services/events/appEventBus";

export interface UseScreenCollaborationOptions<T> {
  replayLast?: boolean;
  filter?: (payload: T) => boolean;
  enabled?: boolean;
  screenId?: string;
}

export function useScreenCollaboration<K extends AppEventKey>(
  eventName: K,
  callback: (payload: AppEventPayloadMap[K]) => void | Promise<void>,
  options: UseScreenCollaborationOptions<AppEventPayloadMap[K]> = {}
) {
  const { replayLast = false, filter, enabled = true } = options;

  const [lastReceivedPayload, setLastReceivedPayload] = useState<
    AppEventPayloadMap[K] | undefined
  >(() => (replayLast ? appEventBus.getLastEvent(eventName) : undefined));

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = appEventBus.subscribe(
      eventName,
      (payload) => {
        if (filterRef.current && !filterRef.current(payload)) {
          return;
        }
        setLastReceivedPayload(payload);
        callbackRef.current(payload);
      },
      { replayLast }
    );

    return () => {
      unsubscribe();
    };
  }, [eventName, enabled, replayLast]);

  return {
    emit: (payload: AppEventPayloadMap[K]) =>
      appEventBus.publish(eventName, payload),
    lastReceivedPayload,
  };
}

export default useScreenCollaboration;
