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
  onToggleStatus: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
}> = ({ ad, onPress, onToggleStatus, onDelete }) => {
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
              {ad.content_url || "Target URL"}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {ad.media_url && (
            <Text style={styles.adDescription} numberOfLines={1}>
              Image: {ad.media_url}
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
        </View>

        <View style={styles.statusRow}>
          <AdStatusBadge status={ad.status} />
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ad.status === 'active' ? '#fef3c7' : '#dcfce7' }]}
            onPress={() => onToggleStatus(ad)}
          >
            <Ionicons
              name={ad.status === 'active' ? "pause-outline" : "play-outline"}
              size={14}
              color={ad.status === 'active' ? "#d97706" : "#16a34a"}
            />
            <Text style={[styles.actionButtonText, { color: ad.status === 'active' ? "#d97706" : "#16a34a" }]}>
              {ad.status === 'active' ? "Pause Ad" : "Activate"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
            onPress={() => onDelete(ad)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: "#ef4444" }]}>Delete</Text>
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("/screens/search-stays");

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

  const handleToggleStatus = async (ad: Advertisement) => {
    try {
      const updatedStatus = await adService.toggleAdStatus(ad.id, ad.status);
      setAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: updatedStatus as any } : a));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update ad status");
    }
  };

  const handleDelete = (ad: Advertisement) => {
    Alert.alert(
      "Confirm Delete",
      `Delete ad "${ad.ad_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adService.deleteAd(ad.id);
              setAds(prev => prev.filter(a => a.id !== ad.id));
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete ad");
            }
          }
        }
      ]
    );
  };

  const handleCreateAd = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Validation", "Please enter an ad title");
      return;
    }
    try {
      await adService.createAd({
        title: newTitle.trim(),
        banner_url: newBannerUrl.trim() || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
        target_url: newTargetUrl.trim() || "/screens/search-stays",
        placement: "home_banner",
        status: "active" as any,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewBannerUrl("");
      await loadAds();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create ad");
    }
  };

  const handleAdPress = (ad: Advertisement) => {
    Alert.alert("Ad Details", `${ad.ad_name}\n\nStatus: ${ad.status}\nURL: ${ad.content_url}`);
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.headerTitle}>Advertisement Management</Text>
            <Text style={styles.headerSubtitle}>
              Manage ads and track performance
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createAdBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={18} color="#f97316" />
            <Text style={styles.createAdBtnText}>New Ad</Text>
          </TouchableOpacity>
        </View>
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
            <AdCard
              ad={item}
              onPress={handleAdPress}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
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

      {/* Create New Ad Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Advertisement</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Banner Title / Promo</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Explore Asia — Deals Up to 50% Off"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Banner Image URL (Unsplash or CDN)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://images.unsplash.com/photo-..."
                value={newBannerUrl}
                onChangeText={setNewBannerUrl}
              />

              <Text style={styles.inputLabel}>Target Screen Route</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="/screens/search-stays or /screens/flights"
                value={newTargetUrl}
                onChangeText={setNewTargetUrl}
              />

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleCreateAd}
              >
                <Text style={styles.submitModalBtnText}>Save & Publish Banner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  createAdBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createAdBtnText: {
    color: "#f97316",
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
  },
  submitModalBtn: {
    backgroundColor: "#f97316",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  submitModalBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default AdvertisementScreen;
