import { Platform } from "react-native";
/**
 * Algorithmic Dynamic Pricing & Fare Guarantee Engine (Client ML/Heuristic Service).
 *
 * Implements:
 * 1. Demand Elasticity Modeling:
 *    - Inventory Quota Scarcity (bus seats, launch cabins, holiday stays)
 *    - Regional Festival Proximity (Eid-ul-Fitr, Eid-ul-Adha, Durga Puja, Pohela Boishakh, New Year)
 *    - BMD Meteorological Warning Signals (Inland River Signals 1-4, Maritime Signals, Fog Alerts)
 * 2. Fair Price Ceiling:
 *    - Strict Platform Hard Cap: Surge cannot exceed 1.25x base fare (anti-gouging guarantee).
 *    - Anti-predatory weather freeze: Zero surge allowed during severe storm or river danger signals.
 * 3. Transparent Pricing Breakdown:
 *    - Itemized human-readable adjustments (e.g. "Holiday Transit Demand +10%", "Scarce Inventory Surge +9%").
 * 4. Client Consumption & Real-Time Countdown:
 *    - "Price guaranteed for 15:00 minutes" countdown timer.
 *    - Seamless integration with `useBookingStore`.
 */

import { useEffect, useRef, useState } from "react";
import { useBookingStore } from "../../store/bookingStore";
import { apiRequest } from "../apiClient";

// ============================================================================
// Types & Contracts
// ============================================================================

export type ProductCategory = "bus" | "launch" | "hotel" | "stay";

export type WeatherSeverity = "none" | "cautionary" | "moderate" | "severe";

export interface WeatherCondition {
  condition?: string;
  warning_signal?: number; // River port signal (1-4) or maritime signal (1-10)
  severity?: WeatherSeverity;
  description?: string;
}

export interface DynamicPricingRequest {
  category: ProductCategory;
  productId: string;
  productTitle?: string;
  basePrice: number;
  remainingQuota: number;
  totalQuota: number;
  travelDate?: string | Date; // YYYY-MM-DD or Date
  originCity?: string;
  destinationCity?: string;
  weather?: WeatherCondition;
  departureTime?: string;
  currency?: string;
}

export interface PricingAdjustmentItem {
  code: string;
  label: string;
  percentage: number;
  factorStr: string;
  amount: number;
  description: string;
}

export interface DynamicPricingQuote {
  quoteId: string;
  productId: string;
  category: ProductCategory;
  basePrice: number;
  finalPrice: number;
  surgeMultiplier: number;
  rawMultiplier: number;
  isCapped: boolean;
  capSavingsAmount: number;
  currency: string;
  guaranteeWindowSeconds: number; // 900 seconds = 15 minutes
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  breakdown: PricingAdjustmentItem[];
  guaranteeText: string;
  signature?: string;
  isClientCalculated?: boolean;
}

export interface CountdownTimerState {
  secondsRemaining: number;
  formattedTime: string; // "14:59"
  guaranteeText: string; // "Price guaranteed for 14:59 minutes"
  isExpired: boolean;
  isWarning: boolean; // < 120s remaining
  progressPercentage: number; // 100% -> 0%
  activeQuote: DynamicPricingQuote | null;
}

// ============================================================================
// Algorithmic Constants
// ============================================================================

export const MAX_PLATFORM_SURGE_MULTIPLIER = 1.250; // Strict Hard Platform Ceiling (1.25x)
export const MIN_PLATFORM_PRICE_FLOOR = 0.850;      // 15% discount floor
export const EMERGENCY_WEATHER_CEILING = 1.000;     // Emergency fare freeze ceiling
export const DEFAULT_GUARANTEE_SECONDS = 900;       // 15:00 minutes

interface FestivalRule {
  name: string;
  month: number; // 1-12
  day: number;
  year?: number; // specific year or recurring
  peakDaysBefore: number;
  peakDaysAfter: number;
}

