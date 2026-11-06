import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../../theme/colors";

export type BadgeStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "vip"
  | "verified"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export type BadgeVariant = "solid" | "subtle" | "outline";
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  status?: BadgeStatus;
  variant?: BadgeVariant;
  size?: BadgeSize;
  label?: string;
  children?: React.ReactNode;
  showDot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = "neutral" as BadgeStatus,
  variant = "subtle" as BadgeVariant,
  size = "md" as BadgeSize,
  label,
  children,
  showDot = false,
  icon,
  className,
  textClassName,
  style,
  textStyle,
  testID,
}) => {
  const resolvedStatus: BadgeStatus = status;
  const resolvedVariant: BadgeVariant = variant;
  const resolvedSize: BadgeSize = size;
  const colorToken = getStatusColorToken(resolvedStatus);
  const variantStyles = getVariantStyles(resolvedVariant, colorToken);
  const sizeStyles = getSizeStyles(resolvedSize);

  const displayLabel =
    label || (typeof children === "string" ? children : undefined) || getDefaultLabel(resolvedStatus);

  return (
    <View
      testID={testID}
      className={className}
      style={[
        styles.baseContainer,
        sizeStyles.container,
        variantStyles.container,
        style,
      ]}
    >
      {showDot ? (
        <View
          style={[
            styles.dot,
            sizeStyles.dot,
            { backgroundColor: variantStyles.dotColor },
          ]}
        />
      ) : null}

      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}

      {displayLabel ? (
        <Text
          numberOfLines={1}
          className={textClassName}
          style={[
            styles.baseText,
            sizeStyles.text,
            variantStyles.text,
            textStyle,
          ]}
        >
          {displayLabel}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};

// ============================================================================
// STATUS TOKENS & MAPPINGS
// ============================================================================

interface ColorConfig {
  main: string;
  light: string;
  border: string;
  darkText: string;
  contrastText: string;
}

function getStatusColorToken(status: BadgeStatus): ColorConfig {
  switch (status) {
    case "confirmed":
    case "success":
      return {
        main: colors.status.success.main,
        light: colors.status.success.light,
        border: colors.status.success.border,
        darkText: colors.status.success.text,
        contrastText: colors.status.success.contrast,
      };
    case "pending":
    case "warning":
      return {
        main: colors.status.warning.main,
        light: colors.status.warning.light,
        border: colors.status.warning.border,
        darkText: colors.status.warning.text,
        contrastText: colors.status.warning.contrast,
      };
    case "cancelled":
    case "error":
      return {
        main: colors.status.danger.main,
        light: colors.status.danger.light,
        border: colors.status.danger.border,
        darkText: colors.status.danger.text,
        contrastText: colors.status.danger.contrast,
      };
    case "vip":
      return {
        main: colors.brand.luxe.gold,
        light: "#fffbe6",
        border: "#fde68a",
        darkText: colors.brand.luxe.navy,
        contrastText: colors.brand.luxe.ink,
      };
    case "verified":
    case "info":
      return {
        main: colors.brand.trip.blue,
        light: colors.status.info.light,
        border: colors.status.info.border,
        darkText: colors.status.info.text,
        contrastText: colors.status.info.contrast,
      };
    case "neutral":
    default:
      return {
        main: colors.status.neutral.main,
        light: colors.status.neutral.light,
        border: colors.status.neutral.border,
        darkText: colors.status.neutral.text,
        contrastText: colors.status.neutral.contrast,
      };
  }
}

function getVariantStyles(variant: BadgeVariant, color: ColorConfig) {
  switch (variant) {
    case "solid":
      return {
        container: {
          backgroundColor: color.main,
          borderWidth: 0,
        },
        text: {
          color: color.contrastText,
        },
        dotColor: color.contrastText,
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: color.main,
        },
        text: {
          color: color.main,
        },
        dotColor: color.main,
      };
    case "subtle":
    default:
      return {
        container: {
          backgroundColor: color.light,
          borderWidth: 1,
          borderColor: color.border,
        },
        text: {
          color: color.darkText,
        },
        dotColor: color.main,
      };
  }
}

function getSizeStyles(size: BadgeSize) {
  switch (size) {
    case "sm":
      return {
        container: {
          paddingVertical: 2,
          paddingHorizontal: 6,
          borderRadius: 6,
        },
        text: {
          fontSize: 10,
          fontWeight: "600" as const,
        },
        dot: {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          marginRight: 4,
        },
      };
    case "lg":
      return {
        container: {
          paddingVertical: 5,
          paddingHorizontal: 12,
          borderRadius: 10,
        },
        text: {
          fontSize: 13,
          fontWeight: "700" as const,
        },
        dot: {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          marginRight: 6,
        },
      };
    case "md":
    default:
      return {
        container: {
          paddingVertical: 3.5,
          paddingHorizontal: 9,
          borderRadius: 8,
        },
        text: {
          fontSize: 11.5,
          fontWeight: "600" as const,
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          marginRight: 5,
        },
      };
  }
}

function getDefaultLabel(status: BadgeStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    case "vip":
      return "VIP";
    case "verified":
      return "Verified";
    case "success":
      return "Success";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
    case "info":
      return "Info";
    case "neutral":
    default:
      return "Status";
  }
}

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  baseText: {
    letterSpacing: 0.2,
  },
  dot: {
    flexShrink: 0,
  },
  iconContainer: {
    marginRight: 4,
  },
});
