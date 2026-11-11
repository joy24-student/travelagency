import { Platform, ViewStyle } from "react-native";

export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
export const isWeb = Platform.OS === "web";
export const isMobile = isIOS || isAndroid;

export interface PlatformSelectOptions<T> {
  ios?: T;
  android?: T;
  web?: T;
  native?: T;
  default: T;
}

export function platformSelect<T>(options: PlatformSelectOptions<T>): T {
  if (isWeb && options.web !== undefined) return options.web;
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isMobile && options.native !== undefined) return options.native;
  return options.default;
}

export interface ShadowOptions {
  elevation?: number;
  color?: string;
  opacity?: number;
  radius?: number;
  offset?: { width: number; height: number };
}

/**
 * Creates cross-platform shadow styles that render flawlessly across:
 * - iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Android: elevation
 * - Web (react-native-web): CSS boxShadow
 */
export function createPlatformShadow(options: ShadowOptions = {}): ViewStyle {
  const {
    elevation = 2,
    color = "#0f172a",
    opacity = 0.08,
    radius = elevation * 1.5,
    offset = { width: 0, height: Math.max(1, Math.round(elevation * 0.5)) },
  } = options;

  if (elevation === 0) {
    return {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    ...(Platform.OS === "web" ? { boxShadow: "0px 0px 0px rgba(15, 23, 42, 0)" } : {}),
      ...(isWeb ? { boxShadow: "none" } : {}),
    } as ViewStyle;
  }

  // Parse color to rgba for web boxShadow
  const r = parseInt(color.slice(1, 3), 16) || 15;
  const g = parseInt(color.slice(3, 5), 16) || 23;
  const b = parseInt(color.slice(5, 7), 16) || 42;
  const webBoxShadow = `${offset.width}px ${offset.height}px ${radius}px rgba(${r}, ${g}, ${b}, ${opacity})`;

  const style: ViewStyle = {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };

  if (isWeb) {
    // React Native Web supports boxShadow property in style objects
    (style as any).boxShadow = webBoxShadow;
  }

  return style;
}

/**
 * Recommended keyboard vertical offsets per platform
 */
export const platformKeyboardOffset = {
  header: platformSelect({ ios: 64, android: 0, default: 0 }),
  modal: platformSelect({ ios: 40, android: 0, default: 0 }),
  none: 0,
};
