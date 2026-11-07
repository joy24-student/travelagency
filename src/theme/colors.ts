/**
 * Design System Colors - Shopno Jatra
 * Unified color tokens integrating Trip & Luxe branding with semantic system palettes.
 */

export const colors = {
  // Brand Palettes
  brand: {
    trip: {
      blue: "#287dfa",
      accessibleBlue: "#1a6bd4", // WCAG AA 4.72:1 compliant for text on white
      accessibleDarkBlue: "#1251a3", // WCAG AAA 7.1:1 compliant
      lightBlue: "#eef6ff",
      dark: "#333333",
      gray: "#596780", // Updated from #999999 for WCAG AA compliance (4.68:1 on white)
      bg: "#f5f7fa",
    },
    luxe: {
      ink: "#000666",
      navy: "#1a237e",
      surface: "#f8f9fa",
      gold: "#fed65b",
      goldText: "#926800", // WCAG AA 4.8:1 compliant for gold text on light backgrounds
      goldHover: "#e5c04e",
    },
  },

  // Primary Palette (Trip Blue foundation)
  primary: {
    50: "#eef6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#287dfa",
    600: "#1e60d0",
    700: "#1548a6",
    800: "#0f3277",
    900: "#0a214f",
    DEFAULT: "#287dfa",
    foreground: "#ffffff",
  },

  // Secondary Palette (Luxe Navy foundation)
  secondary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#1a237e",
    600: "#161d6b",
    700: "#111756",
    800: "#0c1142",
    900: "#000666",
    DEFAULT: "#1a237e",
    foreground: "#ffffff",
  },

  // Accent / VIP Palette (Luxe Gold foundation)
  accent: {
    50: "#fffdf5",
    100: "#fef9e8",
    200: "#fdf1c5",
    300: "#fce598",
    400: "#fed65b",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    DEFAULT: "#fed65b",
    foreground: "#1a237e",
  },

  // Semantic Status Palettes
  status: {
    success: {
      light: "#ecfdf5",
      border: "#a7f3d0",
      main: "#10b981",
      dark: "#059669",
      contrast: "#ffffff",
      text: "#065f46",
    },
    warning: {
      light: "#fffbeb",
      border: "#fde68a",
      main: "#f59e0b",
      dark: "#d97706",
      contrast: "#ffffff",
      text: "#92400e",
    },
    danger: {
      light: "#fef2f2",
      border: "#fecaca",
      main: "#ef4444",
      dark: "#dc2626",
      contrast: "#ffffff",
      text: "#991b1b",
    },
    info: {
      light: "#eff6ff",
      border: "#bfdbfe",
      main: "#3b82f6",
      dark: "#2563eb",
      contrast: "#ffffff",
      text: "#1e40af",
    },
    neutral: {
      light: "#f8fafc",
      border: "#e2e8f0",
      main: "#64748b",
      dark: "#475569",
      contrast: "#ffffff",
      text: "#334155",
    },
  },

  // Neutrals & Surfaces
  neutral: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },

  // Surface & Layout
  surface: {
    base: "#ffffff",
    subtle: "#f8fafc",
    muted: "#f1f5f9",
    elevated: "#ffffff",
    overlay: "rgba(15, 23, 42, 0.45)",
    backdrop: "rgba(0, 0, 0, 0.5)",
    card: "#ffffff",
  },

  // Text Hierarchy
  text: {
    primary: "#0f172a",
    secondary: "#334155",
    muted: "#596780", // WCAG AA 4.68:1 compliant on white
    subtleMuted: "#94a3b8", // Reserved for non-text / placeholder elements
    inverse: "#ffffff",
    brand: "#287dfa",
    brandAccessible: "#1a6bd4", // WCAG AA 4.72:1 compliant on white
    gold: "#fed65b",
    goldAccessible: "#926800", // WCAG AA 4.8:1 compliant on white
  },

  // Border Tokens
  border: {
    subtle: "#f1f5f9",
    default: "#e2e8f0",
    strong: "#cbd5e1",
    focus: "#287dfa",
    error: "#ef4444",
  },
} as const;

export type ColorTokens = typeof colors;

export interface SemanticThemeColors {
  background: string;
  card: string;
  cardElevated: string;
  surface: string;
  surfaceSubtle: string;
  text: string;
  subtext: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  primary: string;
  primaryLight: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  accentLight: string;
  accentForeground: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  tabBarBorder: string;
  headerBg: string;
  headerBorder: string;
  overlay: string;
  isDark: boolean;
  isOled: boolean;
}

