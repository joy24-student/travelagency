/**
 * Shared UI Components Library
 * Premium glassmorphism components for Agency Portal
 */

import React, { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  ActivityIndicator,
  ColorValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY } from "../../App";

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

// ============= CARD COMPONENTS =============

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  gradient2?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, gradient }) => {
  if (gradient) {
    return (
      <LinearGradient
        colors={["rgba(79, 70, 229, 0.1)", "rgba(6, 182, 212, 0.05)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
};

export const GradientCard: React.FC<CardProps> = ({ children, style }) => (
  <LinearGradient
    colors={["rgba(79, 70, 229, 0.15)", "rgba(6, 182, 212, 0.08)"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.card, style]}
  >
    {children}
  </LinearGradient>
);

// ============= STAT CARDS =============

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: string;
  color?: string;
  gradient?: GradientColors;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  icon,
  color = COLORS.primary,
  gradient,
}) => {
  const CardContent = (
    <View style={styles.statCard}>
      {icon && (
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <MaterialCommunityIcons
            name={
              icon as React.ComponentProps<
                typeof MaterialCommunityIcons
              >["name"]
            }
            size={24}
            color={color}
          />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      {trend !== undefined && (
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: trend > 0 ? "#22C55E20" : "#EF444420" },
          ]}
        >
          <Ionicons
            name={trend > 0 ? "arrow-up" : "arrow-down"}
            size={14}
            color={trend > 0 ? COLORS.success : COLORS.danger}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend > 0 ? COLORS.success : COLORS.danger },
            ]}
          >
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientStatCard}
      >
        {CardContent}
      </LinearGradient>
    );
  }

  return <Card gradient>{CardContent}</Card>;
};

// ============= BUTTON COMPONENTS =============

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${size}`],
    styles[`button_${variant}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${size}`],
    variant === "outline" && { color: COLORS.primary },
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons
              name={icon as React.ComponentProps<typeof Ionicons>["name"]}
              size={size === "small" ? 14 : 16}
              color={variant === "outline" ? COLORS.primary : "white"}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============= STATUS BADGE =============

interface BadgeProps {
  label: string;
  status:
    | "active"
    | "pending"
    | "inactive"
    | "error"
    | "warning"
    | "success"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "suspended";
  size?: "small" | "medium" | "large";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  status,
  size = "medium",
}) => {
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: "#22C55E20", text: "#22C55E" },
    pending: { bg: "#FACC1520", text: "#FACC15" },
    inactive: { bg: "#6B728020", text: "#94A3B8" },
    error: { bg: "#EF444420", text: "#EF4444" },
    warning: { bg: "#F973161520", text: "#F97316" },
    success: { bg: "#22C55E20", text: "#22C55E" },
    confirmed: { bg: "#22C55E20", text: "#22C55E" },
    completed: { bg: "#22C55E20", text: "#22C55E" },
    cancelled: { bg: "#EF444420", text: "#EF4444" },
    suspended: { bg: "#EF444420", text: "#EF4444" },
  };

  const colors = statusColors[status] || statusColors.inactive;

  return (
    <View
      style={[
        styles.badge,
        styles[`badge_${size}`],
        { backgroundColor: colors.bg },
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

// ============= LIST ITEM =============

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: string;
  rightIcon?: string | false;
  onPress?: () => void;
  avatar?: string;
  badge?: string;
  style?: ViewStyle;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  icon,
  rightIcon = "chevron-forward",
  onPress,
  avatar,
  badge,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.listItem, style]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {icon && (
        <View style={styles.listItemIcon}>
          <MaterialCommunityIcons
            name={
              icon as React.ComponentProps<
                typeof MaterialCommunityIcons
              >["name"]
            }
            size={24}
            color={COLORS.secondary}
          />
        </View>
      )}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
      </View>
      {badge && <Badge label={badge} status="active" size="small" />}
      {rightIcon && (
        <Ionicons
          name={rightIcon as React.ComponentProps<typeof Ionicons>["name"]}
          size={20}
          color={COLORS.textTertiary}
          style={styles.listItemArrow}
        />
      )}
    </TouchableOpacity>
  );
};

// ============= SECTION HEADER =============

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  onActionPress,
  style,
}) => (
  <View style={[styles.sectionHeader, style]}>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {action && (
      <TouchableOpacity onPress={onActionPress}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ============= ACTIVITY ITEM =============

interface ActivityItemProps {
  icon: string;
  title: string;
  description?: string;
  time: string;
  color?: string;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  icon,
  title,
  description,
  time,
  color = COLORS.secondary,
}) => (
  <Card>
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons
          name={
            icon as React.ComponentProps<typeof MaterialCommunityIcons>["name"]
          }
          size={20}
          color={color}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        {description && (
          <Text style={styles.activityDescription}>{description}</Text>
        )}
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  </Card>
);

// ============= CHART PLACEHOLDER =============

export const ChartPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <Card gradient>
    <View style={styles.chartPlaceholder}>
      <LinearGradient
        colors={["#4F46E520", "#06B6D420"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chartGradientArea}
      >
        <Ionicons
          name="bar-chart"
          size={48}
          color={COLORS.textTertiary}
          style={{ opacity: 0.5 }}
        />
        <Text style={styles.chartTitle}>{title}</Text>
      </LinearGradient>
    </View>
  </Card>
);

// ============= STYLES =============

const styles = StyleSheet.create({
  // Card Styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  gradientStatCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },

  // Stat Card Styles
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  statLabel: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },

  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },

  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Button Styles
  button: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  button_large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  button_primary: {
    backgroundColor: COLORS.primary,
  },

  button_secondary: {
    backgroundColor: COLORS.secondary,
  },

  button_danger: {
    backgroundColor: COLORS.danger,
  },

  button_outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "600",
    color: "white",
  },

  buttonText_small: {
    fontSize: 12,
  },

  buttonText_medium: {
    fontSize: 14,
  },

  buttonText_large: {
    fontSize: 16,
  },

  // Badge Styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  badge_small: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  badge_medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badge_large: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // List Item Styles
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${COLORS.secondary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  listItemContent: {
    flex: 1,
  },

  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  listItemSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  listItemArrow: {
    marginLeft: 8,
  },

  // Section Header Styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: "700",
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  sectionAction: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Activity Item Styles
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  activityContent: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },

  activityDescription: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  activityTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  // Chart Styles
  chartPlaceholder: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  chartGradientArea: {
    width: "100%",
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginTop: 12,
  },
});
