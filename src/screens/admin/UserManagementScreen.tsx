/**
 * Admin User Management Screen - Executive Redesign
 * Professional Slate Typography, Balanced Font Weights (600/500/400),
 * Complete Sub-Screen Navigation (Dashboard, User Details Profile, KYC Queue, Security Logs)
 * and Interactive Action Controls.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import {
  UserAdminDetails,
  UserVerificationStatus,
  AdminUser,
} from "@/types/admin";

const { width } = Dimensions.get("window");

export type UserSubScreen = "dashboard" | "user_details" | "kyc_queue" | "activity_logs";

export interface ExtendedUserItem extends UserAdminDetails {
  name: string;
  email: string;
  role: string;
  roleCategory: "admins" | "agencies" | "corporate" | "travelers";
  location: string;
  last_active: string;
  avatar_url: string;
  is_vip?: boolean;
  phone?: string;
  total_bookings?: number;
  total_spent?: string;
  mfa_enabled?: boolean;
}

const INITIAL_USERS: ExtendedUserItem[] = [
  {
    id: "usr-001",
    user_id: "u-sarah-j",
    name: "Sarah Johnson",
    email: "sarah.johnson@corporate.com",
    role: "Corporate Admin",
    roleCategory: "corporate",
    verification_status: UserVerificationStatus.VERIFIED,
    kyc_status: UserVerificationStatus.VERIFIED,
    is_suspended: false,
    is_banned: false,
    location: "New York, USA",
    last_active: "2m ago",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    phone: "+1 212-555-0192",
    total_bookings: 24,
    total_spent: "$14,850",
    mfa_enabled: true,
    created_at: "2024-01-15T08:30:00Z",
    updated_at: "2026-07-20T10:15:00Z",
  },
  {
    id: "usr-002",
    user_id: "u-michael-b",
    name: "Michael Brown",
    email: "michael@agencytravels.com",
    role: "Agency Manager",
    roleCategory: "agencies",
    verification_status: UserVerificationStatus.PENDING,
    kyc_status: UserVerificationStatus.MANUAL_REVIEW,
    is_suspended: false,
    is_banned: false,
    location: "Dubai, UAE",
    last_active: "1h ago",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    phone: "+971 50 123 4567",
    total_bookings: 18,
    total_spent: "$9,420",
    mfa_enabled: false,
    created_at: "2024-03-20T14:10:00Z",
    updated_at: "2026-07-21T09:00:00Z",
  },
  {
    id: "usr-003",
    user_id: "u-emily-w",
    name: "Emily Wilson",
    email: "emily.wilson@gmail.com",
    role: "Traveler",
    roleCategory: "travelers",
    verification_status: UserVerificationStatus.VERIFIED,
    kyc_status: UserVerificationStatus.VERIFIED,
    is_vip: true,
    is_suspended: false,
    is_banned: false,
    location: "Singapore",
    last_active: "5m ago",
    avatar_url:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    phone: "+65 9123 4567",
    total_bookings: 42,
    total_spent: "$32,100",
    mfa_enabled: true,
    created_at: "2023-11-05T11:45:00Z",
    updated_at: "2026-07-21T18:20:00Z",
  },
  {
    id: "usr-004",
    user_id: "u-david-l",
    name: "David Lee",
    email: "david.lee@support.org",
    role: "Support Agent",
    roleCategory: "admins",
    verification_status: UserVerificationStatus.VERIFIED,
    kyc_status: UserVerificationStatus.VERIFIED,
    is_suspended: false,
    is_banned: false,
    location: "London, UK",
    last_active: "45m ago",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    phone: "+44 20 7946 0912",
    total_bookings: 5,
    total_spent: "$1,200",
    mfa_enabled: true,
    created_at: "2024-02-01T09:00:00Z",
    updated_at: "2026-07-20T16:30:00Z",
  },
];

export const UserManagementScreen: React.FC<{ admin?: AdminUser | null }> = () => {
  const [usersList, setUsersList] = useState<ExtendedUserItem[]>(INITIAL_USERS);
  const [currentScreen, setCurrentScreen] = useState<UserSubScreen>("dashboard");
  const [screenStack, setScreenStack] = useState<UserSubScreen[]>([]);
  const [selectedUser, setSelectedUser] = useState<ExtendedUserItem>(INITIAL_USERS[0]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "admins" | "agencies" | "corporate" | "travelers"
  >("all");
  const [kycTab, setKycTab] = useState<"pending" | "approved" | "rejected">("pending");

  // Modals
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Form Fields
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Traveler");
  const [newUserLocation, setNewUserLocation] = useState("");
  const [actionReason, setActionReason] = useState("");

  const navigateTo = (screen: UserSubScreen, user?: ExtendedUserItem) => {
    setScreenStack((prev) => [...prev, currentScreen]);
    if (user) setSelectedUser(user);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenStack.length > 0) {
      const prev = screenStack[screenStack.length - 1];
      setScreenStack((stack) => stack.slice(0, stack.length - 1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen("dashboard");
    }
  };

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (selectedCategory !== "all" && u.roleCategory !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [usersList, selectedCategory, searchQuery]);

  const handleCreateUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      Alert.alert("Required Fields", "Please enter a name and email address.");
      return;
    }
    const newUser: ExtendedUserItem = {
      id: `usr-${Date.now()}`,
      user_id: `u-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      roleCategory: newUserRole.toLowerCase().includes("admin")
        ? "admins"
        : newUserRole.toLowerCase().includes("agency")
        ? "agencies"
        : newUserRole.toLowerCase().includes("corporate")
        ? "corporate"
        : "travelers",
      verification_status: UserVerificationStatus.VERIFIED,
      kyc_status: UserVerificationStatus.VERIFIED,
      is_suspended: false,
      is_banned: false,
      location: newUserLocation.trim() || "San Francisco, USA",
      last_active: "Just now",
      avatar_url:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      phone: "+1 555-0199",
      total_bookings: 0,
      total_spent: "$0",
      mfa_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsersList([newUser, ...usersList]);
    setAddUserModalVisible(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserLocation("");
    Alert.alert("Success", `User ${newUser.name} created successfully.`);
  };

  const handleToggleSuspend = () => {
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id ? { ...u, is_suspended: !u.is_suspended } : u
      )
    );
    setSelectedUser((prev) => ({ ...prev, is_suspended: !prev.is_suspended }));
    setActionModalVisible(false);
    Alert.alert(
      "Status Updated",
      `${selectedUser.name} has been ${selectedUser.is_suspended ? "unsuspended" : "suspended"}.`
    );
  };

  // --------------------------------------------------------------------------
  // 1. DASHBOARD SCREEN
  // --------------------------------------------------------------------------
  const renderDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Page Title & Add CTA */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.pageTitle}>User Directory</Text>
          <Text style={styles.pageSubtitle}>Manage accounts, KYC, and security access</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={styles.primaryAddBtn}
            onPress={() => setAddUserModalVisible(true)}
          >
            <FontAwesome5 name="user-plus" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.primaryAddBtnText}>Add User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryAddBtn, { backgroundColor: "#114b3d" }]}
            onPress={() => Alert.alert("Agency Management", "Navigating to Agency Management Portal...")}
          >
            <FontAwesome5 name="building" size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.primaryAddBtnText}>Agency Mgmt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Users</Text>
          <Text style={styles.metricValue}>14,280</Text>
          <Text style={styles.metricTrend}>+215 Today</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active</Text>
          <Text style={styles.metricValue}>13,842</Text>
          <Text style={[styles.metricTrend, { color: "#10b981" }]}>97% Active</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending KYC</Text>
          <Text style={[styles.metricValue, { color: "#f59e0b" }]}>52</Text>
          <Text style={[styles.metricTrend, { color: "#f59e0b" }]}>Action Required</Text>
        </View>
      </View>

      {/* Quick Actions Bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigateTo("kyc_queue")}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#ecfdf5" }]}>
              <FontAwesome5 name="id-card" size={16} color="#047857" />
            </View>
            <Text style={styles.quickActionLabel}>KYC Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigateTo("activity_logs")}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#e0e7ff" }]}>
              <FontAwesome5 name="shield-alt" size={16} color="#4338ca" />
            </View>
            <Text style={styles.quickActionLabel}>Security Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => Alert.alert("Export Users", "User directory exported as CSV.")}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#f3e8ff" }]}>
              <FontAwesome5 name="file-export" size={16} color="#7e22ce" />
            </View>
            <Text style={styles.quickActionLabel}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setAddUserModalVisible(true)}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: "#ffedd5" }]}>
              <FontAwesome5 name="user-cog" size={16} color="#c2410c" />
            </View>
            <Text style={styles.quickActionLabel}>Roles</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Priority Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Priority</Text>
        <View style={styles.priorityCard}>
          <TouchableOpacity
            style={styles.priorityItem}
            onPress={() => navigateTo("kyc_queue")}
          >
            <View style={styles.priorityLeft}>
              <View style={[styles.priorityIconCircle, { backgroundColor: "#ffedd5" }]}>
                <FontAwesome5 name="clock" size={14} color="#f97316" />
              </View>

              <Text style={styles.priorityText}>52 Users Pending KYC Verification</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.priorityItem}
            onPress={() => navigateTo("activity_logs")}
          >
            <View style={styles.priorityLeft}>
              <View style={[styles.priorityIconCircle, { backgroundColor: "#fee2e2" }]}>
                <FontAwesome5 name="exclamation-triangle" size={14} color="#ef4444" />
              </View>

              <Text style={styles.priorityText}>12 Suspicious Login Attempts Detected</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* User Directory List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Directory</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or role..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(["all", "admins", "agencies", "corporate", "travelers"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* User Cards */}
        {filteredUsers.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.userCard}
            onPress={() => navigateTo("user_details", item)}
          >
            <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.name}</Text>
                {item.is_vip && (
                  <View style={styles.vipBadge}>
                    <Text style={styles.vipBadgeText}>VIP</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
              <Text style={styles.userRoleLoc}>
                {item.role} • {item.location}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.is_suspended
                      ? "#fee2e2"
                      : item.verification_status === UserVerificationStatus.VERIFIED
                      ? "#d1fae5"
                      : "#ffedd5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: item.is_suspended
                        ? "#ef4444"
                        : item.verification_status === UserVerificationStatus.VERIFIED
                        ? "#047857"
                        : "#c2410c",
                    },
                  ]}
                >
                  {item.is_suspended ? "Suspended" : item.verification_status}
                </Text>
              </View>
              <Text style={styles.lastActiveText}>{item.last_active}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // --------------------------------------------------------------------------
  // 2. USER DETAILS SCREEN
  // --------------------------------------------------------------------------
  const renderUserDetails = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>User Profile</Text>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setActionModalVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Header Profile Info */}
      <View style={styles.profileCard}>
        <Image source={{ uri: selectedUser.avatar_url }} style={styles.profileAvatarLarge} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.profileName}>{selectedUser.name}</Text>
            {selectedUser.is_vip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileEmail}>{selectedUser.email}</Text>
          <Text style={styles.profileSub}>{selectedUser.role} • {selectedUser.location}</Text>
        </View>

        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => {
            setNewUserName(selectedUser.name);
            setNewUserEmail(selectedUser.email);
            setNewUserLocation(selectedUser.location);
            setAddUserModalVisible(true);
          }}
        >
          <Text style={styles.editProfileBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Quick Actions</Text>
        <View style={styles.quickActions4Grid}>
          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => navigateTo("kyc_queue")}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#ecfdf5" }]}>
              <FontAwesome5 name="id-card" size={16} color="#047857" />
            </View>
            <Text style={styles.quickAction4Text}>KYC Docs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => navigateTo("activity_logs")}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#e0e7ff" }]}>
              <FontAwesome5 name="history" size={16} color="#4338ca" />
            </View>
            <Text style={styles.quickAction4Text}>Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => Alert.alert("Password Reset", `Sent password reset link to ${selectedUser.email}`)}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#f3e8ff" }]}>
              <FontAwesome5 name="key" size={16} color="#7e22ce" />
            </View>
            <Text style={styles.quickAction4Text}>Reset Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction4Btn}
            onPress={() => setActionModalVisible(true)}
          >
            <View style={[styles.quickAction4Icon, { backgroundColor: "#fee2e2" }]}>
              <FontAwesome5 name="ban" size={16} color="#ef4444" />
            </View>
            <Text style={styles.quickAction4Text}>
              {selectedUser.is_suspended ? "Unsuspend" : "Suspend"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Key Stats */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Bookings</Text>
          <Text style={styles.metricValue}>{selectedUser.total_bookings || 14}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Spent</Text>
          <Text style={styles.metricValue}>{selectedUser.total_spent || "$4,250"}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>2FA Status</Text>
          <Text style={[styles.metricValue, { color: selectedUser.mfa_enabled ? "#047857" : "#c2410c" }]}>
            {selectedUser.mfa_enabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
      </View>

      {/* Account Info Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{selectedUser.user_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{selectedUser.phone || "+1 555-0199"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>KYC Status</Text>
            <Text style={[styles.infoValue, { color: "#047857" }]}>Verified</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Created Date</Text>
            <Text style={styles.infoValue}>Jan 15, 2024</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // --------------------------------------------------------------------------
  // 3. KYC QUEUE SCREEN
  // --------------------------------------------------------------------------
  const renderKycQueue = () => {
    const kycItems = [
      { id: "k1", name: "Sarah Johnson", doc: "Passport & National ID", date: "10 mins ago", status: "Pending" },
      { id: "k2", name: "Michael Brown", doc: "Business License & Tax ID", date: "1 hour ago", status: "Review" },
      { id: "k3", name: "Emily Wilson", doc: "Driver's License", date: "Yesterday", status: "Approved" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>KYC Verification Queue</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsHeader}>
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, kycTab === tab && styles.tabBtnActive]}
              onPress={() => setKycTab(tab)}
            >
              <Text style={[styles.tabBtnText, kycTab === tab && styles.tabBtnTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {kycItems.map((item) => (
            <View key={item.id} style={styles.kycCard}>
              <View style={styles.kycHeaderRow}>
                <View style={styles.kycIconCircle}>
                  <FontAwesome5 name="id-card" size={16} color="#047857" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kycName}>{item.name}</Text>
                  <Text style={styles.kycDoc}>{item.doc}</Text>
                </View>
                <Text style={styles.kycDate}>{item.date}</Text>
              </View>

              <View style={styles.kycActionRow}>
                <TouchableOpacity
                  style={styles.kycRejectBtn}
                  onPress={() => Alert.alert("Rejected", `KYC for ${item.name} rejected.`)}
                >
                  <Text style={styles.kycRejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.kycApproveBtn}
                  onPress={() => Alert.alert("Approved", `KYC for ${item.name} approved.`)}
                >
                  <Text style={styles.kycApproveBtnText}>Approve KYC</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // 4. ACTIVITY LOGS SCREEN
  // --------------------------------------------------------------------------
  const renderActivityLogs = () => {
    const logs = [
      { id: "l1", user: "Sarah Johnson", action: "User Logged In", ip: "192.168.1.45", time: "2 mins ago" },
      { id: "l2", user: "Michael Brown", action: "Password Changed", ip: "10.0.0.12", time: "1 hour ago" },
      { id: "l3", user: "Emily Wilson", action: "Booked Flight #FL-902", ip: "172.16.0.4", time: "3 hours ago" },
      { id: "l4", user: "David Lee", action: "Updated Profile Info", ip: "192.168.2.11", time: "5 hours ago" },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Security & Audit Logs</Text>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#4338ca" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logUserIp}>
                  User: {log.user} • IP: {log.ip}
                </Text>
              </View>
              <Text style={styles.logTime}>{log.time}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {currentScreen === "dashboard" && renderDashboard()}
      {currentScreen === "user_details" && renderUserDetails()}
      {currentScreen === "kyc_queue" && renderKycQueue()}
      {currentScreen === "activity_logs" && renderActivityLogs()}

      {/* Add User Modal */}
      <Modal
        visible={addUserModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setAddUserModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#94a3b8"
                value={newUserName}
                onChangeText={setNewUserName}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. jane@company.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                value={newUserEmail}
                onChangeText={setNewUserEmail}
              />

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. London, UK"
                placeholderTextColor="#94a3b8"
                value={newUserLocation}
                onChangeText={setNewUserLocation}
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateUser}>
                <Text style={styles.modalSubmitBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Status Actions</Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>
                Change account state for{" "}
                <Text style={{ fontWeight: "600", color: "#0f172a" }}>{selectedUser.name}</Text>
              </Text>

              <TouchableOpacity style={styles.modalOptionBtn} onPress={handleToggleSuspend}>
                <Ionicons
                  name={selectedUser.is_suspended ? "checkmark-circle-outline" : "pause-circle-outline"}
                  size={20}
                  color={selectedUser.is_suspended ? "#047857" : "#ef4444"}
                />
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#0f172a", marginLeft: 10 }}>
                  {selectedUser.is_suspended ? "Unsuspend User Account" : "Suspend User Account"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  primaryAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  primaryAddBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  backBtn: {
    padding: 4,
  },
  moreBtn: {
    padding: 4,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 4,
  },
  metricTrend: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "500",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionBtn: {
    alignItems: "center",
    width: (width - 60) / 4,
  },
  quickActionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
    textAlign: "center",
  },
  priorityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  priorityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  priorityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  priorityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  priorityText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#0f172a",
  },
  filterChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginRight: 6,
  },
  userEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  userRoleLoc: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  vipBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#b45309",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  lastActiveText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  profileAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginRight: 6,
  },
  profileEmail: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  profileSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  editProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  quickActions4Grid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickAction4Btn: {
    alignItems: "center",
  },
  quickAction4Icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  quickAction4Text: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  tabsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
  },
  tabBtnText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  tabBtnTextActive: {
    color: "#0f172a",
    fontWeight: "600",
  },
  kycCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  kycHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  kycIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  kycName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  kycDoc: {
    fontSize: 12,
    color: "#64748b",
  },
  kycDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  kycActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  kycRejectBtn: {
    flex: 1,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  kycRejectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
  kycApproveBtn: {
    flex: 1,
    backgroundColor: "#047857",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  kycApproveBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  logIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  logUserIp: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    color: "#94a3b8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  modalBody: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});

export default UserManagementScreen;
