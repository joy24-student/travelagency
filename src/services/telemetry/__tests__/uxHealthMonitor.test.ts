jest.mock("react-native-reanimated", () => ({
  Easing: {
    linear: (t: number) => t,
    out: () => (t: number) => t,
    quad: (t: number) => t * t,
    bezier: () => (t: number) => t,
  },
}));

jest.mock("expo-device", () => ({
  totalMemory: 4 * 1024 * 1024 * 1024,
  deviceYearClass: 2023,
  isDevice: true,
}));

import {
  uxHealthMonitor,
  UX_HEALTH_CONFIG,
  type UxHealthSnapshot,
} from "../uxHealthMonitor";

describe("uxHealthMonitor Telemetry & Reliability Engine", () => {
  beforeEach(() => {
    uxHealthMonitor.resetMetrics();
  });

  afterAll(() => {
    uxHealthMonitor.destroy();
  });

  describe("Requirement 1: Automated Low-Power / Low-Bandwidth Mode", () => {
    it("should trigger low-bandwidth mode when network latency > 2500ms", () => {
      // Initially normal
      expect(uxHealthMonitor.getSnapshot().isLowBandwidthMode).toBe(false);
      expect(uxHealthMonitor.getSnapshot().disableHeavyBlur).toBe(false);

      // Record request with latency > 2500ms (e.g. 2501ms)
      uxHealthMonitor.recordNetworkMetric({
        latencyMs: 2501,
        isTimeout: false,
        isError: false,
      });

      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.isLowBandwidthMode).toBe(true);
      expect(snapshot.imageQuality).toBe("low");
      expect(snapshot.disableHeavyBlur).toBe(true);
      expect(snapshot.fallbackReasons.some((r) => r.includes("High network latency"))).toBe(true);
    });

    it("should not trigger low-bandwidth mode if latency is <= 2500ms without timeouts", () => {
      uxHealthMonitor.recordNetworkMetric({
        latencyMs: 2499,
        isTimeout: false,
        isError: false,
      });

      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.isLowBandwidthMode).toBe(false);
      expect(snapshot.disableHeavyBlur).toBe(false);
    });

    it("should trigger low-bandwidth mode when 3 consecutive request timeouts occur", () => {
      expect(uxHealthMonitor.getSnapshot().isLowBandwidthMode).toBe(false);

      // Timeout 1
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 5000, isTimeout: true });
      expect(uxHealthMonitor.getSnapshot().isLowBandwidthMode).toBe(false);
      expect(uxHealthMonitor.getSnapshot().network.consecutiveTimeouts).toBe(1);

      // Timeout 2
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 5000, isTimeout: true });
      expect(uxHealthMonitor.getSnapshot().isLowBandwidthMode).toBe(false);
      expect(uxHealthMonitor.getSnapshot().network.consecutiveTimeouts).toBe(2);

      // Timeout 3 -> Threshold reached!
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 5000, isTimeout: true });
      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.isLowBandwidthMode).toBe(true);
      expect(snapshot.imageQuality).toBe("low");
      expect(snapshot.disableHeavyBlur).toBe(true);
      expect(snapshot.network.consecutiveTimeouts).toBe(3);
      expect(
        snapshot.fallbackReasons.some((r) => r.includes("3 consecutive network request timeouts"))
      ).toBe(true);
    });

    it("should reset consecutive timeouts when a successful request arrives", () => {
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 3000, isTimeout: true });
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 3000, isTimeout: true });
      expect(uxHealthMonitor.getSnapshot().network.consecutiveTimeouts).toBe(2);

      // Successful request resets consecutive count
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 400, isTimeout: false });
      expect(uxHealthMonitor.getSnapshot().network.consecutiveTimeouts).toBe(0);
    });

    it("should automatically switch image URLs to low-res when low-bandwidth mode is active", () => {
      const unsplashUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80";

      // Normal mode: high resolution
      const normalOptimized = uxHealthMonitor.getOptimizedImageUrl(unsplashUrl);
      expect(normalOptimized).toContain("w=800");

      // Trigger low-bandwidth mode
      uxHealthMonitor.activateLowBandwidthMode("Low network bandwidth test");

      // Low-res mode: downscaled width and quality
      const lowOptimized = uxHealthMonitor.getOptimizedImageUrl(unsplashUrl);
      expect(lowOptimized).toContain("w=320");
      expect(lowOptimized).toContain("q=35");
    });

    it("should return blur intensity 0 when heavy blur is disabled", () => {
      // Normal mode
      expect(uxHealthMonitor.getEffectiveBlurIntensity(25)).toBe(25);

      // Trigger low bandwidth / disable blur
      uxHealthMonitor.activateLowBandwidthMode("Test blur suppression");
      expect(uxHealthMonitor.getEffectiveBlurIntensity(25)).toBe(0);
    });

    it("should auto-recover when consecutive fast requests stabilize", () => {
      // Trigger low bandwidth
      uxHealthMonitor.recordNetworkMetric({ latencyMs: 2600, isTimeout: false });
      expect(uxHealthMonitor.getSnapshot().isLowBandwidthMode).toBe(true);

      // 4 consecutive fast requests (< 1200ms)
      for (let i = 0; i < UX_HEALTH_CONFIG.NETWORK_RECOVERY_STABLE_COUNT; i++) {
        uxHealthMonitor.recordNetworkMetric({ latencyMs: 300, isTimeout: false });
      }

      const recovered = uxHealthMonitor.getSnapshot();
      expect(recovered.isLowBandwidthMode).toBe(false);
      expect(recovered.disableHeavyBlur).toBe(false);
    });
  });

  describe("Requirement 3: FPS Drop Detection & Reanimated Downscaling", () => {
    it("should downscale complexity to minimal when severe FPS drops occur", () => {
      // Simulate critical FPS drop (< 30 FPS)
      uxHealthMonitor.setSimulationFps(24, 40);

      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.animationComplexity).toBe("minimal");
      expect(snapshot.disableHeavyBlur).toBe(true);

      const spring = uxHealthMonitor.getAdaptiveSpringConfig();
      expect(spring.damping).toBe(50);
      expect(spring.stiffness).toBe(400);
      expect(spring.overshootClamping).toBe(true);

      const timing = uxHealthMonitor.getAdaptiveTimingConfig();
      expect(timing.duration).toBe(80);
    });

    it("should downscale complexity to low when moderate FPS drops occur", () => {
      // Start in high complexity
      uxHealthMonitor.resetMetrics();

      // Simulate moderate FPS drop (< 45 FPS)
      uxHealthMonitor.setSimulationFps(38, 25);

      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.animationComplexity).toBe("low");
      expect(snapshot.disableHeavyBlur).toBe(true);

      const spring = uxHealthMonitor.getAdaptiveSpringConfig();
      expect(spring.damping).toBe(32);
      expect(spring.overshootClamping).toBe(true);
    });

    it("should track component mount leaks when instance count exceeds threshold", () => {
      const cleanups: Array<() => void> = [];

      // Mount 15 instances of the same modal
      for (let i = 0; i < 15; i++) {
        cleanups.push(uxHealthMonitor.trackComponentMount("UserProfileModal"));
      }

      const snapshot = uxHealthMonitor.getSnapshot();
      expect(snapshot.memory.leakSuspected).toBe(true);
      expect(
        snapshot.fallbackReasons.some((r) => r.includes("Potential memory leak in [UserProfileModal]"))
      ).toBe(true);

      // Cleanup
      cleanups.forEach((c) => c());
    });

    it("should notify subscribers when state transitions occur", () => {
      const listener = jest.fn();
      const unsub = uxHealthMonitor.subscribe(listener);

      uxHealthMonitor.recordNetworkMetric({ latencyMs: 2900 });

      expect(listener).toHaveBeenCalled();
      unsub();
    });
  });
});
