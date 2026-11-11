/**
 * Accessibility (a11y) Props Generator & Validation Utility
 * Adheres to WCAG 2.1 Level AA and React Native / React Native Web standards.
 */

import { AccessibilityRole, AccessibilityState, Platform } from "react-native";
import i18n from "../../locales/i18n";

function getLocalizedErrorPrefix(locale?: string): string {
  const lang = (locale || i18n.language || "en").toLowerCase();
  if (lang.startsWith("bn")) return "ত্রুটি: ";
  if (lang.startsWith("ar")) return "خطأ: ";
  if (lang.startsWith("hi")) return "त्रुटि: ";
  return "Error: ";
}

export interface ButtonA11yOptions {
  label: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  expanded?: boolean;
  testID?: string;
}

/**
 * Generates standardized accessibility props for touchable/pressable button components.
 */
export function getA11yButtonProps(options: ButtonA11yOptions) {
  const { label, hint, disabled = false, busy = false, selected, expanded, testID } = options;

  if (__DEV__ && (!label || label.trim().length === 0)) {
    console.warn(
      `[a11y-warning] Interactive button element is missing an accessibilityLabel! testID: "${testID || "unknown"}". VoiceOver and TalkBack users will hear an unlabelled button.`
    );
  }

  const accessibilityState: AccessibilityState = {
    disabled,
    busy,
  };

  if (selected !== undefined) accessibilityState.selected = selected;
  if (expanded !== undefined) accessibilityState.expanded = expanded;

  return {
    accessible: true,
    accessibilityRole: "button" as AccessibilityRole,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState,
    ...(Platform.OS === "web" && {
      tabIndex: (disabled ? -1 : 0) as 0 | -1,
      "aria-label": label,
      "aria-disabled": disabled,
      "aria-busy": busy,
      ...(expanded !== undefined && { "aria-expanded": expanded }),
      ...(selected !== undefined && { "aria-selected": selected }),
    }),
  };
}

export interface InputA11yOptions {
  label: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Generates standardized accessibility props for input components.
 */
export function getA11yInputProps(options: InputA11yOptions) {
  const { label, hint, error, disabled = false, required = false } = options;
  const isInvalid = !!error;

  return {
    accessible: true,
    accessibilityRole: (Platform.OS === "web" ? "textbox" : "none") as AccessibilityRole,
    accessibilityLabel: label,
    accessibilityHint: error ? `${getLocalizedErrorPrefix()}${error}` : hint,
    accessibilityState: { disabled },
    accessibilityRequired: required,
    ...(Platform.OS === "web" && {
      "aria-label": label,
      "aria-invalid": isInvalid,
      "aria-required": required,
      "aria-disabled": disabled,
      "aria-errormessage": error ? `${label}-error` : undefined,
    }),
  };
}

export interface ImageA11yOptions {
  label?: string;
  decorative?: boolean;
}

/**
 * Standardized props for images & icons
 */
export function getA11yImageProps(options: ImageA11yOptions) {
  const { label, decorative = false } = options;

  if (decorative || !label) {
    return {
      accessible: false,
      importantForAccessibility: "no" as const,
      ...(Platform.OS === "web" && { "aria-hidden": true }),
    };
  }

  return {
    accessible: true,
    accessibilityRole: "image" as AccessibilityRole,
    accessibilityLabel: label,
    ...(Platform.OS === "web" && { "aria-label": label }),
  };
}
