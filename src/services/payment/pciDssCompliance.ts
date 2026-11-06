/**
 * PCI-DSS Compliance & Sensitive Payment Data Scrubbing
 *
 * Requirements:
 * - Never store raw card numbers (PAN), CVVs, or bKash PINs in state, logs, or persistent storage.
 * - Mask card numbers: show only the last 4 digits (e.g., **** **** **** 1234).
 * - Recursively sanitize payment payloads before logging, persisting, or transmitting.
 */

/**
 * Mask raw credit/debit card numbers for display and persistence
 */
export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return "";
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 4) return "****";
  const last4 = cleaned.slice(-4);
  return `**** **** **** ${last4}`;
}

/**
 * Mask sensitive phone number / wallet accounts
 */
export function maskAccountNumber(account: string): string {
  if (!account) return "";
  if (account.length <= 4) return "****";
  const start = account.slice(0, 3);
  const end = account.slice(-2);
  return `${start}*****${end}`;
}

/**
 * Redact sensitive fields (CVV, PIN, raw card, password) from any object
 * Prevents accidental leakage in console logs or persistence.
 */
export function sanitizePaymentPayload<T = any>(payload: T): T {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePaymentPayload(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  const sensitiveFieldNames = [
    "cvv",
    "cvc",
    "securitycode",
    "security_code",
    "pin",
    "bkash_pin",
    "nagad_pin",
    "password",
    "secret",
    "rawcardnumber",
    "raw_card_number",
    "cardnumber",
    "card_number",
    "pan",
  ];

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFieldNames.includes(lowerKey)) {
      if (lowerKey.includes("card") || lowerKey === "pan") {
        sanitized[key] = typeof value === "string" ? maskCardNumber(value) : "[MASKED_PAN]";
      } else {
        sanitized[key] = "[REDACTED_PCI_DSS]";
      }
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizePaymentPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Safe logger for payment events that guarantees PCI-DSS redaction
 */
export const securePaymentLogger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "production") return;
    if (data) {
      console.log(`[PAYMENT_SECURE] ${message}`, sanitizePaymentPayload(data));
    } else {
      console.log(`[PAYMENT_SECURE] ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "production") return;
    if (data) {
      console.warn(`[PAYMENT_SECURE] ${message}`, sanitizePaymentPayload(data));
    } else {
      console.warn(`[PAYMENT_SECURE] ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    // Scrub potential secrets from error objects
    const sanitizedError = error instanceof Error
      ? { message: error.message, name: error.name }
      : sanitizePaymentPayload(error);
    console.error(`[PAYMENT_SECURE_ERROR] ${message}`, sanitizedError);
  },
};
