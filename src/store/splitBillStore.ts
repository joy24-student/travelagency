/**
 * Group Split-Bill Ledger Store (Zustand)
 *
 * Manages shared travel group expenses, automated split calculations,
 * member balances, and minimal-transaction debt settlements.
 *
 * Strict Boundaries: Does NOT modify or interact with wallet transaction or refund tables.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cachedStateStorage } from "./storage";

export type ReceiptCurrency = "BDT" | "USD" | "EUR" | "INR";
export type ExpenseCategory =
  | "Food & Dining"
  | "Local Transport"
  | "Shopping"
  | "Activities";

export interface SplitGroupMember {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isCurrentUser: boolean;
}

export interface SplitMemberShare {
  memberId: string;
  memberName: string;
  amount: number;
  percentage: number;
  isPaid: boolean;
}

export interface SplitExpenseItem {
  id: string;
  receiptId?: string;
  merchantName: string;
  category: ExpenseCategory;
  totalAmount: number;
  currency: ReceiptCurrency;
  date: string; // YYYY-MM-DD
  notes?: string;
  imageUri?: string;
  paidByMemberId: string;
  paidByMemberName: string;
  splits: SplitMemberShare[];
  createdAt: string;
}

export interface SettlementDebt {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  currency: ReceiptCurrency;
}

export interface MemberBalanceSummary {
  memberId: string;
  memberName: string;
  isCurrentUser: boolean;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface CategoryExpenseSummary {
  category: ExpenseCategory;
  totalAmount: number;
  count: number;
}

export interface SplitBillState {
  tripName: string;
  currency: ReceiptCurrency;
  members: SplitGroupMember[];
  expenses: SplitExpenseItem[];

  // Actions
  setTripName: (name: string) => void;
  setCurrency: (currency: ReceiptCurrency) => void;
  addMember: (name: string, email?: string) => SplitGroupMember;
  removeMember: (memberId: string) => void;
  addExpense: (
    expense: Omit<SplitExpenseItem, "id" | "createdAt" | "paidByMemberName"> & {
      id?: string;
    }
  ) => SplitExpenseItem;
  removeExpense: (id: string) => void;
  clearExpenses: () => void;

  // Calculators & Selectors
  getMemberBalances: () => MemberBalanceSummary[];
  getSettlementDebts: () => SettlementDebt[];
  getCategoryBreakdown: () => CategoryExpenseSummary[];
  getTotalSpending: () => number;
}

export const DEFAULT_GROUP_MEMBERS: SplitGroupMember[] = [
  { id: "member_you", name: "You (Host)", isCurrentUser: true },
  { id: "member_rahim", name: "Rahim", isCurrentUser: false },
  { id: "member_karim", name: "Karim", isCurrentUser: false },
  { id: "member_ayesha", name: "Ayesha", isCurrentUser: false },
  { id: "member_tanvir", name: "Tanvir", isCurrentUser: false },
];

export const useSplitBillStore = create<SplitBillState>()(
  persist(
    (set, get) => ({
      tripName: "Sundarbans & Cox's Bazar Expedition",
      currency: "BDT",
      members: DEFAULT_GROUP_MEMBERS,
      expenses: [],

      setTripName: (tripName) => set({ tripName }),
      setCurrency: (currency) => set({ currency }),

      addMember: (name, email) => {
        const newMember: SplitGroupMember = {
          id: `member_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          email: email?.trim(),
          isCurrentUser: false,
        };
        set((state) => ({ members: [...state.members, newMember] }));
        return newMember;
      },

      removeMember: (memberId) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== memberId || m.isCurrentUser),
          expenses: state.expenses.filter((e) => e.paidByMemberId !== memberId),
        }));
      },

      addExpense: (expenseData) => {
        const state = get();
        const payer =
          state.members.find((m) => m.id === expenseData.paidByMemberId) ||
          state.members.find((m) => m.isCurrentUser) ||
          state.members[0];

        const id =
          expenseData.id ||
          `split_exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const createdAt = new Date().toISOString();

        // Ensure member names on splits are accurate
        const resolvedSplits = expenseData.splits.map((s) => {
          const m = state.members.find((mem) => mem.id === s.memberId);
          return {
            ...s,
            memberName: m ? m.name : s.memberName || "Traveler",
          };
        });

        const newExpense: SplitExpenseItem = {
          ...expenseData,
          id,
          paidByMemberName: payer.name,
          splits: resolvedSplits,
          createdAt,
        };

        set((s) => ({
          expenses: [newExpense, ...s.expenses],
        }));

        return newExpense;
      },

      removeExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
      },

      clearExpenses: () => {
        set({ expenses: [] });
      },

      getMemberBalances: () => {
        const { members, expenses } = get();
        const balanceMap: Record<
          string,
          { totalPaid: number; totalShare: number }
        > = {};

        // Initialize maps
        for (const member of members) {
          balanceMap[member.id] = { totalPaid: 0, totalShare: 0 };
        }

        // Aggregate expenses
        for (const exp of expenses) {
          if (!balanceMap[exp.paidByMemberId]) {
            balanceMap[exp.paidByMemberId] = { totalPaid: 0, totalShare: 0 };
          }
          balanceMap[exp.paidByMemberId].totalPaid += exp.totalAmount;

          for (const split of exp.splits) {
            if (!balanceMap[split.memberId]) {
              balanceMap[split.memberId] = { totalPaid: 0, totalShare: 0 };
            }
            balanceMap[split.memberId].totalShare += split.amount;
          }
        }

        return members.map((member) => {
          const rec = balanceMap[member.id] || { totalPaid: 0, totalShare: 0 };
          const netBalance = Math.round((rec.totalPaid - rec.totalShare) * 100) / 100;
          return {
            memberId: member.id,
            memberName: member.name,
            isCurrentUser: member.isCurrentUser,
            totalPaid: Math.round(rec.totalPaid * 100) / 100,
            totalShare: Math.round(rec.totalShare * 100) / 100,
            netBalance,
          };
        });
      },

      getSettlementDebts: () => {
        const { getMemberBalances, currency } = get();
        const balances = getMemberBalances();

        interface BalanceNode {
          memberId: string;
          memberName: string;
          balance: number;
        }

        // Debtors owe money (negative netBalance), Creditors are owed money (positive netBalance)
        const debtors: BalanceNode[] = [];
        const creditors: BalanceNode[] = [];

        for (const b of balances) {
          if (b.netBalance < -0.01) {
            debtors.push({
              memberId: b.memberId,
              memberName: b.memberName,
              balance: -b.netBalance,
            });
          } else if (b.netBalance > 0.01) {
            creditors.push({
              memberId: b.memberId,
              memberName: b.memberName,
              balance: b.netBalance,
            });
          }
        }

        debtors.sort((a, b) => b.balance - a.balance);
        creditors.sort((a, b) => b.balance - a.balance);

        const settlements: SettlementDebt[] = [];
        let dIdx = 0;
        let cIdx = 0;

        while (dIdx < debtors.length && cIdx < creditors.length) {
          const debtor = debtors[dIdx];
          const creditor = creditors[cIdx];

          const settleAmount = Math.min(debtor.balance, creditor.balance);
          if (settleAmount > 0.01) {
            settlements.push({
              fromMemberId: debtor.memberId,
              fromMemberName: debtor.memberName,
              toMemberId: creditor.memberId,
              toMemberName: creditor.memberName,
              amount: Math.round(settleAmount * 100) / 100,
              currency,
            });
          }

          debtor.balance -= settleAmount;
          creditor.balance -= settleAmount;

          if (debtor.balance <= 0.01) dIdx++;
          if (creditor.balance <= 0.01) cIdx++;
        }

        return settlements;
      },

      getCategoryBreakdown: () => {
        const { expenses } = get();
        const catMap: Record<ExpenseCategory, { total: number; count: number }> = {
          "Food & Dining": { total: 0, count: 0 },
          "Local Transport": { total: 0, count: 0 },
          Shopping: { total: 0, count: 0 },
          Activities: { total: 0, count: 0 },
        };

        for (const e of expenses) {
          if (catMap[e.category]) {
            catMap[e.category].total += e.totalAmount;
            catMap[e.category].count += 1;
          }
        }

        return (Object.keys(catMap) as ExpenseCategory[]).map((category) => ({
          category,
          totalAmount: Math.round(catMap[category].total * 100) / 100,
          count: catMap[category].count,
        }));
      },

      getTotalSpending: () => {
        const { expenses } = get();
        return Math.round(
          expenses.reduce((acc, curr) => acc + curr.totalAmount, 0) * 100
        ) / 100;
      },
    }),
    {
      name: "shopno_split_bill_ledger_storage",
      storage: createJSONStorage(() => cachedStateStorage),
      partialize: (state) => ({
        tripName: state.tripName,
        currency: state.currency,
        members: state.members,
        expenses: state.expenses,
      }),
    }
  )
);
