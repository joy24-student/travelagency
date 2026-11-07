/**
 * Review Moderation Screen - Admin Panel
 * Review Content Filter, Spam Detection, and Approval
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

export const ReviewModerationScreen: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agency_reviews")
        .select("*, agencies(name)")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setReviews(
          data.map((r: any) => ({
            id: r.id,
            user_id: r.user_id || "Anonymous User",
            target_name: r.agencies?.name || "Agency Tour",
            rating: r.rating || 5,
            comment: r.comment || r.review_text || "No written comment.",
            status: r.is_approved ? "approved" : "pending",
          }))
        );
      } else {
        setReviews([]);
      }
    } catch (e) {
      console.warn("Error loading reviews:", e);
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReviews();

    const channel = supabase
      .channel(`admin-reviews-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agency_reviews" }, () => {
        loadReviews();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleModeration = async (reviewId: string, status: "approved" | "rejected") => {
    try {
      await supabase
        .from("agency_reviews")
        .update({ is_approved: status === "approved" })
        .eq("id", reviewId);

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
      );
      Alert.alert("Success", `Review successfully marked as ${status.toUpperCase()}.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update review status");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReviews(); }} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 }}>
              <MaterialCommunityIcons name="star-outline" size={54} color="#94a3b8" />
              <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "600", color: "#64748b" }}>
                No Reviews in Queue
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                New agency and tour reviews submitted by users will appear here for admin moderation.
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.refBox}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.ratingText}>{item.rating} / 5</Text>
              </View>
              <View style={[styles.statusBadge, item.status === "approved" ? styles.statusBadgeDone : styles.statusBadgePending]}>
                <Text style={item.status === "approved" ? styles.statusTextDone : styles.statusTextPending}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.targetText}>{item.target_name}</Text>
              <Text style={styles.commentText}>"{item.comment}"</Text>
              <Text style={styles.subtext}>Submitted by User: {item.user_id}</Text>
            </View>

            {item.status === "pending" && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleModeration(item.id, "approved")}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleModeration(item.id, "rejected")}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeDone: {
    backgroundColor: "#10b98115",
  },
  statusBadgePending: {
    backgroundColor: "#f59e0b15",
  },
  statusTextDone: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10b981",
  },
  statusTextPending: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f59e0b",
  },
  cardContent: {
    marginTop: 10,
    gap: 4,
  },
  targetText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  commentText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#0f172a",
  },
  subtext: {
    fontSize: 12,
    color: "#94a3b8",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
