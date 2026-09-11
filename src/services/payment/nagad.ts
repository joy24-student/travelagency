// @ts-nocheck
/**
 * Nagad Payment Provider
 * Production-ready integration with Nagad Payment Gateway API
 */

import type {
  IPaymentProvider,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
  RefundRequest,
  NagadConfig,
} from "./types";
import CryptoJS from "crypto-js";

const NAGAD_CONFIG: NagadConfig = {
  merchantId: process.env.EXPO_PUBLIC_NAGAD_MERCHANT_ID || "",
  merchantNumber: process.env.EXPO_PUBLIC_NAGAD_MERCHANT_NUMBER || "",
  publicKey: process.env.EXPO_PUBLIC_NAGAD_PUBLIC_KEY || "",
  privateKey: process.env.EXPO_PUBLIC_NAGAD_PRIVATE_KEY || "",
  baseUrl: process.env.EXPO_PUBLIC_NAGAD_BASE_URL || "https://api.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs",
  sandboxMode: process.env.EXPO_PUBLIC_NAGAD_SANDBOX === "true",
};

export class NagadProvider implements IPaymentProvider {
  private generateSignature(data: string): string {
    try {
      return CryptoJS.HmacSHA256(data, NAGAD_CONFIG.privateKey).toString(CryptoJS.enc.Base64);
    } catch (error) {
      console.error("Nagad signature error:", error);
      return "";
    }
  }

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const orderId = request.reference || `ORD-${Date.now()}`;
      const dateTime = new Date().toISOString();

      // Initialize payment
      const initPayload = {
        merchantId: NAGAD_CONFIG.merchantId,
        orderId: orderId,
        datetime: dateTime,
        challenge: this.generateRandomString(40),
      };

      const sensitiveData = {
        merchantId: NAGAD_CONFIG.merchantId,
        datetime: dateTime,
        orderId: orderId,
        challenge: initPayload.challenge,
      };

      const initResponse = await fetch(
        `${NAGAD_CONFIG.baseUrl}/check-out/initialize/${NAGAD_CONFIG.merchantId}/${orderId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
            "X-KM-IP-V4": "103.102.214.60",
            "X-KM-Client-Type": "PC_WEB",
          },
          body: JSON.stringify({
            ...initPayload,
            signature: this.generateSignature(JSON.stringify(sensitiveData)),
          }),
        }
      );

      const initData = await initResponse.json();

      if (!initResponse.ok) {
        return {
          success: false,
          status: "failed",
          gateway: "nagad",
          gatewayResponse: initData,
          errorMessage: initData.message || "Payment initialization failed",
        };
      }

      // Complete payment
      const completePayload = {
        merchantId: NAGAD_CONFIG.merchantId,
        orderId: orderId,
        amount: request.amount.toFixed(2),
        currencyCode: "050",
        challenge: initData.challenge,
      };

      const paymentReferenceId = initData.paymentReferenceId;

      const completeResponse = await fetch(
        `${NAGAD_CONFIG.baseUrl}/check-out/complete/${paymentReferenceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
            "X-KM-IP-V4": "103.102.214.60",
            "X-KM-Client-Type": "PC_WEB",
          },
          body: JSON.stringify({
            ...completePayload,
            productDetails: request.reference || "Payment",
            additionalMerchantInfo: request.metadata || {},
            signature: this.generateSignature(JSON.stringify(completePayload)),
          }),
        }
      );

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        return {
          success: false,
          status: "failed",
          gateway: "nagad",
          gatewayResponse: completeData,
          errorMessage: completeData.message || "Payment completion failed",
        };
      }

      return {
        success: true,
        status: "pending",
        transactionId: paymentReferenceId,
        gateway: "nagad",
        gatewayResponse: completeData,
        redirectUrl: completeData.callBackUrl,
        paymentId: paymentReferenceId,
      };
    } catch (error: any) {
      console.error("Nagad initiate error:", error);
      return {
        success: false,
        status: "failed",
        gateway: "nagad",
        errorMessage: error.message || "Failed to initiate Nagad payment",
      };
    }
  }

  async verify(paymentReferenceId: string): Promise<PaymentStatus> {
    try {
      const response = await fetch(
        `${NAGAD_CONFIG.baseUrl}/verify/payment/${paymentReferenceId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
            "X-KM-IP-V4": "103.102.214.60",
            "X-KM-Client-Type": "PC_WEB",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return "failed";
      }

      switch (data.status) {
        case "Success":
          return "completed";
        case "Processing":
          return "processing";
        case "Failed":
          return "failed";
        case "Aborted":
          return "cancelled";
        default:
          return "pending";
      }
    } catch (error) {
      console.error("Nagad verify error:", error);
      return "failed";
    }
  }

  async refund(request: RefundRequest): Promise<boolean> {
    try {
      const refundPayload = {
        merchantId: NAGAD_CONFIG.merchantId,
        orderId: request.transactionId,
        amount: request.amount.toFixed(2),
        refundReason: request.reason || "Customer request",
      };

      const response = await fetch(
        `${NAGAD_CONFIG.baseUrl}/refund/${request.transactionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
          },
          body: JSON.stringify({
            ...refundPayload,
            signature: this.generateSignature(JSON.stringify(refundPayload)),
          }),
        }
      );

      const data = await response.json();
      return response.ok && data.status === "Success";
    } catch (error) {
      console.error("Nagad refund error:", error);
      return false;
    }
  }

  private generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
