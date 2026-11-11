import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Platform,
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/hooks/useAuth";
import { bookingRepository } from "../../src/services/repositories/booking";
import { savedItemsService, SavedItem } from "../../src/services/savedItemsService";
import { withErrorBoundary } from "../../src/components/common/ErrorBoundaryView";

const PRIMARY = "#0055F2";

type CategoryFilter = "all" | "hotel" | "package" | "flight" | "post" | "booking";

function SavedScreenInner() {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [draftBookings, setDraftBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    // Subscribe to savedItemsService
    const unsubscribe = savedItemsService.subscribe((items) => {
      setSavedItems(items);
      setLoading(false);
    });

    // Also load user draft bookings from Supabase
    if (user?.id) {
      bookingRepository
        .getUserBookings(user.id, "draft")
        .then((bookings) => {
          setDraftBookings(bookings || []);
        })
        .catch((err) => {
          console.warn("[SavedScreen] failed to load draft bookings:", err);
        });
    }

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Combine saved items & draft bookings into a unified list
  const combinedItems = useMemo(() => {
    const list: (SavedItem & { isDraftBooking?: boolean })[] = [...savedItems];

    draftBookings.forEach((b) => {
      // Avoid duplicates if already present
      if (!list.some((it) => it.id === b.id)) {
        list.push({
          id: b.id,
          type: (b.type as any) || "booking",
          title: b.title || b.name || "Draft Booking",
          subtitle: b.reference ? `রেফারেন্স: ${b.reference}` : "সংরক্ষিত ড্রাফট বুকিং",
          destination: b.destination || "বাংলাদেশ",
          price: b.total_amount || b.price,
          totalPriceWithTax: b.total_amount || b.price,
          savedAt: b.created_at || new Date().toISOString(),
          route: "/screens/booking-system",
          isDraftBooking: true,
        });
      }
    });

    if (activeCategory === "all") return list;
    if (activeCategory === "booking") {
      return list.filter((i) => i.isDraftBooking || i.type === "other");
    }
    return list.filter((i) => i.type === activeCategory);
  }, [savedItems, draftBookings, activeCategory]);

  const handleRemove = useCallback(async (item: SavedItem & { isDraftBooking?: boolean }) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await savedItemsService.removeSavedItem(item.id);
    if (item.isDraftBooking) {
      setDraftBookings((prev) => prev.filter((b) => b.id !== item.id));
    }
  }, []);

  const handleItemPress = useCallback((item: SavedItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (item.route) {
      router.push(item.route as any);
    } else if (item.type === "hotel") {
      router.push({ pathname: "/screens/search-stays" as any, params: { hotelId: item.id } });
    } else if (item.type === "package") {
      router.push({ pathname: "/screens/packages" as any, params: { packageId: item.id } });
    } else if (item.type === "flight") {
      router.push("/screens/flights" as any);
    } else {
      router.push("/screens/search" as any);
    }
  }, []);

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "hotel":
        return "bed-outline";
      case "flight":
        return "airplane-outline";
      case "package":
        return "briefcase-outline";
      case "post":
        return "newspaper-outline";
      default:
        return "bookmark-outline";
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case "hotel":
        return "#0D9488";
      case "flight":
        return "#0055F2";
      case "package":
        return "#EA580C";
      case "post":
        return "#7C3AED";
      default:
        return PRIMARY;
    }
  };

  const categoryCounts = useMemo(() => {
    const all = savedItems.length + draftBookings.length;
    const hotels = savedItems.filter((i) => i.type === "hotel").length;
    const packages = savedItems.filter((i) => i.type === "package").length;
    const flights = savedItems.filter((i) => i.type === "flight").length;
    const posts = savedItems.filter((i) => i.type === "post").length;
    const bookings = draftBookings.length;
    return { all, hotels, packages, flights, posts, bookings };
  }, [savedItems, draftBookings]);

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>সংরক্ষিত আইটেম (Saved)</Text>
          <Text style={styles.subtitle}>{combinedItems.length}টি আইটেম সংরক্ষিত আছে</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Category Tabs */}
      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          data={[
            { id: "all", label: "সব", count: categoryCounts.all },
            { id: "hotel", label: "হোটেল", count: categoryCounts.hotels },
            { id: "package", label: "প্যাকেজ", count: categoryCounts.packages },
            { id: "flight", label: "ফ্লাইট", count: categoryCounts.flights },
            { id: "post", label: "কমিউনিটি", count: categoryCounts.posts },
            { id: "booking", label: "ড্রাফট বুকিং", count: categoryCounts.bookings },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <Pressable
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setActiveCategory(item.id as CategoryFilter);
                }}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {item.label}
                </Text>
                {item.count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                      {item.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>সংরক্ষিত আইটেম লোড হচ্ছে...</Text>
        </View>
      ) : combinedItems.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="heart-dislike-outline" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>কোনো সংরক্ষিত আইটেম নেই</Text>
          <Text style={styles.emptyDesc}>
            ভ্রমণের সময় যে কোনো হোটেল, প্যাকেজ বা পোস্টের হার্ট বা সেভ আইকনে ট্যাপ করলেই এখানে যুক্ত হয়ে যাবে।
          </Text>

          <Pressable
            style={styles.exploreBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              router.push("/screens/explore" as any);
            }}
          >
            <Ionicons name="compass" size={18} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>জনপ্রিয় গন্তব্য খুঁজুন</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={combinedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const iconName = getCategoryIcon(item.type);
            const themeColor = getCategoryColor(item.type);

            return (
              <Pressable style={styles.itemCard} onPress={() => handleItemPress(item)}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.fallbackIconBox, { backgroundColor: `${themeColor}15` }]}>
                    <Ionicons name={iconName as any} size={28} color={themeColor} />
                  </View>
                )}

                <View style={styles.cardDetails}>
                  <View style={styles.categoryPillRow}>
                    <View style={[styles.typePill, { backgroundColor: `${themeColor}12` }]}>
                      <Ionicons name={iconName as any} size={11} color={themeColor} />
                      <Text style={[styles.typePillText, { color: themeColor }]}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                    {item.rating ? (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.itemSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  {item.destination ? (
                    <View style={styles.locRow}>
                      <Ionicons name="location-outline" size={12} color="#64748B" />
                      <Text style={styles.locText} numberOfLines={1}>
                        {item.destination}
                      </Text>
                    </View>
                  ) : null}

                  {item.price ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>
                        ৳{typeof item.price === "number" ? item.price.toLocaleString() : item.price}
                      </Text>
                      {item.totalPriceWithTax && (
                        <Text style={styles.taxIncludedText}>
                          (ট্যাক্সসহ ৳
                          {typeof item.totalPriceWithTax === "number"
                            ? item.totalPriceWithTax.toLocaleString()
                            : item.totalPriceWithTax}
                          )
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>

                {/* Remove button */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </Pressable>
            );
          }}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  tabContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabList: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 6,
  },
  tabChipActive: { backgroundColor: PRIMARY },
  tabChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  tabChipTextActive: { color: "#FFFFFF" },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  countBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  countBadgeTextActive: { color: "#FFFFFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: "#1E293B" },
  emptyDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 25,
    marginTop: 8,
  },
  exploreBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.05)" } : {}),
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemImage: { width: 84, height: 84, borderRadius: 12, backgroundColor: "#E2E8F0" },
  fallbackIconBox: {
    width: 84,
    height: 84,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDetails: { flex: 1, gap: 3 },
  categoryPillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  typePillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  itemTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  itemSubtitle: { fontSize: 12, color: "#64748B" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 11, color: "#64748B" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  priceText: { fontSize: 15, fontWeight: "800", color: "#059669" },
  taxIncludedText: { fontSize: 11, color: "#64748B" },
  deleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignSelf: "flex-start",
  },
});

export default withErrorBoundary(SavedScreenInner, {
  screenName: "SavedScreen",
});
