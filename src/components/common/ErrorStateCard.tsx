import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { FONTS } from "../../theme/typography";

export interface ErrorStateCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorStateCard({
  title = "Unable to load data",
  message = "A temporary network or server error occurred. Please try again.",
  onRetry,
  retryText = "Try Again",
  style,
}: ErrorStateCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.border : "#FEE2E2",
          shadowColor: colors.danger,
        },
        style,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
        <Ionicons name="alert-circle-outline" size={38} color={colors.danger} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontFamily: FONTS.bengali.bold }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary, fontFamily: FONTS.bengali.regular }]}>
        {message}
      </Text>
      {onRetry && (
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: colors.danger },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onRetry}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.retryText, { fontFamily: FONTS.bengali.semiBold }]}>
            {retryText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ErrorStateCard;
