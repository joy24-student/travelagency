import React from "react";
import SplashScreen, { SplashScreenProps } from "./SplashScreen";

/**
 * AdvancedSplashScreen - Canonical alias delegating to unified SplashScreen with advanced variant.
 * Fast startup (capped at 800ms) with particle effects.
 */
export default function AdvancedSplashScreen({ onFinish, duration = 800 }: SplashScreenProps) {
  return (
    <SplashScreen
      onFinish={onFinish}
      variant="advanced"
      duration={Math.min(duration, 1000)}
    />
  );
}
