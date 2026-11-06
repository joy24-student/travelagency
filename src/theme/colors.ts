/**
 * Design System Colors - Shopno Jatra
 * Unified color tokens integrating Trip & Luxe branding with semantic system palettes.
 */

export const colors = {
  // Brand Palettes
  brand: {
    trip: {
      blue: "#287dfa",
      lightBlue: "#eef6ff",
      dark: "#333333",
      gray: "#999999",
      bg: "#f5f7fa",
    },
    luxe: {
      ink: "#000666",
      navy: "#1a237e",
      surface: "#f8f9fa",
      gold: "#fed65b",
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
    secondary: "#475569",
    muted: "#94a3b8",
    inverse: "#ffffff",
    brand: "#287dfa",
    gold: "#fed65b",
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
