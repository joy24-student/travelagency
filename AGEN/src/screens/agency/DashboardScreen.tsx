/**
 * Agency Dashboard Screen
 * Main overview with key metrics, charts, and live data
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  MaterialCommunityIcons,
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import { COLORS } from "../../App";
import { useAuth } from "../../hooks/useAuth";
import { agencyDashboardService } from "../../services/agencyService";
import {
  StatCard,
  Card,
  SectionHeader,
  ActivityItem,
} from "../ui/UIComponents";

// High-fidelity UI Constants
const HEADER_MAX_HEIGHT = 80;
const HEADER_MIN_HEIGHT = 60;

const UI_COLORS = {
  bg: "#0B1326",
  card: "rgba(255, 255, 255, 0.05)",
  border: "rgba(255, 255, 255, 0.1)",
  trendUp: "#10b981",
  textSecondary: "#94a3b8",
  brand: "#3b82f6",
};

interface DashboardMetrics {
  totalRevenue: number;
  totalBookings: number;
  activeAgencies: number;
  conversionRate: number;
  revenueGrowth: number;
  bookingGrowth: number;
  customerGrowth: number;
  avgOrderValue: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalBookings: 0,
    activeAgencies: 0,
    conversionRate: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    customerGrowth: 0,
    avgOrderValue: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
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

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT],
    outputRange: [-60, 0],
    extrapolate: "clamp",
  });

  useEffect(() => {
    // Staggered animations for sections
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
    if (!user?.agency?.id) return;

    const [nextMetrics, nextActivities] = await Promise.all([
      agencyDashboardService.getMetrics(user.agency.id),
      agencyDashboardService.getRecentActivity(user.agency.id),
    ]);

    setMetrics({
      ...nextMetrics,
      activeAgencies: nextMetrics.activeCustomers,
    });
    setActivities(nextActivities);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerProfile}>
            <LinearGradient
              colors={["#c3c0ff", "#4338ca"]}
              style={styles.avatarCircle}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={20}
                color="white"
              />
            </LinearGradient>
            <View style={styles.profileText}>
              <View style={styles.nameRow}>
                <Text style={styles.agencyName}>
                  {user?.agencyName || "Global Travels"}
                </Text>
                <MaterialIcons name="verified" size={14} color="#3b82f6" />
              </View>
              <Text style={styles.agencyId}>
                ID:{" "}
                {user?.agency?.id?.substring(0, 8).toUpperCase() || "GTL-8821"}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="search" size={20} color="#d1d5db" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Feather name="bell" size={20} color="#d1d5db" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>12</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sticky Header Overlay (Appears on scroll) */}
      <Animated.View
        style={[styles.stickyHeaderOverlay, { opacity: headerOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.stickyTitle}>Dashboard</Text>
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
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.heroName}>
            {user?.agencyName || "Partner"} 👋
          </Text>
          <Text style={styles.heroSub}>
            Let's make today's journey amazing!
          </Text>
        </View>

        {/* Quick Overview */}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Overview</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.filterBtn}>
              <Text style={styles.filterText}>This Month</Text>
              <Feather name="chevron-down" size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            {[
              {
                label: "Revenue",
                val: `$${(metrics.totalRevenue / 1000).toFixed(1)}K`,
                trend: `↗ ${metrics.revenueGrowth}%`,
                color: "#a855f7",
                icon: "currency-usd",
              },
              {
                label: "Bookings",
                val: metrics.totalBookings.toLocaleString(),
                trend: `↗ ${metrics.bookingGrowth}%`,
                color: "#3b82f6",
                icon: "calendar-check",
              },
              {
                label: "Users",
                val: metrics.activeAgencies.toLocaleString(),
                trend: `↗ ${metrics.customerGrowth}%`,
                color: "#10b981",
                icon: "account-group",
              },
              {
                label: "Conv.",
                val: `${metrics.conversionRate}%`,
                trend: "↗ 2.1%",
                color: "#22c55e",
                icon: "bullseye-arrow",
              },
            ].map((stat, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                style={styles.miniStatCard}
              >
                <BlurView intensity={15} tint="dark" style={styles.miniStatBlur}>
                  <View
                    style={[
                      styles.statIconBox,
                      { backgroundColor: `${stat.color}15` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={stat.icon as any}
                      size={18}
                      color={stat.color}
                    />
                  </View>
                  <Text style={styles.miniLabel}>{stat.label}</Text>
                  <Text style={styles.miniVal}>{stat.val}</Text>
                  <View className="flex-row items-center gap-1 mt-1">
                     <Ionicons name="trending-up" size={10} color={UI_COLORS.trendUp} />
                     <Text style={styles.miniTrend}>{stat.trend}</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            styles.actionsSection,
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsGrid}>
            {[
              {
                label: "Create Pkg",
                icon: "plus",
                colors: ["#6366f1", "#4338ca"],
              },
              {
                label: "Add Tour",
                icon: "navigation",
                colors: ["#3b82f6", "#1d4ed8"],
              },
              {
                label: "Bookings",
                icon: "file-text",
                colors: ["#06b6d4", "#0891b2"],
              },
              {
                label: "Customers",
                icon: "users",
                colors: ["#10b981", "#059669"],
              },
              {
                label: "Withdraw",
                icon: "credit-card",
                colors: ["#1e1b4b", "#020617"],
              },
              {
                label: "Campaigns",
                icon: "megaphone",
                colors: ["#f43f5e", "#e11d48"],
              },
              {
                label: "Reports",
                icon: "bar-chart-2",
                colors: ["#1d4ed8", "#172554"],
              },
              {
                label: "More",
                icon: "more-horizontal",
                colors: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.1)"],
              },
            ].map(
              (
                action,
                i, // Use TouchableOpacity for actions
              ) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  style={styles.actionItem}
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
              ),
            )}
          </View>
        </Animated.View>

        {/* Recent Bookings */}
        <Animated.View
          style={[
            styles.bookingsSection,
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bookingsList}>
            {[
              {
                name: "Robert Fox",
                id: "#SJ-8821",
                pkg: "Bali Explorer Pack",
                price: "$2,450",
                status: "New Booking",
                statusColor: "#10b981",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4nYmSxvsW-1MFdopbsrIAf6kD6H33HccxLZm3lORPZvLcyiLTasbzuSzdxsteT25wCUEBb6jx0pxDUnO20PkkzpzB5RpGOoOrM0yNM9DItMKDpOLY6l6iFFwAbb3X_aIsXY-huhBOQfRyiioBNE6ua-Pz9L0F7aLed_VAPfTYPgDdnfwqdFxln7HRfHEYWL6GBxjryKjGnnVPnkiQ-1lp3W4CA-crhQAuXfMA_1yRy5qJbXKknkxPqzwa_pzNzP4C4UDq5Gpe0ZI",
              },
              {
                name: "Jane Cooper",
                id: "#SJ-8819",
                pkg: "Swiss Alps Luxury",
                price: "$3,120",
                status: "In Progress",
                statusColor: "#3b82f6",
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwbR3phphM28YmxgcRivYKnUr-06jqCRrylCppG-2P5AxL3iRWQnmZ_CJfDdD9FkO8PGwP-lC4MF3-5-F6950D1L6BsQfqixq90iM0-9WiMcwOffx-ANGore7SifyrJd1H7iUna4sEclo4HRLiPq2P-R_zbypFDr_I4WHom5V0b9CLPz6p6puYjNxMZEyI_Pyhltu-kIv1HL2V-QfH1f2sgMI66ywZvlEBGL-bljnW7H1ZcGGrsA1RPIHdLZmXVWDrFBRq4vZOARA",
              },
            ].map((booking, i) => (
              <View key={i} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.bookingUser}>
                    <Image
                      source={{ uri: booking.img }}
                      style={styles.userAvatar}
                    />
                    <View>
                      <Text style={styles.userName}>{booking.name}</Text>
                      <Text style={styles.userMeta}>
                        ID: {booking.id} | {booking.pkg}
                      </Text>
                      <View style={styles.guestRow}>
                        <Text style={styles.guestText}>• 2 Adults</Text>
                        <Text style={styles.guestText}>• 1 Child</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.bookingPrice}>
                    <Text style={styles.priceText}>{booking.price}</Text>
                    <Text style={styles.timeText}>Today</Text>
                  </View>
                </View>
                <View style={styles.bookingBottom}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${booking.statusColor}10` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: booking.statusColor },
                      ]}
                    >
                      {booking.status}
                    </Text>
                  </View>
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.smallActionBtn}
                    >
                      <Feather
                        name="message-square"
                        size={14}
                        color="#d1d5db"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.smallActionBtn, styles.cancelBtn]}
                    >
                      <Feather name="x" size={14} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.smallActionBtn, styles.approveBtn]}
                    >
                      <Feather name="check" size={14} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 10,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  stickyTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 2,
  },
  greeting: {
    fontSize: 18,
    color: "#94a3b8",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 4,
  },
  heroSub: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  heroParallaxBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "200%", // Make it taller than the section to allow for parallax movement
    zIndex: -1, // Place it behind the content
    borderRadius: 24, // Match card border radius if desired, or keep it sharp
    overflow: "hidden",
  },
  overviewSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap", // Allow wrapping for smaller screens if needed
    gap: 8, // Smaller gap for mini cards
  },
  miniStatCard: {
    width: "23%",
    padding: 12,
    backgroundColor: UI_COLORS.card,
    borderRadius: 16, // Slightly smaller border radius for mini cards
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    alignItems: "center",
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  miniLabel: {
    textAlign: "center", // Center text
    fontSize: 9,
    color: "#94a3b8",
  },
  miniVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    marginTop: 2,
  },
  miniTrend: {
    fontSize: 9,
    color: UI_COLORS.trendUp,
    fontWeight: "700",
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 24,
  },
  viewAll: {
    fontSize: 12,
    color: "#3b82f6",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  actionItem: {
    width: "21%",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionLabel: {
    fontSize: 9,
    color: "#d1d5db",
    lineHeight: 12, // Improve readability for multi-line labels
    textAlign: "center",
  },
  bookingsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  bookingsList: {
    gap: 16,
  },
  bookingCard: {
    backgroundColor: UI_COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: 16,
    marginBottom: 16, // Consistent spacing between booking cards
  },
  bookingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingUser: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  userMeta: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  guestText: {
    fontSize: 9,
    color: "#64748b",
  },
  bookingPrice: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  timeText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  bookingBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  approveBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14, // Consistent font size
  },
});
