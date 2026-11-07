/**
 * Transaction History Screen - Payment History and Analytics
 * Display all transactions with filtering and search
 * Production-level implementation
 */

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

import { useAuth } from "../../src/hooks/useAuth";
import { userRepository } from "../../src/services/repositories/user";

const PRIMARY = "#287dfa";

type StatusFilter = "all" | "pending" | "completed" | "failed";

export default function TransactionHistoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    loadPayments();
  }, [user?.id]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await userRepository.getPayments();
      setPayments(data);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.id.toLowerCase().includes(query) ||
        p.method.toLowerCase().includes(query) ||
        p.reference?.toLowerCase().includes(query)
      );
    }

    setFilteredPayments(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "failed":
        return "#ef4444";
      case "pending":
        return PRIMARY;
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "failed":
        return "close-circle";
      case "pending":
        return "time-outline";
      default:
        return "help-circle-outline";
    }
  };

  const calculateStats = () => {
    const totalTransactions = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + p.original_amount, 0);
    const completedCount = payments.filter((p) => p.status === "completed").length;

    return { totalTransactions, totalAmount, completedCount };
  };

  const stats = calculateStats();

  const renderPaymentItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.paymentItem}
      onPress={() => router.push(`/payment-details/${item.id}`)}
    >
      <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
        <Ionicons
          name={getStatusIcon(item.status) as any}
          size={24}
          color={getStatusColor(item.status)}
        />
      </View>

      <View style={styles.paymentInfo}>
        <Text style={styles.paymentMethod}>{item.method.toUpperCase()}</Text>
        <Text style={styles.paymentDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.paymentReference}>{item.reference}</Text>
      </View>

      <View style={styles.paymentAmount}>
        <Text style={styles.amount}>{item.original_amount.toFixed(2)} BDT</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={PRIMARY} />
        </Pressable>
        <Text style={styles.title}>Transaction History</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <View style={styles.container}>
          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Transactions</Text>
              <Text style={styles.statValue}>{stats.totalTransactions}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Amount</Text>
              <Text style={styles.statValue}>{stats.totalAmount.toFixed(2)} BDT</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Successful</Text>
              <Text style={styles.statValue}>{stats.completedCount}</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, method, or reference"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close" size={20} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {(["all", "pending", "completed", "failed"] as StatusFilter[]).map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.filterButtonActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    statusFilter === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Transactions List */}
          {filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No transactions found" : "No transactions"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Try adjusting your search"
                  : "Make your first payment to get started"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPayments}
              renderItem={renderPaymentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#f9fafb" },
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
  title: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1, textAlign: "center" },
  spacer: { width: 32 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },

  // Statistics
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, color: "#6b7280", fontWeight: "500", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: PRIMARY },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },

  // Filter
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterButtonText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filterButtonTextActive: { color: "#fff" },

  // Payment Items
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: { flex: 1 },
  paymentMethod: { fontSize: 14, fontWeight: "600", color: "#111827" },
  paymentDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  paymentReference: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  paymentAmount: { alignItems: "flex-end" },
  amount: { fontSize: 14, fontWeight: "700", color: "#111827" },
  status: { fontSize: 11, marginTop: 2, fontWeight: "600" },

  // Empty State
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#111827", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#6b7280", marginTop: 4 },

  // List
  listContainer: { paddingBottom: 20 },
});
