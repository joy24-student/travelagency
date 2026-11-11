/**
 * Security Input Validation Schemas (Zod)
 *
 * Enforces strict pre-network input validation:
 * 1. Emails: RFC 5322 format, lowercase, trimmed, no script/control characters
 * 2. Phone Numbers: E.164 international & Bangladeshi mobile format (+8801XXXXXXXXX)
 * 3. Passports: ICAO Doc 9303 compliant alphanumeric machine-readable formats
 * 4. Currency Values: ISO 4217 standard currency codes & positive 2-decimal amounts
 */

import { z } from "zod";
import { toLatinDigits } from "./formatters";

/**
 * Normalizes input containing native numerals (Bengali ০-৯, Arabic ٠-٩, Hindi ०-९)
 * to standard ASCII 0-9 before schema parsing.
 */
export function normalizeNumericInput(val: unknown): string {
  if (val === null || val === undefined) return "";
  return toLatinDigits(String(val)).trim();
}

/**
 * Strict Email Schema (RFC 5322 compliant, no script/HTML injection)
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Email is too short")
  .max(254, "Email exceeds maximum length")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    "Enter a valid email address"
  )
  .refine((val) => !/[<>\/\\'";]/.test(val), "Email contains forbidden characters");

/**
 * Strict Phone Number Schema with Auto-Numeral Normalization
 * Supports domestic (+8801[3-9]\d{8} / 01[3-9]\d{8}) and International E.164 (+\d{1,14})
 */
export const phoneSchema = z.preprocess(
  (val) => normalizeNumericInput(val).replace(/[\s-]/g, ""),
  z
    .string()
    .min(10, "Phone number is too short")
    .max(18, "Phone number is too long")
    .regex(
      /^(\+?8801[3-9]\d{8}|01[3-9]\d{8}|\+[1-9]\d{1,14})$/,
      "Enter a valid mobile number (e.g. +88017XXXXXXXX or +1XXXXXXXXXX)"
    )
);

/**
 * Strict Passport Format Schema (ICAO Doc 9303 standard)
 * 6 to 12 uppercase alphanumeric characters, no spaces, no symbols
 */
export const passportSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6, "Passport number must be at least 6 characters")
  .max(12, "Passport number cannot exceed 12 characters")
  .regex(/^[A-Z0-9]{6,12}$/, "Passport must consist of 6-12 uppercase alphanumeric characters");

/**
 * Strict Currency Amount & Code Schema (ISO 4217)
 */
export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, "Currency code must be a 3-letter ISO code (e.g. BDT, USD)")
  .regex(/^[A-Z]{3}$/, "Invalid currency code");

export const currencyAmountSchema = z.preprocess(
  (val) => (typeof val === "string" ? parseFloat(normalizeNumericInput(val)) : val),
  z
    .number()
    .positive("Amount must be greater than zero")
    .max(10000000, "Amount exceeds transaction limit")
    .refine((val) => Number(val.toFixed(2)) === val, "Amount can have at most 2 decimal places")
);

/**
 * Traveler Profile Validation Schema
 */
export const travelerInputSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name too long")
    .regex(/^[A-Za-z\s\-']+$/, "First name contains invalid characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name too long")
    .regex(/^[A-Za-z\s\-']+$/, "Last name contains invalid characters"),
  email: emailSchema,
  phone: phoneSchema.optional(),
  nationality: z.string().trim().min(2).max(60).optional(),
  passportNumber: passportSchema.optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
    .optional(),
});

/**
 * Payment Request Validation Schema
 */
export const paymentInputSchema = z.object({
  amount: currencyAmountSchema,
  currency: currencyCodeSchema,
  method: z.enum([
    "google_pay",
    "bkash",
    "nagad",
    "card",
    "wallet",
    "bank_transfer",
    "rocket",
    "paypal",
  ]),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  bookingId: z.string().uuid("Invalid booking identifier").optional(),
});

/**
 * Community Post Input Validation Schema
 */
export const communityPostInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title is too long")
    .refine((val) => !/<[^>]*>/g.test(val), "HTML tags are not allowed in titles"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  location: z.string().trim().max(100).optional(),
  mediaUrl: z
    .string()
    .url("Media must be a valid URL")
    .refine((val) => /^https:\/\//i.test(val), "Media URL must use secure HTTPS")
    .optional(),
});

/**
 * Helper to validate data before sending over the network
 */
export function validateBeforeNetwork<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = ((result as any).error?.issues || [])
      .map((e: any) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Client Input Validation Failed: ${errorDetails}`);
  }
  return result.data;
}
