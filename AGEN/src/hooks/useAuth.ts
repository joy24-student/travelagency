/**
 * useAuth Hook
 * Authentication state management
 */

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import {
  agencyIdentityService,
  type AgencyProfile,
} from "../services/agencyService";
import {
  sendPasswordResetEmail as sendPasswordResetRequest,
  sendSignInOtp,
  signInWithPassword,
  signUpWithPassword,
  verifyOtpCode,
  type OtpFlowType,
} from "../services/authService";

interface User {
  id: string;
  email: string;
  agencyName: string;
  agency?: AgencyProfile | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();

    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const agency = await agencyIdentityService.getCurrentAgency(
          session.user.id,
        );
        const userData: User = {
          id: session.user.id,
          email: session.user.email || "",
          agencyName:
            agency?.name || session.user.user_metadata?.agency_name || "Agency",
          agency,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (data.session?.user) {
        const agency = await agencyIdentityService.getCurrentAgency(
          data.session.user.id,
        );
        const userData: User = {
          id: data.session.user.id,
          email: data.session.user.email || "",
          agencyName:
            agency?.name ||
            data.session.user.user_metadata?.agency_name ||
            "Agency",
          agency,
        };
        setUser(userData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await signInWithPassword(email, password);

      if (response && response.user) {
        try {
          const agency = await agencyIdentityService.getCurrentAgency(
            response.user.id,
          );
          const userData: User = {
            id: response.user.id,
            email: response.user.email || "",
            agencyName:
              agency?.name ||
              response.user.user_metadata?.agency_name ||
              "Agency",
            agency,
          };
          setUser(userData);
          return userData;
        } catch (agencyErr) {
          // If agency lookup fails, return user data without agency
          const userData: User = {
            id: response.user.id,
            email: response.user.email || "",
            agencyName: response.user.user_metadata?.agency_name || "Agency",
            agency: null,
          };
          setUser(userData);
          return userData;
        }
      }

      return null;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    agencyName?: string,
  ) => {
    try {
      setError(null);
      const response = await signUpWithPassword(email, password, agencyName);

      if (response && response.user) {
        try {
          const agency = await agencyIdentityService.getCurrentAgency(
            response.user.id,
          );
          const userData: User = {
            id: response.user.id,
            email: response.user.email || "",
            agencyName:
              agency?.name ||
              response.user.user_metadata?.agency_name ||
              agencyName ||
              "Agency",
            agency,
          };
          setUser(userData);
          return userData;
        } catch (agencyErr) {
          // If agency lookup fails, return user data without agency
          const userData: User = {
            id: response.user.id,
            email: response.user.email || "",
            agencyName:
              response.user.user_metadata?.agency_name ||
              agencyName ||
              "Agency",
            agency: null,
          };
          setUser(userData);
          return userData;
        }
      }

      return response || { user: null, session: null };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      setError(null);
      return await sendPasswordResetRequest(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const sendOtp = async (email: string) => {
    try {
      setError(null);
      return await sendSignInOtp(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOtp = async (email: string, token: string, type: OtpFlowType) => {
    try {
      setError(null);
      const response = await verifyOtpCode(email, token, type);

      if (response?.session?.user) {
        const user = response.session.user;
        try {
          const agency = await agencyIdentityService.getCurrentAgency(user.id);
          const userData: User = {
            id: user.id,
            email: user.email || "",
            agencyName:
              agency?.name || user.user_metadata?.agency_name || "Agency",
            agency,
          };
          setUser(userData);
          return userData;
        } catch (agencyErr) {
          // If agency lookup fails, return user data without agency
          const userData: User = {
            id: user.id,
            email: user.email || "",
            agencyName: user.user_metadata?.agency_name || "Agency",
            agency: null,
          };
          setUser(userData);
          return userData;
        }
      }

      return response || null;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    sendPasswordResetEmail,
    sendOtp,
    verifyOtp,
    signOut,
  };
}
