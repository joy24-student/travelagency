/**
 * Spacing and Layout Tokens - Shopno Jatra
 * Consistent 4pt/8pt grid layout and border radius scales
 */

export const SPACING = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  ...SPACING,
} as const;

export const RADII = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export const radii = {
  ...RADII,
} as const;

export const ROUNDED = RADII;

/**
 * WCAG 2.1 & Mobile Accessibility Touch Target Tokens
 */
export const touchTargets = {
  min: 44,
  standard: 48,
  compact: 36,
} as const;

/**
 * Predefined hitSlop insets for small interactive elements
 */
export const hitSlopPresets = {
  sm: { top: 6, bottom: 6, left: 6, right: 6 },
  md: { top: 10, bottom: 10, left: 10, right: 10 },
  lg: { top: 14, bottom: 14, left: 14, right: 14 },
} as const;

export type SpacingTokens = typeof spacing;
export type RadiiTokens = typeof radii;
export type TouchTargetTokens = typeof touchTargets;
export type HitSlopPresets = typeof hitSlopPresets;
