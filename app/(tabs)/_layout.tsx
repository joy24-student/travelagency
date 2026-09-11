import { Tabs, usePathname } from "expo-router";
import { View, StyleSheet } from "react-native";
import { BottomNav, AiPill } from "../../src/screens/Navigation";

export default function TabLayout() {
  const pathname = usePathname();

  // Determine active tab based on current path for custom navigation indicator
  let activeTab = "Home";
  if (pathname.includes("/messages")) activeTab = "Messages";
  else if (pathname.includes("/community")) activeTab = "Community";
  else if (pathname.includes("/trips")) activeTab = "My Trips";
  else if (pathname.includes("/account")) activeTab = "Sign In";

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" }, // Custom bottom navbar handles UI globally
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="messages" />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="trips" />
        <Tabs.Screen name="account" />
      </Tabs>

      {/* Single Global Navigation Bar Overlay */}
      <AiPill color="#0055F2" />
      <BottomNav active={activeTab} color="#0055F2" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});