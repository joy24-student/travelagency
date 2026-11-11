import React from "react";
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

export interface GlassViewProps {
  children?: React.ReactNode;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
  className?: string;
  borderRadius?: number;
  borderWidth?: number;
}

/**
 * Fast Cross-Platform Frosted Glass for Hotel Module
 * Eliminates Android text input lag and GPU stutter caused by raw BlurView
 */
export const GlassView: React.FC<GlassViewProps> = ({
  children,
  intensity = 15,
  tint = "dark",
  style,
  className,
  borderRadius = 16,
  borderWidth = StyleSheet.hairlineWidth,
}) => {
  const isDark = tint === "dark";

  if (Platform.OS === "android") {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.85)",
            borderRadius,
            borderWidth,
            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.85)",
            backdropFilter: `blur(${intensity}px)`,
            WebkitBackdropFilter: `blur(${intensity}px)`,
            borderRadius,
            borderWidth,
            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      className={className}
      style={[
        {
          borderRadius,
          borderWidth,
          borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
};

export default GlassView;
