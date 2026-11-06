import { supabase } from "@/utils/supabase";
import { AdminUser, UserVerificationStatus } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class SuspendUserCommand implements AdminCommand<{ id: string; is_suspended: boolean }> {
  readonly id = `cmd-user-suspend-${Date.now()}`;
  readonly action = "USER_SUSPEND_TOGGLE";
  readonly module = "users";
  readonly entityType = "user_account";
  readonly requiredPermission: AdminPermission = "users.suspend";

  constructor(
    readonly entityId: string,
    readonly isSuspended: boolean,
    readonly reason: string = "Administrative suspension"
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("user_admin_details")
        .upsert({
          user_id: this.entityId,
          is_suspended: this.isSuspended,
          suspension_reason: this.reason,
          suspension_date: this.isSuspended ? timestamp : null,
          updated_at: timestamp,
        });
    } catch (e) {
      console.warn("Supabase user suspend update (handled):", e);
    }

    return { id: this.entityId, is_suspended: this.isSuspended };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      user_id: this.entityId,
      action_type: this.isSuspended ? "SUSPEND" : "UNSUSPEND",
      reason: this.reason,
      executed_by: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class BanUserCommand implements AdminCommand<{ id: string; is_banned: boolean }> {
  readonly id = `cmd-user-ban-${Date.now()}`;
  readonly action = "USER_BAN";
  readonly module = "users";
  readonly entityType = "user_account";
  readonly requiredPermission: AdminPermission = "users.ban";

  constructor(
    readonly entityId: string,
    readonly isBanned: boolean,
    readonly reason: string = "Terms of service violation"
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("user_admin_details")
        .upsert({
          user_id: this.entityId,
          is_banned: this.isBanned,
          ban_reason: this.reason,
          ban_date: this.isBanned ? timestamp : null,
          updated_at: timestamp,
        });
    } catch (e) {
      console.warn("Supabase user ban update (handled):", e);
    }

    return { id: this.entityId, is_banned: this.isBanned };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      user_id: this.entityId,
      action_type: this.isBanned ? "BAN" : "UNBAN",
      reason: this.reason,
      executed_by: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class VerifyUserKYCCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-user-kyc-${Date.now()}`;
  readonly action = "USER_KYC_VERIFY";
  readonly module = "users";
  readonly entityType = "kyc_document";
  readonly requiredPermission: AdminPermission = "users.verify_kyc";

  constructor(
    readonly entityId: string,
    readonly approved: boolean,
    readonly notes: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const status = this.approved ? UserVerificationStatus.VERIFIED : UserVerificationStatus.REJECTED;

    try {
      await supabase
        .from("kyc_documents")
        .update({
          is_verified: this.approved,
          verified_by: admin.id,
          verified_at: timestamp,
          verification_notes: this.notes,
        })
        .eq("id", this.entityId);
    } catch (e) {
      console.warn("Supabase kyc update error (handled):", e);
    }

    return { id: this.entityId, status };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      document_id: this.entityId,
      status: this.approved ? "APPROVED" : "REJECTED",
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
