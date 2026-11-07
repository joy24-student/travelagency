import React, { useState, useEffect, useCallback } from "react";
import { Platform,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSearchAutocomplete } from "../../hooks/useSearchAutocomplete";
import { TravelHub, AutocompleteMatch } from "../../services/ml/intentGraph";
import { useLanguage } from "../../context/LanguageContext";

const RECENT_SEARCHES_STORAGE_KEY = "shopno_recent_searches";
const MAX_RECENT_SEARCHES = 8;

export interface SearchAutocompleteDropdownProps {
  query: string;
  onSelectDestination: (dest: { name: string; hub?: TravelHub }) => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Text component that splits text into matched query substring and highlights it
 */
export const HighlightedQueryText: React.FC<{
  text: string;
  query: string;
  style?: any;
  highlightStyle?: any;
}> = ({ text, query, style, highlightStyle }) => {
  if (!query || !query.trim()) {
    return <Text style={style}>{text}</Text>;
  }

  const cleanQuery = query.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(cleanQuery);

  if (matchIndex === -1) {
    return <Text style={style}>{text}</Text>;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + cleanQuery.length);
  const after = text.slice(matchIndex + cleanQuery.length);

  return (
    <Text style={style}>
      {before}
      <Text style={[styles.highlightedText, highlightStyle]}>{match}</Text>
      {after}
    </Text>
  );
};

export const SearchAutocompleteDropdown: React.FC<SearchAutocompleteDropdownProps> = ({
  query,
  onSelectDestination,
  onClose,
  style,
}) => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const { results, topDestinations, isLoading } = useSearchAutocomplete(query, {
    limit: 8,
    enableFuzzy: true,
  });

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
          }
        }
      } catch (e) {
        // Fallback to defaults
        setRecentSearches(["Cox's Bazar", "Sajek Valley", "Sylhet", "Bangkok"]);
      }
    };
    loadRecentSearches();
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      let list: string[] = stored ? JSON.parse(stored) : [];
      list = [clean, ...list.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      setRecentSearches(list);
      await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }, []);

  const handleRemoveRecent = async (item: string) => {
    const updated = recentSearches.filter((x) => x !== item);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleClearAllRecent = async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {}
  };

  const handleSelect = (destName: string, hub?: TravelHub) => {
    saveRecentSearch(destName);
    onSelectDestination({ name: destName, hub });
    onClose?.();
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case "AIRPORT":
        return "airplane";
      case "HOTEL":
        return "bed";
      case "TRAIN_STATION":
        return "train";
      case "BUS_TERMINAL":
        return "bus";
      case "LAUNCH_TERMINAL":
        return "boat";
      case "TOURIST_SPOT":
      default:
        return "location-sharp";
    }
  };

  const isQueryActive = query && query.trim().length >= 2;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>
              {isBn ? "গন্তব্য খোঁজা হচ্ছে..." : "Searching destinations..."}
            </Text>
          </View>
        )}

        {/* 1. Autocomplete Live Matches with Highlighted Substring */}
        {isQueryActive && results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isBn ? "পরামর্শকৃত গন্তব্য" : "Suggested Destinations"}
            </Text>
            {results.map((match: AutocompleteMatch, idx: number) => {
              const hub = match.hub;
              const iconName = getCategoryIcon(hub?.category);
              return (
                <Pressable
                  key={`match-${hub?.id || idx}`}
                  style={styles.suggestionRow}
                  onPress={() => handleSelect(hub?.name || match.matchedText, hub)}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name={iconName as any} size={16} color="#2563eb" />
                  </View>
                  <View style={styles.suggestionTextContainer}>
                    <HighlightedQueryText
                      text={hub?.name || match.matchedText}
                      query={query}
                      style={styles.suggestionTitle}
                      highlightStyle={styles.highlightTextBold}
                    />
                    <Text style={styles.suggestionSubtitle}>
                      {(hub as any)?.district || (hub as any)?.division || hub?.region || hub?.country || "Bangladesh"}{" "}
                      {hub?.code ? `• (${hub.code})` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 2. No Results with Query */}
        {isQueryActive && !isLoading && results.length === 0 && (
          <View style={styles.noResultsBox}>
            <Ionicons name="search-outline" size={32} color="#94a3b8" />
            <Text style={styles.noResultsText}>
              {isBn
                ? `"${query}" এর জন্য কোনো গন্তব্য পাওয়া যায়নি`
                : `No destinations matching "${query}"`}
            </Text>
            <Text style={styles.noResultsSubtext}>
              {isBn
                ? "বানান পরীক্ষা করুন বা জনপ্রিয় স্থানগুলো দেখুন।"
                : "Check spelling or pick from popular hubs below."}
            </Text>
          </View>
        )}

        {/* 3. Recent Searches Section */}
        {(!isQueryActive || results.length === 0) && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.sectionTitle}>
                  {isBn ? "সাম্প্রতিক সার্চ" : "Recent Searches"}
                </Text>
              </View>
              <Pressable onPress={handleClearAllRecent} hitSlop={8}>
                <Text style={styles.clearAllText}>{isBn ? "সব মুছুন" : "Clear All"}</Text>
              </Pressable>
            </View>

            {recentSearches.map((item, idx) => (
              <View key={`recent-${idx}`} style={styles.recentRow}>
                <Pressable
                  style={styles.recentRowContent}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons name="arrow-undo-outline" size={15} color="#94a3b8" />
                  <Text style={styles.recentText}>{item}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRemoveRecent(item)}
                  style={styles.removeRecentBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={15} color="#94a3b8" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* 4. Popular Destinations Section */}
        {(!isQueryActive || results.length === 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="flame" size={16} color="#f97316" />
              <Text style={styles.sectionTitle}>
                {isBn ? "জনপ্রিয় ভ্রমণ স্থান" : "Popular Destinations"}
              </Text>
            </View>

            <View style={styles.chipsWrap}>
              {topDestinations.slice(0, 8).map((dest, idx) => (
                <Pressable
                  key={`popular-${dest.id || idx}`}
                  style={styles.popularChip}
                  onPress={() => handleSelect(dest.name, dest)}
                >
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.popularChipText}>{dest.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    maxHeight: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.1)" } : {}),
    overflow: "hidden",
  },
  scrollContent: {
    padding: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  highlightedText: {
    color: "#2563eb",
    fontWeight: "800",
    backgroundColor: "#eff6ff",
  },
  highlightTextBold: {
    color: "#2563eb",
    fontWeight: "900",
    backgroundColor: "#dbeafe",
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  recentRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  recentText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  removeRecentBtn: {
    padding: 4,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  popularChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  popularChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  noResultsBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
    textAlign: "center",
  },
  noResultsSubtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
});

export default SearchAutocompleteDropdown;
