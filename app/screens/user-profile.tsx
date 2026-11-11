/**
 * @deprecated Use /screens/profile instead.
 * 
 * Canonical Route: /screens/profile
 * This file is maintained for backward compatibility with older links and redirects to the canonical route.
 */

import React, { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { UserProfileScreen } from "../../src/screens/UserProfileScreen";

export default function DeprecatedUserProfileRoute() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Seamlessly forward to canonical /screens/profile route preserving all parameters
    router.replace({
      pathname: "/screens/profile",
      params: params as any,
    });
  }, [params]);

  return <UserProfileScreen />;
}
