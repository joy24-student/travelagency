/**
 * Shopno Jatra FastAPI Backend Client
 * Connects React Native app to the high-performance FastAPI backend.
 */

import { supabase } from "../utils/supabase";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

/**
 * Universal fetch wrapper that attaches Supabase Bearer token and Correlation ID
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers = {}, ...rest } = options;

  // Retrieve current session token from Supabase Auth
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } catch (err) {
    console.warn("Could not retrieve Supabase session token:", err);
  }

  // Construct URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: reqHeaders,
    ...rest,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.title || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * High-priority API endpoint methods
 */
export const backendApi = {
  // 1. Hotels & Flights Search (with Redis Caching)
  searchHotels: (params: {
    city?: string;
    country?: string;
    query?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    rooms_needed?: number;
    min_price?: number;
    max_price?: number;
    min_rating?: number;
    page?: number;
    page_size?: number;
  }) => apiRequest<any>("/hotels/search", { params }),

  getHotelDetails: (hotelId: string) =>
    apiRequest<any>(`/hotels/${hotelId}`),

  searchFlights: (params: {
    origin?: string;
    destination?: string;
    departure_date?: string;
    return_date?: string;
    passengers?: number;
    cabin_class?: string;
    max_stops?: number;
    min_price?: number;
    max_price?: number;
    page?: number;
    page_size?: number;
  }) => apiRequest<any>("/flights/search", { params }),

  getFlightSeats: (flightId: string) =>
    apiRequest<any[]>(`/flights/${flightId}/seats`),

  // Predictive Analytics: Price Fluctuation Forecasting (Next 14 Days)
  getFlightPriceForecast: (flightId: string) =>
    apiRequest<any>(`/forecast/flight/${flightId}`),

  getHotelPriceForecast: (hotelId: string, roomId?: string) =>
    apiRequest<any>(`/forecast/hotel/${hotelId}`, {
      params: roomId ? { room_id: roomId } : undefined,
    }),

  predictPriceForecast: (payload: {
    item_id?: string;
    item_type?: "flight" | "hotel";
    current_price: number;
    currency?: string;
    historical_prices?: number[];
    total_capacity?: number;
    available_capacity?: number;
    occupancy_velocity?: number;
    days_to_departure?: number;
  }) =>
    apiRequest<any>("/forecast/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 2. Booking State Machine (Atomic Concurrency Control)
  createBooking: (payload: {
    product_type: "hotel" | "flight" | "train" | "tour" | "package" | "car";
    origin_city?: string;
    destination_city: string;
    destination_country?: string;
    start_date?: string;
    end_date?: string;
    number_of_guests?: number;
    special_requests?: string;
    items: Array<{
      product_id: string;
      product_type: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      metadata?: Record<string, any>;
    }>;
    passengers?: Array<{
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
      is_primary?: boolean;
    }>;
  }) =>
    apiRequest<any>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listUserBookings: (status?: string, page = 1, pageSize = 20) =>
    apiRequest<any[]>("/bookings", {
      params: { status, page, page_size: pageSize },
    }),

  getBooking: (bookingId: string) =>
    apiRequest<any>(`/bookings/${bookingId}`),

  transitionBookingStatus: (
    bookingId: string,
    targetStatus: "pending_payment" | "confirmed" | "cancelled",
    options?: { reason?: string; paymentTransactionId?: string },
  ) =>
    apiRequest<any>(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        target_status: targetStatus,
        reason: options?.reason,
        payment_transaction_id: options?.paymentTransactionId,
      }),
    }),

  // 3. AI Travel Concierge (Google Gemini 3.8 Flash)
  planTripWithAI: (payload: {
    destination: string;
    origin?: string;
    start_date: string;
    end_date: string;
    travelers?: number;
    interests?: string[];
    budget?: number;
    currency?: string;
    travel_style?: string;
    save_to_account?: boolean;
  }) =>
    apiRequest<any>("/ai/plan-trip", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 4. Cloudflare R2 Presigned PUT URLs
  getPresignedUploadUrl: (payload: {
    file_name: string;
    mime_type: string;
    size_bytes: number;
    entity_type:
      | "avatar"
      | "kyc_document"
      | "community_media"
      | "hotel_media"
      | "agency_document";
    entity_id?: string;
  }) =>
    apiRequest<any>("/storage/upload-url", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 5. Payment Initiation
  initiatePayment: (payload: {
    booking_id?: string;
    amount: number;
    currency?: string;
    method: "bkash" | "nagad" | "google_pay" | "card" | "wallet";
    phone?: string;
    email?: string;
    reference?: string;
  }) =>
    apiRequest<any>("/payments/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
