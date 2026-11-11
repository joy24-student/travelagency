import { ViewStyle, Platform } from "react-native";

/**
 * Cross-Platform Elevation & Shadow Tokens - Shopno Jatra
 * Fully supports:
 * - iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Android: elevation, shadowColor
 * - Web: CSS boxShadow
 */

export interface ElevationStyle extends ViewStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  boxShadow?: string;
}

const isWeb = Platform.OS === "web";

/**
 * Helper to generate a consistent shadow across iOS, Android, and Web
 */
export function createPlatformShadow(
  elevation: number,
  shadowColor = "#0f172a",
  opacity = 0.08
): ViewStyle {
  const radius = elevation * 1.5;
  const heightOffset = Math.max(1, Math.round(elevation * 0.6));
  const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, "0");

  const base: any = {
    shadowColor,
    shadowOffset: { width: 0, height: heightOffset },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };

  if (isWeb) {
    if (elevation === 0) {
      base.boxShadow = "none";
    } else {
      base.boxShadow = `0px ${heightOffset}px ${radius}px rgba(15, 23, 42, ${opacity})`;
    }
  }

  return base as ViewStyle;
}

export const shadows: Record<
  "none" | "flat" | "xs" | "sm" | "low" | "md" | "medium" | "lg" | "high" | "xl" | "floating",
  ViewStyle
> = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === "web" ? { boxShadow: "0px 0px 0px rgba(15, 23, 42, 0)" } : {}),
    ...(isWeb ? { boxShadow: "none" } : {}),
  } as ViewStyle,

  flat: {
    borderWidth: Platform.OS === "android" ? 0.5 : 1,
    borderColor: "#e2e8f0",
    shadowColor: "transparent",
    elevation: 0,
    ...(isWeb ? { boxShadow: "none" } : {}),
  } as ViewStyle,

  xs: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.04)" } : {}),
    ...(isWeb ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.04)" } : {}),
  } as ViewStyle,

  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.06)" } : {}),
    ...(isWeb ? { boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.06)" } : {}),
  } as ViewStyle,

  low: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2.5px rgba(15, 23, 42, 0.05)" } : {}),
    ...(isWeb ? { boxShadow: "0px 1px 2.5px rgba(15, 23, 42, 0.05)" } : {}),
  } as ViewStyle,

  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.08)" } : {}),
    ...(isWeb ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.08)" } : {}),
  } as ViewStyle,

  medium: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.08)" } : {}),
    ...(isWeb ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.08)" } : {}),
  } as ViewStyle,

  lg: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.12)" } : {}),
    ...(isWeb ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.12)" } : {}),
  } as ViewStyle,

  high: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.12)" } : {}),
    ...(isWeb ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.12)" } : {}),
  } as ViewStyle,

  xl: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 16px rgba(15, 23, 42, 0.14)" } : {}),
    ...(isWeb ? { boxShadow: "0px 6px 16px rgba(15, 23, 42, 0.14)" } : {}),
  } as ViewStyle,

  floating: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 16,
    ...(Platform.OS === "web" ? { boxShadow: "0px 8px 20px rgba(15, 23, 42, 0.16)" } : {}),
    ...(isWeb ? { boxShadow: "0px 8px 20px rgba(15, 23, 42, 0.16)" } : {}),
  } as ViewStyle,
};

export type ShadowPreset = keyof typeof shadows;
