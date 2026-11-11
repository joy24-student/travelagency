/**
 * B2BSearchBookingScreen.tsx
 * Agency B2B Search & Wholesale Instant Booking Screen
 * Enables travel agents to search Flights & Hotels at wholesale net fares,
 * apply custom agency markup, calculate client price, and hold or issue PNRs.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";

const THEME = {
  bg: "#0B1326",
  card: "#171F33",
  cardAlt: "#1C253B",
  primary: "#4F46E5",
  accent: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "rgba(255, 255, 255, 0.1)",
};

interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  netFare: number;
  seatsAvailable: number;
  baggage: string;
}

interface HotelResult {
  id: string;
  name: string;
  location: string;
  stars: number;
  roomType: string;
  netRatePerNight: number;
  availableRooms: number;
  rating: number;
}

const SAMPLE_FLIGHTS: FlightResult[] = [
  {
    id: "FL-101",
    airline: "Biman Bangladesh Airlines",
    flightNumber: "BG-049",
    from: "DAC (Dhaka)",
    to: "DXB (Dubai)",
    departureTime: "08:30 PM",
    arrivalTime: "11:55 PM",
    duration: "5h 25m",
    stops: "Non-stop",
    netFare: 48500,
    seatsAvailable: 7,
    baggage: "30 KG",
  },
  {
    id: "FL-102",
    airline: "US-Bangla Airlines",
    flightNumber: "BS-315",
    from: "DAC (Dhaka)",
    to: "BKK (Bangkok)",
    departureTime: "10:15 AM",
    arrivalTime: "01:45 PM",
    duration: "2h 30m",
    stops: "Non-stop",
    netFare: 29800,
    seatsAvailable: 12,
    baggage: "25 KG",
  },
  {
    id: "FL-103",
    airline: "Emirates",
    flightNumber: "EK-583",
    from: "DAC (Dhaka)",
    to: "LHR (London Heathrow)",
    departureTime: "01:20 AM",
    arrivalTime: "01:10 PM",
    duration: "15h 50m",
    stops: "1 Stop (DXB)",
    netFare: 89000,
    seatsAvailable: 4,
    baggage: "35 KG",
  },
  {
    id: "FL-104",
    airline: "Novoair",
    flightNumber: "VQ-921",
    from: "DAC (Dhaka)",
    to: "CXB (Cox's Bazar)",
    departureTime: "09:00 AM",
    arrivalTime: "10:05 AM",
    duration: "1h 05m",
    stops: "Non-stop",
    netFare: 5200,
    seatsAvailable: 15,
    baggage: "20 KG",
  },
];

const SAMPLE_HOTELS: HotelResult[] = [
  {
    id: "HT-201",
    name: "Sayeman Beach Resort",
    location: "Cox's Bazar, Bangladesh",
    stars: 5,
    roomType: "Ocean View Deluxe King",
    netRatePerNight: 9500,
    availableRooms: 5,
    rating: 4.8,
  },
  {
    id: "HT-202",
    name: "InterContinental Dhaka",
    location: "Dhaka, Bangladesh",
    stars: 5,
    roomType: "Club Executive King",
    netRatePerNight: 16800,
    availableRooms: 8,
    rating: 4.9,
  },
  {
    id: "HT-203",
    name: "Grand Sylhet Hotel & Resort",
    location: "Sylhet, Bangladesh",
    stars: 5,
    roomType: "Superior Mountain View",
    netRatePerNight: 7200,
    availableRooms: 10,
    rating: 4.7,
  },
];

export default function B2BSearchBookingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"flights" | "hotels">("flights");

  // Flight search params
  const [origin, setOrigin] = useState("DAC (Dhaka)");
  const [destination, setDestination] = useState("DXB (Dubai)");
  const [markupType, setMarkupType] = useState<"percentage" | "flat">("percentage");
  const [markupValue, setMarkupValue] = useState("7"); // 7% default B2B markup

  // Booking Modal
  const [selectedItem, setSelectedItem] = useState<FlightResult | HotelResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute calculated selling price with agency markup
  const calculateSellingPrice = (netRate: number) => {
    const val = parseFloat(markupValue) || 0;
    if (markupType === "percentage") {
      return Math.round(netRate + (netRate * val) / 100);
    }
    return Math.round(netRate + val);
  };

  const calculateCommission = (netRate: number) => {
    return calculateSellingPrice(netRate) - netRate;
  };

  const handleOpenBooking = (item: FlightResult | HotelResult) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleConfirmBooking = (actionType: "hold" | "issue") => {
    if (!passengerName.trim()) {
      Alert.alert("Required", "Please enter primary passenger/guest name.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setModalVisible(false);
      const isFlight = activeTab === "flights";
      const pnr = `SJ-${Math.floor(100000 + Math.random() * 900000)}`;
      Alert.alert(
        actionType === "issue" ? "Ticket Issued Successfully!" : "PNR On Hold",
        `PNR: ${pnr}\nGuest: ${passengerName}\nAgency Markup Earned: ৳${calculateCommission(
          isFlight
            ? (selectedItem as FlightResult).netFare
            : (selectedItem as HotelResult).netRatePerNight
        ).toLocaleString()}`,
        [{ text: "OK" }]
      );
      setPassengerName("");
      setPassportNumber("");
      setPassengerPhone("");
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>B2B Wholesale Booking</Text>
          <Text style={styles.headerSub}>Exclusive Agent Net Fares & Markups</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service Switcher Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "flights" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("flights")}
          >
            <MaterialCommunityIcons
              name="airplane"
              size={18}
              color={activeTab === "flights" ? "#FFF" : THEME.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "flights" && styles.tabTextActive,
              ]}
            >
              Wholesale Flights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "hotels" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("hotels")}
          >
            <MaterialCommunityIcons
              name="office-building"
              size={18}
              color={activeTab === "hotels" ? "#FFF" : THEME.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "hotels" && styles.tabTextActive,
              ]}
            >
              B2B Hotels
            </Text>
          </TouchableOpacity>
        </View>

        {/* Agency Markup Settings Bar */}
        <View style={styles.markupCard}>
          <View style={styles.markupHeader}>
            <View style={styles.rowCenter}>
              <MaterialCommunityIcons
                name="calculator"
                size={20}
                color={THEME.accent}
              />
              <Text style={styles.markupTitle}>Agency Custom Markup Engine</Text>
            </View>
            <View style={styles.markupTypeSelector}>
              <TouchableOpacity
                onPress={() => setMarkupType("percentage")}
                style={[
                  styles.markupTypeBtn,
                  markupType === "percentage" && styles.markupTypeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.markupTypeTxt,
                    markupType === "percentage" && styles.markupTypeTxtActive,
                  ]}
                >
                  %
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMarkupType("flat")}
                style={[
                  styles.markupTypeBtn,
                  markupType === "flat" && styles.markupTypeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.markupTypeTxt,
                    markupType === "flat" && styles.markupTypeTxtActive,
                  ]}
                >
                  ৳ Flat
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.markupInputRow}>
            <Text style={styles.inputLabel}>
              {markupType === "percentage" ? "Markup Percentage (%):" : "Markup Amount (BDT):"}
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={markupValue}
                onChangeText={setMarkupValue}
                keyboardType="numeric"
                style={styles.markupInput}
                placeholder="0"
                placeholderTextColor={THEME.textMuted}
              />
              <Text style={styles.inputSuffix}>
                {markupType === "percentage" ? "%" : "BDT"}
              </Text>
            </View>
          </View>
          <Text style={styles.markupHint}>
            This markup is automatically added to client invoices and retained as your agency profit.
          </Text>
        </View>

        {/* Flight Inventory Section */}
        {activeTab === "flights" ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionHeading}>Available B2B Flight Fares</Text>
            {SAMPLE_FLIGHTS.map((flight) => {
              const sellingPrice = calculateSellingPrice(flight.netFare);
              const profit = calculateCommission(flight.netFare);

              return (
                <View key={flight.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.airlineBadge}>
                      <MaterialCommunityIcons
                        name="airplane-takeoff"
                        size={16}
                        color={THEME.primary}
                      />
                      <Text style={styles.airlineName}>{flight.airline}</Text>
                    </View>
                    <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
                  </View>

                  <View style={styles.routeRow}>
                    <View>
                      <Text style={styles.timeText}>{flight.departureTime}</Text>
                      <Text style={styles.cityText}>{flight.from}</Text>
                    </View>
                    <View style={styles.durationCol}>
                      <Text style={styles.durationText}>{flight.duration}</Text>
                      <View style={styles.flightLine} />
                      <Text style={styles.stopsText}>{flight.stops}</Text>
                    </View>
                    <View style={styles.alignRight}>
                      <Text style={styles.timeText}>{flight.arrivalTime}</Text>
                      <Text style={styles.cityText}>{flight.to}</Text>
                    </View>
                  </View>

                  <View style={styles.priceDivider} />

                  <View style={styles.pricingRow}>
                    <View>
                      <Text style={styles.fareLabel}>B2B Net Fare</Text>
                      <Text style={styles.netFareVal}>৳{flight.netFare.toLocaleString()}</Text>
                    </View>
                    <View>
                      <Text style={styles.fareLabel}>Client Total</Text>
                      <Text style={styles.clientPriceVal}>৳{sellingPrice.toLocaleString()}</Text>
                    </View>
                    <View style={styles.profitBadge}>
                      <Text style={styles.profitLabel}>Your Profit</Text>
                      <Text style={styles.profitVal}>+৳{profit.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={styles.holdBtn}
                      onPress={() => handleOpenBooking(flight)}
                    >
                      <Text style={styles.holdBtnTxt}>Hold PNR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.issueBtn}
                      onPress={() => handleOpenBooking(flight)}
                    >
                      <LinearGradient
                        colors={["#4F46E5", "#4338CA"]}
                        style={styles.gradientBtn}
                      >
                        <Text style={styles.issueBtnTxt}>Issue Ticket</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionHeading}>Available B2B Hotel Tariffs</Text>
            {SAMPLE_HOTELS.map((hotel) => {
              const sellingPrice = calculateSellingPrice(hotel.netRatePerNight);
              const profit = calculateCommission(hotel.netRatePerNight);

              return (
                <View key={hotel.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.hotelName}>{hotel.name}</Text>
                      <Text style={styles.hotelLocation}>
                        <Ionicons name="location-outline" size={12} color={THEME.textMuted} /> {hotel.location}
                      </Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#FBBF24" />
                      <Text style={styles.ratingText}>{hotel.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.roomTypeRow}>
                    <MaterialCommunityIcons name="bed-king-outline" size={18} color={THEME.accent} />
                    <Text style={styles.roomTypeText}>{hotel.roomType}</Text>
                  </View>

                  <View style={styles.priceDivider} />

                  <View style={styles.pricingRow}>
                    <View>
                      <Text style={styles.fareLabel}>Wholesale Net</Text>
                      <Text style={styles.netFareVal}>৳{hotel.netRatePerNight.toLocaleString()}/night</Text>
                    </View>
                    <View>
                      <Text style={styles.fareLabel}>Selling Rate</Text>
                      <Text style={styles.clientPriceVal}>৳{sellingPrice.toLocaleString()}</Text>
                    </View>
                    <View style={styles.profitBadge}>
                      <Text style={styles.profitLabel}>Agency Profit</Text>
                      <Text style={styles.profitVal}>+৳{profit.toLocaleString()}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.hotelBookBtn}
                    onPress={() => handleOpenBooking(hotel)}
                  >
                    <LinearGradient
                      colors={["#06B6D4", "#0891B2"]}
                      style={styles.gradientBtn}
                    >
                      <Text style={styles.issueBtnTxt}>Reserve Room with Markup</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Booking / Passenger Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Passenger & Reservation Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Primary Passenger / Guest Name *</Text>
                <TextInput
                  value={passengerName}
                  onChangeText={setPassengerName}
                  placeholder="e.g. Mohammad Rahman"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Passport Number / NID</Text>
                <TextInput
                  value={passportNumber}
                  onChangeText={setPassportNumber}
                  placeholder="e.g. A01928374"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Contact Phone *</Text>
                <TextInput
                  value={passengerPhone}
                  onChangeText={setPassengerPhone}
                  placeholder="e.g. +880 1712-345678"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="phone-pad"
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Payment & Wallet Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Agency Net Rate (Deducted from Wallet):</Text>
                  <Text style={styles.summaryVal}>
                    ৳
                    {activeTab === "flights"
                      ? (selectedItem as FlightResult)?.netFare?.toLocaleString()
                      : (selectedItem as HotelResult)?.netRatePerNight?.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Agency Commission / Profit:</Text>
                  <Text style={styles.summaryProfit}>
                    +৳
                    {selectedItem
                      ? calculateCommission(
                          activeTab === "flights"
                            ? (selectedItem as FlightResult).netFare
                            : (selectedItem as HotelResult).netRatePerNight
                        ).toLocaleString()
                      : "0"}
                  </Text>
                </View>
              </View>

              {isSubmitting ? (
                <ActivityIndicator size="large" color={THEME.primary} style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalHoldBtn}
                    onPress={() => handleConfirmBooking("hold")}
                  >
                    <Text style={styles.modalHoldBtnTxt}>Hold PNR (24h)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalIssueBtn}
                    onPress={() => handleConfirmBooking("issue")}
                  >
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.gradientBtn}
                    >
                      <Text style={styles.issueBtnTxt}>Issue Ticket Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    marginRight: 14,
    padding: 6,
    borderRadius: 8,
    backgroundColor: THEME.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: THEME.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: "#FFF",
  },
  markupCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  markupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  markupTypeSelector: {
    flexDirection: "row",
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    padding: 2,
  },
  markupTypeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  markupTypeBtnActive: {
    backgroundColor: THEME.accent,
  },
  markupTypeTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.textMuted,
  },
  markupTypeTxtActive: {
    color: "#FFF",
  },
  markupInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.cardAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 10,
  },
  markupInput: {
    width: 60,
    paddingVertical: 6,
    color: THEME.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  inputSuffix: {
    color: THEME.accent,
    fontWeight: "700",
    marginLeft: 6,
  },
  markupHint: {
    fontSize: 11,
    color: THEME.textMuted,
    fontStyle: "italic",
  },
  resultsContainer: {
    gap: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 6,
  },
  itemCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  airlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  airlineName: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
  },
  flightNumber: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  cityText: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  durationCol: {
    alignItems: "center",
  },
  durationText: {
    fontSize: 11,
    color: THEME.accent,
    fontWeight: "600",
  },
  flightLine: {
    width: 60,
    height: 1.5,
    backgroundColor: THEME.border,
    marginVertical: 4,
  },
  stopsText: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  priceDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  fareLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 2,
  },
  netFareVal: {
    fontSize: 13,
    color: THEME.textMuted,
    textDecorationLine: "line-through",
  },
  clientPriceVal: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.text,
  },
  profitBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  profitLabel: {
    fontSize: 9,
    color: THEME.success,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  profitVal: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.success,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  holdBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  holdBtnTxt: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  issueBtn: {
    flex: 1.5,
    borderRadius: 10,
    overflow: "hidden",
  },
  gradientBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  issueBtnTxt: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
  hotelName: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.text,
  },
  hotelLocation: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FBBF24",
  },
  roomTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  roomTypeText: {
    fontSize: 12,
    color: THEME.accent,
    fontWeight: "500",
  },
  hotelBookBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.text,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryBox: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.text,
  },
  summaryProfit: {
    fontSize: 13,
    fontWeight: "800",
    color: THEME.success,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  modalHoldBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHoldBtnTxt: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  modalIssueBtn: {
    flex: 1.5,
    borderRadius: 10,
    overflow: "hidden",
  },
});
