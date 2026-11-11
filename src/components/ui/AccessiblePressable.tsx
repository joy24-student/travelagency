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

export interface AccessiblePressableProps extends Omit<PressableProps, "style"> {
  accessibilityLabel: string;
  accessibilityHint?: string;
  enforceTouchTarget?: boolean;
  rippleColor?: string;
  borderlessRipple?: boolean;
  activeOpacity?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

/**
 * Drop-in accessible Pressable ensuring:
 * 1. Screen reader label and button role are always present.
 * 2. Minimum 44x44 touch zone & hitSlop.
 * 3. Native Android ink ripple feedback.
 * 4. Web keyboard navigation (Tab focus + Enter/Space trigger).
 */
export const AccessiblePressable: React.FC<AccessiblePressableProps> = ({
  accessibilityLabel,
  accessibilityHint,
  enforceTouchTarget = true,
  rippleColor = "rgba(0, 85, 242, 0.12)",
  borderlessRipple = false,
  activeOpacity = 0.75,
  disabled = false,
  onPress,
  style,
  children,
  hitSlop = hitSlopPresets.md,
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
      style={(state) => [
        enforceTouchTarget && styles.minTouch,
        disabled && styles.disabled,
        !isAndroid && state.pressed && !disabled && { opacity: activeOpacity },
        typeof style === "function" ? style(state) : style,
        focusStyle,
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
  },
  minTouch: {
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    justifyContent: "center",
  },
});
