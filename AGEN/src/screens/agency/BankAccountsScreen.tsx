/**
 * Bank Accounts Screen - B2B Agency Portal
 * Hardened Payout & Bank Account Management with RBAC Authorization
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { Card, Button, SectionHeader, Badge } from "../ui/UIComponents";
import { useAgencyRBAC } from "../../context/AgencyRBACContext";

interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  routingNumber?: string;
  status: "active" | "standby" | "action_required";
  type: string;
}

export default function BankAccountsScreen({ navigation }: any) {
  const { hasPermission, roleMeta } = useAgencyRBAC();
  const canManageBanking = hasPermission("banking.manage");

  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: "1",
      bank: "Islami Bank Bangladesh Ltd",
      accountNumber: "•••• •••• •••• 8821",
      routingNumber: "125272183",
      status: "active",
      type: "Primary Settlement Account",
    },
    {
      id: "2",
      bank: "City Bank Limited",
      accountNumber: "•••• •••• •••• 4492",
      routingNumber: "225271891",
      status: "standby",
      type: "Secondary Payout Reserve",
    },
    {
      id: "3",
      bank: "BRAC Bank PLC",
      accountNumber: "•••• •••• •••• 1003",
      routingNumber: "060261144",
      status: "action_required",
      type: "Micro-Deposit Verification",
    },
  ]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountType, setAccountType] = useState("Settlement Account");

  const statusColors: Record<string, "active" | "pending" | "error"> = {
    active: "active",
    standby: "pending",
    action_required: "error",
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    standby: "Standby",
    action_required: "Action Required",
  };

  const handleOpenAddAccount = () => {
    if (!canManageBanking) {
      Alert.alert(
        "RBAC Restricted",
        `Only the Agency Owner possesses authorization to connect or alter settlement bank accounts. Current role: ${roleMeta.label}.`
      );
      return;
    }
    setAddModalVisible(true);
  };

  const handleSaveAccount = () => {
    if (!bankName.trim() || !accountNumber.trim()) {
      Alert.alert("Required Fields", "Please enter the bank name and account number.");
      return;
    }

    const maskedNum = `•••• •••• •••• ${accountNumber.slice(-4) || "0000"}`;
    const newAcct: BankAccount = {
      id: `bank-${Date.now()}`,
      bank: bankName.trim(),
      accountNumber: maskedNum,
      routingNumber: routingNumber.trim(),
      status: "standby",
      type: accountType,
    };

    setAccounts([...accounts, newAcct]);
    setAddModalVisible(false);
    setBankName("");
    setAccountNumber("");
    setRoutingNumber("");
    Alert.alert("Bank Account Connected", `${newAcct.bank} successfully enrolled for payouts.`);
  };

  const handleRemoveAccount = (id: string, bank: string) => {
    if (!canManageBanking) {
      Alert.alert("RBAC Restricted", "Only Agency Owner can disconnect bank accounts.");
      return;
    }

    Alert.alert(
      "Confirm Disconnect",
      `Are you sure you want to disconnect ${bank}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            setAccounts(accounts.filter((a) => a.id !== id));
            Alert.alert("Disconnected", `${bank} has been removed.`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Accounts</Text>
        <Button
          title={canManageBanking ? "Add" : "Locked"}
          onPress={handleOpenAddAccount}
          size="small"
        />
      </View>

      <ScrollView style={styles.content}>
        {/* RBAC Persona Warning if restricted */}
        {!canManageBanking && (
          <View style={styles.rbacNotice}>
            <MaterialCommunityIcons name="shield-lock" size={20} color="#f59e0b" />
            <Text style={styles.rbacNoticeText}>
              Read-Only Mode: Logged in as <Text style={{ fontWeight: "700" }}>{roleMeta.label}</Text>. Bank modifications restricted to Agency Owner.
            </Text>
          </View>
        )}

        {/* Security Info Card */}
        <View style={styles.section}>
          <Card>
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={COLORS.success}
              />
              <Text style={styles.infoText}>Vault-Grade Payout Security</Text>
            </View>
            <Text style={styles.infoDetail}>
              Agency settlement balances are processed via Bangladesh Bank BEFTN/RTGS network protocols.
              Payout accounts are hardware-encrypted and require dual-factor authorization for withdrawals.
            </Text>
          </Card>
        </View>

        {/* Accounts List */}
        <View style={styles.section}>
          <SectionHeader title="Connected Accounts" />
          {accounts.map((account) => (
            <Card key={account.id}>
              <View style={styles.accountHeader}>
                <View style={styles.bankIcon}>
                  <MaterialCommunityIcons
                    name="bank"
                    size={24}
                    color={COLORS.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankName}>{account.bank}</Text>
                  <Text style={styles.accountType}>{account.type}</Text>
                  {account.routingNumber && (
                    <Text style={styles.routingText}>Routing: {account.routingNumber}</Text>
                  )}
                </View>
                <Badge
                  label={statusLabels[account.status]}
                  status={statusColors[account.status]}
                  size="small"
                />
              </View>

              <Text style={styles.accountNumber}>{account.accountNumber}</Text>

              <View style={styles.accountActions}>
                <Button
                  title={canManageBanking ? "Manage" : "Inspect"}
                  onPress={() => {
                    Alert.alert(
                      account.bank,
                      `Account: ${account.accountNumber}\nType: ${account.type}\nStatus: ${statusLabels[account.status]}`
                    );
                  }}
                  variant="outline"
                  size="small"
                />
                {canManageBanking && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => handleRemoveAccount(account.id, account.bank)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Bank Account Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Payout Bank Account</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dutch-Bangla Bank Ltd"
              placeholderTextColor="#64748b"
              value={bankName}
              onChangeText={setBankName}
            />

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 110.120.45678"
              placeholderTextColor="#64748b"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Routing / Branch Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 090273181"
              placeholderTextColor="#64748b"
              value={routingNumber}
              onChangeText={setRoutingNumber}
              keyboardType="number-pad"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAccount}>
              <Text style={styles.saveBtnText}>Connect Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  rbacNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rbacNoticeText: {
    fontSize: 12,
    color: "#fbbf24",
    flex: 1,
    lineHeight: 16,
  },
  section: {
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.success,
  },
  infoDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  accountType: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  routingText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    color: COLORS.text,
    marginVertical: 8,
    fontFamily: "monospace",
  },
  accountActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  moreBtn: {
    padding: 6,
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
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
});
