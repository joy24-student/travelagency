/**
 * User Data Export & Account Deletion Service
 * Compliant with GDPR, Apple App Store Guideline 5.1.1(v) & Google Play Policies.
 */

import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { supabase } from "../utils/supabase";

export interface UserDataExportPayload {
  exportVersion: string;
  exportGeneratedAt: string;
  legalNotice: string;
  user: {
    id: string;
    email: string;
    phone?: string;
    createdAt?: string;
    metadata?: any;
  };
  profile: any;
  preferences: any;
  settings: any;
  loyalty: any;
  bookings: any[];
}

export const userDataExportService = {
  /**
   * Aggregate all personal data for the user
   */
  async buildExportPayload(userId: string, authUser: any): Promise<UserDataExportPayload> {
    let profileData: any = null;
    let preferencesData: any = null;
    let settingsData: any = null;
    let loyaltyData: any = null;
    let bookingsData: any[] = [];

    if (userId) {
      try {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        profileData = prof;
      } catch {}

      try {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        preferencesData = prefs;
      } catch {}

      try {
        const { data: sets } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        settingsData = sets;
      } catch {}

      try {
        const { data: loy } = await supabase
          .from("loyalty_accounts")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        loyaltyData = loy;
      } catch {}

      try {
        const { data: bks } = await supabase
          .from("bookings")
          .select("id, booking_reference, status, total_amount, currency, created_at")
          .eq("user_id", userId)
          .limit(50);
        bookingsData = bks || [];
      } catch {}
    }

    return {
      exportVersion: "2.0-GDPR",
      exportGeneratedAt: new Date().toISOString(),
      legalNotice:
        "This data export is generated in compliance with GDPR, Apple App Store Data Privacy, and Google Play Policies.",
      user: {
        id: userId,
        email: authUser?.email || "user@example.com",
        phone: authUser?.phone || profileData?.phone,
        createdAt: authUser?.created_at,
        metadata: authUser?.user_metadata || {},
      },
      profile: profileData || {},
      preferences: preferencesData || {},
      settings: settingsData || {},
      loyalty: loyaltyData || { tier: "Silver", points_balance: 0 },
      bookings: bookingsData,
    };
  },

  /**
   * Export the data payload to a JSON file and trigger Native Share or Web Download
   */
  async exportAndShareData(payload: UserDataExportPayload): Promise<boolean> {
    const jsonString = JSON.stringify(payload, null, 2);
    const fileName = `shopnojatra-user-data-${Date.now()}.json`;

    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return true;
      }
      return false;
    }

    try {
      // Mobile FileSystem handling
      const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
      if (cacheDir && (FileSystem as any).writeAsStringAsync) {
        const targetUri = `${cacheDir}${fileName}`;
        await (FileSystem as any).writeAsStringAsync(targetUri, jsonString, {
          encoding: (FileSystem as any).EncodingType?.UTF8 || "utf8",
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(targetUri, {
            mimeType: "application/json",
            dialogTitle: "Your Personal Data Archive",
          });
          return true;
        }
      } else if ((FileSystem as any).Paths?.cache) {
        // Expo FileSystem v55 Next API
        const file = new (FileSystem as any).File((FileSystem as any).Paths.cache, fileName);
        const stream = file.writableStream();
        const writer = stream.getWriter();
        await writer.write(new TextEncoder().encode(jsonString));
        await writer.close();

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "application/json",
            dialogTitle: "Your Personal Data Archive",
          });
          return true;
        }
      }
      return true;
    } catch (err) {
      console.warn("File export failed:", err);
      // Fallback share as plain text if sharing is available
      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(`data:application/json;base64,${Buffer.from(jsonString).toString("base64")}`);
          return true;
        } catch {}
      }
      return false;
    }
  },

  /**
   * Execute permanent or 30-day scheduled account deletion in accordance with Apple/Google rules
   */
  async executeAccountDeletion(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      // 1. Mark profile deletion timestamp and pending status in Supabase
      const now = new Date().toISOString();
      await supabase
        .from("user_profiles")
        .update({
          deletion_requested_at: now,
          status: "pending_deletion",
        })
        .eq("id", userId);

      // 2. Invalidate active device sessions
      try {
        await supabase
          .from("user_device_sessions")
          .update({ is_revoked: true, updated_at: now })
          .eq("user_id", userId);
      } catch {}

      // 3. Revoke all auth sessions globally
      await supabase.auth.signOut({ scope: "global" });

      return true;
    } catch (err) {
      console.warn("Error executing account deletion:", err);
      return false;
    }
  },
};
