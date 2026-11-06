import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface SettingsSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  icon?: ReactNode;
  headerAction?: ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  subtitle,
  children,
  icon,
  headerAction,
}) => {
  const { colors, isOled } = useTheme();

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.subtext }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {headerAction && <View>{headerAction}</View>}
        </View>
      )}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isOled ? "#27272a" : colors.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});