// Bangladeshi Cultural & Religious Festival Calendar
const FESTIVAL_CALENDAR: FestivalRule[] = [
  // 2025
  { name: "Eid-ul-Fitr", year: 2025, month: 3, day: 31, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Pohela Boishakh (Bangla New Year)", month: 4, day: 14, peakDaysBefore: 2, peakDaysAfter: 1 },
  { name: "Eid-ul-Adha (Qurbani Eid)", year: 2025, month: 6, day: 7, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Durga Puja (Dashami)", year: 2025, month: 10, day: 2, peakDaysBefore: 3, peakDaysAfter: 2 },
  { name: "Winter Year-End Holiday", month: 12, day: 31, peakDaysBefore: 4, peakDaysAfter: 2 },

  // 2026
  { name: "Eid-ul-Fitr", year: 2026, month: 3, day: 20, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Eid-ul-Adha (Qurbani Eid)", year: 2026, month: 5, day: 27, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Durga Puja (Dashami)", year: 2026, month: 10, day: 20, peakDaysBefore: 3, peakDaysAfter: 2 },

  // 2027
  { name: "Eid-ul-Fitr", year: 2027, month: 3, day: 10, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Eid-ul-Adha (Qurbani Eid)", year: 2027, month: 5, day: 16, peakDaysBefore: 4, peakDaysAfter: 3 },
  { name: "Durga Puja (Dashami)", year: 2027, month: 10, day: 10, peakDaysBefore: 3, peakDaysAfter: 2 },
];

// ============================================================================
// Core Algorithmic Calculation Engine (Pure Client & Offline Resilience)
// ============================================================================

export class DynamicPricingEngine {
  /**
   * Evaluates proximity to major Bangladeshi festivals.
   */
  public static evaluateFestivalProximity(
    travelDate: Date,
    category: ProductCategory
  ): { delta: number; label?: string; explanation?: string } {
    const targetYear = travelDate.getFullYear();
    let minDaysDiff = 9999;
    let closestRule: FestivalRule | null = null;

    for (const rule of FESTIVAL_CALENDAR) {
      if (rule.year && rule.year !== targetYear) continue;
      const festDate = new Date(targetYear, rule.month - 1, rule.day);
      const diffDays = Math.round((festDate.getTime() - travelDate.getTime()) / (1000 * 60 * 60 * 24));

      if (Math.abs(diffDays) < Math.abs(minDaysDiff)) {
        minDaysDiff = diffDays;
        closestRule = rule;
      }
    }

    if (!closestRule) {
      return { delta: 0 };
    }

    const isTransit = category === "bus" || category === "launch";

    // 1. Peak Festival Window (0-3 days before/after)
    if (minDaysDiff >= -closestRule.peakDaysAfter && minDaysDiff <= closestRule.peakDaysBefore) {
      if (isTransit) {
        return {
          delta: 0.12,
          label: `${closestRule.name} Transit Demand +12%`,
          explanation: `Peak homecoming travel rush on major intercity routes for ${closestRule.name}.`,
        };
      } else {
        return {
          delta: 0.14,
          label: `${closestRule.name} Holiday Rush +14%`,
          explanation: `Peak vacation occupancy at prime destinations during ${closestRule.name}.`,
        };
      }
    }

    // 2. Shoulder Window (4-7 days before)
    if (minDaysDiff > closestRule.peakDaysBefore && minDaysDiff <= closestRule.peakDaysBefore + 4) {
      if (isTransit) {
        return {
          delta: 0.06,
          label: `Pre-${closestRule.name} Transit Flow +6%`,
          explanation: `Elevated pre-holiday departure travel flow for ${closestRule.name}.`,
        };
      } else {
        return {
          delta: 0.07,
          label: `Shoulder ${closestRule.name} Vacation Flow +7%`,
          explanation: `Early seasonal arrivals for ${closestRule.name} holidays.`,
        };
      }
    }

    // 3. Early Bird Window (8-14 days)
    if (Math.abs(minDaysDiff) <= 14) {
      return {
        delta: 0.02,
        label: `${closestRule.name} Advance Booking Trend +2%`,
        explanation: `Advance booking acceleration preceding ${closestRule.name}.`,
      };
    }

    return { delta: 0 };
  }

  /**
   * Calculates inventory scarcity multiplier delta.
   */
  public static evaluateQuotaElasticity(
    remainingQuota: number,
    totalQuota: number,
    category: ProductCategory
  ): { delta: number; label?: string; explanation?: string } {
    if (totalQuota <= 0) return { delta: 0 };

    const ratio = Math.max(0, Math.min(1, remainingQuota / totalQuota));
    const unitName = category === "launch" ? "cabins" : category === "hotel" || category === "stay" ? "rooms" : "seats";

    // Critical Scarcity: <= 8% quota remaining (or <= 2 units left)
    if (ratio <= 0.08 || remainingQuota <= 2) {
      const pct = Math.max(1, Math.round(ratio * 100));
      return {
        delta: 0.14,
        label: `Critical Scarcity Surge (${remainingQuota} ${unitName} left) +14%`,
        explanation: `Less than ${pct}% remaining capacity (${remainingQuota} ${unitName} left). High booking demand detected.`,
      };
    }

    // High Scarcity: 9% to 20% remaining
    if (ratio <= 0.20) {
      return {
        delta: 0.09,
        label: `Scarce Inventory Surge (<20% ${unitName} left) +9%`,
        explanation: `Only ${remainingQuota} of ${totalQuota} ${unitName} left available on this departure.`,
      };
    }

    // Moderate Scarcity: 21% to 35% remaining
    if (ratio <= 0.35) {
      return {
        delta: 0.05,
        label: `Route Demand Surge (<35% ${unitName} left) +5%`,
        explanation: `Elevated occupancy with ${remainingQuota} ${unitName} remaining.`,
      };
    }

    // Balanced Capacity: 36% to 75%
    if (ratio <= 0.75) {
      return { delta: 0 };
    }

    // Ample Vacancy: > 75% -> Early booking reward
    return {
      delta: -0.05,
      label: `Early Booking Saver (${unitName[0].toUpperCase() + unitName.slice(1)} Availability >75%) -5%`,
      explanation: `Ample seats/cabins available (${remainingQuota} open). Early booking promotional incentive applied to reward early planning.`,
    };
  }

  /**
   * Evaluates weather advisories and safety warning signals.
   */
  public static evaluateWeatherImpact(
    weather: WeatherCondition | undefined,
    category: ProductCategory,
    travelDate: Date
  ): { delta: number; label?: string; explanation?: string; isSevereDanger: boolean } {
    if (!weather) {
      // Winter fog seasonal advisory (Dec - Jan)
      const m = travelDate.getMonth();
      if ((m === 11 || m === 0) && (category === "bus" || category === "launch")) {
        return {
          delta: -0.02,
          label: "Winter Fog Advisory Buffer -2%",
          explanation: "Seasonal river and highway fog buffer applied to assist passenger schedule comfort.",
          isSevereDanger: false,
        };
      }
      return { delta: 0, isSevereDanger: false };
    }

    const cond = (weather.condition || "").toLowerCase();
    const sig = weather.warning_signal || 0;
    const isSevere =
      weather.severity === "severe" ||
      sig >= 3 ||
      cond.includes("cyclone") ||
      cond.includes("storm") ||
      cond.includes("danger");

    if (isSevere) {
      return {
        delta: -0.05,
        label: "Disaster Weather Advisory Fare Protection -5%",
        explanation: `BMD Warning Signal ${sig || "Active"} ('${cond}'). Fare surge suspended for passenger safety.`,
        isSevereDanger: true,
      };
    }

    const isModerate =
      weather.severity === "moderate" ||
      sig === 2 ||
      cond.includes("fog") ||
      cond.includes("monsoon") ||
      cond.includes("heavy_rain");

    if (isModerate) {
      return {
        delta: -0.03,
        label: category === "launch" ? "River Weather Advisory Buffer -3%" : "Highway Weather Advisory Buffer -2%",
        explanation: `Inclement conditions ('${cond}'). Safety buffer applied.`,
        isSevereDanger: false,
      };
    }

    if (sig === 1 || weather.severity === "cautionary") {
      return {
        delta: 0,
        label: "River Cautionary Signal 1 Monitored 0%",
        explanation: "Cautious navigation monitored by port authorities.",
        isSevereDanger: false,
      };
    }

    return { delta: 0, isSevereDanger: false };
  }

  /**
   * Evaluates Bangladeshi weekend patterns (Thursday evening & Friday morning for transit, Fri-Sat for hotels).
   */
  public static evaluateWeekendElasticity(
    travelDate: Date,
    category: ProductCategory
  ): { delta: number; label?: string; explanation?: string } {
    const day = travelDate.getDay(); // 0 is Sunday, 4 is Thursday, 5 is Friday, 6 is Saturday
    const isTransit = category === "bus" || category === "launch";

    if (isTransit && (day === 4 || day === 5)) {
      const dayName = day === 4 ? "Thursday Evening" : "Friday Morning";
      return {
        delta: 0.04,
        label: `Weekend Transit Commute (${dayName}) +4%`,
        explanation: "High-volume intercity departure demand during the Bangladeshi weekend transition.",
      };
    }

    if (!isTransit && (day === 5 || day === 6)) {
      return {
        delta: 0.05,
        label: "Weekend Leisure Stay Surge +5%",
        explanation: "Peak weekend holiday occupancy demand across vacation resorts.",
      };
    }

    return { delta: 0 };
  }

  /**
   * Pure algorithmic calculation function.
   * Accurately enforces the 1.25x Platform Cap and transparent breakdowns.
   */
  public static calculateFairQuote(
    request: DynamicPricingRequest,
    referenceTime: Date = new Date()
  ): DynamicPricingQuote {
    const basePrice = Math.max(0, request.basePrice);
    const travelDate =
      typeof request.travelDate === "string"
        ? new Date(request.travelDate)
        : request.travelDate || referenceTime;

    const breakdown: PricingAdjustmentItem[] = [];
    let rawMultiplier = 1.0;

    // 1. Quota Scarcity
    const quota = this.evaluateQuotaElasticity(request.remainingQuota, request.totalQuota, request.category);
    if (quota.delta !== 0 && quota.label) {
      rawMultiplier += quota.delta;
      breakdown.push({
        code: "QUOTA_ELASTICITY",
        label: quota.label,
        percentage: Math.round(quota.delta * 1000) / 10,
        factorStr: `${quota.delta >= 0 ? "+" : ""}${(quota.delta * 100).toFixed(1)}%`,
        amount: Math.round(basePrice * quota.delta * 100) / 100,
        description: quota.explanation || "",
      });
    }

    // 2. Festival Proximity
    const fest = this.evaluateFestivalProximity(travelDate, request.category);
    if (fest.delta !== 0 && fest.label) {
      rawMultiplier += fest.delta;
      breakdown.push({
        code: "FESTIVAL_PROXIMITY",
        label: fest.label,
        percentage: Math.round(fest.delta * 1000) / 10,
        factorStr: `${fest.delta >= 0 ? "+" : ""}${(fest.delta * 100).toFixed(1)}%`,
        amount: Math.round(basePrice * fest.delta * 100) / 100,
        description: fest.explanation || "",
      });
    }

    // 3. Weather & Safety Warnings
    const weather = this.evaluateWeatherImpact(request.weather, request.category, travelDate);
    if (weather.delta !== 0 && weather.label) {
      rawMultiplier += weather.delta;
      breakdown.push({
        code: "WEATHER_SAFETY",
        label: weather.label,
        percentage: Math.round(weather.delta * 1000) / 10,
        factorStr: `${weather.delta >= 0 ? "+" : ""}${(weather.delta * 100).toFixed(1)}%`,
        amount: Math.round(basePrice * weather.delta * 100) / 100,
        description: weather.explanation || "",
      });
    }

    // 4. Weekend Timing
    const weekend = this.evaluateWeekendElasticity(travelDate, request.category);
    if (weekend.delta !== 0 && weekend.label) {
      rawMultiplier += weekend.delta;
      breakdown.push({
        code: "WEEKEND_TIMING",
        label: weekend.label,
        percentage: Math.round(weekend.delta * 1000) / 10,
        factorStr: `${weekend.delta >= 0 ? "+" : ""}${(weekend.delta * 100).toFixed(1)}%`,
        amount: Math.round(basePrice * weekend.delta * 100) / 100,
        description: weekend.explanation || "",
      });
    }

    // -------------------------------------------------------------
    // FAIR PRICE CEILING & GOVERNANCE ENFORCEMENT
    // -------------------------------------------------------------
    let isCapped = false;
    let capSavingsAmount = 0;
    let effectiveMultiplier = rawMultiplier;

    // Rule A: Severe Weather Safety Cap (Cap at 1.00x during storm/disaster)
    if (weather.isSevereDanger && effectiveMultiplier > EMERGENCY_WEATHER_CEILING) {
      const capDiff = effectiveMultiplier - EMERGENCY_WEATHER_CEILING;
      capSavingsAmount += Math.round(capDiff * basePrice * 100) / 100;
      effectiveMultiplier = EMERGENCY_WEATHER_CEILING;
      isCapped = true;
      breakdown.push({
        code: "EMERGENCY_WEATHER_CAP",
        label: "Disaster Weather Safety Cap Enforced",
        percentage: -Math.round(capDiff * 1000) / 10,
        factorStr: `-${(capDiff * 100).toFixed(1)}%`,
        amount: -Math.round(capDiff * basePrice * 100) / 100,
        description: "Anti-gouging protection: Surges strictly suspended during severe meteorological signals.",
      });
    }

    // Rule B: Hard Platform Ceiling (Cap at 1.25x max)
    if (effectiveMultiplier > MAX_PLATFORM_SURGE_MULTIPLIER) {
      const excess = effectiveMultiplier - MAX_PLATFORM_SURGE_MULTIPLIER;
      capSavingsAmount += Math.round(excess * basePrice * 100) / 100;
      effectiveMultiplier = MAX_PLATFORM_SURGE_MULTIPLIER;
      isCapped = true;
      breakdown.push({
        code: "FAIR_PRICE_CEILING_CAP",
        label: "Fair Price Ceiling (1.25x Platform Cap)",
        percentage: -Math.round(excess * 1000) / 10,
        factorStr: `-${(excess * 100).toFixed(1)}%`,
        amount: -Math.round(excess * basePrice * 100) / 100,
        description: "Consumer Fair Price Protection: Fare strictly capped at 1.25x base fare to prevent predatory pricing.",
      });
    }

    // Rule C: Floor Enforcement (Floor at 0.85x min)
    if (effectiveMultiplier < MIN_PLATFORM_PRICE_FLOOR) {
      const floorDiff = MIN_PLATFORM_PRICE_FLOOR - effectiveMultiplier;
      effectiveMultiplier = MIN_PLATFORM_PRICE_FLOOR;
      breakdown.push({
        code: "FAIR_PRICE_FLOOR",
        label: "Platform Fair Price Floor (0.85x)",
        percentage: Math.round(floorDiff * 1000) / 10,
        factorStr: `+${(floorDiff * 100).toFixed(1)}%`,
        amount: Math.round(floorDiff * basePrice * 100) / 100,
        description: "Standard promotional floor enforced to preserve transport operator sustainability.",
      });
    }

    const finalPrice = Math.round(basePrice * effectiveMultiplier);
    const expiresAt = new Date(referenceTime.getTime() + DEFAULT_GUARANTEE_SECONDS * 1000);

    const randHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const dateTag = referenceTime.toISOString().slice(0, 10).replace(/-/g, "");
    const quoteId = `SJ-Q-${dateTag}-${request.category.substring(0, 3).toUpperCase()}-${randHex}`;

    return {
      quoteId,
      productId: request.productId,
      category: request.category,
      basePrice,
      finalPrice,
      surgeMultiplier: Math.round(effectiveMultiplier * 1000) / 1000,
      rawMultiplier: Math.round(rawMultiplier * 1000) / 1000,
      isCapped,
      capSavingsAmount,
      currency: request.currency || "BDT",
      guaranteeWindowSeconds: DEFAULT_GUARANTEE_SECONDS,
      createdAt: referenceTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      breakdown,
      guaranteeText: "Price guaranteed for 15:00 minutes",
      isClientCalculated: true,
    };
  }
}

// ============================================================================
// Real-Time Price Guarantee Countdown Manager & Store Integrator
// ============================================================================

type TimerSubscriber = (state: CountdownTimerState) => void;

class PriceLockCountdownManager {
  private activeQuote: DynamicPricingQuote | null = null;
  private timerHandle: any = null;
  private subscribers: Set<TimerSubscriber> = new Set();
  private lastState: CountdownTimerState = this.getInitialState();

  private getInitialState(): CountdownTimerState {
    return {
      secondsRemaining: DEFAULT_GUARANTEE_SECONDS,
      formattedTime: "15:00",
      guaranteeText: "Price guaranteed for 15:00 minutes",
      isExpired: false,
      isWarning: false,
      progressPercentage: 100,
      activeQuote: null,
    };
  }

  public getSnapshot(): CountdownTimerState {
    return this.lastState;
  }

  public subscribe(cb: TimerSubscriber): () => void {
    this.subscribers.add(cb);
    cb(this.lastState);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.lastState);
      } catch (err) {
        console.error("Error notifying price timer subscriber:", err);
      }
    });
  }

  public setActiveQuote(quote: DynamicPricingQuote) {
    this.activeQuote = quote;
    this.startCountdown();
  }

  public clearActiveQuote() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.activeQuote = null;
    this.lastState = this.getInitialState();
    this.notify();
  }

  private startCountdown() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }

    if (!this.activeQuote) return;

    const expiryTime = new Date(this.activeQuote.expiresAt).getTime();
    const totalDuration = this.activeQuote.guaranteeWindowSeconds || DEFAULT_GUARANTEE_SECONDS;

    const tick = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, expiryTime - now);
      const remainingSec = Math.floor(remainingMs / 1000);

      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      const isExpired = remainingSec <= 0;
      const isWarning = remainingSec > 0 && remainingSec <= 120; // Last 2 minutes
      const progress = Math.max(0, Math.min(100, (remainingSec / totalDuration) * 100));

      const guaranteeText = isExpired
        ? "Price guarantee has expired"
        : `Price guaranteed for ${formatted} minutes`;

      this.lastState = {
        secondsRemaining: remainingSec,
        formattedTime: formatted,
        guaranteeText,
        isExpired,
        isWarning,
        progressPercentage: progress,
        activeQuote: this.activeQuote,
      };

      this.notify();

      if (isExpired) {
        if (this.timerHandle) {
          clearInterval(this.timerHandle);
          this.timerHandle = null;
        }
      }
    };

    tick();
    this.timerHandle = setInterval(tick, 1000);
  }
}

