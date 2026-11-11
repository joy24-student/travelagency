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

// Mock @expo/vector-icons and expo-font
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: "medium" },
}));

import * as React from "react";
import { View, Text, Pressable } from "react-native";
import renderer, { act } from "react-test-renderer";
import {
  ErrorBoundary,
  ErrorBoundaryView,
  sanitizeDiagnostics,
} from "../ErrorBoundaryView";
import { uxHealthMonitor } from "../../../services/telemetry/uxHealthMonitor";

describe("ErrorBoundary & Self-Healing Reliability Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uxHealthMonitor.resetMetrics();
  });

  afterAll(() => {
    uxHealthMonitor.destroy();
  });

  describe("Requirement 2.1: PII and Credential Sanitization Filter", () => {
    it("should sanitize user email addresses", () => {
      const raw = "Crash in userContext: traveler.john@gmail.com failed authentication";
      const sanitized = sanitizeDiagnostics(raw);
      expect(sanitized).not.toContain("traveler.john@gmail.com");
      expect(sanitized).toContain("[REDACTED_EMAIL]");
    });

    it("should sanitize phone numbers", () => {
      const raw = "Customer phone +8801712345678 or 01812345678 timed out";
      const sanitized = sanitizeDiagnostics(raw);
      expect(sanitized).not.toContain("+8801712345678");
      expect(sanitized).not.toContain("01812345678");
      expect(sanitized).toContain("[REDACTED_PHONE]");
    });

    it("should sanitize JWT tokens and secrets", () => {
      const fakeJwt =
        "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbiI6dHJ1ZX0.4ad7b11d99";
      const raw = `Bearer ${fakeJwt} with apikey=sk_live_9921389218392183921`;
      const sanitized = sanitizeDiagnostics(raw);
      expect(sanitized).not.toContain(fakeJwt);
      expect(sanitized).not.toContain("sk_live_9921389218392183921");
      expect(sanitized).toMatch(/\[REDACTED_JWT\]|\[REDACTED_CREDENTIAL\]/);
    });

    it("should sanitize payment card numbers", () => {
      const raw = "Payment transaction for card 4111 2222 3333 4444 failed";
      const sanitized = sanitizeDiagnostics(raw);
      expect(sanitized).not.toContain("4111 2222 3333 4444");
      expect(sanitized).toContain("[REDACTED_CARD]");
    });

    it("should sanitize local OS paths containing usernames", () => {
      const windowsPath = "C:\\Users\\Administrator\\Desktop\\trevelagency\\src\\index.ts";
      const unixPath = "/Users/alice/projects/travel/src/App.tsx";

      const sanitizedWin = sanitizeDiagnostics(windowsPath);
      const sanitizedUnix = sanitizeDiagnostics(unixPath);

      expect(sanitizedWin).not.toContain("Administrator");
      expect(sanitizedWin).toContain("[LOCAL_USER]");

      expect(sanitizedUnix).not.toContain("alice");
      expect(sanitizedUnix).toContain("[LOCAL_USER]");
    });

    it("should sanitize database relation and schema leaks", () => {
      const raw = 'relation "public.user_payment_methods" does not exist';
      const sanitized = sanitizeDiagnostics(raw);
      expect(sanitized).not.toContain("public.user_payment_methods");
      expect(sanitized).toContain("[DB_SCHEMA_RESTRICTED]");
    });
  });

  describe("Requirement 2.2: Error Boundary Self-Healing & Recovery", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
      if (shouldThrow) {
        throw new Error(
          "Corrupted screen state for user test.user@example.com at C:\\Users\\Dev\\Screen.tsx"
        );
      }
      return (
        <View>
          <Text>Screen Content Rendered Cleanly</Text>
        </View>
      );
    }

    it("should render children normally when no exception occurs", () => {
      let root: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <ErrorBoundary screenName="HotelsDiscovery">
            <BuggyComponent shouldThrow={false} />
          </ErrorBoundary>
        );
      });

      const textNodes = root!.root.findAllByType(Text);
      const found = textNodes.some((node) =>
        node.props.children?.toString().includes("Screen Content Rendered Cleanly")
      );
      expect(found).toBe(true);
    });

    it("should catch unhandled screen exceptions and present sanitized ErrorBoundaryView", () => {
      const onErrorMock = jest.fn();

      let root: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <ErrorBoundary screenName="HotelsDiscovery" onError={onErrorMock}>
            <BuggyComponent shouldThrow={true} />
          </ErrorBoundary>
        );
      });

      const textNodes = root!.root.findAllByType(Text);
      const hasTitle = textNodes.some((node) =>
        node.props.children?.toString().includes("Something went wrong on this screen")
      );
      const hasScreenName = textNodes.some((node) =>
        node.props.children?.toString().includes("HotelsDiscovery")
      );
      const hasRecoverButton = textNodes.some((node) =>
        node.props.children?.toString().includes("Recover Screen")
      );

      expect(hasTitle).toBe(true);
      expect(hasScreenName).toBe(true);
      expect(hasRecoverButton).toBe(true);

      // Verify sanitized onError details
      expect(onErrorMock).toHaveBeenCalled();
      const sanitizedReport = onErrorMock.mock.calls[0][0];
      expect(sanitizedReport.sanitizedMessage).not.toContain("test.user@example.com");
      expect(sanitizedReport.sanitizedMessage).toContain("[REDACTED_EMAIL]");
    });

    it("should self-heal and reset local component state upon tapping Recover Screen", () => {
      let fail = true;
      const onRecoverMock = jest.fn();

      function RecoverableComponent() {
        if (fail) {
          throw new Error("Temporary corrupted local state");
        }
        return (
          <View>
            <Text>Recovered Screen Content</Text>
          </View>
        );
      }

      let root: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <ErrorBoundary screenName="BookingCheckout" onRecover={onRecoverMock}>
            <RecoverableComponent />
          </ErrorBoundary>
        );
      });

      // Find the Recover Screen button by accessibilityLabel
      const recoverButtons = root!.root.findAllByProps({
        accessibilityLabel: "Recover Screen",
      });
      expect(recoverButtons.length).toBeGreaterThan(0);

      // Resolve the failure state before triggering recovery
      fail = false;

      // Press Recover Screen
      act(() => {
        recoverButtons[0].props.onPress();
      });

      expect(onRecoverMock).toHaveBeenCalled();

      // Ensure fresh child remounted successfully
      const textNodes = root!.root.findAllByType(Text);
      const hasRecoveredContent = textNodes.some((node) =>
        node.props.children?.toString().includes("Recovered Screen Content")
      );
      expect(hasRecoveredContent).toBe(true);
    });
  });
});
