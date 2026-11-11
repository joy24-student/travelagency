import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export interface AccessibleTextProps extends TextProps {
  /**
   * Maximum multiplier for dynamic type / system font scaling.
   * Default is 1.4 (allows 140% scaling for vision accessibility while preventing layout breakage).
   */
  maxFontSizeMultiplier?: number;
  /**
   * Screen reader role. Default is 'text'.
   */
  accessibilityRole?: "none" | "text" | "header" | "link" | "summary" | "alert";
}

/**
 * Drop-in accessible Text component that governs `allowFontScaling` and `maxFontSizeMultiplier`.
 * Prevents small fonts (e.g. 11px) from clipping and stops layout breakage on large system fonts.
 */
export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.4,
  accessibilityRole = "text",
  style,
  ...rest
}) => {
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={accessibilityRole}
      style={[styles.defaultText, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    color: colors.text.primary,
  },
});
