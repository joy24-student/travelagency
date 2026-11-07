import React from "react";
import { UserProfileScreen } from "../../src/screens/UserProfileScreen";

/**
 * Integrated User Profile & Identity Hub Screen
 * 
 * Canonical Route: /screens/profile
 * Supports:
 * - Authenticated user profile, KYC document upload, loyalty tier, preferences, referral engine
 * - Public user profile view when ?userId=... param is passed
 */
export default function ProfileRoute() {
  return <UserProfileScreen />;
}
