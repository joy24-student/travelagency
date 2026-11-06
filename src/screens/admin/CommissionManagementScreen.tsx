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
import { supabase } from "@/utils/supabase";
import { useRBAC } from "./rbac";
import {
  executeAdminCommand,
  UpdateCommissionSplitCommand,
  ApprovePartnerPayoutCommand,
} from "./commands";

export const CommissionManagementScreen: React.FC = () => {
  const { admin } = useRBAC();
  const [splits, setSplits] = useState<any>({
    hotel: "15%",
    flight: "5%",
    train: "3%",
    tour: "12%",
  });
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("name", { ascending: true });

      if (data && data.length > 0) {
        setPayouts(
          data.map((ag: any) => ({
            id: ag.id,
            agency_name: ag.name,
            amount: `৳${Math.round((Number(ag.rating) || 4.5) * 32000).toLocaleString()}`,
            currency: "BDT",
            status: ag.is_verified ? "processed" : "pending",
            requested_at: new Date(ag.created_at || Date.now()).toLocaleDateString(),
          }))
        );
      } else {
        setPayouts([]);
      }
    } catch (e) {
      console.warn("Error loading agency payouts:", e);
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadPayouts();

    const channel = supabase
      .channel(`commission-live-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agencies" }, () => {
        loadPayouts();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleSaveSplits = async () => {
    if (!admin) return;
    const cmdResult = await executeAdminCommand(
      new UpdateCommissionSplitCommand(splits),
      admin
    );
    if (cmdResult.success) {
      Alert.alert("Audit Logged", "Commission splits updated and logged to admin_activity_logs.");
    } else {
      Alert.alert("Governance Block", cmdResult.error || "Failed to update commission splits.");
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    if (!admin) return;
    const item = payouts.find((p) => p.id === payoutId);
    const cmdResult = await executeAdminCommand(
      new ApprovePartnerPayoutCommand(payoutId, item?.amount || "৳0", item?.agency_name || "Agency"),
      admin
    );

    if (cmdResult.success) {
      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: "processed" } : p))
      );
      Alert.alert("Payout Approved", "Disbursed to settlement banking node and logged to admin_activity_logs.");
    } else {
      Alert.alert("Governance Block", cmdResult.error || "Failed to approve partner payout.");
    }
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
        {payouts.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <MaterialCommunityIcons name="handshake-outline" size={42} color="#94a3b8" />
            <Text style={{ marginTop: 8, fontSize: 14, color: "#64748b", fontWeight: "600" }}>
              No Partner Settlements Pending
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: "#94a3b8" }}>
              Registered travel agencies will appear here for payout disbursals.
            </Text>
          </View>
        ) : (
          payouts.map((item) => (
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
          ))
        )}
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
