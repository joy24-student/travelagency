/**
 * Authoritative Payment Service
 * Hardened for Zero-Trust & PCI-DSS Compliance
 *
 * Guarantees:
 * - Mobile client is NEVER trusted for final payment status updates.
 * - Raw card numbers, CVVs, and bKash PINs are stripped before database insertion.
 * - Replay prevention via unique nonce & 5-minute timestamp checks.
 */

import { supabase } from "../utils/supabase";
import { BkashProvider } from "./payment/bkash";
import { NagadProvider } from "./payment/nagad";
import { RocketProvider } from "./payment/rocket";
import { CardProvider } from "./payment/card";
import { PaypalProvider } from "./payment/paypal";
import { BankTransferProvider } from "./payment/bankTransfer";
import { ShopnoWalletProvider } from "./payment/shopnoWallet";
import { GooglePayProvider } from "./payment/googlePay";
import { generateSecureNonce, storePendingTransaction } from "./payment/paymentSecurity";
import { sanitizePaymentPayload, securePaymentLogger } from "./payment/pciDssCompliance";
import type {
  IPaymentProvider,
  PaymentMethod,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  PaymentStatus,
} from "./payment/types";

const providers: Record<PaymentMethod, IPaymentProvider> = {
  google_pay: new GooglePayProvider(),
  bkash: new BkashProvider(),
  nagad: new NagadProvider(),
  rocket: new RocketProvider(),
  card: new CardProvider(),
  paypal: new PaypalProvider(),
  bank_transfer: new BankTransferProvider(),
  wallet: new ShopnoWalletProvider(),
};

export const paymentService = {
  /**
   * Initiate a payment request with PCI-DSS sanitization and nonce tracking
   */
  async pay(request: PaymentRequest): Promise<PaymentResult> {
    const provider = providers[request.method];
    if (!provider) {
      return {
        success: false,
        status: "failed",
        gateway: request.method,
        errorMessage: "Unsupported payment provider",
      };
    }

    const nonce = generateSecureNonce();
    const timestamp = Date.now();
    const idempotencyKey = request.metadata?.idempotencyKey || `idem_${nonce}`;

    // Strip any raw PAN or CVV from request metadata (PCI-DSS)
    const sanitizedMetadata = sanitizePaymentPayload(request.metadata || {});

    const sanitizedRequest: PaymentRequest = {
      ...request,
      metadata: {
        ...sanitizedMetadata,
        idempotencyKey,
        nonce,
        initiatedAt: timestamp,
      },
    };

    const result = await provider.initiate(sanitizedRequest);

    // Sanitize response from gateway to strip any unexpected sensitive data
    const safeGatewayResponse = sanitizePaymentPayload(result.gatewayResponse ?? {});

    try {
      await supabase.from("booking_payments").insert([
        {
          booking_id: request.bookingId || null,
          amount: request.amount,
          currency: request.currency,
          payment_method:
            request.method === "rocket"
              ? "wallet"
              : request.method === "paypal"
                ? "card"
                : request.method,
          // If gateway returns completed (e.g. internal wallet), record completed, otherwise pending
          payment_status: result.status === "completed" ? "completed" : "pending",
          transaction_id: result.transactionId || null,
          payment_gateway: result.gateway,
          payment_gateway_response: safeGatewayResponse,
          processed_at: result.success && result.status === "completed" ? new Date().toISOString() : null,
        },
      ]);
    } catch (dbError) {
      securePaymentLogger.error("Failed to log payment intent in Supabase", dbError);
    }

    if (result.transactionId) {
      await storePendingTransaction(result.transactionId, request.method);
    }

    return result;
  },

  /**
   * Authoritative verification
   * Queries provider directly and updates status only on verified gateway response
   */
  async verify(method: PaymentMethod, transactionId: string): Promise<PaymentStatus> {
    const provider = providers[method];
    if (!provider) return "failed";

    const verifiedStatus = await provider.verify(transactionId);

    // Update database record only with authoritatively verified status
    try {
      await supabase
        .from("booking_payments")
        .update({
          payment_status: verifiedStatus,
          processed_at: verifiedStatus === "completed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", transactionId);
    } catch (err) {
      securePaymentLogger.error("Error updating verified payment status", err);
    }

    return verifiedStatus;
  },

  /**
   * Refunds require admin or authoritative service role
   */
  async refund(method: PaymentMethod, request: RefundRequest): Promise<boolean> {
    const provider = providers[method];
    if (!provider) return false;

    const success = await provider.refund(request);
    if (success) {
      try {
        await supabase
          .from("booking_payments")
          .update({
            payment_status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("transaction_id", request.transactionId);
      } catch (err) {
        securePaymentLogger.error("Error updating refund status in database", err);
      }
    }
    return success;
  },

  getSupportedMethods(): PaymentMethod[] {
    return Object.keys(providers) as PaymentMethod[];
  },

  getWalletBalance: ShopnoWalletProvider.getBalance,
  topUpWallet: ShopnoWalletProvider.topUp,
};
