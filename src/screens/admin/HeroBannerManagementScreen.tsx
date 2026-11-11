/**
 * Hero Banner & Trending Searches Management Screen - Admin Panel
 * Full admin control for Dynamic Hero Banners, Search Placeholders, Background Images,
 * and Trending Auto-Suggest Search Engine options.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { HeroBanner, TrendingSearchItem } from "../../types/heroBanner";
import { heroBannerService, DEFAULT_FALLBACK_BANNER } from "../../services/heroBannerService";
import { trendingSearchService, DEFAULT_FALLBACK_TRENDING } from "../../services/trendingSearchService";

const PRESET_BANNER_IMAGES = [
  {
    label: "Tropical Paradise (Beach & Sea)",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
  },
  {
    label: "Sajek Cloud Mountains",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80",
  },
  {
    label: "Cox's Bazar Golden Sunset",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1600&auto=format&fit=crop&q=80",
  },
  {
    label: "Dubai Skyline & Luxury",
    url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    label: "Sylhet Tea Garden Nature",
    url: "https://images.unsplash.com/photo-1585123388867-3bfe6dd4bdbf?w=1600&auto=format&fit=crop&q=80",
  },
  {
    label: "Bali Island Villa",
    url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&auto=format&fit=crop&q=80",
  },
];

export const HeroBannerManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"banners" | "trending">("banners");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Banners
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<HeroBanner> | null>(null);
  const [bannerModalVisible, setBannerModalVisible] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Trending Searches
  const [trendingItems, setTrendingItems] = useState<TrendingSearchItem[]>([]);
  const [editingTrending, setEditingTrending] = useState<Partial<TrendingSearchItem> | null>(null);
  const [trendingModalVisible, setTrendingModalVisible] = useState(false);
  const [savingTrending, setSavingTrending] = useState(false);

  // Load All Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedBanners, fetchedTrending] = await Promise.all([
        heroBannerService.getAllBanners(),
        trendingSearchService.getAllTrending(),
      ]);
      setBanners(fetchedBanners);
      setTrendingItems(fetchedTrending);
    } catch (err) {
      console.warn("Failed to load admin hero banner data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // =========================================================================
  // BANNER OPERATIONS
  // =========================================================================

  const handleOpenAddBanner = () => {
    setEditingBanner({
      brand_title: "ShopnoJatra",
      title: "Discover Your Next Journey",
      subtitle: "Explore the world with AI-powered travel planning and smart booking.",
      badge_text: "AI TRAVEL PLANNING",
      image_url: PRESET_BANNER_IMAGES[0].url,
      search_placeholder: "Where do you want to go?",
      search_button_text: "Search",
      cta_link: "/screens/search",
      overlay_opacity: 0.35,
      is_active: true,
      display_order: banners.length + 1,
    });
    setBannerModalVisible(true);
  };

  const handleOpenEditBanner = (banner: HeroBanner) => {
    setEditingBanner({ ...banner });
    setBannerModalVisible(true);
  };

  const handleSaveBanner = async () => {
    if (!editingBanner?.title?.trim() || !editingBanner?.image_url?.trim()) {
      Alert.alert("Missing Fields", "Please provide at least a title and background image URL.");
      return;
    }

    setSavingBanner(true);
    try {
      if (editingBanner.id) {
        // Update
        const updated = await heroBannerService.updateBanner(editingBanner.id, editingBanner);
        setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        // Create
        const created = await heroBannerService.createBanner(
          editingBanner as Omit<HeroBanner, "id" | "created_at" | "updated_at">
        );
        setBanners((prev) => [created, ...prev]);
      }
      setBannerModalVisible(false);
      setEditingBanner(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Hero banner saved successfully! Changes are live on the Home Screen.");
    } catch (err: any) {
      Alert.alert("Error Saving Banner", err.message || "Failed to save banner.");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner: HeroBanner) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updated = await heroBannerService.toggleActive(banner.id, banner.is_active);
      setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to toggle banner status.");
    }
  };

  const handleSetPrimary = async (banner: HeroBanner) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await heroBannerService.setPrimaryActiveBanner(banner.id);
      await loadData();
      Alert.alert("Primary Banner Updated", `"${banner.title}" is now the primary banner on the Home Screen!`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set primary banner.");
    }
  };

  const handleDeleteBanner = (banner: HeroBanner) => {
    Alert.alert(
      "Delete Banner",
      `Are you sure you want to delete "${banner.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await heroBannerService.deleteBanner(banner.id);
              setBanners((prev) => prev.filter((b) => b.id !== banner.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete banner.");
            }
          },
        },
      ]
    );
  };

  // =========================================================================
  // TRENDING SEARCHES OPERATIONS
  // =========================================================================

  const handleOpenAddTrending = () => {
    setEditingTrending({
      query_text: "",
      category: "general",
      badge_tag: "TRENDING",
      icon_name: "flame",
      search_count: 1000,
      target_route: "/screens/search",
      is_active: true,
      is_featured: false,
      display_order: trendingItems.length + 1,
    });
    setTrendingModalVisible(true);
  };

  const handleOpenEditTrending = (item: TrendingSearchItem) => {
    setEditingTrending({ ...item });
    setTrendingModalVisible(true);
  };

  const handleSaveTrending = async () => {
    if (!editingTrending?.query_text?.trim()) {
      Alert.alert("Missing Fields", "Please enter a search query keyword.");
      return;
    }

    setSavingTrending(true);
    try {
      if (editingTrending.id) {
        const updated = await trendingSearchService.updateTrendingItem(editingTrending.id, editingTrending);
        setTrendingItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await trendingSearchService.createTrendingItem(
          editingTrending as Omit<TrendingSearchItem, "id" | "created_at" | "updated_at">
        );
        setTrendingItems((prev) => [...prev, created]);
      }
      setTrendingModalVisible(false);
      setEditingTrending(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Trending search keyword saved! Live on search auto-suggest.");
    } catch (err: any) {
      Alert.alert("Error Saving Trending Item", err.message || "Failed to save.");
    } finally {
      setSavingTrending(false);
    }
  };

  const handleToggleTrendingActive = async (item: TrendingSearchItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updated = await trendingSearchService.toggleActive(item.id, item.is_active);
      setTrendingItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to toggle status.");
    }
  };

  const handleDeleteTrending = (item: TrendingSearchItem) => {
    Alert.alert(
      "Delete Trending Item",
      `Are you sure you want to delete "${item.query_text}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await trendingSearchService.deleteTrendingItem(item.id);
              setTrendingItems((prev) => prev.filter((t) => t.id !== item.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Home Hero & Search Control</Text>
          <Text style={styles.headerSubtitle}>
            Live Dynamic Control: Images, Headlines, Search Engine & Trending Suggestions
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryAddBtn}
          onPress={activeTab === "banners" ? handleOpenAddBanner : handleOpenAddTrending}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.primaryAddBtnText}>
            {activeTab === "banners" ? "New Banner" : "New Trending"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "banners" && styles.tabBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("banners");
          }}
        >
          <Ionicons
            name="image-outline"
            size={18}
            color={activeTab === "banners" ? "#0284C7" : "#94A3B8"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === "banners" && styles.tabBtnTextActive]}>
            Hero Banners ({banners.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "trending" && styles.tabBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("trending");
          }}
        >
          <Ionicons
            name="flame-outline"
            size={18}
            color={activeTab === "trending" ? "#0284C7" : "#94A3B8"}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === "trending" && styles.tabBtnTextActive]}>
            Trending Suggestions ({trendingItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Loading dynamic hero configuration...</Text>
        </View>
      ) : activeTab === "banners" ? (
        /* ========================================================================= */
        /* TAB 1: HERO BANNERS LIST                                                  */
        /* ========================================================================= */
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          {banners.map((b) => (
            <View key={b.id} style={styles.bannerCard}>
              <Image source={{ uri: b.image_url }} style={styles.bannerCardThumb} />
              <View style={styles.bannerCardBody}>
                <View style={styles.bannerTopRow}>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{b.badge_text || "HERO BANNER"}</Text>
                  </View>

                  <View style={styles.activeRow}>
                    <Text style={[styles.statusText, { color: b.is_active ? "#10B981" : "#94A3B8" }]}>
                      {b.is_active ? "ACTIVE" : "INACTIVE"}
                    </Text>
                    <Switch
                      value={b.is_active}
                      onValueChange={() => handleToggleBannerActive(b)}
                      trackColor={{ false: "#334155", true: "#0284C7" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <Text style={styles.bannerCardTitle}>{b.title}</Text>
                <Text style={styles.bannerCardSubtitle} numberOfLines={2}>
                  {b.subtitle}
                </Text>

                <View style={styles.bannerMetaRow}>
                  <Text style={styles.metaLabel}>
                    Search Placeholder: <Text style={styles.metaVal}>"{b.search_placeholder}"</Text>
                  </Text>
                  <Text style={styles.metaLabel}>
                    Button: <Text style={styles.metaVal}>"{b.search_button_text}"</Text>
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.cardActionsRow}>
                  {!b.is_active ? (
                    <TouchableOpacity
                      style={styles.setPrimaryBtn}
                      onPress={() => handleSetPrimary(b)}
                    >
                      <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.setPrimaryBtnText}>Set as Primary</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.primaryActiveBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.primaryActiveBadgeText}>Current Home Banner</Text>
                    </View>
                  )}

                  <View style={styles.actionIconGroup}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleOpenEditBanner(b)}
                    >
                      <Ionicons name="create-outline" size={18} color="#38BDF8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionIconBtn, styles.deleteActionBtn]}
                      onPress={() => handleDeleteBanner(b)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        /* ========================================================================= */
        /* TAB 2: TRENDING SEARCHES & SUGGESTIONS                                    */
        /* ========================================================================= */
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBanner}>
            <Ionicons name="bulb-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.infoBannerText}>
              These suggestions appear automatically in the Home Screen search dropdown when a user clicks the search bar or searches for top destinations!
            </Text>
          </View>

          {trendingItems.map((item) => (
            <View key={item.id} style={styles.trendingCard}>
              <View style={styles.trendingLeft}>
                <View style={styles.trendingIconBox}>
                  <Ionicons name={(item.icon_name as any) || "flame"} size={20} color="#EA580C" />
                </View>
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.trendingQueryText}>{item.query_text}</Text>
                    {item.badge_tag && (
                      <View style={styles.trendingTagPill}>
                        <Text style={styles.trendingTagText}>{item.badge_tag}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.trendingCategoryText}>
                    Category: {item.category.toUpperCase()} • Searches: {item.search_count}
                  </Text>
                </View>
              </View>

              <View style={styles.trendingRight}>
                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggleTrendingActive(item)}
                  trackColor={{ false: "#334155", true: "#0284C7" }}
                  thumbColor="#FFFFFF"
                />
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => handleOpenEditTrending(item)}
                >
                  <Ionicons name="create-outline" size={17} color="#38BDF8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.deleteActionBtn]}
                  onPress={() => handleDeleteTrending(item)}
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT HERO BANNER                                           */}
      {/* ========================================================================= */}
      <Modal
        visible={bannerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBannerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBanner?.id ? "Edit Hero Banner" : "Create New Hero Banner"}
              </Text>
              <TouchableOpacity onPress={() => setBannerModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              {/* Brand Title */}
              <Text style={styles.inputLabel}>Brand / App Name</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.brand_title || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, brand_title: text }))}
                placeholder="e.g. ShopnoJatra"
                placeholderTextColor="#64748B"
              />

              {/* Main Headline */}
              <Text style={styles.inputLabel}>Main Headline / Title *</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.title || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, title: text }))}
                placeholder="e.g. Discover Your Next Journey"
                placeholderTextColor="#64748B"
              />

              {/* Subtitle */}
              <Text style={styles.inputLabel}>Subtitle / Description</Text>
              <TextInput
                style={[styles.inputField, { height: 64 }]}
                multiline
                value={editingBanner?.subtitle || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, subtitle: text }))}
                placeholder="e.g. Explore the world with AI-powered travel planning and smart booking."
                placeholderTextColor="#64748B"
              />

              {/* Badge Tag */}
              <Text style={styles.inputLabel}>Badge Tag (Top Pill)</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.badge_text || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, badge_text: text }))}
                placeholder="e.g. AI TRAVEL PLANNING"
                placeholderTextColor="#64748B"
              />

              {/* Background Image URL */}
              <Text style={styles.inputLabel}>Background Image URL *</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.image_url || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, image_url: text }))}
                placeholder="https://..."
                placeholderTextColor="#64748B"
              />

              {/* Preset Image Selector */}
              <Text style={styles.presetLabel}>Or choose from high-res presets:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {PRESET_BANNER_IMAGES.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.presetCard,
                      editingBanner?.image_url === preset.url && styles.presetCardActive,
                    ]}
                    onPress={() => setEditingBanner((prev) => ({ ...prev, image_url: preset.url }))}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetThumb} />
                    <Text style={styles.presetText} numberOfLines={1}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search Placeholder */}
              <Text style={styles.inputLabel}>Search Bar Placeholder</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.search_placeholder || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, search_placeholder: text }))}
                placeholder="e.g. Where do you want to go?"
                placeholderTextColor="#64748B"
              />

              {/* Search Button Text */}
              <Text style={styles.inputLabel}>Search Button Text</Text>
              <TextInput
                style={styles.inputField}
                value={editingBanner?.search_button_text || ""}
                onChangeText={(text) => setEditingBanner((prev) => ({ ...prev, search_button_text: text }))}
                placeholder="e.g. Search"
                placeholderTextColor="#64748B"
              />

              {/* Active Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleRowLabel}>Active on Home Screen</Text>
                <Switch
                  value={editingBanner?.is_active ?? true}
                  onValueChange={(val) => setEditingBanner((prev) => ({ ...prev, is_active: val }))}
                  trackColor={{ false: "#334155", true: "#0284C7" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBannerModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveBanner}
                disabled={savingBanner}
              >
                {savingBanner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Live Banner</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT TRENDING ITEM                                         */}
      {/* ========================================================================= */}
      <Modal
        visible={trendingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTrendingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTrending?.id ? "Edit Trending Keyword" : "Add Trending Keyword"}
              </Text>
              <TouchableOpacity onPress={() => setTrendingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Search Query Keyword *</Text>
              <TextInput
                style={styles.inputField}
                value={editingTrending?.query_text || ""}
                onChangeText={(text) => setEditingTrending((prev) => ({ ...prev, query_text: text }))}
                placeholder="e.g. Cox's Bazar Beach Package"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRadioWrap}>
                {["general", "hotels", "packages", "destinations", "flights", "trains"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryRadioPill,
                      editingTrending?.category === cat && styles.categoryRadioPillActive,
                    ]}
                    onPress={() => setEditingTrending((prev) => ({ ...prev, category: cat as any }))}
                  >
                    <Text
                      style={[
                        styles.categoryRadioText,
                        editingTrending?.category === cat && styles.categoryRadioTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Badge Tag</Text>
              <TextInput
                style={styles.inputField}
                value={editingTrending?.badge_tag || ""}
                onChangeText={(text) => setEditingTrending((prev) => ({ ...prev, badge_tag: text }))}
                placeholder="e.g. HOT, TRENDING, POPULAR, 30% OFF"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Icon Name (Ionicons)</Text>
              <TextInput
                style={styles.inputField}
                value={editingTrending?.icon_name || ""}
                onChangeText={(text) => setEditingTrending((prev) => ({ ...prev, icon_name: text }))}
                placeholder="e.g. flame, cloud, bed, compass, train, airplane"
                placeholderTextColor="#64748B"
              />

              <View style={styles.toggleRow}>
                <Text style={styles.toggleRowLabel}>Active in Auto-Suggest</Text>
                <Switch
                  value={editingTrending?.is_active ?? true}
                  onValueChange={(val) => setEditingTrending((prev) => ({ ...prev, is_active: val }))}
                  trackColor={{ false: "#334155", true: "#0284C7" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTrendingModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveTrending}
                disabled={savingTrending}
              >
                {savingTrending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Trending Item</Text>
                )}
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
    backgroundColor: "#0F172A",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryAddBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#0F172A",
  },
  tabBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 12,
  },
  contentScroll: {
    flex: 1,
  },
  bannerCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bannerCardThumb: {
    width: "100%",
    height: 140,
    backgroundColor: "#334155",
  },
  bannerCardBody: {
    padding: 16,
  },
  bannerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgePill: {
    backgroundColor: "rgba(2, 132, 199, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0284C7",
  },
  badgePillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bannerCardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  bannerCardSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  bannerMetaRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },
  metaLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  metaVal: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setPrimaryBtnText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700",
  },
  primaryActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  primaryActiveBadgeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  actionIconGroup: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },

  // Trending
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
    marginBottom: 14,
  },
  infoBannerText: {
    flex: 1,
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 18,
  },
  trendingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  trendingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  trendingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  trendingQueryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  trendingTagPill: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendingTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  trendingCategoryText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  trendingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalFormScroll: {
    padding: 16,
  },
  inputLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
  },
  presetLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  presetCard: {
    width: 120,
    marginRight: 10,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  presetCardActive: {
    borderColor: "#0284C7",
  },
  presetThumb: {
    width: "100%",
    height: 60,
  },
  presetText: {
    color: "#CBD5E1",
    fontSize: 10,
    padding: 4,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "#334155",
  },
  toggleRowLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryRadioWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryRadioPill: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  categoryRadioPillActive: {
    backgroundColor: "#0284C7",
    borderColor: "#38BDF8",
  },
  categoryRadioText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  categoryRadioTextActive: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  modalCancelBtnText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0284C7",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
