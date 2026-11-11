import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { itineraryService } from "../../src/services/itineraryService";
import { Itinerary, TravelCategory } from "../../src/types/itinerary";
import { formatPrice } from "../../src/utils/currency";

const CATEGORIES: { key: TravelCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All Trips", icon: "compass-outline" },
  { key: "adventure", label: "Adventure", icon: "trail-sign-outline" },
  { key: "budget", label: "Budget", icon: "wallet-outline" },
  { key: "luxury", label: "Luxury", icon: "diamond-outline" },
  { key: "family", label: "Family", icon: "people-outline" },
  { key: "couple", label: "Couple", icon: "heart-outline" },
  { key: "weekend", label: "Weekend", icon: "time-outline" },
  { key: "nature", label: "Nature & Eco", icon: "leaf-outline" },
];

export default function ExploreTripsScreen() {
  const { colors, isDark } = useTheme();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TravelCategory>("all");
  const [sortBy, setSortBy] = useState<"popular" | "latest" | "budget_low">("popular");

  const loadItineraries = async () => {
    try {
      setLoading(true);
      const data = await itineraryService.getMarketplaceItineraries({
        category: selectedCategory,
        sortBy,
      });
      setItineraries(data);
    } catch (err) {
      console.error("Failed to load itineraries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItineraries();
  }, [selectedCategory, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    loadItineraries();
  };

  const filteredItineraries = useMemo(() => {
    if (!searchQuery.trim()) return itineraries;
    const q = searchQuery.toLowerCase();
    return itineraries.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.destination.toLowerCase().includes(q) ||
        it.destination_country.toLowerCase().includes(q)
    );
  }, [itineraries, searchQuery]);

  const renderItineraryCard = ({ item }: { item: Itinerary }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          borderColor: isDark ? colors.border : "#E2E8F0",
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: ROUTES.SCREENS.ITINERARY_DETAILS,
          params: { id: item.id },
        });
      }}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.cover_image }} style={styles.coverImage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Top Floating Badges */}
        <View style={styles.topBadgesRow}>
          <View style={styles.daysBadge}>
            <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
            <Text style={styles.daysBadgeText}>{item.duration_days} Days</Text>
          </View>

          {/* Quick arrow button from user-provided reference Image 1 & 2 */}
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" style={{ transform: [{ rotate: "45deg" }] }} />
          </View>
        </View>

        {/* Bottom Image Overlay: Location Pin & Destination */}
        <View style={styles.bottomImageOverlay}>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color="#FFFFFF" />
            <Text style={styles.locationText}>{item.destination}, {item.destination_country}</Text>
          </View>
          <Text style={styles.imageTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </View>

      {/* Card Footer Info */}
      <View style={styles.cardFooter}>
        <View style={styles.creatorRow}>
          <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.creatorName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.creator?.display_name || "Verified Traveler"}
          </Text>
          <View style={styles.clonePill}>
            <Ionicons name="copy-outline" size={11} color="#287dfa" />
            <Text style={styles.clonePillText}>{item.clone_count} Clones</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceAndActionRow}>
          <View>
            <Text style={[styles.estBudgetLabel, { color: colors.textSecondary }]}>Est. Budget</Text>
            <Text style={[styles.estBudgetValue, { color: colors.primary }]}>
              {formatPrice(item.estimated_budget, (item.currency as any) || "BDT")}
              <Text style={styles.perPersonText}> / person</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cloneButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: ROUTES.SCREENS.ITINERARY_CLONE,
                params: { id: item.id },
              });
            }}
          >
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.cloneButtonText}>Clone Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Explore Trips</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Clonable itineraries from top creators
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createItineraryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(ROUTES.SCREENS.ITINERARY_BUILDER);
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search Cox's Bazar, Sylhet, Sajek..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Horizontal Bar */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? colors.card
                      : "#F1F5F9",
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.key);
                }}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? "#FFFFFF" : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: isSelected ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading curated itineraries...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItineraries}
          keyExtractor={(item) => item.id}
          renderItem={renderItineraryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Itineraries Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try adjusting your search query or explore other categories.
              </Text>
            </View>
          }
        />
      )}
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  createItineraryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  imageWrapper: {
    height: 200,
    position: "relative",
    justifyContent: "space-between",
    padding: 12,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  daysBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomImageOverlay: {
    gap: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.medium,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: FONTS.bold,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardFooter: {
    padding: 14,
    gap: 10,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creatorName: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  clonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  clonePillText: {
    color: "#287DFA",
    fontSize: 11,
    fontFamily: FONTS.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    opacity: 0.5,
  },
  priceAndActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  estBudgetLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  estBudgetValue: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  perPersonText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: "#64748B",
  },
  cloneButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  cloneButtonText: {
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
