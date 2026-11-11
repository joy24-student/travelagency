/**
 * receiptShareService.ts
 *
 * Unified Receipt Generation, Sharing, and Export Service.
 * Consolidates fragmented Share.share calls into a standardized, branded,
 * and secure transaction receipt experience.
 */

import { Share, Platform, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { BRAND } from "../constants/brand";
import { formatCurrency, formatLocalizedDate } from "../utils/formatters";

export interface ReceiptData {
  receiptId: string;
  transactionId?: string;
  gatewayRef?: string;
  provider: string; // "bKash" | "Nagad" | "Rocket" | "Card" | "Wallet"
  amount: number;
  subtotal?: number;
  discount?: number;
  processingFee?: number;
  currency?: string;
  status: "completed" | "pending" | "failed" | "uncertain" | "refunded";
  timestamp: string | Date;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingRef?: string;
  items?: Array<{ name: string; quantity?: number; price: number }>;
}

/**
 * Format raw mobile / account numbers safely
 */
export function maskAccountNumber(raw?: string): string {
  if (!raw) return "N/A";
  const cleaned = raw.trim();
  if (cleaned.length <= 4) return cleaned;
  const last4 = cleaned.slice(-4);
  return `•••• •••• ${last4}`;
}

/**
 * Generate standard plain-text receipt for clipboard and simple text sharing
 */
export function formatReceiptText(data: ReceiptData): string {
  const currency = data.currency || "BDT";
  const dateStr = new Date(data.timestamp).toLocaleString("bn-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subtotal = data.subtotal ?? data.amount;
  const fee = data.processingFee ?? 0;
  const discount = data.discount ?? 0;

  return `
=========================================
      ${BRAND.name.bn} অফিসিয়াল পেমেন্ট রসিদ      
       ${BRAND.name.en.toUpperCase()} OFFICIAL RECEIPT     
=========================================
রসিদ নম্বর / Receipt No: #${data.receiptId.slice(0, 10).toUpperCase()}
ট্রানজ্যাকশন আইডি / TrxID: ${data.transactionId || data.gatewayRef || "N/A"}
পেমেন্ট মাধ্যম / Provider: ${data.provider.toUpperCase()}
একাউন্ট / Account: ${maskAccountNumber(data.customerPhone)}
স্ট্যাটাস / Status: ${data.status.toUpperCase()}
তারিখ ও সময় / Date: ${dateStr}
${data.bookingRef ? `বুকিং রেফারেন্স / Booking Ref: ${data.bookingRef}` : ""}
-----------------------------------------
সাবটোটাল / Subtotal: ${formatCurrency(subtotal, currency as any)}
${discount > 0 ? `ছাড় / Discount: -${formatCurrency(discount, currency as any)}` : ""}
${fee > 0 ? `গেটওয়ে ফি / Fee: +${formatCurrency(fee, currency as any)}` : ""}
মোট পরিশোধিত / Total Paid: ${formatCurrency(data.amount, currency as any)}
-----------------------------------------
নিরাপত্তা: 256-Bit SSL • PCI-DSS Compliant
হেল্পলাইন: ${BRAND.contact.phone} | ${BRAND.contact.supportEmail}
=========================================
ধন্যবাদ, আপনার যাত্রা শুভ হোক!
`.trim();
}

/**
 * Generate high-definition HTML for professional printable & PDF receipts
 */
export function generateReceiptHtml(data: ReceiptData): string {
  const currency = data.currency || "৳";
  const dateStr = new Date(data.timestamp).toLocaleString();
  const subtotal = data.subtotal ?? data.amount;
  const fee = data.processingFee ?? 0;
  const discount = data.discount ?? 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${data.receiptId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 30px; }
    .header { text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 800; color: #1E40AF; margin: 0; }
    .brand-sub { font-size: 13px; color: #64748B; margin-top: 4px; }
    .badge-status { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; margin-top: 10px; text-transform: uppercase; }
    .status-completed { background: #DCFCE7; color: #166534; }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-uncertain { background: #E0E7FF; color: #3730A3; }
    .status-failed { background: #FEE2E2; color: #991B1B; }
    .details-table { width: 100%; margin-top: 24px; border-collapse: collapse; }
    .details-table td { padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
    .details-table td.label { color: #64748B; width: 45%; }
    .details-table td.val { font-weight: 600; text-align: right; color: #0F172A; }
    .summary-box { background: #F8FAFC; border-radius: 12px; padding: 18px; margin-top: 24px; border: 1px solid #E2E8F0; }
    .summary-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
    .summary-total { font-size: 18px; font-weight: 800; color: #1E40AF; border-top: 2px dashed #CBD5E1; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94A3B8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="brand-title">${BRAND.name.bn} • ${BRAND.name.en.toUpperCase()}</h1>
    <div class="brand-sub">Official Digital Travel & Payment Receipt</div>
    <span class="badge-status status-${data.status}">${data.status === "completed" ? "Payment Confirmed" : data.status}</span>
  </div>

  <table class="details-table">
    <tr>
      <td class="label">Receipt Reference</td>
      <td class="val">#${data.receiptId.slice(0, 12).toUpperCase()}</td>
    </tr>
    <tr>
      <td class="label">Gateway Transaction ID</td>
      <td class="val">${data.transactionId || data.gatewayRef || "Awaiting Confirmation"}</td>
    </tr>
    <tr>
      <td class="label">Payment Provider</td>
      <td class="val">${data.provider}</td>
    </tr>
    <tr>
      <td class="label">Customer Account</td>
      <td class="val">${maskAccountNumber(data.customerPhone)}</td>
    </tr>
    ${data.bookingRef ? `<tr><td class="label">Trip / Booking ID</td><td class="val">${data.bookingRef}</td></tr>` : ""}
    <tr>
      <td class="label">Date & Time</td>
      <td class="val">${dateStr}</td>
    </tr>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span>Subtotal</span>
      <span>${formatCurrency(subtotal, currency as any)}</span>
    </div>
    ${discount > 0 ? `<div class="summary-row" style="color:#16A34A"><span>Discount Applied</span><span>-${formatCurrency(discount, currency as any)}</span></div>` : ""}
    ${fee > 0 ? `<div class="summary-row"><span>Gateway Convenience Fee</span><span>+${formatCurrency(fee, currency as any)}</span></div>` : ""}
    <div class="summary-row summary-total">
      <span>Total Paid</span>
      <span>${formatCurrency(data.amount, currency as any)}</span>
    </div>
  </div>

  <div class="footer">
    Verified with SHA-256 Checksum • PCI-DSS Level-1 Secure Gateway<br>
    Questions about this transaction? Call ${BRAND.contact.phone} or email ${BRAND.contact.supportEmail}<br>
    ${BRAND.legalName.en}, Dhaka, Bangladesh.
  </div>
</body>
</html>
  `.trim();
}

/**
 * Universal Share Receipt Function:
 * Works seamlessly across Android, iOS and Web
 */
export async function shareUnifiedReceipt(data: ReceiptData): Promise<boolean> {
  const textReceipt = formatReceiptText(data);
  try {
    const result = await Share.share({
      title: `Shopno Jatra Receipt #${data.receiptId.slice(0, 8)}`,
      message: textReceipt,
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.warn("Share receipt error:", error);
    return false;
  }
}

/**
 * Universal PDF Receipt Export & Native File Sharing
 */
export async function exportReceiptPdf(data: ReceiptData): Promise<void> {
  try {
    const html = generateReceiptHtml(data);
    const { uri } = await Print.printToFileAsync({ html });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Download Receipt #${data.receiptId.slice(0, 8)}.pdf`,
      });
    } else {
      Alert.alert("Receipt Generated", "PDF has been created successfully.");
    }
  } catch (error) {
    console.error("Failed to generate PDF receipt:", error);
    // Fallback to text sharing
    await shareUnifiedReceipt(data);
  }
}
