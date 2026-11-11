/**
 * Accessible Focus Ring & Keyboard Navigation Hook
 * Guarantees WCAG 2.4.7 (Focus Visible) and WCAG 2.1.1 (Keyboard Accessible) compliance,
 * especially when running on react-native-web / desktop browsers.
 */

import { useState, useCallback } from "react";
import { Platform, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export interface UseA11yFocusRingOptions {
  ringColor?: string;
  ringWidth?: number;
  ringOffset?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export function useA11yFocusRing({
  ringColor = colors.brand.trip.blue,
  ringWidth = 2,
  ringOffset = 2,
  onPress,
  disabled = false,
}: UseA11yFocusRingOptions = {}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsFocused(true);
    }
  }, [disabled]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: any) => {
      if (disabled || !onPress) return;

      // Handle Enter (13) and Space (32) keyboard activation
      if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
        e.preventDefault?.();
        onPress();
      }
    },
    [disabled, onPress]
  );

  const focusStyle: ViewStyle | any =
    Platform.OS === "web" && isFocused && !disabled
      ? {
          outlineWidth: ringWidth,
          outlineStyle: "solid",
          outlineColor: ringColor,
          outlineOffset: ringOffset,
          boxShadow: `0 0 0 ${ringWidth + 1}px rgba(40, 125, 250, 0.35)`,
        }
      : {};

  const focusProps = {
    onFocus: handleFocus,
    onBlur: handleBlur,
    ...(Platform.OS === "web" && {
      onKeyDown: handleKeyDown,
      tabIndex: (disabled ? -1 : 0) as 0 | -1,
    }),
  };

  return {
    isFocused,
    focusStyle,
    focusProps,
  };
}
