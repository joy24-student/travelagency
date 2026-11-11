import React from "react";
import {
  Text,
  TextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
  Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import {
  FONTS,
  TYPE_SCALE,
  clampFontSize,
  textPresets,
  getLocaleFont,
  FontWeightType,
} from "../../theme/typography";

export type TextVariant =
  | "micro"
  | "caption"
  | "bodySm"
  | "body"
  | "bodyBold"
  | "subhead"
  | "title"
  | "headline"
  | "hero";

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  muted?: boolean;
  secondary?: boolean;
  bengali?: boolean;
  locale?: string;
  weight?: FontWeightType;
  align?: "left" | "center" | "right" | "justify";
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = "body",
  color,
  muted,
  secondary,
  bengali = true,
  locale,
  weight,
  align,
  style,
  children,
  ...props
}) => {
  const { colors } = useTheme();

  // Resolve text color
  let resolvedColor = colors.text;
  if (color) {
    resolvedColor = color;
  } else if (muted) {
    resolvedColor = colors.textMuted;
  } else if (secondary) {
    resolvedColor = colors.textSecondary;
  }

  // Preset styles
  const preset = textPresets[variant] || textPresets.body;

  // Flattened style to check fontSize
  const flatStyle = StyleSheet.flatten(style) || {};
  const clampedSize = flatStyle.fontSize ? clampFontSize(flatStyle.fontSize) : preset.fontSize;

  // Multi-locale font family resolution
  let resolvedFontFamily = flatStyle.fontFamily;
  if (!resolvedFontFamily) {
    const effectiveWeight: FontWeightType =
      weight ||
      (preset.fontWeight === "700" || preset.fontWeight === "800"
        ? "bold"
        : preset.fontWeight === "600"
        ? "semibold"
        : preset.fontWeight === "500"
        ? "medium"
        : "regular");

    if (bengali && !locale) {
      // Default to locale-aware font (bengali if BN, arabic if AR, hindi if HI, etc.)
      resolvedFontFamily = getLocaleFont(effectiveWeight);
    } else {
      resolvedFontFamily = getLocaleFont(effectiveWeight, locale);
    }
  }

  return (
    <Text
      {...props}
      style={[
        styles.base,
        preset,
        {
          color: resolvedColor,
          fontSize: clampedSize,
          fontFamily: resolvedFontFamily,
        },
        align && { textAlign: align },
        style,
        // Enforce accessible font size even after custom styles
        flatStyle.fontSize ? { fontSize: clampFontSize(flatStyle.fontSize) } : undefined,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    letterSpacing: Platform.select({ ios: 0.2, default: 0 }),
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
