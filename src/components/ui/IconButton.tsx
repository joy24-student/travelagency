import React from "react";
import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { hitSlopPresets, touchTargets } from "../../theme/spacing";
import { useA11yFocusRing } from "../../hooks/useA11yFocusRing";
import { getA11yButtonProps } from "../../utils/a11y/a11yProps";

export type IconButtonVariant = "ghost" | "filled" | "outline" | "tonal";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps {
  /**
   * REQUIRED: Screen reader label announced by VoiceOver/TalkBack.
   * Eliminates the "unlabelled button" issue.
   */
  accessibilityLabel: string;
  accessibilityHint?: string;

  /**
   * Icon name from Ionicons, or custom React Node (vector icon or svg)
   */
  icon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
  iconSize?: number;
  iconColor?: string;

  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;

  onPress?: (event?: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  accessibilityLabel,
  accessibilityHint,
  icon,
  children,
  iconSize,
  iconColor,
  variant = "ghost",
  size = "md",
  disabled = false,
  loading = false,
  haptic = true,
  onPress,
  style,
  testID,
}) => {
  const isInteractive = !disabled && !loading;

  const { focusStyle, focusProps } = useA11yFocusRing({
    onPress: () => onPress?.(),
    disabled: !isInteractive,
  });

  const handlePress = async (event: GestureResponderEvent) => {
    if (!isInteractive) return;

    if (haptic && Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Silently fail if haptics unsupported
      }
    }

    onPress?.(event);
  };

  const a11yProps = getA11yButtonProps({
    label: accessibilityLabel,
    hint: accessibilityHint,
    disabled: !isInteractive,
    busy: loading,
    testID,
  });

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const resolvedIconSize = iconSize ?? sizeStyles.defaultIconSize;
  const resolvedIconColor = iconColor ?? variantStyles.defaultIconColor;

  return (
    <Pressable
      {...a11yProps}
      {...focusProps}
      testID={testID}
      disabled={!isInteractive}
      onPress={handlePress}
      hitSlop={hitSlopPresets.md}
      android_ripple={
        !isInteractive
          ? undefined
          : {
              color: "rgba(0, 85, 242, 0.15)",
              borderless: true,
            }
      }
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        !isInteractive && styles.disabled,
        Platform.OS !== "android" && pressed && isInteractive && styles.pressed,
        focusStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={resolvedIconColor} />
      ) : icon ? (
        <View accessible={false} importantForAccessibility="no">
          <Ionicons
            name={icon}
            size={resolvedIconSize}
            color={resolvedIconColor}
          />
        </View>
      ) : (
        <View accessible={false} importantForAccessibility="no">
          {children}
        </View>
      )}
    </Pressable>
  );
};

function getVariantStyles(variant: IconButtonVariant) {
  switch (variant) {
    case "filled":
      return {
        container: {
          backgroundColor: colors.brand.trip.blue,
          borderWidth: 0,
        },
        defaultIconColor: colors.neutral[0],
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1.2,
          borderColor: colors.border.default,
        },
        defaultIconColor: colors.text.secondary,
      };
    case "tonal":
      return {
        container: {
          backgroundColor: colors.brand.trip.lightBlue,
          borderWidth: 0,
        },
        defaultIconColor: colors.brand.trip.blue,
      };
    case "ghost":
    default:
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 0,
        },
        defaultIconColor: colors.text.secondary,
      };
  }
}

function getSizeStyles(size: IconButtonSize) {
  switch (size) {
    case "sm":
      return {
        container: {
          width: touchTargets.min, // Enforce 44x44 minimum touch target
          height: touchTargets.min,
          borderRadius: touchTargets.min / 2,
        },
        defaultIconSize: 18,
      };
    case "lg":
      return {
        container: {
          width: 52,
          height: 52,
          borderRadius: 26,
        },
        defaultIconSize: 26,
      };
    case "md":
    default:
      return {
        container: {
          width: touchTargets.standard, // 48x48
          height: touchTargets.standard,
          borderRadius: touchTargets.standard / 2,
        },
        defaultIconSize: 22,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
