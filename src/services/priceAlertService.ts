import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { supabase } from "../utils/supabase";
import { showLocalizedAlert } from "../utils/localizedAlert";

export interface PriceAlert {
  id: string;
  userId?: string;
  origin: string;
  destination: string;
  originName?: string;
  destinationName?: string;
  currentPrice: number;
  targetPrice?: number;
  currency: string;
  transportType: "flight" | "train" | "bus" | "launch" | "hotel";
  isActive: boolean;
  resultRoute: string;
  createdAt: string;
  lastNotifiedAt?: string;
}

const STORAGE_KEY = "@shopno_price_alerts_registry_";

export const priceAlertService = {
  /**
   * Retrieve active price alert for a specific route
   */
  async getAlertForRoute(
    origin: string,
    destination: string,
    transportType: "flight" | "train" | "bus" | "launch" | "hotel" = "flight"
  ): Promise<PriceAlert | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const alerts: PriceAlert[] = JSON.parse(raw);
      const found = alerts.find(
        (a) =>
          a.origin.toLowerCase() === origin.toLowerCase() &&
          a.destination.toLowerCase() === destination.toLowerCase() &&
          a.transportType === transportType &&
          a.isActive
      );
      return found || null;
    } catch {
      return null;
    }
  },

  /**
   * Toggle or save a price drop alert
   */
  async togglePriceAlert(params: {
    origin: string;
    destination: string;
    originName?: string;
    destinationName?: string;
    currentPrice: number;
    currency?: string;
    transportType?: "flight" | "train" | "bus" | "launch" | "hotel";
    resultRoute?: string;
  }): Promise<{ alert: PriceAlert | null; isActive: boolean }> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let list: PriceAlert[] = raw ? JSON.parse(raw) : [];

      const routeKey = `${params.origin.toUpperCase()}_${params.destination.toUpperCase()}_${params.transportType || "flight"}`;
      const existingIdx = list.findIndex(
        (a) =>
          a.origin.toUpperCase() === params.origin.toUpperCase() &&
          a.destination.toUpperCase() === params.destination.toUpperCase() &&
          a.transportType === (params.transportType || "flight")
      );

      if (existingIdx >= 0) {
        // Toggle state
        const currentAlert = list[existingIdx];
        const newActive = !currentAlert.isActive;
        currentAlert.isActive = newActive;
        currentAlert.currentPrice = params.currentPrice;
        list[existingIdx] = currentAlert;

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

        // Attempt Supabase sync if user logged in
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("price_alerts").upsert({
              id: currentAlert.id,
              user_id: user.id,
              origin: params.origin,
              destination: params.destination,
              is_active: newActive,
              current_price: params.currentPrice,
              updated_at: new Date().toISOString(),
            });
          }
        } catch {
          // ignore Supabase schema mismatch
        }

        return { alert: currentAlert, isActive: newActive };
      } else {
        // Create new active alert
        const newAlert: PriceAlert = {
          id: `pa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          origin: params.origin.toUpperCase(),
          destination: params.destination.toUpperCase(),
          originName: params.originName,
          destinationName: params.destinationName,
          currentPrice: params.currentPrice,
          targetPrice: Math.round(params.currentPrice * 0.9), // 10% lower target
          currency: params.currency || "USD",
          transportType: params.transportType || "flight",
          isActive: true,
          resultRoute: params.resultRoute || `/screens/flights?from=${params.origin}&to=${params.destination}`,
          createdAt: new Date().toISOString(),
        };

        list.push(newAlert);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

        // Attempt Supabase sync
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("price_alerts").upsert({
              id: newAlert.id,
              user_id: user.id,
              origin: params.origin,
              destination: params.destination,
              is_active: true,
              current_price: params.currentPrice,
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          // ignore
        }

        return { alert: newAlert, isActive: true };
      }
    } catch (e: any) {
      console.warn("togglePriceAlert error:", e);
      return { alert: null, isActive: false };
    }
  },

  /**
   * Retrieve all saved price alerts
   */
  async getAllAlerts(): Promise<PriceAlert[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Simulate or send a push notification with instant deep-link routing
   */
  async sendPriceDropNotification(alert: PriceAlert): Promise<void> {
    const discountedPrice = Math.round(alert.currentPrice * 0.85); // 15% drop
    const symbol = alert.currency === "BDT" ? "৳" : "$";

    showLocalizedAlert(
      "📉 দাম কমেছে! টিকিট বুক করুন",
      `${alert.origin} ➔ ${alert.destination} রুটের ভাড়া এখন ${symbol}${discountedPrice} (${symbol}${alert.currentPrice} থেকে হ্রাস পেয়েছে)। ফলাফল দেখতে ট্যাপ করুন।`,
      [
        {
          text: "ফলাফল দেখুন",
          onPress: () => {
            if (alert.resultRoute) {
              router.push(alert.resultRoute as any);
            } else {
              router.push("/screens/flights" as any);
            }
          },
        },
        { text: "পরে", style: "cancel" },
      ]
    );
  },
};
