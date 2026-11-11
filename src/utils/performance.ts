/**
 * Enterprise Performance Guardian & Render Pipeline Scheduler
 *
 * Core Capabilities:
 * 1. Lightweight Render Profiler: Detects unnecessary re-renders, shallow-equality failures,
 *    and excessive re-render cascades during user interactions.
 * 2. Low-Priority Task Scheduler: Uses InteractionManager.runAfterInteractions on Mobile
 *    and requestIdleCallback on Web to guarantee 120 FPS / 60 FPS smooth gestures.
 * 3. Frame Budget Guardian: Tracks frame budgets (8.33ms for 120Hz, 16.67ms for 60Hz)
 *    and chunks heavy computational workloads across animation frames.
 */

import React, { useEffect, useRef } from "react";
import { InteractionManager, Platform } from "react-native";

// ============================================================================
// 1. RENDER PROFILER & UNNECESSARY RE-RENDER DETECTOR
// ============================================================================

export interface RenderLogEntry {
  componentName: string;
  renderCount: number;
  timeSinceLastRenderMs: number;
  unstableProps: string[];
  changedProps: Record<string, { previous: any; current: any; reason: "reference" | "value" | "function" }>;
  timestamp: number;
}

export interface RenderProfilerOptions {
  enabled?: boolean;
  warnThreshold?: number; // Maximum renders allowed within sliding window before warning
  windowMs?: number; // Sliding window duration (default 1000ms)
  logToConsole?: boolean;
}

// Global registry of profiling summaries
const renderMetricsMap = new Map<
  string,
  {
    totalRenders: number;
    lastRenderTimestamp: number;
    recentRenderTimestamps: number[];
    unstablePropsMap: Map<string, number>;
  }
>();

/**
 * Reset all accumulated render metrics.
 */
export function resetRenderProfiling(): void {
  renderMetricsMap.clear();
}

/**
 * Retrieve summary of all component renders, frequencies, and unstable prop culprits.
 */
export function getRenderProfilingSummary(): Record<string, { totalRenders: number; renderRatePerSec: number; topUnstableProps: string[] }> {
  const summary: Record<string, any> = {};
  const now = Date.now();

  renderMetricsMap.forEach((data, componentName) => {
    const recent = data.recentRenderTimestamps.filter((t) => now - t <= 5000);
    const topProps = Array.from(data.unstablePropsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([prop]) => prop);

    summary[componentName] = {
      totalRenders: data.totalRenders,
      renderRatePerSec: recent.length / 5,
      topUnstableProps: topProps.slice(0, 5),
    };
  });

  return summary;
}

/**
 * Lightweight Hook that profiles component render frequency and isolates reference instability.
 */
export function useRenderProfiler(
  componentName: string,
  props?: Record<string, any>,
  options: RenderProfilerOptions = {}
): void {
  const {
    enabled = process.env.NODE_ENV !== "production",
    warnThreshold = 4,
    windowMs = 1000,
    logToConsole = false,
  } = options;

  if (!enabled) return;

  const prevPropsRef = useRef<Record<string, any> | undefined>(undefined);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);

  renderCountRef.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTimeRef.current;
  lastRenderTimeRef.current = now;

  // Update global component registry
  let compData = renderMetricsMap.get(componentName);
  if (!compData) {
    compData = {
      totalRenders: 0,
      lastRenderTimestamp: now,
      recentRenderTimestamps: [],
      unstablePropsMap: new Map(),
    };
    renderMetricsMap.set(componentName, compData);
  }
  compData.totalRenders += 1;
  compData.recentRenderTimestamps.push(now);
  compData.recentRenderTimestamps = compData.recentRenderTimestamps.filter((t) => now - t <= windowMs);

  // Analyze props differences if props were passed
  if (props && prevPropsRef.current) {
    const prev = prevPropsRef.current;
    const changed: RenderLogEntry["changedProps"] = {};
    const unstable: string[] = [];

    const allKeys = new Set([...Object.keys(props), ...Object.keys(prev)]);
    for (const key of allKeys) {
      const prevVal = prev[key];
      const curVal = props[key];

      if (prevVal !== curVal) {
        let reason: "reference" | "value" | "function" = "value";
        if (typeof prevVal === "function" && typeof curVal === "function") {
          reason = "function";
          unstable.push(key);
        } else if (
          typeof prevVal === "object" &&
          prevVal !== null &&
          typeof curVal === "object" &&
          curVal !== null
        ) {
          try {
            if (JSON.stringify(prevVal) === JSON.stringify(curVal)) {
              reason = "reference";
              unstable.push(key);
            }
          } catch {
            reason = "reference";
          }
        }

        changed[key] = { previous: prevVal, current: curVal, reason };
        compData.unstablePropsMap.set(key, (compData.unstablePropsMap.get(key) || 0) + 1);
      }
    }

    // Detect excessive render bursts
    if (compData.recentRenderTimestamps.length > warnThreshold) {
      if (logToConsole || __DEV__) {
        console.warn(
          `[RenderProfiler] Excessive re-renders detected in <${componentName}>: ` +
            `${compData.recentRenderTimestamps.length} renders in ${windowMs}ms. ` +
            (unstable.length > 0 ? `Unstable reference props: [${unstable.join(", ")}]` : "")
        );
      }
    }
  }

  prevPropsRef.current = props;
}

