/**
 * Team Management Screen - B2B Agency Portal
 * Role-Based Access Control (Owner, Manager, Agent, Finance) for Agency Workforce
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { useAgencyRBAC, AGENCY_ROLES_META, AgencyRole } from "../../context/AgencyRBACContext";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleKey: AgencyRole;
  email: string;
  status: "active" | "inactive";
}

export default function TeamManagementScreen({ navigation }: any) {
  const { hasPermission, role: currentRole, roleMeta, switchRole } = useAgencyRBAC();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "1",
      name: "Alex Johnson",
      role: "Operations Lead",
      roleKey: "AGENCY_MANAGER",
      email: "alex@globaltravels.com",
      status: "active",
    },
    {
      id: "2",
      name: "Maria Garcia",
      role: "Booking Supervisor",
      roleKey: "AGENCY_AGENT",
      email: "maria@globaltravels.com",
      status: "active",
    },
    {
      id: "3",
      name: "David Chen",
      role: "Finance Officer",
      roleKey: "AGENCY_FINANCE",
      email: "david@globaltravels.com",
      status: "active",
    },
    {
      id: "4",
      name: "Sarah Williams",
      role: "Travel Consultant",
      roleKey: "AGENCY_AGENT",
      email: "sarah@globaltravels.com",
      status: "inactive",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [roleSwitcherModal, setRoleSwitcherModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // New Staff Form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AgencyRole>("AGENCY_AGENT");

  const canManageTeam = hasPermission("team.manage");

  const handleOpenAddStaff = () => {
    if (!canManageTeam) {
      Alert.alert(
        "RBAC Restricted",
        `Your active persona (${roleMeta.label}) does not hold the 'team.manage' permission required to invite personnel.`
      );
      return;
    }
    setAddModalVisible(true);
  };

  const handleCreateStaff = () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert("Required Fields", "Please provide staff member name and email.");
      return;
    }

    const roleObj = AGENCY_ROLES_META.find((r) => r.id === newRole);
    const newMember: TeamMember = {
      id: `staff-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      roleKey: newRole,
      role: roleObj?.label || "Travel Agent",
      status: "active",
    };

    setTeamMembers([newMember, ...teamMembers]);
    setAddModalVisible(false);
    setNewName("");
    setNewEmail("");
    Alert.alert("Staff Enrolled", `${newMember.name} has been enrolled as ${newMember.role}.`);
  };

  const handleOpenManageMember = (member: TeamMember) => {
    if (!canManageTeam) {
      Alert.alert(
        "RBAC Restricted",
        `Only Agency Owner or Manager can modify credentials for ${member.name}.`
      );
      return;
    }
    setSelectedMember(member);
    setEditModalVisible(true);
  };

  const handleChangeMemberRole = (roleKey: AgencyRole) => {
    if (!selectedMember) return;
    const roleObj = AGENCY_ROLES_META.find((r) => r.id === roleKey);
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === selectedMember.id
          ? { ...m, roleKey, role: roleObj?.label || m.role }
          : m
      )
    );
    setEditModalVisible(false);
    Alert.alert("Role Updated", `${selectedMember.name} is now updated to ${roleObj?.label}.`);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
    setEditModalVisible(false);
    Alert.alert("Staff Removed", `${selectedMember.name} removed from agency roster.`);
  };

  const filteredMembers = teamMembers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Governance</Text>

        {/* Persona Switcher Chip */}
        <TouchableOpacity
          style={[styles.personaChip, { borderColor: roleMeta.color }]}
          onPress={() => setRoleSwitcherModal(true)}
        >
          <Text style={[styles.personaChipText, { color: roleMeta.color }]}>
            {roleMeta.badge}
          </Text>
          <Ionicons name="chevron-down" size={12} color={roleMeta.color} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Page Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTag}>AGENCY PERSONNEL & RBAC</Text>
          <Text style={styles.heroTitle}>Workforce Governance</Text>
          <Text style={styles.heroDesc}>
            Manage travel agency staff authorization bounds, bookings access, and operational roles.
          </Text>

          <TouchableOpacity
            style={[
              styles.addStaffBtn,
              !canManageTeam && { opacity: 0.5, backgroundColor: "#64748b" },
            ]}
            onPress={handleOpenAddStaff}
          >
            <MaterialIcons name="person-add" size={18} color="#ffffff" />
            <Text style={styles.addStaffText}>
              {canManageTeam ? "Add New Staff" : "Add Staff (Restricted)"}
            </Text>
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
              placeholder="Search by name, role, email..."
              placeholderTextColor="rgba(218, 226, 253, 0.4)"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Personnel Roster ({filteredMembers.length})</Text>

          {filteredMembers.map((member) => {
            const roleInfo =
              AGENCY_ROLES_META.find((r) => r.id === member.roleKey) ||
              AGENCY_ROLES_META[2];

            return (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onPress={() => handleOpenManageMember(member)}
              >
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarPlaceholder, { backgroundColor: `${roleInfo.color}25` }]}>
                    <Text style={[styles.avatarInitial, { color: roleInfo.color }]}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.onlineDot,
                      { backgroundColor: member.status === "active" ? "#10b981" : "#94a3b8" },
                    ]}
                  />
                </View>

                <View style={styles.memberMain}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>

                <View style={styles.memberActions}>
                  <View style={[styles.roleBadge, { backgroundColor: `${roleInfo.color}20`, borderColor: roleInfo.color }]}>
                    <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                      {roleInfo.badge}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => handleOpenManageMember(member)}
                  >
                    <MaterialIcons
                      name="admin-panel-settings"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.manageBtnText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enroll Agency Staff</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>Work Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. john@agency.com"
              placeholderTextColor="#64748b"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Assigned Operational Role</Text>
            <View style={styles.rolePickerRow}>
              {AGENCY_ROLES_META.filter((r) => r.id !== "AGENCY_OWNER").map((r) => {
                const isSelected = newRole === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleOption,
                      isSelected && { borderColor: r.color, backgroundColor: `${r.color}20` },
                    ]}
                    onPress={() => setNewRole(r.id)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        isSelected && { color: r.color, fontWeight: "700" },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateStaff}>
              <Text style={styles.submitBtnText}>Confirm Enrollment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Staff Role Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manage {selectedMember?.name}</Text>
                <Text style={styles.modalSubtitle}>Change agency operational role</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select New Role</Text>
            {AGENCY_ROLES_META.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.roleListCard,
                  selectedMember?.roleKey === r.id && { borderColor: r.color },
                ]}
                onPress={() => handleChangeMemberRole(r.id)}
              >
                <Text style={[styles.roleListTitle, { color: r.color }]}>{r.label}</Text>
                <Text style={styles.roleListDesc}>{r.description}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.deleteMemberBtn}
              onPress={handleRemoveMember}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteMemberText}>Remove Staff Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Persona Switcher Modal (Testing/Simulation) */}
      <Modal
        visible={roleSwitcherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoleSwitcherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Simulate Agency Persona</Text>
                <Text style={styles.modalSubtitle}>Test role boundaries across agency modules</Text>
              </View>
              <TouchableOpacity onPress={() => setRoleSwitcherModal(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {AGENCY_ROLES_META.map((r) => {
              const isActive = currentRole === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleListCard,
                    isActive && { borderColor: r.color, backgroundColor: `${r.color}15` },
                  ]}
                  onPress={() => {
                    switchRole(r.id);
                    setRoleSwitcherModal(false);
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.roleListTitle, { color: r.color }]}>{r.label}</Text>
                    {isActive && (
                      <View style={[styles.activePill, { backgroundColor: r.color }]}>
                        <Text style={styles.activePillText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roleListDesc}>{r.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    marginStart: 10,
  },
  personaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  personaChipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroTag: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 14,
  },
  addStaffBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addStaffText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },
  filterRow: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    marginStart: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatarContainer: {
    position: "relative",
    marginEnd: 12,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: "#0b1326",
  },
  memberMain: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  memberRole: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 1,
  },
  memberEmail: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  memberActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: "#ffffff",
    fontSize: 13,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  roleOptionText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  roleListCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
  },
  roleListTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  roleListDesc: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    lineHeight: 15,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#ffffff",
  },
  deleteMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
  },
  deleteMemberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ef4444",
  },
});
