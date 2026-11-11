/**
 * Admin Panel Type Definitions
 * Comprehensive types for 450+ admin features
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  FINANCE_ADMIN = "finance_admin",
  SUPPORT_ADMIN = "support_admin",
  MARKETING_ADMIN = "marketing_admin",
  CONTENT_ADMIN = "content_admin",
  AGENCY_MANAGER = "agency_manager",
  READONLY = "readonly",
}

export enum UserVerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  MANUAL_REVIEW = "manual_review",
}

export enum KYCDocumentType {
  NATIONAL_ID = "national_id",
  PASSPORT = "passport",
  LICENSE = "license",
  TRADE_LICENSE = "trade_license",
  BUSINESS_LICENSE = "business_license",
  TAX_DOCUMENT = "tax_document",
}

export enum AgencyVerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  SUSPENDED = "suspended",
  BANNED = "banned",
  REACTIVATED = "reactivated",
}

export enum DestinationStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

export enum PackageStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}

export enum RefundStatus {
  REQUESTED = "requested",
  APPROVED = "approved",
  REJECTED = "rejected",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum AdType {
  BANNER = "banner",
  VIDEO = "video",
  SPONSORED_PACKAGE = "sponsored_package",
  SPONSORED_AGENCY = "sponsored_agency",
}

export enum AdStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export interface DashboardMetrics {
  id: string;
  metric_date: string;
  total_users: number;
  active_users: number;
  new_users: number;
  total_agencies: number;
  active_agencies: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  today_revenue: number;
  commission_earnings: number;
  active_trips: number;
  live_visitors: number;
  conversion_rate: number;
  cancellation_rate: number;
  refund_rate: number;
  created_at: string;
}

export interface DashboardWidget {
  id: string;
  admin_id: string;
  widget_type: string;
  widget_position: number;
  is_enabled: boolean;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_name: string;
  user_id?: string;
  entity_type: string;
  entity_id?: string;
  properties: Record<string, any>;
  timestamp: string;
}

export interface RealTimeAnalytics {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_timestamp: string;
  time_period: string;
}

// ============================================================================
// ADMIN & RBAC
// ============================================================================

export interface AdminUser {
  id: string;
  user_id: string;
  name?: string;
  role: AdminRole;
  status: "active" | "suspended" | "deactivated";
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AdminRole_Type {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  module: string;
  entity_type?: string;
  entity_id?: string;
  resource_type?: string;
  resource_id?: string;
  description?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface UserAdminDetails {
  id: string;
  user_id: string;
  verification_status: UserVerificationStatus;
  kyc_status: UserVerificationStatus;
  is_suspended: boolean;
  is_banned: boolean;
  suspension_reason?: string;
  suspension_date?: string;
  ban_reason?: string;
  ban_date?: string;
  approved_date?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserLoginHistory {
  id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  device_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: KYCDocumentType;
  document_number?: string;
  file_url?: string;
  file_path?: string;
  expiry_date?: string;
  is_verified: boolean;
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  face_match_score?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AGENCY MANAGEMENT
// ============================================================================

export interface AgencyAdminDetails {
  id: string;
  agency_id: string;
  agency_name?: string;
  registration_email?: string;
  registration_phone?: string;
  registration_country?: string;
  verification_status: AgencyVerificationStatus;
  is_certified: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  suspension_reason?: string;
  suspension_date?: string;
  ban_reason?: string;
  ban_date?: string;
  reactivation_date?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AgencyPerformanceMetrics {
  id: string;
  agency_id: string;
  metric_date: string;
  total_packages: number;
  active_packages: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  commission_earned: number;
  customer_satisfaction?: number;
  complaint_count: number;
  response_time_hours?: number;
  created_at: string;
}

// ============================================================================
// DESTINATION MANAGEMENT
// ============================================================================

export interface DestinationCMS {
  id: string;
  name: string;
  slug: string;
  description?: string;
  country?: string;
  state_province?: string;
  latitude?: number;
  longitude?: number;
  status: DestinationStatus;
  featured_image_url?: string;
  banner_image_url?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  category?: string;
  difficulty_level?: string;
  best_season?: string;
  weather_api_data?: Record<string, any>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DestinationAttraction {
  id: string;
  destination_id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  entry_fee?: number;
  opening_hours?: string;
  created_at: string;
}

// ============================================================================
// PACKAGE MANAGEMENT
// ============================================================================

export interface PackageAdminDetails {
  id: string;
  package_id: string;
  status: PackageStatus;
  approval_status?: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  view_count: number;
  booking_count: number;
  conversion_rate?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

export interface BookingAdminDetails {
  id: string;
  booking_id: string;
  internal_notes?: string;
  customer_service_notes?: string;
  is_flagged: boolean;
  flag_reason?: string;
  reassigned_from?: string;
  reassigned_to?: string;
  reassigned_at?: string;
  handled_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PAYMENT & REFUND MANAGEMENT
// ============================================================================

export interface PaymentGatewayConfig {
  id: string;
  gateway_name: string;
  api_key: string;
  api_secret: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  config_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RefundRequest {
  id: string;
  booking_id: string;
  user_id: string;
  refund_amount: number;
  refund_reason: string;
  status: RefundStatus;
  refund_status?: string;
  refund_notes?: string;
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_notes?: string;
  rejected_by?: string;
  rejected_at?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REVIEW & RATING MANAGEMENT
// ============================================================================

export interface ReviewModeration {
  id: string;
  review_id: string;
  content_type: string;
  user_id?: string;
  review_text: string;
  rating: number;
  status: "approved" | "rejected" | "pending";
  rejection_reason?: string;
  moderated_by?: string;
  moderated_at?: string;
  has_offensive_content: boolean;
  has_spam: boolean;
  is_fake: boolean;
  created_at: string;
}

// ============================================================================
// COMMUNITY MANAGEMENT
// ============================================================================

export interface CommunityModeration {
  id: string;
  post_id?: string;
  comment_id?: string;
  user_id?: string;
  report_reason: string;
  report_status: "pending" | "approved" | "rejected";
  moderated_by?: string;
  moderation_action?: "approve" | "reject" | "delete";
  moderation_notes?: string;
  moderated_at?: string;
  created_at: string;
}

// ============================================================================
// MARKETING & PROMOTION
// ============================================================================

export interface PromoCode {
  id: string;
  code: string;
  title?: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount?: number;
  min_spend?: number;
  min_order_value?: number;
  max_discount?: number;
  applicable_category?: string;
  max_usage?: number;
  usage_limit?: number;
  current_usage: number;
  used_count?: number;
  start_date: string;
  end_date: string;
  expires_at?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  campaign_name: string;
  campaign_type: "email" | "push" | "sms";
  target_audience?: Record<string, any>;
  message_content: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "completed";
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  created_by?: string;
  created_at: string;
}

// ============================================================================
// ADVERTISEMENT MANAGEMENT
// ============================================================================

export interface Advertisement {
  id: string;
  ad_name: string;
  title?: string;
  subtitle?: string;
  badge_text?: string;
  button_text?: string;
  ad_type: AdType;
  placement?: string;
  advertiser_id?: string;
  content_url?: string;
  target_url?: string;
  media_url?: string;
  banner_url?: string;
  media_path?: string;
  target_audience?: Record<string, any>;
  start_date: string;
  end_date: string;
  status: AdStatus;
  impression_count: number;
  click_count: number;
  conversion_count: number;
  budget_allocated: number;
  budget_spent: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  message: string;
  channel: "push" | "in_app" | "email" | "sms";
  target_audience: "all" | "travelers" | "agencies" | "inactive" | "vip";
  deep_link?: string;
  scheduled_time: string;
  status: "scheduled" | "sent" | "cancelled" | "failed";
  sent_at?: string;
  sent_count?: number;
  click_count?: number;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface DynamicAppConfig {
  app_hero_title: string;
  app_hero_subtitle: string;
  app_announcement_ticker: string;
  app_announcement_enabled: boolean;
  app_default_commission_rate: number;
  app_surge_pricing_enabled: boolean;
  app_surge_multiplier_max: number;
  app_cancellation_free_hours: number;
  app_cancellation_penalty_rate: number;
  app_auto_approve_agencies: boolean;
  app_maintenance_mode: boolean;
  app_maintenance_message: string;
}

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

export interface FinancialReport {
  id: string;
  report_type: "revenue" | "commission" | "refund" | "tax";
  report_period_start: string;
  report_period_end: string;
  total_amount: number;
  total_revenue?: number;
  total_expenses?: number;
  report_date?: string;
  report_status?: string;
  breakdown?: Record<string, any>;
  generated_by?: string;
  generated_at: string;
  created_at: string;
}

export interface BusinessReport {
  id: string;
  report_type: "booking" | "user" | "agency";
  report_period_start: string;
  report_period_end: string;
  total_records: number;
  metrics?: Record<string, any>;
  generated_by?: string;
  generated_at: string;
  created_at: string;
}

// ============================================================================
// SECURITY CENTER
// ============================================================================

export interface SuspiciousActivity {
  id: string;
  activity_type: string;
  admin_id?: string;
  user_id?: string;
  description: string;
  ip_address?: string;
  severity: "low" | "medium" | "high" | "critical";
  is_investigated: boolean;
  investigation_notes?: string;
  created_at: string;
}

export interface FraudDetectionLog {
  id: string;
  entity_type: string;
  entity_id?: string;
  fraud_score: number;
  fraud_indicators?: Record<string, any>;
  is_flagged: boolean;
  action_taken?: string;
  created_at: string;
}

// ============================================================================
// SUPPORT CENTER
// ============================================================================

export interface SupportTicketAdmin {
  id: string;
  ticket_id: string;
  priority_level: "low" | "medium" | "high" | "critical";
  assigned_to?: string;
  escalation_level: number;
  resolution_time_hours?: number;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API & INTEGRATION
// ============================================================================

export interface APIKey {
  id: string;
  api_key_name: string;
  api_key_secret: string;
  created_by?: string;
  is_active: boolean;
  rate_limit: number;
  usage_count: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface ThirdPartyIntegration {
  id: string;
  integration_name: string;
  integration_type: "maps" | "weather" | "payment" | "sms" | "email";
  api_endpoint: string;
  api_key: string;
  is_active: boolean;
  config_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: "string" | "number" | "boolean" | "json";
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemLocalization {
  id: string;
  language_code: string;
  country_code: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// ENTERPRISE FEATURES
// ============================================================================

export interface BusinessIntelligence {
  id: string;
  report_type: "predictive_analytics" | "revenue_forecast" | "demand_forecast";
  metric_date: string;
  prediction_data?: Record<string, any>;
  confidence_score: number;
  actual_data?: Record<string, any>;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  rule_name: string;
  rule_type: "auto_refund" | "auto_commission" | "auto_notification";
  trigger_condition?: Record<string, any>;
  action_to_execute?: Record<string, any>;
  is_active: boolean;
  execution_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MLModel {
  id: string;
  model_name: string;
  model_type: "user_behavior" | "dynamic_pricing" | "recommendation";
  model_version: string;
  accuracy_score: number;
  is_active: boolean;
  deployment_date?: string;
  model_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI-SPECIFIC TYPES
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
}

export interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  trend?: "up" | "down" | "stable";
  percentageChange?: number;
  color: string;
  gradient: [string, string];
}

export interface NavMenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  submenu?: NavMenuItem[];
  requiredRole?: AdminRole;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  renderable?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminPanelState {
  user: AdminUser | null;
  isLoading: boolean;
  error?: string;
  selectedModule?: string;
  metrics?: DashboardMetrics;
  isAuthenticated: boolean;
}
