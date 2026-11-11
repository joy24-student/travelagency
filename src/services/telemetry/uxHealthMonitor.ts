/**
 * UX Health & Reliability Telemetry Monitor
 *
 * DevSecOps & Frontend Reliability Engine for React Native / Expo:
 * 1. Network Latency & Consecutive Timeout Tracking:
 *    - Automatically toggles Low-Power / Low-Bandwidth mode when latency > 2500ms or 3 consecutive timeouts occur.
 *    - Switches image fetching to low-resolution CDNs and suppresses heavy blur effects.
 * 2. FPS Drop Detection & Dynamic Reanimated Downscaling:
 *    - Continuous frame-budget monitoring (~16.6ms at 60Hz).
 *    - Detects low-end hardware (RAM < 3GB, DeviceYear < 2021) and dynamically throttles animation complexity.
 * 3. Memory Pressure & Component Leak Detection:
 *    - Monitors JS heap memory usage where available.
 *    - Tracks component mount/unmount and subscription lifecycles to detect retain cycles and unmounted listeners.
 * 4. PII-Free Telemetry & Self-Healing Event Stream:
 *    - Zero personal identifiable information emitted.
 *    - Exposes reactive subscriptions and React hooks for real-time UI adaptation.
 */

import { Platform } from "react-native";
import * as Device from "expo-device";
import {
  Easing,
  WithSpringConfig,
  WithTimingConfig,
} from "react-native-reanimated";
import { useEffect, useState, useSyncExternalStore } from "react";

// ============================================================================
// Configuration Constants & Reliability Thresholds
// ============================================================================

export const UX_HEALTH_CONFIG = {
  // Network thresholds (Mandated by reliability SLA)
  LATENCY_CRITICAL_THRESHOLD_MS: 2500,
  CONSECUTIVE_TIMEOUTS_THRESHOLD: 3,
  NETWORK_RECOVERY_STABLE_COUNT: 4, // Successful consecutive requests < 1200ms needed to recover
  NETWORK_RECOVERY_LATENCY_CEILING_MS: 1200,

  // FPS & Frame drop thresholds
  TARGET_FPS: 60,
  FRAME_DROP_BUDGET_MS: 28, // Normal 60fps frame is ~16.67ms; >28ms implies a visible frame drop
  FPS_WARNING_THRESHOLD: 45,
  FPS_CRITICAL_THRESHOLD: 30,
  FPS_RECOVERY_STABLE_FRAMES: 300, // ~5 seconds of smooth 55+ fps needed to promote complexity
  FPS_SAMPLE_WINDOW_SIZE: 60, // Sliding window of 60 frames

  // Hardware classification
  LOW_END_RAM_THRESHOLD_BYTES: 3 * 1024 * 1024 * 1024, // 3 GB
  LOW_END_YEAR_CLASS_THRESHOLD: 2021,

  // Memory pressure thresholds
  HEAP_PRESSURE_WARNING_RATIO: 0.8,
  HEAP_PRESSURE_CRITICAL_RATIO: 0.9,
  COMPONENT_LEAK_WARN_INSTANCE_COUNT: 12, // More than 12 live unmounted instances of a single component
} as const;

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AnimationComplexity = "high" | "medium" | "low" | "minimal";
export type ImageQualityMode = "high" | "standard" | "low";
export type NetworkHealthStatus = "optimal" | "degraded" | "poor" | "offline";

export interface FpsMetrics {
  currentFps: number;
  averageFps: number;
  droppedFrames: number;
  dropRatePercentage: number;
  isDroppingFrames: boolean;
}

export interface NetworkMetrics {
  recentLatencyMs: number;
  averageLatencyMs: number;
  consecutiveTimeouts: number;
  successfulRequests: number;
  failedRequests: number;
  status: NetworkHealthStatus;
}

export interface MemoryMetrics {
  usedHeapMb?: number;
  totalHeapMb?: number;
  heapLimitMb?: number;
  pressureRatio?: number;
  leakSuspected: boolean;
  activeSubscriptionsCount: number;
  trackedComponentsCount: number;
}

