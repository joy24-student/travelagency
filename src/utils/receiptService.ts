/**
 * receiptService.ts
 *
 * Unified Receipt & Voucher Generation and Sharing Utility for Shopno Jatra.
 * Consolidates all receipt formats, native Share.share calls, and PDF exports.
 */

import { Share, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

export interface ReceiptItem {
  name: string;
  quantity?: number;
  price?: number | string;
}

export interface UnifiedReceiptData {
  transactionId: string;
  bookingId?: string;
  bookingType?: string; // "Train E-Ticket", "Hotel Stay", "Flight Booking", "Tour Package"
  amount: number | string;
  currency?: string;
  paymentMethod: string; // "bKash", "Nagad", "Rocket", "Card", "Wallet"
  paidAt?: string;
  customerName?: string;
  customerPhone?: string;
  status?: "confirmed" | "completed" | "pending_verification" | "refunded" | "failed";
  items?: ReceiptItem[];
  notes?: string;
}

/**
 * Generates uniform, branded plain-text receipt for social / clipboard / messaging share
 */
export function generateReceiptText(data: UnifiedReceiptData): string {
  const currency = data.currency || "BDT";
  const paidAt = data.paidAt
    ? new Date(data.paidAt).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" })
    : new Date().toLocaleString("bn-BD", { timeZone: "Asia/Dhaka" });
  
  const statusBangla =
    data.status === "confirmed" || data.status === "completed"
      ? "✅ সফল ও নিশ্চিত (Confirmed)"
      : data.status === "pending_verification"
      ? "⏳ যাচাই প্রক্রিয়াধীন (Pending Verification)"
      : "❌ বাতিল / ব্যর্থ (Failed)";

  const itemsList = (data.items || [])
    .map((item) => `• ${item.name}${item.quantity ? ` (x${item.quantity})` : ""}: ${currency} ${item.price || ""}`)
    .join("\n");

  return `========================================
       🇧🇩 স্বপ্ন যাত্রা • SHOPNO JATRA
          অফিসিয়াল লেনদেন রসিদ / VOUCHER
========================================
লেনদেন নম্বর (TrxID) : ${data.transactionId}
বুকিং রেফারেন্স       : #${data.bookingId || "SJ-" + data.transactionId.slice(-6)}
বুকিংয়ের ধরন          : ${data.bookingType || "ভ্রমণ সেবা"}
তারিখ ও সময়           : ${paidAt}
পেমেন্ট মেথড          : ${data.paymentMethod.toUpperCase()}
লেনদেনের অবস্থা       : ${statusBangla}
----------------------------------------
গ্রাহকের নাম           : ${data.customerName || "সম্মানিত যাত্রী"}
${data.customerPhone ? `মোবাইল নম্বর          : ${data.customerPhone}\n` : ""}${itemsList ? `সেবাসমূহ:\n${itemsList}\n----------------------------------------\n` : ""}সর্বমোট পরিশোধিত     : ${currency} ${data.amount}
========================================
সহায়তার প্রয়োজনে যোগাযোগ: support@shopnojatra.com | হটলাইন: 16223
ধন্যবাদ আপনার সাথে ভ্রমণের সুযোগ দেওয়ার জন্য!
========================================`;
}

/**
 * Standardized Share handler replacing inconsistent Share.share calls
 */
export async function shareUnifiedReceipt(data: UnifiedReceiptData): Promise<boolean> {
  try {
    const text = generateReceiptText(data);
    const result = await Share.share({
      title: `Shopno Jatra Receipt #${data.transactionId}`,
      message: text,
    });
    return result.action === Share.sharedAction;
  } catch (err) {
    console.warn("Unified receipt share error:", err);
    return false;
  }
}

/**
 * HTML template for PDF generation
 */
export function generateReceiptHTML(data: UnifiedReceiptData): string {
  const currency = data.currency || "BDT";
  const dateStr = data.paidAt ? new Date(data.paidAt).toLocaleString() : new Date().toLocaleString();

  const itemRows = (data.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${currency} ${item.price || ""}</td>
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${data.transactionId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f172a; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 800; color: #2563eb; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; width: 46%; }
    .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .val { font-size: 14px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #475569; }
    .total-box { text-align: right; margin-top: 16px; padding: 16px; background: #eff6ff; border-radius: 8px; }
    .total-val { font-size: 24px; font-weight: 800; color: #1d4ed8; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🇧🇩 স্বপ্ন যাত্রা • Shopno Jatra</div>
    <div class="subtitle">অফিসিয়াল লেনদেন রসিদ ও ভ্রমণ ভাউচার (Official E-Receipt)</div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="label">Transaction Details</div>
      <div class="val">TrxID: ${data.transactionId}</div>
      <div class="label" style="margin-top:8px;">Booking ID</div>
      <div class="val">#${data.bookingId || "N/A"}</div>
      <div class="label" style="margin-top:8px;">Payment Gateway</div>
      <div class="val">${data.paymentMethod.toUpperCase()}</div>
    </div>
    <div class="box">
      <div class="label">Customer Name</div>
      <div class="val">${data.customerName || "Traveler"}</div>
      <div class="label" style="margin-top:8px;">Date & Time</div>
      <div class="val">${dateStr}</div>
      <div class="label" style="margin-top:8px;">Status</div>
      <div class="val" style="color: #16a34a;">Confirmed</div>
    </div>
  </div>

  ${
    data.items && data.items.length > 0
      ? `<table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>`
      : ""
  }

  <div class="total-box">
    <div class="label">Total Paid Amount</div>
    <div class="total-val">${currency} ${data.amount}</div>
  </div>

  <div class="footer">
    Shopno Jatra Digital Tourism • 24/7 Support: support@shopnojatra.com • Hotline: 16223
  </div>
</body>
</html>`;
}

/**
 * Downloads and shares PDF receipt
 */
export async function downloadAndSharePDFReceipt(data: UnifiedReceiptData): Promise<void> {
  try {
    const html = generateReceiptHTML(data);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Download Receipt #${data.transactionId}`,
      });
    }
  } catch (err) {
    console.warn("Failed to generate/share PDF receipt:", err);
    // Fallback to text share
    await shareUnifiedReceipt(data);
  }
}
