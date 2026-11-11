/**
 * Admin Marketplace Management & Provider Verification Screen - Shopno Jatra
 * Covers: Pending verification queue, document inspection, provider approvals/rejections,
 * active trip monitoring, emergency SOS logs, and disputes.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import axios from "axios";

import { ProviderProfile } from "../../types/marketplace";
import { CURATED_PROVIDERS } from "../../services/marketplaceService";

type MarketplaceSubTab = "pending" | "providers" | "active_trips" | "emergency_events";

interface PendingApplicant {
  id: string;
  full_name: string;
  phone: string;
  category: string;
  destination: string;
  experience_years: number;
  documents: { type: string; number: string; verified: boolean }[];
  applied_at: string;
}

const SAMPLE_PENDING: PendingApplicant[] = [
  {
    id: "app-001",
    full_name: "Kazi Shafiqul Islam",
    phone: "+8801712998877",
    category: "boatman",
    destination: "Sundarbans",
    experience_years: 12,
    documents: [
      { type: "NID Card (Smart)", number: "19881234567890", verified: true },
      { type: "BIWTA Boat Fitness Cert", number: "BIWTA-KHU-8821", verified: false },
      { type: "Police Clearance Cert", number: "PCC-2026-9901", verified: true },
    ],
    applied_at: "2 hours ago",
  },
  {
    id: "app-002",
    full_name: "Ching Hla Mong Marma",
    phone: "+8801815667788",
    category: "trekking_guide",
    destination: "Bandarban",
    experience_years: 7,
    documents: [
      { type: "NID Card (Smart)", number: "19945566778899", verified: true },
      { type: "Tourist Police Guide License", number: "TP-BAN-4412", verified: false },
    ],
    applied_at: "Yesterday",
  },
];

export const MarketplaceManagementScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<MarketplaceSubTab>("pending");
  const [pendingList, setPendingList] = useState<PendingApplicant[]>(SAMPLE_PENDING);
  const [approvedList, setApprovedList] = useState<ProviderProfile[]>(CURATED_PROVIDERS);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Reviewing an Application
  const [selectedApplicant, setSelectedApplicant] = useState<PendingApplicant | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtered providers
  const filteredApproved = useMemo(() => {
    if (!searchQuery) return approvedList;
    const q = searchQuery.toLowerCase();
    return approvedList.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.primary_destination.toLowerCase().includes(q) ||
        p.provider_category.toLowerCase().includes(q)
    );
  }, [approvedList, searchQuery]);

  // Handle Approve
  const handleApprove = useCallback(() => {
    if (!selectedApplicant) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPendingList((prev) => prev.filter((a) => a.id !== selectedApplicant.id));
      setReviewModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Application Approved! ✅",
        `${selectedApplicant.full_name} is now a Verified ${selectedApplicant.category.replace("_", " ")}.`
      );
    }, 700);
  }, [selectedApplicant]);

  // Handle Reject
  const handleReject = useCallback(() => {
    if (!selectedApplicant) return;
    if (!rejectionReason.trim()) {
      Alert.alert("Reason Required", "Please state the reason for rejection (e.g. invalid license, expired NID).");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPendingList((prev) => prev.filter((a) => a.id !== selectedApplicant.id));
      setReviewModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Application Rejected", `Rejection reason recorded for ${selectedApplicant.full_name}.`);
    }, 700);
  }, [selectedApplicant, rejectionReason]);

  return (
    <View style={styles.container}>
      {/* Metric Counters Banner */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{pendingList.length}</Text>
          <Text style={styles.metricTitle}>Pending Verification</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: "#10B981" }]}>{approvedList.length}</Text>
          <Text style={styles.metricTitle}>Verified Providers</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: "#0055F2" }]}>1</Text>
          <Text style={styles.metricTitle}>Active Trips</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: "#EF4444" }]}>0</Text>
          <Text style={styles.metricTitle}>Active SOS</Text>
        </View>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabsNav}>
        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === "pending" && styles.tabBtnActive]}
          onPress={() => setActiveSubTab("pending")}
        >
          <Text style={[styles.tabBtnText, activeSubTab === "pending" && styles.tabBtnTextActive]}>
            Pending Review ({pendingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === "providers" && styles.tabBtnActive]}
          onPress={() => setActiveSubTab("providers")}
        >
          <Text style={[styles.tabBtnText, activeSubTab === "providers" && styles.tabBtnTextActive]}>
            All Providers ({approvedList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeSubTab === "active_trips" && styles.tabBtnActive]}
          onPress={() => setActiveSubTab("active_trips")}
        >
          <Text style={[styles.tabBtnText, activeSubTab === "active_trips" && styles.tabBtnTextActive]}>
            Active Trips (1)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SUB-TAB 1: PENDING VERIFICATIONS */}
        {activeSubTab === "pending" && (
          <View>
            {pendingList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
                <Text style={styles.emptyTitle}>Queue Cleared!</Text>
                <Text style={styles.emptySub}>No pending provider applications requiring review.</Text>
              </View>
            ) : (
              pendingList.map((item) => (
                <View key={item.id} style={styles.applicantCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.applicantName}>{item.full_name}</Text>
                      <Text style={styles.applicantMeta}>
                        📍 {item.destination} • {item.category.toUpperCase().replace("_", " ")} • {item.experience_years} yrs exp
                      </Text>
                      <Text style={styles.applicantTime}>Applied: {item.applied_at}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => {
                        setSelectedApplicant(item);
                        setReviewModalVisible(true);
                      }}
                    >
                      <Text style={styles.reviewBtnText}>Inspect & Verify</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.docSummaryRow}>
                    <Text style={styles.docLabel}>Documents Attached ({item.documents.length}):</Text>
                    <View style={styles.docTagsWrap}>
                      {item.documents.map((d, i) => (
                        <View key={i} style={styles.docChip}>
                          <Ionicons
                            name={d.verified ? "checkmark-circle" : "time-outline"}
                            size={14}
                            color={d.verified ? "#10B981" : "#F59E0B"}
                          />
                          <Text style={styles.docChipText}>{d.type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* SUB-TAB 2: ALL APPROVED PROVIDERS */}
        {activeSubTab === "providers" && (
          <View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search providers by name, area, category..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredApproved.map((p) => (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.pCardHeader}>
                  <View>
                    <Text style={styles.pName}>{p.full_name}</Text>
                    <Text style={styles.pBadge}>
                      {p.badge} • ⭐️ {p.rating} ({p.reviews_count} reviews)
                    </Text>
                    <Text style={styles.pSub}>
                      📍 {p.primary_destination} • Daily: ৳{p.daily_rate} • {p.total_trips} trips completed
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.statusPillText}>VERIFIED</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SUB-TAB 3: ACTIVE TRIPS */}
        {activeSubTab === "active_trips" && (
          <View>
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View>
                  <Text style={styles.tripTitle}>Trip #SJ-MKT-7F2A: Inani Beach Guided Walk</Text>
                  <Text style={styles.tripSub}>Guide: Mahmud Hasan Niloy • Tourist: Tanvir Hasan</Text>
                </View>
                <View style={styles.liveTag}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveTagText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.tripLocation}>Current Position: 21.350° N, 92.010° E (Inani Rocky Reef)</Text>
              <Text style={styles.tripTelemetry}>Speed: 4.2 km/h • Covered: 1.4 km • Duration: 00:24:18</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INSPECT & VERIFY MODAL */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Provider Verification Dossier</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedApplicant && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.applicantDetailTitle}>{selectedApplicant.full_name}</Text>
                <Text style={styles.applicantDetailSub}>
                  Phone: {selectedApplicant.phone} • Destination: {selectedApplicant.destination}
                </Text>

                <Text style={styles.sectionHeading}>Submitted Verification Documents</Text>
                {selectedApplicant.documents.map((d, i) => (
                  <View key={i} style={styles.docReviewItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docItemName}>{d.type}</Text>
                      <Text style={styles.docItemNum}>ID/Doc No: {d.number}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewDocLink}
                      onPress={() => Alert.alert("Document Viewer", `Viewing secure presigned URL for ${d.type}`)}
                    >
                      <Text style={styles.viewDocLinkText}>View File</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={styles.sectionHeading}>Admin Decision Notes</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Internal audit notes (e.g. Police clearance confirmed via hotline)..."
                  placeholderTextColor="#94A3B8"
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                />

                <Text style={styles.sectionHeading}>Rejection Reason (if rejecting)</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Mandatory reason communicated to applicant if rejected..."
                  placeholderTextColor="#94A3B8"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                />

                <View style={styles.actionBtnsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={handleReject}
                    disabled={isProcessing}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={handleApprove}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionBtnText}>Approve & Verify</Text>
                    )}
                  </TouchableOpacity>
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
    backgroundColor: "#0F172A",
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    justifyContent: "space-between",
  },
  metricCard: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 3,
    alignItems: "center",
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F59E0B",
  },
  metricTitle: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },
  tabsNav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#0284c7",
  },
  tabBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#0284c7",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
  applicantCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  applicantName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  applicantMeta: {
    color: "#38BDF8",
    fontSize: 12,
    marginTop: 2,
  },
  applicantTime: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  reviewBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  reviewBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  docSummaryRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  docLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginBottom: 6,
  },
  docTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docChipText: {
    color: "#E2E8F0",
    fontSize: 11,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  providerCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  pCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pBadge: {
    color: "#38BDF8",
    fontSize: 12,
    marginTop: 2,
  },
  pSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
  },
  tripCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tripTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  tripSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064E3B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 4,
  },
  liveTagText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
  tripLocation: {
    color: "#38BDF8",
    fontSize: 12,
    marginTop: 10,
  },
  tripTelemetry: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  modalScroll: {
    marginBottom: 20,
  },
  applicantDetailTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  applicantDetailSub: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  sectionHeading: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
  },
  docReviewItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  docItemName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  docItemNum: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 1,
  },
  viewDocLink: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewDocLinkText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inputBox: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#FFFFFF",
    padding: 10,
    fontSize: 13,
  },
  actionBtnsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  approveBtn: {
    backgroundColor: "#10B981",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
