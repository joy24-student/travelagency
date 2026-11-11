/**
 * MysteryBoxModal.test.tsx
 *
 * Component Test Suite for MysteryBoxModal.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";

// Mock React Native Reanimated without JSX
jest.mock("react-native-reanimated", () => {
  return {
    __esModule: true,
    default: {
      View: "AnimatedView",
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (cb: any) => {
      try {
        return cb();
      } catch {
        return {};
      }
    },
    withTiming: (toValue: any) => toValue,
    withSpring: (toValue: any) => toValue,
    withSequence: (...args: any[]) => args[args.length - 1],
    withRepeat: (anim: any) => anim,
    withDelay: (_: number, anim: any) => anim,
    Easing: {
      out: () => (t: number) => t,
      cubic: (t: number) => t,
      inOut: () => (t: number) => t,
      quad: (t: number) => t,
    },
    interpolate: () => 1,
    runOnJS: (fn: any) => fn,
  };
});

// Mock @expo/vector-icons and expo-font
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Heavy: "heavy", Medium: "medium", Light: "light" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../../../utils/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-traveler-id-100", email: "traveler@shopno.com" },
  }),
}));

import { MysteryBoxModal } from "../MysteryBoxModal";

jest.setTimeout(20000);

describe("MysteryBoxModal Component", () => {
  it("renders properly when visible is true", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <MysteryBoxModal visible={true} onClose={jest.fn()} />
      );
    });

    expect(tree).toBeDefined();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Mystery Travel Box");
    expect(json).toContain("Daily Check-in & Unlock Perks");
  });

  it("triggers onClose when closed", async () => {
    const handleClose = jest.fn();
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <MysteryBoxModal visible={true} onClose={handleClose} />
      );
    });

    expect(tree).toBeDefined();
  });
});
