/**
 * Marketing Management Screen - Admin Panel
 * Manage promo codes, campaigns, and referral programs
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
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { marketingService, adminService } from "@/services/adminService";
import { PromoCode, MarketingCampaign, AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

/**
 * Promo Code Card Component
 */
const PromoCodeCard: React.FC<{
  promo: PromoCode;
  onPress: (promo: PromoCode) => void;
}> = ({ promo, onPress }) => {
  const isActive =
    new Date() >= new Date(promo.start_date) &&
    new Date() <= new Date(promo.end_date);
  const usagePercentage = promo.max_usage
    ? (promo.current_usage / promo.max_usage) * 100
    : 0;

  return (
    <TouchableOpacity onPress={() => onPress(promo)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <LinearGradient
              colors={["#ec4899", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons
                name="tag-multiple"
                size={24}
                color="#fff"
              />
            </LinearGradient>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.promoCode}>{promo.code}</Text>
            <Text style={styles.promoDesc} numberOfLines={1}>
              {(promo as any).description || "Discount Code"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive ? "#d1fae5" : "#fee2e2" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isActive ? "#059669" : "#dc2626" },
              ]}
            >
              {isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.discountRow}>
            <View style={styles.discountItem}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.value}>
                {promo.discount_type === "percentage"
                  ? `${promo.discount_value}%`
                  : `$${promo.discount_value}`}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.discountItem}>
              <Text style={styles.label}>Min Spend</Text>
              <Text style={styles.value}>${(promo as any).min_order_value || 0}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.discountItem}>
              <Text style={styles.label}>Max Discount</Text>
              <Text style={styles.value}>
                ${(promo as any).max_discount || "Unlimited"}
              </Text>
            </View>
          </View>

          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>
              Usage: {promo.current_usage} / {promo.max_usage || "∞"}
            </Text>
            <View style={styles.usageBar}>
              <View
                style={[
                  styles.usageFill,
                  { width: `${Math.min(usagePercentage, 100)}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.validDatesRow}>
            <View style={styles.dateItem}>
              <MaterialCommunityIcons
                name="calendar-start"
                size={14}
                color="#6b7280"
              />
              <Text style={styles.dateText}>
                {new Date(promo.start_date).toLocaleDateString()}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right"
              size={14}
              color="#d1d5db"
            />
            <View style={styles.dateItem}>
              <MaterialCommunityIcons
                name="calendar-end"
                size={14}
                color="#6b7280"
              />
              <Text style={styles.dateText}>
                {new Date(promo.end_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="pencil" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="chart-line"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Campaign Card Component
 */
const CampaignCard: React.FC<{
  campaign: MarketingCampaign;
  onPress: (campaign: MarketingCampaign) => void;
}> = ({ campaign, onPress }) => {
  const statusColor =
    campaign.status === "active"
      ? "#10b981"
      : campaign.status === "completed"
        ? "#6b7280"
        : "#f59e0b";

  return (
    <TouchableOpacity onPress={() => onPress(campaign)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.campaignCard}
      >
        <View style={styles.campaignHeader}>
          <View style={styles.campaignIcon}>
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons name="bullhorn" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignName}>{campaign.campaign_name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}20` },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {campaign.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.campaignContent}>
          <Text style={styles.campaignDesc} numberOfLines={2}>
            {campaign.message_content}
          </Text>

          <View style={styles.campaignStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Reach</Text>
              <Text style={styles.statValue}>
                {campaign.sent_count || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Open</Text>
              <Text style={styles.statValue}>
                {campaign.open_count || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Clicks</Text>
              <Text style={styles.statValue}>{campaign.click_count || 0}</Text>
            </View>
          </View>

          <View style={styles.budgetRow}>
            <View style={styles.budgetItem}>
              <Text style={styles.label}>Conversion</Text>
              <Text style={styles.value}>{campaign.conversion_count || 0}</Text>
            </View>
            <View style={styles.budgetItem}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{campaign.campaign_type.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons name="pencil" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="pause-circle"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Marketing Management Screen
 */
export const MarketingScreen: React.FC<{ admin: AdminUser | null }> = ({
  admin,
}) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"promo" | "campaign">("promo");
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [selectedCampaign, setSelectedCampaign] =
    useState<MarketingCampaign | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMarketingData();
  }, [activeTab]);

  const loadMarketingData = async () => {
    setLoading(true);
    try {
      if (activeTab === "promo") {
        const codes = await marketingService.getAllPromoCodes();
        setPromoCodes(codes);
      } else {
        const campaigns = await marketingService.getMarketingCampaigns();
        setCampaigns(campaigns);
      }
    } catch (error) {
      console.error("Error loading marketing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketingData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#ec4899", "#d946ef"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Marketing Management</Text>
        <Text style={styles.headerSubtitle}>
          Promo codes, campaigns & analytics
        </Text>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "promo" && styles.tabActive]}
          onPress={() => setActiveTab("promo")}
        >
          <MaterialCommunityIcons
            name="tag-multiple"
            size={20}
            color={activeTab === "promo" ? "#ec4899" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "promo" && styles.tabTextActive,
            ]}
          >
            Promo Codes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "campaign" && styles.tabActive]}
          onPress={() => setActiveTab("campaign")}
        >
          <MaterialCommunityIcons
            name="bullhorn"
            size={20}
            color={activeTab === "campaign" ? "#667eea" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "campaign" && styles.tabTextActive,
            ]}
          >
            Campaigns
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : (
        <FlatList
          data={(activeTab === "promo" ? promoCodes : campaigns) as any[]}
          renderItem={({ item }) =>
            activeTab === "promo" ? (
              <PromoCodeCard
                promo={item as PromoCode}
                onPress={(promo) => {
                  setSelectedPromo(promo);
                  setModalVisible(true);
                }}
              />
            ) : (
              <CampaignCard
                campaign={item as MarketingCampaign}
                onPress={(campaign) => {
                  setSelectedCampaign(campaign);
                  setModalVisible(true);
                }}
              />
            )
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name={activeTab === "promo" ? "tag-multiple" : "bullhorn"}
                size={64}
                color="#d1d5db"
              />
              <Text style={styles.emptyText}>
                No {activeTab === "promo" ? "promo codes" : "campaigns"} found
              </Text>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 8,
  },
  tabActive: {
    borderBottomColor: "#ec4899",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#ec4899",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 15,
  },
  promoCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    overflow: "hidden",
  },
  campaignCard: {
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
  campaignHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  campaignIcon: {
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
  campaignInfo: {
    flex: 1,
  },
  promoCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  campaignName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    gap: 12,
    marginBottom: 12,
  },
  campaignContent: {
    gap: 12,
    marginBottom: 12,
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: 8,
  },
  discountItem: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
  },
  label: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  usageRow: {
    gap: 8,
  },
  usageLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  usageBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  usageFill: {
    height: "100%",
    backgroundColor: "#ec4899",
  },
  validDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  dateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
  },
  campaignStats: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: 8,
    gap: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
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
  campaignDesc: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  budgetItem: {
    flex: 1,
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

export default MarketingScreen;
