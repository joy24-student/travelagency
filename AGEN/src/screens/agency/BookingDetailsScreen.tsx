import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY } from "../../App";
import { Card, Button, Badge, ListItem } from "../ui/UIComponents";
import { agencyBookingsService } from "../../services/agencyService";
import { useAuth } from "../../hooks/useAuth";

type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
};

type Props = NativeStackScreenProps<BookingsStackParamList, "BookingDetails">;

interface BookingDetail {
  id: string;
  tourName: string;
  customer: string;
  email: string;
  phone: string;
  date: string;
  location: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  guests: number;
  amount: number;
  specialRequests: string;
  notes: string;
}

export default function BookingDetailsScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { bookingId } = route.params;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [booking, setBooking] = useState<BookingDetail>({
    id: bookingId,
    tourName: "Bali Explorer Package",
    customer: "John Smith",
    email: "john@example.com",
    phone: "+1234567890",
    date: "2024-07-15",
    location: "Bali, Indonesia",
    status: "confirmed",
    guests: 4,
    amount: 2400,
    specialRequests: "Window seat preferred, vegetarian meals",
    notes: "VIP customer, frequent traveler",
  });

  const [editData, setEditData] = useState(booking);

  React.useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const loadBookingDetails = async () => {
    if (!user?.agency?.id) return;
    setLoading(true);
    try {
      // In production, fetch from Supabase
      // const details = await agencyBookingsService.getBookingDetails(user.agency.id, bookingId);
      // setBooking(details);
    } catch (error) {
      console.error("Error loading booking:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.agency?.id) return;
    setSaving(true);
    try {
      // In production, update in Supabase
      // await agencyBookingsService.updateBooking(user.agency.id, bookingId, editData);
      setBooking(editData);
      setEditMode(false);
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error saving booking:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingDetail["status"]) => {
    if (!user?.agency?.id) return;
    setSaving(true);
    try {
      // In production, update in Supabase
      // await agencyBookingsService.updateBooking(user.agency.id, bookingId, { status: newStatus });
      setBooking({ ...booking, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Text style={styles.headerSubtitle}>{booking.id}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditData(booking);
            setEditModalVisible(true);
          }}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Badge
              label={booking.status}
              status={booking.status}
              size="large"
            />
          </View>
          <View style={styles.statusActions}>
            {["confirmed", "pending", "completed", "cancelled"].map(
              (status) => (
                <Button
                  key={status}
                  title={status.charAt(0).toUpperCase() + status.slice(1)}
                  variant={booking.status === status ? "primary" : "outline"}
                  size="small"
                  onPress={() =>
                    handleStatusChange(status as BookingDetail["status"])
                  }
                  disabled={saving}
                />
              ),
            )}
          </View>
        </Card>

        {/* Tour Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Tour Information</Text>
          <ListItem
            title="Tour Name"
            subtitle={booking.tourName}
            icon="map"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Location"
            subtitle={booking.location}
            icon="location"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Date"
            subtitle={new Date(booking.date).toLocaleDateString()}
            icon="calendar"
            rightIcon={false}
          />
        </Card>

        {/* Customer Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          <ListItem
            title="Name"
            subtitle={booking.customer}
            icon="person"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Email"
            subtitle={booking.email}
            icon="mail"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Phone"
            subtitle={booking.phone}
            icon="call"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Guests"
            subtitle={`${booking.guests} people`}
            icon="people"
            rightIcon={false}
          />
        </Card>

        {/* Booking Details */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>${booking.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Per Person</Text>
            <Text style={styles.detailValue}>
              ${(booking.amount / booking.guests).toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* Special Requests */}
        {booking.specialRequests && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Special Requests</Text>
            <Text style={styles.specialRequests}>
              {booking.specialRequests}
            </Text>
          </Card>
        )}

        {/* Notes */}
        {booking.notes && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Internal Notes</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Send Confirmation"
            variant="primary"
            onPress={() => {}}
            icon="mail"
          />
          <Button
            title="Delete Booking"
            variant="danger"
            onPress={() => {}}
            icon="trash-outline"
          />
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Booking</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tour Name</Text>
              <TextInput
                style={styles.input}
                value={editData.tourName}
                onChangeText={(text) =>
                  setEditData({ ...editData, tourName: text })
                }
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Customer Name</Text>
              <TextInput
                style={styles.input}
                value={editData.customer}
                onChangeText={(text) =>
                  setEditData({ ...editData, customer: text })
                }
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editData.email}
                onChangeText={(text) =>
                  setEditData({ ...editData, email: text })
                }
                keyboardType="email-address"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editData.phone}
                onChangeText={(text) =>
                  setEditData({ ...editData, phone: text })
                }
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Guests</Text>
              <TextInput
                style={styles.input}
                value={editData.guests.toString()}
                onChangeText={(text) =>
                  setEditData({ ...editData, guests: parseInt(text) || 0 })
                }
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={editData.amount.toString()}
                onChangeText={(text) =>
                  setEditData({ ...editData, amount: parseFloat(text) || 0 })
                }
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Special Requests</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={editData.specialRequests}
                onChangeText={(text) =>
                  setEditData({ ...editData, specialRequests: text })
                }
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Internal Notes</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={editData.notes}
                onChangeText={(text) =>
                  setEditData({ ...editData, notes: text })
                }
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Save Changes"
                variant="primary"
                onPress={handleSaveChanges}
                loading={saving}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
    color: COLORS.text,
  },
  specialRequests: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  notes: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body.fontSize,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  modalActions: {
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
});
