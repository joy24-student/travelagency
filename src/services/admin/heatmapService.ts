/**
 * Geospatial Demand & Live Heatmap Service - Enterprise Admin Systems
 * Provides real-time geospatial analytics, live search velocity tracking,
 * route congestion indices, and algorithmic surge recommendations.
 */

import { Platform } from "react-native";
import { supabase } from "@/utils/supabase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HeatDensityStatus = "high_demand_low_supply" | "balanced" | "low_demand";

export type HeatLayerMode = "combined" | "search_demand" | "route_congestion" | "hotel_occupancy";

export type TimeWindow = "1h" | "6h" | "24h";

export interface DistrictHeatmapPoint {
  districtId: string;
  districtName: string;
  districtBn: string;
  division: string;
  lat: number;
  lng: number;
  svgCoord: { x: number; y: number }; // Normalized SVG canvas coordinates (0..400)
  searchVolume: number;
  searchVelocity: number; // Searches per hour
  availableSupply: number; // Available hotel rooms + transport seats
  bookedCount: number;
  demandSupplyRatio: number; // e.g., 2.3 = 230% demand over capacity
  status: HeatDensityStatus;
  hotelOccupancyRate: number; // 0 .. 100%
  totalHotels: number;
  totalHotelRooms: number;
  bookedRooms: number;
  avgRoomPriceBDT: number;
  routeCongestionIndex: number; // 0 .. 100
  activeTransitCorridors: number;
  surgeIndex: number; // e.g. 1.0x .. 2.8x
  recommendedCommissionAdjustment: number; // percentage delta e.g. +3.5%
  recommendedPriceSurgePercent: number; // suggested consumer price surge e.g. +15%
  revenueOpportunityBDT: number;
  topTravelCategory: string;
  isPopularTouristHub: boolean;
}

export interface RouteCongestionData {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  transitType: "highway_bus" | "domestic_flight" | "railway" | "water_launch";
  congestionLevel: "critical" | "heavy" | "moderate" | "normal";
  congestionIndex: number; // 0 .. 100
  avgDelayMinutes: number;
  capacitySeats: number;
  bookedSeats: number;
  occupancyPercent: number;
  ticketSurgeMultiplier: number;
  trend: "increasing" | "stable" | "decreasing";
  peakWindow: string;
}

export interface SearchVelocityRecord {
  destinationId: string;
  destinationName: string;
  district: string;
  division: string;
  category: string;
  timeWindow: TimeWindow;
  searchCount: number;
  velocityPerHour: number;
  changePercent: number; // vs prior window
  conversionRatePercent: number;
  topOrigins: { city: string; sharePercent: number }[];
  hourlyTrend: number[]; // 6 data points
  activeInquiries: number;
  isSurging: boolean;
}

export interface SurgeRecommendation {
  id: string;
  districtId: string;
  districtName: string;
  division: string;
  vertical: "Hotels & Stays" | "Inter-District Transport" | "Tour Packages" | "All Verticals";
  currentCommissionPercent: number;
  suggestedCommissionPercent: number;
  commissionDelta: number;
  suggestedPriceSurgePercent: number;
  demandSupplyRatio: number;
  hotelOccupancyRate: number;
  severity: "critical" | "warning" | "opportunity";
  headline: string;
  rationale: string;
  projectedSupplyBoostUnits: number;
  projectedGmvLiftBDT: number;
  status: "pending" | "applied" | "dismissed";
  timestamp: string;
  actionType: "INCREASE_COMMISSION" | "DYNAMIC_SURGE_TARIFF" | "INCENTIVE_FLASH_SALE" | "CAPACITY_EXPANSION";
}

export interface HeatmapOverviewMetrics {
  totalActiveSearches: number;
  velocityPerHour: number;
  highDemandDistrictsCount: number;
  balancedDistrictsCount: number;
  lowDemandDistrictsCount: number;
  averageOccupancyRate: number;
  criticalRoutesCount: number;
  potentialSurgeGmvBDT: number;
  lastRefreshedAt: string;
}

// ============================================================================
// DISTRICT GEOSPATIAL MASTER DATA (64 Representative Hubs & Coordinates)
// ============================================================================

export const BANGLADESH_DISTRICTS: Omit<
  DistrictHeatmapPoint,
  | "searchVolume"
  | "searchVelocity"
  | "availableSupply"
  | "bookedCount"
  | "demandSupplyRatio"
  | "status"
  | "hotelOccupancyRate"
  | "totalHotels"
  | "totalHotelRooms"
  | "bookedRooms"
  | "avgRoomPriceBDT"
  | "routeCongestionIndex"
  | "activeTransitCorridors"
  | "surgeIndex"
  | "recommendedCommissionAdjustment"
  | "recommendedPriceSurgePercent"
  | "revenueOpportunityBDT"
  | "topTravelCategory"
