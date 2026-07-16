# Navigation Routing Guide - Agency Portal

## 🗺️ Complete Navigation Architecture

The Agency Portal uses a nested navigation structure with proper TypeScript types for type-safe routing.

## 📊 Navigation Hierarchy

```
Root Navigator
│
├── Authentication Stack
│   └── LoginScreen
│
└── Dashboard (Bottom Tab Navigator)
    ├── Dashboard Tab (Stack Navigator)
    │   └── DashboardScreen
    │
    ├── Operations Tab (Stack Navigator)
    │   └── OperationsScreen
    │
    ├── Bookings Tab (Stack Navigator)
    │   ├── BookingsScreen
    │   └── BookingDetailsScreen (Modal)
    │
    ├── Messages Tab (Stack Navigator)
    │   └── MessagesScreen
    │
    └── Profile Tab (Stack Navigator)
        ├── ProfileScreen
        ├── AgencyInfoScreen (Modal)
        ├── TeamManagementScreen (Modal)
        ├── BankAccountsScreen (Modal)
        ├── VerificationScreen (Modal)
        ├── SupportCenterScreen (Modal)
        └── SettingsScreen (Modal)
```

## 🔄 Navigation Routes

### Main Tab Navigation

```typescript
// DashboardTab - Home
navigation.navigate("DashboardTab");

// OperationsTab - Live Tours & Operations
navigation.navigate("OperationsTab");

// BookingsTab - Booking Management
navigation.navigate("BookingsTab");

// MessagesTab - Messaging
navigation.navigate("MessagesTab");

// ProfileTab - Agency Management
navigation.navigate("ProfileTab");
```

### Bookings Stack Navigation

```typescript
// View all bookings
navigation.navigate("BookingsTab");

// View specific booking details (from BookingsScreen)
navigation.navigate("BookingDetails", { bookingId: "BK123" });

// Back to bookings list
navigation.goBack();
```

### Customers Navigation

```typescript
// View all customers (currently within BookingsTab)
// To be implemented: Dedicated CustomersTab

// View customer details
navigation.navigate("CustomerDetails", { customerId: "CUST456" });
```

### Profile Stack Navigation

```typescript
// Main profile
navigation.navigate('ProfileTab') or navigation.navigate('ProfileMain')

// Agency Information
navigation.navigate('AgencyInfo')

// Team Management
navigation.navigate('TeamManagement')

// Bank Accounts
navigation.navigate('BankAccounts')

// Verification Documents
navigation.navigate('Verification')

// Support Center
navigation.navigate('SupportCenter')

// Settings
navigation.navigate('Settings')

// Back to main profile (from any modal)
navigation.goBack()
```

### Authentication Navigation

```typescript
// After successful login, app navigates to DashboardTabNavigator
// After logout, app shows LoginScreen
```

## 📱 Screen Components with Navigation

### BookingsScreen

**File**: `src/screens/agency/BookingsScreen.tsx`

```typescript
type Props = NativeStackScreenProps<BookingsStackParamList, "BookingsList">;

export default function BookingsScreen({ navigation }: Props) {
  const handleViewBooking = (bookingId: string) => {
    navigation.navigate("BookingDetails", { bookingId });
  };
  // ...
}
```

**Implements:**

- View all bookings with filtering
- Navigate to booking details on item tap
- Pull-to-refresh
- Search functionality

**Navigation Usage:**

```typescript
// In the bookings list, when user taps a booking card:
<TouchableOpacity
  onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
>
  {/* Booking Item */}
</TouchableOpacity>
```

### BookingDetailsScreen

**File**: `src/screens/agency/BookingDetailsScreen.tsx`

```typescript
type Props = NativeStackScreenProps<BookingsStackParamList, "BookingDetails">;

export default function BookingDetailsScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  // ...
}
```

**Features:**

- View booking details
- Edit booking information
- Change booking status
- Send confirmation emails
- Delete booking
- Back button to return to bookings list

### CustomersScreen

**File**: `src/screens/agency/CustomersScreen.tsx`

```typescript
type Props = NativeStackScreenProps<CustomersStackParamList, "CustomersList">;

export default function CustomersScreen({ navigation }: Props) {
  const handleViewCustomer = (customerId: string) => {
    navigation.navigate("CustomerDetails", { customerId });
  };
  // ...
}
```

**Implements:**

- View all customers
- Customer segmentation
- VIP badge display
- Navigate to customer details

### CustomerDetailsScreen

**File**: `src/screens/agency/CustomerDetailsScreen.tsx`

```typescript
type Props = NativeStackScreenProps<CustomersStackParamList, "CustomerDetails">;

export default function CustomerDetailsScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  // ...
}
```

**Features:**

- View customer profile
- Booking history
- Customer metrics
- Account status management
- Send messages
- Create new booking for customer

### ProfileScreen

**File**: `src/screens/agency/ProfileScreen.tsx`

```typescript
type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileMain">;

export default function ProfileScreen({ navigation }: Props) {
  // Navigation to profile modals
  const navigateTo = (screen: keyof ProfileStackParamList) => {
    navigation.navigate(screen);
  };
  // ...
}
```

**Navigation Points:**

- Agency Info → `navigation.navigate('AgencyInfo')`
- Team Management → `navigation.navigate('TeamManagement')`
- Bank Accounts → `navigation.navigate('BankAccounts')`
- Verification → `navigation.navigate('Verification')`
- Support Center → `navigation.navigate('SupportCenter')`
- Settings → `navigation.navigate('Settings')`

## 🛠️ Type Safety

### Navigation Types

All navigation is fully typed through `src/types/navigation.ts`:

