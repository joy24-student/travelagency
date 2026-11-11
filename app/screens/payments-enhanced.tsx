/**
 * @deprecated Use /screens/payments instead.
 * 
 * Canonical Route: /screens/payments
 * This file is maintained for backward compatibility with older links and redirects to the canonical route.
 */

import React, { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import PaymentScreen from "./payments";

export default function DeprecatedPaymentsEnhancedRoute() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Seamlessly forward to canonical /screens/payments route preserving all parameters
    router.replace({
      pathname: "/screens/payments",
      params: params as any,
    });
  }, [params]);

  return <PaymentScreen />;
}
