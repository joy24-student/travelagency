# 🚀 Quick Setup Checklist

Complete these 3 steps to enable all authentication features:

---

## Step 1: Run SQL in Supabase (2 minutes)

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste this SQL:

```sql
CREATE OR REPLACE FUNCTION check_user_exists(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = user_email);
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_exists(text) TO authenticated, anon;
```

4. Click **Run**
5. ✅ Done!

---

## Step 2: Update Email Templates (3 minutes)

### A. Reset Password Template

1. Go to **Authentication** → **Email Templates**
2. Click **"Reset Password"**
3. Replace the email body with:

```html
<h2>Reset Your Password</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; color: #3166ee;">
  {{ .Token }}
</h1>
<p>This code expires in 60 minutes.</p>
```

4. Click **Save**

### B. Magic Link Template

1. Click **"Magic Link"**
2. Replace the email body with:

```html
<h2>Sign In Code</h2>
<p>Use this code to sign in:</p>
<h1 style="font-size: 32px; letter-spacing: 5px; color: #3166ee;">
  {{ .Token }}
</h1>
<p>This code expires in 60 minutes.</p>
```

3. Click **Save**

---

## Step 3: Enable Email OTP (1 minute)

1. Go to **Authentication** → **Settings**
2. Scroll to **Email OTP Settings**
3. Enable: ✅ **Enable Email OTP**
4. Set OTP Length: **6**
5. Set Expiry: **3600** (60 minutes)
6. Click **Save**

---

## ✅ That's It!

Now test your app:

```bash
npm start
```

### Test Password Reset:
1. Login → Forgot Password
2. Enter email
3. Check for 6-digit code (not a link!)
4. Reset password ✅

### Test New User Signup:
1. Login → Continue with Email
2. Enter new email
3. Gets OTP automatically
4. Verify and signup ✅

### Test Existing User:
1. Login → Continue with Email
2. Enter existing email
3. Password field appears
4. Login ✅

---

## 📖 Need More Details?

- Full guide: `SUPABASE_OTP_SETUP.md`
- Email flow: `EMAIL_LOGIN_USER_CHECK.md`
- Complete summary: `AUTH_SUMMARY.md`

---

**Total Setup Time: ~6 minutes** ⏱️
