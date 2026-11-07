import { colors } from "./colors";
import { typography } from "./typography";
import { spacing, radii, touchTargets, hitSlopPresets } from "./spacing";
import { shadows } from "./shadows";

/**
 * Master Design System Tokens - Shopno Jatra
 */
export const theme = {
  colors,
  typography,
  spacing,
  radii,
  touchTargets,
  hitSlopPresets,
  shadows,
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      standard: [0.4, 0.0, 0.2, 1],
      decelerate: [0.0, 0.0, 0.2, 1],
      accelerate: [0.4, 0.0, 1, 1],
    },
  },
} as const;

export type Theme = typeof theme;