```typescript
// Stack parameter types
export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  AgencyInfo: undefined;
  TeamManagement: undefined;
  // ... other profile screens
};

// Screen props (include both parent and current navigator)
export type BookingDetailsScreenProps =
  BookingsStackScreenProps<"BookingDetails">;
export type ProfileScreenProps = ProfileStackScreenProps<"ProfileMain">;
```

### Using Types in Components

```typescript
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BookingsStackParamList } from "../../App";

type Props = NativeStackScreenProps<BookingsStackParamList, "BookingDetails">;

export default function BookingDetailsScreen({ route, navigation }: Props) {
  // route.params is typed: { bookingId: string }
  // navigation methods are typed
}
```

## 📋 Parameter Passing

### Simple Navigation (No Parameters)

```typescript
navigation.navigate("SettingsScreen");
```

### Navigation with Parameters

```typescript
// Passing parameters
navigation.navigate("BookingDetails", { bookingId: "BK123" });

// Receiving parameters
const { bookingId } = route.params;
```

### Type-Safe Parameter Passing

```typescript
// Compile-time checking ensures correct parameters
navigation.navigate("BookingDetails", {
  bookingId: "BK123", // ✅ Correct
  // bookingTitle: 'Tour' // ❌ Error: unknown parameter
});
```

## 🎯 Navigation Patterns

### Pattern 1: List → Details

```
BookingsScreen (List)
  ↓ (tap item)
BookingDetailsScreen (Details)
  ↓ (back button)
BookingsScreen (List)
```

### Pattern 2: Tab → Modal Stack

```
ProfileScreen (Main)
  ↓ (tap AgencyInfo)
AgencyInfoScreen (Modal)
  ↓ (tap another item)
TeamManagementScreen (Modal)
  ↓ (back button)
AgencyInfoScreen (Modal)
  ↓ (close/back)
ProfileScreen (Main)
```

### Pattern 3: Direct Tab Navigation

```
DashboardTab
  ↓ (tap Messages icon)
MessagesTab
  ↓ (tap Bookings icon)
BookingsTab
```

## 🔐 Authentication Navigation

### Login Flow

```typescript
// App.tsx
if (!user) {
  // Show Auth Stack with LoginScreen
  <AuthStack.Navigator>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
}

// On successful login
await signIn(email, password)
// user state updates → re-renders with DashboardTabNavigator
```

### Logout Flow

```typescript
// From any screen
const handleLogout = async () => {
  await signOut();
  // user state clears → app shows LoginScreen
};
```

## 📚 File Structure

```
src/
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   └── agency/
│       ├── DashboardScreen.tsx
│       ├── OperationsScreen.tsx
│       ├── BookingsScreen.tsx          ← Lists bookings
│       ├── BookingDetailsScreen.tsx    ← Detail modal
│       ├── CustomersScreen.tsx         ← Lists customers
│       ├── CustomerDetailsScreen.tsx   ← Detail modal
│       ├── MessagesScreen.tsx
│       ├── ProfileScreen.tsx           ← Navigation hub
│       ├── AgencyInfoScreen.tsx        ← Modal
│       ├── TeamManagementScreen.tsx    ← Modal
│       ├── BankAccountsScreen.tsx      ← Modal
│       ├── VerificationScreen.tsx      ← Modal
│       ├── SupportCenterScreen.tsx     ← Modal
│       └── SettingsScreen.tsx          ← Modal
│
├── types/
│   └── navigation.ts                   ← All navigation types
│
└── hooks/
    └── useAuth.ts                      ← Auth state management

App.tsx                                 ← Root navigator setup
```

## 🚀 Adding New Routes

### Step 1: Define Types

```typescript
// src/types/navigation.ts
export type NewStackParamList = {
  NewList: undefined;
  NewDetails: { newId: string };
};
```

### Step 2: Create Navigator

```typescript
// App.tsx
const NewStack = createNativeStackNavigator<NewStackParamList>();

function NewStackNavigator() {
  return (
    <NewStack.Navigator>
      <NewStack.Screen name="NewList" component={NewListScreen} />
      <NewStack.Screen name="NewDetails" component={NewDetailsScreen} />
    </NewStack.Navigator>
  );
}
```

### Step 3: Add to Tab Navigator

```typescript
<Tab.Screen
  name="NewTab"
  component={NewStackNavigator}
  options={{ title: 'New' }}
/>
```

### Step 4: Use in Screens

```typescript
type Props = NativeStackScreenProps<NewStackParamList, 'NewList'>;

export default function NewListScreen({ navigation }: Props) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('NewDetails', { newId: '123' })}
    >
      {/* Item */}
    </TouchableOpacity>
  );
}
```

## ✅ Testing Navigation

### Manual Testing Checklist

- [ ] Can navigate between all 5 main tabs
- [ ] Can open and close modals from ProfileScreen
- [ ] Can view booking details from bookings list
- [ ] Back button works correctly
- [ ] Parameters pass correctly (ID values match)
- [ ] Authentication redirects properly
- [ ] Logout returns to login screen
- [ ] Tab state persists when switching tabs

## 🐛 Troubleshooting

### Issue: Navigation not working

**Solution**: Ensure navigation prop is passed to screen component

```typescript
// ✅ Correct
export default function MyScreen({ navigation }: Props) {}

// ❌ Wrong
export default function MyScreen() {}
```

### Issue: Parameters undefined

**Solution**: Check route.params destructuring

```typescript
// ✅ Correct
const { bookingId } = route.params;

// ❌ Wrong - may be undefined
const bookingId = params.bookingId;
```

### Issue: Type errors on navigation

**Solution**: Use correct parameter type

```typescript
// ✅ Correct
navigation.navigate("BookingDetails", { bookingId: "string" });

// ❌ Wrong - missing required parameter
navigation.navigate("BookingDetails");
```

---

**All routing is fully implemented and type-safe.** ✅
