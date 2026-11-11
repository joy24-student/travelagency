/**
 * Trip Split-Bill & Friends Hub Modal
 *
 * Implements:
 * 1. "বন্ধু যোগ করুন" & "লিংক-শেয়ার" (Trip invite link)
 * 2. Every expense tagged with "কে পরিশোধ করেছে" (Payer selector)
 * 3. End settlement summary: "কে কাকে কত দেবে" (Who owes whom how much debts & member balances)
 */

import React, { useState } from "react";
import { Platform,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useSplitBillStore,
  ExpenseCategory,
  SplitGroupMember,
} from "../../store/splitBillStore";
import { tripExportService } from "../../services/trip/tripExportService";

interface TripSplitBillModalProps {
  visible: boolean;
  onClose: () => void;
  tripTitle: string;
  destination: string;
  currency?: "BDT" | "USD";
}

const CATEGORIES: { label: string; value: ExpenseCategory; icon: string }[] = [
  { label: "খাবার ও ডাইনিং", value: "Food & Dining", icon: "restaurant-outline" },
  { label: "যাতায়াত ও ভাড়া", value: "Local Transport", icon: "car-outline" },
  { label: "দর্শনীয় ও টিকিট", value: "Activities", icon: "ticket-outline" },
  { label: "শপিং ও উপহার", value: "Shopping", icon: "bag-handle-outline" },
];

