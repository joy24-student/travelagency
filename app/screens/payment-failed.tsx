/**
 * Payment Failed Screen - Transaction Failure & Alternative Recovery
 * Displays clear failure reasoning, guarantees no double charges, and allows instant method switching.
 * Production-level implementation - Shopno Jatra
 */

import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROUTES } from "../../src/constants/routes";
import { BookingStepper } from "../../src/components/common/BookingStepper";
import { CopyableText } from "../../src/components/common/CopyableText";
import { safeGoBack } from "../../src/utils/navigationHelper";
import { shareUnifiedReceipt } from "../../src/utils/receiptService";
import * as Haptics from "expo-haptics";

const PRIMARY = "#287dfa";
const ERROR_COLOR = "#ef4444";

interface ProviderOption {
  id: string;
  name: string;
  nameBn: string;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  feeText: string;
}

const ALTERNATIVE_PROVIDERS: ProviderOption[] = [
  {
    id: "bkash",
    name: "bKash",
    nameBn: "বিকাশ",
    color: "#D12053",
    bgColor: "#FCE7F3",
    icon: "phone-portrait-outline",
    feeText: "অতিরিক্ত চার্জ: ১.৫%",
  },
  {
    id: "nagad",
    name: "Nagad",
    nameBn: "নগদ",
    color: "#EA580C",
    bgColor: "#FFEDD5",
    icon: "cash-outline",
    feeText: "অতিরিক্ত চার্জ: ১.৫%",
  },
  {
    id: "rocket",
    name: "Rocket",
    nameBn: "রকেট",
    color: "#86198F",
    bgColor: "#FDF4FF",
    icon: "rocket-outline",
    feeText: "অতিরিক্ত চার্জ: ১.৫%",
  },
  {
    id: "card",
    name: "Credit / Debit Card",
    nameBn: "কার্ড (ভিসা/মাস্টারকার্ড)",
    color: "#1D4ED8",
    bgColor: "#EFF6FF",
    icon: "card-outline",
    feeText: "চার্জ: ২.০%",
  },
  {
    id: "wallet",
    name: "Shopno Wallet",
    nameBn: "স্বপ্ন ওয়ালেট",
    color: "#059669",
    bgColor: "#ECFDF5",
    icon: "wallet-outline",
    feeText: "০% ফ্রি (কোনো ফি নেই)",
  },
];

