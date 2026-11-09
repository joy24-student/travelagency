/**
 * Application Routes Constants - Shopno Jatra
 * Centralized, type-safe routing definitions for Expo Router.
 * Prevents broken route references (such as obsolete '/home').
 */

export const ROUTES = {
  // Root / Index
  ROOT: "/" as const,

  // Main Tabs
  HOME: "/(tabs)" as const,
  TABS: {
    INDEX: "/(tabs)" as const,
    COMMUNITY: "/(tabs)/community" as const,
    TRIPS: "/(tabs)/trips" as const,
    POST: "/(tabs)/post" as const,
    MESSAGES: "/(tabs)/messages" as const,
    ACCOUNT: "/(tabs)/account" as const,
    AGENCY: "/(tabs)/agency/index" as const,
  },

  // Core Screens
  SCREENS: {
    PAYMENTS: "/screens/payments" as const,
    PAYMENT_SUCCESS: "/screens/payment-success" as const,
    PAYMENT_FAILED: "/screens/payment-failed" as const,
    PAYMENT_CALLBACK: "/screens/payment-callback" as const,
    PAYMENT_DETAILS: "/screens/payment-details" as const,
    TRANSACTION_HISTORY: "/screens/transaction-history" as const,
    HOTELS_HOMES: "/screens/hotels-homes" as const,
    SEARCH_STAYS: "/screens/search-stays" as const,
    FLIGHTS: "/screens/flights" as const,
    TRAINS: "/screens/trains" as const,
    PACKAGES: "/screens/packages" as const,
    RECOMMENDED_TOURS: "/screens/recommended-tours" as const,
    TOUR_GUIDES: "/screens/tour-guides" as const,
    CAR_RENTALS: "/screens/car-rentals" as const,
    TRIP_PLANNER: "/screens/trip-planner" as const,
    TRAVEL_MATCH: "/screens/travel-match" as const,
    EXPLORE: "/screens/explore" as const,
    SEARCH: "/screens/search" as const,
    CUSTOMER_SUPPORT: "/screens/customer-support" as const,
    HELP: "/screens/help" as const,
    SERVICE_CHAT: "/screens/service-chat" as const,
    CALL: "/screens/call" as const,
    EVENTS: "/screens/events" as const,
    INVITE_EARN: "/screens/invite-earn" as const,
    AGENCIES: "/screens/agencies" as const,
    EMERGENCY: "/screens/emergency" as const,
    OFFLINE_SURVIVAL: "/screens/offline-survival" as const,
    SETTINGS: "/screens/settings" as const,
    PROFILE: "/screens/profile" as const,
    REVIEWS: "/screens/reviews" as const,
    REWARDS: "/screens/rewards" as const,
    SAVED: "/screens/saved" as const,
    E_TICKET: "/screens/e-ticket" as const,
    PRICE_ALERTS: "/screens/price-alerts" as const,
    GROUP_TRIP: "/screens/group-trip" as const,
    LIVE: "/screens/live" as const,
    AGENCY_CHAT: "/screens/agency-chat" as const,
  },

  // Authentication Routes
  AUTH: {
    LOGIN: "/(auth)/login" as const,
    OTP: "/(auth)/otp" as const,
    FORGOT_PASSWORD: "/(auth)/forgot-password" as const,
    RESET_PASSWORD: "/(auth)/reset-password" as const,
    EMAIL_VERIFICATION: "/(auth)/email-verification" as const,
    BIOMETRIC_LOGIN: "/(auth)/biometric-login" as const,
    CALLBACK: "/(auth)/callback" as const,
  },

  // Admin Routes
  ADMIN: {
    INDEX: "/admin" as const,
  },
} as const;

export type AppRoutes = typeof ROUTES;
