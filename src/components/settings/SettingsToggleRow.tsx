import React from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../context/ThemeContext";
import { useSettingsStore } from "../../store/settingsStore";

interface SettingsToggleRowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  isLast?: boolean;
  badge?: string;
}

export const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  loading = false,
  isLast = false,
  badge,
}) => {
  const { colors, isDark } = useTheme();
  const hapticEnabled = useSettingsStore(
    (state) => state.accessibility.hapticFeedbackEnabled
  );

  const handleToggle = (nextValue: boolean) => {
    if (disabled || loading) return;

    if (hapticEnabled && Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }

    onValueChange(nextValue);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      onPress={() => handleToggle(!value)}
      style={[
        styles.row,
        !isLast && [styles.borderBottom, { borderBottomColor: colors.border }],
        disabled && styles.disabledRow,
      ]}
    >
      <View style={styles.leftContainer}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {badge}
                </Text>
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actionContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={value}
            onValueChange={handleToggle}
            disabled={disabled}
            trackColor={{
              false: isDark ? "#334155" : "#e2e8f0",
              true: colors.primary,
            }}
            thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
            ios_backgroundColor={isDark ? "#334155" : "#e2e8f0"}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disabledRow: {
    opacity: 0.5,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingEnd: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginStart: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionContainer: {
    marginStart: 8,
  },
});
