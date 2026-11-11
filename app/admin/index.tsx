import React, { Suspense, lazy } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { AdminTab } from "@/screens/admin/AdminPortalShell";

// Dynamic Import: Ensure the heavy AdminPortalShell is an asynchronous chunk
const LazyAdminPortalShell = lazy(() =>
  import("../../src/screens/admin/AdminPortalShell").then((m) => ({ default: m.AdminPortalShell }))
);

const VALID_TABS: AdminTab[] = [
  "dashboard",
  "hero-banners",
  "marketplace",
  "booking-ops",
  "users",
  "agencies",
  "agency-ops",
  "hotels",
  "destinations",
  "refunds",
  "marketing",
  "ads",
  "reports",
  "monitoring",
  "settings",
  "payment-ops",
  "support",
  "audit-trail",
  "commissions",
  "reviews",
  "notifications",
];

const AdminLoadingFallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="large" color="#0284c7" />
  </View>
);

export default function AdminIndexPage() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: AdminTab =
    tab && VALID_TABS.includes(tab as AdminTab) ? (tab as AdminTab) : "dashboard";

  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <LazyAdminPortalShell initialTab={initialTab} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});
