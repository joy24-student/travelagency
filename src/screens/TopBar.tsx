import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import type { UIScreen } from "../data/screens";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";

export function TopBar({ screen }: { screen: UIScreen }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const brandColor =
    screen.theme === "luxe"
      ? isDark
        ? colors.accent
        : colors.secondary
      : colors.primary;

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)
        }
        style={[
          styles.iconButton,
          { backgroundColor: isDark ? colors.surface : "#f2f4f7" },
        ]}
      >
        <Ionicons color={colors.text} name="chevron-back" size={22} />
      </Pressable>

      <View style={styles.topTitleWrap}>
        <Text
          numberOfLines={1}
          style={[styles.sourceText, { color: colors.textMuted }]}
        >
          {t(screen.source, screen.source)}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.topTitle,
            { color: colors.text, fontFamily: FONTS.bengali.bold },
          ]}
        >
          {t(screen.title, screen.title)}
        </Text>
      </View>

      <View
        style={[
          styles.profileDot,
          { backgroundColor: isDark ? colors.surface : `${brandColor}18` },
        ]}
      >
        <Ionicons color={brandColor} name="ellipsis-horizontal" size={21} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  topTitleWrap: {
    flex: 1,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  profileDot: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
