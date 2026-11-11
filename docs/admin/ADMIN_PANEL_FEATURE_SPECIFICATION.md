# 🎨 Admin Panel - Master Screen-by-Screen Feature & Functionality Specification

This document provides the complete UI, feature, and data specification for all **18 Admin Panel Screens** (plus the Navigation Shell) to guide your UI redesign.

---

## 🗺️ Master Screen Index

```
src/screens/admin/
├── AdminPortalShell.tsx               (Navigation Shell & Switcher)
├── AdminDashboard.tsx                 (Executive Dashboard)
├── UserManagementScreen.tsx          (User & KYC Verification)
├── AgencyManagementScreen.tsx        (Agency Verification & Management)
├── AgenAgencyManagementScreen.tsx    (Agency Operations & Team Matrix)
├── DestinationManagementScreen.tsx   (Destination Content CMS)
├── RefundManagementScreen.tsx        (Refund Processing & Disputes)
├── MarketingScreen.tsx               (Promo Codes & Drip Campaigns)
├── AdvertisementScreen.tsx           (Ad Banners & Sponsorships)
├── ReportsScreen.tsx                 (Financial & Business Reports)
├── AgenPlatformMonitoringScreen.tsx (System Health & APM Monitoring)
├── AdminSettingsScreen.tsx           (RBAC & System Configurations)
├── BookingManagementScreen.tsx       (Booking Management Operations)
├── PaymentManagementScreen.tsx       (Payment Reconciliations)
├── SupportCenterScreen.tsx           (SLA Customer Support Tickets)
├── AuditLogsScreen.tsx               (Security Audit Log Ledger)
├── CommissionManagementScreen.tsx   (Commissions & Partner Settlements)
├── ReviewModerationScreen.tsx        (Reviews & Content Moderation)
└── NotificationCenterScreen.tsx      (Push & Campaign Broadcaster)
```

---

## 1. `AdminPortalShell.tsx` (Executive Navigation Shell)

### 🎯 Core Purpose
Serves as the top-level layout wrapper and dynamic router for all 11 administrative modules.

### 🎨 UI Components & Structure
- **Top Bar Header**:
  - Back-to-App Button (`Ionicons name="arrow-back"`)
  - Platform Title with Crown Badge (`shield-crown`)
  - Grid Launcher Icon Button (`grid-large`)
- **Horizontal Scrollable Tab Bar**:
  - 11 Pill Buttons with active theme highlights (`#38bdf8` active, `#94a3b8` inactive).
- **Module Grid Switcher Modal**:
  - Fullscreen overlay with a 3-column card grid for instant switching between screens.

### ⚡ Functional Features & State
- **State**:
  - `activeTab`: `'dashboard' | 'users' | 'agencies' | 'agency-ops' | 'destinations' | 'refunds' | 'marketing' | 'ads' | 'reports' | 'monitoring' | 'settings'`
  - `menuVisible`: `boolean` (controls grid modal visibility)
- **User Actions**:
  - Tap any tab item to switch active screen view.
  - Tap Grid Icon to pop up 11-card grid modal.
  - Tap Back Arrow to return to main mobile app settings.

---

## 2. `AdminDashboard.tsx` (Executive Dashboard)

### 🎯 Core Purpose
Provides real-time business performance analytics, daily KPI summaries, SVG trend charts, conversion gauges, and activity feeds.

### 🎨 UI Components & Structure
- **Gradient Header**: Displays admin greeting ("Welcome back!") and role badge.
- **Key Metrics Grid (8 Stat Cards)**:
  - Total Users, Total Agencies, Total Bookings, Total Revenue, Today's Revenue, Active Users, Active Trips, Live Visitors.
  - Micro-trend indicators (arrow-up `#10b981`, arrow-down `#ef4444`, percentage change).
- **Revenue Growth SVG Chart**:
  - Interactive SVG line chart with gradient fill, dashed grid lines, and data point dots.
