import React, { useMemo } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export interface PasswordStrengthMeterProps {
  password?: string;
  style?: StyleProp<ViewStyle>;
  showCriteria?: boolean;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: string;
  color: string;
  hasMinLength: boolean;
  hasMixedCase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function analyzePassword(password: string = ""): PasswordAnalysis {
  const hasMinLength = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let score = 0;
  if (password.length > 0) {
    if (hasMinLength) score += 1;
    if (hasMixedCase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
  }

  let label = "Enter password";
  let color: string = colors.neutral[300];

  if (password.length > 0) {
    switch (score) {
      case 0:
      case 1:
        label = "Weak";
        color = colors.status.danger.main;
        break;
      case 2:
        label = "Fair";
        color = colors.status.warning.main;
        break;
      case 3:
        label = "Good";
        color = "#3b82f6"; // Blue
        break;
      case 4:
        label = "Strong";
        color = colors.status.success.main;
        break;
    }
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasMixedCase,
    hasNumber,
    hasSpecial,
  };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = "",
  style,
  showCriteria = false,
}) => {
  const analysis = useMemo(() => analyzePassword(password), [password]);

  if (!password && !showCriteria) {
    return null;
  }

  const { score, label, color, hasMinLength, hasMixedCase, hasNumber, hasSpecial } = analysis;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Password strength: ${label}`}
      accessibilityValue={{ min: 0, max: 4, now: score }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Password Strength</Text>
        <Text style={[styles.labelText, { color }]}>{label}</Text>
      </View>

      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((step) => {
          const isActive = score >= step;
          return (
            <View
              key={step}
              style={[
                styles.segment,
                {
                  backgroundColor: isActive ? color : colors.neutral[200],
                },
              ]}
            />
          );
        })}
      </View>

      {showCriteria ? (
        <View style={styles.criteriaContainer}>
          <CriteriaItem label="At least 8 characters" met={hasMinLength} />
          <CriteriaItem label="Upper & lower case letters" met={hasMixedCase} />
          <CriteriaItem label="At least one number" met={hasNumber} />
          <CriteriaItem label="Special symbol (!@#$%...)" met={hasSpecial} />
        </View>
      ) : null}
    </View>
  );
};

const CriteriaItem: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
  <View style={styles.criterionRow}>
    <Ionicons
      name={met ? "checkmark-circle" : "ellipse-outline"}
      size={13}
      color={met ? colors.status.success.main : colors.neutral[400]}
      style={{ marginEnd: 6 }}
    />
    <Text
      style={[
        styles.criterionText,
        met && { color: colors.text.primary, fontWeight: "500" },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 4,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  titleText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  barsContainer: {
    flexDirection: "row",
    height: 4,
    gap: 4,
    width: "100%",
  },
  segment: {
    flex: 1,
    height: "100%",
    borderRadius: 2,
  },
  criteriaContainer: {
    marginTop: 8,
    gap: 4,
    paddingHorizontal: 2,
  },
  criterionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  criterionText: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
