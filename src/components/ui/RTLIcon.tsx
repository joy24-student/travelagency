import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { isAppRTL } from "../../utils/rtl";

export type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
export type MaterialIconsName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface RTLIconProps extends Omit<React.ComponentProps<typeof Ionicons>, "name"> {
  name: IoniconsName;
}

/**
 * Directional icon pairs that must flip when switching between LTR and RTL
 */
const DIRECTIONAL_IONICONS_MAP: Record<string, IoniconsName> = {
  "chevron-back": "chevron-forward",
  "chevron-forward": "chevron-back",
  "chevron-back-outline": "chevron-forward-outline",
  "chevron-forward-outline": "chevron-back-outline",
  "chevron-back-circle": "chevron-forward-circle",
  "chevron-forward-circle": "chevron-back-circle",
  "arrow-back": "arrow-forward",
  "arrow-forward": "arrow-back",
  "arrow-back-outline": "arrow-forward-outline",
  "arrow-forward-outline": "arrow-back-outline",
  "arrow-back-circle": "arrow-forward-circle",
  "arrow-forward-circle": "arrow-back-circle",
  "caret-back": "caret-forward",
  "caret-forward": "caret-back",
};

/**
 * RTL-Aware Ionicons Component
 * Automatically mirrors directional chevrons, arrows, and back buttons in Arabic RTL layouts.
 */
export const RTLIcon: React.FC<RTLIconProps> = ({
  name,
  size = 20,
  color = "#000",
  style,
  ...rest
}) => {
  const isRTL = isAppRTL();
  const resolvedName = isRTL && DIRECTIONAL_IONICONS_MAP[name]
    ? DIRECTIONAL_IONICONS_MAP[name]
    : name;

  return <Ionicons name={resolvedName} size={size} color={color} style={style} {...rest} />;
};

export default RTLIcon;
