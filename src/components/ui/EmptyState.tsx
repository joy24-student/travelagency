import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import { FONTS } from "../../theme/typography";
import { Button, ButtonProps } from "./Button";

export type EmptyStateType =
  | "search"
  | "booking"
  | "saved"
  | "network"
  | "messages"
  | "generic";

export interface EmptyStateProps {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  type?: EmptyStateType;
  actionLabel?: string;
  onAction?: () => void;
  actionProps?: Partial<ButtonProps>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration,
  type = "generic",
  actionLabel,
  onAction,
  actionProps,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className,
  style,
  titleStyle,
  descriptionStyle,
  testID,
}: EmptyStateProps) => {
  const { colors: themeColors } = useTheme();
  const defaultIcon = getEmptyStateIcon(type);

  return (
    <View
      testID={testID}
      className={className}
      style={[
        styles.container,
        compact ? styles.compactContainer : styles.fullContainer,
        style,
      ]}
    >
      <View style={[styles.illustrationWrapper, compact && styles.compactIllustration]}>
        {illustration || (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: themeColors.primaryLight },
              compact && styles.compactIconCircle,
            ]}
          >
            <Ionicons
              name={defaultIcon.name as any}
              size={compact ? 28 : 44}
              color={themeColors.primary}
            />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.title,
          { color: themeColors.text, fontFamily: FONTS.bengali.bold },
          compact ? styles.compactTitle : styles.fullTitle,
          titleStyle,
        ]}
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={[
            styles.description,
            { color: themeColors.textSecondary, fontFamily: FONTS.bengali.regular },
            compact ? styles.compactDescription : styles.fullDescription,
            descriptionStyle,
          ]}
        >
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={[styles.actionsContainer, compact && styles.compactActions]}>
          <Button
            label={actionLabel}
            onPress={onAction}
            size={compact ? "sm" : "md"}
            variant="primary"
            {...actionProps}
          />

          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              size={compact ? "sm" : "md"}
              variant="ghost"
              style={styles.secondaryButton}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

function getEmptyStateIcon(type: EmptyStateType): { name: string; color: string } {
  switch (type) {
    case "search":
      return { name: "search-outline", color: colors.brand.trip.blue };
    case "booking":
      return { name: "calendar-outline", color: colors.brand.trip.blue };
    case "saved":
      return { name: "bookmark-outline", color: colors.brand.luxe.gold };
    case "network":
      return { name: "cloud-offline-outline", color: colors.status.danger.main };
    case "messages":
      return { name: "chatbubble-ellipses-outline", color: colors.brand.trip.blue };
    case "generic":
    default:
      return { name: "folder-open-outline", color: colors.neutral[400] };
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  fullContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  compactContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  compactIllustration: {
    marginBottom: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  compactIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[50],
  },
  title: {
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
  },
  fullTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  description: {
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  fullDescription: {
    fontSize: 14,
    maxWidth: 320,
    marginBottom: 20,
  },
  compactDescription: {
    fontSize: 12.5,
    maxWidth: 240,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  compactActions: {
    marginTop: 4,
  },
  secondaryButton: {
    marginStart: 10,
  },
});
