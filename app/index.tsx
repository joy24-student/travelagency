import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../src/hooks/useAuth";
import { useTheme } from "../src/context/ThemeContext";

export default function IndexScreen() {
  const { loading, isAuthenticated } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!loading) {
      router.replace("/(tabs)");
    }
  }, [loading]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View className="items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}
