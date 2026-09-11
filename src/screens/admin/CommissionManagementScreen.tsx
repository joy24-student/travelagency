/**
 * Commission & Payout Management Screen - Admin Panel
 * Set vertical splits and process settlements
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export const CommissionManagementScreen: React.FC = () => {
  const [splits, setSplits] = useState<any>({
    hotel: "15%",
    flight: "5%",
    train: "3%",
    tour: "12%",
  });
  const [payouts, setPayouts] = useState<any[]>([
    {
      id: "pay-101",
      agency_name: "Royal Horizon Luxury Travels",
      amount: "৳189,000.00",
      currency: "BDT",
      status: "pending",
      requested_at: new Date().toLocaleDateString(),
    },
    {
      id: "pay-102",
      agency_name: "LuxeStay Global Resorts",
      amount: "$2,450.00",
      currency: "USD",
      status: "processed",
      requested_at: new Date(Date.now() - 86400000).toLocaleDateString(),
    },
  ]);

  const handleApprovePayout = (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: "processed" } : p))
    );
    Alert.alert("Success", "Payout approved and sent to bank settlement node.");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Commission Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Commission Splitting</Text>
        <View style={styles.grid}>
          {Object.keys(splits).map((key) => (
            <View key={key} style={styles.splitCard}>
              <Text style={styles.splitLabel}>{key.toUpperCase()}</Text>
              <TextInput
                style={styles.splitInput}
                value={splits[key]}
                onChangeText={(val) => setSplits((prev: any) => ({ ...prev, [key]: val }))}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Payout Processing Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Partner Settlement Ledger</Text>
        {payouts.map((item) => (
          <View key={item.id} style={styles.payoutCard}>
            <View style={styles.payoutHeader}>
              <Text style={styles.agencyName}>{item.agency_name}</Text>
              <View style={[styles.statusBadge, item.status === "processed" ? styles.statusBadgeDone : styles.statusBadgePending]}>
                <Text style={item.status === "processed" ? styles.statusTextDone : styles.statusTextPending}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.payoutContent}>
              <Text style={styles.amountText}>{item.amount}</Text>
              <Text style={styles.dateText}>Requested: {item.requested_at}</Text>

              {item.status === "pending" && (
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprovePayout(item.id)}
                >
                  <MaterialCommunityIcons name="wallet-giftcard" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>Disburse Payout</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  splitCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    elevation: 1,
  },
  splitLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  splitInput: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4f46e5",
    marginTop: 4,
    padding: 0,
  },
  payoutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agencyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeDone: {
    backgroundColor: "#10b98115",
  },
  statusBadgePending: {
    backgroundColor: "#f59e0b15",
  },
  statusTextDone: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10b981",
  },
  statusTextPending: {
    fontSize: 9,
    fontWeight: "700",
    color: "#f59e0b",
  },
  payoutContent: {
    marginTop: 12,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  dateText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  approveBtn: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  approveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
