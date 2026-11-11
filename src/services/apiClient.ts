/**
 * Shopno Jatra FastAPI Backend Client
 * Connects React Native app to the high-performance FastAPI backend.
 *
 * DevSecOps & Network Resilience Features:
 * 1. AppError standard taxonomy: "network" | "auth" | "validation" | "server" | "unknown"
 * 2. Exponential backoff retry policy with jitter for transient network & 5xx server errors
 * 3. RFC 7807 problem details parsing & Pydantic 422 field error decomposition
 * 4. Automatic JWT session token attachment and X-Correlation-ID tracing
 * 5. Telemetry error emission into uxHealthMonitor and crashReporter
 */

import { supabase } from "../utils/supabase";
import { uxHealthMonitor } from "./telemetry/uxHealthMonitor";
import { crashReporter } from "./telemetry/crashReporter";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export type AppErrorKind = "network" | "auth" | "validation" | "server" | "unknown";

export interface AppErrorDetails {
  kind: AppErrorKind;
  status?: number;
  url?: string;
  method?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  rawResponse?: any;
  timestamp: number;
}

export class AppError extends Error {
  public readonly kind: AppErrorKind;
  public readonly status?: number;
  public readonly url?: string;
  public readonly method?: string;
  public readonly code?: string;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly rawResponse?: any;
  public readonly timestamp: number;
  public readonly isRetryable: boolean;

  constructor(message: string, details: AppErrorDetails, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.kind = details.kind;
    this.status = details.status;
    this.url = details.url;
    this.method = details.method;
    this.code = details.code;
    this.fieldErrors = details.fieldErrors;
    this.rawResponse = details.rawResponse;
    this.timestamp = details.timestamp;
    if (cause) {
      this.cause = cause;
    }

    // Network errors, rate limits (429), and transient 5xx server errors are retryable
    this.isRetryable =
      this.kind === "network" ||
      this.status === 429 ||
      (this.kind === "server" && [502, 503, 504].includes(this.status || 500));
  }

  static from(err: unknown, requestContext?: { url?: string; method?: string }): AppError {
    const timestamp = Date.now();
    if (err instanceof AppError) return err;

    const message = (err as any)?.message || String(err);
    const lower = message.toLowerCase();

    // Check for network errors & abort timeouts
    if (
      (err instanceof TypeError && (lower.includes("network") || lower.includes("failed to fetch"))) ||
      lower.includes("abort") ||
      lower.includes("timeout") ||
      lower.includes("network request failed") ||
      lower.includes("ধীর")
    ) {
      const isTimeout = lower.includes("abort") || lower.includes("timeout") || lower.includes("ধীর");
      return new AppError(
        isTimeout
          ? "নেটওয়ার্ক ধীর, আবার চেষ্টা করবেন?"
          : "Network connection failed. Please check your internet connection.",
        {
          kind: "network",
          url: requestContext?.url,
          method: requestContext?.method,
          timestamp,
        },
        err
      );
    }

    return new AppError(
      message || "An unexpected error occurred",
      {
        kind: "unknown",
        url: requestContext?.url,
        method: requestContext?.method,
        timestamp,
      },
      err
    );
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Universal fetch wrapper that attaches Supabase Bearer token, Correlation ID,
 * enforces typed AppError conversion, and applies exponential backoff retry.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    params,
    headers = {},
    retries = 2,
    retryDelayMs = 600,
    timeoutMs = 15000,
    ...rest
  } = options;

