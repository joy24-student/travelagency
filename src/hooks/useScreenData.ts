import { useMemo } from "react";
import { useQuery, useCurrentUser } from "./useAuth";
import {
  searchRepository,
  bookingRepository,
  communityRepository,
  userRepository,
  supportRepository,
  loyaltyRepository
} from "../services/repositories";
import type { UIScreen, ScreenKind } from "../data/screens";

export function useScreenData(screen: UIScreen) {
  const user = useCurrentUser();
  const userId = user?.id;

  const { data, loading, error, refetch } = useQuery(async () => {
    if (screen.slug === "flights") {
      return await searchRepository.searchFlights({});
    }
    if (screen.slug === "trains") {
      return await searchRepository.searchTrains({});
    }
    if (screen.slug === "car-rentals") {
      return await searchRepository.searchCarRentals({});
    }
    if (screen.slug === "recommended-tours" || screen.slug === "private-tours-search") {
      return await searchRepository.searchTours({});
    }

    switch (screen.kind) {
      case "hotel":
        return await searchRepository.searchHotels({});

      case "trips":
        if (!userId) return [];
        return await bookingRepository.getUserBookings(userId);

      case "messages":
        if (!userId) return [];
        const { data: notifications } = await userRepository.getSettings(); // Placeholder for actual notifications
        return notifications;

      case "community":
        return await communityRepository.getPostsFeed();

      case "account":
        if (!userId) return null;
        return await userRepository.getProfile();

      case "settings":
        if (!userId) return null;
        return await userRepository.getSettings();

      case "support":
        return await supportRepository.getFAQ();

      case "rewards":
        if (!userId) return null;
        return await loyaltyRepository.getLoyaltyAccount(userId);

      case "package":
        return await searchRepository.searchTours({});

      default:
        return null;
    }
  }, [screen.kind, userId]);

  return {
    data,
    loading,
    error,
    refetch
  };
}
