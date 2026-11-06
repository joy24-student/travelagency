import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function SkeletonPlaceholder({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: shimmerAnim,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonPlaceholder height={160} borderRadius={16} />
      <View style={{ marginTop: 12, gap: 8 }}>
        <SkeletonPlaceholder width="75%" height={18} />
        <SkeletonPlaceholder width="45%" height={14} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <SkeletonPlaceholder width="30%" height={22} borderRadius={6} />
          <SkeletonPlaceholder width="25%" height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
}

export function FlightCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonPlaceholder width={110} height={20} />
        <SkeletonPlaceholder width={70} height={20} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 14 }}>
        <View style={{ alignItems: "flex-start", gap: 4 }}>
          <SkeletonPlaceholder width={60} height={24} />
          <SkeletonPlaceholder width={45} height={14} />
        </View>
        <SkeletonPlaceholder width={100} height={12} />
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <SkeletonPlaceholder width={60} height={24} />
          <SkeletonPlaceholder width={45} height={14} />
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
        <SkeletonPlaceholder width={80} height={16} />
        <SkeletonPlaceholder width={90} height={20} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 3, type = "card" }: { count?: number; type?: "card" | "flight" }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) =>
        type === "flight" ? <FlightCardSkeleton key={i} /> : <CardSkeleton key={i} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#E2E8F0",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
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