  // Retrieve current session token from Supabase Auth
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } catch (err) {
    console.warn("[apiClient] Could not retrieve Supabase session token:", err);
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

  const correlationId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const method = (rest.method || "GET").toUpperCase();

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Correlation-ID": correlationId,
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let attempt = 0;
  let lastError: AppError | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: reqHeaders,
        signal: controller.signal,
        ...rest,
      });

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        let errorTitle = `HTTP ${response.status}: ${response.statusText}`;
        let rawJson: any = null;
        let fieldErrors: Record<string, string[]> | undefined;
        let kind: AppErrorKind = "unknown";

        try {
          rawJson = await response.json();
          if (rawJson) {
            errorTitle = rawJson.detail || rawJson.title || rawJson.message || errorTitle;

            // Extract Pydantic 422 field errors
            if (response.status === 422 && Array.isArray(rawJson.detail)) {
              fieldErrors = {};
              for (const item of rawJson.detail) {
                const fieldName = Array.isArray(item.loc) ? item.loc.slice(1).join(".") : "field";
                if (!fieldErrors[fieldName]) fieldErrors[fieldName] = [];
                fieldErrors[fieldName].push(item.msg || "Invalid value");
              }
            }
          }
        } catch {
          // Response body was not JSON
        }

        // Categorize into AppErrorKind
        if (response.status === 401 || response.status === 403) {
          kind = "auth";
          errorTitle = response.status === 401
            ? "Your session has expired. Please sign in again."
            : "You do not have permission to perform this action.";
        } else if (response.status === 400 || response.status === 422) {
          kind = "validation";
        } else if (response.status >= 500 && response.status <= 599) {
          kind = "server";
        }

        const appError = new AppError(
          typeof errorTitle === "string" ? errorTitle : JSON.stringify(errorTitle),
          {
            kind,
            status: response.status,
            url,
            method,
            fieldErrors,
            rawResponse: rawJson,
            timestamp: Date.now(),
          }
        );

        // Check if retryable
        if (appError.isRetryable && attempt < retries) {
          lastError = appError;
          attempt++;
          const jitter = Math.floor(Math.random() * 200);
          const backoff = retryDelayMs * Math.pow(2, attempt - 1) + jitter;
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }

        throw appError;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutTimer);

      const appError = AppError.from(err, { url, method });

      if (appError.isRetryable && attempt < retries) {
        lastError = appError;
        attempt++;
        const jitter = Math.floor(Math.random() * 200);
        const backoff = retryDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise((res) => setTimeout(res, backoff));
        continue;
      }

      // Record to telemetry and crash reporting
      uxHealthMonitor.recordError({
        screenName: "apiClient",
        sanitizedMessage: `[${appError.kind.toUpperCase()}] ${appError.message} (${method} ${endpoint})`,
        sanitizedStack: appError.stack,
        timestamp: Date.now(),
      });

      crashReporter.captureException(appError, {
        url,
        method,
        status: appError.status,
        kind: appError.kind,
      });

      throw appError;
    }
  }

  throw lastError || new AppError("Request failed after retries", { kind: "unknown", timestamp: Date.now() });
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

  // 3. AI Travel Concierge (Backend Google Gemini)
  chatWithAI: (payload: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    model?: string;
    max_tokens?: number;
  }) =>
    apiRequest<{
      success: boolean;
      message: string;
      data: {
        content: string;
        raw: string;
        provider: string;
        model: string;
        tokens_used?: number;
      };
    }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  completeWithAI: (payload: {
    user_prompt: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    response_mime_type?: string;
    provider?: string;
    model?: string;
  }) =>
    apiRequest<{
      success: boolean;
      message: string;
      data: {
        text: string;
        provider: string;
        model: string;
        tokens_used?: number;
      };
    }>("/ai/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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

  // Generic REST methods
  get: <T = any>(endpoint: string, options?: { params?: Record<string, any>; headers?: Record<string, string> }) => {
    let url = endpoint;
    if (options?.params) {
      const q = new URLSearchParams(options.params).toString();
      if (q) url += (url.includes("?") ? "&" : "?") + q;
    }
    return apiRequest<T>(url, { method: "GET", headers: options?.headers });
  },
  post: <T = any>(endpoint: string, body?: any, options?: { headers?: Record<string, string> }) =>
    apiRequest<T>(endpoint, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined, headers: options?.headers }),
};

export const apiClient = backendApi;
