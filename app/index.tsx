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
    let isMounted = true;

    async function determineInitialRoute() {
      if (loading) return;

      if (isAuthenticated) {
        router.replace("/(tabs)");
        return;
      }

      try {
        const demoMode = await AsyncStorage.getItem("@app:demo_mode");
        if (demoMode === "true") {
          router.replace("/(tabs)");
          return;
        }

        const hasSeenOnboarding = await AsyncStorage.getItem("@app:has_seen_onboarding");
        if (!isMounted) return;

        if (!hasSeenOnboarding) {
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(auth)/login");
        }
      } catch {
        if (isMounted) {
          router.replace("/(auth)/login");
        }
      }
    }

    determineInitialRoute();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, loading]);

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
