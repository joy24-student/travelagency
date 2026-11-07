import React from "react";
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { hitSlopPresets, touchTargets } from "../../theme/spacing";
import { useA11yFocusRing } from "../../hooks/useA11yFocusRing";
import { getA11yButtonProps } from "../../utils/a11y/a11yProps";

export interface AppPressableProps extends Omit<PressableProps, "style"> {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  enforceTouchTarget?: boolean;
  rippleColor?: string;
  borderlessRipple?: boolean;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered?: boolean }) => StyleProp<ViewStyle>);
}

/**
 * Universal Cross-Platform Interactive Component:
 * - Android: Delivers native Material ink ripple (android_ripple)
 * - iOS: Smooth activeOpacity/scale feedback
 * - Web: Keyboard accessibility (Enter/Space focus ring) + pointer cursor
 * - Accessibility: Minimum 44x44 / 48x48 hitSlop & screen-reader compatibility
 */
export const AppPressable: React.FC<AppPressableProps> = ({
  accessibilityLabel = "",
  accessibilityHint,
  enforceTouchTarget = false,
  rippleColor = "rgba(0, 85, 242, 0.12)",
  borderlessRipple = false,
  activeOpacity = 0.75,
  disabled = false,
  onPress,
  style,
  children,
  hitSlop = hitSlopPresets.sm,
  testID,
  ...rest
}) => {
  const { focusStyle, focusProps } = useA11yFocusRing({
    onPress: () => onPress?.({} as GestureResponderEvent),
    disabled: !!disabled,
  });

  const a11yProps = getA11yButtonProps({
    label: accessibilityLabel,
    hint: accessibilityHint,
    disabled: !!disabled,
    testID,
  });

  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  return (
    <Pressable
      {...a11yProps}
      {...focusProps}
      {...rest}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      android_ripple={
        disabled
          ? undefined
          : {
              color: rippleColor,
              borderless: borderlessRipple,
              foreground: !borderlessRipple,
            }
      }
      style={(state) => {
        const { pressed } = state;
        const userStyle = typeof style === "function" ? style(state) : style;

        return [
          styles.base,
          enforceTouchTarget && styles.minTouch,
          disabled && styles.disabled,
          // Apply activeOpacity only on iOS and Web where android_ripple does not render
          !isAndroid && pressed && !disabled && { opacity: activeOpacity },
          userStyle,
          focusStyle,
        ];
      }}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    ...(Platform.OS === "web" ? ({ cursor: "pointer", userSelect: "none" } as any) : {}),
  },
  disabled: {
    opacity: 0.45,
    ...(Platform.OS === "web" ? ({ cursor: "not-allowed" } as any) : {}),
  },
  minTouch: {
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    justifyContent: "center",
  },
});

export default AppPressable;
