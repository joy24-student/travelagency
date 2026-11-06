import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// ─────────────────────────────────────────────────────────────────────────────
// METEOROLOGICAL DATA CONTRACTS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WeatherCondition =
  | "Clear"
  | "Golden Hour"
  | "Partly Cloudy"
  | "Overcast"
  | "Fog"
  | "Drizzle"
  | "Rain"
  | "Heavy Rain"
  | "Thunderstorm"
  | "Snow"
  | "Windy";

export type UVSeverity = "Low" | "Moderate" | "High" | "Very High" | "Extreme";

export type AQISeverity =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
  isCoastal?: boolean;
}

export interface CurrentWeather {
  temperature: number; // °C
  apparentTemperature: number; // Feels like °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGusts?: number; // km/h
  precipitation: number; // mm
  precipitationProbability: number; // %
  weatherCode: number; // WMO code
  condition: WeatherCondition;
  iconName: keyof typeof Ionicons.glyphMap;
  isDay: boolean;
  isGoldenHour: boolean;
  uvIndex: number;
  uvCategory: UVSeverity;
  aqi: number; // US AQI standard (0-500)
  aqiCategory: AQISeverity;
  aqiColor: string;
  pm25?: number; // µg/m³
  pm10?: number; // µg/m³
  timestamp: string;
}

export interface HourlyForecastItem {
  time: string; // ISO string
  timeFormatted: string; // '2 PM'
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  condition: WeatherCondition;
  iconName: keyof typeof Ionicons.glyphMap;
  uvIndex: number;
  windSpeed: number;
  aqi: number;
  isDay: boolean;
}

export interface DailyForecastItem {
  date: string; // 'YYYY-MM-DD'
  dayName: string; // 'Today', 'Mon', 'Tue'
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  condition: WeatherCondition;
  iconName: keyof typeof Ionicons.glyphMap;
  precipitationProbability: number;
  precipitationSum: number;
  maxWindSpeed: number;
  maxUvIndex: number;
  avgAqi: number;
  summary: string;
}

export interface CoastalCycloneSignal {
  isApplicable: boolean;
  signalNumber: number; // 1 to 10
  signalName: string; // e.g. "Great Danger Signal No. 10"
  warningLevel: "Cautionary" | "Warning" | "Danger" | "Great Danger";
  coastalZone: string; // e.g. "Chittagong, Cox's Bazar & Saint Martin Ports"
  maritimeAdvisory: string; // "All fishing trawlers and boats must remain in immediate shelter."
  publicAdvisory: string; // "Move to designated cyclone shelters immediately."
  color: string;
}

export interface WeatherAlert {
  id: string;
  type: "cyclone" | "heavy_rainfall" | "heatwave" | "air_quality" | "uv_radiation" | "thunderstorm";
  severity: "advisory" | "watch" | "warning" | "emergency";
  headline: string;
  description: string;
  recommendedAction: string;
  cycloneSignal?: CoastalCycloneSignal;
  issuedAt: string;
  color: string;
}

export interface PackingRecommendation {
  id: string;
  item: string;
  category: "clothing" | "gear" | "health" | "electronics";
  reason: string;
  icon: keyof typeof Ionicons.glyphMap;
  urgency: "essential" | "recommended" | "optional";
}

