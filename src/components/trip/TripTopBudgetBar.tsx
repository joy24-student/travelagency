/**
 * Sticky Top Budget Tracker Bar & Over-Limit Alert Banner
 *
 * Displays live planned vs actual trip spending ("বাজেট ৳৩০,০০০ · খরচ ৳১৮,২০০"),
 * visual progress indicator, and active warning alert if budget exceeds limits.
 */

import React from "react";
import { Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface TripTopBudgetBarProps {
  plannedBudget: number;
  totalSpent: number;
  currency?: "BDT" | "USD";
  onAddExpensePress?: () => void;
  onSplitBillPress?: () => void;
}

export const TripTopBudgetBar: React.FC<TripTopBudgetBarProps> = ({
  plannedBudget,
  totalSpent,
  currency = "BDT",
  onAddExpensePress,
  onSplitBillPress,
}) => {
  const currencySymbol = currency === "BDT" ? "৳" : "$";
  const safePlanned = isNaN(plannedBudget) || plannedBudget <= 0 ? 1 : plannedBudget;
  const safeSpent = isNaN(totalSpent) ? 0 : totalSpent;

  const percentSpent = Math.round((safeSpent / safePlanned) * 100);
  const isOverBudget = safeSpent > safePlanned;
  const isNearLimit = !isOverBudget && percentSpent >= 85;
  const overAmount = safeSpent - safePlanned;
  const remainingAmount = safePlanned - safeSpent;

  // Clamped bar width percentage (0% to 100%)
  const barWidth = Math.min(100, Math.max(0, percentSpent));

  // Determine bar color
  const barColor = isOverBudget ? "#EF4444" : isNearLimit ? "#F59E0B" : "#10B981";

  return (
    <View style={[styles.container, isOverBudget && styles.containerOverBudget]}>
      {/* ─── Main Tracker Row ────────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.budgetAmountsCol}>
          <View style={styles.titleWithIconRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: barColor },
              ]}
            />
            <Text style={styles.trackerTitle}>চলতি বাজেট ও ট্র্যাকিং</Text>
          </View>
          <Text style={styles.amountSummaryText}>
            বাজেট <Text style={styles.amountBold}>{currencySymbol}{safePlanned.toLocaleString()}</Text> · খরচ{" "}
            <Text
              style={[
                styles.amountBold,
                isOverBudget ? styles.amountRed : styles.amountGreen,
              ]}
            >
              {currencySymbol}{safeSpent.toLocaleString()}
            </Text>
          </Text>
        </View>

        {/* Right Status Pill */}
        <View style={styles.statusPillWrap}>
          {isOverBudget ? (
            <View style={styles.overPill}>
              <Ionicons name="warning" size={12} color="#DC2626" />
              <Text style={styles.overPillText}>
                +{currencySymbol}{overAmount.toLocaleString()} অতিরিক্ত!
              </Text>
            </View>
          ) : (
            <View style={styles.remainingPill}>
              <Ionicons name="wallet-outline" size={12} color="#059669" />
              <Text style={styles.remainingPillText}>
                অবশিষ্ট {currencySymbol}{remainingAmount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── Visual Progress Bar ─────────────────────────────────────────── */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${barWidth}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.percentText, { color: barColor }]}>
          {percentSpent}%
        </Text>
      </View>

      {/* ─── Over-Budget Warning Banner (সীমা পেরোলে সতর্কতা) ───────────── */}
      {isOverBudget && (
        <View style={styles.alertBanner}>
          <View style={styles.alertIconBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
          </View>
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>সতর্কতা: বাজেট সীমা অতিক্রম করেছে!</Text>
            <Text style={styles.alertDescription}>
              আপনার প্রকৃত খরচ নির্ধারিত বাজেট অপেক্ষা{" "}
              <Text style={styles.boldSpan}>
                {currencySymbol}{overAmount.toLocaleString()}
              </Text>{" "}
              বৃদ্ধি পেয়েছে। পরবর্তী ব্যয়ে সতর্কতা অবলম্বন করুন।
            </Text>
          </View>
        </View>
      )}

      {/* ─── Approaching Limit Warning (৮৫% পেরোলে) ───────────────────────── */}
      {isNearLimit && (
        <View style={styles.nearLimitBanner}>
          <Ionicons name="information-circle" size={16} color="#D97706" />
          <Text style={styles.nearLimitText}>
            বাজেটের {percentSpent}% খরচ হয়েছে। আর মাত্র {currencySymbol}{remainingAmount.toLocaleString()} অবশিষ্ট আছে।
          </Text>
        </View>
      )}

      {/* ─── Quick Actions Row ───────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        {onAddExpensePress && (
          <TouchableOpacity
            style={styles.quickAddBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddExpensePress();
            }}
          >
            <Ionicons name="add-circle-outline" size={15} color="#2563EB" />
            <Text style={styles.quickAddBtnText}>+ খরচ যোগ করুন</Text>
          </TouchableOpacity>
        )}

        {onSplitBillPress && (
          <TouchableOpacity
            style={styles.splitBillBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              onSplitBillPress();
            }}
          >
            <Ionicons name="people-outline" size={15} color="#475569" />
            <Text style={styles.splitBillBtnText}>বিল ভাগ ও হিসাব</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.05)" } : {}),
  },
  containerOverBudget: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  budgetAmountsCol: {
    flex: 1,
  },
  titleWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  amountSummaryText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
  },
  amountBold: {
    fontWeight: "800",
    color: "#0F172A",
  },
  amountGreen: {
    color: "#059669",
  },
  amountRed: {
    color: "#DC2626",
  },
  statusPillWrap: {
    alignItems: "flex-end",
  },
  overPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#DC2626",
  },
  remainingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  remainingPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  percentText: {
    fontSize: 11,
    fontWeight: "800",
    minWidth: 32,
    textAlign: "right",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  alertIconBox: {
    marginTop: 1,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 11,
    color: "#7F1D1D",
    lineHeight: 16,
  },
  boldSpan: {
    fontWeight: "800",
  },
  nearLimitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  nearLimitText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  splitBillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  splitBillBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
});
