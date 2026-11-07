import React from "react";
import {
  View,
  Text,
  Switch,
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { AppPressable } from "./AppPressable";
import { FONTS } from "../../theme/typography";

export interface SettingToggleRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isLast?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export const SettingToggleRow: React.FC<SettingToggleRowProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  icon,
  iconName,
  iconColor,
  iconBgColor,
  isLast = false,
  testID,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const { colors, isDark } = useTheme();

  const handlePressRow = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const resolvedIconColor = iconColor || colors.primary;
  const resolvedIconBg = iconBgColor || (isDark ? "rgba(0, 85, 242, 0.15)" : "#eff6ff");

  return (
    <AppPressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={handlePressRow}
      rippleColor="rgba(0, 85, 242, 0.08)"
      style={[
        styles.rowContainer,
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? "#1e293b" : "#f1f5f9" },
        disabled && styles.disabledRow,
        style,
      ]}
    >
      <View style={styles.leftCol}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: resolvedIconBg }]}>
            {icon}
          </View>
        ) : iconName ? (
          <View style={[styles.iconWrap, { backgroundColor: resolvedIconBg }]}>
            <Ionicons name={iconName} size={20} color={resolvedIconColor} />
          </View>
        ) : null}

        <View style={styles.textWrap}>
          <Text
            style={[
              styles.title,
              { color: isDark ? "#f8fafc" : "#0f172a" },
              titleStyle,
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? "#94a3b8" : "#64748b" },
                subtitleStyle,
              ]}
              numberOfLines={3}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.switchWrap} pointerEvents="none">
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: isDark ? "#334155" : "#e2e8f0",
            true: colors.primary,
          }}
          thumbColor={
            Platform.OS === "android"
              ? value
                ? "#ffffff"
                : isDark
                ? "#94a3b8"
                : "#f8fafc"
              : undefined
          }
          ios_backgroundColor={isDark ? "#334155" : "#e2e8f0"}
        />
      </View>
    </AppPressable>
  );
};

export interface SettingLinkRowProps {
  title: string;
  subtitle?: string;
  valueText?: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isLast?: boolean;
  destructive?: boolean;
  testID?: string;
}

export const SettingLinkRow: React.FC<SettingLinkRowProps> = ({
  title,
  subtitle,
  valueText,
  onPress,
  iconName,
  iconColor,
  iconBgColor,
  isLast = false,
  destructive = false,
  testID,
}) => {
  const { colors, isDark } = useTheme();

  const resolvedColor = destructive
    ? "#ef4444"
    : iconColor || (isDark ? "#93c5fd" : colors.primary);
  const resolvedBg = destructive
    ? "#fee2e2"
    : iconBgColor || (isDark ? "rgba(0, 85, 242, 0.15)" : "#eff6ff");

  return (
    <AppPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      rippleColor="rgba(0, 85, 242, 0.08)"
      style={[
        styles.rowContainer,
        !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? "#1e293b" : "#f1f5f9" },
      ]}
    >
      <View style={styles.leftCol}>
        {iconName ? (
          <View style={[styles.iconWrap, { backgroundColor: resolvedBg }]}>
            <Ionicons name={iconName} size={20} color={resolvedColor} />
          </View>
        ) : null}

        <View style={styles.textWrap}>
          <Text
            style={[
              styles.title,
              { color: destructive ? "#ef4444" : isDark ? "#f8fafc" : "#0f172a" },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : "#64748b" }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightActionWrap}>
        {valueText ? (
          <Text style={[styles.valueText, { color: isDark ? "#94a3b8" : "#64748b" }]}>
            {valueText}
          </Text>
        ) : null}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "#64748b" : "#94a3b8"}
        />
      </View>
    </AppPressable>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  disabledRow: {
    opacity: 0.5,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingEnd: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 14,
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: FONTS.bengali.semiBold,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.bengali.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  switchWrap: {
    marginStart: 8,
  },
  rightActionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  valueText: {
    fontSize: 14,
    fontFamily: FONTS.bengali.regular,
  },
});

export default SettingToggleRow;
