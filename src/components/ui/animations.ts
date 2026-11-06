import {
  Easing,
  WithSpringConfig,
  WithTimingConfig,
} from "react-native-reanimated";

/**
 * Reanimated v4 Animation Utilities & Standard Presets - Shopno Jatra
 */

export const springPresets: Record<
  "gentle" | "bouncy" | "snappy" | "stiff",
  WithSpringConfig
> = {
  gentle: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 0.9,
  },
  snappy: {
    damping: 18,
    stiffness: 220,
    mass: 0.8,
  },
  stiff: {
    damping: 26,
    stiffness: 300,
    mass: 1,
  },
};

export const timingPresets: Record<
  "instant" | "fast" | "normal" | "slow",
  WithTimingConfig
> = {
  instant: {
    duration: 100,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  fast: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },
  normal: {
    duration: 300,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  },
  slow: {
    duration: 500,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  },
};
