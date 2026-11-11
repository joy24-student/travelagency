import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  useSearchHotels,
  useSearchFlights,
  useSearchTours,
} from "../hooks/useSearch";
import { supabase } from "../utils/supabase";
import { BottomNav, AiPill } from "./Navigation";
import { TopBar } from "./TopBar";
import { screens, type UIScreen } from "../data/screens";
import { savedItemsService } from "../services/savedItemsService";
import { SearchAutocompleteDropdown } from "../components/search/SearchAutocompleteDropdown";
import { formatPrice } from "../utils/currency";
import { trendingSearchService } from "../services/trendingSearchService";

const PRIMARY = "#0055F2";

const SUGGESTIONS_DEFAULT = [
  "Cox's Bazar",
  "Sylhet",
  "Sreemangal",
  "Sajek Valley",
  "Chittagong",
  "Bangkok",
  "Dubai",
];

const HISTORY_DEFAULT = [
  "Cox's Bazar 3D Package",
  "Hotels in Sylhet",
  "Sajek Valley Resort",
  "Flights to Chittagong",
];

const NEARBY_DESTINATIONS = [
  { name: "কক্সবাজার (Cox's Bazar)", query: "Cox's Bazar" },
  { name: "সিলেট (Sylhet)", query: "Sylhet" },
  { name: "শ্রীমঙ্গল (Sreemangal)", query: "Sreemangal" },
  { name: "সাজেক ভ্যালি (Sajek)", query: "Sajek Valley" },
  { name: "চট্টগ্রাম (Chittagong)", query: "Chittagong" },
];

const FLEXIBLE_DATE_OPTIONS = [
  { label: "-২ দিন পূর্বে", offset: -2 },
  { label: "+১ দিন পর", offset: 1 },
  { label: "±৩ দিনে দেখুন", offset: 3, isFlexible: true },
  { label: "+৭ দিন (পরবর্তী সপ্তাহ)", offset: 7 },
];

type FilterState = {
  budget: string;
  minRating: string;
  duration: string;
  travelType: string;
  flexibleDays?: number;
};

const PAGE_SIZE = 6;

