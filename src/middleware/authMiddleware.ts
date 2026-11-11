/**
 * Auth Middleware & Route Protection
 * Handles protected routes and role-based access
 */

import { useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import React from "react";
import { safeRefreshSession, supabase } from "../utils/supabase";

export type UserRole = "user" | "business" | "admin" | "professional";

/**
 * Auth guard hook
 * Redirects to login if not authenticated
 * Usage: Call at the beginning of protected screens
 */
export const useAuthGuard = () => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, loading };
};

/**
 * Role guard hook
 * Redirects if user doesn't have required role
 * Usage: Call at the beginning of role-specific screens
 */
export const useRoleGuard = (requiredRoles: UserRole[]) => {
  const router = useRouter();
  const { user, getUserRole, loading, isAuthenticated } = useAuth();
  const [userRole, setUserRole] = React.useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      if (loading) return;

      if (!isAuthenticated || !user) {
        setRoleLoading(false);
        router.replace("/(auth)/login");
        return;
      }

      try {
        const role = await getUserRole();
        if (!isMounted) return;

        setUserRole(role);

        if (!role || !requiredRoles.includes(role)) {
          // Redirect to main app home tab if user doesn't have permission
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.error("Role check error:", error);
        if (isMounted) {
          router.replace("/(tabs)");
        }
      } finally {
        if (isMounted) {
          setRoleLoading(false);
        }
      }
    };

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [user, loading, isAuthenticated, getUserRole, router]);

  return { hasRequiredRole: userRole ? requiredRoles.includes(userRole) : false, roleLoading };
};

/**
 * Subscription guard hook
 * Checks if user has active subscription
 * Usage: For premium feature screens
 */
export const useSubscriptionGuard = () => {
  const [loading, setLoading] = React.useState(true);
  const [hasSubscription, setHasSubscription] = React.useState<boolean | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        if (!user) {
          setHasSubscription(false);
          return;
        }

        // Query user subscriptions from your database
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("status, expires_at")
          .eq("user_id", user.id)
          .filter("expires_at", "gte", new Date().toISOString())
          .filter("status", "in", "(active,trialing)")
          .single();

        if (error) {
          console.error("Subscription check error:", error);
          setHasSubscription(false);
          return;
        }

        setHasSubscription(!!data);
      } catch (error) {
        console.error("Subscription check error:", error);
        setHasSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkSubscription();
    } else {
      setHasSubscription(false);
      setLoading(false);
    }
  }, [user]);

  return { hasSubscription, loading };
};

/**
 * Email verification guard hook
 * Redirects if user hasn't verified email
 * Usage: For email-sensitive screens
 */
export const useEmailVerificationGuard = () => {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      // Redirect to email verification screen
      router.replace("/(auth)/email-verification");
    }
  }, [user, router]);

  return { isVerified: user?.email_confirmed_at ? true : false };
};

/**
 * Deep link guard hook
 * Validates deep link tokens and redirects appropriately
 * Usage: Handle deep links from email confirmations, password resets, etc.
 */
export const useDeepLinkGuard = (token?: string, type?: "password-reset" | "email-verify") => {
  const router = useRouter();
  const [tokenValid, setTokenValid] = React.useState<boolean | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token || !type) {
        setTokenValid(false);
        return;
      }

      try {
        // Token is already validated by Supabase URL parsing
        // Just ensure it's in the correct format
        setTokenValid(token.length > 0);
      } catch (error) {
        console.error("Token validation error:", error);
        setTokenValid(false);
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 2000);
      }
    };

    validateToken();
  }, [token, type, router]);

  return { tokenValid };
};

/**
 * Session expiry guard
 * Warns user and redirects if session is about to expire
 * Usage: Long-running operations
 */
export const useSessionExpiryGuard = (expiryWarningMinutes = 5) => {
  const router = useRouter();
  const { user } = useAuth();
  const [expiryWarning, setExpiryWarning] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkExpiry = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.expires_at) return;

        const expiresAt = session.expires_at * 1000; // Convert to ms
        const now = Date.now();
        const minutesRemaining = (expiresAt - now) / (1000 * 60);

        setTimeRemaining(Math.ceil(minutesRemaining));

        if (minutesRemaining < expiryWarningMinutes && minutesRemaining > 0) {
          // Attempt proactive silent refresh before expiry warning
          const { data: refreshData, error: refreshError } = await safeRefreshSession();
          if (!refreshError && refreshData?.session) {
            setExpiryWarning(false);
            return;
          }
          setExpiryWarning(true);
        }

        if (minutesRemaining <= 0) {
          // Attempt silent refresh first!
          const { data: refreshData, error: refreshError } = await safeRefreshSession();
          if (!refreshError && refreshData?.session) {
            // Refreshed silently without disturbing the user!
            setExpiryWarning(false);
            return;
          }

          // Session truly expired and refresh failed
          try {
            await AsyncStorage.setItem(
              "@app:session_expired_message",
              "আপনার সেশন শেষ হয়ে গেছে, দয়া করে আবার লগইন করুন।"
            );
          } catch {}

          await supabase.auth.signOut();
          router.replace("/(auth)/login?expired=1");
        }
      } catch (error) {
        console.error("Session expiry check error:", error);
      }
    };

    // Check immediately
    checkExpiry();

    // Check every minute
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [user, expiryWarningMinutes, router]);

  return { expiryWarning, timeRemaining };
};

/**
 * Protected screen wrapper component
 * Wraps screens that require authentication
 */
export const ProtectedScreen: React.FC<{
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireEmailVerified?: boolean;
  requireSubscription?: boolean;
}> = ({
  children,
  requiredRoles,
  requireEmailVerified = false,
  requireSubscription = false,
}) => {
  useAuthGuard();

  if (requiredRoles) {
    const { hasRequiredRole, roleLoading } = useRoleGuard(requiredRoles);
    if (roleLoading) return null;
    if (!hasRequiredRole) {
      // Could render a permission denied message instead of returning null
      return null;
    }
  }

  if (requireEmailVerified) {
    useEmailVerificationGuard();
  }

  if (requireSubscription) {
    const { hasSubscription } = useSubscriptionGuard();
    if (hasSubscription === false) {
      // Render upgrade prompt or redirect
      return null;
    }
  }

  return React.createElement(React.Fragment, null, children);
};


