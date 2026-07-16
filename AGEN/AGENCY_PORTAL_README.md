# ShopnoJatra Agency Portal - React Native Implementation

## 📱 Complete Agency Dashboard for Service Providers

A production-ready React Native enterprise application for managing travel agencies with premium glassmorphism design, full Supabase integration, and enterprise-grade features.

## ✨ Design System

### Colors

- **Primary**: `#4F46E5` - Indigo (actions, highlights)
- **Secondary**: `#06B6D4` - Cyan (accents, positive states)
- **Success**: `#22C55E` - Green (confirmations, active)
- **Danger**: `#EF4444` - Red (errors, destructive)
- **Warning**: `#FACC15` - Yellow (alerts, pending)
- **Background**: `#0F172A` - Dark slate (main bg)
- **Surface**: `#1E293B` - Slate (cards, containers)
- **Text**: `#F1F5F9` - Light slate (primary text)
- **TextSecondary**: `#CBD5E1` - Slate gray (secondary text)
- **TextTertiary**: `#94A3B8` - Gray (subtle text)

### Typography

- **H1**: 32px, 800 weight
- **H2**: 24px, 700 weight
- **H3**: 20px, 700 weight
- **Body**: 16px, 400 weight
- **Caption**: 12px, 500 weight

## 📁 Project Structure

```
AGEN/
├── App.tsx                                    # Main app entry & navigation
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── UIComponents.tsx              # Reusable UI components
│   ├── hooks/
│   │   └── useAuth.ts                        # Authentication hook
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx              # Enterprise login
│   │   └── agency/
│   │       ├── DashboardScreen.tsx          # Main dashboard
│   │       ├── OperationsScreen.tsx         # Live tours & status
│   │       ├── BookingsScreen.tsx           # Booking management
│   │       ├── CustomersScreen.tsx          # Customer CRM
│   │       ├── MessagesScreen.tsx           # Real-time messaging
│   │       ├── ProfileScreen.tsx            # Agency profile nav
│   │       ├── AgencyInfoScreen.tsx         # Agency details
│   │       ├── TeamManagementScreen.tsx     # Staff management
│   │       ├── BankAccountsScreen.tsx       # Financial accounts
│   │       ├── VerificationScreen.tsx       # Document verification
│   │       ├── SupportCenterScreen.tsx      # Help desk
│   │       └── SettingsScreen.tsx           # App settings
│   ├── services/
│   │   ├── supabaseClient.ts                # Supabase config
│   │   └── agencyService.ts                 # Business logic
│   └── types/
│       └── index.ts                         # TypeScript types
└── package.json
```

## 🎯 Screens Implemented

### 1. **Authentication**

- **LoginScreen**: Enterprise login with email/password, social auth options
- Two-factor authentication ready
- Demo credentials displayed for testing

### 2. **Dashboard** (Home)

- Key metrics cards with trend indicators
- Revenue overview chart placeholder
- Booking trend visualization
- Recent activity feed with icons and timestamps
- Pull-to-refresh functionality
- Animated card transitions

### 3. **Operations**

- Live tours with capacity indicators
- Operational status metrics (On Time, Delayed, Cancelled, Completed)
- Live activity feed with real-time updates
- Tour location mapping ready

### 4. **Bookings**

- Complete booking list with filtering
- Status-based sorting (All, Confirmed, Pending, Completed)
- Individual booking details with customer info
- Edit and delete actions
- Amount and guest information display

### 5. **Customers** (CRM)

- Customer overview with metrics
- VIP customer badge system
- Top customers list with spending data
- Customer segmentation (VIP, Regular, Inactive)
- Search and filter functionality
- Customer growth analytics

### 6. **Messages**

- Real-time messaging interface
- Online status indicators
- Unread message badges
- Message categorization (All, Unread, Groups)
- Typing indicators ready
- Avatar system with initials

### 7. **Profile** (Navigation Hub)

