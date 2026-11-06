/**
 * Predictive Analytics & Time-Series Client Component Bridge.
 * Target File: src/services/ml/pricePredictor.ts
 *
 * Provides:
 * 1. Double Exponential Smoothing & Occupancy Velocity Client-Side Fallback Engine.
 * 2. API Bridge to FastAPI Time-Series Forecast Backend (/api/v1/forecast).
 * 3. React Native Components:
 *    - PriceTrendBadge: Visual indicator displaying deterministic recommendation (BUY_NOW, WAIT, STABLE) and predicted change.
 *    - PriceAlertTrigger: Interactive trigger with haptics & AsyncStorage persistence to set price drop alerts.
 *    - PriceForecastCard: Comprehensive 14-day price fluctuation intelligence card with confidence intervals.
 *    - usePriceForecast: React Hook for plug-and-play flight & hotel screen integration.
 */

import * as React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StyleProp,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../apiClient";
import { colors } from "../../theme/colors";

// ============================================================================
// Types and Domain Models
// ============================================================================

export type RecommendationVerdict = "BUY_NOW" | "WAIT" | "STABLE";

export interface DailyForecastPoint {
  day: number;
  date: string;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  uncertainty: number;
  predictedChangePercent: number;
}

export interface PriceForecastData {
  itemId?: string;
  itemType: "flight" | "hotel" | "general";
  currency: string;
  currentPrice: number;
  verdict: RecommendationVerdict;
  recommendationReason: string;
  confidenceScore: number;
  uncertaintyMetric: number;
  predictedChangePercent: number;
  lowestPredictedPrice: number;
  lowestPriceDay: number;
  highestPredictedPrice: number;
  highestPriceDay: number;
  bestTimeToBookDays: number;
  occupancyRate: number;
  occupancyVelocity: number;
  historicalTrendSlope?: number;
  dailyForecasts: DailyForecastPoint[];
}

export interface PriceAlert {
  id: string;
  itemId: string;
  itemType: "flight" | "hotel";
  targetPrice: number;
  currentPrice: number;
  thresholdPercent?: number;
  createdAt: string;
  active: boolean;
}

export interface ForecastRequestParams {
  itemId?: string;
  itemType?: "flight" | "hotel";
  currentPrice: number;
  currency?: string;
  historicalPrices?: number[];
  totalCapacity?: number;
  availableCapacity?: number;
  occupancyVelocity?: number;
  daysToDeparture?: number;
}

const STORAGE_ALERTS_KEY = "@shopno_price_alerts_v1";

// ============================================================================
// Client-Side Time-Series Forecast Engine (Zero-Latency & Offline Fallback)
// ============================================================================

