import { useState, useRef, useCallback } from "react";

export interface UseDoubleSubmitProtectionOptions {
  cooldownMs?: number;
  onError?: (err: any) => void;
}

/**
 * Hook to guard against duplicate asynchronous submissions (double-taps).
 * Automatically tracks submitting status, locks subsequent invocations during execution
 * and enforces a cooldown window.
 */
export function useDoubleSubmitProtection(
  onSubmit: (...args: any[]) => Promise<any> | any,
  options: UseDoubleSubmitProtectionOptions = {}
) {
  const { cooldownMs = 800, onError } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef<number>(0);
  const isExecutingRef = useRef<boolean>(false);

  const handleSubmit = useCallback(
    async (...args: any[]) => {
      const now = Date.now();
      if (isExecutingRef.current || isSubmitting) {
        return;
      }
      if (now - lastSubmitRef.current < cooldownMs) {
        return;
      }

      isExecutingRef.current = true;
      lastSubmitRef.current = now;
      setIsSubmitting(true);

      try {
        const result = await onSubmit(...args);
        return result;
      } catch (err) {
        onError?.(err);
        throw err;
      } finally {
        isExecutingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [onSubmit, cooldownMs, isSubmitting, onError]
  );

  const reset = useCallback(() => {
    isExecutingRef.current = false;
    lastSubmitRef.current = 0;
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    handleSubmit,
    reset,
  };
}

export default useDoubleSubmitProtection;
