import React from "react";
import { Platform,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

export interface PriceBreakdownItem {
  label: string;
  amount: number | string;
  isAddition?: boolean;
  isDiscount?: boolean;
}

export interface PriceChangeModalProps {
  visible: boolean;
  oldPrice: number | string;
  newPrice: number | string;
  currency?: string;
  reason?: string;
  breakdown?: PriceBreakdownItem[];
  onAccept: () => void;
  onReject: () => void;
}

export function formatPriceWithTax(
  basePrice: number | string,
  taxAndFeeRatio = 0.08,
  currency = "৳"
) {
  const numeric = typeof basePrice === "string" ? parseFloat(basePrice) || 0 : basePrice;
  const total = Math.round(numeric * (1 + taxAndFeeRatio));
  return {
    baseText: `${currency}${numeric.toLocaleString()}`,
    totalText: `${currency}${total.toLocaleString()}`,
    taxNotice: "ট্যাক্স ও ফিসহ মোট",
    fullLabel: `${currency}${numeric.toLocaleString()} (ট্যাক্স ও ফিসহ মোট: ${currency}${total.toLocaleString()})`,
  };
}

export const PriceChangeModal: React.FC<PriceChangeModalProps> = ({
  visible,
  oldPrice,
  newPrice,
  currency = "৳",
  reason = "ট্যাক্স, সরকারি ভ্যাট ও প্রযোজ্য সার্ভিস চার্জ যোগ করা হয়েছে",
  breakdown = [],
  onAccept,
  onReject,
}) => {
  if (!visible) return null;

  const handleAccept = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onAccept();
  };

  const handleReject = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onReject();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleReject}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Badge */}
          <View style={styles.headerIconWrap}>
            <Ionicons name="information-circle" size={32} color="#0055F2" />
          </View>

          <Text style={styles.title}>মূল্য পরিবর্তন সংক্রান্ত তথ্য</Text>
          <Text style={styles.subtitle}>
            সার্চের সময় প্রদর্শিত মূল্যে ট্যাক্স ও ফি যোগ হওয়ায় চূড়ান্ত মূল্যে পরিবর্তন এসেছে। অনুগ্রহ করে যাচাই করে সম্মতি দিন।
          </Text>

          {/* Side by Side Comparison Box */}
          <View style={styles.comparisonBox}>
            <View style={styles.priceColumn}>
              <Text style={styles.columnLabel}>পূর্বের সার্চ মূল্য</Text>
              <Text style={styles.oldPriceText}>
                {currency} {typeof oldPrice === "number" ? oldPrice.toLocaleString() : oldPrice}
              </Text>
              <Text style={styles.columnSub}>ট্যাক্স ব্যতীত</Text>
            </View>

            <View style={styles.arrowDivider}>
              <Ionicons name="arrow-forward" size={20} color="#64748B" />
            </View>

            <View style={[styles.priceColumn, styles.priceColumnHighlight]}>
              <Text style={styles.columnLabelHighlight}>নতুন মোট মূল্য</Text>
              <Text style={styles.newPriceText}>
                {currency} {typeof newPrice === "number" ? newPrice.toLocaleString() : newPrice}
              </Text>
              <Text style={styles.columnSubHighlight}>ট্যাক্স ও ফিসহ মোট</Text>
            </View>
          </View>

          {/* Reason & Itemized list */}
          <View style={styles.breakdownBox}>
            <View style={styles.reasonRow}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>

            {breakdown.map((item, idx) => (
              <View key={idx} style={styles.breakdownItemRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.breakdownVal,
                    item.isDiscount && styles.discountVal,
                  ]}
                >
                  {item.isDiscount ? "-" : item.isAddition ? "+" : ""}
                  {currency} {typeof item.amount === "number" ? item.amount.toLocaleString() : item.amount}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.rejectBtn} onPress={handleReject}>
              <Text style={styles.rejectBtnText}>বাতিল করুন</Text>
            </Pressable>

            <Pressable style={styles.acceptBtn} onPress={handleAccept}>
              <LinearGradient
                colors={["#0055F2", "#1E40AF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.acceptBtnText}>সংশোধিত মূল্যে চলুন</Text>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 8px 20px rgba(15, 23, 42, 0.15)" } : {}),
  },
  headerIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  comparisonBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceColumn: {
    flex: 1,
    alignItems: "center",
  },
  priceColumnHighlight: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 8,
  },
  arrowDivider: {
    paddingHorizontal: 8,
  },
  columnLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  columnLabelHighlight: {
    fontSize: 11,
    color: "#0055F2",
    fontWeight: "700",
  },
  oldPriceText: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "700",
    textDecorationLine: "line-through",
    marginVertical: 2,
  },
  newPriceText: {
    fontSize: 18,
    color: "#0055F2",
    fontWeight: "900",
    marginVertical: 2,
  },
  columnSub: {
    fontSize: 10,
    color: "#94A3B8",
  },
  columnSubHighlight: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700",
  },
  breakdownBox: {
    width: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "600",
    flex: 1,
  },
  breakdownItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#475569",
  },
  breakdownVal: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
  discountVal: {
    color: "#059669",
  },
  actionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 20,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  acceptBtn: {
    flex: 1.5,
    borderRadius: 14,
    overflow: "hidden",
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
