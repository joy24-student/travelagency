import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../utils/supabase";
import { makeRedirectUri } from "expo-auth-session";
import { signInWithFacebook, signInWithGoogle } from "../services/oauth";
import { clearTokens, storeTokens } from "./tokenStorage";
import { useAuthStore } from "../store/authStore";
import type {
  AuthContextType,
  AuthUser,
  OtpType,
  UserRole,
} from "./types";

export type { AuthContextType } from "./types";

const defaultContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  loading: true,
  signUp: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signIn: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signInWithOAuth: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signInWithGoogle: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signInWithFacebook: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signOut: async () => {
    throw new Error("AuthProvider not mounted");
  },
  sendOtp: async () => {
    throw new Error("AuthProvider not mounted");
  },
  verifyOtp: async () => {
    throw new Error("AuthProvider not mounted");
  },
  resetPassword: async () => {
    throw new Error("AuthProvider not mounted");
  },
  updatePassword: async () => {
    throw new Error("AuthProvider not mounted");
  },
  refreshSession: async () => {
    throw new Error("AuthProvider not mounted");
  },
  getUserRole: async () => null,
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.warn("AuthProvider getSession error:", error);
        setUser(null);
        useAuthStore.getState().setSession(null);
      } else if (session?.user) {
        setUser(session.user as unknown as AuthUser);
        useAuthStore.getState().setSession(session);
        useAuthStore.getState().fetchProfile();
      } else {
        setUser(null);
        useAuthStore.getState().setSession(null);
      }

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setUser((nextSession?.user as unknown as AuthUser) ?? null);
        useAuthStore.getState().setSession(nextSession);
        if (nextSession?.user) {
          useAuthStore.getState().fetchProfile();
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName,
        },
      },
    });

    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (params: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) throw error;
    if (data.session) {
      await storeTokens({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        userId: data.user?.id,
      });
      useAuthStore.getState().setSession(data.session);
      useAuthStore.getState().fetchProfile();
    }
    return data;
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "facebook" | "github" | "apple") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: makeRedirectUri({
          scheme: "shopnojatra",
          path: "auth/callback",
        }),
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signInWithGoogleProvider = useCallback(async () => {
    const { data, error } = await signInWithGoogle();
    if (error) throw error;
    return data;
  }, []);

  const signInWithFacebookProvider = useCallback(async () => {
    const { data, error } = await signInWithFacebook();
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await clearTokens();
    await useAuthStore.getState().logout();
    setUser(null);
    return true;
  }, []);

  /** Send OTP */
  const sendOtp = useCallback(async (identifier: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: identifier,
      options: { shouldCreateUser: true },
    });

    if (error) throw error;
    return data;
  }, []);

  /** Verify OTP */
  const verifyOtp = useCallback(
    async (identifier: string, token: string, type: OtpType = "email") => {
      const isPhone = type === "sms";
      const payload = isPhone
        ? { phone: identifier, token, type }
        : { email: identifier, token, type };

      const { data, error } = await supabase.auth.verifyOtp(payload);

      if (error) throw error;
      return data;
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "exp://reset-password",
    });
    if (error) throw error;
    return data;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;

    if (data.session) {
      await storeTokens({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        userId: data.user?.id,
      });
    }

    return data;
  }, []);

  const getUserRole = useCallback(async (): Promise<UserRole | null> => {
    if (!user) return null;

    try {
      // 1. Strict check against admin_users
      const { data: adminRecord } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (adminRecord) {
        return "admin";
      }

      // 2. Check agency partnership / business role
      const { data: agencyRecord } = await supabase
        .from("agencies")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (agencyRecord) {
        return "business";
      }

      // 3. Fallback to generic user_roles table if present
      const { data: roleRecord } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roleRecord?.role) {
        return roleRecord.role as UserRole;
      }

      return "user";
    } catch {
      return "user";
    }
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      loading,
      signUp,
      signIn,
      signInWithOAuth,
      signInWithGoogle: signInWithGoogleProvider,
      signInWithFacebook: signInWithFacebookProvider,
      signOut,
      sendOtp,
      verifyOtp,
      resetPassword,
      updatePassword,
      refreshSession,
      getUserRole,
    }),
    [
      user,
      isAuthenticated,
      loading,
      signUp,
      signIn,
      signInWithOAuth,
      signInWithGoogleProvider,
      signInWithFacebookProvider,
      signOut,
      sendOtp,
      verifyOtp,
      resetPassword,
      updatePassword,
      refreshSession,
      getUserRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}