import { supabase } from "../utils/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

// Use the scheme from app.json for the redirect URI
const REDIRECT_TO = makeRedirectUri({ scheme: "shopnojatra", path: "auth/callback" });

// Define types for better type safety
type OAuthProvider = "google" | "facebook";
type OAuthResult = {
  data: any | null;
  error: Error | null;
};

/**
 * Starts the OAuth sign-in flow with Google
 * @returns Promise resolving to auth data or error
 */
export const signInWithGoogle = async (): Promise<OAuthResult> => {
  return signInWithOAuth("google");
};

/**
 * Starts the OAuth sign-in flow with Facebook
 * @returns Promise resolving to auth data or error
 */
export const signInWithFacebook = async (): Promise<OAuthResult> => {
  return signInWithOAuth("facebook");
};

/**
 * Generic OAuth sign-in function for social providers
 * @param provider The OAuth provider name
 * @returns Promise resolving to auth data or error
 */
const signInWithOAuth = async (provider: OAuthProvider): Promise<OAuthResult> => {
  try {
    // Initiate OAuth sign in with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { 
        redirectTo: REDIRECT_TO, 
        skipBrowserRedirect: true 
      },
    });

    if (error) {
      console.error(`OAuth ${provider} error:`, error);
      return { data: null, error };
    }

    if (!data?.url) {
      const error = new Error("No OAuth URL returned from Supabase");
      return { data: null, error };
    }

    // Open the auth session in a browser
    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);

    // Handle the result of the auth session
    if (result.type === "success" && result.url) {
      // Extract the code from the redirect URL
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      
      if (code) {
        // Exchange the code for a session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          console.error(`Error exchanging code for session:`, sessionError);
          return { data: null, error: sessionError };
        }
        
        return { data: sessionData, error: null };
      } else {
        // Check for error parameters in the URL
        const errorParam = url.searchParams.get("error");
        if (errorParam) {
          const errorDescription = url.searchParams.get("error_description") || "Unknown OAuth error";
          return { data: null, error: new Error(`${errorParam}: ${errorDescription}`) };
        }
        
        // If we get here, something unexpected happened
        return { data: null, error: new Error("OAuth flow completed but no code or error found") };
      }
    } else if (result.type === "cancel") {
      return { data: null, error: new Error("OAuth flow was cancelled by user") };
    } else if (result.type === "dismiss") {
      return { data: null, error: new Error("OAuth flow was dismissed") };
    }

    // Default fallback error
    return { data: null, error: new Error("OAuth flow did not complete successfully") };
  } catch (error: any) {
    console.error(`Unexpected error during OAuth flow:`, error);
    return { data: null, error: new Error(`Unexpected error: ${error.message}`) };
  }
};

/**
 * Signs out the current user
 * @returns Promise resolving to success or error
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    return { error: error as Error };
  }
};

/**
 * Initializes OAuth providers (currently a placeholder for future enhancements)
 * @returns Promise resolving when initialization is complete
 */
export const initializeOAuthProviders = async (): Promise<void> => {
  // Initialize any necessary OAuth provider configurations
  // This could include fetching provider configurations from an API
  // or setting up custom OAuth flows in the future
  console.log("OAuth providers initialized");
};

export default { signInWithGoogle, signInWithFacebook, signOut, initializeOAuthProviders };