/**
 * Bank Accounts Screen
 * Manage financial accounts and withdrawals
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { Card, Button, SectionHeader, Badge } from "../ui/UIComponents";

interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  status: "active" | "standby" | "action_required";
  type: string;
}

export default function BankAccountsScreen({ navigation }: any) {
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: "1",
      bank: "Global Trust Bank",
      accountNumber: "•••• •••• •••• 8821",
      status: "active",
      type: "Settlement Account",
    },
    {
      id: "2",
      bank: "Horizon Capital",
      accountNumber: "•••• •••• •••• 4492",
      status: "standby",
      type: "Secondary Reserve",
    },
    {
      id: "3",
      bank: "Apex Merchant",
      accountNumber: "•••• •••• •••• 1003",
      status: "action_required",
      type: "Verify Ownership",
    },
  ]);

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
        <Button title="Add" onPress={() => {}} size="small" />
      </View>

      <ScrollView style={styles.content}>
        {/* Info */}
        <View style={styles.section}>
          <Card>
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={COLORS.success}
              />
              <Text style={styles.infoText}>Vault-Grade Security Protocol</Text>
            </View>
            <Text style={styles.infoDetail}>
              Every account connection is isolated within a hardened secure
              enclave. We utilize zero-knowledge proofs and AES-256-GCM
              encryption to ensure your financial credentials remain private and
              untraceable.
            </Text>
            <Button
              title="Review Security Log"
              onPress={() => {}}
              variant="outline"
              size="medium"
              style={{ marginTop: 12 }}
            />
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
                  title="Manage"
                  onPress={() => {}}
                  variant="outline"
                  size="small"
                />
                <TouchableOpacity style={styles.moreBtn}>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={16}
                    color={COLORS.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  infoDetail: {
    fontSize: 12,
    color: COLORS.textTertiary,
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
    borderRadius: 10,
    backgroundColor: `${COLORS.secondary}15`,
    justifyContent: "center",
    alignItems: "center",
  },

  bankName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  accountType: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  accountNumber: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "500",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
});
