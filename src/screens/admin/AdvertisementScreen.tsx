/**
 * Advertisement & Banner Management Screen - Admin Panel
 * Change any banner text, subtitle, badge, action button, target screen, and images in real-time.
 */

import React, { useState, useEffect, useCallback } from "react";
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
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { adService } from "@/services/adminService";
import { Advertisement, AdminUser } from "@/types/admin";
import { EmptyState } from "@/components/ui/EmptyState";
import { withErrorBoundary } from "@/components/common";
import { DestructiveConfirmModal } from "./DestructiveConfirmModal";

const { width } = Dimensions.get("window");

const PRESET_BANNER_IMAGES = [
  { label: "Tropical Beach Resort", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
  { label: "Airplane in Clouds", url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800" },
  { label: "Luxury Infinity Pool", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800" },
  { label: "Mountain Trek & Nature", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
  { label: "Urban Tokyo Cityscape", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800" },
];

/**
 * Ad Status Badge
 */
const AdStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
    active: { color: "#10b981", icon: "check-circle", label: "Active" },
    pending: { color: "#f59e0b", icon: "clock", label: "Pending" },
    paused: { color: "#8b5cf6", icon: "pause-circle", label: "Paused" },
    expired: { color: "#6b7280", icon: "calendar-check", label: "Expired" },
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <View style={[styles.badge, { backgroundColor: `${config.color}20`, borderColor: config.color }]}>
      <MaterialCommunityIcons name={config.icon as any} size={13} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

/**
 * Ad Card Component
 */
const AdCard: React.FC<{
  ad: Advertisement;
  onPress: (ad: Advertisement) => void;
  onEdit: (ad: Advertisement) => void;
  onToggleStatus: (ad: Advertisement) => void;
  onDelete: (ad: Advertisement) => void;
}> = ({ ad, onPress, onEdit, onToggleStatus, onDelete }) => {
  const imgUrl = ad.banner_url || ad.media_url || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800";

  return (
    <View style={styles.adCard}>
      {/* Banner Preview Thumbnail */}
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: imgUrl }} style={styles.thumbnailImage} />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.8)"]}
          style={styles.thumbnailGradient}
        >
          <View style={styles.thumbnailTopBadgeRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{ad.badge_text || "FEATURED"}</Text>
            </View>
            <AdStatusBadge status={ad.status} />
          </View>

          <View style={styles.thumbnailBottomContent}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {ad.title || ad.ad_name}
            </Text>
            <Text style={styles.previewSubtitle} numberOfLines={1}>
              {ad.subtitle || "Special promotional banner"}
            </Text>
            <View style={styles.previewBtnPill}>
              <Text style={styles.previewBtnText}>{ad.button_text || "View Deals →"}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Meta & Stats */}
      <View style={styles.cardContent}>
        <View style={styles.routeRow}>
          <Feather name="navigation" size={12} color="#64748b" />
          <Text style={styles.routeText} numberOfLines={1}>
            Route: {ad.target_url || ad.content_url || "/screens/search-stays"}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Clicks</Text>
            <Text style={styles.statValue}>{ad.click_count || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Impressions</Text>
            <Text style={styles.statValue}>{ad.impression_count || 1200}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CTR</Text>
            <Text style={styles.statValue}>
              {ad.impression_count
                ? ((ad.click_count / ad.impression_count) * 100).toFixed(1)
                : 3.4}
              %
            </Text>
          </View>
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#eef2ff" }]}
          onPress={() => onEdit(ad)}
        >
          <MaterialCommunityIcons name="pencil" size={14} color="#4f46e5" />
          <Text style={[styles.actionButtonText, { color: "#4f46e5" }]}>Modify Banner Text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: ad.status === "active" ? "#fef3c7" : "#dcfce7" },
          ]}
          onPress={() => onToggleStatus(ad)}
        >
          <Ionicons
            name={ad.status === "active" ? "pause-outline" : "play-outline"}
            size={14}
            color={ad.status === "active" ? "#d97706" : "#16a34a"}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: ad.status === "active" ? "#d97706" : "#16a34a" },
            ]}
          >
            {ad.status === "active" ? "Pause" : "Activate"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#fee2e2", flex: 0.6 }]}
          onPress={() => onDelete(ad)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={14} color="#ef4444" />
          <Text style={[styles.actionButtonText, { color: "#ef4444" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Advertisement Management Screen
 */
const AdvertisementScreenComponent: React.FC<{ admin: AdminUser | null }> = ({ admin }) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteTargetAd, setDeleteTargetAd] = useState<Advertisement | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal State (Create & Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formBadgeText, setFormBadgeText] = useState("FEATURED");
  const [formButtonText, setFormButtonText] = useState("View Deals →");
  const [formBannerUrl, setFormBannerUrl] = useState("https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800");
  const [formTargetUrl, setFormTargetUrl] = useState("/screens/search-stays");

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const allAds = await adService.getAllAds(filterStatus);
      setAds(allAds || []);
    } catch (err: any) {
      console.error("Error loading ads:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    setRefreshing(false);
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingAdId(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormBadgeText("FEATURED");
    setFormButtonText("View Deals →");
    setFormBannerUrl("https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800");
    setFormTargetUrl("/screens/search-stays");
    setModalVisible(true);
  };

  const handleOpenEdit = (ad: Advertisement) => {
    setIsEditing(true);
    setEditingAdId(ad.id);
    setFormTitle(ad.title || ad.ad_name || "");
    setFormSubtitle(ad.subtitle || "");
    setFormBadgeText(ad.badge_text || "FEATURED");
    setFormButtonText(ad.button_text || "View Deals →");
    setFormBannerUrl(ad.banner_url || ad.media_url || "");
    setFormTargetUrl(ad.target_url || ad.content_url || "/screens/search-stays");
    setModalVisible(true);
  };

  const handleSaveBanner = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Validation", "Please enter a banner title.");
      return;
    }

    try {
      if (isEditing && editingAdId) {
        await adService.updateAd(editingAdId, {
          title: formTitle.trim(),
          subtitle: formSubtitle.trim(),
          badge_text: formBadgeText.trim() || "FEATURED",
          button_text: formButtonText.trim() || "View Deals →",
          banner_url: formBannerUrl.trim(),
          target_url: formTargetUrl.trim(),
        });
        Alert.alert("Success", "Banner text and styling updated live!");
      } else {
        await adService.createAd({
          title: formTitle.trim(),
          subtitle: formSubtitle.trim(),
          badge_text: formBadgeText.trim() || "FEATURED",
          button_text: formButtonText.trim() || "View Deals →",
          banner_url: formBannerUrl.trim(),
          target_url: formTargetUrl.trim(),
          placement: "home_banner",
          status: "active" as any,
        });
        Alert.alert("Success", "New banner published live to the home screen!");
      }

      setModalVisible(false);
      await loadAds();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save banner.");
    }
  };

  const handleToggleStatus = async (ad: Advertisement) => {
    try {
      const updatedStatus = await adService.toggleAdStatus(ad.id, ad.status);
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, status: updatedStatus as any } : a))
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update ad status");
    }
  };

  const handleDelete = (ad: Advertisement) => {
    setDeleteTargetAd(ad);
  };

  const handleConfirmDeleteAd = async () => {
    if (!deleteTargetAd) return;
    setIsDeleting(true);
    try {
      await adService.deleteAd(deleteTargetAd.id);
      setAds((prev) => prev.filter((a) => a.id !== deleteTargetAd.id));
      setDeleteTargetAd(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete ad");
    } finally {
      setIsDeleting(false);
    }
  };

  const statuses = ["all", "active", "paused"];

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <LinearGradient
        colors={["#ea580c", "#f97316"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>App Banners & Ads</Text>
            <Text style={styles.headerSubtitle}>
              Customize banner texts, photos & buttons live on mobile apps
            </Text>
          </View>
          <TouchableOpacity style={styles.createAdBtn} onPress={handleOpenCreate}>
            <Ionicons name="add" size={18} color="#ea580c" />
            <Text style={styles.createAdBtnText}>New Banner</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterTabText, filterStatus === status && styles.filterTabTextActive]}>
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      ) : (
        <FlatList
          data={ads}
          renderItem={({ item }) => (
            <AdCard
              ad={item}
              onPress={handleOpenEdit}
              onEdit={handleOpenEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item, index) => item?.id ? String(item.id) : `ad-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              type="generic"
              title="No Advertisements Found"
              description="Tap 'New Banner' to create your first promotional banner."
              actionLabel="Create Banner"
              onAction={handleOpenCreate}
            />
          }
        />
      )}

      {/* CREATE / EDIT BANNER MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {isEditing ? "Modify Banner Content" : "Create New App Banner"}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Updates display immediately across traveler home screens
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Banner Title / Main Headline</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Explore Asia — Travel Deals Up to 50% Off"
                placeholderTextColor="#94a3b8"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.inputLabel}>Subtitle / Description Text</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Unforgettable journeys across Asia & Pacific"
                placeholderTextColor="#94a3b8"
                value={formSubtitle}
                onChangeText={setFormSubtitle}
              />

              <View style={styles.multiRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Top Badge Text</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="FEATURED / HOT DEAL"
                    placeholderTextColor="#94a3b8"
                    value={formBadgeText}
                    onChangeText={setFormBadgeText}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Action Button Text</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="View Deals →"
                    placeholderTextColor="#94a3b8"
                    value={formButtonText}
                    onChangeText={setFormButtonText}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Target Route / Screen</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="/screens/search-stays or /screens/flights"
                placeholderTextColor="#94a3b8"
                value={formTargetUrl}
                onChangeText={setFormTargetUrl}
              />

              <Text style={styles.inputLabel}>Banner Background Image URL</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#94a3b8"
                value={formBannerUrl}
                onChangeText={setFormBannerUrl}
              />

              {/* Preset Image Chooser */}
              <Text style={styles.inputLabel}>Quick Preset Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                {PRESET_BANNER_IMAGES.map((img) => (
                  <TouchableOpacity
                    key={img.label}
                    style={[
                      styles.presetThumbWrap,
                      formBannerUrl === img.url && styles.presetThumbWrapActive,
                    ]}
                    onPress={() => setFormBannerUrl(img.url)}
                  >
                    <Image source={{ uri: img.url }} style={styles.presetThumb} />
                    <Text style={styles.presetThumbLabel} numberOfLines={1}>
                      {img.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Live Preview of Banner inside Modal */}
              <Text style={styles.inputLabel}>Live Banner Card Preview</Text>
              <View style={styles.modalPreviewCard}>
                <Image source={{ uri: formBannerUrl || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" }} style={styles.modalPreviewImg} />
                <LinearGradient
                  colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.85)"]}
                  style={styles.modalPreviewGradient}
                >
                  <View style={styles.modalPreviewBadge}>
                    <Text style={styles.badgePillText}>{formBadgeText || "FEATURED"}</Text>
                  </View>
                  <View style={{ marginTop: "auto" }}>
                    <Text style={styles.modalPreviewTitle}>{formTitle || "Headline"}</Text>
                    <Text style={styles.modalPreviewSub}>{formSubtitle || "Subtitle"}</Text>
                    <View style={styles.modalPreviewBtn}>
                      <Text style={styles.previewBtnText}>{formButtonText || "View Deals →"}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSaveBanner}>
                <Text style={styles.saveModalBtnText}>
                  {isEditing ? "Save & Apply Live" : "Publish Banner"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTargetAd && (
        <DestructiveConfirmModal
          visible={!!deleteTargetAd}
          title="Delete Advertisement Campaign"
          description={`Permanently removing "${deleteTargetAd.ad_name}". This will remove the banner from all consumer apps.`}
          targetName={deleteTargetAd.ad_name}
          targetId={deleteTargetAd.id}
          confirmLabel="Delete Banner"
          severity="danger"
          requireTypedConfirmation={false}
          requireReason={false}
          isLoading={isDeleting}
          onConfirm={handleConfirmDeleteAd}
          onCancel={() => setDeleteTargetAd(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    maxWidth: width * 0.65,
  },
  createAdBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createAdBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ea580c",
  },
  filterTabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: "#ffffff",
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
  },
  filterTabTextActive: {
    color: "#ea580c",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  adCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnailWrapper: {
    height: 170,
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: "space-between",
  },
  thumbnailTopBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgePill: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  thumbnailBottomContent: {
    gap: 2,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  previewSubtitle: {
    fontSize: 12,
    color: "#f1f5f9",
  },
  previewBtnPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardContent: {
    padding: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  routeText: {
    fontSize: 12,
    color: "#64748b",
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardFooter: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  modalBody: {
    padding: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a",
  },
  multiRow: {
    flexDirection: "row",
    gap: 10,
  },
  presetsScroll: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 10,
  },
  presetThumbWrap: {
    width: 90,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  presetThumbWrapActive: {
    borderColor: "#ea580c",
  },
  presetThumb: {
    width: "100%",
    height: 50,
  },
  presetThumbLabel: {
    fontSize: 9,
    padding: 3,
    color: "#475569",
    textAlign: "center",
  },
  modalPreviewCard: {
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginTop: 6,
  },
  modalPreviewImg: {
    width: "100%",
    height: "100%",
  },
  modalPreviewGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    justifyContent: "space-between",
  },
  modalPreviewBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalPreviewTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalPreviewSub: {
    fontSize: 11,
    color: "#f1f5f9",
  },
  modalPreviewBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  saveModalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ea580c",
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});

export const AdvertisementScreen = withErrorBoundary(AdvertisementScreenComponent, { screenName: "AdvertisementScreen" } as any);
export default AdvertisementScreen;
