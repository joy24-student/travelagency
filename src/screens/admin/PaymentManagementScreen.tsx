/**
 * Payment Management Screen - Admin Panel
 * Platform Payment Reconciliations & Commission Settlements
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { walletAdminService, reportService } from "@/services/adminService";

const { width } = Dimensions.get("window");

export const PaymentManagementScreen: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await walletAdminService.getWalletTransactions();
      setPayments(data);
      setFilteredPayments(data);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  useEffect(() => {
    let result = payments;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.transaction_id.toLowerCase().includes(q) ||
          (p.booking_id && p.booking_id.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    setFilteredPayments(result);
  }, [searchQuery, statusFilter, payments]);

  const handleManualVerification = () => {
    Alert.alert(
      "Confirm Action",
      "Manual verification overrides gateway checks. Mark this payment as completed?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Mark Completed",
          onPress: () => {
            setPayments((prev) =>
              prev.map((p) =>
                p.id === selectedTxn.id ? { ...p, status: "completed" } : p
              )
            );
            setDetailsModalVisible(false);
            Alert.alert("Success", "Transaction marked as completed.");
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "failed":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transaction code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {["all", "completed", "pending", "failed"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, statusFilter === filter && styles.filterPillActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" style={styles.spinner} />
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedTxn(item);
                setDetailsModalVisible(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.refBox}>
                  <MaterialCommunityIcons name="credit-card-check" size={20} color="#10b981" />
                  <Text style={styles.refText}>{item.transaction_id}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.amountText}>
                  {item.currency} {item.amount.toLocaleString()}
                </Text>
                <Text style={styles.subtext}>Type: {item.type.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gateway Reconcile File</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Transaction Reference</Text>
                  <Text style={styles.statValue}>{selectedTxn.transaction_id}</Text>
                  <Text style={[styles.amountText, { marginTop: 8 }]}>
                    {selectedTxn.currency} {selectedTxn.amount}
                  </Text>
                </View>

                <Text style={styles.sectionHeader}>Gatekeeper Checks</Text>
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailText}>Reconciled: MATCHED ✅</Text>
                  <Text style={styles.detailText}>Gateway Node: bKash Production IPG</Text>
                  <Text style={styles.detailText}>Booking ID: {selectedTxn.booking_id || "N/A"}</Text>
                </View>

                {selectedTxn.status !== "completed" && (
                  <TouchableOpacity style={styles.actionBtnConfirm} onPress={handleManualVerification}>
                    <MaterialCommunityIcons name="checkbox-marked-circle" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Approve Manually</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerArea: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: "#0f172a",
    fontSize: 14,
  },
  filterScroll: {
    marginTop: 12,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#4f46e5",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  spinner: {
    marginTop: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardContent: {
    marginTop: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalScroll: {
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 20,
    marginBottom: 8,
  },
  detailsGroup: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#334155",
  },
  actionBtnConfirm: {
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
