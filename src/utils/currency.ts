import { CurrencyCode } from "../store/settingsStore";

export interface CurrencyMetadata {
  code: CurrencyCode;
  symbol: string;
  name: string;
  nativeName: string;
  flag: string;
  decimals: number;
  rateFromBDT: number; // 1 BDT = X Foreign Currency
}

export const CURRENCY_METADATA: Record<CurrencyCode, CurrencyMetadata> = {
  BDT: {
    code: "BDT",
    symbol: "৳",
    name: "Bangladeshi Taka",
    nativeName: "বাংলাদেশী টাকা",
    flag: "🇧🇩",
    decimals: 0,
    rateFromBDT: 1.0,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    nativeName: "US Dollar",
    flag: "🇺🇸",
    decimals: 2,
    rateFromBDT: 0.0084, // ~ 119.05 BDT / USD
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    nativeName: "Euro",
    flag: "🇪🇺",
    decimals: 2,
    rateFromBDT: 0.0078, // ~ 128.20 BDT / EUR
  },
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    nativeName: "भारतीय रुपया",
    flag: "🇮🇳",
    decimals: 2,
    rateFromBDT: 0.72, // ~ 1.39 BDT / INR
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    nativeName: "British Pound",
    flag: "🇬🇧",
    decimals: 2,
    rateFromBDT: 0.0066, // ~ 151.50 BDT / GBP
  },
  SAR: {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    nativeName: "ريال سعودي",
    flag: "🇸🇦",
    decimals: 2,
    rateFromBDT: 0.0315, // ~ 31.75 BDT / SAR
  },
};

// Cached live exchange rates in-memory
let liveExchangeRates: Record<CurrencyCode, number> = {
  BDT: 1.0,
  USD: 0.0084,
  EUR: 0.0078,
  INR: 0.72,
  GBP: 0.0066,
  SAR: 0.0315,
};

let lastRatesFetchTime = 0;
const RATES_CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Fetch or get cached live central bank rates with graceful offline fallback
 */
export const getExchangeRates = async (): Promise<Record<CurrencyCode, number>> => {
  const now = Date.now();
  if (now - lastRatesFetchTime < RATES_CACHE_TTL) {
    return liveExchangeRates;
  }

  try {
    // Attempt fetching live rates from public forex API if online
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    ).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      if (data?.rates && data.rates.BDT) {
        const usdBdt = data.rates.BDT; // 1 USD = X BDT
        liveExchangeRates = {
          BDT: 1.0,
          USD: 1 / usdBdt,
          EUR: (data.rates.EUR || 0.92) / usdBdt,
          INR: (data.rates.INR || 85.5) / usdBdt,
          GBP: (data.rates.GBP || 0.78) / usdBdt,
          SAR: (data.rates.SAR || 3.75) / usdBdt,
        };
        lastRatesFetchTime = now;
      }
    }
  } catch (e) {
    // Graceful offline fallback to predefined reference matrix
  }

  return liveExchangeRates;
};

/**
 * Convert any amount from BDT to target currency
 */
export const convertFromBDT = (
  amountInBDT: number,
  targetCurrency: CurrencyCode = "BDT"
): number => {
  const rate = liveExchangeRates[targetCurrency] || CURRENCY_METADATA[targetCurrency]?.rateFromBDT || 1.0;
  return amountInBDT * rate;
};

/**
 * Convert between any two supported currencies
 */
export const convertCurrency = (
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number => {
  if (from === to) return amount;
  const fromRate = liveExchangeRates[from] || CURRENCY_METADATA[from]?.rateFromBDT || 1.0;
  const toRate = liveExchangeRates[to] || CURRENCY_METADATA[to]?.rateFromBDT || 1.0;
  // Convert from origin to BDT, then BDT to target
  const inBDT = amount / fromRate;
  return inBDT * toRate;
};

/**
 * Universal Price Formatter
 * Formats an amount in BDT into the target currency with correct symbols,
 * precision, and localized number separators.
 *
 * Example outputs:
 * - formatPrice(5200, "BDT") => "৳ 5,200"
 * - formatPrice(5200, "USD") => "$ 43.68"
 */
export const formatPrice = (
  amountInBDT: number | string,
  targetCurrency: CurrencyCode = "BDT"
): string => {
  const numAmount = typeof amountInBDT === "string" ? parseFloat(amountInBDT) : amountInBDT;

  if (isNaN(numAmount) || numAmount === 0) {
    const meta = CURRENCY_METADATA[targetCurrency] || CURRENCY_METADATA.BDT;
    return `${meta.symbol} 0`;
  }

  const meta = CURRENCY_METADATA[targetCurrency] || CURRENCY_METADATA.BDT;
  const converted = convertFromBDT(numAmount, targetCurrency);

  const formattedNum = converted.toLocaleString("en-US", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });

  return `${meta.symbol} ${formattedNum}`;
};

// ==========================================
// Backwards Compatibility Functions
// ==========================================

export const formatBDTCurrency = (amount: number | string): string => {
  return formatPrice(amount, "BDT");
};

export const formatBDTCurrencyWithoutSymbol = (amount: number | string): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0.00";
  return numAmount.toLocaleString("bn-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const convertToBDT = (amount: number, exchangeRate: number = 1): number => {
  return amount * exchangeRate;
};