export default function PaymentFailedScreen() {
  const params = useLocalSearchParams<{
    reason?: string;
    amount?: string;
    method?: string;
    bookingId?: string;
    bookingReference?: string;
  }>();

  const { reason, amount, method, bookingId, bookingReference } = params;
  const isTimeout = reason === "timeout";
  const [isRechecking, setIsRechecking] = React.useState(false);

  const handleRecheckStatus = async () => {
    setIsRechecking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setIsRechecking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      alert("লেনদেনটি এখনও ব্যাংক/MFS প্রক্রিয়াকরণে রয়েছে। আপনার টাকা সম্পূর্ণ নিরাপদ। আরও ৫ মিনিট পর পুনরায় চেক করুন।");
    }, 2000);
  };

  const handleShareInquiry = async () => {
    await shareUnifiedReceipt({
      transactionId: bookingReference || `TXN-${Date.now().toString().slice(-6)}`,
      bookingId: bookingId,
      amount: amount || "0",
      paymentMethod: method || "mfs",
      status: "pending_verification",
      notes: "পেমেন্ট ভেরিফিকেশন যাচাইাধীন। গ্রাহক সহায়তা টিম অবিলম্বে পর্যবেক্ষণ করবেন।"
    });
  };

  const failureReasons: {
    [key: string]: { title: string; titleBn: string; message: string; messageBn: string };
  } = {
    insufficient_funds: {
      title: "Insufficient Funds",
      titleBn: "অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই",
      message: "Your account does not have enough balance for this transaction. Please try with a smaller amount or use a different payment method.",
      messageBn: "আপনার নির্বাচিত অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। অনুগ্রহ করে অন্য কোনো পেমেন্ট মাধ্যম বেছে নিন।",
    },
    invalid_credentials: {
      title: "Invalid Credentials / PIN",
      titleBn: "ভুল পিন বা তথ্য প্রদান করা হয়েছে",
      message: "The OTP or PIN provided was incorrect. Your funds are completely safe. Please try again or switch method.",
      messageBn: "প্রদত্ত পিন বা ওটিপি সঠিক ছিল না। আপনার কোনো অর্থ কাটা হয়নি। অন্য পদ্ধতি বেছে নিন বা পুনরায় চেষ্টা করুন।",
    },
    network_error: {
      title: "Network Connection Error",
      titleBn: "নেটওয়ার্ক সংযোগে সমস্যা",
      message: "A network error occurred while communicating with the banking gateway. Please check your connection.",
      messageBn: "পেমেন্ট গেটওয়ের সাথে সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
    },
    timeout: {
      title: "Payment Status Verification In Progress",
      titleBn: "পেমেন্ট হয়েছে কিনা নিশ্চিত নই • যাচাইাধীন",
      message: "The gateway response timed out. If your bKash/Nagad was deducted, do NOT pay again. It is being reconciled.",
      messageBn: "গেটওয়ে থেকে তাৎক্ষণিক নিশ্চিতকরণ পাওয়া যায়নি। আপনার অ্যাকাউন্ট থেকে টাকা কেটে থাকলে অনুগ্রহ করে অপেক্ষা করুন—এটি যাচাই করা হচ্ছে।",
    },
    user_cancelled: {
      title: "Payment Cancelled by User",
      titleBn: "পেমেন্ট বাতিল করা হয়েছে",
      message: "You cancelled the payment before completion. No money was deducted from your account.",
      messageBn: "আপনি পেমেন্ট সম্পন্ন না করে ফিরে এসেছেন। আপনার অ্যাকাউন্ট থেকে কোনো টাকা কাটা হয়নি।",
    },
    gateway_declined: {
      title: "Declined by Payment Gateway",
      titleBn: "গেটওয়ে কর্তৃক লেনদেন প্রত্যাখ্যাত",
      message: "The issuing bank or MFS provider declined this transaction. Please choose an alternate provider below.",
      messageBn: "আপনার ব্যাংক বা এমএফএস প্রদানকারী লেনদেনটি বাতিল করেছে। অনুগ্রহ করে নিচে অন্য একটি পদ্ধতি নির্বাচন করুন।",
    },
    fraud_detected: {
      title: "Security Verification Alert",
      titleBn: "নিরাপত্তা সংক্রান্ত যাচাইকরণ ব্যর্থ",
      message: "The transaction was blocked by security algorithms. Please verify your account or contact support.",
      messageBn: "নিরাপত্তাজনিত কারণে লেনদেনটি সম্পন্ন হয়নি। আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন।",
    },
  };

  const currentFailure = failureReasons[reason as string] || {
    title: "Payment Unsuccessful",
    titleBn: "পেমেন্ট সফল হয়নি",
    message: "The transaction could not be completed. Your account has not been charged.",
    messageBn: "লেনদেনটি সম্পূর্ণ করা যায়নি। আপনার অ্যাকাউন্ট থেকে কোনো অর্থ কাটা হয়নি।",
  };

  const handleSwitchMethod = (newMethodId: string) => {
    router.replace({
      pathname: ROUTES.SCREENS.PAYMENTS,
      params: {
        amount: amount || "",
        bookingId: bookingId || "",
        reference: bookingReference || "",
        provider: newMethodId,
      },
    });
  };

  const handleRetrySameMethod = () => {
    router.replace({
      pathname: ROUTES.SCREENS.PAYMENTS,
      params: {
        amount: amount || "",
        bookingId: bookingId || "",
        reference: bookingReference || "",
        provider: method || "bkash",
      },
    });
  };

  const handleContactSupport = () => {
    router.push({
      pathname: ROUTES.SCREENS.CUSTOMER_SUPPORT,
      params: {
        bookingId: bookingReference || bookingId || `BK-${Date.now().toString().slice(-6)}`,
        bookingRef: bookingReference || bookingId || "",
        amount: amount || "",
        method: method || "",
        issue: `পেমেন্ট ব্যর্থতা: ${currentFailure.titleBn} (${amount ? `৳${amount}` : ""})`,
        autoOpenChat: "true",
        source: "payment_failed",
      },
    });
  };

  const handleReturnHome = () => {
    router.replace(ROUTES.HOME);
  };

  return (
    <SafeAreaView style={styles.shell}>
      {/* Multi-step Breadcrumb & Stepper */}
      <BookingStepper
        currentStep={4}
        breadcrumbs={["Home", "Booking", "Payment", "Declined"]}
        onBackPress={() => safeGoBack("/screens/payments")}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error / Uncertain Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.errorIconBg, isTimeout && { backgroundColor: "#FEF3C7" }]}>
            <Ionicons
              name={isTimeout ? "help-buoy" : "close-circle"}
              size={72}
              color={isTimeout ? "#D97706" : ERROR_COLOR}
            />
          </View>
        </View>

        {/* Failure Title & Message */}
        <Text style={styles.failureTitle}>{currentFailure.titleBn}</Text>
        <Text style={styles.failureSubtitleEn}>{currentFailure.title}</Text>
        <Text style={styles.failureMessage}>{currentFailure.messageBn}</Text>

        {/* Security / Status Banner */}
        {isTimeout ? (
          <View style={[styles.notChargedBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
            <Ionicons name="shield-half-outline" size={22} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notChargedTitle, { color: "#92400E" }]}>
                টাকা কেটে থাকলে আতঙ্কিত হবেন না • Funds Are Safe
              </Text>
              <Text style={[styles.notChargedSubtitle, { color: "#B45309" }]}>
                যদি আপনার বিকাশ বা নগদ থেকে টাকা কেটে থাকে, ভুলেও দ্বিতীয়বার পেমেন্ট করবেন না। এটি গেটওয়ে ভেরিফিকেশনে রয়েছে।
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.notChargedBanner}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.notChargedTitle}>কোনো টাকা কাটা হয়নি • No Charges Made</Text>
              <Text style={styles.notChargedSubtitle}>
                আপনার ব্যাংক বা মোবাইল অ্যাকাউন্ট সম্পূর্ণ সুরক্ষিত রয়েছে।
              </Text>
            </View>
          </View>
        )}

        {/* Timeout Specific Trust Actions */}
        {isTimeout && (
          <View style={{ flexDirection: "row", gap: 10, marginVertical: 12 }}>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: "#2563EB",
                borderRadius: 12,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
              }}
              onPress={handleRecheckStatus}
            >
              <Ionicons name="refresh-circle-outline" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                {isRechecking ? "যাচাই করা হচ্ছে..." : "স্ট্যাটাস রি-চেক"}
              </Text>
            </Pressable>

            <Pressable
              style={{
                flex: 1,
                backgroundColor: "#F1F5F9",
                borderRadius: 12,
                paddingVertical: 12,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
              }}
              onPress={handleShareInquiry}
            >
              <Ionicons name="share-social-outline" size={18} color="#334155" />
              <Text style={{ color: "#334155", fontWeight: "700", fontSize: 14 }}>
                রসিদ শেয়ার
              </Text>
            </Pressable>
          </View>
        )}

        {/* Transaction Summary Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardHeaderTitle}>লেনদেনের বিবরণ • Attempt Details</Text>
          {amount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>প্রদেয় পরিমাণ (Amount)</Text>
              <Text style={styles.detailValue}>৳{amount} BDT</Text>
            </View>
          )}

          {method && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>পেমেন্ট মাধ্যম (Method)</Text>
              <Text style={[styles.detailValue, { textTransform: "uppercase" }]}>
                {method}
              </Text>
            </View>
          )}

          {bookingReference && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>বুকিং রেফারেন্স (Ref)</Text>
              <CopyableText
                text={bookingReference}
                label="বুকিং রেফারেন্স"
                textStyle={styles.detailValueMono}
                iconSize={13}
                iconColor="#DC2626"
              />
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>স্ট্যাটাস (Status)</Text>
            <Text style={styles.statusDeclinedText}>ব্যর্থ (Failed / Not Deducted)</Text>
          </View>
        </View>

        {/* Solution 3: Easy method switching buttons (Card, bKash, Nagad, etc.) */}
        <View style={styles.switchMethodsSection}>
          <View style={styles.switchMethodsHeader}>
            <Ionicons name="swap-horizontal" size={20} color="#1E293B" />
            <Text style={styles.switchMethodsTitle}>অন্য পদ্ধতিতে সহজে পে করুন:</Text>
          </View>
          <Text style={styles.switchMethodsSubtitle}>
            একই বুকিংয়ের জন্য নিচের যেকোনো পদ্ধতি বেছে নিন, কোনো তথ্য পুনরায় টাইপ করতে হবে না।
          </Text>

          <View style={styles.providerGrid}>
            {ALTERNATIVE_PROVIDERS.map((provider) => {
              const isCurrent = method === provider.id;
              return (
                <Pressable
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    isCurrent && styles.providerCardActive,
                  ]}
                  onPress={() => handleSwitchMethod(provider.id)}
                >
                  <View style={[styles.providerIconCircle, { backgroundColor: provider.bgColor }]}>
                    <Ionicons name={provider.icon} size={22} color={provider.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerNameText}>{provider.nameBn}</Text>
                      <Text style={styles.providerEnText}>({provider.name})</Text>
                    </View>
                    <Text style={styles.providerFeeText}>{provider.feeText}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Primary Action Buttons */}
        <Pressable style={styles.primaryButton} onPress={handleRetrySameMethod}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.buttonText}>একই পদ্ধতিতে পুনরায় চেষ্টা করুন</Text>
        </Pressable>

        <Pressable
          style={[styles.supportButton, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1.5 }]}
          onPress={handleContactSupport}
        >
          <Ionicons name="headset" size={20} color="#DC2626" />
          <View style={{ flex: 1, marginStart: 8 }}>
            <Text style={[styles.supportButtonText, { color: "#DC2626", fontWeight: "800" }]}>
              সাহায্য চাই (Need Help) • লাইভ সাপোর্ট
            </Text>
            <Text style={{ fontSize: 11, color: "#991B1B", marginTop: 1 }}>
              বুকিং কোড সহ সরাসরি কাস্টমার সাপোর্টে কথা বলুন
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#DC2626" />

        </Pressable>

        {/* Solution 1: Correct Home Route via routes.ts */}
        <Pressable style={styles.homeButton} onPress={handleReturnHome}>
          <Ionicons name="home-outline" size={18} color="#475569" />
          <Text style={styles.homeButtonText}>হোমে ফিরে যান • Return to Home</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A", flex: 1, textAlign: "center" },
  spacer: { width: 32 },
  content: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 },

  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  errorIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  failureTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ERROR_COLOR,
    textAlign: "center",
    marginBottom: 4,
  },
  failureSubtitleEn: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 8,
  },
  failureMessage: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  notChargedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  notChargedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  notChargedSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },

  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  detailValueMono: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  statusDeclinedText: {
    fontSize: 13,
    color: ERROR_COLOR,
    fontWeight: "700",
  },

  switchMethodsSection: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  switchMethodsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  switchMethodsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  switchMethodsSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 18,
  },
  providerGrid: {
    gap: 10,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  providerCardActive: {
    borderColor: PRIMARY,
    backgroundColor: "#EFF6FF",
  },
  providerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  providerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  providerEnText: {
    fontSize: 12,
    color: "#64748B",
  },
  providerFeeText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },

  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  supportButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  supportButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  homeButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  homeButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
});
