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
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import { hitSlopPresets } from "../../theme/spacing";
import { FONTS } from "../../theme/typography";
import { useA11yFocusRing } from "../../hooks/useA11yFocusRing";

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
  preventDoubleTap?: boolean;
  cooldownMs?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  onPress?: (event: GestureResponderEvent) => void | Promise<void | any>;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  disabledReason?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = "primary" as ButtonVariant,
  size = "md" as ButtonSize,
  loading = false,
  loadingText,
  disabled = false,
  preventDoubleTap = true,
  cooldownMs = 800,
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
  disabledReason,
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const lastPressRef = React.useRef<number>(0);
  const isExecutingRef = React.useRef<boolean>(false);

  const effectiveLoading = loading || internalLoading;
  const isInteractive = !disabled && !effectiveLoading;
  const resolvedVariant: ButtonVariant = variant;
  const resolvedSize: ButtonSize = size;

  const { focusStyle, focusProps } = useA11yFocusRing({
    onPress: () => onPress?.({} as GestureResponderEvent),
    disabled: !isInteractive,
  });

  const handlePress = async (event: GestureResponderEvent) => {
    if (!isInteractive) return;

    const now = Date.now();
    if (preventDoubleTap) {
      if (isExecutingRef.current) return;
      if (now - lastPressRef.current < cooldownMs) return;
      lastPressRef.current = now;
    }

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

    if (onPress) {
      try {
        isExecutingRef.current = true;
        const result = onPress(event);
        if (result && typeof (result as any).then === "function") {
          setInternalLoading(true);
          await result;
        }
      } catch (err) {
        throw err;
      } finally {
        isExecutingRef.current = false;
        setInternalLoading(false);
      }
    }
  };

  const computedA11yLabel =
    accessibilityLabel || label || (typeof children === "string" ? children : undefined);

  if (__DEV__ && !computedA11yLabel) {
    console.warn(
      `[a11y-warning] Button has no accessible text label! testID: "${testID || "unknown"}". Please provide accessibilityLabel or label.`
    );
  }

  const { colors: themeColors } = useTheme();
  const variantStyles = getVariantStyles(resolvedVariant, themeColors);
  const sizeStyles = getSizeStyles(resolvedSize);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={computedA11yLabel}
      accessibilityState={{ disabled: !isInteractive, busy: effectiveLoading }}
      accessibilityHint={disabled ? disabledReason : undefined}
      hitSlop={resolvedSize === "sm" ? hitSlopPresets.md : undefined}
      disabled={!isInteractive}
      onPress={handlePress}
      android_ripple={
        !isInteractive
          ? undefined
          : {
              color:
                resolvedVariant === "primary" || resolvedVariant === "danger"
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(0, 85, 242, 0.15)",
              borderless: false,
            }
      }
      className={className}
      {...(focusProps as any)}
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        !isInteractive && styles.disabled,
        Platform.OS !== "android" && pressed && isInteractive && styles.pressed,
        focusStyle,
        style,
      ]}
    >
      {effectiveLoading ? (
        <View style={styles.contentRow}>
          <ActivityIndicator
            size="small"
            color={variantStyles.spinnerColor}
            style={styles.spinner}
          />
          {loadingText ? (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
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
          {leftIcon ? (
            <View accessible={false} importantForAccessibility="no" style={styles.leftIconContainer}>
              {leftIcon}
            </View>
          ) : null}
          {label ? (
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
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
          {rightIcon ? (
            <View accessible={false} importantForAccessibility="no" style={styles.rightIconContainer}>
              {rightIcon}
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
};

function getVariantStyles(variant: ButtonVariant, themeColors: any) {
  const primaryColor = themeColors?.primary || colors.brand.trip.blue;
  const secondaryColor = themeColors?.secondary || colors.brand.luxe.navy;
  const dangerColor = themeColors?.danger || colors.status.danger.main;

  switch (variant) {
    case "secondary":
      return {
        container: {
          backgroundColor: secondaryColor,
          borderWidth: 0,
        },
        text: {
          color: "#ffffff",
        },
        spinnerColor: "#ffffff",
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: primaryColor,
        },
        text: {
          color: primaryColor,
        },
        spinnerColor: primaryColor,
      };
    case "ghost":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 0,
        },
        text: {
          color: primaryColor,
        },
        spinnerColor: primaryColor,
      };
    case "danger":
      return {
        container: {
          backgroundColor: dangerColor,
          borderWidth: 0,
        },
        text: {
          color: "#ffffff",
        },
        spinnerColor: "#ffffff",
      };
    case "primary":
    default:
      return {
        container: {
          backgroundColor: primaryColor,
          borderWidth: 0,
        },
        text: {
          color: "#ffffff",
        },
        spinnerColor: "#ffffff",
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
    fontFamily: FONTS.bengali.bold,
  },
  leftIconContainer: {
    marginEnd: 8,
  },
  rightIconContainer: {
    marginStart: 8,
  },
  spinner: {
    marginEnd: 6,
  },
  disabled: {
    opacity: 0.45,
    ...(Platform.OS === "web" ? { cursor: "not-allowed" as any } : {}),
  },
  disabledReasonText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
