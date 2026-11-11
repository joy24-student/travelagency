import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../theme";

export interface VitalStatus {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  details?: string;
}

export interface DestinationVitalsRowProps {
  temperature?: { value: string; condition?: string };
  airQuality?: { aqi: number; statusText?: string };
  safety?: { statusText: string };
  connectivity?: { statusText: string };
  crowdLevel?: { statusText: string };
  customVitals?: VitalStatus[];
  compact?: boolean;
  onVitalPress?: (vital: VitalStatus) => void;
  style?: any;
}

export const DestinationVitalsRow: React.FC<DestinationVitalsRowProps> = ({
  temperature,
  airQuality,
  safety,
  connectivity,
  crowdLevel,
  customVitals,
  compact = false,
  onVitalPress,
  style,
}) => {
  const { isDark } = useTheme();

  // Resolve visual color variants
  const getVariantStyles = (variant: VitalStatus["variant"] = "neutral") => {
    switch (variant) {
      case "success":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#DCFCE7",
          text: isDark ? "#34D399" : "#15803D",
          border: isDark ? "rgba(52, 211, 153, 0.35)" : "#BBF7D0",
        };
      case "warning":
        return {
          bg: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
          text: isDark ? "#FBBF24" : "#B45309",
          border: isDark ? "rgba(251, 191, 36, 0.35)" : "#FDE68A",
        };
      case "danger":
        return {
          bg: isDark ? "rgba(239, 68, 68, 0.18)" : "#FEE2E2",
          text: isDark ? "#F87171" : "#B91C1C",
          border: isDark ? "rgba(248, 113, 113, 0.35)" : "#FECACA",
        };
      case "info":
        return {
          bg: isDark ? "rgba(56, 189, 248, 0.18)" : "#E0F2FE",
          text: isDark ? "#38BDF8" : "#0369A1",
          border: isDark ? "rgba(56, 189, 248, 0.35)" : "#BAE6FD",
        };
      default:
        return {
          bg: isDark ? "rgba(148, 163, 184, 0.15)" : "#F1F5F9",
          text: isDark ? "#CBD5E1" : "#475569",
          border: isDark ? "rgba(148, 163, 184, 0.25)" : "#E2E8F0",
        };
    }
  };

  // Build items from props
  const vitals: VitalStatus[] = [];

  if (temperature) {
    vitals.push({
      label: "Temperature",
      value: temperature.value,
      icon: "thermometer-outline",
      variant: "warning",
      details: temperature.condition,
    });
  }

  if (airQuality) {
    const aqi = airQuality.aqi;
    let variant: VitalStatus["variant"] = "success";
    let defaultText = "Great";
    if (aqi > 150) {
      variant = "danger";
      defaultText = "Unhealthy";
    } else if (aqi > 80) {
      variant = "warning";
      defaultText = "Moderate";
    }

    vitals.push({
      label: "Air Quality",
      value: `${airQuality.statusText || defaultText} ${aqi} AQI`,
      icon: "leaf-outline",
      variant,
    });
  }

  if (safety) {
    const isSafe = safety.statusText.toLowerCase().includes("safe") || safety.statusText.toLowerCase().includes("great");
    vitals.push({
      label: "Safety",
      value: safety.statusText,
      icon: "shield-checkmark-outline",
      variant: isSafe ? "success" : "warning",
    });
  }

  if (connectivity) {
    const text = connectivity.statusText.toLowerCase();
    const isBad = text.includes("bad") || text.includes("poor") || text.includes("spotty");
    vitals.push({
      label: "WiFi / Network",
      value: connectivity.statusText,
      icon: "wifi-outline",
      variant: isBad ? "danger" : "info",
    });
  }

  if (crowdLevel) {
    vitals.push({
      label: "Crowd",
      value: crowdLevel.statusText,
      icon: "people-outline",
      variant: "neutral",
    });
  }

  if (customVitals && customVitals.length > 0) {
    vitals.push(...customVitals);
  }

  if (vitals.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContainer,
        compact && styles.compactScroll,
        style,
      ]}
    >
      {vitals.map((item, index) => {
        const vStyle = getVariantStyles(item.variant);

        return (
          <Pressable
            key={`${item.label}-${index}`}
            style={[
              styles.chipContainer,
              compact && styles.compactChip,
              {
                backgroundColor: vStyle.bg,
                borderColor: vStyle.border,
              },
            ]}
            onPress={() => {
              if (Platform.OS !== "web") {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              onVitalPress?.(item);
            }}
          >
            {item.icon && (
              <Ionicons
                name={item.icon}
                size={compact ? 12 : 14}
                color={vStyle.text}
                style={styles.chipIcon}
              />
            )}
            {!compact && (
              <Text
                style={[
                  styles.label,
                  { color: isDark ? "#94A3B8" : "#64748B" },
                ]}
              >
                {item.label}:
              </Text>
            )}
            <Text
              style={[
                styles.value,
                compact && styles.compactValue,
                { color: vStyle.text },
              ]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  compactScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chipContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  compactChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  chipIcon: {
    marginRight: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    marginRight: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
  },
  compactValue: {
    fontSize: 11,
  },
});

export default DestinationVitalsRow;
