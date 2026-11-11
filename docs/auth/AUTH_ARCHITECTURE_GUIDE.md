# Complete Expo + Supabase Authentication System
## Production-Ready Architecture Guide

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Auth Flow Diagrams](#auth-flow-diagrams)
3. [Supabase Session Management](#supabase-session-management)
4. [OAuth Implementation](#oauth-implementation)
5. [Folder Structure](#folder-structure)
6. [Implementation Guide](#implementation-guide)

---

## Architecture Overview

### Core Components
```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App (Expo)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐    ┌─────────────┐  │
│  │   UI Layer   │◄────►│ Auth Context │◄──►│   Hooks     │  │
│  │  (Screens)   │      │  (Provider)  │    │  (useAuth)  │  │
│  └──────────────┘      └──────────────┘    └─────────────┘  │
│                               ▲                               │
│                               │                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Auth Service Layer                          ││
│  │  ├─ Email/Password Auth                                  ││
│  │  ├─ OTP (Email/SMS/Phone)                               ││
│  │  ├─ OAuth (Google/Facebook) - Native                    ││
│  │  ├─ Session Management                                  ││
│  │  ├─ Token Refresh Logic                                 ││
│  │  └─ Secure Storage Integration                          ││
│  └──────────────────────────────────────────────────────────┘│
│                               ▲                               │
│                               │                               │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Supabase Client                             ││
│  │  ├─ Auth API (email/password, OTP, OAuth)               ││
│  │  ├─ Real-time Subscriptions                            ││
│  │  ├─ Database (user profiles, roles)                    ││
│  │  └─ JWT Token Management                               ││
│  └──────────────────────────────────────────────────────────┘│
│                               ▲                               │
└───────────────────────────────┼───────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
        ┌───────▼────────┐          ┌──────────▼─────┐
        │ Expo SecureStore│          │ Supabase Cloud │
        │  (Local Storage)│          │ (Backend)      │
        └────────────────┘          └────────────────┘
```

### Key Features
- **Multi-method Auth**: Email/password, OTP, Google, Facebook
- **Native OAuth**: No browser redirect (native Google Sign-In, Facebook SDK)
- **Session Management**: JWT + refresh token pattern
- **Secure Storage**: Expo SecureStore for tokens
- **Auto Session Restore**: On app launch
- **Role-based Access**: User, Business, Admin, Professional
- **Real-time Updates**: Supabase auth state subscriptions

---

## Auth Flow Diagrams

### 1. Email/Password Sign Up Flow
```
User Input
    │
    ▼
┌─────────────────────────┐
│ Sign Up Form Validation │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Create Auth User (Supabase Auth) │
│ + User Profile (Database)        │
└────────┬─────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Send Verification Email    │ ◄─── Magic Link with Token
│ (Email Link or Code)       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ User Clicks Link/Enters    │
│ Verification Code          │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Verify Email               │
│ + Create User Profile      │
│ + Store JWT Token          │
└────────┬───────────────────┘
         │
         ▼
    Dashboard
```

### 2. Email/Password Sign In Flow
```
User Input
    │
    ▼
┌──────────────────────────┐
│ Validate Credentials     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Supabase Auth.signInWithPassword  │
│ Returns: JWT + Refresh Token     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Store Tokens in          │
│ Expo SecureStore         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Set Auth Context State   │
│ user + authenticated     │
└────────┬─────────────────┘
         │
         ▼
    Dashboard
```

### 3. OTP (Phone/Email) Sign In Flow
```
User Phone/Email
    │
    ▼
┌─────────────────────────────────────┐
│ Send OTP via Email/SMS              │
│ (Supabase sendOtp)                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ User Enters 4-6 Digit Code          │
│ (From Email/SMS)                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Verify OTP Token                    │
│ (Supabase verifyOtp)                │
│ Returns: JWT + Refresh Token        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Create User Profile if New User     │
│ Store Tokens in SecureStore         │
└────────┬────────────────────────────┘
         │
         ▼
    Dashboard / Onboarding
```

### 4. Native Google Sign-In Flow (No Browser Redirect)
```
User Taps "Sign in with Google"
    │
    ▼
┌──────────────────────────────────────┐
│ Google Sign-In Native Prompt         │
│ (Expo GoogleSignIn or Native Module) │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Get ID Token from Google             │
│ (Contains user email, name, photo)   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Exchange ID Token for Supabase JWT   │
│ supabase.auth.signInWithIdToken()    │
│ provider: 'google'                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Supabase Creates/Updates User        │
│ Returns: JWT + Refresh Token         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Store Tokens in SecureStore          │
│ Upsert User Profile                  │
└────────┬─────────────────────────────┘
         │
         ▼
    Dashboard
```

### 5. Facebook Sign-In Flow (Similar to Google)
```
User Taps "Sign in with Facebook"
    │
    ▼
┌──────────────────────────────────────┐
│ Facebook Native SDK Login            │
│ (expo-facebook or react-native-sdk)  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Get Access Token + User Info         │
│ (Email, Name, Photo)                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Exchange Access Token for Supabase   │
│ supabase.auth.signInWithIdToken()    │
│ provider: 'facebook'                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Supabase Creates/Updates User        │
│ Returns: JWT + Refresh Token         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Store Tokens in SecureStore          │
│ Upsert User Profile                  │
└────────┬─────────────────────────────┘
         │
         ▼
    Dashboard
```

### 6. Session Recovery on App Restart
```
App Launches
    │
    ▼
┌──────────────────────────────────────┐
│ Check SecureStore for Tokens         │
└────────┬─────────────────────────────┘
         │
         ▼
    ┌────────────────────────┐
    │ Tokens Found?          │
    └─┬──────────────────┬───┘
      │ YES              │ NO
      ▼                  ▼
┌─────────────────┐  Show Login Screen
│ Validate JWT    │
│ - Exp time?     │
│ - Valid format? │
└─┬───────┬───────┘
  │ Valid │ Expired
  ▼       ▼
Update  Refresh Token
Context │
+ Load  ├──► Get New JWT
User    │   + Update SecureStore
Profile │   + Update Context
   │    │
   └─┬──┘
     ▼
  Ready for App
```

---

## Supabase Session Management

### How Sessions Work Internally

#### JWT Token Structure
```
JWT = Header.Payload.Signature

Payload contains:
{
  "sub": "user-uuid",           // User ID
  "aud": "authenticated",        // Audience
  "exp": 1234567890,            // Expiration time (unix)
  "iat": 1234567890,            // Issued at time
  "auth_time": 1234567890,      // Auth time
  "email": "user@example.com",
  "email_verified": true,
  "user_metadata": {
    "first_name": "John",
    "last_name": "Doe"
  },
  "role": "authenticated",      // Always "authenticated" for signed-in users
  "aal": "aal1",               // Assurance level (1 = single factor, 2 = MFA)
  "amr": [                      // Auth method reference
    { "method": "password", "timestamp": 1234567890 }
  ]
}
```

#### Refresh Token
```
- Long-lived token (30 days default)
- Stored securely
- Used to get new JWT when current expires
- Can be rotated or invalidated
- NOT sent to API endpoints
```

#### Session Management Flow
```
1. User signs in
   ├─ Supabase creates JWT (short-lived: ~1 hour)
   └─ Supabase creates Refresh Token (long-lived: 30 days)

2. Store both securely:
   ├─ JWT → Used in Authorization header for API calls
   └─ Refresh Token → Stored in SecureStore only

3. When JWT expires:
   ├─ Interceptor detects 401/403
   ├─ Use refresh token to get new JWT
   ├─ Update JWT in auth context
   └─ Retry original request

4. Sign out:
   ├─ Revoke refresh token on Supabase
   ├─ Clear both tokens from SecureStore
   └─ Clear auth context
```

#### Automatic Token Refresh
```typescript
// Supabase automatically handles refresh in:
// 1. Browser/Web: Uses cookies + silent refresh
// 2. Native: Manual implementation needed

// For Expo, implement:
setupTokenRefreshInterceptor() {
  1. Check JWT expiration before each API call
  2. If expiring within 5 min: call refreshSession()
  3. Get new JWT from refresh token
  4. Update context + storage
  5. Continue with request
}
```

### Session Persistence Strategy
```
App Lifecycle:
  ├─ Launch
  │  └─ Check SecureStore → Restore session
  │
  ├─ Foreground
  │  └─ Maintain active session
  │
  ├─ Background
  │  └─ Keep session (user may return)
  │
  └─ Terminate
     └─ Can optionally sync session state
```

---

## OAuth Implementation

### Why Native OAuth (No Browser Redirect)?

#### ❌ Browser Redirect Issues
```javascript
// Old approach (web redirect)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'exp://...' }
});
// Problem: Opens browser, worse UX, loses app context, requires app comeback

// For OAuth callback deeplink:
// exp://app/(auth)/oauth-callback?code=...&state=...
```

#### ✅ Native OAuth Solutions

**Option 1: Google Sign-In Native (Recommended)**
```javascript
import * as GoogleSignIn from 'expo-google-sign-in';

// User authenticates natively in Google prompt
// Returns ID token directly
// No browser needed
// Seamless UX
```

**Option 2: Facebook SDK**
```javascript
import * as Facebook from 'expo-facebook';

// Native Facebook app or web view (in-app)
// Returns access token
// No external browser redirect
```

**Option 3: Deep Link + Custom Tab (Fallback)**
```javascript
// For providers without native SDK
// Uses Chrome Custom Tab (Android) or SFSafariViewController (iOS)
// Returns to app via deep link
// Better than full browser
```

### Native Implementation Flow

```typescript
// 1. Setup (one-time in app)
async setupOAuth() {
  // Google
  await GoogleSignIn.askForPlayServicesAsync();
  GoogleSignIn.configure({
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  // Facebook
  await Facebook.initializeAsync({
    appId: 'YOUR_FACEBOOK_APP_ID',
  });
}

// 2. User clicks "Sign in with Google"
async signInWithGoogle() {
  try {
    // Native Google prompt appears
    const result = await GoogleSignIn.signInAsync();
    
    // Get ID token (JWT signed by Google)
    const { idToken } = result;
    
    // Exchange for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    
    // User now authenticated
    await storeTokens(data.session);
    updateAuthContext(data.user);
  } catch (error) {
    console.error('Google sign in failed:', error);
  }
}

// 3. User clicks "Sign in with Facebook"
async signInWithFacebook() {
  try {
    // Native Facebook login
    const result = await Facebook.logInWithPermissionsAsync({
      permissions: ['public_profile', 'email'],
    });
    
    // Get access token
    const { token } = result;
    
    // Get user info
    const response = await fetch(
      `https://graph.facebook.com/me?fields=email,name&access_token=${token}`
    );
    const userData = await response.json();
    
    // Exchange for Supabase (if Facebook provider supported)
    // OR create user profile directly
    await createOrUpdateUserProfile({
      email: userData.email,
      firstName: userData.name,
      provider: 'facebook',
    });
  } catch (error) {
    console.error('Facebook sign in failed:', error);
  }
}
```

---

## Folder Structure

### Production-Ready Organization
```
src/
├── auth/
│   ├── schemas.ts              # Zod validation schemas
│   ├── context.tsx             # Auth context provider
│   ├── types.ts                # Auth types & interfaces
│   └── constants.ts            # Auth constants
│
├── services/
│   ├── auth.ts                 # Core auth service (sign in/up, OTP, etc)
│   ├── oauth.ts                # Native OAuth implementations
│   ├── tokenRefresh.ts         # JWT refresh logic
│   └── secureStorage.ts        # Secure token storage
│
├── hooks/
│   ├── useAuth.ts              # Auth context hook
│   ├── useAuthGuard.ts         # Route protection hook
│   ├── useOAuthSignIn.ts       # OAuth sign-in hook
│   └── useSessionRestore.ts    # Session restore hook
│
├── middleware/
│   ├── authMiddleware.ts       # Auth state middleware
│   ├── tokenInterceptor.ts     # Token refresh interceptor
│   └── roleGuard.ts            # RBAC middleware
│
├── utils/
│   ├── supabase.ts             # Supabase client config
│   ├── deeplinks.ts            # Deep link handling
│   └── validators.ts           # Auth validators
│
├── constants/
│   ├── oauth.ts                # OAuth config (client IDs, etc)
│   └── auth.ts                 # Auth constants
│
└── config/
    └── authConfig.ts           # Central auth configuration

app/
├── (auth)/                      # Auth stack (logged out)
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   ├── forgot-password.tsx
│   ├── otp-verification.tsx
│   └── email-verification.tsx
│
├── (protected)/                 # Protected stack (logged in)
│   ├── _layout.tsx              # Auth check happens here
│   ├── (tabs)/                  # Main app tabs
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── profile.tsx
│   │   └── settings.tsx
│   ├── admin/                   # Admin screens (role-based)
│   │   ├── _layout.tsx
│   │   └── dashboard.tsx
│   └── business/                # Business screens (role-based)
│       ├── _layout.tsx
│       └── dashboard.tsx
│
├── _layout.tsx                  # Root layout (auth state check)
└── index.tsx                    # Root screen

database/
└── migrations/
    ├── 001_create_users_table.sql
    ├── 002_create_user_roles_table.sql
    ├── 003_create_user_profiles_table.sql
    └── 004_setup_rls_policies.sql

config/
└── env.example                  # Environment variables template
```

---

## Implementation Guide

### Step 1: Initialize Supabase Client
See `supabase.ts` - Set up with proper token refresh

### Step 2: Setup Auth Context Provider
See `auth/context.tsx` - Manage global auth state + auto restore

### Step 3: Implement Auth Service
See `services/auth.ts` - All auth methods (email, OTP, OAuth)

### Step 4: Setup Secure Storage
See `services/secureStorage.ts` - Encrypt and store tokens

### Step 5: Configure OAuth (Native)
See `services/oauth.ts` - Google & Facebook native implementations

### Step 6: Setup Protected Routes
See `middleware/authMiddleware.ts` - Route guards based on auth state

### Step 7: Implement Role-Based Access
See `middleware/roleGuard.ts` - Check user roles for screens

### Step 8: Setup App Layout
See `app/_layout.tsx` - Handle routing based on auth state

---

## Security Checklist

- ✅ Store tokens in Expo SecureStore (encrypted)
- ✅ Use HTTPS for all API calls
- ✅ Implement JWT expiration checks
- ✅ Refresh token automatically before expiry
- ✅ Revoke tokens on sign out
- ✅ Use RLS policies in Supabase database
- ✅ Never expose sensitive data in logs
- ✅ Validate OAuth tokens server-side
- ✅ Implement rate limiting on auth endpoints
- ✅ Use deep links securely (verify provider signature)

---

## Database Schema

```sql
-- Users table (created by Supabase Auth automatically)
-- Additional user profile
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User roles (RBAC)
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL, -- 'user', 'business', 'admin', 'professional'
  granted_at TIMESTAMP DEFAULT NOW()
);

-- OAuth provider mapping
CREATE TABLE oauth_providers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL, -- 'google', 'facebook', etc
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

## Environment Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OAuth (Google)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com

# OAuth (Facebook)
EXPO_PUBLIC_FACEBOOK_APP_ID=123456789

# Auth Redirect
EXPO_PUBLIC_AUTH_REDIRECT_URL=exp://

# Deep Links
EXPO_PUBLIC_DEEP_LINK_PREFIX=exp://
```

