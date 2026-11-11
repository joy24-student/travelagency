/**
 * Rainy Day Activity Alternatives Card
 *
 * Appears on itinerary days with forecasted rain/thunderstorms,
 * presenting indoor destination alternatives that can be added to the schedule with one tap.
 */

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getRainyAlternatives,
  alternativeToActivity,
  RainyAlternativeItem,
} from "../../services/trip/rainyAlternatives";
import { TripActivity } from "../../services/ai/types";

interface RainyAlternativesCardProps {
  destination: string;
  dayNumber: number;
  rainProbability?: number;
  weatherCondition?: string;
  onAddAlternative: (activity: TripActivity) => void;
}

export const RainyAlternativesCard: React.FC<RainyAlternativesCardProps> = ({
  destination,
  dayNumber,
  rainProbability = 75,
  weatherCondition = "Rain",
  onAddAlternative,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const alternatives = getRainyAlternatives(destination);

  const handleAdd = (alt: RainyAlternativeItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const act = alternativeToActivity(alt, "03:00 PM");
    onAddAlternative(act);
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header Strip */}
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.8}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="rainy" size={18} color="#2563EB" />
          </View>
          <View>
            <View style={styles.badgeLine}>
              <View style={styles.rainBadge}>
                <Ionicons name="water" size={10} color="#FFFFFF" />
                <Text style={styles.rainBadgeText}>{rainProbability}% বৃষ্টি</Text>
              </View>
              <Text style={styles.conditionText}>{weatherCondition}</Text>
            </View>
            <Text style={styles.title}>বৃষ্টির দিনে বিকল্প প্রস্তাব (ইনডোর)</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.expandLabel}>{isExpanded ? "লুকান" : "বিকল্প দেখুন"}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#2563EB"
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Alternative Options */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.description}>
            এই দিনে বৃষ্টির সম্ভাবনা বেশি থাকায় আউটডোর প্ল্যানের পাশাপাশি নিচের আরামদায়ক ইনডোর স্থানগুলো বিবেচনা করতে পারেন:
          </Text>

          <View style={styles.alternativesList}>
            {alternatives.map((alt) => (
              <View key={alt.id} style={styles.altItemCard}>
                <View style={styles.altIconBox}>
                  <Ionicons name={alt.icon as any} size={20} color="#2563EB" />
                </View>

                <View style={styles.altContent}>
                  <Text style={styles.altName}>{alt.name}</Text>
                  <Text style={styles.altLocation}>📍 {alt.location} · ⏱️ {alt.duration}</Text>
                  <Text style={styles.altWhy}>{alt.whyRainFriendly}</Text>

                  <View style={styles.altFooterRow}>
                    <Text style={styles.altCost}>
                      আনুমানিক: {alt.estimatedCost > 0 ? `৳${alt.estimatedCost.toLocaleString()}` : "ফ্রি"}
                    </Text>

                    <TouchableOpacity
                      style={styles.addBtn}
                      activeOpacity={0.8}
                      onPress={() => handleAdd(alt)}
                    >
                      <Ionicons name="add-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.addBtnText}>প্ল্যানে যোগ করুন</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 12,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  rainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#2563EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rainBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  conditionText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E40AF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
    paddingTop: 10,
  },
  description: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
    marginBottom: 10,
  },
  alternativesList: {
    gap: 8,
  },
  altItemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  altIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  altContent: {
    flex: 1,
  },
  altName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  altLocation: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  altWhy: {
    fontSize: 11,
    color: "#2563EB",
    fontStyle: "italic",
    marginTop: 3,
  },
  altFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 6,
  },
  altCost: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
