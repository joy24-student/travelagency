/**
 * Group Trip Push Notification Service - Shopno Jatra
 *
 * Dispatches targeted push notifications for:
 * 1. New proposal created ("নতুন প্রস্তাবনা: [title] - ভোট দিন!")
 * 2. Proposal voting accepted / winner copied ("প্রস্তাবনা গৃহীত: [title]")
 * 3. New expense involving a member ("আপনার অংশ: ৳[amount]")
 */

import { fcmNotificationService } from "../fcmNotificationService";
import { paisaToBdt } from "../../utils/groupTripBalances";

export interface GroupMemberNotificationTarget {
  userId: string;
  name?: string;
}

export const groupTripNotificationService = {
  /**
   * Notify members about a new trip proposal open for voting
   */
  async notifyNewProposal(params: {
    tripId: string;
    tripTitle: string;
    proposalTitle: string;
    creatorName: string;
    targetUserIds?: string[];
  }): Promise<void> {
    try {
      const title = "নতুন প্রস্তাবনা · স্বপ্নযাত্রা গ্রুপ ট্রিপ";
      const body = `${params.creatorName || "একজন সহযাত্রী"} "${params.proposalTitle}" প্রস্তাব করেছেন। এখনই ভোট দিন!`;

      await fcmNotificationService.sendLocalNotification(title, body, {
        type: "community",
        route: `/screens/group-trip?tripId=${params.tripId}&tab=proposals`,
        tripId: params.tripId,
        proposalTitle: params.proposalTitle,
      });
    } catch (err) {
      console.warn("[GroupTripNotification] Error notifying new proposal:", err);
    }
  },

  /**
   * Notify members about voting outcome and accepted proposal
   */
  async notifyVoteResult(params: {
    tripId: string;
    tripTitle: string;
    proposalTitle: string;
    status: "accepted" | "rejected";
  }): Promise<void> {
    try {
      const isAccepted = params.status === "accepted";
      const title = isAccepted
        ? "প্রস্তাবনা গৃহীত! 🎉"
        : "প্রস্তাবনা বাতিল হয়েছে";
      const body = isAccepted
        ? `"${params.proposalTitle}" ভোটে পাস হয়েছে এবং ট্রিপ আইটিনারিতে যুক্ত হয়েছে!`
        : `"${params.proposalTitle}" ভোটে পর্যাপ্ত সমর্থন পায়নি।`;

      await fcmNotificationService.sendLocalNotification(title, body, {
        type: "community",
        route: `/screens/group-trip?tripId=${params.tripId}&tab=itinerary`,
        tripId: params.tripId,
        proposalTitle: params.proposalTitle,
        status: params.status,
      });
    } catch (err) {
      console.warn("[GroupTripNotification] Error notifying vote result:", err);
    }
  },

  /**
   * Notify member when an expense is added that involves them
   */
  async notifyExpenseAdded(params: {
    tripId: string;
    tripTitle: string;
    payerName: string;
    description: string;
    mySharePaisa: bigint | number;
    currency?: string;
  }): Promise<void> {
    try {
      const shareBdt = paisaToBdt(params.mySharePaisa);
      const title = "নতুন খরচ যুক্ত হয়েছে 💰";
      const body = `${params.payerName || "একজন সদস্য"} "${params.description}" বাবদ খরচ যুক্ত করেছেন। আপনার অংশ: ৳${shareBdt}`;

      await fcmNotificationService.sendLocalNotification(title, body, {
        type: "booking",
        route: `/screens/group-trip?tripId=${params.tripId}&tab=expenses`,
        tripId: params.tripId,
        sharePaisa: params.mySharePaisa.toString(),
      });
    } catch (err) {
      console.warn("[GroupTripNotification] Error notifying expense added:", err);
    }
  },
};
