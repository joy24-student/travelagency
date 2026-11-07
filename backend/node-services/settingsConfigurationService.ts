/**
 * Advanced Settings & Configuration Service
 * Manages system-wide settings, configurations, feature flags, and admin preferences
 *
 * Features:
 * - Global configuration management
 * - Feature flags and toggles
 * - Admin-level preferences and settings
 * - Email/SMS gateway configurations
 * - Rate limiting and quota settings
 * - Security settings (IP whitelist, API key rotation)
 * - Notification preferences
 * - Audit log settings
 * - Integration settings
 * - Team/organization settings
 *
 * Database Tables:
 * - system_settings (key, value, type, description, updated_at, admin_id)
 * - feature_flags (id, flag_name, enabled, description, rollout_percentage, created_at)
 * - admin_preferences (id, admin_id, setting_key, setting_value, created_at)
 * - configuration_groups (id, group_name, description, created_at)
 * - audit_settings (id, enabled, log_level, retention_days, created_at)
 * - rate_limits (id, entity_type, entity_id, limit_type, limit_value, window_minutes, created_at)
 * - api_key_settings (id, admin_id, key_name, key_hash, rate_limit, created_at)
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// SYSTEM SETTINGS SERVICE
// ============================================================================

/**
 * Manages global system settings
 */
const systemSettingsService = {
  /**
   * Set a system setting
   * @param key - Setting key (e.g., 'max_email_per_hour')
   * @param value - Setting value
   * @param type - 'string' | 'number' | 'boolean' | 'json'
   * @param description - Setting description
   * @param adminId - Admin ID
   * @returns Created/updated setting
   */
  async setSetting(
    key: string,
    value: any,
    type: "string" | "number" | "boolean" | "json",
    description: string | null,
    adminId: string,
  ) {
    try {
      // Normalize value based on type
      let normalizedValue = value;
      if (type === "number") {
        normalizedValue = Number(value);
      } else if (type === "boolean") {
        normalizedValue = Boolean(value);
      } else if (type === "json") {
        normalizedValue = typeof value === "string" ? JSON.parse(value) : value;
      }

      const { data, error } = await supabase
        .from("system_settings")
        .upsert(
          {
            key,
            value: normalizedValue,
            type,
            description,
            updated_at: new Date().toISOString(),
            admin_id: adminId,
          },
          { onConflict: "key" },
        )
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error setting system setting:", error);
      throw error;
    }
  },

  /**
   * Get a system setting
   * @param key - Setting key
   * @returns Setting value
   */
  async getSetting(key: string) {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", key)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        return { success: false, error: `Setting '${key}' not found` };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error getting system setting:", error);
      throw error;
    }
  },

  /**
   * Get all system settings
   * @returns All settings
   */
  async getAllSettings() {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;

      // Convert to key-value map
      const settings: Record<string, any> = {};
      data.forEach((s: any) => {
        settings[s.key] = s.value;
      });

      return { success: true, data: settings };
    } catch (error) {
      console.error("Error getting all system settings:", error);
      throw error;
    }
  },

  /**
   * Delete a system setting
   * @param key - Setting key
   * @returns Success status
   */
  async deleteSetting(key: string) {
    try {
      const { error } = await supabase
        .from("system_settings")
        .delete()
        .eq("key", key);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting system setting:", error);
      throw error;
    }
  },

  /**
   * Batch update multiple settings
   * @param settings - Map of key-value pairs
   * @param adminId - Admin ID
   * @returns Updated settings
   */
  async batchUpdateSettings(
    settings: Record<string, { value: any; type: string }>,
    adminId: string,
  ) {
    try {
      const updates = [];

      for (const [key, { value, type }] of Object.entries(settings)) {
        updates.push(this.setSetting(key, value, type as any, null, adminId));
      }

      const results = await Promise.all(updates);
      return {
        success: true,
        updated: results.filter((r) => r.success).length,
        data: results.map((r) => r.data),
      };
    } catch (error) {
      console.error("Error batch updating settings:", error);
      throw error;
    }
  },
};

// ============================================================================
// FEATURE FLAGS SERVICE
// ============================================================================

/**
 * Manages feature flags for gradual rollouts
 */
