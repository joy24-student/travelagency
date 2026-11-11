# Email Login with User Existence Check

## ✅ Feature: Smart Email Login Flow

The login screen now intelligently detects if a user exists and handles signup/signin accordingly.

---

## 🔄 How It Works

### Flow Diagram

```
User enters email
       ↓
Check if user exists in database
       ↓
   ┌───────┴───────┐
   ↓               ↓
EXISTS          NEW USER
   ↓               ↓
Show password   Send OTP
field           for signup
   ↓               ↓
Login with      Verify OTP
password        & create account
```

---

## 📋 Implementation Details

### 1. User Existence Check

**When:** User enters email and tabs/clicks out of the email field

**What happens:**
- App calls `authService.checkUserExists(email)`
- Checks Supabase `auth.users` table via RPC function
- Returns `true` if user exists, `false` if new user

### 2. Existing User Flow

**If user exists:**
- ✅ Password field appears
- ✅ "Forgot password?" link shown
- ✅ User can login with email + password
- ✅ Standard authentication flow

### 3. New User Flow

**If user doesn't exist:**
- ✅ OTP is automatically sent to email
- ✅ Modal closes, OTP modal opens
- ✅ User enters 6-digit verification code
- ✅ Account is created upon successful verification
- ✅ User is logged in automatically

---

## 🛠️ Required Setup

### Step 1: Create Supabase RPC Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Check if user exists by email
CREATE OR REPLACE FUNCTION check_user_exists(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_exists(text) TO authenticated, anon;
```

**Or:** Use the file `supabase_user_check_function.sql` in the project root.

### Step 2: Configure Supabase Email Settings

Follow the guide in `SUPABASE_OTP_SETUP.md` to configure OTP emails.

---

## 🧪 Testing the Flow

### Test Existing User

```bash
1. Open app → Login → Continue with Email
2. Enter email of existing user
3. Wait for check (1-2 seconds)
4. ✅ Password field appears
5. Enter password and login
```

### Test New User

```bash
1. Open app → Login → Continue with Email
2. Enter email of new user
3. Wait for check (1-2 seconds)
4. ✅ OTP modal opens automatically
5. Check email for 6-digit code
6. Enter code → Account created & logged in
```

---

## 📁 Files Modified

```
✅ src/services/auth.ts
   - Added checkUserExists() method
   
✅ app/(auth)/login.tsx
   - Added user existence check on email blur
   - Conditional password field rendering
   - Automatic OTP sending for new users
   - Updated OTP to 6 digits
   
✅ supabase_user_check_function.sql (NEW)
   - SQL function for user existence check
```

---

## ⚙️ Configuration

### OTP Length

Current: **6 digits**

To change:
1. Update `otpValue` state: `useState(['', '', '', '', '', ''])` (6 empty strings)
2. Update validation: `if (token.length < 6)`
3. Update UI text: "6-digit code"

### Timeout Settings

- User check timeout: Instant (RPC call)
- OTP expiry: 60 minutes (Supabase default)
- Resend timer: 30 seconds

---

## 🔒 Security Considerations

### User Enumeration Prevention

The current implementation reveals if an email is registered. For high-security apps:

**Option 1:** Always show password field
- Remove user check
- Show generic error on failed login

**Option 2:** Rate limit checks
- Add rate limiting to `check_user_exists` RPC
- Prevent abuse of the endpoint

**Option 3:** Use CAPTCHA
- Add CAPTCHA before email check
- Prevent automated enumeration

### Current Security Measures

✅ RPC function uses `SECURITY DEFINER`
✅ Only checks existence, doesn't return user data
✅ Requires valid email format
✅ OTP codes expire after 60 minutes
✅ Password must meet Supabase requirements

---

## 🐛 Troubleshooting

### Issue: "Function check_user_exists does not exist"

**Solution:**
1. Run the SQL function in Supabase SQL Editor
2. Verify it appears in Database → Functions
3. Check permissions are granted

**Fallback:** If function doesn't exist, code falls back to password attempt method

### Issue: Password field doesn't appear

**Solution:**
1. Check Supabase connection
2. Verify email format is valid
3. Check console for errors
4. Ensure user actually exists in auth.users

### Issue: OTP not sent for new users

**Solution:**
1. Verify Supabase email settings
2. Check SMTP configuration
3. Review Supabase logs
4. Confirm `sendOtp()` is called

---

## 📊 User Experience

### Loading States

- **Checking email:** "Checking email..." message
- **Sending OTP:** Modal transition with animation
- **Verifying OTP:** Button shows "Verifying..."

### Success Messages

- **New user:** "Verification code sent!"
- **OTP verified:** "Verification Successful!" with checkmark animation

### Error Handling

- Invalid email format: No check performed
- Network error: Falls back to password method
- Invalid OTP: "Verification failed" alert

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Add name collection for new users**
   - Collect first/last name before OTP
   - Store in user_metadata

2. **Add rate limiting**
   - Limit email checks per IP
   - Prevent enumeration attacks

3. **Add analytics**
   - Track signup vs signin ratio
   - Monitor OTP success rate

4. **Add social signup**
   - Allow Google/Facebook for new users
   - Link accounts if email matches

---

## 📞 Support

- **RPC Function Docs:** https://supabase.com/docs/guides/database/functions
- **Auth API Docs:** https://supabase.com/docs/reference/javascript/auth-api
- **OTP Setup:** See `SUPABASE_OTP_SETUP.md`

---

**Status:** ✅ Code Complete | ⚠️ Requires Supabase RPC Function Setup
