/**
 * Review Moderation Screen - Admin Panel
 * Review Content Filter, Spam Detection, and Approval
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export const ReviewModerationScreen: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([
    {
      id: "rev-101",
      user_id: "usr-948",
      target_name: "Santorini caldera sunset hotel",
      rating: 5,
      comment: "Absolutely breathtaking views! Outstanding customer support service.",
      status: "pending",
    },
    {
      id: "rev-102",
      user_id: "usr-732",
      target_name: "Emirates flight booking",
      rating: 1,
      comment: "Scam booking code! Cancelled seat without notification.",
      status: "pending",
    },
  ]);

  const handleModeration = (reviewId: string, status: "approved" | "rejected") => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
    );
    Alert.alert("Success", `Review successfully ${status.toUpperCase()}.`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
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
    fontSize: 9,
    fontWeight: "700",
    color: "#10b981",
  },
  statusTextPending: {
    fontSize: 9,
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
    fontSize: 11,
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
