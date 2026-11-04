/**
 * Enhanced Payment Screen with Sliding Modals
 * Complete integration with Google Pay, bKash, Nagad
 * Production-ready with database connectivity
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";

import { useAuth } from "../../src/hooks/useAuth";
import { userRepository } from "../../src/services/repositories/user";
import { paymentService } from "../../src/services/paymentService";
import { BottomNav, AiPill } from "../../src/screens/Navigation";

const PRIMARY = "#287dfa";
const { height: WINDOW_HEIGHT } = Dimensions.get("window");

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  fee: number;
}

export default function EnhancedPaymentScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    amount?: string;
    reference?: string;
    hotelName?: string;
    roomType?: string;
    tourTitle?: string;
    passId?: string;
    timeSlot?: string;
    groupSize?: string;
    guideName?: string;
    flightNumber?: string;
    airline?: string;
    origin?: string;
    originCity?: string;
    destination?: string;
    destinationCity?: string;
    cabinClass?: string;
    passengers?: string;
    vehicleName?: string;
    provider?: string;
    category?: string;
    pickupCity?: string;
    dropoffCity?: string;
    rentalDays?: string;
    productType?: string;
    bookingId?: string;
    packageTitle?: string;
    packageId?: string;
    flightInfo?: string;
    duration?: string;
    travelers?: string;
    roomCount?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form fields prefilled from booking params
  const [amount, setAmount] = useState(params.amount || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [reference, setReference] = useState(
    params.reference ||
      (params.packageTitle
        ? `Package: ${params.packageTitle} (${params.duration || "Bundle"})`
        : params.vehicleName
        ? `Rental: ${params.vehicleName} (${params.pickupCity || "Station"})`
        : params.flightNumber
        ? `Flight: ${params.flightNumber} (${params.origin || "DEP"} ➔ ${params.destination || "ARR"})`
        : params.hotelName
        ? `Booking: ${params.hotelName} (${params.roomType || "Room"})`
        : params.tourTitle
        ? `Pass #${params.passId || "TOUR"}: ${params.tourTitle}`
        : "")
  );

  // Animation
  const slideAnim = useRef(new Animated.Value(WINDOW_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const paymentMethods: PaymentMethod[] = [
    {
      id: "google_pay",
      name: "Google Pay",
      icon: "google",
      color: "#4285F4",
      description: "Fast & secure with Google",
      fee: 0,
    },
    {
      id: "bkash",
      name: "bKash",
      icon: "wallet",
      color: "#E2136E",
      description: "Pay with bKash account",
      fee: 1.85,
    },
    {
      id: "nagad",
      name: "Nagad",
      icon: "cash",
      color: "#FF6B00",
      description: "Pay with Nagad wallet",
      fee: 1.49,
    },
  ];

  useEffect(() => {
    loadPayments();
  }, [user?.id]);

  useEffect(() => {
    if (showBottomSheet) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: WINDOW_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showBottomSheet]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await userRepository.getPayments();
      setPayments(data);
    } catch (error) {
      console.error("Load payments error:", error);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentSheet = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setShowBottomSheet(true);
  };

  const closeBottomSheet = () => {
    setShowBottomSheet(false);
    setTimeout(() => {
      setSelectedMethod(null);
      setAmount("");
      setPhone("");
      setEmail("");
      setReference("");
    }, 300);
  };

  const handlePayment = async () => {
    if (!selectedMethod || !user) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (!amount || isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (selectedMethod.id !== "google_pay" && !phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    if (selectedMethod.id === "google_pay" && !email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      setProcessing(true);

      const fee = (paymentAmount * selectedMethod.fee) / 100;
      const totalAmount = paymentAmount + fee;

      // Create payment in database
      const paymentData = {
        amount: totalAmount,
        original_amount: paymentAmount,
        fee: fee,
        method: selectedMethod.id,
        phone: phone || null,
        email: email || null,
        reference: reference || `PAY-${Date.now()}`,
        status: "pending",
      };

      const payment = await userRepository.createPayment(paymentData);

      // Initiate payment with provider
      const result = await paymentService.pay({
        bookingId: payment.id,
        userId: user.id,
        amount: totalAmount,
        currency: "BDT",
        method: selectedMethod.id as any,
        phone: phone || undefined,
        email: email || undefined,
        reference: paymentData.reference,
      });

      if (result.success) {
        // Update payment with transaction ID
        await userRepository.updatePaymentStatus(payment.id, result.status);

        Alert.alert(
          "Payment Initiated",
          `Payment of ${totalAmount.toFixed(2)} BDT initiated successfully.\\n\\n${
            result.redirectUrl
              ? "You will be redirected to complete payment."
              : "Please check your SMS for payment instructions."
          }`,
          [
            {
              text: "OK",
              onPress: () => {
                closeBottomSheet();
                loadPayments();
                
                // Navigate to success or pending page
                if (result.redirectUrl) {
                  // In production, open web view or external browser
                  console.log("Redirect to:", result.redirectUrl);
                }
              },
            },
          ]
        );
      } else {
        throw new Error(result.errorMessage || "Payment failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Payment Failed", error.message || "Unable to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const calculateTotal = () => {
    const paymentAmount = parseFloat(amount) || 0;
    const fee = selectedMethod ? (paymentAmount * selectedMethod.fee) / 100 : 0;
    return paymentAmount + fee;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tour Pass Summary Banner */}
          {params.tourTitle && (
            <View style={styles.passSummaryCard}>
              <View style={styles.passSummaryHeader}>
                <View style={styles.passBadge}>
                  <Ionicons name="ticket" size={14} color="#2563EB" />
                  <Text style={styles.passBadgeText}>DIGITAL TOUR PASS</Text>
                </View>
                {params.passId && (
                  <Text style={styles.passIdBadge}>#{params.passId}</Text>
                )}
              </View>
              <Text style={styles.passTitleText}>{params.tourTitle}</Text>
              <View style={styles.passMetaRow}>
                {params.timeSlot && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="time-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.timeSlot}</Text>
                  </View>
                )}
                {params.groupSize && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="people-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>
                      {params.groupSize} Traveler{Number(params.groupSize) > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {params.guideName && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="person-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.guideName}</Text>
                  </View>
                )}
              </View>
              <View style={styles.passTotalDueRow}>
                <Text style={styles.passTotalDueLabel}>Total Due for Pass:</Text>
                <Text style={styles.passTotalDueValue}>${params.amount || amount}</Text>
              </View>
            </View>
          )}

          {/* Flight Reservation Summary Banner */}
          {params.flightNumber && (
            <View style={styles.flightSummaryCard}>
              <View style={styles.passSummaryHeader}>
                <View style={styles.flightBadge}>
                  <Ionicons name="airplane" size={14} color="#FFFFFF" />
                  <Text style={styles.flightBadgeText}>{params.flightNumber}</Text>
                </View>
                <View style={styles.pendingStatusBadge}>
                  <Text style={styles.pendingStatusText}>RESERVATION PENDING</Text>
                </View>
              </View>

              <View style={styles.flightRouteRow}>
                <View style={styles.flightAirportCol}>
                  <Text style={styles.flightCodeText}>{params.origin || "DEP"}</Text>
                  {params.originCity && <Text style={styles.flightCitySubText}>{params.originCity}</Text>}
                </View>
                <View style={styles.flightArrowCol}>
                  <Ionicons name="arrow-forward" size={16} color="#287dfa" />
                  <Text style={styles.flightDirectText}>Direct</Text>
                </View>
                <View style={[styles.flightAirportCol, { alignItems: "flex-end" }]}>
                  <Text style={styles.flightCodeText}>{params.destination || "ARR"}</Text>
                  {params.destinationCity && <Text style={styles.flightCitySubText}>{params.destinationCity}</Text>}
                </View>
              </View>

              <View style={styles.passMetaRow}>
                {params.airline && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="shield-checkmark-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.airline}</Text>
                  </View>
                )}
                {params.cabinClass && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="ribbon-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.cabinClass}</Text>
                  </View>
                )}
                {params.passengers && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="people-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>
                      {params.passengers} Passenger{Number(params.passengers) > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.passTotalDueRow}>
                <Text style={styles.passTotalDueLabel}>Total Flight Fare:</Text>
                <Text style={styles.passTotalDueValue}>${params.amount || amount}</Text>
              </View>
            </View>
          )}

          {/* Car Rental Reservation Summary Banner */}
          {params.vehicleName && (
            <View style={[styles.flightSummaryCard, { borderColor: "#BAE6FD", backgroundColor: "#F0F9FF" }]}>
              <View style={styles.passSummaryHeader}>
                <View style={[styles.flightBadge, { backgroundColor: "#0284C7" }]}>
                  <Ionicons name="car-sport" size={14} color="#FFFFFF" />
                  <Text style={styles.flightBadgeText}>{params.provider || "CAR RENTAL"}</Text>
                </View>
                <View style={styles.pendingStatusBadge}>
                  <Text style={styles.pendingStatusText}>RESERVATION PENDING</Text>
                </View>
              </View>

              <Text style={[styles.passTitleText, { marginTop: 10, marginBottom: 6 }]}>
                {params.vehicleName}
              </Text>

              <View style={styles.flightRouteRow}>
                <View style={styles.flightAirportCol}>
                  <Text style={styles.flightCitySubText}>Pick-up Location</Text>
                  <Text style={styles.flightCodeText}>{params.pickupCity || "Station"}</Text>
                </View>
                <View style={styles.flightArrowCol}>
                  <Ionicons name="arrow-forward" size={16} color="#0284C7" />
                  <Text style={[styles.flightDirectText, { color: "#0284C7" }]}>
                    {params.rentalDays || "3"} Days
                  </Text>
                </View>
                <View style={[styles.flightAirportCol, { alignItems: "flex-end" }]}>
                  <Text style={styles.flightCitySubText}>Drop-off Location</Text>
                  <Text style={styles.flightCodeText}>{params.dropoffCity || params.pickupCity || "Station"}</Text>
                </View>
              </View>

              <View style={styles.passMetaRow}>
                {params.category && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="pricetag-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.category}</Text>
                  </View>
                )}
                <View style={styles.passMetaTag}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#10B981" />
                  <Text style={[styles.passMetaText, { color: "#059669" }]}>Zero Excess / CDW</Text>
                </View>
                <View style={styles.passMetaTag}>
                  <Ionicons name="speedometer-outline" size={12} color="#4B5563" />
                  <Text style={styles.passMetaText}>Unlimited Mileage</Text>
                </View>
              </View>

              <View style={styles.passTotalDueRow}>
                <Text style={styles.passTotalDueLabel}>Total Rental Amount:</Text>
                <Text style={[styles.passTotalDueValue, { color: "#0284C7" }]}>${params.amount || amount}</Text>
              </View>
            </View>
          )}

          {/* Vacation / Flight + Hotel Package Reservation Summary Banner */}
          {params.packageTitle && (
            <View style={[styles.flightSummaryCard, { borderColor: "#DDD6FE", backgroundColor: "#F5F3FF" }]}>
              <View style={styles.passSummaryHeader}>
                <View style={[styles.flightBadge, { backgroundColor: "#7C3AED" }]}>
                  <Ionicons name="briefcase" size={14} color="#FFFFFF" />
                  <Text style={styles.flightBadgeText}>FLIGHT + HOTEL BUNDLE</Text>
                </View>
                <View style={[styles.pendingStatusBadge, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[styles.pendingStatusText, { color: "#6D28D9" }]}>RESERVATION PENDING</Text>
                </View>
              </View>

              <Text style={[styles.passTitleText, { marginTop: 10, marginBottom: 6 }]}>
                {params.packageTitle}
              </Text>

              {params.flightInfo && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Ionicons name="airplane-outline" size={14} color="#7C3AED" />
                  <Text style={{ fontSize: 13, color: "#4B5563", fontWeight: "600" }}>{params.flightInfo}</Text>
                </View>
              )}

              {params.hotelName && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="business-outline" size={14} color="#7C3AED" />
                  <Text style={{ fontSize: 13, color: "#4B5563", fontWeight: "600" }}>{params.hotelName}</Text>
                </View>
              )}

              <View style={styles.passMetaRow}>
                {params.duration && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="calendar-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.duration}</Text>
                  </View>
                )}
                {params.travelers && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="people-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>
                      {params.travelers} Traveler{Number(params.travelers) > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {params.destination && (
                  <View style={styles.passMetaTag}>
                    <Ionicons name="location-outline" size={12} color="#4B5563" />
                    <Text style={styles.passMetaText}>{params.destination}</Text>
                  </View>
                )}
              </View>

              <View style={styles.passTotalDueRow}>
                <Text style={styles.passTotalDueLabel}>Total Package Price:</Text>
                <Text style={[styles.passTotalDueValue, { color: "#7C3AED" }]}>${params.amount || amount}</Text>
              </View>
            </View>
          )}

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.methodsGrid}>
              {paymentMethods.map((method) => (
                <Pressable
                  key={method.id}
                  style={[styles.methodCard, { borderColor: method.color }]}
                  onPress={() => openPaymentSheet(method)}
                >
                  <View style={[styles.methodIcon, { backgroundColor: method.color + "15" }]}>
                    {method.id === "google_pay" ? (
                      <MaterialCommunityIcons name="google" size={32} color={method.color} />
                    ) : (
                      <Ionicons name={method.icon as any} size={32} color={method.color} />
                    )}
                  </View>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDesc}>{method.description}</Text>
                  {method.fee > 0 && (
                    <View style={styles.feeBadge}>
                      <Text style={styles.feeText}>{method.fee}% fee</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {payments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              payments.slice(0, 10).map((payment) => (
                <Pressable
                  key={payment.id}
                  style={styles.transactionCard}
                  onPress={() => router.push(`/screens/payment-details?id=${payment.id}`)}
                >
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        payment.status === "completed"
                          ? "checkmark-circle"
                          : payment.status === "failed"
                          ? "close-circle"
                          : "time-outline"
                      }
                      size={24}
                      color={
                        payment.status === "completed"
                          ? "#10b981"
                          : payment.status === "failed"
                          ? "#ef4444"
                          : PRIMARY
                      }
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionMethod}>
                      {payment.method.replace("_", " ").toUpperCase()}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(payment.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text style={[styles.amount, { color: PRIMARY }]}>
                      ৳{payment.original_amount.toFixed(2)}
                    </Text>
                    <Text style={[styles.status, { color: payment.status === "completed" ? "#10b981" : "#6b7280" }]}>
                      {payment.status}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Sliding Bottom Sheet Modal */}
      <Modal
        visible={showBottomSheet}
        transparent
        animationType="none"
        onRequestClose={closeBottomSheet}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeBottomSheet} />
          </Animated.View>

          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <SafeAreaView style={styles.sheetContainer}>
              {/* Handle */}
              <View style={styles.handle} />

              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetMethodIcon, { backgroundColor: selectedMethod?.color + "15" }]}>
                  {selectedMethod?.id === "google_pay" ? (
                    <MaterialCommunityIcons name="google" size={28} color={selectedMethod?.color} />
                  ) : (
                    <Ionicons name={selectedMethod?.icon as any} size={28} color={selectedMethod?.color} />
                  )}
                </View>
                <Text style={styles.sheetTitle}>{selectedMethod?.name}</Text>
                <Pressable onPress={closeBottomSheet} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </Pressable>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardAvoid}
              >
                <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
                  {/* Amount Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount (BDT)</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.currencySymbol}>৳</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  {/* Phone/Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {selectedMethod?.id === "google_pay" ? "Email Address" : "Mobile Number"}
                    </Text>
                    {selectedMethod?.id === "google_pay" ? (
                      <TextInput
                        style={styles.input}
                        placeholder="your@gmail.com"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                      />
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder="01XXXXXXXXX"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        placeholderTextColor="#9ca3af"
                        maxLength={11}
                      />
                    )}
                  </View>

                  {/* Reference (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reference (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Order ID, booking reference, etc."
                      value={reference}
                      onChangeText={setReference}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  {/* Payment Summary */}
                  {amount && parseFloat(amount) > 0 && (
                    <View style={styles.summary}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal:</Text>
                        <Text style={styles.summaryValue}>৳{parseFloat(amount).toFixed(2)}</Text>
                      </View>
                      {selectedMethod && selectedMethod.fee > 0 && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Fee ({selectedMethod.fee}%):</Text>
                          <Text style={styles.summaryValue}>
                            ৳{((parseFloat(amount) * selectedMethod.fee) / 100).toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.summaryRow, styles.summaryTotal]}>
                        <Text style={styles.summaryTotalLabel}>Total:</Text>
                        <Text style={[styles.summaryTotalValue, { color: selectedMethod?.color }]}>
                          ৳{calculateTotal().toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Security Notice */}
                  <View style={styles.securityNotice}>
                    <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                    <Text style={styles.securityText}>
                      Your payment is encrypted and secure
                    </Text>
                  </View>

                  {/* Payment Button */}
                  <Pressable
                    style={[
                      styles.payButton,
                      { backgroundColor: selectedMethod?.color || PRIMARY },
                      processing && styles.payButtonDisabled,
                    ]}
                    onPress={handlePayment}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.payButtonText}>
                        Pay ৳{calculateTotal().toFixed(2)}
                      </Text>
                    )}
                  </Pressable>

                  <View style={{ height: 20 }} />
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <AiPill color={PRIMARY} />
      <BottomNav active="Account" color={PRIMARY} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1, textAlign: "center" },
  spacer: { width: 32 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1 },
  section: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  methodsGrid: { gap: 12 },
  methodCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  methodName: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  methodDesc: { fontSize: 13, color: "#6b7280", position: "absolute", left: 88, bottom: 22 },
  feeBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feeText: { fontSize: 11, fontWeight: "600", color: "#ef4444" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, fontWeight: "600", color: "#6b7280", marginTop: 12 },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: { flex: 1 },
  transactionMethod: { fontSize: 14, fontWeight: "600", color: "#111827" },
  transactionDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  transactionAmount: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontWeight: "700" },
  status: { fontSize: 11, marginTop: 2, textTransform: "capitalize" },

  // Bottom Sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: WINDOW_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetContainer: { flex: 1 },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sheetMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  closeBtn: { padding: 4 },
  keyboardAvoid: { flex: 1 },
  sheetContent: { flex: 1, paddingHorizontal: 20 },
  inputGroup: { marginTop: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: { fontSize: 18, fontWeight: "700", color: "#111827", marginRight: 8 },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  summary: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: "#6b7280" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#374151" },
  summaryTotal: {
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    marginTop: 8,
  },
  summaryTotalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  summaryTotalValue: { fontSize: 18, fontWeight: "800" },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  securityText: { fontSize: 13, color: "#10b981", fontWeight: "500", flex: 1 },
  payButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  passSummaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  passSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  passBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  passBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.5,
  },
  passIdBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passTitleText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  passMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  passMetaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passMetaText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  passTotalDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  passTotalDueLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  passTotalDueValue: {
    fontSize: 18,
    fontWeight: "900",
    color: PRIMARY,
  },
  flightSummaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  flightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#287dfa",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flightBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  pendingStatusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.5,
  },
  flightRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 8,
  },
  flightAirportCol: {
    flex: 1,
  },
  flightCodeText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
  },
  flightCitySubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  flightArrowCol: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  flightDirectText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#287dfa",
    marginTop: 2,
  },
  flightMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  flightMetaDot: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
