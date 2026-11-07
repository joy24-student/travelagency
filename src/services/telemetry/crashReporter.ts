/**
 * Global Crash Reporting & Unhandled Exception Engine
 *
 * DevSecOps & Production Reliability Core:
 * 1. ErrorUtils.setGlobalHandler for fatal/non-fatal React Native JavaScript exceptions.
 * 2. Unhandled Promise Rejection tracking across Web and Mobile runtime environments.
 * 3. Zero-Leak PII Sanitization via sanitizeDiagnostics (strips passwords, JWTs, emails, paths, DB schemas).
 * 4. Pluggable Crash Reporter Architecture (supports Sentry, Firebase Crashlytics, Datadog adapters).
 * 5. Automatic telemetry dispatch into uxHealthMonitor.
 */

import { Platform } from "react-native";
import { sanitizeDiagnostics } from "../../components/common/ErrorBoundaryView";
import { uxHealthMonitor } from "./uxHealthMonitor";

export interface CrashReport {
  id: string;
  type: "uncaught_exception" | "unhandled_rejection" | "manual_report";
  isFatal: boolean;
  message: string;
  stack?: string;
  timestamp: number;
  environment: string;
  platform: string;
  context?: Record<string, any>;
}

export type CrashListener = (report: CrashReport) => void;

class CrashReportingService {
  private isInitialized = false;
  private listeners: Set<CrashListener> = new Set();
  private originalGlobalHandler: ((error: any, isFatal?: boolean) => void) | null = null;

  /**
   * Register a third-party reporter (e.g. Sentry, Firebase Crashlytics)
   */
  public addListener(listener: CrashListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Initializes global error hooks for the entire application.
   * Safe to call multiple times (idempotent).
   */
  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. React Native ErrorUtils Global Handler
    this.setupErrorUtilsHandler();

    // 2. Unhandled Promise Rejections (Hermes / V8 / Browser)
    this.setupUnhandledRejectionHandler();

    if (__DEV__) {
      console.log("[CrashReporter] Global unhandled error handlers successfully attached.");
    }
  }

