import React, { Suspense, lazy } from "react";
import { Platform,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { screens } from "../../src/data/screens";

// Route Code-Splitting & Lazy Loading:
// Dynamic imports ensure heavyweight screens and scanner modules are split into async chunks
const ConvertedScreen = lazy(() => import("../../src/screens/ConvertedScreen").then((m) => ({ default: m.ConvertedScreen })));
const SettingsScreen = lazy(() => import("../../src/screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const CommunitySpecializedScreen = lazy(() => import("../../src/screens/CommunityScreen").then((m) => ({ default: m.CommunitySpecializedScreen })));
const BookingSystemScreen = lazy(() => import("../../src/screens/BookingSystemScreen").then((m) => ({ default: m.BookingSystemScreen })));
const HomeScreen = lazy(() => import("../../src/screens/HomeScreen").then((m) => ({ default: m.HomeScreen })));
const ExploreScreen = lazy(() => import("../../src/screens/ExploreScreen").then((m) => ({ default: m.ExploreScreen })));
const SearchScreen = lazy(() => import("../../src/screens/SearchScreen").then((m) => ({ default: m.SearchScreen })));
const PackageScreen = lazy(() => import("../../src/screens/PackageScreen").then((m) => ({ default: m.PackageScreen })));
const LiveScreen = lazy(() => import("../../src/screens/LiveScreen").then((m) => ({ default: m.LiveScreen })));
const AgencyChatScreen = lazy(() => import("../../src/screens/AgencyChatScreen").then((m) => ({ default: m.AgencyChatScreen })));
const TripPlannerScreen = lazy(() => import("../../src/screens/TripPlannerScreen").then((m) => ({ default: m.TripPlannerScreen })));
const EventsScreen = lazy(() => import("../../src/screens/EventsScreen").then((m) => ({ default: m.EventsScreen })));
const CustomerSupportScreen = lazy(() => import("../../src/screens/CustomerSupportScreen").then((m) => ({ default: m.CustomerSupportScreen })));
const ServiceChatScreen = lazy(() => import("../../src/screens/ServiceChatScreen").then((m) => ({ default: m.ServiceChatScreen })));
const InviteEarnScreen = lazy(() => import("../../src/screens/InviteEarnScreen").then((m) => ({ default: m.InviteEarnScreen })));
const SearchStaysScreen = lazy(() => import("../../src/screens/SearchStaysScreen").then((m) => ({ default: m.SearchStaysScreen })));
const FlightsScreen = lazy(() => import("../../src/screens/FlightsScreen").then((m) => ({ default: m.FlightsScreen })));
const TrainsScreen = lazy(() => import("../../src/screens/TrainsScreen").then((m) => ({ default: m.TrainsScreen })));
const HotelsHomesScreen = lazy(() => import("../../src/screens/HotelsHomesScreen").then((m) => ({ default: m.HotelsHomesScreen })));
const RecommendedToursScreen = lazy(() => import("../../src/screens/RecommendedToursScreen").then((m) => ({ default: m.RecommendedToursScreen })));
const CarRentalsScreen = lazy(() => import("../../src/screens/CarRentalsScreen").then((m) => ({ default: m.CarRentalsScreen })));
const AgencyListScreen = lazy(() => import("../../src/screens/AgencyListScreen").then((m) => ({ default: m.AgencyListScreen })));
const RewardsScreen = lazy(() => import("../../src/screens/RewardsScreen"));
const LandmarkScannerScreen = lazy(() => import("../../src/screens/LandmarkScannerScreen"));

const ScreenFallback = () => (
  <View style={styles.fallback}>
    <ActivityIndicator size="small" color="#0055F2" />
  </View>
);

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
          {slug ? `"${slug}" নামের কোনো সার্ভিস বা স্ক্রিন খুঁজে পাওয়া যায়নি।` : "অনুরোধকৃত স্ক্রিনটি খুঁজে পাওয়া যায়নি।"}
        </Text>
        <View style={styles.actionGroup}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)")}
            accessibilityRole="button"
            accessibilityLabel="হোমে ফিরে যান"
          >
            <Ionicons name="home-outline" size={18} color="#FFFFFF" style={{ marginEnd: 8 }} />
            <Text style={styles.primaryBtnText}>হোমে ফিরে যান</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/screens/explore" as any)}
            accessibilityRole="button"
            accessibilityLabel="অন্যান্য সার্ভিস দেখুন"
          >
            <Ionicons name="compass-outline" size={18} color="#0055F2" style={{ marginEnd: 8 }} />
            <Text style={styles.secondaryBtnText}>অন্যান্য সার্ভিস দেখুন</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ScreenRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const screen = screens.find((item) => item.slug === slug);

  return (
    <Suspense fallback={<ScreenFallback />}>
      {renderRouteContent(slug, screen)}
    </Suspense>
  );
}

function renderRouteContent(slug: string | undefined, screen: any) {
  if (
    slug === "scanner" ||
    slug === "qr-scanner" ||
    slug === "landmark-scanner" ||
    screen?.slug === "landmark-scanner"
  ) {
    return <LandmarkScannerScreen />;
  }

  if (
    slug === "agencies" ||
    slug === "agency" ||
    slug === "agency-list" ||
    screen?.slug === "agencies" ||
    screen?.kind === "agency"
  ) {
    return <AgencyListScreen />;
  }

  if (slug === "search-stays" || screen?.slug === "search-stays") {
    return <SearchStaysScreen />;
  }

  if (slug === "flights" || screen?.slug === "flights") {
    return <FlightsScreen />;
  }

  if (slug === "trains" || screen?.slug === "trains") {
    return <TrainsScreen />;
  }

  if (slug === "hotels-homes" || screen?.slug === "hotels-homes") {
    return <HotelsHomesScreen />;
  }

  if (
    slug === "recommended-tours" ||
    slug === "private-tours-search" ||
    screen?.slug === "recommended-tours" ||
    screen?.slug === "private-tours-search"
  ) {
    return <RecommendedToursScreen />;
  }

  if (slug === "car-rentals" || screen?.slug === "car-rentals") {
    return <CarRentalsScreen />;
  }

  if (slug === "invite-earn" || slug === "invite" || screen?.kind === "invite") {
    return <InviteEarnScreen />;
  }

  if (slug === "service-chat") {
    return <ServiceChatScreen />;
  }

  if (slug === "customer-support" || slug === "help" || screen?.kind === "support") {
    return <CustomerSupportScreen />;
  }

  if (slug === "events" || screen?.slug === "events") {
    return <EventsScreen />;
  }

  if (slug === "trip-planner" || slug === "ai-assistant" || screen?.slug === "trip-planner") {
    return <TripPlannerScreen />;
  }

  if (slug === "rewards" || screen?.slug === "rewards") {
    return <RewardsScreen />;
  }

  if (slug === "search" || screen?.slug === "search") {
    return <SearchScreen screen={screen} />;
  }

  if (slug === "home" || (screen?.kind === "home" && screen?.slug === "home")) {
    return <HomeScreen />;
  }

  if (slug === "explore" || screen?.slug === "explore") {
    return <ExploreScreen screen={screen} />;
  }

  if (slug === "packages" || screen?.slug === "packages") {
    return <PackageScreen screen={screen} />;
  }

  if (slug === "live" || screen?.slug === "live") {
    return <LiveScreen screen={screen} />;
  }

  if (slug === "settings" || screen?.slug === "settings" || screen?.kind === "settings") {
    return <SettingsScreen />;
  }

  if (
    slug === "community" ||
    screen?.slug === "travel-community-posts" ||
    screen?.slug === "travel-community-refined"
  ) {
    return <CommunitySpecializedScreen screen={screen} />;
  }

  if (slug === "booking-system" || screen?.slug === "booking-system" || screen?.kind === "booking") {
    return <BookingSystemScreen screen={screen} />;
  }

  if (slug === "agency-chat" || screen?.slug === "agency-chat") {
    return <AgencyChatScreen />;
  }

  // If matched in data screens array, render ConvertedScreen
  if (screen) {
    return <ConvertedScreen screen={screen} />;
  }

  // Graceful fallback for invalid/unmatched slugs:
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
    marginBottom: 4,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 28,
  },
  actionGroup: {
    width: "100%",
    maxWidth: 280,
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0055F2",
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.2)" } : {}),
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  secondaryBtnText: {
    color: "#0055F2",
    fontSize: 15,
    fontWeight: "700",
  },
});