const featureFlagsService = {
  /**
   * Create a feature flag
   * @param flagName - Flag name
   * @param enabled - Is flag enabled
   * @param rolloutPercentage - Percentage of users to enable for (0-100)
   * @param description - Flag description
   * @param adminId - Admin ID
   * @returns Created flag
   */
  async createFeatureFlag(
    flagName: string,
    enabled: boolean,
    rolloutPercentage: number = 100,
    description: string | null,
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .insert([
          {
            flag_name: flagName,
            enabled,
            rollout_percentage: Math.min(100, Math.max(0, rolloutPercentage)),
            description,
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating feature flag:", error);
      throw error;
    }
  },

  /**
   * Check if feature is enabled for user
   * @param flagName - Flag name
   * @param userId - User ID for rollout percentage check
   * @returns Boolean indicating if feature is enabled
   */
  async isFeatureEnabled(flagName: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("flag_name", flagName)
        .single();

      if (error || !data) return false;

      if (!data.enabled) return false;

      // If rollout is less than 100%, check user hash
      if (data.rollout_percentage < 100) {
        const hash = crypto
          .createHash("md5")
          .update(`${flagName}:${userId}`)
          .digest("hex");
        const hashValue = parseInt(hash.substring(0, 8), 16) % 100;
        return hashValue < data.rollout_percentage;
      }

      return true;
    } catch (error) {
      console.error("Error checking feature flag:", error);
      return false;
    }
  },

  /**
   * Toggle a feature flag
   * @param flagName - Flag name
   * @param enabled - New enabled state
   * @param adminId - Admin ID
   * @returns Updated flag
   */
  async toggleFeatureFlag(flagName: string, enabled: boolean, adminId: string) {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .update({
          enabled,
          updated_at: new Date().toISOString(),
          admin_id: adminId,
        })
        .eq("flag_name", flagName)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error toggling feature flag:", error);
      throw error;
    }
  },

  /**
   * Update rollout percentage
   * @param flagName - Flag name
   * @param rolloutPercentage - New rollout percentage
   * @param adminId - Admin ID
   * @returns Updated flag
   */
  async updateRolloutPercentage(
    flagName: string,
    rolloutPercentage: number,
    adminId: string,
  ) {
    try {
      const percentage = Math.min(100, Math.max(0, rolloutPercentage));

      const { data, error } = await supabase
        .from("feature_flags")
        .update({
          rollout_percentage: percentage,
          updated_at: new Date().toISOString(),
          admin_id: adminId,
        })
        .eq("flag_name", flagName)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating rollout percentage:", error);
      throw error;
    }
  },

  /**
   * List all feature flags
   * @returns List of flags
   */
  async listFeatureFlags() {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing feature flags:", error);
      throw error;
    }
  },

  /**
   * Get flag details
   * @param flagName - Flag name
   * @returns Flag data
   */
  async getFeatureFlag(flagName: string) {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("flag_name", flagName)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting feature flag:", error);
      throw error;
    }
  },
};

// ============================================================================
// ADMIN PREFERENCES SERVICE
// ============================================================================

/**
 * Manages individual admin preferences and settings
 */
const adminPreferencesService = {
  /**
   * Set admin preference
   * @param adminId - Admin ID
   * @param settingKey - Setting key
   * @param settingValue - Setting value
   * @returns Created/updated preference
   */
  async setAdminPreference(
    adminId: string,
    settingKey: string,
    settingValue: any,
  ) {
    try {
      const { data, error } = await supabase
        .from("admin_preferences")
        .upsert(
          {
            admin_id: adminId,
            setting_key: settingKey,
            setting_value: settingValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "admin_id,setting_key" },
        )
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error setting admin preference:", error);
      throw error;
    }
  },

  /**
   * Get admin preference
   * @param adminId - Admin ID
   * @param settingKey - Setting key
   * @returns Preference value
   */
  async getAdminPreference(adminId: string, settingKey: string) {
    try {
      const { data, error } = await supabase
        .from("admin_preferences")
        .select("*")
        .eq("admin_id", adminId)
        .eq("setting_key", settingKey)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return {
        success: !!data,
        data: data?.setting_value,
      };
    } catch (error) {
      console.error("Error getting admin preference:", error);
      throw error;
    }
  },

  /**
   * Get all preferences for an admin
   * @param adminId - Admin ID
   * @returns All preferences as key-value map
   */
  async getAllAdminPreferences(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("admin_preferences")
        .select("*")
        .eq("admin_id", adminId);

      if (error) throw error;

      const preferences: Record<string, any> = {};
      data.forEach((p: any) => {
        preferences[p.setting_key] = p.setting_value;
      });

      return { success: true, data: preferences };
    } catch (error) {
      console.error("Error getting all admin preferences:", error);
      throw error;
    }
  },

  /**
   * Batch set admin preferences
   * @param adminId - Admin ID
   * @param preferences - Map of key-value pairs
   * @returns Updated preferences
   */
  async batchSetAdminPreferences(
    adminId: string,
    preferences: Record<string, any>,
  ) {
    try {
      const updates = [];

      for (const [key, value] of Object.entries(preferences)) {
        updates.push(this.setAdminPreference(adminId, key, value));
      }

      const results = await Promise.all(updates);
      return {
        success: true,
        updated: results.filter((r) => r.success).length,
        data: results.map((r) => r.data),
      };
    } catch (error) {
      console.error("Error batch setting admin preferences:", error);
      throw error;
    }
  },
};

// ============================================================================
// RATE LIMITING SERVICE
// ============================================================================

/**
 * Manages rate limiting and quotas
 */
