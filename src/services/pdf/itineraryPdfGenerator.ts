/**
 * Enterprise Document & B2B Solutions Engine
 * Branded Itinerary, Flight Confirmation, Hotel Voucher & Payment Receipt PDF Generator
 *
 * Direct integration with expo-print and expo-sharing
 * Supports English and Bengali typography with zero font clipping guarantee.
 */

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SupportedLanguage = "en" | "bn";

export interface AgencyBranding {
  agencyName: string;
  tagline?: string;
  logoUrl?: string; // remote URL, local file URI, or base64 data URI
  watermarkUrl?: string; // image watermark
  watermarkText?: string; // text watermark e.g. "OFFICIAL ITINERARY"
  watermarkOpacity?: number; // 0.04 to 0.15
  showWatermark?: boolean;
  signatureStampUrl?: string; // authorized seal/signature image
  signatoryName?: string;
  signatoryTitle?: string;
  emergencyHotline: string; // 24/7 hotline e.g. "+880 1800-746766"
  emergencyEmail?: string;
  supportPhone?: string;
  supportEmail?: string;
  address?: string;
  website?: string;
  licenseNumber?: string; // Govt Reg or IATA code e.g. "Govt. Reg. #TRV-88219"
  primaryColor?: string; // e.g. "#4F46E5"
  secondaryColor?: string; // e.g. "#06B6D4"
}

export interface DayScheduleItem {
  time: string;
  activity: string;
  location?: string;
  notes?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  summary?: string;
  schedule: DayScheduleItem[];
  mealPlan?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    details?: string;
  };
  accommodationName?: string;
  transportation?: string;
  guideNotes?: string;
}

export interface FlightConfirmation {
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  pnr: string;
  eTicketNumber?: string;
  cabinClass: string; // "Economy" | "Premium Economy" | "Business" | "First"
  departureAirport: string; // "DAC - Hazrat Shahjalal Intl, Dhaka"
  departureTerminal?: string;
  departureDate: string;
  departureTime: string;
  arrivalAirport: string; // "DPS - Ngurah Rai Intl, Bali"
  arrivalTerminal?: string;
  arrivalDate: string;
  arrivalTime: string;
  duration?: string;
  baggageAllowance?: string; // "30 kg Check-in + 7 kg Cabin"
  seatAssignment?: string; // "14A, 14B"
  mealType?: string;
  gate?: string;
  status: string; // "Confirmed" | "Scheduled"
}

