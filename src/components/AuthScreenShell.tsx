import { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../hooks/useResponsive";

type AuthScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreenShell({
  title,
  subtitle,
  children,
  footer,
}: AuthScreenShellProps) {
  const insets = useSafeAreaInsets();
  const { isTablet, isDesktop } = useResponsive();

  return (
    <SafeAreaView className="flex-1 bg-trip-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 16 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            alignItems: isTablet || isDesktop ? "center" : "stretch",
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={
              isTablet || isDesktop
                ? {
                    width: "100%",
                    maxWidth: 480,
                    alignSelf: "center",
                    backgroundColor: "#ffffff",
                    borderRadius: 24,
                    padding: 32,
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 16px rgba(15, 23, 42, 0.08)" } : {}),
                  }
                : { flex: 1, justifyContent: "center" }
            }
          >
            <Text className="text-3xl font-extrabold text-trip-dark">
              {title}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-gray-500">
              {subtitle}
            </Text>
            <View className="mt-8">{children}</View>
            {footer ? <View className="mt-6">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
