// @ts-nocheck
/**
 * Nagad Payment Provider - Hardened & Tamper-Proofed
 *
 * Security Controls:
 * 1. Nagad private signing key is reserved strictly for backend microservices.
 * 2. Replay attack mitigation: Nonce and 5-minute validity window on all payment attempts.
 * 3. Never stores Nagad PIN or credentials on mobile client or persistent storage.
 */

import { generateSecureNonce } from "./paymentSecurity";
import { securePaymentLogger } from "./pciDssCompliance";
import type {
  IPaymentProvider,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  RefundRequest,
  NagadConfig,
} from "./types";

const NAGAD_CONFIG: NagadConfig = {
  merchantId: process.env.EXPO_PUBLIC_NAGAD_MERCHANT_ID || "",
  merchantNumber: process.env.EXPO_PUBLIC_NAGAD_MERCHANT_NUMBER || "",
  baseUrl: process.env.EXPO_PUBLIC_NAGAD_BASE_URL || "https://api.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs",
  sandboxMode: process.env.EXPO_PUBLIC_NAGAD_SANDBOX === "true",
};

export class NagadProvider implements IPaymentProvider {
  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    const nonce = generateSecureNonce();
    const timestamp = Date.now();

    try {
      const orderId = request.reference || `ORD-${nonce.slice(0, 10)}`;
      const dateTime = new Date().toISOString();

      securePaymentLogger.log("Initiating Nagad session", {
        orderId,
        amount: request.amount,
        nonce,
        timestamp,
      });

      // Delegate sensitive signature and initialization to backend/edge function
      const backendInitUrl = `${process.env.EXPO_PUBLIC_APP_URL || "https://api.travel.com"}/api/payments/nagad/initialize`;
      const response = await fetch(backendInitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nonce": nonce,
          "x-timestamp": timestamp.toString(),
        },
        body: JSON.stringify({
          merchantId: NAGAD_CONFIG.merchantId,
          orderId,
          amount: request.amount.toFixed(2),
          dateTime,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          status: "failed",
          gateway: "nagad",
          errorMessage: "Failed to initialize secure Nagad session",
        };
      }

      const initData = await response.json();

      return {
        success: true,
        status: "pending",
        transactionId: initData.paymentReferenceId || orderId,
        gateway: "nagad",
        gatewayResponse: initData,
        redirectUrl: initData.callBackUrl,
        paymentId: initData.paymentReferenceId,
      };
    } catch (error: any) {
      securePaymentLogger.error("Nagad initiate error", error);
      return {
        success: false,
        status: "failed",
        gateway: "nagad",
        errorMessage: error.message || "Nagad service temporarily unreachable",
      };
    }
  }

  async verify(paymentReferenceId: string): Promise<PaymentStatus> {
    try {
      const backendVerifyUrl = `${process.env.EXPO_PUBLIC_APP_URL || "https://api.travel.com"}/api/payments/nagad/verify?id=${encodeURIComponent(paymentReferenceId)}`;
      const response = await fetch(backendVerifyUrl, {
        headers: {
          "x-nonce": generateSecureNonce(),
          "x-timestamp": Date.now().toString(),
        },
      });

      if (!response.ok) return "pending";
      const data = await response.json();
      return (data.status as PaymentStatus) || "pending";
    } catch (error) {
      securePaymentLogger.error("Nagad verify error", error);
      return "failed";
    }
  }

  async refund(request: RefundRequest): Promise<boolean> {
    return false;
  }
}
