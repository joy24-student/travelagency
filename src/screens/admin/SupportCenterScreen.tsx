/**
 * Support Center / Operational Live Feed & Ticket Workspace Screen
 * Built according to exact HTML & UI design specifications.
 * Features Command Dashboard Stats, Operational Live Feed with Filter Tabs,
 * Ticket Status Workflow Stepper, Interactive Macro Auto-Insertion, Resource Cards,
 * and Live Response Dispatch.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export interface SupportTicketItem {
  id: string; // e.g. TKT-4587
  title: string;
  priority: "P1 CRITICAL" | "P2 NORMAL" | "P3 MEDIUM" | "RESOLVED";
  status: "Open" | "Working" | "Triage" | "Closed";
  progressLabel: string;
  progressStep: number; // 1 to 4
  icon: string;
  iconBg: string;
  iconColor: string;
  priorityColor: string;
  user: string;
  createdDate: string;
  source: string;
  category: string;
  assignee: string;
  inquiryText: string;
}

const INITIAL_TICKETS: SupportTicketItem[] = [
  {
    id: "TKT-4587",
    title: "Payment gateway failure",
    priority: "P1 CRITICAL",
    status: "Open",
    progressLabel: "Escalated to Engineering",
    progressStep: 1,
    icon: "exclamation-circle",
    iconBg: "#fff1f2",
    iconColor: "#e11d48",
    priorityColor: "#e11d48",
    user: "Atlas Travel Admin",
    createdDate: "Oct 24, 2023 • 09:30 AM",
    source: "Payment API (US-East)",
    category: "Gateway Integration",
    assignee: "Engineering Lead",
    inquiryText:
      "All card transactions on stripe-v2 gateway are timing out with HTTP 504. Multiple agencies unable to process customer payouts.",
  },
  {
    id: "TKT-4586",
    title: "Booking sync mismatch",
    priority: "P2 NORMAL",
    status: "Working",
    progressLabel: "Database Reconciliation",
    progressStep: 2,
    icon: "sync",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    priorityColor: "#2563eb",
    user: "Alex Rivera",
    createdDate: "Oct 24, 2023 • 09:15 AM",
    source: "Regional Node (SG)",
    category: "Database Sync",
    assignee: "Platform Ops",
    inquiryText:
      "How do I synchronize the v2.4 protocols with my current endpoint? I've tried the standard API reference but I'm getting a timeout error.",
  },
  {
    id: "TKT-4585",
    title: "Commission calc error",
    priority: "P3 MEDIUM",
    status: "Triage",
    progressLabel: "Pending Review",
    progressStep: 1,
    icon: "history",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    priorityColor: "#d97706",
    user: "Skyline Tours Manager",
    createdDate: "Oct 24, 2023 • 08:45 AM",
    source: "Finance Module",
    category: "Commission Rate",
    assignee: "Finance Admin",
    inquiryText:
      "Commission calculation for premium package BK-9020 was calculated at 8% instead of the contracted 10% tier rate.",
  },
  {
    id: "TKT-4584",
    title: "API endpoint timeout",
    priority: "RESOLVED",
    status: "Closed",
    progressLabel: "Auto-Validated",
    progressStep: 4,
    icon: "check-double",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    priorityColor: "#059669",
    user: "Global Explorer",
    createdDate: "Oct 23, 2023 • 16:20 PM",
    source: "REST Gateway",
    category: "Network Latency",
    assignee: "DevOps Automated",
    inquiryText:
      "Rate limit threshold reset completed automatically. All sync endpoints restored with sub-50ms latency.",
  },
];

export const SupportCenterScreen: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>(INITIAL_TICKETS);
  const [viewMode, setViewMode] = useState<"overview" | "detail">("overview");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem>(INITIAL_TICKETS[1]);
  const [activeFilter, setActiveFilter] = useState<"All" | "Critical" | "Active" | "Escalated">("All");

  // Detail View State
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [investigationStatus, setInvestigationStatus] = useState<"Active" | "Pending" | "Resolved">("Active");
  const [investigationNote, setInvestigationNote] = useState("");
  const [replyTab, setReplyTab] = useState<"Public Reply" | "Internal Note">("Public Reply");
  const [responseMessage, setResponseMessage] = useState("");
  const [sendingState, setSendingState] = useState<"idle" | "sending" | "sent">("idle");
  const [resourceSearch, setResourceSearch] = useState("");

  const filteredTickets = tickets.filter((t) => {
    if (activeFilter === "Critical") return t.priority === "P1 CRITICAL";
    if (activeFilter === "Active") return t.status === "Working" || t.status === "Open";
    if (activeFilter === "Escalated") return t.progressStep === 1 && t.status === "Open";
    return true;
  });

  const handleMacroInsert = (macroTitle: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const template = `[${timestamp}] Internal Update: Initiated workflow for "${macroTitle}".\n\nPlease monitor central dashboard for reconciliation.\n\nRegards,\nAdmin Operations`;
    setResponseMessage(template);
  };

  const handleSendResponse = () => {
    if (!responseMessage.trim()) {
      Alert.alert("Empty Response", "Please type a message before sending.");
      return;
    }
    setSendingState("sending");
    setTimeout(() => {
      setSendingState("sent");
      setTimeout(() => {
        setSendingState("idle");
        setResponseMessage("");
        Alert.alert("Response Delivered", `Reply dispatched for ticket ${selectedTicket.id}`);
      }, 1500);
    }, 1200);
  };

  const handleUpdateInvestigation = () => {
    Alert.alert(
      "Investigation Updated",
      `Ticket ${selectedTicket.id} status updated to ${investigationStatus}.`
    );
  };

  // --------------------------------------------------------------------------
  // 1. OVERVIEW & LIVE FEED SCREEN
  // --------------------------------------------------------------------------
  const renderOverview = () => (
    <View style={styles.screenContainer}>
      {/* AppBar Header */}
      <View style={styles.appHeader}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.appHeaderTitle}>Support Center</Text>
        </View>
        <TouchableOpacity style={styles.iconCircleBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {/* Command Dashboard Stats */}
        <View style={styles.statsGrid}>
          {/* Active */}
          <View style={styles.statCard}>
            <View style={styles.statDotRow}>
              <View style={[styles.statusDot, { backgroundColor: "#f43f5e" }]} />
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <Text style={styles.statNumber}>12</Text>
          </View>

          {/* Resolved */}
          <View style={styles.statCard}>
            <View style={styles.statDotRow}>
              <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
              <Text style={styles.statLabel}>RESOLVED</Text>
            </View>
            <Text style={styles.statNumber}>84</Text>
          </View>

          {/* Critical */}
          <View style={styles.statCard}>
            <View style={styles.statDotRow}>
              <View style={[styles.statusDot, { backgroundColor: "#f59e0b" }]} />
              <Text style={styles.statLabel}>CRITICAL</Text>
            </View>
            <Text style={styles.statNumber}>03</Text>
          </View>
        </View>

        {/* Live Feed Header */}
        <View style={styles.feedHeaderRow}>
          <View>
            <Text style={styles.feedSubheading}>OPERATIONAL LIVE FEED</Text>
            <Text style={styles.feedHeading}>Active Ticket Monitoring</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert("Archive Log", "Showing all historical ticket logs.")}>
            <Text style={styles.archiveLink}>Archive Log</Text>
          </TouchableOpacity>
        </View>

        {/* Professional Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {(["All", "Critical", "Active", "Escalated"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                activeFilter === filter && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter === "All" ? "All Logs" : filter}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.filterIconPill}
            onPress={() => Alert.alert("Filter Settings", "Displaying active monitoring filters.")}
          >
            <Ionicons name="options-outline" size={16} color="#475569" />
          </TouchableOpacity>
        </ScrollView>

        {/* Live Feed Ticket Cards */}
        {filteredTickets.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.ticketCard}
            onPress={() => {
              setSelectedTicket(item);
              setViewMode("detail");
            }}
          >
            <View style={styles.ticketHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={[styles.ticketIconBox, { backgroundColor: item.iconBg }]}>
                  <FontAwesome5 name={item.icon} size={16} color={item.iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ticketTitle}>{item.title}</Text>
                  <Text style={styles.ticketMetaText}>
                    {item.id} •{" "}
                    <Text style={{ color: item.priorityColor, fontWeight: "600" }}>
                      {item.priority}
                    </Text>
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      item.status === "Open"
                        ? "#ffe4e6"
                        : item.status === "Working"
                        ? "#dbeafe"
                        : item.status === "Closed"
                        ? "#d1fae5"
                        : "#fef3c7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color:
                        item.status === "Open"
                          ? "#be123c"
                          : item.status === "Working"
                          ? "#1d4ed8"
                          : item.status === "Closed"
                          ? "#047857"
                          : "#b45309",
                    },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>INVESTIGATION PROGRESS</Text>
                <Text style={[styles.progressStatusVal, { color: item.priorityColor }]}>
                  {item.progressLabel}
                </Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarSegment,
                    { backgroundColor: item.progressStep >= 1 ? item.priorityColor : "#e2e8f0" },
                  ]}
                />
                <View
                  style={[
                    styles.progressBarSegment,
                    { backgroundColor: item.progressStep >= 2 ? item.priorityColor : "#e2e8f0" },
                  ]}
                />
                <View
                  style={[
                    styles.progressBarSegment,
                    { backgroundColor: item.progressStep >= 3 ? item.priorityColor : "#e2e8f0" },
                  ]}
                />
                <View
                  style={[
                    styles.progressBarSegment,
                    { backgroundColor: item.progressStep >= 4 ? item.priorityColor : "#e2e8f0" },
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // --------------------------------------------------------------------------
  // 2. TICKET DETAIL & RESPONSE WORKSPACE
  // --------------------------------------------------------------------------
  const renderDetail = () => (
    <View style={styles.screenContainer}>
      {/* Top AppBar */}
      <View style={styles.appHeader}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => setViewMode("overview")} style={{ paddingRight: 10 }}>
            <Ionicons name="arrow-back" size={20} color="#003527" />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.breadcrumbText}>TICKETS </Text>
              <Ionicons name="chevron-forward" size={10} color="#64748b" />
              <Text style={[styles.breadcrumbText, { color: "#003527" }]}> SUPPORT</Text>
            </View>
            <Text style={styles.ticketIdTitle}>#{selectedTicket.id}</Text>
          </View>
        </View>

        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          }}
          style={styles.headerAvatar}
        />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Status Workflow Stepper */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperLineTrack}>
            <View style={[styles.stepperLineFill, { width: selectedTicket.status === "Closed" ? "100%" : "45%" }]} />
          </View>

          <View style={styles.stepNode}>
            <View style={styles.stepCircleActive}>
              <Ionicons name="checkmark" size={12} color="#ffffff" />
            </View>
            <Text style={styles.stepLabelActive}>NEW</Text>
          </View>

          <View style={styles.stepNode}>
            <View style={styles.stepCircleActive}>
              <Ionicons name="sync" size={12} color="#ffffff" />
            </View>
            <Text style={styles.stepLabelActive}>ACTIVE</Text>
          </View>

          <View style={styles.stepNode}>
            <View style={styles.stepCircleInactive} />
            <Text style={styles.stepLabelInactive}>PENDING</Text>
          </View>

          <View style={styles.stepNode}>
            <View style={styles.stepCircleInactive} />
            <Text style={styles.stepLabelInactive}>RESOLVED</Text>
          </View>
        </View>

        {/* Ticket Details Expandable Card */}
        <View style={styles.detailsExpandCard}>
          <TouchableOpacity
            style={styles.detailsExpandHeader}
            onPress={() => setDetailsExpanded(!detailsExpanded)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="information-circle-outline" size={18} color="#475569" style={{ marginRight: 8 }} />
              <Text style={styles.detailsExpandTitle}>Ticket Details</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.priorityTag}>
                <Text style={styles.priorityTagText}>{selectedTicket.priority}</Text>
              </View>
              <Ionicons
                name={detailsExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color="#64748b"
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>

          {detailsExpanded && (
            <View style={styles.detailsGridContent}>
              <View style={styles.detailsGridItem}>
                <Text style={styles.detailsGridLabel}>CREATED</Text>
                <Text style={styles.detailsGridVal}>{selectedTicket.createdDate}</Text>
              </View>
              <View style={styles.detailsGridItem}>
                <Text style={styles.detailsGridLabel}>SOURCE</Text>
                <Text style={styles.detailsGridVal}>{selectedTicket.source}</Text>
              </View>
              <View style={styles.detailsGridItem}>
                <Text style={styles.detailsGridLabel}>CATEGORY</Text>
                <Text style={styles.detailsGridVal}>{selectedTicket.category}</Text>
              </View>
              <View style={styles.detailsGridItem}>
                <Text style={styles.detailsGridLabel}>ASSIGNEE</Text>
                <Text style={styles.detailsGridVal}>{selectedTicket.assignee}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Issue Card */}
        <View style={styles.inquiryCard}>
          <View style={styles.inquiryHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-outline" size={14} color="#003527" style={{ marginRight: 6 }} />
              <Text style={styles.inquiryHeaderLabel}>USER INQUIRY</Text>
            </View>
            <Text style={styles.inquiryTime}>OCT 24 • 09:12 AM</Text>
          </View>
          <Text style={styles.inquiryText}>"{selectedTicket.inquiryText}"</Text>

          <View style={styles.userBadgeRow}>
            <Ionicons name="person-circle-outline" size={16} color="#003527" style={{ marginRight: 6 }} />
            <Text style={styles.userBadgeText}>USER: {selectedTicket.user}</Text>
          </View>
        </View>

        {/* Investigation Progress Control Card */}
        <View style={styles.investigationCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color="#003527" style={{ marginRight: 6 }} />
            <Text style={styles.inquiryHeaderLabel}>INVESTIGATION PROGRESS</Text>
          </View>

          <View style={styles.statusToggleRow}>
            {(["Active", "Pending", "Resolved"] as const).map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusToggleBtn,
                  investigationStatus === st && styles.statusToggleBtnActive,
                ]}
                onPress={() => setInvestigationStatus(st)}
              >
                <Text
                  style={[
                    styles.statusToggleText,
                    investigationStatus === st && styles.statusToggleTextActive,
                  ]}
                >
                  {st.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.investigationInput}
            placeholder="Add a brief note about the current status..."
            placeholderTextColor="#94a3b8"
            multiline
            value={investigationNote}
            onChangeText={setInvestigationNote}
          />

          <TouchableOpacity style={styles.updateStatusBtn} onPress={handleUpdateInvestigation}>
            <Text style={styles.updateStatusBtnText}>Update Status & Comment</Text>
            <Ionicons name="sparkles" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Response Editor Tabs */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.replyTabHeader}>
            {(["Public Reply", "Internal Note"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.replyTabBtn,
                  replyTab === t && styles.replyTabBtnActive,
                ]}
                onPress={() => setReplyTab(t)}
              >
                <Text
                  style={[
                    styles.replyTabText,
                    replyTab === t && styles.replyTabTextActive,
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.editorBox}>
            {/* Formatting Toolbar */}
            <View style={styles.editorToolbar}>
              <TouchableOpacity style={styles.toolbarIconBtn}>
                <FontAwesome5 name="bold" size={12} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn}>
                <FontAwesome5 name="italic" size={12} color="#475569" />
              </TouchableOpacity>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity style={styles.toolbarIconBtn}>
                <FontAwesome5 name="list-ul" size={12} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarIconBtn}>
                <FontAwesome5 name="link" size={12} color="#475569" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editorTextInput}
              placeholder="Write your professional response..."
              placeholderTextColor="#94a3b8"
              multiline
              value={responseMessage}
              onChangeText={setResponseMessage}
            />
          </View>
        </View>

        {/* Quick Macros Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.macroHeaderLabel}>QUICK MACROS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {[
              "Request Logs",
              "Escalate Tech",
              "Sync Initiated",
              "Resolved Issue",
            ].map((macro) => (
              <TouchableOpacity
                key={macro}
                style={styles.macroChipBtn}
                onPress={() => handleMacroInsert(macro)}
              >
                <Text style={styles.macroChipText}>{macro}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recommended Resources Section */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="journal-outline" size={16} color="#003527" style={{ marginRight: 6 }} />
            <Text style={styles.macroHeaderLabel}>RECOMMENDED RESOURCES</Text>
          </View>

          <View style={styles.resourceSearchBox}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 13, color: "#0f172a" }}
              placeholder="Search resources..."
              placeholderTextColor="#94a3b8"
              value={resourceSearch}
              onChangeText={setResourceSearch}
            />
          </View>

          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={styles.resourceCard}
              onPress={() => Alert.alert("Documentation", "Opening Sync Protocols v2.4 PDF.")}
            >
              <View style={[styles.resourceIconCircle, { backgroundColor: "#ecfdf5" }]}>
                <Ionicons name="book-outline" size={18} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resourceCardTitle}>Sync Protocols v2.4</Text>
                <Text style={styles.resourceCardSub}>DOCUMENTATION</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resourceCard}
              onPress={() => Alert.alert("API Reference", "Opening /v1/sync Endpoint Docs.")}
            >
              <View style={[styles.resourceIconCircle, { backgroundColor: "#f3e8ff" }]}>
                <Ionicons name="code-working-outline" size={18} color="#7e22ce" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resourceCardTitle}>/v1/sync Endpoint</Text>
                <Text style={styles.resourceCardSub}>API REFERENCE</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.actionFooterFixed}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => Alert.alert("Attachment", "Opening file attachment picker...")}
        >
          <Ionicons name="attach-outline" size={22} color="#334155" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sendResponseBtn,
            sendingState === "sent" && { backgroundColor: "#047857" },
          ]}
          onPress={handleSendResponse}
          disabled={sendingState !== "idle"}
        >
          <Text style={styles.sendResponseText}>
            {sendingState === "sending"
              ? "Syncing..."
              : sendingState === "sent"
              ? "Response Delivered"
              : "Send Response"}
          </Text>
          <Ionicons
            name={sendingState === "sent" ? "checkmark-circle" : "send"}
            size={18}
            color="#ffffff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {viewMode === "overview" ? renderOverview() : renderDetail()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  appHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  iconCircleBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollArea: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statDotRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
  },
  feedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  feedSubheading: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  feedHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: "#003527",
    marginTop: 2,
  },
  archiveLink: {
    fontSize: 11,
    fontWeight: "600",
    color: "#003527",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  filterIconPill: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ticketIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  ticketMetaText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
  },
  progressStatusVal: {
    fontSize: 9,
    fontWeight: "700",
  },
  progressBarTrack: {
    flexDirection: "row",
    height: 5,
    gap: 4,
  },
  progressBarSegment: {
    flex: 1,
    borderRadius: 3,
  },
  breadcrumbText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  ticketIdTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#003527",
    marginTop: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stepperContainer: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 20,
    marginBottom: 10,
  },
  stepperLineTrack: {
    position: "absolute",
    top: 31,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: "#e2e8f0",
    zIndex: 0,
  },
  stepperLineFill: {
    height: 2,
    backgroundColor: "#003527",
  },
  stepNode: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  stepCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#003527",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginBottom: 4,
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: "700",
    color: "#003527",
  },
  stepLabelInactive: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  detailsExpandCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 16,
    overflow: "hidden",
  },
  detailsExpandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  detailsExpandTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  priorityTag: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#991b1b",
  },
  detailsGridContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    gap: 12,
  },
  detailsGridItem: {
    width: "46%",
  },
  detailsGridLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
  },
  detailsGridVal: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  inquiryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  inquiryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inquiryHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  inquiryTime: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  inquiryText: {
    fontSize: 14,
    color: "#0f172a",
    lineHeight: 20,
  },
  userBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#003527",
  },
  investigationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  statusToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  statusToggleBtnActive: {
    backgroundColor: "#f0fdf4",
    borderColor: "#003527",
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  statusToggleTextActive: {
    color: "#003527",
  },
  investigationInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 12,
  },
  updateStatusBtn: {
    flexDirection: "row",
    backgroundColor: "#003527",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  updateStatusBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  replyTabHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginBottom: 10,
  },
  replyTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  replyTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#003527",
  },
  replyTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
  },
  replyTabTextActive: {
    color: "#003527",
    fontWeight: "700",
  },
  editorBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  editorToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  toolbarIconBtn: {
    padding: 4,
  },
  toolbarDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#cbd5e1",
  },
  editorTextInput: {
    padding: 14,
    height: 120,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0f172a",
  },
  macroHeaderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  macroChipBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  macroChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#003527",
  },
  resourceSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 10,
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  resourceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  resourceCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#003527",
  },
  resourceCardSub: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 2,
  },
  actionFooterFixed: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 10,
  },
  attachBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  sendResponseBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#003527",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendResponseText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SupportCenterScreen;
