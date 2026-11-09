/**
 * AgencyVerifiedBadge Component for Agency Portal
 * Displays authenticated verification status for verified travel agencies.
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
  label = "Verified Partner",
  style,
}: AgencyVerifiedBadgeProps) {
  if (!isVerified && !verifiedAt) {
    return null;
  }

  const iconSize = size === "small" ? 14 : size === "medium" ? 17 : 21;
  const fontSize = size === "small" ? 11 : size === "medium" ? 12 : 14;

  return (
    <View style={[styles.badgeContainer, style]}>
      <MaterialCommunityIcons
        name="check-decagram"
        size={iconSize}
        color="#0284c7"
        style={{ marginRight: 4 }}
      />
      {showText && <Text style={[styles.badgeText, { fontSize }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "700",
    color: "#0369a1",
  },
});

export default AgencyVerifiedBadge;
