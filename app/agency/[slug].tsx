import React, { Suspense, lazy } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { AgencyTab } from "@/screens/agency/AgencyPortalShell";

// Dynamic Import: Ensure the heavy AgencyPortalShell is an asynchronous chunk
const LazyAgencyPortalShell = lazy(() =>
  import("../../src/screens/agency/AgencyPortalShell").then((m) => ({ default: m.AgencyPortalShell }))
);

const VALID_TABS: AgencyTab[] = [
  "dashboard",
  "flights",
  "hotels",
  "packages",
  "bookings",
  "wallet",
  "customers",
  "quotations",
  "team",
  "markups",
  "verification",
  "support",
];

const AgencyLoadingFallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="large" color="#4F46E5" />
  </View>
);

export default function AgencySlugPage() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const initialTab: AgencyTab =
    slug && VALID_TABS.includes(slug as AgencyTab) ? (slug as AgencyTab) : "dashboard";

  return (
    <Suspense fallback={<AgencyLoadingFallback />}>
      <LazyAgencyPortalShell initialTab={initialTab} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#0B1326",
    justifyContent: "center",
    alignItems: "center",
  },
});
