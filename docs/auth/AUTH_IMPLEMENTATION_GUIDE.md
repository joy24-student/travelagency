# Complete Authentication Implementation Guide
## Step-by-Step Setup & Usage Examples

---

## 🚀 Quick Start (5 Minutes)

### 1. Setup Environment Variables

Create `.env.local` in project root:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (Get from Google Cloud Console)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx-yyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx-yyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx-yyy.apps.googleusercontent.com

# Facebook OAuth (Get from Facebook Developer Console)
EXPO_PUBLIC_FACEBOOK_APP_ID=123456789

# Deep Links
EXPO_PUBLIC_DEEP_LINK_PREFIX=exp://
```

### 2. Update app.json

```json
{
  "expo": {
    "plugins": [
      "expo-secure-store",
      "@react-native-async-storage/async-storage"
    ],
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "your-key",
      "googleWebClientId": "xxx.apps.googleusercontent.com",
      "googleIosClientId": "xxx.apps.googleusercontent.com",
      "googleAndroidClientId": "xxx.apps.googleusercontent.com",
      "facebookAppId": "123456789"
    },
    "scheme": "exp",
    "ios": {
      "bundleIdentifier": "com.yourcompany.app"
    },
    "android": {
      "package": "com.yourcompany.app"
    }
  }
}
```

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js expo-secure-store expo-google-sign-in expo-facebook
npm install -D typescript
```

---

## 📖 Component Usage Examples

### 1. Wrapping Your App

**app/_layout.tsx** (Already created)
```typescript
import { AuthProvider } from "../src/auth/context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### 2. Email/Password Sign Up

**app/(auth)/signup.tsx**
```typescript
import { useAuth } from "../../src/hooks/useAuth";
import { registerSchema, RegisterFormValues } from "../../src/auth/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function SignUpScreen() {
  const { signUp, loading } = useAuth();
  const { control, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signUp(data.email, data.password, data.firstName, data.lastName);
      // User will be signed up and redirected automatically
      // Email verification will be required
    } catch (error) {
      Alert.alert("Sign up failed", error.message);
    }
  });

  return (
    <View style={styles.container}>
      <AuthTextField control={control} name="firstName" label="First Name" />
      <AuthTextField control={control} name="lastName" label="Last Name" />
      <AuthTextField control={control} name="email" label="Email" />
      <AuthTextField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
      />
      <AuthTextField
        control={control}
        name="confirmPassword"
        label="Confirm Password"
        secureTextEntry
      />
      <Button
        title={loading ? "Signing up..." : "Sign Up"}
        onPress={onSubmit}
        disabled={loading}
      />
    </View>
  );
}
```

### 3. Email/Password Sign In

**app/(auth)/login.tsx** (Already created in your project)
```typescript
import { useAuth } from "../../src/hooks/useAuth";
import { loginSchema, LoginFormValues } from "../../src/auth/schemas";

export default function LoginScreen({ navigation }) {
  const { signIn, loading } = useAuth();
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signIn(data.email, data.password);
      // User will be signed in and redirected to protected screens
    } catch (error) {
      Alert.alert("Login failed", error.message);
    }
  });

  return (
    <View style={styles.container}>
      <AuthTextField control={control} name="email" label="Email" />
      <AuthTextField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
      />
      <Button
        title={loading ? "Signing in..." : "Sign In"}
        onPress={onSubmit}
        disabled={loading}
      />
    </View>
  );
}
```

### 4. Google Sign-In (Native)

```typescript
import { signInWithGoogle } from "../../src/services/oauth";

export default function LoginScreen() {
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await signInWithGoogle();
      
      if (error) throw error;
      
      // User will be automatically signed in
      // Auth context will update and redirect to protected screens
    } catch (error) {
      Alert.alert("Google sign-in failed", error.message);
    }
  };

  return (
    <View>
      <Button
        title="Sign In with Google"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
}
```

### 5. Facebook Sign-In (Native)

```typescript
import { signInWithFacebook } from "../../src/services/oauth";

export default function LoginScreen() {
  const handleFacebookSignIn = async () => {
    try {
      const { data, error } = await signInWithFacebook();
      
      if (error) throw error;
      
      // User will be automatically signed in
    } catch (error) {
      Alert.alert("Facebook sign-in failed", error.message);
    }
  };

  return (
    <View>
      <Button
        title="Sign In with Facebook"
        onPress={handleFacebookSignIn}
      />
    </View>
  );
}
```

### 6. OTP Verification (Email/SMS)

```typescript
import { useAuth } from "../../src/hooks/useAuth";