export interface UxHealthSnapshot {
  timestamp: number;
  fps: FpsMetrics;
  network: NetworkMetrics;
  memory: MemoryMetrics;
  isLowBandwidthMode: boolean;
  isLowPowerMode: boolean;
  disableHeavyBlur: boolean;
  imageQuality: ImageQualityMode;
  animationComplexity: AnimationComplexity;
  isLowEndDevice: boolean;
  fallbackReasons: string[];
}

export interface SanitizedErrorReport {
  screenName?: string;
  sanitizedMessage: string;
  sanitizedStack?: string;
  componentStack?: string;
  timestamp: number;
}

// ============================================================================
// Hardware Detection Heuristics
// ============================================================================

function assessIsLowEndDevice(): boolean {
  try {
    // Check Expo Device RAM & Year Class
    if (Device.totalMemory && Device.totalMemory > 0) {
      if (Device.totalMemory < UX_HEALTH_CONFIG.LOW_END_RAM_THRESHOLD_BYTES) {
        return true;
      }
    }

    if (Device.deviceYearClass && Device.deviceYearClass > 0) {
      if (Device.deviceYearClass < UX_HEALTH_CONFIG.LOW_END_YEAR_CLASS_THRESHOLD) {
        return true;
      }
    }

    // Web & Browser environment fallback heuristics
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      const hwConcurrency = navigator.hardwareConcurrency;
      if (typeof hwConcurrency === "number" && hwConcurrency <= 4) {
        return true;
      }
      const deviceMemory = (navigator as any).deviceMemory;
      if (typeof deviceMemory === "number" && deviceMemory <= 3) {
        return true;
      }
    }
  } catch {
    // Fail safely without disrupting execution
  }
  return false;
}

// ============================================================================
// UX Health Monitor Service Class
// ============================================================================

class UxHealthMonitorService {
  private listeners: Set<(snapshot: UxHealthSnapshot) => void> = new Set();
  private degradationListeners: Set<(reason: string) => void> = new Set();

  // Low-End Device Flag (evaluated once on startup)
  private readonly isLowEndDevice: boolean = assessIsLowEndDevice();

  // Mode States
  private isLowBandwidthMode: boolean = false;
  private isLowPowerMode: boolean = false;
  private disableHeavyBlur: boolean = false;
  private imageQuality: ImageQualityMode = "standard";
  private animationComplexity: AnimationComplexity = "high";
  private fallbackReasons: Set<string> = new Set();

  // Network Tracking
  private latencySamples: number[] = [];
  private consecutiveTimeouts: number = 0;
  private successfulFastRequestsCount: number = 0;
  private totalRequests: number = 0;
  private failedRequests: number = 0;
  private lastLatencyMs: number = 0;

  // FPS Tracking
  private frameTimestamps: number[] = [];
  private currentFps: number = 60;
  private averageFps: number = 60;
  private droppedFramesCount: number = 0;
  private dropRatePercentage: number = 0;
  private isMonitoringFps: boolean = false;
  private rafId: number | null = null;
  private stableHighFpsFrameCount: number = 0;

  // Memory & Leak Tracking
  private activeSubscriptions: Map<string, number> = new Map();
  private activeComponents: Map<string, number> = new Map();
  private leakSuspected: boolean = false;
  private memoryCheckInterval: any = null;

  constructor() {
    // If device is low-end, calibrate baseline tiers conservatively
    if (this.isLowEndDevice) {
      this.animationComplexity = "medium";
      this.fallbackReasons.add("Low-spec hardware profile detected (RAM/CPU/Year)");
    }

    // Defer/suppress infinite timer loops in unit test environments
    const isTestEnv =
      typeof process !== "undefined" &&
      (process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID));

