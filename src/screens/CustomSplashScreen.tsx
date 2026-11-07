import React from "react";
import SplashScreen from "./SplashScreen";
import {
  SplashScreenConfig,
  DEFAULT_SPLASH_CONFIG,
  getSplashConfig,
  PresetName,
} from "../config/splashConfig";

export interface CustomSplashScreenProps {
  onFinish?: () => void;
  config?: SplashScreenConfig;
  preset?: PresetName;
}

/**
 * CustomSplashScreen - Unified wrapper maintaining backward compatibility.
 * Re-exports the canonical, theme-aware SplashScreen with ultra-fast startup (<1s).
 */
export default function CustomSplashScreen({
  onFinish,
  config,
  preset,
}: CustomSplashScreenProps) {
  const finalConfig = config || getSplashConfig(preset);
  const variant = finalConfig.variant === "advanced" ? "advanced" : "standard";

  return (
    <SplashScreen
      onFinish={onFinish}
      variant={variant}
      duration={Math.min(finalConfig.duration, 1000)}
    />
  );
}

export { getSplashConfig, DEFAULT_SPLASH_CONFIG };
export type { SplashScreenConfig };
