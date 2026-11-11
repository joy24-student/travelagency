/**
 * WalletTopUpScreen.tsx
 * Travel Agency B2B Deposit Wallet & Top-up Management
 * Displays Available Cash Balance, Approved Credit Line, Used Credit,
 * and allows instant deposit via bKash/Nagad or Bank Transfer slip upload.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

interface TransactionItem {
  id: string;
  type: "deposit" | "ticket_issuance" | "commission" | "refund";
  amount: number;
  reference: string;
  status: "completed" | "pending";
  date: string;
}

const SAMPLE_TXNS: TransactionItem[] = [
  {
    id: "TX-901",
    type: "deposit",
    amount: 150000,
    reference: "Bank Dep #EBL-88219",
    status: "completed",
    date: "Today, 11:20 AM",
  },
  {
    id: "TX-902",
    type: "ticket_issuance",
    amount: -48500,
    reference: "BG-049 DAC-DXB (SJ-38291)",
    status: "completed",
    date: "Yesterday, 04:15 PM",
  },
  {
    id: "TX-903",
    type: "commission",
    amount: 3400,
    reference: "Markup payout for SJ-38291",
    status: "completed",
    date: "Yesterday, 04:16 PM",
  },
  {
    id: "TX-904",
    type: "deposit",
    amount: 50000,
    reference: "bKash Merchant #TRX992",
    status: "completed",
    date: "09 Nov 2026",
  },
];

export default function WalletTopUpScreen({ navigation }: any) {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(245800);
  const [creditLimit, setCreditLimit] = useState(500000);
  const [usedCredit, setUsedCredit] = useState(65000);

  // Top up method: bank or mobile
  const [method, setMethod] = useState<"bank" | "mobile">("bank");
  const [selectedBank, setSelectedBank] = useState("Eastern Bank Ltd (EBL)");
  const [depositAmount, setDepositAmount] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [slipAttached, setSlipAttached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttachSlip = () => {
    setSlipAttached(true);
    Alert.alert("Slip Attached", "Bank Deposit slip photo attached successfully.");
  };

  const handleDepositSubmit = () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid deposit amount.");
      return;
    }
    if (method === "bank" && !txnRef.trim()) {
      Alert.alert("Reference Required", "Please enter bank slip / transaction reference number.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setWalletBalance((prev) => prev + amt);
      Alert.alert(
        "Deposit Request Received",
        `৳${amt.toLocaleString()} deposit request submitted successfully.\nFunds will be credited upon instant verification.`,
        [{ text: "OK" }]
      );
      setDepositAmount("");
      setTxnRef("");
      setSlipAttached(false);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>B2B Deposit Wallet</Text>
          <Text style={styles.headerSub}>Real-Time Balance & Credit Management</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Wallet Balance Hero Card */}
        <LinearGradient colors={["#312E81", "#1E1B4B"]} style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>AVAILABLE CASH BALANCE</Text>
              <Text style={styles.balanceAmount}>৳{walletBalance.toLocaleString()}</Text>
            </View>
            <View style={styles.walletIconBox}>
              <MaterialCommunityIcons name="wallet-outline" size={32} color="#C3C0FF" />
            </View>
          </View>

          <View style={styles.creditRow}>
            <View style={styles.creditItem}>
              <Text style={styles.creditLabel}>Approved Credit Limit</Text>
              <Text style={styles.creditVal}>৳{creditLimit.toLocaleString()}</Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.creditItem}>
              <Text style={styles.creditLabel}>Utilized Credit</Text>
              <Text style={[styles.creditVal, { color: THEME.warning }]}>
                ৳{usedCredit.toLocaleString()}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Top-up Form Section */}
        <View style={styles.topUpSection}>
          <Text style={styles.sectionTitle}>Add Deposit to B2B Wallet</Text>

          {/* Payment Method Switcher */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[styles.methodBtn, method === "bank" && styles.methodBtnActive]}
              onPress={() => setMethod("bank")}
            >
              <MaterialCommunityIcons
                name="bank"
                size={18}
                color={method === "bank" ? "#FFF" : THEME.textMuted}
              />
              <Text style={[styles.methodBtnText, method === "bank" && styles.methodBtnTextActive]}>
                Bank Deposit / Transfer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodBtn, method === "mobile" && styles.methodBtnActive]}
              onPress={() => setMethod("mobile")}
            >
              <MaterialCommunityIcons
                name="cellphone"
                size={18}
                color={method === "mobile" ? "#FFF" : THEME.textMuted}
              />
              <Text style={[styles.methodBtnText, method === "mobile" && styles.methodBtnTextActive]}>
                bKash / Nagad
              </Text>
            </TouchableOpacity>
          </View>

          {method === "bank" ? (
            <View style={styles.bankForm}>
              <View style={styles.bankAccountInfo}>
                <Text style={styles.bankInfoTitle}>ShopnoJatra Corporate Settlement Account:</Text>
                <Text style={styles.bankInfoText}>Bank: {selectedBank}</Text>
                <Text style={styles.bankInfoText}>Account Name: ShopnoJatra Global Travel Ltd.</Text>
                <Text style={styles.bankInfoText}>A/C Number: 104-102-0091823</Text>
                <Text style={styles.bankInfoText}>Branch: Gulshan Corporate Branch, Dhaka</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deposit Amount (BDT) *</Text>
                <TextInput
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder="e.g. 100000"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deposit Slip Reference / Cheque No. *</Text>
                <TextInput
                  value={txnRef}
                  onChangeText={setTxnRef}
                  placeholder="e.g. EBL-DEP-992144"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity style={styles.slipUploadBtn} onPress={handleAttachSlip}>
                <MaterialCommunityIcons
                  name={slipAttached ? "check-circle" : "camera"}
                  size={20}
                  color={slipAttached ? THEME.success : THEME.accent}
                />
                <Text style={[styles.slipUploadTxt, slipAttached && { color: THEME.success }]}>
                  {slipAttached ? "Deposit Slip Attached (Ready)" : "Upload Bank Deposit Slip"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bankForm}>
              <View style={styles.bankAccountInfo}>
                <Text style={styles.bankInfoTitle}>bKash & Nagad Merchant Gateway</Text>
                <Text style={styles.bankInfoText}>bKash Merchant: 01700-112233 (Make Payment)</Text>
                <Text style={styles.bankInfoText}>Nagad Merchant: 01800-445566 (Make Payment)</Text>
                <Text style={styles.bankInfoText}>Reference: Enter your Agency ID: AG-8821</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (BDT) *</Text>
                <TextInput
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder="e.g. 50000"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TrxID (Transaction ID) *</Text>
                <TextInput
                  value={txnRef}
                  onChangeText={setTxnRef}
                  placeholder="e.g. 9KA8921XYZ"
                  placeholderTextColor={THEME.textMuted}
                  style={styles.textInput}
                />
              </View>
            </View>
          )}

          {isSubmitting ? (
            <ActivityIndicator size="large" color={THEME.primary} style={{ marginVertical: 16 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleDepositSubmit}>
              <LinearGradient colors={["#4F46E5", "#4338CA"]} style={styles.gradientBtn}>
                <Text style={styles.submitBtnText}>Submit Deposit for Instant Credit</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Ledger History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Wallet Activity</Text>
          {SAMPLE_TXNS.map((item) => {
            const isCredit = item.amount > 0;
            return (
              <View key={item.id} style={styles.txnItem}>
                <View style={styles.txnIconCol}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isCredit ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        item.type === "deposit"
                          ? "arrow-down-left"
                          : item.type === "ticket_issuance"
                          ? "arrow-up-right"
                          : "cash-plus"
                      }
                      size={20}
                      color={isCredit ? THEME.success : THEME.danger}
                    />
                  </View>
                </View>

                <View style={styles.txnDetails}>
                  <Text style={styles.txnRef}>{item.reference}</Text>
                  <Text style={styles.txnDate}>{item.date}</Text>
                </View>

                <View style={styles.txnAmountCol}>
                  <Text
                    style={[
                      styles.txnAmount,
                      { color: isCredit ? THEME.success : THEME.text },
                    ]}
                  >
                    {isCredit ? "+" : ""}৳{Math.abs(item.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.txnStatus}>{item.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  balanceCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C3C0FF",
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 4,
  },
  walletIconBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 14,
  },
  creditRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  creditItem: {
    flex: 1,
  },
  creditLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  creditVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 2,
  },
  dividerV: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 12,
  },
  topUpSection: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 14,
  },
  methodSelector: {
    flexDirection: "row",
    backgroundColor: THEME.cardAlt,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  methodBtnActive: {
    backgroundColor: THEME.primary,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  methodBtnTextActive: {
    color: "#FFF",
  },
  bankForm: {
    gap: 12,
  },
  bankAccountInfo: {
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.25)",
    marginBottom: 6,
  },
  bankInfoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.accent,
    marginBottom: 4,
  },
  bankInfoText: {
    fontSize: 11,
    color: THEME.text,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: THEME.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  slipUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.cardAlt,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.accent,
    gap: 8,
    marginTop: 6,
  },
  slipUploadTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.accent,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 14,
  },
  gradientBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  historySection: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  txnItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  txnIconCol: {
    marginRight: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  txnDetails: {
    flex: 1,
  },
  txnRef: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.text,
  },
  txnDate: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  txnAmountCol: {
    alignItems: "flex-end",
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txnStatus: {
    fontSize: 10,
    color: THEME.textMuted,
    textTransform: "capitalize",
    marginTop: 2,
  },
});
