import { Linking, Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface GeoLocationResult {
  success: boolean;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  cityName?: string;
  errorMessage?: string;
  isDenied?: boolean;
}

export interface CityHub {
  id: string;
  name: string;
  nameBn: string;
  country: string;
  latitude: number;
  longitude: number;
  tag: string;
}

export const POPULAR_CITY_HUBS: CityHub[] = [
  { id: "cox", name: "Cox's Bazar", nameBn: "কক্সবাজার", country: "Bangladesh", latitude: 21.4272, longitude: 92.0058, tag: "Sea Beach" },
  { id: "dha", name: "Dhaka", nameBn: "ঢাকা", country: "Bangladesh", latitude: 23.8103, longitude: 90.4125, tag: "Capital" },
  { id: "syl", name: "Sylhet", nameBn: "সিলেট", country: "Bangladesh", latitude: 24.8949, longitude: 91.8687, tag: "Tea Gardens" },
  { id: "ctg", name: "Chittagong", nameBn: "চট্টগ্রাম", country: "Bangladesh", latitude: 22.3569, longitude: 91.7832, tag: "Port City" },
  { id: "saj", name: "Sajek Valley", nameBn: "সাজেক ভ্যালি", country: "Bangladesh", latitude: 23.382, longitude: 92.2938, tag: "Hills & Clouds" },
  { id: "sre", name: "Sreemangal", nameBn: "শ্রীমঙ্গল", country: "Bangladesh", latitude: 24.3065, longitude: 91.7296, tag: "Rainforest" },
  { id: "ban", name: "Bandarban", nameBn: "বান্দরবান", country: "Bangladesh", latitude: 22.1953, longitude: 92.2184, tag: "Mountains" },
  { id: "kua", name: "Kuakata", nameBn: "কুয়াকাটা", country: "Bangladesh", latitude: 21.8167, longitude: 90.1167, tag: "Sunrise & Sunset" },
  { id: "stm", name: "Saint Martin", nameBn: "সেন্ট মার্টিন", country: "Bangladesh", latitude: 20.6277, longitude: 92.3228, tag: "Coral Island" },
  { id: "khu", name: "Sundarbans / Khulna", nameBn: "খুলনা / সুন্দরবন", country: "Bangladesh", latitude: 22.8456, longitude: 89.5403, tag: "Mangrove Forest" },
  { id: "dxb", name: "Dubai", nameBn: "দুবাই", country: "UAE", latitude: 25.2048, longitude: 55.2708, tag: "International" },
  { id: "bkk", name: "Bangkok", nameBn: "ব্যাংকক", country: "Thailand", latitude: 13.7563, longitude: 100.5018, tag: "International" },
  { id: "sin", name: "Singapore", nameBn: "সিঙ্গাপুর", country: "Singapore", latitude: 1.3521, longitude: 103.8198, tag: "International" },
  { id: "kul", name: "Kuala Lumpur", nameBn: "কুয়ালালামপুর", country: "Malaysia", latitude: 3.139, longitude: 101.6869, tag: "International" },
];

const LAST_KNOWN_LOCATION_KEY = "@shopno_last_known_location";

export const locationService = {
  /**
   * Request device location with fallback detection
   */
  async getCurrentLocation(): Promise<GeoLocationResult> {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const coords = await new Promise<{ latitude: number; longitude: number; accuracy?: number }>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                });
              },
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
            );
          }
        );

        // Find nearest city from known hubs
        const nearest = this.getNearestCity(coords.latitude, coords.longitude);

        await AsyncStorage.setItem(
          LAST_KNOWN_LOCATION_KEY,
          JSON.stringify({ coords, cityName: nearest?.name || "Local Destination" })
        ).catch(() => {});

        return {
          success: true,
          coords,
          cityName: nearest?.name || "My Location",
        };
      } catch (err: any) {
        const isPermissionDenied = err?.code === 1 || err?.message?.toLowerCase().includes("denied");
        return {
          success: false,
          isDenied: isPermissionDenied,
          errorMessage: isPermissionDenied
            ? "লোকেশন অনুমতি দেওয়া হয়নি। সেটিংসে গিয়ে অনুমতি দিন অথবা নিচের তালিকা থেকে শহর বেছে নিন।"
            : "লোকেশন নির্ণয় করা যায়নি। অনুগ্রহ করে শহর বেছে নিন।",
        };
      }
    }

    // Try reading cached location
    try {
      const cached = await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          success: true,
          coords: parsed.coords,
          cityName: parsed.cityName,
        };
      }
    } catch {}

    return {
      success: false,
      errorMessage: "ডিভাইস লোকেশন সেবা উপলব্ধ নয়। শহর সার্চ ব্যবহার করুন।",
    };
  },

  /**
   * Find closest city to given coordinates using Haversine formula
   */
  getNearestCity(lat: number, lon: number): CityHub | null {
    let closest: CityHub | null = null;
    let minDistance = Infinity;

    for (const city of POPULAR_CITY_HUBS) {
      const dLat = ((city.latitude - lat) * Math.PI) / 180;
      const dLon = ((city.longitude - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((city.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c; // Earth radius in KM

      if (dist < minDistance) {
        minDistance = dist;
        closest = city;
      }
    }

    return closest;
  },

  /**
   * Search city list by Bangla or English keyword
   */
  searchCities(query: string): CityHub[] {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_CITY_HUBS;

    return POPULAR_CITY_HUBS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameBn.includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q)
    );
  },

  /**
   * Open app settings when location permission is permanently denied
   */
  openLocationSettings() {
    Alert.alert(
      "লোকেশন অনুমতি প্রয়োজন",
      "আপনার বর্তমান স্থানের আবহাওয়া ও কাছাকাছি দর্শনীয় স্থান দেখতে অ্যাপ সেটিংসে গিয়ে লোকেশন অনুমতি দিন।",
      [
        { text: "সেটিংসে খুলুন", onPress: () => Linking.openSettings() },
        { text: "বাতিল", style: "cancel" },
      ]
    );
  },
};
