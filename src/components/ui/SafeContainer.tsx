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
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  SafeAreaView,
  Edge,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { FocusAwareStatusBar } from "./AppStatusBar";
import { colors } from "../../theme/colors";
import { ResponsiveContainer } from "../layout/ResponsiveLayout";

export type ContainerBackground =
  | "base"
  | "subtle"
  | "muted"
  | "card"
  | "dark"
  | "transparent";

export interface SafeContainerProps {
  children?: React.ReactNode;
  edges?: readonly Edge[];
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
  keyboardDismissOnTap?: boolean;
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
  // Responsive constraints for Tablet & Web
  responsive?: boolean;
  maxWidth?: number;
  // Fixed footer / submit button pinned above keyboard and respecting bottom safe area
  fixedFooter?: React.ReactNode;
  footerStyle?: StyleProp<ViewStyle>;
}

export const SafeContainer: React.FC<SafeContainerProps> = ({
  children,
  edges = ["top", "left", "right"] as readonly Edge[],
  avoidKeyboard = true,
  keyboardVerticalOffset,
  keyboardDismissOnTap = false,
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
  responsive = false,
  maxWidth,
  fixedFooter,
  footerStyle,
}) => {
  const insets = useSafeAreaInsets();
  const resolvedBg: ContainerBackground = bg;
  const backgroundColor = customBgColor ?? getBackgroundColor(resolvedBg);

  // Default iOS keyboard offset considering safe area top inset
  const defaultIosOffset =
    keyboardVerticalOffset ?? (insets.top > 0 ? insets.top : 20);
  const defaultAndroidOffset = keyboardVerticalOffset ?? 0;

  const resolvedStatusBarStyle =
    statusBarStyle ?? (bg === "dark" ? "light" : "dark");

  const wrappedChildren = responsive ? (
    <ResponsiveContainer maxWidth={maxWidth}>{children}</ResponsiveContainer>
  ) : (
    children
  );

  const innerScrollContent = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      {...scrollViewProps}
    >
      {wrappedChildren}
    </ScrollView>
  ) : (
    <View style={[styles.flexOne, contentContainerStyle]}>
      {wrappedChildren}
    </View>
  );

  const bodyContent = keyboardDismissOnTap ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {innerScrollContent}
    </TouchableWithoutFeedback>
  ) : (
    innerScrollContent
  );

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      className={className}
      style={[styles.flexOne, { backgroundColor }, style]}
    >
      <FocusAwareStatusBar style={resolvedStatusBarStyle} hidden={statusBarHidden} />

      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? defaultIosOffset : defaultAndroidOffset
          }
          style={styles.flexOne}
        >
          {bodyContent}
          {fixedFooter && (
            <View
              style={[
                styles.fixedFooter,
                { paddingBottom: Math.max(insets.bottom, 12) },
                footerStyle,
              ]}
            >
              {responsive ? (
                <ResponsiveContainer maxWidth={maxWidth}>
                  {fixedFooter}
                </ResponsiveContainer>
              ) : (
                fixedFooter
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      ) : (
        <>
          {bodyContent}
          {fixedFooter && (
            <View
              style={[
                styles.fixedFooter,
                { paddingBottom: Math.max(insets.bottom, 12) },
                footerStyle,
              ]}
            >
              {responsive ? (
                <ResponsiveContainer maxWidth={maxWidth}>
                  {fixedFooter}
                </ResponsiveContainer>
              ) : (
                fixedFooter
              )}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export const ScreenWrapper = SafeContainer;

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
  fixedFooter: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});
