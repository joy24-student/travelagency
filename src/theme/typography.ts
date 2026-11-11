import { Platform, TextStyle } from "react-native";
import i18n from "../locales/i18n";

/**
 * Typography Tokens & Multi-Locale Font Definitions - Shopno Jatra
 */

export const FONTS = {
  // Shopno Jatra primary typography tokens (defaulting to Hind Siliguri / Bengali platform-safe fonts)
  light: Platform.select({
    ios: "HindSiliguri-Light",
    android: "HindSiliguri_300Light",
    web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    default: "HindSiliguri_300Light",
  }),
  regular: Platform.select({
    ios: "HindSiliguri-Regular",
    android: "HindSiliguri_400Regular",
    web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    default: "HindSiliguri_400Regular",
  }),
  medium: Platform.select({
    ios: "HindSiliguri-Medium",
    android: "HindSiliguri_500Medium",
    web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    default: "HindSiliguri_500Medium",
  }),
  semiBold: Platform.select({
    ios: "HindSiliguri-SemiBold",
    android: "HindSiliguri_600SemiBold",
    web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    default: "HindSiliguri_600SemiBold",
  }),
  bold: Platform.select({
    ios: "HindSiliguri-Bold",
    android: "HindSiliguri_700Bold",
    web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    default: "HindSiliguri_700Bold",
  }),

  bengali: {
    light: Platform.select({
      ios: "HindSiliguri-Light",
      android: "HindSiliguri_300Light",
      web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      default: "HindSiliguri_300Light",
    }),
    regular: Platform.select({
      ios: "HindSiliguri-Regular",
      android: "HindSiliguri_400Regular",
      web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      default: "HindSiliguri_400Regular",
    }),
    medium: Platform.select({
      ios: "HindSiliguri-Medium",
      android: "HindSiliguri_500Medium",
      web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      default: "HindSiliguri_500Medium",
    }),
    semiBold: Platform.select({
      ios: "HindSiliguri-SemiBold",
      android: "HindSiliguri_600SemiBold",
      web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      default: "HindSiliguri_600SemiBold",
    }),
    bold: Platform.select({
      ios: "HindSiliguri-Bold",
      android: "HindSiliguri_700Bold",
      web: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
      default: "HindSiliguri_700Bold",
    }),
  },
  notoBengali: {
    regular: Platform.select({
      ios: "NotoSansBengali-Regular",
      android: "NotoSansBengali_400Regular",
      web: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
      default: "NotoSansBengali_400Regular",
    }),
    semiBold: Platform.select({
      ios: "NotoSansBengali-SemiBold",
      android: "NotoSansBengali_600SemiBold",
      web: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
      default: "NotoSansBengali_600SemiBold",
    }),
    bold: Platform.select({
      ios: "NotoSansBengali-Bold",
      android: "NotoSansBengali_700Bold",
      web: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
      default: "NotoSansBengali_700Bold",
    }),
  },
  arabic: {
    regular: Platform.select({
      ios: "Geeza Pro",
      android: "sans-serif",
      web: "'Noto Sans Arabic', 'Geeza Pro', Tahoma, sans-serif",
      default: "sans-serif",
    }),
    medium: Platform.select({
      ios: "Geeza Pro",
      android: "sans-serif-medium",
      web: "'Noto Sans Arabic', 'Geeza Pro', Tahoma, sans-serif",
      default: "sans-serif",
    }),
    bold: Platform.select({
      ios: "GeezaPro-Bold",
      android: "sans-serif",
      web: "'Noto Sans Arabic', 'Geeza Pro', Tahoma, sans-serif",
      default: "sans-serif",
    }),
  },
  hindi: {
    regular: Platform.select({
      ios: "Devanagari Sangam MN",
      android: "sans-serif",
      web: "'Noto Sans Devanagari', 'Devanagari Sangam MN', sans-serif",
      default: "sans-serif",
    }),
    medium: Platform.select({
      ios: "Devanagari Sangam MN",
      android: "sans-serif-medium",
      web: "'Noto Sans Devanagari', 'Devanagari Sangam MN', sans-serif",
      default: "sans-serif",
    }),
    bold: Platform.select({
      ios: "DevanagariSangamMN-Bold",
      android: "sans-serif",
      web: "'Noto Sans Devanagari', 'Devanagari Sangam MN', sans-serif",
      default: "sans-serif",
    }),
  },
  latin: {
    regular: Platform.select({
      ios: "System",
      android: "sans-serif",
      web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      default: "sans-serif",
    }),
    medium: Platform.select({
      ios: "System",
      android: "sans-serif-medium",
      web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      default: "sans-serif",
    }),
    bold: Platform.select({
      ios: "System",
      android: "sans-serif",
      web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      default: "sans-serif",
    }),
  },
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    web: "ui-monospace, monospace",
    default: "monospace",
  }),
} as const;

/**
 * Standardized Type Scale
 * Enforces accessible minimum size (>= 12) so small text remains sharp and legible.
 */
