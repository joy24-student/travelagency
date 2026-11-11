import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function AgencyLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B1326" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: "Travel Agency B2B Portal" }} />
        <Stack.Screen name="[slug]" options={{ headerShown: false, title: "Agency Portal Operations" }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1326",
  },
});
