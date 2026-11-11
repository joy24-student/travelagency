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
import { useResponsive } from "@/hooks/useResponsive";
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
const AgencyKycReviewScreen = React.lazy(() => import("./AgencyKycReviewScreen").then((m) => ({ default: m.AgencyKycReviewScreen })));
const MarketplaceManagementScreen = React.lazy(() => import("./MarketplaceManagementScreen").then((m) => ({ default: m.MarketplaceManagementScreen })));
const HeroBannerManagementScreen = React.lazy(() => import("./HeroBannerManagementScreen").then((m) => ({ default: m.HeroBannerManagementScreen })));

export type AdminTab =
  | "dashboard"
  | "hero-banners"
  | "marketplace"
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
  | "agency-kyc"
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
    id: "marketplace",
    label: "Local Guides & Boatmen",
    shortLabel: "Marketplace",
    icon: "compass",
    category: "Operations",
    description: "Provider verifications, active trips & emergency dispatch",
    badge: "MKT",
    color: "#0055F2",
  },
  {
    id: "agency-kyc",
    label: "Agency KYC Approvals",
    shortLabel: "KYC Review",
    icon: "shield-check",
    category: "Operations",
    description: "Review trade licenses, TIN, and identity verification",
    badge: "KYC",
    color: "#10b981",
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
    id: "hero-banners",
    label: "Hero Banner & Search",
    shortLabel: "Hero & Search",
    icon: "image-edit",
    category: "Growth",
    description: "Manage dynamic home banner, headlines, images & trending suggestions",
    badge: "Dynamic",
    color: "#0284c7",
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
  const { width, isDesktop } = useResponsive();
  const { admin, role, switchRole, isTabAllowed, allowedTabs } = useRBAC();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab as AdminTab);
  const [menuVisible, setMenuVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [launcherSearch, setLauncherSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Portal White Label Shell state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bookingMenuOpen, setBookingMenuOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [dateRange, setDateRange] = useState("01 May 2024 - 31 May 2024");
  const [dateRangeMenuVisible, setDateRangeMenuVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

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
      case "agency-kyc":
        return <AgencyKycReviewScreen />;
      case "marketplace":
        return <MarketplaceManagementScreen />;
      case "destinations":
        return <DestinationManagementScreen admin={admin} />;
      case "refunds":
        return <RefundManagementScreen admin={admin} />;
      case "marketing":
        return <MarketingScreen admin={admin} />;
      case "hero-banners":
        return <HeroBannerManagementScreen />;
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

  const renderSidebarContent = (isDrawer = false) => {
    const isSlim = sidebarCollapsed && !isDrawer;
    return (
      <View style={[styles.sidebarContainer, isSlim && styles.sidebarContainerSlim]}>
        {/* Brand Header */}
        <View style={styles.sidebarBrand}>
          <View style={styles.brandLogoRow}>
            <View style={styles.brandLogoBox}>
              <MaterialCommunityIcons name="shield-airplane" size={20} color="#ffffff" />
            </View>
            {!isSlim && (
              <View style={styles.brandTitleBox}>
                <Text style={styles.brandName}>Rayds</Text>
                <Text style={styles.brandSubtitle}>Travel Portal</Text>
              </View>
            )}
          </View>
          {isDrawer && (
            <TouchableOpacity onPress={() => setMobileDrawerVisible(false)} style={styles.closeDrawerBtn}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Menu items */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.sidebarMenuScroll}>
          {/* Dashboard */}
          <TouchableOpacity
            style={[styles.sidebarItem, activeTab === "dashboard" && styles.sidebarItemActive]}
            onPress={() => {
              setActiveTab("dashboard");
              if (isDrawer) setMobileDrawerVisible(false);
            }}
          >
            <MaterialCommunityIcons
              name="view-dashboard"
              size={18}
              color={activeTab === "dashboard" ? "#ffffff" : "#94A3B8"}
            />
            {!isSlim && (
              <Text style={[styles.sidebarItemText, activeTab === "dashboard" && styles.sidebarItemTextActive]}>
                Dashboard
              </Text>
            )}
          </TouchableOpacity>

          {/* User Management */}
          <TouchableOpacity
            style={[styles.sidebarItem, styles.sidebarItemDropdown]}
            onPress={() => setUserMenuOpen(!userMenuOpen)}
          >
            <View style={styles.sidebarItemLeft}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color="#94A3B8" />
              {!isSlim && <Text style={styles.sidebarItemText}>User Management</Text>}
            </View>
            {!isSlim && (
              <Ionicons
                name={userMenuOpen ? "chevron-down" : "chevron-forward"}
                size={14}
                color="#94A3B8"
              />
            )}
          </TouchableOpacity>

          {userMenuOpen && !isSlim && (
            <View style={styles.sidebarSubMenu}>
              <TouchableOpacity
                style={[styles.sidebarSubItem, activeTab === "users" && styles.sidebarSubItemActive]}
                onPress={() => {
                  setActiveTab("users");
                  if (isDrawer) setMobileDrawerVisible(false);
                }}
              >
                <View style={[styles.sidebarSubDot, activeTab === "users" && styles.sidebarSubDotActive]} />
                <Text style={[styles.sidebarSubText, activeTab === "users" && styles.sidebarSubTextActive]}>
                  Users & KYC Queue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sidebarSubItem, activeTab === "agency-kyc" && styles.sidebarSubItemActive]}
                onPress={() => {
                  setActiveTab("agency-kyc");
                  if (isDrawer) setMobileDrawerVisible(false);
                }}
              >
                <View style={[styles.sidebarSubDot, activeTab === "agency-kyc" && styles.sidebarSubDotActive]} />
                <Text style={[styles.sidebarSubText, activeTab === "agency-kyc" && styles.sidebarSubTextActive]}>
                  Agency KYC Review
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Booking Management */}
          <TouchableOpacity
            style={[
              styles.sidebarItem,
              styles.sidebarItemDropdown,
              (activeTab === "booking-ops" || activeTab === "hotels") && styles.sidebarItemActiveParent,
            ]}
            onPress={() => setBookingMenuOpen(!bookingMenuOpen)}
          >
            <View style={styles.sidebarItemLeft}>
              <MaterialCommunityIcons
                name="ticket-confirmation-outline"
                size={18}
                color={bookingMenuOpen ? "#38bdf8" : "#94A3B8"}
              />
              {!isSlim && (
                <Text
                  style={[
                    styles.sidebarItemText,
                    bookingMenuOpen && { color: "#ffffff", fontWeight: "600" },
                  ]}
                >
                  Booking Management
                </Text>
              )}
            </View>
            {!isSlim && (
              <Ionicons
                name={bookingMenuOpen ? "chevron-down" : "chevron-forward"}
                size={14}
                color="#94A3B8"
              />
            )}
          </TouchableOpacity>

          {bookingMenuOpen && !isSlim && (
            <View style={styles.sidebarSubMenu}>
              {[
                { label: "Flight Bookings", tab: "booking-ops" as AdminTab },
                { label: "Hotel Bookings", tab: "hotels" as AdminTab },
                { label: "Bus Bookings", tab: "booking-ops" as AdminTab },
                { label: "Holiday Bookings", tab: "destinations" as AdminTab },
                { label: "Visa Bookings", tab: "booking-ops" as AdminTab },
                { label: "All Bookings", tab: "booking-ops" as AdminTab },
              ].map((sub, idx) => {
                const isSubActive = activeTab === sub.tab;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sidebarSubItem, isSubActive && styles.sidebarSubItemActive]}
                    onPress={() => {
                      setActiveTab(sub.tab);
                      if (isDrawer) setMobileDrawerVisible(false);
                    }}
                  >
                    <View
                      style={[styles.sidebarSubDot, isSubActive && styles.sidebarSubDotActive]}
                    />
                    <Text
                      style={[styles.sidebarSubText, isSubActive && styles.sidebarSubTextActive]}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Other Nav Items matching the reference screenshot */}
          {[
            { label: "Enquiries", tab: "support" as AdminTab, icon: "message-question-outline" },
            { label: "Customers", tab: "users" as AdminTab, icon: "account-box-multiple-outline" },
            { label: "Suppliers", tab: "agencies" as AdminTab, icon: "domain" },
            { label: "Markup Management", tab: "commissions" as AdminTab, icon: "percent-outline" },
            { label: "Promo Codes", tab: "marketing" as AdminTab, icon: "ticket-percent-outline" },
            { label: "CMS Management", tab: "destinations" as AdminTab, icon: "file-document-edit-outline" },
            { label: "Reports", tab: "reports" as AdminTab, icon: "chart-bar" },
            { label: "Wallet Management", tab: "payment-ops" as AdminTab, icon: "wallet-outline" },
            { label: "Payment Gateway", tab: "settings" as AdminTab, icon: "credit-card-outline" },
            { label: "Settings", tab: "settings" as AdminTab, icon: "cog-outline" },
          ].map((item, idx) => {
            const isActive = activeTab === item.tab;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => {
                  setActiveTab(item.tab);
                  if (isDrawer) setMobileDrawerVisible(false);
                }}
              >
                <View style={styles.sidebarItemLeft}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={18}
                    color={isActive ? "#ffffff" : "#94A3B8"}
                  />
                  {!isSlim && (
                    <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                      {item.label}
                    </Text>
                  )}
                </View>
                {!isSlim && <Ionicons name="chevron-forward" size={13} color="#475569" />}
              </TouchableOpacity>
            );
          })}

          {/* Logout */}
          <TouchableOpacity
            style={[styles.sidebarItem, { marginTop: 14, marginBottom: 28 }]}
            onPress={() => {
              Alert.alert(
                "White Label Portal",
                "Are you sure you want to exit the administrative session?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Exit", style: "destructive", onPress: () => setActiveTab("dashboard") },
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#ef4444" />
            {!isSlim && <Text style={[styles.sidebarItemText, { color: "#ef4444" }]}>Logout</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderTopHeader = () => (
    <View style={styles.topHeader}>
      <View style={styles.headerRow}>
        {/* Left: Hamburger + Title */}
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => {
              if (isDesktop) {
                setSidebarCollapsed(!sidebarCollapsed);
              } else {
                setMobileDrawerVisible(true);
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="menu" size={20} color="#334155" />
          </TouchableOpacity>

          <Text style={styles.welcomeText} numberOfLines={1}>
            Welcome to Rayds White Label Travel Portal
          </Text>
        </View>

        {/* Right Controls matching the screenshot */}
        <View style={styles.headerRightControls}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.headerPillBtn}
            onPress={() => setLanguageMenuVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="globe-outline" size={14} color="#64748B" />
            <Text style={styles.headerPillText}>{selectedLanguage}</Text>
            <Ionicons name="chevron-down" size={11} color="#64748B" />
          </TouchableOpacity>

          {/* Notifications Bell with 12 */}
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => setNotificationsModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color="#334155" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>12</Text>
            </View>
          </TouchableOpacity>

          {/* Admin Profile */}
          <TouchableOpacity
            style={styles.adminProfileChip}
            onPress={() => setRoleModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.adminAvatarBox}>
              <MaterialCommunityIcons name="account" size={18} color="#2563EB" />
            </View>
            <View style={styles.adminProfileInfo}>
              <Text style={styles.adminName}>Admin</Text>
              <Text style={styles.adminRoleSubtitle}>{currentRoleMeta.label}</Text>
            </View>
          </TouchableOpacity>

          {/* Date Range Filter */}
          <TouchableOpacity
            style={styles.dateRangePickerBtn}
            onPress={() => setDateRangeMenuVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="calendar-range" size={14} color="#64748B" />
            <Text style={styles.dateRangeText}>{dateRange}</Text>
            <Ionicons name="chevron-down" size={12} color="#64748B" />
          </TouchableOpacity>

          {/* 3-Column Module Launcher Trigger Button */}
          <TouchableOpacity
            style={styles.launcherTriggerBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="view-grid" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FocusAwareStatusBar style="dark" backgroundColor="#ffffff" />

      {isDesktop ? (
        /* Desktop Two-Column Layout */
        <View style={styles.desktopLayoutRow}>
          {renderSidebarContent(false)}
          <View style={styles.desktopContentColumn}>
            {renderTopHeader()}
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
          </View>
        </View>
      ) : (
        /* Mobile / Tablet View */
        <View style={{ flex: 1 }}>
          {renderTopHeader()}
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

          {/* Mobile Drawer */}
          <Modal
            visible={mobileDrawerVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setMobileDrawerVisible(false)}
          >
            <View style={styles.modalOverlayDark}>
              <View style={styles.mobileDrawerPanel}>
                {renderSidebarContent(true)}
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setMobileDrawerVisible(false)}
                activeOpacity={1}
              />
            </View>
          </Modal>
        </View>
      )}

      {/* Language Selector Modal */}
      <Modal
        visible={languageMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLanguageMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguageMenuVisible(false)}
        >
          <View style={styles.smallDropdownModal}>
            <Text style={styles.dropdownModalTitle}>Select Language</Text>
            {["English", "বাংলা", "العربية"].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.dropdownOptionRow,
                  selectedLanguage === lang && styles.dropdownOptionRowActive,
                ]}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setLanguageMenuVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    selectedLanguage === lang && styles.dropdownOptionTextActive,
                  ]}
                >
                  {lang}
                </Text>
                {selectedLanguage === lang && (
                  <Ionicons name="checkmark" size={16} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Range Modal */}
      <Modal
        visible={dateRangeMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDateRangeMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDateRangeMenuVisible(false)}
        >
          <View style={styles.smallDropdownModal}>
            <Text style={styles.dropdownModalTitle}>Time Horizon Range</Text>
            {[
              "01 May 2024 - 31 May 2024",
              "Last 30 Days",
              "Last 14 Days",
              "Last 7 Days",
              "Today (Live Telemetry)",
            ].map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.dropdownOptionRow,
                  dateRange === range && styles.dropdownOptionRowActive,
                ]}
                onPress={() => {
                  setDateRange(range);
                  setDateRangeMenuVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    dateRange === range && styles.dropdownOptionTextActive,
                  ]}
                >
                  {range}
                </Text>
                {dateRange === range && (
                  <Ionicons name="checkmark" size={16} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Drawer Modal */}
      <Modal
        visible={notificationsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotificationsModalVisible(false)}
        >
          <View style={styles.notificationsModalContent}>
            <View style={styles.notifHeaderRow}>
              <Text style={styles.dropdownModalTitle}>Active Notifications</Text>
              <View style={styles.notifBadgeInner}>
                <Text style={styles.notifBadgeInnerText}>12 New</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {[
                { title: "New Flight Booking ORD123456", time: "2 mins ago", sub: "Amit Kumar booked 6E1X7A (DEL-BOM)" },
                { title: "Pending Visa Verification", time: "15 mins ago", sub: "Vikram Das submitted UAE Tourist Visa docs" },
                { title: "Hotel Room Confirmed", time: "32 mins ago", sub: "Neha Sharma confirmed Goa Stay reservation" },
                { title: "Bus Booking Completed", time: "1 hr ago", sub: "Ravi Singh completed Delhi-Jaipur transit" },
              ].map((n, i) => (
                <View key={i} style={styles.notifItemRow}>
                  <View style={styles.notifDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>{n.title}</Text>
                    <Text style={styles.notifItemSub}>{n.sub}</Text>
                    <Text style={styles.notifItemTime}>{n.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.markAllReadBtn}
              onPress={() => setNotificationsModalVisible(false)}
            >
              <Text style={styles.markAllReadText}>Close Notifications</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  // Desktop & Mobile SaaS Layout Styles
  desktopLayoutRow: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  desktopContentColumn: {
    flex: 1,
    height: "100%",
  },
  sidebarContainer: {
    width: 240,
    backgroundColor: "#0B132B",
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
    height: "100%",
  },
  sidebarContainerSlim: {
    width: 72,
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  brandLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitleBox: {},
  brandName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  sidebarMenuScroll: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  sidebarItemActive: {
    backgroundColor: "#2563EB",
  },
  sidebarItemActiveParent: {
    backgroundColor: "#1E293B",
  },
  sidebarItemDropdown: {},
  sidebarItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sidebarItemText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
  },
  sidebarItemTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  sidebarSubMenu: {
    paddingLeft: 18,
    paddingVertical: 4,
  },
  sidebarSubItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
  },
  sidebarSubItemActive: {
    backgroundColor: "#1E293B",
  },
  sidebarSubDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },
  sidebarSubDotActive: {
    backgroundColor: "#38BDF8",
    width: 6,
    height: 6,
  },
  sidebarSubText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  sidebarSubTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  closeDrawerBtn: {
    padding: 4,
  },
  modalOverlayDark: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
  },
  mobileDrawerPanel: {
    width: 280,
    height: "100%",
    backgroundColor: "#0B132B",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  hamburgerBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  welcomeText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 360,
  },
  headerRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerPillText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  notificationBtn: {
    position: "relative",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  notifBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  adminProfileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  adminAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  adminProfileInfo: {},
  adminName: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  adminRoleSubtitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "500",
  },
  dateRangePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  dateRangeText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  smallDropdownModal: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownModalTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  dropdownOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dropdownOptionRowActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownOptionText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  notificationsModalContent: {
    width: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  notifHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  notifBadgeInner: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifBadgeInnerText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  notifItemRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginTop: 5,
  },
  notifItemTitle: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  notifItemSub: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  notifItemTime: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },
  markAllReadBtn: {
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    alignItems: "center",
  },
  markAllReadText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default AdminPortalShell;
