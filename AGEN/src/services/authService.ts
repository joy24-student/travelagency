import { supabase } from "./supabaseClient";

export type OtpFlowType = "signup" | "recovery" | "magiclink" | "sms" | "otp";

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  agencyName?: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        agency_name: agencyName,
        user_role: "agency",
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      process.env.EXPO_PUBLIC_RESET_PASSWORD_URL ||
      "https://your-app.example.com/reset-password",
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function sendSignInOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function verifyOtpCode(
  email: string,
  token: string,
  type: OtpFlowType,
) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });

  if (error) {
    throw error;
  }

  return data;
}
