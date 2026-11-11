/**
 * Audit Logs Screen - Admin Panel
 * Platform Immutable Audit Trail for Regulatory Audits, RBAC Security & Operations
 */

import React, { useState, useEffect } from "react";
import { Platform,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { subscribeToAuditLogs } from "./commands/CommandDispatcher";
import { AdminPagination } from "./AdminPagination";

type FilterCategory = "ALL" | "REFUNDS" | "USERS" | "AGENCIES" | "HOTELS" | "COMMISSIONS" | "SECURITY";

export const AuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("ALL");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        setLogs(
          data.map((l: any) => ({
            id: l.id,
            actor: l.details?.admin_name || l.admin_name || l.actor || "Admin Operator",
            action: l.action || "SYSTEM_EVENT",
            module: l.module || "system",
            entity_type: l.entity_type || "system",
            entity_id: l.entity_id || l.details?.target_id || "-",
            rawDetails: l.details,
            detailsText:
              typeof l.details === "object"
                ? JSON.stringify(l.details, null, 2)
                : l.details || "Administrative operation logged",
            ip_address: l.ip_address || "Internal Gateway (127.0.0.1)",
            user_agent: l.user_agent || "Antigravity Enterprise RBAC / Command Engine",
            created_at: new Date(l.created_at || Date.now()).toLocaleString(),
          }))
        );
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.warn("Error loading audit logs:", e);
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();

    // 1. Listen to live Supabase changes
    const channel = supabase
      .channel(`audit-logs-live-${Math.random().toString(36).substring(2, 7)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_activity_logs" },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    // 2. Listen to instant local Command Dispatcher events
    const unsubscribeDispatcher = subscribeToAuditLogs((entry) => {
      const formatted = {
        id: entry.id || `local-${Date.now()}`,
        actor: entry.details?.admin_name || entry.admin_name || "Admin Operator",
        action: entry.action || "SYSTEM_EVENT",
        module: entry.module || "system",
        entity_type: entry.entity_type || "system",
        entity_id: entry.entity_id || entry.details?.target_id || "-",
        rawDetails: entry.details,
        detailsText:
          typeof entry.details === "object"
            ? JSON.stringify(entry.details, null, 2)
            : entry.details || "Administrative operation logged",
        ip_address: entry.ip_address || "127.0.0.1",
        user_agent: entry.user_agent || "Antigravity Enterprise RBAC / Command Engine",
        created_at: new Date().toLocaleString(),
      };
      setLogs((prev) => [formatted, ...prev.filter((p) => p.id !== formatted.id)]);
    });

    return () => {
      channel.unsubscribe();
      unsubscribeDispatcher();
    };
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes("SECURITY") || action.includes("BAN") || action.includes("REJECT")) {
      return "#ef4444";
    }
    if (action.includes("APPROVE") || action.includes("VERIFY") || action.includes("ACTIVATE")) {
      return "#10b981";
    }
    if (action.includes("SUSPEND") || action.includes("HOLD") || action.includes("UPDATE")) {
      return "#f59e0b";
    }
    return "#3b82f6";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("SECURITY")) return "shield-alert";
    if (action.includes("REFUND")) return "cash-refund";
    if (action.includes("USER")) return "account-badge-outline";
    if (action.includes("AGENCY")) return "domain";
    if (action.includes("HOTEL")) return "office-building-marker";
    if (action.includes("COMMISSION") || action.includes("PAYOUT")) return "wallet-giftcard";
    return "security-network";
  };

  const filteredLogs = logs.filter((item) => {
    // Category match
    if (selectedCategory !== "ALL") {
      if (selectedCategory === "REFUNDS" && !item.action.includes("REFUND") && item.module !== "refunds") return false;
      if (selectedCategory === "USERS" && !item.action.includes("USER") && item.module !== "users") return false;
      if (selectedCategory === "AGENCIES" && !item.action.includes("AGENCY") && item.module !== "agencies") return false;
      if (selectedCategory === "HOTELS" && !item.action.includes("HOTEL") && item.module !== "hotels") return false;
      if (selectedCategory === "COMMISSIONS" && !item.action.includes("COMMISSION") && !item.action.includes("PAYOUT")) return false;
      if (selectedCategory === "SECURITY" && !item.action.includes("SECURITY")) return false;
    }

    // Query match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.action.toLowerCase().includes(q) ||
      item.actor.toLowerCase().includes(q) ||
      item.detailsText.toLowerCase().includes(q) ||
      item.entity_type.toLowerCase().includes(q)
    );
  });

  // Pagination (default 20 items per page)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  const CATEGORIES: FilterCategory[] = ["ALL", "REFUNDS", "USERS", "AGENCIES", "HOTELS", "COMMISSIONS", "SECURITY"];

  return (
    <View style={styles.container}>
      {/* Header Search & Category Filter */}
      <View style={styles.headerArea}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search action, actor profile, target ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
                cat === "SECURITY" && selectedCategory === cat && { backgroundColor: "#ef4444" },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Audit Log Entries List */}
      <FlatList
        data={paginatedLogs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadLogs();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="shield-check-outline" size={54} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Audit Log Entries</Text>
              <Text style={styles.emptySubtitle}>
                Administrative commands (Refund, Ban, Verify, Commission Adjustments) will automatically record immutable compliance audit entries here.
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
          )
        }
        renderItem={({ item }) => {
          const actionColor = getActionColor(item.action);
          const actionIcon = getActionIcon(item.action);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedLog(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.actionBox}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${actionColor}15` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={actionIcon as any}
                      size={18}
                      color={actionColor}
                    />
                  </View>
                  <View>
                    <Text style={[styles.actionText, { color: actionColor }]}>
                      {item.action}
                    </Text>
                    <Text style={styles.moduleText}>Module: {item.module}</Text>
                  </View>
                </View>
                <Text style={styles.timeText}>{item.created_at}</Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.actorText}>Operator: {item.actor}</Text>
                <Text style={styles.detailText} numberOfLines={2}>
                  {item.detailsText}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.subtext}>
                    Target: {item.entity_type} ({item.entity_id})
                  </Text>
                  <Text style={styles.subtext}>IP: {item.ip_address}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          filteredLogs.length > PAGE_SIZE ? (
            <AdminPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null
        }
      />

      {/* Log Detail Modal */}
      <Modal
        visible={!!selectedLog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Immutable Audit Record</Text>
                <Text style={styles.modalSubtitle}>Table: admin_activity_logs</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={{ maxHeight: 450 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Log ID</Text>
                  <Text style={styles.detailVal}>{selectedLog.id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Action</Text>
                  <Text
                    style={[
                      styles.detailVal,
                      { fontWeight: "700", color: getActionColor(selectedLog.action) },
                    ]}
                  >
                    {selectedLog.action}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Module</Text>
                  <Text style={styles.detailVal}>{selectedLog.module}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Operator</Text>
                  <Text style={styles.detailVal}>{selectedLog.actor}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Target Entity</Text>
                  <Text style={styles.detailVal}>
                    {selectedLog.entity_type} ({selectedLog.entity_id})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>IP & Client</Text>
                  <Text style={styles.detailVal}>
                    {selectedLog.ip_address} | {selectedLog.user_agent}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Logged At</Text>
                  <Text style={styles.detailVal}>{selectedLog.created_at}</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.payloadTitle}>Structured Event Details (JSON)</Text>
                  <View style={styles.jsonBox}>
                    <Text style={styles.jsonText}>{selectedLog.detailsText}</Text>
                  </View>
                </View>
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
    padding: 12,
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
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: "#0f172a",
    fontSize: 13,
  },
  filterScroll: {
    marginTop: 8,
  },
  filterContainer: {
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  categoryChipActive: {
    backgroundColor: "#4f46e5",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  moduleText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  timeText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  cardContent: {
    marginTop: 8,
    gap: 3,
  },
  actorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  detailText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  subtext: {
    fontSize: 12,
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 16,
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  detailVal: {
    fontSize: 12,
    color: "#0f172a",
    maxWidth: "60%",
    textAlign: "right",
  },
  payloadTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  jsonBox: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 10,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#38bdf8",
  },
});
