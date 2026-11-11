import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PrecisionSlider } from "../ui/PrecisionSlider";
import { PriceHistogramSlider } from "../ui/PriceHistogramSlider";
import { toBengaliDigits } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

export interface SortOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface UniversalFilterModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  activeFilterCount?: number;
  totalResultsCount?: number;

  // Sorting
  sortOptions?: SortOption[];
  selectedSort?: string;
  onSelectSort?: (sortId: string) => void;

  // Price / Budget Range
  priceSlider?: {
    label?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    presets?: number[];
    onChange: (val: number) => void;
  };

  priceHistogram?: {
    min: number;
    max: number;
    selectedMin: number;
    selectedMax: number;
    dataPoints?: number[];
    step?: number;
    currency?: string;
    onChange: (min: number, max: number) => void;
    title?: string;
  };

  // Actions
  onClearAll: () => void;
  onApply: () => void;

  // Vertical specific children
  children?: React.ReactNode;
}

export const UniversalFilterModal: React.FC<UniversalFilterModalProps> = ({
  visible,
  onClose,
  title = "ফিল্টার ও সর্ট",
  activeFilterCount = 0,
  totalResultsCount,
  sortOptions,
  selectedSort,
  onSelectSort,
  priceSlider,
  priceHistogram,
  onClearAll,
  onApply,
  children,
}) => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const handleClear = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    onClearAll();
  };

  const handleApply = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onApply();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close filter"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color="#0f172a" />
              </Pressable>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText}>{title}</Text>
                  {activeFilterCount > 0 && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>
                        {isBn ? `${toBengaliDigits(activeFilterCount)}টি সক্রিয়` : `${activeFilterCount} active`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              onPress={handleClear}
              style={styles.clearBtn}
            >
              <Ionicons name="refresh" size={14} color="#ef4444" />
              <Text style={styles.clearBtnText}>{isBn ? "সব মুছুন" : "Clear All"}</Text>
            </Pressable>
          </View>

          {/* Scrollable Filter Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Sorting Options Section */}
            {sortOptions && sortOptions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="swap-vertical" size={16} color="#2563eb" />
                  <Text style={styles.sectionTitle}>
                    {isBn ? "সর্ট করার নিয়ম (Sorting)" : "Sort By"}
                  </Text>
                </View>

                <View style={styles.sortChipsWrap}>
                  {sortOptions.map((opt) => {
                    const isSelected = selectedSort === opt.id;
                    return (
                      <Pressable
                        key={`sort-${opt.id}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.sortChip,
                          isSelected && styles.sortChipActive,
                        ]}
                        onPress={() => onSelectSort?.(opt.id)}
                      >
                        {opt.icon && (
                          <Ionicons
                            name={opt.icon}
                            size={14}
                            color={isSelected ? "#ffffff" : "#475569"}
                          />
                        )}
                        <Text
                          style={[
                            styles.sortChipText,
                            isSelected && styles.sortChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. Histogram Price Distribution Slider (Airbnb Style) */}
            {priceHistogram && (
              <View style={styles.section}>
                <PriceHistogramSlider
                  min={priceHistogram.min}
                  max={priceHistogram.max}
                  selectedMin={priceHistogram.selectedMin}
                  selectedMax={priceHistogram.selectedMax}
                  dataPoints={priceHistogram.dataPoints}
                  step={priceHistogram.step}
                  currency={priceHistogram.currency}
                  onChange={priceHistogram.onChange}
                  title={priceHistogram.title || (isBn ? "বাজেট ডিস্ট্রিবিউশন" : "Price Distribution")}
                />
              </View>
            )}

            {/* 2b. Precision Slider for Price / Budget */}
            {priceSlider && !priceHistogram && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                  <Text style={styles.sectionTitle}>
                    {priceSlider.label || (isBn ? "বাজেট সীমা (Price Range)" : "Price Range")}
                  </Text>
                </View>

                <PrecisionSlider
                  value={priceSlider.value}
                  min={priceSlider.min}
                  max={priceSlider.max}
                  step={priceSlider.step}
                  unit={priceSlider.unit}
                  presets={priceSlider.presets}
                  onChange={priceSlider.onChange}
                />
              </View>
            )}

            {/* 3. Children (Custom vertical specific options) */}
            {children}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
              style={styles.resetFooterBtn}
              onPress={handleClear}
            >
              <Text style={styles.resetFooterText}>{isBn ? "রিসেট" : "Reset"}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
              style={styles.applyBtn}
              onPress={handleApply}
            >
              <Text style={styles.applyBtnText}>
                {totalResultsCount !== undefined
                  ? isBn
                    ? `ফলাফল দেখুন (${toBengaliDigits(totalResultsCount)}টি)`
                    : `Show Results (${totalResultsCount})`
                  : isBn
                  ? "ফিল্টার প্রয়োগ করুন"
                  : "Apply Filters"}
              </Text>
              <Ionicons name="checkmark-sharp" size={16} color="#ffffff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    ...(Platform.OS === "web" ? { boxShadow: "0px -4px 16px rgba(15, 23, 42, 0.15)" } : {}),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  activeBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
  scrollBody: {
    padding: 20,
    gap: 20,
  },
  section: {
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sortChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
  },
  sortChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  sortChipTextActive: {
    color: "#ffffff",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  resetFooterBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  resetFooterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  applyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.25)" } : {}),
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default UniversalFilterModal;
