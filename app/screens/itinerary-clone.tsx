import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { itineraryService } from "../../src/services/itineraryService";
import { Itinerary, AIBudgetOptimization } from "../../src/types/itinerary";
import { formatPrice } from "../../src/utils/currency";

export default function ItineraryCloneScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const itineraryId = params.id as string;

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [cloning, setCloning] = useState(false);

  // Form Customization State
  const [travelStartDate, setTravelStartDate] = useState("2026-12-05");
  const [travelersCount, setTravelersCount] = useState(2);
  const [targetBudget, setTargetBudget] = useState<number>(20000);
  const [hotelCategory, setHotelCategory] = useState<"budget" | "standard" | "boutique" | "luxury">("standard");
  const [transportPref, setTransportPref] = useState<"public" | "private" | "express" | "balanced">("balanced");
  const [paceOfTravel, setPaceOfTravel] = useState<"relaxed" | "moderate" | "fast_paced">("moderate");

  // AI Optimization Result
  const [aiOptimization, setAiOptimization] = useState<AIBudgetOptimization | null>(null);

  useEffect(() => {
    if (itineraryId) {
      loadItinerary();
    }
  }, [itineraryId]);

  const loadItinerary = async () => {
    try {
      setLoading(true);
      const data = await itineraryService.getItineraryDetails(itineraryId);
      if (data) {
        setItinerary(data);
        setTargetBudget(Number(data.estimated_budget));
      }
    } catch (e) {
      console.error("Error loading itinerary for cloning:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIOptimization = async () => {
    if (!itinerary) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setOptimizing(true);
      const opt = await itineraryService.optimizeBudget(
        Number(itinerary.estimated_budget),
        targetBudget,
        itinerary.days
      );
      setAiOptimization(opt);
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleProceedToBooking = async () => {
    if (!itinerary) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setCloning(true);

      // 1. Create the persistent clone record in database
      const clone = await itineraryService.cloneItinerary(itinerary.id, {
        travel_start_date: travelStartDate,
        traveler_count: travelersCount,
        adults_count: travelersCount,
        children_count: 0,
        target_budget: targetBudget,
        preferred_hotel_category: hotelCategory,
        transport_preference: transportPref,
        pace_of_travel: paceOfTravel,
      });

      // 2. Route directly to unified checkout
      router.push({
        pathname: ROUTES.SCREENS.TRIP_CHECKOUT,
        params: {
          cloneId: clone?.id || itinerary.id,
          itineraryTitle: itinerary.title,
          destination: itinerary.destination,
          travelStartDate,
          travelerCount: travelersCount,
          hotelCategory,
          totalBudget: targetBudget * travelersCount,
        },
      });
    } catch (err: any) {
      Alert.alert("Cloning Failed", err.message || "Failed to customize trip. Please try again.");
    } finally {
      setCloning(false);
    }
  };

  if (loading || !itinerary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading customization studio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Personalize & Clone</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {itinerary.title}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Dates & Travelers */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>1. Travel Dates & Group Size</Text>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Travel Start Date</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                value={travelStartDate}
                onChangeText={setTravelStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={{ width: 140 }}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Travelers Count</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[styles.counterBtn, { borderColor: colors.border }]}
                  onPress={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.counterValue, { color: colors.text }]}>{travelersCount}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, { borderColor: colors.border }]}
                  onPress={() => setTravelersCount(travelersCount + 1)}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Step 2: Budget Target & AI Optimization */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>2. Budget Constraints</Text>
            <Text style={[styles.origBudgetRef, { color: colors.textSecondary }]}>
              Original: ৳{Number(itinerary.estimated_budget).toLocaleString()}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Target Budget per person: ৳{targetBudget.toLocaleString()}
          </Text>

          {/* Preset Budget Chips */}
          <View style={styles.budgetChipsRow}>
            {[12000, 16000, 20000, 25000].map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.chip,
                  {
                    backgroundColor: targetBudget === b ? colors.primary : isDark ? "#1E293B" : "#F1F5F9",
                    borderColor: targetBudget === b ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTargetBudget(b)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: targetBudget === b ? "#FFFFFF" : colors.text },
                  ]}
                >
                  ৳{b.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Run AI Budget Optimization CTA */}
          <TouchableOpacity
            style={[styles.optimizeBtn, { backgroundColor: isDark ? "#1E293B" : "#EFF6FF", borderColor: colors.primary }]}
            onPress={handleRunAIOptimization}
            disabled={optimizing}
          >
            {optimizing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={[styles.optimizeBtnText, { color: colors.primary }]}>
                  Run AI Budget Adaptation
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* AI Optimization Feedback */}
          {aiOptimization && (
            <View style={[styles.aiFeedbackBox, { backgroundColor: aiOptimization.feasible ? "#ECFDF5" : "#FFFBEB" }]}>
              <View style={styles.feedbackHeader}>
                <Ionicons
                  name={aiOptimization.feasible ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={aiOptimization.feasible ? "#059669" : "#D97706"}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: aiOptimization.feasible ? "#065F46" : "#92400E" },
                  ]}
                >
                  {aiOptimization.feasible ? "Budget Optimized Successfully" : "Budget Constraint Notice"}
                </Text>
              </View>
              <Text style={[styles.feedbackExplanation, { color: aiOptimization.feasible ? "#065F46" : "#92400E" }]}>
                {aiOptimization.trade_off_explanation}
              </Text>
              {aiOptimization.recommendations.map((rec, i) => (
                <View key={i} style={styles.recItem}>
                  <Ionicons name="arrow-forward-circle-outline" size={14} color="#059669" />
                  <Text style={styles.recText}>{rec.action}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Step 3: Preferences (Hotel & Transit) */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>3. Travel Preferences</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Preferred Accommodation</Text>
          <View style={styles.prefGrid}>
            {[
              { key: "budget", label: "Budget Inn" },
              { key: "standard", label: "Standard Hotel" },
              { key: "boutique", label: "Boutique Resort" },
              { key: "luxury", label: "5-Star Luxury" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.prefChip,
                  {
                    backgroundColor: hotelCategory === item.key ? colors.primary : isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: hotelCategory === item.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setHotelCategory(item.key as any)}
              >
                <Text
                  style={[
                    styles.prefChipText,
                    { color: hotelCategory === item.key ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
            Transit Preference
          </Text>
          <View style={styles.prefGrid}>
            {[
              { key: "balanced", label: "Balanced (Train/Coach)" },
              { key: "express", label: "AC Express Coach" },
              { key: "private", label: "Private Sedan/Jeep" },
              { key: "public", label: "Domestic Flight" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.prefChip,
                  {
                    backgroundColor: transportPref === item.key ? colors.primary : isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: transportPref === item.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setTransportPref(item.key as any)}
              >
                <Text
                  style={[
                    styles.prefChipText,
                    { color: transportPref === item.key ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total for {travelersCount} traveler(s)
          </Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            ৳{(targetBudget * travelersCount).toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.proceedBtn, { backgroundColor: colors.primary }]}
          onPress={handleProceedToBooking}
          disabled={cloning}
        >
          {cloning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.proceedBtnText}>Review & Book Entire Trip</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  origBudgetRef: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  textInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 42,
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  budgetChipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  optimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  optimizeBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  aiFeedbackBox: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedbackTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  feedbackExplanation: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  recText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: "#065F46",
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prefChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  prefChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  proceedBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
});
