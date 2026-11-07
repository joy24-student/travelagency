import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "../ui/EmptyState";

export interface EmptyStateViewProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * EmptyStateView - Unified facade delegating to canonical EmptyState component.
 * Provides backwards compatibility while eliminating component duplication.
 */
export function EmptyStateView({
  icon,
  title = "No results found",
  subtitle,
  description = "Try adjusting your search criteria, dates, or filters to find matching options.",
  actionText,
  onAction,
  style,
}: EmptyStateViewProps) {
  const effectiveDescription = subtitle || description;
  return (
    <EmptyState
      title={title}
      description={effectiveDescription}
      actionLabel={actionText}
      onAction={onAction}
      style={style}
    />
  );
}

export default EmptyStateView;
