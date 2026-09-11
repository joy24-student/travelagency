/**
 * Admin Portal Shell - Complete Unified Administrative Interface
 * Provides tab navigation and top bar switching across all 18 Admin Panel Modules
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminUser } from "@/types/admin";
import { adminService } from "@/services/adminService";

// Import all Admin Screens
import { AdminDashboard } from "./AdminDashboard";
import { UserManagementScreen } from "./UserManagementScreen";
import { AgencyManagementScreen } from "./AgencyManagementScreen";
import AgenAgencyManagementScreen from "./AgenAgencyManagementScreen";
import { DestinationManagementScreen } from "./DestinationManagementScreen";
import { RefundManagementScreen } from "./RefundManagementScreen";
import { MarketingScreen } from "./MarketingScreen";
import { AdvertisementScreen } from "./AdvertisementScreen";
import { ReportsScreen } from "./ReportsScreen";
import AgenPlatformMonitoringScreen from "./AgenPlatformMonitoringScreen";
import { AdminSettingsScreen } from "./AdminSettingsScreen";

// Import new Operational Screens
import { BookingManagementScreen } from "./BookingManagementScreen";
import { PaymentManagementScreen } from "./PaymentManagementScreen";
import { SupportCenterScreen } from "./SupportCenterScreen";
import { AuditLogsScreen } from "./AuditLogsScreen";
import { CommissionManagementScreen } from "./CommissionManagementScreen";
import { ReviewModerationScreen } from "./ReviewModerationScreen";
import { NotificationCenterScreen } from "./NotificationCenterScreen";
import { HotelManagementScreen } from "./HotelManagementScreen";

export type AdminTab =
  | "dashboard"
  | "booking-ops"
  | "users"
  | "agencies"
  | "agency-ops"
  | "hotels"
  | "destinations"
  | "refunds"
  | "marketing"
  | "ads"
  | "reports"
  | "monitoring"
  | "settings"
  | "payment-ops"
  | "support"
  | "audit-trail"
  | "commissions"
  | "reviews"
  | "notifications";

interface AdminPortalShellProps {
  initialTab?: AdminTab;
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: string; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "view-dashboard" },
  { id: "booking-ops", label: "Bookings", icon: "ticket-confirmation" },
  { id: "users", label: "Users & KYC", icon: "account-group" },
  { id: "hotels", label: "Hotel Management", icon: "office-building-marker" },
  { id: "agencies", label: "Agencies", icon: "domain" },
  { id: "agency-ops", label: "Agency Ops", icon: "office-building" },
  { id: "payment-ops", label: "Payments", icon: "credit-card-check" },
  { id: "refunds", label: "Refunds", icon: "cash-refund" },
  { id: "commissions", label: "Commissions", icon: "wallet-giftcard" },
  { id: "destinations", label: "Destinations", icon: "map-marker-radius" },
  { id: "reviews", label: "Reviews", icon: "star-box" },
  { id: "support", label: "Support Tickets", icon: "face-agent" },
  { id: "notifications", label: "Notifications", icon: "cellphone-message" },
  { id: "marketing", label: "Marketing", icon: "bullhorn" },
  { id: "ads", label: "Ads", icon: "monitor-dashboard" },
  { id: "reports", label: "Reports", icon: "chart-histogram" },
  { id: "monitoring", label: "Monitoring", icon: "pulse" },
  { id: "audit-trail", label: "Audit Logs", icon: "security-network" },
  { id: "settings", label: "Settings", icon: "cog" },
];

export const AdminPortalShell: React.FC<AdminPortalShellProps> = ({
  initialTab = "dashboard",
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab as AdminTab);
  const [menuVisible, setMenuVisible] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    adminService.getCurrentAdmin().then(setAdmin);
  }, []);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
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
        return <AdminDashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <View style={{ backgroundColor: "#2D4B42", padding: 6, borderRadius: 8 }}>
              <MaterialCommunityIcons name="shield-crown" size={18} color="#ffffff" />
            </View>
            <Text style={styles.portalTitle}>Admin Portal</Text>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <MaterialCommunityIcons name="grid-large" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => setActiveTab(item.id)}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={16}
                  color={isActive ? "#ffffff" : "#64748b"}
                />
                <Text
                  style={[styles.tabText, isActive && styles.activeTabText]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Module Screen Content */}
      <View style={styles.content}>{renderActiveScreen()}</View>

      {/* Grid Switcher Modal */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Admin Module</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.gridContainer}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    activeTab === item.id && styles.gridCardActive,
                  ]}
                  onPress={() => {
                    setActiveTab(item.id);
                    setMenuVisible(false);
                  }}
                >
                  <LinearGradient
                    colors={
                      activeTab === item.id
                        ? ["#4f46e5", "#3730a3"]
                        : ["#f8fafc", "#f1f5f9"]
                    }
                    style={styles.gridCardGradient}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={28}
                      color={activeTab === item.id ? "#ffffff" : "#4f46e5"}
                    />
                    <Text
                      style={[
                        styles.gridCardText,
                        activeTab === item.id && styles.gridCardTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F7",
  },
  topHeader: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "relative",
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  portalTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  menuButton: {
    position: "absolute",
    right: 16,
    padding: 6,
    borderRadius: 8,
  },
  tabScrollView: {
    marginTop: 4,
  },
  tabContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    gap: 6,
  },
  activeTabItem: {
    backgroundColor: "#2D4B42",
  },
  tabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 20,
  },
  gridCard: {
    width: "30%",
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
  },
  gridCardActive: {
    borderWidth: 2,
    borderColor: "#4f46e5",
  },
  gridCardGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 6,
  },
  gridCardText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  gridCardTextActive: {
    color: "#ffffff",
  },
});
