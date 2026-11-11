# 🌍 ShopnoJatra Travel Agency Ecosystem Master Guide

## 📌 Executive Architecture Overview

ShopnoJatra implements an enterprise-grade **Dual-Frontend Architecture** purpose-built for Travel Agencies and B2B Travel Partners. This provides travel agencies with full, frictionless operational access across both native mobile devices and high-productivity desktop/web workstations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHOPNOJATRA TRAVEL PLATFORM ECOSYSTEM                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│     SEPARATE TRAVEL AGENCY APP          │     │    SEPARATE DYNAMIC B2B WEB PORTAL      │
│               (AGEN/)                   │     │        (/agency & Portal Shell)         │
├─────────────────────────────────────────┤     ├─────────────────────────────────────────┤
│ • Native Mobile & Tablet (iOS & Android)│     │ • Full-screen Desktop / Tablet Web App  │
│ • Standalone Expo Project               │     │ • Live URL: http://localhost:8081/agency │
│ • Field operations, quick PNR lookups,  │     │ • Full 12-Module Operational Suite:     │
│   live tour dispatch, passenger QR scan │     │   - Executive Telemetry & GMV KPI Cards │
│ • New B2B Wholesale Search & Ticketing  │     │   - B2B Wholesale Flight Engine         │
│ • Mobile Wallet Deposit & Top-up        │     │   - B2B Hotel & Stays Reservation       │
│ • On-the-go Branded Quotation Maker     │     │   - Tours & Umrah Packages Catalog      │
│ • Customer CRM & Chat                   │     │   - Multi-Vertical Bookings & PNR Ops   │
│ • Staff & Sub-Agent RBAC                │     │   - B2B Wallet & Financial Ledger       │
│                                         │     │   - Customer CRM & Passport Vault       │
│                                         │     │   - White-Label Quotation Generator     │
│                                         │     │   - Sub-Agent & Staff RBAC Matrix       │
│                                         │     │   - Custom Markup & Commission Engine   │
│                                         │     │   - Agency Verification & KYC Vault     │
│                                         │     │   - 24/7 B2B Ticketing Helpdesk         │
└─────────────────────────────────────────┘     └─────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│       SUPABASE ENTERPRISE DATABASE      │     │      PYTHON FASTAPI BACKEND ENGINE      │
│ • agencies, agency_team_members         │     │ • Wholesale GDS Flight Integrations     │
│ • agency_bank_accounts, agency_documents│     │ • Hotel Bed Bank Aggregators            │
│ • shopno_wallets, agency_commissions    │     │ • Double-entry Ledger Engine            │
│ • bookings, traveler_details            │     │ • Real-time Event Bus & Telemetry       │
└─────────────────────────────────────────┘     └─────────────────────────────────────────┘
```

---

## 📱 1. Separate Travel Agency Mobile App (`AGEN/`)

### 📂 Location & Architecture
- **Directory**: `c:\Users\24030\OneDrive\Desktop\trevelagency\AGEN\`
- **Stack**: React Native 0.76+ / Expo 55, React 19, TypeScript
- **Target Platforms**: Android (APK/AAB), iOS (IPA), and Tablet/Web

### 🚀 How to Run the Separate Agency App
```bash
# Navigate to the agency directory
cd AGEN

# Install dependencies (already installed)
npm install

# Start the Expo development server
npm run start

# Launch directly on Android emulator / physical device
npm run android

# Launch directly on iOS simulator / physical iPhone
npm run ios

# Launch in web browser
npm run web

# Type-check TypeScript code (0 errors verified)
npm run type-check
```

### 🛠️ Key Capabilities & Screens in the App
1. **`DashboardScreen`**: Overview with dynamic KPIs (Revenue, Bookings, Active Customers, Conversion rate), Quick Actions grid, revenue charts, and live activities.
2. **`B2BSearchBookingScreen`** *(New)*: Search B2B Flights and Hotels with live wholesale net rates, configure real-time agency markup (% or flat BDT), calculate client prices, and hold or issue PNRs instantly.
3. **`WalletTopUpScreen`** *(New)*: Check real-time cash balance and credit line; add deposit funds via Bank Transfer (with bank deposit slip photo attachment) or bKash/Nagad instant payment.
4. **`QuotationBuilderScreen`** *(New)*: On-the-go white-label quotation maker. Add client name, travel dates, flights, hotels, and custom markup; export and share branded quote via WhatsApp or PDF.
5. **`OperationsScreen` & `ScannerScreen`**: Active tours, dispatch coordination, passenger boarding, and QR ticket scanner.
6. **`BookingsScreen` & `BookingDetailsScreen`**: Multi-vertical booking filter, status updates, PNR review, and passenger details.
7. **`CustomersScreen` & `CustomerProfileScreen`**: Customer directory, VIP client badges, and booking history.
8. **`MessagesScreen` & `ChatScreen`**: Real-time communication with clients and ShopnoJatra support.
9. **`TeamManagementScreen`**: Agency staff directory, roles, and permissions.
10. **`EarningsScreen` & `PdfExportModal`**: Double-entry balance summaries, payout requests, and tax invoices.
11. **`VerificationScreen`**: Trade license, ATAB/HAAB certificates, and KYC compliance uploads.

---

## 🌐 2. Separate Dynamic Travel Agency Web Portal

### 📂 Location & Routing
- **Shell Component**: `src/screens/agency/AgencyPortalShell.tsx`
- **Expo Router Routes**:
  - `app/agency/_layout.tsx`
  - `app/agency/index.tsx`
  - `app/agency/[slug].tsx` (supports `/agency/flights`, `/agency/hotels`, `/agency/wallet`, `/agency/bookings`, etc.)
- **Root Stack Registration**: Added to `app/_layout.tsx`

### 🚀 How to Access the Web Portal
```bash
# Start the web platform from the project root
npm run web

