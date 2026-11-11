/**
 * Data Access Layer (DAL) Types & Repository Interfaces
 * Consumes domain types from src/types/ (KYCDocument, KYCDocumentType, UserVerificationStatus)
 */

import {
  KYCDocument,
  KYCDocumentType,
  UserVerificationStatus,
} from "../types/admin";
import { AgenBooking, AgenTravelerDetails } from "../types/agenTypes";

// ============================================================================
// ERROR NORMALIZATION TYPES
// ============================================================================

export type ErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "TRANSACTION_FAILED"
  | "DATABASE_ERROR"
  | "UNKNOWN_ERROR";

export class RepositoryError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isAuthError: boolean;

  constructor(params: {
    message: string;
    code: ErrorCode;
    statusCode?: number;
    details?: unknown;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "RepositoryError";
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
    this.isNetworkError = params.code === "NETWORK_ERROR" || params.code === "TIMEOUT";
    this.isAuthError = params.code === "UNAUTHORIZED" || params.code === "FORBIDDEN";
    if (params.cause) {
      (this as any).cause = params.cause;
    }
  }
}

// ============================================================================
// BASE REPOSITORY INTERFACE
// ============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
  select?: string;
}

export interface IBaseRepository<T, TId = string, TCreate = Partial<T>, TUpdate = Partial<T>> {
  findById(id: TId): Promise<T | null>;
  findAll(filter?: Record<string, any>, options?: QueryOptions): Promise<T[]>;
  create(data: TCreate): Promise<T>;
  update(id: TId, data: TUpdate): Promise<T>;
  delete(id: TId): Promise<boolean>;
  count(filter?: Record<string, any>): Promise<number>;
  normalizeError(error: unknown, context?: string): RepositoryError;
}

// ============================================================================
// TRAVEL REPOSITORY TYPES & INTERFACE
// ============================================================================

export interface FlightSearchFilters {
  originCode?: string; // IATA e.g. "DAC"
  destinationCode?: string; // IATA e.g. "CXB"
  departureAirportId?: string;
  arrivalAirportId?: string;
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string;
  passengers?: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  minPrice?: number;
  maxPrice?: number;
  isDirect?: boolean;
}

export interface FlightSearchResult {
  id: string;
  flight_number: string;
  airline_name: string;
  airline_code?: string;
  airline_logo?: string;
  departure_airport_code: string;
  departure_city: string;
  arrival_airport_code: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  cabin_class: string;
  base_price: number;
  tax_amount: number;
  total_price: number;
  currency: string;
  seats_available: number;
  is_direct: boolean;
  stops_count: number;
}

export interface HotelSearchFilters {
  city?: string;
  country?: string;
  destinationId?: string;
  checkInDate?: string; // YYYY-MM-DD
  checkOutDate?: string; // YYYY-MM-DD
  guestsCount?: number;
  roomsCount?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  starRating?: number[];
  amenities?: string[];
}

export interface HotelSearchResult {
  id: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  star_rating: number;
  average_rating: number;
  reviews_count: number;
  featured_image: string;
  images: string[];
  price_per_night: number;
  currency: string;
  amenities: string[];
  is_free_cancellation: boolean;
  latitude?: number;
  longitude?: number;
}

export interface TrainSearchFilters {
  departureCity?: string;
  arrivalCity?: string;
  date?: string;
  trainType?: string; // "Express", "Intercity", "High-Speed"
  travelClass?: "AC_BERTH" | "SNIGDHA" | "SHOVAN_CHAIR" | "FIRST_CLASS";
}

export interface TrainSearchResult {
  id: string;
  train_number: string;
  train_name: string;
  departure_city: string;
  departure_station: string;
  arrival_city: string;
  arrival_station: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  train_type: string;
  fare_amount: number;
  currency: string;
  available_seats: number;
  travel_class: string;
}

export interface TourSearchFilters {
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  difficultyLevel?: string;
  durationDays?: number;
  tags?: string[];
}

export interface TourSearchResult {
  id: string;
  title: string;
  destination_city: string;
  destination_country?: string;
  duration_days: number;
  duration_nights?: number;
  price_per_person: number;
  currency: string;
  difficulty_level: string;
  featured_image: string;
  rating: number;
  reviews_count: number;
  is_featured: boolean;
  max_group_size: number;
  highlights: string[];
}

export interface CacheOptions {
  bypassCache?: boolean;
  ttlMs?: number;
}

