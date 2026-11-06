/**
 * Strict Route Parameter Contracts for Expo Router - Shopno Jatra
 * Provides type-safe route parameters for all stacks, tabs, and dynamic routes.
 */

export interface AuthRoutesParams {
  "/(auth)/login": undefined;
  "/(auth)/otp": {
    phone?: string;
    email?: string;
    mode?: "phone" | "email";
    returnTo?: string;
  };
  "/(auth)/forgot-password": {
    email?: string;
  };
  "/(auth)/reset-password": {
    token?: string;
    email?: string;
  };
  "/(auth)/email-verification": {
    email: string;
    token?: string;
  };
  "/(auth)/biometric-login": undefined;
  "/(auth)/callback": {
    code?: string;
    error?: string;
  };
}

export interface TabRoutesParams {
  "/(tabs)": undefined;
  "/(tabs)/index": undefined;
  "/(tabs)/community": undefined;
  "/(tabs)/trips": {
    filter?: "upcoming" | "completed" | "cancelled";
  } | undefined;
  "/(tabs)/post": {
    draftId?: string;
  } | undefined;
  "/(tabs)/messages": {
    activeChannelId?: string;
  } | undefined;
  "/(tabs)/account": undefined;
  "/(tabs)/agency/index": undefined;
}

export interface ScreenRoutesParams {
  "/screens/hotels-homes": {
    destination?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    rooms?: number;
    priceMin?: number;
    priceMax?: number;
    starRating?: number;
  } | undefined;
  "/screens/search-stays": {
    destination?: string;
    dates?: string;
  } | undefined;
  "/screens/flights": {
    origin?: string;
    destination?: string;
    departDate?: string;
    returnDate?: string;
    passengers?: number;
    cabinClass?: "economy" | "premium" | "business" | "first";
    tripType?: "one_way" | "round_trip" | "multi_city";
  } | undefined;
  "/screens/trains": {
    from?: string;
    to?: string;
    journeyDate?: string;
    classType?: string;
    trainNumber?: string;
  } | undefined;
  "/screens/packages": {
    destination?: string;
    category?: string;
    duration?: string;
  } | undefined;
  "/screens/recommended-tours": {
    category?: string;
    region?: string;
  } | undefined;
  "/screens/tour-guides": {
    region?: string;
    language?: string;
    guideId?: string;
  } | undefined;
  "/screens/car-rentals": {
    pickupLocation?: string;
    dropoffLocation?: string;
    pickupDate?: string;
    dropoffDate?: string;
  } | undefined;
  "/screens/trip-planner": {
    destination?: string;
    days?: number;
    budget?: "budget" | "standard" | "luxury";
  } | undefined;
  "/screens/travel-match": {
    matchType?: "buddy" | "group";
    interests?: string;
  } | undefined;
  "/screens/explore": {
    category?: string;
  } | undefined;
  "/screens/search": {
    query?: string;
    type?: "all" | "hotel" | "flight" | "train" | "tour";
  } | undefined;
  "/screens/payments": {
    bookingId: string;
    amount: number;
    currency?: string;
    method?: string;
  };
  "/screens/payment-details": {
    paymentId?: string;
    bookingId?: string;
    transactionId?: string;
  };
  "/screens/payment-callback": {
    paymentID?: string;
    status?: string;
    signature?: string;
  };
  "/screens/payment-success": {
    transactionId: string;
    bookingReference: string;
    amount?: number;
    currency?: string;
  };
  "/screens/payment-failed": {
    error?: string;
    bookingReference?: string;
    bookingId?: string;
  };
  "/screens/payments-enhanced": {
    bookingId?: string;
  } | undefined;
  "/screens/transaction-history": undefined;
  "/screens/profile": undefined;
  "/screens/user-profile": {
    userId: string;
  };
  "/screens/settings": undefined;
  "/screens/reviews": {
    entityId: string;
    entityType: "hotel" | "flight" | "train" | "tour" | "agency";
  };
  "/screens/rewards": undefined;
  "/screens/saved": undefined;
  "/screens/customer-support": {
    topic?: string;
    bookingId?: string;
  } | undefined;
  "/screens/service-chat": {
    channelId?: string;
    ticketId?: string;
    agentName?: string;
  } | undefined;
  "/screens/call": {
    callId: string;
    recipientId: string;
    recipientName?: string;
    isVideo?: boolean;
  };
  "/screens/events": undefined;
  "/screens/invite-earn": undefined;
  "/screens/help": undefined;
  "/screens/emergency": undefined;
  "/screens/offline-survival": undefined;
  "/screens/[slug]": {
    slug: string;
    title?: string;
  };
}

export interface AdminRoutesParams {
  "/admin": undefined;
  "/admin/[slug]": {
    slug: string;
  };
}

/**
 * Complete Combined App Route Parameters
 */
export type AppRoutesParams = AuthRoutesParams &
  TabRoutesParams &
  ScreenRoutesParams &
  AdminRoutesParams & {
    "/": undefined;
  };

export type AppRoute = keyof AppRoutesParams;

export type RouteParams<T extends AppRoute> = AppRoutesParams[T];
