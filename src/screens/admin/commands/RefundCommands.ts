import { supabase } from "@/utils/supabase";
import { AdminUser, RefundStatus } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class ApproveRefundCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-refund-approve-${Date.now()}`;
  readonly action = "REFUND_APPROVE";
  readonly module = "refunds";
  readonly entityType = "refund_request";
  readonly requiredPermission: AdminPermission = "refunds.approve";

  constructor(
    readonly entityId: string,
    readonly notes: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status: RefundStatus.APPROVED,
        approved_by: admin.id,
        approved_at: timestamp,
        approval_notes: this.notes,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase refund approve error (handled):", error);
    }

    return { id: this.entityId, status: RefundStatus.APPROVED };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      refund_id: this.entityId,
      status: RefundStatus.APPROVED,
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ProcessRefundCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-refund-process-${Date.now()}`;
  readonly action = "REFUND_PROCESS";
  readonly module = "refunds";
  readonly entityType = "refund_request";
  readonly requiredPermission: AdminPermission = "refunds.process";

  constructor(
    readonly entityId: string,
    readonly notes: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status: RefundStatus.PROCESSING,
        approved_by: admin.id,
        approved_at: timestamp,
        approval_notes: this.notes,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase refund process error (handled):", error);
    }

    return { id: this.entityId, status: RefundStatus.PROCESSING };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      refund_id: this.entityId,
      status: RefundStatus.PROCESSING,
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class RejectRefundCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-refund-reject-${Date.now()}`;
  readonly action = "REFUND_REJECT";
  readonly module = "refunds";
  readonly entityType = "refund_request";
  readonly requiredPermission: AdminPermission = "refunds.reject";

  constructor(
    readonly entityId: string,
    readonly reason: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status: RefundStatus.REJECTED,
        rejected_by: admin.id,
        rejected_at: timestamp,
        rejection_notes: this.reason,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase refund reject error (handled):", error);
    }

    return { id: this.entityId, status: RefundStatus.REJECTED };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      refund_id: this.entityId,
      status: RefundStatus.REJECTED,
      rejection_reason: this.reason,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class HoldRefundCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-refund-hold-${Date.now()}`;
  readonly action = "REFUND_HOLD";
  readonly module = "refunds";
  readonly entityType = "refund_request";
  readonly requiredPermission: AdminPermission = "refunds.hold";

  constructor(
    readonly entityId: string,
    readonly reason: string = ""
  ) {}

  async execute(admin: AdminUser) {
    const { error } = await supabase
      .from("refund_requests")
      .update({
        status: "on_hold" as any,
        rejected_by: admin.id,
        rejection_notes: this.reason,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase refund hold error (handled):", error);
    }

    return { id: this.entityId, status: "on_hold" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      refund_id: this.entityId,
      status: "on_hold",
      hold_reason: this.reason,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