const rateLimitService = {
  /**
   * Set rate limit
   * @param entityType - Type of entity ('user' | 'admin' | 'api_key')
   * @param entityId - Entity ID
   * @param limitType - Type of limit ('email_per_hour' | 'sms_per_hour' | 'api_calls_per_minute')
   * @param limitValue - Limit value
   * @param windowMinutes - Time window in minutes
   * @param adminId - Admin ID
   * @returns Created/updated limit
   */
  async setRateLimit(
    entityType: string,
    entityId: string,
    limitType: string,
    limitValue: number,
    windowMinutes: number,
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("rate_limits")
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            limit_type: limitType,
            limit_value: limitValue,
            window_minutes: windowMinutes,
            updated_at: new Date().toISOString(),
            admin_id: adminId,
          },
          { onConflict: "entity_type,entity_id,limit_type" },
        )
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error setting rate limit:", error);
      throw error;
    }
  },

  /**
   * Get rate limit for entity
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @param limitType - Type of limit
   * @returns Limit data
   */
  async getRateLimit(entityType: string, entityId: string, limitType: string) {
    try {
      const { data, error } = await supabase
        .from("rate_limits")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("limit_type", limitType)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return {
        success: !!data,
        data,
      };
    } catch (error) {
      console.error("Error getting rate limit:", error);
      throw error;
    }
  },

  /**
   * Check if action is within rate limit
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @param limitType - Type of limit
   * @param currentCount - Current action count in window
   * @returns Boolean indicating if within limit
   */
  async isWithinRateLimit(
    entityType: string,
    entityId: string,
    limitType: string,
    currentCount: number,
  ): Promise<boolean> {
    try {
      const limit = await this.getRateLimit(entityType, entityId, limitType);
      if (!limit.success || !limit.data) return true; // No limit set

      return currentCount < limit.data.limit_value;
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return false;
    }
  },

  /**
   * List all rate limits
   * @returns All limits
   */
  async listRateLimits() {
    try {
      const { data, error } = await supabase
        .from("rate_limits")
        .select("*")
        .order("entity_type", { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing rate limits:", error);
      throw error;
    }
  },
};

// ============================================================================
// API KEY SETTINGS SERVICE
// ============================================================================

/**
 * Manages API key generation and settings
 */
const apiKeySettingsService = {
  /**
   * Create API key for admin
   * @param adminId - Admin ID
   * @param keyName - Key name/description
   * @param rateLimit - Rate limit for this key (requests per minute)
   * @returns Created API key with secret
   */
  async createApiKey(
    adminId: string,
    keyName: string,
    rateLimit: number = 1000,
  ) {
    try {
      // Generate API key
      const apiKey = `sk_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      const { data, error } = await supabase
        .from("api_key_settings")
        .insert([
          {
            admin_id: adminId,
            key_name: keyName,
            key_hash: keyHash,
            rate_limit: rateLimit,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...data,
          api_key: apiKey, // Only return once on creation
        },
      };
    } catch (error) {
      console.error("Error creating API key:", error);
      throw error;
    }
  },

  /**
   * Verify API key
   * @param apiKey - API key to verify
   * @returns Key details if valid
   */
  async verifyApiKey(apiKey: string) {
    try {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

      const { data, error } = await supabase
        .from("api_key_settings")
        .select("*")
        .eq("key_hash", keyHash)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return {
        success: !!data,
        data,
      };
    } catch (error) {
      console.error("Error verifying API key:", error);
      return { success: false };
    }
  },

  /**
   * Revoke API key
   * @param keyId - Key ID
   * @returns Success status
   */
  async revokeApiKey(keyId: string) {
    try {
      const { error } = await supabase
        .from("api_key_settings")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", keyId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error revoking API key:", error);
      throw error;
    }
  },

  /**
   * List API keys for admin
   * @param adminId - Admin ID
   * @returns List of keys (without secrets)
   */
  async listAdminApiKeys(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("api_key_settings")
        .select("id, key_name, rate_limit, is_active, created_at")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing API keys:", error);
      throw error;
    }
  },
};

// ============================================================================
// AUDIT SETTINGS SERVICE
// ============================================================================

/**
 * Manages audit logging configuration
 */
const auditSettingsService = {
  /**
   * Configure audit logging
   * @param enabled - Enable audit logging
   * @param logLevel - Log level ('basic' | 'detailed' | 'verbose')
   * @param retentionDays - How many days to retain logs
   * @param adminId - Admin ID
   * @returns Updated audit settings
   */
  async configureAuditLogging(
    enabled: boolean,
    logLevel: "basic" | "detailed" | "verbose",
    retentionDays: number,
    adminId: string,
  ) {
    try {
      // Clear old settings
      await supabase.from("audit_settings").delete().neq("id", "");

      const { data, error } = await supabase
        .from("audit_settings")
        .insert([
          {
            enabled,
            log_level: logLevel,
            retention_days: retentionDays,
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error configuring audit logging:", error);
      throw error;
    }
  },

  /**
   * Get current audit settings
   * @returns Audit settings
   */
  async getAuditSettings() {
    try {
      const { data, error } = await supabase
        .from("audit_settings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return {
        success: !!data,
        data: data || {
          enabled: false,
          log_level: "basic",
          retention_days: 30,
        },
      };
    } catch (error) {
      console.error("Error getting audit settings:", error);
      throw error;
    }
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  systemSettingsService,
  featureFlagsService,
  adminPreferencesService,
  rateLimitService,
  apiKeySettingsService,
  auditSettingsService,
};
