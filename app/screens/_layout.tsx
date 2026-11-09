import React from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

/**
 * Unified Screens Stack Navigator Layout
 * 
 * Solves transition & back button inconsistency:
 * Provides unified stack transition animation (slide_from_right),
 * native iOS swipe gestures, standard back stack behavior, and consistent contentStyle.
 */
export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === "ios",
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="[slug]" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="payment-details" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
      <Stack.Screen name="call" />
      <Stack.Screen name="booking-system" />
      <Stack.Screen name="hotels-homes" />
      <Stack.Screen name="flights" />
      <Stack.Screen name="trains" />
      <Stack.Screen name="packages" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="search-stays" />
      <Stack.Screen name="search" />
      <Stack.Screen name="recommended-tours" />
      <Stack.Screen name="car-rentals" />
      <Stack.Screen name="customer-support" />
      <Stack.Screen name="agencies" />
      <Stack.Screen name="events" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="landmark-scanner" />
      <Stack.Screen name="trip-planner" />
      <Stack.Screen name="local-marketplace" />
      <Stack.Screen name="tour-guides" />
      <Stack.Screen name="digital-passport" />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="offline-survival" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="transaction-history" />
      <Stack.Screen name="travel-match" />
      <Stack.Screen name="invite-earn" />
      <Stack.Screen name="service-chat" />
      <Stack.Screen name="bus-launch" />
      <Stack.Screen name="admission-bus" />
      <Stack.Screen name="abroad-agency" />
      <Stack.Screen name="luggage-measure" />
      <Stack.Screen name="payment-callback" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="payment-failed" />
      <Stack.Screen name="user-profile" />
      <Stack.Screen name="payments-enhanced" />
      <Stack.Screen name="e-ticket" />
      <Stack.Screen name="price-alerts" />
      <Stack.Screen name="group-trip" />
      <Stack.Screen name="live" />
      <Stack.Screen name="agency-chat" />
    </Stack>
  );
}
