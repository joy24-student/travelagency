import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createPlatformShadow } from "../../utils/platform";

export interface StickyHeaderProps {
  children: React.ReactNode;
  topOffset?: number;
  backgroundColor?: string;
  elevation?: number;
  style?: StyleProp<ViewStyle>;
  zIndex?: number;
  borderBottom?: boolean;
}

/**
 * Robust Cross-Platform Sticky Header / Filter Container.
 * Ensures:
 * - Proper z-index (iOS & Web)
 * - Android elevation (preventing scrolling items from rendering above the header)
 * - Opaque background (preventing items from bleeding through)
 * - Solid border and shadow separation
 */
export const StickyHeader: React.FC<StickyHeaderProps> = ({
  children,
  topOffset = 0,
  backgroundColor = "#ffffff",
  elevation = 3,
  style,
  zIndex = 100,
  borderBottom = true,
}) => {
  const insets = useSafeAreaInsets();
  const shadowStyle = createPlatformShadow({
    elevation,
    color: "#0f172a",
    opacity: 0.06,
  });

  return (
    <View
      style={[
        styles.stickyBase,
        {
          top: topOffset,
          backgroundColor,
          zIndex,
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: "#E2E8F0",
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  stickyBase: {
    width: "100%",
    ...Platform.select({
      web: {
        position: "sticky" as any,
        top: 0,
      },
      default: {},
    }),
  },
});