// Global countdown manager singleton
const countdownManager = new PriceLockCountdownManager();

// ============================================================================
// Dynamic Pricing Service Integration API
// ============================================================================

export const dynamicPricingService = {
  /**
   * Fetches real-time dynamic pricing quote from FastAPI backend,
   * falling back to local algorithmic calculation if offline.
   */
  async getSurgeQuote(request: DynamicPricingRequest): Promise<DynamicPricingQuote> {
    try {
      const travelDateStr =
        request.travelDate instanceof Date
          ? request.travelDate.toISOString().slice(0, 10)
          : request.travelDate;

      const payload = {
        category: request.category,
        product_id: request.productId,
        product_title: request.productTitle,
        base_price: request.basePrice,
        remaining_quota: request.remainingQuota,
        total_quota: request.totalQuota,
        travel_date: travelDateStr,
        origin_city: request.originCity,
        destination_city: request.destinationCity,
        weather: request.weather
          ? {
              condition: request.weather.condition || "clear",
              warning_signal: request.weather.warning_signal || 0,
              severity: request.weather.severity || "none",
              description: request.weather.description,
            }
          : undefined,
        departure_time: request.departureTime,
        currency: request.currency || "BDT",
      };

      const response = await apiRequest<{
        success: boolean;
        message: string;
        data: any;
      }>("/pricing/surge-quote", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response && response.data) {
        const d = response.data;
        const quote: DynamicPricingQuote = {
          quoteId: d.quote_id,
          productId: d.product_id,
          category: d.category as ProductCategory,
          basePrice: d.base_price,
          finalPrice: d.final_price,
          surgeMultiplier: d.surge_multiplier,
          rawMultiplier: d.raw_multiplier,
          isCapped: d.is_capped,
          capSavingsAmount: d.cap_savings_amount,
          currency: d.currency || "BDT",
          guaranteeWindowSeconds: d.guarantee_window_seconds,
          createdAt: d.created_at,
          expiresAt: d.expires_at,
          breakdown: (d.breakdown || []).map((b: any) => ({
            code: b.code,
            label: b.label,
            percentage: b.percentage,
            factorStr: b.factor_str,
            amount: b.amount,
            description: b.description,
          })),
          guaranteeText: d.guarantee_text || "Price guaranteed for 15:00 minutes",
          signature: d.signature,
          isClientCalculated: false,
        };
        return quote;
      }
    } catch (err) {
      console.warn("Backend dynamic pricing API offline or unreachable; using client elasticity engine:", err);
    }

    // Fallback: Pure client-side calculation
    return DynamicPricingEngine.calculateFairQuote(request);
  },

  /**
   * Applies quote to `useBookingStore` and locks the fare.
   * Updates basePrice and recalculates tax/fees while preserving booking store integrity.
   */
  applyQuoteToBookingStore(quote: DynamicPricingQuote): void {
    const bookingStore = useBookingStore.getState();
    const currentPricing = bookingStore.pricing;

    // Calculate updated taxes and fees based on fair dynamic fare
    const newBase = quote.finalPrice;
    const tax = Math.round(newBase * 0.05); // 5% VAT
    const fee = Math.round(newBase * 0.02); // 2% service fee
    const discount = currentPricing.discountAmount || 0;
    const finalTotal = Math.max(0, newBase + tax + fee - discount);

    useBookingStore.setState({
      pricing: {
        ...currentPricing,
        basePrice: newBase,
        taxAmount: tax,
        serviceFee: fee,
        finalPrice: finalTotal,
        currency: quote.currency || "BDT",
      },
    });

    // Start 15-minute countdown lock
    countdownManager.setActiveQuote(quote);
  },

  /**
   * Combined workflow: Calculates fair quote, binds to `useBookingStore`,
   * and starts the 15-minute price guarantee timer.
   */
  async lockPriceForBooking(request: DynamicPricingRequest): Promise<DynamicPricingQuote> {
    const quote = await this.getSurgeQuote(request);
    this.applyQuoteToBookingStore(quote);
    return quote;
  },

  /**
   * Releases current active price lock and resets countdown timer.
   */
  releasePriceLock(): void {
    countdownManager.clearActiveQuote();
  },

  /**
   * Verifies if current quote is still within the 15-minute guarantee window.
   */
  isPriceLockActive(): boolean {
    const state = countdownManager.getSnapshot();
    return !!state.activeQuote && !state.isExpired;
  },

  /**
   * Subscribes to real-time timer updates.
   */
  subscribeToTimer(callback: TimerSubscriber): () => void {
    return countdownManager.subscribe(callback);
  },

  /**
   * Gets current countdown snapshot.
   */
  getCurrentCountdownState(): CountdownTimerState {
    return countdownManager.getSnapshot();
  },
};

