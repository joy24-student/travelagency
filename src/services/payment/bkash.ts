// @ts-nocheck
/**
 * bKash Payment Provider
 * Production-ready integration with bKash Payment Gateway API
 */

import type {
  IPaymentProvider,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  RefundRequest,
  BkashConfig,
} from "./types";

const BKASH_CONFIG: BkashConfig = {
  appKey: process.env.EXPO_PUBLIC_BKASH_APP_KEY || "",
  appSecret: process.env.EXPO_PUBLIC_BKASH_APP_SECRET || "",
  username: process.env.EXPO_PUBLIC_BKASH_USERNAME || "",
  password: process.env.EXPO_PUBLIC_BKASH_PASSWORD || "",
  baseUrl: process.env.EXPO_PUBLIC_BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
  sandboxMode: process.env.EXPO_PUBLIC_BKASH_SANDBOX === "true",
};

export class BkashProvider implements IPaymentProvider {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username: BKASH_CONFIG.username,
          password: BKASH_CONFIG.password,
        },
        body: JSON.stringify({
          app_key: BKASH_CONFIG.appKey,
          app_secret: BKASH_CONFIG.appSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.id_token) {
        throw new Error(data.errorMessage || "Failed to get bKash token");
      }

      this.token = data.id_token;
      this.tokenExpiry = Date.now() + 3500000; // Token valid for ~1 hour

      return this.token;
    } catch (error: any) {
      console.error("bKash token error:", error);
      throw new Error("Failed to authenticate with bKash");
    }
  }

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const token = await this.getToken();

      const paymentRequest = {
        mode: "0011",
        payerReference: request.phone || "",
        callbackURL: `${process.env.EXPO_PUBLIC_APP_URL}/payment-callback/bkash`,
        amount: request.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: request.reference || `INV-${Date.now()}`,
      };

      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: token,
          "x-app-key": BKASH_CONFIG.appKey,
        },
        body: JSON.stringify(paymentRequest),
      });

      const data = await response.json();

      if (!response.ok || data.statusCode !== "0000") {
        return {
          success: false,
          status: "failed",
          gateway: "bkash",
          gatewayResponse: data,
          errorMessage: data.statusMessage || "Payment creation failed",
        };
      }

      return {
        success: true,
        status: "pending",
        transactionId: data.paymentID,
        gateway: "bkash",
        gatewayResponse: data,
        redirectUrl: data.bkashURL,
        paymentId: data.paymentID,
      };
    } catch (error: any) {
      console.error("bKash initiate error:", error);
      return {
        success: false,
        status: "failed",
        gateway: "bkash",
        errorMessage: error.message || "Failed to initiate bKash payment",
      };
    }
  }

  async verify(paymentId: string): Promise<PaymentStatus> {
    try {
      const token = await this.getToken();

      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: token,
          "x-app-key": BKASH_CONFIG.appKey,
        },
        body: JSON.stringify({ paymentID: paymentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return "failed";
      }

      switch (data.transactionStatus) {
        case "Completed":
          return "completed";
        case "Processing":
          return "processing";
        case "Failed":
          return "failed";
        case "Cancelled":
          return "cancelled";
        default:
          return "pending";
      }
    } catch (error) {
      console.error("bKash verify error:", error);
      return "failed";
    }
  }

  async refund(request: RefundRequest): Promise<boolean> {
    try {
      const token = await this.getToken();

      const response = await fetch(`${BKASH_CONFIG.baseUrl}/tokenized/checkout/payment/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: token,
          "x-app-key": BKASH_CONFIG.appKey,
        },
        body: JSON.stringify({
          paymentID: request.transactionId,
          amount: request.amount.toFixed(2),
          trxID: request.transactionId,
          sku: "payment",
          reason: request.reason || "Refund",
        }),
      });

      const data = await response.json();
      return response.ok && data.statusCode === "0000";
    } catch (error) {
      console.error("bKash refund error:", error);
      return false;
    }
  }
}