export function SearchScreen({ screen }: { screen?: UIScreen } = {}) {
  const activeScreen = screen ?? screens.find((s) => s.slug === "search") ?? screens[0];
  const params = useLocalSearchParams<{ q?: string; type?: string }>();

  const initialType: "hotels" | "flights" | "tours" =
    params.type === "flights" || activeScreen?.slug === "flights"
      ? "flights"
      : params.type === "tours" || activeScreen?.slug === "packages"
      ? "tours"
      : "hotels";

  const [query, setQuery] = useState(params.q || "");
  const [activeType, setActiveType] = useState<"hotels" | "flights" | "tours">(initialType);
  const [filters, setFilters] = useState<FilterState>({
    budget: "",
    minRating: "",
    duration: "",
    travelType: "",
    flexibleDays: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Pagination state (Problem 5: Infinite scroll with onEndReached)
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Supabase data states
  const [suggestions, setSuggestions] = useState(SUGGESTIONS_DEFAULT);
  const [history, setHistory] = useState(HISTORY_DEFAULT);
  const travelTypes = ["Beach", "Mountain", "City", "Resort", "Adventure", "Family"];

  // Sync saved items
  useEffect(() => {
    const unsub = savedItemsService.subscribe((items) => {
      setSavedIds(new Set(items.map((i) => i.id)));
    });
    return () => unsub();
  }, []);

  // Update query if url params change
  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
    }
  }, [params.q]);

  // Load suggestions from Supabase
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const [destsRes, trending] = await Promise.all([
          supabase.from("destinations").select("name").limit(6),
          trendingSearchService.getActiveTrending(),
        ]);

        const combinedSuggestions: string[] = [];
        if (trending && trending.length > 0) {
          combinedSuggestions.push(...trending.map((t) => t.query_text));
        }
        if (destsRes.data && destsRes.data.length > 0) {
          destsRes.data.forEach((d: any) => {
            if (!combinedSuggestions.includes(d.name)) {
              combinedSuggestions.push(d.name);
            }
          });
        }

        if (combinedSuggestions.length > 0) {
          setSuggestions(combinedSuggestions);
        }
      } catch (err) {
        console.warn("Error loading search suggestions:", err);
      }
    };
    loadSearchData();
  }, []);

  // Search hooks
  const { hotels, loading: hLoad } = useSearchHotels(
    query && activeType === "hotels"
      ? {
          city: query,
          minRating: filters.minRating ? Number(filters.minRating) : undefined,
          maxPrice: filters.budget ? Number(filters.budget) : undefined,
        }
      : undefined
  );

  const { flights, loading: fLoad } = useSearchFlights(
    query && activeType === "flights" ? { arrivalAirportCode: query } : undefined
  );

  const { tours, loading: tLoad } = useSearchTours(
    query && activeType === "tours" ? { destination: query } : undefined
  );

  const loading = hLoad || fLoad || tLoad;

  // Raw Results
  const rawResults: any[] = useMemo(() => {
    if (activeType === "hotels") return hotels || [];
    if (activeType === "flights") return flights || [];
    return tours || [];
  }, [activeType, hotels, flights, tours]);

  // Filter raw results by client-side filters (budget, minRating, travelType)
  const filteredResults = useMemo(() => {
    return rawResults.filter((item) => {
      const price = Number(item.base_price || item.price || item.room_price || 0);
      const rating = Number(item.average_rating || item.star_rating || 0);

      if (filters.budget && price > 0 && price > Number(filters.budget)) {
        return false;
      }
      if (filters.minRating && rating > 0 && rating < Number(filters.minRating)) {
        return false;
      }
      if (filters.travelType) {
        const tags = (item.tags || []).join(" ").toLowerCase();
        const desc = (item.description || item.name || "").toLowerCase();
        if (!tags.includes(filters.travelType.toLowerCase()) && !desc.includes(filters.travelType.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rawResults, filters]);

  // Reset pagination when results or query changes
  useEffect(() => {
    setDisplayedCount(PAGE_SIZE);
  }, [query, activeType, filters]);

  // Paginated visible slice
  const paginatedResults = useMemo(() => {
    return filteredResults.slice(0, displayedCount);
  }, [filteredResults, displayedCount]);

  const hasMore = displayedCount < filteredResults.length;

  // Infinite Scroll Handler (Problem 5: onEndReached with loader & "আর কিছু নেই")
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + PAGE_SIZE, filteredResults.length));
      setIsLoadingMore(false);
    }, 450);
  }, [hasMore, isLoadingMore, filteredResults.length]);

  // Clear all filters (Problem 3 & 4)
  const handleClearFilters = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFilters({
      budget: "",
      minRating: "",
      duration: "",
      travelType: "",
      flexibleDays: undefined,
    });
  }, []);

  // Remove a single active filter (Problem 4)
  const handleRemoveFilter = useCallback((key: keyof FilterState) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFilters((prev) => ({
      ...prev,
      [key]: key === "flexibleDays" ? undefined : "",
    }));
  }, []);

  // Active filter items for chips
  const activeFilterChips = useMemo(() => {
    const list: { key: keyof FilterState; label: string }[] = [];
    if (filters.budget) list.push({ key: "budget", label: `বাজেট: ৳${filters.budget}` });
    if (filters.minRating) list.push({ key: "minRating", label: `রেটিং: ${filters.minRating}+ ⭐` });
    if (filters.travelType) list.push({ key: "travelType", label: `টাইপ: ${filters.travelType}` });
    if (filters.duration) list.push({ key: "duration", label: `সময়কাল: ${filters.duration}` });
    if (filters.flexibleDays !== undefined) {
      list.push({ key: "flexibleDays", label: `তারিখ: ±${filters.flexibleDays} দিন` });
    }
    return list;
  }, [filters]);

  // Toggle Save with Haptics + Toast (Problem 7)
  const handleToggleSave = useCallback(async (item: any) => {
    const name = item.name || item.hotel_name || item.title || "ভ্রমণ আইটেম";
    const price = Number(item.base_price || item.price || 1200);
    const taxRate = 0.1;
    const totalWithTax = Math.round(price * (1 + taxRate));

    await savedItemsService.toggleSaveItem({
      id: item.id || `search-item-${name}`,
      type: activeType === "hotels" ? "hotel" : activeType === "flights" ? "flight" : "package",
      title: name,
      subtitle: item.city ? `${item.city} · ${item.average_rating || 4.8}★` : "ভ্রমণ অফার",
      destination: item.city || item.destination_city || query,
      price,
      totalPriceWithTax: totalWithTax,
      rating: Number(item.average_rating || item.star_rating || 4.8),
      image_url: item.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500",
      route: `/screens/search?q=${encodeURIComponent(name)}`,
    });
  }, [activeType, query]);

  // Render Header of the FlatList (Search inputs, filters panel, active filter chips bar)
  const renderListHeader = () => {
    return (
      <View style={{ gap: 10, paddingBottom: 6 }}>
        {/* Search bar row */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color="#0055F2" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="গন্তব্য, হোটেল, ফ্লাইট বা প্যাকেজ লিখুন..."
              placeholderTextColor="#94A3B8"
              style={s.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setQuery("");
                }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Filter button with active indicator */}
          <Pressable
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setShowFilters((v) => !v);
            }}
            style={[
              s.filterBtn,
              (showFilters || activeFilterChips.length > 0) && {
                backgroundColor: PRIMARY,
                borderColor: PRIMARY,
              },
            ]}
          >
            <Ionicons
              name="options"
              size={18}
              color={showFilters || activeFilterChips.length > 0 ? "#FFFFFF" : PRIMARY}
            />
            {activeFilterChips.length > 0 && (
              <View style={s.filterBadgeDot}>
                <Text style={s.filterBadgeDotText}>{activeFilterChips.length}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Live Predictive Autocomplete Dropdown */}
        {isSearchFocused && (
          <SearchAutocompleteDropdown
            query={query}
            onSelectDestination={(dest) => {
              setQuery(dest.name);
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}
            onClose={() => setIsSearchFocused(false)}
          />
        )}

        {/* Type tabs (Hotels / Flights / Tours) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.typeTabs}
        >
          {[
            { id: "hotels", label: "🏨 হোটেল", count: hotels?.length },
            { id: "flights", label: "✈️ ফ্লাইট", count: flights?.length },
            { id: "tours", label: "🎒 প্যাকেজ ও ট্যুর", count: tours?.length },
          ].map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setActiveType(t.id as any);
              }}
              style={[s.typeTab, activeType === t.id && s.typeTabActive]}
            >
              <Text style={[s.typeTabText, activeType === t.id && s.typeTabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <View style={s.filterPanel}>
            <View style={s.filterHeaderRow}>
              <Text style={s.filterTitle}>ফিল্টারসমূহ (Search Filters)</Text>
              <Pressable onPress={handleClearFilters}>
                <Text style={s.clearText}>সব রিসেট</Text>
              </Pressable>
            </View>

            <View style={s.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>সর্বোচ্চ বাজেট (৳)</Text>
                <TextInput
                  value={filters.budget}
                  onChangeText={(v) => setFilters((f) => ({ ...f, budget: v }))}
                  keyboardType="numeric"
                  style={s.filterInput}
                  placeholder="যেমন: ১৫০০০"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>ন্যূনতম রেটিং (১-৫)</Text>
                <TextInput
                  value={filters.minRating}
                  onChangeText={(v) => setFilters((f) => ({ ...f, minRating: v }))}
                  keyboardType="numeric"
                  style={s.filterInput}
                  placeholder="যেমন: ৪"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <Text style={s.filterLabel}>ভ্রমণের ধরন (Category)</Text>
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
                  <Text style={[s.chipText, filters.travelType === type && s.chipTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={s.applyFilterBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowFilters(false);
              }}
            >
              <Text style={s.applyFilterBtnText}>ফিল্টার প্রয়োগ করুন</Text>
            </Pressable>
          </View>
        )}

        {/* Problem 4 Solution: Active Filter Chips Bar & Result Count Badge */}
        {query.length > 0 && (
          <View style={s.activeFiltersContainer}>
            <View style={s.resultCountRow}>
              <View style={s.resultBadge}>
                <Ionicons name="layers-outline" size={14} color="#0055F2" />
                <Text style={s.resultBadgeText}>
                  {loading ? "অনুসন্ধান চলছে..." : `ফল: ${filteredResults.length}টি`}
                </Text>
              </View>

              {activeFilterChips.length > 0 && (
                <Pressable onPress={handleClearFilters} style={s.clearAllBtn}>
                  <Text style={s.clearAllBtnText}>সব মুছুন</Text>
                </Pressable>
              )}
            </View>

            {/* Chips with ✕ to dismiss */}
            {activeFilterChips.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.activeChipsScroll}
              >
                {activeFilterChips.map((chip) => (
                  <Pressable
                    key={chip.key}
                    style={s.activeFilterChip}
                    onPress={() => handleRemoveFilter(chip.key)}
                  >
                    <Text style={s.activeFilterChipText}>{chip.label}</Text>
                    <Ionicons name="close-circle" size={15} color="#0055F2" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Empty Query State: Recent History & Popular destinations */}
        {!query && (
          <View style={{ gap: 14, paddingTop: 6 }}>
            <Text style={s.sectionTitle}>সাম্প্রতিক অনুসন্ধান</Text>
            {history.map((h) => (
              <Pressable
                key={h}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setQuery(h);
                }}
                style={s.historyRow}
              >
                <Ionicons name="time-outline" size={16} color="#64748B" />
                <Text style={s.historyText}>{h}</Text>
                <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
              </Pressable>
            ))}

            <Text style={s.sectionTitle}>জনপ্রিয় গন্তব্য</Text>
            <View style={s.chipRow}>
              {suggestions.map((sg) => (
                <Pressable
                  key={sg}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setQuery(sg);
                  }}
                  style={s.chip}
                >
                  <Text style={s.chipText}>{sg}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Problem 3 Solution: Rich Empty State with ±3 Days Suggestions & Nearby Destinations
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={s.emptyStateWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.emptyStateDesc}>ফলাফল খোঁজা হচ্ছে...</Text>
        </View>
      );
    }

    if (!query) return null;

    return (
      <View style={s.emptyStateWrap}>
        <View style={s.emptyIconCircle}>
          <Ionicons name="calendar-outline" size={44} color="#0055F2" />
        </View>

        <Text style={s.emptyStateTitle}>এই তারিখে কোনো ফলাফল পাওয়া যায়নি</Text>
        <Text style={s.emptyStateDesc}>
          "{query}"-এ আপনার নির্বাচিত ফিল্টার বা নির্দিষ্ট তারিখে কোনো খালি আসন/রুম পাওয়া যায়নি।
        </Text>

        {/* ±3 Days Suggestions */}
        <View style={s.suggestionBox}>
          <View style={s.suggestionHeaderRow}>
            <Ionicons name="sparkles" size={14} color="#D97706" />
            <Text style={s.suggestionHeaderTitle}>
              ±৩ দিনের বিকল্প তারিখগুলোতে খুঁজে দেখুন:
            </Text>
          </View>
          <View style={s.flexibleDatesRow}>
            {FLEXIBLE_DATE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                style={s.flexibleDateChip}
                onPress={() => {
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                  setFilters((prev) => ({ ...prev, flexibleDays: opt.offset }));
                }}
              >
                <Ionicons name="calendar" size={12} color="#0055F2" />
                <Text style={s.flexibleDateText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Nearby Destination Suggestions */}
        <View style={s.suggestionBox}>
          <View style={s.suggestionHeaderRow}>
            <Ionicons name="map" size={14} color="#0055F2" />
            <Text style={s.suggestionHeaderTitle}>কাছাকাছি জনপ্রিয় বিকল্প গন্তব্য:</Text>
          </View>
          <View style={s.nearbyGrid}>
            {NEARBY_DESTINATIONS.map((dest) => (
              <Pressable
                key={dest.name}
                style={s.nearbyChip}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setQuery(dest.query);
                }}
              >
                <Ionicons name="location-sharp" size={12} color="#EF4444" />
                <Text style={s.nearbyChipText}>{dest.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reset / Clear Filters Action Button */}
        {activeFilterChips.length > 0 && (
          <Pressable style={s.resetAllFiltersBtn} onPress={handleClearFilters}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={s.resetAllFiltersBtnText}>সকল ফিল্টার সরান ও পুনরায় দেখুন</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // Problem 5 Solution: List Footer Component with Loading Spinner & "আর কিছু নেই"
  const renderListFooter = () => {
    if (!query) return <View style={{ height: 100 }} />;

    if (isLoadingMore) {
      return (
        <View style={s.footerLoadingWrap}>
          <ActivityIndicator size="small" color={PRIMARY} />
          <Text style={s.footerLoadingText}>আরও ফলাফল লোড হচ্ছে...</Text>
        </View>
      );
    }

    if (!hasMore && filteredResults.length > 0) {
      return (
        <View style={s.footerEndWrap}>
          <View style={s.footerDivider} />
          <Text style={s.footerEndText}>✨ আর কিছু নেই · আপনি সব ফলাফল দেখে ফেলেছেন</Text>
          <View style={{ height: 100 }} />
        </View>
      );
    }

    return <View style={{ height: 100 }} />;
  };

  return (
    <SafeAreaView style={s.shell} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <TopBar screen={activeScreen} />

            <FlatList
              data={query ? paginatedResults : []}
              keyExtractor={(item, index) => item.id || `res-${index}`}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={renderEmptyState}
              ListFooterComponent={renderListFooter}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              renderItem={({ item, index }) => {
                const name = item.name ?? item.hotel_name ?? item.title ?? `ফলাফল ${index + 1}`;
                const rating = item.average_rating ?? item.star_rating ?? 4.8;
                const basePrice = Number(item.base_price || item.price || 4500);
                const taxRate = 0.1;
                const totalWithTax = Math.round(basePrice * (1 + taxRate));
                const isSaved = savedIds.has(item.id || name);
                const imageUri =
                  item.image_url ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";

                return (
                  <Pressable
                    style={s.resultCard}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      if (activeType === "hotels") {
                        router.push({
                          pathname: "/screens/search-stays" as any,
                          params: { q: name },
                        });
                      } else if (activeType === "tours") {
                        router.push("/screens/packages" as any);
                      } else {
                        router.push("/screens/flights" as any);
                      }
                    }}
                  >
                    <Image source={{ uri: imageUri }} style={s.resultCardImage} />

                    <View style={s.resultCardBody}>
                      <View style={s.resultTopRow}>
                        <View style={s.ratingPill}>
                          <Ionicons name="star" size={11} color="#F59E0B" />
                          <Text style={s.ratingPillText}>{rating}</Text>
                        </View>

                        {/* Heart / Save Button (Problem 7) */}
                        <Pressable
                          style={s.cardHeartBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleSave(item);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isSaved ? "heart" : "heart-outline"}
                            size={18}
                            color={isSaved ? "#EF4444" : "#94A3B8"}
                          />
                        </Pressable>
                      </View>

                      <Text style={s.resultTitle} numberOfLines={1}>
                        {name}
                      </Text>

                      <View style={s.locRow}>
                        <Ionicons name="location-sharp" size={11} color="#64748B" />
                        <Text style={s.locText} numberOfLines={1}>
                          {item.city ?? item.destination_city ?? query}
                        </Text>
                      </View>

                      {/* Upfront Price Transparency (Problem 6) */}
                      <View style={s.priceBox}>
                        <Text style={s.basePriceText}>
                          {formatPrice(basePrice)}
                          <Text style={s.priceUnitText}>
                            {activeType === "hotels" ? " / রাত" : " / জন"}
                          </Text>
                        </Text>
                        <Text style={s.taxTotalText}>
                          ট্যাক্স ও ফিসহ মোট: {formatPrice(totalWithTax)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
            />

            <AiPill color={PRIMARY} />
            <BottomNav active="Home" color={PRIMARY} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F8FAFC" },
  listContent: { padding: 14, gap: 12 },
  searchWrap: { flexDirection: "row", gap: 8 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A", fontWeight: "600" },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  filterBadgeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeDotText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  typeTabs: { gap: 8, paddingVertical: 4 },
  typeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeTabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typeTabText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  typeTabTextActive: { color: "#FFFFFF" },
  filterPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  clearText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
  filterRow: { flexDirection: "row", gap: 12 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", marginTop: 4 },
  filterInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#0F172A",
    fontWeight: "600",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  chipTextActive: { color: "#FFFFFF" },
  applyFilterBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 6,
  },
  applyFilterBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  activeFiltersContainer: {
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resultCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultBadgeText: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  clearAllBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  clearAllBtnText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
  activeChipsScroll: { gap: 6, paddingTop: 4 },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 5,
  },
  activeFilterChipText: { fontSize: 11, fontWeight: "700", color: "#0055F2" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", marginTop: 4 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  historyText: { fontSize: 13, color: "#334155", flex: 1, fontWeight: "500" },
  resultCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)" } : {}),
  },
  resultCardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  resultCardBody: { flex: 1, gap: 2 },
  resultTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingPillText: { fontSize: 11, fontWeight: "800", color: "#0F172A" },
  cardHeartBtn: { padding: 4 },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11, color: "#64748B" },
  priceBox: { marginTop: 4 },
  basePriceText: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  priceUnitText: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  taxTotalText: { fontSize: 10, fontWeight: "700", color: "#059669", marginTop: 1 },
  emptyStateWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 14,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  emptyStateDesc: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  suggestionBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  suggestionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  suggestionHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  flexibleDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flexibleDateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  flexibleDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },
  nearbyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nearbyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  nearbyChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  resetAllFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 6,
  },
  resetAllFiltersBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  footerLoadingWrap: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  footerEndWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  footerDivider: {
    width: "40%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  footerEndText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },
});
