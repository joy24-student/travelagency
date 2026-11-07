import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import { colors } from "../../theme/colors";
import { Skeleton } from "./Skeleton";

export type LoadingVariant = "skeleton" | "spinner" | "inline";
export type SkeletonLayoutType = "card" | "list" | "table" | "profile" | "grid";

export interface LoadingStateProps {
  variant?: LoadingVariant;
  skeletonType?: SkeletonLayoutType;
  count?: number;
  message?: string;
  size?: "small" | "large" | number;
  fullscreen?: boolean;
  style?: StyleProp<ViewStyle>;
  messageStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = "spinner",
  skeletonType = "list",
  count = 3,
  message,
  size = "large",
  fullscreen = false,
  style,
  messageStyle,
  testID,
}) => {
  if (variant === "skeleton") {
    return (
      <View
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={message || "Loading content"}
        style={[styles.skeletonContainer, style]}
      >
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonItem key={index} type={skeletonType} />
        ))}
      </View>
    );
  }

  const spinnerContent = (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message || "Loading"}
      style={[
        styles.spinnerContainer,
        fullscreen && styles.fullscreen,
        style,
      ]}
    >
      <ActivityIndicator
        size={typeof size === "number" ? undefined : size}
        color={colors.brand.trip.blue}
      />
      {message ? (
        <Text style={[styles.message, messageStyle]}>{message}</Text>
      ) : null}
    </View>
  );

  return spinnerContent;
};

const SkeletonItem: React.FC<{ type: SkeletonLayoutType }> = ({ type }) => {
  switch (type) {
    case "card":
      return (
        <View style={styles.cardSkeleton}>
          <Skeleton width="100%" height={150} borderRadius={14} />
          <View style={{ marginTop: 12, gap: 8 }}>
            <Skeleton width="70%" height={18} borderRadius={6} />
            <Skeleton width="45%" height={14} borderRadius={6} />
            <View style={styles.rowBetween}>
              <Skeleton width="30%" height={22} borderRadius={6} />
              <Skeleton width="25%" height={32} borderRadius={8} />
            </View>
          </View>
        </View>
      );
    case "table":
      return (
        <View style={styles.tableRowSkeleton}>
          <Skeleton width="20%" height={16} borderRadius={4} />
          <Skeleton width="35%" height={16} borderRadius={4} />
          <Skeleton width="20%" height={16} borderRadius={4} />
          <Skeleton width="15%" height={24} borderRadius={6} />
        </View>
      );
    case "profile":
      return (
        <View style={styles.profileSkeleton}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="60%" height={18} borderRadius={6} />
            <Skeleton width="40%" height={14} borderRadius={6} />
          </View>
        </View>
      );
    case "list":
    default:
      return (
        <View style={styles.listItemSkeleton}>
          <Skeleton width={48} height={48} borderRadius={10} />
          <View style={{ flex: 1, gap: 8, marginStart: 12 }}>
            <Skeleton width="80%" height={16} borderRadius={6} />
            <Skeleton width="50%" height={12} borderRadius={6} />
          </View>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  spinnerContainer: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreen: {
    flex: 1,
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
    color: colors.neutral[600],
    textAlign: "center",
  },
  skeletonContainer: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  listItemSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardSkeleton: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  profileSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableRowSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
});