export interface ComprehensiveWeatherData {
  coordinates: GPSCoordinates;
  locationName: string;
  country: string;
  timezone: string;
  current: CurrentWeather;
  hourly: HourlyForecastItem[]; // 24-48 hours
  daily: DailyForecastItem[]; // 7 days
  alerts: WeatherAlert[];
  cycloneSignal: CoastalCycloneSignal | null;
  packingRecommendations: PackingRecommendation[];
  packingSummary: string; // e.g. "Pack an umbrella today · Wear SPF 50+ sunscreen"
  cachedAt: string;
  isStale: boolean;
  dataSource: "live_meteo" | "cache" | "offline_heuristic";
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-POPULATED GEODETIC COORDINATE REGISTRY (BANGLADESH & WORLD DESTINATIONS)
// ─────────────────────────────────────────────────────────────────────────────

const PRESET_COORDINATES: Record<string, GPSCoordinates> = {
  // Bangladesh Coastal & Maritime Ports
  "cox's bazar": { latitude: 21.4272, longitude: 92.0058, name: "Cox's Bazar", country: "Bangladesh", isCoastal: true },
  "coxs bazar": { latitude: 21.4272, longitude: 92.0058, name: "Cox's Bazar", country: "Bangladesh", isCoastal: true },
  "cox bazar": { latitude: 21.4272, longitude: 92.0058, name: "Cox's Bazar", country: "Bangladesh", isCoastal: true },
  "saint martin": { latitude: 20.6277, longitude: 92.3228, name: "Saint Martin", country: "Bangladesh", isCoastal: true },
  "st martin": { latitude: 20.6277, longitude: 92.3228, name: "Saint Martin", country: "Bangladesh", isCoastal: true },
  "st. martin": { latitude: 20.6277, longitude: 92.3228, name: "Saint Martin", country: "Bangladesh", isCoastal: true },
  "kuakata": { latitude: 21.8167, longitude: 90.1167, name: "Kuakata", country: "Bangladesh", isCoastal: true },
  "sundarbans": { latitude: 22.4833, longitude: 89.6000, name: "Sundarbans", country: "Bangladesh", isCoastal: true },
  "chittagong": { latitude: 22.3569, longitude: 91.7832, name: "Chittagong", country: "Bangladesh", isCoastal: true },
  "chattogram": { latitude: 22.3569, longitude: 91.7832, name: "Chittagong", country: "Bangladesh", isCoastal: true },
  "patenga": { latitude: 22.2354, longitude: 91.7915, name: "Patenga", country: "Bangladesh", isCoastal: true },
  "mongla": { latitude: 22.4833, longitude: 89.6000, name: "Mongla Port", country: "Bangladesh", isCoastal: true },
  "payra": { latitude: 22.0167, longitude: 90.2833, name: "Payra Port", country: "Bangladesh", isCoastal: true },
  "barisal": { latitude: 22.7010, longitude: 90.3535, name: "Barisal", country: "Bangladesh", isCoastal: true },
  "barishal": { latitude: 22.7010, longitude: 90.3535, name: "Barisal", country: "Bangladesh", isCoastal: true },

  // Bangladesh Inland & Hilly Regions
  "sylhet": { latitude: 24.8949, longitude: 91.8687, name: "Sylhet", country: "Bangladesh", isCoastal: false },
  "sreemangal": { latitude: 24.3065, longitude: 91.7296, name: "Sreemangal", country: "Bangladesh", isCoastal: false },
  "bandarban": { latitude: 22.1953, longitude: 92.2184, name: "Bandarban", country: "Bangladesh", isCoastal: false },
  "sajek": { latitude: 23.3820, longitude: 92.2938, name: "Sajek Valley", country: "Bangladesh", isCoastal: false },
  "sajek valley": { latitude: 23.3820, longitude: 92.2938, name: "Sajek Valley", country: "Bangladesh", isCoastal: false },
  "rangamati": { latitude: 22.6533, longitude: 92.1753, name: "Rangamati", country: "Bangladesh", isCoastal: false },
  "dhaka": { latitude: 23.8103, longitude: 90.4125, name: "Dhaka", country: "Bangladesh", isCoastal: false },
  "rajshahi": { latitude: 24.3636, longitude: 88.6241, name: "Rajshahi", country: "Bangladesh", isCoastal: false },
  "khulna": { latitude: 22.8456, longitude: 89.5403, name: "Khulna", country: "Bangladesh", isCoastal: false },

  // Popular International Destinations
  "bali": { latitude: -8.4095, longitude: 115.1889, name: "Bali", country: "Indonesia", isCoastal: true },
  "tokyo": { latitude: 35.6762, longitude: 139.6503, name: "Tokyo", country: "Japan", isCoastal: true },
  "bangkok": { latitude: 13.7563, longitude: 100.5018, name: "Bangkok", country: "Thailand", isCoastal: false },
  "dubai": { latitude: 25.2048, longitude: 55.2708, name: "Dubai", country: "UAE", isCoastal: true },
  "singapore": { latitude: 1.3521, longitude: 103.8198, name: "Singapore", country: "Singapore", isCoastal: true },
  "paris": { latitude: 48.8566, longitude: 2.3522, name: "Paris", country: "France", isCoastal: false },
  "rome": { latitude: 41.9028, longitude: 12.4964, name: "Rome", country: "Italy", isCoastal: false },
  "istanbul": { latitude: 41.0082, longitude: 28.9784, name: "Istanbul", country: "Turkey", isCoastal: true },
  "kuala lumpur": { latitude: 3.1390, longitude: 101.6869, name: "Kuala Lumpur", country: "Malaysia", isCoastal: false },
  "kathmandu": { latitude: 27.7172, longitude: 85.3240, name: "Kathmandu", country: "Nepal", isCoastal: false },
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE LAYER (1-HOUR MEMORY + ASYNC STORAGE)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const CACHE_PREFIX = "@weather_cache_v2_";

interface CacheEntry {
  data: ComprehensiveWeatherData;
  expiresAt: number;
}

// In-Memory Fast Cache Map
const memoryCache = new Map<string, CacheEntry>();

function getCacheKey(lat: number, lon: number): string {
  // Quantize coordinates to ~2km precision for high cache hit rates
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// METEOROLOGICAL CONVERSIONS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if coordinate is in the coastal Bay of Bengal zone (BD coastal warning area)
 */
export function isCoastalBangladesh(lat: number, lon: number): boolean {
  return lat >= 20.2 && lat <= 23.4 && lon >= 88.8 && lon <= 92.8;
}

/**
 * Maps WMO weather code to standard condition, label, and Ionicons icon
 */
export function mapWMOCodeToCondition(
  code: number,
  isDay: boolean = true,
  isGoldenHour: boolean = false
): { condition: WeatherCondition; iconName: keyof typeof Ionicons.glyphMap; label: string } {
  if (isGoldenHour && (code === 0 || code === 1 || code === 2)) {
    return { condition: "Golden Hour", iconName: "partly-sunny", label: "Golden Hour" };
  }

  switch (code) {
    case 0:
      return {
        condition: "Clear",
        iconName: isDay ? "sunny" : "moon",
        label: isDay ? "Clear Sky" : "Clear Night",
      };
    case 1:
      return {
        condition: "Clear",
        iconName: isDay ? "sunny-outline" : "moon-outline",
        label: isDay ? "Mainly Clear" : "Clear",
      };
    case 2:
      return {
        condition: "Partly Cloudy",
        iconName: isDay ? "partly-sunny-outline" : "cloudy-night-outline",
        label: "Partly Cloudy",
      };
    case 3:
      return {
        condition: "Overcast",
        iconName: "cloudy",
        label: "Overcast",
      };
    case 45:
    case 48:
      return {
        condition: "Fog",
        iconName: "cloud-outline",
        label: "Foggy Mist",
      };
    case 51:
    case 53:
    case 55:
      return {
        condition: "Drizzle",
        iconName: "rainy-outline",
        label: "Passing Drizzle",
      };
    case 56:
    case 57:
      return {
        condition: "Drizzle",
        iconName: "snow-outline",
        label: "Freezing Drizzle",
      };
    case 61:
      return {
        condition: "Rain",
        iconName: "rainy",
        label: "Light Rain",
      };
    case 63:
      return {
        condition: "Rain",
        iconName: "rainy",
        label: "Moderate Rain",
      };
    case 65:
      return {
        condition: "Heavy Rain",
        iconName: "thunderstorm-outline",
        label: "Heavy Downpour",
      };
    case 80:
    case 81:
      return {
        condition: "Rain",
        iconName: "rainy",
        label: "Scattered Showers",
      };
    case 82:
      return {
        condition: "Heavy Rain",
        iconName: "rainy",
        label: "Violent Showers",
      };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return {
        condition: "Snow",
        iconName: "snow",
        label: "Snowfall",
      };
    case 95:
      return {
        condition: "Thunderstorm",
        iconName: "thunderstorm",
        label: "Thunderstorm",
      };
    case 96:
    case 99:
      return {
        condition: "Thunderstorm",
        iconName: "thunderstorm",
        label: "Severe Thunderstorm with Hail",
      };
    default:
      return {
        condition: "Partly Cloudy",
        iconName: "cloud-outline",
        label: "Scattered Clouds",
      };
  }
}

/**
 * Calculates UV Index severity rating
 */
export function getUVSeverity(uv: number): UVSeverity {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

/**
 * Categorizes US AQI standard (0 - 500)
 */
export function getAQISeverity(aqi: number): { category: AQISeverity; color: string } {
  if (aqi <= 50) return { category: "Good", color: "#10B981" }; // Emerald
  if (aqi <= 100) return { category: "Moderate", color: "#F59E0B" }; // Amber
  if (aqi <= 150) return { category: "Unhealthy for Sensitive Groups", color: "#F97316" }; // Orange
  if (aqi <= 200) return { category: "Unhealthy", color: "#EF4444" }; // Red
  if (aqi <= 300) return { category: "Very Unhealthy", color: "#8B5CF6" }; // Purple
  return { category: "Hazardous", color: "#881337" }; // Maroon
}

/**
 * Checks if current time is within dawn/dusk golden hour window
 */
function checkIsGoldenHour(date: Date, isDay: boolean): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeFraction = hours + minutes / 60;
  // Morning golden hour ~ 05:45 to 06:45; Evening golden hour ~ 16:45 to 17:50
  const isMorningGolden = timeFraction >= 5.75 && timeFraction <= 6.85;
  const isEveningGolden = timeFraction >= 16.75 && timeFraction <= 17.85;
  return isDay && (isMorningGolden || isEveningGolden);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER RISK HEURISTICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates Bangladesh Meteorological Department (BMD) Maritime Port Cyclone Signals (1-10)
 */
export function evaluateCoastalCycloneSignal(
  lat: number,
  lon: number,
  windSpeed: number,
  windGusts: number,
  weatherCode: number,
  precipitationSum: number
): CoastalCycloneSignal | null {
  const isCoastal = isCoastalBangladesh(lat, lon);
  if (!isCoastal) return null;

  const maxWind = Math.max(windSpeed, windGusts * 0.85);

  // Signal 10: Great Danger Signal (Super Cyclone or Severe Cyclone crossing directly)
  if (maxWind >= 118 || (maxWind >= 95 && weatherCode >= 95)) {
    return {
      isApplicable: true,
      signalNumber: 10,
      signalName: "Great Danger Signal No. 10",
      warningLevel: "Great Danger",
      coastalZone: "Maritime Ports (Cox's Bazar, Chittagong, Mongla, Payra)",
      maritimeAdvisory: "All sea vessels and fishing trawlers must remain in port shelters. Catastrophic storm surge expected.",
      publicAdvisory: "Immediate evacuation to designated concrete storm shelters. All beach & marine travel suspended.",
      color: "#991B1B", // Dark Crimson
    };
  }

  // Signal 8 or 9: Great Danger Signal (Severe cyclonic storm crossing nearby)
  if (maxWind >= 89 || (maxWind >= 75 && weatherCode >= 95)) {
    return {
      isApplicable: true,
      signalNumber: 8,
      signalName: "Great Danger Signal No. 8",
      warningLevel: "Great Danger",
      coastalZone: "Maritime Ports & Coastal Districts",
      maritimeAdvisory: "Vessels must seek fortified harbor immediately. Sea is phenomenal with high storm surge.",
      publicAdvisory: "Evacuate low-lying islands (Saint Martin, Kutubdia) and coastal shorelines.",
      color: "#DC2626", // Red
    };
  }

  // Signal 5, 6, 7: Danger Signal (Cyclonic storm of moderate to severe intensity)
  if (maxWind >= 62 || (maxWind >= 52 && weatherCode >= 95)) {
    return {
      isApplicable: true,
      signalNumber: 6,
      signalName: "Danger Signal No. 6",
      warningLevel: "Danger",
      coastalZone: "Coastal Maritime Ports & Coastal Belt",
      maritimeAdvisory: "Small craft and passenger launches must not venture out. Mooring lines must be doubled.",
      publicAdvisory: "Tourist ship operations to Saint Martin & deep-sea excursions halted.",
      color: "#EA580C", // Deep Orange
    };
  }

  // Signal 4: Local Warning Signal (Port threatened by cyclonic storm, wind 51-61 km/h)
  if (maxWind >= 51 || (maxWind >= 42 && precipitationSum >= 40)) {
    return {
      isApplicable: true,
      signalNumber: 4,
      signalName: "Local Warning Signal No. 4",
      warningLevel: "Warning",
      coastalZone: "Maritime Ports of Chittagong & Cox's Bazar",
      maritimeAdvisory: "Port is threatened by squally weather. Vessels in harbor should be ready to leave if needed.",
      publicAdvisory: "Avoid open beach activities and water sports. Island ferries on standby.",
      color: "#F59E0B", // Amber
    };
  }

  // Signal 3: Local Cautionary Signal (Port threatened by squalls, wind 40-50 km/h)
  if (maxWind >= 38 || (weatherCode >= 95 && maxWind >= 30)) {
    return {
      isApplicable: true,
      signalNumber: 3,
      signalName: "Local Cautionary Signal No. 3",
      warningLevel: "Cautionary",
      coastalZone: "North Bay & Coastal Ports",
      maritimeAdvisory: "Squally weather over maritime ports. Fishing trawlers advised to navigate close to coast.",
      publicAdvisory: "Expect rough surf and strong sea breezes. Keep life jackets accessible.",
      color: "#D97706",
    };
  }

  // Signal 1 or 2: Distant Cautionary / Warning Signal
  if (maxWind >= 28 && (precipitationSum >= 20 || weatherCode >= 80)) {
    return {
      isApplicable: true,
      signalNumber: 1,
      signalName: "Distant Cautionary Signal No. 1",
      warningLevel: "Cautionary",
      coastalZone: "Deep Bay of Bengal & Open Sea",
      maritimeAdvisory: "Depression formed in deep sea. Ships advised to proceed with caution.",
      publicAdvisory: "Normal tourist activities permitted, monitor weather updates regularly.",
      color: "#3B82F6",
    };
  }

  return null;
}

/**
 * Generates comprehensive travel advisory alerts for heavy rainfall, cyclones, heatwaves, and air quality
 */
export function generateRiskAlerts(
  current: CurrentWeather,
  daily: DailyForecastItem[],
  coords: GPSCoordinates
): { alerts: WeatherAlert[]; cycloneSignal: CoastalCycloneSignal | null } {
  const alerts: WeatherAlert[] = [];

  const maxWindToday = Math.max(current.windSpeed, current.windGusts || current.windSpeed);
  const totalRainToday = daily[0]?.precipitationSum || current.precipitation;

  // 1. Coastal Cyclone Heuristics
  const cycloneSignal = evaluateCoastalCycloneSignal(
    coords.latitude,
    coords.longitude,
    current.windSpeed,
    maxWindToday,
    current.weatherCode,
    totalRainToday
  );

  if (cycloneSignal) {
    alerts.push({
      id: `alert-cyclone-${cycloneSignal.signalNumber}`,
      type: "cyclone",
      severity:
        cycloneSignal.warningLevel === "Great Danger"
          ? "emergency"
          : cycloneSignal.warningLevel === "Danger"
          ? "warning"
          : "advisory",
      headline: `BMD Warning: ${cycloneSignal.signalName}`,
      description: `${cycloneSignal.coastalZone} is under ${cycloneSignal.signalName}. ${cycloneSignal.maritimeAdvisory}`,
      recommendedAction: cycloneSignal.publicAdvisory,
      cycloneSignal,
      issuedAt: new Date().toISOString(),
      color: cycloneSignal.color,
    });
  }

  // 2. Heavy Rainfall Advisory Heuristics
  const next3DaysMaxRain = Math.max(...daily.slice(0, 3).map((d) => d.precipitationSum), totalRainToday);
  const next3DaysMaxRainProb = Math.max(...daily.slice(0, 3).map((d) => d.precipitationProbability));

  if (next3DaysMaxRain >= 70 || (current.precipitation >= 15 && current.precipitationProbability >= 85)) {
    alerts.push({
      id: "alert-torrential-rain",
      type: "heavy_rainfall",
      severity: "warning",
      headline: "Torrential Downpour & Flash Flood Warning",
      description: `High precipitation rate detected (~${Math.round(next3DaysMaxRain)}mm). Elevated risk of urban waterlogging and hill landslides in hill tracts (Bandarban, Sajek, Sylhet).`,
      recommendedAction: "Avoid slippery mountain trekking. Carry waterproof dry-bags and heavy rain ponchos.",
      issuedAt: new Date().toISOString(),
      color: "#0284C7",
    });
  } else if (next3DaysMaxRain >= 30 || next3DaysMaxRainProb >= 75) {
    alerts.push({
      id: "alert-heavy-rain",
      type: "heavy_rainfall",
      severity: "advisory",
      headline: "Heavy Rainfall Advisory",
      description: `Sustained rain expected with ${next3DaysMaxRainProb}% probability. Outdoor sightseeing will be impacted by wet conditions.`,
      recommendedAction: "Pack an umbrella, waterproof footwear, and consider indoor cultural itineraries.",
      issuedAt: new Date().toISOString(),
      color: "#0369A1",
    });
  }

  // 3. Extreme Heatwave Advisory Heuristics
  const maxTemp = Math.max(current.temperature, daily[0]?.maxTemp || current.temperature);
  const feelsLike = current.apparentTemperature;

  if (maxTemp >= 40 || feelsLike >= 43) {
    alerts.push({
      id: "alert-heatwave-extreme",
      type: "heatwave",
      severity: "warning",
      headline: "Extreme Heatwave Alert",
      description: `Severe thermal stress conditions. Peak temperature reaching ${Math.round(maxTemp)}°C (Feels like ${Math.round(feelsLike)}°C). Prolonged sun exposure poses severe danger of heat exhaustion and heat stroke.`,
      recommendedAction: "Suspend vigorous outdoor activities between 11:30 AM and 3:30 PM. Drink plenty of electrolyte solutions.",
      issuedAt: new Date().toISOString(),
      color: "#DC2626",
    });
  } else if (maxTemp >= 37 || feelsLike >= 40) {
    alerts.push({
      id: "alert-heatwave-moderate",
      type: "heatwave",
      severity: "advisory",
      headline: "Moderate Heatwave Advisory",
      description: `Hot and muggy weather (${Math.round(maxTemp)}°C, Humidity ${current.humidity}%). High perspiration rate.`,
      recommendedAction: "Stay hydrated, carry oral rehydration salts (ORS), and wear loose, breathable cotton clothing.",
      issuedAt: new Date().toISOString(),
      color: "#EA580C",
    });
  }

  // 4. Hazardous Air Quality Advisory
  if (current.aqi >= 200) {
    alerts.push({
      id: "alert-aqi-severe",
      type: "air_quality",
      severity: current.aqi >= 300 ? "warning" : "advisory",
      headline: `Severe Air Pollution (AQI ${current.aqi})`,
      description: `Air quality index has reached ${current.aqi} (${current.aqiCategory}). Elevated PM2.5 particulates pose health risks to all travelers.`,
      recommendedAction: "Wear N95/FFP2 protective face masks during outdoor transit. Travelers with asthma should limit outdoor exposure.",
      issuedAt: new Date().toISOString(),
      color: current.aqiColor,
    });
  }

  // 5. Extreme UV Radiation Warning
  if (current.uvIndex >= 9) {
    alerts.push({
      id: "alert-uv-extreme",
      type: "uv_radiation",
      severity: "advisory",
      headline: `Dangerous UV Radiation (UV ${Math.round(current.uvIndex)})`,
      description: `Intense solar ultraviolet radiation. Unprotected skin can burn in fewer than 15 minutes.`,
      recommendedAction: "Apply broad-spectrum SPF 50+ sunscreen every 2 hours, wear UV400 sunglasses and wide-brim hats.",
      issuedAt: new Date().toISOString(),
      color: "#8B5CF6",
    });
  }

  return { alerts, cycloneSignal };
}

/**
 * Derives intelligent packing recommendations based on weather parameters
 */
export function generatePackingRecommendations(
  current: CurrentWeather,
  daily: DailyForecastItem[],
  locationName: string,
  isCoastal: boolean
): { recommendations: PackingRecommendation[]; summary: string } {
  const recs: PackingRecommendation[] = [];
  const maxRainProb = Math.max(current.precipitationProbability, ...daily.slice(0, 3).map((d) => d.precipitationProbability));
  const maxTemp = Math.max(current.temperature, ...daily.slice(0, 3).map((d) => d.maxTemp));
  const minTemp = Math.min(current.temperature, ...daily.slice(0, 3).map((d) => d.minTemp));
  const maxUv = Math.max(current.uvIndex, ...daily.slice(0, 3).map((d) => d.maxUvIndex));
  const hasThunderstorm = daily.some((d) => d.weatherCode >= 95) || current.weatherCode >= 95;

  // Rain Gear
  if (maxRainProb >= 40 || current.precipitation > 0 || hasThunderstorm) {
    recs.push({
      id: "pack-umbrella",
      item: "Wind-Resistant Compact Umbrella",
      category: "gear",
      reason: `High chance of rainfall (${maxRainProb}%) during your trip.`,
      icon: "umbrella-outline",
      urgency: "essential",
    });
    recs.push({
      id: "pack-waterproof-jacket",
      item: "Breathable Rain Poncho / Jacket",
      category: "clothing",
      reason: "Protects against sudden tropical cloudbursts without overheating.",
      icon: "water-outline",
      urgency: maxRainProb > 70 ? "essential" : "recommended",
    });
  }

  // Sun & UV Protection
  if (maxUv >= 6) {
    recs.push({
      id: "pack-sunscreen",
      item: "Broad-Spectrum SPF 50+ Sunscreen",
      category: "health",
      reason: `Very high UV Index (Peak UV ${Math.round(maxUv)}). Prevents sun damage.`,
      icon: "sunny-outline",
      urgency: "essential",
    });
    recs.push({
      id: "pack-sunglasses",
      item: "UV400 Polarized Sunglasses",
      category: "gear",
      reason: "Protects eyes from harsh glare and ultraviolet radiation.",
      icon: "glasses-outline",
      urgency: "recommended",
    });
  }

  // Cold Weather / Mountain Layers
  if (minTemp <= 14) {
    recs.push({
      id: "pack-warm-layer",
      item: "Thermal Fleece / Insulated Jacket",
      category: "clothing",
      reason: `Nights dip down to ${Math.round(minTemp)}°C in ${locationName}.`,
      icon: "snow-outline",
      urgency: minTemp <= 8 ? "essential" : "recommended",
    });
  } else if (minTemp <= 19) {
    recs.push({
      id: "pack-light-cardigan",
      item: "Light Windbreaker or Cardigan",
      category: "clothing",
      reason: "Comfortable for breezy evenings and air-conditioned travel transit.",
      icon: "shirt-outline",
      urgency: "recommended",
    });
  }

  // Hot & Humid Clothing
  if (maxTemp >= 30) {
    recs.push({
      id: "pack-cotton-linen",
      item: "Lightweight Breathable Cotton / Linen Clothes",
      category: "clothing",
      reason: `Daytime highs reach ${Math.round(maxTemp)}°C with ${current.humidity}% humidity.`,
      icon: "shirt-outline",
      urgency: "recommended",
    });
    recs.push({
      id: "pack-hydration-electrolytes",
      item: "Hydration Electrolyte Powder (ORS)",
      category: "health",
      reason: "Combats dehydration and fatigue in tropical heat.",
      icon: "flask-outline",
      urgency: maxTemp >= 35 ? "essential" : "recommended",
    });
  }

  // Air Quality
  if (current.aqi >= 150) {
    recs.push({
      id: "pack-n95-mask",
      item: "N95 / FFP2 Particulate Face Masks",
      category: "health",
      reason: `Air quality is ${current.aqiCategory} (AQI ${current.aqi}).`,
      icon: "shield-checkmark-outline",
      urgency: "essential",
    });
  }

  // Coastal / Beach Specifics
  if (isCoastal) {
    recs.push({
      id: "pack-waterproof-pouch",
      item: "IPX8 Waterproof Phone Pouch",
      category: "electronics",
      reason: "Essential for beach visits, sea cruises, and speedboats.",
      icon: "phone-portrait-outline",
      urgency: "recommended",
    });
  }

  // Footwear
  if (maxRainProb >= 50 || locationName.toLowerCase().includes("sajek") || locationName.toLowerCase().includes("bandarban")) {
    recs.push({
      id: "pack-anti-slip-shoes",
      item: "Anti-Slip Walking / Hiking Shoes",
      category: "gear",
      reason: "Ensures traction on wet trails, rocky terrain, and slippery steps.",
      icon: "footsteps-outline",
      urgency: "recommended",
    });
  }

  // Build a crisp 1-line packing summary
  const topItems: string[] = [];
  if (maxRainProb >= 40) topItems.push("Pack an umbrella today");
  if (maxUv >= 6) topItems.push("Bring SPF 50+ sunscreen");
  if (minTemp <= 14) topItems.push("Warm evening layers");
  if (maxTemp >= 30 && topItems.length < 2) topItems.push("Light breathable cottons");
  if (current.aqi >= 150 && topItems.length < 2) topItems.push("N95 face mask");

  const summary = topItems.length > 0 ? topItems.join(" · ") : "Pack comfortable travel clothing";

  return { recommendations: recs, summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC OFFLINE / SYNTHETIC METEOROLOGICAL FALLBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates accurate thermodynamic & seasonal meteorological estimations when external network fails
 */
function createSyntheticOfflineWeather(
  coords: GPSCoordinates,
  locationName: string
): ComprehensiveWeatherData {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec
  const hour = now.getHours();
  const isDay = hour >= 6 && hour < 18;
  const isGoldenHour = checkIsGoldenHour(now, isDay);

  // Approximate temperature profile based on latitude and hemisphere seasonality
  const isSubtropical = Math.abs(coords.latitude) >= 20 && Math.abs(coords.latitude) <= 26; // e.g. Bangladesh
  const isTropical = Math.abs(coords.latitude) < 20; // e.g. Bali, Singapore, Bangkok

  let baseTemp = 28;
  let baseHumidity = 65;
  let baseRainProb = 20;
  let weatherCode = 1;

  if (isSubtropical) {
    if (month >= 3 && month <= 5) {
      // Pre-monsoon Summer: Hot, Thunderstorms possible
      baseTemp = 34;
      baseRainProb = 35;
      baseHumidity = 72;
      weatherCode = baseRainProb > 30 ? 2 : 1;
    } else if (month >= 6 && month <= 9) {
      // Monsoon Season: Heavy rain
      baseTemp = 30;
      baseRainProb = 75;
      baseHumidity = 85;
      weatherCode = 63;
    } else if (month >= 10 && month <= 11) {
      // Autumn: Pleasant, Golden light
      baseTemp = 28;
      baseRainProb = 15;
      baseHumidity = 60;
      weatherCode = 1;
    } else {
      // Winter (Dec - Feb): Cool, dry, foggy mornings
      baseTemp = 22;
      baseRainProb = 5;
      baseHumidity = 55;
      weatherCode = hour < 8 ? 45 : 0;
    }
  } else if (isTropical) {
    baseTemp = 31;
    baseHumidity = 78;
    baseRainProb = 45;
    weatherCode = 2;
  }

  // Diurnal oscillation (colder at dawn, hotter at 2 PM)
  const diurnalOffset = Math.sin(((hour - 8) / 24) * 2 * Math.PI) * 4;
  const currentTemp = Math.round((baseTemp + diurnalOffset) * 10) / 10;
  const currentFeelsLike = Math.round((currentTemp + (baseHumidity > 70 ? 3 : 0)) * 10) / 10;
  const currentUv = isDay ? Math.min(11, Math.max(1, Math.round(9 * Math.sin(((hour - 6) / 12) * Math.PI)))) : 0;
  const currentAqi = isSubtropical && (month >= 11 || month <= 2) ? 165 : 75;

  const { condition, iconName } = mapWMOCodeToCondition(weatherCode, isDay, isGoldenHour);
  const aqiInfo = getAQISeverity(currentAqi);

  const current: CurrentWeather = {
    temperature: currentTemp,
    apparentTemperature: currentFeelsLike,
    humidity: baseHumidity,
    windSpeed: coords.isCoastal ? 18 : 10,
    windDirection: 180,
    windGusts: coords.isCoastal ? 26 : 14,
    precipitation: weatherCode >= 61 ? 3.5 : 0,
    precipitationProbability: baseRainProb,
    weatherCode,
    condition,
    iconName,
    isDay,
    isGoldenHour,
    uvIndex: currentUv,
    uvCategory: getUVSeverity(currentUv),
    aqi: currentAqi,
    aqiCategory: aqiInfo.category,
    aqiColor: aqiInfo.color,
    pm25: currentAqi > 100 ? 55 : 22,
    pm10: currentAqi > 100 ? 90 : 35,
    timestamp: now.toISOString(),
  };

  // Hourly forecast for next 24 hours
  const hourly: HourlyForecastItem[] = [];
  for (let i = 0; i < 24; i++) {
    const forecastTime = new Date(now.getTime() + i * 3600 * 1000);
    const fHour = forecastTime.getHours();
    const fIsDay = fHour >= 6 && fHour < 18;
    const fDiurnal = Math.sin(((fHour - 8) / 24) * 2 * Math.PI) * 4;
    const fTemp = Math.round((baseTemp + fDiurnal) * 10) / 10;
    const fCode = fHour > 14 && fHour < 17 && baseRainProb > 30 ? 61 : weatherCode;
    const fCond = mapWMOCodeToCondition(fCode, fIsDay, false);
    const fUv = fIsDay ? Math.max(0, Math.round(8 * Math.sin(((fHour - 6) / 12) * Math.PI))) : 0;

    hourly.push({
      time: forecastTime.toISOString(),
      timeFormatted: formatHour(fHour),
      temperature: fTemp,
      apparentTemperature: Math.round(fTemp + 1),
      humidity: baseHumidity,
      precipitationProbability: baseRainProb,
      precipitation: fCode === 61 ? 1.5 : 0,
      weatherCode: fCode,
      condition: fCond.condition,
      iconName: fCond.iconName,
      uvIndex: fUv,
      windSpeed: coords.isCoastal ? 16 : 11,
      aqi: currentAqi,
      isDay: fIsDay,
    });
  }

  // 7-day daily forecast
  const daily: DailyForecastItem[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let d = 0; d < 7; d++) {
    const fDate = new Date(now.getTime() + d * 86400 * 1000);
    const dayLabel = d === 0 ? "Today" : dayNames[fDate.getDay()];
    const dateStr = fDate.toISOString().split("T")[0];
    const codeVariation = (weatherCode + d) % 2 === 0 ? weatherCode : Math.min(3, weatherCode);
    const condInfo = mapWMOCodeToCondition(codeVariation, true, false);

    daily.push({
      date: dateStr,
      dayName: dayLabel,
      maxTemp: Math.round(baseTemp + 2 + (d % 2)),
      minTemp: Math.round(baseTemp - 5 - (d % 3)),
      weatherCode: codeVariation,
      condition: condInfo.condition,
      iconName: condInfo.iconName,
      precipitationProbability: Math.min(100, Math.max(0, baseRainProb + (d % 3) * 10 - 10)),
      precipitationSum: codeVariation >= 61 ? 8 : 0,
      maxWindSpeed: coords.isCoastal ? 22 : 14,
      maxUvIndex: Math.min(10, currentUv + 1),
      avgAqi: currentAqi,
      summary: condInfo.label,
    });
  }

  const { alerts, cycloneSignal } = generateRiskAlerts(current, daily, coords);
  const { recommendations, summary } = generatePackingRecommendations(
    current,
    daily,
    locationName,
    !!coords.isCoastal
  );

  return {
    coordinates: coords,
    locationName,
    country: coords.country || "Bangladesh",
    timezone: "Asia/Dhaka",
    current,
    hourly,
    daily,
    alerts,
    cycloneSignal,
    packingRecommendations: recommendations,
    packingSummary: summary,
    cachedAt: now.toISOString(),
    isStale: false,
    dataSource: "offline_heuristic",
  };
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

// ─────────────────────────────────────────────────────────────────────────────
// METEOROLOGICAL SERVICE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export class WeatherService {
  private static instance: WeatherService;

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Resolves a destination name or GPS coordinate into high-accuracy geodetic coordinates
   */
  public async resolveCoordinates(locationOrCoords: string | GPSCoordinates): Promise<GPSCoordinates> {
    if (typeof locationOrCoords !== "string") {
      const isCoast = locationOrCoords.isCoastal ?? isCoastalBangladesh(locationOrCoords.latitude, locationOrCoords.longitude);
      return {
        ...locationOrCoords,
        isCoastal: isCoast,
      };
    }

    const clean = locationOrCoords.trim().toLowerCase();

    // Check pre-populated precision coordinates
    if (PRESET_COORDINATES[clean]) {
      return PRESET_COORDINATES[clean];
    }

    // Fuzzy matching against preset keys
    for (const key of Object.keys(PRESET_COORDINATES)) {
      if (clean.includes(key) || key.includes(clean)) {
        return PRESET_COORDINATES[key];
      }
    }

    // Dynamic Geocoding via Open-Meteo Geocoding API with 4s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          const first = json.results[0];
          const lat = Number(first.latitude);
          const lon = Number(first.longitude);
          return {
            latitude: lat,
            longitude: lon,
            name: first.name || locationOrCoords,
            country: first.country || "",
            isCoastal: isCoastalBangladesh(lat, lon),
          };
        }
      }
    } catch {
      // Proceed to fallback
    }

    // Fallback default: Dhaka (Center of Bangladesh)
    return {
      latitude: 23.8103,
      longitude: 90.4125,
      name: locationOrCoords,
      country: "Bangladesh",
      isCoastal: false,
    };
  }

  /**
   * Retrieves weather forecast from the 1-hour cache (Memory then AsyncStorage)
   */
  private async getFromCache(cacheKey: string): Promise<ComprehensiveWeatherData | null> {
    const now = Date.now();

    // 1. Check in-memory Map
    const mem = memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > now) {
      return mem.data;
    }

    // 2. Check AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        if (parsed.expiresAt > now) {
          // Warm up in-memory cache
          memoryCache.set(cacheKey, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore cache read failures
    }

    return null;
  }

  /**
   * Saves weather data to both memory and AsyncStorage with a 1-hour expiration
   */
  private async saveToCache(cacheKey: string, data: ComprehensiveWeatherData): Promise<void> {
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    // Save in-memory
    memoryCache.set(cacheKey, entry);

    // Save persistent
    try {
      await AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(entry));
    } catch (e) {
      console.warn("[WeatherService] Failed to persist cache:", e);
    }
  }

  /**
   * Retrieves stale cache data when offline or network fails
   */
  private async getStaleCache(cacheKey: string): Promise<ComprehensiveWeatherData | null> {
    const mem = memoryCache.get(cacheKey);
    if (mem) {
      return { ...mem.data, isStale: true, dataSource: "cache" };
    }

    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + cacheKey);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        return { ...parsed.data, isStale: true, dataSource: "cache" };
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Core Meteorological Aggregator:
   * Fetches real-time weather forecasts, UV index, and AQI from Open-Meteo multi-source APIs.
   * Employs 1-hour cache and seamless offline fallback.
   */
  public async getComprehensiveWeather(
    locationOrCoords: string | GPSCoordinates,
    forceRefresh: boolean = false
  ): Promise<ComprehensiveWeatherData> {
    const coords = await this.resolveCoordinates(locationOrCoords);
    const locationName = coords.name || (typeof locationOrCoords === "string" ? locationOrCoords : "Location");
    const cacheKey = getCacheKey(coords.latitude, coords.longitude);

    // 1. Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          dataSource: "cache",
        };
      }
    }

    // 2. Fetch live multi-source meteorological & air quality data
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
        `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max` +
        `&timezone=auto`;

      const aqiUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.latitude}&longitude=${coords.longitude}` +
        `&current=us_aqi,pm10,pm2_5&hourly=us_aqi&timezone=auto`;

      // Multi-source parallel fetch
      const [forecastRes, aqiRes] = await Promise.allSettled([
        fetch(forecastUrl, { signal: controller.signal }),
        fetch(aqiUrl, { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (forecastRes.status === "fulfilled" && forecastRes.value.ok) {
        const forecastJson = await forecastRes.value.json();
        let aqiJson: any = null;

        if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
          try {
            aqiJson = await aqiRes.value.json();
          } catch {
            // AQI parsing error fallback
          }
        }

        const parsedData = this.transformOpenMeteoResponse(coords, locationName, forecastJson, aqiJson);

        // Save into 1-hour cache
        await this.saveToCache(cacheKey, parsedData);

        return parsedData;
      }
    } catch (err) {
      console.warn("[WeatherService] External meteorological API failed, checking fallback:", err);
    }

    // 3. Network or API failed: Try returning stale cache
    const stale = await this.getStaleCache(cacheKey);
    if (stale) {
      return stale;
    }

    // 4. No cache available: Generate high-fidelity physical/seasonal offline heuristics
    return createSyntheticOfflineWeather(coords, locationName);
  }

  /**
   * Transforms raw Open-Meteo REST payloads into clean domain model
   */
  private transformOpenMeteoResponse(
    coords: GPSCoordinates,
    locationName: string,
    weatherRaw: any,
    aqiRaw: any
  ): ComprehensiveWeatherData {
    const cur = weatherRaw.current || {};
    const hourlyRaw = weatherRaw.hourly || {};
    const dailyRaw = weatherRaw.daily || {};

    const now = new Date();
    const isDay = cur.is_day === 1;
    const isGoldenHour = checkIsGoldenHour(now, isDay);
    const weatherCode = cur.weather_code ?? 0;
    const condInfo = mapWMOCodeToCondition(weatherCode, isDay, isGoldenHour);

    // Current AQI & Pollutants
    const rawAqi = aqiRaw?.current?.us_aqi ?? 52;
    const pm25 = aqiRaw?.current?.pm2_5;
    const pm10 = aqiRaw?.current?.pm10;
    const aqiSeverity = getAQISeverity(rawAqi);

    // Current UV Index: take current hour's UV from hourly array or daily max
    const currentHourIdx = now.getHours();
    const currentUv = hourlyRaw.uv_index ? Number(hourlyRaw.uv_index[currentHourIdx] ?? 0) : 0;

    const current: CurrentWeather = {
      temperature: Math.round(cur.temperature_2m ?? 28),
      apparentTemperature: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 28),
      humidity: Math.round(cur.relative_humidity_2m ?? 60),
      windSpeed: Math.round(cur.wind_speed_10m ?? 12),
      windDirection: Math.round(cur.wind_direction_10m ?? 0),
      windGusts: cur.wind_gusts_10m ? Math.round(cur.wind_gusts_10m) : undefined,
      precipitation: cur.precipitation ?? 0,
      precipitationProbability: hourlyRaw.precipitation_probability ? Number(hourlyRaw.precipitation_probability[currentHourIdx] ?? 0) : 0,
      weatherCode,
      condition: condInfo.condition,
      iconName: condInfo.iconName,
      isDay,
      isGoldenHour,
      uvIndex: currentUv,
      uvCategory: getUVSeverity(currentUv),
      aqi: rawAqi,
      aqiCategory: aqiSeverity.category,
      aqiColor: aqiSeverity.color,
      pm25,
      pm10,
      timestamp: cur.time || now.toISOString(),
    };

    // Transform Hourly (next 24 hours)
    const hourly: HourlyForecastItem[] = [];
    const hourlyTimes: string[] = hourlyRaw.time || [];
    const startIndex = Math.min(Math.max(0, currentHourIdx), Math.max(0, hourlyTimes.length - 24));
    const limit = Math.min(hourlyTimes.length, startIndex + 24);

    for (let i = startIndex; i < limit; i++) {
      const isoTime = hourlyTimes[i];
      const hDate = new Date(isoTime);
      const hHour = hDate.getHours();
      const hIsDay = hHour >= 6 && hHour < 18;
      const hCode = hourlyRaw.weather_code ? Number(hourlyRaw.weather_code[i] ?? 0) : 0;
      const hCond = mapWMOCodeToCondition(hCode, hIsDay, false);
      const hUv = hourlyRaw.uv_index ? Number(hourlyRaw.uv_index[i] ?? 0) : 0;
      const hAqi = aqiRaw?.hourly?.us_aqi ? Number(aqiRaw.hourly.us_aqi[i] ?? rawAqi) : rawAqi;

      hourly.push({
        time: isoTime,
        timeFormatted: formatHour(hHour),
        temperature: Math.round(hourlyRaw.temperature_2m ? hourlyRaw.temperature_2m[i] : 28),
        apparentTemperature: Math.round(hourlyRaw.apparent_temperature ? hourlyRaw.apparent_temperature[i] : 28),
        humidity: Math.round(hourlyRaw.relative_humidity_2m ? hourlyRaw.relative_humidity_2m[i] : 65),
        precipitationProbability: Math.round(hourlyRaw.precipitation_probability ? hourlyRaw.precipitation_probability[i] : 0),
        precipitation: Number(hourlyRaw.precipitation ? hourlyRaw.precipitation[i] : 0),
        weatherCode: hCode,
        condition: hCond.condition,
        iconName: hCond.iconName,
        uvIndex: hUv,
        windSpeed: Math.round(hourlyRaw.wind_speed_10m ? hourlyRaw.wind_speed_10m[i] : 10),
        aqi: hAqi,
        isDay: hIsDay,
      });
    }

    // Transform Daily (7 days)
    const daily: DailyForecastItem[] = [];
    const dailyDates: string[] = dailyRaw.time || [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let d = 0; d < Math.min(7, dailyDates.length); d++) {
      const dateStr = dailyDates[d];
      const dDate = new Date(dateStr);
      const dayLabel = d === 0 ? "Today" : dayNames[dDate.getDay()];
      const dCode = dailyRaw.weather_code ? Number(dailyRaw.weather_code[d] ?? 0) : 0;
      const dCond = mapWMOCodeToCondition(dCode, true, false);

      daily.push({
        date: dateStr,
        dayName: dayLabel,
        maxTemp: Math.round(dailyRaw.temperature_2m_max ? dailyRaw.temperature_2m_max[d] : 30),
        minTemp: Math.round(dailyRaw.temperature_2m_min ? dailyRaw.temperature_2m_min[d] : 22),
        weatherCode: dCode,
        condition: dCond.condition,
        iconName: dCond.iconName,
        precipitationProbability: Math.round(dailyRaw.precipitation_probability_max ? dailyRaw.precipitation_probability_max[d] : 0),
        precipitationSum: Number(dailyRaw.precipitation_sum ? dailyRaw.precipitation_sum[d] : 0),
        maxWindSpeed: Math.round(dailyRaw.wind_speed_10m_max ? dailyRaw.wind_speed_10m_max[d] : 15),
        maxUvIndex: Math.round(dailyRaw.uv_index_max ? dailyRaw.uv_index_max[d] : 6),
        avgAqi: rawAqi,
        summary: dCond.label,
      });
    }

    // Risk alerts heuristics
    const { alerts, cycloneSignal } = generateRiskAlerts(current, daily, coords);

    // Packing recommendations
    const { recommendations, summary } = generatePackingRecommendations(
      current,
      daily,
      locationName,
      !!coords.isCoastal
    );

    return {
      coordinates: coords,
      locationName,
      country: coords.country || "Bangladesh",
      timezone: weatherRaw.timezone || "Asia/Dhaka",
      current,
      hourly,
      daily,
      alerts,
      cycloneSignal,
      packingRecommendations: recommendations,
      packingSummary: summary,
      cachedAt: now.toISOString(),
      isStale: false,
      dataSource: "live_meteo",
    };
  }

  /**
   * Clears the weather cache
   */
  public async clearCache(): Promise<void> {
    memoryCache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const weatherKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (weatherKeys.length > 0) {
        await AsyncStorage.multiRemove(weatherKeys);
      }
    } catch (e) {
      console.warn("[WeatherService] Failed to clear storage cache:", e);
    }
  }
}

export const weatherService = WeatherService.getInstance();