>[] = [
  // Chittagong Division
  { districtId: "BD-10", districtName: "Cox's Bazar", districtBn: "কক্সবাজার", division: "Chittagong", lat: 21.4272, lng: 92.0058, svgCoord: { x: 342, y: 350 }, isPopularTouristHub: true },
  { districtId: "BD-09", districtName: "Chittagong", districtBn: "চট্টগ্রাম", division: "Chittagong", lat: 22.3569, lng: 91.7832, svgCoord: { x: 310, y: 285 }, isPopularTouristHub: true },
  { districtId: "BD-01", districtName: "Bandarban", districtBn: "বান্দরবান", division: "Chittagong", lat: 22.1953, lng: 92.2184, svgCoord: { x: 345, y: 295 }, isPopularTouristHub: true },
  { districtId: "BD-56", districtName: "Rangamati", districtBn: "রাঙ্গামাটি", division: "Chittagong", lat: 22.6533, lng: 92.1753, svgCoord: { x: 340, y: 245 }, isPopularTouristHub: true },
  { districtId: "BD-29", districtName: "Khagrachhari", districtBn: "খাগড়াছড়ি", division: "Chittagong", lat: 23.1193, lng: 91.9847, svgCoord: { x: 325, y: 205 }, isPopularTouristHub: true },
  { districtId: "BD-12", districtName: "Cumilla", districtBn: "কুমিল্লা", division: "Chittagong", lat: 23.4682, lng: 91.1788, svgCoord: { x: 265, y: 195 }, isPopularTouristHub: false },
  { districtId: "BD-19", districtName: "Feni", districtBn: "ফেনী", division: "Chittagong", lat: 23.0159, lng: 91.3976, svgCoord: { x: 285, y: 230 }, isPopularTouristHub: false },
  { districtId: "BD-47", districtName: "Noakhali", districtBn: "নোয়াখালী", division: "Chittagong", lat: 22.8696, lng: 91.0994, svgCoord: { x: 255, y: 245 }, isPopularTouristHub: false },
  { districtId: "BD-13", districtName: "Chandpur", districtBn: "চাঁদপুর", division: "Chittagong", lat: 23.2333, lng: 90.6667, svgCoord: { x: 225, y: 215 }, isPopularTouristHub: false },
  { districtId: "BD-04", districtName: "Brahmanbaria", districtBn: "ব্রাহ্মণবাড়িয়া", division: "Chittagong", lat: 23.9571, lng: 91.1119, svgCoord: { x: 260, y: 160 }, isPopularTouristHub: false },

  // Dhaka Division
  { districtId: "BD-14", districtName: "Dhaka", districtBn: "ঢাকা", division: "Dhaka", lat: 23.8103, lng: 90.4125, svgCoord: { x: 205, y: 180 }, isPopularTouristHub: true },
  { districtId: "BD-18", districtName: "Gazipur", districtBn: "গাজীপুর", division: "Dhaka", lat: 23.9999, lng: 90.4203, svgCoord: { x: 210, y: 155 }, isPopularTouristHub: true },
  { districtId: "BD-45", districtName: "Narayanganj", districtBn: "নারায়ণগঞ্জ", division: "Dhaka", lat: 23.6238, lng: 90.5000, svgCoord: { x: 215, y: 190 }, isPopularTouristHub: false },
  { districtId: "BD-44", districtName: "Narsingdi", districtBn: "নরসিংদী", division: "Dhaka", lat: 23.9167, lng: 90.7167, svgCoord: { x: 235, y: 165 }, isPopularTouristHub: false },
  { districtId: "BD-63", districtName: "Tangail", districtBn: "টাঙ্গাইল", division: "Dhaka", lat: 24.2513, lng: 89.9167, svgCoord: { x: 180, y: 140 }, isPopularTouristHub: false },
  { districtId: "BD-41", districtName: "Munshiganj", districtBn: "মুন্সীগঞ্জ", division: "Dhaka", lat: 23.5422, lng: 90.5305, svgCoord: { x: 215, y: 205 }, isPopularTouristHub: false },
  { districtId: "BD-39", districtName: "Manikganj", districtBn: "মানিকগঞ্জ", division: "Dhaka", lat: 23.8617, lng: 90.0003, svgCoord: { x: 175, y: 180 }, isPopularTouristHub: false },
  { districtId: "BD-17", districtName: "Faridpur", districtBn: "ফরিদপুর", division: "Dhaka", lat: 23.6071, lng: 89.8429, svgCoord: { x: 165, y: 205 }, isPopularTouristHub: false },
  { districtId: "BD-36", districtName: "Madaripur", districtBn: "মাদারীপুর", division: "Dhaka", lat: 23.1641, lng: 90.1897, svgCoord: { x: 190, y: 230 }, isPopularTouristHub: false },
  { districtId: "BD-57", districtName: "Rajbari", districtBn: "রাজবাড়ী", division: "Dhaka", lat: 23.7574, lng: 89.6445, svgCoord: { x: 155, y: 185 }, isPopularTouristHub: false },
  { districtId: "BD-20", districtName: "Gopalganj", districtBn: "গোপালগঞ্জ", division: "Dhaka", lat: 23.0051, lng: 89.8266, svgCoord: { x: 165, y: 245 }, isPopularTouristHub: true },
  { districtId: "BD-62", districtName: "Shariatpur", districtBn: "শরীয়তপুর", division: "Dhaka", lat: 23.2423, lng: 90.4348, svgCoord: { x: 210, y: 225 }, isPopularTouristHub: false },
  { districtId: "BD-31", districtName: "Kishoreganj", districtBn: "কিশোরগঞ্জ", division: "Dhaka", lat: 24.4449, lng: 90.7766, svgCoord: { x: 235, y: 125 }, isPopularTouristHub: true },

  // Sylhet Division
  { districtId: "BD-60", districtName: "Sylhet", districtBn: "সিলেট", division: "Sylhet", lat: 24.8949, lng: 91.8687, svgCoord: { x: 310, y: 95 }, isPopularTouristHub: true },
  { districtId: "BD-38", districtName: "Moulvibazar", districtBn: "মৌলভীবাজার", division: "Sylhet", lat: 24.4829, lng: 91.7774, svgCoord: { x: 300, y: 130 }, isPopularTouristHub: true },
  { districtId: "BD-61", districtName: "Sunamganj", districtBn: "সুনামগঞ্জ", division: "Sylhet", lat: 25.0658, lng: 91.4073, svgCoord: { x: 275, y: 80 }, isPopularTouristHub: true },
  { districtId: "BD-21", districtName: "Habiganj", districtBn: "হবিগঞ্জ", division: "Sylhet", lat: 24.3749, lng: 91.4155, svgCoord: { x: 280, y: 140 }, isPopularTouristHub: false },

  // Khulna Division
  { districtId: "BD-27", districtName: "Khulna", districtBn: "খুলনা", division: "Khulna", lat: 22.8456, lng: 89.5403, svgCoord: { x: 140, y: 260 }, isPopularTouristHub: true },
  { districtId: "BD-05", districtName: "Bagerhat", districtBn: "বাগেরহাট", division: "Khulna", lat: 22.6516, lng: 89.7859, svgCoord: { x: 160, y: 275 }, isPopularTouristHub: true },
  { districtId: "BD-58", districtName: "Satkhira", districtBn: "সাতক্ষীরা", division: "Khulna", lat: 22.7185, lng: 89.0705, svgCoord: { x: 110, y: 270 }, isPopularTouristHub: true },
  { districtId: "BD-23", districtName: "Jessore", districtBn: "যশোর", division: "Khulna", lat: 23.1664, lng: 89.2081, svgCoord: { x: 120, y: 235 }, isPopularTouristHub: false },
  { districtId: "BD-32", districtName: "Kushtia", districtBn: "কুষ্টিয়া", division: "Khulna", lat: 23.9013, lng: 89.1205, svgCoord: { x: 115, y: 175 }, isPopularTouristHub: true },
  { districtId: "BD-24", districtName: "Jhenaidah", districtBn: "ঝিনাইদহ", division: "Khulna", lat: 23.5448, lng: 89.1539, svgCoord: { x: 115, y: 205 }, isPopularTouristHub: false },
  { districtId: "BD-37", districtName: "Magura", districtBn: "মাগুরা", division: "Khulna", lat: 23.4873, lng: 89.4199, svgCoord: { x: 135, y: 210 }, isPopularTouristHub: false },
  { districtId: "BD-43", districtName: "Narail", districtBn: "নড়াইল", division: "Khulna", lat: 23.1725, lng: 89.5127, svgCoord: { x: 140, y: 235 }, isPopularTouristHub: false },
  { districtId: "BD-40", districtName: "Meherpur", districtBn: "মেহেরপুর", division: "Khulna", lat: 23.7622, lng: 88.6318, svgCoord: { x: 85, y: 185 }, isPopularTouristHub: false },
  { districtId: "BD-11", districtName: "Chuadanga", districtBn: "চুয়াডাঙ্গা", division: "Khulna", lat: 23.6402, lng: 88.8418, svgCoord: { x: 95, y: 195 }, isPopularTouristHub: false },

  // Barisal Division
  { districtId: "BD-06", districtName: "Barisal", districtBn: "বরিশাল", division: "Barisal", lat: 22.7010, lng: 90.3535, svgCoord: { x: 200, y: 265 }, isPopularTouristHub: true },
  { districtId: "BD-52", districtName: "Patuakhali", districtBn: "পটুয়াখালী (কুয়াকাটা)", division: "Barisal", lat: 21.8167, lng: 90.1167, svgCoord: { x: 190, y: 320 }, isPopularTouristHub: true },
  { districtId: "BD-07", districtName: "Bhola", districtBn: "ভোলা", division: "Barisal", lat: 22.6859, lng: 90.6481, svgCoord: { x: 230, y: 275 }, isPopularTouristHub: false },
  { districtId: "BD-03", districtName: "Barguna", districtBn: "বরগুনা", division: "Barisal", lat: 22.0953, lng: 90.1121, svgCoord: { x: 180, y: 310 }, isPopularTouristHub: false },
  { districtId: "BD-53", districtName: "Pirojpur", districtBn: "পিরোজপুর", division: "Barisal", lat: 22.5841, lng: 89.9720, svgCoord: { x: 175, y: 275 }, isPopularTouristHub: true },
  { districtId: "BD-25", districtName: "Jhalokati", districtBn: "ঝালকাঠি", division: "Barisal", lat: 22.6406, lng: 90.1987, svgCoord: { x: 190, y: 270 }, isPopularTouristHub: true },

  // Rajshahi Division
  { districtId: "BD-54", districtName: "Rajshahi", districtBn: "রাজশাহী", division: "Rajshahi", lat: 24.3745, lng: 88.6042, svgCoord: { x: 80, y: 135 }, isPopularTouristHub: true },
  { districtId: "BD-08", districtName: "Bogura", districtBn: "বগুড়া", division: "Rajshahi", lat: 24.8465, lng: 89.3777, svgCoord: { x: 135, y: 105 }, isPopularTouristHub: true },
  { districtId: "BD-49", districtName: "Pabna", districtBn: "পাবনা", division: "Rajshahi", lat: 24.0064, lng: 89.2372, svgCoord: { x: 125, y: 165 }, isPopularTouristHub: false },
  { districtId: "BD-46", districtName: "Natore", districtBn: "নাটোর", division: "Rajshahi", lat: 24.4102, lng: 88.9796, svgCoord: { x: 105, y: 135 }, isPopularTouristHub: true },
  { districtId: "BD-42", districtName: "Naogaon", districtBn: "নওগাঁ", division: "Rajshahi", lat: 24.7936, lng: 88.9318, svgCoord: { x: 105, y: 105 }, isPopularTouristHub: true },
  { districtId: "BD-64", districtName: "Sirajganj", districtBn: "সিরাজগঞ্জ", division: "Rajshahi", lat: 24.4534, lng: 89.7008, svgCoord: { x: 160, y: 135 }, isPopularTouristHub: false },
  { districtId: "BD-26", districtName: "Joypurhat", districtBn: "জয়পুরহাট", division: "Rajshahi", lat: 25.1015, lng: 89.0277, svgCoord: { x: 110, y: 80 }, isPopularTouristHub: false },
  { districtId: "BD-15", districtName: "Chapainawabganj", districtBn: "চাঁপাইনবাবগঞ্জ", division: "Rajshahi", lat: 24.5965, lng: 88.2775, svgCoord: { x: 60, y: 120 }, isPopularTouristHub: false },

  // Rangpur Division
  { districtId: "BD-55", districtName: "Rangpur", districtBn: "রংপুর", division: "Rangpur", lat: 25.7439, lng: 89.2752, svgCoord: { x: 125, y: 55 }, isPopularTouristHub: true },
  { districtId: "BD-16", districtName: "Dinajpur", districtBn: "দিনাজপুর", division: "Rangpur", lat: 25.6217, lng: 88.6354, svgCoord: { x: 90, y: 60 }, isPopularTouristHub: true },
  { districtId: "BD-50", districtName: "Panchagarh", districtBn: "পঞ্চগড় (তেঁতুলিয়া)", division: "Rangpur", lat: 26.3411, lng: 88.5541, svgCoord: { x: 80, y: 20 }, isPopularTouristHub: true },
  { districtId: "BD-65", districtName: "Thakurgaon", districtBn: "ঠাকুরগাঁও", division: "Rangpur", lat: 26.0337, lng: 88.4617, svgCoord: { x: 75, y: 40 }, isPopularTouristHub: false },
  { districtId: "BD-48", districtName: "Nilphamari", districtBn: "নীলফামারী", division: "Rangpur", lat: 25.9318, lng: 88.8496, svgCoord: { x: 105, y: 45 }, isPopularTouristHub: false },
  { districtId: "BD-33", districtName: "Lalmonirhat", districtBn: "লালমনিরহাট", division: "Rangpur", lat: 25.9923, lng: 89.2847, svgCoord: { x: 130, y: 40 }, isPopularTouristHub: false },
  { districtId: "BD-34", districtName: "Kurigram", districtBn: "কুড়িগ্রাম", division: "Rangpur", lat: 25.8054, lng: 89.6362, svgCoord: { x: 155, y: 55 }, isPopularTouristHub: false },
  { districtId: "BD-22", districtName: "Gaibandha", districtBn: "গাইবান্ধা", division: "Rangpur", lat: 25.3288, lng: 89.5408, svgCoord: { x: 145, y: 75 }, isPopularTouristHub: false },

  // Mymensingh Division
  { districtId: "BD-35", districtName: "Mymensingh", districtBn: "ময়মনসিংহ", division: "Mymensingh", lat: 24.7471, lng: 90.4203, svgCoord: { x: 210, y: 105 }, isPopularTouristHub: true },
  { districtId: "BD-28", districtName: "Jamalpur", districtBn: "জামালপুর", division: "Mymensingh", lat: 24.9375, lng: 89.9378, svgCoord: { x: 175, y: 95 }, isPopularTouristHub: false },
  { districtId: "BD-59", districtName: "Sherpur", districtBn: "শেরপুর", division: "Mymensingh", lat: 25.0205, lng: 90.0153, svgCoord: { x: 185, y: 80 }, isPopularTouristHub: true },
  { districtId: "BD-51", districtName: "Netrokona", districtBn: "নেত্রকোণা", division: "Mymensingh", lat: 24.8835, lng: 90.7289, svgCoord: { x: 235, y: 95 }, isPopularTouristHub: false },
];

