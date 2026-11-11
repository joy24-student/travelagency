/**
 * Input Masking Utilities - Shopno Jatra
 * Provides automatic, zero-dependency masking for Phone Numbers (BD & international)
 * and Currency / Number inputs with localized thousands separators.
 */

import { toLatinDigits, toBengaliDigits } from "./formatters";

/**
 * Format raw Bangladeshi phone string dynamically into clean display mask:
 * e.g., "01712345678" -> "+880 1712-345678"
 * or    "1712345678"  -> "+880 1712-345678"
 */
export function maskBangladeshiPhone(input: string, preferInternational = true): string {
  if (!input) return "";

  // Normalize digits from Bengali if entered
  const latin = toLatinDigits(input);
  // Extract only digits
  const rawDigits = latin.replace(/\D/g, "");

  if (rawDigits.length === 0) return "";

  let subscriberDigits = rawDigits;

  // If already starts with 880, strip the 880 prefix
  if (subscriberDigits.startsWith("880")) {
    subscriberDigits = subscriberDigits.slice(3);
  }

  // If starts with 0, strip leading 0 for canonical 10-digit BD mobile number
  if (subscriberDigits.startsWith("0")) {
    subscriberDigits = subscriberDigits.slice(1);
  }

  // BD mobile subscriber numbers are 10 digits starting with 1 (e.g. 1712345678)
  // Limit to 10 digits
  subscriberDigits = subscriberDigits.slice(0, 10);

  if (!preferInternational) {
    // Local format: 01XXX-XXXXXX
    if (subscriberDigits.length <= 4) {
      return `0${subscriberDigits}`;
    }
    const part1 = subscriberDigits.slice(0, 4);
    const part2 = subscriberDigits.slice(4);
    return `0${part1}-${part2}`;
  }

  // International format: +880 1XXX-XXXXXX
  if (subscriberDigits.length === 0) {
    return "+880 ";
  }

  if (subscriberDigits.length <= 4) {
    return `+880 ${subscriberDigits}`;
  }

  const prefix = subscriberDigits.slice(0, 4);
  const suffix = subscriberDigits.slice(4);
  return `+880 ${prefix}-${suffix}`;
}

/**
 * Strips phone mask to return pure clean E.164 string: "+8801XXXXXXXXX"
 */
export function unmaskPhoneNumber(input: string): string {
  if (!input) return "";
  const latin = toLatinDigits(input);
  const digits = latin.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  if (digits.startsWith("1") && digits.length === 10) return `+880${digits}`;
  return `+${digits}`;
}

/**
 * Format numeric currency input in real-time with comma separators:
 * e.g., "12000" -> "12,000"
 * supports decimals: "12000.5" -> "12,000.5"
 */
export function maskCurrencyInput(input: string | number, symbol = ""): string {
  if (input === undefined || input === null || input === "") return "";
  const str = typeof input === "number" ? String(input) : toLatinDigits(String(input));

  // Remove everything except numbers and single decimal point
  let cleaned = str.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  const [integerPart, decimalPart] = cleaned.split(".");
  if (!integerPart && !decimalPart) return "";

  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const formattedValue = decimalPart !== undefined ? `${formattedInteger}.${decimalPart.slice(0, 2)}` : formattedInteger;
  return symbol ? `${symbol} ${formattedValue}` : formattedValue;
}

/**
 * Convert masked currency back to a pure numeric float
 */
export function unmaskCurrencyInput(input: string): number {
  if (!input) return 0;
  const latin = toLatinDigits(input);
  const cleaned = latin.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}
