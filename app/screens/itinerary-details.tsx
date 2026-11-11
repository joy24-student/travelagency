import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { itineraryService } from "../../src/services/itineraryService";
import { Itinerary, ItineraryDay, ItineraryItem } from "../../src/types/itinerary";
import { formatPrice } from "../../src/utils/currency";

export default function ItineraryDetailsScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const itineraryId = params.id as string;

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  useEffect(() => {
    if (itineraryId) {
      loadDetails();
    }
  }, [itineraryId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await itineraryService.getItineraryDetails(itineraryId);
      setItinerary(data);
    } catch (err) {
      console.error("Error loading itinerary details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !itinerary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedDay = selectedDayNumber
    ? itinerary.days.find((d) => d.day_number === selectedDayNumber)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            if (selectedDay) {
              setSelectedDayNumber(null);
            } else {
              router.back();
            }
          }}
          style={[styles.backBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitleText, { color: colors.text }]} numberOfLines={1}>
          {selectedDay ? `${itinerary.title} - Day ${selectedDay.day_number}` : itinerary.title}
        </Text>

        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* VIEW MODE 1: DAY-BY-DAY VERTICAL TIMELINE (Matches Image 3) */}
        {selectedDay ? (
          <View style={styles.timelineContainer}>
            {/* Day Header Banner */}
            <View style={styles.timelineHeaderBanner}>
              <Text style={[styles.timelineDateText, { color: colors.text }]}>
                Day {selectedDay.day_number}: {selectedDay.title}
              </Text>
              {selectedDay.subtitle && (
                <Text style={[styles.timelineSubtitle, { color: colors.textSecondary }]}>
                  {selectedDay.subtitle}
                </Text>
              )}
            </View>

            {/* Vertical Timeline List */}
            <View style={styles.verticalTimeline}>
              {/* Continuous vertical teal/cyan rail */}
              <View style={[styles.timelineRail, { backgroundColor: colors.primary }]} />

              {selectedDay.items.map((item, idx) => (
                <View key={item.id || idx} style={styles.timelineRow}>
                  {/* Left Column: Timestamp */}
                  <View style={styles.timelineTimeCol}>
                    <Text style={[styles.timelineTimeText, { color: colors.textSecondary }]}>
                      {item.start_time || "09:00 AM"}
                    </Text>
                  </View>

                  {/* Center Dot Node */}
                  <View style={[styles.timelineNode, { borderColor: "#FFFFFF", backgroundColor: colors.primary }]}>
                    <View style={styles.timelineInnerDot} />
                  </View>

                  {/* Right Column: Stop Details & Transit instructions */}
                  <View style={[styles.timelineCard, { backgroundColor: isDark ? colors.card : "#F8FAFC", borderColor: colors.border }]}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.estimated_cost > 0 && (
                        <Text style={[styles.itemCostBadge, { color: colors.primary }]}>
                          ৳{item.estimated_cost.toLocaleString()}
                        </Text>
                      )}
                    </View>

                    {item.subtitle && (
                      <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    )}

                    {/* Transit Instruction Pill (e.g. "Take bus 15, 125, 86 - 2 stops", "Walk 533m") */}
                    {item.transit_instruction && (
                      <View style={styles.transitPill}>
                        <Ionicons
                          name={item.category === "transport" ? "bus-outline" : "walk-outline"}
                          size={13}
                          color="#0284C7"
                        />
                        <Text style={styles.transitText}>{item.transit_instruction}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.backToDaysBtn, { borderColor: colors.border }]}
              onPress={() => setSelectedDayNumber(null)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.backToDaysText, { color: colors.primary }]}>
                View All Days Overview
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* VIEW MODE 2: ITINERARY OVERVIEW & DAY CARDS (Matches Image 4) */
          <>
            {/* Hero Cover */}
            <View style={styles.heroWrapper}>
              <Image source={{ uri: itinerary.cover_image }} style={styles.heroImage} resizeMode="cover" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFillObject} />

              <View style={styles.heroContent}>
                <View style={styles.locationPill}>
                  <Ionicons name="location-sharp" size={12} color="#FFFFFF" />
                  <Text style={styles.heroLocationText}>{itinerary.destination}, {itinerary.destination_country}</Text>
                </View>
                <Text style={styles.heroTitle}>{itinerary.title}</Text>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Ionicons name="calendar-outline" size={14} color="#CBD5E1" />
                    <Text style={styles.metricText}>{itinerary.duration_days} Days</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.metricText}>{itinerary.rating} ({itinerary.review_count || 128})</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="copy-outline" size={14} color="#60A5FA" />
                    <Text style={styles.metricText}>{itinerary.clone_count} Clones</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Creator Attribution */}
            <View style={[styles.creatorCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
              <Image
                source={{ uri: itinerary.creator?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120" }}
                style={styles.creatorAvatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.creatorNameRow}>
                  <Text style={[styles.creatorTitle, { color: colors.text }]}>
                    {itinerary.creator?.display_name || "Tariqul Islam"}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#287DFA" />
                </View>
                <Text style={[styles.creatorHandle, { color: colors.textSecondary }]}>
                  @{itinerary.creator?.handle || "tariq_tours"} • Verified Guide
                </Text>
              </View>
            </View>

            {/* Description */}
            {itinerary.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About This Trip</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {itinerary.description}
                </Text>
              </View>
            )}

            {/* Day Schedule Cards Header (Matches Image 4) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Day-by-Day Schedule</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Tap any day to see timeline
                </Text>
              </View>

              {/* List of Day Cards (Image 4) */}
              <View style={styles.dayCardsList}>
                {itinerary.days.map((day) => (
                  <TouchableOpacity
                    key={day.id || day.day_number}
                    style={[
                      styles.dayCard,
                      {
                        backgroundColor: isDark ? colors.card : "#FFFFFF",
                        borderColor: isDark ? colors.border : "#E2E8F0",
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDayNumber(day.day_number);
                    }}
                  >
                    {/* Thumbnail Image */}
                    <Image
                      source={{
                        uri:
                          day.cover_image ||
                          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200",
                      }}
                      style={styles.dayThumbnail}
                    />

                    {/* Day Details */}
                    <View style={styles.dayCardDetails}>
                      <Text style={[styles.dayCardTitle, { color: colors.text }]}>
                        Day {day.day_number}
                      </Text>
                      <Text style={[styles.dayCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {day.subtitle || day.title}
                      </Text>
                      <Text style={[styles.dayCardTiming, { color: colors.textSecondary }]}>
                        Day starts at {day.day_start_time || "09:00 AM"}
                      </Text>
                      <View style={styles.stopsBadge}>
                        <Text style={styles.stopsBadgeText}>
                          {day.items?.length || day.stops_count || 4} stops
                        </Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar: "Clone & Book This Entire Trip" */}
      <View style={[styles.bottomActionBar, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.budgetTotalLabel, { color: colors.textSecondary }]}>Total Estimated Trip</Text>
          <Text style={[styles.budgetTotalValue, { color: colors.primary }]}>
            {formatPrice(itinerary.estimated_budget, (itinerary.currency as any) || "BDT")}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryCTA, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push({
              pathname: ROUTES.SCREENS.ITINERARY_CLONE,
              params: { id: itinerary.id },
            });
          }}
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          <Text style={styles.primaryCTAText}>Book This Entire Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleText: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroWrapper: {
    height: 240,
    position: "relative",
    justifyContent: "flex-end",
    padding: 16,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    gap: 6,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  heroLocationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  creatorCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  creatorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creatorTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  creatorHandle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 18,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  dayCardsList: {
    gap: 10,
  },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  dayCardDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  dayCardTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  dayCardSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  dayCardTiming: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  stopsBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  stopsBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: "#475569",
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timelineHeaderBanner: {
    marginBottom: 16,
    gap: 4,
  },
  timelineDateText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  timelineSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  verticalTimeline: {
    position: "relative",
    paddingLeft: 60,
  },
  timelineRail: {
    position: "absolute",
    left: 70,
    top: 10,
    bottom: 20,
    width: 2.5,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    position: "relative",
  },
  timelineTimeCol: {
    position: "absolute",
    left: -60,
    top: 4,
    width: 52,
  },
  timelineTimeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    textAlign: "right",
  },
  timelineNode: {
    position: "absolute",
    left: 4.5,
    top: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineInnerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  timelineCard: {
    flex: 1,
    marginLeft: 24,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  itemCostBadge: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  transitPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  transitText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: "#0369A1",
  },
  backToDaysBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  backToDaysText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  bottomActionBar: {
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
  budgetTotalLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  budgetTotalValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  primaryCTA: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  primaryCTAText: {
    color: "#FFFFFF",
    fontSize: 14,
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