export interface HotelVoucher {
  hotelName: string;
  starRating?: number; // 1-5
  voucherNumber: string;
  confirmationCode: string;
  address: string;
  phone?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  nights: number;
  roomType: string;
  numberOfRooms: number;
  guestNames?: string[];
  mealBasis: string; // "Buffet Breakfast Included (CP)" | "All Inclusive"
  inclusions?: string[];
  specialInstructions?: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentReceipt {
  receiptNumber: string;
  invoiceDate: string;
  paymentMethod: string; // "bKash Merchant Payment", "City Bank Wire", "Visa Card"
  transactionId: string;
  paymentStatus: "Paid in Full" | "Partial / Deposit" | "Due";
  currency: string; // "BDT" | "USD"
  currencySymbol: string; // "৳" | "$"
  items: ReceiptItem[];
  subtotal: number;
  taxesAndFees: number;
  discount?: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  taxRegistrationNumber?: string; // "BIN / Tax ID"
  notes?: string;
}

export interface TravelerInfo {
  leadPassengerName: string;
  contactEmail?: string;
  contactPhone?: string;
  numberOfGuests: number;
  passportNumber?: string;
  specialRequests?: string;
}

export interface ItineraryDocumentData {
  bookingReference: string;
  tripTitle: string;
  destination: string;
  startDate: string;
  endDate: string;
  issueDate: string;
  traveler: TravelerInfo;
  agency: AgencyBranding;
  itineraryDays?: ItineraryDay[];
  flights?: FlightConfirmation[];
  hotels?: HotelVoucher[];
  paymentReceipt?: PaymentReceipt;
  termsAndConditions?: string[];
}

export interface DocumentRenderOptions {
  language?: SupportedLanguage;
  useBengaliNumerals?: boolean;
  includeItinerary?: boolean;
  includeFlights?: boolean;
  includeHotels?: boolean;
  includePaymentReceipt?: boolean;
  includeTerms?: boolean;
}

// ============================================================================
// LOCALIZATION & DICTIONARY
// ============================================================================

export const I18N_STRINGS = {
  en: {
    officialDocTitle: "OFFICIAL TRAVEL ITINERARY & VOUCHERS",
    travelItinerary: "Travel Itinerary",
    bookingReference: "Booking Reference",
    leadTraveler: "Lead Traveler",
    guests: "Travelers",
    personUnit: "Person(s)",
    dates: "Travel Dates",
    destination: "Destination",
    duration: "Duration",
    days: "Days",
    nights: "Nights",
    issueDate: "Date of Issue",
    emergencyHelpline: "24/7 Emergency Support Hotline",
    licensedAgency: "Authorized Travel Management Company",
    contactDetails: "Agency Contact",
    address: "Registered Office",
    licenseNo: "Govt. Reg. / IATA",

    // Itinerary Section
    itinerarySectionTitle: "Day-by-Day Travel Schedule",
    itinerarySubtitle: "Comprehensive daily plan, meal schedule, and activities",
    day: "Day",
    mealsIncluded: "Meal Plan",
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    accommodation: "Accommodation",
    transport: "Transportation",
    guideNotes: "Special Notes & Guide Instructions",
    time: "Time",
    activity: "Activity / Program",
    location: "Location",
    notSpecified: "Not specified",
    included: "Included",
    notIncluded: "Not Included",

    // Flight Section
    flightSectionTitle: "Flight Ticket Confirmations",
    flightSubtitle: "Electronic ticket vouchers, baggage rules & schedules",
    airline: "Airline",
    flightNumber: "Flight No.",
    pnr: "PNR Reference",
    eTicket: "E-Ticket No.",
    cabinClass: "Cabin Class",
    departure: "Departure",
    arrival: "Arrival",
    terminal: "Terminal",
    gate: "Gate",
    baggage: "Baggage Allowance",
    seat: "Seat Allocation",
    flightStatus: "Flight Status",
    confirmed: "CONFIRMED",

    // Hotel Section
    hotelSectionTitle: "Hotel Accommodation Vouchers",
    hotelSubtitle: "Official hotel stay confirmation and check-in voucher",
    hotel: "Hotel / Resort",
    voucherNumber: "Voucher #",
    hotelConfirmation: "Hotel Conf. #",
    checkIn: "Check-in Date",
    checkOut: "Check-out Date",
    roomType: "Room Category",
    rooms: "Room(s)",
    mealBasis: "Board / Meal Basis",
    inclusions: "Complimentary Amenities & Inclusions",
    specialInstructions: "Check-in Instructions",

    // Receipt Section
    receiptSectionTitle: "Payment Receipt & Statement of Account",
    receiptSubtitle: "Official billing statement, tax breakdown, and settlement",
    receiptNumber: "Receipt No.",
    paymentDate: "Date of Payment",
    paymentMethod: "Payment Method",
    transactionId: "Transaction / Ref ID",
    serviceDescription: "Description of Service",
    qty: "Qty",
    rate: "Rate",
    amount: "Total Amount",
    subtotal: "Subtotal",
    taxVat: "Taxes & Govt. VAT",
    discount: "Promotional Discount",
    totalAmount: "Grand Total",
    amountPaid: "Amount Paid",
    balanceDue: "Balance Due",
    paidInFull: "PAID IN FULL",
    paymentDue: "PAYMENT DUE",
    taxId: "Tax / BIN Reg. No.",

    // Verification & Signatures
    authorizedSignature: "Authorized Signatory",
    officialSeal: "Official Agency Seal & Stamp",
    issuedBy: "Issued By",
    termsNotice: "Terms & Conditions",
    disclaimer:
      "This document is an officially issued itinerary voucher, flight confirmation, and payment record from the licensed travel agency. For flight schedule reconfirmations, delayed baggage, or 24/7 on-ground emergency assistance, please contact the emergency hotline listed above.",
    page: "Page",
    of: "of",
    emergencyCardTitle: "24/7 TRAVEL EMERGENCY ASSISTANCE",
    emergencyCardBody:
      "Keep this document handy during transit. Our dedicated 24/7 control desk is standing by to resolve any immigration, boarding, or hotel check-in queries.",
  },
  bn: {
    officialDocTitle: "অফিসিয়াল ভ্রমণ বিবরণী ও বুকিং ভাউচার",
    travelItinerary: "ভ্রমণ বিবরণী",
    bookingReference: "বুকিং রেফারেন্স নম্বর",
    leadTraveler: "প্রধান যাত্রী",
    guests: "মোট যাত্রী",
    personUnit: "জন",
    dates: "ভ্রমণের তারিখ",
    destination: "গন্তব্য",
    duration: "স্থিতিকাল",
    days: "দিন",
    nights: "রাত",
    issueDate: "ইস্যুর তারিখ",
    emergencyHelpline: "২৪/৭ সার্বক্ষণিক জরুরি সহায়তা হটলাইন",
    licensedAgency: "সরকারি অনুমোদিত ট্রাভেল এজেন্সি",
    contactDetails: "যোগাযোগ",
    address: "অফিসের ঠিকানা",
    licenseNo: "সরকারি রেজি. / আইএটিএ (IATA)",

    // Itinerary Section
    itinerarySectionTitle: "দৈনিক ভ্রমণ পরিকল্পনা (দিনভিত্তিক বিবরণী)",
    itinerarySubtitle: "প্রতিদিনের সময়সূচি, দর্শনীয় স্থান, যাতায়াত ও খাবারের বিস্তারিত",
    day: "দিন",
    mealsIncluded: "খাবারের ব্যবস্থা",
    breakfast: "সকালের নাস্তা",
    lunch: "দুপুরের খাবার",
    dinner: "রাতের খাবার",
    accommodation: "হোটেল / থাকার ব্যবস্থা",
    transport: "যাতায়াত ব্যবস্থা",
    guideNotes: "ট্যুর গাইড ও বিশেষ নির্দেশনা",
    time: "সময়",
    activity: "কার্যক্রম ও দর্শনীয় স্থান",
    location: "স্থান",
    notSpecified: "উল্লেখ নেই",
    included: "অন্তর্ভুক্ত",
    notIncluded: "অন্তর্ভুক্ত নয়",

    // Flight Section
    flightSectionTitle: "ফ্লাইট টিকিট নিশ্চিতকরণ ভাউচার",
    flightSubtitle: "ইলেকট্রনিক টিকিট নম্বর, সময়সূচি ও ব্যাগেজ নীতিমালা",
    airline: "এয়ারলাইন",
    flightNumber: "ফ্লাইট নম্বর",
    pnr: "পিএনআর রেফারেন্স (PNR)",
    eTicket: "ই-টিকিট নম্বর",
    cabinClass: "কেবিন ক্লাস",
    departure: "প্রস্থান (Departure)",
    arrival: "পৌঁছানো (Arrival)",
    terminal: "টার্মিনাল",
    gate: "গেট",
    baggage: "ব্যাগেজ সুবিধা",
    seat: "আসন নম্বর",
    flightStatus: "ফ্লাইট স্ট্যাটাস",
    confirmed: "নিশ্চিত (CONFIRMED)",

    // Hotel Section
    hotelSectionTitle: "হোটেল বুকিং ভাউচার",
    hotelSubtitle: "অফিসিয়াল হোটেল অবস্থান নিশ্চিতকরণ ও চেক-ইন ভাউচার",
    hotel: "হোটেল / রিসোর্ট",
    voucherNumber: "ভাউচার নং",
    hotelConfirmation: "হোটেল কনফার্মেশন কোড",
    checkIn: "চেক-ইন তারিখ",
    checkOut: "চেক-আউট তারিখ",
    roomType: "রুমের ক্যাটাগরি",
    rooms: "রুম সংখ্যা",
    mealBasis: "খাবার প্ল্যান",
    inclusions: "বিশেষ সুবিধাসমূহ",
    specialInstructions: "চেক-ইন সংক্রান্ত নির্দেশনা",

    // Receipt Section
    receiptSectionTitle: "পেমেন্ট রশিদ ও হিসাব বিবরণী",
    receiptSubtitle: "অফিসিয়াল বিলিং চালান, ভ্যাট হিসাব ও পরিশোধ বিবরণ",
    receiptNumber: "রশিদ নম্বর",
    paymentDate: "পেমেন্টের তারিখ",
    paymentMethod: "পেমেন্টের মাধ্যম",
    transactionId: "ট্রানজেকশন / রেফারেন্স আইডি",
    serviceDescription: "সেবা / প্যাকেজের বিস্তারিত বিবরণ",
    qty: "পরিমাণ",
    rate: "দর / রেট",
    amount: "মোট টাকা",
    subtotal: "উপমোট",
    taxVat: "সরকারি ভ্যাট ও ট্যাক্স",
    discount: "প্রমোশনাল ডিসকাউন্ট",
    totalAmount: "সর্বমোট বিল",
    amountPaid: "পরিশোধিত টাকা",
    balanceDue: "অবশিষ্ট বকেয়া",
    paidInFull: "সম্পূর্ণ পরিশোধিত",
    paymentDue: "বকেয়া প্রযোজ্য",
    taxId: "কর / বিআইএন নম্বর (BIN)",

    // Verification & Signatures
    authorizedSignature: "অনুমোদিত স্বাক্ষরকারী",
    officialSeal: "অফিসিয়াল এজেন্সির সিল ও স্ট্যাম্প",
    issuedBy: "ইস্যুকারী কর্মকর্তা",
    termsNotice: "শর্তাবলী ও নিয়মাবলী",
    disclaimer:
      "এই নথিটি অনুমোদিত ট্রাভেল এজেন্সি কর্তৃক জারিকৃত একটি প্রাতিষ্ঠানিক ভ্রমণ ভাউচার, টিকিট নিশ্চিতকরণ ও পেমেন্ট রেকর্ড। ভ্রমণকালীন ফ্লাইট পুনঃনিশ্চিতকরণ, ব্যাগেজ সহায়তা বা জরুরি যেকোনো অন-গ্রাউন্ড সহায়তার জন্য উপরে উল্লেখিত ২৪/৭ হেল্পলাইনে যোগাযোগ করুন।",
    page: "পৃষ্ঠা",
    of: "এর",
    emergencyCardTitle: "২৪/৭ পর্যটক জরুরি নিয়ন্ত্রণ হেল্পলাইন",
    emergencyCardBody:
      "ভ্রমণকালীন সময় এই নথিটি সঙ্গে রাখুন। যেকোনো ইমিগ্রেশন, ফ্লাইট বা হোটেল চেক-ইন জটিলতায় আমাদের ডেডিকেটেড সাপোর্ট ডেস্ক তাৎক্ষণিক সহায়তার জন্য সদা প্রস্তুত।",
  },
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Converts English numerals (0-9) to Bengali numerals (০-৯)
 */
export function toBengaliNumerals(value: string | number): string {
  const bnDigits: { [key: string]: string } = {
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",
  };
  return String(value).replace(/[0-9]/g, (digit) => bnDigits[digit] || digit);
}

/**
 * Resolves an image URI for HTML printing.
 * Converts local file:// paths to base64 data URIs for WKWebView / Android WebView compatibility.
 */
async function resolveImageForHtml(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  if (
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("data:")
  ) {
    return uri;
  }

  // Attempt local file read via expo-file-system
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      const ext = uri.split(".").pop()?.toLowerCase() || "png";
      const mime =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "svg"
            ? "image/svg+xml"
            : "image/png";
      return `data:${mime};base64,${base64}`;
    }
  } catch (err) {
    console.warn("Could not convert local file URI to base64:", err);
  }
  return uri;
}

