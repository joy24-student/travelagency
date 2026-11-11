/**
 * Quick-Start Templates Banner Component
 *
 * Renders ready-made curated trip templates ("কক্সবাজার ৩ দিন", "সিলেট ২ দিন", etc.)
 * with instant one-tap copy and load functionality to eliminate the blank-page hurdle.
 */

import React from "react";
import { Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TRIP_TEMPLATES, TripTemplateItem } from "../../services/trip/tripTemplates";

interface TripTemplatesBannerProps {
  onApplyTemplate: (template: TripTemplateItem) => void;
  onCopyToForm: (template: TripTemplateItem) => void;
}

export const TripTemplatesBanner: React.FC<TripTemplatesBannerProps> = ({
  onApplyTemplate,
  onCopyToForm,
}) => {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.sparkleIconBox}>
            <Ionicons name="sparkles" size={16} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.headerTitle}>প্রস্তুত টেমপ্লেট দিয়ে শুরু করুন</Text>
            <Text style={styles.headerSubtitle}>
              এক ট্যাপে কপি করে মুহূর্তে ট্রিপ প্ল্যান তৈরি করুন
            </Text>
          </View>
        </View>
      </View>

      {/* Horizontal Scrollable Templates Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {TRIP_TEMPLATES.map((tpl) => (
          <View key={tpl.id} style={styles.templateCard}>
            <LinearGradient
              colors={tpl.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{tpl.badge}</Text>
                </View>
                <View style={styles.iconCircle}>
                  <Ionicons name={tpl.icon as any} size={16} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.cardTitle}>{tpl.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {tpl.destination} · {tpl.travelers} জন
              </Text>
            </LinearGradient>

            {/* Card Body */}
            <View style={styles.cardBody}>
              {/* Cost & Duration Tag */}
              <View style={styles.metaRow}>
                <View style={styles.costBox}>
                  <Text style={styles.costLabel}>আনুমানিক বাজেট</Text>
                  <Text style={styles.costValue}>৳{tpl.estimatedBudget.toLocaleString()}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Ionicons name="calendar-outline" size={12} color="#475569" />
                  <Text style={styles.durationText}>{tpl.durationDays} দিন</Text>
                </View>
              </View>

              {/* Highlights */}
              <View style={styles.highlightsWrap}>
                {tpl.highlights.slice(0, 2).map((h, i) => (
                  <View key={i} style={styles.highlightItem}>
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                    <Text style={styles.highlightText} numberOfLines={1}>
                      {h}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons: One-Tap Copy & Use */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.primaryCopyBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onApplyTemplate(tpl);
                  }}
                >
                  <Ionicons name="copy-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryCopyBtnText}>এক ট্যাপে কপি</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryFormBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onCopyToForm(tpl);
                  }}
                >
                  <Text style={styles.secondaryFormBtnText}>কাস্টমাইজ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sparkleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  scrollList: {
    paddingVertical: 4,
    paddingEnd: 16,
    gap: 14,
  },
  templateCard: {
    width: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.06)" } : {}),
  },
  cardHeaderGradient: {
    padding: 14,
    paddingBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgePill: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  cardBody: {
    padding: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  costBox: {},
  costLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  costValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  highlightsWrap: {
    gap: 5,
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  highlightText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  primaryCopyBtn: {
    flex: 1.4,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  primaryCopyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryFormBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  secondaryFormBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
});
