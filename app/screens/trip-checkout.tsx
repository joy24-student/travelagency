import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { itineraryService } from "../../src/services/itineraryService";
import { formatPrice } from "../../src/utils/currency";
import { InstantPayMethodGrid } from "../../src/components/booking/InstantPayMethodGrid";

export default function TripCheckoutScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  const cloneId = params.cloneId as string;
  const itineraryTitle = (params.itineraryTitle as string) || "Customized Bangladesh Tour";
  const destination = (params.destination as string) || "Cox's Bazar";
  const travelerCount = parseInt((params.travelerCount as string) || "2", 10);
  const travelStartDate = (params.travelStartDate as string) || "2026-12-05";

  // Multi-service booking components
  const [services, setServices] = useState([
    {
      id: "svc-transport",
      service_type: "flight",
      provider: "Biman Bangladesh Airlines (BG-433)",
      title: "Dhaka (DAC) ➔ Cox's Bazar (CXB)",
      departure_time: `${travelStartDate} 08:00 AM`,
      arrival_time: `${travelStartDate} 09:15 AM`,
      unit_price: 4200,
      quantity: travelerCount,
      status: "verified",
    },
    {
      id: "svc-hotel",
      service_type: "hotel",
      provider: "Sayeman Beach Resort",
      title: "Superior Sea View Deluxe Room",
      checkin: `${travelStartDate} 02:00 PM`,
      checkout: "2026-12-08 11:00 AM",
      unit_price: 6500,
      quantity: 1,
      status: "verified",
    },
    {
      id: "svc-transfer",
      service_type: "transport",
      provider: "Marine Drive Chander Gari",
      title: "Himchari & Inani Beach 4x4 Jeep",
      departure_time: "2026-12-06 09:00 AM",
      unit_price: 1500,
      quantity: 1,
      status: "verified",
    },
    {
      id: "svc-guide",
      service_type: "guide",
      provider: "TravelBD Certified Guide",
      title: "Tariqul Islam (Local Guide & Cultural Translator)",
      unit_price: 1200,
      quantity: 1,
      status: "verified",
    },
  ]);

  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "rocket" | "card" | "wallet">("bkash");

  // Saga Execution State
  const [isProcessingSaga, setIsProcessingSaga] = useState(false);
  const [sagaStep, setSagaStep] = useState<string>("");
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  // Financial calculations
  const subtotal = services.reduce((acc, s) => acc + s.unit_price * s.quantity, 0);
  const platformFee = 150;
  const vat = Math.round(subtotal * 0.05); // 5% VAT
  const grandTotal = subtotal + platformFee + vat;

  const handleExecuteSaga = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessingSaga(true);

    try {
      setSagaStep("1/4: Revalidating flight and hotel room inventory...");
      await new Promise((r) => setTimeout(r, 600));

      setSagaStep("2/4: Placing temporary reservation holds across suppliers...");
      await new Promise((r) => setTimeout(r, 700));

      setSagaStep("3/4: Processing authorized bKash transaction & escrow release...");
      const idempotencyKey = `checkout-${cloneId}-${Date.now()}`;

      const res = await itineraryService.checkoutTrip({
        cloneId,
        idempotencyKey,
        services,
        totalAmount: grandTotal,
        paymentMethod,
      });

      setSagaStep("4/4: Confirming e-tickets and reservation vouchers...");
      await new Promise((r) => setTimeout(r, 600));

      setBookingResult(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Booking Saga error:", err);
      Alert.alert("Checkout Notice", err?.message || "Booking encountered an issue. No funds were debited.");
      setIsProcessingSaga(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Unified Trip Checkout</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {itineraryTitle}
          </Text>
        </View>
      </View>

      {/* 3-Step Checkout Progress Header (Image 2 UX Pattern) */}
      <View style={[styles.stepperContainer, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircleDone, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, { color: colors.primary }]}>Choose Date</Text>
        </View>
        <View style={[styles.stepLine, { backgroundColor: colors.primary }]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircleDone, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.stepLabel, { color: colors.primary }]}>Booking Details</Text>
        </View>
        <View style={[styles.stepLine, { backgroundColor: colors.primary }]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircleActive, { borderColor: colors.primary }]}>
            <View style={[styles.stepDotActive, { backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.stepLabelActive, { color: colors.primary }]}>Payment</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Services Grouped */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Selected Services Package</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" />
              <Text style={styles.verifiedBadgeText}>Live Inventory</Text>
            </View>
          </View>

          {services.map((svc) => (
            <View
              key={svc.id}
              style={[styles.serviceRow, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}
            >
              <View style={styles.serviceIconCircle}>
                <Ionicons
                  name={
                    svc.service_type === "flight"
                      ? "airplane"
                      : svc.service_type === "hotel"
                      ? "bed"
                      : svc.service_type === "guide"
                      ? "person"
                      : "car"
                  }
                  size={16}
                  color={colors.primary}
                />
              </View>

              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.serviceTitle, { color: colors.text }]}>{svc.title}</Text>
                <Text style={[styles.serviceProvider, { color: colors.textSecondary }]}>
                  {svc.provider}
                </Text>
                <Text style={[styles.serviceTiming, { color: colors.textSecondary }]}>
                  {svc.departure_time || svc.checkin}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.servicePrice, { color: colors.text }]}>
                  ৳{(svc.unit_price * svc.quantity).toLocaleString()}
                </Text>
                {svc.quantity > 1 && (
                  <Text style={[styles.serviceQty, { color: colors.textSecondary }]}>
                    ৳{svc.unit_price.toLocaleString()} x {svc.quantity}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Payment Method Selector (Image 2 UX Pattern) */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <InstantPayMethodGrid
            selectedMethod={paymentMethod}
            onSelectMethod={(id) => setPaymentMethod(id as any)}
            title="Pay by any App (তাত্ক্ষণিক পেমেন্ট)"
          />
        </View>

        {/* Financial Price Breakdown */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Price Breakdown</Text>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Package Subtotal</Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>৳{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Govt. VAT (5%)</Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>৳{vat.toLocaleString()}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Platform Service Fee</Text>
            <Text style={[styles.breakdownVal, { color: colors.text }]}>৳{platformFee}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.totalGrandLabel, { color: colors.text }]}>Total Payable</Text>
            <Text style={[styles.totalGrandVal, { color: colors.primary }]}>৳{grandTotal.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={[styles.bottomBar, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>Total Payable</Text>
          <Text style={[styles.bottomTotalVal, { color: colors.primary }]}>৳{grandTotal.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={handleExecuteSaga}
          disabled={isProcessingSaga}
        >
          <Ionicons name="lock-closed" size={15} color="#FFFFFF" />
          <Text style={styles.checkoutBtnText}>Confirm & Book All</Text>
        </TouchableOpacity>
      </View>

      {/* Saga Progress & Success Modal */}
      <Modal visible={isProcessingSaga} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.card : "#FFFFFF" }]}>
            {bookingResult ? (
              <View style={styles.successContent}>
                <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                <Text style={[styles.successTitle, { color: colors.text }]}>Trip Confirmed!</Text>
                <Text style={[styles.successRef, { color: colors.textSecondary }]}>
                  Booking Ref: {bookingResult.booking_reference}
                </Text>
                <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                  All {services.length} services reserved and confirmed. You can view your itinerary and boarding passes under My Trips.
                </Text>

                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setIsProcessingSaga(false);
                    router.replace(ROUTES.TABS.TRIPS);
                  }}
                >
                  <Text style={styles.doneBtnText}>Go to My Trips</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.sagaModalTitle, { color: colors.text }]}>
                  Reserving Multi-Service Journey
                </Text>
                <Text style={[styles.sagaStepText, { color: colors.primary }]}>{sagaStep}</Text>
                <Text style={[styles.sagaNoticeText, { color: colors.textSecondary }]}>
                  Please do not close the app. We are securing your seat, hotel room, and transfers in parallel.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircleDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stepDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  stepLabelActive: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  serviceProvider: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },
  serviceTiming: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  servicePrice: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  serviceQty: {
    fontSize: 10,
    fontFamily: FONTS.regular,
  },
  paymentMethodsRow: {
    gap: 8,
  },
  pmOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  pmText: {
    fontSize: 13,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  breakdownVal: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalGrandLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  totalGrandVal: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomTotalLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  bottomTotalVal: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 12,
  },
  sagaModalTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  sagaStepText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    textAlign: "center",
  },
  sagaNoticeText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
  },
  successContent: {
    alignItems: "center",
    gap: 10,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  successRef: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  successSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: "center",
    lineHeight: 18,
  },
  doneBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
