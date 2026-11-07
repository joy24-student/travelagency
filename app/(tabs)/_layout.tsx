import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { CustomBottomTabBar } from "../../src/screens/Navigation";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <CustomBottomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarBadge: 3,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: "My Trips",
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Sign In",
          }}
        />
        {/* Action Route: Dedicated post composer (hidden from bottom bar, accessed via /post or (+) actions) */}
        <Tabs.Screen
          name="post"
          options={{
            href: null,
            title: "Create Post",
          }}
        />
        <Tabs.Screen
          name="agency"
          options={{
            href: null,
            title: "Agency",
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
