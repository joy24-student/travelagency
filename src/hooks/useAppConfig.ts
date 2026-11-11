/**
 * useAppConfig Hook - Client App Dynamic Configuration & Banner Synchronization
 * Syncs real-time settings (hero title/subtitle, announcement ticker, maintenance, etc.)
 * configured from the Admin Portal into the client application.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";

export interface AppConfigState {
  heroTitle: string;
  heroSubtitle: string;
  announcementTicker: string;
  announcementEnabled: boolean;
  defaultCommissionRate: number;
  surgePricingEnabled: boolean;
  surgeMultiplierMax: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const STORAGE_KEY = "@shopno_app_dynamic_config_v1";

const DEFAULT_CONFIG = {
  heroTitle: "Trip.com",
  heroSubtitle: "Your global travel partner ✈",
  announcementTicker: "🔥 FLASH SALE: 20% off all Cox's Bazar hotels this weekend with code SUMMER20!",
  announcementEnabled: true,
  defaultCommissionRate: 10.0,
  surgePricingEnabled: true,
  surgeMultiplierMax: 1.5,
  maintenanceMode: false,
  maintenanceMessage: "We are currently performing scheduled system upgrades. We will be back shortly!",
};

export function useAppConfig(): AppConfigState {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        setConfig(JSON.parse(cached));
      }
    } catch {
      // Ignore cache read errors
    }
  };

  const fetchLiveConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("system_settings").select("*");
      if (error) throw error;

      if (data && data.length > 0) {
        const map: Record<string, any> = {};
        data.forEach((row: any) => {
          map[row.setting_key] = row.setting_value;
        });

        const newConfig = {
          heroTitle: map["app_hero_title"] || DEFAULT_CONFIG.heroTitle,
          heroSubtitle: map["app_hero_subtitle"] || DEFAULT_CONFIG.heroSubtitle,
          announcementTicker: map["app_announcement_ticker"] || DEFAULT_CONFIG.announcementTicker,
          announcementEnabled: map["app_announcement_enabled"] === "true" || map["app_announcement_enabled"] === true,
          defaultCommissionRate: Number(map["app_default_commission_rate"]) || DEFAULT_CONFIG.defaultCommissionRate,
          surgePricingEnabled: map["app_surge_pricing_enabled"] !== "false",
          surgeMultiplierMax: Number(map["app_surge_multiplier_max"]) || DEFAULT_CONFIG.surgeMultiplierMax,
          maintenanceMode: map["app_maintenance_mode"] === "true",
          maintenanceMessage: map["app_maintenance_message"] || DEFAULT_CONFIG.maintenanceMessage,
        };

        setConfig(newConfig);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      }
    } catch (err) {
      console.warn("Failed to fetch live app config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromCache().then(() => fetchLiveConfig());

    // Listen to real-time changes in system_settings from admin mutations
    const channel = supabase
      .channel("admin-app-config-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        () => {
          fetchLiveConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveConfig]);

  return {
    ...config,
    isLoading,
    refetch: fetchLiveConfig,
  };
}
