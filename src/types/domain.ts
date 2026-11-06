import { z } from "zod";

/**
 * Domain Models & Contracts - Shopno Jatra
 * Strictly synchronized with Supabase database schema and migrations.
 * Implements Interface Segregation Principle (ISP) with dual Zod runtime validators
 * and TypeScript type definitions.
 */

// ============================================================================
// 1. USER & IDENTITY
// ============================================================================

export const userRoleSchema = z.enum(["user", "creator", "partner", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  passport_number: z.string().nullable().optional(),
  passport_expiry: z.string().nullable().optional(),
  role: userRoleSchema.default("user"),
  is_verified: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userSchema = userProfileSchema.extend({
  email_confirmed_at: z.string().nullable().optional(),
  phone_confirmed_at: z.string().nullable().optional(),
  last_sign_in_at: z.string().nullable().optional(),
});
export type User = z.infer<typeof userSchema>;

// ============================================================================
// 2. BOOKING SYSTEM
// ============================================================================

export const bookingProductTypeSchema = z.enum([
  "hotel",
  "flight",
  "train",
  "tour",
  "package",
  "car",
]);
export type BookingProductType = z.infer<typeof bookingProductTypeSchema>;

export const bookingStatusSchema = z.enum([
  "draft",
  "details_pending",
  "payment_pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const bookingFlowStepSchema = z.enum([
  "traveler_details",
  "passenger_details",
  "review",
  "payment",
  "confirmed",
  "voucher_issued",
  "completed",
  "cancelled",
  "refund",
]);
export type BookingFlowStep = z.infer<typeof bookingFlowStepSchema>;

export const bookingPassengerSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  passport_number: z.string().nullable().optional(),
  passport_expiry: z.string().nullable().optional(),
  seat_number: z.string().nullable().optional(),
  ticket_number: z.string().nullable().optional(),
});
export type BookingPassenger = z.infer<typeof bookingPassengerSchema>;

export const bookingItemSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  product_id: z.string().uuid().nullable().optional(),
  product_type: bookingProductTypeSchema,
  product_name: z.string(),
  description: z.string().nullable().optional(),
  quantity: z.number().int().positive().default(1),
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime().optional(),
});
export type BookingItem = z.infer<typeof bookingItemSchema>;

export const bookingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  traveler_id: z.string().uuid().nullable().optional(),
  booking_reference: z.string(),
  product_type: bookingProductTypeSchema,
  status: bookingStatusSchema.default("draft"),
  flow_step: bookingFlowStepSchema.default("traveler_details"),
  origin_city: z.string().nullable().optional(),
  destination_city: z.string(),
  destination_country: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  number_of_guests: z.number().int().positive().default(1),
  total_price: z.number().nonnegative().default(0),
  currency: z.string().default("USD"),
  discount_amount: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  service_fee: z.number().nonnegative().default(0),
  final_price: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  special_requests: z.string().nullable().optional(),
  cancellation_policy: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  confirmed_at: z.string().datetime().nullable().optional(),
  cancelled_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  items: z.array(bookingItemSchema).optional(),
  passengers: z.array(bookingPassengerSchema).optional(),
});
export type Booking = z.infer<typeof bookingSchema>;

// ============================================================================
// 3. FLIGHTS INVENTORY
// ============================================================================

export const flightStatusSchema = z.enum([
  "scheduled",
  "delayed",
  "departed",
  "arrived",
  "cancelled",
]);
export type FlightStatus = z.infer<typeof flightStatusSchema>;