# Open in your web browser:
# http://localhost:8081/agency
```

### 🖥️ Responsive Desktop & Tablet Web Experience
- **Sidebar**: Collapsible dual-mode sidebar with categorized navigation, live unread badges, and real-time Credit Line utilization progress bar.
- **Top Bar**:
  - Agency brand header with **"IATA / ATAB Verified"** status badge.
  - Global Search omnibar for PNRs, ticket numbers, traveler names, and flights.
  - Live B2B Wallet Pill with instant "+ Top Up" action.
  - Notification center with operational alerts (ticket reissues, deposit verification, passport expiries).
  - Active user profile with granular RBAC role badge.

### 📋 Complete 12-Module Feature Breakdown

| # | Module | Key Features & Access |
|---|--------|------------------------|
| 1 | **Executive Dashboard** | Real-time sales, net commissions, active PNR counter, revenue growth graphs, Quick Actions launcher, live PNR feed. |
| 2 | **B2B Flight Engine** | One-way / Round-trip / Multi-city search, airline filters (Biman, US-Bangla, Emirates, Novoair), wholesale net fare vs published fare, custom agency markup calculator (% or BDT), instant PNR Hold and direct Wallet Ticket Issuance modal. |
| 3 | **B2B Hotel Engine** | Destination search across Dhaka, Cox's Bazar, Sylhet, Bangkok, Dubai; wholesale nightly rates, room categories, live markup adjustment, and instant hotel voucher generation. |
| 4 | **Tours & Umrah** | Comprehensive package catalog (Umrah VIP, Maldives Luxury, Sajek Adventure), day-by-day itineraries, inclusions/exclusions, group quotation. |
| 5 | **Bookings & PNR Ops** | Filterable data table by status (Ticketed, Confirmed, On Hold, Cancelled), PNR search, E-Ticket PDF preview, Tax Invoice generation, ticket reissue and void requests. |
| 6 | **B2B Wallet & Ledger** | Available cash balance, credit line, used credit; Top-Up modal with Bank Transfer slip upload and instant bKash/Nagad gateway; double-entry ledger of debits, credits, and markups; Payout withdrawal request. |
| 7 | **Client CRM & Passports** | Corporate and retail customer directory, passport numbers, expiration dates with &lt; 6 months warning alerts, travel history, fast one-click booking autofill. |
| 8 | **Quotation Builder** | White-label quotation generator branded with agency logo, agency contact info, line-item service costs, custom markup, and instant printable/shareable PDF quotation. |
| 9 | **Team & Staff RBAC** | Manage agency staff members with roles (`Managing Director/Owner`, `Ticketing Officer`, `Accounts & Finance`, `Support Agent`), granular permission matrix, and staff invitations. |
| 10 | **Markup & Commission** | Set global or route-specific markups (International flights %, Domestic fixed fee, Hotel wholesale margin); Tier progression tracker (Silver, Gold, Platinum B2B). |
| 11 | **KYC & Verification** | Trade License, Civil Aviation (ATAB/HAAB) license, TIN/BIN certificate, proprietor NID/Passport; verification status badge. |
| 12 | **24/7 Ticketing Desk** | Emergency PNR void hotline, flight delay re-routing desk, live agent chat, and operations email. |

---

## 🔒 3. Agency Role-Based Access Control (RBAC)

The system enforces strict permission boundaries across agency team members:

```
┌───────────────────┬──────────────┬──────────────────┬─────────────────┬──────────────┐
│ Permission        │ Agency Owner │ Ticketing Agent  │ Finance Officer │ Sales Agent  │
├───────────────────┼──────────────┼──────────────────┼─────────────────┼──────────────┤
│ Search Flights/Hotels│    ✅        │       ✅         │       ✅        │     ✅       │
│ Issue Tickets (Wallet)│   ✅        │       ✅         │       ❌        │     ❌       │
│ Hold PNRs          │      ✅        │       ✅         │       ❌        │     ✅       │
│ View Financial Ledger │   ✅        │       ❌         │       ✅        │     ❌       │
│ Top-up Wallet     │       ✅        │       ❌         │       ✅        │     ❌       │
│ Request Payouts   │       ✅        │       ❌         │       ✅        │     ❌       │
│ Create Quotations │       ✅        │       ✅         │       ❌        │     ✅       │
│ Manage Team Staff │       ✅        │       ❌         │       ❌        │     ❌       │
│ Upload KYC Docs   │       ✅        │       ❌         │       ❌        │     ❌       │
│ Set Markup Rules  │       ✅        │       ❌         │       ✅        │     ❌       │
└───────────────────┴──────────────┴──────────────────┴─────────────────┴──────────────┘
```

---

## 💎 4. Verification & Quality Assurance Summary

1. **Separate App (`AGEN/`)**:
   - `npm run type-check`: **0 errors** (Clean TypeScript compilation).
   - All navigation routes and quick actions wired and verified.
2. **Dynamic Web Portal (`app/agency/` & `src/screens/agency/`)**:
   - `AgencyPortalShell.tsx` provides full 12-module operational capabilities.
   - Route code-splitting with async lazy loading prevents bundle bloat.
   - Responsive design adapts from 4K desktop to tablet screens.
   - Comprehensive error-handling and resilient data fallbacks.
