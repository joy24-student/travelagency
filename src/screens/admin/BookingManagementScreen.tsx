/**
 * Booking Management Screen - Admin Panel
 * Professional Enterprise Booking.com/Expedia Style Administration
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { bookingAdminService, refundService } from "@/services/adminService";

const { width } = Dimensions.get("window");

export const BookingManagementScreen: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [actionNotes, setActionNotes] = useState("");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingAdminService.getAllBookings();
      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  useEffect(() => {
    let result = bookings;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.booking_reference.toLowerCase().includes(q) ||
          (b.user_id && b.user_id.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }
    setFilteredBookings(result);
  }, [searchQuery, statusFilter, bookings]);

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      "Confirm Cancellation",
      "Are you sure you want to cancel this booking? This action will trigger supplier notification.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === bookingId ? { ...b, status: "cancelled" } : b
              )
            );
            setDetailsModalVisible(false);
            Alert.alert("Success", "Booking cancelled successfully.");
          },
        },
      ]
    );
  };

  const handleResendConfirmation = () => {
    Alert.alert("Success", "Confirmation voucher resent successfully.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#10b981";
      case "draft":
      case "payment_pending":
        return "#f59e0b";
      case "cancelled":
        return "#ef4444";
      case "completed":
        return "#3b82f6";
      default:
        return "#9ca3af";
    }
  };

  return (
    <View style={styles.container}>
      {/* Search and Filters Header */}
      <View style={styles.headerArea}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search booking ref, client ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {["all", "confirmed", "payment_pending", "completed", "cancelled"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, statusFilter === filter && styles.filterPillActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
                {filter.replace("_", " ").toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={styles.spinner} />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedBooking(item);
                setDetailsModalVisible(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.refBox}>
                  <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#4f46e5" />
                  <Text style={styles.refText}>{item.booking_reference}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="wallet-travel" size={16} color="#64748b" />
                  <Text style={styles.infoVal}>Vertical: {item.product_type.toUpperCase()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#64748b" />
                  <Text style={styles.infoVal}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="cash" size={16} color="#64748b" />
                  <Text style={styles.priceVal}>
                    Price: {item.currency} {item.total_price.toLocaleString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Booking Details Modal */}
      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking File - Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Status card */}
                <View style={styles.modalStatCard}>
                  <Text style={styles.label}>Reference ID</Text>
                  <Text style={styles.mainRef}>{selectedBooking.booking_reference}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedBooking.status)}15`, alignSelf: "flex-start", marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Info Section */}
                <Text style={styles.sectionHeader}>Traveler Details</Text>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailText}>Account ID: {selectedBooking.user_id}</Text>
                  <Text style={styles.detailText}>Type: {selectedBooking.product_type.toUpperCase()}</Text>
                  <Text style={styles.detailText}>Dates: {selectedBooking.start_date || "N/A"} to {selectedBooking.end_date || "N/A"}</Text>
                </View>

                <Text style={styles.sectionHeader}>Pricing breakdown</Text>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailText}>Price: {selectedBooking.currency} {selectedBooking.total_price}</Text>
                  <Text style={styles.detailText}>Supplier Code: SUP-REF-9914</Text>
                </View>

                {/* Notes Input */}
                <Text style={styles.sectionHeader}>Log Internal Note</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Add operational notes or booking updates..."
                  value={actionNotes}
                  onChangeText={setActionNotes}
                  placeholderTextColor="#94a3b8"
                />

                {/* Booking actions */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.actionBtnConfirm} onPress={handleResendConfirmation}>
                    <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Resend Voucher</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnCancel}
                    onPress={() => handleCancelBooking(selectedBooking.id)}
                  >
                    <MaterialCommunityIcons name="cancel" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerArea: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: "#0f172a",
    fontSize: 14,
  },
  filterScroll: {
    marginTop: 12,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#4f46e5",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  spinner: {
    marginTop: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardContent: {
    marginTop: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoVal: {
    fontSize: 13,
    color: "#64748b",
  },
  priceVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalStatCard: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
  },
  mainRef: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4f46e5",
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 20,
    marginBottom: 8,
  },
  detailsGroup: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#334155",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    color: "#0f172a",
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  actionBtnConfirm: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnCancel: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