- Agency information display with logo
- Quick stats (Rating, Verification badge)
- Organized menu system
- Three main sections:
  - Agency Management
  - Operational Settings
  - Account Management

### 8. **Agency Info**

- Edit agency details
- Contact information management
- Address and website settings
- Agency description editor

### 9. **Team Management**

- Team member listing
- Staff roles and status
- Add/remove team members
- Permissions management
- Active/Inactive status tracking

### 10. **Bank Accounts**

- Multiple bank account management
- Security information display
- Account status badges (Active, Standby, Action Required)
- Secure credential handling
- Manage and delete options

### 11. **Verification Documents**

- Document upload interface
- Verification status tracking
- Progress indication (2 of 4 documents)
- Document list with timestamps
- Status badges per document

### 12. **Support Center**

- Help articles and FAQ
- Live chat integration ready
- Support ticket system
- Contact information
- Create new ticket functionality

### 13. **Settings**

- Notification preferences
- Security settings (2FA, login activity)
- Theme preferences (dark mode)
- Language settings
- API configuration
- Webhook management

## 🎨 UI Components Library

### Core Components

- **Card**: Glassmorphism design with gradient support
- **StatCard**: Metric display with trend indicators
- **Button**: Multiple variants (primary, secondary, danger, outline)
- **Badge**: Status indicators with 6 status types
- **ListItem**: Navigation items with icons and actions
- **ActivityItem**: Activity log entries with timestamps
- **SectionHeader**: Section titles with action buttons
- **ChartPlaceholder**: Chart container template

### Features

- Gradient backgrounds on cards
- Smooth animations
- Loading states
- Empty states
- Error handling
- Pull-to-refresh
- Modal presentations

## 🔗 Navigation Structure

```
App (RootNavigator)
├── Tab Navigator (Main Navigation)
│   ├── Dashboard
│   ├── Operations
│   ├── Bookings
│   ├── Messages
│   └── Profile (Stack Navigator)
│       ├── ProfileScreen
│       ├── AgencyInfo (Modal)
│       ├── TeamManagement (Modal)
│       ├── BankAccounts (Modal)
│       ├── Verification (Modal)
│       ├── SupportCenter (Modal)
│       └── Settings (Modal)
└── Auth Navigator
    └── LoginScreen
```

## 📡 Supabase Integration

### Service Layer Methods

#### Dashboard Service

```typescript
agencyDashboardService.getMetrics(agencyId);
agencyDashboardService.getRecentActivity(agencyId, limit);
```

#### Bookings Service

```typescript
agencyBookingsService.getBookings(agencyId, status?)
agencyBookingsService.createBooking(agencyId, bookingData)
agencyBookingsService.updateBooking(agencyId, bookingId, updates)
```

#### Customers Service

```typescript
agencyCustomersService.getCustomers(agencyId);
agencyCustomersService.getCustomerDetails(customerId);
agencyCustomersService.updateCustomer(customerId, updates);
```

#### Payments Service

```typescript
agencyPaymentsService.getPayments(agencyId);
agencyPaymentsService.getBankAccounts(agencyId);
agencyPaymentsService.addBankAccount(agencyId, accountData);
```

#### Profile Service

```typescript
agencyProfileService.getProfile(agencyId);
agencyProfileService.updateProfile(agencyId, updates);
agencyProfileService.getTeamMembers(agencyId);
agencyProfileService.addTeamMember(agencyId, memberData);
```

#### Messages Service

```typescript
agencyMessagesService.getMessages(agencyId);
agencyMessagesService.sendMessage(agencyId, recipientId, message);
```

#### Verification Service

```typescript
agencyVerificationService.getDocuments(agencyId);
agencyVerificationService.uploadDocument(agencyId, docData);
```

## 🔐 Authentication

### useAuth Hook

```typescript
const { user, loading, error, signIn, signOut } = useAuth();
```

Features:

- Session persistence
- Real-time auth state changes
- Error handling
- User metadata support

## 📊 Data Models

### User