- **Performance Gauges**:
  - SVG circular gauge arcs for Conversion Rate % and Booking Target %.
- **Live Activity Feed**:
  - Scrollable list showing recent admin audit events with timestamps.
- **Quick Action Grid**:
  - 4 Shortcut Gradient Buttons: *Add User*, *Manage Agency*, *View Bookings*, *Process Refunds*.

### ⚡ Functional Features & State
- **State & Data**:
  - `metrics`: `DashboardMetrics` (users, revenue, bookings, conversion rate, cancellation rate)
  - `admin`: `AdminUser` (current admin session info)
  - `loading`: `boolean`, `refreshing`: `boolean`
- **Services Used**: `dashboardService.getTodayMetrics()`, `adminService.getCurrentAdmin()`
- **Database Tables**: `dashboard_metrics`, `real_time_analytics`, `admin_users`, `admin_activity_logs`
- **User Actions**:
  - Pull-to-refresh to re-fetch live metrics.
  - Tap stat cards to open detailed drill-down views.
  - Tap Quick Action buttons to jump to module tabs.

---

## 3. `UserManagementScreen.tsx` (User & KYC Management)

### 🎯 Core Purpose
Manages user accounts, identity verification (KYC), account suspensions, bans, login history, and device tracking.

### 🎨 UI Components & Structure
- **Header & Search Bar**: Search input field (`Ionicons search`) with live filtering.
- **Filter Tabs**: *All Users*, *Verified*, *Pending*, *Suspended*, *Banned*.
- **User Card List**:
  - User ID / Name display.
  - Status Badges: Verification Status (`VERIFIED`, `PENDING`, `REJECTED`, `MANUAL_REVIEW`) and KYC Status.
  - Indicator dot (Green = Active, Gold = Suspended, Red = Banned).
  - Footer Action Buttons: *View Details*, *Edit Account*.
- **User Action Modal**:
  - Suspend user option with reason text input.
  - Ban user option with policy violation reason input.
  - Verify / Approve KYC document option.
  - View Login History & IP tracking.

### ⚡ Functional Features & State
- **State & Data**:
  - `users`: `UserAdminDetails[]`, `filteredUsers`: `UserAdminDetails[]`
  - `selectedUser`: `UserAdminDetails | null`
  - `searchQuery`: `string`, `activeFilter`: `string`
  - `actionModalVisible`: `boolean`
- **Services Used**: `userManagementService.getAllUsers()`, `suspendUser()`, `banUser()`, `verifyKYCDocument()`
- **Database Tables**: `user_admin_details`, `kyc_documents`, `user_login_history`, `user_device_history`, `account_profiles`
- **User Actions**:
  - Search by user ID or email.
  - Filter by verification or suspension status.
  - Suspend account with required reason.
  - Ban account permanently with reason logging.
  - Inspect uploaded passport/ID documents and approve/reject.

---

## 4. `AgencyManagementScreen.tsx` (Agency Verification & Management)

### 🎯 Core Purpose
Manages travel agency registrations, business document audits, agency verification approvals, performance tracking, and suspensions.

### 🎨 UI Components & Structure
- **Header & Search Bar**: Search agencies by name, email, or country.
- **Status Filter Tabs**: *All*, *Verified*, *Pending*, *Suspended*, *Rejected*.
- **Agency Card Component**:
  - Agency Name & Office Icon.
  - Status Badge (`VERIFIED`, `PENDING`, `SUSPENDED`, `REJECTED`).
  - Contact Details: Registration Email, Phone Number, Country.
  - Certified Partner Star Badge.
- **Agency Action Modal**:
  - *Verify & Approve Agency* button.
  - *Suspend Agency* button with reason input.
  - *Reject Registration* button with feedback input.
  - Performance Overview: Total packages, booking volume, commission earned.