/**
 * Safe string formatting based on chosen language & numeral system
 */
function formatNumber(
  val: number | string,
  lang: SupportedLanguage,
  useBnNumerals: boolean,
): string {
  const str = String(val);
  return lang === "bn" && useBnNumerals ? toBengaliNumerals(str) : str;
}

// ============================================================================
// HTML GENERATOR WITH ZERO FONT CLIPPING
// ============================================================================

/**
 * Generates enterprise-grade, print-ready HTML for the travel itinerary PDF.
 * Ensures zero font clipping for Bengali text with Google Fonts Hind Siliguri and Noto Sans Bengali.
 */
export async function generateItineraryHtml(
  data: ItineraryDocumentData,
  options: DocumentRenderOptions = {},
): Promise<string> {
  const lang: SupportedLanguage = options.language || "en";
  const useBnNumerals = options.useBengaliNumerals ?? true;
  const includeItinerary = options.includeItinerary ?? true;
  const includeFlights = options.includeFlights ?? true;
  const includeHotels = options.includeHotels ?? true;
  const includePaymentReceipt = options.includePaymentReceipt ?? true;
  const includeTerms = options.includeTerms ?? true;

  const t = I18N_STRINGS[lang];
  const num = (v: number | string) => formatNumber(v, lang, useBnNumerals);

  // Resolve images to base64 if local
  const resolvedLogo = await resolveImageForHtml(data.agency.logoUrl);
  const resolvedWatermark = await resolveImageForHtml(
    data.agency.watermarkUrl,
  );
  const resolvedStamp = await resolveImageForHtml(
    data.agency.signatureStampUrl,
  );

  const primaryColor = data.agency.primaryColor || "#1E3A8A";
  const secondaryColor = data.agency.secondaryColor || "#0D9488";
  const watermarkOpacity = data.agency.watermarkOpacity ?? 0.06;
  const showWatermark = data.agency.showWatermark ?? true;
  const watermarkText =
    data.agency.watermarkText || data.agency.agencyName || "OFFICIAL ITINERARY";

  // Build Day-by-Day HTML
  let itineraryHtml = "";
  if (includeItinerary && data.itineraryDays && data.itineraryDays.length > 0) {
    itineraryHtml = `
      <div class="section-container avoid-break">
        <div class="section-header-bar">
          <div class="section-icon-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
          </div>
          <div>
            <h2 class="section-title">${t.itinerarySectionTitle}</h2>
            <div class="section-subtitle">${t.itinerarySubtitle}</div>
          </div>
        </div>

        <div class="timeline-wrapper">
          ${data.itineraryDays
            .map((day) => {
              const meals = day.mealPlan || {};
              const mealList = [
                meals.breakfast
                  ? `<span class="pill pill-success">✓ ${t.breakfast}</span>`
                  : "",
                meals.lunch
                  ? `<span class="pill pill-success">✓ ${t.lunch}</span>`
                  : "",
                meals.dinner
                  ? `<span class="pill pill-success">✓ ${t.dinner}</span>`
                  : "",
              ]
                .filter(Boolean)
                .join(" ");

              return `
              <div class="timeline-day-card avoid-break">
                <div class="day-badge-col">
                  <div class="day-badge">
                    <span class="day-label">${t.day}</span>
                    <span class="day-number">${num(day.dayNumber)}</span>
                  </div>
                  <div class="day-date-chip">${day.date}</div>
                </div>

                <div class="day-content-col">
                  <h3 class="day-title">${day.title}</h3>
                  ${day.summary ? `<p class="day-summary">${day.summary}</p>` : ""}

                  <div class="schedule-table">
                    ${day.schedule
                      .map(
                        (item) => `
                      <div class="schedule-row">
                        <div class="schedule-time">${item.time}</div>
                        <div class="schedule-body">
                          <div class="schedule-activity">${item.activity}</div>
                          ${item.location ? `<div class="schedule-location">📍 ${item.location}</div>` : ""}
                          ${item.notes ? `<div class="schedule-notes">ℹ️ ${item.notes}</div>` : ""}
                        </div>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>

                  <div class="day-meta-footer">
                    ${
                      mealList
                        ? `
                      <div class="day-meta-item">
                        <span class="meta-label">${t.mealsIncluded}:</span>
                        <div class="meta-pills">${mealList}</div>
                      </div>
                    `
                        : ""
                    }
                    ${
                      day.accommodationName
                        ? `
                      <div class="day-meta-item">
                        <span class="meta-label">${t.accommodation}:</span>
                        <span class="meta-value">🏨 ${day.accommodationName}</span>
                      </div>
                    `
                        : ""
                    }
                    ${
                      day.transportation
                        ? `
                      <div class="day-meta-item">
                        <span class="meta-label">${t.transport}:</span>
                        <span class="meta-value">🚐 ${day.transportation}</span>
                      </div>
                    `
                        : ""
                    }
                  </div>

                  ${
                    day.guideNotes
                      ? `
                    <div class="guide-notes-box">
                      <strong>${t.guideNotes}:</strong> ${day.guideNotes}
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  // Build Flight Confirmations HTML
  let flightsHtml = "";
  if (includeFlights && data.flights && data.flights.length > 0) {
    flightsHtml = `
      <div class="section-container avoid-break">
        <div class="section-header-bar">
          <div class="section-icon-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
            </svg>
          </div>
          <div>
            <h2 class="section-title">${t.flightSectionTitle}</h2>
            <div class="section-subtitle">${t.flightSubtitle}</div>
          </div>
        </div>

        <div class="flight-cards-grid">
          ${data.flights
            .map(
              (f) => `
            <div class="flight-ticket-card avoid-break">
              <div class="flight-ticket-header">
                <div class="flight-airline-badge">
                  <span class="airline-name">${f.airline}</span>
                  <span class="flight-no-chip">${f.flightNumber}</span>
                </div>
                <div class="flight-pnr-box">
                  <span class="pnr-title">${t.pnr}:</span>
                  <span class="pnr-code">${f.pnr}</span>
                  <span class="status-badge-confirmed">${t.confirmed}</span>
                </div>
              </div>

              <div class="flight-route-display">
                <div class="route-point departure-point">
                  <div class="point-time">${f.departureTime}</div>
                  <div class="point-date">${f.departureDate}</div>
                  <div class="point-airport">${f.departureAirport}</div>
                  ${f.departureTerminal ? `<div class="terminal-chip">${t.terminal} ${f.departureTerminal}</div>` : ""}
                </div>

                <div class="route-middle-indicator">
                  <div class="flight-duration">${f.duration || ""}</div>
                  <div class="route-line-vector">
                    <span class="vector-dot"></span>
                    <span class="vector-plane">✈</span>
                    <span class="vector-line"></span>
                    <span class="vector-dot"></span>
                  </div>
                  <div class="flight-class-badge">${f.cabinClass}</div>
                </div>

                <div class="route-point arrival-point">
                  <div class="point-time">${f.arrivalTime}</div>
                  <div class="point-date">${f.arrivalDate}</div>
                  <div class="point-airport">${f.arrivalAirport}</div>
                  ${f.arrivalTerminal ? `<div class="terminal-chip">${t.terminal} ${f.arrivalTerminal}</div>` : ""}
                </div>
              </div>

              <div class="flight-ticket-meta">
                ${f.eTicketNumber ? `<div class="meta-block"><span class="m-lbl">${t.eTicket}:</span> <span class="m-val">${f.eTicketNumber}</span></div>` : ""}
                ${f.baggageAllowance ? `<div class="meta-block"><span class="m-lbl">${t.baggage}:</span> <span class="m-val">🧳 ${f.baggageAllowance}</span></div>` : ""}
                ${f.seatAssignment ? `<div class="meta-block"><span class="m-lbl">${t.seat}:</span> <span class="m-val">💺 ${f.seatAssignment}</span></div>` : ""}
                ${f.gate ? `<div class="meta-block"><span class="m-lbl">${t.gate}:</span> <span class="m-val">${f.gate}</span></div>` : ""}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // Build Hotel Vouchers HTML
  let hotelsHtml = "";
  if (includeHotels && data.hotels && data.hotels.length > 0) {
    hotelsHtml = `
      <div class="section-container avoid-break">
        <div class="section-header-bar">
          <div class="section-icon-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 21h18M3 7v14M21 7v14M6 11h2M6 15h2M16 11h2M16 15h2M10 21V3h4v18"></path>
            </svg>
          </div>
          <div>
            <h2 class="section-title">${t.hotelSectionTitle}</h2>
            <div class="section-subtitle">${t.hotelSubtitle}</div>
          </div>
        </div>

        <div class="hotel-vouchers-grid">
          ${data.hotels
            .map(
              (h) => `
            <div class="hotel-card avoid-break">
              <div class="hotel-card-header">
                <div>
                  <div class="hotel-name-row">
                    <h3 class="hotel-name">${h.hotelName}</h3>
                    <div class="hotel-stars">${"★".repeat(h.starRating || 4)}</div>
                  </div>
                  <div class="hotel-address">📍 ${h.address}</div>
                </div>
                <div class="hotel-voucher-numbers">
                  <div class="badge-voucher">${t.voucherNumber}: <strong>${h.voucherNumber}</strong></div>
                  <div class="badge-conf">${t.hotelConfirmation}: <strong>${h.confirmationCode}</strong></div>
                </div>
              </div>

              <div class="hotel-stay-details-grid">
                <div class="stay-grid-box">
                  <div class="stay-lbl">${t.checkIn}</div>
                  <div class="stay-val">${h.checkInDate}</div>
                  ${h.checkInTime ? `<div class="stay-sub">${h.checkInTime}</div>` : ""}
                </div>
                <div class="stay-grid-box">
                  <div class="stay-lbl">${t.checkOut}</div>
                  <div class="stay-val">${h.checkOutDate}</div>
                  ${h.checkOutTime ? `<div class="stay-sub">${h.checkOutTime}</div>` : ""}
                </div>
                <div class="stay-grid-box">
                  <div class="stay-lbl">${t.duration}</div>
                  <div class="stay-val">${num(h.nights)} ${t.nights}</div>
                  <div class="stay-sub">${num(h.numberOfRooms)} ${t.rooms}</div>
                </div>
                <div class="stay-grid-box">
                  <div class="stay-lbl">${t.roomType}</div>
                  <div class="stay-val">${h.roomType}</div>
                  <div class="stay-sub">🍽️ ${h.mealBasis}</div>
                </div>
              </div>

              ${
                h.inclusions && h.inclusions.length > 0
                  ? `
                <div class="hotel-inclusions">
                  <div class="inclusions-title">${t.inclusions}:</div>
                  <div class="inclusions-pills">
                    ${h.inclusions.map((inc) => `<span class="inclusion-pill">✓ ${inc}</span>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }

              ${
                h.specialInstructions
                  ? `
                <div class="hotel-instruction-note">
                  <strong>${t.specialInstructions}:</strong> ${h.specialInstructions}
                </div>
              `
                  : ""
              }
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  // Build Payment Receipt & Statement HTML
  let receiptHtml = "";
  if (includePaymentReceipt && data.paymentReceipt) {
    const rc = data.paymentReceipt;
    const isPaid = rc.paymentStatus === "Paid in Full";

    receiptHtml = `
      <div class="section-container avoid-break">
        <div class="section-header-bar">
          <div class="section-icon-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <div>
            <h2 class="section-title">${t.receiptSectionTitle}</h2>
            <div class="section-subtitle">${t.receiptSubtitle}</div>
          </div>
        </div>

        <div class="receipt-card avoid-break">
          <div class="receipt-meta-header">
            <div class="receipt-meta-col">
              <div><strong>${t.receiptNumber}:</strong> <span class="font-mono">${rc.receiptNumber}</span></div>
              <div><strong>${t.paymentDate}:</strong> ${rc.invoiceDate}</div>
              ${rc.taxRegistrationNumber ? `<div><strong>${t.taxId}:</strong> ${rc.taxRegistrationNumber}</div>` : ""}
            </div>
            <div class="receipt-meta-col text-right">
              <div><strong>${t.paymentMethod}:</strong> ${rc.paymentMethod}</div>
              <div><strong>${t.transactionId}:</strong> <span class="font-mono">${rc.transactionId}</span></div>
              <div class="payment-badge-wrap">
                <span class="payment-status-badge ${isPaid ? "badge-paid" : "badge-due"}">
                  ${isPaid ? t.paidInFull : t.paymentDue}
                </span>
              </div>
            </div>
          </div>

          <table class="receipt-table">
            <thead>
              <tr>
                <th class="th-desc">${t.serviceDescription}</th>
                <th class="th-qty">${t.qty}</th>
                <th class="th-rate">${t.rate}</th>
                <th class="th-total">${t.amount}</th>
              </tr>
            </thead>
            <tbody>
              ${rc.items
                .map(
                  (item) => `
                <tr>
                  <td class="td-desc">${item.description}</td>
                  <td class="td-qty">${num(item.quantity)}</td>
                  <td class="td-rate">${rc.currencySymbol} ${num(item.unitPrice.toFixed(2))}</td>
                  <td class="td-total">${rc.currencySymbol} ${num(item.total.toFixed(2))}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="receipt-totals-container">
            <div class="receipt-notes-col">
              ${rc.notes ? `<p class="receipt-note-text"><em>${rc.notes}</em></p>` : ""}
            </div>
            <div class="receipt-summary-col">
              <div class="summary-line">
                <span>${t.subtotal}:</span>
                <span>${rc.currencySymbol} ${num(rc.subtotal.toFixed(2))}</span>
              </div>
              <div class="summary-line">
                <span>${t.taxVat}:</span>
                <span>${rc.currencySymbol} ${num(rc.taxesAndFees.toFixed(2))}</span>
              </div>
              ${
                rc.discount && rc.discount > 0
                  ? `
                <div class="summary-line text-success">
                  <span>${t.discount}:</span>
                  <span>-${rc.currencySymbol} ${num(rc.discount.toFixed(2))}</span>
                </div>
              `
                  : ""
              }
              <div class="summary-line grand-total-line">
                <span>${t.totalAmount}:</span>
                <span class="grand-total-amount">${rc.currencySymbol} ${num(rc.totalAmount.toFixed(2))}</span>
              </div>
              <div class="summary-line amount-paid-line">
                <span>${t.amountPaid}:</span>
                <span>${rc.currencySymbol} ${num(rc.amountPaid.toFixed(2))}</span>
              </div>
              ${
                rc.balanceDue > 0
                  ? `
                <div class="summary-line balance-due-line">
                  <span>${t.balanceDue}:</span>
                  <span class="text-danger font-bold">${rc.currencySymbol} ${num(rc.balanceDue.toFixed(2))}</span>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Build Terms & Verification Stamp HTML
  let footerVerificationHtml = `
    <div class="verification-and-stamp-section avoid-break">
      <div class="stamp-box">
        <div class="stamp-title">${t.officialSeal}</div>
        <div class="stamp-display-area">
          ${
            resolvedStamp
              ? `<img src="${resolvedStamp}" class="stamp-image" alt="Official Seal" />`
              : `
              <div class="digital-seal-placeholder">
                <div class="seal-inner-circle">
                  <span>★ OFFICIAL SEAL ★</span>
                  <div class="seal-agency-name">${data.agency.agencyName}</div>
                  <span class="seal-verified">VERIFIED</span>
                </div>
              </div>
            `
          }
        </div>
        <div class="signatory-name">${data.agency.signatoryName || "Authorized Management"}</div>
        <div class="signatory-title">${data.agency.signatoryTitle || "Operations & Reservations Lead"}</div>
      </div>

      <div class="emergency-callout-card">
        <div class="emergency-badge-header">
          <span class="emergency-pulse-icon">🚨</span>
          <strong>${t.emergencyCardTitle}</strong>
        </div>
        <div class="emergency-hotline-highlight">
          ${data.agency.emergencyHotline}
        </div>
        <p class="emergency-card-desc">
          ${t.emergencyCardBody}
        </p>
        <div class="emergency-secondary-contacts">
          ${data.agency.emergencyEmail ? `<span>✉️ ${data.agency.emergencyEmail}</span>` : ""}
          ${data.agency.website ? `<span>🌐 ${data.agency.website}</span>` : ""}
        </div>
      </div>
    </div>

    ${
      includeTerms &&
      data.termsAndConditions &&
      data.termsAndConditions.length > 0
        ? `
      <div class="terms-card avoid-break">
        <div class="terms-title">${t.termsNotice}</div>
        <ul class="terms-list">
          ${data.termsAndConditions.map((term) => `<li>${term}</li>`).join("")}
        </ul>
      </div>
    `
        : ""
    }

    <div class="legal-disclaimer-footer avoid-break">
      <p>${t.disclaimer}</p>
      <div class="footer-meta-line">
        <span>${data.agency.agencyName}</span>
        ${data.agency.licenseNumber ? `<span>• ${t.licenseNo}: ${data.agency.licenseNumber}</span>` : ""}
        <span>• ${t.issueDate}: ${data.issueDate}</span>
      </div>
    </div>
  `;

  // Full HTML Assembly
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.agency.agencyName} - Itinerary ${data.bookingReference}</title>
  
  <!-- High-fidelity WebFonts supporting English and Bengali with Zero Font Clipping -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    /* ========================================================================
       RESET & ROOT VARIABLES
       ======================================================================== */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-light: #64748b;
      --border-color: #e2e8f0;
      --bg-card: #f8fafc;
      --bg-white: #ffffff;
      --success: #16a34a;
      --danger: #dc2626;
      --warning: #d97706;
    }

    /* ========================================================================
       TYPOGRAPHY WITH ZERO FONT CLIPPING GUARANTEE
       Special line-height and vertical padding for Bengali diacritics & conjuncts
       ======================================================================== */
    body, html {
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.65 !important;
      color: var(--text-main);
      background-color: #ffffff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      overflow-x: hidden;
    }

    /* Prevent ascenders & descenders clipping */
    h1, h2, h3, h4, h5, h6, p, span, td, th, div, label {
      line-height: 1.6 !important;
      overflow: visible !important;
    }

    h1, h2, h3 {
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Plus Jakarta Sans', sans-serif;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35 !important;
      padding: 2px 0;
    }

    p {
      margin-bottom: 4px;
    }

    .font-mono {
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 0.5px;
    }

    /* ========================================================================
       PAGE & PRINT SETUP
       ======================================================================== */
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ========================================================================
       WATERMARK LAYER
       ======================================================================== */
    ${
      showWatermark
        ? `
      .watermark-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 0;
      }
      .watermark-text {
        font-size: 64px;
        font-weight: 800;
        color: rgba(15, 23, 42, ${watermarkOpacity});
        text-transform: uppercase;
        transform: rotate(-35deg);
        letter-spacing: 8px;
        user-select: none;
        text-align: center;
        max-width: 90%;
        line-height: 1.3 !important;
      }
      .watermark-image {
        max-width: 50%;
        max-height: 50%;
        opacity: ${watermarkOpacity};
        filter: grayscale(100%);
        transform: rotate(-25deg);
        user-select: none;
      }
    `
        : ""
    }

    /* ========================================================================
       DOCUMENT CONTAINER
       ======================================================================== */
    .document-wrapper {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
    }

    /* ========================================================================
       AGENCY BRANDED HEADER
       ======================================================================== */
    .agency-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 14px;
      margin-bottom: 16px;
    }

    .agency-identity-left {
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: 58%;
    }

    .agency-logo-img {
      width: 72px;
      height: 72px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid var(--border-color);
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }

    .agency-logo-placeholder {
      width: 68px;
      height: 68px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 800;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    .agency-name-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 2px;
      letter-spacing: -0.3px;
    }

    .official-doc-title-chip {
      font-size: 11px;
      font-weight: 700;
      color: var(--secondary);
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .agency-tagline {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .agency-reg-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      color: var(--primary);
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .agency-contact-right {
      text-align: right;
      max-width: 40%;
    }

    .emergency-hotline-badge {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 8px;
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.2);
    }

    .contact-item {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* ========================================================================
       TRIP HIGHLIGHT HERO CARD
       ======================================================================== */
    .trip-overview-hero {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border: 1px solid var(--border-color);
      border-left: 5px solid var(--primary);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .hero-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 8px;
    }

    .hero-trip-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--primary);
    }

    .hero-booking-badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }

    .hero-details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .hero-grid-cell {
      display: flex;
      flex-direction: column;
    }

    .grid-cell-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-light);
      margin-bottom: 2px;
    }

    .grid-cell-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }

    /* ========================================================================
       SECTIONS HEADINGS
       ======================================================================== */
    .section-container {
      margin-bottom: 22px;
    }

    .section-header-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }

    .section-icon-circle {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .section-subtitle {
      font-size: 11px;
      color: var(--text-light);
    }

    /* ========================================================================
       ITINERARY TIMELINE
       ======================================================================== */
    .timeline-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .timeline-day-card {
      display: flex;
      gap: 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 14px;
    }

    .day-badge-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 68px;
    }

    .day-badge {
      background: var(--primary);
      color: #ffffff;
      border-radius: 8px;
      width: 58px;
      text-align: center;
      padding: 6px 4px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }

    .day-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 600;
      opacity: 0.85;
    }

    .day-number {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.1 !important;
    }

    .day-date-chip {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 6px;
      text-align: center;
    }

    .day-content-col {
      flex: 1;
    }

    .day-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .day-summary {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .schedule-table {
      margin-bottom: 8px;
      border-left: 2px solid #cbd5e1;
      padding-left: 10px;
    }

    .schedule-row {
      display: flex;
      gap: 10px;
      margin-bottom: 6px;
      align-items: baseline;
    }

    .schedule-time {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      min-width: 65px;
    }

    .schedule-body {
      flex: 1;
    }

    .schedule-activity {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
    }

    .schedule-location {
      font-size: 11px;
      color: var(--text-muted);
    }

    .schedule-notes {
      font-size: 10px;
      color: var(--text-light);
      font-style: italic;
    }

    .day-meta-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 6px;
      border-top: 1px dashed var(--border-color);
      font-size: 11px;
    }

    .day-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-label {
      font-weight: 600;
      color: var(--text-muted);
    }

    .meta-value {
      font-weight: 600;
      color: var(--text-main);
    }

    .meta-pills {
      display: flex;
      gap: 4px;
    }

    .pill {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .pill-success {
      background: #dcfce7;
      color: #15803d;
    }

    .guide-notes-box {
      margin-top: 6px;
      padding: 6px 10px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 3px solid #f59e0b;
      border-radius: 6px;
      font-size: 11px;
      color: #92400e;
    }

    /* ========================================================================
       FLIGHT CONFIRMATIONS
       ======================================================================== */
    .flight-cards-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .flight-ticket-card {
      background: var(--bg-white);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
      overflow: hidden;
    }

    .flight-ticket-header {
      background: #f1f5f9;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
    }

    .airline-name {
      font-weight: 700;
      font-size: 13px;
      color: var(--primary);
    }

    .flight-no-chip {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 6px;
    }

    .pnr-title {
      font-size: 11px;
      color: var(--text-muted);
    }

    .pnr-code {
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      color: #1e1b4b;
      background: #e0e7ff;
      padding: 2px 6px;
      border-radius: 4px;
      margin: 0 6px;
    }

    .status-badge-confirmed {
      background: #dcfce7;
      color: #166534;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
    }

    .flight-route-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
    }

    .route-point {
      flex: 1;
    }

    .arrival-point {
      text-align: right;
    }

    .point-time {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1.2 !important;
    }

    .point-date {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .point-airport {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      margin-top: 2px;
    }

    .terminal-chip {
      display: inline-block;
      font-size: 10px;
      background: #f1f5f9;
      color: var(--text-muted);
      padding: 1px 6px;
      border-radius: 4px;
      margin-top: 2px;
    }

    .route-middle-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 16px;
    }

    .flight-duration {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-light);
      margin-bottom: 2px;
    }

    .route-line-vector {
      display: flex;
      align-items: center;
      width: 100px;
      color: var(--primary);
    }

    .vector-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
    }

    .vector-line {
      flex: 1;
      height: 1px;
      background: #cbd5e1;
    }

    .vector-plane {
      font-size: 14px;
      margin: 0 4px;
    }

    .flight-class-badge {
      font-size: 10px;
      font-weight: 600;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      padding: 1px 8px;
      border-radius: 12px;
      color: var(--text-muted);
      margin-top: 3px;
    }

    .flight-ticket-meta {
      background: #fafaf9;
      border-top: 1px dashed var(--border-color);
      padding: 6px 16px;
      display: flex;
      gap: 16px;
      font-size: 11px;
    }

    .m-lbl {
      color: var(--text-light);
      font-weight: 500;
    }

    .m-val {
      color: var(--text-main);
      font-weight: 600;
    }

    /* ========================================================================
       HOTEL VOUCHERS
       ======================================================================== */
    .hotel-vouchers-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .hotel-card {
      background: var(--bg-white);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }

    .hotel-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
    }

    .hotel-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hotel-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .hotel-stars {
      color: #eab308;
      font-size: 13px;
    }

    .hotel-address {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .hotel-voucher-numbers {
      text-align: right;
    }

    .badge-voucher, .badge-conf {
      font-size: 11px;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .hotel-stay-details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .stay-lbl {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-light);
      text-transform: uppercase;
    }

    .stay-val {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }

    .stay-sub {
      font-size: 10px;
      color: var(--text-muted);
    }

    .hotel-inclusions {
      margin-bottom: 6px;
    }

    .inclusions-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .inclusions-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .inclusion-pill {
      font-size: 10px;
      background: #eff6ff;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .hotel-instruction-note {
      font-size: 11px;
      color: #475569;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 6px 10px;
      border-radius: 4px;
      margin-top: 6px;
    }

    /* ========================================================================
       PAYMENT RECEIPT & INVOICE TABLE
       ======================================================================== */
    .receipt-card {
      background: var(--bg-white);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px 14px;
    }

    .receipt-meta-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 11px;
      line-height: 1.6;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
    }

    .text-right {
      text-align: right;
    }

    .payment-status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      margin-top: 4px;
    }

    .badge-paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }

    .badge-due {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }

    .receipt-table th {
      background: #f8fafc;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 2px solid var(--border-color);
    }

    .receipt-table td {
      padding: 7px 8px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .th-desc, .td-desc { text-align: left; }
    .th-qty, .td-qty { text-align: center; width: 50px; }
    .th-rate, .td-rate { text-align: right; width: 110px; }
    .th-total, .td-total { text-align: right; width: 120px; font-weight: 600; }

    .receipt-totals-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 6px;
    }

    .receipt-notes-col {
      max-width: 50%;
      font-size: 11px;
      color: var(--text-light);
    }

    .receipt-summary-col {
      width: 250px;
      font-size: 12px;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      color: var(--text-muted);
    }

    .grand-total-line {
      border-top: 2px solid var(--border-color);
      border-bottom: 2px solid var(--border-color);
      padding: 6px 0;
      font-size: 14px;
      font-weight: 800;
      color: var(--primary);
      margin-top: 4px;
      margin-bottom: 4px;
    }

    .amount-paid-line {
      font-weight: 700;
      color: #166534;
    }

    .balance-due-line {
      font-weight: 700;
      color: #dc2626;
      background: #fef2f2;
      padding: 4px 6px;
      border-radius: 4px;
    }

    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }
    .font-bold { font-weight: 700; }

    /* ========================================================================
       VERIFICATION, STAMP & EMERGENCY FOOTER
       ======================================================================== */
    .verification-and-stamp-section {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 18px;
      margin-bottom: 16px;
    }

    .stamp-box {
      flex: 1;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      background: #fafaf9;
    }

    .stamp-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .stamp-display-area {
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
    }

    .stamp-image {
      max-height: 85px;
      max-width: 140px;
      object-fit: contain;
    }

    .digital-seal-placeholder {
      width: 80px;
      height: 80px;
      border: 2px dashed #94a3b8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 8px;
      text-align: center;
      padding: 4px;
    }

    .seal-inner-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .seal-agency-name {
      font-weight: 800;
      font-size: 7px;
      color: var(--primary);
    }

    .seal-verified {
      font-size: 7px;
      color: #16a34a;
      font-weight: 700;
    }

    .signatory-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }

    .signatory-title {
      font-size: 10px;
      color: var(--text-light);
    }

    .emergency-callout-card {
      flex: 1.3;
      background: linear-gradient(135deg, #fef2f2, #fff1f2);
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 12px 14px;
    }

    .emergency-badge-header {
      color: #b91c1c;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .emergency-hotline-highlight {
      font-size: 17px;
      font-weight: 800;
      color: #b91c1c;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .emergency-card-desc {
      font-size: 10.5px;
      color: #7f1d1d;
      margin-bottom: 6px;
      line-height: 1.5 !important;
    }

    .emergency-secondary-contacts {
      display: flex;
      gap: 12px;
      font-size: 10px;
      color: #991b1b;
      font-weight: 600;
    }

    /* ========================================================================
       TERMS & CONDITIONS
       ======================================================================== */
    .terms-card {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 14px;
      background: #fafaf9;
      margin-bottom: 12px;
    }

    .terms-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .terms-list {
      margin-left: 18px;
      font-size: 10px;
      color: var(--text-light);
      line-height: 1.5 !important;
    }

    .terms-list li {
      margin-bottom: 3px;
    }

    /* ========================================================================
       LEGAL DISCLAIMER & FOOTER
       ======================================================================== */
    .legal-disclaimer-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
      font-size: 9.5px;
      color: var(--text-light);
      text-align: center;
      line-height: 1.5 !important;
    }

    .footer-meta-line {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 4px;
      font-weight: 600;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  ${
    showWatermark
      ? `
    <div class="watermark-container">
      ${
        resolvedWatermark
          ? `<img src="${resolvedWatermark}" class="watermark-image" alt="Watermark" />`
          : `<div class="watermark-text">${watermarkText}</div>`
      }
    </div>
  `
      : ""
  }

  <div class="document-wrapper">
    <!-- Agency Branded Header -->
    <header class="agency-header avoid-break">
      <div class="agency-identity-left">
        ${
          resolvedLogo
            ? `<img src="${resolvedLogo}" class="agency-logo-img" alt="${data.agency.agencyName}" />`
            : `<div class="agency-logo-placeholder">${data.agency.agencyName.charAt(0)}</div>`
        }
        <div>
          <h1 class="agency-name-title">${data.agency.agencyName}</h1>
          <div class="official-doc-title-chip">${t.officialDocTitle}</div>
          ${data.agency.tagline ? `<div class="agency-tagline">${data.agency.tagline}</div>` : ""}
          <div class="agency-reg-badge">${t.licensedAgency} • ${data.agency.licenseNumber || "Reg #TRV-88219"}</div>
        </div>
      </div>

      <div class="agency-contact-right">
        <div class="emergency-hotline-badge">
          🚨 ${t.emergencyHelpline}:<br/>${data.agency.emergencyHotline}
        </div>
        ${data.agency.address ? `<div class="contact-item">🏢 ${data.agency.address}</div>` : ""}
        ${data.agency.supportEmail ? `<div class="contact-item">✉️ ${data.agency.supportEmail}</div>` : ""}
        ${data.agency.website ? `<div class="contact-item">🌐 ${data.agency.website}</div>` : ""}
      </div>
    </header>

    <!-- Trip Highlight Hero Card -->
    <div class="trip-overview-hero avoid-break">
      <div class="hero-top-row">
        <span class="hero-trip-title">🌴 ${data.tripTitle}</span>
        <span class="hero-booking-badge">${t.bookingReference}: ${data.bookingReference}</span>
      </div>
      <div class="hero-details-grid">
        <div class="hero-grid-cell">
          <span class="grid-cell-label">${t.leadTraveler}</span>
          <span class="grid-cell-val">${data.traveler.leadPassengerName}</span>
        </div>
        <div class="hero-grid-cell">
          <span class="grid-cell-label">${t.destination}</span>
          <span class="grid-cell-val">📍 ${data.destination}</span>
        </div>
        <div class="hero-grid-cell">
          <span class="grid-cell-label">${t.dates}</span>
          <span class="grid-cell-val">${data.startDate} - ${data.endDate}</span>
        </div>
        <div class="hero-grid-cell">
          <span class="grid-cell-label">${t.guests}</span>
          <span class="grid-cell-val">👥 ${num(data.traveler.numberOfGuests)} ${t.personUnit}</span>
        </div>
      </div>
    </div>

    <!-- Main Sections -->
    ${itineraryHtml}
    ${flightsHtml}
    ${hotelsHtml}
    ${receiptHtml}

    <!-- Verification, Stamp & Support Footer -->
    ${footerVerificationHtml}
  </div>
</body>
</html>`;
}

// ============================================================================
// EXPORT & SHARING METHODS
// ============================================================================

/**
 * Generates the PDF file using expo-print
 */
export async function generateItineraryPdf(
  data: ItineraryDocumentData,
  options: DocumentRenderOptions = {},
): Promise<{ uri: string; numberOfPages: number }> {
  const html = await generateItineraryHtml(data, options);
  const result = await Print.printToFileAsync({
    html,
    base64: false,
    margins: {
      left: 20,
      top: 20,
      right: 20,
      bottom: 20,
    },
  });

  return {
    uri: result.uri,
    numberOfPages: result.numberOfPages,
  };
}

/**
 * Triggers native wireless printing dialog via expo-print
 */
export async function printItineraryPdf(
  data: ItineraryDocumentData,
  options: DocumentRenderOptions = {},
): Promise<void> {
  const html = await generateItineraryHtml(data, options);
  await Print.printAsync({ html });
}

/**
 * Shares the generated PDF file using expo-sharing (AirDrop, WhatsApp, Mail, Telegram)
 */
export async function shareItineraryPdf(
  data: ItineraryDocumentData,
  options: DocumentRenderOptions = {},
): Promise<void> {
  const { uri } = await generateItineraryPdf(data, options);
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("PDF sharing is not available on this platform or device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `${data.agency.agencyName} - Itinerary ${data.bookingReference}`,
    UTI: "com.adobe.pdf",
  });
}

/**
 * Formats WhatsApp text message and opens WhatsApp with PDF attachment sharing
 */
export async function shareItineraryViaWhatsApp(
  data: ItineraryDocumentData,
  phoneNumber?: string,
  options: DocumentRenderOptions = {},
): Promise<void> {
  const { uri } = await generateItineraryPdf(data, options);
  const lang = options.language || "en";
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, "") : "";

  const message =
    lang === "bn"
      ? `প্রিয় ${data.traveler.leadPassengerName},\nআপনার "${data.tripTitle}" ট্যুরের অফিশিয়াল ভ্রমণ বিবরণী, টিকিট এবং ভাউচার তৈরি করা হয়েছে।\n\n📌 বুকিং রেফারেন্স: ${data.bookingReference}\n📍 গন্তব্য: ${data.destination}\n📅 তারিখ: ${data.startDate} হতে ${data.endDate}\n🚨 ২৪/৭ জরুরি হটলাইন: ${data.agency.emergencyHotline}\n\nধন্যবাদান্তে,\n${data.agency.agencyName}`
      : `Dear ${data.traveler.leadPassengerName},\nHere is your official travel itinerary and vouchers for "${data.tripTitle}".\n\n📌 Booking Ref: ${data.bookingReference}\n📍 Destination: ${data.destination}\n📅 Dates: ${data.startDate} to ${data.endDate}\n🚨 24/7 Hotline: ${data.agency.emergencyHotline}\n\nWarm regards,\n${data.agency.agencyName}`;

  if (cleanPhone) {
    const waUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      }
    } catch {
      // Fall back to sharing sheet
    }
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `WhatsApp Itinerary - ${data.bookingReference}`,
      UTI: "com.adobe.pdf",
    });
  }
}

