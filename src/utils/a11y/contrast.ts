/**
 * WCAG 2.1 Color Contrast Utilities & Verification
 * Implements W3C WCAG 2.1 relative luminance and contrast ratio formulas:
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * Requirements:
 * - WCAG AA Normal Text (< 18pt regular or < 14pt bold): minimum 4.5:1
 * - WCAG AA Large Text (>= 18pt regular or >= 14pt bold): minimum 3.0:1
 * - WCAG AA Graphical Objects and User Interface Components: minimum 3.0:1
 * - WCAG AAA Normal Text: minimum 7.0:1
 * - WCAG AAA Large Text: minimum 4.5:1
 */

import { colors } from "../../theme/colors";

/**
 * Converts a hex color string to RGB channels [0..255]
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace("#", "").trim();

  // Support 3-character hex (#fff -> #ffffff)
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }

  // Handle 8-character hex with alpha (strip alpha for solid contrast)
  if (cleaned.length === 8) {
    cleaned = cleaned.substring(0, 6);
  }

  const intVal = parseInt(cleaned, 16);
  if (isNaN(intVal) || cleaned.length !== 6) {
    // Default fallback to black if invalid hex
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

/**
 * Calculates relative luminance (L) of an RGB color as defined by W3C WCAG 2.1
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r / 255, g / 255, b / 255];
  const linear = sRGB.map((channel) => {
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Calculates contrast ratio between two hex colors: (L1 + 0.05) / (L2 + 0.05)
 * Returns a number between 1.0 (identical) and 21.0 (black & white).
 */
export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);

  const l1 = getRelativeLuminance(fg.r, fg.g, fg.b);
  const l2 = getRelativeLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

export interface ContrastAuditResult {
  foreground: string;
  background: string;
  ratio: number;
  wcagAaNormal: boolean;
  wcagAaLarge: boolean;
  wcagAaaNormal: boolean;
  wcagAaaLarge: boolean;
}

/**
 * Audits a foreground/background pair against WCAG 2.1 AA and AAA standards.
 */
export function auditColorPair(
  foregroundHex: string,
  backgroundHex: string
): ContrastAuditResult {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);

  return {
    foreground: foregroundHex,
    background: backgroundHex,
    ratio,
    wcagAaNormal: ratio >= 4.5,
    wcagAaLarge: ratio >= 3.0,
    wcagAaaNormal: ratio >= 7.0,
    wcagAaaLarge: ratio >= 4.5,
  };
}

/**
 * Verifies core design system pairings against WCAG 2.1 AA
 */
export function verifyDesignSystemContrast(): Record<string, ContrastAuditResult> {
  const white = colors.neutral[0]; // #ffffff
  const cardBg = colors.surface.card; // #ffffff
  const darkNavy = colors.brand.luxe.navy; // #1a237e

  return {
    // Text on White / Light Surface
    textPrimaryOnWhite: auditColorPair(colors.text.primary, white),
    textSecondaryOnWhite: auditColorPair(colors.text.secondary, white),
    textMutedOnWhite: auditColorPair(colors.text.muted, white),
    brandAccessibleBlueOnWhite: auditColorPair(colors.brand.trip.accessibleBlue, white),

    // Status Texts on Light Backgrounds
    statusSuccessOnLight: auditColorPair(colors.status.success.text, colors.status.success.light),
    statusWarningOnLight: auditColorPair(colors.status.warning.text, colors.status.warning.light),
    statusDangerOnLight: auditColorPair(colors.status.danger.text, colors.status.danger.light),
    statusInfoOnLight: auditColorPair(colors.status.info.text, colors.status.info.light),

    // Inverted Text on Dark Backgrounds
    whiteOnBrandBlue: auditColorPair(white, colors.brand.trip.blue),
    whiteOnNavy: auditColorPair(white, darkNavy),
    whiteOnDanger: auditColorPair(white, colors.status.danger.main),
    goldOnNavy: auditColorPair(colors.brand.luxe.gold, darkNavy),
  };
}
