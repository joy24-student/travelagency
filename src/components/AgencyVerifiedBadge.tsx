/**
 * AgencyVerifiedBadge Component
 * Displays authenticated verification status for verified travel agencies.
 * Used across Agency Lists, Detail Screens, and Search Cards.
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export interface AgencyVerifiedBadgeProps {
  isVerified?: boolean;
  verifiedAt?: string | null;
  size?: "small" | "medium" | "large";
  showText?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function AgencyVerifiedBadge({
  isVerified = true,
  verifiedAt,
  size = "small",
  showText = true,
  label = "Verified",
  style,
}: AgencyVerifiedBadgeProps) {
  // If explicitly not verified and verifiedAt is null, don't show or return null
  if (!isVerified && !verifiedAt) {
    return null;
  }

  const iconSize = size === "small" ? 13 : size === "medium" ? 16 : 20;
  const fontSize = size === "small" ? 11 : size === "medium" ? 12 : 14;
  const paddingVertical = size === "small" ? 2 : size === "medium" ? 4 : 6;
  const paddingHorizontal = size === "small" ? 6 : size === "medium" ? 8 : 10;

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          paddingVertical,
          paddingHorizontal,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel="Verified Travel Partner"
    >
      <MaterialCommunityIcons
        name="check-decagram"
        size={iconSize}
        color="#0284c7"
        style={styles.icon}
      />
      {showText && (
        <Text style={[styles.badgeText, { fontSize }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 4,
  },
  badgeText: {
    fontWeight: "700",
    color: "#0369a1",
    letterSpacing: 0.2,
  },
});

export default AgencyVerifiedBadge;
