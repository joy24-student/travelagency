import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SectionHeader, Badge } from "../ui/UIComponents";
import { useAuth } from "../../hooks/useAuth";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { agencyBookingsService } from "../../services/agencyService";
import { supabase } from "../../services/supabaseClient";
import { BookingsStackParamList } from "../../App";
import { useScreenCollaboration } from "../../hooks/useScreenCollaboration";
import { APP_EVENTS } from "../../services/events/appEventBus";
import { useTranslation } from "react-i18next";

const UI_COLORS = {
  brandDark: "#0B101B",
  brandCard: "#161C2C",
  brandPrimary: "#6366F1",
  brandText: "#F8FAFC",
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
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBookings.map((b) => b.id));
    }
  };

  const toggleSelectBooking = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleBulkStatusChange = (newStatus: Booking["status"]) => {
    setBookings((prev) =>
      prev.map((b) => (selectedIds.includes(b.id) ? { ...b, status: newStatus } : b))
    );
    alert(`${selectedIds.length}টি বুকিংয়ের স্ট্যাটাস আপডেট করা হয়েছে।`);
    setSelectedIds([]);
  };

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

  const { t } = useTranslation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useScreenCollaboration(
    APP_EVENTS.BOOKING_STATUS_CHANGED,
    useCallback(
      (payload) => {
        if (!payload?.bookingId) return;
        setBookings((prev) =>
          prev.map((b) => {
            if (b.id === payload.bookingId) {
              const mappedStatus = normalizeStatus(payload.currentStatus);
              return { ...b, status: mappedStatus };
            }
            return b;
          })
        );
        const statusLabel = t(payload.currentStatus, {
          defaultValue: payload.currentStatus,
        });
        showToast(t("bookingStatusUpdated", { status: statusLabel }));
      },
      [t, showToast]
    ),
    { replayLast: true, screenId: "AgencyBookingsScreen" }
  );

  useScreenCollaboration(
    APP_EVENTS.PAYMENT_COMPLETED,
    useCallback(
      (payload) => {
        if (!payload?.bookingId) return;
        setBookings((prev) =>
          prev.map((b) => {
            if (b.id === payload.bookingId) {
              return { ...b, status: "confirmed" };
            }
            return b;
          })
        );
        showToast(t("paymentReceivedToast", { bookingId: payload.bookingId.slice(0, 8) }));
      },
      [t, showToast]
    ),
    { replayLast: true, screenId: "AgencyBookingsScreen" }
  );

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start && !end) return "Dates pending";
    const startLabel = start ? new Date(start).toLocaleDateString() : "TBD";
    const endLabel = end ? new Date(end).toLocaleDateString() : "TBD";
    return `${startLabel} - ${endLabel}`;
  };

  const loadBookings = useCallback(async () => {
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

      const rows = targetAgencyId
        ? await agencyBookingsService.getBookings(targetAgencyId)
        : [];

      // If no agency-specific bookings found, query recent global bookings for agency operations preview
      let displayRows = rows;
      if (displayRows.length === 0) {
        const { data: globalBookings } = await supabase
          .from("bookings")
          .select("id, booking_reference, destination_city, product_type, start_date, end_date, number_of_guests, final_price, status, user_id")
          .order("created_at", { ascending: false })
          .limit(15);
        if (globalBookings) {
          displayRows = globalBookings as any;
        }
      }

      setBookings(
        displayRows.map((booking) => ({
          id: booking.booking_reference || booking.id,
          tourName: `${booking.destination_city || "Travel"} ${booking.product_type}`,
          customer: booking.traveler_details
            ? `${booking.traveler_details.first_name} ${booking.traveler_details.last_name}`.trim()
            : `Customer ${(booking.user_id || booking.id).slice(0, 6)}`,
          date: formatDateRange(booking.start_date, booking.end_date),
          status: normalizeStatus(booking.status),
          guests: booking.number_of_guests,
          amount: Number(booking.final_price || 0),
          image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200`,
        })),
      );
    } catch (err) {
      console.warn("Failed to load agency bookings:", err);
    }
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
      {toastMessage && (
        <View style={styles.floatingToast}>
          <MaterialCommunityIcons name="information" size={18} color="#6366F1" />
          <Text style={styles.floatingToastText}>{toastMessage}</Text>
        </View>
      )}
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
          {/* Floating Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <View style={styles.floatingBulkBar}>
            <View style={styles.bulkInfo}>
              <Text style={styles.bulkCountText}>{selectedIds.length} Selected</Text>
            </View>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: "#10B981" }]}
              onPress={() => handleBulkStatusChange("confirmed")}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
              <Text style={styles.bulkActionBtnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => handleBulkStatusChange("cancelled")}
            >
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.bulkActionBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkCloseBtn}
              onPress={() => setSelectedIds([])}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>

        <View
          style={[
            styles.section,
            { paddingBottom: Math.max(insets.bottom, 80) },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <SectionHeader title="Recent Bookings" />
              <Text style={styles.countText}>
                {filteredBookings.length} Total • {selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Tap to select"}
              </Text>
            </View>

            {/* View Mode Switcher: Cards vs Table */}
            <View style={styles.viewModeToggleWrap}>
              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === "cards" && styles.viewModeBtnActive]}
                onPress={() => setViewMode("cards")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={16}
                  color={viewMode === "cards" ? "#FFFFFF" : UI_COLORS.brandTextMuted}
                />
                <Text style={[styles.viewModeBtnText, viewMode === "cards" && styles.viewModeBtnTextActive]}>
                  Cards
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewModeBtn, viewMode === "table" && styles.viewModeBtnActive]}
                onPress={() => setViewMode("table")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="table"
                  size={16}
                  color={viewMode === "table" ? "#FFFFFF" : UI_COLORS.brandTextMuted}
                />
                <Text style={[styles.viewModeBtnText, viewMode === "table" && styles.viewModeBtnTextActive]}>
                  Table
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === "cards" ? (
            filteredBookings.map((booking) => {
              const isSelected = selectedIds.includes(booking.id);
              return (
                <TouchableOpacity
                  key={booking.id}
                  onPress={() =>
                    navigation.navigate("BookingDetails", { bookingId: booking.id })
                  }
                  activeOpacity={0.9}
                  style={[styles.bookingCardWrapper, isSelected && styles.bookingCardSelected]}
                >
                  <View style={styles.cardSelectCol}>
                    <TouchableOpacity
                      onPress={() => toggleSelectBooking(booking.id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.checkboxTouch}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={20}
                        color={isSelected ? UI_COLORS.brandPrimary : UI_COLORS.brandTextMuted}
                      />
                    </TouchableOpacity>
                  </View>
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
              );
            })
          ) : (
            /* Table View with Sticky First Column & Horizontal Scroll */
            <View style={styles.tableWrapper}>
              {/* Sticky Left Column (Select + ID + Customer) */}
              <View style={styles.stickyCol}>
                <View style={[styles.tableCell, styles.tableHeaderCell, styles.stickyHeaderCell]}>
                  <TouchableOpacity onPress={toggleSelectAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons
                      name={selectedIds.length === filteredBookings.length && filteredBookings.length > 0 ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={18}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <Text style={styles.tableHeaderText}>Booking</Text>
                </View>
                {filteredBookings.map((b) => {
                  const isSelected = selectedIds.includes(b.id);
                  return (
                    <TouchableOpacity
                      key={`sticky-${b.id}`}
                      style={[styles.tableCell, styles.stickyDataCell, isSelected && styles.rowSelected]}
                      onPress={() => toggleSelectBooking(b.id)}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                        size={18}
                        color={isSelected ? UI_COLORS.brandPrimary : UI_COLORS.brandTextMuted}
                      />
                      <View style={{ flex: 1, marginStart: 6 }}>
                        <Text style={styles.stickyIdText} numberOfLines={1}>#{b.id.toUpperCase()}</Text>
                        <Text style={styles.stickyCustomerText} numberOfLines={1}>{b.customer}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Scrollable Right Columns */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                <View>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableHeaderText, { width: 140 }]}>Tour / Service</Text>
                    <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
                    <Text style={[styles.tableHeaderText, { width: 90 }]}>Status</Text>
                    <Text style={[styles.tableHeaderText, { width: 60 }]}>Guests</Text>
                    <Text style={[styles.tableHeaderText, { width: 80 }]}>Amount</Text>
                  </View>

                  {filteredBookings.map((b) => {
                    const isSelected = selectedIds.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={`data-${b.id}`}
                        style={[styles.tableRow, isSelected && styles.rowSelected]}
                        onPress={() => navigation.navigate("BookingDetails", { bookingId: b.id })}
                      >
                        <Text style={[styles.tableCellText, { width: 140 }]} numberOfLines={1}>{b.tourName}</Text>
                        <Text style={[styles.tableCellText, { width: 100 }]} numberOfLines={1}>{b.date}</Text>
                        <View style={{ width: 90 }}>
                          <Badge
                            label={statusConfig[b.status]?.label || b.status}
                            status={statusConfig[b.status]?.badge as any}
                            size="small"
                          />
                        </View>
                        <Text style={[styles.tableCellText, { width: 60 }]}>{b.guests}</Text>
                        <Text style={[styles.tableCellText, styles.tableAmountText, { width: 80 }]}>
                          ${b.amount.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
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
        {/* Floating Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <View style={styles.floatingBulkBar}>
            <View style={styles.bulkInfo}>
              <Text style={styles.bulkCountText}>{selectedIds.length} Selected</Text>
            </View>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: "#10B981" }]}
              onPress={() => handleBulkStatusChange("confirmed")}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
              <Text style={styles.bulkActionBtnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => handleBulkStatusChange("cancelled")}
            >
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.bulkActionBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkCloseBtn}
              onPress={() => setSelectedIds([])}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}
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
  searchIcon: { marginEnd: 8 },
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
  miniStats: { gap: 12, paddingStart: 16 },
  miniLabel: {
    fontSize: 10,
    color: UI_COLORS.brandTextMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  miniValue: { fontSize: 18, fontWeight: "800", color: UI_COLORS.white },
  viewModeToggleWrap: {
    flexDirection: "row",
    backgroundColor: UI_COLORS.brandCard,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  viewModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  viewModeBtnActive: {
    backgroundColor: UI_COLORS.brandPrimary,
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_COLORS.brandTextMuted,
  },
  viewModeBtnTextActive: {
    color: "#FFFFFF",
  },
  cardSelectCol: {
    justifyContent: "center",
    paddingRight: 10,
  },
  checkboxTouch: {
    padding: 4,
  },
  bookingCardSelected: {
    borderColor: UI_COLORS.brandPrimary,
    borderWidth: 1.5,
  },
  tableWrapper: {
    flexDirection: "row",
    backgroundColor: UI_COLORS.brandCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    marginTop: 10,
  },
  stickyCol: {
    width: 130,
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#161C2C",
    zIndex: 10,
  },
  stickyHeaderCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 8,
    backgroundColor: "#111624",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  stickyDataCell: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  stickyIdText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stickyCustomerText: {
    fontSize: 11,
    color: UI_COLORS.brandTextMuted,
  },
  tableScroll: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  tableHeaderRow: {
    height: 44,
    backgroundColor: "#111624",
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  tableHeaderCell: {
    height: 44,
    justifyContent: "center",
  },
  tableCell: {
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tableCellText: {
    fontSize: 12,
    color: UI_COLORS.brandText,
  },
  tableAmountText: {
    fontWeight: "700",
    color: UI_COLORS.brandPrimary,
  },
  rowSelected: {
    backgroundColor: "rgba(40, 125, 250, 0.12)",
  },
  floatingBulkBar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  bulkInfo: {
    flex: 1,
  },
  bulkCountText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  bulkActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  bulkActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bulkCloseBtn: {
    padding: 4,
    marginLeft: 4,
  },
  floatingToast: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#6366F1",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingToastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  }
});
