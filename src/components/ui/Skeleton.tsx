import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from "react-native";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";

export type SkeletonVariant = "rect" | "circle" | "text" | "card";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  duration?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Skeleton: React.FC<SkeletonProps> & {
  Circle: typeof SkeletonCircle;
  Text: typeof SkeletonText;
  Card: typeof SkeletonCard;
} = ({
  variant = "rect" as SkeletonVariant,
  width,
  height,
  borderRadius,
  duration = 1200,
  className,
  style,
  testID,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const shimmer = useSharedValue(0);
  const resolvedVariant: SkeletonVariant = variant;

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1),
      }),
      -1,
      true
    );
  }, [duration, shimmer]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.35 + shimmer.value * 0.45,
    };
  });

  const variantStyle = getVariantDefaults(resolvedVariant, width, height, borderRadius);

  return (
    <View
      testID={testID}
      className={className}
      style={[
        styles.skeletonBase,
        {
          backgroundColor: isDark ? themeColors.border : themeColors.borderSubtle,
        },
        variantStyle,
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.shimmerLayer,
          {
            backgroundColor: isDark ? themeColors.surface : themeColors.card,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// ============================================================================
// COMPOUND SKELETON PRIMITIVES
// ============================================================================

export interface SkeletonCircleProps {
  size?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 44,
  className,
  style,
}) => {
  return (
    <Skeleton
      variant="circle"
      width={size}
      height={size}
      borderRadius={size / 2}
      className={className}
      style={style}
    />
  );
};

export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: DimensionValue;
  lineHeight?: number;
  spacing?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = "65%",
  lineHeight = 14,
  spacing = 8,
  className,
  style,
}) => {
  return (
    <View className={className} style={[styles.textGroup, style]}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        return (
          <Skeleton
            key={index}
            variant="text"
            height={lineHeight}
            width={isLast && lines > 1 ? lastLineWidth : "100%"}
            borderRadius={lineHeight / 2}
            style={{ marginBottom: isLast ? 0 : spacing }}
          />
        );
      })}
    </View>
  );
};

export interface SkeletonCardProps {
  hasImage?: boolean;
  imageHeight?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  imageHeight = 160,
  className,
  style,
}) => {
  const { colors: themeColors } = useTheme();

  return (
    <View
      className={className}
      style={[
        styles.cardContainer,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.borderSubtle,
        },
        style,
      ]}
    >
      {hasImage ? (
        <Skeleton
          width="100%"
          height={imageHeight}
          borderRadius={12}
          style={styles.cardImage}
        />
      ) : null}

      <View style={styles.cardHeaderRow}>
        <SkeletonCircle size={40} />
        <View style={styles.cardHeaderMeta}>
          <Skeleton width="60%" height={14} borderRadius={7} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={13} borderRadius={6.5} />
        </View>
      </View>

      <SkeletonText lines={2} lastLineWidth="80%" style={{ marginTop: 12 }} />
    </View>
  );
};

// Compound attachments
Skeleton.Circle = SkeletonCircle;
Skeleton.Text = SkeletonText;
Skeleton.Card = SkeletonCard;

function getVariantDefaults(
  variant: SkeletonVariant,
  customWidth?: DimensionValue,
  customHeight?: DimensionValue,
  customRadius?: number
): ViewStyle {
  switch (variant) {
    case "circle": {
      const size = customWidth || customHeight || 44;
      return {
        width: size,
        height: size,
        borderRadius: customRadius ?? (typeof size === "number" ? size / 2 : 22),
      };
    }
    case "text":
      return {
        width: customWidth ?? "100%",
        height: customHeight ?? 14,
        borderRadius: customRadius ?? 6,
      };
    case "card":
      return {
        width: customWidth ?? "100%",
        height: customHeight ?? 220,
        borderRadius: customRadius ?? 16,
      };
    case "rect":
    default:
      return {
        width: customWidth ?? "100%",
        height: customHeight ?? 48,
        borderRadius: customRadius ?? 8,
      };
  }
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: colors.neutral[200],
    overflow: "hidden",
    position: "relative",
  },
  shimmerLayer: {
    backgroundColor: colors.neutral[100],
  },
  textGroup: {
    width: "100%",
  },
  cardContainer: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    width: "100%",
  },
  cardImage: {
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeaderMeta: {
    marginStart: 12,
    flex: 1,
  },
});