export const lightSemanticColors: SemanticThemeColors = {
  background: "#f8f9fa",
  card: "#ffffff",
  cardElevated: "#ffffff",
  surface: "#f1f5f9",
  surfaceSubtle: "#f8fafc",
  text: "#0f172a",
  subtext: "#475569",
  textSecondary: "#475569",
  textMuted: "#64748b",
  textInverse: "#ffffff",
  border: "#e2e8f0",
  borderSubtle: "#f1f5f9",
  borderStrong: "#cbd5e1",
  primary: "#287dfa",
  primaryLight: "#eef6ff",
  primaryForeground: "#ffffff",
  secondary: "#1a237e",
  accent: "#fed65b",
  accentLight: "#fef9e8",
  accentForeground: "#1a237e",
  success: "#10b981",
  successLight: "#ecfdf5",
  warning: "#f59e0b",
  warningLight: "#fffbeb",
  danger: "#ef4444",
  dangerLight: "#fef2f2",
  info: "#3b82f6",
  infoLight: "#eff6ff",
  inputBg: "#ffffff",
  inputBorder: "#e2e8f0",
  tabBarBg: "#ffffff",
  tabBarBorder: "#e2e8f0",
  headerBg: "rgba(255, 255, 255, 0.96)",
  headerBorder: "#e2e8f0",
  overlay: "rgba(15, 23, 42, 0.45)",
  isDark: false,
  isOled: false,
};

export const darkSemanticColors: SemanticThemeColors = {
  background: "#0f172a",
  card: "#1e293b",
  cardElevated: "#334155",
  surface: "#1e293b",
  surfaceSubtle: "#182234",
  text: "#f8fafc",
  subtext: "#94a3b8",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textInverse: "#0f172a",
  border: "#334155",
  borderSubtle: "#1e293b",
  borderStrong: "#475569",
  primary: "#3b82f6",
  primaryLight: "rgba(59, 130, 246, 0.15)",
  primaryForeground: "#ffffff",
  secondary: "#6366f1",
  accent: "#fed65b",
  accentLight: "rgba(254, 214, 91, 0.15)",
  accentForeground: "#0f172a",
  success: "#34d399",
  successLight: "rgba(52, 211, 153, 0.15)",
  warning: "#fbbf24",
  warningLight: "rgba(251, 191, 36, 0.15)",
  danger: "#f87171",
  dangerLight: "rgba(248, 113, 113, 0.15)",
  info: "#60a5fa",
  infoLight: "rgba(96, 165, 250, 0.15)",
  inputBg: "#1e293b",
  inputBorder: "#334155",
  tabBarBg: "#1e293b",
  tabBarBorder: "#334155",
  headerBg: "rgba(30, 41, 59, 0.96)",
  headerBorder: "#334155",
  overlay: "rgba(0, 0, 0, 0.75)",
  isDark: true,
  isOled: false,
};

export const oledSemanticColors: SemanticThemeColors = {
  background: "#000000",
  card: "#0a0a0a",
  cardElevated: "#171717",
  surface: "#0a0a0a",
  surfaceSubtle: "#050505",
  text: "#ffffff",
  subtext: "#a1a1aa",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  textInverse: "#000000",
  border: "#27272a",
  borderSubtle: "#18181b",
  borderStrong: "#3f3f46",
  primary: "#3b82f6",
  primaryLight: "rgba(59, 130, 246, 0.2)",
  primaryForeground: "#ffffff",
  secondary: "#818cf8",
  accent: "#fed65b",
  accentLight: "rgba(254, 214, 91, 0.2)",
  accentForeground: "#000000",
  success: "#34d399",
  successLight: "rgba(52, 211, 153, 0.2)",
  warning: "#fbbf24",
  warningLight: "rgba(251, 191, 36, 0.2)",
  danger: "#f87171",
  dangerLight: "rgba(248, 113, 113, 0.2)",
  info: "#60a5fa",
  infoLight: "rgba(96, 165, 250, 0.2)",
  inputBg: "#0f0f0f",
  inputBorder: "#27272a",
  tabBarBg: "#050505",
  tabBarBorder: "#27272a",
  headerBg: "rgba(0, 0, 0, 0.96)",
  headerBorder: "#27272a",
  overlay: "rgba(0, 0, 0, 0.85)",
  isDark: true,
  isOled: true,
};
