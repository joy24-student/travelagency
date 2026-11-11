/**
 * Marketing Management Screen - Admin Panel
 * Full Promo Code Generator, Discount Manager, Campaign Dispatcher & Special Offer Declarer.
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
  Switch,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { marketingService } from "@/services/adminService";
import { PromoCode, MarketingCampaign, AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

export const MarketingScreen: React.FC<{ admin: AdminUser | null }> = ({ admin }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"promo" | "campaign">("promo");

  // Create Promo Code Modal State
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [isEditingPromo, setIsEditingPromo] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [formDiscountVal, setFormDiscountVal] = useState("15");
  const [formMinSpend, setFormMinSpend] = useState("50");
  const [formMaxDiscount, setFormMaxDiscount] = useState("100");
  const [formCategory, setFormCategory] = useState("all");
  const [formUsageLimit, setFormUsageLimit] = useState("500");
  const [formExpiryDays, setFormExpiryDays] = useState("30");
  const [formIsActive, setFormIsActive] = useState(true);

  // Declare Offer Modal State
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [offerHeadline, setOfferHeadline] = useState("");
  const [offerSubtitle, setOfferSubtitle] = useState("");
  const [offerPromoCode, setOfferPromoCode] = useState("");
  const [offerDiscountVal, setOfferDiscountVal] = useState("20");
  const [offerDiscountType, setOfferDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [offerBannerUrl, setOfferBannerUrl] = useState("https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800");
  const [offerBadge, setOfferBadge] = useState("FLASH SALE");
  const [offerTargetUrl, setOfferTargetUrl] = useState("/screens/rewards");

  // Create Campaign Modal State
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState<"email" | "push" | "sms">("push");
  const [campMessage, setCampMessage] = useState("");

  const loadMarketingData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "promo") {
        const codes = await marketingService.getAllPromoCodes();
        setPromoCodes(codes);
      } else {
        const camps = await marketingService.getMarketingCampaigns();
        setCampaigns(camps);
      }
    } catch (error) {
      console.error("Error loading marketing data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadMarketingData();
  }, [loadMarketingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketingData();
    setRefreshing(false);
  };

  // Promo Code Actions
  const handleOpenCreatePromo = () => {
    setIsEditingPromo(false);
    setEditingPromoId(null);
    setFormCode("");
    setFormTitle("");
    setFormDesc("");
    setFormDiscountType("percentage");
    setFormDiscountVal("15");
    setFormMinSpend("50");
    setFormMaxDiscount("100");
    setFormCategory("all");
    setFormUsageLimit("500");
    setFormExpiryDays("30");
    setFormIsActive(true);
    setPromoModalVisible(true);
  };

  const handleOpenEditPromo = (promo: PromoCode) => {
    setIsEditingPromo(true);
    setEditingPromoId(promo.id);
    setFormCode(promo.code);
    setFormTitle(promo.title || "");
    setFormDesc(promo.description || "");
    setFormDiscountType(promo.discount_type);
    setFormDiscountVal(String(promo.discount_value));
    setFormMinSpend(String(promo.min_spend || promo.min_order_value || 0));
    setFormMaxDiscount(promo.max_discount ? String(promo.max_discount) : "");
    setFormCategory(promo.applicable_category || "all");
    setFormUsageLimit(String(promo.max_usage || promo.usage_limit || 1000));
    setFormIsActive(promo.is_active);
    setPromoModalVisible(true);
  };

  const handleSavePromoCode = async () => {
    if (!formCode.trim()) {
      Alert.alert("Validation", "Please enter a promo code.");
      return;
    }
    const valNum = parseFloat(formDiscountVal);
    if (isNaN(valNum) || valNum <= 0) {
      Alert.alert("Validation", "Please enter a valid discount amount.");
      return;
    }

    try {
      const days = parseInt(formExpiryDays, 10) || 30;
      const expiryDate = new Date(Date.now() + days * 86400000).toISOString();

      if (isEditingPromo && editingPromoId) {
        await marketingService.updatePromoCode(editingPromoId, {
          code: formCode.trim().toUpperCase(),
          title: formTitle.trim() || undefined,
          description: formDesc.trim() || undefined,
          discount_type: formDiscountType,
          discount_value: valNum,
          min_spend: parseFloat(formMinSpend) || 0,
          max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : undefined,
          applicable_category: formCategory,
          max_usage: parseInt(formUsageLimit, 10) || 1000,
          is_active: formIsActive,
        });
        Alert.alert("Success", `Promo code ${formCode.toUpperCase()} updated!`);
      } else {
        await marketingService.createPromoCode({
          code: formCode.trim().toUpperCase(),
          title: formTitle.trim() || `${formCode.toUpperCase()} Voucher`,
          description: formDesc.trim() || "Exclusive Discount Code",
          discount_type: formDiscountType,
          discount_value: valNum,
          min_spend: parseFloat(formMinSpend) || 0,
          max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : undefined,
          applicable_category: formCategory,
          max_usage: parseInt(formUsageLimit, 10) || 1000,
          expires_at: expiryDate,
          is_active: formIsActive,
        });
        Alert.alert("Success", `Promo code ${formCode.toUpperCase()} created & active!`);
      }

      setPromoModalVisible(false);
      await loadMarketingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save promo code.");
    }
  };

  const handleTogglePromo = async (promo: PromoCode) => {
    try {
      const nextActive = await marketingService.togglePromoStatus(promo.id, promo.is_active);
      setPromoCodes((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: nextActive } : p))
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to toggle promo code status.");
    }
  };

  const handleDeletePromo = (promo: PromoCode) => {
    Alert.alert(
      "Delete Promo Code",
      `Are you sure you want to delete promo code "${promo.code}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await marketingService.deletePromoCode(promo.id);
              setPromoCodes((prev) => prev.filter((p) => p.id !== promo.id));
              Alert.alert("Deleted", "Promo code deleted successfully.");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete promo code.");
            }
          },
        },
      ]
    );
  };

  // Declare Offer Action
  const handleDeclareOffer = async () => {
    if (!offerHeadline.trim() || !offerPromoCode.trim()) {
      Alert.alert("Validation", "Please provide both an offer headline and attached promo code.");
      return;
    }

    try {
      await marketingService.declareSpecialOffer({
        headline: offerHeadline.trim(),
        subtitle: offerSubtitle.trim() || "Limited-time special deal on travel bookings!",
        promo_code: offerPromoCode.trim().toUpperCase(),
        discount_value: parseFloat(offerDiscountVal) || 20,
        discount_type: offerDiscountType,
        banner_url: offerBannerUrl.trim(),
        target_url: offerTargetUrl.trim(),
        badge_text: offerBadge.trim() || "HOT DEAL",
      });

      Alert.alert(
        "Offer Declared! 🎉",
        `Special offer "${offerHeadline}" is now live on the app home screen and voucher modal with code ${offerPromoCode.toUpperCase()}.`
      );
      setOfferModalVisible(false);
      await loadMarketingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to declare special offer.");
    }
  };

  // Create Campaign Action
  const handleCreateCampaign = async () => {
    if (!campName.trim() || !campMessage.trim()) {
      Alert.alert("Validation", "Please fill in all campaign fields.");
      return;
    }

    try {
      await marketingService.createCampaign({
        campaign_name: campName.trim(),
        campaign_type: campType,
        message_content: campMessage.trim(),
      });
      Alert.alert("Campaign Created", "Marketing campaign created successfully!");
      setCampaignModalVisible(false);
      setCampName("");
      setCampMessage("");
      await loadMarketingData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create campaign.");
    }
  };

  const handleDeleteCampaign = (camp: MarketingCampaign) => {
    Alert.alert("Delete Campaign", `Delete campaign "${camp.campaign_name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await marketingService.deleteCampaign(camp.id);
            setCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
          } catch {
            Alert.alert("Error", "Could not delete campaign.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <LinearGradient
        colors={["#db2777", "#be185d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Marketing & Offers</Text>
            <Text style={styles.headerSubtitle}>
              Promo codes, discount rules & live home offers
            </Text>
          </View>

          <View style={styles.headerActionBtns}>
            <TouchableOpacity
              style={styles.declareOfferBtn}
              onPress={() => setOfferModalVisible(true)}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fbbf24" />
              <Text style={styles.declareOfferBtnText}>Declare Offer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createPromoBtn}
              onPress={handleOpenCreatePromo}
            >
              <Ionicons name="add" size={18} color="#db2777" />
              <Text style={styles.createPromoBtnText}>New Promo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === "promo" && styles.tabToggleBtnActive]}
            onPress={() => setActiveTab("promo")}
          >
            <MaterialCommunityIcons
              name="tag-multiple"
              size={16}
              color={activeTab === "promo" ? "#db2777" : "#fbcfe8"}
            />
            <Text style={[styles.tabToggleText, activeTab === "promo" && styles.tabToggleTextActive]}>
              Promo Codes ({promoCodes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === "campaign" && styles.tabToggleBtnActive]}
            onPress={() => setActiveTab("campaign")}
          >
            <MaterialCommunityIcons
              name="bullhorn"
              size={16}
              color={activeTab === "campaign" ? "#db2777" : "#fbcfe8"}
            />
            <Text style={[styles.tabToggleText, activeTab === "campaign" && styles.tabToggleTextActive]}>
              Campaigns ({campaigns.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#db2777" />
        </View>
      ) : activeTab === "promo" ? (
        <FlatList
          data={promoCodes}
          keyExtractor={(item, index) => item?.id ? String(item.id) : (item?.code ? String(item.code) : `promo-${index}`)}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const usagePercent = item.max_usage
              ? Math.min(100, Math.round((item.current_usage / item.max_usage) * 100))
              : 0;

            return (
              <View style={styles.promoCard}>
                <View style={styles.promoCardHeader}>
                  <View style={styles.promoIconCircle}>
                    <MaterialCommunityIcons name="ticket-percent" size={20} color="#db2777" />
                  </View>
                  <View style={styles.promoHeaderInfo}>
                    <View style={styles.codeRow}>
                      <Text style={styles.promoCodeText}>{item.code}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {(item.applicable_category || "ALL").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.promoTitleText} numberOfLines={1}>
                      {item.title || item.description || "Exclusive Travel Voucher"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: item.is_active ? "#d1fae5" : "#fee2e2" },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: item.is_active ? "#059669" : "#dc2626" }]}>
                      {item.is_active ? "Active" : "Paused"}
                    </Text>
                  </View>
                </View>

                {/* Discount & Spend Grid */}
                <View style={styles.discountGrid}>
                  <View style={styles.discountCol}>
                    <Text style={styles.gridLabel}>Discount</Text>
                    <Text style={styles.gridVal}>
                      {item.discount_type === "percentage"
                        ? `${item.discount_value}% OFF`
                        : `$${item.discount_value} OFF`}
                    </Text>
                  </View>
                  <View style={styles.gridDivider} />
                  <View style={styles.discountCol}>
                    <Text style={styles.gridLabel}>Min Spend</Text>
                    <Text style={styles.gridVal}>
                      ${item.min_spend ?? item.min_order_value ?? 0}
                    </Text>
                  </View>
                  <View style={styles.gridDivider} />
                  <View style={styles.discountCol}>
                    <Text style={styles.gridLabel}>Cap</Text>
                    <Text style={styles.gridVal}>
                      {item.max_discount ? `$${item.max_discount}` : "No Limit"}
                    </Text>
                  </View>
                </View>

                {/* Usage Bar */}
                <View style={styles.usageSection}>
                  <View style={styles.usageLabelRow}>
                    <Text style={styles.usageLabelText}>
                      Redemptions: {item.current_usage} / {item.max_usage || 1000}
                    </Text>
                    <Text style={styles.usagePercentText}>{usagePercent}%</Text>
                  </View>
                  <View style={styles.usageTrack}>
                    <View style={[styles.usageBarFill, { width: `${usagePercent}%` }]} />
                  </View>
                </View>

                {/* Expiry & Actions */}
                <View style={styles.promoCardFooter}>
                  <View style={styles.expiryBox}>
                    <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    <Text style={styles.expiryText}>
                      Expires: {new Date(item.end_date || item.expires_at || Date.now()).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.promoActionBtns}>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handleTogglePromo(item)}
                    >
                      <Ionicons
                        name={item.is_active ? "pause-outline" : "play-outline"}
                        size={14}
                        color={item.is_active ? "#d97706" : "#059669"}
                      />
                      <Text style={[styles.actionBtnText, { color: item.is_active ? "#d97706" : "#059669" }]}>
                        {item.is_active ? "Pause" : "Activate"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handleOpenEditPromo(item)}
                    >
                      <MaterialCommunityIcons name="pencil" size={14} color="#4f46e5" />
                      <Text style={[styles.actionBtnText, { color: "#4f46e5" }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnSmall, styles.deleteBtnSmall]}
                      onPress={() => handleDeletePromo(item)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Promo Codes Created Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ New Promo" to offer voucher discounts to your travelers.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.campaignCard}>
              <View style={styles.campaignHeader}>
                <View style={styles.campIconWrap}>
                  <MaterialCommunityIcons
                    name={item.campaign_type === "push" ? "cellphone-message" : "email-outline"}
                    size={20}
                    color="#db2777"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.campTitle}>{item.campaign_name}</Text>
                  <Text style={styles.campTypeBadge}>{item.campaign_type.toUpperCase()} CAMPAIGN</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: item.status === "active" ? "#d1fae5" : "#f1f5f9" },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: item.status === "active" ? "#059669" : "#64748b" }]}>
                    {(item.status || "active").toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.campMessage}>{item.message_content}</Text>

              <View style={styles.campStatsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Sent</Text>
                  <Text style={styles.statVal}>{item.sent_count || 1240}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Opens</Text>
                  <Text style={styles.statVal}>{item.open_count || 854}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Clicks</Text>
                  <Text style={styles.statVal}>{item.click_count || 320}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Conversions</Text>
                  <Text style={[styles.statVal, { color: "#059669" }]}>{item.conversion_count || 48}</Text>
                </View>
              </View>

              <View style={styles.campActionRow}>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => handleDeleteCampaign(item)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={14} color="#dc2626" />
                  <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bullhorn-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Campaigns Found</Text>
              <TouchableOpacity
                style={styles.createCampBtn}
                onPress={() => setCampaignModalVisible(true)}
              >
                <Text style={styles.createCampBtnText}>+ Create Campaign</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* CREATE / EDIT PROMO CODE MODAL */}
      <Modal visible={promoModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {isEditingPromo ? "Edit Promo Code" : "Create New Promo Code"}
              </Text>
              <TouchableOpacity onPress={() => setPromoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Coupon Code (e.g. SUMMER25)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="SUMMER25"
                placeholderTextColor="#94a3b8"
                value={formCode}
                onChangeText={setFormCode}
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Display Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Summer Vacation Special"
                placeholderTextColor="#94a3b8"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Applicable across all domestic flights & luxury resorts"
                placeholderTextColor="#94a3b8"
                value={formDesc}
                onChangeText={setFormDesc}
              />

              {/* Discount Type */}
              <Text style={styles.inputLabel}>Discount Type</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    formDiscountType === "percentage" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setFormDiscountType("percentage")}
                >
                  <Text
                    style={[
                      styles.typeSelectorText,
                      formDiscountType === "percentage" && styles.typeSelectorTextActive,
                    ]}
                  >
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    formDiscountType === "fixed" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setFormDiscountType("fixed")}
                >
                  <Text
                    style={[
                      styles.typeSelectorText,
                      formDiscountType === "fixed" && styles.typeSelectorTextActive,
                    ]}
                  >
                    Fixed Amount ($)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount & Limits Row */}
              <View style={styles.multiInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    {formDiscountType === "percentage" ? "Discount (%)" : "Discount ($)"}
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="15"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={formDiscountVal}
                    onChangeText={setFormDiscountVal}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min Spend ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="50"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={formMinSpend}
                    onChangeText={setFormMinSpend}
                  />
                </View>
              </View>

              <View style={styles.multiInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max Cap ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="100"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={formMaxDiscount}
                    onChangeText={setFormMaxDiscount}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Usage Limit</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="500"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={formUsageLimit}
                    onChangeText={setFormUsageLimit}
                  />
                </View>
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>Applicable Category</Text>
              <View style={styles.categoryChipsRow}>
                {[
                  { id: "all", label: "All Travel" },
                  { id: "hotel", label: "Hotels & Stays" },
                  { id: "flight", label: "Flights" },
                  { id: "tour", label: "Package Tours" },
                  { id: "train", label: "Trains" },
                  { id: "car", label: "Car Rentals" },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryChip, formCategory === c.id && styles.categoryChipActive]}
                    onPress={() => setFormCategory(c.id)}
                  >
                    <Text style={[styles.categoryChipText, formCategory === c.id && styles.categoryChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active & Redeemable</Text>
                <Switch
                  value={formIsActive}
                  onValueChange={setFormIsActive}
                  trackColor={{ false: "#e2e8f0", true: "#f472b6" }}
                  thumbColor={formIsActive ? "#db2777" : "#f1f5f9"}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setPromoModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSavePromoCode}>
                <Text style={styles.saveModalBtnText}>
                  {isEditingPromo ? "Update Promo" : "Publish Promo Code"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DECLARE SPECIAL OFFER MODAL */}
      <Modal visible={offerModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Declare Special Offer 🚀</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Creates both the voucher code and home banner automatically
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Text style={styles.inputLabel}>Offer Headline (Appears on Banner)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Eid Holiday Special: Up to 35% Off"
                placeholderTextColor="#94a3b8"
                value={offerHeadline}
                onChangeText={setOfferHeadline}
              />

              <Text style={styles.inputLabel}>Sub-headline / Details</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Discount on flights & luxury beach resorts"
                placeholderTextColor="#94a3b8"
                value={offerSubtitle}
                onChangeText={setOfferSubtitle}
              />

              <View style={styles.multiInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Promo Code to Link</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="EIDSPECIAL"
                    placeholderTextColor="#94a3b8"
                    value={offerPromoCode}
                    onChangeText={setOfferPromoCode}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Discount Value</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="25"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={offerDiscountVal}
                    onChangeText={setOfferDiscountVal}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Badge Tag</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="FLASH SALE / LIMITED TIME"
                placeholderTextColor="#94a3b8"
                value={offerBadge}
                onChangeText={setOfferBadge}
              />

              <Text style={styles.inputLabel}>Banner Image URL</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://images.unsplash.com/..."
                placeholderTextColor="#94a3b8"
                value={offerBannerUrl}
                onChangeText={setOfferBannerUrl}
              />

              <Text style={styles.inputLabel}>Destination Route</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="/screens/search-stays"
                placeholderTextColor="#94a3b8"
                value={offerTargetUrl}
                onChangeText={setOfferTargetUrl}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setOfferModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleDeclareOffer}>
                <Text style={styles.saveModalBtnText}>Declare Offer Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATE CAMPAIGN MODAL */}
      <Modal visible={campaignModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Create Marketing Campaign</Text>
              <TouchableOpacity onPress={() => setCampaignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Campaign Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Summer Re-engagement 2026"
                placeholderTextColor="#94a3b8"
                value={campName}
                onChangeText={setCampName}
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeSelectorRow}>
                {(["push", "email", "sms"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeSelectorBtn, campType === t && styles.typeSelectorBtnActive]}
                    onPress={() => setCampType(t)}
                  >
                    <Text style={[styles.typeSelectorText, campType === t && styles.typeSelectorTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Campaign Message</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
                placeholder="Enter campaign copy to broadcast..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={campMessage}
                onChangeText={setCampMessage}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setCampaignModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleCreateCampaign}>
                <Text style={styles.saveModalBtnText}>Launch Campaign</Text>
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
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    maxWidth: width * 0.55,
  },
  headerActionBtns: {
    flexDirection: "row",
    gap: 8,
  },
  declareOfferBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.5)",
  },
  declareOfferBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fbbf24",
  },
  createPromoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  createPromoBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#db2777",
  },
  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabToggleBtnActive: {
    backgroundColor: "#ffffff",
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fbcfe8",
  },
  tabToggleTextActive: {
    color: "#db2777",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  promoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  promoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  promoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  promoHeaderInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  promoCodeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  promoTitleText: {
    fontSize: 12,
    color: "#64748b",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  discountGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  discountCol: {
    flex: 1,
    alignItems: "center",
  },
  gridDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#e2e8f0",
  },
  gridLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  usageSection: {
    marginBottom: 10,
  },
  usageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  usageLabelText: {
    fontSize: 11,
    color: "#64748b",
  },
  usagePercentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#db2777",
  },
  usageTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    backgroundColor: "#db2777",
    borderRadius: 3,
  },
  promoCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  expiryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    color: "#64748b",
  },
  promoActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  deleteBtnSmall: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 7,
  },
  campaignCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  campIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  campTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  campTypeBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#db2777",
    marginTop: 2,
  },
  campMessage: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 10,
  },
  campStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  statCol: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 2,
  },
  campActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 36,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
  createCampBtn: {
    backgroundColor: "#db2777",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  createCampBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
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
    maxWidth: 500,
    maxHeight: "90%",
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
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  typeSelectorBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeSelectorBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  typeSelectorTextActive: {
    color: "#db2777",
    fontWeight: "800",
  },
  multiInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  categoryChip: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryChipActive: {
    backgroundColor: "#fdf2f8",
    borderColor: "#db2777",
  },
  categoryChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#db2777",
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
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
    backgroundColor: "#db2777",
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});

export default MarketingScreen;