export interface ITravelRepository {
  searchFlights(filters: FlightSearchFilters, options?: CacheOptions): Promise<FlightSearchResult[]>;
  searchFlightsDebounced(filters: FlightSearchFilters, waitMs?: number): Promise<FlightSearchResult[]>;
  searchHotels(filters: HotelSearchFilters, options?: CacheOptions): Promise<HotelSearchResult[]>;
  searchHotelsDebounced(filters: HotelSearchFilters, waitMs?: number): Promise<HotelSearchResult[]>;
  searchTrains(filters: TrainSearchFilters, options?: CacheOptions): Promise<TrainSearchResult[]>;
  searchTrainsDebounced(filters: TrainSearchFilters, waitMs?: number): Promise<TrainSearchResult[]>;
  getFeaturedTours(limit?: number, options?: CacheOptions): Promise<TourSearchResult[]>;
  getFlightById(id: string): Promise<FlightSearchResult | null>;
  getHotelById(id: string): Promise<HotelSearchResult | null>;
  getTrainById(id: string): Promise<TrainSearchResult | null>;
  getTourById(id: string): Promise<TourSearchResult | null>;
  clearCache(): void;
}

// ============================================================================
// BOOKING REPOSITORY TYPES & INTERFACE
// ============================================================================

export type BookingStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded";

export interface TravelerDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passportNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  nationality?: string;
  expiryDate?: string;
  passportExpiry?: string;
  isPrimary?: boolean;
}

export interface BookingItemDTO {
  productType: "flight" | "hotel" | "train" | "tour" | "package" | "car_rental";
  productId: string;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: Record<string, any>;
}

export interface CreateBookingDTO {
  userId: string;
  agencyId?: string;
  productType: "flight" | "hotel" | "train" | "tour" | "package";
  destinationCity: string;
  destinationCountry?: string;
  startDate?: string;
  endDate?: string;
  numberOfGuests: number;
  totalPrice: number;
  taxAmount?: number;
  serviceFee?: number;
  discountAmount?: number;
  promoCode?: string;
  currency?: string;
  notes?: string;
  travelers: TravelerDTO[];
  items?: BookingItemDTO[];
  selectedSeats?: string[];
  selectedRooms?: Array<{ roomId: string; roomType: string; count: number }>;
}

export interface BookingDetails {
  id: string;
  booking_reference: string;
  user_id: string;
  agency_id?: string;
  product_type: string;
  status: BookingStatus;
  destination_city: string;
  destination_country?: string;
  start_date?: string;
  end_date?: string;
  number_of_guests: number;
  total_price: number;
  tax_amount: number;
  service_fee: number;
  discount_amount: number;
  final_price: number;
  currency: string;
  promo_code?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  travelers?: TravelerDTO[];
  items?: BookingItemDTO[];
}

export interface BookingFilterOptions {
  status?: BookingStatus;
  productType?: string;
  limit?: number;
  offset?: number;
}

export interface IBookingRepository {
  createBooking(bookingData: CreateBookingDTO): Promise<BookingDetails>;
  getBookingById(bookingId: string): Promise<BookingDetails | null>;
  getUserBookings(userId: string, filters?: BookingFilterOptions): Promise<BookingDetails[]>;
  updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    metadata?: Record<string, any>,
  ): Promise<BookingDetails>;
  cancelBooking(bookingId: string, reason?: string): Promise<BookingDetails>;
}

// ============================================================================
// USER REPOSITORY TYPES & INTERFACE
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  role?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  user_id: string;
  preferred_currency: string;
  preferred_language: string;
  theme: "light" | "dark" | "system";
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  dietary_requirements?: string;
  seat_preference?: "window" | "aisle" | "middle" | "any";
  cabin_preference?: string;
  updated_at?: string;
}

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  points_balance: number;
  lifetime_points: number;
  tier_expires_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoyaltyTransaction {
  id: string;
  loyalty_account_id: string;
  points_amount: number;
  transaction_type: "earn" | "redeem" | "expire" | "bonus";
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface UploadKYCDocumentDTO {
  documentType: KYCDocumentType;
  documentNumber?: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  fileBase64?: string;
  expiryDate?: string;
}

export interface LoyaltyRedemptionResult {
  success: boolean;
  remainingPoints: number;
  transactionId?: string;
  message?: string;
}

export interface IUserRepository {
  getProfile(userId?: string): Promise<UserProfile | null>;
  updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
  createProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile>;
  uploadKYCDocument(userId: string, document: UploadKYCDocumentDTO): Promise<KYCDocument>;
  getKYCDocuments(userId: string): Promise<KYCDocument[]>;
  getKYCStatus(userId: string): Promise<UserVerificationStatus>;
  getPreferences(userId: string): Promise<UserPreferences | null>;
  updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;
  getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | null>;
  getLoyaltyHistory(loyaltyAccountId: string, limit?: number): Promise<LoyaltyTransaction[]>;
  redeemLoyaltyPoints(
    userId: string,
    points: number,
    rewardId?: string,
    description?: string,
  ): Promise<LoyaltyRedemptionResult>;
  earnLoyaltyPoints(
    userId: string,
    points: number,
    bookingId?: string,
    description?: string,
  ): Promise<LoyaltyAccount>;
}
