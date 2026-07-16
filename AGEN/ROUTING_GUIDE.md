# 🧭 Agency Portal - Complete Navigation & Routing Guide

## Navigation Architecture Overview

The Agency Portal uses a hybrid navigation structure with **Tab Navigation** for main sections and **Stack Navigation** for modals and nested flows.

```
┌─────────────────────────────────────────────┐
│          Root Navigator                      │
│  ┌─────────────────────────────────────┐   │
│  │    Authentication Stack             │   │
│  │  └─ LoginScreen                     │   │
│  └─────────────────────────────────────┘   │
│                     OR                      │
│  ┌─────────────────────────────────────┐   │
│  │  Dashboard Tab Navigator (5 Tabs)   │   │
│  │  ├─ Dashboard Tab                   │   │
│  │  ├─ Operations Tab                  │   │
│  │  ├─ Bookings Tab                    │   │
│  │  ├─ Messages Tab                    │   │
│  │  └─ Profile Tab                     │   │
│  │      └─ Profile Stack Navigator     │   │
│  │          ├─ ProfileMain (Screen)    │   │
│  │          ├─ AgencyInfo (Modal)      │   │
│  │          ├─ TeamManagement (Modal)  │   │
│  │          ├─ BankAccounts (Modal)    │   │
│  │          ├─ Verification (Modal)    │   │
│  │          ├─ SupportCenter (Modal)   │   │
│  │          └─ Settings (Modal)        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Tab Navigation (Primary)

### DashboardTabNavigator

**Purpose**: Main navigation with 5 tabs at bottom

| Tab Name   | Screen                | Icon     | Route Name      |
| ---------- | --------------------- | -------- | --------------- |
| Dashboard  | DashboardScreen       | grid     | `DashboardTab`  |
| Operations | OperationsScreen      | settings | `OperationsTab` |
| Bookings   | BookingsScreen        | calendar | `BookingsTab`   |
| Messages   | MessagesScreen        | mail     | `MessagesTab`   |
| Profile    | ProfileStackNavigator | person   | `ProfileTab`    |

### Navigation Usage in Screens

**From Dashboard Tab:**

```typescript
navigation.navigate("OperationsTab");
navigation.navigate("BookingsTab");
navigation.navigate("MessagesTab");
navigation.navigate("ProfileTab");
```

---

## Stack Navigation (Profile)

### ProfileStackNavigator

**Purpose**: Nested stack inside Profile tab for modal screens

**Route Structure:**

```
ProfileTab (from tab navigator)
  └─ ProfileStackNavigator
      ├─ ProfileMain (base screen, shows profile page)
      ├─ AgencyInfo (modal)
      ├─ TeamManagement (modal)
      ├─ BankAccounts (modal)
      ├─ Verification (modal)
      ├─ SupportCenter (modal)
      └─ Settings (modal)
```

**Navigation from ProfileScreen:**

```typescript
navigation.navigate("AgencyInfo");
navigation.navigate("TeamManagement");
navigation.navigate("BankAccounts");
navigation.navigate("Verification");
navigation.navigate("SupportCenter");
navigation.navigate("Settings");
```

**Returning from Modal:**

```typescript
navigation.goBack();
```

---

## Navigation Routes Reference

### Main Tab Routes

```typescript
// Navigate from any tab to another tab
navigation.navigate("DashboardTab"); // Dashboard
navigation.navigate("OperationsTab"); // Operations
navigation.navigate("BookingsTab"); // Bookings
navigation.navigate("MessagesTab"); // Messages
navigation.navigate("ProfileTab"); // Profile (main)
```

### Profile Modal Routes

```typescript
// Must be navigated from within Profile tab or ProfileScreen
// Format: navigation.navigate('RouteName')
navigation.navigate("AgencyInfo"); // Edit agency details
navigation.navigate("TeamManagement"); // Manage team members
navigation.navigate("BankAccounts"); // Manage bank accounts
navigation.navigate("Verification"); // Manage verification docs
navigation.navigate("SupportCenter"); // Support & help desk
navigation.navigate("Settings"); // App settings & preferences
```

---

## Implementation Example

### Navigating to a Modal from ProfileScreen

**ProfileScreen.tsx:**

```typescript
import type { ProfileScreenProps } from '../../types/navigation';

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  return (
    <ListItem
      title="Team Management"
      onPress={() => navigation.navigate('TeamManagement')}
    />
  );
}
```

### Navigating Between Tabs from Any Screen

```typescript
// From Dashboard Screen
<Button
  title="Go to Bookings"
  onPress={() => navigation.navigate('BookingsTab')}
/>

// From Operations Screen
<Button
  title="Go to Messages"
  onPress={() => navigation.navigate('MessagesTab')}
/>
```

### Closing Modal and Returning to Profile

```typescript
// In AgencyInfoScreen
<Button
  title="Save & Close"
  onPress={() => {
    // Save data
    navigation.goBack();
  }}
/>
```

---

## Type-Safe Navigation

### Available Screen Props Types

**For Tab Screens:**

```typescript
import type {
  DashboardScreenProps,
  OperationsScreenProps,
  BookingsScreenProps,
  MessagesScreenProps,
} from "../../types/navigation";

// Usage in component
export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  navigation.navigate("BookingsTab");
}
```

**For Profile Stack Screens:**

```typescript
import type {
  ProfileScreenProps,
  AgencyInfoScreenProps,
  TeamManagementScreenProps,
} from "../../types/navigation";

