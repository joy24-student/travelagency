jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import {
  WeatherService,
  weatherService,
  mapWMOCodeToCondition,
  getUVSeverity,
  getAQISeverity,
  isCoastalBangladesh,
  evaluateCoastalCycloneSignal,
  generateRiskAlerts,
  generatePackingRecommendations,
  CurrentWeather,
  DailyForecastItem,
  GPSCoordinates,
} from "../weatherService";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("Meteorological Data Systems - WeatherService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await weatherService.clearCache();
  });

  describe("Requirement 1: Geodetic Coordinate Resolution & Multi-Source API", () => {
    it("should resolve known Bangladesh coastal ports with high precision coordinates", async () => {
      const coxsBazar = await weatherService.resolveCoordinates("Cox's Bazar");
      expect(coxsBazar.latitude).toBeCloseTo(21.4272, 3);
      expect(coxsBazar.longitude).toBeCloseTo(92.0058, 3);
      expect(coxsBazar.isCoastal).toBe(true);

      const saintMartin = await weatherService.resolveCoordinates("Saint Martin");
      expect(saintMartin.latitude).toBeCloseTo(20.6277, 3);
      expect(saintMartin.longitude).toBeCloseTo(92.3228, 3);
      expect(saintMartin.isCoastal).toBe(true);

      const kuakata = await weatherService.resolveCoordinates("Kuakata");
      expect(kuakata.latitude).toBeCloseTo(21.8167, 3);
      expect(kuakata.isCoastal).toBe(true);
    });

    it("should resolve inland and international tourist destinations", async () => {
      const sylhet = await weatherService.resolveCoordinates("Sylhet");
      expect(sylhet.latitude).toBeCloseTo(24.8949, 3);
      expect(sylhet.isCoastal).toBe(false);

      const tokyo = await weatherService.resolveCoordinates("Tokyo");
      expect(tokyo.latitude).toBeCloseTo(35.6762, 3);
      expect(tokyo.country).toBe("Japan");

      const bali = await weatherService.resolveCoordinates("Bali");
      expect(bali.latitude).toBeCloseTo(-8.4095, 3);
    });

    it("should correctly identify coastal Bay of Bengal zone", () => {
      // Inside coastal BD zone
      expect(isCoastalBangladesh(21.4272, 92.0058)).toBe(true); // Cox's Bazar
      expect(isCoastalBangladesh(20.6277, 92.3228)).toBe(true); // Saint Martin
      expect(isCoastalBangladesh(22.3569, 91.7832)).toBe(true); // Chittagong Port

      // Outside coastal zone
      expect(isCoastalBangladesh(24.8949, 91.8687)).toBe(false); // Sylhet
      expect(isCoastalBangladesh(48.8566, 2.3522)).toBe(false); // Paris
    });

    it("should accurately translate WMO weather codes into conditions, labels, and icons", () => {
      // Clear
      const clearDay = mapWMOCodeToCondition(0, true, false);
      expect(clearDay.condition).toBe("Clear");
      expect(clearDay.iconName).toBe("sunny");

      // Golden Hour
      const golden = mapWMOCodeToCondition(0, true, true);
      expect(golden.condition).toBe("Golden Hour");
      expect(golden.iconName).toBe("partly-sunny");

      // Drizzle
      const drizzle = mapWMOCodeToCondition(51, true, false);
      expect(drizzle.condition).toBe("Drizzle");
      expect(drizzle.iconName).toBe("rainy-outline");

      // Rain & Heavy Rain
      const rain = mapWMOCodeToCondition(61, true, false);
      expect(rain.condition).toBe("Rain");
      const heavyRain = mapWMOCodeToCondition(65, true, false);
      expect(heavyRain.condition).toBe("Heavy Rain");

      // Thunderstorm
      const storm = mapWMOCodeToCondition(95, true, false);
      expect(storm.condition).toBe("Thunderstorm");
      expect(storm.iconName).toBe("thunderstorm");
    });

    it("should classify UV Index correctly", () => {
      expect(getUVSeverity(1.5)).toBe("Low");
      expect(getUVSeverity(4.0)).toBe("Moderate");
      expect(getUVSeverity(6.5)).toBe("High");
      expect(getUVSeverity(9.0)).toBe("Very High");
      expect(getUVSeverity(11.5)).toBe("Extreme");
    });

    it("should categorize US AQI index values accurately", () => {
      expect(getAQISeverity(42).category).toBe("Good");
      expect(getAQISeverity(75).category).toBe("Moderate");
      expect(getAQISeverity(135).category).toBe("Unhealthy for Sensitive Groups");
      expect(getAQISeverity(170).category).toBe("Unhealthy");
      expect(getAQISeverity(240).category).toBe("Very Unhealthy");
      expect(getAQISeverity(350).category).toBe("Hazardous");
    });
  });

  describe("Requirement 2: Weather Risk Heuristics Engine", () => {
    it("should trigger BMD Great Danger Signal No. 10 for super cyclone in coastal Bangladesh", () => {
      // Cox's Bazar coastal coords with 120 km/h wind
      const signal = evaluateCoastalCycloneSignal(21.4272, 92.0058, 120, 145, 95, 120);
      expect(signal).not.toBeNull();
      expect(signal?.signalNumber).toBe(10);
      expect(signal?.warningLevel).toBe("Great Danger");
      expect(signal?.signalName).toContain("Great Danger Signal No. 10");
      expect(signal?.publicAdvisory).toContain("Immediate evacuation");
    });

    it("should trigger BMD Danger Signal No. 6 for severe cyclonic winds", () => {
      const signal = evaluateCoastalCycloneSignal(20.6277, 92.3228, 65, 80, 95, 60);
      expect(signal).not.toBeNull();
      expect(signal?.signalNumber).toBe(6);
      expect(signal?.warningLevel).toBe("Danger");
    });

    it("should trigger BMD Local Cautionary Signal No. 3 for squally coastal weather", () => {
      const signal = evaluateCoastalCycloneSignal(21.4272, 92.0058, 42, 50, 80, 25);
      expect(signal).not.toBeNull();
      expect(signal?.signalNumber).toBe(3);
      expect(signal?.warningLevel).toBe("Cautionary");
    });

    it("should NOT trigger BMD coastal cyclone signals for inland destinations", () => {
      // Dhaka or Sylhet with 65 km/h wind
      const signal = evaluateCoastalCycloneSignal(23.8103, 90.4125, 65, 75, 95, 80);
      expect(signal).toBeNull();
    });

    it("should trigger Torrential Rainfall and Flash Flood Warning for high precipitation", () => {
      const current: CurrentWeather = {
        temperature: 27,
        apparentTemperature: 30,
        humidity: 92,
        windSpeed: 18,
        windDirection: 180,
        precipitation: 18,
        precipitationProbability: 95,
        weatherCode: 65,
        condition: "Heavy Rain",
        iconName: "thunderstorm-outline",
        isDay: true,
        isGoldenHour: false,
        uvIndex: 2,
        uvCategory: "Low",
        aqi: 45,
        aqiCategory: "Good",
        aqiColor: "#10B981",
        timestamp: new Date().toISOString(),
      };

      const daily: DailyForecastItem[] = [
        {
          date: "2026-11-06",
          dayName: "Today",
          maxTemp: 29,
          minTemp: 24,
          weatherCode: 65,
          condition: "Heavy Rain",
          iconName: "thunderstorm-outline",
          precipitationProbability: 95,
          precipitationSum: 85, // 85 mm rain!
          maxWindSpeed: 25,
          maxUvIndex: 3,
          avgAqi: 45,
          summary: "Heavy Downpour",
        },
      ];

      const coords: GPSCoordinates = { latitude: 24.8949, longitude: 91.8687, name: "Sylhet" };
      const { alerts } = generateRiskAlerts(current, daily, coords);

      const rainAlert = alerts.find((a) => a.type === "heavy_rainfall");
      expect(rainAlert).toBeDefined();
      expect(rainAlert?.severity).toBe("warning");
      expect(rainAlert?.headline).toContain("Torrential Downpour");
    });

    it("should trigger Extreme Heatwave Warning when temperature exceeds 40°C", () => {
      const current: CurrentWeather = {
        temperature: 41,
        apparentTemperature: 46,
        humidity: 68,
        windSpeed: 10,
        windDirection: 270,
        precipitation: 0,
        precipitationProbability: 0,
        weatherCode: 0,
        condition: "Clear",
        iconName: "sunny",
        isDay: true,
        isGoldenHour: false,
        uvIndex: 11,
        uvCategory: "Extreme",
        aqi: 120,
        aqiCategory: "Unhealthy for Sensitive Groups",
        aqiColor: "#F97316",
        timestamp: new Date().toISOString(),
      };

      const daily: DailyForecastItem[] = [
        {
          date: "2026-11-06",
          dayName: "Today",
          maxTemp: 42,
          minTemp: 29,
          weatherCode: 0,
          condition: "Clear",
          iconName: "sunny",
          precipitationProbability: 0,
          precipitationSum: 0,
          maxWindSpeed: 12,
          maxUvIndex: 11,
          avgAqi: 120,
          summary: "Clear Sky",
        },
      ];

      const coords: GPSCoordinates = { latitude: 24.3636, longitude: 88.6241, name: "Rajshahi" };
      const { alerts } = generateRiskAlerts(current, daily, coords);

      const heatwave = alerts.find((a) => a.type === "heatwave");
      expect(heatwave).toBeDefined();
      expect(heatwave?.severity).toBe("warning");
      expect(heatwave?.headline).toContain("Extreme Heatwave Alert");
    });
  });

  describe("Requirement 3: Dynamic Packing Recommendations", () => {
    it("should recommend umbrella and rain poncho when rain probability is high", () => {
      const current: CurrentWeather = {
        temperature: 26,
        apparentTemperature: 28,
        humidity: 85,
        windSpeed: 12,
        windDirection: 180,
        precipitation: 5,
        precipitationProbability: 80,
        weatherCode: 61,
        condition: "Rain",
        iconName: "rainy",
        isDay: true,
        isGoldenHour: false,
        uvIndex: 3,
        uvCategory: "Moderate",
        aqi: 50,
        aqiCategory: "Good",
        aqiColor: "#10B981",
        timestamp: new Date().toISOString(),
      };

      const daily: DailyForecastItem[] = [
        {
          date: "2026-11-06",
          dayName: "Today",
          maxTemp: 28,
          minTemp: 23,
          weatherCode: 61,
          condition: "Rain",
          iconName: "rainy",
          precipitationProbability: 85,
          precipitationSum: 22,
          maxWindSpeed: 15,
          maxUvIndex: 4,
          avgAqi: 50,
          summary: "Moderate Rain",
        },
      ];

      const { recommendations, summary } = generatePackingRecommendations(current, daily, "Sylhet", false);

      expect(summary).toContain("Pack an umbrella today");
      const umbrella = recommendations.find((r) => r.id === "pack-umbrella");
      expect(umbrella).toBeDefined();
      expect(umbrella?.urgency).toBe("essential");
    });

    it("should recommend SPF 50+ sunscreen and UV sunglasses when UV index is high", () => {
      const current: CurrentWeather = {
        temperature: 31,
        apparentTemperature: 34,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180,
        precipitation: 0,
        precipitationProbability: 5,
        weatherCode: 0,
        condition: "Clear",
        iconName: "sunny",
        isDay: true,
        isGoldenHour: false,
        uvIndex: 9, // Very high UV
        uvCategory: "Very High",
        aqi: 65,
        aqiCategory: "Moderate",
        aqiColor: "#F59E0B",
        timestamp: new Date().toISOString(),
      };

      const daily: DailyForecastItem[] = [
        {
          date: "2026-11-06",
          dayName: "Today",
          maxTemp: 32,
          minTemp: 24,
          weatherCode: 0,
          condition: "Clear",
          iconName: "sunny",
          precipitationProbability: 5,
          precipitationSum: 0,
          maxWindSpeed: 12,
          maxUvIndex: 9,
          avgAqi: 65,
          summary: "Clear Sky",
        },
      ];

      const { recommendations, summary } = generatePackingRecommendations(current, daily, "Cox's Bazar", true);

      expect(summary).toContain("Bring SPF 50+ sunscreen");
      const sunscreen = recommendations.find((r) => r.id === "pack-sunscreen");
      expect(sunscreen).toBeDefined();
      expect(sunscreen?.urgency).toBe("essential");

      const phonePouch = recommendations.find((r) => r.id === "pack-waterproof-pouch");
      expect(phonePouch).toBeDefined(); // Beach/coastal accessory
    });

    it("should recommend N95 mask when AQI is unhealthy", () => {
      const current: CurrentWeather = {
        temperature: 28,
        apparentTemperature: 30,
        humidity: 55,
        windSpeed: 8,
        windDirection: 300,
        precipitation: 0,
        precipitationProbability: 0,
        weatherCode: 1,
        condition: "Clear",
        iconName: "sunny-outline",
        isDay: true,
        isGoldenHour: false,
        uvIndex: 5,
        uvCategory: "Moderate",
        aqi: 185, // Unhealthy
        aqiCategory: "Unhealthy",
        aqiColor: "#EF4444",
        timestamp: new Date().toISOString(),
      };

      const daily: DailyForecastItem[] = [
        {
          date: "2026-11-06",
          dayName: "Today",
          maxTemp: 30,
          minTemp: 20,
          weatherCode: 1,
          condition: "Clear",
          iconName: "sunny-outline",
          precipitationProbability: 0,
          precipitationSum: 0,
          maxWindSpeed: 10,
          maxUvIndex: 5,
          avgAqi: 185,
          summary: "Mainly Clear",
        },
      ];

      const { recommendations } = generatePackingRecommendations(current, daily, "Dhaka", false);
      const mask = recommendations.find((r) => r.id === "pack-n95-mask");
      expect(mask).toBeDefined();
      expect(mask?.urgency).toBe("essential");
    });
  });

  describe("Requirement 4: 1-Hour Caching & Offline Fallback", () => {
    it("should retrieve meteorological data and return offline fallback when network is unavailable", async () => {
      // Clear cache first
      await weatherService.clearCache();

      const weather = await weatherService.getComprehensiveWeather("Cox's Bazar");

      expect(weather).toBeDefined();
      expect(weather.locationName).toBe("Cox's Bazar");
      expect(weather.coordinates.latitude).toBeCloseTo(21.4272, 3);
      expect(weather.current.temperature).toBeDefined();
      expect(weather.current.humidity).toBeDefined();
      expect(weather.current.aqi).toBeGreaterThanOrEqual(0);
      expect(weather.hourly.length).toBeGreaterThanOrEqual(16);
      expect(weather.daily.length).toBe(7);
      expect(weather.packingRecommendations.length).toBeGreaterThan(0);
    });

    it("should hit cache for subsequent calls within 1-hour window", async () => {
      const first = await weatherService.getComprehensiveWeather("Sajek Valley");
      const second = await weatherService.getComprehensiveWeather("Sajek Valley");

      expect(second.locationName).toBe(first.locationName);
      expect(second.coordinates.latitude).toBe(first.coordinates.latitude);
      expect(second.current.temperature).toBe(first.current.temperature);
      expect(second.dataSource).toBe("cache");
    });
  });
});
