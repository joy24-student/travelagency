import { useWindowDimensions, Platform, ScaledSize } from "react-native";
import { useMemo } from "react";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ResponsiveConfig<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  "2xl"?: T;
  default: T;
}

export interface ResponsiveLayoutState {
  // Dimensions
  width: number;
  height: number;
  scale: number;
  fontScale: number;

  // Orientations
  isPortrait: boolean;
  isLandscape: boolean;

  // Device Form Factors
  isSmallPhone: boolean; // < 375px
  isPhone: boolean;      // < 768px
  isTablet: boolean;     // 768px - 1023px
  isDesktop: boolean;    // >= 1024px
  isFoldable: boolean;   // Expanded foldable ratio & width

  // Active Breakpoint
  breakpoint: Breakpoint;

  // Grid / Multi-Column Helpers
  numColumns: number;    // Recommended columns: 1 (phone), 2 (tablet), 3 (laptop), 4 (desktop)
  contentMaxWidth: number; // Suggested container max width (e.g., 1200 for desktop)

  // Platform Shortcuts
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;

  // Helpers
  responsiveValue: <T>(config: ResponsiveConfig<T>) => T;
  getGridItemWidth: (gap?: number, padding?: number, customCols?: number) => number;
}

/**
 * Standard Breakpoint Boundaries (px)
 * xs: < 480 (Phones)
 * sm: 480 - 767 (Large phones / phablets / folded foldables)
 * md: 768 - 1023 (Tablets portrait, iPad, unfolded foldables)
 * lg: 1024 - 1279 (Tablets landscape, small desktops, web)
 * xl: 1280 - 1535 (Desktop web)
 * 2xl: >= 1536 (Ultra-wide screens)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS["2xl"]) return "2xl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

/**
 * High-performance, reactive responsive hook.
 * Replaces static `Dimensions.get('window')` at module scope.
 * Automatically recalculates when device rotates, foldables unfold, or web window resizes.
 */
export function useResponsive(): ResponsiveLayoutState {
  const windowDims = useWindowDimensions();
  const { width, height, scale, fontScale } = windowDims;

  return useMemo(() => {
    const isPortrait = height >= width;
    const isLandscape = width > height;

    const isSmallPhone = width < 375;
    const isPhone = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    // Detect unfolded foldable (wide aspect ratio or tablet-like dimensions on mobile platform)
    const isFoldable = Platform.OS !== "web" && width >= 600 && width < 900;

    const breakpoint = getBreakpoint(width);

    // Recommended column counts for grid layouts
    let numColumns = 1;
    if (width >= BREAKPOINTS["2xl"]) numColumns = 4;
    else if (width >= BREAKPOINTS.xl) numColumns = 4;
    else if (width >= BREAKPOINTS.lg) numColumns = 3;
    else if (width >= BREAKPOINTS.md) numColumns = 2;
    else if (width >= BREAKPOINTS.sm) numColumns = isLandscape ? 2 : 1;
    else numColumns = 1;

    const contentMaxWidth = isDesktop ? 1240 : isTablet ? 740 : width;

    const responsiveValue = <T>(config: ResponsiveConfig<T>): T => {
      if (breakpoint === "2xl" && config["2xl"] !== undefined) return config["2xl"];
      if ((breakpoint === "2xl" || breakpoint === "xl") && config.xl !== undefined) return config.xl;
      if (["2xl", "xl", "lg"].includes(breakpoint) && config.lg !== undefined) return config.lg;
      if (["2xl", "xl", "lg", "md"].includes(breakpoint) && config.md !== undefined) return config.md;
      if (["2xl", "xl", "lg", "md", "sm"].includes(breakpoint) && config.sm !== undefined) return config.sm;
      if (config.xs !== undefined) return config.xs;
      return config.default;
    };

    const getGridItemWidth = (gap = 16, padding = 16, customCols?: number): number => {
      const cols = customCols ?? numColumns;
      if (cols <= 1) return width - padding * 2;
      const totalGaps = (cols - 1) * gap;
      const totalPadding = padding * 2;
      const effectiveWidth = Math.min(width, contentMaxWidth);
      return Math.floor((effectiveWidth - totalPadding - totalGaps) / cols);
    };

    return {
      width,
      height,
      scale,
      fontScale,
      isPortrait,
      isLandscape,
      isSmallPhone,
      isPhone,
      isTablet,
      isDesktop,
      isFoldable,
      breakpoint,
      numColumns,
      contentMaxWidth,
      isWeb: Platform.OS === "web",
      isIOS: Platform.OS === "ios",
      isAndroid: Platform.OS === "android",
      responsiveValue,
      getGridItemWidth,
    };
  }, [width, height, scale, fontScale]);
}

/**
 * Re-export useWindowDimensions for convenience
 */
export { useWindowDimensions };
