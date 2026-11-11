import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NearbyLandmark } from "../../data/hotelCatalog";

interface NearbyLandmarksRowProps {
  landmarks?: NearbyLandmark[];
  summaryBn?: string;
  summaryEn?: string;
  compact?: boolean;
}

export const NearbyLandmarksRow: React.FC<NearbyLandmarksRowProps> = ({
  landmarks,
  summaryBn,
  summaryEn,
  compact = false,
}) => {
  if (compact && (summaryBn || summaryEn)) {
    return (
      <View style={styles.compactRow}>
        <Ionicons name="navigate-circle-outline" size={13} color="#0055F2" style={{ marginEnd: 4 }} />
        <Text style={styles.compactText} numberOfLines={1}>
          {summaryBn || summaryEn}
        </Text>
      </View>
    );
  }

  if (landmarks && landmarks.length > 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.scrollWrapper}
      >
        {landmarks.map((lm, idx) => {
          const iconName = (lm.icon as any) || "location-outline";
          return (
            <View key={`${lm.name}-${idx}`} style={styles.landmarkChip}>
              <Ionicons name={iconName} size={12} color="#0284C7" style={{ marginEnd: 4 }} />
              <Text style={styles.landmarkChipText}>
                {lm.name_bn || lm.name} <Text style={styles.distanceBold}>{lm.distance_bn || lm.distance}</Text>
              </Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  if (summaryBn || summaryEn) {
    return (
      <View style={styles.compactRow}>
        <Ionicons name="navigate-circle-outline" size={13} color="#0055F2" style={{ marginEnd: 4 }} />
        <Text style={styles.compactText} numberOfLines={1}>
          {summaryBn || summaryEn}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  compactText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
    flex: 1,
  },
  scrollWrapper: {
    marginTop: 6,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  landmarkChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  landmarkChipText: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "500",
  },
  distanceBold: {
    fontWeight: "800",
    color: "#0284C7",
  },
});
