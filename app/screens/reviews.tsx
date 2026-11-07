import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { useAuth } from "../../src/hooks/useAuth";
import { supabase } from "../../src/utils/supabase";
import { withErrorBoundary } from "../../src/components/common/ErrorBoundaryView";
import { ErrorStateCard } from "../../src/components/common/ErrorStateCard";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { EmptyState } from "../../src/components/ui/EmptyState";

const PRIMARY = "#287dfa";

function ReviewsScreenInner() {
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadReviews = async () => {
      try {
        setLoading(true);
        // Fetch user's hotel reviews
        const { data, error } = await supabase
          .from("hotel_reviews")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error("Error loading reviews:", err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    if (daysAgo < 365) return `${Math.floor(daysAgo / 30)} months ago`;
    return `${Math.floor(daysAgo / 365)} years ago`;
  };

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={PRIMARY} />
        </Pressable>
        <Text style={styles.title}>Reviews</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={[styles.scroll, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Trust & Authenticity Guarantee Banner */}
          <View style={styles.trustBanner}>
            <View style={styles.trustBannerHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
              <Text style={styles.trustBannerTitle}>
                বিশ্বস্ততা ও সততা নিশ্চয়তা (Trust & Honesty)
              </Text>
            </View>
            <Text style={styles.trustBannerText}>
              শুধুমাত্র প্ল্যাটফর্মে সম্পন্ন ভ্রমণের পরই অতিথিরা রিভিউ জমা দিতে পারেন। প্রতিটি আসল রিভিউতে "যাচাইকৃত অতিথি" ব্যাজ সংযুক্ত থাকে।
            </Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>কোনো রিভিউ নেই</Text>
              <Text style={styles.emptySubtitle}>
                আপনার ভ্রমণ সম্পন্ন হওয়ার পর এখানে যাচাইকৃত রিভিউ লিখুন
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={{ flex: 1, marginEnd: 8 }}>
                    <Text style={styles.reviewLocation}>{review.hotel_name || review.location}</Text>
                    {/* Verified Guest & Completed Stay Badges */}
                    <View style={styles.verifiedRow}>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={11} color="#059669" />
                        <Text style={styles.verifiedBadgeText}>যাচাইকৃত অতিথি (Verified Guest)</Text>
                      </View>
                      <View style={styles.completedStayBadge}>
                        <Ionicons name="checkmark-done" size={11} color="#2563EB" />
                        <Text style={styles.completedStayBadgeText}>সম্পন্ন ভ্রমণ</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={`star-${(review as any).id || "r"}-${i}`}
                        name={i < (review.rating || 0) ? "star" : "star-outline"}
                        size={14}
                        color="#f59e0b"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.comment || review.review}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1, textAlign: "center" },
  spacer: { width: 32 },
  scroll: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySubtitle: { fontSize: 14, color: "#9ca3af" },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewLocation: { fontSize: 15, fontWeight: "700", color: "#111827" },
  ratingRow: { flexDirection: "row", gap: 2 },
  reviewText: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 12, color: "#9ca3af" },
  trustBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  trustBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  trustBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
  },
  trustBannerText: {
    fontSize: 12,
    color: "#047857",
    lineHeight: 18,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  completedStayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  completedStayBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
  },
});

export default withErrorBoundary(ReviewsScreenInner, {
  screenName: "ReviewsScreen",
});
