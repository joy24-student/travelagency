const fs = require('fs');

// 1. Update HotelsHomesScreen.tsx
let hotelCode = fs.readFileSync('src/screens/HotelsHomesScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!hotelCode.includes('formatLocalizedCurrency')) {
  hotelCode = hotelCode.replace(
    'import { AiPill, BottomNav } from "./Navigation";',
    'import { AiPill, BottomNav } from "./Navigation";\nimport { formatLocalizedCurrency, formatLocalizedDate } from "../utils/formatters";'
  );

  const oldHotelFormatters = `export function formatPrice(amount: number | string): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return \`\${HOSPITALITY_CONFIG.DEFAULT_CURRENCY_SYMBOL}\${Math.round(numeric).toLocaleString()}\`;
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}`;

  const newHotelFormatters = `export function formatPrice(amount: number | string, currency = "BDT"): string {
  return formatLocalizedCurrency(amount, currency as any);
}

export function formatDateShort(date: Date, locale?: string): string {
  return formatLocalizedDate(date, "short", locale);
}

export function formatDateFull(date: Date, locale?: string): string {
  return formatLocalizedDate(date, "medium", locale);
}`;

  hotelCode = hotelCode.replace(oldHotelFormatters, newHotelFormatters);
  fs.writeFileSync('src/screens/HotelsHomesScreen.tsx', hotelCode, 'utf8');
  console.log('Successfully updated HotelsHomesScreen.tsx');
}

// 2. Update FlightsScreen.tsx
let flightCode = fs.readFileSync('src/screens/FlightsScreen.tsx', 'utf8').replace(/\r\n/g, '\n');

if (!flightCode.includes('formatLocalizedDate')) {
  flightCode = flightCode.replace(
    'import { AiPill, BottomNav } from "./Navigation";',
    'import { AiPill, BottomNav } from "./Navigation";\nimport { formatLocalizedDate, formatLocalizedNumber, formatLocalizedCurrency } from "../utils/formatters";'
  );

  const oldFlightDate = `export const formatDisplayDate = (d: Date): string => {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};`;

  const newFlightDate = `export const formatDisplayDate = (d: Date, locale?: string): string => {
  return formatLocalizedDate(d, "short", locale);
};`;

  flightCode = flightCode.replace(oldFlightDate, newFlightDate);
  fs.writeFileSync('src/screens/FlightsScreen.tsx', flightCode, 'utf8');
  console.log('Successfully updated FlightsScreen.tsx');
}
