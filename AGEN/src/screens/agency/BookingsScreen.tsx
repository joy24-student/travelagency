import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Animated,
  SafeAreaView,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SectionHeader, Badge } from "../ui/UIComponents";
import { useAuth } from "../../hooks/useAuth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { agencyBookingsService } from "../../services/agencyService";
import { BookingsStackParamList } from "../../App";

const UI_COLORS = {
  brandDark: "#0B101B",
  brandCard: "#161C2C",
  brandPrimary: "#6366F1",
  brandTextMuted: "#94A3B8",
  white: "#FFFFFF",
  border: "rgba(31, 41, 55, 0.5)", // border-gray-800/50
  success: "#10b981", // Added for trend indicators
};

type Props = NativeStackScreenProps<BookingsStackParamList, "BookingsList">;

interface Booking {
  id: string;
  tourName: string;
  customer: string;
  date: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  guests: number;
  amount: number;
  image?: string;
}

export default function BookingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);

  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const normalizeStatus = (status: string): Booking["status"] => {
    if (
      status === "completed" ||
      status === "cancelled" ||
      status === "confirmed"
    )
      return status;
    return "pending";
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return "Dates pending";
    const startLabel = start ? new Date(start).toLocaleDateString() : "TBD";
    const endLabel = end ? new Date(end).toLocaleDateString() : "TBD";
    return `${startLabel} - ${endLabel}`;
  };

  const loadBookings = useCallback(async () => {
    if (!user?.agency?.id) return;

    const rows = await agencyBookingsService.getBookings(user.agency.id);
    setBookings(
      rows.map((booking) => ({
        id: booking.booking_reference || booking.id,
        tourName: `${booking.destination_city || "Travel"} ${booking.product_type}`,
        customer: booking.traveler_details
          ? `${booking.traveler_details.first_name} ${booking.traveler_details.last_name}`.trim()
          : `Customer ${booking.user_id.slice(0, 6)}`,
        date: formatDateRange(booking.start_date, booking.end_date),
        status: normalizeStatus(booking.status),
        guests: booking.number_of_guests,
        amount: Number(booking.final_price || 0),
        image: `https://i.pravatar.cc/150?u=${booking.id}`, // Placeholder to match UI
      })),
    );
  }, [user?.agency?.id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const stats = {
    revenue: bookings.reduce((acc, curr) => acc + curr.amount, 0),
    count: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    new: bookings.filter((b) => b.status === "confirmed").length,
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const statusConfig: Record<
    string,
    {
      color: string;
      label: string;
      badge: "active" | "pending" | "success" | "error";
    }
  > = {
    confirmed: { color: "#22C55E", label: "New Booking", badge: "success" },
    pending: { color: "#F59E0B", label: "Pending", badge: "pending" },
    completed: { color: "#10B981", label: "Completed", badge: "success" },
    cancelled: { color: "#EF4444", label: "Cancelled", badge: "error" },
    inProgress: { color: "#3B82F6", label: "In Progress", badge: "active" },
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const filteredBookings = (
    filterStatus === "all"
      ? bookings
      : bookings.filter((booking) => booking.status === filterStatus)
  ).filter(
    (b) =>
      b.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <Text style={styles.stickyHeaderTitle}>Bookings</Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={UI_COLORS.brandPrimary}
          />
        }
      >
        <View style={styles.mainHeader}>
          <View>
            <Text style={styles.welcomeText}>Manage Your</Text>
            <Text style={styles.headerTitle}>Bookings</Text>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={UI_COLORS.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="search-web"
            size={20}
            color={UI_COLORS.brandTextMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search guest or reference..."
            placeholderTextColor={UI_COLORS.brandTextMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={{ height: 12 }} />

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {["all", "confirmed", "pending", "completed"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && styles.filterTabActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterStatus === status && styles.filterTabTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>

        <View
          style={[
            styles.section,
            { paddingBottom: Math.max(insets.bottom, 80) },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <SectionHeader title="Recent Bookings" />
            <Text style={styles.countText}>
              {filteredBookings.length} Total
            </Text>
          </View>

          {filteredBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              onPress={() =>
                navigation.navigate("BookingDetails", { bookingId: booking.id })
              }
              activeOpacity={0.9}
              style={styles.bookingCardWrapper}
            >
              <View style={styles.bookingCardContent}>
                <View style={styles.bookingHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingId}>
                      #{booking.id.toUpperCase()}
                    </Text>
                    <Text style={styles.bookingTour}>{booking.tourName}</Text>
                  </View>
                  <Badge
                    label={
                      statusConfig[booking.status]?.label || booking.status
                    }
                    status={statusConfig[booking.status]?.badge as any}
                    size="small"
                  />
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color={UI_COLORS.brandTextMuted}
                    />
                    <Text style={styles.detailText}>{booking.customer}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="calendar-range"
                      size={16}
                      color={UI_COLORS.brandTextMuted}
                    />
                    <Text style={styles.detailText}>{booking.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="human-male-female"
                      size={16}
                      color={UI_COLORS.brandTextMuted}
                    />
                    <Text style={styles.detailText}>
                      {booking.guests} Guests
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.bookingAmount}>
                    ${booking.amount.toLocaleString()}
                  </Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="pencil"
                        size={16}
                        color={UI_COLORS.brandPrimary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {filteredBookings.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={48}
                color={UI_COLORS.brandTextMuted}
              />
              <Text style={styles.emptyText}>
                No bookings found for this agency.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_COLORS.brandDark },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: UI_COLORS.brandDark,
    zIndex: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
    paddingBottom: 15,
  },
  stickyHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI_COLORS.white,
  },
  welcomeText: {
    fontSize: 13,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  content: { flex: 1 },
  mainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: UI_COLORS.brandCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "600",
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: {
    fontSize: 13,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "500",
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingAmount: { fontSize: 20, fontWeight: "800", color: UI_COLORS.white },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerTitle: { fontSize: 20, fontWeight: "600", color: UI_COLORS.white },
  headerBtn: { padding: 4 },
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI_COLORS.brandCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: UI_COLORS.white, fontSize: 14 },
  filterBtn: {
    backgroundColor: UI_COLORS.brandCard,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterTabs: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: UI_COLORS.brandCard,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterTabActive: { backgroundColor: UI_COLORS.brandPrimary },
  filterTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: UI_COLORS.brandTextMuted,
  },
  filterTabTextActive: { color: UI_COLORS.white },
  countBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countBadgeText: { color: UI_COLORS.white, fontSize: 10, fontWeight: "600" },
  section: { paddingHorizontal: 24, gap: 16 },
  bookingCardWrapper: {
    backgroundColor: UI_COLORS.brandCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  bookingCardContent: { flex: 1 },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerInfo: { flexDirection: "row", gap: 16, flex: 1 },
  customerAvatar: { width: 48, height: 48, borderRadius: 24 },
  customerName: { fontSize: 16, fontWeight: "600", color: UI_COLORS.white },
  bookingTour: { fontSize: 13, color: UI_COLORS.brandTextMuted, marginTop: 2 },
  bookingDate: { fontSize: 11, color: UI_COLORS.brandTextMuted, marginTop: 4 },
  guestRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  guestText: { fontSize: 11, color: UI_COLORS.brandTextMuted },
  headerRight: { alignItems: "flex-end", gap: 8 },
  bookingId: { fontSize: 10, color: UI_COLORS.brandTextMuted },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: UI_COLORS.brandTextMuted, fontSize: 14, marginTop: 12 },
  // Missing styles from previous diffs, added to resolve errors
  statsContainer: { paddingHorizontal: 24, marginBottom: 24 },
  revenueCard: {
    backgroundColor: UI_COLORS.brandCard,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  revenueInfo: { flex: 1 },
  statsLabel: {
    fontSize: 11,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: "800",
    color: UI_COLORS.white,
    marginVertical: 2,
  },
  statsTrend: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendText: { fontSize: 12, color: UI_COLORS.success, fontWeight: "700" },
  statsDivider: {
    width: 1,
    height: "70%",
    backgroundColor: UI_COLORS.border,
    marginHorizontal: 20,
    opacity: 0.5,
  },
  miniStats: { gap: 12, paddingLeft: 16 },
  miniLabel: {
    fontSize: 10,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  miniValue: { fontSize: 18, fontWeight: "800", color: UI_COLORS.white },
});