export default function OTPScreen() {
  const { sendOtp, verifyOtp, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");

  const handleSendOtp = async () => {
    try {
      await sendOtp(email);
      setStep("verify");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await verifyOtp(email, code, "email");
      // User will be automatically signed in
    } catch (error) {
      Alert.alert("Verification failed", error.message);
    }
  };

  return (
    <View>
      {step === "email" ? (
        <>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <Button
            title={loading ? "Sending..." : "Send OTP"}
            onPress={handleSendOtp}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            maxLength={6}
            keyboardType="number-pad"
          />
          <Button
            title={loading ? "Verifying..." : "Verify"}
            onPress={handleVerifyOtp}
            disabled={loading}
          />
        </>
      )}
    </View>
  );
}
```

### 7. Protected Screens (Auth Guard)

```typescript
import { useAuthGuard } from "../../src/middleware/authMiddleware";

export default function HomeScreen() {
  const { isAuthenticated, loading } = useAuthGuard();

  if (loading) {
    return <ActivityIndicator />;
  }

  // Only render if authenticated (useAuthGuard redirects if not)
  return (
    <View>
      <Text>Welcome! You're signed in.</Text>
    </View>
  );
}
```

### 8. Role-Based Access

```typescript
import { useRoleGuard } from "../../src/middleware/authMiddleware";

export default function AdminScreen() {
  // Redirect if user isn't admin
  const { userRole, loading } = useRoleGuard(["admin"]);

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>Admin Dashboard</Text>
    </View>
  );
}
```

### 9. Get Current User Info

```typescript
import { useAuth } from "../../src/hooks/useAuth";

export default function ProfileScreen() {
  const { user, getUserRole } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const getRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };

    if (user) {
      getRole();
    }
  }, [user, getUserRole]);

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Text>Role: {userRole || "user"}</Text>
    </View>
  );
}
```

### 10. Password Reset

```typescript
import { useAuth } from "../../src/hooks/useAuth";

export default function ForgotPasswordScreen() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");

  const handleResetPassword = async () => {
    try {
      await resetPassword(email);
      Alert.alert("Success", "Check your email for password reset link");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        title={loading ? "Sending..." : "Reset Password"}
        onPress={handleResetPassword}
        disabled={loading}
      />
    </View>
  );
}
```

### 11. Sign Out

```typescript
import { useAuth } from "../../src/hooks/useAuth";

export default function SettingsScreen() {
  const { signOut, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // User will be automatically redirected to login
    } catch (error) {
      Alert.alert("Sign out failed", error.message);
    }
  };

  return (
    <Button
      title={loading ? "Signing out..." : "Sign Out"}
      onPress={handleSignOut}
      disabled={loading}
    />
  );
}
```

---

## 🗄️ Database Setup

### SQL Migrations

**1. User Profiles Table**
```sql
create table public.user_profiles (
  id uuid primary key references auth.users(id),
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view their own profile" on user_profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on user_profiles
  for update using (auth.uid() = id);
```

**2. User Roles Table**
```sql
create table public.user_roles (
  id serial primary key,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('user', 'business', 'admin', 'professional')),
  granted_at timestamp default now(),
  granted_by uuid references auth.users(id),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can view their own roles" on user_roles
  for select using (auth.uid() = user_id);
```

**3. OAuth Providers Table**
```sql
create table public.oauth_providers (
  id serial primary key,
  user_id uuid not null references auth.users(id),
  provider text not null,
  provider_user_id text not null,
  created_at timestamp default now(),
  unique(provider, provider_user_id)
);

alter table public.oauth_providers enable row level security;
```

---

## 🔄 Session Flow Diagram

```
App Launch
    ├─ Check SecureStore for tokens
    │  ├─ Found → Restore session
    │  └─ Not found → Show login
    │
    ├─ Setup token refresh interceptor
    │  └─ Auto-refresh 5 min before expiry
    │
    ├─ Listen to auth state changes
    │  ├─ SIGNED_IN → Update context, redirect
    │  ├─ SIGNED_OUT → Clear state, redirect
    │  └─ USER_UPDATED → Refresh profile
    │
    └─ Conditional rendering
       ├─ isAuthenticated = true → Show protected screens
       └─ isAuthenticated = false → Show auth screens
```

---

## 🛡️ Security Checklist

- ✅ Tokens stored in SecureStore (encrypted)
- ✅ Automatic JWT refresh before expiry
- ✅ Session restoration on app launch
- ✅ Token revocation on sign out
- ✅ RLS policies in database
- ✅ HTTPS for all API calls (Supabase default)
- ✅ Never log sensitive data
- ✅ Validate OAuth tokens server-side (Supabase)
- ✅ Rate limiting enabled on auth endpoints
- ✅ Environment variables for sensitive config

---

## 🐛 Troubleshooting

### Tokens not persisting
- Ensure Expo SecureStore is installed: `expo install expo-secure-store`
- Check manifest permissions in app.json
- Verify env variables are loaded correctly

### OAuth not working
- Verify client IDs in env variables
- Check Google Cloud Console / Facebook Developer settings
- Ensure redirect URLs are configured
- Test on physical device (simulator may have issues)

### Session not restoring
- Check if tokens are stored in SecureStore
- Verify Supabase client config uses SecureStore
- Check network connectivity
- Review console logs for errors

### Infinite redirect loops
- Ensure AuthProvider wraps entire app
- Check route naming conventions
- Verify useAuthGuard isn't called outside protected screens
- Review Stack navigation setup

---

## 📱 Testing Checklist

- [ ] Email/password sign up works
- [ ] Email verification required
- [ ] Email/password sign in works
- [ ] OTP sign in works
- [ ] Google native sign-in works
- [ ] Facebook native sign-in works
- [ ] Token refresh works (leave app > 5 min < JWT expiry)
- [ ] Session restores on app restart
- [ ] Sign out clears tokens and redirects
- [ ] Protected screens blocked without auth
- [ ] Role-based access control works
- [ ] Password reset works
- [ ] User profile updates work
- [ ] Multiple concurrent sessions handled

