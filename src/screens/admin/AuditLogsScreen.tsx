/**
 * Audit Logs Screen - Admin Panel
 * Platform Audit Trail for Regulatory Audits & Operations
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export const AuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([
    {
      id: "aud-001",
      actor: "Chief Technology Officer",
      action: "SUSPEND_USER",
      entity_type: "user",
      entity_id: "usr-mnc-103",
      details: "Suspended for document audit failure",
      ip_address: "192.168.1.10",
      created_at: new Date().toLocaleString(),
    },
    {
      id: "aud-002",
      actor: "Super Admin",
      action: "APPROVE_REFUND",
      entity_type: "refund",
      entity_id: "ref-902",
      details: "Approved $1,250.00 hotel double-charge",
      ip_address: "192.168.1.12",
      created_at: new Date(Date.now() - 3600000).toLocaleString(),
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");

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
        data={logs}
        keyExtractor={(item) => item.id}
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
