/**
 * AGEN Agency Management - Admin Panel
 * Monitor, manage, and oversee all agencies in the AGEN portal
 * Real-time integration with Supabase and activity logging
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";

const { width } = Dimensions.get("window");

interface AgenAgency {
  id: string;
  name: string;
  owner_user_id: string;
  email: string;
  phone?: string;
  type: string;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  status: "active" | "inactive" | "suspended";
  rating: number;
  created_at: string;
  admin_notes?: string;
  total_bookings?: number;
  total_revenue?: number;
}

interface AgenActivityLog {
  id: string;
  agency_id: string;
  action: string;
  details: string;
  severity?: "info" | "warning" | "critical";
  created_at: string;
}

/**
 * Agency Status Badge
 */
const AgencyStatusBadge: React.FC<{ status: string; verification: string }> = ({
  status,
  verification,
}) => {
  const statusConfig: Record<
    string,
    { bg: string; text: string; color: string; icon: string }
  > = {
    active: {
      bg: "#10b98110",
      text: "#10b981",
      color: "#10b981",
      icon: "check-circle",
    },
    inactive: {
      bg: "#6b728010",
      text: "#6b7280",
      color: "#6b7280",
      icon: "pause-circle",
    },
    suspended: {
      bg: "#ef444410",
      text: "#ef4444",
      color: "#ef4444",
      icon: "alert-circle",
    },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon as any} size={14} color={config.text} />
      <Text style={[styles.badgeText, { color: config.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * Verification Status Badge
 */
const VerificationBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<
    string,
    { bg: string; color: string; label: string; icon: string }
  > = {
    verified: {
      bg: "#10b98110",
      color: "#10b981",
      label: "Verified",
      icon: "check-circle",
    },
    pending: {
      bg: "#f59e0b10",
      color: "#f59e0b",
      label: "Pending",
      icon: "clock",
    },
    rejected: {
      bg: "#ef444410",
      color: "#ef4444",
      label: "Rejected",
      icon: "x-circle",
    },
    suspended: {
      bg: "#8b5cf610",
      color: "#8b5cf6",
      label: "Suspended",
      icon: "alert-circle",
    },
  };

  const cfg = config[status] || config.pending;

  return (
    <View style={[styles.verificationBadge, { backgroundColor: cfg.bg }]}>
      <MaterialCommunityIcons name={cfg.icon as any} size={12} color={cfg.color} />
      <Text style={[styles.verificationText, { color: cfg.color }]}>
        {cfg.label}
      </Text>
    </View>
  );
};

/**
 * Agency Card with quick actions
 */
const AgencyCard: React.FC<{
  agency: AgenAgency;
  onPress: (agency: AgenAgency) => void;
  onAction: (action: string, agency: AgenAgency) => void;
}> = ({ agency, onPress, onAction }) => {
  return (
    <TouchableOpacity onPress={() => onPress(agency)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.agencyCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.agencyAvatar}>
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <MaterialCommunityIcons name="store" size={20} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName} numberOfLines={1}>
              {agency.name}
            </Text>
            <Text style={styles.agencyType}>{agency.type}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
            <Text style={styles.ratingText}>{agency.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statusRow}>
            <AgencyStatusBadge
              status={agency.status}
              verification={agency.verification_status}
            />
            <VerificationBadge status={agency.verification_status} />
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Bookings</Text>
              <Text style={styles.metricValue}>
                {agency.total_bookings || 0}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Revenue</Text>
              <Text style={styles.metricValue}>
                ${(agency.total_revenue || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Status</Text>
              <Text style={[styles.metricValue, { color: "#667eea" }]}>
                {agency.status}
              </Text>
            </View>
          </View>

          {agency.admin_notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Admin Notes:</Text>
              <Text style={styles.notesText} numberOfLines={2}>
                {agency.admin_notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAction("verify", agency)}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color="#10b981"
            />
            <Text style={[styles.actionText, { color: "#10b981" }]}>
              Verify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAction("suspend", agency)}
          >
            <MaterialCommunityIcons
              name="pause-circle"
              size={16}
              color="#f59e0b"
            />
            <Text style={[styles.actionText, { color: "#f59e0b" }]}>
              Suspend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAction("details", agency)}
          >
            <MaterialCommunityIcons
              name="information"
              size={16}
              color="#667eea"
            />
            <Text style={[styles.actionText, { color: "#667eea" }]}>
              Details
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Main Screen Component
 */
export default function AgenAgencyManagementScreen() {
  const [agencies, setAgencies] = useState<AgenAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterstatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<AgenAgency | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AgenActivityLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;

  // Load agencies
  const loadAgencies = useCallback(async () => {
    try {
      let query = supabase
        .from("agencies")
        .select(
          `
        id,
        name,
        owner_user_id,
        email,
        phone,
        type,
        verification_status,
        status,
        rating,
        created_at,
        admin_notes
      `,
        )
        .order("created_at", { ascending: false });

      if (filterstatus !== "all") {
        query = query.eq("status", filterstatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get booking counts and revenue for each agency
      const agenciesWithMetrics = await Promise.all(
        (data || []).map(async (agency: any) => {
          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, final_price")
            .eq("agency_id", agency.id);

          return {
            ...agency,
            total_bookings: bookings?.length || 0,
            total_revenue: bookings?.reduce(
              (sum, b) => sum + Number(b.final_price || 0),
              0,
            ) || 0,
          };
        }),
      );

      setAgencies(agenciesWithMetrics);
    } catch (error) {
      console.error("Error loading agencies:", error);
      Alert.alert("Error", "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  }, [filterstatus]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAgencies();
    setRefreshing(false);
  };

  // Handle actions
  const handleAction = async (action: string, agency: AgenAgency) => {
    switch (action) {
      case "verify":
        updateAgencyStatus(agency, "verified");
        break;
      case "suspend":
        Alert.prompt("Suspend Agency", "Enter reason for suspension:", (text) =>
          suspendAgency(agency, text),
        );
        break;
      case "details":
        loadActivityLogs(agency);
        setSelectedAgency(agency);
        setAdminNotes(agency.admin_notes || "");
        setShowDetailModal(true);
        break;
    }
  };

  const updateAgencyStatus = async (
    agency: AgenAgency,
    newStatus: string,
  ) => {
    try {
      const { error } = await supabase
        .from("agencies")
        .update({ verification_status: newStatus })
        .eq("id", agency.id);

      if (error) throw error;

      // Log activity
      await supabase.from("agency_activity_logs").insert({
        agency_id: agency.id,
        action: "verification_status_updated",
        details: `Verification status updated to ${newStatus} by admin`,
        severity: "info",
      });

      Alert.alert("Success", `Agency ${newStatus} successfully`);
      loadAgencies();
    } catch (error) {
      Alert.alert("Error", "Failed to update agency status");
    }
  };

  const suspendAgency = async (agency: AgenAgency, reason: string) => {
    try {
      const { error } = await supabase
        .from("agencies")
        .update({
          status: "suspended",
          admin_notes: reason,
        })
        .eq("id", agency.id);

      if (error) throw error;

      await supabase.from("agency_activity_logs").insert({
        agency_id: agency.id,
        action: "agency_suspended",
        details: `Agency suspended by admin. Reason: ${reason}`,
        severity: "warning",
      });

      Alert.alert("Success", "Agency suspended successfully");
      loadAgencies();
    } catch (error) {
      Alert.alert("Error", "Failed to suspend agency");
    }
  };

  const loadActivityLogs = async (agency: AgenAgency) => {
    try {
      const { data, error } = await supabase
        .from("agency_activity_logs")
        .select("*")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    }
  };

  const updateAdminNotes = async () => {
    if (!selectedAgency) return;

    try {
      const { error } = await supabase
        .from("agencies")
        .update({ admin_notes: adminNotes })
        .eq("id", selectedAgency.id);

      if (error) throw error;

      Alert.alert("Success", "Admin notes updated");
      setShowDetailModal(false);
      loadAgencies();
    } catch (error) {
      Alert.alert("Error", "Failed to save admin notes");
    }
  };

  const filteredAgencies = agencies.filter(
    (agency) =>
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>AGEN Agencies</Text>
        <Text style={styles.headerSubtitle}>
          Manage {filteredAgencies.length} agencies
        </Text>
      </LinearGradient>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agencies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {["all", "active", "inactive", "suspended"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterTab,
              filterstatus === tab && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(tab)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterstatus === tab && styles.filterTabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Agencies List */}
      <FlatList
        data={filteredAgencies}
        renderItem={({ item }) => (
          <AgencyCard
            agency={item}
            onPress={() => {
              loadActivityLogs(item);
              setSelectedAgency(item);
              setAdminNotes(item.admin_notes || "");
              setShowDetailModal(true);
            }}
            onAction={handleAction}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="store-outline"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyStateText}>No agencies found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ScrollView style={styles.detailModal}>
          {selectedAgency && (
            <>
              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="chevron-back" size={28} color="#667eea" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedAgency.name}</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Agency Info */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Agency Information</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{selectedAgency.name}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{selectedAgency.email}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type:</Text>
                  <Text style={styles.infoValue}>{selectedAgency.type}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={styles.infoValue}>{selectedAgency.status}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Verification:</Text>
                  <Text style={styles.infoValue}>
                    {selectedAgency.verification_status}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rating:</Text>
                  <Text style={styles.infoValue}>
                    {selectedAgency.rating.toFixed(1)} ⭐
                  </Text>
                </View>
              </View>

              {/* Admin Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Admin Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Add admin notes about this agency..."
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateAdminNotes}
                >
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                </TouchableOpacity>
              </View>

              {/* Activity Logs */}
              <View style={styles.logsSection}>
                <View style={styles.logsHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <TouchableOpacity
                    onPress={() => setShowLogsModal(true)}
                  >
                    <Text style={styles.viewAllLink}>View All</Text>
                  </TouchableOpacity>
                </View>

                {activityLogs.slice(0, 5).map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View
                      style={[
                        styles.logDot,
                        {
                          backgroundColor:
                            log.severity === "critical"
                              ? "#ef4444"
                              : log.severity === "warning"
                                ? "#f59e0b"
                                : "#10b981",
                        },
                      ]}
                    />
                    <View style={styles.logContent}>
                      <Text style={styles.logAction}>{log.action}</Text>
                      <Text style={styles.logDetails}>{log.details}</Text>
                      <Text style={styles.logTime}>
                        {new Date(log.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Modal>

      {/* Logs Modal */}
      <Modal
        visible={showLogsModal}
        animationType="slide"
        onRequestClose={() => setShowLogsModal(false)}
      >
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLogsModal(false)}>
              <Ionicons name="chevron-back" size={28} color="#667eea" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Activity Logs</Text>
            <View style={{ width: 28 }} />
          </View>

          <FlatList
            data={activityLogs}
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <View
                  style={[
                    styles.logDot,
                    {
                      backgroundColor:
                        item.severity === "critical"
                          ? "#ef4444"
                          : item.severity === "warning"
                            ? "#f59e0b"
                            : "#10b981",
                    },
                  ]}
                />
                <View style={styles.logContent}>
                  <Text style={styles.logAction}>{item.action}</Text>
                  <Text style={styles.logDetails}>{item.details}</Text>
                  <Text style={styles.logTime}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1f2937",
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  filterTabActive: {
    backgroundColor: "#667eea",
  },
  filterTabText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  agencyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  agencyAvatar: {
    width: 44,
    height: 44,
    marginRight: 12,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  agencyInfo: {
    flex: 1,
  },
  agencyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  agencyType: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c710",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
  },
  cardBody: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  notesSection: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
  detailModal: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  infoSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  notesInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    textAlignVertical: "top",
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#667eea",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  logsSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllLink: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 12,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  logDetails: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  logTime: {
    fontSize: 11,
    color: "#9ca3af",
  },
});
