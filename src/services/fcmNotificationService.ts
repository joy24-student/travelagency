import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../utils/supabase";
import { DEMO_USER_ID } from "./repositories/friends";

/**
 * Push notifications are completely disabled for local development & Expo Go compatibility.
 * Re-enable in production EAS builds with native FCM certificates configured.
 */
export const ENABLE_PUSH_NOTIFICATIONS = false;

export const fcmNotificationService = {
  /**
   * Request user permission and retrieve native FCM device token (Disabled for development)
   */
  async registerForPushNotifications(userId: string = DEMO_USER_ID): Promise<string | null> {
    if (!ENABLE_PUSH_NOTIFICATIONS) {
      // Disabled in development
      return null;
    }
    return null;
  },

  /**
   * Save or update FCM token in Supabase
   */
  async saveTokenToDatabase(userId: string, token: string) {
    if (!ENABLE_PUSH_NOTIFICATIONS) return;
    try {
      await supabase.from("user_device_tokens").upsert(
        {
          user_id: userId,
          fcm_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,fcm_token" }
      );
    } catch (e) {
      console.warn("Save FCM token to database error:", e);
    }
  },

  /**
   * Attach listener for when user taps on a notification
   */
  setupNotificationResponseListener() {
    // Disabled in development; return cleanup function
    return {
      remove: () => {},
    };
  },

  /**
   * Local scheduled or instant notification helper (No-op in development)
   */
  async sendLocalTestNotification(title: string, body: string, data: any = {}) {
    if (!ENABLE_PUSH_NOTIFICATIONS) {
      console.log(`[Notification (Disabled in Dev)] ${title} - ${body}`, data);
      return;
    }
  },

  /**
   * Delete token on logout
   */
  async clearUserTokens(userId: string) {
    if (!ENABLE_PUSH_NOTIFICATIONS) return;
    try {
      await supabase.from("user_device_tokens").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("Clear tokens error:", e);
    }
  },
};