export const flightSchema = z.object({
  id: z.string().uuid(),
  flight_number: z.string(),
  airline_id: z.string().uuid().nullable().optional(),
  airline_name: z.string().optional(),
  airline_logo: z.string().url().nullable().optional(),
  departure_airport_id: z.string().uuid().nullable().optional(),
  arrival_airport_id: z.string().uuid().nullable().optional(),
  departure_airport_code: z.string().length(3),
  arrival_airport_code: z.string().length(3),
  departure_city: z.string(),
  arrival_city: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  duration_minutes: z.number().int().positive(),
  duration_text: z.string().default("1h 00m"),
  stops: z.number().int().nonnegative().default(0),
  price: z.number().nonnegative(),
  economy_price: z.number().nonnegative().optional(),
  business_price: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
  aircraft: z.string().nullable().optional(),
  baggage_allowance: z.string().nullable().optional(),
  available_seats: z.number().int().nonnegative().default(100),
  status: flightStatusSchema.default("scheduled"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Flight = z.infer<typeof flightSchema>;

// ============================================================================
// 4. HOTELS INVENTORY
// ============================================================================

export const hotelRoomSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  room_name: z.string(),
  room_type: z.string().default("Standard"),
  max_occupancy: z.number().int().positive().default(2),
  bed_type: z.string().default("1 Queen Bed"),
  price_per_night: z.number().positive(),
  currency: z.string().default("USD"),
  size_sqft: z.number().positive().nullable().optional(),
  amenities: z.array(z.string()).default([]),
  image_urls: z.array(z.string()).default([]),
  is_available: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
});
export type HotelRoom = z.infer<typeof hotelRoomSchema>;

export const hotelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  star_rating: z.number().min(0).max(5).default(4),
  average_rating: z.number().min(0).max(5).default(4.8),
  total_reviews: z.number().int().nonnegative().default(0),
  image_url: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
  address: z.string().nullable().optional(),
  city: z.string(),
  state_province: z.string().nullable().optional(),
  country: z.string(),
  country_code: z.string().default("BD"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  base_price: z.number().nonnegative(),
  currency: z.string().default("USD"),
  amenities: z.array(z.string()).default([]),
  is_featured: z.boolean().default(false),
  rooms: z.array(hotelRoomSchema).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Hotel = z.infer<typeof hotelSchema>;

// ============================================================================
// 5. TRAINS INVENTORY
// ============================================================================

export const trainClassSchema = z.string();
export type TrainClass = z.infer<typeof trainClassSchema>;

export const trainSchema = z.object({
  id: z.string().uuid(),
  train_number: z.string(),
  train_name: z.string(),
  train_type: z.string().default("Bullet / High Speed"),
  departure_station_id: z.string().uuid().nullable().optional(),
  arrival_station_id: z.string().uuid().nullable().optional(),
  departure_station_name: z.string().optional(),
  arrival_station_name: z.string().optional(),
  departure_city: z.string(),
  arrival_city: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  duration_text: z.string().default("2h 15m"),
  base_price: z.number().nonnegative(),
  currency: z.string().default("USD"),
  available_seats: z.number().int().nonnegative().default(100),
  classes: z.array(z.string()).default(["Second Class", "First Class", "Business Class"]),
  created_at: z.string().datetime().optional(),
});
export type Train = z.infer<typeof trainSchema>;

// ============================================================================
// 6. TOURS & PACKAGES
// ============================================================================

export const tourDifficultySchema = z.enum(["easy", "moderate", "challenging", "difficult"]);
export type TourDifficulty = z.infer<typeof tourDifficultySchema>;

export const tourSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  destination_city: z.string(),
  destination_country: z.string(),
  guide_name: z.string().nullable().optional(),
  guide_bio: z.string().nullable().optional(),
  guide_image_url: z.string().nullable().optional(),
  duration_days: z.number().int().positive().default(1),
  duration_text: z.string().default("1 Day"),
  price: z.number().nonnegative(),
  original_price: z.number().nonnegative().nullable().optional(),
  currency: z.string().default("USD"),
  max_participants: z.number().int().positive().default(25),
  difficulty_level: tourDifficultySchema.default("easy"),
  image_urls: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  included_services: z.array(z.string()).default([]),
  not_included: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(4.9),
  review_count: z.number().int().nonnegative().default(0),
  is_featured: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Tour = z.infer<typeof tourSchema>;

// ============================================================================
// 7. AGENCIES
// ============================================================================

export const agencySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  license_number: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  cover_image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().default("Dhaka"),
  country: z.string().default("Bangladesh"),
  is_verified: z.boolean().default(true),
  rating: z.number().min(0).max(5).default(4.9),
  total_packages: z.number().int().nonnegative().default(0),
  followers_count: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Agency = z.infer<typeof agencySchema>;

// ============================================================================
// 8. PAYMENT TRANSACTIONS
// ============================================================================

export const paymentMethodSchema = z.enum([
  "bkash",
  "nagad",
  "card",
  "bank_transfer",
  "google_pay",
  "wallet",
  "points",
  "cash",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentTransactionStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);
export type PaymentTransactionStatus = z.infer<typeof paymentTransactionStatusSchema>;

export const paymentTransactionSchema = z.object({
  id: z.string().uuid(),
  booking_payment_id: z.string().uuid().nullable().optional(),
  booking_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid(),
  amount: z.number().positive(),
  original_amount: z.number().positive().optional(),
  fee: z.number().nonnegative().default(0),
  currency: z.string().default("BDT"),
  method: paymentMethodSchema,
  gateway: z.string().default("system"),
  provider_transaction_id: z.string().nullable().optional(),
  status: paymentTransactionStatusSchema.default("pending"),
  provider_response: z.record(z.string(), z.unknown()).default({}),
  error_message: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  initiated_at: z.string().datetime().optional(),
  verified_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>;

// ============================================================================
// 9. REVIEWS
// ============================================================================

export const reviewEntityTypeSchema = z.enum([
  "hotel",
  "flight",
  "train",
  "tour",
  "agency",
]);
export type ReviewEntityType = z.infer<typeof reviewEntityTypeSchema>;

export const reviewSchema = z.object({
  id: z.string().uuid(),
  entity_id: z.string().uuid(),
  entity_type: reviewEntityTypeSchema.default("hotel"),
  user_id: z.string().uuid().nullable().optional(),
  user_name: z.string().default("Verified Guest"),
  user_avatar: z.string().nullable().optional(),
  rating: z.number().min(1).max(5),
  title: z.string().nullable().optional(),
  review_text: z.string().nullable().optional(),
  helpful_count: z.number().int().nonnegative().default(0),
  images: z.array(z.string()).default([]),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Review = z.infer<typeof reviewSchema>;
