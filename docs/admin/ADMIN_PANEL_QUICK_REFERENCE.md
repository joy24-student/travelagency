# Admin Panel Quick Reference Guide

## 🚀 Quick Start

### Database Migration

```bash
# Apply the admin panel schema
supabase migration up
# File: supabase/migrations/20260605_create_admin_panel.sql
```

### Component Usage

#### Dashboard Component

```typescript
import { AdminDashboard } from '@/src/screens/admin/AdminDashboard';

<AdminDashboard />
```

#### User Management

```typescript
import UserManagementScreen from '@/src/screens/admin/UserManagementScreen';

<UserManagementScreen admin={adminUser} />
```

---

## 📊 Key Files

| File                                                  | Purpose                              |
| ----------------------------------------------------- | ------------------------------------ |
| `supabase/migrations/20260605_create_admin_panel.sql` | Database schema with 75+ tables      |
| `src/types/admin.ts`                                  | Complete TypeScript type definitions |
| `src/services/adminService.ts`                        | API service layer with 50+ methods   |
| `src/screens/admin/AdminDashboard.tsx`                | Executive dashboard component        |
| `src/screens/admin/UserManagementScreen.tsx`          | User management module               |

---

## 🎨 Design System

### Color Gradients

```
Purple-Pink:  ['#667eea', '#764ba2']
Pink-Red:     ['#f093fb', '#f5576c']
Blue-Cyan:    ['#4facfe', '#00f2fe']
Green-Teal:   ['#43e97b', '#38f9d7']
Orange-Yellow:['#fa709a', '#fee140']
```

### Usage

```typescript
<StatCard
  gradient={['#667eea', '#764ba2']}
  title="Total Users"
  value={1234}
  icon="account-multiple"
/>
```

---

## 🔧 Service Methods

### Dashboard

```typescript
// Get today's metrics
const metrics = await dashboardService.getTodayMetrics();

// Get date range metrics
const range = await dashboardService.getMetricsDateRange(start, end);

// Get real-time analytics
const visitors = await dashboardService.getRealTimeAnalytics("live_visitors");
```

### Users

```typescript
// Get all users
const users = await userManagementService.getAllUsers(100, 0);

// Suspend user
await userManagementService.suspendUser(userId, reason, adminId);

// Ban user
await userManagementService.banUser(userId, reason, adminId);

// Get KYC documents
const docs = await userManagementService.getUserKYCDocuments(userId);

// Verify KYC
await userManagementService.verifyKYCDocument(docId, adminId);
```

### Agencies

```typescript
// Get agency details
const agency = await agencyManagementService.getAgencyDetails(agencyId);

// Verify agency
await agencyManagementService.verifyAgency(agencyId, adminId);

// Suspend agency
await agencyManagementService.suspendAgency(agencyId, reason, adminId);

// Get performance metrics
const perf = await agencyManagementService.getAgencyPerformance(agencyId);
```

### Destinations

```typescript
// Get all destinations
const destinations = await destinationService.getAllDestinations(50, 0);

// Create destination
const dest = await destinationService.createDestination(data, adminId);

// Update destination
await destinationService.updateDestination(destId, updates, adminId);
```

### Refunds

```typescript
// Get all refunds
const refunds = await refundService.getAllRefunds("pending", 50);

// Approve refund
await refundService.approveRefund(refundId, adminId, notes);

// Reject refund
await refundService.rejectRefund(refundId, adminId, reason);
```

### Marketing

```typescript
// Get promo codes
const codes = await marketingService.getAllPromoCodes();

// Create promo code
const code = await marketingService.createPromoCode(codeData, adminId);

// Get campaigns
const campaigns = await marketingService.getMarketingCampaigns();

// Create campaign
const campaign = await marketingService.createCampaign(data, adminId);
```

### Ads

```typescript
// Get all ads
const ads = await adService.getAllAds("active");

// Create ad
const ad = await adService.createAd(adData, adminId);

// Update ad status
await adService.updateAdStatus(adId, "active", adminId);
```

### Reports

```typescript
// Get financial reports
const reports = await reportService.getFinancialReports("revenue", start, end);

// Generate report
const report = await reportService.generateFinancialReport(data, adminId);
```

---

## 📱 UI Components

### StatCard with Trend

```typescript
<StatCard
  title="Total Revenue"
  value="$50,000"
  icon="cash-multiple"
  gradient={['#43e97b', '#38f9d7']}
  trend="up"
  trendValue={18}
/>
```

### Charts

```typescript
<RevenueChart metrics={metrics} />
<PerformanceGauge value={85} title="Conversion" />
```

### Modal Dialog

```typescript
<Modal visible={true} onRequestClose={() => {}}>
  <View style={styles.modalContent}>
    {/* Your content */}
  </View>
</Modal>
```

---

## 🔐 Admin Roles

```typescript
enum AdminRole {
  SUPER_ADMIN = "super_admin", // All permissions
  ADMIN = "admin", // Most permissions
  FINANCE_ADMIN = "finance_admin", // Financial operations
  SUPPORT_ADMIN = "support_admin", // Support tickets
  MARKETING_ADMIN = "marketing_admin", // Marketing campaigns
  CONTENT_ADMIN = "content_admin", // Content management
  AGENCY_MANAGER = "agency_manager", // Agency management
  READONLY = "readonly", // View only
}
```

