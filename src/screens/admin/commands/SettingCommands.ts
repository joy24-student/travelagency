import { supabase } from "@/utils/supabase";
import { AdminUser } from "@/types/admin";
import { AdminCommand } from "./AdminCommand";
import { AdminPermission } from "../rbac/rbacTypes";

export class UpdateSystemSettingCommand implements AdminCommand<{ key: string; value: any }> {
  readonly id = `cmd-setting-${Date.now()}`;
  readonly action = "SYSTEM_SETTING_UPDATE";
  readonly module = "settings";
  readonly entityType = "system_config";
  readonly entityId = "00000000-0000-0000-0000-000000000002";
  readonly requiredPermission: AdminPermission = "settings.manage";

  constructor(
    readonly settingKey: string,
    readonly settingValue: any
  ) {}

  async execute(admin: AdminUser) {
    try {
      await supabase.from("system_settings").upsert({
        setting_key: this.settingKey,
        setting_value: typeof this.settingValue === "string" ? this.settingValue : JSON.stringify(this.settingValue),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Supabase setting error (handled):", e);
    }

    return { key: this.settingKey, value: this.settingValue };
  }

  toAuditDetails(admin: AdminUser, result: any) {
    return {
      key: this.settingKey,
      new_value: this.settingValue,
      operator: admin.name || admin.user_id,
      timestamp: new Date().toISOString(),
    };
  }
}
