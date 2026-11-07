import { I18nManager, Platform, TextStyle, ViewStyle } from "react-native";
import i18n, { isRTLLanguage } from "../locales/i18n";

/**
 * Returns true if the currently active application language is RTL (Arabic)
 */
export function isAppRTL(): boolean {
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      return document.documentElement.dir === "rtl" || isRTLLanguage(i18n.language);
    }
  }
  return I18nManager.isRTL || isRTLLanguage(i18n.language);
}

/**
 * Helper to get directional arrow / chevron rotation transform
 */
export function getRTLFlipTransform(isRTL: boolean = isAppRTL()) {
  return isRTL ? [{ scaleX: -1 }] : [{ scaleX: 1 }];
}

/**
 * Directional icon style helper (e.g. for ChevronRight, ArrowLeft)
 */
export function getRTLIconStyle(isRTL: boolean = isAppRTL()): ViewStyle {
  return {
    transform: [{ scaleX: isRTL ? -1 : 1 }],
  };
}

/**
 * Dynamic text alignment based on language direction
 */
export function getRTLTextAlign(
  defaultAlign: TextStyle["textAlign"] = "left",
  isRTL: boolean = isAppRTL()
): TextStyle["textAlign"] {
  if (!isRTL) return defaultAlign;
  if (defaultAlign === "left") return "right";
  if (defaultAlign === "right") return "left";
  return defaultAlign;
}

/**
 * Safe App Reload trigger when switching between LTR and RTL on native devices
 */
export async function reloadAppForRTL(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return;
  }

  try {
    // Attempt dynamic require of expo-updates if installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Updates = require("expo-updates");
    if (Updates && typeof Updates.reloadAsync === "function") {
      await Updates.reloadAsync();
      return;
    }
  } catch (err) {
    // Expo Updates not available or in development client
    console.log("[RTL] expo-updates not active in current environment");
  }
}

/**
 * Helper to map legacy LTR/RTL margins to logical start/end values
 */
export function getLogicalSpacing(
  start?: number,
  end?: number
): { marginStart?: number; marginEnd?: number } {
  const result: { marginStart?: number; marginEnd?: number } = {};
  if (start !== undefined) result.marginStart = start;
  if (end !== undefined) result.marginEnd = end;
  return result;
}
