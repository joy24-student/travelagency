import React from "react";
import { View, StyleSheet, ViewStyle, DimensionValue, StyleProp } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Skeleton } from "../ui/Skeleton";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * SkeletonPlaceholder - Delegated to canonical unified Skeleton
 */
export function SkeletonPlaceholder({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={borderRadius}
      style={style}
    />
  );
}

export function CardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
    >
      <Skeleton width="100%" height={160} borderRadius={16} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <Skeleton width="75%" height={18} />
        <Skeleton width="45%" height={14} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Skeleton width="30%" height={22} borderRadius={6} />
          <Skeleton width="25%" height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

export function FlightCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width={110} height={20} />
        <Skeleton width={70} height={20} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 14 }}>
        <View style={{ alignItems: "flex-start", gap: 4 }}>
          <Skeleton width={60} height={24} />
          <Skeleton width={45} height={14} />
        </View>
        <Skeleton width={100} height={14} />
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Skeleton width={60} height={24} />
          <Skeleton width={45} height={14} />
        </View>
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          paddingTop: 10,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Skeleton width={80} height={16} />
        <Skeleton width={90} height={20} />
      </View>
    </View>
  );
}

export function ListSkeleton({
  count = 3,
  type = "card",
  style,
}: {
  count?: number;
  type?: "card" | "flight" | "generic";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, i) =>
        type === "flight" ? <FlightCardSkeleton key={i} /> : <CardSkeleton key={i} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