### ⚡ Functional Features & State
- **State & Data**:
  - `agencies`: `AgencyAdminDetails[]`, `filteredAgencies`: `AgencyAdminDetails[]`
  - `selectedAgency`: `AgencyAdminDetails | null`
  - `searchQuery`: `string`, `activeFilter`: `string`
- **Services Used**: `agencyManagementService.getAllAgencies()`, `verifyAgency()`, `suspendAgency()`, `rejectAgency()`
- **Database Tables**: `agency_admin_details`, `agencies`, `agency_documents`, `agency_team_members`, `agency_performance_metrics`
- **User Actions**:
  - Review agency applications and trade licenses.
  - Verify & certify agency partners.
  - Suspend agency for compliance violations.
  - View agency sales volume and rating metrics.

---

## 5. `AgenAgencyManagementScreen.tsx` (Agency Operations & Team Matrix)

### 🎯 Core Purpose
Provides an operational dashboard to manage agency team members, role assignments (Owner, Manager, Staff, Support, Finance), and settlement bank accounts.

### 🎨 UI Components & Structure
- **Operations Header**: Active agency status counters and total staff numbers.
- **Team Member List**: Staff avatar, display name, email, assigned role badge, and status indicator.
- **Bank Account Settlement Cards**: Bank name, account number last 4 digits, currency (BDT/USD), and active status.
- **Activity Stream**: Audit log of agency staff actions.

### ⚡ Functional Features & State
- **Database Tables**: `agencies`, `agency_team_members`, `agency_bank_accounts`, `agency_activity_logs`
- **User Actions**:
  - Assign or revoke staff roles.
  - Verify settlement bank accounts for agency payouts.
  - Monitor agency activity history.

---

## 6. `DestinationManagementScreen.tsx` (Destination Content CMS)

### 🎯 Core Purpose
Rich Content Management System (CMS) to manage travel destinations, categories, attraction lists, cover photos, publish status, and SEO parameters.

### 🎨 UI Components & Structure
- **Category Filter Bar**: Horizontal category pills (*All*, *Island & Beach*, *Culture & Heritage*, *Nature & Mountain*, *City Break*).
- **Destination Card Grid**:
  - Featured Image cover with category badge overlay.
  - Destination Title & Country.
  - Description snippet.
  - Engagement Stats: View Count (`eye`), Like Count (`heart`).
  - Status Badges: `PUBLISHED` (Green), `DRAFT` (Gray), `FEATURED` (Gold Star).
- **Destination Action Modal**:
  - *Publish / Unpublish* toggle.
  - *Mark as Featured Destination* toggle.
  - *Edit CMS Content* form trigger.

### ⚡ Functional Features & State
- **State & Data**:
  - `destinations`: `DestinationCMS[]`
  - `selectedCategory`: `string`, `selectedDestination`: `DestinationCMS | null`
- **Services Used**: `destinationService.getAllDestinations()`, `publishDestination()`, `unpublishDestination()`, `featureDestination()`
- **Database Tables**: `destination_cms`, `destination_categories`, `destination_tags`, `destination_media`, `destination_attractions`
- **User Actions**:
  - Publish or unpublish destination guides.
  - Promote destinations to the app's homepage "Featured" carousel.
  - Edit destination SEO metadata, images, and attraction lists.

---

## 7. `RefundManagementScreen.tsx` (Refund Processing & Disputes)

### 🎯 Core Purpose
Processes customer refund applications, double-charge disputes, cancellation requests, and tracks financial refund logs.

### 🎨 UI Components & Structure
- **Refund Metrics Summary Cards**: Total Requested, Total Approved, Total Pending, Total Amount Refunded.
- **Status Filter Tabs**: *All*, *Requested*, *Approved*, *Processing*, *Rejected*, *On Hold*.
- **Refund Request Card**:
  - Booking Reference (`BK-88491`) & User ID.
  - Refund Amount ($450.00 / ৳45,000) & Currency.
  - Customer Refund Reason text box.
  - Request Date & Time.
  - Status Badge (`REQUESTED`, `APPROVED`, `PROCESSING`, `REJECTED`, `ON_HOLD`).
