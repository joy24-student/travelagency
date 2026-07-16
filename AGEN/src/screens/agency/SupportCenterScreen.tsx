/**
 * Support Center Screen
 * Help desk and customer support
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { Card, Button, SectionHeader } from "../ui/UIComponents";

export default function SupportCenterScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={COLORS.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Center</Text>
        <TouchableOpacity>
          <MaterialIcons
            name="help-outline"
            size={24}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero & Cleaner Search */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTag}>ULTRA PREMIER SUPPORT</Text>
          <Text style={styles.heroTitle}>How can we assist you?</Text>
          <Text style={styles.heroSubtitle}>
            Get specialized assistance, track tickets, or browse documentation.
          </Text>
        </View>

        <View style={styles.searchActionContainer}>
          <View style={styles.searchWrapper}>
            <MaterialIcons
              name="search"
              size={22}
              color="rgba(145, 143, 160, 0.6)"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search knowledge base..."
              placeholderTextColor="rgba(145, 143, 160, 0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.searchGoBtn}>
              <Text style={styles.searchGoText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.newTicketBtn}>
              <MaterialIcons name="add-circle" size={20} color="white" />
              <Text style={styles.newTicketText}>New Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatIconBtn}>
              <MaterialIcons name="chat" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Tickets Group */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.headerTitleGroup}>
              <MaterialIcons
                name="confirmation-number"
                size={20}
                color={COLORS.secondary}
              />
              <SectionHeader title="Active Tickets" />
            </View>
            <TouchableOpacity style={styles.historyLink}>
              <Text style={styles.historyLinkText}>History</Text>
              <MaterialIcons name="history" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Card style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={styles.ticketMeta}>
                <View
                  style={[
                    styles.statusBadge,
                    { borderColor: `${COLORS.secondary}40` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: COLORS.secondary },
                    ]}
                  >
                    IN PROGRESS
                  </Text>
                </View>
                <Text style={styles.ticketId}>#SJ-92842</Text>
              </View>
              <TouchableOpacity style={styles.manageTicketBtn}>
                <MaterialIcons
                  name="edit"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.manageTicketText}>Manage</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.ticketTitle}>
              System Latency in Southeast Hub
            </Text>
            <Text style={styles.ticketBody} numberOfLines={2}>
              Investigating unusual API response times in the ultra-low latency
              routing module. Engineering team assigned.
            </Text>

            <View style={styles.ticketFooter}>
              <View style={styles.agentRow}>
                <Image
                  source={{
                    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDXcsaPz139kkoLLAHD1mHqIzAPPd9UhWn70C_FcQC9OlQuDAl06Au1CR5vLwxuQwdmEUerZBI4w9m23qmPubOchmnba-_wzkcYNraOCcxnwyxLHhz12kgKPx-lYdZcZ9Lfq7o1S-xM6kGAPAZ0t9BxKgI51NoS5ArtcrHZLYcFaegKTInIBPwhYw_rluu1Hg1CKb3-PEw-8x4oCTdCLh7_1AzcT4RpaRo-E3b2VX-bFbnyapjnWhvsPpiUhsyqNCgbjg-kTFgPxqQ",
                  }}
                  style={styles.agentAvatar}
                />
                <View>
                  <Text style={styles.agentName}>Alex Rivera</Text>
                  <Text style={styles.updateTime}>Updated 14 mins ago</Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={COLORS.textTertiary}
              />
            </View>
          </Card>
        </View>

        {/* Resources & Assistance */}
        <View style={styles.resourceSection}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="menu-book" size={20} color={COLORS.primary} />
            <SectionHeader title="Resources" />
          </View>

          <View style={styles.resourceGrid}>
            {[
              {
                label: "Fleet Scaling Guide",
                icon: "local-shipping",
                color: COLORS.primary,
              },
              {
                label: "Security Protocols",
                icon: "fingerprint",
                color: COLORS.secondary,
              },
              {
                label: "Rebate Automation",
                icon: "receipt-long",
                color: COLORS.tertiary,
              },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.resourceItem}>
                <View
                  style={[
                    styles.resourceIconBox,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>
                <Text style={styles.resourceLabel}>{item.label}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.assistanceSection}>
          <SectionHeader title="Assistance" />
          <View style={styles.assistanceGrid}>
            <TouchableOpacity style={styles.assistanceCard}>
              <View
                style={[
                  styles.assistanceIcon,
                  { backgroundColor: `${COLORS.secondary}15` },
                ]}
              >
                <MaterialIcons
                  name="headset-mic"
                  size={22}
                  color={COLORS.secondary}
                />
              </View>
              <View>
                <Text style={styles.assistanceTitle}>VIP Concierge</Text>
                <Text style={styles.assistanceSub}>Priority Line</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.assistanceCard,
                { borderColor: `${COLORS.danger}30` },
              ]}
            >
              <View
                style={[
                  styles.assistanceIcon,
                  { backgroundColor: `${COLORS.danger}15` },
                ]}
              >
                <MaterialIcons
                  name="emergency"
                  size={22}
                  color={COLORS.danger}
                />
              </View>
              <View>
                <Text style={styles.assistanceTitle}>Critical Incident</Text>
                <Text style={styles.assistanceSub}>Immediate Response</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1326",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  heroSection: {
    marginTop: 24,
    marginBottom: 24,
  },

  heroTag: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
    letterSpacing: 2,
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },

  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },

  searchActionContainer: {
    marginBottom: 32,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 6,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    paddingHorizontal: 12,
  },

  searchGoBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  searchGoText: {
    color: "black",
    fontSize: 14,
    fontWeight: "600",
  },

  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },

  newTicketBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4338ca",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },

  newTicketText: {
    color: "white",
    fontWeight: "600",
  },

  chatIconBtn: {
    width: 52,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(76, 215, 246, 0.2)",
  },

  section: {
    marginBottom: 32,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  historyLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },

  ticketCard: {
    padding: 4,
  },

  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  ticketMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  statusBadge: {
    backgroundColor: "rgba(76, 215, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(76, 215, 246, 0.2)",
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.secondary,
  },

  ticketId: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },

  manageTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  manageTicketText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  ticketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },

  ticketBody: {
    fontSize: 14,
    color: COLORS.textTertiary,
    lineHeight: 20,
    marginBottom: 16,
  },

  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },

  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  agentName: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
  },

  updateTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  resourceSection: {
    marginBottom: 32,
  },

  resourceGrid: {
    gap: 12,
  },

  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  resourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  resourceLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },

  assistanceSection: {
    marginBottom: 32,
  },

  assistanceGrid: {
    gap: 12,
  },

  assistanceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 16,
  },

  assistanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  assistanceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },

  assistanceSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
