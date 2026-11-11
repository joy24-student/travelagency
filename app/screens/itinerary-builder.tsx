import React, { useState } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { apiClient } from "../../src/services/apiClient";
import { supabase } from "../../src/utils/supabase";

interface DraftItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  start_time: string;
  end_time: string;
  transit_instruction: string;
  estimated_cost: number;
}

interface DraftDay {
  day_number: number;
  title: string;
  subtitle: string;
  day_start_time: string;
  items: DraftItem[];
}

export default function ItineraryBuilderScreen() {
  const { colors, isDark } = useTheme();

  // Itinerary Master Details
  const [title, setTitle] = useState("Cox's Bazar & Coral Island Escape");
  const [destination, setDestination] = useState("Cox's Bazar");
  const [durationDays, setDurationDays] = useState(3);
  const [estimatedBudget, setEstimatedBudget] = useState("15000");
  const [category, setCategory] = useState("adventure");
  const [description, setDescription] = useState(
    "Experience golden sand dunes, Marine Drive scenic drives, and authentic Rakhine seafood."
  );
  const [coverImage, setCoverImage] = useState(
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
  );

  // Day-by-Day Schedule
  const [days, setDays] = useState<DraftDay[]>([
    {
      day_number: 1,
      title: "Arrival & Coastal Sunset",
      subtitle: "Dhaka to Cox's Bazar check-in",
      day_start_time: "08:00 AM",
      items: [
        {
          id: "item-1",
          title: "Biman Flight BG-433 to Cox's Bazar",
          subtitle: "Hazrat Shahjalal International Airport (T1)",
          category: "transport",
          start_time: "08:00 AM",
          end_time: "09:15 AM",
          transit_instruction: "Direct domestic flight (1h 15m)",
          estimated_cost: 4200,
        },
        {
          id: "item-2",
          title: "Sayeman Beach Resort Check-in",
          subtitle: "Marine Drive Kolatoli Point",
          category: "hotel",
          start_time: "10:30 AM",
          end_time: "11:30 AM",
          transit_instruction: "15-min taxi from airport along Marine Drive",
          estimated_cost: 6000,
        },
        {
          id: "item-3",
          title: "Sunset Walk @ Sugondha Beach",
          subtitle: "Seafood stalls and photography",
          category: "activity",
          start_time: "04:30 PM",
          end_time: "06:30 PM",
          transit_instruction: "Walk 300m south along beach line",
          estimated_cost: 450,
        },
      ],
    },
    {
      day_number: 2,
      title: "Himchari & Inani Coral Beach",
      subtitle: "Marine Drive Exploration",
      day_start_time: "09:00 AM",
      items: [
        {
          id: "item-4",
          title: "Open Chander Gari Ride to Himchari",
          subtitle: "Hilltop waterfall viewpoint",
          category: "attraction",
          start_time: "09:00 AM",
          end_time: "12:00 PM",
          transit_instruction: "Take 4x4 open jeep (18km)",
          estimated_cost: 1200,
        },
        {
          id: "item-5",
          title: "Inani Coral Stone Beach",
          subtitle: "Ancient coral boulders",
          category: "activity",
          start_time: "02:00 PM",
          end_time: "05:00 PM",
          transit_instruction: "Drive 14km south along Marine Drive",
          estimated_cost: 300,
        },
      ],
    },
  ]);

  const [saving, setSaving] = useState(false);

  const addDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextNum = days.length + 1;
    setDays([
      ...days,
      {
        day_number: nextNum,
        title: `Day ${nextNum}: Exploration`,
        subtitle: "Local sightseeing & dining",
        day_start_time: "09:00 AM",
        items: [
          {
            id: `item-${Date.now()}`,
            title: "Morning Local Breakfast",
            subtitle: "Traditional Paratha & Dal",
            category: "restaurant",
            start_time: "09:00 AM",
            end_time: "10:00 AM",
            transit_instruction: "Walk 200m from hotel",
            estimated_cost: 200,
          },
        ],
      },
    ]);
  };

  const handlePublish = async () => {
    if (!title.trim() || !destination.trim()) {
      Alert.alert("Validation Error", "Please provide a trip title and destination.");
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = {
        title,
        description,
        cover_image: coverImage,
        destination,
        destination_country: "Bangladesh",
        start_location: "Dhaka",
        end_location: "Dhaka",
        duration_days: days.length,
        estimated_budget: parseFloat(estimatedBudget) || 15000,
        currency: "BDT",
        travel_category: category,
        difficulty_level: "easy",
        visibility: "public",
        tags: [destination, category, "Bangladesh"],
        highlights: [
          "Curated local route by verified creator",
          "Real verified transport and lodging timing",
        ],
        days: days.map((d) => ({
          day_number: d.day_number,
          title: d.title,
          subtitle: d.subtitle,
          day_start_time: d.day_start_time,
          cover_image: coverImage,
          stops_count: d.items.length,
          items: d.items.map((i, idx) => ({
            title: i.title,
            subtitle: i.subtitle,
            category: i.category,
            start_time: i.start_time,
            end_time: i.end_time,
            transit_instruction: i.transit_instruction,
            estimated_cost: i.estimated_cost,
            currency: "BDT",
            order_index: idx,
            booking_required: i.category === "transport" || i.category === "hotel",
          })),
        })),
      };

      await apiClient.post("/itineraries", payload);

      Alert.alert(
        "Trip Published!",
        "Your itinerary has been published to the Shopno Jatra marketplace. Other travelers can now discover and clone your plan.",
        [
          {
            text: "View in Explore",
            onPress: () => router.replace(ROUTES.SCREENS.EXPLORE_TRIPS),
          },
        ]
      );
    } catch (err: any) {
      console.error("Publish itinerary error:", err);
      Alert.alert("Publish Failed", err?.message || "Failed to publish itinerary. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Creator Studio</Text>
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary }]}
          onPress={handlePublish}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.publishBtnText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Basic Trip Metadata */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Trip Overview</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Itinerary Title</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 7 Days in Cox's Bazar"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Destination</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Cox's Bazar"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.field, { width: 140 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Est. Budget (৳)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={estimatedBudget}
                onChangeText={setEstimatedBudget}
                keyboardType="numeric"
                placeholder="15000"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Trip Summary</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder="Describe the journey highlights..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Day-by-Day Schedule Builder */}
        <View style={styles.daysHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Day-by-Day Stops</Text>
          <TouchableOpacity style={[styles.addDayBtn, { borderColor: colors.primary }]} onPress={addDay}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.addDayText, { color: colors.primary }]}>Add Day</Text>
          </TouchableOpacity>
        </View>

        {days.map((day, dIdx) => (
          <View
            key={day.day_number}
            style={[styles.dayCard, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}
          >
            <View style={styles.dayCardHeader}>
              <View style={styles.dayNumberPill}>
                <Text style={styles.dayNumberText}>Day {day.day_number}</Text>
              </View>
              <TextInput
                style={[styles.dayTitleInput, { color: colors.text }]}
                value={day.title}
                onChangeText={(txt) => {
                  const updated = [...days];
                  updated[dIdx].title = txt;
                  setDays(updated);
                }}
              />
            </View>

            {/* List of Stops */}
            <View style={styles.stopsList}>
              {day.items.map((item, iIdx) => (
                <View
                  key={item.id}
                  style={[styles.stopItem, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border }]}
                >
                  <View style={styles.stopTopRow}>
                    <Ionicons
                      name={
                        item.category === "transport"
                          ? "airplane-outline"
                          : item.category === "hotel"
                          ? "bed-outline"
                          : "pin-outline"
                      }
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={[styles.stopTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.stopTime, { color: colors.textSecondary }]}>{item.start_time}</Text>
                  </View>

                  {item.transit_instruction ? (
                    <Text style={styles.transitHint}>🚌 {item.transit_instruction}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  publishBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  field: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  textArea: {
    height: 72,
    textAlignVertical: "top",
    paddingTop: 8,
  },
  daysHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  addDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  addDayText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  dayCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayNumberPill: {
    backgroundColor: "#287DFA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  dayTitleInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  stopsList: {
    gap: 8,
  },
  stopItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  stopTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stopTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  stopTime: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  transitHint: {
    fontSize: 11,
    color: "#0284C7",
    fontFamily: FONTS.regular,
  },
});
