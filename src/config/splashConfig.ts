/**
 * Splash Screen Configuration - Shopno Jatra
 *
 * Controls splash screen display, duration, and animation.
 * Optimized for instant launch: max ~800-1000ms, animation only on first launch,
 * and dismisses immediately as soon as app initialization completes.
 */

export type SplashScreenVariant = "basic" | "advanced";

export interface SplashScreenConfig {
  // Which splash screen to display: 'basic' or 'advanced'
  variant: SplashScreenVariant;

  // How long the splash screen displays (in milliseconds) - max ~1 second
  duration: number;

  // Whether to show splash screen for authentication check
  showForAuth: boolean;

  // Color scheme
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };

  // Animation settings
  animation: {
    birdDuration: number; // Bird animation duration (ms)
    textDuration: number; // Text animation duration (ms)
    particleCount: number; // Number of particles (advanced only)
  };

  // Only play intro animation on the user's first app open
  onlyFirstLaunch?: boolean;
}

// Default configuration (Fast, lightweight, max ~800ms)
export const DEFAULT_SPLASH_CONFIG: SplashScreenConfig = {
  variant: "basic",
  duration: 800, // Reduced from 3500ms to max ~800ms
  showForAuth: false,
  onlyFirstLaunch: true,
  colors: {
    primary: "#0055F2",
    accent: "#FF5722",
    background: "#FFFFFF",
    text: "#0F172A",
  },
  animation: {
    birdDuration: 350,
    textDuration: 350,
    particleCount: 6,
  },
};

// Preset configurations
export const PRESETS: Record<string, SplashScreenConfig> = {
  // Quick splash (400ms)
  quick: {
    ...DEFAULT_SPLASH_CONFIG,
    duration: 400,
    animation: {
      ...DEFAULT_SPLASH_CONFIG.animation,
      birdDuration: 200,
      textDuration: 200,
    },
  },

  // Standard splash (800ms - recommended)
  standard: DEFAULT_SPLASH_CONFIG,

  // Minimal splash
  minimal: {
    ...DEFAULT_SPLASH_CONFIG,
    variant: "basic",
    duration: 400,
  },

  // Full featured (advanced with particles, capped at 1000ms)
  featured: {
    ...DEFAULT_SPLASH_CONFIG,
    variant: "advanced",
    duration: 1000,
    animation: {
      ...DEFAULT_SPLASH_CONFIG.animation,
      birdDuration: 400,
      textDuration: 400,
      particleCount: 8,
    },
  },

  // Extended splash (capped at 1000ms max)
  extended: {
    ...DEFAULT_SPLASH_CONFIG,
    duration: 1000,
    animation: {
      ...DEFAULT_SPLASH_CONFIG.animation,
      birdDuration: 400,
      textDuration: 400,
    },
  },

  // Dark theme
  dark: {
    ...DEFAULT_SPLASH_CONFIG,
    colors: {
      primary: "#1A1A2E",
      accent: "#FF6B6B",
      background: "#0F0F1E",
      text: "#FFFFFF",
    },
  },

  // Light theme
  light: {
    ...DEFAULT_SPLASH_CONFIG,
    colors: {
      primary: "#0055F2",
      accent: "#FF5722",
      background: "#FFFFFF",
      text: "#0F172A",
    },
  },
};

// Get configuration by preset name
export const getSplashConfig = (
  preset?: keyof typeof PRESETS,
): SplashScreenConfig => {
  if (preset && PRESETS[preset]) {
    return PRESETS[preset];
  }
  return DEFAULT_SPLASH_CONFIG;
};

// Export all presets
export type PresetName = keyof typeof PRESETS;
export const presetNames = Object.keys(PRESETS) as PresetName[];
