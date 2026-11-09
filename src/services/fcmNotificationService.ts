import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "../utils/supabase";
import { DEMO_USER_ID } from "./repositories/friends";
import { useSettingsStore, isQuietHourActive } from "../store/settingsStore";

// Configure default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};
    const notifType = data.type || "system";
    const settings = useSettingsStore.getState().notifications;

    // Check Quiet Hours (non-critical notifications like promo or community activity get silenced)
    if (isQuietHourActive(settings.quietHoursStart, settings.quietHoursEnd) && notifType !== "booking" && notifType !== "flight_alert") {
      return {
        shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false,
        priority: Notifications.AndroidNotificationPriority.MIN,
      };
    }

    // Check user preferences
    if (notifType === "promo" && !settings.promoOffers) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
    }
    if (notifType === "community" && !settings.communityActivity) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
    }
    if ((notifType === "booking" || notifType === "flight_alert") && !settings.bookingUpdates) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export const fcmNotificationService = {
  /**
   * Check existing permission status without prompting the user.
   */
  async checkPermissionStatus(): Promise<Notifications.PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return Notifications.PermissionStatus.UNDETERMINED;
    }
  },

  /**
   * Set up Android notification channels for category segregation
   */
  async setupAndroidChannels() {
    if (Platform.OS !== "android") return;

    try {
      await Notifications.setNotificationChannelAsync("booking_updates", {
        name: "Flight & Booking Updates (জরুরি আপডেট)",
        description: "Gate changes, flight delays, boarding countdowns, and booking confirmations",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0055F2",
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync("promos_offers", {
        name: "Discounts & Special Offers (অফার ও ছাড়)",
        description: "Seasonal airline discounts, hotel coupons, and reward bonuses",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: "#10B981",
      });

      await Notifications.setNotificationChannelAsync("community_alerts", {
        name: "Travel Buddy & Community (কমিউনিটি)",
        description: "Traveler meetups, trip stories, and buddy requests",
        importance: Notifications.AndroidImportance.LOW,
      });
    } catch (e) {
      console.warn("[FCM] Failed to set up notification channels:", e);
    }
  },

  /**
   * Request user permission contextually and retrieve native device token.
   * @param userId Current user UUID
   * @param forcePrompt If false, only checks if already granted (won't pop OS dialog unprompted)
   */
  async registerForPushNotifications(
    userId: string = DEMO_USER_ID,
    forcePrompt: boolean = false
  ): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return null;
      }

      // Configure channels on Android
      await this.setupAndroidChannels();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only show the system permission prompt if explicitly requested (e.g. after booking or in settings)
      if (existingStatus !== "granted") {
        if (!forcePrompt) {
          // Do not disturb the user on app startup!
          return null;
        }
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return null;
      }

      // Fetch Expo / FCM push token safely
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      }).catch(() => null);

      const token = tokenData?.data || null;

      if (token && userId) {
        await this.saveTokenToDatabase(userId, token);
      }

      return token;
    } catch (err) {
      console.warn("[FCM] Push registration error:", err);
      return null;
    }
  },

  /**
   * Save or update token in Supabase
   */
  async saveTokenToDatabase(userId: string, token: string) {
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
      console.warn("[FCM] Save token to database error:", e);
    }
  },

  /**
   * Attach listener for when user taps on a notification, routing directly to the relevant screen.
   */
  setupNotificationResponseListener() {
    try {
      const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          if (!data) return;

          // Direct deep-link routing on notification click
          if (data.route) {
            router.push(data.route as any);
            return;
          }

          const type = data.type || "";
          switch (type) {
            case "booking":
            case "flight_alert":
            case "flight":
              router.push("/(tabs)/trips" as any);
              break;
            case "price_alert": {
              const service = data.service_type || "flight";
              const date = data.travel_date || data.date || "";
              const from = data.origin || "";
              const to = data.destination || "";
              if (service === "train") {
                router.push(`/screens/trains?from=${from}&to=${to}&date=${date}` as any);
              } else if (service === "bus" || service === "launch") {
                router.push(`/screens/bus-launch?from=${from}&to=${to}&date=${date}` as any);
              } else {
                router.push(`/screens/flights?from=${from}&to=${to}&date=${date}` as any);
              }
              break;
            }
            case "promo":
            case "offer":
            case "discount":
              router.push("/screens/rewards" as any);
              break;
            case "community":
            case "travel_match":
              router.push("/screens/community" as any);
              break;
            case "chat":
            case "message":
              router.push("/(tabs)/messages" as any);
              break;
            case "profile":
              router.push("/(tabs)/account" as any);
              break;
            default:
              router.push("/(tabs)/messages" as any);
              break;
          }
        }
      );

      return subscription;
    } catch (err) {
      console.warn("[FCM] Notification listener setup error:", err);
      return { remove: () => {} };
    }
  },

  /**
   * Send local contextual notification (e.g. booking confirmation or flight delay)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data: {
      type?: "booking" | "flight_alert" | "promo" | "community" | "chat" | "system";
      route?: string;
      channelId?: string;
      [key: string]: any;
    } = {}
  ) {
    try {
      const settings = useSettingsStore.getState().notifications;
      const type = data.type || "system";

      // Check quiet hours
      if (isQuietHourActive(settings.quietHoursStart, settings.quietHoursEnd) && type !== "booking" && type !== "flight_alert") {
        console.log(`[Notification Muted during Quiet Hours] ${title} - ${body}`);
        return;
      }

      let channelId = "booking_updates";
      if (type === "promo") channelId = "promos_offers";
      if (type === "community") channelId = "community_alerts";

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Instant
      });
    } catch (err) {
      console.log(`[Local Notification] ${title} - ${body}`, data);
    }
  },

  /**
   * Delete token on logout
   */
  async clearUserTokens(userId: string) {
    try {
      await supabase.from("user_device_tokens").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("[FCM] Clear tokens error:", e);
    }
  },
};
