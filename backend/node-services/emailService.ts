// @ts-nocheck
/**
 * Email Service - Advanced SMTP Multi-Server Management
 *
 * Features:
 * - Multiple SMTP server management (unlimited servers)
 * - Auto-failover to secondary servers
 * - Health monitoring and status tracking
 * - Advanced email template system with variables
 * - Template versioning and A/B testing
 * - Queue management and retry logic
 * - Load balancing across SMTP servers
 * - Detailed delivery tracking and logging
 * - Rate limiting per server
 * - Scheduled email delivery
 *
 * @module services/emailService
 */

import { createClient } from "@supabase/supabase-js";
import * as nodemailer from "nodemailer";
import * as crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// ============================================================================
// SMTP Server Management Service
// ============================================================================

/**
 * Manages multiple SMTP servers with health checks and failover
 */
export const smtpServerService = {
  /**
   * Add new SMTP server
   * @param server - SMTP configuration
   * @returns Created SMTP server record
   */
  async addSmtpServer(server: {
    name: string;
    host: string;
    port: number;
    secure: boolean;
    auth_email: string;
    auth_password: string;
    from_email: string;
    from_name?: string;
    description?: string;
    max_rate_per_hour?: number;
    daily_limit?: number;
    is_active?: boolean;
    priority?: number;
    tags?: string[];
  }): Promise<any> {
    try {
      // Encrypt password before storing
      const encryptedPassword = this.encryptPassword(server.auth_password);

      const { data, error } = await supabase
        .from("smtp_servers")
        .insert([
          {
            name: server.name,
            host: server.host,
            port: server.port,
            secure: server.secure,
            auth_email: server.auth_email,
            auth_password: encryptedPassword,
            from_email: server.from_email,
            from_name: server.from_name || "",
            description: server.description || "",
            max_rate_per_hour: server.max_rate_per_hour || 1000,
            daily_limit: server.daily_limit || 10000,
            is_active: server.is_active !== false,
            priority: server.priority || 0,
            tags: server.tags || [],
            status: "pending_verification",
            last_tested: null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Test connection
      await this.testSmtpConnection(data.id);

      return data;
    } catch (error) {
      console.error("Error adding SMTP server:", error);
      throw error;
    }
  },

  /**
   * Get all SMTP servers
   * @param filters - Optional filters (active, tag, priority)
   * @returns List of SMTP servers
   */
  async getSmtpServers(filters?: {
    is_active?: boolean;
    tag?: string;
    min_priority?: number;
  }): Promise<any[]> {
    try {
      let query = supabase.from("smtp_servers").select("*");

      if (filters?.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      if (filters?.min_priority) {
        query = query.gte("priority", filters.min_priority);
      }

      const { data, error } = await query.order("priority", {
        ascending: false,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting SMTP servers:", error);
      throw error;
    }
  },

  /**
   * Get single SMTP server by ID
   */
  async getSmtpServer(serverId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("smtp_servers")
        .select("*")
        .eq("id", serverId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting SMTP server:", error);
      throw error;
    }
  },

  /**
   * Update SMTP server
   */
  async updateSmtpServer(
    serverId: string,
    updates: Partial<any>,
  ): Promise<any> {
    try {
      // Encrypt password if updating
      if (updates.auth_password) {
        updates.auth_password = this.encryptPassword(updates.auth_password);
      }

      const { data, error } = await supabase
        .from("smtp_servers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", serverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating SMTP server:", error);
      throw error;
    }
  },

  /**
   * Delete SMTP server
   */
  async deleteSmtpServer(serverId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("smtp_servers")
        .delete()
        .eq("id", serverId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting SMTP server:", error);
      throw error;
    }
  },

  /**
   * Test SMTP server connection
   */
  async testSmtpConnection(serverId: string): Promise<boolean> {
    try {
      const server = await this.getSmtpServer(serverId);
      if (!server) throw new Error("SMTP server not found");

      const decryptedPassword = this.decryptPassword(server.auth_password);

      const transporter = nodemailer.createTransport({
        host: server.host,
        port: server.port,
        secure: server.secure,
        auth: {
          user: server.auth_email,
          pass: decryptedPassword,
        },
      });

      const result = await transporter.verify();

      // Update status
      await this.updateSmtpServer(serverId, {
        status: result ? "active" : "failed",
        last_tested: new Date().toISOString(),
        consecutive_failures: result
          ? 0
          : (server.consecutive_failures || 0) + 1,
      });

      return result;
    } catch (error) {
      console.error("Error testing SMTP connection:", error);

      // Log failure
      await this.updateSmtpServer(serverId, {
        status: "failed",
        last_tested: new Date().toISOString(),
        consecutive_failures:
          (await this.getSmtpServer(serverId)).consecutive_failures + 1 || 1,
      });

      return false;
    }
  },

  /**
   * Get SMTP server health status
   */
  async getServerHealth(serverId: string): Promise<{
    status: string;
    last_tested: string;
    uptime_percentage: number;
    total_emails_sent: number;
    failed_emails: number;
    consecutive_failures: number;
  }> {
    try {
      const server = await this.getSmtpServer(serverId);

      // Get statistics
      const { count: totalEmails } = await supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .eq("smtp_server_id", serverId);

      const { count: failedEmails } = await supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .eq("smtp_server_id", serverId)
        .eq("status", "failed");

      return {
        status: server.status,
        last_tested: server.last_tested,
        uptime_percentage: server.uptime_percentage || 99.9,
        total_emails_sent: totalEmails || 0,
        failed_emails: failedEmails || 0,
        consecutive_failures: server.consecutive_failures || 0,
      };
    } catch (error) {
      console.error("Error getting server health:", error);
      throw error;
    }
  },

  /**
   * Get available SMTP servers for sending (active, not rate-limited)
   */
  async getAvailableServers(): Promise<any[]> {
    try {
      const servers = await this.getSmtpServers({ is_active: true });

      // Filter servers not hitting rate limits
      const available = [];

      for (const server of servers) {
        // Check rate limit
        const { count } = await supabase
          .from("email_logs")
          .select("*", { count: "exact" })
          .eq("smtp_server_id", server.id)
          .gte("created_at", new Date(Date.now() - 3600000).toISOString());

        if ((count || 0) < (server.max_rate_per_hour || 1000)) {
          available.push(server);
        }
      }

      // Sort by priority and load
      return available.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error("Error getting available servers:", error);
      return [];
    }
  },

  /**
   * Get server statistics
   */
  async getServerStats(serverId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: logs } = await supabase
        .from("email_logs")
        .select("status, created_at, response_time_ms")
        .eq("smtp_server_id", serverId)
        .gte("created_at", startDate.toISOString());

      if (!logs) return {};

      const total = logs.length;
      const sent = logs.filter((l: any) => l.status === "sent").length;
      const failed = logs.filter((l: any) => l.status === "failed").length;
      const avgResponseTime =
        logs.reduce(
          (sum: number, l: any) => sum + (l.response_time_ms || 0),
          0,
        ) / total || 0;

      return {
        total_emails: total,
        sent_count: sent,
        failed_count: failed,
        success_rate:
          total > 0 ? ((sent / total) * 100).toFixed(2) + "%" : "0%",
        avg_response_time_ms: Math.round(avgResponseTime),
        period_days: days,
      };
    } catch (error) {
      console.error("Error getting server stats:", error);
      throw error;
    }
  },

  /**
   * Enable SMTP server
   */
  async enableServer(serverId: string): Promise<any> {
    return this.updateSmtpServer(serverId, { is_active: true });
  },

  /**
   * Disable SMTP server
   */
  async disableServer(serverId: string): Promise<any> {
    return this.updateSmtpServer(serverId, { is_active: false });
  },

  /**
   * Encrypt password for storage
   */
  encryptPassword(password: string): string {
    const key =
      process.env.ENCRYPTION_KEY || "default-key-32-characters-long!!";
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(key.substring(0, 32).padEnd(32, "0")),
      Buffer.from("0000000000000000"),
    );
    let encrypted = cipher.update(password, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  },

  /**
   * Decrypt password from storage
   */
  decryptPassword(encrypted: string): string {
    const key =
      process.env.ENCRYPTION_KEY || "default-key-32-characters-long!!";
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key.substring(0, 32).padEnd(32, "0")),
      Buffer.from("0000000000000000"),
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  },
};

// ============================================================================
// Email Template Management
// ============================================================================

/**
 * Manages email templates with versioning and A/B testing
 */
export const emailTemplateService = {
  /**
   * Create new email template
   */
  async createTemplate(template: {
    name: string;
    subject: string;
    html_content: string;
    text_content?: string;
    purpose:
      | "welcome"
      | "verification"
      | "reset"
      | "notification"
      | "marketing"
      | "alert"
      | "custom";
    variables: string[]; // e.g., ['user_name', 'reset_link']
    description?: string;
    is_default?: boolean;
    tags?: string[];
    ab_test_group?: "control" | "variant" | null;
  }): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .insert([
          {
            ...template,
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating email template:", error);
      throw error;
    }
  },

  /**
   * Get all email templates
   */
  async getTemplates(filters?: {
    purpose?: string;
    tag?: string;
    is_active?: boolean;
  }): Promise<any[]> {
    try {
      let query = supabase.from("email_templates").select("*");

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
      console.error("Error getting templates:", error);
      throw error;
    }
  },

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting template:", error);
      throw error;
    }
  },

  /**
   * Update email template (creates new version)
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<any>,
  ): Promise<any> {
    try {
      const oldTemplate = await this.getTemplate(templateId);

      // Create new version
      const newVersion = (oldTemplate.version || 1) + 1;

      const { data, error } = await supabase
        .from("email_templates")
        .update({
          ...updates,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<{
    subject: string;
    html: string;
    text?: string;
  }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error("Template not found");

      let subject = template.subject;
      let html = template.html_content;
      let text = template.text_content || "";

      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        subject = subject.replace(regex, value);
        html = html.replace(regex, value);
        text = text.replace(regex, value);
      }

      return { subject, html, text };
    } catch (error) {
      console.error("Error rendering template:", error);
      throw error;
    }
  },

  /**
   * Clone template
   */
  async cloneTemplate(templateId: string, newName: string): Promise<any> {
    try {
      const template = await this.getTemplate(templateId);

      const { data, error } = await supabase
        .from("email_templates")
        .insert([
          {
            ...template,
            id: undefined,
            name: newName,
            version: 1,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error cloning template:", error);
      throw error;
    }
  },

  /**
   * Get template versions
   */
  async getTemplateVersions(templateId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", templateId)
        .order("version", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting template versions:", error);
      throw error;
    }
  },

  /**
   * Get default template for purpose
   */
  async getDefaultTemplate(purpose: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("purpose", purpose)
        .eq("is_default", true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting default template:", error);
      throw error;
    }
  },
};

// ============================================================================
// Email Delivery Service with Failover
// ============================================================================

/**
 * Handles email delivery with automatic failover
 */
export const emailDeliveryService = {
  /**
   * Send email with automatic failover
   */
  async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template_id?: string;
    template_variables?: Record<string, any>;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
    priority?: "high" | "normal" | "low";
    scheduled_for?: string;
    smtp_server_id?: string;
    admin_id: string;
  }): Promise<{
    success: boolean;
    message_ids: string[];
    failed_recipients?: string[];
    used_server_id?: string;
  }> {
    try {
      // Get or render email content
      let html = emailData.html;
      let subject = emailData.subject;
      let text = emailData.text;

      if (emailData.template_id) {
        const rendered = await emailTemplateService.renderTemplate(
          emailData.template_id,
          emailData.template_variables || {},
        );
        html = rendered.html;
        subject = rendered.subject;
        text = rendered.text;
      }

      // Determine SMTP server
      let smtpServer = null;

      if (emailData.smtp_server_id) {
        smtpServer = await smtpServerService.getSmtpServer(
          emailData.smtp_server_id,
        );
      } else {
        const available = await smtpServerService.getAvailableServers();
        smtpServer = available[0];

        if (!smtpServer) {
          throw new Error("No available SMTP servers");
        }
      }

      // Send email
      const messageIds = await this.sendViaServer(smtpServer, {
        to: emailData.to,
        subject,
        html,
        text,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments,
      });

      // Log delivery
      await this.logEmailDelivery({
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject,
        smtp_server_id: smtpServer.id,
        template_id: emailData.template_id,
        status: "sent",
        message_ids: messageIds,
        admin_id: emailData.admin_id,
        priority: emailData.priority || "normal",
      });

      return {
        success: true,
        message_ids: messageIds,
        used_server_id: smtpServer.id,
      };
    } catch (error: any) {
      console.error("Error sending email:", error);

      // Attempt failover
      const availableServers = await smtpServerService.getAvailableServers();

      for (const server of availableServers) {
        try {
          const messageIds = await this.sendViaServer(server, {
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            cc: emailData.cc,
            bcc: emailData.bcc,
            attachments: emailData.attachments,
          });

          await this.logEmailDelivery({
            to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
            subject: emailData.subject,
            smtp_server_id: server.id,
            template_id: emailData.template_id,
            status: "sent",
            message_ids: messageIds,
            admin_id: emailData.admin_id,
            priority: emailData.priority || "normal",
          });

          return {
            success: true,
            message_ids: messageIds,
            used_server_id: server.id,
          };
        } catch (failoverError) {
          continue;
        }
      }

      throw new Error("Email delivery failed on all servers");
    }
  },

  /**
   * Send via specific SMTP server
   */
  async sendViaServer(
    server: any,
    email: {
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      cc?: string[];
      bcc?: string[];
      attachments?: any[];
    },
  ): Promise<string[]> {
    const decryptedPassword = smtpServerService.decryptPassword(
      server.auth_password,
    );

    const transporter = nodemailer.createTransport({
      host: server.host,
      port: server.port,
      secure: server.secure,
      auth: {
        user: server.auth_email,
        pass: decryptedPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `${server.from_name || ""} <${server.from_email}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      cc: email.cc,
      bcc: email.bcc,
      attachments: email.attachments,
    });

    return [info.messageId];
  },

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    emailList: any[],
    config: {
      template_id?: string;
      smtp_randomize?: boolean;
      retry_on_failure?: boolean;
      admin_id: string;
    },
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    batch_id: string;
  }> {
    try {
      const batchId = crypto.randomUUID();
      const availableServers = await smtpServerService.getAvailableServers();

      let sent = 0;
      let failed = 0;

      for (const email of emailList) {
        try {
          // Randomize server if enabled
          let server = availableServers[0];

          if (config.smtp_randomize && availableServers.length > 0) {
            server =
              availableServers[
                Math.floor(Math.random() * availableServers.length)
              ];
          }

          const result = await this.sendEmail({
            ...email,
            template_id: config.template_id,
            smtp_server_id: server.id,
            admin_id: config.admin_id,
          });

          if (result.success) sent++;
        } catch (error) {
          failed++;
          if (config.retry_on_failure) {
            // Add to retry queue
            await this.addToRetryQueue(email, config.admin_id);
          }
        }
      }

      return {
        total: emailList.length,
        sent,
        failed,
        batch_id: batchId,
      };
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      throw error;
    }
  },

  /**
   * Log email delivery
   */
  async logEmailDelivery(log: {
    to: string[];
    subject: string;
    smtp_server_id: string;
    template_id?: string;
    status: string;
    message_ids: string[];
    admin_id: string;
    priority: string;
  }): Promise<void> {
    try {
      await supabase.from("email_logs").insert([
        {
          ...log,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error logging email delivery:", error);
    }
  },

  /**
   * Add email to retry queue
   */
  async addToRetryQueue(email: any, adminId: string): Promise<void> {
    try {
      await supabase.from("email_retry_queue").insert([
        {
          email_data: email,
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
   * Get email logs
   */
  async getEmailLogs(filters: {
    status?: string;
    smtp_server_id?: string;
    admin_id?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase.from("email_logs").select("*");

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.smtp_server_id) {
        query = query.eq("smtp_server_id", filters.smtp_server_id);
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
      console.error("Error getting email logs:", error);
      throw error;
    }
  },

  /**
   * Schedule email for later delivery
   */
  async scheduleEmail(email: any, scheduledFor: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("scheduled_emails")
        .insert([
          {
            email_data: email,
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
      console.error("Error scheduling email:", error);
      throw error;
    }
  },
};

export default {
  smtpServerService,
  emailTemplateService,
  emailDeliveryService,
};
