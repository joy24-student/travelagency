import React from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../../hooks/useResponsive";

export interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollViewProps?: ScrollViewProps;
  keyboardVerticalOffset?: number;
  fixedFooter?: React.ReactNode;
  footerStyle?: StyleProp<ViewStyle>;
  dismissOnTap?: boolean;
  maxWidth?: number;
  enableResponsive?: boolean;
}

/**
 * Universal Form Container that prevents soft keyboards from obscuring TextInputs
 * and ensures bottom primary submit buttons remain visible above the keyboard.
 */
export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  contentContainerStyle,
  style,
  scrollViewProps,
  keyboardVerticalOffset,
  fixedFooter,
  footerStyle,
  dismissOnTap = true,
  maxWidth = 720,
  enableResponsive = true,
}) => {
  const insets = useSafeAreaInsets();
  const { isTablet, isDesktop } = useResponsive();

  const defaultOffset =
    keyboardVerticalOffset ??
    (Platform.OS === "ios" ? (insets.top > 0 ? insets.top + 20 : 64) : 0);

  const innerScroll = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollGrow, contentContainerStyle]}
      {...scrollViewProps}
    >
      <View
        style={[
          styles.contentWrapper,
          enableResponsive && (isTablet || isDesktop)
            ? { maxWidth, alignSelf: "center", width: "100%" }
            : undefined,
        ]}
      >
        {children}
      </View>
    </ScrollView>
  );

  const body = dismissOnTap ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.flexOne}>{innerScroll}</View>
    </TouchableWithoutFeedback>
  ) : (
    innerScroll
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flexOne, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={defaultOffset}
    >
      {body}
      {fixedFooter && (
        <View
          style={[
            styles.fixedFooter,
            { paddingBottom: Math.max(insets.bottom, 12) },
            footerStyle,
          ]}
        >
          <View
            style={[
              enableResponsive && (isTablet || isDesktop)
                ? { maxWidth, alignSelf: "center", width: "100%" }
                : undefined,
            ]}
          >
            {fixedFooter}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  contentWrapper: {
    width: "100%",
  },
  fixedFooter: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});
