/**
 * Command Pattern Interface for Administrative Mutations
 * Enforces role-based permission checks and mandatory audit logging for every state mutation.
 */

import { AdminUser } from "@/types/admin";
import { AdminPermission } from "../rbac/rbacTypes";

export interface CommandExecutionResult<TResult = any> {
  success: boolean;
  result?: TResult;
  error?: string;
  auditLogId?: string;
}

export interface AdminCommand<TResult = any> {
  readonly id: string;
  readonly action: string;
  readonly module: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly requiredPermission: AdminPermission;

  /**
   * Executes the mutation against the backend database / Supabase
   */
  execute(admin: AdminUser): Promise<TResult>;

  /**
   * Builds the immutable structured audit metadata to be persisted into admin_activity_logs
   */
  toAuditDetails(admin: AdminUser, result: TResult): Record<string, any>;
}
