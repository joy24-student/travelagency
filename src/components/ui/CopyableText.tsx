import React from "react";
import { TouchableOpacity, Text, StyleSheet, Clipboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export interface CopyableTextProps {
  text?: string;
  label?: string;
  style?: any;
  textStyle?: any;
  iconSize?: number;
  iconColor?: string;
}

export function CopyableText({
  text = "",
  label,
  style,
  textStyle,
  iconSize = 14,
  iconColor = "#2563EB",
}: CopyableTextProps) {
  const handleCopy = () => {
    if (!text) return;
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleCopy}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label || text}`}
    >
      <Text style={[styles.text, textStyle]}>{text}</Text>
      <Ionicons name="copy-outline" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 14,
    color: "#0F172A",
  },
});

export default CopyableText;