// ============================================================================
// React Hooks for Client Consumption
// ============================================================================

/**
 * Hook for consuming the 15-minute price guarantee countdown in components.
 * Renders "Price guaranteed for 14:59 minutes" and updates every second.
 */
export function useDynamicPriceCountdown(): CountdownTimerState {
  const [timerState, setTimerState] = useState<CountdownTimerState>(() =>
    countdownManager.getSnapshot()
  );

  useEffect(() => {
    const unsubscribe = countdownManager.subscribe((state) => {
      setTimerState(state);
    });
    return unsubscribe;
  }, []);

  return timerState;
}

/**
 * Comprehensive hook for bus trips, launch cabins, or hotel rooms.
 * Manages loading, calculations, ceiling cap metrics, breakdowns, and countdowns.
 */
export function useDynamicPricing(initialRequest?: DynamicPricingRequest) {
  const [quote, setQuote] = useState<DynamicPricingQuote | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const countdown = useDynamicPriceCountdown();

  const fetchAndLock = async (req?: DynamicPricingRequest) => {
    const targetReq = req || initialRequest;
    if (!targetReq) return null;

    setIsLoading(true);
    setError(null);
    try {
      const result = await dynamicPricingService.lockPriceForBooking(targetReq);
      setQuote(result);
      return result;
    } catch (err: any) {
      const msg = err?.message || "Failed to calculate dynamic pricing";
      setError(msg);
      // Fallback pure calculation on error
      const fallback = DynamicPricingEngine.calculateFairQuote(targetReq);
      dynamicPricingService.applyQuoteToBookingStore(fallback);
      setQuote(fallback);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQuote = async () => {
    if (initialRequest) {
      await fetchAndLock(initialRequest);
    }
  };

  return {
    quote,
    isLoading,
    error,
    countdown,
    formattedTime: countdown.formattedTime,
    guaranteeText: countdown.guaranteeText,
    isExpired: countdown.isExpired,
    isWarning: countdown.isWarning,
    isCapped: quote?.isCapped || false,
    capSavingsAmount: quote?.capSavingsAmount || 0,
    breakdown: quote?.breakdown || [],
    fetchAndLock,
    refreshQuote,
    releasePriceLock: dynamicPricingService.releasePriceLock,
  };
}
