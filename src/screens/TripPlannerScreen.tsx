import React, { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { tripPlannerService } from "../services/ai/tripPlanner";
import type { TripPlan } from "../services/ai/types";

// Popular destination options
const POPULAR_LOCATIONS = [
  "Lalmonirhat",
  "Dhaka",
  "Cox's Bazar",
  "Sylhet",
  "Chittagong",
  "Bandarban",
  "Sreemangal",
  "Saint Martin",
  "Tokyo",
  "Paris",
  "Rome",
  "Bali",
  "Bangkok",
];

// Duration preset options
const DURATION_OPTIONS = [
  { label: "Weekend Getaway", value: "3 Days" },
  { label: "1 Week Vacation", value: "7 Days" },
  { label: "2 Weeks Explorer", value: "14 Days" },
  { label: "Custom Range", value: "Custom" },
];

// Preference preset options
const PREFERENCE_OPTIONS = [
  { label: "Beach & Relax", icon: "sunny-outline" },
  { label: "Adventure & Hiking", icon: "compass-outline" },
  { label: "Food & Dining", icon: "restaurant-outline" },
  { label: "Culture & History", icon: "color-palette-outline" },
  { label: "Luxury & Spa", icon: "sparkles-outline" },
  { label: "Budget-Friendly", icon: "wallet-outline" },
];

export function TripPlannerScreen() {
  const insets = useSafeAreaInsets();

  // State management
  const [origin, setOrigin] = useState<string>("Lalmonirhat");
  const [destination, setDestination] = useState<string>("Cox's Bazar");
  const [selectedDuration, setSelectedDuration] = useState<string>("Select");
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [isOldVersion, setIsOldVersion] = useState<boolean>(false);

  // Modal visibilities
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [showDurationModal, setShowDurationModal] = useState<boolean>(false);
  const [showPrefModal, setShowPrefModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // Search input inside Location Modal
  const [searchQuery, setSearchQuery] = useState<string>("");

  // AI Loading & Results
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPlan, setGeneratedPlan] = useState<TripPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);

  // Inspiration text/link state
  const [inspirationText, setInspirationText] = useState<string>("");

  // Filter locations
  const filteredLocations = POPULAR_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePreference = (pref: string) => {
    if (selectedPreferences.includes(pref)) {
      setSelectedPreferences(selectedPreferences.filter((p) => p !== pref));
    } else {
      setSelectedPreferences([...selectedPreferences, pref]);
    }
  };

  const handlePlanWithAI = async () => {
    setIsGenerating(true);
    try {
      // Call AI Service or generate robust plan fallback
      const response = await tripPlannerService.plan({
        origin: origin || "Lalmonirhat",
        destination: destination || "Cox's Bazar",
        startDate: "2026-10-12",
        endDate: "2026-10-19",
        travelers: 2,
        interests: selectedPreferences.length > 0 ? selectedPreferences : ["Sightseeing", "Food"],
        budget: 1200,
        currency: "USD",
      });

      if (response.data) {
        setGeneratedPlan(response.data);
      } else {
        // Fallback robust mock plan if API mock returns empty
        setGeneratedPlan({
          title: `Seamless ${destination} Getaway`,
          summary: `A curated itinerary tailored for 2 travelers departing from ${origin}.`,
          days: [
            {
              day: 1,
              date: "Day 1",
              theme: "Arrival & Coastal Sunset",
              activities: [
                {
                  time: "10:00 AM",
                  activity: `Departure from ${origin}`,
                  location: origin,
                  notes: "Scenic highway drive or comfortable flight transfer.",
                },
                {
                  time: "03:30 PM",
                  activity: "Beachfront Hotel Check-in",
                  location: destination,
                  notes: "Refresh with welcome drinks and seaside ocean view.",
                },
                {
                  time: "06:00 PM",
                  activity: "Sunset Promenade & Seafood Feast",
                  location: "Main Beach Drive",
                  notes: "Enjoy freshly grilled prawns and local delights.",
                },
              ],
              meals: [
                { type: "lunch", suggestion: "Highway Highway Inn Special" },
                { type: "dinner", suggestion: "Ocean View Seafood Grill" },
              ],
              accommodation: "Grand Beach Resort & Spa",
            },
            {
              day: 2,
              date: "Day 2",
              theme: "Island Exploration & Local Heritage",
              activities: [
                {
                  time: "08:30 AM",
                  activity: "Morning Speedboat Ride to Inani",
                  location: "Inani Beach",
                  notes: "Explore golden sands and coral rock formations.",
                },
                {
                  time: "01:00 PM",
                  activity: "Hillside Temple & Panoramic Viewpoint",
                  location: "Himchari National Park",
                  notes: "Hike up the hillside steps for breathtaking views.",
                },
              ],
              meals: [
                { type: "breakfast", suggestion: "Resort Buffet Spread" },
                { type: "lunch", suggestion: "Himchari Hilltop Cafe" },
                { type: "dinner", suggestion: "Traditional Bengali Cuisine" },
              ],
              accommodation: "Grand Beach Resort & Spa",
            },
          ],
          tips: [
            "Pack light breathable cotton clothing and sunscreen.",
            "Book speedboats in advance for morning slots to avoid afternoon swell.",
          ],
          estimatedCost: "$450 - $650 total",
        });
      }
      setShowPlanModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ─── Sky-Blue Gradient Header Background Layer ───────────────────── */}
      <LinearGradient
        colors={["#EBF5FF", "#F4F9FF", "#F8FAFC"]}
        style={styles.headerBackgroundGradient}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* ─── Top Header Bar ─────────────────────────────────────────────── */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Trip.Planner</Text>
            <View style={styles.yellowDot} />
          </View>

          <TouchableOpacity
            style={styles.oldVersionBtn}
            onPress={() => setIsOldVersion(!isOldVersion)}
            activeOpacity={0.7}
          >
            <Ionicons name="sync-outline" size={16} color="#334155" />
            <Text style={styles.oldVersionText}>
              {isOldVersion ? "New Version" : "Old Version"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Main Card Container 1 (Trip Form Card) ────────────────────── */}
        <View style={styles.formCard}>
          {/* Row 1: Starting from Location Section */}
          <View style={styles.fieldSection}>
            <View style={styles.labelRow}>
              <View style={styles.labelLeft}>
                <Ionicons name="location-outline" size={20} color="#0F172A" />
                <Text style={styles.fieldLabel}>Starting from</Text>
              </View>

              {origin ? (
                <TouchableOpacity
                  style={styles.selectedOriginChip}
                  onPress={() => setOrigin("")}
                >
                  <Text style={styles.selectedOriginText}>{origin}</Text>
                  <Ionicons name="close-outline" size={16} color="#475569" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Input Search Box */}
            <TouchableOpacity
              style={styles.inputBox}
              activeOpacity={0.8}
              onPress={() => setShowLocationModal(true)}
            >
              <View style={styles.inputLeft}>
                <Ionicons name="search-outline" size={20} color="#0F172A" />
                {origin ? (
                  <View style={styles.locationChip}>
                    <Text style={styles.locationChipText}>{origin}</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setOrigin("");
                      }}
                    >
                      <Ionicons name="close-outline" size={15} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Search starting city...</Text>
                )}
              </View>

              <Ionicons name="chevron-forward-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Separator 1 */}
          <View style={styles.divider} />

          {/* Row 2: Date/Duration Section */}
          <TouchableOpacity
            style={styles.selectableRow}
            activeOpacity={0.7}
            onPress={() => setShowDurationModal(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={20} color="#0F172A" />
              <Text style={styles.fieldLabel}>Date/Duration</Text>
            </View>

            <View style={styles.rowRight}>
              <Text
                style={[
                  styles.selectValueText,
                  selectedDuration !== "Select" && styles.activeValueText,
                ]}
              >
                {selectedDuration}
              </Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#475569" />
            </View>
          </TouchableOpacity>

          {/* Separator 2 */}
          <View style={styles.divider} />

          {/* Row 3: Preferences Section */}
          <TouchableOpacity
            style={styles.selectableRow}
            activeOpacity={0.7}
            onPress={() => setShowPrefModal(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="heart-outline" size={20} color="#0F172A" />
              <Text style={styles.fieldLabel}>Preferences</Text>
            </View>

            <View style={styles.rowRight}>
              <Text
                style={[
                  styles.selectValueText,
                  selectedPreferences.length > 0 && styles.activeValueText,
                ]}
              >
                {selectedPreferences.length > 0
                  ? `${selectedPreferences.length} Selected`
                  : "Select"}
              </Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#475569" />
            </View>
          </TouchableOpacity>

          {/* Separator 3 */}
          <View style={styles.dividerSpacing} />

          {/* Terms & Disclaimer Line */}
          <View style={styles.termsRow}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" />
            <Text style={styles.termsText}>
              By proceeding, you agree to{" "}
              <Text
                style={styles.termsLink}
                onPress={() => setShowTermsModal(true)}
              >
                Trip.Planner Terms of Use
              </Text>
            </Text>
          </View>

          {/* Primary Action Button: "Plan a Trip with AI" */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryBtnContainer}
            onPress={handlePlanWithAI}
            disabled={isGenerating}
          >
            <LinearGradient
              colors={["#3B82F6", "#6366F1", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Plan a Trip with AI</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary Action Text Button */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.7}
            onPress={() => setShowDurationModal(true)}
          >
            <Text style={styles.secondaryBtnText}>Create It Myself</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Main Card Container 2 (Import inspirations Card) ─────────────── */}
        <TouchableOpacity
          style={styles.inspirationCard}
          activeOpacity={0.88}
          onPress={() => setShowImportModal(true)}
        >
          <View style={styles.inspirationTextCol}>
            <Text style={styles.inspirationTitle}>Import inspirations</Text>
            <Text style={styles.inspirationSubtitle}>
              Start by adding text, links, or images!
            </Text>
          </View>

          <View style={styles.inspirationGraphicBox}>
            <View style={styles.cardStackBase}>
              <View style={styles.cardStackTop}>
                <Ionicons name="arrow-down-outline" size={18} color="#FFFFFF" style={{ transform: [{ rotate: "45deg" }] }} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── MODAL: Location Picker ───────────────────────────────────────── */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Starting Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetSearchBox}>
              <Ionicons name="search-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="Search city or location..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {filteredLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.locationOptionRow}
                  onPress={() => {
                    setOrigin(loc);
                    setShowLocationModal(false);
                  }}
                >
                  <Ionicons name="location-outline" size={20} color="#2563EB" />
                  <Text style={styles.locationOptionText}>{loc}</Text>
                  {origin === loc && (
                    <Ionicons name="checkmark" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Date / Duration Picker ───────────────────────────────── */}
      <Modal
        visible={showDurationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDurationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Trip Duration</Text>
              <TouchableOpacity onPress={() => setShowDurationModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: 12 }}>
              {DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.durationOptionRow,
                    selectedDuration === opt.value && styles.durationOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedDuration(opt.value);
                    setShowDurationModal(false);
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.durationOptionTitle,
                        selectedDuration === opt.value && styles.textBlue,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.durationOptionSub}>{opt.value}</Text>
                  </View>
                  {selectedDuration === opt.value && (
                    <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Preferences Picker ───────────────────────────────────── */}
      <Modal
        visible={showPrefModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrefModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Travel Preferences</Text>
              <TouchableOpacity onPress={() => setShowPrefModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.prefGrid}>
              {PREFERENCE_OPTIONS.map((opt) => {
                const isSelected = selectedPreferences.includes(opt.label);
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.prefChip,
                      isSelected && styles.prefChipSelected,
                    ]}
                    onPress={() => togglePreference(opt.label)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? "#FFFFFF" : "#1E293B"}
                    />
                    <Text
                      style={[
                        styles.prefChipText,
                        isSelected && styles.prefChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowPrefModal(false)}
            >
              <Text style={styles.doneBtnText}>Confirm Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Import Inspirations ────────────────────────────────────── */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Import Inspirations</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.importDesc}>
              Paste links from Instagram, TikTok, blogs, or write notes about places you'd love to visit!
            </Text>

            <TextInput
              style={styles.importInput}
              placeholder="Paste link or type inspiration..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={inspirationText}
              onChangeText={setInspirationText}
            />

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowImportModal(false);
                setInspirationText("");
              }}
            >
              <Text style={styles.doneBtnText}>Add Inspiration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Generated AI Plan Result ───────────────────────────────── */}
      <Modal
        visible={showPlanModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPlanModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <View style={styles.planHeader}>
            <TouchableOpacity onPress={() => setShowPlanModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.planHeaderTitle}>Your AI Itinerary</Text>
            <Ionicons name="share-outline" size={22} color="#0F172A" />
          </View>

          {generatedPlan && (
            <ScrollView style={{ padding: 16 }}>
              <View style={styles.planBanner}>
                <LinearGradient
                  colors={["#2563EB", "#7C3AED"]}
                  style={styles.planGradient}
                >
                  <Text style={styles.planTitle}>{generatedPlan.title}</Text>
                  <Text style={styles.planSummary}>{generatedPlan.summary}</Text>
                  <View style={styles.costBadge}>
                    <Text style={styles.costText}>Est. Cost: {generatedPlan.estimatedCost}</Text>
                  </View>
                </LinearGradient>
              </View>

              {generatedPlan.days.map((dayItem) => (
                <View key={dayItem.day} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayBadge}>Day {dayItem.day}</Text>
                    <Text style={styles.dayTheme}>{dayItem.theme}</Text>
                  </View>

                  {dayItem.activities.map((act, idx) => (
                    <View key={idx} style={styles.actRow}>
                      <View style={styles.timeDotCol}>
                        <View style={styles.dot} />
                        {idx < dayItem.activities.length - 1 && <View style={styles.timeline} />}
                      </View>
                      <View style={styles.actContent}>
                        <Text style={styles.actTime}>{act.time}</Text>
                        <Text style={styles.actTitle}>{act.activity}</Text>
                        <Text style={styles.actLoc}>📍 {act.location}</Text>
                        {act.notes ? <Text style={styles.actNotes}>{act.notes}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              {generatedPlan.tips && generatedPlan.tips.length > 0 && (
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>💡 Travel Tips</Text>
                  {generatedPlan.tips.map((tip, index) => (
                    <Text key={index} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL: Terms of Use ────────────────────────────────────────── */}
      <Modal
        visible={showTermsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Terms of Use</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close-circle-outline" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 250, marginVertical: 10 }}>
              <Text style={styles.termsBodyText}>
                Welcome to Trip.Planner. By using our AI Trip Generation tools, you agree that itineraries are generated as recommendations. Real-time availability, bookings, and pricing are subject to partner confirmations.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBackgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  scrollContainer: {
    paddingBottom: 40,
  },

  /* Top Header Bar */
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  yellowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginLeft: 3,
    marginTop: 4,
  },
  oldVersionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  oldVersionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },

  /* Form Card Container */
  formCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },

  /* Field Section 1 */
  fieldSection: {},
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  labelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  selectedOriginChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectedOriginText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
  },

  /* Search Input Box */
  inputBox: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  inputLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  locationChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2563EB",
  },
  placeholderText: {
    fontSize: 15,
    color: "#94A3B8",
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  dividerSpacing: {
    height: 14,
  },

  /* Selectable Rows (Date & Preferences) */
  selectableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectValueText: {
    fontSize: 16,
    color: "#64748B",
  },
  activeValueText: {
    color: "#2563EB",
    fontWeight: "600",
  },

  /* Terms Disclaimer Row */
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  termsText: {
    fontSize: 13,
    color: "#64748B",
  },
  termsLink: {
    color: "#2563EB",
    fontWeight: "500",
  },

  /* Primary Button */
  primaryBtnContainer: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryGradient: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  /* Secondary Button */
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    paddingBottom: 4,
  },
  secondaryBtnText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },

  /* Inspiration Card */
  inspirationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  inspirationTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  inspirationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  inspirationSubtitle: {
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 4,
  },
  inspirationGraphicBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardStackBase: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardStackTop: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
    gap: 8,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  locationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  locationOptionText: {
    fontSize: 16,
    color: "#0F172A",
    flex: 1,
    marginLeft: 12,
  },
  durationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  durationOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  durationOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  durationOptionSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  textBlue: {
    color: "#2563EB",
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 14,
  },
  prefChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  prefChipSelected: {
    backgroundColor: "#2563EB",
  },
  prefChipText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  prefChipTextSelected: {
    color: "#FFFFFF",
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  importDesc: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 12,
  },
  importInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#0F172A",
  },
  termsBodyText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  /* Generated Plan Sheet */
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  planHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  planBanner: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  planGradient: {
    padding: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  planSummary: {
    fontSize: 14,
    color: "#E0E7FF",
    marginTop: 6,
  },
  costBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  costText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dayBadge: {
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 13,
  },
  dayTheme: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  actRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  timeDotCol: {
    alignItems: "center",
    width: 20,
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  timeline: {
    width: 2,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
  },
  actContent: {
    flex: 1,
  },
  actTime: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  actTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 2,
  },
  actLoc: {
    fontSize: 13,
    color: "#2563EB",
    marginTop: 2,
  },
  actNotes: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  tipsCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#78350F",
    marginTop: 4,
  },
});
