import React from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  View,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  ScrollViewProps,
} from "react-native";
import {
  SafeAreaView,
  Edge,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "../../theme/colors";

export type ContainerBackground = "base" | "subtle" | "muted" | "card" | "dark" | "transparent";

export interface SafeContainerProps {
  children?: React.ReactNode;
  edges?: readonly Edge[];
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
  scrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "style" | "contentContainerStyle">;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bg?: ContainerBackground;
  customBgColor?: string;
  statusBarStyle?: "auto" | "inverted" | "light" | "dark";
  statusBarHidden?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SafeContainer: React.FC<SafeContainerProps> = ({
  children,
  edges = ["top", "left", "right"] as readonly Edge[],
  avoidKeyboard = true,
  keyboardVerticalOffset,
  scrollable = false,
  scrollViewProps,
  contentContainerStyle,
  bg = "subtle" as ContainerBackground,
  customBgColor,
  statusBarStyle,
  statusBarHidden = false,
  className,
  style,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const resolvedBg: ContainerBackground = bg;
  const backgroundColor = customBgColor ?? getBackgroundColor(resolvedBg);

  // Default iOS keyboard offset considering safe area top inset
  const defaultIosOffset = keyboardVerticalOffset ?? (insets.top > 0 ? insets.top : 20);
  const defaultAndroidOffset = keyboardVerticalOffset ?? 0;

  const resolvedStatusBarStyle =
    statusBarStyle ?? (bg === "dark" ? "light" : "dark");

  const innerContent = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexOne, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      className={className}
      style={[styles.flexOne, { backgroundColor }, style]}
    >
      <StatusBar style={resolvedStatusBarStyle} hidden={statusBarHidden} />

      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? defaultIosOffset : defaultAndroidOffset
          }
          style={styles.flexOne}
        >
          {innerContent}
        </KeyboardAvoidingView>
      ) : (
        innerContent
      )}
    </SafeAreaView>
  );
};

function getBackgroundColor(bg: ContainerBackground): string {
  switch (bg) {
    case "base":
      return colors.surface.base;
    case "muted":
      return colors.surface.muted;
    case "card":
      return colors.surface.card;
    case "dark":
      return colors.neutral[900];
    case "transparent":
      return "transparent";
    case "subtle":
    default:
      return colors.brand.trip.bg;
  }
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
