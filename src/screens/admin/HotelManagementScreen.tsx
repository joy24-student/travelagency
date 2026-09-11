/**
 * Hotel Management Screen - Admin Operations Panel
 * Enterprise System implementing 15 Dedicated Sub-Screens without popup Modals.
 * Features:
 * 1. Hotel Management Dashboard
 * 2. Hotel Details (Emerald Operations)
 * 3. Room Inventory with Donut Chart
 * 4. Add Hotel Multi-Step Wizard Screen (add_hotel)
 * 5. Edit Hotel Profile Screen (edit_hotel)
 * 6. Add Room Category Screen (add_room)
 * 7. Bulk Rate & Surge Adjuster Screen (bulk_rate)
 * 8. Suspend Hotel Confirmation Screen (suspend_hotel)
 * 9. Verification & Approvals Center Screen (verification)
 * 10. Contracts Management Screen (contracts)
 * 11. Rates & Yield Management Screen (rates)
 * 12. Quality Audits & Inspections Screen (quality_audits)
 * 13. Hotel Bookings Management Screen (hotel_bookings)
 * 14. Operational Reports & Analytics Screen (reports)
 * 15. Directory Filter Screen (filter_hotels)
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import Svg, { Circle, G } from "react-native-svg";
import { AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

export type HotelSubScreenType =
  | "dashboard"
  | "details"
  | "rooms"
  | "contracts"
  | "rates"
  | "add_hotel"
  | "edit_hotel"
  | "add_room"
  | "bulk_rate"
  | "suspend_hotel"
  | "verification"
  | "quality_audits"
  | "hotel_bookings"
  | "reports"
  | "filter_hotels";

export interface HotelItem {
  id: string;
  hotelCode: string;
  name: string;
  image: string;
  rating: number;
  reviewsCount: number;
  status: "Active" | "Pending" | "Inactive" | "Suspended";
  verifiedPartner: boolean;
  location: string;
  city: string;
  country: string;
  address: string;
  starRating: number;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  blockedRooms: number;
  roomTypesCount: number;
  amenitiesCount: number;
  revenue: string;
  occupancyRate: string;
  bookingsCount: number;
  cancellationRate: string;
  avgStay: string;
  contractStatus: "Active" | "Expiring" | "Expired" | "Pending";
  contractExpiry: string;
  licenseVerified: boolean;
  insuranceValid: boolean;
  taxRegistrationVerified: boolean;
  ownerName: string;
  ownerPhone: string;
  managerName: string;
  managerPhone: string;
}

export interface RoomCategoryItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  rate: string;
  color: string;
  bgColor: string;
  iconName: string;
}

export interface ContractItem {
  id: string;
  contractNo: string;
  hotelName: string;
  startDate: string;
  expiryDate: string;
  commissionRate: string;
  status: "Active" | "Expiring" | "Expired" | "Pending";
  documentUrl: string;
}

export interface HotelBookingItem {
  id: string;
  bookingRef: string;
  guestName: string;
  hotelName: string;
  roomCategory: string;
  checkIn: string;
  checkOut: string;
  totalPaid: string;
  status: "Confirmed" | "Pending" | "Checked-In" | "Completed" | "Cancelled";
}

const INITIAL_HOTELS: HotelItem[] = [
  {
    id: "h1",
    hotelCode: "GPH-2045",
    name: "Grand Palace Hotel",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    rating: 4.8,
    reviewsCount: 2342,
    status: "Active",
    verifiedPartner: true,
    location: "Downtown Dubai",
    city: "Dubai",
    country: "UAE",
    address: "Sheikh Mohammed bin Rashid Blvd, Dubai",
    starRating: 5,
    totalRooms: 340,
    availableRooms: 86,
    occupiedRooms: 214,
    maintenanceRooms: 18,
    blockedRooms: 22,
    roomTypesCount: 18,
    amenitiesCount: 42,
    revenue: "$126,420",
    occupancyRate: "92%",
    bookingsCount: 482,
    cancellationRate: "2%",
    avgStay: "3.6 Days",
    contractStatus: "Active",
    contractExpiry: "Dec 31, 2027",
    licenseVerified: true,
    insuranceValid: true,
    taxRegistrationVerified: true,
    ownerName: "Sheikh Rashid Al Maktoum",
    ownerPhone: "01863054816",
    managerName: "Marcus Vance",
    managerPhone: "01711963652",
  },
  {
    id: "h2",
    hotelCode: "RBH-4012",
    name: "Royal Beach Resort & Spa",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
    rating: 4.9,
    reviewsCount: 1890,
    status: "Active",
    verifiedPartner: true,
    location: "Palm Jumeirah",
    city: "Dubai",
    country: "UAE",
    address: "Crescent Road, Palm Jumeirah, Dubai",
    starRating: 5,
    totalRooms: 220,
    availableRooms: 44,
    occupiedRooms: 160,
    maintenanceRooms: 10,
    blockedRooms: 6,
    roomTypesCount: 12,
    amenitiesCount: 38,
    revenue: "$98,500",
    occupancyRate: "88%",
    bookingsCount: 340,
    cancellationRate: "1.8%",
    avgStay: "4.2 Days",
    contractStatus: "Active",
    contractExpiry: "Nov 15, 2027",
    licenseVerified: true,
    insuranceValid: true,
    taxRegistrationVerified: true,
    ownerName: "Elena Rostova",
    ownerPhone: "01812345678",
    managerName: "Tariq Mansoor",
    managerPhone: "01798765432",
  },
  {
    id: "h3",
    hotelCode: "MTH-1088",
    name: "Marina Towers Hotel",
    image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
    rating: 4.6,
    reviewsCount: 940,
    status: "Pending",
    verifiedPartner: false,
    location: "Marina Bay",
    city: "Singapore",
    country: "Singapore",
    address: "10 Bayfront Ave, Singapore",
    starRating: 4,
    totalRooms: 180,
    availableRooms: 60,
    occupiedRooms: 110,
    maintenanceRooms: 5,
    blockedRooms: 5,
    roomTypesCount: 8,
    amenitiesCount: 25,
    revenue: "$45,200",
    occupancyRate: "75%",
    bookingsCount: 195,
    cancellationRate: "3.5%",
    avgStay: "2.8 Days",
    contractStatus: "Pending",
    contractExpiry: "Under Verification",
    licenseVerified: false,
    insuranceValid: true,
    taxRegistrationVerified: false,
    ownerName: "David Tan",
    ownerPhone: "01855554433",
    managerName: "Sarah Lin",
    managerPhone: "01766667788",
  },
];

const INITIAL_ROOM_CATEGORIES: RoomCategoryItem[] = [
  { id: "rc1", name: "Standard Room", count: 126, percentage: 37, rate: "$180/night", color: "#10b981", bgColor: "#ecfdf5", iconName: "home" },
  { id: "rc2", name: "Deluxe Room", count: 82, percentage: 24, rate: "$280/night", color: "#3b82f6", bgColor: "#eff6ff", iconName: "business" },
  { id: "rc3", name: "Suite Room", count: 64, percentage: 19, rate: "$450/night", color: "#f97316", bgColor: "#fff7ed", iconName: "star" },
  { id: "rc4", name: "Executive Room", count: 48, percentage: 14, rate: "$650/night", color: "#a855f7", bgColor: "#faf5ff", iconName: "briefcase" },
  { id: "rc5", name: "Penthouse", count: 20, percentage: 6, rate: "$1,200/night", color: "#6366f1", bgColor: "#eef2ff", iconName: "location" },
];

const CONTRACTS_DATA: ContractItem[] = [
  { id: "c1", contractNo: "CNT-GPH-2026", hotelName: "Grand Palace Hotel", startDate: "Jan 01, 2026", expiryDate: "Dec 31, 2027", commissionRate: "12%", status: "Active", documentUrl: "contract_gph.pdf" },
  { id: "c2", contractNo: "CNT-RBH-2026", hotelName: "Royal Beach Resort", startDate: "Nov 15, 2025", expiryDate: "Nov 15, 2027", commissionRate: "15%", status: "Active", documentUrl: "contract_rbh.pdf" },
  { id: "c3", contractNo: "CNT-MTH-2025", hotelName: "Marina Towers Hotel", startDate: "Aug 01, 2025", expiryDate: "Aug 01, 2026", commissionRate: "10%", status: "Expiring", documentUrl: "contract_mth.pdf" },
  { id: "c4", contractNo: "CNT-SLH-2024", hotelName: "Starlight Heritage", startDate: "May 10, 2024", expiryDate: "May 10, 2025", commissionRate: "10%", status: "Expired", documentUrl: "contract_slh.pdf" },
];

const SAMPLE_HOTEL_BOOKINGS: HotelBookingItem[] = [
  { id: "hb1", bookingRef: "BK-HTL-901", guestName: "Alexander Wright", hotelName: "Grand Palace Hotel", roomCategory: "Deluxe Room", checkIn: "Oct 12, 2026", checkOut: "Oct 16, 2026", totalPaid: "$1,120.00", status: "Checked-In" },
  { id: "hb2", bookingRef: "BK-HTL-902", guestName: "Sophia Martinez", hotelName: "Royal Beach Resort", roomCategory: "Executive Suite", checkIn: "Oct 14, 2026", checkOut: "Oct 18, 2026", totalPaid: "$1,800.00", status: "Confirmed" },
  { id: "hb3", bookingRef: "BK-HTL-903", guestName: "Michael Chang", hotelName: "Grand Palace Hotel", roomCategory: "Penthouse", checkIn: "Oct 15, 2026", checkOut: "Oct 20, 2026", totalPaid: "$6,000.00", status: "Confirmed" },
  { id: "hb4", bookingRef: "BK-HTL-904", guestName: "Emma Watson", hotelName: "Marina Towers Hotel", roomCategory: "Standard Room", checkIn: "Oct 10, 2026", checkOut: "Oct 12, 2026", totalPaid: "$360.00", status: "Completed" },
];

export const HotelManagementScreen: React.FC<{ admin?: AdminUser | null }> = () => {
  const [hotelsList, setHotelsList] = useState<HotelItem[]>(INITIAL_HOTELS);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryItem[]>(INITIAL_ROOM_CATEGORIES);
  const [currentScreen, setCurrentScreen] = useState<HotelSubScreenType>("dashboard");
  const [screenStack, setScreenStack] = useState<HotelSubScreenType[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelItem>(INITIAL_HOTELS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Pending" | "Inactive" | "Suspended">("All");

  // Add Hotel Form State (Full Screen Stepper)
  const [addStep, setAddStep] = useState<1 | 2 | 3 | 4>(1);
  const [formHotelName, setFormHotelName] = useState("");
  const [formHotelCode, setFormHotelCode] = useState("");
  const [formCity, setFormCity] = useState("Dubai");
  const [formCountry, setFormCountry] = useState("UAE");
  const [formAddress, setFormAddress] = useState("");
  const [formTotalRooms, setFormTotalRooms] = useState("120");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formOwnerPhone, setFormOwnerPhone] = useState("");
  const [licenseUploaded, setLicenseUploaded] = useState(false);

  // Edit Hotel Form State
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRoomsCount, setEditRoomsCount] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerPhone, setEditOwnerPhone] = useState("");

  // Add Room Category State
  const [newRoomType, setNewRoomType] = useState("Deluxe Suite");
  const [newRoomCount, setNewRoomCount] = useState("25");
  const [newRoomRate, setNewRoomRate] = useState("$320/night");

  // Suspend Reason State
  const [suspendReason, setSuspendReason] = useState("");

  const navigateTo = (screen: HotelSubScreenType, hotel?: HotelItem) => {
    setScreenStack((prev) => [...prev, currentScreen]);
    if (hotel) {
      setSelectedHotel(hotel);
      setEditName(hotel.name);
      setEditLocation(hotel.location);
      setEditAddress(hotel.address);
      setEditRoomsCount(hotel.totalRooms.toString());
      setEditOwnerName(hotel.ownerName);
      setEditOwnerPhone(hotel.ownerPhone);
    }
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
      Alert.alert("Dialing Phone", `Calling ${phone}...`);
    });
  };

  const handleConfirmSuspend = () => {
    setHotelsList((prev) =>
      prev.map((h) => (h.id === selectedHotel.id ? { ...h, status: "Suspended" } : h))
    );
    setSelectedHotel((prev) => ({ ...prev, status: "Suspended" }));
    Alert.alert("Hotel Suspended", `${selectedHotel.name} has been placed under administrative suspension.`);
    goBack();
  };

  const handleAddHotelSubmit = () => {
    if (!formHotelName.trim()) {
      Alert.alert("Required Field", "Please enter the property name.");
      return;
    }
    const newH: HotelItem = {
      id: `h-${Date.now()}`,
      hotelCode: formHotelCode || `HTL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formHotelName.trim(),
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
      rating: 5.0,
      reviewsCount: 1,
      status: "Pending",
      verifiedPartner: false,
      location: `${formCity}, ${formCountry}`,
      city: formCity,
      country: formCountry,
      address: formAddress || `${formCity} Central Boulevard`,
      starRating: 5,
      totalRooms: parseInt(formTotalRooms) || 50,
      availableRooms: parseInt(formTotalRooms) || 50,
      occupiedRooms: 0,
      maintenanceRooms: 0,
      blockedRooms: 0,
      roomTypesCount: 4,
      amenitiesCount: 15,
      revenue: "$0",
      occupancyRate: "0%",
      bookingsCount: 0,
      cancellationRate: "0%",
      avgStay: "2.0 Days",
      contractStatus: "Pending",
      contractExpiry: "Under Review",
      licenseVerified: licenseUploaded,
      insuranceValid: true,
      taxRegistrationVerified: false,
      ownerName: formOwnerName || "Property Owner",
      ownerPhone: formOwnerPhone || "01863054816",
      managerName: "Assigned Manager",
      managerPhone: "01711963652",
    };

    setHotelsList((prev) => [newH, ...prev]);
    setFormHotelName("");
    setFormHotelCode("");
    setAddStep(1);
    Alert.alert("Success", `'${newH.name}' registered and sent for admin verification.`);
    goBack();
  };

  // --------------------------------------------------------------------------
  // SVG DONUT CHART COMPONENT FOR ROOM INVENTORY
  // --------------------------------------------------------------------------
  const RenderRoomDonutChart = () => {
    const radius = 42;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    const availableDash = (25 / 100) * circumference;
    const occupiedDash = (63 / 100) * circumference;
    const maintenanceDash = (5 / 100) * circumference;
    const blockedDash = (7 / 100) * circumference;

    return (
      <View style={styles.donutWrapper}>
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <G rotation="-90" origin="55, 55">
            <Circle cx="55" cy="55" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" />
            <Circle cx="55" cy="55" r={radius} stroke="#3b82f6" strokeWidth={strokeWidth} strokeDasharray={`${occupiedDash} ${circumference - occupiedDash}`} strokeDashoffset={0} fill="none" />
            <Circle cx="55" cy="55" r={radius} stroke="#10b981" strokeWidth={strokeWidth} strokeDasharray={`${availableDash} ${circumference - availableDash}`} strokeDashoffset={`-${occupiedDash}`} fill="none" />
            <Circle cx="55" cy="55" r={radius} stroke="#f97316" strokeWidth={strokeWidth} strokeDasharray={`${maintenanceDash} ${circumference - maintenanceDash}`} strokeDashoffset={`-${occupiedDash + availableDash}`} fill="none" />
            <Circle cx="55" cy="55" r={radius} stroke="#ef4444" strokeWidth={strokeWidth} strokeDasharray={`${blockedDash} ${circumference - blockedDash}`} strokeDashoffset={`-${occupiedDash + availableDash + maintenanceDash}`} fill="none" />
          </G>
        </Svg>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 1. HOTEL MANAGEMENT DASHBOARD
  // --------------------------------------------------------------------------
  const renderDashboard = () => {
    const filteredHotels = hotelsList.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || h.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main Header */}
        <View style={styles.topNavHeader}>
          <View style={styles.topNavLeft}>
            <View style={styles.emeraldLogoSquare}>
              <FontAwesome5 name="hotel" size={16} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.topNavTitle}>Hotel Management</Text>
              <Text style={styles.topNavSubtitle}>Partner Hotel Operations</Text>
            </View>
          </View>

          <View style={styles.topNavRight}>
            <TouchableOpacity style={styles.iconCircleBtn} onPress={() => navigateTo("filter_hotels")}>
              <Ionicons name="search-outline" size={18} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircleBtn} onPress={() => navigateTo("verification")}>
              <Ionicons name="notifications-outline" size={18} color="#334155" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarMiniText}>AD</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid (5 Columns) */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateTo("add_hotel")}>
            <View style={[styles.quickActionCircle, { backgroundColor: "#ecfdf5" }]}>
              <Ionicons name="add-circle-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.quickActionLabel}>Add Hotel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateTo("verification")}>
            <View style={[styles.quickActionCircle, { backgroundColor: "#eef2ff" }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color="#6366f1" />
            </View>
            <Text style={styles.quickActionLabel}>Verify Hotel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateTo("contracts")}>
            <View style={[styles.quickActionCircle, { backgroundColor: "#fff7ed" }]}>
              <FontAwesome5 name="file-contract" size={16} color="#d97706" />
            </View>
            <Text style={styles.quickActionLabel}>Contracts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateTo("rates")}>
            <View style={[styles.quickActionCircle, { backgroundColor: "#fce7f3" }]}>
              <Ionicons name="pie-chart-outline" size={20} color="#db2777" />
            </View>
            <Text style={styles.quickActionLabel}>Rates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => navigateTo("reports")}>
            <View style={[styles.quickActionCircle, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="stats-chart-outline" size={20} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCardEmerald}>
          <View style={{ zIndex: 10 }}>
            <Text style={styles.heroCardLabel}>Total Hotels</Text>
            <Text style={styles.heroCardValue}>2,486</Text>
            <View style={styles.heroTrendRow}>
              <Ionicons name="trending-up" size={14} color="#a7f3d0" />
              <Text style={styles.heroTrendText}> 24 This Month</Text>
            </View>
          </View>
          <View style={styles.heroGraphicWrapper}>
            <FontAwesome5 name="city" size={64} color="rgba(255,255,255,0.15)" />
          </View>
        </View>

        {/* Status Grid (4 Grid Cards) */}
        <View style={styles.statusGridRow}>
          <TouchableOpacity style={styles.statusGridCard} onPress={() => setStatusFilter("Active")}>
            <Text style={[styles.statusGridLabel, { color: "#059669" }]}>Active</Text>
            <Text style={styles.statusGridValue}>2,315</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statusGridCard} onPress={() => setStatusFilter("Pending")}>
            <Text style={[styles.statusGridLabel, { color: "#d97706" }]}>Pending</Text>
            <Text style={styles.statusGridValue}>58</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statusGridCard} onPress={() => setStatusFilter("Inactive")}>
            <Text style={[styles.statusGridLabel, { color: "#2563eb" }]}>Inactive</Text>
            <Text style={styles.statusGridValue}>83</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statusGridCard} onPress={() => setStatusFilter("Suspended")}>
            <Text style={[styles.statusGridLabel, { color: "#e11d48" }]}>Suspended</Text>
            <Text style={styles.statusGridValue}>30</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Section */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hotels by name, city or country..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => navigateTo("filter_hotels")}>
            <Ionicons name="funnel-outline" size={14} color="#334155" />
            <Text style={styles.filterBtnText}> Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Active Filter Tag */}
        {statusFilter !== "All" && (
          <View style={styles.activeFilterPill}>
            <Text style={styles.activeFilterPillText}>Status: {statusFilter}</Text>
            <TouchableOpacity onPress={() => setStatusFilter("All")}>
              <Ionicons name="close-circle" size={16} color="#047857" />
            </TouchableOpacity>
          </View>
        )}

        {/* Priority Actions */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Priority Actions</Text>
            <TouchableOpacity onPress={() => navigateTo("verification")}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priorityCardContainer}>
            <TouchableOpacity style={styles.priorityRowItem} onPress={() => navigateTo("verification")}>
              <View style={styles.priorityRowLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#fff7ed" }]}>
                  <FontAwesome5 name="shield-alt" size={14} color="#ea580c" />
                </View>
                <Text style={styles.priorityBoldNumber}>58 </Text>
                <Text style={styles.priorityLabelText}>Hotels Waiting Approval</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.lineDivider} />

            <TouchableOpacity style={styles.priorityRowItem} onPress={() => navigateTo("contracts")}>
              <View style={styles.priorityRowLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#ffe4e6" }]}>
                  <Ionicons name="time-outline" size={16} color="#e11d48" />
                </View>
                <Text style={styles.priorityBoldNumber}>24 </Text>
                <Text style={styles.priorityLabelText}>Contracts Expiring Soon</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.lineDivider} />

            <TouchableOpacity style={styles.priorityRowItem} onPress={() => navigateTo("rates")}>
              <View style={styles.priorityRowLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="sync-outline" size={16} color="#10b981" />
                </View>
                <Text style={styles.priorityBoldNumber}>17 </Text>
                <Text style={styles.priorityLabelText}>Rate Updates Pending</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <View style={styles.lineDivider} />

            <TouchableOpacity style={styles.priorityRowItem} onPress={() => navigateTo("quality_audits")}>
              <View style={styles.priorityRowLeft}>
                <View style={[styles.priorityIconCircle, { backgroundColor: "#eef2ff" }]}>
                  <Ionicons name="ribbon-outline" size={16} color="#6366f1" />
                </View>
                <Text style={styles.priorityBoldNumber}>8 </Text>
                <Text style={styles.priorityLabelText}>Quality Audits Due</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Performing Hotels */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performing Hotels</Text>
            <TouchableOpacity onPress={() => Alert.alert("Hotel Directory", `Listing all ${hotelsList.length} partner properties.`)}>
              <Text style={styles.linkText}>View All</Text>
            </TouchableOpacity>
          </View>

          {filteredHotels.map((hotel) => (
            <TouchableOpacity
              key={hotel.id}
              style={styles.hotelDirectoryCard}
              onPress={() => navigateTo("details", hotel)}
            >
              <View style={styles.hotelCardBody}>
                <Image source={{ uri: hotel.image }} style={styles.hotelThumbImage} />

                <View style={{ flex: 1 }}>
                  <View style={styles.hotelCardTitleRow}>
                    <Text style={styles.hotelCardName}>{hotel.name}</Text>
                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor:
                            hotel.status === "Active"
                              ? "#d1fae5"
                              : hotel.status === "Suspended"
                              ? "#fee2e2"
                              : "#ffedd5",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          {
                            color:
                              hotel.status === "Active"
                                ? "#047857"
                                : hotel.status === "Suspended"
                                ? "#ef4444"
                                : "#c2410c",
                          },
                        ]}
                      >
                        {hotel.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ratingInlineRow}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingBoldText}> {hotel.rating}</Text>
                    <Text style={styles.reviewCountText}> ({hotel.reviewsCount})</Text>
                  </View>

                  <Text style={styles.locationSubtext}>
                    <Ionicons name="location-outline" size={11} color="#64748b" /> {hotel.location}
                  </Text>

                  <View style={styles.hotelMetricsTripleRow}>
                    <View>
                      <Text style={styles.miniMetricLabel}>Occupancy</Text>
                      <Text style={styles.miniMetricValue}>{hotel.occupancyRate}</Text>
                    </View>
                    <View>
                      <Text style={styles.miniMetricLabel}>Revenue</Text>
                      <Text style={styles.miniMetricValue}>{hotel.revenue}</Text>
                    </View>
                    <View>
                      <Text style={styles.miniMetricLabel}>Bookings</Text>
                      <Text style={styles.miniMetricValue}>{hotel.bookingsCount}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  // --------------------------------------------------------------------------
  // 2. HOTEL DETAILS SCREEN
  // --------------------------------------------------------------------------
  const renderDetails = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Hotel Details</Text>
        <TouchableOpacity style={styles.moreBtnCircle} onPress={() => navigateTo("edit_hotel")}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Action Icons Strip (5 items) */}
      <View style={styles.actionStripContainer}>
        <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("edit_hotel")}>
          <View style={[styles.actionIconBox, { backgroundColor: "#ecfdf5" }]}>
            <Feather name="edit-3" size={18} color="#059669" />
          </View>
          <Text style={styles.actionStripLabel}>Edit Hotel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("rooms")}>
          <View style={[styles.actionIconBox, { backgroundColor: "#eff6ff" }]}>
            <FontAwesome5 name="building" size={16} color="#2563eb" />
          </View>
          <Text style={styles.actionStripLabel}>Rooms</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("rates")}>
          <View style={[styles.actionIconBox, { backgroundColor: "#fff7ed" }]}>
            <FontAwesome5 name="chart-bar" size={16} color="#ea580c" />
          </View>
          <Text style={styles.actionStripLabel}>Rates</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("hotel_bookings")}>
          <View style={[styles.actionIconBox, { backgroundColor: "#faf5ff" }]}>
            <Ionicons name="calendar-outline" size={18} color="#9333ea" />
          </View>
          <Text style={styles.actionStripLabel}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("suspend_hotel")}>
          <View style={[styles.actionIconBox, { backgroundColor: "#fee2e2" }]}>
            <Ionicons name="ban-outline" size={18} color="#ef4444" />
          </View>
          <Text style={styles.actionStripLabel}>Suspend</Text>
        </TouchableOpacity>
      </View>

      {/* Hotel Hero Card */}
      <View style={styles.hotelHeroCard}>
        <Image source={{ uri: selectedHotel.image }} style={styles.heroHotelImage} />

        <View style={styles.heroHotelInfoColumn}>
          <Text style={styles.heroHotelTitle}>{selectedHotel.name}</Text>
          <View style={styles.ratingInlineRow}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text style={styles.ratingBoldText}> {selectedHotel.rating}</Text>
            <Text style={styles.reviewCountText}> ({selectedHotel.reviewsCount} Reviews)</Text>
          </View>

          <View style={styles.verifiedPartnerTag}>
            <Text style={styles.verifiedPartnerText}>Verified Partner</Text>
          </View>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>
              <Ionicons name="location" size={11} color="#64748b" /> {selectedHotel.location}
            </Text>
            <Text style={styles.heroIdText}>ID: {selectedHotel.hotelCode}</Text>
          </View>
        </View>
      </View>

      {/* Key Performance Metrics (6 Cards Grid) */}
      <View style={styles.metrics6Grid}>
        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Revenue</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.revenue}</Text>
          <Text style={styles.metricCard6Trend}>
            <Ionicons name="arrow-up" size={10} color="#059669" /> 18%
          </Text>
        </View>

        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Occupancy</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.occupancyRate}</Text>
          <Text style={styles.metricCard6Trend}>
            <Ionicons name="arrow-up" size={10} color="#059669" /> 6%
          </Text>
        </View>

        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Bookings</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.bookingsCount}</Text>
          <Text style={styles.metricCard6Trend}>
            <Ionicons name="arrow-up" size={10} color="#059669" /> 12%
          </Text>
        </View>

        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Avg. Rating</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.rating}</Text>
        </View>

        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Cancel Rate</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.cancellationRate}</Text>
        </View>

        <View style={styles.metricCard6}>
          <Text style={styles.metricCard6Label}>Avg. Stay</Text>
          <Text style={styles.metricCard6Value}>{selectedHotel.avgStay}</Text>
        </View>
      </View>

      {/* Hotel Information Section */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hotel Information</Text>
          <TouchableOpacity onPress={() => navigateTo("rooms")}>
            <Text style={styles.linkText}>View Rooms</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoTableCard}>
          <View style={styles.infoTableRow}>
            <Text style={styles.infoTableLabel}>Hotel Code</Text>
            <Text style={styles.infoTableValue}>{selectedHotel.hotelCode}</Text>
          </View>
          <View style={styles.infoTableRow}>
            <Text style={styles.infoTableLabel}>Total Rooms</Text>
            <Text style={styles.infoTableValue}>{selectedHotel.totalRooms}</Text>
          </View>
          <View style={styles.infoTableRow}>
            <Text style={styles.infoTableLabel}>Room Types</Text>
            <Text style={styles.infoTableValue}>{selectedHotel.roomTypesCount}</Text>
          </View>
          <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoTableLabel}>Amenities</Text>
            <Text style={styles.infoTableValue}>{selectedHotel.amenitiesCount}</Text>
          </View>
        </View>
      </View>

      {/* Business Status Section */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Business Status</Text>

        <View style={styles.businessStatusCard}>
          <View style={styles.bizStatusRow}>
            <Text style={styles.bizStatusLabel}>Contract</Text>
            <View style={styles.bizBadgeInline}>
              <Text style={[styles.bizBadgeText, { color: "#059669" }]}>Active</Text>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={styles.bizStatusRow}>
            <Text style={styles.bizStatusLabel}>License</Text>
            <View style={styles.bizBadgeInline}>
              <Text style={[styles.bizBadgeText, { color: "#059669" }]}>Verified</Text>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={styles.bizStatusRow}>
            <Text style={styles.bizStatusLabel}>Insurance</Text>
            <View style={styles.bizBadgeInline}>
              <Text style={[styles.bizBadgeText, { color: "#059669" }]}>Valid</Text>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={[styles.bizStatusRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.bizStatusLabel}>Tax Registration</Text>
            <View style={styles.bizBadgeInline}>
              <Text style={[styles.bizBadgeText, { color: "#059669" }]}>Verified</Text>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>
      </View>

      {/* Contacts List */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Key Contacts</Text>
        <View style={styles.infoTableCard}>
          <View style={styles.contactItemRow}>
            <View>
              <Text style={styles.contactRoleTitle}>Property Owner</Text>
              <Text style={styles.contactDetailText}>{selectedHotel.ownerName} ({selectedHotel.ownerPhone})</Text>
            </View>
            <TouchableOpacity style={styles.callCircleBtn} onPress={() => handleCall(selectedHotel.ownerPhone)}>
              <Ionicons name="call-outline" size={14} color="#047857" />
            </TouchableOpacity>
          </View>

          <View style={[styles.contactItemRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.contactRoleTitle}>General Manager</Text>
              <Text style={styles.contactDetailText}>{selectedHotel.managerName} ({selectedHotel.managerPhone})</Text>
            </View>
            <TouchableOpacity style={styles.callCircleBtn} onPress={() => handleCall(selectedHotel.managerPhone)}>
              <Ionicons name="call-outline" size={14} color="#047857" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // --------------------------------------------------------------------------
  // 3. ROOM INVENTORY SCREEN (WITH DONUT CHART)
  // --------------------------------------------------------------------------
  const renderRoomInventory = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Room Inventory</Text>
        <TouchableOpacity style={styles.moreBtnCircle} onPress={() => navigateTo("add_room")}>
          <Ionicons name="add" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Quick Action Icons Strip (5 items) */}
        <View style={styles.actionStripContainer}>
          <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("add_room")}>
            <View style={[styles.actionIconBox, { backgroundColor: "#ecfdf5" }]}>
              <Ionicons name="add-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.actionStripLabel}>Add Room</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("bulk_rate")}>
            <View style={[styles.actionIconBox, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="sync-outline" size={18} color="#2563eb" />
            </View>
            <Text style={styles.actionStripLabel}>Bulk Update</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("quality_audits")}>
            <View style={[styles.actionIconBox, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="construct-outline" size={18} color="#ea580c" />
            </View>
            <Text style={styles.actionStripLabel}>Maintenance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("rooms")}>
            <View style={[styles.actionIconBox, { backgroundColor: "#f1f5f9" }]}>
              <Ionicons name="clipboard-outline" size={18} color="#475569" />
            </View>
            <Text style={styles.actionStripLabel}>Room Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionStripBtn} onPress={() => navigateTo("rates")}>
            <View style={[styles.actionIconBox, { backgroundColor: "#f1f5f9" }]}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
            </View>
            <Text style={styles.actionStripLabel}>More</Text>
          </TouchableOpacity>
        </View>

        {/* Total Rooms Card with Donut Chart */}
        <View style={styles.inventoryOverviewCard}>
          <View style={styles.inventoryOverviewLeft}>
            <Text style={styles.inventoryLabel}>Total Rooms</Text>
            <Text style={styles.inventoryValue}>{selectedHotel.totalRooms}</Text>
            <View style={styles.availableBadgeRow}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.availableBadgeText}> {selectedHotel.availableRooms} Available</Text>
            </View>
          </View>

          <View style={styles.inventoryOverviewRight}>
            <RenderRoomDonutChart />
            <View style={styles.legendColumn}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                <Text style={styles.legendLabel}>Available</Text>
                <Text style={styles.legendVal}>86 (25%)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#3b82f6" }]} />
                <Text style={styles.legendLabel}>Occupied</Text>
                <Text style={styles.legendVal}>214 (63%)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#f97316" }]} />
                <Text style={styles.legendLabel}>Maintenance</Text>
                <Text style={styles.legendVal}>18 (5%)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                <Text style={styles.legendLabel}>Blocked</Text>
                <Text style={styles.legendVal}>22 (7%)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Room Categories Section */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Room Categories</Text>
            <TouchableOpacity onPress={() => navigateTo("add_room")}>
              <Text style={styles.linkText}>+ Add Category</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.roomCategoriesList}>
            {roomCategories.map((cat) => (
              <View key={cat.id} style={styles.roomCategoryRow}>
                <View style={[styles.roomCategoryIconBox, { backgroundColor: cat.bgColor }]}>
                  <Ionicons name={cat.iconName as any} size={18} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.categoryTitleRow}>
                    <Text style={styles.categoryNameText}>{cat.name}</Text>
                    <Text style={styles.categoryPercentText}>{cat.percentage}%</Text>
                  </View>
                  <Text style={styles.categoryRoomsSubtext}>{cat.count} Rooms • {cat.rate}</Text>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Room Status Summary Grid */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Room Status Summary</Text>
          <View style={styles.roomStatusGrid}>
            <View style={[styles.roomStatusBox, { backgroundColor: "#ecfdf5" }]}>
              <Text style={[styles.roomStatusLabel, { color: "#047857" }]}>Available</Text>
              <Text style={[styles.roomStatusVal, { color: "#065f46" }]}>{selectedHotel.availableRooms}</Text>
            </View>

            <View style={[styles.roomStatusBox, { backgroundColor: "#eff6ff" }]}>
              <Text style={[styles.roomStatusLabel, { color: "#1d4ed8" }]}>Occupied</Text>
              <Text style={[styles.roomStatusVal, { color: "#1e40af" }]}>{selectedHotel.occupiedRooms}</Text>
            </View>

            <View style={[styles.roomStatusBox, { backgroundColor: "#fff7ed" }]}>
              <Text style={[styles.roomStatusLabel, { color: "#c2410c" }]}>Maintenance</Text>
              <Text style={[styles.roomStatusVal, { color: "#9a3412" }]}>{selectedHotel.maintenanceRooms}</Text>
            </View>

            <View style={[styles.roomStatusBox, { backgroundColor: "#fef2f2" }]}>
              <Text style={[styles.roomStatusLabel, { color: "#b91c1c" }]}>Blocked</Text>
              <Text style={[styles.roomStatusVal, { color: "#991b1b" }]}>{selectedHotel.blockedRooms}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 4. ADD HOTEL DEDICATED FULL SCREEN (MULTI-STEP WIZARD)
  // --------------------------------------------------------------------------
  const renderAddHotelScreen = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Add Hotel Partner</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Stepper Header */}
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4].map((stepNum) => (
            <TouchableOpacity
              key={stepNum}
              style={[styles.stepBubble, addStep >= stepNum && styles.stepBubbleActive]}
              onPress={() => setAddStep(stepNum as any)}
            >
              <Text style={[styles.stepBubbleText, addStep >= stepNum && styles.stepBubbleTextActive]}>
                {stepNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {addStep === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.formStepTitle}>Step 1: Property Basic Details</Text>
            
            <Text style={styles.inputLabel}>Hotel / Property Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Grand Resort & Spa"
              placeholderTextColor="#94a3b8"
              value={formHotelName}
              onChangeText={setFormHotelName}
            />

            <Text style={styles.inputLabel}>Property Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. GPH-2045"
              placeholderTextColor="#94a3b8"
              value={formHotelCode}
              onChangeText={setFormHotelCode}
            />

            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dubai"
              placeholderTextColor="#94a3b8"
              value={formCity}
              onChangeText={setFormCity}
            />

            <Text style={styles.inputLabel}>Country</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. UAE"
              placeholderTextColor="#94a3b8"
              value={formCountry}
              onChangeText={setFormCountry}
            />
          </View>
        )}

        {addStep === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.formStepTitle}>Step 2: Capacity & Location</Text>

            <Text style={styles.inputLabel}>Full Street Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Sheikh Zayed Road, Downtown"
              placeholderTextColor="#94a3b8"
              value={formAddress}
              onChangeText={setFormAddress}
            />

            <Text style={styles.inputLabel}>Total Room Capacity</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 150"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={formTotalRooms}
              onChangeText={setFormTotalRooms}
            />
          </View>
        )}

        {addStep === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.formStepTitle}>Step 3: Ownership & Contacts</Text>

            <Text style={styles.inputLabel}>Property Owner / Legal Representative</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Sheikh Rashid"
              placeholderTextColor="#94a3b8"
              value={formOwnerName}
              onChangeText={setFormOwnerName}
            />

            <Text style={styles.inputLabel}>Primary Contact Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 01863054816"
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
              value={formOwnerPhone}
              onChangeText={setFormOwnerPhone}
            />

            <TouchableOpacity
              style={[styles.uploadBox, licenseUploaded && { borderColor: "#10b981", backgroundColor: "#ecfdf5" }]}
              onPress={() => {
                setLicenseUploaded(!licenseUploaded);
                Alert.alert("Compliance Upload", licenseUploaded ? "File removed." : "Trade license document attached.");
              }}
            >
              <FontAwesome5 name="file-contract" size={24} color={licenseUploaded ? "#10b981" : "#047857"} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a", marginTop: 6 }}>
                {licenseUploaded ? "Trade_License_Verified.pdf (Uploaded)" : "Upload Trade License / Tax Registration PDF"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {addStep === 4 && (
          <View style={styles.formCard}>
            <Text style={styles.formStepTitle}>Step 4: Review Registration</Text>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Hotel Name</Text>
              <Text style={styles.infoTableValue}>{formHotelName || "Grand Resort"}</Text>
            </View>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Location</Text>
              <Text style={styles.infoTableValue}>{formCity}, {formCountry}</Text>
            </View>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Total Capacity</Text>
              <Text style={styles.infoTableValue}>{formTotalRooms} Rooms</Text>
            </View>
            <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoTableLabel}>Owner Contact</Text>
              <Text style={styles.infoTableValue}>{formOwnerName || "Owner"} ({formOwnerPhone || "01863054816"})</Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          {addStep > 1 && (
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
              onPress={() => setAddStep((prev) => (prev - 1) as any)}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>Previous</Text>
            </TouchableOpacity>
          )}

          {addStep < 4 ? (
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#047857", paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
              onPress={() => setAddStep((prev) => (prev + 1) as any)}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#ffffff" }}>Next Step</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#047857", paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
              onPress={handleAddHotelSubmit}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>Submit Hotel Registration</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 5. EDIT HOTEL DEDICATED FULL SCREEN
  // --------------------------------------------------------------------------
  const renderEditHotelScreen = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Edit Hotel Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Property Name</Text>
          <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} />

          <Text style={styles.inputLabel}>Location / City</Text>
          <TextInput style={styles.modalInput} value={editLocation} onChangeText={setEditLocation} />

          <Text style={styles.inputLabel}>Full Street Address</Text>
          <TextInput style={styles.modalInput} value={editAddress} onChangeText={setEditAddress} />

          <Text style={styles.inputLabel}>Total Rooms</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={editRoomsCount} onChangeText={setEditRoomsCount} />

          <Text style={styles.inputLabel}>Owner Name</Text>
          <TextInput style={styles.modalInput} value={editOwnerName} onChangeText={setEditOwnerName} />

          <Text style={styles.inputLabel}>Owner Phone</Text>
          <TextInput style={styles.modalInput} keyboardType="phone-pad" value={editOwnerPhone} onChangeText={setEditOwnerPhone} />

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={() => {
              setSelectedHotel((prev) => ({
                ...prev,
                name: editName,
                location: editLocation,
                address: editAddress,
                totalRooms: parseInt(editRoomsCount) || prev.totalRooms,
                ownerName: editOwnerName,
                ownerPhone: editOwnerPhone,
              }));
              Alert.alert("Updated", "Hotel Profile updated successfully.");
              goBack();
            }}
          >
            <Text style={styles.modalSubmitBtnText}>Save Profile Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 6. ADD ROOM CATEGORY DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderAddRoomScreen = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Add Room Category</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Room Category Title</Text>
          <TextInput style={styles.modalInput} value={newRoomType} onChangeText={setNewRoomType} placeholder="e.g. Royal Ocean Suite" />

          <Text style={styles.inputLabel}>Total Units in Property</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={newRoomCount} onChangeText={setNewRoomCount} />

          <Text style={styles.inputLabel}>Base Nightly Rate ($)</Text>
          <TextInput style={styles.modalInput} value={newRoomRate} onChangeText={setNewRoomRate} />

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={() => {
              const newCat: RoomCategoryItem = {
                id: `rc-${Date.now()}`,
                name: newRoomType,
                count: parseInt(newRoomCount) || 10,
                percentage: 15,
                rate: newRoomRate,
                color: "#8b5cf6",
                bgColor: "#f5f3ff",
                iconName: "star",
              };
              setRoomCategories((prev) => [...prev, newCat]);
              Alert.alert("Category Created", `'${newRoomType}' added with ${newRoomCount} rooms.`);
              goBack();
            }}
          >
            <Text style={styles.modalSubmitBtnText}>Create Category</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 7. BULK RATE ADJUSTER DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderBulkRateScreen = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Bulk Rate & Surge Adjuster</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 12 }}>
            Adjust Pricing Yield for {selectedHotel.name}
          </Text>

          <TouchableOpacity
            style={styles.bulkOptionBtn}
            onPress={() => {
              Alert.alert("Surge Applied", "+15% Peak Season Surge applied across all categories.");
              goBack();
            }}
          >
            <Text style={styles.bulkOptionTitle}>+15% Peak Season Surge</Text>
            <Text style={styles.bulkOptionSub}>Applies to all upcoming weekend bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOptionBtn}
            onPress={() => {
              Alert.alert("Surge Applied", "+25% Holiday Festival Surge applied.");
              goBack();
            }}
          >
            <Text style={styles.bulkOptionTitle}>+25% Holiday & Festival Surge</Text>
            <Text style={styles.bulkOptionSub}>Applies to Christmas & New Year periods</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bulkOptionBtn}
            onPress={() => {
              Alert.alert("Discount Applied", "-10% Off-Season Promotional Discount applied.");
              goBack();
            }}
          >
            <Text style={styles.bulkOptionTitle}>-10% Off-Season Promotion</Text>
            <Text style={styles.bulkOptionSub}>Boosts low-season occupancy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 8. SUSPEND HOTEL DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderSuspendHotelScreen = () => (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={[styles.screenSubHeaderTitle, { color: "#ef4444" }]}>Suspend Hotel Partner</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 6 }}>
            Confirm Administrative Suspension
          </Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
            Suspending <Text style={{ fontWeight: "700", color: "#0f172a" }}>{selectedHotel.name}</Text> will disable active reservations and unlist inventory from search results.
          </Text>

          <Text style={styles.inputLabel}>Reason for Suspension</Text>
          <TextInput
            style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
            placeholder="Specify regulatory violation, guest complaints, or compliance issue..."
            multiline
            value={suspendReason}
            onChangeText={setSuspendReason}
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
              onPress={goBack}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#ef4444", paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
              onPress={handleConfirmSuspend}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>Confirm Suspension</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 9. VERIFICATION CENTER DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderVerification = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Hotel Verification Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusGridRow}>
          <View style={[styles.statusGridCard, { backgroundColor: "#fff7ed" }]}>
            <Text style={[styles.statusGridLabel, { color: "#c2410c" }]}>Pending Review</Text>
            <Text style={styles.statusGridValue}>58</Text>
          </View>

          <View style={[styles.statusGridCard, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.statusGridLabel, { color: "#047857" }]}>Verified Partners</Text>
            <Text style={styles.statusGridValue}>2,315</Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Properties Awaiting Approval (58)</Text>

          {[
            { name: "Marina Towers Hotel", code: "MTH-1088", location: "Singapore", docs: "Trade License, Tax Registration" },
            { name: "Azure Skyline Resort", code: "ASR-9021", location: "Bali, Indonesia", docs: "Property Lease, Insurance" },
            { name: "Emerald Oasis Suites", code: "EOS-4410", location: "Dubai, UAE", docs: "Fire Safety Audit, Commercial License" },
          ].map((item, idx) => (
            <View key={idx} style={styles.hotelDirectoryCard}>
              <View style={styles.hotelCardTitleRow}>
                <Text style={styles.hotelCardName}>{item.name}</Text>
                <View style={[styles.statusTag, { backgroundColor: "#ffedd5" }]}>
                  <Text style={[styles.statusTagText, { color: "#c2410c" }]}>Pending Review</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Code: {item.code} • Location: {item.location}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#047857", marginTop: 4 }}>
                Required Documents: {item.docs}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f8fafc" }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#047857", paddingVertical: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => Alert.alert("Approved", `${item.name} is now a Verified Partner.`)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#ffffff" }}>Approve Partner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => Alert.alert("Request Info", `Requested missing documents from ${item.name}.`)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>Request Audit</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 10. CONTRACTS MANAGEMENT DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderContracts = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Hotel Contracts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusGridRow}>
          <View style={[styles.statusGridCard, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.statusGridLabel, { color: "#047857" }]}>Active</Text>
            <Text style={styles.statusGridValue}>1,189</Text>
          </View>

          <View style={[styles.statusGridCard, { backgroundColor: "#fff7ed" }]}>
            <Text style={[styles.statusGridLabel, { color: "#c2410c" }]}>Expiring Soon</Text>
            <Text style={styles.statusGridValue}>7</Text>
          </View>

          <View style={[styles.statusGridCard, { backgroundColor: "#fef2f2" }]}>
            <Text style={[styles.statusGridLabel, { color: "#b91c1c" }]}>Expired</Text>
            <Text style={styles.statusGridValue}>2</Text>
          </View>

          <View style={[styles.statusGridCard, { backgroundColor: "#eff6ff" }]}>
            <Text style={[styles.statusGridLabel, { color: "#1d4ed8" }]}>Pending</Text>
            <Text style={styles.statusGridValue}>12</Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Partner Agreements & Contracts</Text>

          {CONTRACTS_DATA.map((c) => (
            <View key={c.id} style={styles.hotelDirectoryCard}>
              <View style={styles.hotelCardTitleRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FontAwesome5 name="file-contract" size={16} color="#047857" style={{ marginRight: 8 }} />
                  <Text style={styles.hotelCardName}>{c.contractNo}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: c.status === "Active" ? "#d1fae5" : "#ffedd5" }]}>
                  <Text style={[styles.statusTagText, { color: c.status === "Active" ? "#047857" : "#c2410c" }]}>
                    {c.status}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a", marginTop: 4 }}>{c.hotelName}</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Term: {c.startDate} — {c.expiryDate}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#047857", marginTop: 2 }}>Commission Tier: {c.commissionRate}</Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f8fafc" }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#047857", paddingVertical: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => Alert.alert("Download Contract", `Downloading PDF for ${c.contractNo}`)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#ffffff" }}>Download Agreement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 8, borderRadius: 8, alignItems: "center" }}
                  onPress={() => Alert.alert("Renew Contract", `Initiated renewal flow for ${c.hotelName}`)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>Renew Contract</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 11. RATES MANAGEMENT SCREEN
  // --------------------------------------------------------------------------
  const renderRates = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Rates & Revenue Yield</Text>
        <TouchableOpacity style={styles.moreBtnCircle} onPress={() => navigateTo("bulk_rate")}>
          <Ionicons name="options" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hotelDirectoryCard}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f172a" }}>
            Dynamic Pricing Matrix ({selectedHotel.name})
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Automated Yield Management & Seasonal Surge Protection
          </Text>

          <View style={{ marginTop: 14, gap: 10 }}>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Standard Room Base Rate</Text>
              <Text style={styles.infoTableValue}>$180 / night</Text>
            </View>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Deluxe Room Base Rate</Text>
              <Text style={styles.infoTableValue}>$280 / night</Text>
            </View>
            <View style={styles.infoTableRow}>
              <Text style={styles.infoTableLabel}>Executive Suite Base Rate</Text>
              <Text style={styles.infoTableValue}>$450 / night</Text>
            </View>
            <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoTableLabel}>Penthouse Package Rate</Text>
              <Text style={styles.infoTableValue}>$1,200 / night</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.bottomFixedBtn, { marginHorizontal: 0, marginTop: 16 }]}
          onPress={() => navigateTo("bulk_rate")}
        >
          <Text style={styles.bottomFixedBtnText}>Update Seasonal Surge Rates</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 12. QUALITY AUDITS DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderQualityAudits = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Quality Audits Due (8)</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {[
          { name: "Grand Palace Hotel", code: "GPH-2045", audit: "Annual Fire Safety & Hygiene Audit", status: "Overdue" },
          { name: "Royal Beach Resort", code: "RBH-4012", audit: "Pool & Spa Water Safety Certificate", status: "Due Today" },
          { name: "Marina Towers Hotel", code: "MTH-1088", audit: "HVAC & Electrical Inspection", status: "Pending Audit" },
        ].map((audit, idx) => (
          <View key={idx} style={styles.hotelDirectoryCard}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}>{audit.name}</Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{audit.audit}</Text>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: "#6366f1", marginTop: 12 }]}
              onPress={() => Alert.alert("Audit Inspection", `Marked ${audit.audit} as completed for ${audit.name}.`)}
            >
              <Text style={styles.modalSubmitBtnText}>Complete Inspection</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 13. HOTEL BOOKINGS DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderHotelBookings = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Hotel Reservations</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {SAMPLE_HOTEL_BOOKINGS.map((b) => (
          <View key={b.id} style={styles.hotelDirectoryCard}>
            <View style={styles.hotelCardTitleRow}>
              <Text style={styles.hotelCardName}>{b.bookingRef}</Text>
              <View style={[styles.statusTag, { backgroundColor: b.status === "Checked-In" ? "#d1fae5" : "#eff6ff" }]}>
                <Text style={[styles.statusTagText, { color: b.status === "Checked-In" ? "#047857" : "#1d4ed8" }]}>
                  {b.status}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155", marginTop: 4 }}>
              Guest: {b.guestName}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Property: {b.hotelName} ({b.roomCategory})
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Stay: {b.checkIn} — {b.checkOut}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 6 }}>
              Total Paid: {b.totalPaid}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 14. OPERATIONAL REPORTS DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderReports = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Operational Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hotelDirectoryCard}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>RevPAR & Performance Summary</Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Average Daily Rate (ADR): $248.50</Text>
          <Text style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Revenue Per Available Room: $228.60</Text>
          <Text style={{ fontSize: 13, color: "#047857", fontWeight: "600", marginTop: 2 }}>Net Revenue Generated: $1,420,800.00</Text>

          <TouchableOpacity
            style={[styles.modalSubmitBtn, { marginTop: 14 }]}
            onPress={() => Alert.alert("Export PDF", "Generating detailed PDF executive report...")}
          >
            <Text style={styles.modalSubmitBtnText}>Export Executive PDF Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 15. FILTER DIRECTORY DEDICATED SCREEN
  // --------------------------------------------------------------------------
  const renderFilterHotels = () => (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.screenSubHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtnCircle}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.screenSubHeaderTitle}>Filter Directory</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Filter by Status</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {(["All", "Active", "Pending", "Inactive", "Suspended"] as const).map((st) => (
              <TouchableOpacity
                key={st}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: statusFilter === st ? "#047857" : "#f1f5f9",
                }}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: statusFilter === st ? "#ffffff" : "#334155" }}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.modalSubmitBtn}
            onPress={() => {
              Alert.alert("Filter Applied", `Showing properties for status: ${statusFilter}`);
              goBack();
            }}
          >
            <Text style={styles.modalSubmitBtnText}>Apply Filter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {currentScreen === "dashboard" && renderDashboard()}
      {currentScreen === "details" && renderDetails()}
      {currentScreen === "rooms" && renderRoomInventory()}
      {currentScreen === "add_hotel" && renderAddHotelScreen()}
      {currentScreen === "edit_hotel" && renderEditHotelScreen()}
      {currentScreen === "add_room" && renderAddRoomScreen()}
      {currentScreen === "bulk_rate" && renderBulkRateScreen()}
      {currentScreen === "suspend_hotel" && renderSuspendHotelScreen()}
      {currentScreen === "verification" && renderVerification()}
      {currentScreen === "contracts" && renderContracts()}
      {currentScreen === "rates" && renderRates()}
      {currentScreen === "quality_audits" && renderQualityAudits()}
      {currentScreen === "hotel_bookings" && renderHotelBookings()}
      {currentScreen === "reports" && renderReports()}
      {currentScreen === "filter_hotels" && renderFilterHotels()}
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
  topNavHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  emeraldLogoSquare: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  topNavSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  topNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  quickActionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  quickActionItem: {
    alignItems: "center",
    width: (width - 64) / 5,
  },
  quickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  heroCardEmerald: {
    backgroundColor: "#064e3b",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroCardLabel: {
    fontSize: 12,
    color: "#a7f3d0",
    fontWeight: "500",
  },
  heroCardValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 2,
  },
  heroTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  heroTrendText: {
    fontSize: 12,
    color: "#a7f3d0",
    fontWeight: "600",
  },
  heroGraphicWrapper: {
    position: "absolute",
    right: -10,
    bottom: -10,
  },
  statusGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusGridCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  statusGridLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusGridValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  searchRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
  },
  filterBtnText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  activeFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  linkText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  priorityCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  priorityRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  priorityRowLeft: {
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
  priorityBoldNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  priorityLabelText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  lineDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  hotelDirectoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  hotelCardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hotelThumbImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  hotelCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hotelCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 6,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  ratingInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ratingBoldText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  reviewCountText: {
    fontSize: 11,
    color: "#64748b",
  },
  locationSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  hotelMetricsTripleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  miniMetricLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  screenSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  screenSubHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  backBtnCircle: {
    padding: 4,
  },
  moreBtnCircle: {
    padding: 4,
  },
  actionStripContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionStripBtn: {
    alignItems: "center",
    width: (width - 64) / 5,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  actionStripLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  hotelHeroCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  heroHotelImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: "#e2e8f0",
  },
  heroHotelInfoColumn: {
    flex: 1,
    justifyContent: "center",
  },
  heroHotelTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  verifiedPartnerTag: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginVertical: 4,
  },
  verifiedPartnerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
    textTransform: "uppercase",
  },
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  heroMetaText: {
    fontSize: 11,
    color: "#64748b",
  },
  heroIdText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  metrics6Grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard6: {
    width: (width - 44) / 3,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricCard6Label: {
    fontSize: 11,
    color: "#64748b",
  },
  metricCard6Value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  metricCard6Trend: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
    marginTop: 2,
  },
  infoTableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoTableLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  infoTableValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  businessStatusCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bizStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  bizStatusLabel: {
    fontSize: 13,
    color: "#475569",
  },
  bizBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
  },
  bizBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  contactItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  contactRoleTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  contactDetailText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  callCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  inventoryOverviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inventoryOverviewLeft: {
    flex: 1,
  },
  inventoryLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  inventoryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  availableBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  availableBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
  },
  inventoryOverviewRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  donutWrapper: {
    width: 110,
    height: 110,
    marginRight: 10,
  },
  legendColumn: {
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 10,
    color: "#64748b",
    width: 65,
  },
  legendVal: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
  },
  roomCategoriesList: {
    gap: 12,
  },
  roomCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roomCategoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  categoryPercentText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  categoryRoomsSubtext: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  roomStatusGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomStatusBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 3,
    alignItems: "center",
  },
  roomStatusLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  roomStatusVal: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBubbleActive: {
    backgroundColor: "#047857",
  },
  stepBubbleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  stepBubbleTextActive: {
    color: "#ffffff",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formStepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    marginTop: 8,
  },
  modalSubmitBtn: {
    backgroundColor: "#047857",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  bulkOptionBtn: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  bulkOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  bulkOptionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  bottomFixedBtnContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bottomFixedBtn: {
    backgroundColor: "#047857",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  bottomFixedBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default HotelManagementScreen;
