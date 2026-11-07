/**
 * @deprecated Use /screens/customer-support instead.
 * 
 * Canonical Route: /screens/customer-support
 * This file is maintained for backward compatibility and redirects to the canonical route.
 */

import React, { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { CustomerSupportScreen } from "../../src/screens/CustomerSupportScreen";

export default function DeprecatedHelpScreenRoute() {
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({
      pathname: "/screens/customer-support",
      params: params as any,
    });
  }, [params]);

  return <CustomerSupportScreen />;
}