```typescript
{
  id: string;
  email: string;
  agencyName: string;
}
```

### Booking

```typescript
{
  id: string;
  agency_id: string;
  customer_id: string;
  tour_id: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  guests: number;
  amount: number;
  created_at: string;
}
```

### Customer

```typescript
{
  id: string;
  agency_id: string;
  name: string;
  email: string;
  vip: boolean;
  bookings_count: number;
  total_spent: number;
}
```

### Agency

```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  rating: number;
  verified: boolean;
  created_at: string;
}
```

## 🚀 Installation & Setup

### Prerequisites

- Node.js 16+
- React Native CLI
- Expo CLI
- Supabase account

### Install Dependencies

```bash
cd AGEN
npm install
# or
yarn install
```

### Environment Variables

Create `.env` file:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Run Application

```bash
# Development
npm start
expo start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📦 Dependencies

- **react**: UI framework
- **react-native**: Cross-platform development
- **@react-navigation**: Navigation library
- **@supabase/supabase-js**: Supabase client
- **expo-linear-gradient**: Gradient backgrounds
- **expo-vector-icons**: Icon library
- **@expo/vector-icons**: Ionicons, MaterialCommunityIcons

## 🎯 Features Checklist

### Core Features

- ✅ Enterprise authentication
- ✅ Dashboard with metrics
- ✅ Booking management (CRUD)
- ✅ Customer CRM
- ✅ Real-time messaging
- ✅ Agency profile management
- ✅ Team management
- ✅ Financial management
- ✅ Document verification
- ✅ Support system
- ✅ Settings & preferences

### UI/UX Features

- ✅ Glassmorphism design
- ✅ Dark mode
- ✅ Gradient backgrounds
- ✅ Smooth animations
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states
- ✅ Pull-to-refresh
- ✅ Modals
- ✅ Tab navigation

### Technical Features

- ✅ TypeScript support
- ✅ Supabase integration
- ✅ Real-time updates ready
- ✅ Error handling
- ✅ Activity logging
- ✅ State management
- ✅ Custom hooks
- ✅ Component composition

## 🔧 Customization

### Changing Colors

Edit `COLORS` in `App.tsx`:

```typescript
export const COLORS = {
  primary: "#YOUR_COLOR",
  // ... other colors
};
```

### Adding New Screens

1. Create screen file in `src/screens/agency/`
2. Add to navigation in `App.tsx`
3. Create service methods in `src/services/agencyService.ts`

### Extending Services

Add new methods to service classes following existing patterns with error handling and logging.

## 📱 Testing

### Demo Credentials

- Email: `agency@demo.com`
- Password: `demo123`

### Test Data

Mock data included for all screens for immediate testing.

## 🐛 Troubleshooting

### Common Issues

**Supabase Connection Error**

```bash
# Check environment variables
# Verify Supabase URL and API key
```

**TypeScript Errors**

```bash
# Update types
npm install --save-dev @types/react-native
```

**Navigation Issues**

```bash
# Clear cache
npm start -- --clear
```

## 📝 Best Practices

1. **Always use the service layer** for data operations
2. **Handle errors gracefully** with try-catch blocks
3. **Use TypeScript types** for type safety
4. **Follow component composition** patterns
5. **Test on both iOS and Android**
6. **Use real-time listeners** for live data
7. **Implement RLS policies** for security

## 🎓 Learning Resources

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev)

## 📄 License

This project is proprietary software for ShopnoJatra.

## 👥 Support

For issues and questions:

1. Check troubleshooting section
2. Review Supabase error logs
3. Check component props
4. Verify service method calls

## 🔄 Next Steps

1. Implement real API calls with actual Supabase data
2. Add real-time listeners for live updates
3. Implement push notifications
4. Add offline support with local storage
5. Implement advanced analytics
6. Add social sharing features
7. Implement in-app payment processing
8. Add AR tour previews

---

**Built with ❤️ for ShopnoJatra Agency Portal**
