/**
 * Advertisement Management Screen - Admin Panel
 * Manage advertisements, placements, and monetization
 */

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { adService, adminService } from "@/services/adminService";
import { Advertisement, AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

/**
 * Ad Status Badge
 */
const AdStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<
    string,
    { color: string; icon: string; label: string }
  > = {
    active: {
      color: "#10b981",
      icon: "check-circle",
      label: "Active",
    },
    pending: {
      color: "#f59e0b",
      icon: "clock",
      label: "Pending Review",
    },
    rejected: {
      color: "#ef4444",
      icon: "x-circle",
      label: "Rejected",
    },
    paused: {
      color: "#8b5cf6",
      icon: "pause-circle",
      label: "Paused",
    },
    expired: {
      color: "#6b7280",
      icon: "calendar-check",
      label: "Expired",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${config.color}20`, borderColor: config.color },
      ]}
    >
      <MaterialCommunityIcons
        name={config.icon as any}
        size={14}
        color={config.color}
      />
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

/**
 * Ad Card Component
 */
const AdCard: React.FC<{
  ad: Advertisement;
  onPress: (ad: Advertisement) => void;
}> = ({ ad, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(ad)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.adCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <LinearGradient
              colors={["#f59e0b", "#f97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons name="bullhorn" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.adTitle} numberOfLines={1}>
              {ad.ad_name}
            </Text>
            <Text style={styles.advertiserName} numberOfLines={1}>
              {ad.advertiser_id || "Advertiser"}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {ad.content_url && (
            <Text style={styles.adDescription} numberOfLines={2}>
              {ad.content_url}
            </Text>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Impressions</Text>
              <Text style={styles.statValue}>{ad.impression_count || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Clicks</Text>
              <Text style={styles.statValue}>{ad.click_count || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>CTR</Text>
              <Text style={styles.statValue}>
                {ad.impression_count
                  ? ((ad.click_count / ad.impression_count) * 100).toFixed(1)
                  : 0}
                %
              </Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Budget</Text>
              <Text style={styles.detailValue}>${ad.budget_allocated?.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Spent</Text>
              <Text style={styles.detailValue}>${ad.budget_spent?.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {ad.ad_type?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar" size={12} color="#6b7280" />
            <Text style={styles.dateText}>
              {new Date(ad.start_date).toLocaleDateString()} -{" "}
              {new Date(ad.end_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <AdStatusBadge status={ad.status} />
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="chart-line"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="pencil" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Advertisement Management Screen
 */
export const AdvertisementScreen: React.FC<{ admin: AdminUser | null }> = ({
  admin,
}) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadAds();
  }, [filterStatus]);

  const loadAds = async () => {
    setLoading(true);
    try {
      const allAds = await adService.getAllAds(filterStatus);
      setAds(allAds);
    } catch (error) {
      console.error("Error loading ads:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    setRefreshing(false);
  };

  const handleAdPress = (ad: Advertisement) => {
    Alert.alert("Ad Details", `${ad.ad_name}\n\nStatus: ${ad.status}`);
  };

  const statuses = [
    "all",
    "active",
    "pending",
    "paused",
    "expired",
    "rejected",
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#f97316", "#fb923c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Advertisement Management</Text>
        <Text style={styles.headerSubtitle}>
          Manage ads and track performance
        </Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterTabs}
        contentContainerStyle={styles.filterTabsContent}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === status && styles.filterTabTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={ads}
          renderItem={({ item }) => (
            <AdCard ad={item} onPress={handleAdPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="bullhorn"
                size={64}
                color="#d1d5db"
              />
              <Text style={styles.emptyText}>No advertisements found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#ffffff80",
  },
  filterTabs: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: "#f97316",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 15,
  },
  adCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  advertiserName: {
    fontSize: 12,
    color: "#6b7280",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardContent: {
    gap: 12,
    marginBottom: 12,
  },
  adDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 8,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusRow: {
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#667eea",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
});

export default AdvertisementScreen;
