import { FocusAwareStatusBar } from "../../components/ui/AppStatusBar";
/**
 * Admin Portal Shell - Unified Administrative Interface with Full RBAC Governance
 * Provides role-based access control, tab navigation, 3-column module switcher launcher, and role simulation.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { AdminUser, AdminRole } from "@/types/admin";
import { adminService } from "@/services/adminService";
import {
  RBACProvider,
  useRBAC,
  AccessDeniedScreen,
  ROLE_PERMISSIONS,
} from "./rbac";

// Route Code-Splitting: Lazy load all admin screens to eliminate them from initial bundle
const AdminDashboard = React.lazy(() => import("./AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const UserManagementScreen = React.lazy(() => import("./UserManagementScreen").then((m) => ({ default: m.UserManagementScreen })));
const AgencyManagementScreen = React.lazy(() => import("./AgencyManagementScreen").then((m) => ({ default: m.AgencyManagementScreen })));
const AgenAgencyManagementScreen = React.lazy(() => import("./AgenAgencyManagementScreen"));
const DestinationManagementScreen = React.lazy(() => import("./DestinationManagementScreen").then((m) => ({ default: m.DestinationManagementScreen })));
const RefundManagementScreen = React.lazy(() => import("./RefundManagementScreen").then((m) => ({ default: m.RefundManagementScreen })));
const MarketingScreen = React.lazy(() => import("./MarketingScreen").then((m) => ({ default: m.MarketingScreen })));
const AdvertisementScreen = React.lazy(() => import("./AdvertisementScreen").then((m) => ({ default: m.AdvertisementScreen })));
const ReportsScreen = React.lazy(() => import("./ReportsScreen").then((m) => ({ default: m.ReportsScreen })));
const AgenPlatformMonitoringScreen = React.lazy(() => import("./AgenPlatformMonitoringScreen"));
const AdminSettingsScreen = React.lazy(() => import("./AdminSettingsScreen").then((m) => ({ default: m.AdminSettingsScreen })));

// Operational Screens (Lazy Loaded)
const BookingManagementScreen = React.lazy(() => import("./BookingManagementScreen").then((m) => ({ default: m.BookingManagementScreen })));
const PaymentManagementScreen = React.lazy(() => import("./PaymentManagementScreen").then((m) => ({ default: m.PaymentManagementScreen })));
const SupportCenterScreen = React.lazy(() => import("./SupportCenterScreen").then((m) => ({ default: m.SupportCenterScreen })));
const AuditLogsScreen = React.lazy(() => import("./AuditLogsScreen").then((m) => ({ default: m.AuditLogsScreen })));
const CommissionManagementScreen = React.lazy(() => import("./CommissionManagementScreen").then((m) => ({ default: m.CommissionManagementScreen })));
const ReviewModerationScreen = React.lazy(() => import("./ReviewModerationScreen").then((m) => ({ default: m.ReviewModerationScreen })));
const NotificationCenterScreen = React.lazy(() => import("./NotificationCenterScreen").then((m) => ({ default: m.NotificationCenterScreen })));
const HotelManagementScreen = React.lazy(() => import("./HotelManagementScreen").then((m) => ({ default: m.HotelManagementScreen })));
const DemandHeatmapScreen = React.lazy(() => import("./DemandHeatmapScreen").then((m) => ({ default: m.DemandHeatmapScreen })));

export type AdminTab =
  | "dashboard"
  | "booking-ops"
  | "users"
  | "hotels"
  | "agencies"
  | "agency-ops"
  | "payment-ops"
  | "refunds"
  | "commissions"
  | "destinations"
  | "reviews"
  | "support"
  | "notifications"
  | "marketing"
  | "ads"
  | "reports"
  | "demand-heatmap"
  | "monitoring"
  | "audit-trail"
  | "settings";

export interface AdminPortalShellProps {
  initialTab?: AdminTab;
}

export interface NavItemConfig {
  id: AdminTab;
  label: string;
  shortLabel: string;
  icon: string;
  category: string;
  description: string;
  badge?: string;
  color: string;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "dashboard",
    label: "Executive Dashboard",
    shortLabel: "Dashboard",
    icon: "view-dashboard",
    category: "Core",
    description: "Real-time telemetry, GMV & operational KPIs",
    badge: "Live",
    color: "#4f46e5",
  },
  {
    id: "booking-ops",
    label: "Booking Operations",
    shortLabel: "Bookings",
    icon: "ticket-confirmation",
    category: "Operations",
    description: "Multi-vertical reservation management",
    badge: "Orders",
    color: "#059669",
  },
  {
    id: "users",
    label: "Users & KYC Queue",
    shortLabel: "Users & KYC",
    icon: "account-group",
    category: "Governance",
    description: "Traveler profiles & KYC verification reviews",
    badge: "KYC",
    color: "#0284c7",
  },
  {
    id: "hotels",
    label: "Hotels & Stays",
    shortLabel: "Hotels",
    icon: "office-building-marker",
    category: "Hospitality",
    description: "Property listings, room inventory & tariffs",
    badge: "Stays",
    color: "#2563eb",
  },
  {
    id: "agencies",
    label: "B2B Agencies",
    shortLabel: "Agencies",
    icon: "domain",
    category: "B2B Agency",
    description: "Travel partner directory & licenses",
    badge: "B2B",
    color: "#7c3aed",
  },
  {
    id: "agency-ops",
    label: "Agency Operations",
    shortLabel: "Agency Ops",
    icon: "office-building",
    category: "B2B Agency",
    description: "B2B wallet credit, limits & sub-agent tracking",
    badge: "Credit",
    color: "#9333ea",
  },
  {
    id: "payment-ops",
    label: "Payment Gateways",
    shortLabel: "Payments",
    icon: "credit-card-check",
    category: "Finance",
    description: "bKash, Nagad, cards & transactions",
    badge: "Gateways",
    color: "#0d9488",
  },
  {
    id: "refunds",
    label: "Refund Management",
    shortLabel: "Refunds",
    icon: "cash-refund",
    category: "Finance",
    description: "Dispute refunds, escrow & bank settlements",
    badge: "Urgent",
    color: "#dc2626",
  },
  {
    id: "commissions",
    label: "Commission Ledger",
    shortLabel: "Commissions",
    icon: "wallet-giftcard",
    category: "Finance",
    description: "Platform rake & agency revenue splits",
    badge: "Payouts",
    color: "#d97706",
  },
  {
    id: "destinations",
    label: "Destinations CMS",
    shortLabel: "Destinations",
    icon: "map-marker-radius",
    category: "Content",
    description: "Curated travel packages, cities & landmarks",
    badge: "CMS",
    color: "#ea580c",
  },
  {
    id: "reviews",
    label: "Reviews Moderation",
    shortLabel: "Reviews",
    icon: "star-box",
    category: "Moderation",
    description: "Customer feedback, ratings & flags",
    badge: "Reviews",
    color: "#ca8a04",
  },
  {
    id: "support",
    label: "Support Tickets",
    shortLabel: "Support",
    icon: "face-agent",
    category: "Operations",
    description: "Disputes, customer inquiries & SLA resolution",
    badge: "SLA",
    color: "#0891b2",
  },
  {
    id: "notifications",
    label: "Notification Broadcast",
    shortLabel: "Notifications",
    icon: "cellphone-message",
    category: "Operations",
    description: "FCM push campaigns & system broadcasts",
    badge: "Push",
    color: "#4338ca",
  },
  {
    id: "marketing",
    label: "Marketing Campaigns",
    shortLabel: "Marketing",
    icon: "bullhorn",
    category: "Growth",
    description: "Promo discount codes & campaign pipelines",
    badge: "Coupons",
    color: "#db2777",
  },
  {
    id: "ads",
    label: "Advertisements",
    shortLabel: "Ads & Promo",
    icon: "monitor-dashboard",
    category: "Growth",
    description: "Banner placements, click rates & impressions",
    badge: "Banners",
    color: "#be185d",
  },
  {
    id: "reports",
    label: "Financial Reports",
    shortLabel: "Reports",
    icon: "chart-histogram",
    category: "Analytics",
    description: "Consolidated P&L, balance sheets & tax exports",
    badge: "P&L",
    color: "#15803d",
  },
  {
    id: "demand-heatmap",
    label: "Geospatial Heatmap",
    shortLabel: "Demand Map",
    icon: "map-marker-radius",
    category: "Analytics",
    description: "Live search velocity, route congestion & surge balancing",
    badge: "Surge",
    color: "#dc2626",
  },
  {
    id: "monitoring",
    label: "Platform Telemetry",
    shortLabel: "Monitoring",
    icon: "pulse",
    category: "Infrastructure",
    description: "Server latencies, DB health & API clusters",
    badge: "Telemetry",
    color: "#0f766e",
  },
  {
    id: "audit-trail",
    label: "Security Audit Logs",
    shortLabel: "Audit Logs",
    icon: "security-network",
    category: "Security",
    description: "Immutable administrative mutation records",
    badge: "Security",
    color: "#334155",
  },
  {
    id: "settings",
    label: "System Settings",
    shortLabel: "Settings",
    icon: "cog",
    category: "System",
    description: "Security policies, maintenance mode & thresholds",
    badge: "Config",
    color: "#1e293b",
  },
];

const CATEGORIES = [
  "All",
  "Core",
  "Operations",
  "Governance",
  "Hospitality",
  "B2B Agency",
  "Finance",
  "Growth",
  "Analytics",
  "Infrastructure",
  "Security",
  "System",
];

const ROLES_LIST: {
  id: AdminRole;
  label: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  {
    id: AdminRole.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full unconstrained administrative governance and mutation authorization",
    icon: "shield-crown",
    color: "#4f46e5",
  },
  {
    id: AdminRole.ADMIN,
    label: "Platform Admin",
    description: "General system administration, partner operations, content & moderation",
    icon: "shield-account",
    color: "#0284c7",
  },
  {
    id: AdminRole.FINANCE_ADMIN,
    label: "Finance Admin",
    description: "Refund processing, bank settlements, commissions ledger, financial reports",
    icon: "cash-multiple",
    color: "#059669",
  },
  {
    id: AdminRole.SUPPORT_ADMIN,
    label: "Support Admin",
    description: "Customer dispute tickets, KYC identity review, user moderation",
    icon: "headset",
    color: "#d97706",
  },
  {
    id: AdminRole.MARKETING_ADMIN,
    label: "Marketing Admin",
    description: "Campaigns, promotional coupons, advertisements, trending destinations",
    icon: "bullhorn",
    color: "#7c3aed",
  },
  {
    id: AdminRole.CONTENT_ADMIN,
    label: "Content Admin",
    description: "Hotel catalog verification, destination editorial, review moderation",
    icon: "file-document-edit",
    color: "#db2777",
  },
  {
    id: AdminRole.AGENCY_MANAGER,
    label: "Agency Manager",
    description: "B2B Travel Agency onboarding, compliance verification, agency operations",
    icon: "domain",
    color: "#2563eb",
  },
  {
    id: AdminRole.READONLY,
    label: "Read Only Auditor",
    description: "Strict inspection access for compliance auditors (no mutation privileges)",
    icon: "eye-outline",
    color: "#64748b",
  },
];

const AdminPortalShellInner: React.FC<AdminPortalShellProps> = ({
  initialTab = "dashboard",
}) => {
  const { admin, role, switchRole, isTabAllowed, allowedTabs } = useRBAC();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab as AdminTab);
  const [menuVisible, setMenuVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [launcherSearch, setLauncherSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Fallback to dashboard gracefully if activeTab is forbidden under active role
  useEffect(() => {
    if (!isTabAllowed(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [role, activeTab]);

  const currentRoleMeta =
    ROLES_LIST.find((r) => r.id === role) || ROLES_LIST[0];

  const accessibleNavItems = NAV_ITEMS.filter((item) => isTabAllowed(item.id));

  // Dynamic filter for 3-column launcher
  const filteredLauncherItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const q = launcherSearch.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.label.toLowerCase().includes(q) ||
        item.shortLabel.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, launcherSearch]);

  const handleLaunchTab = (tabId: AdminTab) => {
    const allowed = isTabAllowed(tabId);
    if (!allowed) {
      const item = NAV_ITEMS.find((n) => n.id === tabId);
      Alert.alert(
        "Module Restricted",
        `Access to ${item?.label || tabId} is restricted for persona ${currentRoleMeta.label}. Switch role to gain clearance.`
      );
      return;
    }
    setActiveTab(tabId);
    setMenuVisible(false);
    Keyboard.dismiss();
  };

  const renderActiveScreen = () => {
    if (!isTabAllowed(activeTab)) {
      const tabMeta = NAV_ITEMS.find((n) => n.id === activeTab);
      return (
        <AccessDeniedScreen
          tabName={tabMeta?.label || activeTab}
          requiredRole="Authorized Role"
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <AdminDashboard
            onNavigateTab={(tab: AdminTab) => setActiveTab(tab)}
            onOpenLauncher={() => setMenuVisible(true)}
            onOpenRoleModal={() => setRoleModalVisible(true)}
          />
        );
      case "booking-ops":
        return <BookingManagementScreen />;
      case "users":
        return <UserManagementScreen admin={admin} />;
      case "hotels":
        return <HotelManagementScreen admin={admin} />;
      case "agencies":
        return <AgencyManagementScreen admin={admin} />;
      case "agency-ops":
        return <AgenAgencyManagementScreen />;
      case "destinations":
        return <DestinationManagementScreen admin={admin} />;
      case "refunds":
        return <RefundManagementScreen admin={admin} />;
      case "marketing":
        return <MarketingScreen admin={admin} />;
      case "ads":
        return <AdvertisementScreen admin={admin} />;
      case "reports":
        return <ReportsScreen admin={admin} />;
      case "demand-heatmap":
        return <DemandHeatmapScreen admin={admin} onNavigateTab={(tab: string) => setActiveTab(tab as AdminTab)} />;
      case "monitoring":
        return <AgenPlatformMonitoringScreen />;
      case "settings":
        return <AdminSettingsScreen admin={admin} />;
      case "payment-ops":
        return <PaymentManagementScreen />;
      case "support":
        return <SupportCenterScreen />;
      case "audit-trail":
        return <AuditLogsScreen />;
      case "commissions":
        return <CommissionManagementScreen />;
      case "reviews":
        return <ReviewModerationScreen />;
      case "notifications":
        return <NotificationCenterScreen />;
      default:
        return (
          <AdminDashboard
            onNavigateTab={(tab: AdminTab) => setActiveTab(tab)}
            onOpenLauncher={() => setMenuVisible(true)}
            onOpenRoleModal={() => setRoleModalVisible(true)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FocusAwareStatusBar style="dark" backgroundColor="#ffffff" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <View style={styles.brandIconBox}>
              <MaterialCommunityIcons name="shield-crown" size={18} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.portalTitle}>Enterprise Command</Text>
              <Text style={styles.portalSubtitle}>Shopno Jatra Ultra Core • 20 Modules</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {/* RBAC Role Switcher Chip */}
            <TouchableOpacity
              style={[styles.roleChip, { borderColor: `${currentRoleMeta.color}50` }]}
              onPress={() => setRoleModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={currentRoleMeta.icon as any}
                size={14}
                color={currentRoleMeta.color}
              />
              <Text style={[styles.roleChipText, { color: currentRoleMeta.color }]}>
                {currentRoleMeta.label}
              </Text>
              <Ionicons name="chevron-down" size={12} color={currentRoleMeta.color} />
            </TouchableOpacity>

            {/* Dynamic 3-Column Launcher Trigger Button */}
            <TouchableOpacity
              style={styles.launcherTriggerBtn}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="view-grid" size={18} color="#ffffff" />
              <View style={styles.launcherBadgeCount}>
                <Text style={styles.launcherBadgeCountText}>20</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Horizontal Tab Bar (Filtered by active RBAC role) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          {accessibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => setActiveTab(item.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={14}
                  color={isActive ? "#ffffff" : "#64748b"}
                />
                <Text
                  style={[styles.tabText, isActive && styles.activeTabText]}
                >
                  {item.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Screen View */}
      <View style={styles.content}>
        <React.Suspense
          fallback={
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 }}>
              <ActivityIndicator size="large" color="#0284c7" />
            </View>
          }
        >
          {renderActiveScreen()}
        </React.Suspense>
      </View>

      {/* RBAC Role Switcher Modal */}
      <Modal
        visible={roleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Role-Based Access Control</Text>
                <Text style={styles.modalSubtitle}>
                  Select administrative persona to enforce authorization bounds
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRoleModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {ROLES_LIST.map((r) => {
                const isSelected = r.id === role;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleItem,
                      isSelected && { borderColor: r.color, backgroundColor: `${r.color}08` },
                    ]}
                    onPress={() => {
                      switchRole(r.id);
                      setRoleModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.roleIconCircle,
                        { backgroundColor: `${r.color}15` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={r.icon as any}
                        size={22}
                        color={r.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.roleItemTitle}>{r.label}</Text>
                        {isSelected && (
                          <View
                            style={[
                              styles.activeBadge,
                              { backgroundColor: r.color },
                            ]}
                          >
                            <Text style={styles.activeBadgeText}>ACTIVE PERSONA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.roleItemDesc}>{r.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dynamic 3-Column Launcher Switcher Modal across all 19 Screens */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.launcherModalContent}>
            
            {/* Launcher Header */}
            <View style={styles.launcherHeader}>
              <View style={styles.launcherHeaderLeft}>
                <View style={styles.launcherTitleRow}>
                  <View style={styles.launcherIconBox}>
                    <MaterialCommunityIcons name="apps" size={22} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={styles.launcherTitle}>Command Center Launcher</Text>
                    <Text style={styles.launcherSubtitle}>
                      {accessibleNavItems.length} of 19 screens authorized for{" "}
                      <Text style={{ fontWeight: "700", color: currentRoleMeta.color }}>
                        {currentRoleMeta.label}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  style={styles.switchRoleSmallBtn}
                  onPress={() => {
                    setMenuVisible(false);
                    setTimeout(() => setRoleModalVisible(true), 200);
                  }}
                >
                  <MaterialCommunityIcons name="account-switch" size={14} color="#4f46e5" />
                  <Text style={styles.switchRoleSmallBtnText}>Switch Role</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setMenuVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Instant Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Instant filter across all 19 administrative screens..."
                placeholderTextColor="#94a3b8"
                value={launcherSearch}
                onChangeText={setLauncherSearch}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {launcherSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLauncherSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <View style={styles.categoryScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryContainer}
              >
                {CATEGORIES.map((cat) => {
                  const isCatSelected = selectedCategory === cat;
                  const catCount =
                    cat === "All"
                      ? NAV_ITEMS.length
                      : NAV_ITEMS.filter((n) => n.category === cat).length;

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        isCatSelected && styles.catPillActive,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          isCatSelected && styles.catPillTextActive,
                        ]}
                      >
                        {cat} ({catCount})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Dynamic 3-Column Grid */}
            <ScrollView
              contentContainerStyle={styles.launcherGridContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredLauncherItems.length === 0 ? (
                <View style={styles.emptySearchContainer}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={42} color="#cbd5e1" />
                  <Text style={styles.emptySearchText}>No administrative screens match "{launcherSearch}"</Text>
                </View>
              ) : (
                filteredLauncherItems.map((item) => {
                  const allowed = isTabAllowed(item.id);
                  const isActive = activeTab === item.id;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.col3Card,
                        isActive && styles.col3CardActive,
                        !allowed && styles.col3CardRestricted,
                      ]}
                      onPress={() => handleLaunchTab(item.id)}
                      activeOpacity={allowed ? 0.75 : 0.6}
                    >
                      <View style={styles.col3CardInner}>
                        {/* Top Indicator Row */}
                        <View style={styles.col3HeaderRow}>
                          <View
                            style={[
                              styles.col3IconBox,
                              { backgroundColor: isActive ? "#ffffff25" : `${item.color}15` },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={item.icon as any}
                              size={20}
                              color={isActive ? "#ffffff" : item.color}
                            />
                          </View>
                          
                          {/* Status / Category Badge */}
                          {isActive ? (
                            <View style={styles.activeTabTag}>
                              <Text style={styles.activeTabTagText}>ACTIVE</Text>
                            </View>
                          ) : !allowed ? (
                            <View style={styles.restrictedLockBadge}>
                              <MaterialCommunityIcons name="lock" size={10} color="#dc2626" />
                              <Text style={styles.restrictedLockText}>Lock</Text>
                            </View>
                          ) : item.badge ? (
                            <View
                              style={[
                                styles.col3Badge,
                                { backgroundColor: `${item.color}15` },
                              ]}
                            >
                              <Text style={[styles.col3BadgeText, { color: item.color }]}>
                                {item.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Title and Short Description */}
                        <Text
                          style={[
                            styles.col3Title,
                            isActive && styles.col3TitleActive,
                            !allowed && styles.col3TitleRestricted,
                          ]}
                          numberOfLines={1}
                        >
                          {item.shortLabel}
                        </Text>
                        <Text
                          style={[
                            styles.col3Category,
                            isActive && { color: "#c7d2fe" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Quick Footer Summary */}
            <View style={styles.launcherFooter}>
              <Text style={styles.launcherFooterText}>
                Displaying {filteredLauncherItems.length} of 19 screens • Instantaneous routing enabled
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory("All");
                  setLauncherSearch("");
                }}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export const AdminPortalShell: React.FC<AdminPortalShellProps> = (props) => {
  return (
    <RBACProvider>
      <AdminPortalShellInner {...props} />
    </RBACProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIconBox: {
    backgroundColor: "#0f172a",
    padding: 6,
    borderRadius: 8,
  },
  portalTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  portalSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  launcherTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 3px rgba(15, 23, 42, 0.2)" } : {}),
  },
  launcherBadgeCount: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  launcherBadgeCountText: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "800",
  },
  tabScrollView: {
    marginTop: 4,
  },
  tabContainer: {
    paddingHorizontal: 12,
    gap: 6,
    paddingBottom: 4,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  activeTabItem: {
    backgroundColor: "#4f46e5",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  roleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  roleItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  roleItemDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 15,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },

  // Launcher Switcher Modal Styles (3-Column Layout)
  launcherModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: "90%",
  },
  launcherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  launcherHeaderLeft: {
    flex: 1,
  },
  launcherTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  launcherIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  launcherTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  launcherSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  switchRoleSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  switchRoleSmallBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4f46e5",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    padding: 0,
  },
  categoryScrollWrapper: {
    marginBottom: 12,
  },
  categoryContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  catPillActive: {
    backgroundColor: "#0f172a",
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  catPillTextActive: {
    color: "#ffffff",
  },

  // 3-Column Switcher Grid Layout
  launcherGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  col3Card: {
    width: "31.3%",
    marginHorizontal: "1%",
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
    minHeight: 88,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.03)" } : {}),
  },
  col3CardActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4338ca",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 4px rgba(15, 23, 42, 0.25)" } : {}),
  },
  col3CardRestricted: {
    backgroundColor: "#f8fafc",
    borderColor: "#f1f5f9",
    opacity: 0.65,
  },
  col3CardInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  col3HeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  col3IconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  col3Badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  col3BadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeTabTag: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeTabTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4f46e5",
  },
  restrictedLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  restrictedLockText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },
  col3Title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  col3TitleActive: {
    color: "#ffffff",
  },
  col3TitleRestricted: {
    color: "#94a3b8",
  },
  col3Category: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "500",
  },
  emptySearchContainer: {
    width: "100%",
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySearchText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  launcherFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  launcherFooterText: {
    fontSize: 12,
    color: "#64748b",
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4f46e5",
  },
});

export default AdminPortalShell;
