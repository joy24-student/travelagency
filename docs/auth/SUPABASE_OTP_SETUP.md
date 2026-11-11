# Supabase OTP Configuration Guide

## Problem
Supabase is sending magic links instead of OTP codes for email authentication and password reset.

## Solution
Configure Supabase to use OTP (One-Time Password) codes instead of magic links.

---

## Steps to Configure Supabase for OTP

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

---

### 2. Configure Password Reset Email Template

1. Click on **"Reset Password"** template
2. Replace the email template content with an OTP-focused template:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>You requested to reset your password for your Trip.com account.</p>

<p>Your verification code is:</p>

<h1 style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3166ee;">
  {{ .Token }}
</h1>

<p>This code will expire in 60 minutes.</p>

<p>If you didn't request this, please ignore this email.</p>

<p>Thanks,<br>The Trip.com Team</p>
```

3. Click **Save**

---

### 3. Configure Magic Link Email Template (for OTP Sign-in)

1. Click on **"Magic Link"** template
2. Replace with OTP-focused content:

```html
<h2>Sign In to Your Account</h2>

<p>Hi there,</p>

<p>Use this code to sign in to your Trip.com account:</p>

<h1 style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3166ee;">
  {{ .Token }}
</h1>

<p>This code will expire in 60 minutes.</p>

<p>If you didn't request this, please ignore this email.</p>

<p>Thanks,<br>The Trip.com Team</p>
```

3. Click **Save**

---

### 4. Configure Authentication Settings

1. Go to **Authentication** → **Settings**
2. Scroll to **"Auth Providers"** section
3. Ensure **Email** is enabled
4. Under **Email Auth Configuration**:
   - Set **"Enable email confirmations"** to `false` (for testing) or `true` (for production)
   - Set **"Secure email change"** to your preference
   - Set **"Mailer OTP Expiration"** to `3600` (60 minutes)
5. Scroll to **"Security and Protection"** section
6. Find **"Email OTP Length"** and set to `6`
7. Click **Save**

**IMPORTANT:** If you still see 8-digit codes:
1. Go to **Authentication** → **URL Configuration**
2. Set **"Site URL"** to your app's URL (e.g., `exp://localhost:8081`)
3. Remove any **"Redirect URLs"** that might trigger magic links
4. Click **Save**

---

### 5. Update Email Template Variables (Optional)

If you want a custom OTP length:

1. Go to **Authentication** → **Settings**
2. Scroll to **"Email OTP Settings"**
3. Set **OTP Length** to `6` (recommended)
4. Set **OTP Expiry** to `3600` seconds (60 minutes)

---

## Testing the Configuration

### Test Password Reset OTP

1. Open your app
2. Go to Login → Forgot Password
3. Enter your email
4. Check your email for a **6-digit code** (not a link)
5. Enter the code in the app
6. Set a new password

### Test Email Sign-in OTP

1. Use the "Continue with Email" option (if implemented)
2. Enter your email
3. Check for a **6-digit code**
4. Enter the code to sign in

---

## Important Notes

### OTP Token Format

Supabase generates OTP tokens in the format:
- **6 digits** by default (e.g., `123456`)
- Can be configured to be 4-8 digits

### OTP Expiry

- Default: **60 minutes**
- Recommended: **10-60 minutes** depending on security needs

### Security Considerations

✅ **DO:**
- Use 6-digit OTPs for better security
- Set reasonable expiry times (10-30 mins)
- Rate limit OTP requests to prevent abuse
- Use HTTPS for all API calls

❌ **DON'T:**
- Use OTPs shorter than 4 digits
- Set expiry longer than 60 minutes
- Send OTPs via unencrypted channels

---

## Troubleshooting

### Issue: Still receiving magic links

**Solution:**
1. Clear browser cache
2. Check email template is saved correctly
3. Verify `emailRedirectTo` is NOT set in the app code
4. Restart your app server

### Issue: OTP not working

**Solution:**
1. Check Supabase logs: **Authentication** → **Logs**
2. Verify email provider is configured (SMTP)
3. Check spam folder
4. Verify OTP hasn't expired

### Issue: "Invalid OTP" error

**Solution:**
1. Ensure you're using the correct email
2. Check OTP hasn't expired
3. Verify you're entering all 6 digits
4. Request a new OTP

---

## Code Changes Already Made

The following files have been updated to support OTP:

1. **`src/services/auth.ts`**
   - ✅ `sendOtp()` - Sends OTP without redirect links
   - ✅ `resetPassword()` - Sends OTP for password reset
   - ✅ `verifyPasswordResetOtp()` - Verifies OTP and resets password

2. **`app/(auth)/forgot-password.tsx`**
   - ✅ OTP input modal
   - ✅ Password reset with OTP verification
   - ✅ 6-digit OTP input fields

3. **`app/(auth)/login.tsx`**
   - ✅ Email login with OTP support
   - ✅ 4-digit OTP modal (can be changed to 6)

---

## Next Steps

1. ✅ Configure Supabase dashboard as described above
2. ✅ Test password reset flow
3. ✅ Test email sign-in flow
4. ✅ Update OTP length if needed (4 or 6 digits)
5. ✅ Configure rate limiting in production

---

## Support

If you encounter issues:

1. Check Supabase documentation: [https://supabase.com/docs/guides/auth/auth-email-otp](https://supabase.com/docs/guides/auth/auth-email-otp)
2. Review Supabase logs in the dashboard
3. Test with different email providers
4. Verify environment variables are set correctly

---

**Configuration Status:** ✅ Code Updated | ⏳ Dashboard Configuration Pending
