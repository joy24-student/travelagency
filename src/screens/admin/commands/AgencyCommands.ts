import { supabase } from "@/utils/supabase";
import { AdminUser, AgencyVerificationStatus } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class VerifyAgencyCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-agency-verify-${Date.now()}`;
  readonly action = "AGENCY_VERIFY";
  readonly module = "agencies";
  readonly entityType = "travel_agency";
  readonly requiredPermission: AdminPermission = "agencies.verify";

  constructor(
    readonly entityId: string,
    readonly notes: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("agencies")
        .update({ is_verified: true })
        .eq("id", this.entityId);

      await supabase
        .from("agency_admin_details")
        .upsert({
          agency_id: this.entityId,
          verification_status: AgencyVerificationStatus.VERIFIED,
          is_certified: true,
          verified_by: admin.id,
          verified_at: timestamp,
          updated_at: timestamp,
        });
    } catch (e) {
      console.warn("Supabase agency verify update (handled):", e);
    }

    return { id: this.entityId, status: "Verified" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      agency_id: this.entityId,
      status: "Verified",
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class SuspendAgencyCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-agency-suspend-${Date.now()}`;
  readonly action = "AGENCY_SUSPEND";
  readonly module = "agencies";
  readonly entityType = "travel_agency";
  readonly requiredPermission: AdminPermission = "agencies.suspend";

  constructor(
    readonly entityId: string,
    readonly reason: string
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("agencies")
        .update({ is_verified: false })
        .eq("id", this.entityId);

      await supabase
        .from("agency_admin_details")
        .upsert({
          agency_id: this.entityId,
          is_suspended: true,
          suspension_reason: this.reason,
          suspension_date: timestamp,
          updated_at: timestamp,
        });
    } catch (e) {
      console.warn("Supabase agency suspend update (handled):", e);
    }

    return { id: this.entityId, status: "Suspended" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      agency_id: this.entityId,
      status: "Suspended",
      suspension_reason: this.reason,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ReactivateAgencyCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-agency-reactivate-${Date.now()}`;
  readonly action = "AGENCY_REACTIVATE";
  readonly module = "agencies";
  readonly entityType = "travel_agency";
  readonly requiredPermission: AdminPermission = "agencies.reactivate";

  constructor(
    readonly entityId: string,
    readonly notes: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    try {
      await supabase
        .from("agencies")
        .update({ is_verified: true })
        .eq("id", this.entityId);

      await supabase
        .from("agency_admin_details")
        .upsert({
          agency_id: this.entityId,
          is_suspended: false,
          verification_status: AgencyVerificationStatus.REACTIVATED,
          updated_at: timestamp,
        });
    } catch (e) {
      console.warn("Supabase agency reactivate update (handled):", e);
    }

    return { id: this.entityId, status: "Verified" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      agency_id: this.entityId,
      status: "Reactivated",
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
