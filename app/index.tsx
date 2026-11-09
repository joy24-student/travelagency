import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../src/hooks/useAuth";

export default function IndexScreen() {
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading) {
      router.replace("/(tabs)");
    }
  }, [loading]);

  return (
    <SafeAreaView className="flex-1 bg-trip-bg items-center justify-center">
      <View className="items-center">
        <ActivityIndicator size="large" color="#287dfa" />
      </View>
    </SafeAreaView>
  );
}
