import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useSearchHotels,
  useSearchFlights,
  useSearchTours,
} from "../hooks/useSearch";
import { supabase } from "../utils/supabase";
import { BottomNav, AiPill } from "./Navigation";
import { TopBar } from "./TopBar";
import { screens, type UIScreen } from "../data/screens";

const PRIMARY = "#287dfa";

const SUGGESTIONS_DEFAULT = [
  "Cox's Bazar",
  "Bangkok",
  "Maldives",
  "Sylhet",
  "Dubai",
  "Singapore",
];
const HISTORY_DEFAULT = ["Bangkok 3D", "Hotels in Dhaka", "Cox's Bazar package"];
const TRAVEL_TYPES_DEFAULT = [
  "Beach",
  "Mountain",
  "City",
  "Cultural",
  "Adventure",
  "Family",
];

type FilterState = {
  budget: string;
  minRating: string;
  duration: string;
  travelType: string;
};

export function SearchScreen({ screen }: { screen?: UIScreen } = {}) {
  const activeScreen = screen ?? screens.find((s) => s.slug === "search") ?? screens[0];
  const initialType: "hotels" | "flights" | "tours" =
    activeScreen?.slug === "flights" || (activeScreen as any)?.kind === "flight"
      ? "flights"
      : activeScreen?.slug === "packages" || activeScreen?.slug === "tours" || activeScreen?.slug === "private-tours-search"
        ? "tours"
        : "hotels";
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<"hotels" | "flights" | "tours">(initialType);
  const [filters, setFilters] = useState<FilterState>({
    budget: "",
    minRating: "",
    duration: "",
    travelType: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  
  // Supabase data states
  const [suggestions, setSuggestions] = useState(SUGGESTIONS_DEFAULT);
  const [history, setHistory] = useState(HISTORY_DEFAULT);
  const [travelTypes, setTravelTypes] = useState(TRAVEL_TYPES_DEFAULT);

  // Load suggestions and travel types from Supabase
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        // Load popular destinations
        const { data: dests } = await supabase
          .from("destinations")
          .select("name")
          .eq("is_popular", true)
          .limit(6);
        
        if (dests && dests.length > 0) {
          setSuggestions(dests.map((d: any) => d.name));
        }

        // Load travel categories/tags
        const { data: categories } = await supabase
          .from("travel_categories")
          .select("name")
          .eq("is_active", true)
          .limit(6);
        
        if (categories && categories.length > 0) {
          setTravelTypes(categories.map((c: any) => c.name));
        }
      } catch (err) {
        console.error("Error loading search data:", err);
      }
    };

    loadSearchData();
  }, []);

  const filteredSuggestions = suggestions.filter(
    (s) => query.length > 1 && s.toLowerCase().includes(query.toLowerCase()),
  );

  const { hotels, loading: hLoad } = useSearchHotels(
    query && activeType === "hotels"
      ? {
          city: query,
          minRating: filters.minRating ? Number(filters.minRating) : undefined,
        }
      : undefined,
  );
  const { flights, loading: fLoad } = useSearchFlights(
    query && activeType === "flights" ? {} : undefined,
  );
  const { tours, loading: tLoad } = useSearchTours(
    query && activeType === "tours" ? { destination: query } : undefined,
  );

  const loading = hLoad || fLoad || tLoad;
  const results: any[] =
    activeType === "hotels"
      ? hotels
      : activeType === "flights"
        ? flights
        : tours;

  const toggleCompare = (name: string) =>
    setCompareList((p) =>
      p.includes(name)
        ? p.filter((n) => n !== name)
        : p.length < 3
          ? [...p, name]
          : p,
    );

  return (
    <SafeAreaView style={s.shell} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
      <TopBar screen={activeScreen} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.scroll}
      >
        {/* Search bar */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Hotels, flights, tours, destinations..."
              placeholderTextColor="#aaa"
              style={s.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </Pressable>
            ) : null}
            <Pressable style={s.voiceBtn}>
              <Ionicons name="mic" size={18} color={PRIMARY} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={[s.filterBtn, showFilters && { backgroundColor: PRIMARY }]}
          >
            <Ionicons
              name="options"
              size={18}
              color={showFilters ? "#fff" : PRIMARY}
            />
          </Pressable>
        </View>

        {/* Type tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.typeTabs}
        >
          {(["hotels", "flights", "tours"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActiveType(t)}
              style={[s.typeTab, activeType === t && s.typeTabActive]}
            >
              <Text
                style={[s.typeTabText, activeType === t && s.typeTabTextActive]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Filters */}
        {showFilters && (
          <View style={s.filterPanel}>
            <Text style={s.filterTitle}>Filters</Text>
            <View style={s.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>Max Budget</Text>
                <TextInput
                  value={filters.budget}
                  onChangeText={(v) => setFilters((f) => ({ ...f, budget: v }))}
                  keyboardType="numeric"
                  style={s.filterInput}
                  placeholder="Any"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>Min Rating (1-5)</Text>
                <TextInput
                  value={filters.minRating}
                  onChangeText={(v) =>
                    setFilters((f) => ({ ...f, minRating: v }))
                  }
                  keyboardType="numeric"
                  style={s.filterInput}
                  placeholder="Any"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
            <View>
              <Text style={s.filterLabel}>Duration</Text>
              <TextInput
                value={filters.duration}
                onChangeText={(v) => setFilters((f) => ({ ...f, duration: v }))}
                style={s.filterInput}
                placeholder="e.g. 5 days"
                placeholderTextColor="#aaa"
              />
            </View>
            <Text style={s.filterLabel}>Travel Type</Text>
            <View style={s.chipRow}>
              {travelTypes.map((type) => (
                <Pressable
                  key={type}
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      travelType: f.travelType === type ? "" : type,
                    }))
                  }
                  style={[s.chip, filters.travelType === type && s.chipActive]}
                >
                  <Text
                    style={[
                      s.chipText,
                      filters.travelType === type && s.chipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() =>
                setFilters({
                  budget: "",
                  minRating: "",
                  duration: "",
                  travelType: "",
                })
              }
            >
              <Text style={s.clearText}>Clear All</Text>
            </Pressable>
          </View>
        )}

        {/* Compare banner */}
        {compareList.length > 0 && (
          <View style={s.compareBanner}>
            <Text style={s.compareText}>{compareList.length} selected</Text>
            <Pressable
              onPress={() => setShowCompare((v) => !v)}
              style={s.compareBtn}
            >
              <Text style={s.compareBtnText}>Compare</Text>
            </Pressable>
            <Pressable onPress={() => setCompareList([])}>
              <Ionicons name="close" size={18} color="#667085" />
            </Pressable>
          </View>
        )}

        {/* Compare panel */}
        {showCompare && (
          <View style={s.comparePanel}>
            <Text style={s.filterTitle}>Side-by-Side Comparison</Text>
            {compareList.map((item) => (
              <View key={item} style={s.compareItem}>
                <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
                <Text style={s.compareItemText}>{item}</Text>
              </View>
            ))}
            <Text style={s.compareNote}>
              Connect real data for full feature comparison
            </Text>
          </View>
        )}

        {/* Autocomplete suggestions */}
        {filteredSuggestions.length > 0 && (
          <View style={s.suggestBox}>
            {filteredSuggestions.map((sg) => (
              <Pressable
                key={sg}
                onPress={() => setQuery(sg)}
                style={s.suggestRow}
              >
                <Ionicons name="search" size={14} color="#9ca3af" />
                <Text style={s.suggestText}>{sg}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* No query: history + popular */}
        {!query && (
          <>
            <Text style={s.sectionTitle}>Recent Searches</Text>
            {history.map((h) => (
              <Pressable
                key={h}
                onPress={() => setQuery(h)}
                style={s.historyRow}
              >
                <Ionicons name="time-outline" size={16} color="#9ca3af" />
                <Text style={s.historyText}>{h}</Text>
                <Ionicons name="arrow-forward" size={14} color="#ccc" />
              </Pressable>
            ))}
            <Text style={s.sectionTitle}>Popular</Text>
            <View style={s.chipRow}>
              {suggestions.map((sg) => (
                <Pressable key={sg} onPress={() => setQuery(sg)} style={s.chip}>
                  <Text style={s.chipText}>{sg}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Results */}
        {query.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              {loading ? "Searching..." : `Results for "${query}"`}
            </Text>
            {loading && <ActivityIndicator color={PRIMARY} />}
            {!loading && results.length === 0 && (
              <Text style={s.emptyText}>
                No results. Try adjusting filters.
              </Text>
            )}
            {!loading &&
              results.map((item: any, i: number) => {
                const name = item.name ?? item.hotel_name ?? `Result ${i + 1}`;
                return (
                  <View key={item.id ?? i} style={s.resultCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.resultTitle}>{name}</Text>
                      <Text style={s.resultMeta}>
                        {item.city ?? item.destination_city ?? ""}
                        {item.average_rating
                          ? ` · ⭐ ${item.average_rating}`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => toggleCompare(name)}
                      style={[
                        s.compareChk,
                        compareList.includes(name) && {
                          borderColor: PRIMARY,
                          backgroundColor: `${PRIMARY}12`,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: PRIMARY,
                          fontWeight: "700",
                        }}
                      >
                        {compareList.includes(name) ? "✓ Added" : "Compare"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <AiPill color={PRIMARY} />
      <BottomNav active="Home" color={PRIMARY} />
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { padding: 12 },
  searchWrap: { flexDirection: "row", gap: 8, marginBottom: 8 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  voiceBtn: { padding: 4 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  typeTabs: { gap: 8, marginBottom: 10 },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  typeTabActive: { backgroundColor: PRIMARY },
  typeTabText: { fontSize: 13, fontWeight: "700", color: "#667085" },
  typeTabTextActive: { color: "#fff" },
  filterPanel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  filterTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  filterRow: { flexDirection: "row", gap: 12 },
  filterLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "700",
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: "700", color: "#667085" },
  chipTextActive: { color: "#fff" },
  clearText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  compareBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  compareText: { flex: 1, fontSize: 13, color: "#1d4ed8", fontWeight: "700" },
  compareBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compareBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  comparePanel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  compareItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  compareItemText: { fontSize: 14, color: "#374151", fontWeight: "700" },
  compareNote: { fontSize: 11, color: "#9ca3af" },
  suggestBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  suggestText: { fontSize: 14, color: "#374151" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    marginTop: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f7",
  },
  historyText: { flex: 1, fontSize: 14, color: "#374151" },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  resultTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  resultMeta: { fontSize: 12, color: "#667085", marginTop: 2 },
  compareChk: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 20,
  },
});
