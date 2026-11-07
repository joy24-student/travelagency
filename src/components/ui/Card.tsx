import React from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import { shadows, ShadowPreset } from "../../theme/shadows";
import { radii } from "../../theme/spacing";
import { FONTS } from "../../theme/typography";
import { useA11yFocusRing } from "../../hooks/useA11yFocusRing";

export type CardBorder = "none" | "subtle" | "default" | "prominent";
export type CardRounded = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CardVariant = "default" | "elevated" | "outlined" | "luxe";

export interface CardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  elevation?: ShadowPreset;
  border?: CardBorder;
  rounded?: CardRounded;
  padding?: CardPadding;
  onPress?: (event: GestureResponderEvent) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
  Divider: typeof CardDivider;
} = ({
  children,
  variant = "default" as CardVariant,
  elevation,
  border = "subtle" as CardBorder,
  rounded = "xl" as CardRounded,
  padding = "md" as CardPadding,
  onPress,
  className,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { colors: themeColors } = useTheme();
  const resolvedVariant: CardVariant = variant;
  const resolvedBorder: CardBorder = getVariantBorder(resolvedVariant, border);
  const resolvedPadding: CardPadding = padding;
  const resolvedRounded: CardRounded = rounded;
  const resolvedElevation: ShadowPreset = elevation ?? getVariantElevation(resolvedVariant);

  const paddingStyle = getPaddingStyle(resolvedPadding);
  const roundedStyle = getRoundedStyle(resolvedRounded);
  const borderStyle = getBorderStyle(resolvedBorder, themeColors);
  const shadowStyle = shadows[resolvedElevation];
  const bgStyle = getVariantBackground(resolvedVariant, themeColors);

  const containerStyles = [
    styles.cardBase,
    bgStyle,
    roundedStyle,
    borderStyle,
    shadowStyle,
    paddingStyle,
    style,
  ];

  const { focusStyle, focusProps } = useA11yFocusRing({
    onPress: () => onPress?.({} as GestureResponderEvent),
    disabled: !onPress,
  });

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        android_ripple={{
          color: "rgba(0, 85, 242, 0.08)",
          borderless: false,
        }}
        className={className}
        {...(focusProps as any)}
        style={({ pressed }) => [
          containerStyles,
          Platform.OS !== "android" && pressed && styles.pressed,
          focusStyle,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} className={className} style={containerStyles}>
      {children}
    </View>
  );
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const { colors: themeColors } = useTheme();

  if (children) {
    return (
      <View className={className} style={[styles.headerContainer, style]}>
        {children}
      </View>
    );
  }

  return (
    <View className={className} style={[styles.headerContainer, style]}>
      <View style={styles.headerTextGroup}>
        {title ? (
          <Text
            style={[
              styles.headerTitle,
              { color: themeColors.text, fontFamily: FONTS.bengali.bold },
              titleStyle,
            ]}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={[
              styles.headerSubtitle,
              { color: themeColors.textSecondary, fontFamily: FONTS.bengali.regular },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
};

export interface CardContentProps {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  style,
}) => {
  return (
    <View className={className} style={[styles.contentContainer, style]}>
      {children}
    </View>
  );
};

export interface CardFooterProps {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  style,
}) => {
  return (
    <View className={className} style={[styles.footerContainer, style]}>
      {children}
    </View>
  );
};

export interface CardDividerProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const CardDivider: React.FC<CardDividerProps> = ({
  className,
  style,
}) => {
  const { colors: themeColors } = useTheme();
  return (
    <View
      className={className}
      style={[
        styles.divider,
        { backgroundColor: themeColors.borderSubtle },
        style,
      ]}
    />
  );
};

// Attach compound subcomponents
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Divider = CardDivider;

// ============================================================================
// STYLES & TOKEN HELPERS
// ============================================================================

function getVariantElevation(variant: CardVariant): ShadowPreset {
  switch (variant) {
    case "elevated":
      return "medium";
    case "outlined":
      return "none";
    case "luxe":
      return "high";
    case "default":
    default:
      return "low";
  }
}

function getVariantBorder(variant: CardVariant, fallback: CardBorder): CardBorder {
  if (variant === "outlined") return "default";
  if (variant === "luxe") return "subtle";
  return fallback;
}

function getVariantBackground(variant: CardVariant, themeColors?: any): ViewStyle {
  const cardBg = themeColors?.card || colors.surface.card;
  switch (variant) {
    case "luxe":
      return { backgroundColor: cardBg, borderColor: themeColors?.accent || colors.brand.luxe.gold };
    case "default":
    case "elevated":
    case "outlined":
    default:
      return { backgroundColor: cardBg };
  }
}

function getBorderStyle(border: CardBorder, themeColors?: any): ViewStyle {
  const borderDefault = themeColors?.border || colors.border.default;
  const borderSubtle = themeColors?.borderSubtle || colors.border.subtle;
  const borderStrong = themeColors?.borderStrong || colors.border.strong;

  switch (border) {
    case "prominent":
      return { borderWidth: 1.5, borderColor: borderStrong };
    case "default":
      return { borderWidth: 1, borderColor: borderDefault };
    case "subtle":
      return { borderWidth: 1, borderColor: borderSubtle };
    case "none":
    default:
      return { borderWidth: 0 };
  }
}

function getRoundedStyle(rounded: CardRounded): ViewStyle {
  return { borderRadius: radii[rounded] };
}

function getPaddingStyle(padding: CardPadding): ViewStyle {
  switch (padding) {
    case "none":
      return { padding: 0 };
    case "sm":
      return { padding: 8 };
    case "lg":
      return { padding: 20 };
    case "xl":
      return { padding: 24 };
    case "md":
    default:
      return { padding: 16 };
  }
}

const styles = StyleSheet.create({
  cardBase: {
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerAction: {
    marginStart: 12,
  },
  contentContainer: {
    flexShrink: 0,
  },
  footerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 10,
    width: "100%",
  },
});
