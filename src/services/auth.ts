import { supabase } from "../utils/supabase";

export type EmailOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email" | "sms_otp" | "sms";

const authRedirectTo = (path: string) => {
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  return baseUrl ? `${baseUrl}${path}` : undefined;
};

export const authService = {
  // Sign up with email
  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: authRedirectTo("/email-verification"),
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign in with email
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign in with OAuth (Google, Facebook, etc)
  async signInWithOAuth(provider: "google" | "facebook" | "apple") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "shopnojatra://auth/callback",
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    return data;
  },

  // Send a passwordless email or phone OTP for sign in
  async sendOtp(identifier: string, shouldCreateUser: boolean = false) {
    const isPhone = /^\+?[0-9\s()-]+$/.test(identifier.trim());
    
    if (isPhone) {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: identifier.trim(),
        options: { shouldCreateUser }
      });
      if (error) throw error;
      return data;
    } else {
      // For email, use signInWithOtp without emailRedirectTo to get OTP codes
      const { data, error } = await supabase.auth.signInWithOtp({
        email: identifier.trim(),
        options: {
          shouldCreateUser,
          // Don't set emailRedirectTo - this forces OTP code delivery
        },
      });
      if (error) throw error;
      return data;
    }
  },

  // Send a one-click passwordless Magic Link
  async sendMagicLink(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "converted-travel-ui://auth/callback",
      },
    });
    if (error) throw error;
    return data;
  },

  // Verify OTP codes for email or phone sign in
  async verifyOtp(identifier: string, token: string, type: EmailOtpType) {
    const isPhone = /^\+?[0-9\s()-]+$/.test(identifier.trim());
    const payload = isPhone
      ? { phone: identifier.trim() }
      : { email: identifier.trim() };

    // Map common types to Supabase types
    let supabaseType = type;
    if (type === "email") supabaseType = "magiclink";
    if (type === "signup" && !isPhone) supabaseType = "signup";

    const { data, error } = await supabase.auth.verifyOtp({
      ...payload,
      token,
      type: supabaseType as any,
    });

    if (error) throw error;
    return data;
  },

  // Resend signup email verification
  async resendEmailVerification(email: string) {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: authRedirectTo("/email-verification"),
      },
    });

    if (error) throw error;
    return data;
  },

  // Exchange an auth callback code from a Supabase email link
  async exchangeCodeForSession(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data;
  },

  // Verify token_hash links from Supabase emails
  async verifyTokenHash(tokenHash: string, type: EmailOtpType) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Reset password - use OTP instead of link
  async resetPassword(email: string) {
    // Use OTP method for password reset
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      // Don't set redirectTo - this forces OTP code delivery
    });

    if (error) throw error;
    return data;
  },

  // Verify password reset OTP and update password (supports both numeric OTP and 8-digit token hash)
  async verifyPasswordResetOtp(email: string, token: string, newPassword: string) {
    let verified = false;
    // 1. Try standard numeric OTP
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (!otpError) {
      verified = true;
    } else {
      // 2. Fallback: Try as token_hash if 8-digit or alphanumeric token received (see FIX_8_DIGIT_OTP.md)
      const { error: hashError } = await supabase.auth.verifyOtp({
        email,
        token_hash: token,
        type: 'recovery',
      });
      if (!hashError) {
        verified = true;
      } else {
        throw otpError;
      }
    }

    // Now update the password
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;
    return updateData;
  },

  // Sign in with a passkey. On supported devices this can invoke Face ID,
  // Touch ID, Windows Hello, Android biometrics, or another platform authenticator.
  async signInWithBiometric() {
    const { data, error } = await supabase.auth.signInWithPasskey();
    if (error) throw error;
    return data;
  },

  // Register a passkey for the current signed-in user
  async registerBiometric() {
    const { data, error } = await supabase.auth.registerPasskey();
    if (error) throw error;
    return data;
  },

  // Update password
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  // Get current user
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (error.message?.includes("Auth session missing")) return null;
      throw error;
    }
    return user;
  },

  // Get current session
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      if (error.message?.includes("Auth session missing")) return null;
      throw error;
    }
    return session;
  },

  // Check if user exists by email without triggering rate-limits or brute-force locks
  async checkUserExists(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return false;
    }

    // 1. Try Backend API endpoint if configured
    try {
      const backendUrl =
        process.env.EXPO_PUBLIC_API_URL ||
        process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        const response = await fetch(`${backendUrl}/api/v1/auth/check-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.data?.exists !== undefined) {
            return Boolean(result.data.exists);
          }
        }
      }
    } catch {
      // Backend request fallback to Supabase
    }

    // 2. Try Supabase RPC check_user_exists
    try {
      const { data, error } = await supabase.rpc("check_user_exists", {
        user_email: cleanEmail,
      });

      if (!error && typeof data === "boolean") {
        return data;
      }
    } catch {
      // RPC failed, check profiles table
    }

    // 3. Fallback: Query public user_profiles table safely
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch {
      // Silent catch
    }

    return false;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (isAuthenticated: boolean, user: any) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const isAuthenticated = !!session?.user;
      callback(isAuthenticated, session?.user);
    });

    return () => subscription?.unsubscribe();
  },
};