---

## 📋 User Status

```typescript
enum UserVerificationStatus {
  PENDING = "pending", // Awaiting verification
  VERIFIED = "verified", // Verified user
  REJECTED = "rejected", // Verification rejected
  MANUAL_REVIEW = "manual_review", // Needs manual review
}
```

---

## 🏢 Agency Status

```typescript
enum AgencyVerificationStatus {
  PENDING = "pending", // Pending approval
  VERIFIED = "verified", // Verified
  SUSPENDED = "suspended", // Temporarily suspended
  BANNED = "banned", // Permanently banned
  REACTIVATED = "reactivated", // Reactivated after suspension
}
```

---

## 📦 Package Status

```typescript
enum PackageStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}
```

---

## 💰 Refund Status

```typescript
enum RefundStatus {
  REQUESTED = "requested",
  APPROVED = "approved",
  REJECTED = "rejected",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

---

## 📊 Database Tables by Module

| Module            | Tables | Count  |
| ----------------- | ------ | ------ |
| Admin & RBAC      | 4      | 4      |
| Dashboard         | 4      | 4      |
| User Management   | 6      | 6      |
| Agency Management | 4      | 4      |
| Destination       | 7      | 7      |
| Package           | 3      | 3      |
| Booking           | 2      | 2      |
| Payment           | 3      | 3      |
| Refund            | 2      | 2      |
| Wallet            | 2      | 2      |
| Review            | 1      | 1      |
| Community         | 2      | 2      |
| Live Streaming    | 2      | 2      |
| Chat              | 1      | 1      |
| AI                | 2      | 2      |
| Marketing         | 3      | 3      |
| Notification      | 2      | 2      |
| CMS               | 2      | 2      |
| Ads               | 1      | 1      |
| Reports           | 3      | 3      |
| Security          | 4      | 4      |
| Support           | 2      | 2      |
| API               | 3      | 3      |
| Settings          | 3      | 3      |
| Enterprise        | 3      | 3      |
| **Total**         | **75** | **75** |

---

## 🎯 Common Tasks

### Create Admin User

```typescript
import { adminService } from "@/src/services/adminService";

const newAdmin = await adminService.createAdmin(userId, "admin", {
  "users:read": true,
  "users:update": true,
});
```

### Log Admin Activity

```typescript
await adminService.logActivity({
  admin_id: adminId,
  action: "suspend_user",
  module: "users",
  entity_type: "user",
  entity_id: userId,
  details: { reason: "Inappropriate behavior" },
});
```

### Suspend User

```typescript
const success = await userManagementService.suspendUser(
  userId,
  "Violation of terms",
  adminId,
);
```

### Approve Refund

```typescript
const success = await refundService.approveRefund(
  refundId,
  adminId,
  "Approved as per policy",
);
```

### Create Promo Code

```typescript
const code = await marketingService.createPromoCode(
  {
    code: "SUMMER2024",
    discount_type: "percentage",
    discount_value: 20,
    max_usage: 1000,
    start_date: "2024-06-01",
    end_date: "2024-08-31",
    is_active: true,
  },
  adminId,
);
```

---

## 🐛 Debugging Tips

### Check Activity Logs

```typescript
const logs = await adminService.getActivityLogs(adminId, 50);
console.log("Admin activities:", logs);
```

### Verify User Status

```typescript
const user = await userManagementService.getUserDetails(userId);
console.log("User verification:", user.verification_status);
console.log("User KYC:", user.kyc_status);
```

### Real-time Metrics

```typescript
const visitors = await dashboardService.getRealTimeAnalytics("live_visitors");
const activeUsers = await dashboardService.getRealTimeAnalytics("active_users");
```

---

## 🚨 Error Handling

All service methods return `null` on error and log to console.

```typescript
const result = await dashboardService.getTodayMetrics();
if (!result) {
  console.error("Failed to fetch metrics");
  // Handle error
}
```

---

## 📱 Responsive Design

All components are responsive:

- Mobile: Full width with padding
- Tablet: 2-column layout
- Desktop: 3-4 column layout

---

## 🔄 Real-time Updates

Subscribe to changes:

```typescript
const subscription = supabase
  .from("dashboard_metrics")
  .on("*", (payload) => {
    // Handle updates
  })
  .subscribe();
```

---

## 📚 Documentation

- Full guide: `ADMIN_PANEL_IMPLEMENTATION_GUIDE.md`
- Type definitions: `src/types/admin.ts`
- Service methods: `src/services/adminService.ts`

---

## ✅ Checklist for Implementation

- [ ] Apply database migration
- [ ] Import AdminDashboard component
- [ ] Set up navigation structure
- [ ] Create admin user role
- [ ] Configure RLS policies
- [ ] Set up environment variables
- [ ] Test user suspension
- [ ] Test refund approval
- [ ] Test activity logging
- [ ] Deploy to production

---

**Version**: 1.0
**Last Updated**: June 5, 2026
**Status**: Production Ready ✓
