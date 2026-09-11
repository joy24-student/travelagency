/**
 * Agency Management Screen - Admin Panel
 * Executive Slate Typography & 100% Pixel-Perfect HTML Alignment
 * Sub-Screens:
 * 1. Agency Management Dashboard (Quick Action "Ads" -> Overall All Agencies' Ads)
 * 2. Add Agency (Multi-Step Stepper: Basic Info, Documents, Review)
 * 3. Agency Details (Quick Action "Advertisement" -> Selected Agency's Specific Ads Only)
 * 4. Individual Agency Advertisements Screen (agency_ads)
 * 5. Platform Global Advertisements Screen (global_ads)
 * 6. Verification Center
 * 7. Contracts List
 * 8. Agency Analytics
 * 9. Document Repository
 * 10. Global Payments Screen
 * 11. Individual Agency Payment Analysis & History Screen
 * 12. Agency Bookings Management Screen
 * 13. Full Support Center Workspace Flow Screen
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Linking,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Line,
  Text as SvgText,
  Polygon,
  Polyline,
  Circle,
  G,
} from "react-native-svg";
import { AdminUser } from "@/types/admin";
import { SupportCenterScreen } from "./SupportCenterScreen";

const { width } = Dimensions.get("window");

export type SubScreenType =
  | "dashboard"
  | "add_agency"
  | "details"
  | "agency_ads"
  | "global_ads"
  | "verification"
  | "contracts"
  | "analytics"
  | "documents"
  | "payments"
  | "agency_payments"
  | "bookings"
  | "support_center";

export interface AgencyItem {
  id: string;
  name: string;
  avatarText: string;
  status: "Verified" | "Pending" | "Suspended" | "Inactive";
  rating: number;
  reviewsCount: number;
  location: string;
  revenue: string;
  bookings: number;
  customers: number;
  responseTime: string;
  acceptanceRate: string;
  cancellationRate: string;
  agencyId: string;
  ownerName: string;
  ownerPhone: string;
  managerName: string;
  managerPhone: string;
  supportPhone: string;
  email?: string;
  agencyType?: string;
}

export interface AgencyAdCard {
  id: string;
  title: string;
  adType: "Banner Ad" | "Sponsored Package" | "Video Ad";
  packageName: string;
  agencyName: string;
  status: "Active" | "Paused" | "Pending Approval" | "Expired";
  dailyBudget: string;
  impressions: string;
  clicks: string;
  ctr: string;
  totalSpent: string;
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  customerName: string;
  packageName: string;
  agencyName: string;
  date: string;
  amount: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
}

export interface GlobalPaymentItem {
  id: string;
  invoiceRef: string;
  agencyName: string;
  date: string;
  amount: string;
  status: "Pending" | "Completed" | "On Hold" | "Failed" | "Success";
  iconName: string;
}

const INITIAL_AGENCIES: AgencyItem[] = [
  {
    id: "1",
    name: "Atlas Travel",
    avatarText: "A",
    status: "Verified",
    rating: 4.9,
    reviewsCount: 248,
    location: "Dubai, UAE",
    revenue: "$82K",
    bookings: 342,
    customers: 1248,
    responseTime: "6 min",
    acceptanceRate: "98%",
    cancellationRate: "2%",
    agencyId: "AGY-0001248",
    ownerName: "John Smith",
    ownerPhone: "01863054816",
    managerName: "Sarah Ali",
    managerPhone: "01711963652",
    supportPhone: "01863054816",
    email: "contact@atlastravel.com",
    agencyType: "Travel",
  },
  {
    id: "2",
    name: "Skyline Tours",
    avatarText: "S",
    status: "Pending",
    rating: 4.6,
    reviewsCount: 184,
    location: "Singapore",
    revenue: "$54K",
    bookings: 284,
    customers: 890,
    responseTime: "10 min",
    acceptanceRate: "95%",
    cancellationRate: "3%",
    agencyId: "AGY-0001249",
    ownerName: "David Chen",
    ownerPhone: "01812345678",
    managerName: "Elena Rostova",
    managerPhone: "01798765432",
    supportPhone: "01812345678",
    email: "info@skylinetours.com",
    agencyType: "Travel",
  },
  {
    id: "3",
    name: "Global Explorer",
    avatarText: "G",
    status: "Verified",
    rating: 4.8,
    reviewsCount: 310,
    location: "Bangkok, Thailand",
    revenue: "$43K",
    bookings: 215,
    customers: 720,
    responseTime: "8 min",
    acceptanceRate: "97%",
    cancellationRate: "1.5%",
    agencyId: "AGY-0001250",
    ownerName: "Somchai Prasert",
    ownerPhone: "01855554433",
    managerName: "Ananda Patel",
    managerPhone: "01766667788",
    supportPhone: "01855554433",
    email: "support@globalexplorer.com",
    agencyType: "Travel",
  },
];

const SAMPLE_AGENCY_ADS: AgencyAdCard[] = [
  {
    id: "ad-101",
    title: "Dubai Summer Special Banner",
    adType: "Banner Ad",
    packageName: "Dubai Luxury Desert Escape",
    agencyName: "Atlas Travel",
    status: "Active",
    dailyBudget: "$150/day",
    impressions: "45,200",
    clicks: "3,840",
    ctr: "8.49%",
    totalSpent: "$1,420.00",
  },
  {
    id: "ad-102",
    title: "VIP Desert Safari Sponsored Package",
    adType: "Sponsored Package",
    packageName: "Dubai Marina Dinner Cruise",
    agencyName: "Atlas Travel",
    status: "Active",
    dailyBudget: "$100/day",
    impressions: "32,100",
    clicks: "2,450",
    ctr: "7.63%",
    totalSpent: "$980.00",
  },
  {
    id: "ad-103",
    title: "Singapore Weekend Escape Ad",
    adType: "Sponsored Package",
    packageName: "Marina Bay & Sentosa Tour",
    agencyName: "Skyline Tours",
    status: "Paused",
    dailyBudget: "$80/day",
    impressions: "18,400",
    clicks: "1,120",
    ctr: "6.08%",
    totalSpent: "$450.00",
  },
  {
    id: "ad-104",
    title: "Bangkok Temple & Market Promo",
    adType: "Banner Ad",
    packageName: "Bangkok Temple & Floating Market",
    agencyName: "Global Explorer",
    status: "Active",
    dailyBudget: "$120/day",
    impressions: "28,800",
    clicks: "1,490",
    ctr: "5.17%",
    totalSpent: "$600.00",
  },
];

const GLOBAL_PAYMENTS_DATA: GlobalPaymentItem[] = [
  {
    id: "gp1",
    invoiceRef: "#INV-8824",
    agencyName: "Atlas Travel",
    date: "12 Oct 2023",
    amount: "$12,450.00",
    status: "Pending",
    iconName: "university",
  },
  {
    id: "gp2",
    invoiceRef: "#INV-8821",
    agencyName: "Global Stays",
    date: "11 Oct 2023",
    amount: "$8,200.50",
    status: "Pending",
    iconName: "plane-departure",
  },
  {
    id: "gp3",
    invoiceRef: "#INV-8790",
    agencyName: "Elite Rentals",
    date: "09 Oct 2023",
    amount: "$3,120.00",
    status: "Pending",
    iconName: "car",
  },
  {
    id: "gp4",
    invoiceRef: "#INV-8785",
    agencyName: "Azure Resorts",
    date: "08 Oct 2023",
    amount: "$1,850.00",
    status: "Success",
    iconName: "hotel",
  },
  {
    id: "gp5",
    invoiceRef: "#INV-8780",
    agencyName: "Skyline Tours",
    date: "05 Oct 2023",
    amount: "$5,400.00",
    status: "On Hold",
    iconName: "credit-card",
  },
];

const SAMPLE_BOOKINGS: BookingRecord[] = [
  {
    id: "b1",
    bookingRef: "BK-9021",
    customerName: "Alex Johnson",
    packageName: "Dubai Luxury Desert Escape",
    agencyName: "Atlas Travel",
    date: "Dec 24, 2026",
    amount: "$2,450",
    status: "Confirmed",
  },
  {
    id: "b2",
    bookingRef: "BK-9020",
    customerName: "Maria Garcia",
    packageName: "Singapore Marina & Sentosa Tour",
    agencyName: "Skyline Tours",
    date: "Dec 26, 2026",
    amount: "$1,800",
    status: "Pending",
  },
  {
    id: "b3",
    bookingRef: "BK-9019",
    customerName: "Liam Smith",
    packageName: "Bangkok Temple & Floating Market",
    agencyName: "Global Explorer",
    date: "Dec 22, 2026",
    amount: "$1,350",
    status: "Confirmed",
  },
  {
    id: "b4",
    bookingRef: "BK-9018",
    customerName: "Emma Watson",
    packageName: "Dubai Marina Dinner Cruise",
    agencyName: "Atlas Travel",
    date: "Dec 19, 2026",
    amount: "$850",
    status: "Completed",
  },
];

export const AgencyManagementScreen: React.FC<{ admin?: AdminUser | null }> = () => {
  const [agenciesList, setAgenciesList] = useState<AgencyItem[]>(INITIAL_AGENCIES);
  const [agencyAdsList, setAgencyAdsList] = useState<AgencyAdCard[]>(SAMPLE_AGENCY_ADS);
  const [currentScreen, setCurrentScreen] = useState<SubScreenType>("dashboard");
  const [screenStack, setScreenStack] = useState<SubScreenType[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<AgencyItem>(INITIAL_AGENCIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Verified" | "Pending" | "Suspended">("All");

  // Tabs State
  const [verificationTab, setVerificationTab] = useState<"pending" | "verified">("pending");
  const [documentTab, setDocumentTab] = useState<"all" | "required" | "uploaded">("all");
  const [bookingFilterTab, setBookingFilterTab] = useState<"All" | "Confirmed" | "Pending" | "Completed">("All");
  const [globalPaymentTab, setGlobalPaymentTab] = useState<"Pending" | "Completed" | "On Hold" | "Failed">("Pending");
  const [adFilterTab, setAdFilterTab] = useState<"All" | "Active" | "Sponsored Packages" | "Banner Ads" | "Paused">("All");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");

  // Add Agency Form State
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
  const [formAgencyName, setFormAgencyName] = useState("");
  const [formEmailAddress, setFormEmailAddress] = useState("");
  const [formContactNumber, setFormContactNumber] = useState("");
  const [formCountry, setFormCountry] = useState("ae");
  const [formAgencyType, setFormAgencyType] = useState("travel");
  const [licenseUploaded, setLicenseUploaded] = useState(false);

  // New Ad Campaign Form State
  const [createAdModalVisible, setCreateAdModalVisible] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdType, setNewAdType] = useState<"Banner Ad" | "Sponsored Package" | "Video Ad">("Banner Ad");
  const [newAdBudget, setNewAdBudget] = useState("$100/day");
  const [newAdTargetPackage, setNewAdTargetPackage] = useState("");

  // Modals state
  const [addAgencyModalVisible, setAddAgencyModalVisible] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // Form states for Modal
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyLocation, setNewAgencyLocation] = useState("");
  const [newAgencyOwner, setNewAgencyOwner] = useState("");
  const [newAgencyPhone, setNewAgencyPhone] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const navigateTo = (screen: SubScreenType, agency?: AgencyItem) => {
    setScreenStack((prev) => [...prev, currentScreen]);
    if (agency) setSelectedAgency(agency);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenStack.length > 0) {
      const prev = screenStack[screenStack.length - 1];
      setScreenStack((stack) => stack.slice(0, stack.length - 1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen("dashboard");
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Call Agency", `Dialing ${phone}`);
    });
  };

  const handleConfirmSuspend = () => {
    if (!suspendReason.trim()) {
      Alert.alert("Required", "Please provide a reason for suspension.");
      return;
    }
    setAgenciesList((prev) =>
      prev.map((a) => (a.id === selectedAgency.id ? { ...a, status: "Suspended" } : a))
    );
    setSelectedAgency((prev) => ({ ...prev, status: "Suspended" }));
    setSuspendModalVisible(false);
    setSuspendReason("");
    Alert.alert("Suspended", `${selectedAgency.name} has been suspended.`);
  };

  const handleCreateAdCampaign = () => {
    if (!newAdTitle.trim()) {
      Alert.alert("Required", "Please enter a campaign title.");
      return;
    }

    const newAd: AgencyAdCard = {
      id: `ad-${Date.now()}`,
      title: newAdTitle.trim(),
      adType: newAdType,
      packageName: newAdTargetPackage.trim() || `${selectedAgency.name} Featured Package`,
      agencyName: selectedAgency.name,
      status: "Active",
      dailyBudget: newAdBudget,
      impressions: "1,200",
      clicks: "140",
      ctr: "11.6%",
      totalSpent: "$100.00",
    };

    setAgencyAdsList((prev) => [newAd, ...prev]);
    setCreateAdModalVisible(false);
    setNewAdTitle("");
    setNewAdTargetPackage("");
    Alert.alert("Ad Campaign Created", `'${newAd.title}' is now active for ${selectedAgency.name}.`);
  };

  const handleToggleAdStatus = (adId: string) => {
    setAgencyAdsList((prev) =>
      prev.map((ad) =>
        ad.id === adId
          ? { ...ad, status: ad.status === "Active" ? "Paused" : "Active" }
          : ad
      )
    );
  };

  // --------------------------------------------------------------------------
  // 1. DASHBOARD SCREEN (QUICK ACTION "ADS" -> OVERALL ALL AGENCIES' ADS)
  // --------------------------------------------------------------------------
  const renderDashboard = () => {
    const filteredAgencies = agenciesList.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header with Add Agency Button */}
        <View style={styles.headerWithBtn}>
          <View>
            <Text style={styles.headerTitle}>Agency Management</Text>
            <Text style={styles.headerSubtitle}>Partner Operations Center</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryAddBtnHeader}
            onPress={() => navigateTo("add_agency")}
          >
            <FontAwesome5 name="plus" size={12} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryAddBtnHeaderText}>Add Agency</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.mainStatCard}>
              <View>
                <Text style={styles.statLabel}>Active Agencies</Text>
                <Text style={styles.mainStatValue}>{agenciesList.length * 416}</Text>
              </View>
              <View style={styles.trendRow}>
                <Ionicons name="trending-up" size={14} color="#047857" />
                <Text style={styles.trendText}> 18 This Month</Text>
              </View>
            </View>

            <View style={styles.smallStatsColumn}>
              <TouchableOpacity
                style={styles.smallStatCard}
                onPress={() => setStatusFilter("Verified")}
              >
                <View style={styles.statIconRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#047857" />
                  <Text style={styles.smallStatLabel}>Verified</Text>
                </View>
                <Text style={styles.smallStatValue}>1,126</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smallStatCard}
                onPress={() => setStatusFilter("Pending")}
              >
                <View style={styles.statIconRow}>
                  <Ionicons name="time-outline" size={16} color="#f97316" />
                  <Text style={styles.smallStatLabel}>Pending</Text>
                </View>
                <Text style={styles.smallStatValue}>52</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsGrid, { marginTop: 10 }]}>
            <TouchableOpacity
              style={[styles.smallStatCard, { flex: 1, marginRight: 6 }]}
              onPress={() => setStatusFilter("Suspended")}
            >
              <View style={styles.statIconRow}>
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.smallStatLabel}>Suspended</Text>
              </View>
              <Text style={styles.smallStatValue}>21</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallStatCard, { flex: 1, marginLeft: 6 }]}
              onPress={() => setStatusFilter("All")}
            >
              <View style={styles.statIconRow}>
                <Ionicons name="pause-circle-outline" size={16} color="#94a3b8" />
                <Text style={styles.smallStatLabel}>Inactive</Text>
              </View>
              <Text style={styles.smallStatValue}>49</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Bar (ADS ACTION REDIRECTS TO GLOBAL ALL AGENCIES' ADS) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigateTo("support_center")}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: "#e0e7ff" }]}>
                <FontAwesome5 name="headset" size={16} color="#4338ca" />
              </View>
              <Text style={styles.quickActionLabel}>Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigateTo("verification")}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: "#d1fae5" }]}>
                <FontAwesome5 name="user-check" size={16} color="#047857" />
              </View>
              <Text style={styles.quickActionLabel}>Verify</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigateTo("contracts")}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: "#f3e8ff" }]}>
                <FontAwesome5 name="file-contract" size={16} color="#7e22ce" />
              </View>
              <Text style={styles.quickActionLabel}>Contracts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigateTo("payments")}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: "#ffedd5" }]}>
                <FontAwesome5 name="credit-card" size={16} color="#c2410c" />
              </View>
              <Text style={styles.quickActionLabel}>Payments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigateTo("global_ads")}
            >
              <View style={[styles.quickActionIconCircle, { backgroundColor: "#f3e8ff" }]}>
                <FontAwesome5 name="ad" size={16} color="#7e22ce" />
              </View>
              <Text style={styles.quickActionLabel}>Ads</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Priority Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top Priority</Text>
            <TouchableOpacity onPress={() => navigateTo("verification")}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priorityCard}>
            <TouchableOpacity
              style={styles.priorityItem}
              onPress={() => navigateTo("verification")}
            >
              <View style={styles.priorityLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#ffedd5" }]}>
                  <FontAwesome5 name="shield-alt" size={14} color="#c2410c" />
                </View>
                <Text style={styles.priorityBoldCount}>52</Text>
                <Text style={styles.priorityText}>Agencies Waiting Verification</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.priorityItem}
              onPress={() => navigateTo("contracts")}
            >
              <View style={styles.priorityLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#f3e8ff" }]}>
                  <FontAwesome5 name="file-alt" size={14} color="#7e22ce" />
                </View>
                <Text style={styles.priorityBoldCount}>7</Text>
                <Text style={styles.priorityText}>Contracts Expiring Soon</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.priorityItem}
              onPress={() => {
                setGlobalPaymentTab("On Hold");
                navigateTo("payments");
              }}
            >
              <View style={styles.priorityLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#fee2e2" }]}>
                  <FontAwesome5 name="credit-card" size={14} color="#ef4444" />
                </View>
                <Text style={styles.priorityBoldCount}>18</Text>
                <Text style={styles.priorityText}>Payment Holds</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Agency Directory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agency Directory</Text>

          {/* Search & Filter */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search agencies by name, email or ID..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="filter-outline" size={16} color="#334155" />
              <Text style={styles.filterBtnText}> Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Active Filter Badge */}
          {statusFilter !== "All" && (
            <View style={styles.activeFilterContainer}>
              <Text style={styles.activeFilterText}>Filter: {statusFilter}</Text>
              <TouchableOpacity onPress={() => setStatusFilter("All")}>
                <Ionicons name="close-circle" size={16} color="#047857" />
              </TouchableOpacity>
            </View>
          )}

          {/* Agency Cards */}
          {filteredAgencies.map((agency) => (
            <TouchableOpacity
              key={agency.id}
              style={styles.agencyDirectoryCard}
              onPress={() => navigateTo("details", agency)}
            >
              <View style={styles.agencyCardHeader}>
                <View style={styles.agencyAvatarContainer}>
                  <View style={styles.agencyAvatarBg}>
                    <Text style={styles.agencyAvatarChar}>{agency.avatarText}</Text>
                  </View>
                  <View>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.agencyDirectoryName}>{agency.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              agency.status === "Verified"
                                ? "#d1fae5"
                                : agency.status === "Suspended"
                                ? "#fee2e2"
                                : "#ffedd5",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                agency.status === "Verified"
                                  ? "#047857"
                                  : agency.status === "Suspended"
                                  ? "#ef4444"
                                  : "#c2410c",
                            },
                          ]}
                        >
                          {agency.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#eab308" />
                      <Text style={styles.ratingText}> {agency.rating}</Text>
                    </View>

                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text style={styles.locationText}> {agency.location}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>

              <View style={styles.agencyCardMetricsRow}>
                <View>
                  <Text style={styles.metricLabel}>Revenue</Text>
                  <Text style={styles.metricValue}>{agency.revenue}</Text>
                </View>
                <View>
                  <Text style={styles.metricLabel}>Bookings</Text>
                  <Text style={styles.metricValue}>{agency.bookings}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.viewAllDarkBtn}
            onPress={() => {
              setStatusFilter("All");
              setSearchQuery("");
              Alert.alert("Agencies Directory", `Showing all ${agenciesList.length} partner agencies.`);
            }}
          >
            <Text style={styles.viewAllDarkBtnText}>View All Agencies</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // --------------------------------------------------------------------------
  // 5. GLOBAL PLATFORM ADVERTISEMENTS SCREEN (OVERALL ALL AGENCIES)
  // --------------------------------------------------------------------------
  const renderGlobalAds = () => {
    const filteredAds = agencyAdsList.filter((ad) => {
      if (adFilterTab === "Active") return ad.status === "Active";
      if (adFilterTab === "Sponsored Packages") return ad.adType === "Sponsored Package";
      if (adFilterTab === "Banner Ads") return ad.adType === "Banner Ad";
      if (adFilterTab === "Paused") return ad.status === "Paused";
      return true;
    });

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subHeaderTitle}>Platform Advertisements</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}>Overall All Partner Agencies</Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setCreateAdModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#7e22ce" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Overall Platform Metrics Grid */}
          <View style={styles.keyMetricsGrid}>
            <View style={[styles.keyMetricCard, { backgroundColor: "#f3e8ff" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#7e22ce" }]}>Total Active Ads</Text>
              <Text style={styles.keyMetricValue}>{agencyAdsList.length} Campaigns</Text>
            </View>
            <View style={[styles.keyMetricCard, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#047857" }]}>Platform Impressions</Text>
              <Text style={styles.keyMetricValue}>450.2K</Text>
            </View>
            <View style={[styles.keyMetricCard, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#1d4ed8" }]}>Total Ad Revenue</Text>
              <Text style={styles.keyMetricValue}>$12,450.00</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {(["All", "Active", "Sponsored Packages", "Banner Ads", "Paused"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  adFilterTab === tab && { backgroundColor: "#7e22ce" },
                ]}
                onPress={() => setAdFilterTab(tab)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    adFilterTab === tab && { color: "#ffffff" },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* All Agency Advertisement Cards */}
          {filteredAds.map((ad) => (
            <View key={ad.id} style={styles.agencyDirectoryCard}>
              <View style={styles.agencyCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.agencyDirectoryName}>{ad.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: ad.status === "Active" ? "#d1fae5" : "#fee2e2",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: ad.status === "Active" ? "#047857" : "#ef4444",
                          },
                        ]}
                      >
                        {ad.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name="business" size={12} color="#047857" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#047857" }}>
                      {ad.agencyName}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, color: "#7e22ce", fontWeight: "600", marginTop: 2 }}>
                    Type: {ad.adType} • Budget: {ad.dailyBudget}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Target Package: {ad.packageName}
                  </Text>
                </View>
              </View>

              {/* Metrics Row */}
              <View style={styles.agencyCardMetricsRow}>
                <View>
                  <Text style={styles.metricLabel}>Impressions</Text>
                  <Text style={styles.metricValue}>{ad.impressions}</Text>
                </View>
                <View>
                  <Text style={styles.metricLabel}>Clicks / CTR</Text>
                  <Text style={styles.metricValue}>
                    {ad.clicks} ({ad.ctr})
                  </Text>
                </View>
                <View>
                  <Text style={styles.metricLabel}>Total Spent</Text>
                  <Text style={styles.metricValue}>{ad.totalSpent}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f8fafc" }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: ad.status === "Active" ? "#fee2e2" : "#d1fae5",
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => handleToggleAdStatus(ad.id)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: ad.status === "Active" ? "#ef4444" : "#047857" }}>
                    {ad.status === "Active" ? "Pause Campaign" : "Resume Campaign"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#f1f5f9",
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={() => Alert.alert("Edit Ad", `Editing parameters for ${ad.title}`)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>
                    Edit Ad
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomFixedBtnContainer}>
          <TouchableOpacity
            style={[styles.bottomFixedBtn, { backgroundColor: "#7e22ce" }]}
            onPress={() => setCreateAdModalVisible(true)}
          >
            <Text style={styles.bottomFixedBtnText}>+ Create Platform Ad Campaign</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 12. FULL SUPPORT CENTER SCREEN FLOW
  // --------------------------------------------------------------------------
  const renderSupportCenterFlow = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Support Center Flow</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <SupportCenterScreen />
      </View>
    </View>
  );

  // --------------------------------------------------------------------------
  // 2. AGENCY DETAILS SCREEN
  // --------------------------------------------------------------------------
  const renderDetails = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Agency Details</Text>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() =>
            Alert.alert("Agency Actions", `Manage settings for ${selectedAgency.name}`, [
              { text: "Edit Profile", onPress: () => setAddAgencyModalVisible(true) },
              { text: "View Documents", onPress: () => navigateTo("documents") },
              { text: "View Advertisements", onPress: () => navigateTo("agency_ads") },
              { text: "Close", style: "cancel" },
            ])
          }
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileSection}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarText}>{selectedAgency.avatarText}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{selectedAgency.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#eab308" />
            <Text style={styles.profileRatingText}>
              {" "}
              {selectedAgency.rating}{" "}
              <Text style={styles.profileReviewCount}>
                ({selectedAgency.reviewsCount} Reviews)
              </Text>
            </Text>
          </View>
          <View
            style={[
              styles.verifiedBadgeInline,
              {
                backgroundColor:
                  selectedAgency.status === "Verified"
                    ? "#d1fae5"
                    : selectedAgency.status === "Suspended"
                    ? "#fee2e2"
                    : "#ffedd5",
              },
            ]}
          >
            <Ionicons
              name={selectedAgency.status === "Verified" ? "checkmark-circle" : "alert-circle"}
              size={12}
              color={selectedAgency.status === "Verified" ? "#047857" : "#ef4444"}
            />
            <Text
              style={[
                styles.verifiedBadgeInlineText,
                { color: selectedAgency.status === "Verified" ? "#047857" : "#ef4444" },
              ]}
            >
              {" "}
              {selectedAgency.status} Agency
            </Text>
          </View>
          <Text style={styles.profileLocation}>
            <Ionicons name="location-outline" size={12} color="#64748b" />{" "}
            {selectedAgency.location}
          </Text>
          <Text style={styles.profileIdText}>ID: {selectedAgency.agencyId}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setNewAgencyName(selectedAgency.name);
            setNewAgencyLocation(selectedAgency.location);
            setNewAgencyOwner(selectedAgency.ownerName);
            setNewAgencyPhone(selectedAgency.ownerPhone);
            setAddAgencyModalVisible(true);
          }}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.keyMetricsGrid}>
        <View style={styles.keyMetricCard}>
          <Text style={styles.keyMetricLabel}>Revenue</Text>
          <Text style={styles.keyMetricValue}>{selectedAgency.revenue}</Text>
          <Text style={styles.keyMetricTrend}>
            <Ionicons name="arrow-up" size={10} color="#047857" /> 18%
          </Text>
        </View>

        <View style={styles.keyMetricCard}>
          <Text style={styles.keyMetricLabel}>Bookings</Text>
          <Text style={styles.keyMetricValue}>{selectedAgency.bookings}</Text>
          <Text style={styles.keyMetricTrend}>
            <Ionicons name="arrow-up" size={10} color="#047857" /> 12%
          </Text>
        </View>

        <View style={styles.keyMetricCard}>
          <Text style={styles.keyMetricLabel}>Customers</Text>
          <Text style={styles.keyMetricValue}>{selectedAgency.customers}</Text>
          <Text style={styles.keyMetricTrend}>
            <Ionicons name="arrow-up" size={10} color="#047857" /> 16%
          </Text>
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.performanceRow}>
        <View style={styles.performanceCol}>
          <Text style={styles.perfLabel}>Response Time</Text>
          <Text style={styles.perfVal}>{selectedAgency.responseTime}</Text>
        </View>
        <View style={styles.performanceCol}>
          <Text style={styles.perfLabel}>Acceptance Rate</Text>
          <Text style={styles.perfVal}>{selectedAgency.acceptanceRate}</Text>
        </View>
        <View style={styles.performanceCol}>
          <Text style={styles.perfLabel}>Cancellation Rate</Text>
          <Text style={styles.perfVal}>{selectedAgency.cancellationRate}</Text>
        </View>
      </View>

      {/* Quick Actions (INDIVIDUAL AGENCY ADVERTISEMENT REPLICATED STRICTLY FOR THIS AGENCY) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions4Grid}>
          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => setSuspendModalVisible(true)}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#fee2e2" }]}>
              <FontAwesome5 name="ban" size={16} color="#ef4444" />
            </View>
            <Text style={styles.quickAction4Text}>Suspend</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => navigateTo("agency_payments")}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#ffedd5" }]}>
              <FontAwesome5 name="credit-card" size={16} color="#c2410c" />
            </View>
            <Text style={styles.quickAction4Text}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => navigateTo("analytics")}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#dbeafe" }]}>
              <FontAwesome5 name="chart-bar" size={16} color="#1d4ed8" />
            </View>
            <Text style={styles.quickAction4Text}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => navigateTo("agency_ads")}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#f3e8ff" }]}>
              <FontAwesome5 name="ad" size={16} color="#7e22ce" />
            </View>
            <Text style={styles.quickAction4Text}>Advertisement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Business Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          <TouchableOpacity onPress={() => navigateTo("documents")}>
            <Text style={styles.linkText}>Documents</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bizCard}>
          <View style={styles.bizRow}>
            <Text style={styles.bizLabel}>License</Text>
            <Text style={styles.bizVerifiedText}>
              Verified <Ionicons name="checkmark-circle" size={14} color="#047857" />
            </Text>
          </View>
          <View style={styles.bizRow}>
            <Text style={styles.bizLabel}>Tax ID</Text>
            <Text style={styles.bizVerifiedText}>
              Verified <Ionicons name="checkmark-circle" size={14} color="#047857" />
            </Text>
          </View>
          <View style={styles.bizRow}>
            <Text style={styles.bizLabel}>Insurance</Text>
            <Text style={styles.bizVerifiedText}>
              Active <Ionicons name="checkmark-circle" size={14} color="#047857" />
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bizRow, { borderBottomWidth: 0 }]}
            onPress={() => navigateTo("contracts")}
          >
            <Text style={styles.bizLabel}>Agreement</Text>
            <Text style={styles.bizValueText}>
              Until Dec 2027 <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contacts */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Contacts</Text>
          <TouchableOpacity onPress={() => Alert.alert("Contacts List", "All contacts active.")}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.contactList}>
          <View style={styles.contactItem}>
            <Text style={styles.contactRole}>Owner</Text>
            <Text style={styles.contactNamePhone}>
              {selectedAgency.ownerName} ({selectedAgency.ownerPhone})
            </Text>
            <TouchableOpacity
              style={styles.callCircle}
              onPress={() => handleCall(selectedAgency.ownerPhone)}
            >
              <Ionicons name="call-outline" size={14} color="#047857" />
            </TouchableOpacity>
          </View>

          <View style={styles.contactItem}>
            <Text style={styles.contactRole}>Manager</Text>
            <Text style={styles.contactNamePhone}>
              {selectedAgency.managerName} ({selectedAgency.managerPhone})
            </Text>
            <TouchableOpacity
              style={styles.callCircle}
              onPress={() => handleCall(selectedAgency.managerPhone)}
            >
              <Ionicons name="call-outline" size={14} color="#047857" />
            </TouchableOpacity>
          </View>

          <View style={styles.contactItem}>
            <Text style={styles.contactRole}>Support</Text>
            <Text style={styles.contactNamePhone}>
              24/7 Support Hotline ({selectedAgency.supportPhone})
            </Text>
            <TouchableOpacity
              style={styles.callCircle}
              onPress={() => handleCall(selectedAgency.supportPhone)}
            >
              <Ionicons name="call-outline" size={14} color="#047857" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // --------------------------------------------------------------------------
  // 4. INDIVIDUAL AGENCY ADVERTISEMENTS & CAMPAIGNS SCREEN (STRICTLY SELECTED AGENCY)
  // --------------------------------------------------------------------------
  const renderAgencyAds = () => {
    const agencySpecificAds = agencyAdsList.filter((ad) => ad.agencyName === selectedAgency.name);
    const filteredAds = agencySpecificAds.filter((ad) => {
      if (adFilterTab === "Active") return ad.status === "Active";
      if (adFilterTab === "Sponsored Packages") return ad.adType === "Sponsored Package";
      if (adFilterTab === "Banner Ads") return ad.adType === "Banner Ad";
      if (adFilterTab === "Paused") return ad.status === "Paused";
      return true;
    });

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subHeaderTitle}>Advertisements & Campaigns</Text>
            <Text style={{ fontSize: 11, color: "#64748b" }}>{selectedAgency.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setCreateAdModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#7e22ce" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Ad Performance Metrics Grid */}
          <View style={styles.keyMetricsGrid}>
            <View style={[styles.keyMetricCard, { backgroundColor: "#f3e8ff" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#7e22ce" }]}>Agency Ads</Text>
              <Text style={styles.keyMetricValue}>{agencySpecificAds.length} Campaigns</Text>
            </View>
            <View style={[styles.keyMetricCard, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#047857" }]}>Impressions</Text>
              <Text style={styles.keyMetricValue}>77.3K</Text>
            </View>
            <View style={[styles.keyMetricCard, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.keyMetricLabel, { color: "#1d4ed8" }]}>Monthly Spend</Text>
              <Text style={styles.keyMetricValue}>$2,400.00</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {(["All", "Active", "Sponsored Packages", "Banner Ads", "Paused"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterChip,
                  adFilterTab === tab && { backgroundColor: "#7e22ce" },
                ]}
                onPress={() => setAdFilterTab(tab)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    adFilterTab === tab && { color: "#ffffff" },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Agency Specific Advertisement Cards */}
          {filteredAds.length > 0 ? (
            filteredAds.map((ad) => (
              <View key={ad.id} style={styles.agencyDirectoryCard}>
                <View style={styles.agencyCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.agencyDirectoryName}>{ad.title}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: ad.status === "Active" ? "#d1fae5" : "#fee2e2",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: ad.status === "Active" ? "#047857" : "#ef4444",
                            },
                          ]}
                        >
                          {ad.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, color: "#7e22ce", fontWeight: "600", marginTop: 2 }}>
                      Type: {ad.adType} • Budget: {ad.dailyBudget}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Target Package: {ad.packageName}
                    </Text>
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={styles.agencyCardMetricsRow}>
                  <View>
                    <Text style={styles.metricLabel}>Impressions</Text>
                    <Text style={styles.metricValue}>{ad.impressions}</Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Clicks / CTR</Text>
                    <Text style={styles.metricValue}>
                      {ad.clicks} ({ad.ctr})
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Total Spent</Text>
                    <Text style={styles.metricValue}>{ad.totalSpent}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f8fafc" }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: ad.status === "Active" ? "#fee2e2" : "#d1fae5",
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                    onPress={() => handleToggleAdStatus(ad.id)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: ad.status === "Active" ? "#ef4444" : "#047857" }}>
                      {ad.status === "Active" ? "Pause Campaign" : "Resume Campaign"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#f1f5f9",
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                    onPress={() => Alert.alert("Edit Ad", `Editing parameters for ${ad.title}`)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>
                      Edit Ad
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <FontAwesome5 name="ad" size={36} color="#cbd5e1" />
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#64748b", marginTop: 10 }}>
                No active advertisements found for {selectedAgency.name}.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomFixedBtnContainer}>
          <TouchableOpacity
            style={[styles.bottomFixedBtn, { backgroundColor: "#7e22ce" }]}
            onPress={() => setCreateAdModalVisible(true)}
          >
            <Text style={styles.bottomFixedBtnText}>+ Create Ad Campaign for {selectedAgency.name}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 6. ADD AGENCY MULTI-STEP SCREEN
  // --------------------------------------------------------------------------
  const renderAddAgency = () => {
    const countryLabels: Record<string, string> = {
      us: "United States",
      uk: "United Kingdom",
      ae: "United Arab Emirates",
      sg: "Singapore",
    };

    const typeLabels: Record<string, string> = {
      travel: "Travel",
      realestate: "Real Estate",
      recruitment: "Recruitment",
    };

    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#ffffff",
          }}
        >
          <TouchableOpacity onPress={goBack} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </TouchableOpacity>

          <Text style={{ fontSize: 17, fontWeight: "600", color: "#111827", letterSpacing: -0.3 }}>
            Add Agency
          </Text>

          <TouchableOpacity style={{ padding: 4 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={{ paddingHorizontal: 32, paddingVertical: 24, marginBottom: 8, alignItems: "center" }}>
            <View style={{ width: 260, position: "relative", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View
                style={{
                  position: "absolute",
                  top: 15,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: "#e5e7eb",
                  zIndex: 0,
                }}
              />

              {/* Step 1 */}
              <TouchableOpacity onPress={() => setAddStep(1)} style={{ alignItems: "center", backgroundColor: "#ffffff", paddingHorizontal: 4, zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: addStep >= 1 ? "#114b3d" : "#f9fafb",
                    borderWidth: addStep >= 1 ? 0 : 1,
                    borderColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: addStep >= 1 ? "#ffffff" : "#9ca3af" }}>
                    1
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "500", color: addStep >= 1 ? "#114b3d" : "#9ca3af" }}>
                  Basic Info
                </Text>
              </TouchableOpacity>

              {/* Step 2 */}
              <TouchableOpacity onPress={() => setAddStep(2)} style={{ alignItems: "center", backgroundColor: "#ffffff", paddingHorizontal: 4, zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: addStep >= 2 ? "#114b3d" : "#f9fafb",
                    borderWidth: addStep >= 2 ? 0 : 1,
                    borderColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: addStep >= 2 ? "#ffffff" : "#9ca3af" }}>
                    2
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "500", color: addStep >= 2 ? "#114b3d" : "#9ca3af" }}>
                  Documents
                </Text>
              </TouchableOpacity>

              {/* Step 3 */}
              <TouchableOpacity onPress={() => setAddStep(3)} style={{ alignItems: "center", backgroundColor: "#ffffff", paddingHorizontal: 4, zIndex: 1 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: addStep >= 3 ? "#114b3d" : "#f9fafb",
                    borderWidth: addStep >= 3 ? 0 : 1,
                    borderColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: addStep >= 3 ? "#ffffff" : "#9ca3af" }}>
                    3
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "500", color: addStep >= 3 ? "#114b3d" : "#9ca3af" }}>
                  Review
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {addStep === 1 && (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6, marginLeft: 4 }}>
                  Agency Name
                </Text>
                <TextInput
                  style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(249, 250, 251, 0.7)",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "#111827",
                  }}
                  placeholder="Enter agency name"
                  placeholderTextColor="#9ca3af"
                  value={formAgencyName}
                  onChangeText={setFormAgencyName}
                />
              </View>

              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6, marginLeft: 4 }}>
                  Email Address
                </Text>
                <TextInput
                  style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(249, 250, 251, 0.7)",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "#111827",
                  }}
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  value={formEmailAddress}
                  onChangeText={setFormEmailAddress}
                />
              </View>

              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6, marginLeft: 4 }}>
                  Contact Number
                </Text>
                <TextInput
                  style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(249, 250, 251, 0.7)",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "#111827",
                  }}
                  placeholder="Enter contact number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={formContactNumber}
                  onChangeText={setFormContactNumber}
                />
              </View>

              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6, marginLeft: 4 }}>
                  Country
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(249, 250, 251, 0.7)",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                  }}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={{ fontSize: 14, color: formCountry ? "#111827" : "#9ca3af" }}>
                    {countryLabels[formCountry] || "Select country"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6, marginLeft: 4 }}>
                  Type
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(249, 250, 251, 0.7)",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                  }}
                  onPress={() => setTypePickerVisible(true)}
                >
                  <Text style={{ fontSize: 14, color: formAgencyType ? "#111827" : "#9ca3af" }}>
                    {typeLabels[formAgencyType] || "Select agency type"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {addStep === 2 && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
                Upload Compliance Documents
              </Text>

              <TouchableOpacity
                style={{
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: licenseUploaded ? "#10b981" : "#e5e7eb",
                  backgroundColor: licenseUploaded ? "#ecfdf5" : "#f9fafb",
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => {
                  setLicenseUploaded(!licenseUploaded);
                  Alert.alert("File Upload", licenseUploaded ? "File removed." : "Trade License uploaded successfully.");
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FontAwesome5 name="file-contract" size={18} color="#114b3d" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                      Trade License / Registration
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6b7280" }}>
                      {licenseUploaded ? "License_2026.pdf (Uploaded)" : "PDF or JPG max 10MB"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={licenseUploaded ? "checkmark-circle" : "cloud-upload-outline"}
                  size={22}
                  color={licenseUploaded ? "#10b981" : "#114b3d"}
                />
              </TouchableOpacity>
            </View>
          )}

          {addStep === 3 && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 12 }}>
                Review Agency Registration
              </Text>

              <View
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>Agency Name</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                    {formAgencyName || "Atlas Travel Group"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>Email Address</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                    {formEmailAddress || "contact@atlastravel.com"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>Contact Number</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                    {formContactNumber || "01863054816"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>Country</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                    {countryLabels[formCountry] || "United Arab Emirates"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>Agency Type</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#114b3d" }}>
                    {typeLabels[formAgencyType] || "Travel"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={{ padding: 20, backgroundColor: "#ffffff" }}>
          {addStep < 3 ? (
            <TouchableOpacity
              style={{
                width: "100%",
                backgroundColor: "#114b3d",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={() => setAddStep((prev) => (prev + 1) as 1 | 2 | 3)}
            >
              <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "500" }}>Next Step</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                width: "100%",
                backgroundColor: "#114b3d",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={() => {
                Alert.alert("Success", "Agency created!");
                goBack();
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>Submit Agency</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 7. VERIFICATION CENTER SCREEN
  // --------------------------------------------------------------------------
  const renderVerification = () => {
    const verifications = [
      { id: "1", title: "Business License", count: "42 Pending", icon: "file-alt", color: "#c2410c" },
      { id: "2", title: "Trade License", count: "28 Pending", icon: "file-invoice", color: "#c2410c" },
      { id: "3", title: "Tax Certificate", count: "22 Pending", icon: "file-contract", color: "#047857" },
      { id: "4", title: "Identity Verification", count: "18 Pending", icon: "id-card", color: "#047857" },
      { id: "5", title: "Bank Account", count: "12 Pending", icon: "university", color: "#047857" },
      { id: "6", title: "Insurance Document", count: "8 Pending", icon: "shield-alt", color: "#047857" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Verification Center</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsHeader}>
          <TouchableOpacity
            style={[styles.tabBtn, verificationTab === "pending" && styles.tabBtnActive]}
            onPress={() => setVerificationTab("pending")}
          >
            <Text
              style={[
                styles.tabBtnText,
                verificationTab === "pending" && styles.tabBtnTextActive,
              ]}
            >
              Pending (52)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, verificationTab === "verified" && styles.tabBtnActive]}
            onPress={() => setVerificationTab("verified")}
          >
            <Text
              style={[
                styles.tabBtnText,
                verificationTab === "verified" && styles.tabBtnTextActive,
              ]}
            >
              Verified
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {verifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.verificationRow}
              onPress={() => navigateTo("documents")}
            >
              <View style={styles.verificationLeft}>
                <View
                  style={[
                    styles.verificationIconCircle,
                    { backgroundColor: item.color === "#c2410c" ? "#ffedd5" : "#d1fae5" },
                  ]}
                >
                  <FontAwesome5 name={item.icon} size={16} color={item.color} />
                </View>
                <View>
                  <Text style={styles.verificationTitle}>{item.title}</Text>
                  <Text style={[styles.verificationCount, { color: item.color }]}>
                    {item.count}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bottomFixedBtnContainer}>
          <TouchableOpacity
            style={styles.bottomFixedBtn}
            onPress={() => Alert.alert("Review All", "Processing 52 pending verifications...")}
          >
            <Text style={styles.bottomFixedBtnText}>Review All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 8. CONTRACTS LIST SCREEN
  // --------------------------------------------------------------------------
  const renderContracts = () => {
    const contracts = [
      { id: "1", name: "Atlas Travel", expiry: "Expires Dec 31, 2027", status: "Active", statusColor: "#047857", bg: "#d1fae5", icon: "A" },
      { id: "2", name: "Skyline Tours", expiry: "Expires Aug 15, 2025", status: "Expiring", statusColor: "#b45309", bg: "#fef3c7", icon: "S" },
      { id: "3", name: "Global Explorer", expiry: "Expires Sep 10, 2025", status: "Expiring", statusColor: "#b45309", bg: "#fef3c7", icon: "G" },
      { id: "4", name: "Holiday Hub", expiry: "Expired May 10, 2025", status: "Expired", statusColor: "#b91c1c", bg: "#fee2e2", icon: "H" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Contracts</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contractStatusGrid}>
            <View style={[styles.contractStatusCard, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[styles.contractStatusLabel, { color: "#047857" }]}>Active</Text>
              <Text style={styles.contractStatusVal}>1,189</Text>
            </View>

            <View style={[styles.contractStatusCard, { backgroundColor: "#fffbeb" }]}>
              <Text style={[styles.contractStatusLabel, { color: "#b45309" }]}>Expiring Soon</Text>
              <Text style={styles.contractStatusVal}>7</Text>
            </View>

            <View style={[styles.contractStatusCard, { backgroundColor: "#fef2f2" }]}>
              <Text style={[styles.contractStatusLabel, { color: "#b91c1c" }]}>Expired</Text>
              <Text style={styles.contractStatusVal}>2</Text>
            </View>

            <View style={[styles.contractStatusCard, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.contractStatusLabel, { color: "#1d4ed8" }]}>Draft</Text>
              <Text style={styles.contractStatusVal}>12</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Contracts</Text>
              <TouchableOpacity>
                <Text style={styles.linkText}>View All</Text>
              </TouchableOpacity>
            </View>

            {contracts.map((item) => (
              <View key={item.id} style={styles.contractItemRow}>
                <View style={styles.contractItemLeft}>
                  <View style={styles.contractAvatarCircle}>
                    <Text style={styles.contractAvatarText}>{item.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.contractName}>{item.name}</Text>
                    <Text style={styles.contractExpiry}>{item.expiry}</Text>
                  </View>
                </View>
                <View style={[styles.contractStatusPill, { backgroundColor: item.bg }]}>
                  <Text style={[styles.contractStatusPillText, { color: item.statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomFixedBtnContainer}>
          <TouchableOpacity
            style={styles.bottomFixedBtn}
            onPress={() => Alert.alert("New Contract", "Opening new agency contract wizard...")}
          >
            <Text style={styles.bottomFixedBtnText}>Add New Contract</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 9. AGENCY ANALYTICS SCREEN
  // --------------------------------------------------------------------------
  const renderAnalytics = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Agency Analytics</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.periodSelectorRow}>
          <TouchableOpacity style={styles.periodSelectorBtn}>
            <Text style={styles.periodSelectorText}>This Month </Text>
            <Ionicons name="chevron-down" size={14} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.revenueHeaderRow}>
          <View>
            <Text style={styles.revenueLabel}>Revenue ({selectedAgency.name})</Text>
            <Text style={styles.revenueBigValue}>{selectedAgency.revenue}</Text>
          </View>
          <View style={styles.revenueTrendTag}>
            <Ionicons name="trending-up" size={12} color="#047857" />
            <Text style={styles.revenueTrendText}> 10% vs Last Month</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Svg width={width - 40} height={180} viewBox="0 0 350 180">
            <Defs>
              <SvgGradient id="gradientEmerald" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </SvgGradient>
            </Defs>

            <Line x1="30" y1="10" x2="350" y2="10" stroke="#e2e8f0" strokeDasharray="4 4" />
            <SvgText x="0" y="14" fontSize="10" fill="#64748b">
              100K
            </SvgText>

            <Line x1="30" y1="45" x2="350" y2="45" stroke="#e2e8f0" strokeDasharray="4 4" />
            <SvgText x="0" y="49" fontSize="10" fill="#64748b">
              75K
            </SvgText>

            <Line x1="30" y1="80" x2="350" y2="80" stroke="#e2e8f0" strokeDasharray="4 4" />
            <SvgText x="0" y="84" fontSize="10" fill="#64748b">
              50K
            </SvgText>

            <Line x1="30" y1="115" x2="350" y2="115" stroke="#e2e8f0" strokeDasharray="4 4" />
            <SvgText x="0" y="119" fontSize="10" fill="#64748b">
              25K
            </SvgText>

            <Line x1="30" y1="150" x2="350" y2="150" stroke="#e2e8f0" strokeDasharray="4 4" />
            <SvgText x="0" y="154" fontSize="10" fill="#64748b">
              0
            </SvgText>

            <SvgText x="30" y="170" fontSize="10" fill="#64748b" textAnchor="middle">
              1
            </SvgText>
            <SvgText x="83" y="170" fontSize="10" fill="#64748b" textAnchor="middle">
              8
            </SvgText>
            <SvgText x="136" y="170" fontSize="10" fill="#64748b" textAnchor="middle">
              15
            </SvgText>
            <SvgText x="189" y="170" fontSize="10" fill="#64748b" textAnchor="middle">
              22
            </SvgText>
            <SvgText x="242" y="170" fontSize="10" fill="#64748b" textAnchor="middle">
              29
            </SvgText>

            <G transform="translate(30, 0)">
              <Polygon
                points="0,150 0,140 53,90 106,60 159,75 212,40 265,80 318,65 318,150"
                fill="url(#gradientEmerald)"
              />
              <Polyline
                points="0,140 53,90 106,60 159,75 212,40 265,80 318,65"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />

              <Circle cx="0" cy="140" r="3" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="53" cy="90" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="106" cy="60" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="159" cy="75" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="212" cy="40" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="265" cy="80" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <Circle cx="318" cy="65" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
            </G>
          </Svg>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricsList}>
          <View style={styles.metricListItem}>
            <Text style={styles.metricListLabel}>Total Bookings</Text>
            <View style={styles.metricListRight}>
              <Text style={styles.metricListVal}>{selectedAgency.bookings}</Text>
              <View style={styles.metricTrendBadge}>
                <Ionicons name="trending-up" size={10} color="#047857" />
                <Text style={styles.metricTrendBadgeText}> 12%</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricListItem}>
            <Text style={styles.metricListLabel}>New Customers</Text>
            <View style={styles.metricListRight}>
              <Text style={styles.metricListVal}>124</Text>
              <View style={styles.metricTrendBadge}>
                <Ionicons name="trending-up" size={10} color="#047857" />
                <Text style={styles.metricTrendBadgeText}> 15%</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricListItem}>
            <Text style={styles.metricListLabel}>Repeat Customers</Text>
            <View style={styles.metricListRight}>
              <Text style={styles.metricListVal}>89%</Text>
              <View style={styles.metricTrendBadge}>
                <Ionicons name="trending-up" size={10} color="#047857" />
                <Text style={styles.metricTrendBadgeText}> 5%</Text>
              </View>
            </View>
          </View>

          <View style={styles.metricListItem}>
            <Text style={styles.metricListLabel}>Average Booking Value</Text>
            <View style={styles.metricListRight}>
              <Text style={styles.metricListVal}>$241</Text>
              <View style={styles.metricTrendBadge}>
                <Ionicons name="trending-up" size={10} color="#047857" />
                <Text style={styles.metricTrendBadgeText}> 8%</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomFixedBtnContainer}>
        <TouchableOpacity
          style={styles.bottomFixedBtn}
          onPress={() => Alert.alert("Full Report", "Generating detailed PDF analytics report...")}
        >
          <Text style={styles.bottomFixedBtnText}>View Full Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --------------------------------------------------------------------------
  // 10. DOCUMENT REPOSITORY SCREEN
  // --------------------------------------------------------------------------
  const renderDocuments = () => {
    const docs = [
      { id: "1", title: "Business License", status: "Uploaded", icon: "id-card" },
      { id: "2", title: "Trade License", status: "Uploaded", icon: "file-alt" },
      { id: "3", title: "Tax Certificate", status: "Uploaded", icon: "file-invoice" },
      { id: "4", title: "Insurance Document", status: "Uploaded", icon: "shield-alt" },
      { id: "5", title: "Bank Statement", status: "Uploaded", icon: "university" },
      { id: "6", title: "Company Agreement", status: "Uploaded", icon: "file-contract" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Documents ({selectedAgency.name})</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsHeader}>
          <TouchableOpacity
            style={[styles.tabBtn, documentTab === "all" && styles.tabBtnActive]}
            onPress={() => setDocumentTab("all")}
          >
            <Text style={[styles.tabBtnText, documentTab === "all" && styles.tabBtnTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, documentTab === "required" && styles.tabBtnActive]}
            onPress={() => setDocumentTab("required")}
          >
            <Text style={[styles.tabBtnText, documentTab === "required" && styles.tabBtnTextActive]}>
              Required
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, documentTab === "uploaded" && styles.tabBtnActive]}
            onPress={() => setDocumentTab("uploaded")}
          >
            <Text style={[styles.tabBtnText, documentTab === "uploaded" && styles.tabBtnTextActive]}>
              Uploaded
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {docs.map((doc) => (
            <View key={doc.id} style={styles.docRow}>
              <View style={styles.docLeft}>
                <View style={styles.docIconCircle}>
                  <FontAwesome5 name={doc.icon} size={16} color="#047857" />
                </View>
                <View>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docStatusText}>{doc.status}</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 11. GLOBAL PAYMENTS SCREEN
  // --------------------------------------------------------------------------
  const renderGlobalPayments = () => {
    const tabs: { key: "Pending" | "Completed" | "On Hold" | "Failed"; label: string }[] = [
      { key: "Pending", label: "Pending (75)" },
      { key: "Completed", label: "Completed (100)" },
      { key: "On Hold", label: "On Hold (200)" },
      { key: "Failed", label: "Failed (0)" },
    ];

    const filteredPayments = GLOBAL_PAYMENTS_DATA.filter((p) => {
      const isMatchTab =
        globalPaymentTab === "Pending"
          ? p.status === "Pending"
          : globalPaymentTab === "Completed"
          ? p.status === "Completed" || p.status === "Success"
          : globalPaymentTab === "On Hold"
          ? p.status === "On Hold"
          : p.status === "Failed";

      const matchesSearch =
        p.agencyName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
        p.invoiceRef.toLowerCase().includes(paymentSearchQuery.toLowerCase());
      return isMatchTab && matchesSearch;
    });

    return (
      <View style={{ flex: 1, backgroundColor: "#f8f9ff" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(191, 201, 195, 0.3)",
            backgroundColor: "#ffffff",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={goBack} style={{ padding: 6, marginRight: 10 }}>
              <FontAwesome5 name="arrow-left" size={18} color="#0b1c30" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#0b1c30" }}>Payments</Text>
          </View>
          <TouchableOpacity style={{ padding: 6 }}>
            <FontAwesome5 name="ellipsis-h" size={18} color="#404944" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, marginVertical: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: globalPaymentTab === tab.key ? "#003527" : "#eff4ff",
                  marginRight: 8,
                }}
                onPress={() => setGlobalPaymentTab(tab.key)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: globalPaymentTab === tab.key ? "#ffffff" : "#404944",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 14, gap: 10 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(191, 201, 195, 0.4)",
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 42,
            }}
          >
            <FontAwesome5 name="search" size={14} color="#707974" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 13, color: "#0b1c30" }}
              placeholder="Search payments..."
              placeholderTextColor="#707974"
              value={paymentSearchQuery}
              onChangeText={setPaymentSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={{
              width: 42,
              height: 42,
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(191, 201, 195, 0.4)",
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => Alert.alert("Filter", "Filter parameters active.")}
          >
            <FontAwesome5 name="sliders-h" size={16} color="#404944" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {filteredPayments.length > 0 ? (
            filteredPayments.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "rgba(191, 201, 195, 0.2)",
                }}
                onPress={() => {
                  const targetAgency = agenciesList.find((a) => a.name === item.agencyName) || selectedAgency;
                  navigateTo("agency_payments", targetAgency);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "#d3e4fe",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <FontAwesome5 name={item.iconName} size={18} color="#003527" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#0b1c30" }}>
                      {item.agencyName}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#404944", marginTop: 2 }}>
                      {item.invoiceRef} • {item.date}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#0b1c30",
                    }}
                  >
                    {item.amount}
                  </Text>
                  <View
                    style={{
                      backgroundColor:
                        item.status === "Completed" || item.status === "Success"
                          ? "#b0f0d6"
                          : item.status === "On Hold"
                          ? "#ffdad6"
                          : "#b0f0d6",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color:
                          item.status === "Completed" || item.status === "Success"
                            ? "#0b513d"
                            : item.status === "On Hold"
                            ? "#93000a"
                            : "#0b513d",
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <FontAwesome5 name="receipt" size={36} color="#bfc9c3" />
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#707974", marginTop: 10 }}>
                No {globalPaymentTab} payments found.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 12. INDIVIDUAL AGENCY PAYMENT ANALYSIS & HISTORY SCREEN
  // --------------------------------------------------------------------------
  const renderAgencyPayments = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.subHeaderTitle}>Payment Analysis</Text>
          <Text style={{ fontSize: 11, color: "#64748b" }}>{selectedAgency.name}</Text>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.keyMetricsGrid}>
          <View style={[styles.keyMetricCard, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.keyMetricLabel, { color: "#047857" }]}>Total Paid</Text>
            <Text style={styles.keyMetricValue}>$142,500</Text>
          </View>
          <View style={[styles.keyMetricCard, { backgroundColor: "#fffbeb" }]}>
            <Text style={[styles.keyMetricLabel, { color: "#b45309" }]}>Pending Payout</Text>
            <Text style={styles.keyMetricValue}>$18,420</Text>
          </View>
          <View style={[styles.keyMetricCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[styles.keyMetricLabel, { color: "#b91c1c" }]}>Holds</Text>
            <Text style={styles.keyMetricValue}>3 Holds</Text>
          </View>
        </View>

        <View style={styles.bizCard}>
          <View style={styles.bizRow}>
            <Text style={styles.bizLabel}>Commission Tier</Text>
            <Text style={styles.bizValueText}>Standard (10%)</Text>
          </View>
          <View style={styles.bizRow}>
            <Text style={styles.bizLabel}>Payout Cycle</Text>
            <Text style={styles.bizValueText}>Weekly (Every Mon)</Text>
          </View>
          <View style={[styles.bizRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.bizLabel}>Payout Account</Text>
            <Text style={styles.bizVerifiedText}>
              Direct Deposit Verified <Ionicons name="checkmark-circle" size={14} color="#047857" />
            </Text>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 16 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Payout History & Statements</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          {[
            { ref: "PY-84920", date: "Dec 18, 2026", amt: "$12,450.00", st: "Completed" },
            { ref: "PY-84919", date: "Dec 20, 2026", amt: "$8,200.50", st: "Pending" },
            { ref: "PY-84918", date: "Dec 15, 2026", amt: "$5,150.00", st: "Hold" },
            { ref: "PY-84917", date: "Dec 01, 2026", amt: "$15,300.00", st: "Completed" },
          ].map((item, idx) => (
            <View key={idx} style={styles.contractItemRow}>
              <View style={styles.contractItemLeft}>
                <View
                  style={[
                    styles.contractAvatarCircle,
                    {
                      backgroundColor:
                        item.st === "Completed"
                          ? "#d1fae5"
                          : item.st === "Hold"
                          ? "#fee2e2"
                          : "#ffedd5",
                    },
                  ]}
                >
                  <FontAwesome5
                    name="credit-card"
                    size={16}
                    color={
                      item.st === "Completed"
                        ? "#047857"
                        : item.st === "Hold"
                        ? "#ef4444"
                        : "#c2410c"
                    }
                  />
                </View>
                <View>
                  <Text style={styles.contractName}>
                    {item.ref} • {selectedAgency.name}
                  </Text>
                  <Text style={styles.contractExpiry}>{item.date}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
                  {item.amt}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color:
                      item.st === "Completed"
                        ? "#047857"
                        : item.st === "Hold"
                        ? "#ef4444"
                        : "#c2410c",
                  }}
                >
                  {item.st}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomFixedBtnContainer}>
        <TouchableOpacity
          style={styles.bottomFixedBtn}
          onPress={() => Alert.alert("Initiate Payout", `Processing manual payout for ${selectedAgency.name}...`)}
        >
          <Text style={styles.bottomFixedBtnText}>Initiate Agency Payout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --------------------------------------------------------------------------
  // 13. BOOKINGS SCREEN
  // --------------------------------------------------------------------------
  const renderBookings = () => {
    const filteredBookings = SAMPLE_BOOKINGS.filter((b) => {
      if (bookingFilterTab === "All") return true;
      return b.status === bookingFilterTab;
    });

    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Agency Bookings</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsHeader}>
          {(["All", "Confirmed", "Pending", "Completed"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, bookingFilterTab === tab && styles.tabBtnActive]}
              onPress={() => setBookingFilterTab(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  bookingFilterTab === tab && styles.tabBtnTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {filteredBookings.map((b) => (
            <View key={b.id} style={styles.agencyDirectoryCard}>
              <View style={styles.agencyCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.agencyDirectoryName}>{b.bookingRef}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            b.status === "Confirmed"
                              ? "#d1fae5"
                              : b.status === "Completed"
                              ? "#dbeafe"
                              : "#ffedd5",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              b.status === "Confirmed"
                                ? "#047857"
                                : b.status === "Completed"
                                ? "#1d4ed8"
                                : "#c2410c",
                          },
                        ]}
                      >
                        {b.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#334155", marginTop: 4 }}>
                    {b.packageName}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Customer: {b.customerName} • Agency: {b.agencyName}
                  </Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
                  {b.amount}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomFixedBtnContainer}>
          <TouchableOpacity
            style={styles.bottomFixedBtn}
            onPress={() => Alert.alert("Manual Booking", "Opening manual booking entry form...")}
          >
            <Text style={styles.bottomFixedBtnText}>Create Manual Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {currentScreen === "dashboard" && renderDashboard()}
      {currentScreen === "add_agency" && renderAddAgency()}
      {currentScreen === "details" && renderDetails()}
      {currentScreen === "agency_ads" && renderAgencyAds()}
      {currentScreen === "global_ads" && renderGlobalAds()}
      {currentScreen === "verification" && renderVerification()}
      {currentScreen === "contracts" && renderContracts()}
      {currentScreen === "analytics" && renderAnalytics()}
      {currentScreen === "documents" && renderDocuments()}
      {currentScreen === "payments" && renderGlobalPayments()}
      {currentScreen === "agency_payments" && renderAgencyPayments()}
      {currentScreen === "bookings" && renderBookings()}
      {currentScreen === "support_center" && renderSupportCenterFlow()}

      {/* Partner Support Quick Modal */}
      <Modal
        visible={supportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FontAwesome5 name="headset" size={18} color="#4338ca" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Partner Support & Help</Text>
              </View>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>
                Contact admin support operations or launch the full Support Center workspace.
              </Text>

              <TouchableOpacity
                style={styles.supportOptionBtn}
                onPress={() => {
                  setSupportModalVisible(false);
                  navigateTo("support_center");
                }}
              >
                <View style={[styles.supportOptionIcon, { backgroundColor: "#e0e7ff" }]}>
                  <Ionicons name="document-text" size={18} color="#4338ca" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportOptionTitle}>Open Support Center Workspace</Text>
                  <Text style={styles.supportOptionSub}>Full Live Feed & Response Editor</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportOptionBtn}
                onPress={() => {
                  setSupportModalVisible(false);
                  handleCall("01863054816");
                }}
              >
                <View style={[styles.supportOptionIcon, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="call" size={18} color="#047857" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportOptionTitle}>24/7 Phone Support Hotline</Text>
                  <Text style={styles.supportOptionSub}>Dial 01863054816 directly</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create New Ad Campaign Modal */}
      <Modal
        visible={createAdModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateAdModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Ad Campaign</Text>
              <TouchableOpacity onPress={() => setCreateAdModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                Agency: <Text style={{ fontWeight: "600", color: "#0f172a" }}>{selectedAgency.name}</Text>
              </Text>

              <Text style={styles.inputLabel}>Campaign Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Autumn Luxury Escape Banner"
                placeholderTextColor="#94a3b8"
                value={newAdTitle}
                onChangeText={setNewAdTitle}
              />

              <Text style={styles.inputLabel}>Ad Type</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {(["Banner Ad", "Sponsored Package", "Video Ad"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: newAdType === t ? "#7e22ce" : "#e2e8f0",
                      backgroundColor: newAdType === t ? "#f3e8ff" : "#f8fafc",
                      alignItems: "center",
                    }}
                    onPress={() => setNewAdType(t)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: newAdType === t ? "#7e22ce" : "#475569" }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Daily Budget</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. $100/day"
                placeholderTextColor="#94a3b8"
                value={newAdBudget}
                onChangeText={setNewAdBudget}
              />

              <Text style={styles.inputLabel}>Target Package Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dubai Desert Safari VIP"
                placeholderTextColor="#94a3b8"
                value={newAdTargetPackage}
                onChangeText={setNewAdTargetPackage}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#7e22ce" }]}
                onPress={handleCreateAdCampaign}
              >
                <Text style={styles.modalSubmitBtnText}>Launch Campaign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Agency Quick Modal */}
      <Modal
        visible={addAgencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddAgencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Add Agency</Text>
              <TouchableOpacity onPress={() => setAddAgencyModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Agency Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Acme Tours"
                placeholderTextColor="#94a3b8"
                value={newAgencyName}
                onChangeText={setNewAgencyName}
              />

              <Text style={styles.inputLabel}>Location / Country</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dubai, UAE"
                placeholderTextColor="#94a3b8"
                value={newAgencyLocation}
                onChangeText={setNewAgencyLocation}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => {
                  setAddAgencyModalVisible(false);
                  navigateTo("add_agency");
                }}
              >
                <Text style={styles.modalSubmitBtnText}>Open Full Add Stepper Wizard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Suspend Agency Modal */}
      <Modal
        visible={suspendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuspendModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: "#ef4444" }]}>
                Suspend Agency
              </Text>
              <TouchableOpacity onPress={() => setSuspendModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
                Are you sure you want to suspend{" "}
                <Text style={{ fontWeight: "600", color: "#0f172a" }}>
                  {selectedAgency.name}
                </Text>
                ? Suspended agencies will not be able to accept new bookings.
              </Text>

              <Text style={styles.inputLabel}>Reason for Suspension</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
                placeholder="Specify violation or operational reason..."
                placeholderTextColor="#94a3b8"
                multiline
                value={suspendReason}
                onChangeText={setSuspendReason}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#f1f5f9",
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginRight: 6,
                  }}
                  onPress={() => setSuspendModalVisible(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#334155" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#ef4444",
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    marginLeft: 6,
                  }}
                  onPress={handleConfirmSuspend}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>
                    Suspend
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Directory Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Directory</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Filter by Status</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                {(["All", "Verified", "Pending", "Suspended"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: statusFilter === st ? "#047857" : "#f1f5f9",
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: statusFilter === st ? "#ffffff" : "#334155",
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalSubmitBtnText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerWithBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  primaryAddBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#114b3d",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    elevation: 2,
  },
  primaryAddBtnHeaderText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  backBtn: {
    padding: 4,
  },
  moreBtn: {
    padding: 4,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
  },
  mainStatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "space-between",
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  mainStatValue: {
    fontSize: 28,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#047857",
  },
  smallStatsColumn: {
    flex: 1,
    marginLeft: 6,
    justifyContent: "space-between",
  },
  smallStatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallStatLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 6,
  },
  smallStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionBtn: {
    alignItems: "center",
    width: (width - 60) / 5,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#334155",
    textAlign: "center",
  },
  priorityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  priorityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  priorityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  priorityBoldCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginRight: 6,
  },
  priorityText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  searchFilterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  filterBtnText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  activeFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  agencyDirectoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  agencyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  agencyAvatarContainer: {
    flexDirection: "row",
  },
  agencyAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  agencyAvatarChar: {
    fontSize: 18,
    fontWeight: "600",
    color: "#047857",
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  agencyDirectoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: "#64748b",
  },
  agencyCardMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  viewAllDarkBtn: {
    backgroundColor: "#0F3F34",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  viewAllDarkBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  profileAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#047857",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  profileRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  profileReviewCount: {
    fontWeight: "400",
    color: "#64748b",
  },
  verifiedBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  verifiedBadgeInlineText: {
    fontSize: 11,
    fontWeight: "600",
  },
  profileLocation: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
  profileIdText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  keyMetricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  keyMetricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  keyMetricLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  keyMetricValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 4,
  },
  keyMetricTrend: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "500",
    marginTop: 4,
  },
  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  performanceCol: {
    alignItems: "center",
  },
  perfLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  perfVal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  quickActions4Grid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickAction4Btn: {
    alignItems: "center",
  },
  quickAction4Icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickAction4Text: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
  },
  bizCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bizRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  bizLabel: {
    fontSize: 13,
    color: "#475569",
  },
  bizVerifiedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#047857",
  },
  bizValueText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  contactList: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  contactRole: {
    fontSize: 13,
    color: "#64748b",
    width: 70,
  },
  contactNamePhone: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  callCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#047857",
  },
  tabBtnText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  tabBtnTextActive: {
    color: "#047857",
    fontWeight: "600",
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  verificationLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  verificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  verificationCount: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  bottomFixedBtnContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bottomFixedBtn: {
    backgroundColor: "#0d4f3b",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  bottomFixedBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  contractStatusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  contractStatusCard: {
    width: (width - 44) / 2,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  contractStatusLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  contractStatusVal: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
  },
  contractItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  contractItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  contractAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contractAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#047857",
  },
  contractName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  contractExpiry: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  contractStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  contractStatusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  periodSelectorRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  periodSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  periodSelectorText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  revenueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  revenueLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  revenueBigValue: {
    fontSize: 26,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 2,
  },
  revenueTrendTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  revenueTrendText: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "500",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  metricsList: {
    marginTop: 10,
  },
  metricListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  metricListLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  metricListRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricListVal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginRight: 8,
  },
  metricTrendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricTrendBadgeText: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "600",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  docLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  docIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  docStatusText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalBody: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: "#047857",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  supportOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  supportOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  supportOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  supportOptionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
});

export default AgencyManagementScreen;
