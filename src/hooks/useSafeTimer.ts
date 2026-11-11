import { useEffect, useRef, useCallback } from "react";

/**
 * useSafeTimeout
 * Safe setTimeout hook that automatically cancels pending timeouts when the component unmounts.
 * Eliminates memory leaks, React state updates on unmounted components, and rogue toasts/animations.
 */
export function useSafeTimeout() {
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const setSafeTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      timeoutIdsRef.current.delete(id);
      fn();
    }, delayMs);

    timeoutIdsRef.current.add(id);
    return id;
  }, []);

  const clearSafeTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutIdsRef.current.delete(id);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return { setSafeTimeout, clearSafeTimeout, clearAllTimeouts };
}

/**
 * useSafeInterval
 * Declarative setInterval hook that automatically clears interval on unmount or when delay is null.
 */
export function useSafeInterval(
  callback: () => void,
  delayMs: number | null,
  options?: { immediate?: boolean }
) {
  const savedCallback = useRef(callback);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null || delayMs === undefined) {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    if (options?.immediate) {
      savedCallback.current();
    }

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delayMs);
    intervalIdRef.current = id;

    return () => {
      clearInterval(id);
      intervalIdRef.current = null;
    };
  }, [delayMs, options?.immediate]);

  const stop = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  return { stop };
}

/**
 * useSafeDebounce
 * Safe debounce callback that cancels on unmount
 */
export function useSafeDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return [debounced, cancel] as const;
}

export default useSafeTimeout;