- **Refund Processing Modal**:
  - *Approve Refund* button with approval notes input.
  - *Reject Refund* button with rejection reason.
  - *Put on Hold* button for investigation.

### ⚡ Functional Features & State
- **State & Data**:
  - `refunds`: `RefundRequest[]`, `activeFilter`: `string`
  - `selectedRefund`: `RefundRequest | null`
- **Services Used**: `refundService.getAllRefunds()`, `approveRefund()`, `rejectRefund()`, `processRefund()`, `holdRefund()`
- **Database Tables**: `refund_requests`, `refund_logs`, `bookings`, `booking_payments`, `payment_transactions`
- **User Actions**:
  - Review refund grounds and attached booking details.
  - Approve or reject refund applications.
  - Add internal compliance notes to refund decisions.

---

## 8. `MarketingScreen.tsx` (Promo Codes & Drip Campaigns)

### 🎯 Core Purpose
Manages promotional discount codes, percentage/fixed vouchers, usage caps, and automated drip marketing campaigns (Email -> Push -> SMS).

### 🎨 UI Components & Structure
- **Tab Switcher**: *Promo Codes* vs. *Marketing Campaigns*.
- **Promo Code Cards**:
  - Discount Code badge (`SUMMER30`, `FIRSTVIP`).
  - Discount Type (Percentage vs. Fixed Amount) & Value.
  - Usage Counters (e.g., `1,420 / 5,000 used`).
  - Expiry Date countdown & Active Switch toggle.
- **Campaign Cards**:
  - Campaign Name & Channel Type (Email, Push, SMS).
  - Target Audience description.
  - Performance Metrics: Sent count, Open rate %, Click rate %, Conversion count.
  - Status Badge (`ACTIVE`, `DRAFT`, `COMPLETED`).
- **Create Promo / Campaign Modal**: Form inputs to launch new codes or campaigns.

### ⚡ Functional Features & State
- **State & Data**:
  - `promoCodes`: `PromoCode[]`, `campaigns`: `MarketingCampaign[]`
- **Services Used**: `marketingService.getAllPromoCodes()`, `createPromoCode()`, `getMarketingCampaigns()`, `createCampaign()`
- **Database Tables**: `promo_codes`, `marketing_campaigns`, `campaign_analytics`
- **User Actions**:
  - Generate new promo codes with min spend and max discount rules.
  - Create and launch multi-channel marketing campaigns.
  - Track conversion funnel metrics.

---

## 9. `AdvertisementScreen.tsx` (Ad Banners & Sponsorships)

### 🎯 Core Purpose
Manages platform ad banners, sponsored agency placements, impression tracking, click-through rates (CTR), and ad budgets.

### 🎨 UI Components & Structure
- **Ad Summary Header**: Active Ads Count, Total Impressions, Total Clicks, Average CTR %.
- **Ad Card Component**:
  - Ad Title & Advertiser.
  - Placement Position (`Home Banner`, `Hotel Search Top`, `Package Sidebar`).
  - Media Preview Image.
  - Performance Bar: Impressions (`489,200`), Clicks (`34,100`), Conversions (`1,420`).
  - Budget Tracker: Allocated ($5,000) vs. Spent ($3,400).
  - Status Badge (`ACTIVE`, `PAUSED`, `DRAFT`, `EXPIRED`).
  - Action Toggle: Pause / Resume Ad.

### ⚡ Functional Features & State
- **State & Data**:
  - `ads`: `Advertisement[]`
- **Services Used**: `adService.getAllAds()`, `createAd()`, `updateAdStatus()`
- **Database Tables**: `advertisements`, `ad_impressions`, `ad_clicks`
- **User Actions**:
  - Pause, resume, or archive ad banner campaigns.
  - Monitor click-through rates and budget consumption.

---

## 10. `ReportsScreen.tsx` (Financial & Business Analytics Reports)

