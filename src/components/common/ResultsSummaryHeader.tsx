import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toBengaliDigits } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

export interface ResultsSummaryHeaderProps {
  count: number;
  entityName?: string;
  sortLabel?: string;
  filterCount?: number;
  onOpenFilter?: () => void;
  onClearFilters?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ResultsSummaryHeader: React.FC<ResultsSummaryHeaderProps> = ({
  count,
  entityName,
  sortLabel = "দাম অনুযায়ী",
  filterCount = 0,
  onOpenFilter,
  onClearFilters,
  style,
}) => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const formattedCount = isBn ? toBengaliDigits(count) : String(count);
  const defaultEntity = isBn ? "ফলাফল" : "results";
  const labelText = isBn
    ? `${formattedCount}টি ${entityName || defaultEntity} পাওয়া গেছে`
    : `${formattedCount} ${entityName || defaultEntity} found`;

  return (
    <View style={[styles.container, style]}>
      {/* Count & Status Badge */}
      <View style={styles.countContainer}>
        <Ionicons name="list" size={16} color="#2563eb" />
        <Text style={styles.countText}>{labelText}</Text>
      </View>

      {/* Sort Status & Filter Trigger */}
      <View style={styles.actionsContainer}>
        {sortLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sorted by: ${sortLabel}`}
            style={styles.sortPill}
            onPress={onOpenFilter}
          >
            <Ionicons name="swap-vertical" size={13} color="#475569" />
            <Text style={styles.sortText}>{sortLabel}</Text>
          </Pressable>
        ) : null}

        {onOpenFilter ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            style={[styles.filterBtn, filterCount > 0 && styles.filterBtnActive]}
            onPress={onOpenFilter}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={filterCount > 0 ? "#ffffff" : "#1e293b"}
            />
            {filterCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {isBn ? toBengaliDigits(filterCount) : filterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {filterCount > 0 && onClearFilters ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={onClearFilters}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>{isBn ? "মুছুন" : "Clear"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  sortText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  badge: {
    marginStart: 4,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
});

export default ResultsSummaryHeader;
