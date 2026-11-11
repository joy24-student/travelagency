# Google Login Implementation Guide

## Overview
This document describes the implementation of Google Sign-In functionality in the React Native application using Expo and Supabase Auth.

## Components Added

### 1. OAuth Service (`src/services/oauth.ts`)
- Updated to use the newer `@react-native-google-signin/google-signin` library
- Includes proper error handling for different Google Sign-In scenarios
- Integrates with Supabase Auth using ID tokens

### 2. Google Login Button Component (`src/components/GoogleLoginButton.tsx`)
- Reusable component for Google login
- Supports different sizes and colors
- Includes loading states and proper error handling

### 3. Updated Auth Context (`src/auth/context.tsx`)
- Added `signInWithGoogle` method
- Updated type definitions to include the new method

### 4. Updated App Layout (`app/_layout.tsx`)
- Initializes OAuth providers on app startup
- Ensures Google Sign-In is properly configured

### 5. Updated Login Screen (`app/(auth)/login.tsx`)
- Integrated the new GoogleLoginButton component
- Maintains fallback OAuth flow for Facebook

## Configuration Requirements

### Environment Variables
Add the following to your `.env` file:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
```

### Supabase Setup
1. Enable Google provider in your Supabase dashboard
2. Configure the redirect URLs:
   - For development: `exp://`
   - For production: Your app's deep link scheme

### Google Cloud Console Setup
1. Create a new OAuth 2.0 client ID for:
   - Web application (for universal login)
   - Android application (with SHA-1 fingerprint)
   - iOS application (with bundle ID)

2. Configure the authorized domains and redirect URIs

## Usage

### In Components
```typescript
import { GoogleLoginButton } from '../components';

// Example usage
<GoogleLoginButton
  onSuccess={(result) => console.log('Login successful:', result)}
  onError={(error) => console.error('Login failed:', error)}
  size="wide"
  color="dark"
/>
```

### Using the Auth Hook
```typescript
import { useAuth } from '../hooks/useAuth';

const { signInWithGoogle } = useAuth();

const handleGoogleLogin = async () => {
  try {
    const result = await signInWithGoogle();
    console.log('Google login successful:', result);
  } catch (error) {
    console.error('Google login failed:', error);
  }
};
```

## Security Considerations
- Tokens are stored securely using Expo SecureStore
- ID tokens are validated server-side by Supabase
- Proper nonce validation is enabled by default

## Error Handling
The implementation handles various error scenarios:
- `SIGN_IN_CANCELLED`: User cancelled the sign-in
- `IN_PROGRESS`: Sign-in operation already in progress
- `PLAY_SERVICES_NOT_AVAILABLE`: Google Play services not available (Android)

## Testing
To test the Google login functionality:
1. Ensure you have properly configured Google credentials
2. Run the app on a physical device (Google Sign-In doesn't work on simulators)
3. Tap the "Continue with Google" button
4. Select your Google account
5. Verify that you're signed in successfully

## Troubleshooting
- **On simulator/emulator**: Google Sign-In may not work properly; test on physical devices
- **Client ID mismatch**: Ensure the web client ID matches between Google Console and app config
- **SHA-1 fingerprint**: For Android, ensure the correct SHA-1 is registered in Google Console
- **Bundle ID**: For iOS, ensure the bundle ID matches the one registered in Google Console