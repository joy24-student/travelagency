/**
 * Trip Export & Sharing Service
 *
 * Capabilities:
 * 1. PDF Generation & Share: Creates a beautifully formatted, printable PDF itinerary via expo-print & expo-sharing.
 * 2. Shareable Link & Text: Generates shareable web links & social summary for WhatsApp/family.
 * 3. Offline Trip Persistence: Stores complete itinerary payload in AsyncStorage for 100% offline access without internet.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Share } from "react-native";
import { TripPlan } from "../ai/types";
import { SplitExpenseItem, SettlementDebt } from "../../store/splitBillStore";

const OFFLINE_PLANS_KEY = "@shopno_offline_trip_plans";

export interface OfflineTripRecord {
  id: string;
  savedAt: string;
  plan: TripPlan;
  expenses?: SplitExpenseItem[];
  settlements?: SettlementDebt[];
}

export const tripExportService = {
  /**
   * Generates a printable, styled HTML template of the entire TripPlan.
   */
  generateTripHtml(
    plan: TripPlan,
    expenses: SplitExpenseItem[] = [],
    settlements: SettlementDebt[] = []
  ): string {
    const currencySymbol = plan.currency === "BDT" ? "৳" : "$";
    const totalSpent = expenses.reduce((acc, e) => acc + (e.totalAmount || 0), 0);

    const daysHtml = plan.days
      .map((day) => {
        const activitiesRows = (day.activities || [])
          .map(
            (act) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; font-weight: 700; color: #2563eb; width: 90px; vertical-align: top;">
              ${act.time}
            </td>
            <td style="padding: 10px 12px; vertical-align: top;">
              <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${act.activity}</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 2px;">📍 ${act.location}</div>
              ${
                act.notes
                  ? `<div style="color: #475569; font-size: 11px; margin-top: 4px; font-style: italic;">Note: ${act.notes}</div>`
                  : ""
              }
            </td>
            <td style="padding: 10px 12px; color: #059669; font-weight: 700; font-size: 13px; text-align: right; width: 100px; vertical-align: top;">
              ${act.estimatedCost ? `${currencySymbol}${act.estimatedCost.toLocaleString()}` : "Free"}
            </td>
          </tr>`
          )
          .join("");

        const mealsHtml = (day.meals || [])
          .map(
            (m) => `
          <div style="background: #f8fafc; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; font-size: 12px;">
            <span style="font-weight: 700; text-transform: capitalize; color: #2563eb;">${m.type}:</span>
            <span style="color: #0f172a; font-weight: 600;"> ${m.dishName || m.suggestion}</span>
            ${m.restaurant ? `<span style="color: #64748b;"> (@ ${m.restaurant})</span>` : ""}
          </div>`
          )
          .join("");

        return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; overflow: hidden; page-break-inside: avoid;">
          <div style="background: linear-gradient(90deg, #1e293b, #334155); color: #ffffff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 15px; font-weight: 800;">Day ${day.day}: ${day.theme}</span>
            <span style="font-size: 12px; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px;">
              ${day.date || `Day ${day.day}`}
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 8px 12px; text-align: left;">সময়</th>
                <th style="padding: 8px 12px; text-align: left;">কার্যক্রম ও লোকেশন</th>
                <th style="padding: 8px 12px; text-align: right;">আনুমানিক ব্যয়</th>
              </tr>
            </thead>
            <tbody>
              ${activitiesRows}
            </tbody>
          </table>

          ${
            mealsHtml
              ? `<div style="padding: 12px 16px; border-top: 1px solid #f1f5f9; background: #fafafa;">
                  <div style="font-size: 12px; font-weight: 800; color: #475569; margin-bottom: 6px;">🍽️ আহারের পরিকল্পনা:</div>
                  ${mealsHtml}
                </div>`
              : ""
          }

          ${
            day.accommodation
              ? `<div style="padding: 10px 16px; border-top: 1px solid #f1f5f9; background: #eff6ff; font-size: 12px; color: #1e40af;">
                  🏨 <b>আবাসন:</b> ${day.accommodation}
                </div>`
              : ""
          }
        </div>`;
      })
      .join("");

    const budgetHtml = plan.budget
      ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; color: #0f172a;">📊 বাজেট বিশ্লেষণ ও বণ্টন (পরিকল্পিত বনাম খরচ)</h3>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <div style="flex: 1; background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b;">পরিকল্পিত বাজেট</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${currencySymbol}${plan.totalEstimatedCost.toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b;">বর্তমান খরচ (Split Bill)</div>
            <div style="font-size: 16px; font-weight: 800; color: ${totalSpent > plan.totalEstimatedCost ? "#ef4444" : "#059669"};">
              ${currencySymbol}${totalSpent.toLocaleString()}
            </div>
          </div>
          <div style="flex: 1; background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b;">অবশিষ্ট ব্যালেন্স</div>
            <div style="font-size: 16px; font-weight: 800; color: ${plan.totalEstimatedCost - totalSpent < 0 ? "#ef4444" : "#2563eb"};">
              ${currencySymbol}${Math.abs(plan.totalEstimatedCost - totalSpent).toLocaleString()} ${plan.totalEstimatedCost - totalSpent < 0 ? "(ঘাটতি)" : ""}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px;">
          <div style="background: #eff6ff; padding: 8px; border-radius: 6px; border: 1px solid #bfdbfe;">
            <b>🏨 হোটেল (${plan.budget.hotel?.percentage}%):</b> ${currencySymbol}${plan.budget.hotel?.estimated?.toLocaleString()}
          </div>
          <div style="background: #f0fdf4; padding: 8px; border-radius: 6px; border: 1px solid #bbf7d0;">
            <b>🚗 যাতায়াত (${plan.budget.transport?.percentage}%):</b> ${currencySymbol}${plan.budget.transport?.estimated?.toLocaleString()}
          </div>
          <div style="background: #fffbeb; padding: 8px; border-radius: 6px; border: 1px solid #fef3c7;">
            <b>🍛 খাবার (${plan.budget.food?.percentage}%):</b> ${currencySymbol}${plan.budget.food?.estimated?.toLocaleString()}
          </div>
          <div style="background: #faf5ff; padding: 8px; border-radius: 6px; border: 1px solid #f3e8ff;">
            <b>🎟️ দর্শনীয় (${plan.budget.activities?.percentage}%):</b> ${currencySymbol}${plan.budget.activities?.estimated?.toLocaleString()}
          </div>
        </div>
      </div>`
      : "";

    const settlementsHtml =
      settlements.length > 0
        ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; page-break-inside: avoid;">
        <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 14px; color: #166534;">🤝 বন্ধুদের বিল ভাগ সারাংশ (কে কাকে কত দেবে)</h3>
        ${settlements
          .map(
            (s) => `
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px;">
            <span><b>${s.fromMemberName}</b> ➔ <b>${s.toMemberName}</b> কে পরিশোধ করবে</span>
            <span style="font-weight: 800; color: #15803d;">${currencySymbol}${s.amount.toLocaleString()}</span>
          </div>`
          )
          .join("")}
      </div>`
        : "";

    const packingHtml =
      plan.packingChecklist && plan.packingChecklist.length > 0
        ? `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; page-break-inside: avoid;">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #334155;">🎒 সাথে যা যা নেবেন (চেকলিস্ট):</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${plan.packingChecklist
            .map(
              (item) => `
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #334155;">
              ✓ ${item}
            </span>`
            )
            .join("")}
        </div>
      </div>`
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${plan.title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #1e293b;
            background: #ffffff;
            line-height: 1.5;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 24px; border-radius: 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
                Shopno AI Travel Plan
              </span>
              <h1 style="margin: 10px 0 6px 0; font-size: 22px; font-weight: 800;">${plan.title}</h1>
              <p style="margin: 0; font-size: 13px; opacity: 0.9;">
                📍 ${plan.destination} · ⏱️ ${plan.durationDays} দিন · 👥 ট্রাভেলার্স প্ল্যান
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; opacity: 0.8;">মোট আনুমানিক বাজেট</div>
              <div style="font-size: 24px; font-weight: 900; color: #fde047;">${currencySymbol}${plan.totalEstimatedCost.toLocaleString()}</div>
            </div>
          </div>
        </div>

        ${plan.summary ? `<p style="font-size: 14px; color: #475569; margin-bottom: 20px;">${plan.summary}</p>` : ""}

        ${budgetHtml}
        ${settlementsHtml}

        <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
          📅 প্রতিদিনের সূচি ও কার্যক্রম
        </h3>

        ${daysHtml}
        ${packingHtml}

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
          Generated with Shopno AI Travel Planner · আপনার সুন্দর ও নিরাপদ ভ্রমণ কামনা করি! ✈️
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generates a PDF file from the trip plan and presents the native share/save dialog.
   */
  async shareTripPdf(
    plan: TripPlan,
    expenses: SplitExpenseItem[] = [],
    settlements: SettlementDebt[] = []
  ): Promise<void> {
    try {
      const html = this.generateTripHtml(plan, expenses, settlements);
      const { uri } = await Print.printToFileAsync({ html });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${plan.title} - PDF শেয়ার করুন`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF তৈরি সম্পন্ন", `আপনার PDF ফাইল সংরক্ষিত হয়েছে: ${uri}`);
      }
    } catch (err: any) {
      console.error("[TripExportService] PDF generation failed:", err);
      Alert.alert("PDF ব্যর্থ হয়েছে", err?.message || "PDF তৈরি করা সম্ভব হয়নি।");
    }
  },

  /**
   * Generates an attractive shareable text message & web link.
   */
  async sharePlanLink(plan: TripPlan, extraNote?: string): Promise<void> {
    const currencySymbol = plan.currency === "BDT" ? "৳" : "$";
    const shareableUrl = `https://shopno-travel.app/trip/view?id=${encodeURIComponent(
      plan.id || "trip"
    )}&destination=${encodeURIComponent(plan.destination)}&days=${plan.durationDays}`;

    const message =
      `✈️ ${plan.title}\n` +
      `📍 গন্তব্য: ${plan.destination} (${plan.durationDays} দিন)\n` +
      `💰 বাজেট: ${currencySymbol}${plan.totalEstimatedCost.toLocaleString()}\n` +
      `${extraNote ? `\n💬 ${extraNote}\n` : ""}\n` +
      `👉 সম্পূর্ণ ট্যুর প্ল্যান ও শিডিউল দেখতে লিংকে ক্লিক করুন:\n${shareableUrl}\n\n` +
      `Shopno AI Travel Planner দিয়ে তৈরি।`;

    await Share.share({
      title: plan.title,
      message,
      url: shareableUrl,
    });
  },

  /**
   * Generates an invite link text for friends to join the split bill & trip.
   */
  async shareTripInviteLink(planTitle: string, destination: string): Promise<void> {
    const inviteCode = `TRIP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inviteLink = `https://shopno-travel.app/trip/join?code=${inviteCode}`;

    const text =
      `🎒 "${planTitle}" এ আমার সাথে যোগ দিন!\n\n` +
      `📍 গন্তব্য: ${destination}\n` +
      `🔑 ইনভাইট কোড: ${inviteCode}\n\n` +
      `একসাথে ট্রিপ প্ল্যান ও বিল ভাগ করতে নিচের লিংকে ক্লিক করে অ্যাপে জয়েন করুন:\n` +
      `${inviteLink}`;

    await Share.share({
      title: "ট্রিপ ইনভাইট",
      message: text,
      url: inviteLink,
    });
  },

  /**
   * Persists the trip plan and all its details to local offline storage.
   */
  async saveTripOffline(
    plan: TripPlan,
    expenses: SplitExpenseItem[] = [],
    settlements: SettlementDebt[] = []
  ): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_PLANS_KEY);
      let list: OfflineTripRecord[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      // Filter out existing record if already present
      list = list.filter((r) => r.id !== plan.id && r.plan.title !== plan.title);

      const newRecord: OfflineTripRecord = {
        id: plan.id || `offline_plan_${Date.now()}`,
        savedAt: new Date().toISOString(),
        plan,
        expenses,
        settlements,
      };

      list.unshift(newRecord);
      await AsyncStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn("[TripExportService] Failed to save trip offline:", err);
      throw err;
    }
  },

  /**
   * Fetches all cached offline trips.
   */
  async getOfflineTrips(): Promise<OfflineTripRecord[]> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_PLANS_KEY);
      if (!stored) return [];
      const list = JSON.parse(stored);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Checks if a plan is saved in offline storage.
   */
  async isTripSavedOffline(planId?: string, planTitle?: string): Promise<boolean> {
    try {
      const list = await this.getOfflineTrips();
      return list.some((r) => (planId && r.id === planId) || (planTitle && r.plan.title === planTitle));
    } catch {
      return false;
    }
  },

  /**
   * Removes an offline plan.
   */
  async removeOfflineTrip(recordId: string): Promise<void> {
    try {
      const list = await this.getOfflineTrips();
      const filtered = list.filter((r) => r.id !== recordId);
      await AsyncStorage.setItem(OFFLINE_PLANS_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn("[TripExportService] Failed to remove offline trip:", err);
    }
  },
};