### 🎯 Core Purpose
Generates executive financial statements, revenue breakdowns by product vertical (Hotels, Flights, Tours, Trains), net profit margins, tax withholdings, and agency payout reports.

### 🎨 UI Components & Structure
- **Report Type Switcher**: *Revenue*, *Commission*, *Refunds*, *Taxes*.
- **Period Filter**: Quarterly / Monthly date range selectors.
- **Financial Summary Cards**:
  - Gross Revenue, Net Profit, Agency Payouts Total, Tax Withheld.
- **Revenue Breakdown Bar**: Visual percentage bar of revenue per vertical.
- **Export Action Bar**: *Download PDF Report*, *Export CSV Data*.

### ⚡ Functional Features & State
- **State & Data**:
  - `reports`: `FinancialReport[]`, `selectedType`: `string`
- **Services Used**: `reportService.getFinancialReports()`, `generateFinancialReport()`
- **Database Tables**: `financial_reports`, `revenue_by_vertical`, `payout_summaries`, `payments`
- **User Actions**:
  - Generate quarterly and annual financial statements.
  - Export CSV audit spreadsheets for tax and accounting.

---

## 11. `AgenPlatformMonitoringScreen.tsx` (System Health & APM)

### 🎯 Core Purpose
Monitors real-time server health, API response latencies, active WebSocket connections, database pool health, and error logs.

### 🎨 UI Components & Structure
- **System Health Status Banner**: Uptime percentage (`99.98%`) & Overall Health Status (`ALL SYSTEMS OPERATIONAL`).
- **Telemetry Gauges**:
  - API Latency (`42ms`), Database Connection Pool (`18 / 100`), Memory Usage (`42%`), Error Rate (`0.02%`).
- **Real-Time Error & Warning Feed**: Incident log with severity badges (`HIGH`, `MEDIUM`, `LOW`).

### 开启 Functional Features & State
- **Database Tables**: `server_health_metrics`, `api_latencies`, `system_error_logs`, `real_time_analytics`
- **User Actions**: Re-check telemetry ping, inspect server error logs, toggle alert thresholds.

---

## 12. `AdminSettingsScreen.tsx` (RBAC & System Configurations)

### 🎯 Core Purpose
Manages administrative role permissions (Super Admin, Finance Admin, Support Admin, Marketing Admin), global system feature flags, 2FA policies, and platform configurations.

### 🎨 UI Components & Structure
- **Admin Profile Header**: Current admin avatar, name, role, and permission scope.
- **Setting Sections**:
  - **RBAC & Admin Management**: List of admin accounts and role update buttons.
  - **Security Policies**: Enforce 2FA toggle, session timeout duration, IP whitelist.
  - **Feature Flags**: Enable/disable new features (AI Assistant, Instant Payouts, Live Streaming).
  - **Global Preferences**: Platform currency (USD/BDT), default timezone, maintenance mode toggle.

### ⚡ Functional Features & State
- **Services Used**: `adminService.getCurrentAdmin()`, `getAllAdmins()`, `updateAdminRole()`
- **Database Tables**: `admin_users`, `admin_roles`, `admin_permissions`, `system_settings`
- **User Actions**:
  - Assign admin roles to staff members.
  - Toggle global feature flags on or off.
  - Turn on Platform Maintenance Mode.

---

## 13. `BookingManagementScreen.tsx` (Booking Management)

### 🎯 Core Purpose
Provides operational control over all customer bookings, schedules, traveler info, and supplier confirmations.

### 🎨 UI Components & Structure
- **Search & Filters Area**: Search queries by reference/ID, filter tabs (*Confirmed*, *Payment Pending*, *Completed*, *Cancelled*).
- **Booking Card Component**: Reference code, status badge, vertical indicator, total price.
- **Voucher Details Modal**: Detailed passenger lists, dates, billing breakdowns, timeline event logs, and confirmation documents.

