/**
 * Customer Profile Screen
 * Displays detailed information about a specific customer, including contact info,
 * booking history, and preferences.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // Ensure LinearGradient is imported
import { COLORS } from "../../App";

const { width } = Dimensions.get("window");

// Mock Data for Customer Profile
interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  isVIP: boolean;
  totalBookings: number;
  lastTripDate: string;
  favoriteDestinations: {
    id: string;
    name: string;
    visits: number;
    imageUrl: string;
  }[];
  recentBookings: {
    id: string;
    tourName: string;
    date: string;
    status: "confirmed" | "pending" | "completed";
    amount: number;
  }[];
}

const mockCustomer: CustomerProfile = {
  id: "cust123",
  name: "Cameron Williamson",
  email: "cameron@gmail.com",
  phone: "+1 202 555 0175",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAM9c-A-xlOiGkntFbjGSw8obYUwzJEIS0SCO3SdQEH18qZJP7lluNZybxavPetXlu2XPXuUoYQqqoAED1JNQuGEKPQPbnWNrWy13rM461E7GX3XpinopbMaWZNVTChLAhrUYMcdzL3PdQrq2hasgwKWf4fA36S6pckICooTMUxu0mYtwNRh3KpLzCPrdUmiuPy2v0UjIp9DytqnXNaktqfV0db2YXIcUQ_BjY0s5yGGoCC8cTigWHwQ5z7LcNf-ksrmwN8Cki2VTk",
  isVIP: true,
  totalBookings: 12,
  lastTripDate: "May 2024",
  favoriteDestinations: [
    {
      id: "dest1",
      name: "Bali",
      visits: 4,
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAaiMFQvrrWu0PYwgBDMaDUbCZwQOfxVHbUt-iVW6pGOUTxv-oErkj--29n5O44ClEjyQGp_1b_mHjDQuRCo1pqhLqkWkyQghzT6-dKDy761LfZNSyMBHdBW7cdshgZpE_qEo015oeHS253MjZPNkbinwjVkaEW9IRpUAcLGnK6BRWexNbk7oPjVPn2lYkvHVWCoq2aW8aKm4dQk9htP_NDaGd3U3U-JDxoCw_AMlhtlAqWj58S7-AuFJjn04_edpIjGM-YQtcHmhg",
    },
    {
      id: "dest2",
      name: "Switzerland",
      visits: 2,
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAo4gSfnH9L8nxNQx4rS5OOvMFJWWXjV46w0Q0I34N3VLjsXt5H_lz3jP0bV1dlMFy9aFgCkKlKmCJHgNwBwH20b9KjmQqCKGn06NiqpUU83hE61Eo1R9RpqubrDGl2EBcsXCMcw7bH7Sx_lAbpDHvivNP8HGFHZ079g2tbeghopTiVxp0eVzu3PQB9VtNk2jE2aqxkiN8jFJO7HGyngrk0ox3PsvcN9mTVHHYALfH6wz_x8SyNnVbmWLtsoK5F_nPBOzNbU4a02RA",
    },
    {
      id: "dest3",
      name: "Maldives",
      visits: 3,
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBkgoGe9M2KuOj-Z6tWnNO2PxJvdvxPKmTa0FDlspSK7QgWFVrG_z2TQYo8RgxzYz9Sk-Y3rIQkBq0KLatni9EqEXrnXxHfNrDEerCbjFnIX_u_Z1cNkl9u8rb9qoU-3RRvqxh5fQIVxrHWbzK9foZj5W7I2nCDMcdS7lRKGGXbbO9uNfuxwc-nE4OLsF3DEcRJYC0XCOGajo73CnYqo0w2YyYauySba_-20otpQ7wI42ToICJDH2U2051tjjt6pEN3fcXdSvkmt6U",
    },
  ],
  recentBookings: [
    {
      id: "b1",
      tourName: "Luxury Bali Retreat",
      date: "2024-05-10",
      status: "completed",
      amount: 3500,
    },
    {
      id: "b2",
      tourName: "Swiss Alps Ski Adventure",
      date: "2024-03-20",
      status: "completed",
      amount: 4800,
    },
    {
      id: "b3",
      tourName: "Paris City Break",
      date: "2024-01-15",
      status: "completed",
      amount: 1200,
    },
  ],
};

export default function CustomerProfileScreen({ navigation, route }: any) {
  const { customerId, name, avatarUrl } = route?.params || {};
  // In a real app, you would fetch customer data based on customerId
  // For now, we'll use mockCustomer and override name/avatar if passed
  const [customer, setCustomer] = useState<CustomerProfile>({
    ...mockCustomer,
    name: name || mockCustomer.name,
    avatarUrl: avatarUrl || mockCustomer.avatarUrl,
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top AppBar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Section */}
        <View style={styles.heroSection}>
          {/* Background Decorative Glow */}
          <View style={styles.heroGlow} />
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBorder}>
                <Image
                  source={{ uri: customer.avatarUrl || mockCustomer.avatarUrl }}
                  style={styles.avatar}
                />
              </View>
              {customer.isVIP && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              )}
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.customerName}>
                {customer.name || mockCustomer.name}
              </Text>
              <View style={styles.contactRow}>
                <MaterialIcons
                  name="mail"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.contactText}>{customer.email}</Text>
                <Text style={styles.contactSeparator}>|</Text>
                <MaterialIcons
                  name="phone"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.contactText}>{customer.phone}</Text>
              </View>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.callButton}>
                  <MaterialIcons name="call" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton}>
                  <MaterialIcons name="forum" size={20} color={COLORS.text} />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emailButton}>
                  <MaterialIcons
                    name="alternate-email"
                    size={20}
                    color={COLORS.text}
                  />
                  <Text style={styles.actionButtonText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Stats Bento */}
            <View style={styles.statsBento}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Bookings</Text>
                <Text style={styles.statValuePrimary}>
                  {customer.totalBookings}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Last Trip</Text>
                <Text style={styles.statValue}>{customer.lastTripDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Favorite Destinations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons
                name="favorite"
                size={20}
                color={COLORS.secondary}
              />
              <Text style={styles.sectionTitle}>Favorite Destinations</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewMapText}>View Map</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.destinationsGrid}>
            {customer.favoriteDestinations.map((dest) => (
              <TouchableOpacity key={dest.id} style={styles.destinationCard}>
                <Image
                  source={{ uri: dest.imageUrl }}
                  style={styles.destinationImage}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.destinationOverlay}
                />
                <View style={styles.destinationInfo}>
                  <Text style={styles.destinationName}>{dest.name}</Text>
                  <Text style={styles.destinationVisits}>
                    {dest.visits} Visits
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons
                name="airplane-ticket"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.viewMapText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentBookingsList}>
            {customer.recentBookings.map((booking) => (
              <TouchableOpacity key={booking.id} style={styles.bookingItem}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingTourName}>{booking.tourName}</Text>
                  <Text style={styles.bookingDate}>{booking.date}</Text>
                </View>
                <View style={styles.bookingAmountStatus}>
                  <Text style={styles.bookingAmount}>
                    ${booking.amount.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.bookingStatus,
                      {
                        color:
                          booking.status === "completed"
                            ? COLORS.success
                            : COLORS.warning,
                      },
                    ]}
                  >
                    {booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // Black background
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(19, 27, 46, 0.4)", // surface-container-low/40
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingTop: Platform.OS === "android" ? 20 : 0, // Adjust for Android status bar
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    borderRightColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 5, // For Android shadow
  },
  heroSection: {
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.3)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 5,
      },
    }),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    borderRightColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -96,
    right: -96,
    width: 256,
    height: 256,
    backgroundColor: "rgba(195, 192, 255, 0.2)", // primary/20
    borderRadius: 128,
    // No direct blur equivalent for View, can use ImageBlurView or SVG for more complex effects
  },
  heroContent: {
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    zIndex: 1,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarBorder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: "rgba(195, 192, 255, 0.3)", // primary/30
    padding: 4,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    objectFit: "cover",
  },
  vipBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999, // full
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  vipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
  infoContainer: {
    flex: 1,
    alignItems: "center",
  },
  customerName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  contactSeparator: {
    color: COLORS.textTertiary,
    marginHorizontal: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4338ca", // primary-container from HTML
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    gap: 8,
    shadowColor: "rgba(67,56,202,0.4)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 5,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    gap: 8,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  statsBento: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
  statCard: {
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.3)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 5,
      },
    }),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    borderRightColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValuePrimary: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
  },
  viewMapText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  destinationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  destinationCard: {
    width: (width - 40 - 16 * 2) / 3, // (screen width - horizontal padding - 2 gaps) / 3
    aspectRatio: 1, // Make it square
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    borderRightColor: "rgba(0, 0, 0, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 5,
  },
  destinationImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  destinationOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  destinationInfo: {
    position: "absolute",
    bottom: 12,
    left: 16,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  destinationVisits: {
    fontSize: 12,
    color: "#acedff", // secondary-fixed from HTML
  },
  recentBookingsList: {
    gap: 12,
  },
  bookingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.3)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: {
        elevation: 5,
      },
    }),
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderBottomColor: "rgba(0, 0, 0, 0.3)",
    borderRightColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 16,
    padding: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTourName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  bookingDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  bookingAmountStatus: {
    alignItems: "flex-end",
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
