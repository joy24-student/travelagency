import { useLocalSearchParams } from "expo-router";

import { screens } from "../../src/data/screens";
import { ConvertedScreen } from "../../src/screens/ConvertedScreen";
import { SettingsScreen } from "../../src/screens/SettingsScreen";
import { CommunitySpecializedScreen } from "../../src/screens/CommunityScreen";
import { BookingSystemScreen } from "../../src/screens/BookingSystemScreen";
import { HomeScreen } from "../../src/screens/HomeScreen";
import { ExploreScreen } from "../../src/screens/ExploreScreen";
import { SearchScreen } from "../../src/screens/SearchScreen";
import { PackageScreen } from "../../src/screens/PackageScreen";
import { LiveScreen } from "../../src/screens/LiveScreen";
import { AgencyChatScreen } from "../../src/screens/AgencyChatScreen";
import { TripPlannerScreen } from "../../src/screens/TripPlannerScreen";
import { EventsScreen } from "../../src/screens/EventsScreen";
import { CustomerSupportScreen } from "../../src/screens/CustomerSupportScreen";
import { ServiceChatScreen } from "../../src/screens/ServiceChatScreen";
import { InviteEarnScreen } from "../../src/screens/InviteEarnScreen";
import { SearchStaysScreen } from "../../src/screens/SearchStaysScreen";
import { FlightsScreen } from "../../src/screens/FlightsScreen";
import { TrainsScreen } from "../../src/screens/TrainsScreen";
import { HotelsHomesScreen } from "../../src/screens/HotelsHomesScreen";
import { RecommendedToursScreen } from "../../src/screens/RecommendedToursScreen";
import { CarRentalsScreen } from "../../src/screens/CarRentalsScreen";
import { AgencyListScreen } from "../../src/screens/AgencyListScreen";

import RewardsScreen from "../../src/screens/RewardsScreen";

export default function ScreenRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const screen = screens.find((item) => item.slug === slug) ?? screens[0];

  if (slug === "agencies" || slug === "agency" || slug === "agency-list" || screen.slug === "agencies" || screen.kind === "agency") {
    return <AgencyListScreen />;
  }

  if (slug === "search-stays" || screen.slug === "search-stays") {
    return <SearchStaysScreen />;
  }

  if (slug === "flights" || screen.slug === "flights") {
    return <FlightsScreen />;
  }

  if (slug === "trains" || screen.slug === "trains") {
    return <TrainsScreen />;
  }

  if (slug === "hotels-homes" || screen.slug === "hotels-homes") {
    return <HotelsHomesScreen />;
  }

  if (slug === "recommended-tours" || slug === "private-tours-search" || screen.slug === "recommended-tours" || screen.slug === "private-tours-search") {
    return <RecommendedToursScreen />;
  }

  if (slug === "car-rentals" || screen.slug === "car-rentals") {
    return <CarRentalsScreen />;
  }

  if (slug === "invite-earn" || slug === "invite" || screen.kind === "invite") {
    return <InviteEarnScreen />;
  }

  if (slug === "service-chat") {
    return <ServiceChatScreen />;
  }

  if (slug === "customer-support" || slug === "help" || screen.kind === "support") {
    return <CustomerSupportScreen />;
  }

  if (slug === "events" || screen.slug === "events") {
    return <EventsScreen />;
  }

  if (slug === "trip-planner" || slug === "ai-assistant" || screen.slug === "trip-planner") {
    return <TripPlannerScreen />;
  }

  if (slug === "rewards" || screen.slug === "rewards") {
    return <RewardsScreen />;
  }

  if (slug === "search" || screen.slug === "search") {
    return <SearchScreen screen={screen} />;
  }

  if (slug === "home" || (screen.kind === "home" && screen.slug === "home")) {
    return <HomeScreen />;
  }

  if (slug === "explore" || screen.slug === "explore") {
    return <ExploreScreen screen={screen} />;
  }

  if (slug === "packages" || screen.slug === "packages") {
    return <PackageScreen screen={screen} />;
  }

  if (slug === "live" || screen.slug === "live") {
    return <LiveScreen screen={screen} />;
  }

  if (slug === "settings" || screen.slug === "settings" || screen.kind === "settings") {
    return <SettingsScreen />;
  }

  if (slug === "community" || screen.slug === "travel-community-posts" || screen.slug === "travel-community-refined") {
    return <CommunitySpecializedScreen screen={screen} />;
  }

  if (slug === "booking-system" || screen.slug === "booking-system" || screen.kind === "booking") {
    return <BookingSystemScreen screen={screen} />;
  }

  if (slug === "agency-chat" || screen.slug === "agency-chat") {
    return <AgencyChatScreen />;
  }

  // Dedicated replicated service screens render their custom rich UI:
  // - flights (Flights engine & discovery)
  // - search-stays (Hotels & stays discovery)
  // - hotels-homes (Hotels & vacation rentals)
  // - trains (Trains & transit passes)
  // - recommended-tours (Attractions & private tours)
  // - private-tours-search (Private tours catalog)
  // - car-rentals (Car rentals & vehicle bookings)
  // - partner-program, account-security, premium-account
  return <ConvertedScreen screen={screen} />;
}
