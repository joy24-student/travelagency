import { supabase } from "@/utils/supabase";
import { AdminUser } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class VerifyPaymentCommand implements AdminCommand<{ id: string; status: string }> {
  readonly id = `cmd-payment-verify-${Date.now()}`;
  readonly action = "PAYMENT_MANUAL_VERIFY";
  readonly module = "payments";
  readonly entityType = "payment_transaction";
  readonly requiredPermission: AdminPermission = "payments.settle";

  constructor(
    readonly entityId: string,
    readonly notes: string = "Manual verification override by administrator"
  ) {}

  async execute(admin: AdminUser) {
    const timestamp = new Date().toISOString();

    // Update in shopno_wallet_transactions
    await supabase
      .from("shopno_wallet_transactions")
      .update({
        status: "completed",
        description: `Verified by admin (${admin.name || admin.user_id}): ${this.notes}`,
      })
      .eq("id", this.entityId);

    // Update in payments table if present
    await supabase
      .from("payments")
      .update({
        status: "completed",
        updated_at: timestamp,
      })
      .eq("id", this.entityId);

    return { id: this.entityId, status: "completed" };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      transaction_id: this.entityId,
      status: "completed",
      notes: this.notes,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
