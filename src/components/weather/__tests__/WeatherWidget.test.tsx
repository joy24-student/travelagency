jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock(
  "expo-asset",
  () => ({
    Asset: {
      loadAsync: jest.fn(() => Promise.resolve()),
      fromModule: jest.fn(() => ({ uri: "test" })),
    },
  }),
  { virtual: true }
);

jest.mock("expo-font", () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

import React from "react";
import renderer, { act } from "react-test-renderer";
import { WeatherWidget } from "../WeatherWidget";
import { ComprehensiveWeatherData } from "../../../services/weather/weatherService";

const mockWeatherData: ComprehensiveWeatherData = {
  coordinates: {
    latitude: 21.4272,
    longitude: 92.0058,
    name: "Cox's Bazar",
    country: "Bangladesh",
    isCoastal: true,
  },
  locationName: "Cox's Bazar",
  country: "Bangladesh",
  timezone: "Asia/Dhaka",
  current: {
    temperature: 29,
    apparentTemperature: 33,
    humidity: 76,
    windSpeed: 18,
    windDirection: 180,
    windGusts: 25,
    precipitation: 0,
    precipitationProbability: 15,
    weatherCode: 0,
    condition: "Golden Hour",
    iconName: "partly-sunny",
    isDay: true,
    isGoldenHour: true,
    uvIndex: 7,
    uvCategory: "High",
    aqi: 68,
    aqiCategory: "Moderate",
    aqiColor: "#F59E0B",
    timestamp: new Date().toISOString(),
  },
  hourly: [
    {
      time: new Date().toISOString(),
      timeFormatted: "Now",
      temperature: 29,
      apparentTemperature: 33,
      humidity: 76,
      precipitationProbability: 15,
      precipitation: 0,
      weatherCode: 0,
      condition: "Golden Hour",
      iconName: "partly-sunny",
      uvIndex: 7,
      windSpeed: 18,
      aqi: 68,
      isDay: true,
    },
  ],
  daily: [
    {
      date: "2026-11-06",
      dayName: "Today",
      maxTemp: 31,
      minTemp: 24,
      weatherCode: 0,
      condition: "Golden Hour",
      iconName: "partly-sunny",
      precipitationProbability: 15,
      precipitationSum: 0,
      maxWindSpeed: 20,
      maxUvIndex: 8,
      avgAqi: 68,
      summary: "Golden Hour",
    },
  ],
  alerts: [],
  cycloneSignal: null,
  packingRecommendations: [
    {
      id: "pack-sunscreen",
      item: "Broad-Spectrum SPF 50+ Sunscreen",
      category: "health",
      reason: "High UV index during daytime exploration.",
      icon: "sunny-outline",
      urgency: "essential",
    },
    {
      id: "pack-umbrella",
      item: "Compact Umbrella",
      category: "gear",
      reason: "Possible evening coastal showers.",
      icon: "umbrella-outline",
      urgency: "recommended",
    },
  ],
  packingSummary: "Pack an umbrella today · Bring SPF 50+ sunscreen",
  cachedAt: new Date().toISOString(),
  isStale: false,
  dataSource: "live_meteo",
};

describe("WeatherWidget Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders card variant correctly with meteorological metrics, Golden Hour, and packing recommendations", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <WeatherWidget location="Cox's Bazar" variant="card" initialData={mockWeatherData} />
      );
    });

    const json = tree.toJSON();
    expect(json).toBeDefined();

    const str = JSON.stringify(json);
    expect(str).toContain("29");
    expect(str).toContain("Golden Hour");
    expect(str).toContain("Cox's Bazar");
    expect(str).toContain("Travel Packing Guide");
    expect(str).toContain("Pack an umbrella today");
    expect(str).toContain("UV Index");
    expect(str).toContain("Air Quality");
  });

  it("renders compact variant with temperature and packing summary", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <WeatherWidget location="Cox's Bazar" variant="compact" initialData={mockWeatherData} />
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("29");
    expect(str).toContain("Golden Hour");
    expect(str).toContain("AQI");
    expect(str).toContain("68");
    expect(str).toContain("Pack an umbrella today");
  });

  it("renders banner variant when active storm/cyclone signal or alert exists", async () => {
    const stormData: ComprehensiveWeatherData = {
      ...mockWeatherData,
      cycloneSignal: {
        isApplicable: true,
        signalNumber: 6,
        signalName: "Danger Signal No. 6",
        warningLevel: "Danger",
        coastalZone: "Chittagong & Cox's Bazar Maritime Ports",
        maritimeAdvisory: "All sea vessels must remain anchored.",
        publicAdvisory: "Beach access suspended. Move inland.",
        color: "#EA580C",
      },
      alerts: [
        {
          id: "alert-storm",
          type: "cyclone",
          severity: "warning",
          headline: "BMD Warning: Danger Signal No. 6",
          description: "Severe weather threatening maritime ports.",
          recommendedAction: "Move inland.",
          issuedAt: new Date().toISOString(),
          color: "#EA580C",
        },
      ],
    };

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <WeatherWidget location="Cox's Bazar" variant="banner" initialData={stormData} />
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Danger Signal No. 6");
    expect(str).toContain("Beach access suspended");
  });

  it("handles Thunderstorm condition styling and iconography", async () => {
    const thunderstormData: ComprehensiveWeatherData = {
      ...mockWeatherData,
      current: {
        ...mockWeatherData.current,
        temperature: 24,
        condition: "Thunderstorm",
        iconName: "thunderstorm",
        isGoldenHour: false,
      },
    };

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <WeatherWidget location="Sylhet" variant="card" initialData={thunderstormData} />
      );
    });

    const str = JSON.stringify(tree.toJSON());
    expect(str).toContain("Thunderstorm");
    expect(str).toContain("24");
  });
});
