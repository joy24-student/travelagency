/**
 * Network Timeout Utilities
 * Enforces strict 10–15s thresholds suited for erratic mobile data in South Asia / Bangladesh.
 * Converts hanging requests into actionable, user-friendly retry opportunities.
 */

export class SlowNetworkTimeoutError extends Error {
  public readonly isTimeout = true;
  public readonly timeoutMs: number;

  constructor(
    message: string = "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?",
    timeoutMs: number = 12000
  ) {
    super(message);
    this.name = "SlowNetworkTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wraps any promise with an automatic timeout (default 12s, right within the 10–15s window).
 * If the promise does not resolve in time, rejects with SlowNetworkTimeoutError.
 */
export function withNetworkTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 12000,
  errorMessage: string = "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: any = null;

    timer = setTimeout(() => {
      reject(new SlowNetworkTimeoutError(errorMessage, timeoutMs));
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Type guard to check if an error was caused by a slow network timeout
 */
export function isSlowNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof SlowNetworkTimeoutError) return true;
  const errString = String((error as any)?.message || error).toLowerCase();
  return (
    (error as any)?.isTimeout === true ||
    errString.includes("নেটওয়ার্ক ধীর") ||
    errString.includes("timeout") ||
    errString.includes("econnaborted") ||
    errString.includes("aborterror")
  );
}
