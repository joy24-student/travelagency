/**
 * Refund Management Screen - Admin Panel
 * Manage refund requests and process refunds
 */

import React, { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { refundService, adminService } from "@/services/adminService";
import { RefundRequest, AdminUser } from "@/types/admin";

const { width } = Dimensions.get("window");

/**
 * Refund Status Badge
 */
const RefundStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<
    string,
    { color: string; icon: string; label: string }
  > = {
    pending: {
      color: "#f59e0b",
      icon: "clock",
      label: "Pending",
    },
    approved: {
      color: "#10b981",
      icon: "check-circle",
      label: "Approved",
    },
    processing: {
      color: "#3b82f6",
      icon: "progress-clock",
      label: "Processing",
    },
    completed: {
      color: "#06b6d4",
      icon: "check-all",
      label: "Completed",
    },
    rejected: {
      color: "#ef4444",
      icon: "x-circle",
      label: "Rejected",
    },
    on_hold: {
      color: "#8b5cf6",
      icon: "pause-circle",
      label: "On Hold",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${config.color}20`, borderColor: config.color },
      ]}
    >
      <MaterialCommunityIcons
        name={config.icon as any}
        size={14}
        color={config.color}
      />
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

/**
 * Refund Card Component
 */
const RefundCard: React.FC<{
  refund: RefundRequest;
  onPress: (refund: RefundRequest) => void;
}> = ({ refund, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(refund)}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.refundCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <LinearGradient
              colors={["#f59e0b", "#f97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons
                name="cash-refund"
                size={24}
                color="#fff"
              />
            </LinearGradient>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.refundId} numberOfLines={1}>
              Refund #{refund.id.slice(0, 8)}
            </Text>
            <Text style={styles.bookingRef}>
              Booking ID: {refund.booking_id?.slice(0, 8)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Refund Amount</Text>
              <Text style={styles.amountValue}>
                $
                {parseFloat(refund.refund_amount?.toString() || "0").toFixed(2)}
              </Text>
            </View>
            <RefundStatusBadge status={refund.refund_status || "pending"} />
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Reason</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {refund.refund_reason}
              </Text>
            </View>
          </View>

          {refund.refund_notes && (
            <View style={styles.notesRow}>
              <MaterialCommunityIcons name="note" size={14} color="#6b7280" />
              <Text style={styles.notesText}>{refund.refund_notes}</Text>
            </View>
          )}

          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Requested</Text>
              <Text style={styles.dateValue}>
                {new Date(refund.created_at).toLocaleDateString()}
              </Text>
            </View>
            {refund.processed_at && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Processed</Text>
                <Text style={styles.dateValue}>
                  {new Date(refund.processed_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={14} color="#667eea" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="file-document"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <MaterialCommunityIcons
              name="comment-multiple"
              size={14}
              color="#667eea"
            />
            <Text style={styles.actionButtonText}>Notes</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/**
 * Refund Action Modal
 */
const RefundActionModal: React.FC<{
  visible: boolean;
  refund: RefundRequest | null;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}> = ({ visible, refund, onClose, onAction }) => {
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "reject" | "process" | "hold" | null
  >(null);
  const [notes, setNotes] = useState("");

  const handleAction = () => {
    if (selectedAction) {
      onAction(selectedAction, { notes });
      setNotes("");
      setSelectedAction(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Refund Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {!selectedAction ? (
              <View>
                <Text style={styles.sectionTitle}>Select Action</Text>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("approve")}
                >
                  <LinearGradient
                    colors={["#43e97b", "#38f9d7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Approve Refund</Text>
                    <Text style={styles.actionOptionDesc}>
                      Approve the refund request
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("process")}
                >
                  <LinearGradient
                    colors={["#3b82f6", "#2563eb"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="progress-clock"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Process Refund</Text>
                    <Text style={styles.actionOptionDesc}>
                      Start processing the refund
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("hold")}
                >
                  <LinearGradient
                    colors={["#8b5cf6", "#7c3aed"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="pause-circle"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Put on Hold</Text>
                    <Text style={styles.actionOptionDesc}>
                      Put refund on hold for review
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => setSelectedAction("reject")}
                >
                  <LinearGradient
                    colors={["#ef4444", "#dc2626"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionOptionIcon}
                  >
                    <MaterialCommunityIcons
                      name="block-helper"
                      size={24}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={styles.actionOptionContent}>
                    <Text style={styles.actionOptionTitle}>Reject Refund</Text>
                    <Text style={styles.actionOptionDesc}>
                      Reject the refund request
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>
                  {selectedAction === "approve"
                    ? "Approve Refund"
                    : selectedAction === "process"
                      ? "Process Refund"
                      : selectedAction === "hold"
                        ? "Put on Hold"
                        : "Reject Refund"}
                </Text>
                <Text style={styles.reasonLabel}>Admin Notes</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter notes for this action..."
                  placeholderTextColor="#9ca3af"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setSelectedAction(null)}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={handleAction}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Refund Management Screen
 */
export const RefundManagementScreen: React.FC<{ admin: AdminUser | null }> = ({
  admin,
}) => {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadRefunds();
  }, [filterStatus]);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const allRefunds = await refundService.getAllRefunds(filterStatus, 100);
      setRefunds(allRefunds);
    } catch (error) {
      console.error("Error loading refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRefunds();
    setRefreshing(false);
  };

  const handleRefundPress = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setModalVisible(true);
  };

  const handleAction = async (action: string, data?: any) => {
    if (!selectedRefund || !admin) return;

    try {
      let success = false;
      switch (action) {
        case "approve":
          success = await refundService.approveRefund(
            selectedRefund.id,
            admin.id,
          );
          break;
        case "process":
          success = await refundService.processRefund(
            selectedRefund.id,
            admin.id,
            data?.notes || "",
          );
          break;
        case "reject":
          success = await refundService.rejectRefund(
            selectedRefund.id,
            data?.notes || "",
            admin.id,
          );
          break;
        case "hold":
          success = await refundService.holdRefund(
            selectedRefund.id,
            admin.id,
            data?.reason || "",
          );
          break;
      }

      if (success) {
        Alert.alert("Success", `Refund ${action} successful`);
        setModalVisible(false);
        await loadRefunds();
      } else {
        Alert.alert("Error", `Failed to ${action} refund`);
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while processing the action");
      console.error("Error:", error);
    }
  };

  const statuses = [
    "all",
    "pending",
    "approved",
    "processing",
    "completed",
    "rejected",
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#f59e0b", "#f97316"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Refund Management</Text>
        <Text style={styles.headerSubtitle}>
          Process and manage refund requests
        </Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterTabs}
        contentContainerStyle={styles.filterTabsContent}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === status && styles.filterTabTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={refunds}
          renderItem={({ item }) => (
            <RefundCard refund={item} onPress={handleRefundPress} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="cash-refund"
                size={64}
                color="#d1d5db"
              />
              <Text style={styles.emptyText}>No refunds found</Text>
            </View>
          }
        />
      )}

      <RefundActionModal
        visible={modalVisible}
        refund={selectedRefund}
        onClose={() => {
          setModalVisible(false);
          setSelectedRefund(null);
        }}
        onAction={handleAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#ffffff80",
  },
  filterTabs: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterTabActive: {
    backgroundColor: "#f59e0b",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 15,
  },
  refundCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  refundId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  bookingRef: {
    fontSize: 13,
    color: "#6b7280",
  },
  cardContent: {
    gap: 10,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  amountLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10b981",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailsRow: {
    gap: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: "#1f2937",
    fontWeight: "500",
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  notesText: {
    fontSize: 12,
    color: "#6b7280",
    flex: 1,
  },
  datesRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#667eea",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
  },
  actionOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionOptionContent: {
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  actionOptionDesc: {
    fontSize: 12,
    color: "#6b7280",
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#1f2937",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#f59e0b",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default RefundManagementScreen;
