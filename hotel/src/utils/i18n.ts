/**
 * Internationalization (i18n) Helper - Shopno Jatra Hotel App
 * Supports English (en) and Bengali (bn).
 */

export type LanguageCode = "en" | "bn";

let currentLanguage: LanguageCode = "en";

export const translations = {
  en: {
    bookingStatusUpdated: "Booking status updated: {{status}}",
    paymentReceivedToast: "Payment completed for booking {{reference}}",
    statusConfirmed: "Confirmed",
    statusCheckedIn: "Checked In",
    statusCancelled: "Cancelled",
    statusPending: "Pending",
    statusUpcoming: "Upcoming",
    statusCheckedOut: "Checked Out",
    reservations: "Reservations",
  },
  bn: {
    bookingStatusUpdated: "বুকিং স্ট্যাটাস পরিবর্তিত হয়েছে: {{status}}",
    paymentReceivedToast: "বুকিং {{reference}} এর পেমেন্ট সম্পন্ন হয়েছে",
    statusConfirmed: "নিশ্চিত",
    statusCheckedIn: "চেক-ইন সম্পন্ন",
    statusCancelled: "বাতিল",
    statusPending: "অপেক্ষমান",
    statusUpcoming: "আসন্ন",
    statusCheckedOut: "চেক-আউট সম্পন্ন",
    reservations: "রিজার্ভেশন",
  },
} as const;

export function setLanguage(lang: LanguageCode): void {
  currentLanguage = lang;
}

export function getLanguage(): LanguageCode {
  return currentLanguage;
}

export function t(
  key: keyof (typeof translations)["en"],
  params?: Record<string, string | number>
): string {
  const dict = translations[currentLanguage] || translations.en;
  let text: string = (dict as any)[key] || (translations.en as any)[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`{{${paramKey}}}`, "g"), String(val));
    });
  }

  return text;
}

export default { t, setLanguage, getLanguage, translations };
