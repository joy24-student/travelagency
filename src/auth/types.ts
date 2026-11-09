/**
 * Auth Types & Interfaces
 * Type definitions for authentication system
 */

/**
 * User role types for role-based access control
 */
export type UserRole = "user" | "business" | "admin" | "professional";

/**
 * Auth provider types
 */
export type AuthProvider = "email" | "google" | "facebook" | "apple" | "phone";

/**
 * OTP type for verification
 */
export type OtpType = "email" | "sms" | "signup" | "recovery" | "email_change" | "phone_change";

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * OAuth user info
 */
export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: AuthProvider;
}

/**
 * Auth session data
 */
export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: AuthUser;
}

/**
 * Auth user (from Supabase)
 */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  identities?: Array<{
    id: string;
    user_id: string;
    identity_data?: Record<string, any>;
    provider: string;
    created_at: string;
    updated_at: string;
    last_sign_in_at: string;
  }>;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  confirmation_sent_at?: string;
}

/**
 * Sign up form data
 */
export interface SignUpFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Sign in form data
 */
export interface SignInFormData {
  email: string;
  password: string;
}

/**
 * OTP verification form data
 */
export interface OtpVerifyFormData {
  email: string;
  code: string;
}

/**
 * Password reset form data
 */
export interface PasswordResetFormData {
  email: string;
}

/**
 * Password update form data
 */
export interface PasswordUpdateFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Auth error response
 */
export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Token data stored in SecureStore
 */
export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
}

/**
 * Login activity record
 */
export interface LoginActivity {
  id: string;
  user_id: string;
  device?: string;
  location?: string;
  ip_address?: string;
  user_agent?: string;
  login_at: string;
  logout_at?: string;
  is_active: boolean;
}

/**
 * User role assignment
 */
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: UserRole;
  granted_at: string;
  granted_by?: string;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  provider: "google" | "facebook" | "github" | "apple";
  clientId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  scopes?: string[];
}

/**
 * MFA configuration
 */
export interface MfaConfig {
  type: "sms" | "totp" | "webauthn";
  enabled: boolean;
  phone?: string;
  secret?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  signUp: (params: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<unknown>;
  signIn: (params: { email: string; password: string }) => Promise<unknown>;
  signInWithOAuth: (
    provider: "google" | "facebook" | "github" | "apple"
  ) => Promise<unknown>;
  signInWithGoogle: () => Promise<unknown>;
  signInWithFacebook: () => Promise<unknown>;
  signOut: () => Promise<boolean>;
  sendOtp: (identifier: string) => Promise<unknown>;
  sendMagicLink?: (email: string) => Promise<unknown>;
  verifyOtp: (
    identifier: string,
    token: string,
    type?: OtpType
  ) => Promise<unknown>;
  resetPassword: (email: string) => Promise<unknown>;
  updatePassword: (password: string) => Promise<unknown>;
  refreshSession: () => Promise<unknown>;
  getUserRole: () => Promise<UserRole | null>;
  loginAsDemo?: (role?: UserRole) => Promise<unknown>;
}
