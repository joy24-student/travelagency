/**
 * Production Payment Gateway Callback Screen
 * Handles return redirects and app resume from bKash, Nagad, Cards, and Wallets.
 * Implements a robust state machine supporting:
 * - SUCCESS
 * - FAILED
 * - CANCELLED
 * - PENDING
 * Prevents duplicate transaction submissions and replay attacks via SecureStore.
 */

import React, { useEffect, useState, useRef } from "react";
import { Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { paymentService } from "../../src/services/paymentService";
import {
  getPendingTransaction,
  clearPendingTransaction,
} from "../../src/services/payment/paymentSecurity";
import { userRepository } from "../../src/services/repositories/user";

export type GatewayPaymentState = "verifying" | "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING";

const PRIMARY = "#287dfa";

export default function PaymentCallbackScreen() {
  const params = useLocalSearchParams();
  const [state, setState] = useState<GatewayPaymentState>("verifying");
  const [statusMessage, setStatusMessage] = useState("Verifying transaction with gateway...");
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    handlePaymentVerification();
  }, []);

  const normalizeStatus = (rawStatus?: string | null): GatewayPaymentState | null => {
    if (!rawStatus) return null;
    const s = String(rawStatus).toUpperCase().trim();
    if (s === "SUCCESS" || s === "COMPLETED" || s === "SUCCESSFUL" || s === "PAID") {
      return "SUCCESS";
    }
    if (s === "CANCELLED" || s === "CANCELED" || s === "ABORTED" || s === "USER_ABORT") {
      return "CANCELLED";
    }
    if (s === "FAILED" || s === "FAILURE" || s === "DECLINED" || s === "REJECTED" || s === "ERROR") {
      return "FAILED";
    }
    if (s === "PENDING" || s === "WAITING" || s === "PROCESSING" || s === "IN_PROGRESS") {
      return "PENDING";
    }
    return null;
  };

  const handlePaymentVerification = async () => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setState("verifying");
    setStatusMessage("Connecting to payment network...");

    try {
      // 1. Resolve transaction ID and method from URL params or SecureStore
      const secureTx = await getPendingTransaction();
      const transactionId =
        (params.paymentID ||
          params.paymentId ||
          params.trxID ||
          params.transaction_id ||
          params.transactionId ||
          secureTx.transactionId) as string | null;

      const rawMethod = (params.method || params.payment_method || secureTx.method || "card") as string;
      const gatewayReportedStatus = normalizeStatus(
        (params.status || params.paymentStatus || params.trxStatus || params.result) as string
      );

      if (!transactionId) {
        setState("FAILED");
        setStatusMessage("No transaction reference found for this payment session.");
        return;
      }

      setActiveTxId(transactionId);

      // 2. Handle gateway explicit cancellation upfront
      if (gatewayReportedStatus === "CANCELLED") {
        await clearPendingTransaction();
        setState("CANCELLED");
        setStatusMessage("Payment was cancelled by the user at the gateway.");
        return;
      }

      // 3. Authoritatively verify with payment service
      setStatusMessage("Securing authoritative verification from gateway...");
      const verifiedStatus = await paymentService.verify(rawMethod as any, transactionId);

      // 4. Reconcile database record
      try {
        const payments = await userRepository.getPayments();
        const currentPayment = payments.find((p) => p.transaction_id === transactionId);
        if (currentPayment) {
          await userRepository.updatePaymentStatus(currentPayment.id, verifiedStatus);
        }
      } catch (dbErr) {
        console.warn("[PaymentCallback] DB update warning:", dbErr);
      }

      // 5. State machine transition based on verified gateway status
      if (verifiedStatus === "completed") {
        await clearPendingTransaction();
        setState("SUCCESS");
        setStatusMessage("Your payment has been successfully confirmed and verified!");
      } else if (verifiedStatus === "failed") {
        await clearPendingTransaction();
        setState("FAILED");
        setStatusMessage("Payment authorization failed or was declined by the issuer.");
      } else if (verifiedStatus === "refunded") {
        await clearPendingTransaction();
        setState("CANCELLED");
        setStatusMessage("This transaction has already been refunded.");
      } else {
        // Pending state - keep secure store item so user can re-check status
        setState("PENDING");
        setStatusMessage("Payment is currently awaiting settlement confirmation from the banking network.");
      }
    } catch (error: any) {
      console.error("[PaymentCallback] Verification fatal error:", error);
      setState("FAILED");
      setStatusMessage(error?.message || "An unexpected error occurred while verifying your payment.");
    } finally {
      isVerifyingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {state === "verifying" && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.title}>Verifying Payment</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            {activeTxId && (
              <View style={styles.txBadge}>
                <Text style={styles.txBadgeText}>TX: {activeTxId}</Text>
              </View>
            )}
          </View>
        )}

        {state === "SUCCESS" && (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
              <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
            </View>
            <Text style={[styles.title, { color: "#16A34A" }]}>Payment Successful</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            {activeTxId && (
              <View style={styles.txBadge}>
                <Text style={styles.txBadgeText}>Transaction ID: {activeTxId}</Text>
              </View>
            )}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: PRIMARY }]}
              onPress={() => router.replace("/screens/payments")}
            >
              <Text style={styles.primaryButtonText}>View Payments & Bookings</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        )}

        {state === "FAILED" && (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="close-circle" size={56} color="#DC2626" />
            </View>
            <Text style={[styles.title, { color: "#DC2626" }]}>Payment Failed</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            {activeTxId && (
              <View style={styles.txBadge}>
                <Text style={styles.txBadgeText}>Ref: {activeTxId}</Text>
              </View>
            )}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#DC2626" }]}
              onPress={() => router.replace("/screens/payments")}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#0284C7", marginTop: 8 }]}
              onPress={() =>
                router.push({
                  pathname: "/screens/customer-support",
                  params: {
                    transactionId: activeTxId || "",
                    issue: `পেমেন্ট ব্যর্থ হয়েছে: ${statusMessage}`,
                    autoOpenChat: "true",
                    source: "payment_callback",
                  },
                })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="headset" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>সাহায্য চাই (Need Help)</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        )}

        {state === "CANCELLED" && (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="alert-circle" size={56} color="#D97706" />
            </View>
            <Text style={[styles.title, { color: "#D97706" }]}>Payment Cancelled</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: PRIMARY }]}
              onPress={() => router.replace("/screens/payments")}
            >
              <Text style={styles.primaryButtonText}>Return to Checkout</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#0284C7", marginTop: 8 }]}
              onPress={() =>
                router.push({
                  pathname: "/screens/customer-support",
                  params: {
                    transactionId: activeTxId || "",
                    issue: `পেমেন্ট বাতিল করা হয়েছে: ${statusMessage}`,
                    autoOpenChat: "true",
                    source: "payment_callback",
                  },
                })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="headset" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>সাহায্য চাই (Need Help)</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        )}

        {state === "PENDING" && (
          <View style={styles.stateCard}>
            <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
              <Ionicons name="time" size={56} color="#0284C7" />
            </View>
            <Text style={[styles.title, { color: "#0284C7" }]}>Payment Pending</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            {activeTxId && (
              <View style={styles.txBadge}>
                <Text style={styles.txBadgeText}>Pending TX: {activeTxId}</Text>
              </View>
            )}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: "#0284C7" }]}
              onPress={handlePaymentVerification}
            >
              <Text style={styles.primaryButtonText}>Re-check Status</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.08)" } : {}),
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  txBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  txBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    fontFamily: "monospace",
  },
  primaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
});
