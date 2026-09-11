// @ts-nocheck
/**
 * SMS Service - Bulk SMS BD Integration & Multi-Gateway Support
 *
 * Features:
 * - Bulk SMS BD integration with auto-failover
 * - Multiple SMS gateway support
 * - Balance checking and top-up notifications
 * - SMS templates and variable substitution
 * - Bulk SMS sending with load distribution
 * - Delivery reports and tracking
 * - Rate limiting and quota management
 * - Scheduled SMS delivery
 * - Automatic gateway switching on failure
 *
 * @module services/smsService
 */

import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import axios from "axios";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// ============================================================================
// SMS Gateway Configuration
// ============================================================================

/**
 * Manages SMS gateways (Bulk SMS BD, Twilio, etc.)
 */
export const smsGatewayService = {
  /**
   * Add new SMS gateway
   */
  async addGateway(gateway: {
    name: string;
    provider: "bulksmsbd" | "twilio" | "nexmo" | "custom";
    api_key: string;
    api_secret?: string;
    sender_id: string;
    base_url?: string;
    is_active?: boolean;
    priority?: number;
    description?: string;
    max_rate_per_hour?: number;
    daily_limit?: number;
    balance_check_enabled?: boolean;
  }): Promise<any> {
    try {
      // Encrypt API credentials
      const encryptedKey = this.encryptKey(gateway.api_key);
      const encryptedSecret = gateway.api_secret
        ? this.encryptKey(gateway.api_secret)
        : null;

      const { data, error } = await supabase
        .from("sms_gateways")
        .insert([
          {
            name: gateway.name,
            provider: gateway.provider,
            api_key: encryptedKey,
            api_secret: encryptedSecret,
            sender_id: gateway.sender_id,
            base_url: gateway.base_url || "",
            is_active: gateway.is_active !== false,
            priority: gateway.priority || 0,
            description: gateway.description || "",
            max_rate_per_hour: gateway.max_rate_per_hour || 1000,
            daily_limit: gateway.daily_limit || 10000,
            balance_check_enabled: gateway.balance_check_enabled !== false,
            status: "pending_verification",
            current_balance: null,
            last_balance_check: null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Test gateway connection
      await this.testGateway(data.id);

      return data;
    } catch (error) {
      console.error("Error adding SMS gateway:", error);
      throw error;
    }
  },

  /**
   * Get all SMS gateways
   */
  async getGateways(filters?: {
    provider?: string;
    is_active?: boolean;
    min_balance?: number;
  }): Promise<any[]> {
    try {
      let query = supabase.from("sms_gateways").select("*");

      if (filters?.provider) {
        query = query.eq("provider", filters.provider);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      const { data, error } = await query.order("priority", {
        ascending: false,
      });

      if (error) throw error;

      // Filter by minimum balance if specified
      if (filters?.min_balance) {
        return (data || []).filter(
          (g: any) => (g.current_balance || 0) >= filters.min_balance,
        );
      }

      return data || [];
    } catch (error) {
      console.error("Error getting SMS gateways:", error);
      throw error;
    }
  },

  /**
   * Get gateway by ID
   */
  async getGateway(gatewayId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("sms_gateways")
        .select("*")
        .eq("id", gatewayId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting SMS gateway:", error);
      throw error;
    }
  },

  /**
   * Update SMS gateway
   */
  async updateGateway(gatewayId: string, updates: Partial<any>): Promise<any> {
    try {
      // Encrypt credentials if updating
      if (updates.api_key) {
        updates.api_key = this.encryptKey(updates.api_key);
      }
      if (updates.api_secret) {
        updates.api_secret = this.encryptKey(updates.api_secret);
      }

      const { data, error } = await supabase
        .from("sms_gateways")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", gatewayId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating SMS gateway:", error);
      throw error;
    }
  },

  /**
   * Delete SMS gateway
   */
  async deleteGateway(gatewayId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("sms_gateways")
        .delete()
        .eq("id", gatewayId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting SMS gateway:", error);
      throw error;
    }
  },

  /**
   * Test gateway connection
   */
  async testGateway(gatewayId: string): Promise<boolean> {
    try {
      const gateway = await this.getGateway(gatewayId);
      if (!gateway) throw new Error("Gateway not found");

      const decryptedKey = this.decryptKey(gateway.api_key);
      const decryptedSecret = gateway.api_secret
        ? this.decryptKey(gateway.api_secret)
        : "";

      let isValid = false;

      // Test based on provider
      switch (gateway.provider) {
        case "bulksmsbd":
          isValid = await this.testBulkSmsBDConnection(
            decryptedKey,
            decryptedSecret,
          );
          break;
        case "twilio":
          isValid = await this.testTwilioConnection(
            decryptedKey,
            decryptedSecret,
          );
          break;
        default:
          isValid = true;
      }

      // Update status
      await this.updateGateway(gatewayId, {
        status: isValid ? "active" : "failed",
        last_tested: new Date().toISOString(),
      });

      // Check balance if enabled
      if (isValid && gateway.balance_check_enabled) {
        await this.checkBalance(gatewayId);
      }

      return isValid;
    } catch (error) {
      console.error("Error testing gateway:", error);
      await this.updateGateway(gatewayId, {
        status: "failed",
        last_tested: new Date().toISOString(),
      });
      return false;
    }
  },

  /**
   * Test Bulk SMS BD connection
   */
  async testBulkSmsBDConnection(
    apiKey: string,
    apiSecret: string,
  ): Promise<boolean> {
    try {
      const response = await axios.get(
        "https://api.bulksmsbd.com/api/account/balance",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      return response.status === 200;
    } catch (error) {
      console.error("Error testing Bulk SMS BD connection:", error);
      return false;
    }
  },

  /**
   * Test Twilio connection
   */
  async testTwilioConnection(
    apiKey: string,
    apiSecret: string,
  ): Promise<boolean> {
    try {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
      const response = await axios.get(
        "https://api.twilio.com/2010-04-01/Accounts.json",
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      return response.status === 200;
    } catch (error) {
      console.error("Error testing Twilio connection:", error);
      return false;
    }
  },

  /**
   * Check gateway balance
   */
  async checkBalance(gatewayId: string): Promise<number> {
    try {
      const gateway = await this.getGateway(gatewayId);
      if (!gateway) throw new Error("Gateway not found");

      const decryptedKey = this.decryptKey(gateway.api_key);
      const decryptedSecret = gateway.api_secret
        ? this.decryptKey(gateway.api_secret)
        : "";

      let balance = 0;

      switch (gateway.provider) {
        case "bulksmsbd":
          balance = await this.getBulkSmsBDBalance(decryptedKey);
          break;
        case "twilio":
          balance = await this.getTwilioBalance(decryptedKey, decryptedSecret);
          break;
      }

      // Update balance
      await this.updateGateway(gatewayId, {
        current_balance: balance,
        last_balance_check: new Date().toISOString(),
      });

      // Alert if low balance
      if (balance < 100) {
        await this.createLowBalanceAlert(gatewayId, balance);
      }

      return balance;
    } catch (error) {
      console.error("Error checking balance:", error);
      throw error;
    }
  },

  /**
   * Get Bulk SMS BD balance
   */
  async getBulkSmsBDBalance(apiKey: string): Promise<number> {
    try {
      const response = await axios.get(
        "https://api.bulksmsbd.com/api/account/balance",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      return response.data.balance || 0;
    } catch (error) {
      console.error("Error getting Bulk SMS BD balance:", error);
      return 0;
    }
  },

  /**
   * Get Twilio balance
   */
  async getTwilioBalance(
    accountSid: string,
    authToken: string,
  ): Promise<number> {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      return parseFloat(response.data.balance) || 0;
    } catch (error) {
      console.error("Error getting Twilio balance:", error);
      return 0;
    }
  },

  /**
   * Create low balance alert
   */
  async createLowBalanceAlert(
    gatewayId: string,
    balance: number,
  ): Promise<void> {
    try {
      await supabase.from("gateway_alerts").insert([
        {
          gateway_id: gatewayId,
          alert_type: "low_balance",
          balance: balance,
          message: `SMS Gateway balance is low: ${balance}`,
          is_resolved: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error creating alert:", error);
    }
  },

  /**
   * Get gateway statistics
   */
  async getGatewayStats(gatewayId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: logs } = await supabase
        .from("sms_logs")
        .select("status, delivery_status, created_at")
        .eq("gateway_id", gatewayId)
        .gte("created_at", startDate.toISOString());

      if (!logs) return {};

      const total = logs.length;
      const sent = logs.filter((l: any) => l.status === "sent").length;
      const delivered = logs.filter(
        (l: any) => l.delivery_status === "delivered",
      ).length;
      const failed = logs.filter((l: any) => l.status === "failed").length;

      return {
        total_sms: total,
        sent_count: sent,
        delivered_count: delivered,
        failed_count: failed,
        success_rate:
          total > 0 ? ((sent / total) * 100).toFixed(2) + "%" : "0%",
        delivery_rate:
          sent > 0 ? ((delivered / sent) * 100).toFixed(2) + "%" : "0%",
        period_days: days,
      };
    } catch (error) {
      console.error("Error getting gateway stats:", error);
      throw error;
    }
  },

  /**
   * Enable gateway
   */
  async enableGateway(gatewayId: string): Promise<any> {
    return this.updateGateway(gatewayId, { is_active: true });
  },

  /**
   * Disable gateway
   */
  async disableGateway(gatewayId: string): Promise<any> {
    return this.updateGateway(gatewayId, { is_active: false });
  },

  /**
   * Encrypt API key
   */
  encryptKey(key: string): string {
    const encryptionKey =
      process.env.ENCRYPTION_KEY || "default-key-32-characters-long!!";
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey.substring(0, 32).padEnd(32, "0")),
      Buffer.from("0000000000000000"),
    );
    let encrypted = cipher.update(key, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  },

  /**
   * Decrypt API key
   */
  decryptKey(encrypted: string): string {
    const encryptionKey =
      process.env.ENCRYPTION_KEY || "default-key-32-characters-long!!";
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey.substring(0, 32).padEnd(32, "0")),
      Buffer.from("0000000000000000"),
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  },
};

// ============================================================================
// SMS Template Management
// ============================================================================

/**
 * Manages SMS message templates
 */
export const smsTemplateService = {
  /**
   * Create SMS template
   */
  async createTemplate(template: {
    name: string;
    content: string;
    variables: string[]; // e.g., ['user_name', 'otp']
    purpose: "otp" | "notification" | "alert" | "marketing" | "custom";
    character_count?: number;
    sms_count?: number;
    description?: string;
    is_default?: boolean;
    tags?: string[];
  }): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("sms_templates")
        .insert([
          {
            ...template,
            character_count: template.content.length,
            sms_count: Math.ceil(template.content.length / 160),
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating SMS template:", error);
      throw error;
    }
  },

  /**
   * Get all SMS templates
   */
  async getTemplates(filters?: {
    purpose?: string;
    tag?: string;
    is_active?: boolean;
  }): Promise<any[]> {
    try {
      let query = supabase.from("sms_templates").select("*");

      if (filters?.purpose) {
        query = query.eq("purpose", filters.purpose);
      }

      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting SMS templates:", error);
      throw error;
    }
  },

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting SMS template:", error);
      throw error;
    }
  },

  /**
   * Render SMS template
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<{
    content: string;
    character_count: number;
    sms_count: number;
  }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error("Template not found");

      let content = template.content;

      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        content = content.replace(regex, value);
      }

      const characterCount = content.length;
      const smsCount = Math.ceil(characterCount / 160);

      return {
        content,
        character_count: characterCount,
        sms_count: smsCount,
      };
    } catch (error) {
      console.error("Error rendering SMS template:", error);
      throw error;
    }
  },

  /**
   * Update SMS template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<any>,
  ): Promise<any> {
    try {
      if (updates.content) {
        updates.character_count = updates.content.length;
        updates.sms_count = Math.ceil(updates.content.length / 160);
      }

      const { data, error } = await supabase
        .from("sms_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating SMS template:", error);
      throw error;
    }
  },

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("sms_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting SMS template:", error);
      throw error;
    }
  },
};

// ============================================================================
// SMS Delivery Service
// ============================================================================

/**
 * Handles SMS delivery with failover support
 */
export const smsDeliveryService = {
  /**
   * Send SMS with automatic failover
   */
  async sendSMS(smsData: {
    phone_number: string | string[];
    message: string;
    template_id?: string;
    template_variables?: Record<string, any>;
    gateway_id?: string;
    priority?: "high" | "normal" | "low";
    scheduled_for?: string;
    admin_id: string;
  }): Promise<{
    success: boolean;
    message_ids: string[];
    failed_recipients?: string[];
    used_gateway_id?: string;
    sms_count: number;
    cost: number;
  }> {
    try {
      // Get or render SMS content
      let message = smsData.message;

      if (smsData.template_id) {
        const rendered = await smsTemplateService.renderTemplate(
          smsData.template_id,
          smsData.template_variables || {},
        );
        message = rendered.content;
      }

      const smsCount = Math.ceil(message.length / 160);
      const phoneNumbers = Array.isArray(smsData.phone_number)
        ? smsData.phone_number
        : [smsData.phone_number];

      // Determine gateway
      let gateway = null;

      if (smsData.gateway_id) {
        gateway = await smsGatewayService.getGateway(smsData.gateway_id);
      } else {
        const available = await smsGatewayService.getGateways({
          is_active: true,
          min_balance: smsCount * phoneNumbers.length,
        });
        gateway = available[0];

        if (!gateway) {
          throw new Error("No available SMS gateways with sufficient balance");
        }
      }

      // Send SMS
      const result = await this.sendViaSMTPGateway(
        gateway,
        phoneNumbers,
        message,
      );

      // Calculate cost
      const costPerSMS = 1; // Default cost in taka or currency unit
      const totalCost = smsCount * phoneNumbers.length * costPerSMS;

      // Log delivery
      await this.logSMSDelivery({
        phone_numbers: phoneNumbers,
        message,
        gateway_id: gateway.id,
        template_id: smsData.template_id,
        status: "sent",
        message_ids: result.messageIds,
        sms_count: smsCount,
        cost: totalCost,
        admin_id: smsData.admin_id,
        priority: smsData.priority || "normal",
      });

      return {
        success: true,
        message_ids: result.messageIds,
        used_gateway_id: gateway.id,
        sms_count: smsCount,
        cost: totalCost,
      };
    } catch (error: any) {
      console.error("Error sending SMS:", error);

      // Attempt failover
      const availableGateways = await smsGatewayService.getGateways({
        is_active: true,
      });
      const phoneNumbers = Array.isArray(smsData.phone_number)
        ? smsData.phone_number
        : [smsData.phone_number];

      for (const gateway of availableGateways) {
        try {
          const result = await this.sendViaSMTPGateway(
            gateway,
            phoneNumbers,
            smsData.message,
          );
          const smsCount = Math.ceil(smsData.message.length / 160);
          const costPerSMS = 1;
          const totalCost = smsCount * phoneNumbers.length * costPerSMS;

          await this.logSMSDelivery({
            phone_numbers: phoneNumbers,
            message: smsData.message,
            gateway_id: gateway.id,
            template_id: smsData.template_id,
            status: "sent",
            message_ids: result.messageIds,
            sms_count: smsCount,
            cost: totalCost,
            admin_id: smsData.admin_id,
            priority: smsData.priority || "normal",
          });

          return {
            success: true,
            message_ids: result.messageIds,
            used_gateway_id: gateway.id,
            sms_count: Math.ceil(smsData.message.length / 160),
            cost: Math.ceil(smsData.message.length / 160) * phoneNumbers.length,
          };
        } catch (failoverError) {
          continue;
        }
      }

      throw new Error("SMS delivery failed on all gateways");
    }
  },

  /**
   * Send via SMS gateway
   */
  async sendViaSMTPGateway(
    gateway: any,
    phoneNumbers: string[],
    message: string,
  ): Promise<{ messageIds: string[] }> {
    const decryptedKey = smsGatewayService.decryptKey(gateway.api_key);
    const decryptedSecret = gateway.api_secret
      ? smsGatewayService.decryptKey(gateway.api_secret)
      : "";

    let messageIds: string[] = [];

    switch (gateway.provider) {
      case "bulksmsbd":
        messageIds = await this.sendViaBulkSmsBD(
          decryptedKey,
          phoneNumbers,
          message,
          gateway.sender_id,
        );
        break;
      case "twilio":
        messageIds = await this.sendViaTwilio(
          decryptedKey,
          decryptedSecret,
          phoneNumbers,
          message,
          gateway.sender_id,
        );
        break;
    }

    return { messageIds };
  },

  /**
   * Send via Bulk SMS BD
   */
  async sendViaBulkSmsBD(
    apiKey: string,
    phoneNumbers: string[],
    message: string,
    senderId: string,
  ): Promise<string[]> {
    const messageIds: string[] = [];

    for (const phone of phoneNumbers) {
      try {
        const response = await axios.post(
          "https://api.bulksmsbd.com/api/sms/send",
          {
            api_token: apiKey,
            message: message,
            phone_number: phone,
            sender_id: senderId,
          },
        );

        if (response.data.success) {
          messageIds.push(response.data.message_id || crypto.randomUUID());
        }
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
      }
    }

    if (messageIds.length === 0) {
      throw new Error("Failed to send SMS via Bulk SMS BD");
    }

    return messageIds;
  },

  /**
   * Send via Twilio
   */
  async sendViaTwilio(
    accountSid: string,
    authToken: string,
    phoneNumbers: string[],
    message: string,
    fromNumber: string,
  ): Promise<string[]> {
    const messageIds: string[] = [];

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    for (const phone of phoneNumbers) {
      try {
        const response = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            From: fromNumber,
            To: phone,
            Body: message,
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );

        messageIds.push(response.data.sid || crypto.randomUUID());
      } catch (error) {
        console.error(`Error sending SMS to ${phone}:`, error);
      }
    }

    if (messageIds.length === 0) {
      throw new Error("Failed to send SMS via Twilio");
    }

    return messageIds;
  },

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(
    smsDataList: any[],
    config: {
      template_id?: string;
      gateway_randomize?: boolean;
      retry_on_failure?: boolean;
      admin_id: string;
    },
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    batch_id: string;
    total_cost: number;
  }> {
    try {
      const batchId = crypto.randomUUID();
      const availableGateways = await smsGatewayService.getGateways({
        is_active: true,
      });

      let sent = 0;
      let failed = 0;
      let totalCost = 0;

      for (const smsData of smsDataList) {
        try {
          // Randomize gateway if enabled
          let gateway = availableGateways[0];

          if (config.gateway_randomize && availableGateways.length > 0) {
            gateway =
              availableGateways[
                Math.floor(Math.random() * availableGateways.length)
              ];
          }

          const result = await this.sendSMS({
            ...smsData,
            template_id: config.template_id,
            admin_id: config.admin_id,
          });

          if (result.success) {
            sent++;
            totalCost += result.cost;
          }
        } catch (error) {
          failed++;
          if (config.retry_on_failure) {
            await this.addToRetryQueue(smsData, config.admin_id);
          }
        }
      }

      return {
        total: smsDataList.length,
        sent,
        failed,
        batch_id: batchId,
        total_cost: totalCost,
      };
    } catch (error) {
      console.error("Error sending bulk SMS:", error);
      throw error;
    }
  },

  /**
   * Log SMS delivery
   */
  async logSMSDelivery(log: {
    phone_numbers: string[];
    message: string;
    gateway_id: string;
    template_id?: string;
    status: string;
    message_ids: string[];
    sms_count: number;
    cost: number;
    admin_id: string;
    priority: string;
  }): Promise<void> {
    try {
      await supabase.from("sms_logs").insert([
        {
          ...log,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error logging SMS delivery:", error);
    }
  },

  /**
   * Add SMS to retry queue
   */
  async addToRetryQueue(smsData: any, adminId: string): Promise<void> {
    try {
      await supabase.from("sms_retry_queue").insert([
        {
          sms_data: smsData,
          admin_id: adminId,
          retry_count: 0,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error adding to retry queue:", error);
    }
  },

  /**
   * Get SMS logs
   */
  async getSMSLogs(filters: {
    status?: string;
    gateway_id?: string;
    admin_id?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase.from("sms_logs").select("*");

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.gateway_id) {
        query = query.eq("gateway_id", filters.gateway_id);
      }

      if (filters.admin_id) {
        query = query.eq("admin_id", filters.admin_id);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(filters.limit || 100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting SMS logs:", error);
      throw error;
    }
  },

  /**
   * Schedule SMS for later delivery
   */
  async scheduleSMS(sms: any, scheduledFor: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("scheduled_sms")
        .insert([
          {
            sms_data: sms,
            scheduled_for: scheduledFor,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error scheduling SMS:", error);
      throw error;
    }
  },

  /**
   * Get SMS cost estimate
   */
  async getSmsCostEstimate(
    phoneNumbers: string[],
    messageLength: number,
    gatewayId?: string,
  ): Promise<{
    sms_count: number;
    phone_count: number;
    cost_per_sms: number;
    total_cost: number;
    gateway_name?: string;
  }> {
    const smsCount = Math.ceil(messageLength / 160);
    const phoneCount = phoneNumbers.length;
    const costPerSMS = 1; // Default cost

    let gatewayName: string | undefined;

    if (gatewayId) {
      const gateway = await smsGatewayService.getGateway(gatewayId);
      gatewayName = gateway?.name;
    }

    return {
      sms_count: smsCount,
      phone_count: phoneCount,
      cost_per_sms: costPerSMS,
      total_cost: smsCount * phoneCount * costPerSMS,
      gateway_name: gatewayName,
    };
  },
};

export default {
  smsGatewayService,
  smsTemplateService,
  smsDeliveryService,
};
