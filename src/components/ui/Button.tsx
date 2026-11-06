import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = "primary" as ButtonVariant,
  size = "md" as ButtonSize,
  loading = false,
  loadingText,
  disabled = false,
  haptic = true,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onPress,
  className,
  textClassName,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  const isInteractive = !disabled && !loading;
  const resolvedVariant: ButtonVariant = variant;
  const resolvedSize: ButtonSize = size;

  const handlePress = async (event: GestureResponderEvent) => {
    if (!isInteractive) return;

    if (haptic && Platform.OS !== "web") {
      try {
        const feedbackStyle =
          typeof haptic === "string"
            ? haptic
            : Haptics.ImpactFeedbackStyle.Light;
        await Haptics.impactAsync(feedbackStyle);
      } catch {
        // Silently fail if haptics is unsupported on target device
      }
    }

    onPress?.(event);
  };

  const variantStyles = getVariantStyles(resolvedVariant);
  const sizeStyles = getSizeStyles(resolvedSize);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || (typeof children === "string" ? children : undefined)}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onPress={handlePress}
      className={className}
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        !isInteractive && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator
            size="small"
            color={variantStyles.spinnerColor}
            style={styles.spinner}
          />
          {loadingText ? (
            <Text
              className={textClassName}
              style={[
                styles.baseText,
                sizeStyles.text,
                variantStyles.text,
                textStyle,
              ]}
            >
              {loadingText}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.contentRow}>
          {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}
          {label ? (
            <Text
              className={textClassName}
              style={[
                styles.baseText,
                sizeStyles.text,
                variantStyles.text,
                textStyle,
              ]}
            >
              {label}
            </Text>
          ) : (
            children
          )}
          {rightIcon ? <View style={styles.rightIconContainer}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

function getVariantStyles(variant: ButtonVariant) {
  switch (variant) {
    case "secondary":
      return {
        container: {
          backgroundColor: colors.brand.luxe.navy,
          borderWidth: 0,
        },
        text: {
          color: colors.neutral[0],
        },
        spinnerColor: colors.neutral[0],
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.brand.trip.blue,
        },
        text: {
          color: colors.brand.trip.blue,
        },
        spinnerColor: colors.brand.trip.blue,
      };
    case "ghost":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 0,
        },
        text: {
          color: colors.brand.trip.blue,
        },
        spinnerColor: colors.brand.trip.blue,
      };
    case "danger":
      return {
        container: {
          backgroundColor: colors.status.danger.main,
          borderWidth: 0,
        },
        text: {
          color: colors.neutral[0],
        },
        spinnerColor: colors.neutral[0],
      };
    case "primary":
    default:
      return {
        container: {
          backgroundColor: colors.brand.trip.blue,
          borderWidth: 0,
        },
        text: {
          color: colors.neutral[0],
        },
        spinnerColor: colors.neutral[0],
      };
  }
}

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case "sm":
      return {
        container: {
          paddingVertical: 7,
          paddingHorizontal: 12,
          borderRadius: 8,
          minHeight: 34,
        },
        text: {
          fontSize: 13,
          fontWeight: "600" as const,
        },
      };
    case "lg":
      return {
        container: {
          paddingVertical: 14,
          paddingHorizontal: 22,
          borderRadius: 14,
          minHeight: 52,
        },
        text: {
          fontSize: 16,
          fontWeight: "600" as const,
        },
      };
    case "md":
    default:
      return {
        container: {
          paddingVertical: 11,
          paddingHorizontal: 18,
          borderRadius: 10,
          minHeight: 44,
        },
        text: {
          fontSize: 15,
          fontWeight: "600" as const,
        },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  baseText: {
    textAlign: "center",
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  spinner: {
    marginRight: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
