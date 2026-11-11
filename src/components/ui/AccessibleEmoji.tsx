import React from "react";
import { Text, TextProps, Platform, StyleSheet } from "react-native";
import { resolveEmojiToVectorIcon } from "../../utils/a11y/emojiMap";

export interface AccessibleEmojiProps extends TextProps {
  emoji: string;
  /**
   * Accessible description of what this emoji represents.
   * If omitted, attempts to auto-resolve from the emoji map.
   */
  accessibilityLabel?: string;
  /**
   * If true, screen readers will completely ignore this emoji as decorative text.
   */
  decorative?: boolean;
}

/**
 * Ensures emojis do not pollute screen reader transcripts with arbitrary names,
 * and allows marking emojis as purely decorative.
 */
export const AccessibleEmoji: React.FC<AccessibleEmojiProps> = ({
  emoji,
  accessibilityLabel,
  decorative = false,
  style,
  ...rest
}) => {
  const resolvedMapping = resolveEmojiToVectorIcon(emoji);
  const resolvedLabel = accessibilityLabel || resolvedMapping?.enLabel;

  if (decorative || !resolvedLabel) {
    return (
      <Text
        accessible={false}
        importantForAccessibility="no"
        {...(Platform.OS === "web" && { "aria-hidden": true })}
        style={[styles.emoji, style]}
        {...rest}
      >
        {emoji}
      </Text>
    );
  }

  return (
    <Text
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={resolvedLabel}
      {...(Platform.OS === "web" && {
        role: "img",
        "aria-label": resolvedLabel,
      })}
      style={[styles.emoji, style]}
      {...rest}
    >
      {emoji}
    </Text>
  );
};

const styles = StyleSheet.create({
  emoji: {
    fontSize: 16,
  },
});
