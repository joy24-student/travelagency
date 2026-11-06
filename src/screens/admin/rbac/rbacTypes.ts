/**
 * Enterprise RBAC Type Definitions for Admin Governance Panel
 * Implements granular role-to-permission mapping and module access control.
 */

import { AdminRole, AdminUser } from "@/types/admin";
import { AdminTab } from "../AdminPortalShell";

export { AdminRole };

export type AdminPermission =
  // User Management Permissions
  | "users.view"
  | "users.create"
  | "users.ban"
  | "users.suspend"
  | "users.verify_kyc"
  | "users.delete"
  // Agency Management Permissions
  | "agencies.view"
  | "agencies.create"
  | "agencies.verify"
  | "agencies.suspend"
  | "agencies.reject"
  | "agencies.reactivate"
  // Hotel Management Permissions
  | "hotels.view"
  | "hotels.create"
  | "hotels.verify"
  | "hotels.suspend"
  | "hotels.activate"
  | "hotels.pricing"
  // Financial & Refund Permissions
  | "refunds.view"
  | "refunds.approve"
  | "refunds.process"
  | "refunds.reject"
  | "refunds.hold"
  | "payments.view"
  | "payments.settle"
  | "commissions.view"
  | "commissions.update"
  | "commissions.payout"
  // Bookings Permissions
  | "bookings.view"
  | "bookings.modify"
  | "bookings.cancel"
  // Content & Destinations Permissions
  | "destinations.view"
  | "destinations.manage"
  | "marketing.view"
  | "marketing.campaigns"
  | "ads.manage"
  | "reviews.view"
  | "reviews.moderate"
  // Support & Operations Permissions
  | "support.view"
  | "support.manage"
  | "notifications.send"
  | "monitoring.view"
  | "reports.view"
  | "reports.export"
  // System Governance & Audit Permissions
  | "audit.view"
  | "settings.view"
  | "settings.manage"
  | "rbac.manage";

/**
 * Standard Role-Permission Mapping Matrix
 */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: [
    "users.view", "users.create", "users.ban", "users.suspend", "users.verify_kyc", "users.delete",
    "agencies.view", "agencies.create", "agencies.verify", "agencies.suspend", "agencies.reject", "agencies.reactivate",
    "hotels.view", "hotels.create", "hotels.verify", "hotels.suspend", "hotels.activate", "hotels.pricing",
    "refunds.view", "refunds.approve", "refunds.process", "refunds.reject", "refunds.hold",
    "payments.view", "payments.settle", "commissions.view", "commissions.update", "commissions.payout",
    "bookings.view", "bookings.modify", "bookings.cancel",
    "destinations.view", "destinations.manage", "marketing.view", "marketing.campaigns", "ads.manage",
    "reviews.view", "reviews.moderate", "support.view", "support.manage", "notifications.send",
    "monitoring.view", "reports.view", "reports.export", "audit.view", "settings.view", "settings.manage", "rbac.manage",
  ],

  [AdminRole.ADMIN]: [
    "users.view", "users.create", "users.suspend", "users.verify_kyc",
    "agencies.view", "agencies.create", "agencies.verify", "agencies.suspend", "agencies.reactivate",
    "hotels.view", "hotels.create", "hotels.verify", "hotels.activate", "hotels.pricing",
    "refunds.view", "payments.view", "commissions.view",
    "bookings.view", "bookings.modify",
    "destinations.view", "destinations.manage", "marketing.view", "marketing.campaigns", "ads.manage",
    "reviews.view", "reviews.moderate", "support.view", "support.manage", "notifications.send",
    "monitoring.view", "reports.view", "audit.view", "settings.view",
  ],

  [AdminRole.FINANCE_ADMIN]: [
    "refunds.view", "refunds.approve", "refunds.process", "refunds.reject", "refunds.hold",
    "payments.view", "payments.settle",
    "commissions.view", "commissions.update", "commissions.payout",
    "bookings.view",
    "reports.view", "reports.export",
    "audit.view",
  ],

  [AdminRole.SUPPORT_ADMIN]: [
    "users.view", "users.verify_kyc",
    "bookings.view", "bookings.modify",
    "support.view", "support.manage",
    "reviews.view", "reviews.moderate",
    "notifications.send",
    "destinations.view",
  ],

  [AdminRole.MARKETING_ADMIN]: [
    "marketing.view", "marketing.campaigns", "ads.manage",
    "destinations.view", "destinations.manage",
    "reports.view",
    "reviews.view",
  ],

  [AdminRole.CONTENT_ADMIN]: [
    "destinations.view", "destinations.manage",
    "hotels.view",
    "reviews.view", "reviews.moderate",
    "marketing.view",
  ],

  [AdminRole.AGENCY_MANAGER]: [
    "agencies.view", "agencies.create", "agencies.verify", "agencies.suspend", "agencies.reactivate",
    "commissions.view", "commissions.update",
    "bookings.view",
    "reports.view",
  ],

  [AdminRole.READONLY]: [
    "users.view",
    "agencies.view",
    "hotels.view",
    "refunds.view",
    "payments.view",
    "commissions.view",
    "bookings.view",
    "destinations.view",
    "marketing.view",
    "reviews.view",
    "support.view",
    "reports.view",
    "monitoring.view",
    "audit.view",
    "settings.view",
  ],
};

/**
 * Tab Accessibility by Role
 */
export const ROLE_ALLOWED_TABS: Record<AdminRole, AdminTab[]> = {
  [AdminRole.SUPER_ADMIN]: [
    "dashboard", "booking-ops", "users", "hotels", "agencies", "agency-ops",
    "payment-ops", "refunds", "commissions", "destinations", "reviews",
    "support", "notifications", "marketing", "ads", "reports", "demand-heatmap", "monitoring",
    "audit-trail", "settings",
  ],

  [AdminRole.ADMIN]: [
    "dashboard", "booking-ops", "users", "hotels", "agencies", "agency-ops",
    "destinations", "reviews", "support", "notifications", "marketing", "ads",
    "reports", "demand-heatmap", "monitoring", "audit-trail", "settings",
  ],

  [AdminRole.FINANCE_ADMIN]: [
    "dashboard", "booking-ops", "payment-ops", "refunds", "commissions", "reports", "demand-heatmap", "audit-trail",
  ],

  [AdminRole.SUPPORT_ADMIN]: [
    "dashboard", "booking-ops", "users", "support", "reviews", "notifications",
  ],

  [AdminRole.MARKETING_ADMIN]: [
    "dashboard", "marketing", "ads", "destinations", "reports",
  ],

  [AdminRole.CONTENT_ADMIN]: [
    "dashboard", "destinations", "hotels", "reviews", "marketing",
  ],

  [AdminRole.AGENCY_MANAGER]: [
    "dashboard", "agencies", "agency-ops", "booking-ops", "commissions", "reports", "demand-heatmap",
  ],

  [AdminRole.READONLY]: [
    "dashboard", "booking-ops", "users", "hotels", "agencies", "payment-ops",
    "refunds", "commissions", "destinations", "reviews", "support", "marketing",
    "reports", "demand-heatmap", "monitoring", "audit-trail", "settings",
  ],
};

/**
 * Check if an admin has a specific permission
 */
export function checkPermission(
  admin: AdminUser | null,
  permission: AdminPermission
): boolean {
  if (!admin) return false;
  const role = admin.role || AdminRole.READONLY;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a tab is allowed for a given role
 */
export function checkTabAllowed(role: AdminRole, tab: AdminTab): boolean {
  const allowed = ROLE_ALLOWED_TABS[role] || ["dashboard"];
  return allowed.includes(tab);
}
