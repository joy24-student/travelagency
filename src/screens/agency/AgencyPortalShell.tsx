/**
 * AgencyPortalShell.tsx
 * Enterprise-grade B2B Travel Agency Web Portal Shell
 * Fully dynamic desktop & tablet web portal for travel agencies
 * Provides 12 complete operational modules:
 * 1. Executive Dashboard & Telemetry
 * 2. B2B Flight Search & Instant Ticketing Engine
 * 3. B2B Hotel & Stays Reservation Engine
 * 4. Holiday Packages & Umrah Booking
 * 5. All Bookings & PNR Operations Management
 * 6. B2B Wallet, Credit Line & Financial Ledger
 * 7. Customer CRM & Traveler Passport Vault
 * 8. White-Label Quotation & Itinerary Generator
 * 9. Sub-Agent & Staff RBAC Management
 * 10. Agency Markup & Commission Engine
 * 11. Verification & KYC Document Vault
 * 12. 24/7 B2B Operations & Ticketing Desk Support
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

export type AgencyTab =
  | "dashboard"
  | "flights"
  | "hotels"
  | "packages"
  | "bookings"
  | "wallet"
  | "customers"
  | "quotations"
  | "team"
  | "markups"
  | "verification"
  | "support";

export interface AgencyPortalShellProps {
  initialTab?: AgencyTab;
}

interface NavItem {
  id: AgencyTab;
  label: string;
  shortLabel: string;
  icon: string;
  category: "Core" | "Booking Engines" | "Operations" | "Finance & Management";
  badge?: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Executive Dashboard",
    shortLabel: "Dashboard",
    icon: "view-dashboard",
    category: "Core",
    badge: "Live",
    color: "#4F46E5",
  },
  {
    id: "flights",
    label: "B2B Flight Engine",
    shortLabel: "Flights",
    icon: "airplane-takeoff",
    category: "Booking Engines",
    badge: "Wholesale",
    color: "#06B6D4",
  },
  {
    id: "hotels",
    label: "B2B Hotel Engine",
    shortLabel: "Hotels",
    icon: "office-building",
    category: "Booking Engines",
    badge: "Special Rates",
    color: "#3B82F6",
  },
  {
    id: "packages",
    label: "Tours & Umrah",
    shortLabel: "Packages",
    icon: "compass-rose",
    category: "Booking Engines",
    color: "#10B981",
  },
  {
    id: "bookings",
    label: "Bookings & PNR Ops",
    shortLabel: "Bookings",
    icon: "ticket-confirmation",
    category: "Operations",
    badge: "14 Active",
    color: "#8B5CF6",
  },
  {
    id: "wallet",
    label: "B2B Wallet & Credit",
    shortLabel: "Wallet",
    icon: "wallet-outline",
    category: "Finance & Management",
    badge: "৳2.45L",
    color: "#F59E0B",
  },
  {
    id: "customers",
    label: "Client CRM & Passports",
    shortLabel: "Clients",
    icon: "account-group",
    category: "Operations",
    color: "#EC4899",
  },
  {
    id: "quotations",
    label: "Quotation Builder",
    shortLabel: "Quotations",
    icon: "file-document-edit-outline",
    category: "Operations",
    badge: "White-Label",
    color: "#14B8A6",
  },
  {
    id: "team",
    label: "Team & Staff RBAC",
    shortLabel: "Staff",
    icon: "shield-account",
    category: "Finance & Management",
    color: "#6366F1",
  },
  {
    id: "markups",
    label: "Markups & Tiers",
    shortLabel: "Markups",
    icon: "percent",
    category: "Finance & Management",
    badge: "Gold Tier",
    color: "#F97316",
  },
  {
    id: "verification",
    label: "Agency KYC & License",
    shortLabel: "KYC Vault",
    icon: "certificate",
    category: "Finance & Management",
    badge: "Verified",
    color: "#22C55E",
  },
  {
    id: "support",
    label: "24/7 B2B Ticket Desk",
    shortLabel: "Support",
    icon: "headphones",
    category: "Core",
    badge: "Online",
    color: "#E11D48",
  },
];

// Theme Constants
const THEME = {
  bg: "#0B1326",
  sidebar: "#0F1A30",
  sidebarActive: "#1A2644",
  topbar: "#131E38",
  card: "#17223D",
  cardAlt: "#1E2B4C",
  primary: "#4F46E5",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "rgba(255, 255, 255, 0.08)",
  borderActive: "rgba(99, 102, 241, 0.4)",
};

export function AgencyPortalShell({ initialTab = "dashboard" }: AgencyPortalShellProps) {
  const [activeTab, setActiveTab] = useState<AgencyTab>(initialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Agency Context
  const [agencyName, setAgencyName] = useState("SkyWings Holidays & Travel Ltd.");
  const [agencyCode, setAgencyCode] = useState("SWH-8821");
  const [agencyRole, setAgencyRole] = useState<"owner" | "manager" | "ticketing" | "finance">("owner");
  const [walletBalance, setWalletBalance] = useState(245800);
  const [creditLimit, setCreditLimit] = useState(500000);
  const [notificationsCount, setNotificationsCount] = useState(3);

  // Responsive Layout detection
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get("window").width
  );

  useEffect(() => {
    const handler = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
      if (window.width < 900) {
        setIsSidebarCollapsed(true);
      }
    };
    const sub = Dimensions.addEventListener("change", handler);
    return () => sub.remove();
  }, []);

  const isDesktop = windowWidth >= 1024;

  // Global Deposit Modal
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState<"bank" | "bkash">("bank");
  const [depositRef, setDepositRef] = useState("");

  const handleDepositSubmit = () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid deposit amount.");
      return;
    }
    setWalletBalance((prev) => prev + amt);
    setDepositModalVisible(false);
    setDepositAmount("");
    setDepositRef("");
    Alert.alert("Deposit Confirmed", `৳${amt.toLocaleString()} has been added to your B2B Wallet balance.`);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <TouchableOpacity
            style={styles.toggleSidebarBtn}
            onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <Feather
              name={isSidebarCollapsed ? "menu" : "chevron-left"}
              size={20}
              color={THEME.text}
            />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <LinearGradient
              colors={["#4F46E5", "#06B6D4"]}
              style={styles.logoBadge}
            >
              <MaterialCommunityIcons name="airplane" size={18} color="#FFF" />
            </LinearGradient>
            <View>
              <View style={styles.agencyNameRow}>
                <Text style={styles.brandText}>{agencyName}</Text>
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={13} color="#22C55E" />
                  <Text style={styles.verifiedText}>IATA Verified</Text>
                </View>
              </View>
              <Text style={styles.agencyCodeText}>Agency ID: {agencyCode} • B2B Partner Portal</Text>
            </View>
          </View>
        </View>

        {/* Global Search & Financial Quick Actions */}
        <View style={styles.topbarRight}>
          {isDesktop && (
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={THEME.textMuted} />
              <TextInput
                value={globalSearch}
                onChangeText={setGlobalSearch}
                placeholder="Search PNR, Ticket, Traveler, Flight..."
                placeholderTextColor={THEME.textMuted}
                style={styles.searchInput}
              />
            </View>
          )}

          {/* Real-time B2B Wallet Indicator */}
          <TouchableOpacity
            style={styles.walletPill}
            onPress={() => setDepositModalVisible(true)}
          >
            <MaterialCommunityIcons name="wallet" size={18} color={THEME.success} />
            <View style={styles.walletTextCol}>
              <Text style={styles.walletLabel}>WALLET BALANCE</Text>
              <Text style={styles.walletAmount}>৳{walletBalance.toLocaleString()}</Text>
            </View>
            <View style={styles.addDepositBtn}>
              <Text style={styles.addDepositText}>+ Top Up</Text>
            </View>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => Alert.alert("Notifications", "You have 3 operational alerts:\n- Ticket reissue confirmed for PNR SW-9182\n- Wallet deposit ৳150,000 verified\n- Passport expiry alert for Traveler Tanvir Ahmed")}
          >
            <Feather name="bell" size={18} color={THEME.text} />
            {notificationsCount > 0 && (
              <View style={styles.badgeIndicator}>
                <Text style={styles.badgeIndicatorText}>{notificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Role Badge */}
          <View style={styles.userProfilePill}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarTxt}>SW</Text>
            </View>
            {isDesktop && (
              <View>
                <Text style={styles.userName}>Managing Director</Text>
                <Text style={styles.roleLabel}>Agency Admin</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main Body: Sidebar + Dynamic Workspace */}
      <View style={styles.mainBody}>
        {/* Responsive Sidebar Navigation */}
        <View
          style={[
            styles.sidebar,
            isSidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                    isSidebarCollapsed && styles.navItemCollapsed,
                  ]}
                  onPress={() => setActiveTab(item.id)}
                >
                  <View
                    style={[
                      styles.navIconBox,
                      { backgroundColor: isActive ? `${item.color}30` : "transparent" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={isActive ? item.color : THEME.textMuted}
                    />
                  </View>

                  {!isSidebarCollapsed && (
                    <View style={styles.navLabelContainer}>
                      <Text
                        style={[
                          styles.navLabel,
                          isActive && styles.navLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View
                          style={[
                            styles.navBadge,
                            { backgroundColor: `${item.color}25`, borderColor: `${item.color}60` },
                          ]}
                        >
                          <Text style={[styles.navBadgeText, { color: item.color }]}>
                            {item.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sidebar Footer */}
          {!isSidebarCollapsed && (
            <View style={styles.sidebarFooter}>
              <View style={styles.creditLineCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.creditLineLabel}>Credit Line Available</Text>
                  <Text style={styles.creditLineVal}>৳435,000</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: "87%" }]} />
                </View>
                <Text style={styles.creditLineSub}>Limit: ৳500,000 • Tier: Gold B2B</Text>
              </View>
            </View>
          )}
        </View>

        {/* Dynamic Module Content Area */}
        <View style={styles.workspace}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.workspaceScroll}
          >
            {renderTabContent(activeTab, {
              walletBalance,
              setWalletBalance,
              setDepositModalVisible,
              setActiveTab,
            })}
          </ScrollView>
        </View>
      </View>

      {/* Global Top-up Deposit Modal */}
      <Modal
        visible={depositModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.rowCenter}>
                <MaterialCommunityIcons name="wallet-plus" size={24} color={THEME.accent} />
                <Text style={styles.modalTitle}>Add Deposit to B2B Wallet</Text>
              </View>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMethodRow}>
              <TouchableOpacity
                style={[
                  styles.modalMethodBtn,
                  depositMethod === "bank" && styles.modalMethodBtnActive,
                ]}
                onPress={() => setDepositMethod("bank")}
              >
                <Text
                  style={[
                    styles.modalMethodTxt,
                    depositMethod === "bank" && styles.modalMethodTxtActive,
                  ]}
                >
                  Bank Deposit / RTGS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalMethodBtn,
                  depositMethod === "bkash" && styles.modalMethodBtnActive,
                ]}
                onPress={() => setDepositMethod("bkash")}
              >
                <Text
                  style={[
                    styles.modalMethodTxt,
                    depositMethod === "bkash" && styles.modalMethodTxtActive,
                  ]}
                >
                  bKash / Nagad Instant
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bankInstructionBox}>
              <Text style={styles.bankInstTitle}>ShopnoJatra Corporate Account:</Text>
              <Text style={styles.bankInstText}>Eastern Bank Ltd (EBL) • A/C: 104-102-0091823</Text>
              <Text style={styles.bankInstText}>Account Name: ShopnoJatra Global Travel Ltd.</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Deposit Amount (BDT) *</Text>
              <TextInput
                value={depositAmount}
                onChangeText={setDepositAmount}
                placeholder="e.g. 100000"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Transaction Reference / Slip No. *</Text>
              <TextInput
                value={depositRef}
                onChangeText={setDepositRef}
                placeholder="e.g. EBL-DEP-88219"
                placeholderTextColor={THEME.textMuted}
                style={styles.modalInput}
              />
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleDepositSubmit}>
              <LinearGradient colors={["#4F46E5", "#06B6D4"]} style={styles.modalSubmitGradient}>
                <Text style={styles.modalSubmitText}>Confirm & Credit Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// DYNAMIC TAB MODULE RENDERERS