export function predictPriceTrendClientSide(
  params: ForecastRequestParams
): PriceForecastData {
  const {
    itemId,
    itemType = "flight",
    currentPrice,
    currency = "BDT",
    totalCapacity = 180,
    availableCapacity = 60,
    daysToDeparture = 21,
  } = params;

  const isFlight = itemType === "flight";
  const occRate = Math.max(0.05, Math.min(0.98, (totalCapacity - availableCapacity) / totalCapacity));
  const occVel =
    params.occupancyVelocity !== undefined
      ? params.occupancyVelocity
      : daysToDeparture <= 7
      ? 0.035
      : daysToDeparture <= 21
      ? 0.02
      : 0.008;

  // 1. Synthesize or use historical series
  let history = params.historicalPrices;
  if (!history || history.length < 3) {
    history = [];
    const drift = occVel > 0.02 ? -currentPrice * 0.006 : currentPrice * 0.003;
    let prev = currentPrice;
    for (let i = 0; i < 14; i++) {
      history.unshift(prev);
      prev = Math.max(currentPrice * 0.5, prev + drift + (Math.sin(i) * currentPrice * 0.01));
    }
  }

  // 2. Holt's Linear Trend Smoothing with Damping (alpha=0.38, beta=0.18, phi=0.94)
  const alpha = 0.38;
  const beta = 0.18;
  const phi = 0.94;
  let level = history[0];
  let trend = history[1] - history[0];
  const residuals: number[] = [];

  for (let t = 1; t < history.length; t++) {
    const yt = history[t];
    const pred = level + phi * trend;
    residuals.push(yt - pred);
    const newLevel = alpha * yt + (1 - alpha) * (level + phi * trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * phi * trend;
    level = newLevel;
    trend = newTrend;
  }

  const meanSqRes =
    residuals.reduce((acc, r) => acc + r * r, 0) / Math.max(1, residuals.length - 1);
  const sigmaE = Math.max(Math.sqrt(meanSqRes), currentPrice * 0.02);

  // 3. Generate 14-day forecasts anchored on current price
  const dailyForecasts: DailyForecastPoint[] = [];
  const today = new Date();
  let cumDamping = 0;
  const rawForecasts: number[] = [];

  for (let h = 1; h <= 14; h++) {
    cumDamping += Math.pow(phi, h);
    // Base exponential trend
    const baseVal = currentPrice + cumDamping * trend;

    // Occupancy velocity dynamic multiplier
    const projOcc = Math.min(0.99, occRate + occVel * h);
    let occMult = 1.0;
    if (occVel > 0.015 || projOcc > 0.75) {
      const scarcity = projOcc / (1.001 - projOcc);
      occMult = 1.0 + 2.2 * Math.max(0, occVel) * Math.pow(scarcity, 0.45) * (h / 14);
    } else if (projOcc < 0.45 && occVel <= 0.008) {
      occMult = Math.max(0.82, 1.0 - (0.5 - projOcc) * 0.3 * (h / 14));
    }

    // Day of week seasonality (Fridays & Saturdays BD weekend premium)
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + h);
    const dow = targetDate.getDay();
    const dowMult = dow === 5 || dow === 6 ? 1.03 : dow === 2 || dow === 3 ? 0.985 : 1.0;

    const pointPrice = Math.max(currentPrice * 0.25, baseVal * occMult * dowMult);
    rawForecasts.push(pointPrice);

    // Expanding variance CI
    const varFactor = 1.0 + (alpha + (h - 1) * alpha * beta) ** 2;
    const sigmaH = Math.max(sigmaE * Math.sqrt(varFactor), currentPrice * 0.02 * Math.sqrt(h));
    const margin = 1.96 * sigmaH;

    const lowerBound = Math.max(currentPrice * 0.2, Math.round(pointPrice - margin));
    const upperBound = Math.round(pointPrice + margin);
    const uncertainty = Number(((upperBound - lowerBound) / (2 * pointPrice)).toFixed(4));
    const chgPct = Number((((pointPrice - currentPrice) / currentPrice) * 100).toFixed(1));

    dailyForecasts.push({
      day: h,
      date: targetDate.toISOString().split("T")[0],
      predictedPrice: Math.round(pointPrice),
      lowerBound,
      upperBound,
      uncertainty,
      predictedChangePercent: chgPct,
    });
  }

  // 4. Recommendation Heuristic Evaluation
  const highestPrice = Math.max(...rawForecasts);
  const highestDay = rawForecasts.indexOf(highestPrice) + 1;
  const lowestPrice = Math.min(...rawForecasts);
  const lowestDay = rawForecasts.indexOf(lowestPrice) + 1;

  const maxSurgePct = ((highestPrice - currentPrice) / currentPrice) * 100;
  const maxDropPct = ((lowestPrice - currentPrice) / currentPrice) * 100;
  const endChgPct = ((rawForecasts[13] - currentPrice) / currentPrice) * 100;

  let verdict: RecommendationVerdict = "STABLE";
  let reason = "";
  let bestWait = 0;

  if (maxSurgePct >= 15.0) {
    verdict = "BUY_NOW";
    reason = `Price expected to surge +${maxSurgePct.toFixed(1)}% by Day ${highestDay}. High seat occupancy velocity (${(occVel * 100).toFixed(1)}%/day) is closing discounted fare tiers. Book now.`;
    bestWait = 0;
  } else if (occRate >= 0.8 && occVel >= 0.025 && maxSurgePct >= 8.0) {
    verdict = "BUY_NOW";
    reason = `Capacity is critical (${(occRate * 100).toFixed(0)}% full). Rapid booking velocity indicates remaining inventory will surge soon. Immediate booking recommended.`;
    bestWait = 0;
  } else if (endChgPct >= 14.0 && trend > 0) {
    verdict = "BUY_NOW";
    reason = `Steady upward price trend (+${endChgPct.toFixed(1)}% over 14 days). Lock in your fare now to prevent paying up to ${Math.round(highestPrice).toLocaleString()} ${currency}.`;
    bestWait = 0;
  } else if (maxDropPct <= -4.5 && lowestDay <= 10) {
    verdict = "WAIT";
    reason = `Price drop of ${Math.abs(maxDropPct).toFixed(1)}% expected around Day ${lowestDay} (-${Math.round(currentPrice - lowestPrice).toLocaleString()} ${currency}). Wait for promotional fare release.`;
    bestWait = lowestDay;
  } else if (occRate < 0.45 && occVel <= 0.008 && endChgPct <= -2.5) {
    verdict = "WAIT";
    reason = `Low demand and slow booking velocity (${(occVel * 100).toFixed(1)}%/day) suggest upcoming off-peak dynamic discounts. We advise waiting.`;
    bestWait = Math.min(7, lowestDay);
  } else {
    verdict = "STABLE";
    const band = Math.max(Math.abs(maxSurgePct), Math.abs(maxDropPct));
    reason = `Price is projected to remain stable within ±${band.toFixed(1)}% over the next 14 days. Book at your convenience.`;
    bestWait = 0;
  }

  const avgUncertainty =
    dailyForecasts.reduce((acc, d) => acc + d.uncertainty, 0) / dailyForecasts.length;
  const confidenceScore = Math.max(0.1, Math.min(0.98, Number((1 - avgUncertainty * 0.75).toFixed(2))));

  const targetChange =
    verdict === "BUY_NOW"
      ? maxSurgePct
      : verdict === "WAIT"
      ? maxDropPct
      : endChgPct;

  return {
    itemId,
    itemType,
    currency,
    currentPrice,
    verdict,
    recommendationReason: reason,
    confidenceScore,
    uncertaintyMetric: Number(avgUncertainty.toFixed(4)),
    predictedChangePercent: Number(targetChange.toFixed(1)),
    lowestPredictedPrice: Math.round(lowestPrice),
    lowestPriceDay: lowestDay,
    highestPredictedPrice: Math.round(highestPrice),
    highestPriceDay: highestDay,
    bestTimeToBookDays: bestWait,
    occupancyRate: Number(occRate.toFixed(4)),
    occupancyVelocity: Number(occVel.toFixed(4)),
    historicalTrendSlope: Number(trend.toFixed(4)),
    dailyForecasts,
  };
}

