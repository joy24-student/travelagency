/**
 * Team Management Screen
 * Manage staff, roles, and permissions
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "active" | "inactive";
}

export default function TeamManagementScreen({ navigation }: any) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "1",
      name: "Alex Johnson",
      role: "Team Lead",
      email: "alex@globaltravels.com",
      status: "active",
    },
    {
      id: "2",
      name: "Maria Garcia",
      role: "Booking Manager",
      email: "maria@globaltravels.com",
      status: "active",
    },
    {
      id: "3",
      name: "John Smith",
      role: "Customer Support",
      email: "john@globaltravels.com",
      status: "inactive",
    },
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ShopnoJatra Ultra</Text>
        <TouchableOpacity>
          <MaterialIcons name="settings" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Page Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTag}>RESOURCE MANAGEMENT</Text>
          <Text style={styles.heroTitle}>Active Personnel</Text>
          <Text style={styles.heroDesc}>
            Manage your global workforce and system access levels.
          </Text>

          <TouchableOpacity style={styles.addStaffBtn}>
            <MaterialIcons name="person-add" size={20} color="black" />
            <Text style={styles.addStaffText}>Add New Staff</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterRow}>
          <View style={styles.searchBar}>
            <MaterialIcons
              name="search"
              size={20}
              color={COLORS.textTertiary}
            />
            <TextInput
              placeholder="Search by name, role..."
              placeholderTextColor="rgba(218, 226, 253, 0.3)"
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <MaterialIcons
              name="filter-list"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Summary */}
        <View style={styles.statsSummary}>
          <View style={styles.statBadge}>
            <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
            <Text style={styles.statBadgeText}>{teamMembers.length} Total</Text>
          </View>
          <View style={styles.dividerSmall} />
          <View style={styles.statBadge}>
            <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
            <Text style={styles.statBadgeText}>8 Online</Text>
          </View>
        </View>

        {/* Team Members */}
        <View style={styles.section}>
          {teamMembers.map((member) => (
            <TouchableOpacity key={member.id} style={styles.memberRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {member.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.memberMain}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>

              <View style={styles.memberActions}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>ADMIN</Text>
                </View>
                <TouchableOpacity style={styles.manageBtn}>
                  <MaterialIcons
                    name="admin-panel-settings"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.manageBtnText}>Manage</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
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
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginLeft: 12,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  section: {
    marginBottom: 24,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },

  statBox: {
    alignItems: "center",
    paddingVertical: 12,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },

  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  memberRole: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },

  memberEmail: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },

  backBtn: {
    padding: 4,
  },

  heroSection: {
    marginBottom: 20,
  },

  heroTag: {
    fontSize: 11,
    color: COLORS.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },

  heroDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },

  addStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },

  addStaffText: {
    fontSize: 13,
    fontWeight: "600",
    color: "black",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  filterBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },

  statsSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },

  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statBadgeText: {
    fontSize: 13,
    color: COLORS.text,
  },

  dividerSmall: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },

  avatarContainer: {
    position: "relative",
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },

  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0b1326",
  },

  memberMain: {
    flex: 1,
  },

  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  roleBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  roleBadgeText: {
    fontSize: 11,
    color: "#22c55e",
    fontWeight: "600",
  },

  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },

  manageBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