// ============================================================================

function renderTabContent(tab: AgencyTab, ctx: any) {
  switch (tab) {
    case "dashboard":
      return <DashboardModule ctx={ctx} />;
    case "flights":
      return <FlightEngineModule ctx={ctx} />;
    case "hotels":
      return <HotelEngineModule ctx={ctx} />;
    case "packages":
      return <PackagesModule ctx={ctx} />;
    case "bookings":
      return <BookingsModule ctx={ctx} />;
    case "wallet":
      return <WalletModule ctx={ctx} />;
    case "customers":
      return <CustomerCRMModule ctx={ctx} />;
    case "quotations":
      return <QuotationModule ctx={ctx} />;
    case "team":
      return <TeamRBACModule ctx={ctx} />;
    case "markups":
      return <MarkupSettingsModule ctx={ctx} />;
    case "verification":
      return <VerificationModule ctx={ctx} />;
    case "support":
      return <SupportDeskModule ctx={ctx} />;
    default:
      return <DashboardModule ctx={ctx} />;
  }
}

// ----------------------------------------------------------------------------
// 1. Dashboard Module
// ----------------------------------------------------------------------------
function DashboardModule({ ctx }: { ctx: any }) {
  const kpis = [
    {
      title: "Today's Gross Sales",
      value: "৳186,400",
      change: "+18.2%",
      positive: true,
      icon: "trending-up",
      color: "#10B981",
    },
    {
      title: "Net Commission Earned",
      value: "৳21,750",
      change: "+24.5%",
      positive: true,
      icon: "currency-usd",
      color: "#4F46E5",
    },
    {
      title: "Active PNRs & Bookings",
      value: "28",
      change: "4 on hold",
      positive: true,
      icon: "ticket",
      color: "#06B6D4",
    },
    {
      title: "Available Wallet Balance",
      value: `৳${ctx.walletBalance.toLocaleString()}`,
      change: "Credit line: ৳5L",
      positive: true,
      icon: "wallet",
      color: "#F59E0B",
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      {/* KPI Cards Grid */}
      <View style={styles.grid4}>
        {kpis.map((kpi, i) => (
          <View key={i} style={styles.kpiCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: `${kpi.color}15` }]}>
                <MaterialCommunityIcons name={kpi.icon as any} size={18} color={kpi.color} />
              </View>
            </View>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={[styles.kpiChange, { color: kpi.color }]}>
              {kpi.change} vs yesterday
            </Text>
          </View>
        ))}
      </View>

      {/* Quick Operations Action Launcher */}
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Quick Operations Launcher</Text>
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => ctx.setActiveTab("flights")}
          >
            <LinearGradient colors={["#4F46E5", "#4338CA"]} style={styles.quickActionGradient}>
              <MaterialCommunityIcons name="airplane-takeoff" size={22} color="#FFF" />
              <Text style={styles.quickActionText}>Issue Flight</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => ctx.setActiveTab("hotels")}
          >
            <LinearGradient colors={["#06B6D4", "#0891B2"]} style={styles.quickActionGradient}>
              <MaterialCommunityIcons name="office-building" size={22} color="#FFF" />
              <Text style={styles.quickActionText}>Book Hotel</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => ctx.setActiveTab("quotations")}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.quickActionGradient}>
              <MaterialCommunityIcons name="file-document-edit" size={22} color="#FFF" />
              <Text style={styles.quickActionText}>Create Quote</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => ctx.setDepositModalVisible(true)}
          >
            <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.quickActionGradient}>
              <MaterialCommunityIcons name="wallet-plus" size={22} color="#FFF" />
              <Text style={styles.quickActionText}>Add Deposit</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => ctx.setActiveTab("team")}
          >
            <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={styles.quickActionGradient}>
              <MaterialCommunityIcons name="account-plus" size={22} color="#FFF" />
              <Text style={styles.quickActionText}>Invite Staff</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Bookings Feed & Telemetry */}
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>Live Recent Bookings & PNR Feed</Text>
          <TouchableOpacity onPress={() => ctx.setActiveTab("bookings")}>
            <Text style={styles.linkText}>View All Bookings →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>PNR / REF</Text>
            <Text style={[styles.th, { flex: 2 }]}>TRAVELER</Text>
            <Text style={[styles.th, { flex: 2 }]}>ROUTE / SERVICE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>NET FARE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>MARKUP</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>STATUS</Text>
          </View>

          {[
            {
              pnr: "SJ-889123",
              name: "Tanvir Ahmed",
              service: "DAC ➔ DXB (BG-049)",
              net: 48500,
              markup: 3800,
              status: "Ticketed",
              color: "#10B981",
            },
            {
              pnr: "SJ-772910",
              name: "Nusrat Jahan",
              service: "Sayeman Beach Resort (3N)",
              net: 28500,
              markup: 3200,
              status: "Confirmed",
              color: "#06B6D4",
            },
            {
              pnr: "SJ-661092",
              name: "Kazi Farhan",
              service: "DAC ➔ BKK (BS-315)",
              net: 29800,
              markup: 2500,
              status: "On Hold",
              color: "#F59E0B",
            },
            {
              pnr: "SJ-550198",
              name: "Rafiqul Islam",
              service: "10-Day Umrah Economy Pkg",
              net: 145000,
              markup: 12000,
              status: "Ticketed",
              color: "#10B981",
            },
          ].map((row, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tdBold, { flex: 1.5, color: THEME.accent }]}>
                {row.pnr}
              </Text>
              <Text style={[styles.td, { flex: 2 }]}>{row.name}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{row.service}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>৳{row.net.toLocaleString()}</Text>
              <Text style={[styles.tdBold, { flex: 1.5, color: THEME.success }]}>
                +৳{row.markup.toLocaleString()}
              </Text>
              <View style={{ flex: 1.2 }}>
                <View style={[styles.statusPill, { backgroundColor: `${row.color}20` }]}>
                  <Text style={[styles.statusPillTxt, { color: row.color }]}>
                    {row.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 2. Flight Engine Module (Wholesale Search + Custom Markup + Ticket Issuance)
// ----------------------------------------------------------------------------
function FlightEngineModule({ ctx }: { ctx: any }) {
  const [tripType, setTripType] = useState<"oneway" | "round">("oneway");
  const [fromAirport, setFromAirport] = useState("DAC - Hazrat Shahjalal Intl");
  const [toAirport, setToAirport] = useState("DXB - Dubai International");
  const [markupPct, setMarkupPct] = useState("7");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [paxName, setPaxName] = useState("");
  const [paxPassport, setPaxPassport] = useState("");

  const flights = [
    {
      id: "FL-1",
      airline: "Biman Bangladesh Airlines",
      flightNo: "BG-049",
      from: "DAC 20:30",
      to: "DXB 23:55",
      duration: "5h 25m",
      stops: "Non-stop",
      baggage: "30 KG",
      netFare: 48500,
      availableSeats: 9,
    },
    {
      id: "FL-2",
      airline: "Emirates",
      flightNo: "EK-583",
      from: "DAC 01:20",
      to: "DXB 04:40",
      duration: "5h 20m",
      stops: "Non-stop",
      baggage: "35 KG",
      netFare: 56200,
      availableSeats: 5,
    },
    {
      id: "FL-3",
      airline: "US-Bangla Airlines",
      flightNo: "BS-315",
      from: "DAC 17:45",
      to: "DXB 21:30",
      duration: "5h 45m",
      stops: "Non-stop",
      baggage: "30 KG",
      netFare: 46800,
      availableSeats: 14,
    },
  ];

  const calcSelling = (net: number) => {
    const pct = parseFloat(markupPct) || 0;
    return Math.round(net + (net * pct) / 100);
  };

  const handleIssue = (flight: any) => {
    setSelectedFlight(flight);
    setModalOpen(true);
  };

  const confirmIssuance = () => {
    if (!paxName.trim()) {
      Alert.alert("Required", "Please enter primary traveler name.");
      return;
    }
    const cost = selectedFlight.netFare;
    if (ctx.walletBalance < cost) {
      Alert.alert("Insufficient Balance", "Your B2B wallet balance is lower than the net fare. Please add deposit.");
      return;
    }
    ctx.setWalletBalance((prev: number) => prev - cost);
    setModalOpen(false);
    const pnr = `SJ-${Math.floor(100000 + Math.random() * 900000)}`;
    Alert.alert(
      "Ticket Issued Successfully!",
      `PNR: ${pnr}\nAirline: ${selectedFlight.airline} (${selectedFlight.flightNo})\nPassenger: ${paxName}\nNet Deducted: ৳${cost.toLocaleString()}\nAgency Profit Earned: ৳${(
        calcSelling(cost) - cost
      ).toLocaleString()}`
    );
    setPaxName("");
    setPaxPassport("");
  };

  return (
    <View style={styles.moduleWrapper}>
      {/* Search Bar & Markup Controls */}
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>B2B Wholesale Flight Search Engine</Text>
          <View style={styles.markupPill}>
            <Text style={styles.markupPillLabel}>Agency Custom Markup:</Text>
            <TextInput
              value={markupPct}
              onChangeText={setMarkupPct}
              style={styles.markupInlineInput}
              keyboardType="numeric"
            />
            <Text style={styles.markupPillSuffix}>%</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.formGroup, { flex: 1.5, marginRight: 10 }]}>
            <Text style={styles.formLabel}>Origin Airport</Text>
            <TextInput
              value={fromAirport}
              onChangeText={setFromAirport}
              style={styles.modalInput}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1.5, marginRight: 10 }]}>
            <Text style={styles.formLabel}>Destination Airport</Text>
            <TextInput
              value={toAirport}
              onChangeText={setToAirport}
              style={styles.modalInput}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.formLabel}>Departure Date</Text>
            <TextInput
              value="15 Dec 2026"
              editable={false}
              style={[styles.modalInput, { color: THEME.accent }]}
            />
          </View>

          <View style={[styles.formGroup, { flex: 0.8 }]}>
            <Text style={styles.formLabel}>Class</Text>
            <TextInput
              value="Economy"
              editable={false}
              style={[styles.modalInput, { color: THEME.text }]}
            />
          </View>
        </View>
      </View>

      {/* Flight Cards List */}
      <View style={styles.resultsGrid}>
        {flights.map((flight) => {
          const selling = calcSelling(flight.netFare);
          const profit = selling - flight.netFare;

          return (
            <View key={flight.id} style={styles.flightCard}>
              <View style={styles.flightCardHeader}>
                <View style={styles.rowCenter}>
                  <MaterialCommunityIcons name="airplane" size={20} color={THEME.accent} />
                  <Text style={styles.flightAirline}>{flight.airline}</Text>
                  <Text style={styles.flightNumberText}>({flight.flightNo})</Text>
                </View>
                <View style={styles.baggageTag}>
                  <Text style={styles.baggageText}>Baggage: {flight.baggage}</Text>
                </View>
              </View>

              <View style={styles.flightRouteRow}>
                <View>
                  <Text style={styles.timeHeading}>{flight.from}</Text>
                  <Text style={styles.subCity}>Hazrat Shahjalal Intl</Text>
                </View>
                <View style={styles.durationCol}>
                  <Text style={styles.durationTxt}>{flight.duration}</Text>
                  <View style={styles.flightLine} />
                  <Text style={styles.stopsTxt}>{flight.stops}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.timeHeading}>{flight.to}</Text>
                  <Text style={styles.subCity}>Dubai International</Text>
                </View>
              </View>

              <View style={styles.pricingDivider} />

              <View style={styles.flightPriceFooter}>
                <View>
                  <Text style={styles.fareLabel}>B2B Net Fare</Text>
                  <Text style={styles.netStrike}>৳{flight.netFare.toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={styles.fareLabel}>Client Total Price</Text>
                  <Text style={styles.sellingPrice}>৳{selling.toLocaleString()}</Text>
                </View>
                <View style={styles.profitTag}>
                  <Text style={styles.profitTagLabel}>Agency Margin</Text>
                  <Text style={styles.profitTagVal}>+৳{profit.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.issueFlightBtn}
                  onPress={() => handleIssue(flight)}
                >
                  <Text style={styles.issueFlightBtnTxt}>Issue Ticket Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Issuance Passenger Modal */}
      <Modal
        visible={modalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue E-Ticket for Client</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Traveler Full Name (as on Passport) *</Text>
              <TextInput
                value={paxName}
                onChangeText={setPaxName}
                placeholder="e.g. MOHAMMAD TANVIR AHMED"
                placeholderTextColor={THEME.textMuted}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Passport Number</Text>
              <TextInput
                value={paxPassport}
                onChangeText={setPaxPassport}
                placeholder="e.g. A01928374"
                placeholderTextColor={THEME.textMuted}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.costBreakdownBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.breakdownLabel}>Net Deducted from B2B Wallet:</Text>
                <Text style={styles.breakdownVal}>৳{selectedFlight?.netFare?.toLocaleString()}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.breakdownLabel}>Agency Profit Margin:</Text>
                <Text style={[styles.breakdownVal, { color: THEME.success }]}>
                  +৳
                  {selectedFlight
                    ? (calcSelling(selectedFlight.netFare) - selectedFlight.netFare).toLocaleString()
                    : "0"}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={confirmIssuance}>
              <LinearGradient colors={["#10B981", "#059669"]} style={styles.modalSubmitGradient}>
                <Text style={styles.modalSubmitText}>Confirm & Debit Wallet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 3. Hotel Engine Module
// ----------------------------------------------------------------------------
function HotelEngineModule({ ctx }: { ctx: any }) {
  const hotels = [
    {
      id: "HT-1",
      name: "Sayeman Beach Resort",
      city: "Cox's Bazar",
      rating: 4.8,
      room: "Infinity Sea View Deluxe",
      netRate: 9800,
      markup: 1500,
    },
    {
      id: "HT-2",
      name: "InterContinental Dhaka",
      city: "Dhaka",
      rating: 4.9,
      room: "Club Executive King",
      netRate: 16500,
      markup: 2200,
    },
    {
      id: "HT-3",
      name: "Grand Sylhet Hotel & Resort",
      city: "Sylhet",
      rating: 4.7,
      room: "Superior Hill View",
      netRate: 7200,
      markup: 1200,
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>B2B Hotel & Resort Reservation</Text>
        <Text style={styles.panelSub}>Wholesale tariffs with instant confirmation vouchers</Text>
      </View>

      <View style={styles.grid3}>
        {hotels.map((h) => (
          <View key={h.id} style={styles.hotelCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.hotelName}>{h.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={13} color="#FBBF24" />
                <Text style={styles.ratingText}>{h.rating}</Text>
              </View>
            </View>
            <Text style={styles.hotelCity}>📍 {h.city}</Text>
            <Text style={styles.hotelRoom}>🛏️ {h.room}</Text>

            <View style={styles.pricingDivider} />

            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.fareLabel}>Wholesale Rate</Text>
                <Text style={styles.netStrike}>৳{h.netRate.toLocaleString()}/night</Text>
              </View>
              <View>
                <Text style={styles.fareLabel}>Client Total</Text>
                <Text style={styles.sellingPrice}>৳{(h.netRate + h.markup).toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookHotelBtn}
              onPress={() => Alert.alert("Hotel Reserved", `Voucher for ${h.name} issued successfully.\nAgency markup ৳${h.markup.toLocaleString()} credited.`)}
            >
              <Text style={styles.bookHotelBtnTxt}>Reserve & Issue Voucher</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 4. Tour Packages & Umrah Module
// ----------------------------------------------------------------------------
function PackagesModule({ ctx }: { ctx: any }) {
  const pkgs = [
    {
      title: "10-Day VIP Umrah Experience",
      duration: "10 Days, 9 Nights",
      hotels: "5-Star Makkah Clock Tower & Madinah Oberoi",
      netPrice: 175000,
      retailPrice: 195000,
      markup: 20000,
    },
    {
      title: "Exotic Maldives & Water Villa Retreat",
      duration: "5 Days, 4 Nights",
      hotels: "Centara Ras Fushi All-Inclusive",
      netPrice: 115000,
      retailPrice: 130000,
      markup: 15000,
    },
    {
      title: "Sajek Valley & Bandarban Clouds Tour",
      duration: "4 Days, 3 Nights",
      hotels: "Meghpunji Resort & Hill View Resort",
      netPrice: 18500,
      retailPrice: 22500,
      markup: 4000,
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>B2B Holiday Packages & Umrah Catalog</Text>
        <Text style={styles.panelSub}>Curated group and FIT packages ready for instant quotation</Text>
      </View>

      <View style={styles.grid3}>
        {pkgs.map((pkg, idx) => (
          <View key={idx} style={styles.pkgCard}>
            <Text style={styles.pkgTitle}>{pkg.title}</Text>
            <Text style={styles.pkgDuration}>⏳ {pkg.duration}</Text>
            <Text style={styles.pkgHotels}>🏨 {pkg.hotels}</Text>

            <View style={styles.pricingDivider} />

            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.fareLabel}>Agency Wholesale</Text>
                <Text style={styles.netStrike}>৳{pkg.netPrice.toLocaleString()}</Text>
              </View>
              <View>
                <Text style={styles.fareLabel}>Client Price</Text>
                <Text style={styles.sellingPrice}>৳{pkg.retailPrice.toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bookHotelBtn}
              onPress={() => ctx.setActiveTab("quotations")}
            >
              <Text style={styles.bookHotelBtnTxt}>Customize in Quotation Builder</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 5. Bookings & PNR Operations Module
// ----------------------------------------------------------------------------
function BookingsModule({ ctx }: { ctx: any }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const bookingsList = [
    {
      id: "BK-88210",
      pnr: "SJ-889123",
      traveler: "Tanvir Ahmed",
      service: "Flight (BG-049 DAC-DXB)",
      amount: 48500,
      markup: 3800,
      status: "Ticketed",
      date: "10 Nov 2026",
    },
    {
      id: "BK-88211",
      pnr: "SJ-772910",
      traveler: "Nusrat Jahan",
      service: "Sayeman Beach Resort (3N)",
      amount: 28500,
      markup: 3200,
      status: "Confirmed",
      date: "09 Nov 2026",
    },
    {
      id: "BK-88212",
      pnr: "SJ-661092",
      traveler: "Kazi Farhan",
      service: "Flight (BS-315 DAC-BKK)",
      amount: 29800,
      markup: 2500,
      status: "On Hold",
      date: "09 Nov 2026",
    },
    {
      id: "BK-88213",
      pnr: "SJ-550198",
      traveler: "Rafiqul Islam",
      service: "10-Day Umrah Economy Pkg",
      amount: 145000,
      markup: 12000,
      status: "Ticketed",
      date: "08 Nov 2026",
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>Multi-Vertical Booking Operations</Text>
          <View style={styles.rowCenter}>
            {["all", "Ticketed", "Confirmed", "On Hold"].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.filterTabBtn,
                  statusFilter === st && styles.filterTabBtnActive,
                ]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.filterTabTxt,
                    statusFilter === st && styles.filterTabTxtActive,
                  ]}
                >
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>BOOKING ID / PNR</Text>
            <Text style={[styles.th, { flex: 2 }]}>TRAVELER</Text>
            <Text style={[styles.th, { flex: 2.5 }]}>SERVICE DETAILS</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>PRICE (BDT)</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>STATUS</Text>
            <Text style={[styles.th, { flex: 2 }]}>ACTIONS</Text>
          </View>

          {bookingsList.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.tdBold}>{item.id}</Text>
                <Text style={[styles.tdSub, { color: THEME.accent }]}>{item.pnr}</Text>
              </View>
              <Text style={[styles.td, { flex: 2 }]}>{item.traveler}</Text>
              <Text style={[styles.td, { flex: 2.5 }]}>{item.service}</Text>
              <Text style={[styles.tdBold, { flex: 1.5 }]}>
                ৳{(item.amount + item.markup).toLocaleString()}
              </Text>
              <View style={{ flex: 1.2 }}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillTxt}>{item.status}</Text>
                </View>
              </View>
              <View style={[styles.rowCenter, { flex: 2, gap: 8 }]}>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => Alert.alert("E-Ticket", `Displaying PDF e-ticket for PNR: ${item.pnr}`)}
                >
                  <Text style={styles.actionBtnSmallTxt}>E-Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnSmall, { backgroundColor: THEME.cardAlt }]}
                  onPress={() => Alert.alert("Reissue Request", `Reissue request submitted to B2B desk for PNR ${item.pnr}.`)}
                >
                  <Text style={styles.actionBtnSmallTxt}>Reissue</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 6. Wallet & Financial Ledger Module
// ----------------------------------------------------------------------------
function WalletModule({ ctx }: { ctx: any }) {
  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.grid3}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Available Cash Balance</Text>
          <Text style={[styles.kpiValue, { color: THEME.success }]}>
            ৳{ctx.walletBalance.toLocaleString()}
          </Text>
          <TouchableOpacity
            style={styles.topUpNowBtn}
            onPress={() => ctx.setDepositModalVisible(true)}
          >
            <Text style={styles.topUpNowBtnTxt}>+ Top Up Balance</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Approved Credit Limit</Text>
          <Text style={styles.kpiValue}>৳500,000</Text>
          <Text style={styles.kpiChange}>৳65,000 utilized</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Accumulated Commission</Text>
          <Text style={[styles.kpiValue, { color: THEME.accent }]}>৳48,500</Text>
          <TouchableOpacity
            style={[styles.topUpNowBtn, { backgroundColor: THEME.cardAlt }]}
            onPress={() => Alert.alert("Payout Requested", "Withdrawal request for ৳48,500 submitted to accounts.")}
          >
            <Text style={styles.topUpNowBtnTxt}>Request Payout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Financial Double-Entry Ledger</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>DATE</Text>
            <Text style={[styles.th, { flex: 2 }]}>TRANSACTION REF</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>TYPE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>DEBIT</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>CREDIT</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>BALANCE</Text>
          </View>
          {[
            {
              date: "11 Nov 2026",
              ref: "Bank Deposit (EBL-88219)",
              type: "Deposit",
              dr: "-",
              cr: "৳150,000",
              bal: "৳245,800",
            },
            {
              date: "10 Nov 2026",
              ref: "Ticket Issuance (SJ-889123)",
              type: "Issuance",
              dr: "৳48,500",
              cr: "-",
              bal: "৳95,800",
            },
            {
              date: "10 Nov 2026",
              ref: "Commission Payout (SJ-889123)",
              type: "Markup",
              dr: "-",
              cr: "৳3,800",
              bal: "৳144,300",
            },
          ].map((tx, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.5 }]}>{tx.date}</Text>
              <Text style={[styles.tdBold, { flex: 2 }]}>{tx.ref}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{tx.type}</Text>
              <Text style={[styles.td, { flex: 1.5, color: THEME.danger }]}>{tx.dr}</Text>
              <Text style={[styles.td, { flex: 1.5, color: THEME.success }]}>{tx.cr}</Text>
              <Text style={[styles.tdBold, { flex: 1.5 }]}>{tx.bal}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 7. Customer CRM & Passport Vault Module
// ----------------------------------------------------------------------------
function CustomerCRMModule({ ctx }: { ctx: any }) {
  const clients = [
    {
      name: "Tanvir Ahmed",
      company: "Beximco Corp",
      phone: "+880 1712-345678",
      passport: "A01928374",
      expiry: "15 Oct 2028",
      trips: 8,
    },
    {
      name: "Nusrat Jahan",
      company: "Independent Client",
      phone: "+880 1819-223344",
      passport: "B09876543",
      expiry: "20 Jan 2027",
      trips: 4,
    },
    {
      name: "Kazi Farhan",
      company: "Square Pharma",
      phone: "+880 1911-556677",
      passport: "C05544332",
      expiry: "02 Mar 2027",
      trips: 12,
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>Client CRM & Traveler Passport Vault</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => Alert.alert("New Client", "Client modal opened.")}
          >
            <Text style={styles.addBtnTxt}>+ Add Traveler Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>NAME & COMPANY</Text>
            <Text style={[styles.th, { flex: 1.8 }]}>CONTACT</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>PASSPORT NO.</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>EXPIRY DATE</Text>
            <Text style={[styles.th, { flex: 1 }]}>TRIPS</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>ACTION</Text>
          </View>

          {clients.map((c, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdBold}>{c.name}</Text>
                <Text style={styles.tdSub}>{c.company}</Text>
              </View>
              <Text style={[styles.td, { flex: 1.8 }]}>{c.phone}</Text>
              <Text style={[styles.tdBold, { flex: 1.5, color: THEME.accent }]}>
                {c.passport}
              </Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{c.expiry}</Text>
              <Text style={[styles.tdBold, { flex: 1 }]}>{c.trips}</Text>
              <TouchableOpacity
                style={[styles.actionBtnSmall, { flex: 1.5 }]}
                onPress={() => ctx.setActiveTab("flights")}
              >
                <Text style={styles.actionBtnSmallTxt}>Book Flight</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 8. White-Label Quotation Generator Module
// ----------------------------------------------------------------------------
function QuotationModule({ ctx }: { ctx: any }) {
  const [client, setClient] = useState("Tanvir Ahmed (Beximco)");
  const [dest, setDest] = useState("Dubai, UAE (7 Days Tour)");
  const [flightCost, setFlightCost] = useState("48500");
  const [hotelCost, setHotelCost] = useState("35000");
  const [visaCost, setVisaCost] = useState("9500");
  const [agencyMarkup, setAgencyMarkup] = useState("8000");

  const grandTotal =
    (parseFloat(flightCost) || 0) +
    (parseFloat(hotelCost) || 0) +
    (parseFloat(visaCost) || 0) +
    (parseFloat(agencyMarkup) || 0);

  const handlePrint = () => {
    Alert.alert(
      "Quotation Generated",
      `Branded PDF Quotation for ${client} generated with total amount ৳${grandTotal.toLocaleString()}. Ready to print or share.`
    );
  };

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>White-Label Travel Quotation Builder</Text>
        <Text style={styles.panelSub}>Generate client-facing itineraries branded with your agency logo</Text>

        <View style={styles.grid2}>
          <View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Client / Corporate Account</Text>
              <TextInput value={client} onChangeText={setClient} style={styles.modalInput} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Trip Destination & Duration</Text>
              <TextInput value={dest} onChangeText={setDest} style={styles.modalInput} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Flight Cost (Net BDT)</Text>
              <TextInput
                value={flightCost}
                onChangeText={setFlightCost}
                keyboardType="numeric"
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hotel & Accommodation (Net BDT)</Text>
              <TextInput
                value={hotelCost}
                onChangeText={setHotelCost}
                keyboardType="numeric"
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Visa & Insurance Fee (Net BDT)</Text>
              <TextInput
                value={visaCost}
                onChangeText={setVisaCost}
                keyboardType="numeric"
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Agency Profit / Service Fee (BDT)</Text>
              <TextInput
                value={agencyMarkup}
                onChangeText={setAgencyMarkup}
                keyboardType="numeric"
                style={[styles.modalInput, { borderColor: THEME.success }]}
              />
            </View>
          </View>

          {/* Live Quotation Preview */}
          <View style={styles.previewBox}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewAgencyTitle}>SKYWINGS HOLIDAYS LTD.</Text>
              <Text style={styles.previewSub}>Official Travel Quotation • Ref: QT-8821</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.previewClientTxt}>Prepared For: {client}</Text>
            <Text style={styles.previewClientTxt}>Destination: {dest}</Text>

            <View style={styles.previewItemsList}>
              <Text style={styles.previewItem}>1. International Return Air Ticket</Text>
              <Text style={styles.previewItem}>2. Luxury Hotel Stay (5 Nights)</Text>
              <Text style={styles.previewItem}>3. Tourist Visa & Travel Insurance</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <Text style={styles.previewTotalLabel}>Client Grand Total:</Text>
              <Text style={styles.previewTotalVal}>৳{grandTotal.toLocaleString()}</Text>
            </View>
            <Text style={styles.previewVat}>Inclusive of all aviation taxes & VAT</Text>

            <TouchableOpacity style={styles.exportBtn} onPress={handlePrint}>
              <Text style={styles.exportBtnTxt}>Export & Download Branded PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 9. Team & Staff RBAC Module
// ----------------------------------------------------------------------------
function TeamRBACModule({ ctx }: { ctx: any }) {
  const staff = [
    {
      name: "Mohammad Arif",
      email: "arif@skywings.com",
      role: "Managing Director",
      perms: "Full Access (Admin)",
      status: "Active",
    },
    {
      name: "Sharmin Sultana",
      email: "sharmin@skywings.com",
      role: "Senior Ticketing Officer",
      perms: "Issue Flights, Reissue PNR",
      status: "Active",
    },
    {
      name: "Mahfuz Rahman",
      email: "mahfuz@skywings.com",
      role: "Accounts & Finance",
      perms: "Wallet Top-up, Ledgers, Payouts",
      status: "Active",
    },
  ];

  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.panelTitle}>Agency Staff & Sub-Agent RBAC</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => Alert.alert("Invite Agent", "Invitation link generated.")}
          >
            <Text style={styles.addBtnTxt}>+ Invite Staff Member</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>STAFF MEMBER</Text>
            <Text style={[styles.th, { flex: 2 }]}>ROLE</Text>
            <Text style={[styles.th, { flex: 3 }]}>PERMISSIONS</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>STATUS</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>ACTIONS</Text>
          </View>

          {staff.map((s, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tdBold}>{s.name}</Text>
                <Text style={styles.tdSub}>{s.email}</Text>
              </View>
              <Text style={[styles.td, { flex: 2 }]}>{s.role}</Text>
              <Text style={[styles.td, { flex: 3 }]}>{s.perms}</Text>
              <View style={{ flex: 1.2 }}>
                <View style={[styles.statusPill, { backgroundColor: "#10B98125" }]}>
                  <Text style={[styles.statusPillTxt, { color: "#10B981" }]}>{s.status}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtnSmall, { flex: 1.5 }]}
                onPress={() => Alert.alert("Edit Permissions", `Configuring RBAC for ${s.name}`)}
              >
                <Text style={styles.actionBtnSmallTxt}>Edit Access</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 10. Markup & Tier Engine Module
// ----------------------------------------------------------------------------
function MarkupSettingsModule({ ctx }: { ctx: any }) {
  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Agency Commission & Markup Engine</Text>
        <Text style={styles.panelSub}>Automated price markup rules applied across all booking engines</Text>

        <View style={styles.grid3}>
          <View style={styles.markupRuleBox}>
            <Text style={styles.ruleTitle}>International Flights</Text>
            <Text style={styles.ruleVal}>7.0% Net Markup</Text>
            <Text style={styles.ruleSub}>Applied on base fare + taxes</Text>
          </View>
          <View style={styles.markupRuleBox}>
            <Text style={styles.ruleTitle}>Domestic Flights</Text>
            <Text style={styles.ruleVal}>৳500 Flat / Ticket</Text>
            <Text style={styles.ruleSub}>Fixed fee per passenger</Text>
          </View>
          <View style={styles.markupRuleBox}>
            <Text style={styles.ruleTitle}>Hotels & Resorts</Text>
            <Text style={styles.ruleVal}>10.0% Wholesale Margin</Text>
            <Text style={styles.ruleSub}>Applied on room nightly tariff</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 11. Verification & KYC Module
// ----------------------------------------------------------------------------
function VerificationModule({ ctx }: { ctx: any }) {
  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.panelTitle}>Agency Verification & Compliance Vault</Text>
            <Text style={styles.panelSub}>Official regulatory licenses registered with Civil Aviation Authority</Text>
          </View>
          <View style={styles.verifiedBadgeLarge}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#22C55E" />
            <Text style={styles.verifiedBadgeLargeTxt}>Verified Travel Partner</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2.5 }]}>DOCUMENT NAME</Text>
            <Text style={[styles.th, { flex: 2 }]}>NUMBER / REF</Text>
            <Text style={[styles.th, { flex: 2 }]}>EXPIRY DATE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>STATUS</Text>
          </View>
          {[
            {
              doc: "Trade License (Dhaka North City Corp)",
              ref: "TRAD/DNCC/019283",
              exp: "30 Jun 2027",
              st: "Verified",
            },
            {
              doc: "Civil Aviation (ATAB) License",
              ref: "ATAB-REG-4491",
              exp: "31 Dec 2027",
              st: "Verified",
            },
            {
              doc: "TIN / Tax Identification Certificate",
              ref: "TIN-889102-K",
              exp: "Permanent",
              st: "Verified",
            },
            {
              doc: "HAAB (Hajj Agency Association) License",
              ref: "HAAB-LIC-119",
              exp: "31 Dec 2026",
              st: "Verified",
            },
          ].map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tdBold, { flex: 2.5 }]}>{item.doc}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{item.ref}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{item.exp}</Text>
              <View style={{ flex: 1.5 }}>
                <View style={[styles.statusPill, { backgroundColor: "#22C55E20" }]}>
                  <Text style={[styles.statusPillTxt, { color: "#22C55E" }]}>{item.st}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// 12. 24/7 B2B Operations & Ticket Desk Support
// ----------------------------------------------------------------------------
function SupportDeskModule({ ctx }: { ctx: any }) {
  return (
    <View style={styles.moduleWrapper}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>24/7 B2B Emergency Operations & Ticketing Desk</Text>
        <Text style={styles.panelSub}>Direct hotline for PNR voids, emergency reissues, and flight cancellations</Text>

        <View style={styles.grid3}>
          <View style={styles.supportCard}>
            <MaterialCommunityIcons name="phone-in-talk" size={28} color={THEME.accent} />
            <Text style={styles.supportCardTitle}>Urgent Ticketing Hotline</Text>
            <Text style={styles.supportCardPhone}>+880 9610-009988</Text>
            <Text style={styles.supportCardSub}>Average response time &lt; 30 seconds</Text>
          </View>

          <View style={styles.supportCard}>
            <MaterialCommunityIcons name="chat-processing" size={28} color={THEME.success} />
            <Text style={styles.supportCardTitle}>Live WhatsApp Agent Desk</Text>
            <Text style={styles.supportCardPhone}>+880 1700-112233</Text>
            <Text style={styles.supportCardSub}>Instant PNR re-routing & void requests</Text>
          </View>

          <View style={styles.supportCard}>
            <MaterialCommunityIcons name="email-check" size={28} color={THEME.primary} />
            <Text style={styles.supportCardTitle}>Operations Email</Text>
            <Text style={styles.supportCardPhone}>b2b@shopnojatra.com</Text>
            <Text style={styles.supportCardSub}>Group bookings & Charter flights</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  topbar: {
    height: 64,
    backgroundColor: THEME.topbar,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topbarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleSidebarBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: THEME.card,
    marginRight: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.text,
  },
  agencyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#22C55E",
  },
  agencyCodeText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  topbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    width: 260,
    height: 36,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    color: THEME.text,
    fontSize: 12,
    marginLeft: 8,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  walletTextCol: {
    justifyContent: "center",
  },
  walletLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  walletAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.text,
  },
  addDepositBtn: {
    backgroundColor: THEME.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  addDepositText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.card,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: THEME.danger,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIndicatorText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFF",
  },
  userProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 11,
  },
  userName: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.text,
  },
  roleLabel: {
    fontSize: 9,
    color: THEME.accent,
  },
  mainBody: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    backgroundColor: THEME.sidebar,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    justifyContent: "space-between",
  },
  sidebarExpanded: {
    width: 240,
  },
  sidebarCollapsed: {
    width: 68,
  },
  sidebarContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: THEME.sidebarActive,
  },
  navItemCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  navLabel: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  navBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  navBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  creditLineCard: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 10,
  },
  creditLineLabel: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  creditLineVal: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: THEME.cardAlt,
    borderRadius: 3,
    marginVertical: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.accent,
  },
  creditLineSub: {
    fontSize: 9,
    color: THEME.textMuted,
  },
  workspace: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  workspaceScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  moduleWrapper: {
    gap: 16,
  },
  grid4: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  grid3: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  grid2: {
    flexDirection: "row",
    gap: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  kpiTitle: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.text,
    marginTop: 10,
  },
  kpiChange: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  panelCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
  },
  panelSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  quickActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: 120,
    borderRadius: 10,
    overflow: "hidden",
  },
  quickActionGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  table: {
    marginTop: 14,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: THEME.cardAlt,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  td: {
    fontSize: 12,
    color: THEME.text,
  },
  tdBold: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
  tdSub: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusPillTxt: {
    fontSize: 10,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    fontSize: 12,
    color: THEME.accent,
    fontWeight: "700",
  },
  markupPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  markupPillLabel: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  markupInlineInput: {
    width: 36,
    backgroundColor: THEME.card,
    color: THEME.accent,
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
    borderRadius: 4,
    paddingVertical: 2,
  },
  markupPillSuffix: {
    color: THEME.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  searchRow: {
    flexDirection: "row",
    marginTop: 14,
    alignItems: "center",
  },
  formGroup: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  resultsGrid: {
    gap: 12,
  },
  flightCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  flightCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  flightAirline: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  flightNumberText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  baggageTag: {
    backgroundColor: THEME.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  baggageText: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  flightRouteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  timeHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  subCity: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  durationCol: {
    alignItems: "center",
  },
  durationTxt: {
    fontSize: 11,
    color: THEME.accent,
    fontWeight: "600",
  },
  flightLine: {
    width: 80,
    height: 1.5,
    backgroundColor: THEME.border,
    marginVertical: 4,
  },
  stopsTxt: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  flightPriceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    marginBottom: 2,
  },
  netStrike: {
    fontSize: 12,
    color: THEME.textMuted,
    textDecorationLine: "line-through",
  },
  sellingPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  profitTag: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  profitTagLabel: {
    fontSize: 8,
    color: THEME.success,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  profitTagVal: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.success,
  },
  issueFlightBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  issueFlightBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  hotelCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  hotelName: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  hotelCity: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4,
  },
  hotelRoom: {
    fontSize: 12,
    color: THEME.accent,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FBBF24",
  },
  bookHotelBtn: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  bookHotelBtnTxt: {
    color: THEME.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  pkgCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  pkgTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  pkgDuration: {
    fontSize: 11,
    color: THEME.accent,
    marginTop: 4,
  },
  pkgHotels: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 4,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
    backgroundColor: THEME.cardAlt,
  },
  filterTabBtnActive: {
    backgroundColor: THEME.primary,
  },
  filterTabTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  filterTabTxtActive: {
    color: "#FFF",
  },
  actionBtnSmall: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnSmallTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 10,
  },
  topUpNowBtn: {
    backgroundColor: THEME.success,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
    marginTop: 10,
  },
  topUpNowBtnTxt: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },
  addBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  previewBox: {
    flex: 1,
    backgroundColor: THEME.cardAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  previewHeader: {
    alignItems: "center",
    marginBottom: 10,
  },
  previewAgencyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.text,
  },
  previewSub: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10,
  },
  previewClientTxt: {
    fontSize: 12,
    color: THEME.text,
    marginBottom: 4,
  },
  previewItemsList: {
    marginVertical: 10,
    gap: 6,
  },
  previewItem: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  previewTotalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  previewTotalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.success,
  },
  previewVat: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
  exportBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 14,
  },
  exportBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  markupRuleBox: {
    backgroundColor: THEME.cardAlt,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ruleTitle: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  ruleVal: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.accent,
    marginVertical: 4,
  },
  ruleSub: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  verifiedBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifiedBadgeLargeTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
  },
  supportCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: THEME.cardAlt,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  supportCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
    marginTop: 8,
  },
  supportCardPhone: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.accent,
    marginVertical: 4,
  },
  supportCardSub: {
    fontSize: 10,
    color: THEME.textMuted,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
  },
  modalMethodRow: {
    flexDirection: "row",
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  modalMethodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  modalMethodBtnActive: {
    backgroundColor: THEME.primary,
  },
  modalMethodTxt: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  modalMethodTxtActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  bankInstructionBox: {
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.2)",
  },
  bankInstTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.accent,
    marginBottom: 2,
  },
  bankInstText: {
    fontSize: 11,
    color: THEME.text,
  },
  modalSubmitBtn: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  modalSubmitGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  costBreakdownBox: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
});

export default AgencyPortalShell;