export const TripSplitBillModal: React.FC<TripSplitBillModalProps> = ({
  visible,
  onClose,
  tripTitle,
  destination,
  currency = "BDT",
}) => {
  const currencySymbol = currency === "BDT" ? "৳" : "$";

  // Connect Zustand Split-Bill Store
  const {
    members,
    expenses,
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    getMemberBalances,
    getSettlementDebts,
    getTotalSpending,
  } = useSplitBillStore();

  // Local form states
  const [activeTab, setActiveTab] = useState<"settlement" | "expenses" | "members">("settlement");
  const [showAddMemberInput, setShowAddMemberInput] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");

  // Add Expense form state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [expenseTitle, setExpenseTitle] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("Food & Dining");
  const [paidByMemberId, setPaidByMemberId] = useState<string>(members[0]?.id || "member_you");

  // Computed settlements and member balances
  const debts = getSettlementDebts();
  const balances = getMemberBalances();
  const totalSpent = getTotalSpending();

  // Handle adding new friend
  const handleAddNewMember = () => {
    if (!newMemberName.trim()) {
      Alert.alert("নাম আবশ্যক", "অনুগ্রহ করে বন্ধুর নাম লিখুন।");
      return;
    }
    addMember(newMemberName, newMemberEmail);
    setNewMemberName("");
    setNewMemberEmail("");
    setShowAddMemberInput(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle invite link share
  const handleShareInviteLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await tripExportService.shareTripInviteLink(tripTitle, destination);
    } catch {
      // User dismissed
    }
  };

  // Handle saving new expense with selected payer
  const handleSaveExpense = () => {
    const amt = parseFloat(expenseAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("সঠিক পরিমাণ লিখুন", "খরচের সঠিক টাকার পরিমাণ লিখুন।");
      return;
    }
    if (!expenseTitle.trim()) {
      Alert.alert("বিবরণ দিন", "খরচের বিবরণ (যেমন: লাঞ্চ, চাঁদের গাড়ি) লিখুন।");
      return;
    }

    // Split equally among all current members
    const memberShare = Math.round((amt / members.length) * 100) / 100;
    const splits = members.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      amount: memberShare,
      percentage: Math.round(100 / members.length),
      isPaid: m.id === paidByMemberId,
    }));

    addExpense({
      merchantName: expenseTitle.trim(),
      category: expenseCategory,
      totalAmount: amt,
      currency: currency === "USD" ? "USD" : "BDT",
      date: new Date().toISOString().split("T")[0],
      paidByMemberId,
      splits,
    });

    setExpenseTitle("");
    setExpenseAmount("");
    setShowAddExpenseModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Share settlement debts via WhatsApp/SMS
  const handleShareSettlement = async () => {
    if (debts.length === 0) {
      Alert.alert("কোনো বকেয়া নেই", "সকল সদস্যের হিসাব সমান ও পরিশোধিত আছে।");
      return;
    }

    let summaryText = `🤝 "${tripTitle}" - বন্ধুদের বিল ভাগ সারাংশ\n`;
    summaryText += `💰 মোট খরচ: ${currencySymbol}${totalSpent.toLocaleString()}\n\n`;
    summaryText += `👉 কে কাকে কত দেবে:\n`;

    debts.forEach((d, idx) => {
      summaryText += `${idx + 1}. ${d.fromMemberName} ➔ ${d.toMemberName} কে ${currencySymbol}${d.amount.toLocaleString()} দেবে\n`;
    });

    summaryText += `\nShopno AI Travel Planner এর মাধ্যমে প্রস্তুতকৃত।`;

    await Share.share({
      title: "বিল ভাগ সারাংশ",
      message: summaryText,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <View style={styles.headerBadge}>
                <Ionicons name="people" size={13} color="#2563EB" />
                <Text style={styles.headerBadgeText}>{members.length} জন বন্ধু যুক্ত</Text>
              </View>
              <Text style={styles.sheetTitle}>বন্ধুদের সাথে বিল ভাগ ও পরিকল্পনা</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Bar: "বন্ধু যোগ করুন" & "লিংক-শেয়ার" */}
          <View style={styles.inviteBar}>
            <TouchableOpacity
              style={styles.inviteLinkBtn}
              activeOpacity={0.8}
              onPress={handleShareInviteLink}
            >
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              <Text style={styles.inviteLinkBtnText}>লিংক শেয়ার করে বন্ধু যুক্ত করুন</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addMemberBtn}
              activeOpacity={0.8}
              onPress={() => setShowAddMemberInput(!showAddMemberInput)}
            >
              <Ionicons name={showAddMemberInput ? "close" : "person-add"} size={16} color="#2563EB" />
              <Text style={styles.addMemberBtnText}>
                {showAddMemberInput ? "বাতিল" : "বন্ধু যোগ"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Member Inline Input Form */}
          {showAddMemberInput && (
            <View style={styles.addMemberForm}>
              <Text style={styles.formLabel}>বন্ধুর নাম:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: তানভীর হাসান"
                placeholderTextColor="#94A3B8"
                value={newMemberName}
                onChangeText={setNewMemberName}
              />
              <Text style={styles.formLabel}>ইমেইল বা ফোন (ঐচ্ছিক):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="tanvir@example.com"
                placeholderTextColor="#94A3B8"
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
              />
              <TouchableOpacity style={styles.submitMemberBtn} onPress={handleAddNewMember}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.submitMemberBtnText}>গ্রুপে যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation Tabs */}
          <View style={styles.navTabsRow}>
            <TouchableOpacity
              style={[styles.navTab, activeTab === "settlement" && styles.navTabActive]}
              onPress={() => setActiveTab("settlement")}
            >
              <Ionicons
                name="swap-horizontal"
                size={16}
                color={activeTab === "settlement" ? "#2563EB" : "#64748B"}
              />
              <Text
                style={[styles.navTabText, activeTab === "settlement" && styles.navTabTextActive]}
              >
                কে কাকে কত দেবে
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeTab === "expenses" && styles.navTabActive]}
              onPress={() => setActiveTab("expenses")}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={activeTab === "expenses" ? "#2563EB" : "#64748B"}
              />
              <Text style={[styles.navTabText, activeTab === "expenses" && styles.navTabTextActive]}>
                খরচের তালিকা ({expenses.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeTab === "members" && styles.navTabActive]}
              onPress={() => setActiveTab("members")}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={activeTab === "members" ? "#2563EB" : "#64748B"}
              />
              <Text style={[styles.navTabText, activeTab === "members" && styles.navTabTextActive]}>
                সদস্য ({members.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
            {/* ─── TAB 1: কে কাকে কত দেবে (Settlement Summary) ─────────── */}
            {activeTab === "settlement" && (
              <View style={styles.tabSection}>
                {/* Total spending banner */}
                <View style={styles.totalSpendingCard}>
                  <Text style={styles.totalSpendingLabel}>গ্রুপের মোট খরচ</Text>
                  <Text style={styles.totalSpendingAmount}>
                    {currencySymbol}{totalSpent.toLocaleString()}
                  </Text>
                  <Text style={styles.totalSpendingSub}>
                    সদস্য প্রতি গড় খরচ: {currencySymbol}
                    {members.length > 0
                      ? Math.round(totalSpent / members.length).toLocaleString()
                      : 0}
                  </Text>
                </View>

                {/* Settlement Debts Section (কে কাকে কত দেবে) */}
                <View style={styles.subHeaderRow}>
                  <Text style={styles.subHeaderTitle}>🤝 পরিশোধের চূড়ান্ত সারাংশ</Text>
                  {debts.length > 0 && (
                    <TouchableOpacity style={styles.shareSummaryBtn} onPress={handleShareSettlement}>
                      <Ionicons name="logo-whatsapp" size={14} color="#15803D" />
                      <Text style={styles.shareSummaryBtnText}>শেয়ার করুন</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {debts.length === 0 ? (
                  <View style={styles.emptySettlementBox}>
                    <Ionicons name="checkmark-done-circle" size={40} color="#10B981" />
                    <Text style={styles.emptySettlementTitle}>কোনো দেনা-পাওনা নেই!</Text>
                    <Text style={styles.emptySettlementSub}>
                      সকল সদস্যের বিল ভাগ সঠিকভাবে সমন্বয় করা হয়েছে।
                    </Text>
                  </View>
                ) : (
                  <View style={styles.debtsList}>
                    {debts.map((d, index) => (
                      <View key={index} style={styles.debtCard}>
                        <View style={styles.debtLeft}>
                          <View style={styles.payerBadge}>
                            <Text style={styles.payerBadgeText}>{d.fromMemberName}</Text>
                          </View>
                          <Ionicons name="arrow-forward" size={16} color="#64748B" />
                          <View style={styles.receiverBadge}>
                            <Text style={styles.receiverBadgeText}>{d.toMemberName}</Text>
                          </View>
                        </View>

                        <View style={styles.debtRight}>
                          <Text style={styles.debtAmountLabel}>পরিশোধ করবে</Text>
                          <Text style={styles.debtAmountValue}>
                            {currencySymbol}{d.amount.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Member Net Balances Table */}
                <Text style={[styles.subHeaderTitle, { marginTop: 18, marginBottom: 8 }]}>
                  📊 প্রতিটি সদস্যের হিসাব বিবরণী
                </Text>

                <View style={styles.balancesContainer}>
                  {balances.map((b) => (
                    <View key={b.memberId} style={styles.balanceRow}>
                      <View style={styles.memberInfoCol}>
                        <Text style={styles.balanceMemberName}>
                          {b.memberName} {b.isCurrentUser ? "(আপনি)" : ""}
                        </Text>
                        <Text style={styles.balanceDetailsText}>
                          পরিশোধ: {currencySymbol}{b.totalPaid.toLocaleString()} · নিজের অংশ: {currencySymbol}
                          {b.totalShare.toLocaleString()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.balanceStatusPill,
                          b.netBalance > 0
                            ? styles.balancePlusPill
                            : b.netBalance < 0
                            ? styles.balanceMinusPill
                            : styles.balanceZeroPill,
                        ]}
                      >
                        <Text
                          style={[
                            styles.balanceStatusText,
                            b.netBalance > 0
                              ? styles.balancePlusText
                              : b.netBalance < 0
                              ? styles.balanceMinusText
                              : styles.balanceZeroText,
                          ]}
                        >
                          {b.netBalance > 0
                            ? `+${currencySymbol}${b.netBalance.toLocaleString()} পাবে`
                            : b.netBalance < 0
                            ? `-${currencySymbol}${Math.abs(b.netBalance).toLocaleString()} দেবে`
                            : "পরিশোধিত"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── TAB 2: খরচের তালিকা (Expenses & Payer) ───────────────── */}
            {activeTab === "expenses" && (
              <View style={styles.tabSection}>
                <TouchableOpacity
                  style={styles.primaryAddExpenseBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowAddExpenseModal(true)}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryAddExpenseBtnText}>নতুন খরচ যোগ করুন</Text>
                </TouchableOpacity>

                {expenses.length === 0 ? (
                  <View style={styles.emptyExpensesBox}>
                    <Ionicons name="receipt-outline" size={38} color="#94A3B8" />
                    <Text style={styles.emptyExpensesText}>এখনও কোনো খরচ যুক্ত করা হয়নি।</Text>
                    <Text style={styles.emptyExpensesSub}>
                      খাবার, যাতায়াত বা টিকিট খরচ যুক্ত করুন এবং কে টাকা দিয়েছে তা সিলেক্ট করুন।
                    </Text>
                  </View>
                ) : (
                  <View style={styles.expensesList}>
                    {expenses.map((exp) => (
                      <View key={exp.id} style={styles.expenseCard}>
                        <View style={styles.expenseHeaderRow}>
                          <View style={styles.expenseTitleCol}>
                            <Text style={styles.expenseMerchant}>{exp.merchantName}</Text>
                            <View style={styles.expenseTagRow}>
                              <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{exp.category}</Text>
                              </View>
                              <Text style={styles.expenseDate}>{exp.date}</Text>
                            </View>
                          </View>

                          <View style={styles.expenseAmountCol}>
                            <Text style={styles.expenseTotalText}>
                              {currencySymbol}{exp.totalAmount.toLocaleString()}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeExpense(exp.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Who Paid Badge */}
                        <View style={styles.paidByRow}>
                          <Ionicons name="wallet-outline" size={13} color="#2563EB" />
                          <Text style={styles.paidByText}>
                            পরিশোধ করেছেন:{" "}
                            <Text style={styles.paidByNameBold}>{exp.paidByMemberName}</Text>
                          </Text>
                          <Text style={styles.splitCountText}>
                            ({exp.splits.length} জনের মধ্যে ভাগ)
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ─── TAB 3: সদস্যবৃন্দ (Members) ─────────────────────────── */}
            {activeTab === "members" && (
              <View style={styles.tabSection}>
                <View style={styles.membersList}>
                  {members.map((m) => (
                    <View key={m.id} style={styles.memberCard}>
                      <View style={styles.memberAvatarCircle}>
                        <Text style={styles.memberAvatarChar}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.memberDetailsCol}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberRoleText}>
                          {m.isCurrentUser ? "গ্রুপ হোস্ট (আপনি)" : m.email || "সদস্য"}
                        </Text>
                      </View>

                      {!m.isCurrentUser && (
                        <TouchableOpacity
                          style={styles.removeMemberBtn}
                          onPress={() => removeMember(m.id)}
                        >
                          <Ionicons name="remove-circle-outline" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* ─── ADD EXPENSE POPUP MODAL ─────────────────────────────────── */}
          <Modal
            visible={showAddExpenseModal}
            animationType="fade"
            transparent
            onRequestClose={() => setShowAddExpenseModal(false)}
          >
            <View style={styles.innerModalOverlay}>
              <View style={styles.innerModalCard}>
                <View style={styles.innerModalHeader}>
                  <Text style={styles.innerModalTitle}>নতুন খরচ লিপিবদ্ধ করুন</Text>
                  <TouchableOpacity onPress={() => setShowAddExpenseModal(false)}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.formLabel}>খরচের বিবরণ / স্থান:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="যেমন: পৌষী রেস্তোরাঁ ডিনার"
                  placeholderTextColor="#94A3B8"
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                />

                {/* Amount */}
                <Text style={styles.formLabel}>টাকার পরিমাণ ({currencySymbol}):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="যেমন: ২০০০"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                />

                {/* Category Selector */}
                <Text style={styles.formLabel}>ক্যাটাগরি:</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={[
                        styles.catOption,
                        expenseCategory === c.value && styles.catOptionActive,
                      ]}
                      onPress={() => setExpenseCategory(c.value)}
                    >
                      <Ionicons
                        name={c.icon as any}
                        size={14}
                        color={expenseCategory === c.value ? "#2563EB" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.catOptionText,
                          expenseCategory === c.value && styles.catOptionTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* KEY REQUIREMENT: কে পরিশোধ করেছে (Paid By Member Picker) */}
                <Text style={[styles.formLabel, { marginTop: 12 }]}>
                  👉 কে পরিশোধ করেছে? (টাকা কে দিয়েছে):
                </Text>
                <View style={styles.payerChipsRow}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.payerChip,
                        paidByMemberId === m.id && styles.payerChipActive,
                      ]}
                      onPress={() => setPaidByMemberId(m.id)}
                    >
                      <Ionicons
                        name={paidByMemberId === m.id ? "checkmark-circle" : "person-outline"}
                        size={14}
                        color={paidByMemberId === m.id ? "#FFFFFF" : "#475569"}
                      />
                      <Text
                        style={[
                          styles.payerChipText,
                          paidByMemberId === m.id && styles.payerChipTextActive,
                        ]}
                      >
                        {m.name} {m.isCurrentUser ? "(আপনি)" : ""}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveExpenseBtn}
                  activeOpacity={0.85}
                  onPress={handleSaveExpense}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveExpenseBtnText}>খরচ সংরক্ষণ ও ভাগ করুন</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  inviteBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  inviteLinkBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 9,
    borderRadius: 10,
  },
  inviteLinkBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addMemberBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  addMemberBtnText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  addMemberForm: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 8,
  },
  submitMemberBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 4,
  },
  submitMemberBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  navTabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 12,
  },
  navTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  navTabActive: {
    borderBottomColor: "#2563EB",
  },
  navTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  navTabTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
  tabContent: {
    maxHeight: 450,
  },
  tabSection: {
    paddingBottom: 20,
  },
  totalSpendingCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  totalSpendingLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  totalSpendingAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 4,
  },
  totalSpendingSub: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  subHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  subHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  shareSummaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  shareSummaryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  emptySettlementBox: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  emptySettlementTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
    marginTop: 8,
  },
  emptySettlementSub: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  debtsList: {
    gap: 8,
  },
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 4px rgba(15, 23, 42, 0.04)" } : {}),
  },
  debtLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payerBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  receiverBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  receiverBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  debtRight: {
    alignItems: "flex-end",
  },
  debtAmountLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  debtAmountValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  balancesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  memberInfoCol: {
    flex: 1,
  },
  balanceMemberName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  balanceDetailsText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  balanceStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  balancePlusPill: {
    backgroundColor: "#ECFDF5",
  },
  balancePlusText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  balanceMinusPill: {
    backgroundColor: "#FEF2F2",
  },
  balanceMinusText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
  },
  balanceZeroPill: {
    backgroundColor: "#F1F5F9",
  },
  balanceZeroText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  balanceStatusText: {},
  primaryAddExpenseBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryAddExpenseBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyExpensesBox: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  emptyExpensesText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptyExpensesSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  expensesList: {
    gap: 10,
  },
  expenseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  expenseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  expenseTitleCol: {
    flex: 1,
  },
  expenseMerchant: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  expenseTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },
  expenseDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  expenseAmountCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expenseTotalText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  paidByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paidByText: {
    fontSize: 11,
    color: "#475569",
  },
  paidByNameBold: {
    fontWeight: "800",
    color: "#2563EB",
  },
  splitCountText: {
    fontSize: 10,
    color: "#64748B",
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  memberAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  memberAvatarChar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  memberDetailsCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  memberRoleText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  removeMemberBtn: {
    padding: 6,
  },
  innerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    padding: 16,
  },
  innerModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },
  innerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  innerModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  catOptionActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  catOptionText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  catOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  payerChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  payerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  payerChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  payerChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  payerChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  saveExpenseBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveExpenseBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
