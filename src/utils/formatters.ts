import { CurrencyCode } from "../store/settingsStore";
import i18n from "../locales/i18n";

export const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export const HINDI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export const BENGALI_MONTHS_FULL = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

export const BENGALI_MONTHS_SHORT = [
  "জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে",
];

export const BENGALI_DAYS_FULL = [
  "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার",
];

export const BENGALI_DAYS_SHORT = [
  "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি",
];

export const ARABIC_MONTHS_FULL = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const ARABIC_DAYS_FULL = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

export const HINDI_MONTHS_FULL = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

export const HINDI_DAYS_FULL = [
  "रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार",
];

/**
 * Convert any string or number containing ASCII digits to Bengali digits (০-৯)
 */
export function toBengaliDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (digit) => BENGALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Convert any string or number containing ASCII digits to Eastern Arabic digits (٠-٩)
 */
export function toArabicDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (digit) => ARABIC_DIGITS[parseInt(digit, 10)]);
}

/**
 * Convert any string or number containing ASCII digits to Devanagari/Hindi digits (०-९)
 */
export function toHindiDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (digit) => HINDI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Convert non-ASCII digits (Bengali, Arabic, Hindi) back to standard ASCII digits (0-9)
 */
export function toLatinDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  let result = String(input);
  for (let i = 0; i < 10; i++) {
    result = result
      .replace(new RegExp(BENGALI_DIGITS[i], "g"), String(i))
      .replace(new RegExp(ARABIC_DIGITS[i], "g"), String(i))
      .replace(new RegExp(HINDI_DIGITS[i], "g"), String(i));
  }
  return result;
}