  /**
   * Hook into React Native's native JS ErrorUtils
   */
  private setupErrorUtilsHandler(): void {
    try {
      const globalObj = (typeof global !== "undefined" ? global : globalThis) as any;
      if (globalObj.ErrorUtils && typeof globalObj.ErrorUtils.getGlobalHandler === "function") {
        this.originalGlobalHandler = globalObj.ErrorUtils.getGlobalHandler();

        globalObj.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          this.handleUncaughtError(error, isFatal ?? false);

          // Invoke original handler so React Native can perform necessary shutdown or redbox in dev
          if (this.originalGlobalHandler) {
            try {
              this.originalGlobalHandler(error, isFatal);
            } catch {
              // Prevent fallback handler crash loops
            }
          }
        });
      }
    } catch (err) {
      console.warn("[CrashReporter] Failed to attach ErrorUtils handler:", err);
    }
  }

  /**
   * Hook into unhandled promise rejections
   */
  private setupUnhandledRejectionHandler(): void {
    try {
      const globalObj = (typeof global !== "undefined" ? global : globalThis) as any;

      if (Platform.OS === "web" && typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
          const reason = event.reason;
          this.handleUnhandledRejection(reason);
        });
      } else if (globalObj) {
        // React Native / Node / Hermes tracking hook
        const originalRejectionHandler = globalObj.onunhandledrejection;
        globalObj.onunhandledrejection = (event: any) => {
          const reason = event?.reason || event;
          this.handleUnhandledRejection(reason);

          if (typeof originalRejectionHandler === "function") {
            try {
              originalRejectionHandler(event);
            } catch {
              // Ignore
            }
          }
        };

        // Hermes / Promise library tracking if available
        if (typeof globalObj.HermesInternal === "object" && typeof (Promise as any).onPossiblyUnhandledRejection === "function") {
          (Promise as any).onPossiblyUnhandledRejection((error: any) => {
            this.handleUnhandledRejection(error);
          });
        }
      }
    } catch (err) {
      console.warn("[CrashReporter] Failed to attach unhandled promise rejection handler:", err);
    }
  }

  /**
   * Process and dispatch uncaught fatal/non-fatal exceptions
   */
  private handleUncaughtError(error: any, isFatal: boolean): void {
    try {
      const rawMsg = error?.message || (typeof error === "string" ? error : "Unknown uncaught error");
      const rawStack = error?.stack || "";
      const sanitizedMsg = sanitizeDiagnostics(rawMsg);
      const sanitizedStack = sanitizeDiagnostics(rawStack);

      const report: CrashReport = {
        id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: "uncaught_exception",
        isFatal,
        message: sanitizedMsg,
        stack: sanitizedStack,
        timestamp: Date.now(),
        environment: __DEV__ ? "development" : "production",
        platform: Platform.OS,
      };

      // 1. Telemetry recording
      uxHealthMonitor.recordError({
        screenName: "GlobalApp",
        sanitizedMessage: `[UncaughtException] ${sanitizedMsg}`,
        sanitizedStack: sanitizedStack,
        timestamp: report.timestamp,
      });

      // 2. Broadcast to pluggable listeners (Sentry/Crashlytics)
      this.dispatchToListeners(report);

      if (__DEV__) {
        console.error(`[CrashReporter] Uncaught Exception (isFatal=${isFatal}):`, sanitizedMsg);
      }
    } catch {
      // Never crash inside crash reporting
    }
  }

  /**
   * Process and dispatch unhandled promise rejections
   */
  private handleUnhandledRejection(reason: any): void {
    try {
      const rawMsg = reason?.message || (typeof reason === "string" ? reason : "Unhandled Promise Rejection");
      const rawStack = reason?.stack || "";
      const sanitizedMsg = sanitizeDiagnostics(rawMsg);
      const sanitizedStack = sanitizeDiagnostics(rawStack);

      const report: CrashReport = {
        id: `rejection-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: "unhandled_rejection",
        isFatal: false,
        message: sanitizedMsg,
        stack: sanitizedStack,
        timestamp: Date.now(),
        environment: __DEV__ ? "development" : "production",
        platform: Platform.OS,
      };

      uxHealthMonitor.recordError({
        screenName: "GlobalPromiseRejection",
        sanitizedMessage: `[UnhandledRejection] ${sanitizedMsg}`,
        sanitizedStack: sanitizedStack,
        timestamp: report.timestamp,
      });

      this.dispatchToListeners(report);

      if (__DEV__) {
        console.warn("[CrashReporter] Unhandled Promise Rejection:", sanitizedMsg);
      }
    } catch {
      // Safe guard
    }
  }

  /**
   * Manually report a caught non-fatal exception to crash reporting
   */
  public captureException(error: unknown, context?: Record<string, any>): void {
    try {
      const err = error as any;
      const rawMsg = err?.message || (typeof error === "string" ? error : "Manual exception report");
      const rawStack = err?.stack || "";
      const sanitizedMsg = sanitizeDiagnostics(rawMsg);
      const sanitizedStack = sanitizeDiagnostics(rawStack);

      const report: CrashReport = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: "manual_report",
        isFatal: false,
        message: sanitizedMsg,
        stack: sanitizedStack,
        timestamp: Date.now(),
        environment: __DEV__ ? "development" : "production",
        platform: Platform.OS,
        context,
      };

      uxHealthMonitor.recordError({
        screenName: context?.screenName || "ManualCapture",
        sanitizedMessage: sanitizedMsg,
        sanitizedStack: sanitizedStack,
        timestamp: report.timestamp,
      });

      this.dispatchToListeners(report);
    } catch {
      // Safe guard
    }
  }

  private dispatchToListeners(report: CrashReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (listenerErr) {
        console.warn("[CrashReporter] Listener dispatch failed:", listenerErr);
      }
    }
  }
}

export const crashReporter = new CrashReportingService();

/**
 * Initialize crash handlers immediately upon import
 */
export function initGlobalErrorHandlers(): void {
  crashReporter.init();
}
