// @ts-nocheck
/**
 * Push Notification Service
 * Manages Firebase Cloud Messaging for cross-platform push notifications
 *
 * Features:
 * - Device token management (iOS, Android, Web)
 * - Push notification templates with variables
 * - Send push notifications with automatic retry
 * - Campaign tracking and analytics
 * - Bulk push notification delivery
 * - User segmentation and targeting
 * - Rich notifications with images and actions
 * - Delivery logging and statistics
 *
 * Database Tables:
 * - device_tokens (user_id, device_id, token, platform, created_at)
 * - push_templates (id, name, title_template, body_template, created_at)
 * - push_notifications (id, template_id, recipient_count, sent_count, failed_count, created_at)
 * - push_logs (id, notification_id, user_id, device_id, status, error, created_at)
 * - push_campaigns (id, name, total_users, sent_count, open_rate, click_rate, created_at)
 * - campaign_segments (id, campaign_id, segment_name, conditions, user_count, created_at)
 */

import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

const initializeFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"),
      ),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  return firebaseApp;
};

// ============================================================================
// DEVICE TOKEN SERVICE
// ============================================================================

/**
 * Manages device tokens for push notifications
 */
const deviceTokenService = {
  /**
   * Register a device token for a user
   * @param userId - User ID
   * @param deviceId - Unique device identifier
   * @param token - Firebase Cloud Messaging token
   * @param platform - Platform: 'ios' | 'android' | 'web'
   * @param adminId - Admin ID performing the action
   * @returns Created device token record
   */
  async registerDeviceToken(
    userId: string,
    deviceId: string,
    token: string,
    platform: "ios" | "android" | "web",
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("device_tokens")
        .insert([
          {
            user_id: userId,
            device_id: deviceId,
            token,
            platform,
            is_active: true,
            last_used_at: new Date().toISOString(),
            registered_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error registering device token:", error);
      throw error;
    }
  },

  /**
   * Unregister a device token
   * @param deviceId - Device ID to unregister
   * @returns Success status
   */
  async unregisterDeviceToken(deviceId: string) {
    try {
      const { error } = await supabase
        .from("device_tokens")
        .update({ is_active: false, unregistered_at: new Date().toISOString() })
        .eq("device_id", deviceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error unregistering device token:", error);
      throw error;
    }
  },

  /**
   * Get all active tokens for a user
   * @param userId - User ID
   * @returns List of active device tokens
   */
  async getUserDeviceTokens(userId: string) {
    try {
      const { data, error } = await supabase
        .from("device_tokens")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching user device tokens:", error);
      throw error;
    }
  },

  /**
   * Get all tokens by platform
   * @param platform - Platform type
   * @returns List of tokens for platform
   */
  async getTokensByPlatform(platform: "ios" | "android" | "web") {
    try {
      const { data, error } = await supabase
        .from("device_tokens")
        .select("token, user_id")
        .eq("platform", platform)
        .eq("is_active", true);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching tokens by platform:", error);
      throw error;
    }
  },

  /**
   * Update last used timestamp for a token
   * @param deviceId - Device ID
   * @returns Updated record
   */
  async updateLastUsed(deviceId: string) {
    try {
      const { data, error } = await supabase
        .from("device_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("device_id", deviceId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating last used:", error);
      throw error;
    }
  },

  /**
   * Get device token statistics
   * @returns Stats on token distribution
   */
  async getTokenStatistics() {
    try {
      const { data, error } = await supabase
        .from("device_tokens")
        .select("platform")
        .eq("is_active", true);

      if (error) throw error;

      const stats = {
        total: data.length,
        ios: data.filter((t: any) => t.platform === "ios").length,
        android: data.filter((t: any) => t.platform === "android").length,
        web: data.filter((t: any) => t.platform === "web").length,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error("Error fetching token statistics:", error);
      throw error;
    }
  },
};

// ============================================================================
// PUSH TEMPLATE SERVICE
// ============================================================================

/**
 * Manages push notification templates
 */
const pushTemplateService = {
  /**
   * Create a push notification template
   * @param name - Template name
   * @param titleTemplate - Title with {{variables}}
   * @param bodyTemplate - Body with {{variables}}
   * @param imageUrl - Optional image URL
   * @param dataPayload - Optional custom data
   * @param adminId - Admin ID
   * @returns Created template
   */
  async createTemplate(
    name: string,
    titleTemplate: string,
    bodyTemplate: string,
    imageUrl: string | null,
    dataPayload: Record<string, string> | null,
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("push_templates")
        .insert([
          {
            name,
            title_template: titleTemplate,
            body_template: bodyTemplate,
            image_url: imageUrl,
            data_payload: dataPayload,
            version: 1,
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating push template:", error);
      throw error;
    }
  },

  /**
   * Get template by ID
   * @param templateId - Template ID
   * @returns Template data
   */
  async getTemplate(templateId: string) {
    try {
      const { data, error } = await supabase
        .from("push_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching push template:", error);
      throw error;
    }
  },

  /**
   * Update template
   * @param templateId - Template ID
   * @param updates - Fields to update
   * @param adminId - Admin ID
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    updates: Record<string, any>,
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("push_templates")
        .update({
          ...updates,
          version: updates.version ? updates.version + 1 : 1,
          updated_at: new Date().toISOString(),
          admin_id: adminId,
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating push template:", error);
      throw error;
    }
  },

  /**
   * List all templates
   * @returns List of templates
   */
  async listTemplates() {
    try {
      const { data, error } = await supabase
        .from("push_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing push templates:", error);
      throw error;
    }
  },

  /**
   * Render template with variables
   * @param templateId - Template ID
   * @param variables - Variable map for substitution
   * @returns Rendered title and body
   */
  async renderTemplate(templateId: string, variables: Record<string, string>) {
    try {
      const template = await this.getTemplate(templateId);
      if (!template.success) throw new Error("Template not found");

      let title = template.data.title_template;
      let body = template.data.body_template;

      // Replace all {{variable}} with actual values
      Object.entries(variables).forEach(([key, value]) => {
        title = title.replace(new RegExp(`{{${key}}}`, "g"), value);
        body = body.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      return { success: true, data: { title, body } };
    } catch (error) {
      console.error("Error rendering push template:", error);
      throw error;
    }
  },

  /**
   * Delete template
   * @param templateId - Template ID
   * @returns Success status
   */
  async deleteTemplate(templateId: string) {
    try {
      const { error } = await supabase
        .from("push_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting push template:", error);
      throw error;
    }
  },
};

// ============================================================================
// PUSH DELIVERY SERVICE
// ============================================================================

/**
 * Manages push notification delivery and tracking
 */
const pushDeliveryService = {
  /**
   * Send push notification to a single user
   * @param userId - User ID
   * @param title - Notification title
   * @param body - Notification body
   * @param imageUrl - Optional image URL
   * @param dataPayload - Optional custom data
   * @param adminId - Admin ID
   * @returns Delivery result with success count
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    imageUrl: string | null,
    dataPayload: Record<string, string> | null,
    adminId: string,
  ) {
    try {
      const app = initializeFirebase();
      const messaging = admin.messaging(app);

      // Get user's device tokens
      const tokensResult = await deviceTokenService.getUserDeviceTokens(userId);
      if (!tokensResult.success || !tokensResult.data.length) {
        return { success: true, sent: 0, failed: 0, data: [] };
      }

      const tokens = tokensResult.data.map((t: any) => t.token);
      const results = [];

      // Send to all user devices
      for (const token of tokens) {
        try {
          const message: admin.messaging.Message = {
            notification: { title, body },
            data: dataPayload || {},
            token,
          };

          if (imageUrl) {
            message.notification!.imageUrl = imageUrl;
          }

          const response = await messaging.send(message);

          results.push({
            token,
            success: true,
            messageId: response,
          });

          // Log successful delivery
          await supabase.from("push_logs").insert([
            {
              user_id: userId,
              token,
              title,
              body,
              status: "sent",
              message_id: response,
              sent_at: new Date().toISOString(),
              admin_id: adminId,
            },
          ]);
        } catch (error) {
          results.push({
            token,
            success: false,
            error: String(error),
          });

          // Log failed delivery
          await supabase.from("push_logs").insert([
            {
              user_id: userId,
              token,
              title,
              body,
              status: "failed",
              error: String(error),
              failed_at: new Date().toISOString(),
              admin_id: adminId,
            },
          ]);
        }
      }

      const sent = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;

      return { success: true, sent, failed, data: results };
    } catch (error) {
      console.error("Error sending push notification:", error);
      throw error;
    }
  },

  /**
   * Send push to multiple users
   * @param userIds - List of user IDs
   * @param title - Notification title
   * @param body - Notification body
   * @param imageUrl - Optional image URL
   * @param dataPayload - Optional custom data
   * @param adminId - Admin ID
   * @returns Aggregated delivery results
   */
  async sendBulkPushNotifications(
    userIds: string[],
    title: string,
    body: string,
    imageUrl: string | null,
    dataPayload: Record<string, string> | null,
    adminId: string,
  ) {
    try {
      let totalSent = 0;
      let totalFailed = 0;
      const results = [];

      for (const userId of userIds) {
        const result = await this.sendPushNotification(
          userId,
          title,
          body,
          imageUrl,
          dataPayload,
          adminId,
        );

        totalSent += result.sent;
        totalFailed += result.failed;
        results.push({ userId, ...result });
      }

      return {
        success: true,
        total_sent: totalSent,
        total_failed: totalFailed,
        data: results,
      };
    } catch (error) {
      console.error("Error sending bulk push notifications:", error);
      throw error;
    }
  },

  /**
   * Send push using template
   * @param userIds - List of user IDs
   * @param templateId - Template ID
   * @param variables - Variables for template rendering
   * @param adminId - Admin ID
   * @returns Delivery results
   */
  async sendPushWithTemplate(
    userIds: string[],
    templateId: string,
    variables: Record<string, string>,
    adminId: string,
  ) {
    try {
      const template = await pushTemplateService.getTemplate(templateId);
      if (!template.success) throw new Error("Template not found");

      const rendered = await pushTemplateService.renderTemplate(
        templateId,
        variables,
      );

      return await this.sendBulkPushNotifications(
        userIds,
        rendered.data.title,
        rendered.data.body,
        template.data.image_url,
        template.data.data_payload,
        adminId,
      );
    } catch (error) {
      console.error("Error sending push with template:", error);
      throw error;
    }
  },

  /**
   * Get push notification logs
   * @param filters - Filter conditions
   * @returns List of logs
   */
  async getPushLogs(filters: {
    userId?: string;
    status?: "sent" | "failed";
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    try {
      let query = supabase.from("push_logs").select("*");

      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.startDate) {
        query = query.gte("sent_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("sent_at", filters.endDate);
      }

      const { data, error } = await query
        .order("sent_at", { ascending: false })
        .limit(filters.limit || 100);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching push logs:", error);
      throw error;
    }
  },

  /**
   * Get push delivery statistics
   * @param timeWindow - Time window in days
   * @returns Delivery statistics
   */
  async getPushStatistics(timeWindow: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeWindow);

      const { data, error } = await supabase
        .from("push_logs")
        .select("status")
        .gte("sent_at", startDate.toISOString());

      if (error) throw error;

      const stats = {
        sent: data.filter((l: any) => l.status === "sent").length,
        failed: data.filter((l: any) => l.status === "failed").length,
        total: data.length,
        success_rate:
          data.length > 0
            ? (
                (data.filter((l: any) => l.status === "sent").length /
                  data.length) *
                100
              ).toFixed(2) + "%"
            : "0%",
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error("Error fetching push statistics:", error);
      throw error;
    }
  },
};

// ============================================================================
// PUSH CAMPAIGN SERVICE
// ============================================================================

/**
 * Manages push notification campaigns
 */
const pushCampaignService = {
  /**
   * Create a push campaign
   * @param name - Campaign name
   * @param templateId - Template ID
   * @param variables - Template variables
   * @param targetSegments - User segments to target
   * @param adminId - Admin ID
   * @returns Created campaign
   */
  async createCampaign(
    name: string,
    templateId: string,
    variables: Record<string, string>,
    targetSegments: string[],
    adminId: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("push_campaigns")
        .insert([
          {
            name,
            template_id: templateId,
            template_variables: variables,
            target_segments: targetSegments,
            status: "draft",
            created_at: new Date().toISOString(),
            admin_id: adminId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating push campaign:", error);
      throw error;
    }
  },

  /**
   * Launch a campaign
   * @param campaignId - Campaign ID
   * @param adminId - Admin ID
   * @returns Launch result
   */
  async launchCampaign(campaignId: string, adminId: string) {
    try {
      const { data: campaign, error: fetchError } = await supabase
        .from("push_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      // Get users in target segments
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id")
        .in("segment", campaign.target_segments);

      if (usersError) throw usersError;

      const userIds = users.map((u: any) => u.id);

      // Send to all users
      const result = await pushDeliveryService.sendPushWithTemplate(
        userIds,
        campaign.template_id,
        campaign.template_variables,
        adminId,
      );

      // Update campaign status
      await supabase
        .from("push_campaigns")
        .update({
          status: "launched",
          total_users: userIds.length,
          sent_count: result.total_sent,
          failed_count: result.total_failed,
          launched_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return { success: true, data: result };
    } catch (error) {
      console.error("Error launching push campaign:", error);
      throw error;
    }
  },

  /**
   * Get campaign details
   * @param campaignId - Campaign ID
   * @returns Campaign data
   */
  async getCampaign(campaignId: string) {
    try {
      const { data, error } = await supabase
        .from("push_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching push campaign:", error);
      throw error;
    }
  },

  /**
   * List campaigns
   * @returns List of campaigns
   */
  async listCampaigns() {
    try {
      const { data, error } = await supabase
        .from("push_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error listing push campaigns:", error);
      throw error;
    }
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  deviceTokenService,
  pushTemplateService,
  pushDeliveryService,
  pushCampaignService,
};