export interface NumberFormatOptions {
  locale?: string;
  useBengaliDigits?: boolean;
  useArabicDigits?: boolean;
  useHindiDigits?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Universal Centralized Number Formatter (Locale-Aware formatNumber)
 * Converts numbers with thousands separators and proper localized digits based on locale.
 */
export function formatNumber(
  value: number | string,
  options: NumberFormatOptions = {}
): string {
  const cleanInput = typeof value === "string" ? toLatinDigits(value).replace(/[^0-9.-]+/g, "") : value;
  const num = typeof cleanInput === "string" ? parseFloat(cleanInput) : cleanInput;
  if (num === null || num === undefined || isNaN(num)) {
    return typeof value === "string" ? value : "0";
  }

  const activeLang = (options.locale || i18n.language || "en").toLowerCase();
  const minDec = options.minimumFractionDigits ?? 0;
  const maxDec = options.maximumFractionDigits ?? 2;

  // Base formatted ASCII number with standard thousands separators: e.g. 1,234,567.89
  const baseFormatted = num.toLocaleString("en-US", {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });

  const isBengali = options.useBengaliDigits ?? activeLang.startsWith("bn");
  if (isBengali) {
    return toBengaliDigits(baseFormatted);
  }

  const isArabic = options.useArabicDigits ?? activeLang.startsWith("ar");
  if (isArabic) {
    return toArabicDigits(baseFormatted);
  }

  const isHindi = options.useHindiDigits ?? activeLang.startsWith("hi");
  if (isHindi) {
    return toHindiDigits(baseFormatted);
  }

  return baseFormatted;
}

/**
 * Backward compatibility alias for formatNumber
 */
export const formatLocalizedNumber = formatNumber;

export interface CurrencyFormatOptions extends NumberFormatOptions {
  showSymbol?: boolean;
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  INR: "₹",
  GBP: "£",
  SAR: "﷼",
};

/**
 * Universal Centralized Currency Formatter (Locale-Aware formatCurrency)
 */
export function formatCurrency(
  amount: number | string,
  currency: CurrencyCode | string = "BDT",
  options: CurrencyFormatOptions = {}
): string {
  const cleanInput = typeof amount === "string" ? toLatinDigits(amount).replace(/[^0-9.-]+/g, "") : amount;
  const num = typeof cleanInput === "string" ? parseFloat(cleanInput) : cleanInput;
  const symbol = (CURRENCY_SYMBOLS as any)[currency] || currency || "৳";

  if (num === null || num === undefined || isNaN(num)) {
    return options.showSymbol !== false ? `${symbol} 0` : "0";
  }

  const activeLang = (options.locale || i18n.language || "en").toLowerCase();
  const decimals = currency === "BDT" ? (num % 1 === 0 ? 0 : 2) : 2;

  const formattedNum = formatNumber(num, {
    ...options,
    locale: activeLang,
    minimumFractionDigits: options.minimumFractionDigits ?? decimals,
    maximumFractionDigits: options.maximumFractionDigits ?? decimals,
  });

  if (options.showSymbol === false) {
    return formattedNum;
  }

  // In Arabic RTL, currency symbol sits naturally on the trailing side
  if (activeLang.startsWith("ar")) {
    return `${formattedNum} ${symbol}`;
  }

  return `${symbol} ${formattedNum}`;
}

/**
 * Backward compatibility alias for formatCurrency
 */
export const formatLocalizedCurrency = formatCurrency;

export type DateFormatStyle = "short" | "medium" | "long" | "time" | "full" | Intl.DateTimeFormatOptions;

/**
 * Format date cleanly into English, Bengali, Arabic, or Hindi
 */
export function formatLocalizedDate(
  dateInput: Date | string | number,
  style: DateFormatStyle = "medium",
  locale?: string
): string {
  if (!dateInput) return "";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const activeLang = (locale || i18n.language || "en").toLowerCase();

  if (typeof style === "object" && style !== null) {
    try {
      const formatted = date.toLocaleDateString(activeLang, style);
      if (activeLang.startsWith("bn")) return toBengaliDigits(formatted);
      if (activeLang.startsWith("ar")) return toArabicDigits(formatted);
      if (activeLang.startsWith("hi")) return toHindiDigits(formatted);
      return formatted;
    } catch {
      // fallback to standard formatter
    }
  }
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const year = date.getFullYear();
  const weekdayIdx = date.getDay();

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const hour12 = hours % 12 || 12;

  if (activeLang.startsWith("bn")) {
    const ampm = hours >= 12 ? "বিকাল/রাত" : "সকাল";
    const bDay = toBengaliDigits(day);
    const bYear = toBengaliDigits(year);
    const bHour = toBengaliDigits(hour12);
    const bMin = toBengaliDigits(formattedMinutes);

    switch (style) {
      case "short":
        return `${bDay} ${BENGALI_MONTHS_SHORT[monthIdx]} ${bYear}`;
      case "medium":
        return `${bDay} ${BENGALI_MONTHS_FULL[monthIdx]}, ${bYear}`;
      case "long":
        return `${BENGALI_DAYS_FULL[weekdayIdx]}, ${bDay} ${BENGALI_MONTHS_FULL[monthIdx]} ${bYear}`;
      case "time":
        return `${bHour}:${bMin} ${ampm}`;
      case "full":
        return `${bDay} ${BENGALI_MONTHS_FULL[monthIdx]} ${bYear}, ${bHour}:${bMin} ${ampm}`;
      default:
        return `${bDay} ${BENGALI_MONTHS_SHORT[monthIdx]} ${bYear}`;
    }
  }

  if (activeLang.startsWith("ar")) {
    const ampm = hours >= 12 ? "م" : "ص";
    const aDay = toArabicDigits(day);
    const aYear = toArabicDigits(year);
    const aHour = toArabicDigits(hour12);
    const aMin = toArabicDigits(formattedMinutes);

    switch (style) {
      case "short":
        return `${aDay} ${ARABIC_MONTHS_FULL[monthIdx]} ${aYear}`;
      case "medium":
        return `${aDay} ${ARABIC_MONTHS_FULL[monthIdx]} ${aYear}`;
      case "long":
        return `${ARABIC_DAYS_FULL[weekdayIdx]}، ${aDay} ${ARABIC_MONTHS_FULL[monthIdx]} ${aYear}`;
      case "time":
        return `${aHour}:${aMin} ${ampm}`;
      case "full":
        return `${aDay} ${ARABIC_MONTHS_FULL[monthIdx]} ${aYear}، ${aHour}:${aMin} ${ampm}`;
      default:
        return `${aDay} ${ARABIC_MONTHS_FULL[monthIdx]} ${aYear}`;
    }
  }

  if (activeLang.startsWith("hi")) {
    const ampm = hours >= 12 ? "अपराह्न" : "पूर्वाह्न";
    const hDay = toHindiDigits(day);
    const hYear = toHindiDigits(year);
    const hHour = toHindiDigits(hour12);
    const hMin = toHindiDigits(formattedMinutes);

    switch (style) {
      case "short":
        return `${hDay} ${HINDI_MONTHS_FULL[monthIdx]} ${hYear}`;
      case "medium":
        return `${hDay} ${HINDI_MONTHS_FULL[monthIdx]}, ${hYear}`;
      case "long":
        return `${HINDI_DAYS_FULL[weekdayIdx]}, ${hDay} ${HINDI_MONTHS_FULL[monthIdx]} ${hYear}`;
      case "time":
        return `${hHour}:${hMin} ${ampm}`;
      case "full":
        return `${hDay} ${HINDI_MONTHS_FULL[monthIdx]} ${hYear}, ${hHour}:${hMin} ${ampm}`;
      default:
        return `${hDay} ${HINDI_MONTHS_FULL[monthIdx]} ${hYear}`;
    }
  }

  // English fallback
  const ENGLISH_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ENGLISH_MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const ENGLISH_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const ampm = hours >= 12 ? "PM" : "AM";

  switch (style) {
    case "short":
      return `${day} ${ENGLISH_MONTHS_SHORT[monthIdx]} ${year}`;
    case "medium":
      return `${ENGLISH_MONTHS_SHORT[monthIdx]} ${day}, ${year}`;
    case "long":
      return `${ENGLISH_DAYS_FULL[weekdayIdx]}, ${ENGLISH_MONTHS_FULL[monthIdx]} ${day}, ${year}`;
    case "time":
      return `${hour12}:${formattedMinutes} ${ampm}`;
    case "full":
      return `${ENGLISH_MONTHS_SHORT[monthIdx]} ${day}, ${year} ${hour12}:${formattedMinutes} ${ampm}`;
    default:
      return `${ENGLISH_MONTHS_SHORT[monthIdx]} ${day}, ${year}`;
  }
}

/**
 * Format relative time (e.g. 5 minutes ago / ৫ মিনিট আগে)
 */
export function formatLocalizedRelativeTime(
  timestamp: number | string | Date,
  locale?: string
): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return "";