/**
 * Higher-Order Component (HOC) for transparent render profiling.
 */
export function withRenderProfiler<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  displayName?: string
): React.FC<P> {
  const name = displayName || WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ProfiledComponent: React.FC<P> = (props: P) => {
    useRenderProfiler(name, props as Record<string, any>);
    return React.createElement(WrappedComponent, props);
  };

  ProfiledComponent.displayName = `withRenderProfiler(${name})`;
  return ProfiledComponent;
}

// ============================================================================
// 2. AUTOMATIC LOW-PRIORITY TASK SCHEDULER (120 FPS / 60 FPS GUARDIAN)
// ============================================================================

export interface TaskSchedulerOptions {
  timeout?: number; // Max wait deadline in ms before forcing execution (default 2500ms)
  priority?: "idle" | "background" | "user-blocking";
}

type CancelFunction = () => void;

/**
 * Schedules non-critical work to run only when the JavaScript thread is idle and
 * gestures/animations have concluded.
 *
 * - On Mobile (React Native): Dispatches via InteractionManager.runAfterInteractions.
 * - On Web: Dispatches via window.requestIdleCallback with fallback to requestAnimationFrame.
 */
export function scheduleLowPriorityTask(
  task: () => void | Promise<void>,
  options: TaskSchedulerOptions = {}
): CancelFunction {
  const { timeout = 2500, priority = "idle" } = options;
  let cancelled = false;
  let timerId: any = null;

  if (priority === "user-blocking") {
    // Immediate execution on current tick
    Promise.resolve().then(() => {
      if (!cancelled) task();
    });
    return () => {
      cancelled = true;
    };
  }

  if (Platform.OS === "web") {
    // Modern Web: window.requestIdleCallback
    if (typeof window !== "undefined" && typeof (window as any).requestIdleCallback === "function") {
      const handle = (window as any).requestIdleCallback(
        (deadline: { didTimeout: boolean; timeRemaining: () => number }) => {
          if (!cancelled) {
            task();
          }
        },
        { timeout }
      );

      return () => {
        cancelled = true;
        if (typeof (window as any).cancelIdleCallback === "function") {
          (window as any).cancelIdleCallback(handle);
        }
      };
    }

    // Fallback on web browsers without requestIdleCallback (e.g. older Safari)
    timerId = setTimeout(() => {
      if (!cancelled) {
        if (typeof window !== "undefined" && window.requestAnimationFrame) {
          window.requestAnimationFrame(() => {
            if (!cancelled) task();
          });
        } else {
          task();
        }
      }
    }, Math.min(timeout, 50));

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }

  // Native Mobile (iOS / Android): Run after gestures and active touch animations conclude
  const interactionHandle = InteractionManager.runAfterInteractions(() => {
    if (!cancelled) {
      if (timerId) clearTimeout(timerId);
      task();
    }
  });

  // Safety fallback timeout to prevent indefinite starvation if interactions remain active
  timerId = setTimeout(() => {
    if (!cancelled) {
      interactionHandle.cancel();
      task();
    }
  }, timeout);

  return () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
    interactionHandle.cancel();
  };
}

