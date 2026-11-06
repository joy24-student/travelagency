import { supabase } from "@/utils/supabase";
import { AdminUser } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class CancelBookingCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-booking-cancel-${Date.now()}`;
  readonly action = "BOOKING_CANCEL";
  readonly module = "bookings";
  readonly entityType = "booking";
  readonly requiredPermission: AdminPermission = "bookings.cancel";

  constructor(
    readonly entityId: string,
    readonly reason: string = "Administrative cancellation"
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: timestamp,
        notes: `Cancelled by admin (${admin.name || admin.user_id}): ${this.reason}`,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase booking cancellation error (handled):", error);
    }

    return { id: this.entityId, status: "cancelled" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      booking_id: this.entityId,
      status: "cancelled",
      reason: this.reason,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ConfirmBookingCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-booking-confirm-${Date.now()}`;
  readonly action = "BOOKING_CONFIRM";
  readonly module = "bookings";
  readonly entityType = "booking";
  readonly requiredPermission: AdminPermission = "bookings.modify";

  constructor(
    readonly entityId: string,
    readonly notes: string = "Admin manual confirmation"
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        updated_at: timestamp,
        notes: `Confirmed by admin (${admin.name || admin.user_id}): ${this.notes}`,
      })
      .eq("id", this.entityId);

    if (error) {
      console.warn("Supabase booking confirmation error (handled):", error);
    }

    return { id: this.entityId, status: "confirmed" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      booking_id: this.entityId,
      status: "confirmed",
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
