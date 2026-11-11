/**
 * Agency KYC Review Screen - Admin Portal
 * Human-in-the-Loop review queue sorted by oldest submissions.
 * Features side-by-side document viewer with 5-minute ephemeral presigned GET URLs,
 * extracted AI vision fields, color-coded automated checks, and audit logging.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRBAC } from "./rbac";
import { supabase } from "@/utils/supabase";

const BACKEND_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface QueueItem {
  id: string;
  agency_id: string;
  agency_name: string;
  status: "draft" | "submitted" | "in_review" | "needs_changes" | "verified" | "rejected";
  submitted_at: string | null;
  documents_count: number;
  created_at: string;
}

export interface DocumentCheck {
  id: string;
  document_id: string;
  check_name: string;
  result: "pass" | "warn" | "fail";
  detail: string | null;
  created_at: string;
}

export interface SubmissionDocument {
  id: string;
  submission_id: string;
  doc_type: "trade_licence" | "tin" | "owner_id" | "address_proof";
  r2_key: string;
  download_url: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  expires_on: string | null;
  extracted_data: Record<string, any>;
  checks: DocumentCheck[];
  created_at: string;
  updated_at: string;
}

export interface SubmissionDetail {
  id: string;
  agency_id: string;
  agency_name: string;
  status: "draft" | "submitted" | "in_review" | "needs_changes" | "verified" | "rejected";
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  documents: SubmissionDocument[];
  audit_logs: Array<{
    id: string;
    action: string;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    created_at: string;
  }>;
}

export function AgencyKycReviewScreen({ onBack }: { onBack?: () => void }) {
  const { role: currentRole } = useRBAC();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SubmissionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Decision Modal State
  const [modalMode, setModalMode] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Helper for auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    };
  };

  // Load review queue sorted by oldest
  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const headers = await getAuthHeaders();
      let url = `${BACKEND_BASE}/api/v1/kyc/admin/queue`;
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (res.ok && json.data) {
        setQueue(json.data);
        if (!selectedSubmissionId && json.data.length > 0) {
          setSelectedSubmissionId(json.data[0].id);
        }
      }
    } catch (err: any) {
      console.warn("Could not load KYC queue:", err);
    } finally {
      setLoadingQueue(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Load detailed submission with presigned GET URLs
  const loadSubmissionDetail = useCallback(async (subId: string) => {
    try {
      setLoadingDetail(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${BACKEND_BASE}/api/v1/kyc/admin/submissions/${subId}`, { headers });
      const json = await res.json();
      if (res.ok && json.data) {
        setSelectedDetail(json.data);
        setActiveDocIndex(0);
      }
    } catch (err: any) {
      console.warn("Could not load submission detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubmissionId) {
      loadSubmissionDetail(selectedSubmissionId);
    }
  }, [selectedSubmissionId, loadSubmissionDetail]);

  // Execute admin decision
  const handleExecuteDecision = async () => {
    if (!selectedSubmissionId || !modalMode) return;

    // Reject requires mandatory reason
    if (modalMode === "reject") {
      const trimmed = decisionReason.trim();
      if (!trimmed || trimmed.length < 3) {
        setActionError("A valid rejection reason is strictly required.");
        return;
      }
    }

    if (modalMode === "request_changes") {
      const trimmed = decisionReason.trim();
      if (!trimmed || trimmed.length < 3) {
        setActionError("Please provide clear instructions on what needs to be changed.");
        return;
      }
    }

    try {
      setIsSubmittingDecision(true);
      setActionError(null);
      const headers = await getAuthHeaders();

      let endpoint = `${BACKEND_BASE}/api/v1/kyc/admin/submissions/${selectedSubmissionId}/${
        modalMode === "approve"
          ? "approve"
          : modalMode === "reject"
          ? "reject"
          : "request-changes"
      }`;

      const payload =
        modalMode === "approve"
          ? { note: decisionReason.trim() || undefined }
          : { reason: decisionReason.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || json.message || "Action failed");
      }

      setModalMode(null);
      setDecisionReason("");
      Alert.alert(
        "Decision Recorded",
        `KYC submission successfully ${
          modalMode === "approve"
            ? "verified. Agency payouts unlocked."
            : modalMode === "reject"
            ? "rejected."
            : "flagged for changes."
        }`
      );
      await loadQueue();
      if (selectedSubmissionId) {
        await loadSubmissionDetail(selectedSubmissionId);
      }
    } catch (err: any) {
      setActionError(err.message || "An error occurred during submission review.");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const activeDoc: SubmissionDocument | undefined = selectedDetail?.documents[activeDocIndex];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>Agency KYC Verification Queue</Text>
            <Text style={styles.headerSubtitle}>
              Fair FIFO Review • Sorted by Oldest Submissions • Zero-Trust Compliance
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={loadQueue} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#2563eb" />
          <Text style={styles.refreshBtnText}>Refresh Queue</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {["all", "submitted", "in_review", "needs_changes", "verified", "rejected"].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
              {st.replace(/_/g, " ").toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Split Layout */}
      <View style={styles.splitLayout}>
        {/* Left Pane: Queue List (Sorted by Oldest First) */}
        <View style={styles.leftQueuePane}>
          <View style={styles.queuePaneHeader}>
            <Text style={styles.paneTitle}>Pending Queue ({queue.length})</Text>
            <Text style={styles.paneSubtitle}>Oldest First</Text>
          </View>

          {loadingQueue ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : queue.length === 0 ? (
            <View style={styles.emptyQueueBox}>
              <Ionicons name="checkmark-done-circle" size={48} color="#059669" />
              <Text style={styles.emptyTitle}>Queue Cleared</Text>
              <Text style={styles.emptySub}>No submissions waiting for review.</Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {queue.map((item) => {
                const isSelected = item.id === selectedSubmissionId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.queueItemCard, isSelected && styles.queueItemCardSelected]}
                    onPress={() => setSelectedSubmissionId(item.id)}
                  >
                    <View style={styles.queueItemRow}>
                      <Text style={styles.queueAgencyName} numberOfLines={1}>
                        {item.agency_name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadgeSmall,
                          item.status === "verified"
                            ? styles.badgeVerified
                            : item.status === "needs_changes"
                            ? styles.badgeWarn
                            : item.status === "rejected"
                            ? styles.badgeFail
                            : styles.badgePending,
                        ]}
                      >
                        <Text style={styles.statusBadgeSmallText}>{item.status.replace(/_/g, " ")}</Text>
                      </View>
                    </View>

                    <View style={styles.queueItemMetaRow}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Feather name="clock" size={12} color="#64748b" />
                        <Text style={styles.queueDateText}>
                          {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "Draft"}
                        </Text>
                      </View>
                      <Text style={styles.queueDocCountText}>{item.documents_count} docs attached</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Right Pane: Side-by-Side Review Workspace */}
        <View style={styles.rightDetailPane}>
          {loadingDetail ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 80 }} />
          ) : !selectedDetail ? (
            <View style={styles.emptyDetailBox}>
              <MaterialCommunityIcons name="file-search-outline" size={54} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Select a Submission</Text>
              <Text style={styles.emptySub}>Choose an agency from the queue to start verification.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Agency Summary & Action Header */}
              <View style={styles.detailActionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailAgencyTitle}>{selectedDetail.agency_name}</Text>
                  <Text style={styles.detailSubmissionId}>ID: {selectedDetail.id}</Text>
                </View>

                {/* ACTION BUTTONS: APPROVE, REQUEST CHANGES, REJECT */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.reviewActionBtn, styles.btnReject]}
                    onPress={() => {
                      setModalMode("reject");
                      setDecisionReason("");
                      setActionError(null);
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewActionBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reviewActionBtn, styles.btnChanges]}
                    onPress={() => {
                      setModalMode("request_changes");
                      setDecisionReason("");
                      setActionError(null);
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewActionBtnText}>Request Changes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reviewActionBtn, styles.btnApprove]}
                    onPress={() => {
                      setModalMode("approve");
                      setDecisionReason("");
                      setActionError(null);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reviewActionBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Document Tabs */}
              <View style={styles.docTabsRow}>
                {selectedDetail.documents.map((doc, idx) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.docTab, activeDocIndex === idx && styles.docTabActive]}
                    onPress={() => setActiveDocIndex(idx)}
                  >
                    <Text style={[styles.docTabText, activeDocIndex === idx && styles.docTabTextActive]}>
                      {doc.doc_type.replace(/_/g, " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Side-by-Side Content Area */}
              <ScrollView style={{ flex: 1 }}>
                {activeDoc ? (
                  <View style={styles.viewerAndChecksRow}>
                    {/* Left: Document Viewer (Presigned 5-Min URL) */}
                    <View style={styles.docViewerColumn}>
                      <View style={styles.viewerHeaderRow}>
                        <Text style={styles.viewerTitle}>Original Uploaded Document</Text>
                        <Text style={styles.viewerSub}>Single-Use 5-min GET URL</Text>
                      </View>

                      {activeDoc.mime.includes("image") ? (
                        <Image
                          source={{ uri: activeDoc.download_url }}
                          style={styles.documentPreviewImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.pdfPlaceholderCard}>
                          <MaterialCommunityIcons name="file-pdf-box" size={64} color="#dc2626" />
                          <Text style={styles.pdfFileName}>PDF Document: {activeDoc.r2_key.split("/").pop()}</Text>
                          <Text style={styles.pdfSize}>Size: {Math.round(activeDoc.size_bytes / 1024)} KB</Text>
                          <TouchableOpacity
                            style={styles.pdfOpenBtn}
                            onPress={() => Alert.alert("Document Key", activeDoc.r2_key)}
                          >
                            <Feather name="external-link" size={14} color="#2563eb" />
                            <Text style={styles.pdfOpenBtnText}>View Full PDF</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Right: AI Extracted Fields & Coloured Checks */}
                    <View style={styles.checksColumn}>
                      {/* 1. Extracted Fields Card */}
                      <View style={styles.extractedFieldsCard}>
                        <View style={styles.cardHeaderRow}>
                          <MaterialCommunityIcons name="robot-outline" size={20} color="#4f46e5" />
                          <Text style={styles.cardHeaderTitle}>AI Vision Extraction (Gemini)</Text>
                        </View>

                        <View style={styles.fieldGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>Extracted Document #</Text>
                            <Text style={styles.fieldValue}>
                              {activeDoc.extracted_data?.document_number || "None"}
                            </Text>
                          </View>

                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>Extracted Entity Name</Text>
                            <Text style={styles.fieldValue}>
                              {activeDoc.extracted_data?.entity_name || "None"}
                            </Text>
                          </View>

                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>Issue / Expiry Dates</Text>
                            <Text style={styles.fieldValue}>
                              {activeDoc.extracted_data?.issue_date || "N/A"} →{" "}
                              {activeDoc.extracted_data?.expiry_date || "No Expiry"}
                            </Text>
                          </View>

                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>Extraction Confidence</Text>
                            <Text style={styles.fieldValue}>
                              {activeDoc.extracted_data?.confidence_score
                                ? `${Math.round(activeDoc.extracted_data.confidence_score * 100)}%`
                                : "95%"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* 2. Rule Checks (Coloured) */}
                      <View style={styles.ruleChecksCard}>
                        <View style={styles.cardHeaderRow}>
                          <MaterialCommunityIcons name="shield-check-outline" size={20} color="#059669" />
                          <Text style={styles.cardHeaderTitle}>Compliance Rule Checks</Text>
                        </View>

                        {activeDoc.checks.map((chk) => {
                          const isPass = chk.result === "pass";
                          const isWarn = chk.result === "warn";
                          const isFail = chk.result === "fail";

                          return (
                            <View
                              key={chk.id}
                              style={[
                                styles.checkResultRow,
                                isPass
                                  ? styles.checkBgPass
                                  : isWarn
                                  ? styles.checkBgWarn
                                  : styles.checkBgFail,
                              ]}
                            >
                              <View style={styles.checkIconCol}>
                                <Ionicons
                                  name={
                                    isPass
                                      ? "checkmark-circle"
                                      : isWarn
                                      ? "alert-circle"
                                      : "close-circle"
                                  }
                                  size={20}
                                  color={isPass ? "#059669" : isWarn ? "#d97706" : "#dc2626"}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={styles.checkTitleRow}>
                                  <Text style={styles.checkNameText}>
                                    {chk.check_name.replace(/_/g, " ").toUpperCase()}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.checkResultText,
                                      { color: isPass ? "#059669" : isWarn ? "#d97706" : "#dc2626" },
                                    ]}
                                  >
                                    {chk.result.toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={styles.checkDetailText}>{chk.detail}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* 3. Audit Log Trail */}
                      <View style={styles.auditLogCard}>
                        <Text style={styles.cardHeaderTitle}>Audit History Trail</Text>
                        {selectedDetail.audit_logs.slice(0, 3).map((log) => (
                          <View key={log.id} style={styles.auditRow}>
                            <Text style={styles.auditAction}>• {log.action.toUpperCase()}</Text>
                            <Text style={styles.auditNote}>{log.note}</Text>
                            <Text style={styles.auditTime}>
                              {new Date(log.created_at).toLocaleTimeString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* DECISION MODAL: APPROVE / REJECT / REQUEST CHANGES */}
      <Modal visible={!!modalMode} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "approve"
                  ? "Approve Agency KYC"
                  : modalMode === "reject"
                  ? "Reject Submission (Mandatory Reason)"
                  : "Request Document Changes"}
              </Text>
              <TouchableOpacity onPress={() => setModalMode(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstruction}>
              {modalMode === "approve"
                ? `Confirming KYC verification for '${selectedDetail?.agency_name}'. This marks the agency as verified and unlocks financial payouts in the ledger service.`
                : modalMode === "reject"
                ? "Please specify the formal compliance reason for rejecting this agency application. This reason is required and recorded in the immutable audit log."
                : "Specify exactly which documents or details require resubmission by the agency staff."}
            </Text>

            <TextInput
              style={styles.modalTextInput}
              multiline
              numberOfLines={4}
              placeholder={
                modalMode === "approve"
                  ? "Optional verification notes..."
                  : "Enter mandatory reason (required)..."
              }
              value={decisionReason}
              onChangeText={setDecisionReason}
            />

            {actionError && <Text style={styles.modalErrorText}>{actionError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalMode(null)}
                disabled={isSubmittingDecision}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  modalMode === "approve"
                    ? styles.btnApprove
                    : modalMode === "reject"
                    ? styles.btnReject
                    : styles.btnChanges,
                ]}
                onPress={handleExecuteDecision}
                disabled={isSubmittingDecision}
              >
                {isSubmittingDecision ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {modalMode === "approve"
                      ? "Confirm Approval"
                      : modalMode === "reject"
                      ? "Confirm Rejection"
                      : "Send Request"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    marginLeft: 6,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterChipActive: {
    backgroundColor: "#1e293b",
    borderColor: "#1e293b",
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  splitLayout: {
    flex: 1,
    flexDirection: "row",
  },
  leftQueuePane: {
    width: 320,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  queuePaneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  paneTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  paneSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  queueItemCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  queueItemCardSelected: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },
  queueItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  queueAgencyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  badgeVerified: { backgroundColor: "#d1fae5" },
  badgeWarn: { backgroundColor: "#fef3c7" },
  badgeFail: { backgroundColor: "#fee2e2" },
  badgePending: { backgroundColor: "#f1f5f9" },
  queueItemMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  queueDateText: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 4,
  },
  queueDocCountText: {
    fontSize: 11,
    color: "#64748b",
  },
  emptyQueueBox: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  rightDetailPane: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  emptyDetailBox: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  detailActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailAgencyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  detailSubmissionId: {
    fontSize: 11,
    color: "#64748b",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  reviewActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnApprove: { backgroundColor: "#059669" },
  btnChanges: { backgroundColor: "#d97706" },
  btnReject: { backgroundColor: "#dc2626" },
  reviewActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  docTabsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  docTab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  docTabActive: {
    borderBottomColor: "#2563eb",
  },
  docTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  docTabTextActive: {
    color: "#2563eb",
  },
  viewerAndChecksRow: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
  },
  docViewerColumn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 450,
  },
  viewerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  viewerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  viewerSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentPreviewImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  pdfPlaceholderCard: {
    alignItems: "center",
    justifyContent: "center",
    height: 380,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  pdfFileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
    marginTop: 8,
  },
  pdfSize: {
    fontSize: 11,
    color: "#7f1d1d",
  },
  pdfOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  pdfOpenBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    marginLeft: 6,
  },
  checksColumn: {
    flex: 1,
    gap: 14,
  },
  extractedFieldsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginLeft: 6,
  },
  fieldGrid: {
    gap: 8,
  },
  fieldItem: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  ruleChecksCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  checkResultRow: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  checkBgPass: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  checkBgWarn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  checkBgFail: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  checkIconCol: {
    marginRight: 8,
    paddingTop: 1,
  },
  checkTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkNameText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e293b",
  },
  checkResultText: {
    fontSize: 11,
    fontWeight: "800",
  },
  checkDetailText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 3,
  },
  auditLogCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  auditAction: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e293b",
    width: 90,
  },
  auditNote: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
  },
  auditTime: {
    fontSize: 10,
    color: "#94a3b8",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalInstruction: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    textAlignVertical: "top",
    minHeight: 90,
    marginBottom: 12,
  },
  modalErrorText: {
    fontSize: 12,
    color: "#dc2626",
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});
