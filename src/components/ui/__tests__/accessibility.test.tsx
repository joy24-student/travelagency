jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: () => ({ downloadAsync: jest.fn(), uri: "" }),
  },
}), { virtual: true });

jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: View,
  };
});
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { View } = require("react-native");
  return View;
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("../../../context/ThemeContext", () => {
  const { colors } = require("../../../theme/colors");
  return {
    useTheme: () => ({
      themeMode: "light",
      isDark: false,
      isOled: false,
      colors: colors,
      setThemeMode: jest.fn(),
    }),
    useAppTheme: () => ({
      themeMode: "light",
      isDark: false,
      isOled: false,
      colors: colors,
      setThemeMode: jest.fn(),
    }),
    ThemeProvider: ({ children }: any) => children,
  };
});

import * as React from "react";
import renderer, { act } from "react-test-renderer";
import { IconButton } from "../IconButton";
import { Badge } from "../Badge";
import { Input } from "../Input";
import { AccessibleText } from "../AccessibleText";
import {
  getContrastRatio,
  verifyDesignSystemContrast,
} from "../../../utils/a11y/contrast";
import { colors } from "../../../theme/colors";
import { touchTargets } from "../../../theme/spacing";

describe("Accessibility (A11y) Design System Test Suite", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe("1. IconButton Accessibility & Minimum Touch Targets", () => {
    it("renders with required accessibilityRole='button' and accessibilityLabel", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <IconButton
            accessibilityLabel="Close dialog"
            accessibilityHint="Dismisses the active modal"
            icon="close"
          />
        );
      });

      const tree = root.toJSON() as any;
      expect(tree.props.accessibilityRole).toBe("button");
      expect(tree.props.accessibilityLabel).toBe("Close dialog");
      expect(tree.props.accessibilityHint).toBe("Dismisses the active modal");
    });

    it("enforces minimum touch target of 44x44 or 48x48", () => {
      let smRoot!: renderer.ReactTestRenderer;
      let mdRoot!: renderer.ReactTestRenderer;

      act(() => {
        smRoot = renderer.create(
          <IconButton accessibilityLabel="Small action" size="sm" icon="add" />
        );
      });

      act(() => {
        mdRoot = renderer.create(
          <IconButton accessibilityLabel="Medium action" size="md" icon="add" />
        );
      });

      const smButton = smRoot.toJSON() as any;
      const mdButton = mdRoot.toJSON() as any;

      const smStyle = Array.isArray(smButton.props.style)
        ? Object.assign({}, ...smButton.props.style.filter(Boolean))
        : smButton.props.style;

      expect(smStyle.width).toBeGreaterThanOrEqual(touchTargets.min);
      expect(smStyle.height).toBeGreaterThanOrEqual(touchTargets.min);

      const mdStyle = Array.isArray(mdButton.props.style)
        ? Object.assign({}, ...mdButton.props.style.filter(Boolean))
        : mdButton.props.style;

      expect(mdStyle.width).toBeGreaterThanOrEqual(touchTargets.standard);
      expect(mdStyle.height).toBeGreaterThanOrEqual(touchTargets.standard);
    });

    it("has hitSlop defined for touch reliability", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <IconButton accessibilityLabel="Settings" icon="settings" />
        );
      });

      const tree = root.toJSON() as any;
      expect(tree.props.hitSlop).toBeDefined();
      expect(tree.props.hitSlop.top).toBeGreaterThanOrEqual(6);
    });
  });

  describe("2. Badge Dual Encoding & Status Announcements (WCAG 1.4.1)", () => {
    it("renders both distinct icon and text label for colorblind accessibility", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <Badge status="confirmed" label="Booking Confirmed" />
        );
      });

      const json = root.toJSON() as any;
      expect(json.props.accessibilityRole).toBe("text");
      expect(json.props.accessibilityLabel).toContain("Confirmed");

      const icon = root.root.findByProps({ name: "checkmark-circle" });
      expect(icon).toBeDefined();
    });

    it("announces pending status with clock icon and accessibilityLabel", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <Badge status="pending" label="Awaiting Payment" />
        );
      });

      const json = root.toJSON() as any;
      expect(json.props.accessibilityLabel).toContain("Pending");

      const icon = root.root.findByProps({ name: "time-outline" });
      expect(icon).toBeDefined();
    });

    it("announces cancelled/error status with close icon", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <Badge status="cancelled" label="Trip Cancelled" />
        );
      });

      const icon = root.root.findByProps({ name: "close-circle" });
      expect(icon).toBeDefined();
    });
  });

  describe("3. Form Error Live Announcement & Input Accessibility", () => {
    it("announces error via accessibilityLiveRegion='polite' and role='alert'", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <Input
            label="Email Address"
            value="invalid-email"
            error="Please enter a valid email address"
          />
        );
      });

      const liveRegion = root.root.findByProps({ accessibilityLiveRegion: "polite" });
      expect(liveRegion).toBeDefined();

      const alertText = root.root.findByProps({ accessibilityRole: "alert" });
      expect(alertText.props.children).toBe("Please enter a valid email address");

      const input = root.root.findByProps({ accessibilityInvalid: true });
      expect(input).toBeDefined();
    });
  });

  describe("4. Font Scaling Control (allowFontScaling & maxFontSizeMultiplier)", () => {
    it("AccessibleText sets allowFontScaling and caps maxFontSizeMultiplier at 1.4", () => {
      let root!: renderer.ReactTestRenderer;
      act(() => {
        root = renderer.create(
          <AccessibleText>Accessible Paragraph</AccessibleText>
        );
      });

      const tree = root.toJSON() as any;
      expect(tree.props.allowFontScaling).toBe(true);
      expect(tree.props.maxFontSizeMultiplier).toBe(1.4);
    });
  });

  describe("5. WCAG 2.1 AA Color Contrast Verification", () => {
    it("validates primary, secondary and muted text colors meet WCAG AA (>= 4.5:1)", () => {
      const white = colors.neutral[0];

      const primaryContrast = getContrastRatio(colors.text.primary, white);
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);

      const secondaryContrast = getContrastRatio(colors.text.secondary, white);
      expect(secondaryContrast).toBeGreaterThanOrEqual(4.5);

      const mutedContrast = getContrastRatio(colors.text.muted, white);
      expect(mutedContrast).toBeGreaterThanOrEqual(4.5);
    });

    it("validates accessible brand blue on white meets WCAG AA (>= 4.5:1)", () => {
      const white = colors.neutral[0];
      const brandContrast = getContrastRatio(colors.brand.trip.accessibleBlue, white);
      expect(brandContrast).toBeGreaterThanOrEqual(4.5);
    });

    it("validates semantic status text contrast on light tint backgrounds", () => {
      const results = verifyDesignSystemContrast();

      expect(results.statusSuccessOnLight.wcagAaNormal).toBe(true);
      expect(results.statusWarningOnLight.wcagAaNormal).toBe(true);
      expect(results.statusDangerOnLight.wcagAaNormal).toBe(true);
      expect(results.whiteOnNavy.wcagAaNormal).toBe(true);
      expect(results.goldOnNavy.wcagAaNormal).toBe(true);
    });
  });
});
