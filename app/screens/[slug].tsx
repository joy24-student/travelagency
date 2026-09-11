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

export default function ScreenRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const screen = screens.find((item) => item.slug === slug) ?? screens[0];

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

  if (screen.kind === "home" && screen.slug === "home") return <HomeScreen />;
  if (screen.kind === "explore") return <ExploreScreen screen={screen} />;
  if (screen.kind === "search") return <SearchScreen screen={screen} />;
  if (screen.kind === "package") return <PackageScreen screen={screen} />;
  if (screen.kind === "live") return <LiveScreen screen={screen} />;
  if (screen.kind === "settings" || slug === "settings") return <SettingsScreen />;
  if (screen.kind === "community") return <CommunitySpecializedScreen screen={screen} />;
  if (screen.kind === "booking") return <BookingSystemScreen screen={screen} />;
  if (screen.kind === "hotel") return <SearchScreen screen={screen} />;
  if (screen.kind === "assistant") return <TripPlannerScreen />;
  if (screen.kind === "list") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "payments") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "support") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "rewards") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "invite") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "trips") return <ConvertedScreen screen={screen} />;
  if (screen.kind === "messages") return <ConvertedScreen screen={screen} />;
  if (screen.slug === "agency-chat") return <AgencyChatScreen />;

  return <ConvertedScreen screen={screen} />;
}
