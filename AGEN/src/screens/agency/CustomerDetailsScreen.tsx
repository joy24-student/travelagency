import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY } from "../../App";
import { Card, Button, Badge, ListItem, StatCard } from "../ui/UIComponents";
import { agencyCustomersService } from "../../services/agencyService";
import { useAuth } from "../../hooks/useAuth";

type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetails: { customerId: string };
};

type Props = NativeStackScreenProps<CustomersStackParamList, "CustomerDetails">;

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  profileImage?: string;
  vip: boolean;
  bookingsCount: number;
  totalSpent: number;
  joinDate: string;
  lastBooking: string;
  status: "active" | "inactive" | "suspended";
}

interface BookingHistory {
  id: string;
  tourName: string;
  date: string;
  amount: number;
  status: string;
}

export default function CustomerDetailsScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { customerId } = route.params;
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetail>({
    id: customerId,
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "+1 (555) 987-6543",
    location: "New York, USA",
    vip: true,
    bookingsCount: 8,
    totalSpent: 15800,
    joinDate: "2023-06-15",
    lastBooking: "2024-05-20",
    status: "active",
  });

  const [bookingHistory] = useState<BookingHistory[]>([
    {
      id: "BK001",
      tourName: "Bali Beach Paradise",
      date: "2024-05-20",
      amount: 2400,
      status: "completed",
    },
    {
      id: "BK002",
      tourName: "Swiss Alps Adventure",
      date: "2024-04-10",
      amount: 3200,
      status: "completed",
    },
    {
      id: "BK003",
      tourName: "Paris City Tour",
      date: "2024-03-05",
      amount: 1800,
      status: "completed",
    },
  ]);

  React.useEffect(() => {
    loadCustomerDetails();
  }, [customerId]);

  const loadCustomerDetails = async () => {
    if (!user?.agency?.id) return;
    setLoading(true);
    try {
      // In production, fetch from Supabase
      // const details = await agencyCustomersService.getCustomerDetails(customerId);
      // setCustomer(details);
    } catch (error) {
      console.error("Error loading customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: CustomerDetail["status"]) => {
    setCustomer({ ...customer, status: newStatus });
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
          <Text style={styles.headerTitle}>Customer Details</Text>
          <Text style={styles.headerSubtitle}>Profile & Booking History</Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName}>{customer.name}</Text>
                {customer.vip && (
                  <Badge label="VIP" status="success" size="small" />
                )}
              </View>
              <Text style={styles.statusText}>{customer.status}</Text>
            </View>
          </View>
        </Card>

        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
          <StatCard
            label="Total Bookings"
            value={customer.bookingsCount.toString()}
            icon="calendar"
            color={COLORS.primary}
          />
          <StatCard
            label="Total Spent"
            value={`$${customer.totalSpent}`}
            icon="currency-usd"
            color={COLORS.secondary}
          />
        </View>

        {/* Contact Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <ListItem
            title="Email"
            subtitle={customer.email}
            icon="mail"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Phone"
            subtitle={customer.phone}
            icon="call"
            rightIcon={false}
          />
          <View style={styles.divider} />
          <ListItem
            title="Location"
            subtitle={customer.location}
            icon="map-marker"
            rightIcon={false}
          />
        </Card>

        {/* Account Information */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {new Date(customer.joinDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Booking</Text>
            <Text style={styles.infoValue}>
              {new Date(customer.lastBooking).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Badge label={customer.status} status={customer.status as any} />
          </View>
        </Card>

        {/* Booking History */}
        <Card style={styles.card}>
          <View style={styles.historyHeader}>
            <Text style={styles.cardTitle}>Booking History</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {bookingHistory.map((booking, index) => (
            <View key={booking.id}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.bookingItem}
                onPress={() => {
                  // Navigate to booking details
                  navigation.goBack();
                }}
              >
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingTitle}>{booking.tourName}</Text>
                  <Text style={styles.bookingDate}>
                    {new Date(booking.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.bookingAmount}>
                  <Text style={styles.amount}>${booking.amount}</Text>
                  <Badge
                    label={booking.status}
                    status={booking.status as any}
                    size="small"
                  />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Send Message"
            variant="primary"
            onPress={() => {}}
            icon="send"
          />
          <Button
            title="Create Booking"
            variant="secondary"
            onPress={() => {}}
            icon="plus"
          />
        </View>

        {/* Status Management */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account Status</Text>
          <View style={styles.statusButtons}>
            {(["active", "inactive", "suspended"] as const).map((status) => (
              <Button
                key={status}
                title={status.charAt(0).toUpperCase() + status.slice(1)}
                variant={customer.status === status ? "primary" : "outline"}
                size="small"
                onPress={() => handleStatusChange(status)}
              />
            ))}
          </View>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  customerName: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 8,
  },
  statusText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
  },
  metricsContainer: {
    gap: 12,
    marginBottom: 16,
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.primary,
    fontWeight: "600",
  },
  bookingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
    color: COLORS.text,
  },
  bookingDate: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  bookingAmount: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
