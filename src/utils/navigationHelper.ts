import { router } from "expo-router";
import { BackHandler, Platform } from "react-native";
import { useEffect } from "react";

/**
 * Standardized Safe Navigation Helper
 * 
 * Prevents:
 * 1. Black screens or app closing when router.back() is called with an empty stack.
 * 2. Inconsistent back routing across Android hardware back button and iOS gestures.
 * 3. Navigating back into finalized payment/booking checkout states.
 */

/**
 * Safely navigates back if history exists, otherwise falls back to the specified canonical route.
 */
export function safeGoBack(fallbackRoute: string = "/(tabs)"): void {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch {
    router.replace(fallbackRoute as any);
  }
}

/**
 * Navigates to home tab replacing current stack.
 */
export function exitToHome(): void {
  router.replace("/(tabs)" as any);
}

/**
 * Navigates to My Trips tab replacing current stack (essential after completed booking).
 */
export function exitToTrips(): void {
  router.replace("/(tabs)/trips" as any);
}

/**
 * Custom React Hook to cleanly lock the hardware back button on Android.
 * When a user is on payment-success or completed checkout, pressing hardware back
 * navigates them to My Trips or Home rather than popping back to the payment/card input screen.
 */
export function usePreventBackToPayment(onBackAction?: () => void) {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onHardwareBack = () => {
      if (onBackAction) {
        onBackAction();
      } else {
        exitToTrips();
      }
      return true; // Prevent default Android stack pop
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );

    return () => subscription.remove();
  }, [onBackAction]);
}
