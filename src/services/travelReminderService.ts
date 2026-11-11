import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { showLocalizedAlert } from "../utils/localizedAlert";

export interface JourneyReminderConfig {
  bookingReference: string;
  title: string;
  origin?: string;
  destination: string;
  departureTime?: string;
  travelDate: string | Date;
  serviceType: "flight" | "train" | "bus" | "launch" | "hotel" | "tour";
}

export interface StoredReminder {
  id: string;
  bookingReference: string;
  title: string;
  departureIso: string;
  remind24hIso: string;
  remind2hIso: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
}

const STORAGE_KEY = "@shopno_journey_reminders_list";

export const travelReminderService = {
  /**
   * Schedule automated 24-hour and 2-hour reminders before journey
   */
  async scheduleJourneyReminders(
    config: JourneyReminderConfig
  ): Promise<{ success: boolean; remind24h: Date; remind2h: Date; message: string }> {
    try {
      // Parse departure date & time
      let departureDate: Date;
      if (config.travelDate instanceof Date) {
        departureDate = new Date(config.travelDate.getTime());
      } else {
        departureDate = new Date(config.travelDate);
      }

      if (config.departureTime && config.departureTime.includes(":")) {
        const parts = config.departureTime.trim().split(" ");
        const [hoursStr, minutesStr] = parts[0].split(":");
        let h = parseInt(hoursStr, 10);
        const m = parseInt(minutesStr, 10) || 0;
        if (parts[1] && parts[1].toUpperCase() === "PM" && h < 12) h += 12;
        if (parts[1] && parts[1].toUpperCase() === "AM" && h === 12) h = 0;
        departureDate.setHours(h, m, 0, 0);
      } else {
        departureDate.setHours(8, 0, 0, 0);
      }

      // Calculate 24h and 2h before
      const remind24h = new Date(departureDate.getTime() - 24 * 60 * 60 * 1000);
      const remind2h = new Date(departureDate.getTime() - 2 * 60 * 60 * 1000);

      const reminderRecord: StoredReminder = {
        id: `rem-${config.bookingReference}-${Date.now()}`,
        bookingReference: config.bookingReference,
        title: config.title,
        departureIso: departureDate.toISOString(),
        remind24hIso: remind24h.toISOString(),
        remind2hIso: remind2h.toISOString(),
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };

      const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
      const existingList: StoredReminder[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [
        reminderRecord,
        ...existingList.filter((r) => r.bookingReference !== config.bookingReference),
      ];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      return {
        success: true,
        remind24h,
        remind2h,
        message: "যাত্রার ২৪ ঘণ্টা এবং ২ ঘণ্টা পূর্বে স্বয়ংক্রিয় রিমাইন্ডার সেট করা হয়েছে।",
      };
    } catch (e: any) {
      console.warn("Failed to schedule journey reminders:", e);
      return {
        success: false,
        remind24h: new Date(),
        remind2h: new Date(),
        message: e?.message || "রিমাইন্ডার সেট করা যায়নি।",
      };
    }
  },

  /**
   * Check if a booking already has active automated reminders
   */
  async hasActiveReminder(bookingReference: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const list: StoredReminder[] = JSON.parse(raw);
      const found = list.find((r) => r.bookingReference === bookingReference);
      return !!found && found.status === "scheduled";
    } catch {
      return false;
    }
  },

  /**
   * Cancel reminder for a booking
   */
  async cancelReminder(bookingReference: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list: StoredReminder[] = JSON.parse(raw);
      const updated = list.filter((r) => r.bookingReference !== bookingReference);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },
};
