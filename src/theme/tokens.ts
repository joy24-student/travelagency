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

/**
 * Luxury Gold & Obsidian / Champagne Travel Platform Design Tokens
 * Matched with pixel-perfect precision to the reference designs.
 */

export interface ThemeColors {
  isDark: boolean;
  // Base backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  cardBg: string;
  categoryCardBg: string;
  searchPillBg: string;
  locationPillBg: string;

  // Header & Sky
  headerBg: string;
  headerSkyGradient: [string, string, string];
  headerText: string;
  headerSubtext: string;

  // Gold / Brand Accents
  gold: string;
  goldLight: string;
  goldDark: string;
  goldGradient: [string, string];
  goldIconBg: string;
  goldIconColor: string;
  goldBadgeBg: string;
  goldBadgeText: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  categoryLabelText: string;

  // Quick Action Circles
  quickActionBg: string;
  quickActionBorder: string;
  quickActionIcon: string;
  quickActionText: string;

  // Borders & Dividers
  border: string;
  borderLight: string;
  divider: string;

  // AI Assistant Bar
  aiPillBg: string;
  aiPillBorder: string;
  aiPillText: string;
  aiMicBtnBg: string;
  aiMicIconColor: string;

  // Bottom Navigation
  navBg: string;
  navBorder: string;
  navActive: string;
  navInactive: string;
  navIndicator: string;

  // Card & Feed Elements
  cardBorder: string;
  ctaButtonBg: string;
  ctaButtonText: string;
  verifiedBadgeBg: string;
  verifiedBadgeText: string;
}

export const lightTokens: ThemeColors = {
  isDark: false,
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  cardBg: "#FFFFFF",
  categoryCardBg: "#FFFFFF",
  searchPillBg: "#FFFFFF",
  locationPillBg: "#FFFFFF",

  headerBg: "#FFFFFF",
  headerSkyGradient: ["#F0F7FF", "#FFFFFF", "#FDF8F0"],
  headerText: "#111827",
  headerSubtext: "#64748B",

  gold: "#D4A03D",
  goldLight: "#FDE68A",
  goldDark: "#B48028",
  goldGradient: ["#E5B252", "#C68E28"],
  goldIconBg: "#FBF3E4",
  goldIconColor: "#8B5E14",
  goldBadgeBg: "#FEF3C7",
  goldBadgeText: "#92400E",

  textPrimary: "#111827",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",
  categoryLabelText: "#111827",

  quickActionBg: "#FFFFFF",
  quickActionBorder: "#F1E5D1",
  quickActionIcon: "#C28723",
  quickActionText: "#1E293B",

  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  divider: "#E2E8F0",

  aiPillBg: "#FFFFFF",
  aiPillBorder: "#E8E2D5",
  aiPillText: "#1E293B",
  aiMicBtnBg: "#D4A03D",
  aiMicIconColor: "#111827",

  navBg: "#FFFFFF",
  navBorder: "#F1F5F9",
  navActive: "#D4A03D",
  navInactive: "#8E8E93",
  navIndicator: "#D4A03D",

  cardBorder: "#E2E8F0",
  ctaButtonBg: "#FFFFFF",
  ctaButtonText: "#111827",
  verifiedBadgeBg: "#FEF3C7",
  verifiedBadgeText: "#92400E",
};

export const darkTokens: ThemeColors = {
  isDark: true,
  background: "#080B11",
  surface: "#0F1420",
  surfaceElevated: "#161D2C",
  cardBg: "#0F1420",
  categoryCardBg: "#FFF9F0", // Warm Champagne Cream Card for high-contrast luxury look
  searchPillBg: "#FFF8EE",   // Champagne Pill
  locationPillBg: "#FFF8EE", // Champagne Pills

  headerBg: "#06080E",
  headerSkyGradient: ["#04060A", "#090E17", "#131B2A"],
  headerText: "#FFFFFF",
  headerSubtext: "#94A3B8",

  gold: "#E5A93C",
  goldLight: "#FDE68A",
  goldDark: "#C58B24",
  goldGradient: ["#E5B252", "#C68E28"],
  goldIconBg: "#FBF0DC",
  goldIconColor: "#291E0A",
  goldBadgeBg: "#E5A93C",
  goldBadgeText: "#18181B",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#64748B",
  textInverse: "#0F172A",
  categoryLabelText: "#111827", // Dark text on champagne card

  quickActionBg: "#121622",
  quickActionBorder: "#E5A93C",
  quickActionIcon: "#E5A93C",
  quickActionText: "#F8FAFC",

  border: "#1E2638",
  borderLight: "#2A344A",
  divider: "#1E2638",

  aiPillBg: "rgba(22, 28, 40, 0.92)",
  aiPillBorder: "rgba(229, 169, 60, 0.4)",
  aiPillText: "#F8FAFC",
  aiMicBtnBg: "#E5A93C",
  aiMicIconColor: "#111827",

  navBg: "#080B11",
  navBorder: "#19202E",
  navActive: "#E5A93C",
  navInactive: "#8E8E93",
  navIndicator: "#E5A93C",

  cardBorder: "#1E2638",
  ctaButtonBg: "#FFF8EE",
  ctaButtonText: "#000000",
  verifiedBadgeBg: "#E5A93C",
  verifiedBadgeText: "#18181B",
};

export const LUXURY_GOLD = "#E5A93C";
export const LUXURY_CHAMPAGNE = "#FFF8EE";
export const LUXURY_OBSIDIAN = "#080B11";
