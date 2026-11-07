// Authentication hooks
export { useAuth } from "./useAuth";
export { useQuery, useMutation, useRealtimeSubscription } from "./useAuth";

// User hooks
export {
  useUserProfile,
  useUserPreferences,
  useUserAddresses,
} from "./useUser";

// Booking hooks
export {
  useUserBookings,
  useBooking,
  useCreateBooking,
  useBookingActions,
} from "./useBooking";

// Search hooks
export {
  useSearchHotels,
  useHotel,
  useSearchFlights,
  useFlight,
  useSearchTours,
  useTour,
  useAirports,
} from "./useSearch";

// Community hooks
export {
  usePostsFeed,
  useUserPosts,
  useCreatePost,
  usePostInteractions,
  useSavedPosts,
  useFollowing,
} from "./useCommunity";

// Loyalty and Support hooks
export {
  useLoyaltyAccount,
  useLoyaltyPoints,
  useAvailableRewards,
  useRedeemReward,
  useUserRedemptions,
  useUserTickets,
  useTicket,
  useCreateTicket,
  useTicketInteractions,
  useFAQ,
} from "./useLoyaltySupport";

export { useDebounce } from "./useDebounce";

// Screen collaboration & Event Bus hooks
export {
  useScreenCollaboration,
  useScreenEventEmitter,
  useScreenHandoff,
} from "./useScreenCollaboration";

// Responsive & Layout hooks (Addresses screen dimension, tablet/web layouts)
export * from "./useResponsive";
export { useA11yFocusRing } from "./useA11yFocusRing";
export { useDoubleSubmitProtection } from "./useDoubleSubmitProtection";
export { usePagination } from "./usePagination";