// ============================================================================
// Service API Bridge
// ============================================================================

export const pricePredictorService = {
  /**
   * Fetches price fluctuation forecast from FastAPI backend with seamless local fallback
   */
  async getForecast(params: ForecastRequestParams): Promise<PriceForecastData> {
    const { itemId, itemType = "flight" } = params;

    // 1. Try fetching from backend endpoint if itemId exists
    if (itemId) {
      try {
        const endpoint =
          itemType === "flight"
            ? `/forecast/flight/${itemId}`
            : `/forecast/hotel/${itemId}`;
        const res = await apiRequest<{ success: boolean; data: any }>(endpoint);
        if (res && res.data) {
          return mapBackendResponse(res.data);
        }
      } catch (err) {
        // Fallback to predict endpoint or client computation
        console.warn(`Direct forecast fetch for ${itemType} failed, falling back to predictive engine:`, err);
      }
    }

    // 2. Try POST /forecast/predict
    try {
      const res = await apiRequest<{ success: boolean; data: any }>("/forecast/predict", {
        method: "POST",
        body: JSON.stringify({
          item_id: itemId,
          item_type: itemType,
          current_price: params.currentPrice,
          currency: params.currency || "BDT",
          historical_prices: params.historicalPrices,
          total_capacity: params.totalCapacity,
          available_capacity: params.availableCapacity,
          occupancy_velocity: params.occupancyVelocity,
          days_to_departure: params.daysToDeparture,
        }),
      });
      if (res && res.data) {
        return mapBackendResponse(res.data);
      }
    } catch {
      // Offline fallback: use local ML pipeline
    }

    return predictPriceTrendClientSide(params);
  },

  /**
   * Saves or toggles price alert in AsyncStorage
   */
  async setPriceAlert(alert: Omit<PriceAlert, "id" | "createdAt">): Promise<PriceAlert> {
    const alerts = await this.getAlerts();
    const existingIdx = alerts.findIndex((a) => a.itemId === alert.itemId);

    const newAlert: PriceAlert = {
      ...alert,
      id: existingIdx >= 0 ? alerts[existingIdx].id : `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: existingIdx >= 0 ? alerts[existingIdx].createdAt : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      alerts[existingIdx] = newAlert;
    } else {
      alerts.push(newAlert);
    }

    await AsyncStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(alerts));
    return newAlert;
  },

  /**
   * Retrieves all saved price alerts
   */
  async getAlerts(): Promise<PriceAlert[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_ALERTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Checks whether price alert is active for an item
   */
  async hasAlert(itemId: string): Promise<boolean> {
    const alerts = await this.getAlerts();
    return alerts.some((a) => a.itemId === itemId && a.active);
  },

  /**
   * Removes or disables a price alert
   */
  async removeAlert(itemId: string): Promise<void> {
    const alerts = await this.getAlerts();
    const filtered = alerts.filter((a) => a.itemId !== itemId);
    await AsyncStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(filtered));
  },
};

function mapBackendResponse(raw: any): PriceForecastData {
  return {
    itemId: raw.item_id,
    itemType: raw.item_type || "flight",
    currency: raw.currency || "BDT",
    currentPrice: raw.current_price,
    verdict: raw.verdict as RecommendationVerdict,
    recommendationReason: raw.recommendation_reason,
    confidenceScore: raw.confidence_score,
    uncertaintyMetric: raw.uncertainty_metric,
    predictedChangePercent: raw.predicted_change_percent,
    lowestPredictedPrice: raw.lowest_predicted_price,
    lowestPriceDay: raw.lowest_price_day,
    highestPredictedPrice: raw.highest_predicted_price,
    highestPriceDay: raw.highest_price_day,
    bestTimeToBookDays: raw.best_time_to_book_days,
    occupancyRate: raw.occupancy_rate,
    occupancyVelocity: raw.occupancy_velocity,
    historicalTrendSlope: raw.historical_trend_slope,
    dailyForecasts: (raw.daily_forecasts || []).map((d: any) => ({
      day: d.day,
      date: d.date,
      predictedPrice: d.predicted_price,
      lowerBound: d.lower_bound,
      upperBound: d.upper_bound,
      uncertainty: d.uncertainty,
      predictedChangePercent: d.predicted_change_percent,
    })),
  };
}

// ============================================================================
// React Native UI Components (Built with React.createElement for TS Safety)
// ============================================================================

export interface PriceTrendBadgeProps {
  verdict: RecommendationVerdict;
  predictedChangePercent: number;
  size?: "sm" | "md" | "lg";
  variant?: "badge" | "pill" | "banner";
  showIcon?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * PriceTrendBadge Component
 * Highlights whether to "Book Now", "Wait", or "Stable" with predicted price delta.
 */
export const PriceTrendBadge: React.FC<PriceTrendBadgeProps> = ({
  verdict,
  predictedChangePercent,
  size = "md",
  variant = "badge",
  showIcon = true,
  onPress,
  style,
  testID = "price-trend-badge",
}) => {
  const isBuyNow = verdict === "BUY_NOW";
  const isWait = verdict === "WAIT";

  const config = React.useMemo(() => {
    if (isBuyNow) {
      return {
        bg: colors.status.danger.light,
        border: colors.status.danger.border,
        text: colors.status.danger.dark,
        iconName: "trending-up" as const,
        label: "Book Now",
        sublabel: `Surge expected (+${Math.abs(predictedChangePercent)}%)`,
      };
    }
    if (isWait) {
      return {
        bg: colors.status.success.light,
        border: colors.status.success.border,
        text: colors.status.success.dark,
        iconName: "trending-down" as const,
        label: "Wait for Drop",
        sublabel: `-${Math.abs(predictedChangePercent)}% drop likely`,
      };
    }
    return {
      bg: colors.status.info.light,
      border: colors.status.info.border,
      text: colors.status.info.dark,
      iconName: "swap-horizontal" as const,
      label: "Price Stable",
      sublabel: `±${Math.abs(predictedChangePercent)}% variation`,
    };
  }, [isBuyNow, isWait, predictedChangePercent]);

  const handlePress = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress();
  }, [onPress]);

  const sizeStyles = {
    sm: { paddingVertical: 2, paddingHorizontal: 6, fontSize: 11, iconSize: 12 },
    md: { paddingVertical: 4, paddingHorizontal: 10, fontSize: 12, iconSize: 14 },
    lg: { paddingVertical: 6, paddingHorizontal: 14, fontSize: 14, iconSize: 16 },
  }[size];

  const content = React.createElement(
    View,
    {
      style: [
        styles.badgeContainer,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderRadius: variant === "pill" ? 999 : 8,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ],
      testID,
    },
    showIcon
      ? React.createElement(Ionicons, {
          name: config.iconName,
          size: sizeStyles.iconSize,
          color: config.text,
          style: { marginRight: 4 },
        })
      : null,
    React.createElement(
      Text,
      {
        style: [
          styles.badgeLabel,
          {
            color: config.text,
            fontSize: sizeStyles.fontSize,
          },
        ],
      },
      `${config.label} (${config.sublabel})`
    )
  );

  if (onPress) {
    return React.createElement(
      TouchableOpacity,
      {
        activeOpacity: 0.8,
        onPress: handlePress,
      },
      content
    );
  }

  return content;
};

// ============================================================================
// PriceAlertTrigger Component
// ============================================================================

export interface PriceAlertTriggerProps {
  itemId: string;
  itemType: "flight" | "hotel";
  currentPrice: number;
  currency?: string;
  onAlertChange?: (isActive: boolean, targetPrice: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * PriceAlertTrigger Component
 * Interactive trigger to set up automated price drop notifications for flights & hotels.
 */
export const PriceAlertTrigger: React.FC<PriceAlertTriggerProps> = ({
  itemId,
  itemType,
  currentPrice,
  currency = "BDT",
  onAlertChange,
  style,
  testID = "price-alert-trigger",
}) => {
  const [isActive, setIsActive] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [dropPercent, setDropPercent] = React.useState(5);

  React.useEffect(() => {
    pricePredictorService.hasAlert(itemId).then((active) => {
      setIsActive(active);
      setLoading(false);
    });
  }, [itemId]);

  const targetPrice = Math.round(currentPrice * (1 - dropPercent / 100));

  const handleToggle = React.useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) {
      // Remove alert
      await pricePredictorService.removeAlert(itemId);
      setIsActive(false);
      if (onAlertChange) onAlertChange(false, currentPrice);
    } else {
      // Open threshold configuration modal
      setModalVisible(true);
    }
  }, [isActive, itemId, currentPrice, onAlertChange]);

  const handleConfirmAlert = React.useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await pricePredictorService.setPriceAlert({
      itemId,
      itemType,
      currentPrice,
      targetPrice,
      thresholdPercent: dropPercent,
      active: true,
    });
    setIsActive(true);
    setModalVisible(false);
    if (onAlertChange) onAlertChange(true, targetPrice);
    Alert.alert(
      "Price Alert Activated",
      `We'll notify you as soon as this ${itemType} drops to ${targetPrice.toLocaleString()} ${currency} or below.`
    );
  }, [itemId, itemType, currentPrice, targetPrice, dropPercent, currency, onAlertChange]);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      TouchableOpacity,
      {
        activeOpacity: 0.8,
        onPress: handleToggle,
        style: [
          styles.alertTriggerButton,
          {
            backgroundColor: isActive ? colors.primary[50] : colors.surface.subtle,
            borderColor: isActive ? colors.primary[500] : colors.border.default,
          },
          style,
        ],
        testID,
      },
      loading
        ? React.createElement(ActivityIndicator, { size: "small", color: colors.primary[500] })
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(Ionicons, {
              name: isActive ? "notifications" : "notifications-outline",
              size: 16,
              color: isActive ? colors.primary[600] : colors.text.secondary,
              style: { marginRight: 6 },
            }),
            React.createElement(
              Text,
              {
                style: [
                  styles.alertTriggerText,
                  { color: isActive ? colors.primary[700] : colors.text.primary },
                ],
              },
              isActive ? "Price Alert Active" : "Set Price Alert"
            )
          )
    ),

    // Modal for selecting price drop threshold
    React.createElement(
      Modal,
      {
        visible: modalVisible,
        transparent: true,
        animationType: "fade",
        onRequestClose: () => setModalVisible(false),
      },
      React.createElement(
        View,
        { style: styles.modalBackdrop },
        React.createElement(
          View,
          { style: styles.modalCard },
          React.createElement(
            View,
            { style: styles.modalHeader },
            React.createElement(Ionicons, {
              name: "notifications-circle",
              size: 32,
              color: colors.primary[500],
            }),
            React.createElement(
              Text,
              { style: styles.modalTitle },
              `Track ${itemType === "flight" ? "Flight Fare" : "Room Rate"}`
            )
          ),
          React.createElement(
            Text,
            { style: styles.modalDescription },
            `Current price: ${currentPrice.toLocaleString()} ${currency}. Select when you'd like to be alerted:`
          ),

          // Threshold choices: 5%, 10%, 15%
          React.createElement(
            View,
            { style: styles.pillRow },
            [5, 10, 15].map((pct) =>
              React.createElement(
                TouchableOpacity,
                {
                  key: pct,
                  style: [
                    styles.thresholdPill,
                    dropPercent === pct && styles.thresholdPillActive,
                  ],
                  onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDropPercent(pct);
                  },
                },
                React.createElement(
                  Text,
                  {
                    style: [
                      styles.thresholdPillText,
                      dropPercent === pct && styles.thresholdPillTextActive,
                    ],
                  },
                  `-${pct}% (${Math.round(currentPrice * (1 - pct / 100)).toLocaleString()})`
                )
              )
            )
          ),

          // Confirm and Cancel buttons
          React.createElement(
            View,
            { style: styles.modalActions },
            React.createElement(
              TouchableOpacity,
              {
                style: styles.cancelBtn,
                onPress: () => setModalVisible(false),
              },
              React.createElement(Text, { style: styles.cancelBtnText }, "Cancel")
            ),
            React.createElement(
              TouchableOpacity,
              {
                style: styles.confirmBtn,
                onPress: handleConfirmAlert,
              },
              React.createElement(Text, { style: styles.confirmBtnText }, "Activate Alert")
            )
          )
        )
      )
    )
  );
};

