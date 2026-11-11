# Profile & Settings Integration - Quick Reference

## Screen Location
- **File**: `d:\tra\app\screens\profile.tsx`
- **Component**: ProfileScreen (default export)
- **Navigation Tab**: "Account" (via BottomNav)

## Feature Overview

### Notifications Section
```typescript
// Toggle Push Notifications
<Switch value={settings.notifications} onValueChange={(value) => saveSetting("notifications", value)} />

// Toggle Email Notifications
<Switch value={settings.emailNotifications} onValueChange={(value) => saveSetting("emailNotifications", value)} />
```

### Theme Section (Dark Mode)
```typescript
// Toggle Dark Mode
<Switch value={settings.darkMode} onValueChange={(value) => saveSetting("darkMode", value)} />
```

### Language Selection
```typescript
// Opens modal with 8 language options
onPress={() => setShowLanguageModal(true)}

// Languages available:
// - English (US)
// - English (UK)
// - Spanish (ES)
// - French
// - German
// - Chinese (Simplified)
// - Japanese
// - Arabic
```

### Currency Selection
```typescript
// Opens modal with 6 currency options
onPress={() => setShowCurrencyModal(true)}

// Currencies available:
// - USD ($)
// - EUR (€)
// - GBP (£)
// - JPY (¥)
// - AUD (A$)
// - CAD (C$)
```

### Password Change
```typescript
// Opens modal with 3 input fields
onPress={() => setChangePasswordModal(true)}

// Validates:
// - Current password (not empty)
// - New password (min 8 chars)
// - Confirm password (matches new password)
```

### 2FA (Two-Factor Authentication)
```typescript
// Opens modal with 2-step flow
onPress={() => {
  setShow2FAModal(true);
  setShow2FACode(false);
}}

// Step 1: Enable 2FA button
// Step 2: Enter verification code (6 digits)
// Step 3: Verify & Enable button
```

### Logout
```typescript
// Shows confirmation alert
onPress={handleLogout}

// Alert options:
// - Cancel (dismiss)
// - Logout (destructive style - calls signOut)
```

## State Variables

```typescript
interface SettingsState {
  notifications: boolean;           // Push notifications
  emailNotifications: boolean;       // Email notifications
  darkMode: boolean;                // Dark mode toggle
  twoFactorAuth: boolean;           // 2FA enabled status
  language: string;                 // Selected language
  currency: string;                 // Selected currency code
}
```

## Key Functions

### saveSetting(key, value)
Saves individual setting to database
```typescript
await userRepository.updateSetting(key, value);
```

### handleChangePassword()
Validates and changes password
- Requires all 3 fields
- Password must be 8+ characters
- Passwords must match
- Shows success/error alert

### handleLogout()
Logs out with confirmation
- Shows alert asking for confirmation
- Calls signOut() on confirm
- Redirects to login page

## Modals

### Language Modal
- Title: "Select Language"
- Content: 8 languages
- Selection: Checkmark on selected language
- Save: Automatically on selection
- Close: X button or tap outside (if not fullscreen)

### Currency Modal
- Title: "Select Currency"
- Content: 6 currencies with codes
- Selection: Checkmark on selected currency
- Save: Automatically on selection
- Close: X button

### Password Change Modal
- Title: "Change Password"
- Fields: Current, New, Confirm
- Button: "Change Password"
- Validation: Client-side, server-side via userRepository

### 2FA Modal
- Title: "Two-Factor Authentication"
- Step 1: Description + "Enable 2FA" button
- Step 2: "Enter verification code" + input + "Verify & Enable" button
- Back button: Returns to step 1
- Close: X button

## Colors & Styling

```typescript
PRIMARY = "#287dfa"  // Blue

// Backgrounds
Background: "#f9fafb"
Card: "#ffffff"

// Text
Primary: "#111827"
Secondary: "#6b7280"
Tertiary: "#9ca3af"

// UI
Border: "#e5e7eb"
Divider: "#f3f4f6"
Error: "#ef4444"

// Icon backgrounds
Icon bg: PRIMARY + "12" (20% opacity)
Error icon bg: "#ef444420" (13% opacity)
```

## Usage

### Import
```typescript
import ProfileScreen from '@/app/screens/profile';

// Used in navigation/routing automatically
```

### Integration with Navigation
The screen is integrated with:
- `BottomNav` - Shows as "Account" tab
- `AiPill` - Floating action button
- `router` - For navigation (back, to help page, logout redirect)

## Data Flow

```
Load Screen
   ↓
Check user authentication
   ↓
Load Profile Data (userRepository.getProfile)
   ↓
Load Settings Data (userRepository.getSettings)
   ↓
Display Profile + Settings UI
   ↓
User Interaction
   ↓
Toggle/Update Setting
   ↓
Call saveSetting(key, value)
   ↓
Update State
   ↓
Update Database (userRepository.updateSetting)
   ↓
UI Reflects New Setting
```

## Error Handling

- **Settings Load Error**: Falls back to defaults, logs to console
- **Save Error**: Shows alert "Failed to save setting"
- **Password Change Error**: Shows detailed error message
- **Logout Error**: Shows alert "Failed to logout"
- **All async operations**: Wrapped in try-catch

## Accessibility Features

- Proper label/value hierarchy
- Touch targets 40x40 px minimum
- Clear icons for visual recognition
- Descriptive subtitles for context
- Alert confirmations for destructive actions
- Checkmarks for visual feedback on selections
- Color-coded buttons (red for destructive actions)

## Performance Notes

- Single data load on component mount
- Settings cached in state to avoid unnecessary API calls
- Individual setting saves (not bulk update)
- Modals rendered conditionally (not hidden, actually removed from DOM)
- ScrollView with optimized content
- No re-renders on unrelated state changes

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Settings not saving | Check userRepository connection |
| Modal not opening | Verify showXXXModal state is being set |
| Keyboard covering input | Modal uses ScrollView with contentInsetAdjustmentBehavior |
| Password validation failing | Ensure password is 8+ chars and matches |
| Navigation redirect not working | Check router import from expo-router |

---

**Last Updated**: June 12, 2026  
**Version**: 2.0  
**File Size**: ~18KB  
**Lines**: 600+