### ⚡ Functional Features & State
- **State**: `bookings`, `searchQuery`, `statusFilter`, `selectedBooking`, `detailsModalVisible`.
- **User Actions**: Cancel bookings, resend vouchers, modify guest counts/dates, log internal notes.

---

## 14. `PaymentManagementScreen.tsx` (Payment Administration)

### 🎯 Core Purpose
Monitors transaction processing, flags failed payments, reconciles gateway ledger statements, and handles chargeback records.

### 🎨 UI Components & Structure
- **Search & Status Filters**: Filter by status (*Completed*, *Pending*, *Failed*).
- **Transaction Cards**: Reference ID, gross amount, transaction type (Credit/Debit), gateway origin.
- **Reconciliation Modal**: Inspects webhook metadata, bank response JSON, and triggers manual approval overrides.

### ⚡ Functional Features & State
- **State**: `payments`, `searchQuery`, `statusFilter`, `selectedTxn`, `detailsModalVisible`.
- **User Actions**: Trigger manual reconciliation overrides, inspect payment gateway response logs.

---

## 15. `SupportCenterScreen.tsx` (Support & SLA Ticketing)

### 🎯 Core Purpose
Maintains customer support ticket queues, SLA response indicators, live chat response workflows, and internal routing.

### 🎨 UI Components & Structure
- **Ticket List**: Shows tickets, urgency levels (High, Medium, Low), status, and SLA time left.
- **SLA Ticket Workspace Modal**: Full dispatch interface, messaging, and ticket resolution actions.

### ⚡ Functional Features & State
- **State**: `tickets`, `selectedTicket`, `chatModalVisible`, `replyText`.
- **User Actions**: Reply to customer tickets, re-assign ticket priorities, mark support requests as RESOLVED.

---

## 16. `AuditLogsScreen.tsx` (Platform Audit trail)

### 🎯 Core Purpose
Maintains a secure, read-only ledger of all platform administrative actions for accountability and regulatory compliance.

### 🎨 UI Components & Structure
- **Audit List**: Activity rows showing admin actor name, action (e.g. `SUSPEND_USER`), target entity, IP address, and details.

### ⚡ Functional Features & State
- **State**: `logs`, `searchQuery`.
- **User Actions**: Search audit logs by keyword or administrator.

---

## 17. `CommissionManagementScreen.tsx` (Commission Settlements)

### 🎯 Core Purpose
Configures platform booking split rates (Hotels, Flights, Trains, Tours) and processes payout requests for agency partners.

### 🎨 UI Components & Structure
- **Vertical split config grid**: Visual commission inputs per product vertical.
- **Partner Settlement Ledger**: List of payout requests with status tags, amount, and payment triggers.

### ⚡ Functional Features & State
- **State**: `splits`, `payouts`.
- **User Actions**: Adjust vertical commission percentages, trigger bank disburse payouts.

---

## 18. `ReviewModerationScreen.tsx` (Reviews & Ratings)

### 🎯 Core Purpose
Moderates user reviews and star ratings for travel packages, hotels, agencies, and destinations.

### 🎨 UI Components & Structure
- **Review List**: Comments, rating scores, target destinations, and action buttons (*Approve*, *Reject*).

### ⚡ Functional Features & State
- **State**: `reviews`.
- **User Actions**: Approve reviews to be publicly visible, reject/hide spam and inappropriate comments.

---

## 19. `NotificationCenterScreen.tsx` (Push & SMS Campaigns)

### 🎯 Core Purpose
Enables platform-wide push notification broadcasts, SMS dispatches, and email broadcasts.

### 🎨 UI Components & Structure
- **Channel Selector**: Channel toggle tabs (*Push*, *Email*, *SMS*).
- **Broadcast Composer**: Input text fields for Title/Subject and message body content, with a Send trigger button.

### ⚡ Functional Features & State
- **State**: `broadcastTitle`, `broadcastMessage`, `notificationType`.
- **User Actions**: Send broadcast messages to all active users, preview notifications.