// Usage
export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  navigation.navigate("AgencyInfo");
}
```

---

## Navigation Service Utility

For global/centralized navigation without passing the navigation prop:

**Usage:**

```typescript
import { NavigationService, ROUTES } from "../../utils/navigationService";

// Somewhere in your app (usually in App.tsx root)
NavigationService.setNavigation(navigationRef);

// Then use from anywhere
NavigationService.navigateToDashboard();
NavigationService.navigateToBookings();
NavigationService.navigateToAgencyInfo();
NavigationService.goBack();
```

---

## Deep Linking Support

The app supports deep links for direct navigation:

```
shopnojatra://dashboard
shopnojatra://operations
shopnojatra://bookings
shopnojatra://messages
shopnojatra://profile
shopnojatra://profile/agency-info
shopnojatra://profile/team
shopnojatra://profile/bank
shopnojatra://profile/verification
shopnojatra://profile/support
shopnojatra://profile/settings
shopnojatra://login
```

---

## Common Navigation Patterns

### Pattern 1: Tab Navigation

```typescript
// Navigate to another tab
const { navigation } = props;
navigation.navigate("BookingsTab");
```

### Pattern 2: Modal Navigation

```typescript
// Navigate to modal in Profile stack
navigation.navigate("AgencyInfo");
```

### Pattern 3: Closing Modal

```typescript
// Return to previous screen
navigation.goBack();
```

### Pattern 4: Navigate to Specific Tab (from any screen)

```typescript
// From inside a modal or any screen
navigation.navigate("ProfileTab", {
  screen: "ProfileMain",
});
```

---

## Screen Hierarchy

### Level 0: Root

- Determines if user is logged in
- Shows either AuthStack or AppStack

### Level 1: AuthStack (if not logged in)

- LoginScreen

### Level 1: AppStack (if logged in)

- DashboardTabNavigator with 5 tabs

### Level 2: Individual Tab Screens

- DashboardScreen
- OperationsScreen
- BookingsScreen
- MessagesScreen
- ProfileStackNavigator (special: nested stack)

### Level 3: Profile Modals (nested in ProfileStackNavigator)

- ProfileScreen (ProfileMain)
- AgencyInfoScreen
- TeamManagementScreen
- BankAccountsScreen
- VerificationScreen
- SupportCenterScreen
- SettingsScreen

---

## Navigation Params

### Passing Parameters to Screens

**Sending:**

```typescript
navigation.navigate("AgencyInfo", {
  agencyId: "12345",
  mode: "edit",
});
```

**Receiving:**

```typescript
export default function AgencyInfoScreen({ route }: AgencyInfoScreenProps) {
  const { agencyId, mode } = route.params;
}
```

---

## Navigation Options

### Screen Options Configuration

**Modal Presentation:**

```typescript
options={{
  presentation: 'modal',
  cardStyle: { backgroundColor: COLORS.background },
}}
```

**Header Configuration:**

```typescript
options={{
  headerShown: false,  // Hide header
}}
```

**Card Style:**

```typescript
options={{
  cardStyle: { backgroundColor: COLORS.background },
}}
```

---

## Best Practices

1. **Always use TypeScript types** for navigation props
2. **Keep route names consistent** across navigators
3. **Use navigation.goBack()** instead of hard-coded routes for modals
4. **Test navigation flows** on both iOS and Android
5. **Handle back button** behavior appropriately
6. **Use deep linking** for external links and notifications
7. **Avoid deeply nested navigation** for performance
8. **Clean up listeners** on unmount

---

## Troubleshooting

### Modal Not Appearing

**Problem**: Navigation to modal screen doesn't show modal
**Solution**: Ensure the screen is defined in the correct stack navigator

### Wrong Tab Highlighted

**Problem**: Tab indicator doesn't match current screen
**Solution**: Make sure you're navigating to exact route name (e.g., 'BookingsTab' not 'Bookings')

### Navigation Prop Missing

**Problem**: `Cannot read property 'navigate' of undefined`
**Solution**: Ensure component receives proper navigation props type

### Going Back Not Working

**Problem**: `navigation.goBack()` doesn't work
**Solution**: Verify screen is part of a stack navigator, not just tab

---

## File Structure for Navigation

```
src/
├── types/
│   └── navigation.ts              # All navigation types
├── utils/
│   └── navigationService.ts       # Navigation helper service
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   └── agency/
│       ├── DashboardScreen.tsx
│       ├── OperationsScreen.tsx
│       ├── BookingsScreen.tsx
│       ├── MessagesScreen.tsx
│       ├── ProfileScreen.tsx      # Profile base
│       ├── AgencyInfoScreen.tsx
│       ├── TeamManagementScreen.tsx
│       ├── BankAccountsScreen.tsx
│       ├── VerificationScreen.tsx
│       ├── SupportCenterScreen.tsx
│       └── SettingsScreen.tsx
└── App.tsx                        # Root navigation setup
```

---

## Testing Navigation

### Manual Testing Checklist

- [ ] Dashboard → Operations (tab swipe)
- [ ] Operations → Bookings (tab navigation)
- [ ] Bookings → Messages (tab swipe)
- [ ] Messages → Profile (tab navigation)
- [ ] Profile → Agency Info (modal)
- [ ] Agency Info → Back to Profile (close modal)
- [ ] Profile → Team Management (modal)
- [ ] Team Management → Back to Profile
- [ ] Profile → Settings (modal)
- [ ] Settings → Back to Profile
- [ ] From Dashboard → navigate to Profile
- [ ] Modal appears with correct styling

---

**Navigation Integration Complete ✅**

All screens are now properly routed with type-safe navigation and full modal support.
