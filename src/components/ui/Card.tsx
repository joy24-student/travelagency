import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import { colors } from "../../theme/colors";
import { shadows, ShadowPreset } from "../../theme/shadows";
import { radii } from "../../theme/spacing";

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
}) => {
  const resolvedVariant: CardVariant = variant;
  const resolvedBorder: CardBorder = getVariantBorder(resolvedVariant, border);
  const resolvedPadding: CardPadding = padding;
  const resolvedRounded: CardRounded = rounded;
  const resolvedElevation: ShadowPreset = elevation ?? getVariantElevation(resolvedVariant);

  const paddingStyle = getPaddingStyle(resolvedPadding);
  const roundedStyle = getRoundedStyle(resolvedRounded);
  const borderStyle = getBorderStyle(resolvedBorder);
  const shadowStyle = shadows[resolvedElevation];
  const bgStyle = getVariantBackground(resolvedVariant);

  const containerStyles = [
    styles.cardBase,
    bgStyle,
    roundedStyle,
    borderStyle,
    shadowStyle,
    paddingStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        className={className}
        style={({ pressed }) => [
          containerStyles,
          pressed && styles.pressed,
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
          <Text style={[styles.headerTitle, titleStyle]}>{title}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.headerSubtitle, subtitleStyle]}>{subtitle}</Text>
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
  return <View className={className} style={[styles.divider, style]} />;
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

function getVariantBackground(variant: CardVariant): ViewStyle {
  switch (variant) {
    case "luxe":
      return { backgroundColor: "#ffffff", borderColor: colors.brand.luxe.gold };
    case "default":
    case "elevated":
    case "outlined":
    default:
      return { backgroundColor: colors.surface.card };
  }
}

function getBorderStyle(border: CardBorder): ViewStyle {
  switch (border) {
    case "prominent":
      return { borderWidth: 1.5, borderColor: colors.border.strong };
    case "default":
      return { borderWidth: 1, borderColor: colors.border.default };
    case "subtle":
      return { borderWidth: 1, borderColor: colors.border.subtle };
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
    marginLeft: 12,
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