  const activeLang = (locale || i18n.language || "en").toLowerCase();
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (activeLang.startsWith("bn")) {
    if (diffSec < 60) return "এইমাত্র";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${toBengaliDigits(diffMin)} মিনিট আগে`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${toBengaliDigits(diffHours)} ঘণ্টা আগে`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "গতকাল";
    if (diffDays < 7) return `${toBengaliDigits(diffDays)} দিন আগে`;
    return formatLocalizedDate(date, "short", activeLang);
  }

  if (activeLang.startsWith("ar")) {
    if (diffSec < 60) return "الآن";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${toArabicDigits(diffMin)} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `منذ ${toArabicDigits(diffHours)} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${toArabicDigits(diffDays)} أيام`;
    return formatLocalizedDate(date, "short", activeLang);
  }

  if (activeLang.startsWith("hi")) {
    if (diffSec < 60) return "अभी";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${toHindiDigits(diffMin)} मिनट पहले`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${toHindiDigits(diffHours)} घंटे पहले`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "कल";
    if (diffDays < 7) return `${toHindiDigits(diffDays)} दिन पहले`;
    return formatLocalizedDate(date, "short", activeLang);
  }

  // English
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatLocalizedDate(date, "short", activeLang);
}

/**
 * Locale-aware pluralization formatter helper for count + noun
 * Handles i18next translation keys or falls back to singular/plural
 */
export function formatPlural(
  count: number,
  key: string,
  options: { locale?: string; fallback?: { one: string; other: string } } = {}
): string {
  const locale = options.locale || i18n.language || "en";
  const formattedCount = formatNumber(count, { locale });

  // Use i18next plural resolution
  try {
    const translated = i18n.t(key, { count, lng: locale, defaultValue: "" });
    if (translated && translated !== key) {
      return translated.replace("{{count}}", formattedCount);
    }
  } catch (err) {
    // fallback
  }

  if (options.fallback) {
    const label = count === 1 ? options.fallback.one : options.fallback.other;
    return `${formattedCount} ${label}`;
  }

  return `${formattedCount} ${key}`;
}