    if (!isTestEnv) {
      this.startFpsMonitoring();
      this.startMemoryMonitoring();
    }
  }

  // --------------------------------------------------------------------------
  // 1. Automated Low-Power & Low-Bandwidth Mode Engine
  // --------------------------------------------------------------------------

  /**
   * Record a network request telemetry metric.
   * Mandate: If network latency > 2500ms or 3 consecutive timeouts occur,
   * automatically switch image loading to low-res and disable heavy blur effects.
   */
  public recordNetworkMetric(metric: {
    latencyMs: number;
    isTimeout?: boolean;
    isError?: boolean;
    endpoint?: string;
  }): void {
    const { latencyMs, isTimeout = false, isError = false } = metric;
    this.totalRequests++;
    this.lastLatencyMs = Math.max(0, latencyMs);

    if (isTimeout) {
      this.failedRequests++;
      this.consecutiveTimeouts++;
      this.successfulFastRequestsCount = 0;

      if (this.consecutiveTimeouts >= UX_HEALTH_CONFIG.CONSECUTIVE_TIMEOUTS_THRESHOLD) {
        this.activateLowBandwidthMode(
          `${this.consecutiveTimeouts} consecutive network request timeouts detected`
        );
      }
    } else if (isError) {
      this.failedRequests++;
    } else {
      // Successful response
      this.consecutiveTimeouts = 0;
      this.latencySamples.push(this.lastLatencyMs);
      if (this.latencySamples.length > 20) {
        this.latencySamples.shift();
      }

      // Check latency threshold (> 2500ms triggers low-bandwidth mode)
      if (this.lastLatencyMs > UX_HEALTH_CONFIG.LATENCY_CRITICAL_THRESHOLD_MS) {
        this.successfulFastRequestsCount = 0;
        this.activateLowBandwidthMode(
          `High network latency detected (${Math.round(this.lastLatencyMs)}ms > ${UX_HEALTH_CONFIG.LATENCY_CRITICAL_THRESHOLD_MS}ms)`
        );
      } else if (
        this.lastLatencyMs <= UX_HEALTH_CONFIG.NETWORK_RECOVERY_LATENCY_CEILING_MS
      ) {
        // Fast healthy request
        this.successfulFastRequestsCount++;

        // Auto-heal / Recover from low bandwidth mode if network stabilizes
        if (
          this.isLowBandwidthMode &&
          this.successfulFastRequestsCount >= UX_HEALTH_CONFIG.NETWORK_RECOVERY_STABLE_COUNT
        ) {
          this.attemptNetworkRecovery();
        }
      }
    }

    this.notifyStateChange();
  }

  /**
   * Activate Low-Power / Low-Bandwidth mode
   */
  public activateLowBandwidthMode(reason: string): void {
    let changed = false;

    if (!this.isLowBandwidthMode) {
      this.isLowBandwidthMode = true;
      this.imageQuality = "low";
      changed = true;
    }

    if (!this.disableHeavyBlur) {
      this.disableHeavyBlur = true;
      changed = true;
    }

    if (!this.fallbackReasons.has(reason)) {
      this.fallbackReasons.add(reason);
      changed = true;
      this.notifyDegradation(reason);
    }

    if (changed) {
      this.notifyStateChange();
    }
  }

  /**
   * Graceful auto-recovery when network health stabilizes
   */
  private attemptNetworkRecovery(): void {
    // Only recover if not on hardware-restricted low-end device
    this.isLowBandwidthMode = false;
    this.imageQuality = this.isLowEndDevice ? "standard" : "high";

    // Re-enable blur if FPS is also healthy
    if (this.currentFps >= UX_HEALTH_CONFIG.FPS_WARNING_THRESHOLD && !this.isLowEndDevice) {
      this.disableHeavyBlur = false;
    }

    // Clean up network-related fallback reasons
    const reasonsToRemove: string[] = [];
    this.fallbackReasons.forEach((r) => {
      if (r.includes("latency") || r.includes("timeout")) {
        reasonsToRemove.push(r);
      }
    });
    reasonsToRemove.forEach((r) => this.fallbackReasons.delete(r));

    this.notifyStateChange();
  }

  /**
   * Helper to measure any async network operation and automatically record metrics
   */
  public async measureRequest<T>(
    requestFn: () => Promise<T>,
    options?: { endpoint?: string; timeoutMs?: number }
  ): Promise<T> {
    const start = Date.now();
    let timedOut = false;
    let timer: any = null;

    try {
      if (options?.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Request timed out after ${options.timeoutMs}ms`));
          }, options.timeoutMs);
        });

        const result = await Promise.race([requestFn(), timeoutPromise]);
        clearTimeout(timer);
        const duration = Date.now() - start;
        this.recordNetworkMetric({
          latencyMs: duration,
          isTimeout: false,
          isError: false,
          endpoint: options.endpoint,
        });
        return result;
      } else {
        const result = await requestFn();
        const duration = Date.now() - start;
        this.recordNetworkMetric({
          latencyMs: duration,
          isTimeout: false,
          isError: false,
          endpoint: options?.endpoint,
        });
        return result;
      }
    } catch (error: any) {
      if (timer) clearTimeout(timer);
      const duration = Date.now() - start;
      const isTimeout =
        timedOut ||
        error?.name === "AbortError" ||
        error?.message?.toLowerCase().includes("timeout") ||
        duration >= (options?.timeoutMs || UX_HEALTH_CONFIG.LATENCY_CRITICAL_THRESHOLD_MS);

      this.recordNetworkMetric({
        latencyMs: duration,
        isTimeout,
        isError: !isTimeout,
        endpoint: options?.endpoint,
      });

      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // 2. FPS Drop Detection & Reanimated Complexity Downscaling
  // --------------------------------------------------------------------------

  public startFpsMonitoring(): void {
    if (this.isMonitoringFps) return;
    this.isMonitoringFps = true;

    let lastTime = Date.now();

    const loop = () => {
      if (!this.isMonitoringFps) return;

      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      // Track frame delta
      if (delta > 0) {
        const instantFps = Math.min(60, Math.round(1000 / delta));
        this.frameTimestamps.push(delta);
        if (this.frameTimestamps.length > UX_HEALTH_CONFIG.FPS_SAMPLE_WINDOW_SIZE) {
          this.frameTimestamps.shift();
        }

        // Detect frame drop
        if (delta > UX_HEALTH_CONFIG.FRAME_DROP_BUDGET_MS) {
          this.droppedFramesCount++;
        }

        // Periodically evaluate rolling FPS averages
        if (this.frameTimestamps.length >= 30) {
          const totalMs = this.frameTimestamps.reduce((a, b) => a + b, 0);
          const avgFrameMs = totalMs / this.frameTimestamps.length;
          this.currentFps = Math.max(1, Math.min(60, Math.round(1000 / avgFrameMs)));
          this.averageFps = this.currentFps;

          const droppedInWindow = this.frameTimestamps.filter(
            (d) => d > UX_HEALTH_CONFIG.FRAME_DROP_BUDGET_MS
          ).length;
          this.dropRatePercentage = Math.round(
            (droppedInWindow / this.frameTimestamps.length) * 100
          );

          this.evaluateAnimationComplexity();
        }
      }

      if (this.isMonitoringFps && typeof requestAnimationFrame !== "undefined") {
        this.rafId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== "undefined") {
      this.rafId = requestAnimationFrame(loop);
    }
  }

  /**
   * Evaluate frame rates and dynamically downscale or upscale Reanimated complexity
   */
  private evaluateAnimationComplexity(): void {
    let changed = false;

    // Severe FPS drop: current FPS < 30 or drop rate > 35%
    if (
      this.currentFps < UX_HEALTH_CONFIG.FPS_CRITICAL_THRESHOLD ||
      this.dropRatePercentage > 35
    ) {
      if (this.animationComplexity !== "minimal") {
        this.animationComplexity = "minimal";
        this.disableHeavyBlur = true;
        this.fallbackReasons.add(
          `Critical FPS drop detected (${this.currentFps} FPS, ${this.dropRatePercentage}% drops)`
        );
        changed = true;
      }
      this.stableHighFpsFrameCount = 0;
    }
    // Moderate FPS drop: current FPS < 45 or drop rate > 20%
    else if (
      this.currentFps < UX_HEALTH_CONFIG.FPS_WARNING_THRESHOLD ||
      this.dropRatePercentage > 20
    ) {
      if (this.animationComplexity === "high") {
        this.animationComplexity = "low";
        this.disableHeavyBlur = true;
        this.fallbackReasons.add(
          `FPS degradation detected (${this.currentFps} FPS, ${this.dropRatePercentage}% drops)`
        );
        changed = true;
      } else if (this.animationComplexity === "medium") {
        this.animationComplexity = "low";
        changed = true;
      }
      this.stableHighFpsFrameCount = 0;
    }
    // Healthy frame rate sustained: current FPS >= 55 and low drop rate
    else if (this.currentFps >= 55 && this.dropRatePercentage < 5) {
      this.stableHighFpsFrameCount++;

      // Require stable frames before considering an upgrade
      if (
        this.stableHighFpsFrameCount >= UX_HEALTH_CONFIG.FPS_RECOVERY_STABLE_FRAMES &&
        !this.isLowEndDevice
      ) {
        if (this.animationComplexity === "minimal") {
          this.animationComplexity = "low";
          this.stableHighFpsFrameCount = 0;
          changed = true;
        } else if (this.animationComplexity === "low") {
          this.animationComplexity = "medium";
          this.stableHighFpsFrameCount = 0;
          changed = true;
        } else if (this.animationComplexity === "medium" && !this.isLowBandwidthMode) {
          this.animationComplexity = "high";
          this.disableHeavyBlur = false;
          this.stableHighFpsFrameCount = 0;
          changed = true;
        }
      }
    }

    if (changed) {
      this.notifyStateChange();
    }
  }

  // --------------------------------------------------------------------------
  // 3. Memory Pressure & Component Leak Tracking
  // --------------------------------------------------------------------------

  /**
   * Track component mount to detect runaway retention leaks
   */
  public trackComponentMount(componentName: string): () => void {
    const current = this.activeComponents.get(componentName) || 0;
    this.activeComponents.set(componentName, current + 1);

    if (current + 1 > UX_HEALTH_CONFIG.COMPONENT_LEAK_WARN_INSTANCE_COUNT) {
      this.leakSuspected = true;
      this.fallbackReasons.add(
        `Potential memory leak in [${componentName}]: ${current + 1} active unmounted instances`
      );
      this.notifyDegradation(
        `Component leak warning: excessive instances of ${componentName}`
      );
      this.notifyStateChange();
    }

    return () => {
      const count = this.activeComponents.get(componentName) || 1;
      if (count <= 1) {
        this.activeComponents.delete(componentName);
      } else {
        this.activeComponents.set(componentName, count - 1);
      }
    };
  }

  /**
   * Track async subscriptions (WebSockets, intervals, event listeners)
   */
  public trackSubscription(subscriptionName: string): () => void {
    const current = this.activeSubscriptions.get(subscriptionName) || 0;
    this.activeSubscriptions.set(subscriptionName, current + 1);

    return () => {
      const count = this.activeSubscriptions.get(subscriptionName) || 1;
      if (count <= 1) {
        this.activeSubscriptions.delete(subscriptionName);
      } else {
        this.activeSubscriptions.set(subscriptionName, count - 1);
      }
    };
  }

  public startMemoryMonitoring(): void {
    if (typeof setInterval !== "undefined") {
      this.memoryCheckInterval = setInterval(() => {
        this.checkMemoryPressure();
      }, 15000); // Check every 15s
    }
  }

  private checkMemoryPressure(): void {
    try {
      if (typeof Platform !== "undefined" && Platform?.OS === "web" && typeof performance !== "undefined") {
        const memory = (performance as any)?.memory;
        if (memory && memory.jsHeapSizeLimit) {
          const usedMb = memory.usedJSHeapSize / (1024 * 1024);
          const totalMb = memory.totalJSHeapSize / (1024 * 1024);
          const limitMb = memory.jsHeapSizeLimit / (1024 * 1024);
          const pressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

          if (pressure > UX_HEALTH_CONFIG.HEAP_PRESSURE_CRITICAL_RATIO) {
            this.leakSuspected = true;
            this.animationComplexity = "minimal";
            this.disableHeavyBlur = true;
            this.fallbackReasons.add(
              `Critical heap memory pressure (${Math.round(usedMb)}MB / ${Math.round(limitMb)}MB)`
            );
            this.notifyStateChange();
          }
        }
      }
    } catch {
      // Fail safely
    }
  }

  // --------------------------------------------------------------------------
  // 4. Image & Visual Fallback Helpers
  // --------------------------------------------------------------------------

  /**
   * Transform an image URL into a lightweight, low-bandwidth version
   * when low-bandwidth mode is active.
   */
  public getOptimizedImageUrl(
    url?: string | null,
    options?: { width?: number; quality?: number }
  ): string {
    if (!url || typeof url !== "string") return "";

    const isLowMode = this.isLowBandwidthMode || this.imageQuality === "low";

    try {
      const parsed = new URL(url);

      // Unsplash CDN adaptation
      if (parsed.hostname.includes("unsplash.com")) {
        parsed.searchParams.set("auto", "format");
        if (isLowMode) {
          parsed.searchParams.set("w", String(options?.width || 320));
          parsed.searchParams.set("q", String(options?.quality || 35));
        } else {
          parsed.searchParams.set("w", String(options?.width || 800));
          parsed.searchParams.set("q", String(options?.quality || 75));
        }
        return parsed.toString();
      }

      // Cloudinary CDN adaptation
      if (parsed.hostname.includes("cloudinary.com")) {
        const trans = isLowMode ? "w_320,q_auto:eco,f_auto" : "w_800,q_auto:good,f_auto";
        if (url.includes("/upload/")) {
          return url.replace("/upload/", `/upload/${trans}/`);
        }
      }

      // Supabase Storage Image Transformation
      if (parsed.hostname.includes("supabase.co") && url.includes("/object/public/")) {
        if (isLowMode) {
          parsed.searchParams.set("width", String(options?.width || 320));
          parsed.searchParams.set("quality", String(options?.quality || 40));
          return parsed.toString();
        }
      }

      // Generic URL fallback: if in low mode and custom params given
      if (isLowMode) {
        parsed.searchParams.set("quality", "low");
        return parsed.toString();
      }
    } catch {
      // Return raw URL if not parseable
    }

    return url;
  }

  /**
   * Returns effective blur intensity.
   * If heavy blur is disabled due to frame drops or low-bandwidth, returns 0.
   */
  public getEffectiveBlurIntensity(defaultIntensity: number = 20): number {
    if (this.disableHeavyBlur || this.isLowBandwidthMode) {
      return 0;
    }
    if (this.animationComplexity === "low" || this.animationComplexity === "minimal") {
      return Math.min(defaultIntensity, 5);
    }
    return defaultIntensity;
  }

  /**
   * Get adaptive spring configuration dynamically scaled by device performance
   */
  public getAdaptiveSpringConfig(
    baseConfig?: Record<string, any>
  ): WithSpringConfig {
    switch (this.animationComplexity) {
      case "minimal":
        // Zero oscillation, quick clamp
        return {
          damping: 50,
          stiffness: 400,
          mass: 0.5,
          overshootClamping: true,
          ...baseConfig,
        } as WithSpringConfig;
      case "low":
        // Fast settling, stiff spring
        return {
          damping: 32,
          stiffness: 260,
          mass: 0.8,
          overshootClamping: true,
          ...baseConfig,
        } as WithSpringConfig;
      case "medium":
        // Balanced standard feel
        return {
          damping: 22,
          stiffness: 180,
          mass: 0.95,
          overshootClamping: false,
          ...baseConfig,
        } as WithSpringConfig;
      case "high":
      default:
        // Lush physics
        return {
          damping: 18,
          stiffness: 140,
          mass: 1,
          overshootClamping: false,
          ...baseConfig,
        } as WithSpringConfig;
    }
  }

  /**
   * Get adaptive timing configuration scaled by performance
   */
  public getAdaptiveTimingConfig(
    baseConfig?: Partial<WithTimingConfig>
  ): WithTimingConfig {
    switch (this.animationComplexity) {
      case "minimal":
        return {
          duration: 80,
          easing: Easing.linear,
          ...baseConfig,
        };
      case "low":
        return {
          duration: 150,
          easing: Easing.out(Easing.quad),
          ...baseConfig,
        };
      case "medium":
        return {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          ...baseConfig,
        };
      case "high":
      default:
        return {
          duration: 350,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          ...baseConfig,
        };
    }
  }

  // --------------------------------------------------------------------------
  // 5. Diagnostics, Self-Healing Logging & Subscriptions
  // --------------------------------------------------------------------------

  /**
   * Record sanitized error telemetry event without leaking PII
   */
  public recordError(errorReport: SanitizedErrorReport): void {
    if (__DEV__) {
      console.warn(
        `[UXHealthMonitor] Caught Exception in <${errorReport.screenName || "Screen"}>: ${errorReport.sanitizedMessage}`
      );
    }
    // We could dispatch to remote telemetry / logging backend here securely
  }

  /**
   * Record screen self-healing recovery event
   */
  public recordScreenRecovery(screenName?: string): void {
    if (__DEV__) {
      console.log(`[UXHealthMonitor] Screen <${screenName || "Screen"}> recovered successfully.`);
    }
  }

  /**
   * Get immutable snapshot of current health telemetry
   */
  public getSnapshot(): UxHealthSnapshot {
    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(
            this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
          )
        : this.lastLatencyMs;

    let networkStatus: NetworkHealthStatus = "optimal";
    if (this.consecutiveTimeouts >= UX_HEALTH_CONFIG.CONSECUTIVE_TIMEOUTS_THRESHOLD) {
      networkStatus = "poor";
    } else if (
      this.lastLatencyMs > UX_HEALTH_CONFIG.LATENCY_CRITICAL_THRESHOLD_MS ||
      this.isLowBandwidthMode
    ) {
      networkStatus = "degraded";
    }

    let usedHeapMb: number | undefined;
    let totalHeapMb: number | undefined;
    let heapLimitMb: number | undefined;
    let pressureRatio: number | undefined;

    if (typeof Platform !== "undefined" && Platform?.OS === "web" && typeof performance !== "undefined") {
      const memory = (performance as any)?.memory;
      if (memory) {
        usedHeapMb = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        totalHeapMb = Math.round(memory.totalJSHeapSize / (1024 * 1024));
        heapLimitMb = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        pressureRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }
    }

    return {
      timestamp: Date.now(),
      fps: {
        currentFps: this.currentFps,
        averageFps: this.averageFps,
        droppedFrames: this.droppedFramesCount,
        dropRatePercentage: this.dropRatePercentage,
        isDroppingFrames: this.dropRatePercentage > 15,
      },
      network: {
        recentLatencyMs: this.lastLatencyMs,
        averageLatencyMs: avgLatency,
        consecutiveTimeouts: this.consecutiveTimeouts,
        successfulRequests: this.totalRequests - this.failedRequests,
        failedRequests: this.failedRequests,
        status: networkStatus,
      },
      memory: {
        usedHeapMb,
        totalHeapMb,
        heapLimitMb,
        pressureRatio,
        leakSuspected: this.leakSuspected,
        activeSubscriptionsCount: this.activeSubscriptions.size,
        trackedComponentsCount: this.activeComponents.size,
      },
      isLowBandwidthMode: this.isLowBandwidthMode,
      isLowPowerMode: this.isLowPowerMode,
      disableHeavyBlur: this.disableHeavyBlur,
      imageQuality: this.imageQuality,
      animationComplexity: this.animationComplexity,
      isLowEndDevice: this.isLowEndDevice,
      fallbackReasons: Array.from(this.fallbackReasons),
    };
  }

  /**
   * Subscribe to UX Health state transitions
   */
  public subscribe(listener: (snapshot: UxHealthSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to degradation alarms
   */
  public onDegradation(callback: (reason: string) => void): () => void {
    this.degradationListeners.add(callback);
    return () => {
      this.degradationListeners.delete(callback);
    };
  }

  private notifyStateChange(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // Prevent listener exceptions from breaking the monitor
      }
    });
  }

  private notifyDegradation(reason: string): void {
    this.degradationListeners.forEach((listener) => {
      try {
        listener(reason);
      } catch {
        // Prevent listener exceptions from breaking the monitor
      }
    });
  }

  /**
   * Reset all metrics, modes, and counters to pristine initial states.
   * Useful for user recovery, session refresh, or automated testing.
   */
  public resetMetrics(): void {
    this.isLowBandwidthMode = false;
    this.isLowPowerMode = false;
    this.disableHeavyBlur = false;
    this.imageQuality = this.isLowEndDevice ? "standard" : "high";
    this.animationComplexity = this.isLowEndDevice ? "medium" : "high";
    this.fallbackReasons.clear();
    if (this.isLowEndDevice) {
      this.fallbackReasons.add("Low-spec hardware profile detected (RAM/CPU/Year)");
    }
    this.latencySamples = [];
    this.consecutiveTimeouts = 0;
    this.successfulFastRequestsCount = 0;
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.lastLatencyMs = 0;
    this.frameTimestamps = [];
    this.currentFps = 60;
    this.averageFps = 60;
    this.droppedFramesCount = 0;
    this.dropRatePercentage = 0;
    this.stableHighFpsFrameCount = 0;
    this.leakSuspected = false;
    this.activeSubscriptions.clear();
    this.activeComponents.clear();
    this.notifyStateChange();
  }

  /**
   * Simulate FPS updates for testing or deterministic stress-testing
   */
  public setSimulationFps(fps: number, dropRate: number = 0): void {
    this.currentFps = fps;
    this.averageFps = fps;
    this.dropRatePercentage = dropRate;
    this.evaluateAnimationComplexity();
  }

  /**
   * Wrap standard fetch call with latency tracking and automatic timeout detection
   */
  public wrapFetch(customFetch: typeof fetch = fetch): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      const start = Date.now();
      try {
        const response = await customFetch(input, init);
        const duration = Date.now() - start;
        this.recordNetworkMetric({
          latencyMs: duration,
          isTimeout: false,
          isError: !response.ok,
          endpoint: url,
        });
        return response;
      } catch (err: any) {
        const duration = Date.now() - start;
        const isTimeout =
          err?.name === "AbortError" ||
          err?.message?.toLowerCase().includes("timeout") ||
          duration >= UX_HEALTH_CONFIG.LATENCY_CRITICAL_THRESHOLD_MS;
        this.recordNetworkMetric({
          latencyMs: duration,
          isTimeout,
          isError: true,
          endpoint: url,
        });
        throw err;
      }
    };
  }

  /**
   * Cleanup all resources (useful for testing or hot reloading)
   */
  public destroy(): void {
    this.isMonitoringFps = false;
    if (this.rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.listeners.clear();
    this.degradationListeners.clear();
  }
}

export { UxHealthMonitorService };

// Global Singleton Instance
export const uxHealthMonitor = new UxHealthMonitorService();

// ============================================================================
// React Hooks for Ergonomic Component Integration
// ============================================================================

/**
 * Universal React hook to access live UX health telemetry
 */
export function useUxHealth(): UxHealthSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => uxHealthMonitor.subscribe(onStoreChange),
    () => uxHealthMonitor.getSnapshot(),
    () => uxHealthMonitor.getSnapshot()
  );
}

/**
 * Hook to automatically retrieve optimized image URL based on bandwidth mode
 */
export function useAdaptiveImage(
  url?: string | null,
  options?: { width?: number; quality?: number }
): {
  url: string;
  isLowRes: boolean;
  imageQuality: ImageQualityMode;
} {
  const health = useUxHealth();
  const optimizedUrl = uxHealthMonitor.getOptimizedImageUrl(url, options);

  return {
    url: optimizedUrl,
    isLowRes: health.isLowBandwidthMode || health.imageQuality === "low",
    imageQuality: health.imageQuality,
  };
}

/**
 * Hook to retrieve effective blur intensity and whether blur should be disabled
 */
export function useAdaptiveBlur(defaultIntensity: number = 20): {
  intensity: number;
  isDisabled: boolean;
} {
  const health = useUxHealth();
  const intensity = uxHealthMonitor.getEffectiveBlurIntensity(defaultIntensity);

  return {
    intensity,
    isDisabled: health.disableHeavyBlur || intensity === 0,
  };
}

/**
 * Hook to retrieve performance-adaptive Reanimated animation configs
 */
export function useAdaptiveAnimation(): {
  complexity: AnimationComplexity;
  shouldSimplify: boolean;
  getSpringConfig: (base?: any) => WithSpringConfig;
  getTimingConfig: (base?: Partial<WithTimingConfig>) => WithTimingConfig;
} {
  const health = useUxHealth();

  return {
    complexity: health.animationComplexity,
    shouldSimplify:
      health.animationComplexity === "low" || health.animationComplexity === "minimal",
    getSpringConfig: (base) => uxHealthMonitor.getAdaptiveSpringConfig(base),
    getTimingConfig: (base) => uxHealthMonitor.getAdaptiveTimingConfig(base),
  };
}
