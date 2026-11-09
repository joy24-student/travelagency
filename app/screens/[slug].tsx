import React, { Suspense, lazy } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";

import { screens } from "../../src/data/screens";

// Dynamic Import for Data-Driven Screens
const ConvertedScreen = lazy(() =>
  import("../../src/screens/ConvertedScreen").then((m) => ({
    default: m.ConvertedScreen,
  }))
);

const ScreenFallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="small" color="#0055F2" />
  </View>
);

// Map aliases or direct names to canonical dedicated route files
const DEDICATED_ROUTE_MAP: Record<string, string> = {
  // Tabs
  home: "/(tabs)",
  community: "/(tabs)/community",

  // Dedicated screen routes (handled in their own app/screens/*.tsx files)
  flights: "/screens/flights",
  trains: "/screens/trains",
  "hotels-homes": "/screens/hotels-homes",
  "car-rentals": "/screens/car-rentals",
  "search-stays": "/screens/search-stays",
  "recommended-tours": "/screens/recommended-tours",
  "private-tours-search": "/screens/recommended-tours",
  agencies: "/screens/agencies",
  agency: "/screens/agencies",
  "agency-list": "/screens/agencies",
  "agency-chat": "/screens/agency-chat",
  "booking-system": "/screens/booking-system",
  "customer-support": "/screens/customer-support",
  help: "/screens/customer-support",
  events: "/screens/events",
  explore: "/screens/explore",
  "invite-earn": "/screens/invite-earn",
  invite: "/screens/invite-earn",
  "landmark-scanner": "/screens/landmark-scanner",
  scanner: "/screens/landmark-scanner",
  "qr-scanner": "/screens/landmark-scanner",
  live: "/screens/live",
  packages: "/screens/packages",
  rewards: "/screens/rewards",
  search: "/screens/search",
  "service-chat": "/screens/service-chat",
  settings: "/screens/settings",
  "trip-planner": "/screens/trip-planner",
  "ai-assistant": "/screens/trip-planner",
};

function ScreenNotFound({ slug }: { slug?: string }) {
  return (
    <SafeAreaView style={styles.notFoundContainer}>
      <View style={styles.notFoundContent}>
        <View style={styles.notFoundIconCircle}>
          <Ionicons name="alert-circle-outline" size={56} color="#0055F2" />
        </View>
        <Text style={styles.notFoundCode}>404</Text>
        <Text style={styles.notFoundTitle}>স্ক্রিনটি পাওয়া যায়নি</Text>
        <Text style={styles.notFoundSubtitle}>
          {slug
            ? `"${slug}" নামের কোনো সার্ভিস বা স্ক্রিন খুঁজে পাওয়া যায়নি।`
            : "অনুরোধকৃত স্ক্রিনটি খুঁজে পাওয়া যায়নি।"}
        </Text>
        <View style={styles.actionGroup}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="হোমে ফিরে যান"
          >
            <Ionicons
              name="home-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginEnd: 8 }}
            />
            <Text style={styles.primaryBtnText}>হোমে ফিরে যান</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/screens/explore" as any)}
            accessibilityRole="button"
            accessibilityLabel="অন্যান্য সার্ভিস দেখুন"
          >
            <Ionicons
              name="compass-outline"
              size={18}
              color="#0055F2"
              style={{ marginEnd: 8 }}
            />
            <Text style={styles.secondaryBtnText}>অন্যান্য সার্ভিস দেখুন</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ScreenRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // 1. If this screen has a dedicated route file, redirect there to avoid duplicate handling
  if (slug && DEDICATED_ROUTE_MAP[slug]) {
    return <Redirect href={DEDICATED_ROUTE_MAP[slug] as any} />;
  }

  // 2. Dynamic data-driven screen from screens registry
  const screen = screens.find((item) => item.slug === slug);
  if (screen) {
    if (screen.slug && DEDICATED_ROUTE_MAP[screen.slug]) {
      return <Redirect href={DEDICATED_ROUTE_MAP[screen.slug] as any} />;
    }
    return (
      <Suspense fallback={<ScreenFallback />}>
        <ConvertedScreen screen={screen} />
      </Suspense>
    );
  }

  // 3. Graceful fallback for invalid/unmatched slugs
  return <ScreenNotFound slug={slug} />;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  notFoundContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  notFoundIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  notFoundCode: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0055F2",
    letterSpacing: 2,
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  notFoundSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  actionGroup: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#0055F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  secondaryBtnText: {
    color: "#0055F2",
    fontSize: 16,
    fontWeight: "600",
  },
});
