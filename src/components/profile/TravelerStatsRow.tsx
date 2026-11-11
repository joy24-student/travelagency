import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

export interface TravelerStatsRowProps {
  districtsCount?: number;
  mountainsCount?: number;
  tripsCount?: number;
  travelPersona?: string;
  onPressPersona?: () => void;
  onPressStats?: (statType: "places" | "peaks" | "trips") => void;
}

export const TravelerStatsRow: React.FC<TravelerStatsRowProps> = ({
  districtsCount = 28,
  mountainsCount = 9,
  tripsCount = 34,
  travelPersona = "Explorer & Foodie",
  onPressPersona,
  onPressStats,
}) => {
  const { colors, isDark } = useTheme();

  const handleStatPress = (type: "places" | "peaks" | "trips") => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onPressStats?.(type);
  };

  return (
    <View style={styles.container}>
      {/* Travel Persona Badge */}
      {travelPersona && (
        <Pressable
          style={[
            styles.personaBadge,
            {
              backgroundColor: isDark
                ? "rgba(229, 169, 60, 0.15)"
                : "#FEF3C7",
              borderColor: isDark
                ? "rgba(229, 169, 60, 0.3)"
                : "#FDE68A",
            },
          ]}
          onPress={() => {
            if (Platform.OS !== "web") {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
            }
            onPressPersona?.();
          }}
        >
          <Ionicons name="sparkles" size={13} color="#D97706" />
          <Text style={styles.personaText}>
            Persona: <Text style={{ fontWeight: "800" }}>{travelPersona}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={12} color="#D97706" />
        </Pressable>
      )}

      {/* 3-Column Milestone Odometer */}
      <View
        style={[
          styles.odometerCard,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            borderColor: colors.border,
          },
        ]}
      >
        {/* Stat 1: Districts / Places */}
        <Pressable
          style={styles.statCol}
          onPress={() => handleStatPress("places")}
        >
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {districtsCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Districts
          </Text>
        </Pressable>

        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* Stat 2: Mountains / Peaks */}
        <Pressable
          style={styles.statCol}
          onPress={() => handleStatPress("peaks")}
        >
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {mountainsCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Peaks & Trails
          </Text>
        </Pressable>

        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />

        {/* Stat 3: Trips Completed */}
        <Pressable
          style={styles.statCol}
          onPress={() => handleStatPress("trips")}
        >
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {tripsCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Trips Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  personaBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "center",
    marginBottom: 12,
  },
  personaText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "500",
  },
  odometerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  divider: {
    width: 1,
    height: 28,
  },
});

export default TravelerStatsRow;
