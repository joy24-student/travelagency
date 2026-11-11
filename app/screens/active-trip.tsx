import React from "react";
import { useLocalSearchParams } from "expo-router";
import { ActiveTripTrackingScreen } from "../../src/screens/marketplace/ActiveTripTrackingScreen";

export default function ActiveTripTrackingRoute() {
  const { bookingId, mode } = useLocalSearchParams<{ bookingId?: string; mode?: string }>();
  return (
    <ActiveTripTrackingScreen
      bookingId={bookingId || "booking-mkt-001"}
      isProviderMode={mode === "provider"}
    />
  );
}
