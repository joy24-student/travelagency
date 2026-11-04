/**
 * Audit Logs Screen - Admin Panel
 * Platform Audit Trail for Regulatory Audits & Operations
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

export const AuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
            actor: l.admin_name || l.actor || "Admin Operator",
            action: l.action || "SYSTEM_EVENT",
            entity_type: l.entity_type || "system",
            entity_id: l.entity_id || "-",
            details: typeof l.details === "object" ? JSON.stringify(l.details) : (l.details || "Administrative operation logged"),
            ip_address: l.ip_address || "Internal Gateway",
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

    const channel = supabase
      .channel(`audit-logs-live-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_activity_logs" }, () => {
        loadLogs();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredLogs = logs.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.action.toLowerCase().includes(q) ||
      item.actor.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search action, actor profile..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLogs(); }} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 24 }}>
              <MaterialCommunityIcons name="shield-check-outline" size={54} color="#94a3b8" />
              <Text style={{ marginTop: 12, fontSize: 16, fontWeight: "600", color: "#64748b" }}>
                No Audit Log Entries
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                Admin and platform security operations will be logged here for compliance auditing.
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.actionBox}>
                <MaterialCommunityIcons name="security-network" size={18} color="#ef4444" />
                <Text style={styles.actionText}>{item.action}</Text>
              </View>
              <Text style={styles.timeText}>{item.created_at}</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.actorText}>Actor: {item.actor}</Text>
              <Text style={styles.detailText}>Details: {item.details}</Text>
              <Text style={styles.subtext}>
                IP: {item.ip_address} | Target: {item.entity_type} ({item.entity_id})
              </Text>
            </View>
          </View>
        )}
      />
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
  actionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ef4444",
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  cardContent: {
    marginTop: 10,
    gap: 4,
  },
  actorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  detailText: {
    fontSize: 13,
    color: "#475569",
  },
  subtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
});