/**
 * Convenience wrapper to run an idle task.
 */
export function runTaskIdle(task: () => void | Promise<void>, timeoutMs: number = 2000): CancelFunction {
  return scheduleLowPriorityTask(task, { timeout: timeoutMs, priority: "idle" });
}

/**
 * Sequentially executes a batch of low-priority background tasks one per idle frame,
 * preventing JS thread starvation during 60-second scrolling sessions.
 */
export function scheduleTaskBatch(
  tasks: Array<() => void | Promise<void>>,
  options: { timeout?: number; batchSize?: number } = {}
): CancelFunction {
  const { timeout = 2500, batchSize = 1 } = options;
  let currentIndex = 0;
  let cancelCurrent: CancelFunction | null = null;
  let isCancelled = false;

  const processNextBatch = () => {
    if (isCancelled || currentIndex >= tasks.length) return;

    cancelCurrent = scheduleLowPriorityTask(
      () => {
        if (isCancelled) return;
        const limit = Math.min(currentIndex + batchSize, tasks.length);
        for (let i = currentIndex; i < limit; i++) {
          try {
            tasks[i]();
          } catch (err) {
            console.warn("[scheduleTaskBatch] Error in task execution:", err);
          }
        }
        currentIndex = limit;

        if (currentIndex < tasks.length && !isCancelled) {
          processNextBatch();
        }
      },
      { timeout }
    );
  };

  processNextBatch();

  return () => {
    isCancelled = true;
    if (cancelCurrent) cancelCurrent();
  };
}

// ============================================================================
// 3. FRAME BUDGET GUARDIAN & TICK MONITOR
// ============================================================================

export const FRAME_BUDGET_120FPS_MS = 8.33;
export const FRAME_BUDGET_60FPS_MS = 16.67;

/**
 * Execute work chunk while staying within the allocated frame budget.
 * Returns true if all work completed, false if time budget was exceeded.
 */
export function executeWithinFrameBudget(
  workChunk: () => boolean,
  budgetMs: number = FRAME_BUDGET_120FPS_MS
): boolean {
  const startTime = Date.now();
  let done = false;

  while (Date.now() - startTime < budgetMs) {
    done = workChunk();
    if (done) return true;
  }

  return false;
}

/**
 * Frame drop detector tracking JS thread tick intervals.
 */
export class FrameDropTracker {
  private isTracking = false;
  private droppedFrames = 0;
  private totalFrames = 0;
  private lastTick = 0;
  private timerId: any = null;

  start(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.droppedFrames = 0;
    this.totalFrames = 0;
    this.lastTick = Date.now();

    const checkFrame = () => {
      if (!this.isTracking) return;
      const now = Date.now();
      const delta = now - this.lastTick;
      this.lastTick = now;
      this.totalFrames += 1;

      // In a 60 FPS baseline (16.67ms), any delta > 32ms indicates a dropped frame
      if (delta > 32) {
        const dropped = Math.floor(delta / 16.67) - 1;
        this.droppedFrames += Math.max(0, dropped);
      }

      this.timerId = setTimeout(checkFrame, 16);
    };

    this.timerId = setTimeout(checkFrame, 16);
  }

  stop(): { droppedFrames: number; totalFrames: number; dropRate: number } {
    this.isTracking = false;
    if (this.timerId) clearTimeout(this.timerId);

    const dropRate = this.totalFrames > 0 ? (this.droppedFrames / this.totalFrames) * 100 : 0;
    return {
      droppedFrames: this.droppedFrames,
      totalFrames: this.totalFrames,
      dropRate,
    };
  }
}

export const frameDropTracker = new FrameDropTracker();
