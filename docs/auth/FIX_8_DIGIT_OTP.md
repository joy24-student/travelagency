# Fix 8-Digit OTP Issue in Supabase

## Problem
Receiving 8-digit tokens instead of 6-digit OTP codes.

## Root Cause
Supabase is sending **token hashes** (used for magic links) instead of **numeric OTP codes**.

---

## ✅ Solution: Configure Supabase for Numeric OTPs

### Step 1: Update Email Templates to Use {{ .Token }}

1. Go to Supabase Dashboard → **Authentication** → **Email Templates**
2. Select **"Reset Password"** template
3. Replace content with:

```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3166ee; font-family: monospace;">
  {{ .Token }}
</h1>
<p><strong>This code expires in 60 minutes.</strong></p>
<p>If you didn't request this, please ignore this email.</p>
```

4. Click **Save**

### Step 2: Configure OTP Settings

1. Go to **Authentication** → **Settings**
2. Scroll to **"Mailer Settings"** or **"Email Settings"**
3. Find **"Mailer OTP Exp"** or **"OTP Expiration"**
4. Set to **3600** (60 minutes)

### Step 3: Remove Redirect URLs (CRITICAL)

This is the key step that causes 8-digit hashes:

1. Go to **Authentication** → **URL Configuration**
2. Under **"Redirect URLs"**, remove ALL URLs except:
   - Your production URL (if any)
3. **Leave the list minimal or empty for development**
4. Click **Save**

### Step 4: Update Site URL

1. In **URL Configuration**, set **"Site URL"** to:
   - Development: `http://localhost:3000` or `exp://localhost:8081`
   - Production: Your actual domain
2. Click **Save**

### Step 5: Verify Email Provider Settings

1. Go to **Project Settings** → **Auth**
2. Scroll to **"SMTP Settings"**
3. Ensure email provider is configured
4. Test by sending a password reset

---

## Alternative: Use Token Hash (If 8-digit persists)

If Supabase still sends 8-digit token hashes, use `verifyOtp` with `token_hash`:

Update `src/services/auth.ts`:

```typescript
// Verify password reset OTP with token_hash support
async verifyPasswordResetOtp(email: string, token: string, newPassword: string) {
  try {
    // Try numeric OTP first
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (error && error.message.includes('invalid')) {
      // Fallback: Try as token_hash
      const { data: hashData, error: hashError } = await supabase.auth.verifyOtp({
        email,
        token_hash: token,
        type: 'recovery',
      });

      if (hashError) throw hashError;
      
      // Update password after verification
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
      return hashData;
    }

    if (error) throw error;

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;
    return data;
  } catch (error) {
    throw error;
  }
},
```

---

## Testing

### Test 1: Check Email Content

1. Trigger password reset
2. Check email
3. Verify format:
   - ✅ **6 digits** (e.g., 123456) → OTP working
   - ❌ **8+ alphanumeric** (e.g., a1b2c3d4) → Still using token hash

### Test 2: App Verification

1. Enter code in app
2. Check console for errors
3. Should see success message

---

## Why This Happens

| Condition | Result |
|-----------|--------|
| `redirectTo` set in code | 8-digit token hash |
| Redirect URLs configured | 8-digit token hash |
| No redirects + {{ .Token }} | 6-digit OTP ✅ |

---

## Quick Fix Checklist

- [ ] Email template uses `{{ .Token }}`
- [ ] Removed all redirect URLs
- [ ] Set Site URL correctly
- [ ] No `redirectTo` in code
- [ ] SMTP configured
- [ ] OTP expiry set to 3600
- [ ] Test email received
- [ ] Verify 6 digits

---

## If Still Not Working

### Check Code

Ensure no `emailRedirectTo` in auth service:

```typescript
// ❌ WRONG - Causes token hash
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://...'
});

// ✅ CORRECT - Sends OTP
await supabase.auth.resetPasswordForEmail(email);
```

### Clear Supabase Cache

1. Sign out of Supabase dashboard
2. Clear browser cache
3. Sign back in
4. Re-save email templates

### Contact Supabase Support

If OTP still doesn't work, it may be a plan limitation or configuration issue with your Supabase project.

---

**Status:** All fixes applied in code. Requires Supabase dashboard configuration.