// ============================================================================
// PriceForecastCard Component
// ============================================================================

export interface PriceForecastCardProps {
  forecast: PriceForecastData;
  onAlertChange?: (isActive: boolean, targetPrice: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * PriceForecastCard Component
 * Embeds PriceTrendBadge, confidence intervals, uncertainty score, and PriceAlertTrigger.
 */
export const PriceForecastCard: React.FC<PriceForecastCardProps> = ({
  forecast,
  onAlertChange,
  style,
  testID = "price-forecast-card",
}) => {
  const {
    currentPrice,
    currency,
    verdict,
    recommendationReason,
    confidenceScore,
    predictedChangePercent,
    lowestPredictedPrice,
    highestPredictedPrice,
    itemId,
    itemType,
  } = forecast;

  return React.createElement(
    View,
    {
      style: [styles.cardContainer, style],
      testID,
    },
    // Top Row: Badge and Recommendation
    React.createElement(
      View,
      { style: styles.cardHeader },
      React.createElement(PriceTrendBadge, {
        verdict,
        predictedChangePercent,
        size: "md",
        variant: "pill",
      }),
      React.createElement(
        View,
        { style: styles.confidenceBadge },
        React.createElement(Ionicons, {
          name: "shield-checkmark",
          size: 13,
          color: colors.status.neutral.text,
          style: { marginRight: 3 },
        }),
        React.createElement(
          Text,
          { style: styles.confidenceText },
          `${Math.round(confidenceScore * 100)}% Confidence`
        )
      )
    ),

    // Rationale text
    React.createElement(
      Text,
      { style: styles.reasonText },
      recommendationReason
    ),

    // Bounds overview
    React.createElement(
      View,
      { style: styles.boundsRow },
      React.createElement(
        View,
        { style: styles.boundItem },
        React.createElement(Text, { style: styles.boundLabel }, "Lowest Expected (14d)"),
        React.createElement(
          Text,
          { style: [styles.boundValue, { color: colors.status.success.dark }] },
          `${lowestPredictedPrice.toLocaleString()} ${currency}`
        )
      ),
      React.createElement(View, { style: styles.boundDivider }),
      React.createElement(
        View,
        { style: styles.boundItem },
        React.createElement(Text, { style: styles.boundLabel }, "Peak Upper Bound"),
        React.createElement(
          Text,
          { style: [styles.boundValue, { color: colors.status.danger.dark }] },
          `${highestPredictedPrice.toLocaleString()} ${currency}`
        )
      )
    ),

    // Price alert trigger
    itemId
      ? React.createElement(
          View,
          { style: styles.cardFooter },
          React.createElement(PriceAlertTrigger, {
            itemId,
            itemType: itemType === "hotel" ? "hotel" : "flight",
            currentPrice,
            currency,
            onAlertChange,
          })
        )
      : null
  );
};

// ============================================================================
// React Hook: usePriceForecast
// ============================================================================

export function usePriceForecast(params: ForecastRequestParams) {
  const [forecast, setForecast] = React.useState<PriceForecastData | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchForecast = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await pricePredictorService.getForecast(params);
      setForecast(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load price forecast");
      // Instant client-side mathematical fallback
      setForecast(predictPriceTrendClientSide(params));
    } finally {
      setIsLoading(false);
    }
  }, [
    params.itemId,
    params.itemType,
    params.currentPrice,
    params.occupancyVelocity,
    params.daysToDeparture,
  ]);

  React.useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return {
    forecast,
    isLoading,
    error,
    refresh: fetchForecast,
  };
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeLabel: {
    fontWeight: "700",
  },
  alertTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  alertTriggerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardContainer: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.status.neutral.text,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  boundsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface.subtle,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  boundItem: {
    flex: 1,
    alignItems: "center",
  },
  boundDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.default,
  },
  boundLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 2,
  },
  boundValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface.base,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text.primary,
    marginLeft: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  thresholdPill: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: "center",
    backgroundColor: colors.surface.subtle,
  },
  thresholdPillActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  thresholdPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  thresholdPillTextActive: {
    color: colors.primary[700],
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: colors.primary.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
});
