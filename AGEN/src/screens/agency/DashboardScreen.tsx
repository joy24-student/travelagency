/**
 * Agency Dashboard Screen - White Label SaaS Command Center
 * Matches the unified White-Label Travel Portal standard with
 * Real-time Supabase sync, PNR search, Service categories,
 * Revenue reports & breakdown, and Quick actions.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  StatusBar,
  Image,
  TextInput,
  Modal,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "../ui/UIComponents";
import {
  MaterialCommunityIcons,
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../../hooks/useAuth";
import { agencyDashboardService } from "../../services/agencyService";
import { supabase } from "../../services/supabaseClient";
import { useAgencyRBAC } from "../../context/AgencyRBACContext";
import { useNavigation } from "@react-navigation/native";

// High-fidelity UI Constants
const HEADER_MAX_HEIGHT = 80;
const HEADER_MIN_HEIGHT = 60;

const UI_COLORS = {
  bg: "#0B1326",
  card: "rgba(255, 255, 255, 0.05)",
  cardBorder: "rgba(255, 255, 255, 0.1)",
  border: "rgba(255, 255, 255, 0.1)",
  trendUp: "#10b981",
  trendDown: "#ef4444",
  textSecondary: "#94a3b8",
  brand: "#3b82f6",
  accentGreen: "#10b981",
  accentPurple: "#8b5cf6",
  accentOrange: "#f59e0b",
  accentCyan: "#06b6d4",
};

export type ServiceType = "all" | "flight" | "hotel" | "bus" | "holiday" | "visa";
export type BookingStatus = "all" | "confirmed" | "completed" | "pending" | "cancelled";

export interface BookingItem {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  service: "flight" | "hotel" | "bus" | "holiday" | "visa";
  serviceTitle: string;
  routeOrDetails: string;
  pnr: string;
  travelDate: string;
  amount: number;
  status: "confirmed" | "completed" | "pending" | "cancelled";
  guests?: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalBookings: number;
  pendingBookings: number;
  totalCustomers: number;
  revenueGrowth: number;
  bookingGrowth: number;
  pendingGrowth: number;
  customerGrowth: number;
}

const DEFAULT_BOOKINGS: BookingItem[] = [
  {
    id: "b-1",
    orderId: "ORD123456",
    customerName: "Amit Kumar",
    customerEmail: "amit@gmail.com",
    service: "flight",
    serviceTitle: "Flight",
    routeOrDetails: "Delhi - Mumbai",
    pnr: "6E1X7A",
    travelDate: "20 May 2024",
    amount: 7650,
    status: "confirmed",
    guests: "1 Adult",
  },
  {
    id: "b-2",
    orderId: "ORD123457",
    customerName: "Neha Sharma",
    customerEmail: "neha@gmail.com",
    service: "hotel",
    serviceTitle: "Hotel",
    routeOrDetails: "Goa, India",
    pnr: "HTL8765",
    travelDate: "21 May 2024",
    amount: 6200,
    status: "confirmed",
    guests: "2 Adults",
  },
  {
    id: "b-3",
    orderId: "ORD123458",
    customerName: "Ravi Singh",
    customerEmail: "ravi@gmail.com",
    service: "bus",
    serviceTitle: "Bus",
    routeOrDetails: "Delhi - Jaipur",
    pnr: "BUS3344",
    travelDate: "22 May 2024",
    amount: 950,
    status: "completed",
    guests: "1 Passenger",
  },
  {
    id: "b-4",
    orderId: "ORD123459",
    customerName: "Pooja Mehta",
    customerEmail: "pooja@gmail.com",
    service: "holiday",
    serviceTitle: "Holiday",
    routeOrDetails: "Thailand Tour",
    pnr: "HOL4455",
    travelDate: "25 May 2024",
    amount: 45500,
    status: "confirmed",
    guests: "2 Adults, 1 Child",
  },
  {
    id: "b-5",
    orderId: "ORD123460",
    customerName: "Vikram Das",
    customerEmail: "vikram@gmail.com",
    service: "visa",
    serviceTitle: "Visa",
    routeOrDetails: "UAE Visit Visa",
    pnr: "VSA5566",
    travelDate: "27 May 2024",
    amount: 4800,
    status: "pending",
    guests: "1 Applicant",
  },
];

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { roleMeta } = useAgencyRBAC();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 5265250,
    totalBookings: 1482,
    pendingBookings: 156,
    totalCustomers: 2635,
    revenueGrowth: 22.8,
    bookingGrowth: 18.5,
    pendingGrowth: -5.4,
    customerGrowth: 16.3,
  });

  const [bookings, setBookings] = useState<BookingItem[]>(DEFAULT_BOOKINGS);
  const [selectedService, setSelectedService] = useState<ServiceType>("all");
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeModalBooking, setActiveModalBooking] = useState<BookingItem | null>(null);
  const [dateRange] = useState("01 May 2024 - 31 May 2024");

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const overviewAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const bookingsAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(overviewAnim, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(actionsAnim, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bookingsAnim, {
          toValue: 1,
          duration: 500,
          delay: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, overviewAnim, actionsAnim, bookingsAnim]);

  useEffect(() => {
    loadDashboard();
  }, [user?.agency?.id]);

  const loadDashboard = async () => {
    try {
      let targetAgencyId = user?.agency?.id;
      if (!targetAgencyId) {
        const { data: defaultAgency } = await supabase
          .from("agencies")
          .select("id")
          .limit(1)
          .single();
        targetAgencyId = defaultAgency?.id;
      }

      if (!targetAgencyId) return;

      const nextMetrics = await agencyDashboardService.getMetrics(targetAgencyId).catch(() => null);
      const { data: liveBookings } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (nextMetrics) {
        setMetrics((prev) => ({
          ...prev,
          totalRevenue: nextMetrics.totalRevenue || prev.totalRevenue,
          totalBookings: nextMetrics.totalBookings || prev.totalBookings,
          totalCustomers: nextMetrics.activeCustomers || prev.totalCustomers,
        }));
      }

      if (liveBookings && liveBookings.length > 0) {
        const mapped: BookingItem[] = liveBookings.map((b: any, idx: number) => ({
          id: b.id || `live-${idx}`,
          orderId: b.order_id || `ORD${123450 + idx}`,
          customerName: b.customer_name || b.guest_name || "Customer",
          customerEmail: b.customer_email || "customer@example.com",
          service: (b.service_type || "flight").toLowerCase(),
          serviceTitle: b.service_type || "Flight",
          routeOrDetails: b.destination || b.route || "Domestic Tour",
          pnr: b.pnr || `PNR${idx}8X`,
          travelDate: b.travel_date || "28 May 2024",
          amount: Number(b.total_amount || b.price || 5000),
          status: (b.status || "confirmed").toLowerCase(),
          guests: b.passengers_count ? `${b.passengers_count} Guests` : "1 Guest",
        }));
        setBookings(mapped);
      }
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchService =
        selectedService === "all" || b.service.toLowerCase() === selectedService.toLowerCase();
      const matchStatus =
        selectedStatus === "all" || b.status.toLowerCase() === selectedStatus.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        b.orderId.toLowerCase().includes(q) ||
        b.pnr.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.routeOrDetails.toLowerCase().includes(q);
      return matchService && matchStatus && matchQuery;
    });
  }, [bookings, selectedService, selectedStatus, searchQuery]);

  // Service counters
  const serviceCounts = useMemo(() => {
    return {
      all: bookings.length > 5 ? 1482 : bookings.length,
      flight: 651,
      hotel: 423,
      bus: 198,
      holiday: 132,
      visa: 78,
    };
  }, [bookings]);

  // Status mutation with Supabase synchronization
  const handleUpdateStatus = async (item: BookingItem, newStatus: BookingItem["status"]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setBookings((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, status: newStatus } : b))
      );
      if (activeModalBooking?.id === item.id) {
        setActiveModalBooking({ ...activeModalBooking, status: newStatus });
      }

      // Sync with Supabase if persistent ID exists
      if (item.id && !item.id.startsWith("b-") && !item.id.startsWith("live-")) {
        await supabase.from("bookings").update({ status: newStatus }).eq("id", item.id);
      }
      Alert.alert("Status Updated", `Booking #${item.orderId} is now ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.warn("Failed to update status in Supabase:", err);
    }
  };

  const handleShareVoucher = async (item: BookingItem) => {
    try {
      Haptics.selectionAsync();
      await Share.share({
        message: `Shopno Jatra E-Voucher
Order ID: ${item.orderId}
PNR: ${item.pnr}
Customer: ${item.customerName}
Service: ${item.serviceTitle} (${item.routeOrDetails})
Date: ${item.travelDate}
Amount: ৳ ${item.amount.toLocaleString()}
Status: ${item.status.toUpperCase()}`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "flight":
        return { name: "airplane" as const, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
      case "hotel":
        return { name: "office-building" as const, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
      case "bus":
        return { name: "bus" as const, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
      case "holiday":
        return { name: "palm-tree" as const, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" };
      case "visa":
        return { name: "card-account-details-outline" as const, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
      default:
        return { name: "tag-outline" as const, color: "#64748b", bg: "rgba(100, 116, 139, 0.15)" };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return { text: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "#10b981" };
      case "completed":
        return { text: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)", border: "#06b6d4" };
      case "pending":
        return { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "#f59e0b" };
      case "cancelled":
        return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "#ef4444" };
      default:
        return { text: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "#94a3b8" };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerProfile}>
            <LinearGradient
              colors={["#3b82f6", "#1d4ed8"]}
              style={styles.avatarCircle}
            >
              <MaterialCommunityIcons
                name="airplane"
                size={22}
                color="white"
              />
            </LinearGradient>
            <View style={styles.profileText}>
              <View style={styles.nameRow}>
                <Text style={styles.agencyName}>
                  {user?.agencyName || "Rayds White Label"}
                </Text>
                <MaterialIcons name="verified" size={15} color="#3b82f6" />
                <View
                  style={{
                    backgroundColor: `${roleMeta?.color || "#3b82f6"}25`,
                    borderColor: roleMeta?.color || "#3b82f6",
                    borderWidth: 1,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 4,
                    marginStart: 6,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "800", color: roleMeta?.color || "#3b82f6" }}>
                    {roleMeta?.badge || "SUPER ADMIN"}
                  </Text>
                </View>
              </View>
              <Text style={styles.agencyId}>
                ID: {user?.agency?.id?.substring(0, 8).toUpperCase() || "RYD-5280"} • {dateRange}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Haptics.selectionAsync()}
            >
              <Feather name="bell" size={18} color="#d1d5db" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>12</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sticky Header Overlay */}
      <Animated.View
        style={[styles.stickyHeaderOverlay, { opacity: headerOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.stickyTitle}>Rayds Travel Command Center</Text>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={HEADER_MAX_HEIGHT}
            tintColor={UI_COLORS.brand}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.heroSection}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.heroName}>
            {user?.agencyName || "Rayds Partner"} 👋
          </Text>
          <Text style={styles.heroSub}>
            White Label Travel Portal • Live Operations Overview
          </Text>
        </View>

        {/* 4 White-Label KPI Cards (2x2 Grid) */}
        <Animated.View
          style={[
            styles.overviewSection,
            {
              opacity: overviewAnim,
              transform: [
                {
                  translateY: overviewAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.kpiGrid}>
            {/* KPI 1: Total Bookings */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                  <MaterialCommunityIcons name="briefcase-outline" size={20} color="#3b82f6" />
                </View>
                <View style={styles.trendChipUp}>
                  <Feather name="trending-up" size={11} color="#10b981" />
                  <Text style={styles.trendTextUp}>+{metrics.bookingGrowth}%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Total Bookings</Text>
              <Text style={styles.kpiValue}>{metrics.totalBookings.toLocaleString()}</Text>
              <Text style={styles.kpiSub}>from last month</Text>
            </View>

            {/* KPI 2: Total Revenue */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <MaterialCommunityIcons name="currency-bdt" size={22} color="#10b981" />
                </View>
                <View style={styles.trendChipUp}>
                  <Feather name="trending-up" size={11} color="#10b981" />
                  <Text style={styles.trendTextUp}>+{metrics.revenueGrowth}%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={styles.kpiValue}>৳ 52,65,250</Text>
              <Text style={styles.kpiSub}>from last month</Text>
            </View>

            {/* KPI 3: Pending Bookings */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                  <MaterialCommunityIcons name="chart-line" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.trendChipDown}>
                  <Feather name="trending-down" size={11} color="#ef4444" />
                  <Text style={styles.trendTextDown}>{metrics.pendingGrowth}%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Pending Bookings</Text>
              <Text style={styles.kpiValue}>{metrics.pendingBookings}</Text>
              <Text style={styles.kpiSub}>from last month</Text>
            </View>

            {/* KPI 4: Total Customers */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#f59e0b" />
                </View>
                <View style={styles.trendChipUp}>
                  <Feather name="trending-up" size={11} color="#10b981" />
                  <Text style={styles.trendTextUp}>+{metrics.customerGrowth}%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Total Customers</Text>
              <Text style={styles.kpiValue}>{metrics.totalCustomers.toLocaleString()}</Text>
              <Text style={styles.kpiSub}>from last month</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bookings by Service - Mini Counters (Clickable Filters) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Bookings by Service</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serviceMiniRow}
          >
            {[
              { key: "flight" as const, label: "Flight", count: serviceCounts.flight, icon: "airplane", color: "#3b82f6" },
              { key: "hotel" as const, label: "Hotel", count: serviceCounts.hotel, icon: "office-building", color: "#10b981" },
              { key: "bus" as const, label: "Bus", count: serviceCounts.bus, icon: "bus", color: "#f59e0b" },
              { key: "holiday" as const, label: "Holiday", count: serviceCounts.holiday, icon: "palm-tree", color: "#8b5cf6" },
              { key: "visa" as const, label: "Visa", count: serviceCounts.visa, icon: "card-account-details-outline", color: "#ef4444" },
            ].map((s) => {
              const active = selectedService === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedService(active ? "all" : s.key);
                  }}
                  style={[
                    styles.serviceMiniCard,
                    active && { borderColor: s.color, backgroundColor: `${s.color}15` },
                  ]}
                >
                  <MaterialCommunityIcons name={s.icon as any} size={24} color={s.color} />
                  <Text style={styles.serviceMiniLabel}>{s.label}</Text>
                  <Text style={[styles.serviceMiniCount, { color: s.color }]}>{s.count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Booking Management Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: bookingsAnim,
              transform: [
                {
                  translateY: bookingsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Booking Management</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setSelectedService("all");
                setSelectedStatus("all");
                setSearchQuery("");
              }}
            >
              <Text style={styles.clearFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Service Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {[
              { key: "all" as const, label: "All Bookings" },
              { key: "flight" as const, label: "Flight" },
              { key: "hotel" as const, label: "Hotel" },
              { key: "bus" as const, label: "Bus" },
              { key: "holiday" as const, label: "Holiday" },
              { key: "visa" as const, label: "Visa" },
            ].map((tab) => {
              const active = selectedService === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedService(tab.key);
                  }}
                  style={[styles.serviceTab, active && styles.serviceTabActive]}
                >
                  <Text style={[styles.serviceTabText, active && styles.serviceTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Bar & Status Filters */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#94a3b8" style={{ marginStart: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by PNR / Order ID / Customer..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{ padding: 8 }}
              >
                <Feather name="x" size={14} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Quick Pills */}
          <View style={styles.statusPillsRow}>
            {[
              { key: "all" as const, label: "All" },
              { key: "confirmed" as const, label: "Confirmed" },
              { key: "completed" as const, label: "Completed" },
              { key: "pending" as const, label: "Pending" },
            ].map((st) => {
              const active = selectedStatus === st.key;
              return (
                <TouchableOpacity
                  key={st.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedStatus(st.key);
                  }}
                  style={[styles.statusFilterPill, active && styles.statusFilterPillActive]}
                >
                  <Text style={[styles.statusFilterText, active && styles.statusFilterTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bookings List Cards */}
          <View style={styles.bookingCardList}>
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="inbox" size={32} color="#64748b" />
                <Text style={styles.emptyText}>No bookings match your current filter</Text>
              </View>
            ) : (
              filteredBookings.map((b) => {
                const sIcon = getServiceIcon(b.service);
                const sColor = getStatusColor(b.status);
                return (
                  <View key={b.id} style={styles.bookingItemCard}>
                    {/* Header Row */}
                    <View style={styles.bookingItemHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.orderIdText}>{b.orderId}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: sColor.bg, borderColor: sColor.border }]}>
                          <Text style={[styles.statusBadgeText, { color: sColor.text }]}>
                            {b.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.bookingAmount}>৳ {b.amount.toLocaleString()}</Text>
                    </View>

                    {/* Customer & Route Details */}
                    <View style={styles.bookingBody}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={[styles.serviceCircle, { backgroundColor: sIcon.bg }]}>
                          <MaterialCommunityIcons name={sIcon.name as any} size={18} color={sIcon.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customerName}>{b.customerName}</Text>
                          <Text style={styles.routeText}>{b.serviceTitle} • {b.routeOrDetails}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Meta row: PNR & Travel Date */}
                    <View style={styles.bookingMetaRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.selectionAsync();
                          Alert.alert("PNR Copied", `PNR: ${b.pnr}`);
                        }}
                        style={styles.pnrChip}
                      >
                        <Feather name="copy" size={11} color="#3b82f6" />
                        <Text style={styles.pnrText}>PNR: {b.pnr}</Text>
                      </TouchableOpacity>
                      <View style={styles.dateChip}>
                        <Feather name="calendar" size={11} color="#94a3b8" />
                        <Text style={styles.dateText}>{b.travelDate}</Text>
                      </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.bookingActionsRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setActiveModalBooking(b)}
                        style={styles.actionBtnOutline}
                      >
                        <Feather name="eye" size={13} color="#94a3b8" />
                        <Text style={styles.actionBtnText}>Details</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleShareVoucher(b)}
                        style={styles.actionBtnOutline}
                      >
                        <Feather name="download" size={13} color="#3b82f6" />
                        <Text style={[styles.actionBtnText, { color: "#3b82f6" }]}>Voucher</Text>
                      </TouchableOpacity>

                      {b.status === "pending" && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleUpdateStatus(b, "confirmed")}
                          style={[styles.actionBtnSolid, { backgroundColor: "#10b981" }]}
                        >
                          <Feather name="check" size={13} color="white" />
                          <Text style={styles.actionBtnSolidText}>Confirm</Text>
                        </TouchableOpacity>
                      )}

                      {b.status === "confirmed" && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleUpdateStatus(b, "completed")}
                          style={[styles.actionBtnSolid, { backgroundColor: "#06b6d4" }]}
                        >
                          <Feather name="check-circle" size={13} color="white" />
                          <Text style={styles.actionBtnSolidText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Revenue Reports Breakdown Widget */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Revenue Reports</Text>
            <Text style={styles.filterText}>By Service Type</Text>
          </View>

          <View style={styles.revenueCard}>
            <Text style={styles.revenueTitle}>Total Revenue</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <Text style={styles.revenueAmount}>৳ 52,65,250</Text>
              <View style={styles.trendChipUp}>
                <Feather name="trending-up" size={11} color="#10b981" />
                <Text style={styles.trendTextUp}>+22.8%</Text>
              </View>
            </View>

            {/* Segmented Color Bar */}
            <View style={styles.segmentBarContainer}>
              <View style={[styles.segment, { width: "42.7%", backgroundColor: "#3b82f6" }]} />
              <View style={[styles.segment, { width: "29.7%", backgroundColor: "#10b981" }]} />
              <View style={[styles.segment, { width: "14.9%", backgroundColor: "#8b5cf6" }]} />
              <View style={[styles.segment, { width: "6.2%", backgroundColor: "#f59e0b" }]} />
              <View style={[styles.segment, { width: "2.8%", backgroundColor: "#ef4444" }]} />
              <View style={[styles.segment, { width: "3.7%", backgroundColor: "#64748b" }]} />
            </View>

            {/* Breakdown List */}
            <View style={styles.breakdownGrid}>
              {[
                { label: "Flight", amount: "৳ 22.45 L", percent: "42.7%", color: "#3b82f6" },
                { label: "Hotel", amount: "৳ 15.65 L", percent: "29.7%", color: "#10b981" },
                { label: "Holiday", amount: "৳ 7.85 L", percent: "14.9%", color: "#8b5cf6" },
                { label: "Bus", amount: "৳ 3.25 L", percent: "6.2%", color: "#f59e0b" },
                { label: "Visa", amount: "৳ 1.45 L", percent: "2.8%", color: "#ef4444" },
                { label: "Others", amount: "৳ 0.45 L", percent: "0.7%", color: "#64748b" },
              ].map((item, idx) => (
                <View key={idx} style={styles.breakdownItem}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.breakdownVal}>{item.amount}</Text>
                    <Text style={styles.breakdownPct}>({item.percent})</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Selling Destinations (Holidays) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Top Selling Destinations (Holidays)</Text>
          <View style={styles.destinationsCard}>
            {[
              { name: "Thailand", amount: "৳ 12,45,000", pct: "100%", color: "#3b82f6" },
              { name: "Dubai", amount: "৳ 9,85,000", pct: "79%", color: "#10b981" },
              { name: "Singapore", amount: "৳ 6,25,000", pct: "50%", color: "#8b5cf6" },
              { name: "Bali", amount: "৳ 4,75,000", pct: "38%", color: "#f59e0b" },
              { name: "Malaysia", amount: "৳ 3,15,000", pct: "25%", color: "#ef4444" },
            ].map((dest, i) => (
              <View key={i} style={styles.destinationRow}>
                <View style={styles.destinationLabelRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.colorDot, { backgroundColor: dest.color }]} />
                    <Text style={styles.destinationName}>{dest.name}</Text>
                  </View>
                  <Text style={styles.destinationAmount}>{dest.amount}</Text>
                </View>
                <View style={styles.destProgressTrack}>
                  <View style={[styles.destProgressBar, { width: dest.pct as any, backgroundColor: dest.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: actionsAnim,
              transform: [
                {
                  translateY: actionsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Agency Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              {
                label: "B2B Book",
                icon: "navigation",
                colors: ["#6366f1", "#4338ca"],
                onPress: () => navigation.navigate("B2BSearchBooking"),
              },
              {
                label: "Wallet Top-up",
                icon: "credit-card",
                colors: ["#10b981", "#059669"],
                onPress: () => navigation.navigate("WalletTopUp"),
              },
              {
                label: "Quotation",
                icon: "file-text",
                colors: ["#06b6d4", "#0891b2"],
                onPress: () => navigation.navigate("QuotationBuilder"),
              },
              {
                label: "Bookings",
                icon: "check-circle",
                colors: ["#3b82f6", "#1d4ed8"],
                onPress: () => navigation.navigate("BookingsTab"),
              },
              {
                label: "Customers",
                icon: "users",
                colors: ["#8b5cf6", "#7c3aed"],
                onPress: () => navigation.navigate("CustomersTab"),
              },
              {
                label: "Earnings",
                icon: "dollar-sign",
                colors: ["#f59e0b", "#d97706"],
                onPress: () => navigation.navigate("ProfileTab", { screen: "Earnings" }),
              },
              {
                label: "Staff Team",
                icon: "user-check",
                colors: ["#ec4899", "#be185d"],
                onPress: () => navigation.navigate("ProfileTab", { screen: "TeamManagement" }),
              },
              {
                label: "Verification",
                icon: "shield",
                colors: ["#0284c7", "#0369a1"],
                onPress: () => navigation.navigate("ProfileTab", { screen: "Verification" }),
              },
            ].map((action, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                style={styles.actionItem}
                onPress={action.onPress}
              >
                <LinearGradient
                  colors={action.colors as [string, string]}
                  style={styles.actionIcon}
                >
                  <Feather
                    name={action.icon as any}
                    size={20}
                    color="white"
                  />
                </LinearGradient>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Booking Details Modal */}
      <Modal
        visible={!!activeModalBooking}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModalBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {activeModalBooking && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Booking Details</Text>
                    <Text style={styles.modalSub}>{activeModalBooking.orderId} • PNR {activeModalBooking.pnr}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setActiveModalBooking(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Feather name="x" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Customer Information</Text>
                    <Text style={styles.modalFieldVal}>{activeModalBooking.customerName}</Text>
                    <Text style={styles.modalFieldSub}>{activeModalBooking.customerEmail}</Text>
                    <Text style={styles.modalFieldSub}>Guests: {activeModalBooking.guests || "1 Guest"}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Service & Itinerary</Text>
                    <Text style={styles.modalFieldVal}>{activeModalBooking.serviceTitle}</Text>
                    <Text style={styles.modalFieldSub}>{activeModalBooking.routeOrDetails}</Text>
                    <Text style={styles.modalFieldSub}>Travel Date: {activeModalBooking.travelDate}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Financial Summary</Text>
                    <Text style={styles.modalPriceText}>৳ {activeModalBooking.amount.toLocaleString()}</Text>
                    <Text style={styles.modalFieldSub}>Status: {activeModalBooking.status.toUpperCase()}</Text>
                  </View>

                  {/* Quick Action Mutators */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Update Booking Status</Text>
                    <View style={styles.statusButtonGroup}>
                      <TouchableOpacity
                        onPress={() => handleUpdateStatus(activeModalBooking, "confirmed")}
                        style={[styles.statusSelectBtn, { backgroundColor: "rgba(16, 185, 129, 0.2)", borderColor: "#10b981" }]}
                      >
                        <Text style={{ color: "#10b981", fontWeight: "700", fontSize: 12 }}>Confirm</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleUpdateStatus(activeModalBooking, "completed")}
                        style={[styles.statusSelectBtn, { backgroundColor: "rgba(6, 182, 212, 0.2)", borderColor: "#06b6d4" }]}
                      >
                        <Text style={{ color: "#06b6d4", fontWeight: "700", fontSize: 12 }}>Complete</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleUpdateStatus(activeModalBooking, "pending")}
                        style={[styles.statusSelectBtn, { backgroundColor: "rgba(245, 158, 11, 0.2)", borderColor: "#f59e0b" }]}
                      >
                        <Text style={{ color: "#f59e0b", fontWeight: "700", fontSize: 12 }}>Pending</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleUpdateStatus(activeModalBooking, "cancelled")}
                        style={[styles.statusSelectBtn, { backgroundColor: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444" }]}
                      >
                        <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 12 }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => handleShareVoucher(activeModalBooking)}
                    style={styles.modalVoucherBtn}
                  >
                    <Feather name="download" size={15} color="white" />
                    <Text style={styles.modalVoucherBtnText}>Share / Download E-Voucher</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.bg,
  },
  header: {
    backgroundColor: UI_COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  profileText: {
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  agencyName: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  agencyId: {
    color: "#94a3b8",
    fontSize: 11,
    opacity: 0.9,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: UI_COLORS.bg,
  },
  badgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "800",
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 40,
  },
  stickyHeaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  stickyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  greeting: {
    fontSize: 14,
    color: "#94a3b8",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    marginTop: 2,
  },
  heroSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  overviewSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: UI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    padding: 14,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  trendChipUp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendTextUp: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "700",
  },
  trendChipDown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendTextDown: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "700",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "white",
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clearFilterText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  serviceMiniRow: {
    gap: 10,
    paddingBottom: 4,
  },
  serviceMiniCard: {
    width: 90,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: UI_COLORS.card,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    alignItems: "center",
    gap: 4,
  },
  serviceMiniLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  serviceMiniCount: {
    fontSize: 14,
    fontWeight: "800",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  serviceTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  serviceTabActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  serviceTabText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  serviceTabTextActive: {
    color: "white",
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    marginBottom: 10,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 13,
    paddingHorizontal: 10,
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statusFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statusFilterPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
  },
  statusFilterText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statusFilterTextActive: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  bookingCardList: {
    gap: 12,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 36,
    backgroundColor: UI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
  bookingItemCard: {
    backgroundColor: UI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    padding: 14,
  },
  bookingItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 10,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  bookingAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
  },
  bookingBody: {
    paddingVertical: 10,
  },
  serviceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  customerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },
  routeText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  bookingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  pnrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pnrText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3b82f6",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  bookingActionsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  actionBtnSolid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSolidText: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  revenueCard: {
    backgroundColor: UI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    padding: 16,
  },
  revenueTitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  revenueAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
  },
  segmentBarContainer: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 14,
  },
  segment: {
    height: "100%",
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  breakdownItem: {
    width: "48%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  breakdownPct: {
    fontSize: 10,
    color: "#64748b",
  },
  destinationsCard: {
    backgroundColor: UI_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.cardBorder,
    padding: 16,
    gap: 12,
  },
  destinationRow: {
    gap: 6,
  },
  destinationLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destinationName: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
  },
  destinationAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#d1d5db",
  },
  destProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  destProgressBar: {
    height: "100%",
    borderRadius: 3,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  actionItem: {
    width: "22%",
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 10,
    color: "#d1d5db",
    textAlign: "center",
    fontWeight: "500",
  },
  filterText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0d1829",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  modalSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalSection: {
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  modalFieldVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  modalFieldSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  modalPriceText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#10b981",
  },
  statusButtonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  statusSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  modalVoucherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalVoucherBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
});
