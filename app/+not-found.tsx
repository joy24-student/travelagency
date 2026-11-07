import React from "react";
import { Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, router } from "expo-router";

/**
 * 404 Not Found Screen
 * Caught by Expo Router whenever an unmatched deep link or URL route is requested.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found", headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="compass-outline" size={64} color="#0055F2" />
          </View>

          <Text style={styles.errorCode}>404</Text>
          <Text style={styles.title}>পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</Text>
          <Text style={styles.subtitle}>
            দুঃখিত, আপনি যে পেজ বা লিংকটিতে যেতে চেয়েছেন তা বর্তমানে উপলভ্য নয় অথবা সরানো হয়েছে।
          </Text>

          <View style={styles.actionGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/(tabs)")}
              accessibilityRole="button"
              accessibilityLabel="Return to Home"
            >
              <Ionicons name="home-outline" size={20} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.primaryButtonText}>হোমে ফিরে যান</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/screens/explore" as any)}
              accessibilityRole="button"
              accessibilityLabel="Explore Services"
            >
              <Ionicons name="search-outline" size={20} color="#0055F2" style={styles.btnIcon} />
              <Text style={styles.secondaryButtonText}>সার্ভিসগুলো দেখুন</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.supportLink}
            onPress={() => router.push("/screens/customer-support" as any)}
          >
            <Ionicons name="help-buoy-outline" size={16} color="#64748B" />
            <Text style={styles.supportText}>সাহায্যের প্রয়োজন? কাস্টমার সাপোর্টে কথা বলুন</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  errorCode: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0055F2",
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 32,
  },
  actionGroup: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0055F2",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.2)" } : {}),
  },
  btnIcon: {
    marginEnd: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  secondaryButtonText: {
    color: "#0055F2",
    fontSize: 16,
    fontWeight: "700",
  },
  supportLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 36,
  },
  supportText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});
