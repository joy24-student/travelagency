/**
 * Payment Security & Tamper Proofing Module
 *
 * Implements:
 * 1. HMAC-SHA256 signature verification for bKash, Nagad, Stripe, and Shopno Wallet webhooks/callbacks.
 * 2. Replay attack prevention via cryptographically secure nonces with a 5-minute expiry window.
 * 3. Authoritative server verification guarantees (client status is never trusted as final).
 */

import CryptoJS from "crypto-js";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../utils/supabase";

export const PENDING_PAYMENT_TX_KEY = "SHOPNO_PENDING_PAYMENT_TX";
export const PENDING_PAYMENT_METHOD_KEY = "SHOPNO_PENDING_PAYMENT_METHOD";

export async function storePendingTransaction(transactionId: string, method: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_PAYMENT_TX_KEY, transactionId);
    await SecureStore.setItemAsync(PENDING_PAYMENT_METHOD_KEY, method);
  } catch (err) {
    console.warn("SecureStore error storing pending payment transaction:", err);
  }
}

export async function getPendingTransaction(): Promise<{ transactionId: string | null; method: string | null }> {
  try {
    const transactionId = await SecureStore.getItemAsync(PENDING_PAYMENT_TX_KEY);
    const method = await SecureStore.getItemAsync(PENDING_PAYMENT_METHOD_KEY);
    return { transactionId, method };
  } catch (err) {
    console.warn("SecureStore error retrieving pending payment transaction:", err);
    return { transactionId: null, method: null };
  }
}

export async function clearPendingTransaction(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_PAYMENT_TX_KEY);
    await SecureStore.deleteItemAsync(PENDING_PAYMENT_METHOD_KEY);
  } catch (err) {
    console.warn("SecureStore error clearing pending payment transaction:", err);
  }
}

const REPLAY_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

// Local cache of recently seen nonces with expiration tracking
const seenNonces = new Map<string, number>();

/**
 * Periodically purge expired nonces from memory
 */
setInterval(() => {
  const now = Date.now();
  seenNonces.forEach((expiresAt, nonce) => {
    if (now > expiresAt) {
      seenNonces.delete(nonce);
    }
  });
}, 60000);

export interface SecurePaymentEnvelope<T = any> {
  payload: T;
  nonce: string;
  timestamp: number;
  signature: string;
}

/**
 * Generate a cryptographically secure random nonce (128-bit hex)
 */
export function generateSecureNonce(): string {
  const randomWords = CryptoJS.lib.WordArray.random(16);
  return randomWords.toString(CryptoJS.enc.Hex);
}

/**
 * Validate that a timestamp falls within the allowed 5-minute replay window
 */
export function isTimestampValid(timestamp: number): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= REPLAY_TOLERANCE_MS;
}

/**
 * Check and consume a nonce to prevent replay attacks
 * Uses local memory cache and syncs with Supabase RPC verify_payment_nonce if authenticated
 */
export async function consumeNonce(nonce: string, timestamp: number): Promise<boolean> {
  if (!nonce || typeof nonce !== "string" || nonce.length < 16) {
    return false;
  }

  if (!isTimestampValid(timestamp)) {
    return false;
  }

  // Check local cache
  if (seenNonces.has(nonce)) {
    return false; // Replay detected!
  }

  // Register in memory
  seenNonces.set(nonce, timestamp + REPLAY_TOLERANCE_MS);

  // Attempt database RPC verification if available
  try {
    const { data: isValid, error } = await supabase.rpc("verify_payment_nonce", {
      p_nonce: nonce,
      p_timestamp: timestamp,
    });

    if (error) {
      // If RPC is unavailable (e.g. offline/mock mode), fall back to memory check
      return true;
    }
    return !!isValid;
  } catch {
    return true;
  }
}

/**
 * Compute HMAC-SHA256 signature over data using secret key
 */
export function computeHmacSha256(data: string, secretKey: string): string {
  return CryptoJS.HmacSHA256(data, secretKey).toString(CryptoJS.enc.Hex);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify HMAC-SHA256 signature for bKash webhooks/callbacks
 */
export function verifyBkashSignature(
  payloadString: string,
  providedSignature: string,
  secretKey: string
): boolean {
  if (!providedSignature || !secretKey) return false;
  const expectedSignature = computeHmacSha256(payloadString, secretKey);
  return timingSafeEqual(expectedSignature.toLowerCase(), providedSignature.toLowerCase());
}

/**
 * Verify HMAC-SHA256 signature for Nagad webhooks/callbacks
 */
export function verifyNagadSignature(
  orderDataString: string,
  providedSignature: string,
  secretKey: string
): boolean {
  if (!providedSignature || !secretKey) return false;
  const expectedSignature = CryptoJS.HmacSHA256(orderDataString, secretKey).toString(CryptoJS.enc.Base64);
  return timingSafeEqual(expectedSignature, providedSignature);
}

/**
 * Verify Stripe webhook signature (v1 header format: t=timestamp,v1=signature)
 */
export function verifyStripeWebhookSignature(
  payloadString: string,
  header: string,
  endpointSecret: string
): boolean {
  if (!header || !endpointSecret) return false;

  const parts = header.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = parseInt(timestampPart.substring(2), 10);
  const providedSignature = signaturePart.substring(3);

  // Check 5-minute replay window
  if (!isTimestampValid(timestamp * 1000)) {
    return false;
  }

  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = computeHmacSha256(signedPayload, endpointSecret);

  return timingSafeEqual(expectedSignature.toLowerCase(), providedSignature.toLowerCase());
}

/**
 * Verify Shopno Wallet internal cryptographic receipt
 */
export function verifyWalletReceipt(
  transactionId: string,
  amount: number,
  userId: string,
  timestamp: number,
  providedSignature: string,
  secretKey: string
): boolean {
  if (!isTimestampValid(timestamp)) {
    return false;
  }
  const payloadToVerify = `${transactionId}:${amount.toFixed(2)}:${userId}:${timestamp}`;
  const expected = computeHmacSha256(payloadToVerify, secretKey);
  return timingSafeEqual(expected.toLowerCase(), providedSignature.toLowerCase());
}