export const TYPE_SCALE = {
  /** Micro badges & status tags (Absolute minimum readable threshold) */
  micro: 12,
  /** Secondary annotations & captions */
  caption: 13,
  /** Secondary descriptions & small body */
  sm: 14,
  /** Primary body text */
  base: 16,
  /** Sub-headers & large body */
  lg: 18,
  /** Section titles */
  xl: 20,
  /** Page / Card headers */
  "2xl": 24,
  /** Screen hero titles */
  "3xl": 28,
  /** Large banners & promo headers */
  "4xl": 32,
  /** Numerical display stats */
  "5xl": 40,
} as const;

export const typography = {
  fontSizes: {
    "2xs": 12,
    xs: 12,
    sm: 14,
    base: 16,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
    "5xl": 40,
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  fontWeights: {
    thin: "100",
    extralight: "200",
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  },
  fonts: FONTS,
  scale: TYPE_SCALE,
} as const;

/**
 * Clamps arbitrary font size to a minimum accessible threshold (default: 12px)
 */
export function clampFontSize(size: number, minSize = 12): number {
  if (typeof size !== "number" || isNaN(size)) return minSize;
  return Math.max(minSize, Math.round(size));
}

export type FontWeightType = "light" | "regular" | "medium" | "semibold" | "bold";

/**
 * Get Bengali font family for a given weight
 */
export function getBengaliFont(weight: FontWeightType = "regular"): string {
  switch (weight) {
    case "light":
      return FONTS.bengali.light;
    case "medium":
      return FONTS.bengali.medium;
    case "semibold":
      return FONTS.bengali.semiBold;
    case "bold":
      return FONTS.bengali.bold;
    case "regular":
    default:
      return FONTS.bengali.regular;
  }
}

/**
 * Universal Locale-Aware Font Family Resolver
 */
export function getLocaleFont(
  weight: FontWeightType = "regular",
  locale?: string
): string {
  const activeLang = (locale || i18n.language || "en").toLowerCase();

  if (activeLang.startsWith("bn")) {
    return getBengaliFont(weight);
  }

  if (activeLang.startsWith("ar")) {
    if (weight === "bold") return FONTS.arabic.bold;
    if (weight === "medium" || weight === "semibold") return FONTS.arabic.medium;
    return FONTS.arabic.regular;
  }

  if (activeLang.startsWith("hi")) {
    if (weight === "bold") return FONTS.hindi.bold;
    if (weight === "medium" || weight === "semibold") return FONTS.hindi.medium;
    return FONTS.hindi.regular;
  }

  // English / Latin
  if (weight === "bold") return FONTS.latin.bold;
  if (weight === "medium" || weight === "semibold") return FONTS.latin.medium;
  return FONTS.latin.regular;
}

/**
 * Ready-to-use semantic text style presets
 */
export const textPresets: Record<string, TextStyle> = {
  micro: {
    fontSize: TYPE_SCALE.micro,
    lineHeight: 16,
    fontFamily: FONTS.bengali.medium,
    fontWeight: "500",
  },
  caption: {
    fontSize: TYPE_SCALE.caption,
    lineHeight: 18,
    fontFamily: FONTS.bengali.regular,
    fontWeight: "400",
  },
  bodySm: {
    fontSize: TYPE_SCALE.sm,
    lineHeight: 20,
    fontFamily: FONTS.bengali.regular,
    fontWeight: "400",
  },
  body: {
    fontSize: TYPE_SCALE.base,
    lineHeight: 24,
    fontFamily: FONTS.bengali.regular,
    fontWeight: "400",
  },
  bodyBold: {
    fontSize: TYPE_SCALE.base,
    lineHeight: 24,
    fontFamily: FONTS.bengali.bold,
    fontWeight: "700",
  },
  subhead: {
    fontSize: TYPE_SCALE.lg,
    lineHeight: 26,
    fontFamily: FONTS.bengali.semiBold,
    fontWeight: "600",
  },
  title: {
    fontSize: TYPE_SCALE.xl,
    lineHeight: 28,
    fontFamily: FONTS.bengali.bold,
    fontWeight: "700",
  },
  headline: {
    fontSize: TYPE_SCALE["2xl"],
    lineHeight: 32,
    fontFamily: FONTS.bengali.bold,
    fontWeight: "700",
  },
  hero: {
    fontSize: TYPE_SCALE["3xl"],
    lineHeight: 36,
    fontFamily: FONTS.bengali.bold,
    fontWeight: "800",
  },
};

/**
 * Dynamic Locale-Aware Text Preset Generator (adjusts font & line-height for Arabic/Devanagari)
 */
export function getLocaleTextPreset(
  presetKey: keyof typeof textPresets,
  locale?: string
): TextStyle {
  const base = textPresets[presetKey] || textPresets.body;
  const activeLang = (locale || i18n.language || "en").toLowerCase();

  // Arabic needs higher line-height to avoid diacritic clipping
  const lineHeightMultiplier = activeLang.startsWith("ar") ? 1.25 : 1.0;
  const rawLineHeight = base.lineHeight || 20;

  return {
    ...base,
    fontFamily: getLocaleFont(
      (base.fontWeight === "700" || base.fontWeight === "800" ? "bold" : base.fontWeight === "600" ? "semibold" : base.fontWeight === "500" ? "medium" : "regular"),
      activeLang
    ),
    lineHeight: Math.round(rawLineHeight * lineHeightMultiplier),
  };
}

export type TypographyTokens = typeof typography;
