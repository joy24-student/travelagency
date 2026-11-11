import React, { useState, useEffect, useCallback } from "react";
import { Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TravelMode = "flights" | "hotels" | "trains" | "packages";

export interface RecentSearchItem {
  id: string;
  mode: TravelMode;
  from: string;
  to: string;
  dateText: string;
  passengers: number;
  rooms?: number;
  label: string;
}

const RECENT_SEARCHES_KEY = "@travel:recent_unified_searches_v1";

const DEFAULT_RECENT_SEARCHES: RecentSearchItem[] = [
  {
    id: "rec-1",
    mode: "flights",
    from: "ঢাকা (DAC)",
    to: "কক্সবাজার (CXB)",
    dateText: "১৫ নভেম্বর, ২০২৬",
    passengers: 2,
    rooms: 1,
    label: "✈️ ঢাকা ➔ কক্সবাজার (২ জন)",
  },
  {
    id: "rec-2",
    mode: "hotels",
    from: "ঢাকা",
    to: "সিলেট",
    dateText: "১৮ নভেম্বর · ৩ রাত",
    passengers: 2,
    rooms: 1,
    label: "🏨 সিলেট (১ রুম, ৩ রাত)",
  },
  {
    id: "rec-3",
    mode: "trains",
    from: "ঢাকা (কমলাপুর)",
    to: "চট্টগ্রাম (সিজিপি)",
    dateText: "২০ নভেম্বর, ২০২৬",
    passengers: 1,
    label: "🚆 ঢাকা ➔ চট্টগ্রাম (১ জন)",
  },
  {
    id: "rec-4",
    mode: "packages",
    from: "ঢাকা",
    to: "সাজেক ভ্যালি",
    dateText: "২৪ নভেম্বর · ৩ দিন",
    passengers: 4,
    rooms: 2,
    label: "🎒 সাজেক ভ্যালি (৪ জন)",
  },
];

const POPULAR_DESTINATIONS = [
  "কক্সবাজার (Cox's Bazar)",
  "সিলেট (Sylhet)",
  "সাজেক ভ্যালি (Sajek)",
  "শ্রীমঙ্গল (Sreemangal)",
  "চট্টগ্রাম (Chittagong)",
  "কুয়াকাটা (Kuakata)",
  "সেন্ট মার্টিন (St. Martin)",
];

const POPULAR_ORIGINS = [
  "ঢাকা (Dhaka)",
  "চট্টগ্রাম (Chittagong)",
  "সিলেট (Sylhet)",
  "রাজশাহী (Rajshahi)",
  "খুলনা (Khulna)",
];

export interface UnifiedSearchCardProps {
  initialMode?: TravelMode;
  onSearch?: (params: {
    mode: TravelMode;
    from: string;
    to: string;
    date: string;
    passengers: number;
    rooms: number;
  }) => void;
  style?: any;
}

export const UnifiedSearchCard: React.FC<UnifiedSearchCardProps> = ({
  initialMode = "flights",
  onSearch,
  style,
}) => {
  const [mode, setMode] = useState<TravelMode>(initialMode);
  const [fromLocation, setFromLocation] = useState("ঢাকা (DAC)");
  const [toLocation, setToLocation] = useState("কক্সবাজার (CXB)");
  const [dateText, setDateText] = useState("১৫ নভেম্বর, ২০২৬");
  const [passengers, setPassengers] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(
    DEFAULT_RECENT_SEARCHES
  );

  // Selector modal state
  const [pickerType, setPickerType] = useState<"from" | "to" | "guests" | null>(null);

  // Load saved recent searches from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRecentSearches(parsed);
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Swap Origin and Destination
  const handleSwap = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  }, [fromLocation, toLocation]);

  // One-tap fill from previous search
  const handleSelectRecentSearch = useCallback((item: RecentSearchItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setMode(item.mode);
    setFromLocation(item.from);
    setToLocation(item.to);
    setDateText(item.dateText);
    setPassengers(item.passengers);
    if (item.rooms) setRooms(item.rooms);
  }, []);

  // Submit search and save to recent searches
  const handleSearchSubmit = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const modeEmoji =
      mode === "flights" ? "✈️" : mode === "hotels" ? "🏨" : mode === "trains" ? "🚆" : "🎒";
    const newRecent: RecentSearchItem = {
      id: `rec-${Date.now()}`,
      mode,
      from: fromLocation,
      to: toLocation,
      dateText,
      passengers,
      rooms,
      label: `${modeEmoji} ${fromLocation.split(" ")[0]} ➔ ${toLocation.split(" ")[0]} (${passengers} জন)`,
    };

    const updated = [newRecent, ...recentSearches.filter((r) => r.to !== toLocation)].slice(0, 5);
    setRecentSearches(updated);
    AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});

    if (onSearch) {
      onSearch({
        mode,
        from: fromLocation,
        to: toLocation,
        date: dateText,
        passengers,
        rooms,
      });
    } else {
      // Direct navigation to destination search
      const cleanQuery = toLocation.replace(/\(.*?\)/g, "").trim();
      if (mode === "hotels") {
        router.push({
          pathname: "/screens/search-stays" as any,
          params: { q: cleanQuery },
        });
      } else if (mode === "trains") {
        router.push("/screens/trains" as any);
      } else if (mode === "packages") {
        router.push("/screens/packages" as any);
      } else {
        router.push({
          pathname: "/screens/flights" as any,
          params: { origin: fromLocation, destination: toLocation },
        });
      }
    }
  }, [mode, fromLocation, toLocation, dateText, passengers, rooms, recentSearches, onSearch]);

  return (
    <View style={[styles.container, style]}>
      {/* Travel Mode Tabs */}
      <View style={styles.modeTabsRow}>
        {[
          { id: "flights", label: "ফ্লাইট", icon: "airplane" },
          { id: "hotels", label: "হোটেল", icon: "bed" },
          { id: "trains", label: "ট্রেন", icon: "train" },
          { id: "packages", label: "প্যাকেজ", icon: "briefcase" },
        ].map((tab) => {
          const isSelected = mode === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.modeTab, isSelected && styles.modeTabSelected]}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setMode(tab.id as TravelMode);
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isSelected ? "#0055F2" : "#64748B"}
              />
              <Text
                style={[
                  styles.modeTabText,
                  isSelected && styles.modeTabTextSelected,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Main Form Box */}
      <View style={styles.cardBody}>
        {/* Origin & Destination Row with Swap */}
        <View style={styles.locationsWrapper}>
          {/* From */}
          <Pressable
            style={styles.locationInputBox}
            onPress={() => setPickerType("from")}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons name="radio-button-on" size={14} color="#0055F2" />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.fieldLabel}>কোথা থেকে (From)</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {fromLocation}
              </Text>
            </View>
          </Pressable>

          {/* Swap Button */}
          <Pressable style={styles.swapBtn} onPress={handleSwap}>
            <Ionicons name="swap-vertical" size={18} color="#0055F2" />
          </Pressable>

          {/* To */}
          <Pressable
            style={styles.locationInputBox}
            onPress={() => setPickerType("to")}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons name="location" size={16} color="#EF4444" />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.fieldLabel}>কোথায় যাবেন (To)</Text>
              <Text style={[styles.fieldValue, styles.destinationValue]} numberOfLines={1}>
                {toLocation}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Date and Passengers Row */}
        <View style={styles.metaRow}>
          {/* Date Picker */}
          <Pressable
            style={styles.metaInputBox}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              // Cycle through sample quick dates
              const dates = [
                "১৫ নভেম্বর, ২০২৬",
                "১৭ নভেম্বর, ২০২৬ (±৩ দিন)",
                "২০ নভেম্বর, ২০২৬ · ৩ রাত",
                "০১ ডিসেম্বর, ২০২৬",
              ];
              const nextIndex = (dates.indexOf(dateText) + 1) % dates.length;
              setDateText(dates[nextIndex]);
            }}
          >
            <Ionicons name="calendar-outline" size={16} color="#0055F2" />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>ভ্রমণ তারিখ</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {dateText}
              </Text>
            </View>
          </Pressable>

          {/* Passengers / Guests */}
          <Pressable
            style={styles.metaInputBox}
            onPress={() => setPickerType("guests")}
          >
            <Ionicons name="people-outline" size={16} color="#0055F2" />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>যাত্রী ও রুম</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {passengers} জন · {rooms} রুম
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Upfront Tax & Fee Transparency Guarantee */}
        <View style={styles.transparencyNotice}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.transparencyText}>
            স্বচ্ছ মূল্য গ্যারান্টি: ট্যাক্স ও ফিসহ সর্বমোট মূল্য প্রদর্শিত
          </Text>
        </View>

        {/* Search CTA Button */}
        <Pressable style={styles.searchSubmitBtn} onPress={handleSearchSubmit}>
          <LinearGradient
            colors={["#0055F2", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchGradient}
          >
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.searchBtnText}>অনুসন্ধান করুন</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* 1-Tap Fill From Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.recentSearchesWrap}>
          <View style={styles.recentHeaderRow}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.recentHeaderTitle}>আগের সার্চ থেকে এক ট্যাপে পূরণ:</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScrollContent}
          >
            {recentSearches.map((rec) => (
              <Pressable
                key={rec.id}
                style={styles.recentChip}
                onPress={() => handleSelectRecentSearch(rec)}
              >
                <Text style={styles.recentChipText}>{rec.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Location Picker Modal */}
      <Modal
        visible={pickerType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === "from"
                  ? "প্রস্থান স্থল নির্বাচন করুন"
                  : pickerType === "to"
                  ? "গন্তব্য নির্বাচন করুন"
                  : "যাত্রী ও রুম সংখ্যা"}
              </Text>
              <Pressable onPress={() => setPickerType(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </Pressable>
            </View>

            {pickerType === "from" && (
              <ScrollView style={styles.pickerList}>
                {POPULAR_ORIGINS.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.pickerItem}
                    onPress={() => {
                      setFromLocation(item);
                      setPickerType(null);
                    }}
                  >
                    <Ionicons name="airplane" size={16} color="#0055F2" />
                    <Text style={styles.pickerItemText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {pickerType === "to" && (
              <ScrollView style={styles.pickerList}>
                {POPULAR_DESTINATIONS.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.pickerItem}
                    onPress={() => {
                      setToLocation(item);
                      setPickerType(null);
                    }}
                  >
                    <Ionicons name="location" size={16} color="#EF4444" />
                    <Text style={styles.pickerItemText}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {pickerType === "guests" && (
              <View style={styles.stepperContainer}>
                {/* Passengers */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.stepperTitle}>যাত্রী সংখ্যা</Text>
                    <Text style={styles.stepperSub}>বয়স ১২ বছর বা তদূর্ধ্ব</Text>
                  </View>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons name="remove" size={18} color="#0055F2" />
                    </Pressable>
                    <Text style={styles.stepValue}>{passengers}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setPassengers((p) => Math.min(10, p + 1))}
                    >
                      <Ionicons name="add" size={18} color="#0055F2" />
                    </Pressable>
                  </View>
                </View>

                {/* Rooms */}
                <View style={styles.stepperRow}>
                  <View>
                    <Text style={styles.stepperTitle}>রুম সংখ্যা</Text>
                    <Text style={styles.stepperSub}>হোটেল বা রিসোর্ট</Text>
                  </View>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setRooms((r) => Math.max(1, r - 1))}
                    >
                      <Ionicons name="remove" size={18} color="#0055F2" />
                    </Pressable>
                    <Text style={styles.stepValue}>{rooms}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setRooms((r) => Math.min(5, r + 1))}
                    >
                      <Ionicons name="add" size={18} color="#0055F2" />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={styles.stepperDoneBtn}
                  onPress={() => setPickerType(null)}
                >
                  <Text style={styles.stepperDoneText}>নিশ্চিত করুন</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.08)" } : {}),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  modeTabsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 5,
  },
  modeTabSelected: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#0055F2",
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modeTabTextSelected: {
    color: "#0055F2",
    fontWeight: "800",
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  locationsWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  locationInputBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  locationIconWrap: {
    width: 24,
    alignItems: "center",
  },
  locationTextWrap: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  destinationValue: {
    color: "#0055F2",
  },
  swapBtn: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
  },
  metaInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  transparencyNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  transparencyText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
  },
  searchSubmitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 2,
  },
  searchGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  recentSearchesWrap: {
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  recentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recentHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  recentScrollContent: {
    gap: 8,
  },
  recentChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  pickerList: {
    paddingVertical: 10,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  stepperContainer: {
    paddingVertical: 16,
    gap: 20,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  stepperSub: {
    fontSize: 12,
    color: "#64748B",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 24,
    textAlign: "center",
  },
  stepperDoneBtn: {
    backgroundColor: "#0055F2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  stepperDoneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