// ============================================================================
// SAMPLE & DEFAULT DATA GENERATOR
// ============================================================================

/**
 * Creates high-fidelity sample data for instant document preview or fallback.
 */
export function createSampleItineraryData(
  partial?: Partial<ItineraryDocumentData>,
): ItineraryDocumentData {
  const baseAgency: AgencyBranding = {
    agencyName: "Global Travels Ltd.",
    tagline: "Ultra Luxury Bespoke Travel Solutions",
    emergencyHotline: "+880 1800-746766 (24/7)",
    emergencyEmail: "emergency@globaltravels.com",
    supportPhone: "+880 2 9882190",
    supportEmail: "reservations@globaltravels.com",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    website: "www.globaltravels.com",
    licenseNumber: "Govt. Reg. #TRV-88219 / IATA: 91-2384",
    primaryColor: "#1E3A8A",
    secondaryColor: "#0D9488",
    signatoryName: "M. Anisur Rahman",
    signatoryTitle: "Director of Travel Operations",
    showWatermark: true,
    watermarkText: "GLOBAL TRAVELS OFFICIAL",
    watermarkOpacity: 0.06,
  };

  const defaultData: ItineraryDocumentData = {
    bookingReference: "GTL-BK-99214",
    tripTitle: "Bali & Nusa Penida Luxury Island Getaway",
    destination: "Bali, Indonesia",
    startDate: "2026-12-10",
    endDate: "2026-12-15",
    issueDate: "2026-11-06",
    traveler: {
      leadPassengerName: "Dr. Farhana Ahmed & Family",
      contactEmail: "farhana.ahmed@example.com",
      contactPhone: "+880 1711-234567",
      numberOfGuests: 4,
      specialRequests: "Sea-facing adjoining rooms, Halal breakfast meal plan",
    },
    agency: baseAgency,
    itineraryDays: [
      {
        dayNumber: 1,
        date: "2026-12-10",
        title: "VIP Arrival at Denpasar & Private Villa Check-In",
        summary:
          "Arrival at Ngurah Rai International Airport with VIP Meet & Greet assistance, flower garland welcome, and private transfer to Seminyak luxury villa.",
        schedule: [
          {
            time: "11:45 AM",
            activity: "Flight SQ 447 touchdown at DPS Airport",
            location: "Ngurah Rai Intl Airport (DPS)",
            notes: "VIP Fast Track immigration clearance included",
          },
          {
            time: "01:30 PM",
            activity: "Private Luxury Alphard transfer to Villa",
            location: "The Mulia Resort, Nusa Dua",
          },
          {
            time: "03:00 PM",
            activity: "Check-in & Welcome Cocktail with fresh tropical fruit platter",
            location: "Royal Ocean View Suite",
          },
          {
            time: "07:30 PM",
            activity: "Welcome Seafood Dinner on Jimbaran Beach with sunset acoustic music",
            location: "Jimbaran Bay Seafood Pavilion",
          },
        ],
        mealPlan: { breakfast: false, lunch: true, dinner: true },
        accommodationName: "The Mulia Resort & Villas, Nusa Dua",
        transportation: "Toyota Alphard Executive Van with Private Chauffeur",
        guideNotes: "Chauffeur Mr. Wayan will carry a placard with Dr. Farhana Ahmed's name.",
      },
      {
        dayNumber: 2,
        date: "2026-12-11",
        title: "Ubud Cultural Wonders, Sacred Monkey Forest & Tegalalang Rice Terrace",
        summary:
          "Explore the spiritual heart of Bali with visits to artisan wood-carving villages, Ubud Palace, scenic rice terraces, and giant jungle swing.",
        schedule: [
          {
            time: "08:30 AM",
            activity: "Buffet Breakfast at Soleil Restaurant",
            location: "The Mulia Resort",
          },
          {
            time: "09:30 AM",
            activity: "Scenic drive to Ubud & Monkey Forest Sanctuary",
            location: "Padangtegal, Ubud",
          },
          {
            time: "01:00 PM",
            activity: "Organic Indonesian Feast overlooking the valley",
            location: "Bebek Bengil (Dirty Duck Diner), Ubud",
          },
          {
            time: "03:30 PM",
            activity: "Tegalalang Rice Terrace walk & Bali Giant Swing Experience",
            location: "Tegalalang, Gianyar",
          },
          {
            time: "06:30 PM",
            activity: "Traditional Barong & Fire Dance performance",
            location: "Batubulan Village",
          },
        ],
        mealPlan: { breakfast: true, lunch: true, dinner: true },
        accommodationName: "The Mulia Resort & Villas, Nusa Dua",
        transportation: "Private Chauffeur-driven AC Van",
        guideNotes: "Wear comfortable walking shoes; sarong will be provided for temple visits.",
      },
      {
        dayNumber: 3,
        date: "2026-12-12",
        title: "Nusa Penida Private Speedboat Excursion & Kelingking T-Rex Cliff",
        summary:
          "Full day offshore island tour to Nusa Penida. Visit iconic Kelingking cliff, Broken Beach, Angel's Billabong, and crystal clear snorkeling bays.",
        schedule: [
          {
            time: "07:00 AM",
            activity: "Early departure to Sanur Harbor for Private Speedboat",
            location: "Sanur Pier",
          },
          {
            time: "09:00 AM",
            activity: "Arrival at Nusa Penida & 4x4 Jeep transfer to Kelingking Cliff",
            location: "Kelingking Beach viewpoint",
          },
          {
            time: "12:30 PM",
            activity: "Lunch at coastal cliffside restaurant",
            location: "Green Kubu Penida",
          },
          {
            time: "02:30 PM",
            activity: "Manta Ray snorkeling session & Angel's Billabong natural infinity pool",
            location: "Crystal Bay",
          },
          {
            time: "05:00 PM",
            activity: "Speedboat return to mainland Bali & Villa relaxation",
            location: "Sanur to Nusa Dua",
          },
        ],
        mealPlan: { breakfast: true, lunch: true, dinner: false },
        accommodationName: "The Mulia Resort & Villas, Nusa Dua",
        transportation: "High-Speed Boat + 4x4 Land Cruiser in Nusa Penida",
      },
    ],
    flights: [
      {
        airline: "Singapore Airlines",
        airlineCode: "SQ",
        flightNumber: "SQ 447",
        pnr: "W9KZ7Q",
        eTicketNumber: "618-9283746152-01",
        cabinClass: "Business",
        departureAirport: "DAC - Hazrat Shahjalal Intl, Dhaka",
        departureTerminal: "Terminal 2",
        departureDate: "2026-12-10",
        departureTime: "06:15 AM",
        arrivalAirport: "SIN - Changi Airport, Singapore",
        arrivalTerminal: "Terminal 3",
        arrivalDate: "2026-12-10",
        arrivalTime: "12:30 PM",
        duration: "4h 15m",
        baggageAllowance: "40 kg Check-in + 10 kg Cabin",
        seatAssignment: "11A, 11B, 12A, 12B",
        mealType: "Halal Moslem Meal (MOML)",
        status: "Confirmed",
      },
      {
        airline: "Singapore Airlines",
        airlineCode: "SQ",
        flightNumber: "SQ 944",
        pnr: "W9KZ7Q",
        eTicketNumber: "618-9283746152-02",
        cabinClass: "Business",
        departureAirport: "SIN - Changi Airport, Singapore",
        departureTerminal: "Terminal 2",
        departureDate: "2026-12-10",
        departureTime: "04:20 PM",
        arrivalAirport: "DPS - Ngurah Rai Intl, Bali",
        arrivalTerminal: "International",
        arrivalDate: "2026-12-10",
        arrivalTime: "07:05 PM",
        duration: "2h 45m",
        baggageAllowance: "40 kg Check-in",
        seatAssignment: "14A, 14B, 15A, 15B",
        status: "Confirmed",
      },
    ],
    hotels: [
      {
        hotelName: "The Mulia Resort & Luxury Villas",
        starRating: 5,
        voucherNumber: "MULIA-VCH-99201",
        confirmationCode: "MUL-RES-881920",
        address: "Jl. Raya Nusa Dua Selatan Kawasan Sawangan, Nusa Dua 80363 Bali",
        phone: "+62 361 3017777",
        checkInDate: "2026-12-10",
        checkInTime: "15:00",
        checkOutDate: "2026-12-15",
        checkOutTime: "12:00",
        nights: 5,
        roomType: "Royal Ocean View Suite with Plunge Pool (2 Adjoining Suites)",
        numberOfRooms: 2,
        guestNames: ["Dr. Farhana Ahmed", "Tanvir Ahmed", "Aryan Ahmed", "Ayla Ahmed"],
        mealBasis: "Buffet Breakfast Included (CP)",
        inclusions: [
          "Daily Champagne & Caviar Breakfast at Soleil",
          "Dedicated 24-hour Personal Butler Service",
          "Complimentary Return Luxury Airport Chauffeur Transfers",
          "Daily Afternoon High-Tea & Evening Cocktails",
          "Unlimited High-Speed Wi-Fi & Hydrotherapy Pool Access",
        ],
        specialInstructions:
          "Late check-in reconfirmed. Connecting suites requested and guaranteed by resort front desk.",
      },
    ],
    paymentReceipt: {
      receiptNumber: "RCPT-2026-08812",
      invoiceDate: "2026-11-06",
      paymentMethod: "bKash Merchant & Bank Wire Transfer",
      transactionId: "TXN-BK-9918237461",
      paymentStatus: "Paid in Full",
      currency: "USD",
      currencySymbol: "$",
      items: [
        {
          description: "5 Nights Luxury Villa Stay at The Mulia Resort (2 Suites)",
          quantity: 1,
          unitPrice: 2800.0,
          total: 2800.0,
        },
        {
          description: "Singapore Airlines Business Class Airfare (4 Passengers)",
          quantity: 4,
          unitPrice: 950.0,
          total: 3800.0,
        },
        {
          description: "Exclusive Nusa Penida Speedboat & Private Guide Package",
          quantity: 1,
          unitPrice: 550.0,
          total: 550.0,
        },
        {
          description: "VIP Airport Fast Track & Luxury Alphard Chauffeur Services",
          quantity: 1,
          unitPrice: 350.0,
          total: 350.0,
        },
      ],
      subtotal: 7500.0,
      taxesAndFees: 375.0,
      discount: 375.0,
      totalAmount: 7500.0,
      amountPaid: 7500.0,
      balanceDue: 0.0,
      taxRegistrationNumber: "BIN: 001928374-0101",
      notes:
        "Full payment received with verified bank confirmation. All hotel vouchers and airline PNRs issued and reconfirmed.",
    },
    termsAndConditions: [
      "Passport must have a minimum validity of 6 months from the date of departure.",
      "Check-in baggage is limited to the allowance mentioned in the ticket; excess baggage fees apply at airline counters.",
      "Standard hotel check-in time is 15:00 hours, and check-out is 12:00 hours local time.",
      "Cancellations made within 7 days of departure are subject to standard airline and hotel non-refundable policies.",
      "For emergency modifications or re-routing during travel, please immediately call your designated 24/7 hotline.",
    ],
  };

  if (!partial) return defaultData;

  return {
    ...defaultData,
    ...partial,
    agency: {
      ...baseAgency,
      ...(partial.agency || {}),
    },
    traveler: {
      ...defaultData.traveler,
      ...(partial.traveler || {}),
    },
  };
}
