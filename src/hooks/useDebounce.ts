import { useEffect, useState } from "react";

/**
 * Custom hook to debounce any fast-changing value.
 * @param value The value to debounce (e.g. search query string)
 * @param delay Milliseconds to delay updating the debounced value (default: 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
