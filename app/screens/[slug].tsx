import React, { Suspense, lazy } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

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

export default function ScreenRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const screen = screens.find((item) => item.slug === slug) ?? screens[0];

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

  return <ConvertedScreen screen={screen} />;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
});
