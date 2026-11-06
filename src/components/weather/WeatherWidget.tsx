import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  weatherService,
  ComprehensiveWeatherData,
  GPSCoordinates,
  WeatherCondition,
  DailyForecastItem,
  HourlyForecastItem,
  WeatherAlert,
  PackingRecommendation,
} from "../../services/weather/weatherService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface WeatherWidgetProps {
  /** Location name string (e.g., "Cox's Bazar", "Sylhet") or GPS coordinates */
  location: string | GPSCoordinates;
  /** Display presentation mode: 'card' (rich default), 'compact' (sleek ribbon), 'banner' (alert strip) */
  variant?: "card" | "compact" | "banner";
  /** Optional custom container style */
  style?: ViewStyle;
  /** Callback when alert or widget is pressed */
  onPress?: () => void;
  /** Optional preloaded weather data to avoid extra fetch */
  initialData?: ComprehensiveWeatherData | null;
  /** Whether to show the 7-day and 24-hour forecast tabs in card variant */
  showForecastTabs?: boolean;
  /** Optional override for title */
  customTitle?: string;
}

// Dynamic gradient themes for weather conditions
const GRADIENT_THEMES: Record<WeatherCondition, [string, string, string]> = {
  Thunderstorm: ["#0B132B", "#1C2541", "#3A0CA3"], // Deep electric indigo/navy
  "Golden Hour": ["#7C2D12", "#C2410C", "#F59E0B"], // Radiant golden amber
  Drizzle: ["#0C4A6E", "#0369A1", "#0284C7"], // Soft misty cyan
  Rain: ["#0F172A", "#1E293B", "#0369A1"], // Slate stormy blue
  "Heavy Rain": ["#091E3A", "#172554", "#1E3A8A"], // Deep maritime blue
  Clear: ["#0284C7", "#0EA5E9", "#38BDF8"], // Azure sky
  "Partly Cloudy": ["#1E293B", "#334155", "#0284C7"], // Slate azure
  Overcast: ["#334155", "#475569", "#64748B"], // Neutral cloud
  Fog: ["#1E293B", "#475569", "#94A3B8"], // Misty overcast
  Snow: ["#1E293B", "#3B82F6", "#93C5FD"], // Frosty blue
  Windy: ["#0F172A", "#1E293B", "#0D9488"], // Ocean teal
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  location,
  variant = "card",
  style,
  onPress,
  initialData = null,
  showForecastTabs = true,
  customTitle,
}) => {
  const [data, setData] = useState<ComprehensiveWeatherData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"24h" | "7d">("24h");
  const [alertsExpanded, setAlertsExpanded] = useState<boolean>(false);
  const [packingExpanded, setPackingExpanded] = useState<boolean>(false);

  // Animation values for subtle alive pulsing
  const isNativeDriver = Platform.OS !== "web" && process.env.NODE_ENV !== "test";
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Fetch meteorological data
  const loadWeatherData = async (force: boolean = false) => {
    try {
      if (!data) setLoading(true);
      setError(null);
      const res = await weatherService.getComprehensiveWeather(location, force);
      setData(res);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: isNativeDriver,
      }).start();
    } catch (err: any) {
      console.warn("[WeatherWidget] Failed to load weather data:", err);
      setError("Weather unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      loadWeatherData();
    }
  }, [typeof location === "string" ? location : `${location.latitude}_${location.longitude}`]);

  // Subtle breathing loop for weather card
  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [glowAnim, isNativeDriver]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadWeatherData(true);
  };

  // Determine gradient palette based on condition
  const condition = data?.current.condition || "Partly Cloudy";
  const gradientColors = GRADIENT_THEMES[condition] || GRADIENT_THEMES["Partly Cloudy"];

  // ─────────────────────────────────────────────────────────────────────────
  // COMPACT VARIANT (Sleek Translucent Ribbon)
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === "compact") {
    if (loading && !data) {
      return (
        <View style={[styles.compactContainer, styles.skeletonGlass, style]}>
          <ActivityIndicator size="small" color="#93C5FD" />
          <Text style={styles.compactLoadingText}>Loading live weather...</Text>
        </View>
      );
    }

    if (!data) return null;

    const { current, packingSummary } = data;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.selectionAsync();
          if (onPress) onPress();
        }}
        style={[styles.compactWrapper, style]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactRow}>
            {/* Condition Icon */}
            <View style={styles.compactIconWrap}>
              <Ionicons name={current.iconName} size={22} color="#FFFFFF" />
            </View>

            {/* Temp & Location */}
            <View style={styles.compactInfo}>
              <View style={styles.compactTitleRow}>
                <Text style={styles.compactTemp}>{current.temperature}°C</Text>
                <View style={styles.compactDot} />
                <Text style={styles.compactCondition}>{current.condition}</Text>
                {data.cycloneSignal && (
                  <View style={styles.compactSignalBadge}>
                    <Text style={styles.compactSignalBadgeText}>Signal {data.cycloneSignal.signalNumber}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.compactPacking} numberOfLines={1}>
                {packingSummary}
              </Text>
            </View>

            {/* Metrics Chips */}
            <View style={styles.compactPills}>
              <View style={[styles.microPill, { backgroundColor: current.aqiColor + "33" }]}>
                <Text style={[styles.microPillText, { color: current.aqiColor }]}>AQI {current.aqi}</Text>
              </View>
              <View style={styles.microPill}>
                <Text style={styles.microPillText}>UV {Math.round(current.uvIndex)}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BANNER VARIANT (Dedicated Alert Bar)
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === "banner") {
    if (!data || (!data.alerts.length && !data.cycloneSignal)) return null;

    const topAlert = data.alerts[0];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setAlertsExpanded(!alertsExpanded);
          if (onPress) onPress();
        }}
        style={[styles.bannerContainer, style]}
      >
        <LinearGradient
          colors={
            data.cycloneSignal
              ? ["#7F1D1D", "#991B1B", "#450A0A"]
              : ["#1E293B", "#334155", "#0F172A"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconBadge}>
              <Ionicons
                name={data.cycloneSignal ? "warning" : "alert-circle"}
                size={20}
                color="#FEF08A"
              />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerHeadline} numberOfLines={1}>
                {data.cycloneSignal
                  ? `BMD: ${data.cycloneSignal.signalName} (${data.cycloneSignal.coastalZone})`
                  : topAlert.headline}
              </Text>
              <Text style={styles.bannerSub} numberOfLines={alertsExpanded ? 3 : 1}>
                {data.cycloneSignal ? data.cycloneSignal.publicAdvisory : topAlert.description}
              </Text>
            </View>
            <Ionicons
              name={alertsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="rgba(255, 255, 255, 0.7)"
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CARD VARIANT (Full Translucent Weather Dashboard)
  // ─────────────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <View style={[styles.cardContainer, styles.skeletonGlass, style]}>
        <View style={styles.skeletonCenter}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.skeletonTitle}>Connecting to Meteorological Network...</Text>
          <Text style={styles.skeletonSub}>Analyzing real-time Doppler radar, UV index & AQI</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.cardContainer, styles.errorGlass, style]}>
        <Ionicons name="cloud-offline-outline" size={32} color="#94A3B8" />
        <Text style={styles.errorText}>Meteorological sensors momentarily unavailable</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
          <Text style={styles.retryBtnText}>Retry Forecast</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { current, daily, hourly, alerts, cycloneSignal, packingRecommendations, packingSummary } = data;
  const isGoldenHour = current.isGoldenHour;
  const isThunderstorm = current.condition === "Thunderstorm";
  const isDrizzle = current.condition === "Drizzle";

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }, style]}>
      {/* Translucent Animated Frosted Glass Gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Ambient Glow Aura */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              opacity: glowAnim,
              backgroundColor: isGoldenHour
                ? "rgba(245, 158, 11, 0.25)"
                : isThunderstorm
                ? "rgba(139, 92, 246, 0.25)"
                : "rgba(56, 189, 248, 0.2)",
            },
          ]}
        />

        {/* ─── Top Header: Location, Refresh & DataSource ──────────────── */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.locBadge}>
              <Ionicons name="location-sharp" size={14} color="#67E8F9" />
              <Text style={styles.locName} numberOfLines={1}>
                {customTitle || data.locationName}
              </Text>
              {data.country ? <Text style={styles.countryName}>, {data.country}</Text> : null}
            </View>
            <View style={styles.statusRow}>
              {data.dataSource === "cache" && (
                <View style={styles.cachePill}>
                  <Text style={styles.cachePillText}>Cached · 1h</Text>
                </View>
              )}
              {data.dataSource === "offline_heuristic" && (
                <View style={[styles.cachePill, { backgroundColor: "rgba(245, 158, 11, 0.2)" }]}>
                  <Text style={[styles.cachePillText, { color: "#FDE68A" }]}>Offline Mode</Text>
                </View>
              )}
              {isGoldenHour && (
                <View style={styles.goldenPill}>
                  <Ionicons name="sparkles" size={11} color="#FEF08A" />
                  <Text style={styles.goldenPillText}>Golden Hour</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} hitSlop={10}>
            <Ionicons name="sync-outline" size={16} color="rgba(255, 255, 255, 0.85)" />
          </TouchableOpacity>
        </View>

        {/* ─── Primary Meteorological Display ─────────────────────────── */}
        <View style={styles.heroWeatherRow}>
          <View style={styles.heroTempCol}>
            <View style={styles.tempLargeRow}>
              <Text style={styles.tempLarge}>{current.temperature}</Text>
              <Text style={styles.tempUnit}>°C</Text>
            </View>
            <Text style={styles.feelsLikeText}>
              Feels like {current.apparentTemperature}°C · H: {daily[0]?.maxTemp ?? current.temperature}° L: {daily[0]?.minTemp ?? current.temperature - 5}°
            </Text>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionText}>{current.condition}</Text>
            </View>
          </View>

          {/* Dynamic Weather Iconography */}
          <View style={styles.heroIconCol}>
            <View
              style={[
                styles.iconGlowWrapper,
                isThunderstorm && styles.thunderGlow,
                isGoldenHour && styles.goldenGlow,
                isDrizzle && styles.drizzleGlow,
              ]}
            >
              <Ionicons name={current.iconName} size={58} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* ─── Key Meteorological Metrics Ribbon (UV, AQI, Rain, Humidity) */}
        <View style={styles.metricsGrid}>
          {/* UV Index Pill */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Ionicons name="sunny-outline" size={15} color="#FBBF24" />
              <Text style={styles.metricLabel}>UV Index</Text>
            </View>
            <Text style={styles.metricValue}>{current.uvIndex}</Text>
            <View style={[styles.severityDotRow]}>
              <View
                style={[
                  styles.metricDot,
                  {
                    backgroundColor:
                      current.uvCategory === "Low"
                        ? "#10B981"
                        : current.uvCategory === "Moderate"
                        ? "#F59E0B"
                        : current.uvCategory === "High"
                        ? "#EA580C"
                        : "#EF4444",
                  },
                ]}
              />
              <Text style={styles.metricSub}>{current.uvCategory}</Text>
            </View>
          </View>

          {/* AQI Pill */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Ionicons name="leaf-outline" size={15} color={current.aqiColor} />
              <Text style={styles.metricLabel}>Air Quality</Text>
            </View>
            <Text style={[styles.metricValue, { color: current.aqiColor }]}>{current.aqi}</Text>
            <View style={styles.severityDotRow}>
              <View style={[styles.metricDot, { backgroundColor: current.aqiColor }]} />
              <Text style={styles.metricSub} numberOfLines={1}>
                {current.aqiCategory === "Unhealthy for Sensitive Groups" ? "Sensitive" : current.aqiCategory}
              </Text>
            </View>
          </View>

          {/* Precipitation Probability */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Ionicons name="rainy-outline" size={15} color="#38BDF8" />
              <Text style={styles.metricLabel}>Precipitation</Text>
            </View>
            <Text style={styles.metricValue}>{current.precipitationProbability}%</Text>
            <Text style={styles.metricSub}>{current.precipitation > 0 ? `${current.precipitation} mm` : "Nil"}</Text>
          </View>

          {/* Humidity & Wind */}
          <View style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <Ionicons name="water-outline" size={15} color="#60A5FA" />
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>
            <Text style={styles.metricValue}>{current.humidity}%</Text>
            <Text style={styles.metricSub}>{current.windSpeed} km/h wind</Text>
          </View>
        </View>

        {/* ─── BMD Cyclone Signal or Severe Risk Alerts Banner ─────────── */}
        {cycloneSignal && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setAlertsExpanded(!alertsExpanded);
            }}
            style={[styles.cycloneAlertCard, { borderColor: cycloneSignal.color }]}
          >
            <View style={styles.cycloneAlertHeader}>
              <View style={[styles.signalNumCircle, { backgroundColor: cycloneSignal.color }]}>
                <Text style={styles.signalNumText}>{cycloneSignal.signalNumber}</Text>
              </View>
              <View style={styles.cycloneTitleWrap}>
                <Text style={styles.cycloneSignalName}>{cycloneSignal.signalName}</Text>
                <Text style={styles.cycloneZone}>{cycloneSignal.coastalZone}</Text>
              </View>
              <Ionicons
                name={alertsExpanded ? "chevron-up-circle" : "alert-circle"}
                size={22}
                color="#FDE047"
              />
            </View>
            <Text style={styles.cycloneAdvisory}>{cycloneSignal.publicAdvisory}</Text>
            {alertsExpanded && (
              <View style={styles.cycloneExpandedSection}>
                <Text style={styles.cycloneMaritimeText}>
                  ⚓ <Text style={{ fontWeight: "700" }}>Maritime Advisory:</Text> {cycloneSignal.maritimeAdvisory}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Other Active Alerts (Heavy Rain, Heatwave, AQI) */}
        {!cycloneSignal && alerts.length > 0 && (
          <View style={styles.alertRibbon}>
            <Ionicons name="warning-outline" size={16} color="#FBBF24" />
            <Text style={styles.alertRibbonText} numberOfLines={1}>
              {alerts[0].headline}: {alerts[0].recommendedAction}
            </Text>
          </View>
        )}

        {/* ─── Packing Recommendations Section ────────────────────────── */}
        <View style={styles.packingSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setPackingExpanded(!packingExpanded);
            }}
            style={styles.packingHeader}
          >
            <View style={styles.packingTitleRow}>
              <Ionicons name="bag-handle-outline" size={16} color="#FBBF24" />
              <Text style={styles.packingTitle}>Travel Packing Guide</Text>
            </View>
            <View style={styles.packingSummaryPill}>
              <Text style={styles.packingSummaryText} numberOfLines={1}>
                {packingSummary}
              </Text>
              <Ionicons
                name={packingExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color="rgba(255, 255, 255, 0.7)"
              />
            </View>
          </TouchableOpacity>

          {packingExpanded && (
            <View style={styles.packingListContainer}>
              {packingRecommendations.map((rec) => (
                <View key={rec.id} style={styles.packingItemRow}>
                  <View
                    style={[
                      styles.packingIconBox,
                      rec.urgency === "essential" && styles.packingIconBoxEssential,
                    ]}
                  >
                    <Ionicons name={rec.icon} size={15} color="#FFFFFF" />
                  </View>
                  <View style={styles.packingItemTextWrap}>
                    <View style={styles.packingItemTop}>
                      <Text style={styles.packingItemName}>{rec.item}</Text>
                      {rec.urgency === "essential" && (
                        <View style={styles.essentialPill}>
                          <Text style={styles.essentialPillText}>Must Pack</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.packingItemReason}>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── 7-Day & 24-Hour Forecast Tabs ───────────────────────────── */}
        {showForecastTabs && (
          <View style={styles.forecastSection}>
            <View style={styles.forecastTabHeader}>
              <TouchableOpacity
                style={[styles.forecastTabBtn, activeTab === "24h" && styles.forecastTabBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("24h");
                }}
              >
                <Text
                  style={[
                    styles.forecastTabBtnText,
                    activeTab === "24h" && styles.forecastTabBtnTextActive,
                  ]}
                >
                  Hourly Forecast (24h)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.forecastTabBtn, activeTab === "7d" && styles.forecastTabBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab("7d");
                }}
              >
                <Text
                  style={[
                    styles.forecastTabBtnText,
                    activeTab === "7d" && styles.forecastTabBtnTextActive,
                  ]}
                >
                  7-Day Outlook
                </Text>
              </TouchableOpacity>
            </View>

            {/* 24-Hour Hourly Scroller */}
            {activeTab === "24h" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyScrollContent}
              >
                {hourly.slice(0, 16).map((item, idx) => (
                  <View key={idx} style={styles.hourlyItemCard}>
                    <Text style={styles.hourlyTimeText}>{idx === 0 ? "Now" : item.timeFormatted}</Text>
                    <View style={styles.hourlyIconWrap}>
                      <Ionicons name={item.iconName} size={22} color="#FFFFFF" />
                    </View>
                    <Text style={styles.hourlyTempText}>{item.temperature}°</Text>
                    {item.precipitationProbability > 0 && (
                      <View style={styles.hourlyRainRow}>
                        <Ionicons name="water" size={10} color="#38BDF8" />
                        <Text style={styles.hourlyRainText}>{item.precipitationProbability}%</Text>
                      </View>
                    )}
                    {item.uvIndex > 0 && (
                      <Text style={styles.hourlyUvText}>UV {Math.round(item.uvIndex)}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* 7-Day Daily List */}
            {activeTab === "7d" && (
              <View style={styles.dailyContainer}>
                {daily.map((item, idx) => (
                  <View key={idx} style={styles.dailyRow}>
                    <Text style={styles.dailyDayName}>{item.dayName}</Text>
                    <View style={styles.dailyIconRow}>
                      <Ionicons name={item.iconName} size={18} color="#FFFFFF" />
                      {item.precipitationProbability >= 20 && (
                        <Text style={styles.dailyRainPct}>{item.precipitationProbability}%</Text>
                      )}
                    </View>

                    {/* Progress Bar of Min/Max Temp */}
                    <View style={styles.dailyTempBarWrap}>
                      <Text style={styles.dailyMinTemp}>{item.minTemp}°</Text>
                      <View style={styles.dailyTempTrack}>
                        <View
                          style={[
                            styles.dailyTempFill,
                            {
                              width: `${Math.min(100, Math.max(25, (item.maxTemp - item.minTemp) * 10))}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.dailyMaxTemp}>{item.maxTemp}°</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Card Container
  cardContainer: {
    borderRadius: 22,
    overflow: "hidden",
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardGradient: {
    padding: 16,
    borderRadius: 22,
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },

  // Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  locBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  locName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  countryName: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  cachePill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cachePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  goldenPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(254, 240, 138, 0.4)",
  },
  goldenPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FEF08A",
  },
  refreshBtn: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
  },

  // Hero Row
  heroWeatherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  heroTempCol: {
    flex: 1,
  },
  tempLargeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tempLarge: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1.5,
  },
  tempUnit: {
    fontSize: 22,
    fontWeight: "600",
    color: "#67E8F9",
    marginTop: 6,
    marginLeft: 2,
  },
  feelsLikeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: -2,
  },
  conditionRow: {
    marginTop: 4,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Dynamic Iconography
  heroIconCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 6,
  },
  iconGlowWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  thunderGlow: {
    backgroundColor: "rgba(139, 92, 246, 0.3)",
    borderColor: "rgba(216, 180, 254, 0.6)",
  },
  goldenGlow: {
    backgroundColor: "rgba(245, 158, 11, 0.35)",
    borderColor: "rgba(254, 240, 138, 0.7)",
  },
  drizzleGlow: {
    backgroundColor: "rgba(2, 132, 199, 0.3)",
    borderColor: "rgba(125, 211, 252, 0.5)",
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 16,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
  },
  metricCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginVertical: 1,
  },
  severityDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricSub: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
  },

  // BMD Coastal Cyclone Signal Card
  cycloneAlertCard: {
    backgroundColor: "rgba(153, 27, 27, 0.45)",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 12,
  },
  cycloneAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  signalNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  signalNumText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  cycloneTitleWrap: {
    flex: 1,
  },
  cycloneSignalName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FEF08A",
    textTransform: "uppercase",
  },
  cycloneZone: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
  },
  cycloneAdvisory: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 6,
    lineHeight: 16,
  },
  cycloneExpandedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  cycloneMaritimeText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 15,
  },

  // Alert Ribbon
  alertRibbon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  alertRibbonText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#FEF08A",
  },

  // Packing Section
  packingSection: {
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  packingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  packingTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  packingSummaryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: SCREEN_WIDTH * 0.52,
    gap: 4,
  },
  packingSummaryText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  packingListContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 8,
  },
  packingItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  packingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  packingIconBoxEssential: {
    backgroundColor: "rgba(239, 68, 68, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.5)",
  },
  packingItemTextWrap: {
    flex: 1,
  },
  packingItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packingItemName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  essentialPill: {
    backgroundColor: "rgba(239, 68, 68, 0.35)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  essentialPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FCA5A5",
  },
  packingItemReason: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 1,
  },

  // Forecast Tabs
  forecastSection: {
    marginTop: 14,
  },
  forecastTabHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  forecastTabBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: "center",
    borderRadius: 8,
  },
  forecastTabBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  forecastTabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.65)",
  },
  forecastTabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Hourly Carousel
  hourlyScrollContent: {
    paddingVertical: 4,
    gap: 8,
  },
  hourlyItemCard: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 62,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  hourlyTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  hourlyIconWrap: {
    marginVertical: 6,
  },
  hourlyTempText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  hourlyRainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  hourlyRainText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#67E8F9",
  },
  hourlyUvText: {
    fontSize: 9,
    color: "#FEF08A",
    marginTop: 2,
  },

  // Daily Rows
  dailyContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 6,
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  dailyDayName: {
    width: 46,
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dailyIconRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 52,
    gap: 4,
  },
  dailyRainPct: {
    fontSize: 10,
    color: "#67E8F9",
    fontWeight: "600",
  },
  dailyTempBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  dailyMinTemp: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.65)",
    width: 26,
    textAlign: "right",
  },
  dailyTempTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  dailyTempFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 2,
  },
  dailyMaxTemp: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    width: 26,
  },

  // Compact Variant
  compactWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  compactGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactIconWrap: {
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactTemp: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  compactDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    marginHorizontal: 5,
  },
  compactCondition: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  compactSignalBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  compactSignalBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  compactPacking: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  compactPills: {
    flexDirection: "row",
    gap: 4,
  },
  microPill: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  microPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  compactContainer: {
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactLoadingText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },

  // Banner Variant
  bannerContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 6,
  },
  bannerGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerIconBadge: {
    marginRight: 8,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerHeadline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bannerSub: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },

  // Skeletons & Errors
  skeletonGlass: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonCenter: {
    alignItems: "center",
    padding: 20,
  },
  skeletonTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 10,
  },
  skeletonSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  errorGlass: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#94A3B8",
    marginVertical: 8,
  },
  retryBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#38BDF8",
  },
});
