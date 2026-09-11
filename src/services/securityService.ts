// @ts-nocheck
// Advanced Security Features Service
import { supabase } from "@/utils/supabase";

export interface TwoFactorConfig {
  id: string;
  admin_id: string;
  method: "totp" | "sms" | "email";
  secret?: string;
  phone?: string;
  is_enabled: boolean;
  backup_codes?: string[];
  created_at: string;
}

export interface IpWhitelistEntry {
  id: string;
  admin_id: string;
  ip_address: string;
  description?: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  admin_id: string;
  event_type:
    | "login_attempt"
    | "failed_auth"
    | "permission_change"
    | "data_access"
    | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface ThreatAlert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  description: string;
  affected_resources: string[];
  recommended_action: string;
  created_at: string;
  resolved_at?: string;
}

// Two-Factor Authentication Service
export const twoFactorService = {
  async enableTotp(adminId: string) {
    try {
      const secret = this.generateSecret();

      const { data, error } = await supabase
        .from("two_factor_config")
        .upsert({
          admin_id: adminId,
          method: "totp",
          secret,
          is_enabled: false, // Requires verification
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      return {
        secret,
        qrCode: this.generateQRCode(adminId, secret),
      };
    } catch (err) {
      console.error("Error enabling TOTP:", err);
      return null;
    }
  },

  async verifyTotp(adminId: string, token: string) {
    try {
      const { data, error } = await supabase
        .from("two_factor_config")
        .select("secret")
        .eq("admin_id", adminId)
        .eq("method", "totp")
        .single();

      if (error) throw error;

      const isValid = this.verifyToken(data.secret, token);

      if (isValid) {
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        await supabase
          .from("two_factor_config")
          .update({
            is_enabled: true,
            backup_codes: backupCodes,
          })
          .eq("admin_id", adminId)
          .eq("method", "totp");

        return { success: true, backupCodes };
      }

      return { success: false };
    } catch (err) {
      console.error("Error verifying TOTP:", err);
      return { success: false };
    }
  },

  async disableTwoFactor(adminId: string) {
    try {
      const { error } = await supabase
        .from("two_factor_config")
        .update({ is_enabled: false })
        .eq("admin_id", adminId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error disabling two-factor:", err);
      return false;
    }
  },

  async getTwoFactorStatus(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("two_factor_config")
        .select("method, is_enabled")
        .eq("admin_id", adminId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || { is_enabled: false };
    } catch (err) {
      console.error("Error getting 2FA status:", err);
      return { is_enabled: false };
    }
  },

  generateSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  },

  generateQRCode(adminId: string, secret: string): string {
    // Would integrate with qr code library
    return `otpauth://totp/AdminPanel:${adminId}?secret=${secret}&issuer=AdminPanel`;
  },

  verifyToken(secret: string, token: string): boolean {
    // TOTP verification logic
    // This would use a library like speakeasy
    return true; // Placeholder
  },

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  },

  async enableSms(adminId: string, phoneNumber: string) {
    try {
      const { data, error } = await supabase
        .from("two_factor_config")
        .upsert({
          admin_id: adminId,
          method: "sms",
          phone: phoneNumber,
          is_enabled: false,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Send verification code via SMS
      await this.sendVerificationCode(phoneNumber);

      return { success: true };
    } catch (err) {
      console.error("Error enabling SMS 2FA:", err);
      return { success: false };
    }
  },

  async sendVerificationCode(phoneNumber: string) {
    try {
      // Integration with SMS service (Twilio, AWS SNS, etc.)
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await supabase.from("sms_verification_codes").insert({
        phone: phoneNumber,
        code,
        expires_at: new Date(Date.now() + 600000).toISOString(),
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (err) {
      console.error("Error sending verification code:", err);
      return false;
    }
  },
};

// IP Whitelisting Service
export const ipWhitelistService = {
  async addIpToWhitelist(
    adminId: string,
    ipAddress: string,
    description?: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("ip_whitelist")
        .insert({
          admin_id: adminId,
          ip_address: ipAddress,
          description,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error("Error adding IP to whitelist:", err);
      return null;
    }
  },

  async getWhitelist(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("ip_whitelist")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching whitelist:", err);
      return [];
    }
  },

  async isIpAllowed(adminId: string, ipAddress: string) {
    try {
      const whitelist = await this.getWhitelist(adminId);
      return whitelist.some((entry) => entry.ip_address === ipAddress);
    } catch (err) {
      console.error("Error checking IP allowance:", err);
      return false;
    }
  },

  async removeIpFromWhitelist(whitelistId: string) {
    try {
      const { error } = await supabase
        .from("ip_whitelist")
        .delete()
        .eq("id", whitelistId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error removing IP from whitelist:", err);
      return false;
    }
  },

  async enableStrictMode(adminId: string) {
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ ip_whitelist_enabled: true })
        .eq("id", adminId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error enabling IP whitelist:", err);
      return false;
    }
  },
};

// Security Monitoring Service
export const securityMonitoringService = {
  async logSecurityEvent(
    adminId: string,
    event: Omit<SecurityEvent, "id" | "created_at">,
  ) {
    try {
      const { data, error } = await supabase
        .from("security_events")
        .insert({
          ...event,
          admin_id: adminId,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Check if alert threshold exceeded
      if (event.severity === "high" || event.severity === "critical") {
        await this.createThreatAlert(adminId, event);
      }

      return data?.[0] || null;
    } catch (err) {
      console.error("Error logging security event:", err);
      return null;
    }
  },

  async getSecurityEvents(adminId: string, limit: number = 100) {
    try {
      const { data, error } = await supabase
        .from("security_events")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching security events:", err);
      return [];
    }
  },

  async detectSuspiciousActivity(adminId: string) {
    try {
      const events = await this.getSecurityEvents(adminId, 50);

      // Analyze patterns
      const failedLogins = events.filter(
        (e) => e.event_type === "failed_auth",
      ).length;
      const uniqueIps = new Set(events.map((e) => e.ip_address)).size;

      let isSuspicious = false;
      let reason = "";

      if (failedLogins > 5) {
        isSuspicious = true;
        reason = `Too many failed login attempts: ${failedLogins}`;
      }

      if (uniqueIps > 10) {
        isSuspicious = true;
        reason = `Logins from ${uniqueIps} different IP addresses`;
      }

      if (isSuspicious) {
        await this.logSecurityEvent(adminId, {
          event_type: "suspicious_activity",
          severity: "high",
          ip_address: events[0]?.ip_address || "unknown",
          user_agent: events[0]?.user_agent || "unknown",
          details: { reason },
          resolved: false,
        });
      }

      return isSuspicious;
    } catch (err) {
      console.error("Error detecting suspicious activity:", err);
      return false;
    }
  },

  async resolveSecurityEvent(eventId: string) {
    try {
      const { error } = await supabase
        .from("security_events")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error resolving security event:", err);
      return false;
    }
  },

  async createThreatAlert(adminId: string, event: any) {
    try {
      const { data, error } = await supabase
        .from("threat_alerts")
        .insert({
          alert_type: event.event_type,
          severity: event.severity,
          description: `Security event detected: ${event.event_type}`,
          affected_resources: [adminId],
          recommended_action: this.getRecommendedAction(event.event_type),
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Notify security team
      await supabase.from("audit_logs").insert({
        action: "THREAT_ALERT_CREATED",
        description: `Alert for ${event.event_type}`,
        timestamp: new Date().toISOString(),
        status: "success",
      });

      return data?.[0] || null;
    } catch (err) {
      console.error("Error creating threat alert:", err);
      return null;
    }
  },

  getRecommendedAction(eventType: string): string {
    const actions: Record<string, string> = {
      failed_auth: "Review login attempts and consider enabling 2FA",
      permission_change: "Verify if authorized admin made this change",
      data_access: "Check if data access is authorized",
      suspicious_activity:
        "Review activity logs and consider suspending admin account",
    };

    return actions[eventType] || "Review and investigate the security event";
  },

  async getThreatAlerts(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("threat_alerts")
        .select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching threat alerts:", err);
      return [];
    }
  },

  async resolveThreatAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from("threat_alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error resolving threat alert:", err);
      return false;
    }
  },
};

// Session Management Service
export const sessionManagementService = {
  async getActiveSessions(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("admin_sessions")
        .select("*")
        .eq("admin_id", adminId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching active sessions:", err);
      return [];
    }
  },

  async terminateSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from("admin_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error terminating session:", err);
      return false;
    }
  },

  async terminateAllSessions(adminId: string, exceptSessionId?: string) {
    try {
      let query = supabase
        .from("admin_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("admin_id", adminId)
        .eq("is_active", true);

      if (exceptSessionId) {
        query = query.neq("id", exceptSessionId);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error terminating all sessions:", err);
      return false;
    }
  },

  async setSessionIdleTimeout(adminId: string, timeoutMinutes: number) {
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ session_timeout_minutes: timeoutMinutes })
        .eq("id", adminId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error setting session timeout:", err);
      return false;
    }
  },
};
