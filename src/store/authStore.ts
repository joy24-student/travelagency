/**
 * Auth Store (Zustand)
 * Encrypted session management, user profile, and fine-grained role permissions.
 */

import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { userRepository } from "../repositories";
import { UserProfile } from "../repositories/types";
import {
  clearTokens,
  storeTokens,
} from "../services/secureStorage";
import {
  getCurrentUser,
  getSession,
  safeRefreshSession,
  setupTokenRefreshInterceptor,
  supabase,
} from "../utils/supabase";
import { secureStateStorage } from "./storage";

export interface RolePermissions {
  is_admin: boolean;
  is_agency: boolean;
  is_hotel_staff: boolean;
  is_user: boolean;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  // Role permissions
  is_admin: boolean;
  is_agency: boolean;
  is_hotel_staff: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<UserProfile | null>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  initializeAuth: () => () => void;
}

function resolveRolePermissions(user: User | null, profile: UserProfile | null): RolePermissions {
  if (!user) {
    return {
      is_admin: false,
      is_agency: false,
      is_hotel_staff: false,
      is_user: false,
    };
  }

  const appRole = (user.app_metadata?.role as string) || "";
  const metaRole = (user.user_metadata?.role as string) || "";
  const profileRole = profile?.role || "";

  const isAdmin =
    appRole === "admin" ||
    appRole === "super_admin" ||
    metaRole === "admin" ||
    profileRole === "admin" ||
    user.user_metadata?.is_admin === true;

  const isAgency =
    appRole === "agency" ||
    appRole === "business" ||
    metaRole === "agency" ||
    profileRole === "agency" ||
    profileRole === "business" ||
    user.user_metadata?.is_agency === true;

  const isHotelStaff =
    appRole === "hotel_staff" ||
    appRole === "partner" ||
    metaRole === "hotel_staff" ||
    profileRole === "hotel_staff" ||
    profileRole === "partner" ||
    user.user_metadata?.is_hotel_staff === true;

  return {
    is_admin: isAdmin,
    is_agency: isAgency,
    is_hotel_staff: isHotelStaff,
    is_user: true,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,
      error: null,
      is_admin: false,
      is_agency: false,
      is_hotel_staff: false,

      setSession: (session) => {
        const user = session?.user || null;
        const perms = resolveRolePermissions(user, get().profile);
        set({
          session,
          user,
          isAuthenticated: !!session,
          is_admin: perms.is_admin,
          is_agency: perms.is_agency,
          is_hotel_staff: perms.is_hotel_staff,
        });

        if (session) {
          storeTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
            userId: session.user.id,
          });
        }
      },

      setProfile: (profile) => {
        const perms = resolveRolePermissions(get().user, profile);
        set({
          profile,
          is_admin: perms.is_admin,
          is_agency: perms.is_agency,
          is_hotel_staff: perms.is_hotel_staff,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      fetchProfile: async () => {
        try {
          const profile = await userRepository.getProfile();
          if (profile) {
            get().setProfile(profile);
          }
          return profile;
        } catch {
          return null;
        }
      },

      updateProfile: async (data) => {
        const currentProfile = get().profile;
        const user = get().user;
        const targetId = currentProfile?.id || user?.id;

        if (!targetId) {
          throw new Error("Cannot update profile: No active user");
        }

        const updated = await userRepository.updateProfile(targetId, data);
        get().setProfile(updated);
        return updated;
      },

      loginWithEmail: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          if (data.session) {
            get().setSession(data.session);
            await get().fetchProfile();
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          const msg = err?.message || "Login failed";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore network errors during signout
        } finally {
          await clearTokens();
          set({
            session: null,
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            is_admin: false,
            is_agency: false,
            is_hotel_staff: false,
          });
        }
      },

      refreshSession: async () => {
        const { data, error } = await safeRefreshSession();
        if (error || !data.session) {
          return false;
        }
        get().setSession(data.session);
        return true;
      },

      initializeAuth: () => {
        set({ isLoading: true });

        // 1. Initial session hydration
        getSession().then((session) => {
          if (session) {
            get().setSession(session);
            get().fetchProfile();
          }
          set({ isLoading: false });
        });

        // 2. Setup proactive background token refresh scheduler
        const cleanupRefreshInterceptor = setupTokenRefreshInterceptor();

        // 3. Supabase auth change subscription
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            get().setSession(session);
            if (event === "SIGNED_IN") {
              await get().fetchProfile();
            }
          } else if (event === "SIGNED_OUT") {
            get().setSession(null);
            set({ profile: null, isAuthenticated: false });
          }
        });

        return () => {
          cleanupRefreshInterceptor();
          subscription.unsubscribe();
        };
      },
    }),
    {
      name: "auth_store",
      storage: createJSONStorage(() => secureStateStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        is_admin: state.is_admin,
        is_agency: state.is_agency,
        is_hotel_staff: state.is_hotel_staff,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          state.isLoading = false;
        }
      },
    },
  ),
);