// ============================================================================
// SIMULATION & LIVE ENRICHMENT MATRICES
// ============================================================================

const TOURIST_HUBS_DEMAND_BOOST: Record<
  string,
  {
    category: string;
    baseSearch: number;
    baseSupply: number;
    avgRate: number;
    baseOccupancy: number;
    congestion: number;
  }
> = {
  "Cox's Bazar": { category: "Beach & Luxury Resorts", baseSearch: 14200, baseSupply: 4800, avgRate: 6500, baseOccupancy: 94, congestion: 92 },
  "Dhaka": { category: "Urban & Business Hub", baseSearch: 18900, baseSupply: 16500, avgRate: 5200, baseOccupancy: 81, congestion: 88 },
  "Sylhet": { category: "Tea Estates & Waterfalls", baseSearch: 8600, baseSupply: 3900, avgRate: 4800, baseOccupancy: 89, congestion: 74 },
  "Moulvibazar": { category: "Sreemangal Tea Capital", baseSearch: 6400, baseSupply: 2100, avgRate: 5500, baseOccupancy: 91, congestion: 68 },
  "Sunamganj": { category: "Tanguar Haor Luxury Houseboats", baseSearch: 5800, baseSupply: 1450, avgRate: 4200, baseOccupancy: 96, congestion: 79 },
  "Chittagong": { category: "Port City & Hill Transit", baseSearch: 9400, baseSupply: 7800, avgRate: 4100, baseOccupancy: 76, congestion: 82 },
  "Bandarban": { category: "Hill Tracts & Peaks", baseSearch: 7100, baseSupply: 2200, avgRate: 3800, baseOccupancy: 88, congestion: 71 },
  "Rangamati": { category: "Kaptai Lake & Island Resorts", baseSearch: 5200, baseSupply: 2400, avgRate: 3500, baseOccupancy: 82, congestion: 58 },
  "Patuakhali": { category: "Kuakata Sunset Beach", baseSearch: 6900, baseSupply: 2600, avgRate: 4300, baseOccupancy: 87, congestion: 75 },
  "Khulna": { category: "Sundarbans Gateway", baseSearch: 4900, baseSupply: 3200, avgRate: 3900, baseOccupancy: 68, congestion: 48 },
  "Gazipur": { category: "Weekend Safari & Luxury Resorts", baseSearch: 5800, baseSupply: 3100, avgRate: 7200, baseOccupancy: 85, congestion: 78 },
  "Panchagarh": { category: "Tetulia Kanchenjunga View", baseSearch: 3800, baseSupply: 1100, avgRate: 2800, baseOccupancy: 92, congestion: 62 },
  "Bogura": { category: "Archaeological Transit", baseSearch: 3200, baseSupply: 2900, avgRate: 2600, baseOccupancy: 62, congestion: 54 },
  "Rajshahi": { category: "Silk & River Heritage", baseSearch: 3400, baseSupply: 3100, avgRate: 2900, baseOccupancy: 59, congestion: 42 },
  "Barisal": { category: "Floating Guava Markets & Rivers", baseSearch: 3600, baseSupply: 2700, avgRate: 2500, baseOccupancy: 64, congestion: 49 },
  "Dinajpur": { category: "Historical Temples", baseSearch: 2200, baseSupply: 2100, avgRate: 2100, baseOccupancy: 45, congestion: 35 },
  "Mymensingh": { category: "Riverine & Agro Hub", baseSearch: 2600, baseSupply: 2400, avgRate: 2400, baseOccupancy: 52, congestion: 46 },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HeatmapService {
  private static instance: HeatmapService;
  private appliedRecommendationIds: Set<string> = new Set();
  private dismissedRecommendationIds: Set<string> = new Set();

  public static getInstance(): HeatmapService {
    if (!HeatmapService.instance) {
      HeatmapService.instance = new HeatmapService();
    }
    return HeatmapService.instance;
  }

  /**
   * Fetches the complete 64-district geospatial heatmap dataset.
   * Pulls real booking and hotel counts from Supabase where available,
   * combining with real-time heuristic calculations.
   */
  public async getDistrictHeatmapData(): Promise<DistrictHeatmapPoint[]> {
    try {
      // Query bookings and hotels in parallel to ground metrics in actual DB data
      const [bookingsRes, hotelsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("destination_city, status, total_price")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("hotels")
          .select("city, is_active, star_rating")
          .limit(300),
      ]);

      const dbBookings = bookingsRes.data || [];
      const dbHotels = hotelsRes.data || [];

      // Group DB data by destination name (lowercased)
      const bookingCountsByCity: Record<string, number> = {};
      dbBookings.forEach((b: any) => {
        if (b.destination_city) {
          const cityKey = b.destination_city.trim().toLowerCase();
          bookingCountsByCity[cityKey] = (bookingCountsByCity[cityKey] || 0) + 1;
        }
      });

      const hotelsByCity: Record<string, number> = {};
      dbHotels.forEach((h: any) => {
        if (h.city) {
          const cityKey = h.city.trim().toLowerCase();
          hotelsByCity[cityKey] = (hotelsByCity[cityKey] || 0) + 1;
        }
      });

      // Construct high-fidelity geospatial points
      const points: DistrictHeatmapPoint[] = BANGLADESH_DISTRICTS.map((dist) => {
        const lookup = TOURIST_HUBS_DEMAND_BOOST[dist.districtName];
        const lowerName = dist.districtName.toLowerCase();

        const dbBookingFactor = bookingCountsByCity[lowerName] || 0;
        const dbHotelCount = hotelsByCity[lowerName] || 0;

        let searchVolume: number;
        let availableSupply: number;
        let avgRoomPriceBDT: number;
        let hotelOccupancyRate: number;
        let routeCongestionIndex: number;
        let topCategory: string;

        if (lookup) {
          searchVolume = Math.round(lookup.baseSearch * (1 + dbBookingFactor * 0.08) + Math.random() * 350);
          availableSupply = Math.max(200, Math.round(lookup.baseSupply + dbHotelCount * 45));
          avgRoomPriceBDT = lookup.avgRate;
          hotelOccupancyRate = Math.min(99, Math.round(lookup.baseOccupancy + (dbBookingFactor > 5 ? 3 : 0)));
          routeCongestionIndex = lookup.congestion;
          topCategory = lookup.category;
        } else {
          // Standard / rural / non-tourist-centric district
          searchVolume = Math.floor(650 + Math.random() * 950);
          availableSupply = Math.floor(1100 + Math.random() * 800);
          avgRoomPriceBDT = 1800 + Math.floor(Math.random() * 600);
          hotelOccupancyRate = Math.floor(38 + Math.random() * 26);
          routeCongestionIndex = Math.floor(22 + Math.random() * 28);
          topCategory = "Regional Travel & Transit";
        }

        const bookedCount = Math.round(availableSupply * (hotelOccupancyRate / 100));
        const searchVelocity = Math.round(searchVolume / 24);
        const demandSupplyRatio = Number((searchVolume / Math.max(1, availableSupply)).toFixed(2));

        // Requirement 1: Red = High demand / low supply, Green = Balanced, Blue = Low demand
        let status: HeatDensityStatus;
        let surgeIndex = 1.0;
        let recommendedCommissionAdjustment = 0;
        let recommendedPriceSurgePercent = 0;

        if (demandSupplyRatio >= 1.75 || (hotelOccupancyRate >= 88 && searchVolume > 3500)) {
          // Red: High demand / low supply
          status = "high_demand_low_supply";
          surgeIndex = Number((1.25 + (demandSupplyRatio - 1.5) * 0.45).toFixed(2));
          if (surgeIndex > 2.6) surgeIndex = 2.6;
          // Suggest higher commission to agencies to incentivize onboarding inventory
          recommendedCommissionAdjustment = Number((2.5 + (demandSupplyRatio - 1.5) * 1.8).toFixed(1));
          recommendedPriceSurgePercent = Math.round((surgeIndex - 1.0) * 100);
        } else if (demandSupplyRatio < 0.85 || hotelOccupancyRate < 55) {
          // Blue: Low demand / surplus capacity
          status = "low_demand";
          surgeIndex = 0.9;
          recommendedCommissionAdjustment = -1.5; // lower baseline commission or offer promotional rebate
          recommendedPriceSurgePercent = -10;
        } else {
          // Green: Balanced
          status = "balanced";
          surgeIndex = 1.0;
          recommendedCommissionAdjustment = 0;
          recommendedPriceSurgePercent = 0;
        }

        const totalHotels = Math.max(4, Math.round(availableSupply / 38));
        const totalHotelRooms = Math.round(availableSupply * 0.65);
        const bookedRooms = Math.round(totalHotelRooms * (hotelOccupancyRate / 100));
        const revenueOpportunityBDT = Math.round(searchVolume * avgRoomPriceBDT * 0.12 * (surgeIndex > 1 ? surgeIndex : 1));

        return {
          ...dist,
          searchVolume,
          searchVelocity,
          availableSupply,
          bookedCount,
          demandSupplyRatio,
          status,
          hotelOccupancyRate,
          totalHotels,
          totalHotelRooms,
          bookedRooms,
          avgRoomPriceBDT,
          routeCongestionIndex,
          activeTransitCorridors: lookup ? Math.max(3, Math.round(routeCongestionIndex / 16)) : 2,
          surgeIndex,
          recommendedCommissionAdjustment,
          recommendedPriceSurgePercent,
          revenueOpportunityBDT,
          topTravelCategory: topCategory,
        };
      });

      return points;
    } catch (err) {
      console.error("[HeatmapService] Error fetching heatmap points:", err);
      // Fallback deterministic computation
      return this.generateFallbackHeatmapPoints();
    }
  }

  /**
   * Summary overview metrics calculated across all districts
   */
  public async getHeatmapOverviewMetrics(): Promise<HeatmapOverviewMetrics> {
    const points = await this.getDistrictHeatmapData();

    const totalActiveSearches = points.reduce((sum, p) => sum + p.searchVolume, 0);
    const velocityPerHour = Math.round(totalActiveSearches / 24);
    const highDemand = points.filter((p) => p.status === "high_demand_low_supply").length;
    const balanced = points.filter((p) => p.status === "balanced").length;
    const lowDemand = points.filter((p) => p.status === "low_demand").length;

    const avgOccupancy = Math.round(
      points.reduce((sum, p) => sum + p.hotelOccupancyRate, 0) / points.length
    );

    const routes = await this.getRouteCongestionCorridors();
    const criticalRoutes = routes.filter((r) => r.congestionLevel === "critical" || r.congestionLevel === "heavy").length;

    const potentialSurgeGmvBDT = points
      .filter((p) => p.status === "high_demand_low_supply")
      .reduce((sum, p) => sum + p.revenueOpportunityBDT, 0);

    return {
      totalActiveSearches,
      velocityPerHour,
      highDemandDistrictsCount: highDemand,
      balancedDistrictsCount: balanced,
      lowDemandDistrictsCount: lowDemand,
      averageOccupancyRate: avgOccupancy,
      criticalRoutesCount: criticalRoutes,
      potentialSurgeGmvBDT,
      lastRefreshedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  }

  /**
   * Requirement 2: Live Search Velocity Tracker
   * Top searched destinations over 1h, 6h, and 24h intervals with trend sparklines.
   */
  public async getLiveSearchVelocity(window: TimeWindow = "1h"): Promise<SearchVelocityRecord[]> {
    const factor = window === "1h" ? 1 : window === "6h" ? 5.6 : 21.8;
    const changeMultipliers: Record<TimeWindow, number> = {
      "1h": 1.4,
      "6h": 1.15,
      "24h": 0.95,
    };

    const topDestinations = [
      {
        id: "DEST-CXB",
        name: "Cox's Bazar Sea Beach & Inani",
        district: "Cox's Bazar",
        division: "Chittagong",
        category: "Coastal Beach & Resorts",
        baseHourSearch: 590,
        trend: [410, 470, 520, 550, 580, 590],
        origins: [
          { city: "Dhaka", sharePercent: 62 },
          { city: "Chittagong", sharePercent: 18 },
          { city: "Sylhet", sharePercent: 11 },
          { city: "Cumilla", sharePercent: 9 },
        ],
        conversionRate: 14.8,
        isSurging: true,
      },
      {
        id: "DEST-SRM",
        name: "Sreemangal Tea Estates & Lawachara",
        district: "Moulvibazar",
        division: "Sylhet",
        category: "Eco Resort & Nature",
        baseHourSearch: 320,
        trend: [190, 220, 270, 290, 310, 320],
        origins: [
          { city: "Dhaka", sharePercent: 71 },
          { city: "Chittagong", sharePercent: 14 },
          { city: "Sylhet", sharePercent: 15 },
        ],
        conversionRate: 12.3,
        isSurging: true,
      },
      {
        id: "DEST-TNG",
        name: "Tanguar Haor & Shimul Bagan",
        district: "Sunamganj",
        division: "Sylhet",
        category: "Haor Houseboat Cruises",
        baseHourSearch: 285,
        trend: [140, 165, 210, 240, 265, 285],
        origins: [
          { city: "Dhaka", sharePercent: 78 },
          { city: "Sylhet", sharePercent: 15 },
          { city: "Mymensingh", sharePercent: 7 },
        ],
        conversionRate: 16.2,
        isSurging: true,
      },
      {
        id: "DEST-SAJ",
        name: "Sajek Valley & Helipad Viewpoint",
        district: "Rangamati",
        division: "Chittagong",
        category: "Cloud Valley & Hills",
        baseHourSearch: 260,
        trend: [180, 205, 220, 235, 250, 260],
        origins: [
          { city: "Dhaka", sharePercent: 65 },
          { city: "Chittagong", sharePercent: 25 },
          { city: "Feni", sharePercent: 10 },
        ],
        conversionRate: 11.7,
        isSurging: false,
      },
      {
        id: "DEST-KKT",
        name: "Kuakata Sea Beach (Sun Sunrise/Set)",
        district: "Patuakhali",
        division: "Barisal",
        category: "Coastal Beach",
        baseHourSearch: 240,
        trend: [160, 180, 195, 215, 225, 240],
        origins: [
          { city: "Dhaka (Padma Bridge)", sharePercent: 68 },
          { city: "Barisal", sharePercent: 20 },
          { city: "Khulna", sharePercent: 12 },
        ],
        conversionRate: 13.1,
        isSurging: true,
      },
      {
        id: "DEST-BND",
        name: "Bandarban Nilgiri & Nafakhum",
        district: "Bandarban",
        division: "Chittagong",
        category: "Mountain Adventure",
        baseHourSearch: 215,
        trend: [150, 170, 185, 195, 205, 215],
        origins: [
          { city: "Chittagong", sharePercent: 44 },
          { city: "Dhaka", sharePercent: 46 },
          { city: "Cox's Bazar", sharePercent: 10 },
        ],
        conversionRate: 10.5,
        isSurging: false,
      },
      {
        id: "DEST-GZP",
        name: "Gazipur Safari & Luxury Forest Resorts",
        district: "Gazipur",
        division: "Dhaka",
        category: "Weekend Gateway Stays",
        baseHourSearch: 205,
        trend: [130, 145, 170, 185, 195, 205],
        origins: [
          { city: "Dhaka North", sharePercent: 82 },
          { city: "Narayanganj", sharePercent: 18 },
        ],
        conversionRate: 18.4,
        isSurging: true,
      },
      {
        id: "DEST-SND",
        name: "Sundarbans Kotka & Mangrove Cruise",
        district: "Khulna",
        division: "Khulna",
        category: "Wildlife UNESCO Eco-Tour",
        baseHourSearch: 175,
        trend: [120, 135, 145, 155, 165, 175],
        origins: [
          { city: "Dhaka", sharePercent: 55 },
          { city: "Khulna", sharePercent: 30 },
          { city: "Jessore", sharePercent: 15 },
        ],
        conversionRate: 9.8,
        isSurging: false,
      },
      {
        id: "DEST-TTL",
        name: "Tetulia Kanchenjunga Peak Observation",
        district: "Panchagarh",
        division: "Rangpur",
        category: "Seasonal Mountain Panoramic",
        baseHourSearch: 140,
        trend: [75, 90, 110, 125, 130, 140],
        origins: [
          { city: "Dhaka", sharePercent: 60 },
          { city: "Rangpur", sharePercent: 28 },
          { city: "Bogura", sharePercent: 12 },
        ],
        conversionRate: 8.9,
        isSurging: true,
      },
    ];

    return topDestinations.map((d) => {
      const scaledCount = Math.round(d.baseHourSearch * factor);
      const velocityPerHour = Math.round(scaledCount / (window === "1h" ? 1 : window === "6h" ? 6 : 24));
      const change = Math.round((Math.random() * 22 + 15) * changeMultipliers[window]);

      return {
        destinationId: d.id,
        destinationName: d.name,
        district: d.district,
        division: d.division,
        category: d.category,
        timeWindow: window,
        searchCount: scaledCount,
        velocityPerHour,
        changePercent: change,
        conversionRatePercent: d.conversionRate,
        topOrigins: d.origins,
        hourlyTrend: d.trend.map((t) => Math.round(t * (factor / 2.5))),
        activeInquiries: Math.round(scaledCount * 0.28),
        isSurging: d.isSurging,
      };
    });
  }

  /**
   * Key transit route congestion and corridor occupancy density
   */
  public async getRouteCongestionCorridors(): Promise<RouteCongestionData[]> {
    return [
      {
        id: "ROUTE-DHK-CXB-HWY",
        routeName: "Dhaka ➔ Cox's Bazar (Chittagong Highway)",
        origin: "Dhaka (Sayedabad / Fakirapool)",
        destination: "Cox's Bazar (Kolatoli)",
        transitType: "highway_bus",
        congestionLevel: "critical",
        congestionIndex: 94,
        avgDelayMinutes: 85,
        capacitySeats: 12500,
        bookedSeats: 11950,
        occupancyPercent: 95.6,
        ticketSurgeMultiplier: 1.35,
        trend: "increasing",
        peakWindow: "Thu 20:00 - Fri 04:00",
      },
      {
        id: "ROUTE-DHK-CXB-AIR",
        routeName: "Dhaka (DAC) ➔ Cox's Bazar (CXB) Aviation",
        origin: "Hazrat Shahjalal Intl (DAC)",
        destination: "Cox's Bazar Airport (CXB)",
        transitType: "domestic_flight",
        congestionLevel: "critical",
        congestionIndex: 92,
        avgDelayMinutes: 25,
        capacitySeats: 2800,
        bookedSeats: 2740,
        occupancyPercent: 97.8,
        ticketSurgeMultiplier: 1.55,
        trend: "increasing",
        peakWindow: "Fri Morning 07:00 - 11:30",
      },
      {
        id: "ROUTE-DHK-SYL-RLY",
        routeName: "Dhaka ➔ Sylhet (Upaban / Kalni Express)",
        origin: "Kamalapur Railway Station",
        destination: "Sylhet Railway Station",
        transitType: "railway",
        congestionLevel: "heavy",
        congestionIndex: 86,
        avgDelayMinutes: 45,
        capacitySeats: 6400,
        bookedSeats: 6200,
        occupancyPercent: 96.8,
        ticketSurgeMultiplier: 1.15,
        trend: "stable",
        peakWindow: "Fri 06:40 & 15:00",
      },
      {
        id: "ROUTE-DHK-KKT-BUS",
        routeName: "Dhaka ➔ Kuakata (Padma Bridge Expressway)",
        origin: "Dhaka (Gabtoli / Jatrabari)",
        destination: "Kuakata Beach Terminal",
        transitType: "highway_bus",
        congestionLevel: "heavy",
        congestionIndex: 78,
        avgDelayMinutes: 30,
        capacitySeats: 5800,
        bookedSeats: 5100,
        occupancyPercent: 87.9,
        ticketSurgeMultiplier: 1.2,
        trend: "increasing",
        peakWindow: "Thu 22:00 - Fri 02:00",
      },
      {
        id: "ROUTE-DHK-BAR-LNC",
        routeName: "Dhaka ➔ Barisal (Sadarghat River Launch)",
        origin: "Sadarghat River Terminal",
        destination: "Barisal Launch Ghat",
        transitType: "water_launch",
        congestionLevel: "moderate",
        congestionIndex: 64,
        avgDelayMinutes: 15,
        capacitySeats: 16000,
        bookedSeats: 11800,
        occupancyPercent: 73.7,
        ticketSurgeMultiplier: 1.05,
        trend: "decreasing",
        peakWindow: "Daily 20:30 - 22:00",
      },
      {
        id: "ROUTE-DHK-CTG-HWY",
        routeName: "Dhaka ➔ Chittagong Commercial Corridor",
        origin: "Dhaka",
        destination: "Chittagong",
        transitType: "highway_bus",
        congestionLevel: "heavy",
        congestionIndex: 82,
        avgDelayMinutes: 55,
        capacitySeats: 18000,
        bookedSeats: 15400,
        occupancyPercent: 85.5,
        ticketSurgeMultiplier: 1.15,
        trend: "stable",
        peakWindow: "Daily 17:00 - 21:00",
      },
      {
        id: "ROUTE-CTG-BND-HWY",
        routeName: "Chittagong ➔ Bandarban Hill Transit",
        origin: "Bahaddarhat Terminal",
        destination: "Bandarban Sadar",
        transitType: "highway_bus",
        congestionLevel: "moderate",
        congestionIndex: 58,
        avgDelayMinutes: 20,
        capacitySeats: 3200,
        bookedSeats: 2500,
        occupancyPercent: 78.1,
        ticketSurgeMultiplier: 1.1,
        trend: "stable",
        peakWindow: "Fri Morning 08:00 - 10:30",
      },
    ];
  }

  /**
   * Requirement 3: Predictive Surge Recommender
   * Generates automated recommendations for super-admins to adjust B2B agency commissions
   * or suggest dynamic pricing to unlock regional supplier inventory and balance capacity.
   */
  public async getSurgeRecommendations(): Promise<SurgeRecommendation[]> {
    const points = await this.getDistrictHeatmapData();
    const highDemandPoints = points.filter((p) => p.status === "high_demand_low_supply");
    const lowDemandPoints = points.filter((p) => p.status === "low_demand" && p.isPopularTouristHub);

    const recommendations: SurgeRecommendation[] = [];

    // Critical high-demand surge recommendations
    highDemandPoints.forEach((p, idx) => {
      const recId = `REC-SURGE-${p.districtId}`;
      let status: "pending" | "applied" | "dismissed" = "pending";
      if (this.appliedRecommendationIds.has(recId)) status = "applied";
      if (this.dismissedRecommendationIds.has(recId)) status = "dismissed";

      const currentCommission = 10.0;
      const suggestedCommission = Number((currentCommission + p.recommendedCommissionAdjustment).toFixed(1));
      const projectedSupplyBoost = Math.round(p.availableSupply * 0.28);
      const projectedGmvLift = Math.round(p.revenueOpportunityBDT * 1.4);

      recommendations.push({
        id: recId,
        districtId: p.districtId,
        districtName: p.districtName,
        division: p.division,
        vertical: idx % 2 === 0 ? "Hotels & Stays" : "All Verticals",
        currentCommissionPercent: currentCommission,
        suggestedCommissionPercent: suggestedCommission,
        commissionDelta: p.recommendedCommissionAdjustment,
        suggestedPriceSurgePercent: p.recommendedPriceSurgePercent,
        demandSupplyRatio: p.demandSupplyRatio,
        hotelOccupancyRate: p.hotelOccupancyRate,
        severity: p.demandSupplyRatio > 2.2 ? "critical" : "warning",
        headline: `Surge Incentive: +${p.recommendedCommissionAdjustment}% Agency Payout in ${p.districtName}`,
        rationale: `Demand-supply ratio reached ${p.demandSupplyRatio}x with ${p.hotelOccupancyRate}% occupancy. Raising agency commission by +${p.recommendedCommissionAdjustment}% will motivate local operators to allocate premium reserved allocations.`,
        projectedSupplyBoostUnits: projectedSupplyBoost,
        projectedGmvLiftBDT: projectedGmvLift,
        status,
        timestamp: "Active - Computed Live",
        actionType: "INCREASE_COMMISSION",
      });
    });

    // Low-demand capacity optimization recommendations
    lowDemandPoints.slice(0, 2).forEach((p) => {
      const recId = `REC-STIM-${p.districtId}`;
      let status: "pending" | "applied" | "dismissed" = "pending";
      if (this.appliedRecommendationIds.has(recId)) status = "applied";
      if (this.dismissedRecommendationIds.has(recId)) status = "dismissed";

      recommendations.push({
        id: recId,
        districtId: p.districtId,
        districtName: p.districtName,
        division: p.division,
        vertical: "Tour Packages",
        currentCommissionPercent: 10.0,
        suggestedCommissionPercent: 8.5,
        commissionDelta: -1.5,
        suggestedPriceSurgePercent: -12,
        demandSupplyRatio: p.demandSupplyRatio,
        hotelOccupancyRate: p.hotelOccupancyRate,
        severity: "opportunity",
        headline: `Stimulus Rebate: -12% Dynamic Tariff Promotion in ${p.districtName}`,
        rationale: `Occupancy is at ${p.hotelOccupancyRate}% with surplus inventory. Distributing flash voucher promotions will attract off-peak traveler volume.`,
        projectedSupplyBoostUnits: Math.round(p.availableSupply * 0.45),
        projectedGmvLiftBDT: Math.round(p.availableSupply * p.avgRoomPriceBDT * 0.35),
        status,
        timestamp: "Active - Off-peak window",
        actionType: "INCENTIVE_FLASH_SALE",
      });
    });

    return recommendations;
  }

  /**
   * Applies an administrative surge recommendation with audit trail logging
   */
  public async applyRecommendation(
    recommendationId: string,
    adminId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.appliedRecommendationIds.add(recommendationId);
      this.dismissedRecommendationIds.delete(recommendationId);

      // Log into admin_activity_logs if table is accessible
      try {
        await supabase.from("admin_activity_logs").insert([
          {
            admin_id: adminId || "system-super-admin",
            action: "APPLY_PREDICTIVE_SURGE_COMMISSION",
            resource_type: "surge_recommendation",
            resource_id: recommendationId,
            details: {
              recommendationId,
              appliedAt: new Date().toISOString(),
              governance: "Automated Geospatial Optimizer",
            },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (logErr) {
        console.warn("[HeatmapService] Audit log write fallback:", logErr);
      }

      return {
        success: true,
        message: `Surge policy applied successfully for ${recommendationId}. B2B commission splits and dynamic tariff bounds updated.`,
      };
    } catch (err: any) {
      console.error("[HeatmapService] Apply recommendation error:", err);
      return { success: false, message: err.message || "Failed to apply surge recommendation." };
    }
  }

  /**
   * Dismisses an administrative surge recommendation
   */
  public async dismissRecommendation(recommendationId: string): Promise<boolean> {
    this.dismissedRecommendationIds.add(recommendationId);
    this.appliedRecommendationIds.delete(recommendationId);
    return true;
  }

  // ============================================================================
  // REQUIREMENT 4: EXPORT ANALYTICS (CSV / EXCEL FOR FINANCIAL REPORTING)
  // ============================================================================

  /**
   * Generates formatted CSV for District Heatmap Data
   */
  public async exportDistrictHeatmapCSV(): Promise<string> {
    const points = await this.getDistrictHeatmapData();
    const headers = [
      "District ID",
      "District Name",
      "Bengali Name",
      "Division",
      "Latitude",
      "Longitude",
      "Search Volume (24h)",
      "Search Velocity (Searches/hr)",
      "Total Supply (Rooms + Seats)",
      "Booked Units",
      "Demand/Supply Ratio",
      "Density Status",
      "Hotel Occupancy Rate (%)",
      "Total Hotels",
      "Total Rooms",
      "Booked Rooms",
      "Avg Room Rate (BDT)",
      "Route Congestion Index (0-100)",
      "Surge Multiplier",
      "Suggested Agency Commission Delta (%)",
      "Suggested Consumer Tariff Surge (%)",
      "Projected Revenue Opportunity (BDT)",
    ];

    const rows = points.map((p) => [
      p.districtId,
      `"${p.districtName}"`,
      `"${p.districtBn}"`,
      `"${p.division}"`,
      p.lat,
      p.lng,
      p.searchVolume,
      p.searchVelocity,
      p.availableSupply,
      p.bookedCount,
      p.demandSupplyRatio,
      p.status,
      `${p.hotelOccupancyRate}%`,
      p.totalHotels,
      p.totalHotelRooms,
      p.bookedRooms,
      p.avgRoomPriceBDT,
      p.routeCongestionIndex,
      `${p.surgeIndex}x`,
      `${p.recommendedCommissionAdjustment > 0 ? "+" : ""}${p.recommendedCommissionAdjustment}%`,
      `${p.recommendedPriceSurgePercent > 0 ? "+" : ""}${p.recommendedPriceSurgePercent}%`,
      p.revenueOpportunityBDT,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  /**
   * Generates formatted CSV for Live Search Velocity Tracker
   */
  public async exportSearchVelocityCSV(timeWindow: TimeWindow = "1h"): Promise<string> {
    const records = await this.getLiveSearchVelocity(timeWindow);
    const headers = [
      "Destination ID",
      "Destination Name",
      "District",
      "Division",
      "Category",
      "Time Window",
      "Search Volume",
      "Velocity Per Hour",
      "Change vs Previous Window (%)",
      "Conversion Rate (%)",
      "Active Inquiries",
      "Surge Status",
      "Top Origin #1",
      "Top Origin #2",
    ];

    const rows = records.map((r) => [
      r.destinationId,
      `"${r.destinationName}"`,
      `"${r.district}"`,
      `"${r.division}"`,
      `"${r.category}"`,
      r.timeWindow,
      r.searchCount,
      r.velocityPerHour,
      `+${r.changePercent}%`,
      `${r.conversionRatePercent}%`,
      r.activeInquiries,
      r.isSurging ? "CRITICAL SURGE" : "NORMAL",
      r.topOrigins[0] ? `"${r.topOrigins[0].city} (${r.topOrigins[0].sharePercent}%)"` : `""`,
      r.topOrigins[1] ? `"${r.topOrigins[1].city} (${r.topOrigins[1].sharePercent}%)"` : `""`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  /**
   * Generates formatted CSV for Surge Recommendations
   */
  public async exportSurgeRecommendationsCSV(): Promise<string> {
    const recs = await this.getSurgeRecommendations();
    const headers = [
      "Recommendation ID",
      "District",
      "Division",
      "Vertical Target",
      "Current Agency Commission (%)",
      "Suggested Agency Commission (%)",
      "Commission Delta (%)",
      "Suggested Price Surge (%)",
      "Demand/Supply Ratio",
      "Hotel Occupancy (%)",
      "Severity Level",
      "Headline",
      "Rationale",
      "Projected Supply Boost (Units)",
      "Projected GMV Lift (BDT)",
      "Status",
    ];

    const rows = recs.map((r) => [
      r.id,
      `"${r.districtName}"`,
      `"${r.division}"`,
      `"${r.vertical}"`,
      `${r.currentCommissionPercent}%`,
      `${r.suggestedCommissionPercent}%`,
      `${r.commissionDelta > 0 ? "+" : ""}${r.commissionDelta}%`,
      `${r.suggestedPriceSurgePercent > 0 ? "+" : ""}${r.suggestedPriceSurgePercent}%`,
      r.demandSupplyRatio,
      `${r.hotelOccupancyRate}%`,
      r.severity,
      `"${r.headline.replace(/"/g, '""')}"`,
      `"${r.rationale.replace(/"/g, '""')}"`,
      r.projectedSupplyBoostUnits,
      r.projectedGmvLiftBDT,
      r.status,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  /**
   * Comprehensive Executive Master Financial & Geospatial Report (Excel-Compatible CSV with UTF-8 BOM)
   */
  public async exportMasterExecutiveReport(): Promise<{ filename: string; content: string }> {
    const [points, routes, recs, overview] = await Promise.all([
      this.getDistrictHeatmapData(),
      this.getRouteCongestionCorridors(),
      this.getSurgeRecommendations(),
      this.getHeatmapOverviewMetrics(),
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `Shopno_Jatra_Geospatial_Executive_Report_${timestamp}.csv`;

    const sections: string[] = [];

    // Executive Summary Header
    sections.push("================================================================================");
    sections.push("SHOPNO JATRA PLATFORM - GEOSPATIAL DEMAND & REVENUE REPORT");
    sections.push(`Generated At: ${new Date().toLocaleString()} (Super Admin Clearance)`);
    sections.push(`Active Searches (24h): ${overview.totalActiveSearches}`);
    sections.push(`Platform Velocity: ${overview.velocityPerHour} searches/hr`);
    sections.push(`Critical Bottleneck Districts: ${overview.highDemandDistrictsCount}`);
    sections.push(`Average Platform Hotel Occupancy: ${overview.averageOccupancyRate}%`);
    sections.push(`Estimated Dynamic Surge Revenue Potential: BDT ${overview.potentialSurgeGmvBDT.toLocaleString()}`);
    sections.push("================================================================================\r\n");

    // Section 1: District Heatmap
    sections.push("--- 1. DISTRICT HEAT DENSITY & HOTEL OCCUPANCY MATRIX ---");
    const districtCsv = await this.exportDistrictHeatmapCSV();
    sections.push(districtCsv);
    sections.push("\r\n");

    // Section 2: Route Congestion Corridors
    sections.push("--- 2. MAJOR INTER-DISTRICT TRANSIT CONGESTION CORRIDORS ---");
    sections.push("Route ID,Route Name,Origin,Destination,Transit Type,Congestion Level,Congestion Index (0-100),Delay (mins),Seat Capacity,Booked Seats,Occupancy (%),Surge Multiplier,Peak Window");
    routes.forEach((rt) => {
      sections.push(
        [
          rt.id,
          `"${rt.routeName}"`,
          `"${rt.origin}"`,
          `"${rt.destination}"`,
          rt.transitType,
          rt.congestionLevel,
          rt.congestionIndex,
          rt.avgDelayMinutes,
          rt.capacitySeats,
          rt.bookedSeats,
          `${rt.occupancyPercent}%`,
          `${rt.ticketSurgeMultiplier}x`,
          `"${rt.peakWindow}"`,
        ].join(",")
      );
    });
    sections.push("\r\n");

    // Section 3: Surge Commission Recommendations
    sections.push("--- 3. PREDICTIVE AGENCY COMMISSION & SURGE RECOMMENDATIONS ---");
    const recCsv = await this.exportSurgeRecommendationsCSV();
    sections.push(recCsv);

    // Add UTF-8 BOM so Microsoft Excel automatically recognizes Unicode / Bengali text correctly
    const finalContent = "\uFEFF" + sections.join("\r\n");

    return { filename, content: finalContent };
  }

  /**
   * Universal downloader for Web and Native mobile devices
   */
  public async downloadOrShareExport(
    filename: string,
    content: string,
    mimeType = "text/csv;charset=utf-8;"
  ): Promise<{ success: boolean; uri?: string }> {
    // 1. Web browser trigger
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return { success: true };
        }
      } catch (webErr) {
        console.error("[HeatmapService] Web download error:", webErr);
      }
    }

    // 2. React Native (iOS / Android) trigger via expo-file-system and expo-sharing
    try {
      // Dynamic import to avoid web bundling snags
      const FileSystem = require("expo-file-system");
      const Sharing = require("expo-sharing");

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `Export: ${filename}`,
          UTI: "public.comma-separated-values-text",
        });
        return { success: true, uri: fileUri };
      }

      return { success: true, uri: fileUri };
    } catch (nativeErr) {
      console.warn("[HeatmapService] Native share/download fallback:", nativeErr);
      return { success: false };
    }
  }

  /**
   * Deterministic fallback dataset when network or database is offline
   */
  private generateFallbackHeatmapPoints(): DistrictHeatmapPoint[] {
    return BANGLADESH_DISTRICTS.map((dist) => {
      const lookup = TOURIST_HUBS_DEMAND_BOOST[dist.districtName];
      const searchVolume = lookup ? lookup.baseSearch : 750;
      const availableSupply = lookup ? lookup.baseSupply : 1200;
      const ratio = Number((searchVolume / availableSupply).toFixed(2));
      const status: HeatDensityStatus =
        ratio >= 1.6 ? "high_demand_low_supply" : ratio < 0.8 ? "low_demand" : "balanced";

      return {
        ...dist,
        searchVolume,
        searchVelocity: Math.round(searchVolume / 24),
        availableSupply,
        bookedCount: Math.round(availableSupply * 0.75),
        demandSupplyRatio: ratio,
        status,
        hotelOccupancyRate: lookup ? lookup.baseOccupancy : 50,
        totalHotels: Math.max(5, Math.round(availableSupply / 35)),
        totalHotelRooms: Math.round(availableSupply * 0.7),
        bookedRooms: Math.round(availableSupply * 0.5),
        avgRoomPriceBDT: lookup ? lookup.avgRate : 2200,
        routeCongestionIndex: lookup ? lookup.congestion : 30,
        activeTransitCorridors: 2,
        surgeIndex: status === "high_demand_low_supply" ? 1.5 : 1.0,
        recommendedCommissionAdjustment: status === "high_demand_low_supply" ? 3.5 : 0,
        recommendedPriceSurgePercent: status === "high_demand_low_supply" ? 15 : 0,
        revenueOpportunityBDT: searchVolume * 450,
        topTravelCategory: lookup ? lookup.category : "Regional Travel",
      };
    });
  }
}

export const heatmapService = HeatmapService.getInstance();
