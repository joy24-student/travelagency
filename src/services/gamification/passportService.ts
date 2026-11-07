import { Platform } from "react-native";
/**
 * passportService.ts
 *
 * Core Gamification Engine for Travel Agency Digital Passport.
 * Manages:
 * 1. Virtual Immigration Stamps for Bangladesh's 64 Districts & International Destinations.
 * 2. 3D Scratch Map state tracking (visited, scratched, locked).
 * 3. 10-Tier Traveler Milestone Progression ("Rookie Traveler" -> "Nomad" -> "Globe Trotter" -> "Legendary Wayfarer").
 * 4. High-Res Social Flex Image generator & sharing via expo-sharing and expo-file-system.
 *
 * STRICT BOUNDARY: Does NOT modify user authentication tokens or account security credentials.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";

// ============================================================================
// DATA MODELS & TYPES
// ============================================================================

export type DivisionName =
  | "Dhaka"
  | "Chattogram"
  | "Sylhet"
  | "Rajshahi"
  | "Khulna"
  | "Barishal"
  | "Rangpur"
  | "Mymensingh";

export type DistrictRarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface DistrictInfo {
  id: string; // unique slug e.g. 'coxs-bazar'
  name: string; // English
  bnName: string; // Bengali
  division: DivisionName;
  code: string; // e.g. 'BD-CXB'
  landmark: string;
  bnLandmark: string;
  speciality: string;
  rarity: DistrictRarity;
  themeColor: string; // Vibrant color unlocked on scratch
  gradient: [string, string];
  icon: string; // Ionicons glyph name
  xpReward: number;
}

export interface CountryInfo {
  id: string;
  code: string; // ISO 2-letter
  name: string;
  bnName: string;
  flag: string;
  capital: string;
  landmark: string;
  themeColor: string;
  gradient: [string, string];
  xpReward: number;
}

export type StampSealStyle = "circular" | "hexagonal" | "oval" | "rectangular";
export type StampInkColor = "#1E3A8A" | "#991B1B" | "#065F46" | "#B45309" | "#581C87";
export type TravelMode = "flight" | "train" | "bus" | "cruise" | "roadtrip";

export interface ImmigrationStamp {
  id: string;
  targetId: string; // district id or country id
  targetType: "district" | "country";
  title: string;
  subtitle: string;
  stampedAt: string; // ISO string
  entryNumber: string; // e.g. "EXP-2026-9481"
  sealStyle: StampSealStyle;
  inkColor: StampInkColor;
  travelMode: TravelMode;
  tripReference: string;
  isVerified: boolean;
  isScratched: boolean; // Map/card scratch status
  rotationDeg: number; // Authentic slight tilt (-8 to 8 deg)
  landmark: string;
  badgeCode: string;
  division?: DivisionName;
  countryCode?: string;
}

export interface MilestonePerk {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercentage?: number;
  icon: string;
}

export interface MilestoneLevel {
  level: number; // 1 to 10
  title: string;
  bnTitle: string;
  minStamps: number;
  maxStamps: number;
  badgeTitle: string;
  color: string;
  gradient: [string, string];
  discountText: string;
  perks: MilestonePerk[];
}

export interface UserPassportProfile {
  userId: string;
  passportNumber: string; // e.g. "BD-EXP-2026-7891"
  holderName: string;
  nationality: string;
  issuedDate: string;
  totalXp: number;
  currentLevel: number;
  stampsCount: number;
  scratchedCount: number;
  stamps: ImmigrationStamp[];
  scratchedDistricts: string[]; // district IDs
  unlockedPerks: string[]; // perk IDs
  lastUpdated: string;
}

// ============================================================================
// 64 DISTRICTS OF BANGLADESH (AUTHENTIC GEOGRAPHIC DATA)
// ============================================================================

export const BANGLADESH_DISTRICTS: DistrictInfo[] = [
  // ── DHAKA DIVISION (13) ───────────────────────────────────────────────────
  {
    id: "dhaka",
    name: "Dhaka",
    bnName: "ঢাকা",
    division: "Dhaka",
    code: "BD-DHA",
    landmark: "Lalbagh Fort & Ahsan Manzil",
    bnLandmark: "লালবাগ কেল্লা ও আহসান মঞ্জিল",
    speciality: "Dhakai Biryani & Bakarkhani",
    rarity: "Epic",
    themeColor: "#DC2626",
    gradient: ["#DC2626", "#EF4444"],
    icon: "business-outline",
    xpReward: 150,
  },
  {
    id: "gazipur",
    name: "Gazipur",
    bnName: "গাজীপুর",
    division: "Dhaka",
    code: "BD-GAZ",
    landmark: "Bhawal National Park & Safari",
    bnLandmark: "ভাওয়াল জাতীয় উদ্যান",
    speciality: "Jackfruit & Forest Resorts",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#16A34A", "#22C55E"],
    icon: "leaf-outline",
    xpReward: 100,
  },
  {
    id: "narayanganj",
    name: "Narayanganj",
    bnName: "নারায়ণগঞ্জ",
    division: "Dhaka",
    code: "BD-NAR",
    landmark: "Panam Nagar & Sonargaon",
    bnLandmark: "পানাম নগর ও সোনারগাঁও লোকশিল্প",
    speciality: "Jamdani Sari & River Port",
    rarity: "Rare",
    themeColor: "#7C3AED",
    gradient: ["#7C3AED", "#8B5CF6"],
    icon: "trail-sign-outline",
    xpReward: 120,
  },
  {
    id: "tangail",
    name: "Tangail",
    bnName: "টাঙ্গাইল",
    division: "Dhaka",
    code: "BD-TAN",
    landmark: "Mohera Jamindar Bari & Jamuna Bridge",
    bnLandmark: "মহেরা জমিদার বাড়ি ও যমুনা সেতু",
    speciality: "Tangail Porabari Chomchom",
    rarity: "Rare",
    themeColor: "#D97706",
    gradient: ["#D97706", "#F59E0B"],
    icon: "restaurant-outline",
    xpReward: 110,
  },
  {
    id: "kishoreganj",
    name: "Kishoreganj",
    bnName: "কিশোরগঞ্জ",
    division: "Dhaka",
    code: "BD-KIS",
    landmark: "Nikli Haor & Isha Khan Fort",
    bnLandmark: "নিকলী হাওর ও ঈশা খাঁর জঙ্গলবাড়ি",
    speciality: "Haor Fresh Fish & Sandesh",
    rarity: "Rare",
    themeColor: "#0284C7",
    gradient: ["#0284C7", "#38BDF8"],
    icon: "water-outline",
    xpReward: 130,
  },
  {
    id: "manikganj",
    name: "Manikganj",
    bnName: "মানিকগঞ্জ",
    division: "Dhaka",
    code: "BD-MAN",
    landmark: "Baliati Palace & Teota Palace",
    bnLandmark: "বালিয়াটি প্রাসাদ ও তেওতা জমিদার বাড়ি",
    speciality: "Hajar Gur (Date Molasses)",
    rarity: "Common",
    themeColor: "#EA580C",
    gradient: ["#EA580C", "#FB923C"],
    icon: "home-outline",
    xpReward: 100,
  },
  {
    id: "munshiganj",
    name: "Munshiganj",
    bnName: "মুন্সীগঞ্জ",
    division: "Dhaka",
    code: "BD-MUN",
    landmark: "Idrakpur Fort & Baba Adam Mosque",
    bnLandmark: "ইদ্রাকপুর কেল্লা ও বাবা আদম মসজিদ",
    speciality: "Munshiganj Sweet Potato & Curd",
    rarity: "Common",
    themeColor: "#059669",
    gradient: ["#059669", "#10B981"],
    icon: "shield-checkmark-outline",
    xpReward: 100,
  },
  {
    id: "narsingdi",
    name: "Narsingdi",
    bnName: "নরসিংদী",
    division: "Dhaka",
    code: "BD-NRS",
    landmark: "Wari-Bateshwar Ancient Archeology",
    bnLandmark: "ওয়ারী-বটেশ্বর প্রাচীন দুর্গ-নগরী",
    speciality: "Amriti Sweets & Sagor Kola",
    rarity: "Rare",
    themeColor: "#4F46E5",
    gradient: ["#4F46E5", "#6366F1"],
    icon: "compass-outline",
    xpReward: 120,
  },
  {
    id: "faridpur",
    name: "Faridpur",
    bnName: "ফরিদপুর",
    division: "Dhaka",
    code: "BD-FAR",
    landmark: "Jashimuddin House & Kanaipur Zamindar",
    bnLandmark: "পল্লীকবি জসীমউদদীনের বাড়ি",
    speciality: "Patali Gur (Jaggery)",
    rarity: "Common",
    themeColor: "#9333EA",
    gradient: ["#9333EA", "#A855F7"],
    icon: "book-outline",
    xpReward: 100,
  },
  {
    id: "gopalganj",
    name: "Gopalganj",
    bnName: "গোপালগঞ্জ",
    division: "Dhaka",
    code: "BD-GOP",
    landmark: "Tungipara Father of the Nation Memorial",
    bnLandmark: "টুঙ্গিপাড়া স্মৃতিসৌধ",
    speciality: "Madhumati River Fish & Rasogolla",
    rarity: "Rare",
    themeColor: "#2563EB",
    gradient: ["#2563EB", "#60A5FA"],
    icon: "flag-outline",
    xpReward: 110,
  },
  {
    id: "madaripur",
    name: "Madaripur",
    bnName: "মাদারীপুর",
    division: "Dhaka",
    code: "BD-MAD",
    landmark: "Shakuni Lake & Shah Madar Dargah",
    bnLandmark: "শকুনি লেক ও শাহ মাদার দরগাহ",
    speciality: "Khejur Gur & Golapjam",
    rarity: "Common",
    themeColor: "#0D9488",
    gradient: ["#0D9488", "#14B8A6"],
    icon: "partly-sunny-outline",
    xpReward: 100,
  },
  {
    id: "rajbari",
    name: "Rajbari",
    bnName: "রাজবাড়ী",
    division: "Dhaka",
    code: "BD-RAJ",
    landmark: "Mir Mosharraf Hossain Memorial",
    bnLandmark: "মীর মশাররফ হোসেন স্মৃতিকেন্দ্র",
    speciality: "Chamcham Sweets",
    rarity: "Common",
    themeColor: "#CA8A04",
    gradient: ["#CA8A04", "#EAB308"],
    icon: "ribbon-outline",
    xpReward: 100,
  },
  {
    id: "shariatpur",
    name: "Shariatpur",
    bnName: "শরীয়তপুর",
    division: "Dhaka",
    code: "BD-SHA",
    landmark: "Fatehabad Zamindar Bari & Padma Bridge Ghat",
    bnLandmark: "ফতেহাবাদ জমিদার বাড়ি ও পদ্মা সেতু সংযোগ",
    speciality: "Hilsa Fish & Chandra Sweets",
    rarity: "Common",
    themeColor: "#0891B2",
    gradient: ["#0891B2", "#06B6D4"],
    icon: "boat-outline",
    xpReward: 100,
  },

  // ── CHATTOGRAM DIVISION (11) ──────────────────────────────────────────────
  {
    id: "coxs-bazar",
    name: "Cox's Bazar",
    bnName: "কক্সবাজার",
    division: "Chattogram",
    code: "BD-CXB",
    landmark: "World's Longest Sea Beach & Saint Martin",
    bnLandmark: "বিশ্বের দীর্ঘতম সমুদ্র সৈকত ও সেন্ট মার্টিন",
    speciality: "Fresh Grilled Lobster & Rupchanda Fry",
    rarity: "Legendary",
    themeColor: "#2563EB",
    gradient: ["#1D4ED8", "#38BDF8"],
    icon: "sunny-outline",
    xpReward: 250,
  },
  {
    id: "chattogram",
    name: "Chattogram",
    bnName: "চট্টগ্রাম",
    division: "Chattogram",
    code: "BD-CTG",
    landmark: "Patenga Beach, Naval Academy & Foy's Lake",
    bnLandmark: "পতেঙ্গা সৈকত ও ফয়’স লেক",
    speciality: "Traditional Mezban Beef & Kalabhuna",
    rarity: "Epic",
    themeColor: "#DC2626",
    gradient: ["#B91C1C", "#F87171"],
    icon: "bonfire-outline",
    xpReward: 200,
  },
  {
    id: "bandarban",
    name: "Bandarban",
    bnName: "বান্দরবান",
    division: "Chattogram",
    code: "BD-BDB",
    landmark: "Nilgiri, Keokradong & Nafakhum Waterfall",
    bnLandmark: "নীলগিরি, কেওক্রাডং ও নাফাখুম জলপ্রপাত",
    speciality: "Indigenous Bamboo Shoot & Hill Coffee",
    rarity: "Legendary",
    themeColor: "#059669",
    gradient: ["#047857", "#34D399"],
    icon: "earth-outline",
    xpReward: 250,
  },
  {
    id: "rangamati",
    name: "Rangamati",
    bnName: "রাঙামাটি",
    division: "Chattogram",
    code: "BD-RAN",
    landmark: "Kaptai Lake & Hanging Bridge",
    bnLandmark: "কাপ্তাই হ্রদ ও ঝুলন্ত সেতু",
    speciality: "Kaptai Fresh Trout & Tribal Textiles",
    rarity: "Epic",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    icon: "boat-outline",
    xpReward: 200,
  },
  {
    id: "khagrachhari",
    name: "Khagrachhari",
    bnName: "খাগড়াছড়ি",
    division: "Chattogram",
    code: "BD-KHA",
    landmark: "Sajek Valley & Alutila Mysterious Cave",
    bnLandmark: "সাজেক ভ্যালি ও আলুটিলা রহস্যময় গুহা",
    speciality: "Sajek Organic Honey & Bamboo Chicken",
    rarity: "Legendary",
    themeColor: "#7C3AED",
    gradient: ["#6D28D9", "#A78BFA"],
    icon: "cloudy-night-outline",
    xpReward: 250,
  },
  {
    id: "cumilla",
    name: "Cumilla",
    bnName: "কুমিল্লা",
    division: "Chattogram",
    code: "BD-CUM",
    landmark: "Shalban Vihara Archeological Site",
    bnLandmark: "শালবন বিহার ও ময়নামতি",
    speciality: "Authentic Matribhandar Rasomalai",
    rarity: "Rare",
    themeColor: "#D97706",
    gradient: ["#B45309", "#FBBF24"],
    icon: "flower-outline",
    xpReward: 130,
  },
  {
    id: "feni",
    name: "Feni",
    bnName: "ফেনী",
    division: "Chattogram",
    code: "BD-FEN",
    landmark: "Muhuri Dam Project & Bijoy Singh Dighi",
    bnLandmark: "মুহুরী সেচ প্রকল্প ও বিজয় সিংহ দীঘি",
    speciality: "Khandal Sweets & Pitha",
    rarity: "Common",
    themeColor: "#0D9488",
    gradient: ["#0F766E", "#2DD4BF"],
    icon: "water-outline",
    xpReward: 100,
  },
  {
    id: "brahmanbaria",
    name: "Brahmanbaria",
    bnName: "ব্রাহ্মণবাড়িয়া",
    division: "Chattogram",
    code: "BD-BRA",
    landmark: "Kallal Dighi & Sarail Greyhound Heritage",
    bnLandmark: "কালভৈরব মন্দির ও সরাইল জমিদার বাড়ি",
    speciality: "Chhanar Mukhi Sweets",
    rarity: "Rare",
    themeColor: "#EA580C",
    gradient: ["#C2410C", "#FB923C"],
    icon: "musical-notes-outline",
    xpReward: 110,
  },
  {
    id: "chandpur",
    name: "Chandpur",
    bnName: "চাঁদপুর",
    division: "Chattogram",
    code: "BD-CHN",
    landmark: "Mollahata Padmo-Meghna Estuary (Hilsa Capital)",
    bnLandmark: "পদ্মা-মেঘনা মোহনা (ইলিশের রাজধানী)",
    speciality: "Original Chandpur Padma Hilsa",
    rarity: "Rare",
    themeColor: "#0284C7",
    gradient: ["#075985", "#38BDF8"],
    icon: "fish-outline",
    xpReward: 140,
  },
  {
    id: "lakshmipur",
    name: "Lakshmipur",
    bnName: "লক্ষ্মীপুর",
    division: "Chattogram",
    code: "BD-LAK",
    landmark: "Dalal Bazar Zamindar Palace & Khoa Sagor",
    bnLandmark: "দালাল বাজার জমিদার বাড়ি",
    speciality: "Soybean, Coconut & Buffalo Yogurt",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#15803D", "#4ADE80"],
    icon: "nutrition-outline",
    xpReward: 100,
  },
  {
    id: "noakhali",
    name: "Noakhali",
    bnName: "নোয়াখালী",
    division: "Chattogram",
    code: "BD-NOA",
    landmark: "Nijhum Dwip Deer Reserve & Gandhi Ashram",
    bnLandmark: "নিঝুম দ্বীপ হরিণ অভয়ারণ্য ও গান্ধী আশ্রম",
    speciality: "Coconut Narikel Naru & Dry Fish",
    rarity: "Rare",
    themeColor: "#4F46E5",
    gradient: ["#4338CA", "#818CF8"],
    icon: "paw-outline",
    xpReward: 130,
  },

  // ── SYLHET DIVISION (4) ───────────────────────────────────────────────────
  {
    id: "sylhet",
    name: "Sylhet",
    bnName: "সিলেট",
    division: "Sylhet",
    code: "BD-SYL",
    landmark: "Hazrat Shah Jalal Shrine, Ratargul Swamp & Bichanakandi",
    bnLandmark: "হযরত শাহজালাল মাজার, রাতারগুল ও বিছনাকান্দি",
    speciality: "Seven Layer Tea & Satkara Beef Curry",
    rarity: "Legendary",
    themeColor: "#059669",
    gradient: ["#047857", "#10B981"],
    icon: "rainy-outline",
    xpReward: 250,
  },
  {
    id: "moulvibazar",
    name: "Moulvibazar",
    bnName: "মৌলভীবাজার",
    division: "Sylhet",
    code: "BD-MOU",
    landmark: "Sreemangal Tea Estates & Lawachara Forest",
    bnLandmark: "শ্রীমঙ্গল চা বাগান ও লাউয়াছড়া জাতীয় উদ্যান",
    speciality: "Organic Tea Leaves & Pineapples",
    rarity: "Epic",
    themeColor: "#15803D",
    gradient: ["#166534", "#22C55E"],
    icon: "cafe-outline",
    xpReward: 200,
  },
  {
    id: "habiganj",
    name: "Habiganj",
    bnName: "হবিগঞ্জ",
    division: "Sylhet",
    code: "BD-HAB",
    landmark: "Satchari National Park & Bithangal Akhra",
    bnLandmark: "সাতছড়ি জাতীয় উদ্যান ও বিথাঙ্গল আখড়া",
    speciality: "Forest Honey & Agarwood Perfume",
    rarity: "Rare",
    themeColor: "#10B981",
    gradient: ["#059669", "#6EE7B7"],
    icon: "leaf-outline",
    xpReward: 120,
  },
  {
    id: "sunamganj",
    name: "Sunamganj",
    bnName: "সুনামগঞ্জ",
    division: "Sylhet",
    code: "BD-SUN",
    landmark: "Tanguar Haor Nature Reserve & Shimul Bagan",
    bnLandmark: "টাঙ্গুয়ার হাওর ও জাদুকাটা নদী শিমুল বাগান",
    speciality: "Haor Boal Fish & Hason Raja Heritage",
    rarity: "Legendary",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    icon: "water-outline",
    xpReward: 250,
  },

  // ── KHULNA DIVISION (10) ──────────────────────────────────────────────────
  {
    id: "khulna",
    name: "Khulna",
    bnName: "খুলনা",
    division: "Khulna",
    code: "BD-KHU",
    landmark: "Sundarbans Gateway & Rupsha Bridge",
    bnLandmark: "সুন্দরবনের প্রবেশদ্বার ও রূপসা সেতু",
    speciality: "Chuknagar Chuijhal Mutton Curry",
    rarity: "Epic",
    themeColor: "#B45309",
    gradient: ["#92400E", "#FBBF24"],
    icon: "flame-outline",
    xpReward: 200,
  },
  {
    id: "bagerhat",
    name: "Bagerhat",
    bnName: "বাগেরহাট",
    division: "Khulna",
    code: "BD-BAG",
    landmark: "Sixty Dome Mosque (UNESCO World Heritage)",
    bnLandmark: "ষাট গম্বুজ মসজিদ (ইউনেস্কো বিশ্ব ঐতিহ্য)",
    speciality: "Sundarbans Wild Honey & Golda Prawn",
    rarity: "Legendary",
    themeColor: "#78350F",
    gradient: ["#451A03", "#D97706"],
    icon: "business-outline",
    xpReward: 220,
  },
  {
    id: "satkhira",
    name: "Satkhira",
    bnName: "সাতক্ষীরা",
    division: "Khulna",
    code: "BD-SAT",
    landmark: "Sundarbans Kalagachia Range & Mandarbaria Beach",
    bnLandmark: "সুন্দরবন কলাগাছিয়া ও মান্দারবাড়িয়া সৈকত",
    speciality: "Fresh Sandesh Sweets & Bagda Shrimp",
    rarity: "Rare",
    themeColor: "#059669",
    gradient: ["#065F46", "#34D399"],
    icon: "shield-outline",
    xpReward: 140,
  },
  {
    id: "jashore",
    name: "Jashore",
    bnName: "যশোর",
    division: "Khulna",
    code: "BD-JAS",
    landmark: "Michael Madhusudan Dutt House & Benapole Border",
    bnLandmark: "মাইকেল মধুসূদন দত্তের বাড়ি ও বেনাপোল",
    speciality: "Jashore Patali Date Palm Gur",
    rarity: "Rare",
    themeColor: "#C2410C",
    gradient: ["#9A3412", "#FB923C"],
    icon: "flower-outline",
    xpReward: 120,
  },
  {
    id: "kushtia",
    name: "Kushtia",
    bnName: "কুষ্টিয়া",
    division: "Khulna",
    code: "BD-KUS",
    landmark: "Lalon Shah Akhra & Rabindranath Shilaidaha Kuthibari",
    bnLandmark: "লালন শাহের আখড়া ও শিলাইদহ কুঠিবাড়ি",
    speciality: "Kushtia Kulphi Malai & Tilor Khaja",
    rarity: "Epic",
    themeColor: "#9333EA",
    gradient: ["#7E22CE", "#C084FC"],
    icon: "musical-notes-outline",
    xpReward: 180,
  },
  {
    id: "jhenaidah",
    name: "Jhenaidah",
    bnName: "ঝিনাইদহ",
    division: "Khulna",
    code: "BD-JHE",
    landmark: "Naldanga Rajbari & Barobazar Mosque Complex",
    bnLandmark: "নলডাঙ্গা রাজবাড়ি ও বারোবাজার প্রাচীন মসজিদ",
    speciality: "Banana Orchards & Sweet Curd",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#15803D", "#4ADE80"],
    icon: "trail-sign-outline",
    xpReward: 100,
  },
  {
    id: "chuadanga",
    name: "Chuadanga",
    bnName: "চুয়াডাঙ্গা",
    division: "Khulna",
    code: "BD-CHU",
    landmark: "First Capital Theater & Gholdari Mosque",
    bnLandmark: "ঘোলদাড়ী প্রাচীন শাহী মসজিদ",
    speciality: "Chuadanga Sweets & Mangoes",
    rarity: "Common",
    themeColor: "#E11D48",
    gradient: ["#BE123C", "#FB7185"],
    icon: "star-outline",
    xpReward: 100,
  },
  {
    id: "meherpur",
    name: "Meherpur",
    bnName: "মেহেরপুর",
    division: "Khulna",
    code: "BD-MEH",
    landmark: "Historic Mujibnagar Memorial Monument",
    bnLandmark: "ঐতিহাসিক মুজিবনগর স্মৃতিসৌধ",
    speciality: "Meherpur Sabari Banana & Himsagar",
    rarity: "Rare",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    icon: "flag-outline",
    xpReward: 120,
  },
  {
    id: "magura",
    name: "Magura",
    bnName: "মাগুরা",
    division: "Khulna",
    code: "BD-MAG",
    landmark: "Siddheswari Kali Temple & Raja Sitaram Palace",
    bnLandmark: "সিদ্ধেশ্বরী কালী মন্দির ও রাজা সীতারামের প্রাসাদ",
    speciality: "Sandesh & Jaggery",
    rarity: "Common",
    themeColor: "#D97706",
    gradient: ["#B45309", "#FBBF24"],
    icon: "trophy-outline",
    xpReward: 100,
  },
  {
    id: "narail",
    name: "Narail",
    bnName: "নড়াইল",
    division: "Khulna",
    code: "BD-NARL",
    landmark: "SM Sultan Art Gallery & Chitra River",
    bnLandmark: "শিল্পী এস এম সুলতানের স্মৃতি সংগ্রহশালা",
    speciality: "Otter Fishing Fish & Sweet Curd",
    rarity: "Rare",
    themeColor: "#7C3AED",
    gradient: ["#6D28D9", "#C084FC"],
    icon: "color-palette-outline",
    xpReward: 120,
  },

  // ── RAJSHAHI DIVISION (8) ─────────────────────────────────────────────────
  {
    id: "rajshahi",
    name: "Rajshahi",
    bnName: "রাজশাহী",
    division: "Rajshahi",
    code: "BD-RAJ-D",
    landmark: "Varendra Research Museum & Padma River Bank",
    bnLandmark: "বরেন্দ্র গবেষণা জাদুঘর ও পদ্মার পাড়",
    speciality: "World Renowned Rajshahi Silk & Mangoes",
    rarity: "Epic",
    themeColor: "#D97706",
    gradient: ["#B45309", "#F59E0B"],
    icon: "sunny-outline",
    xpReward: 180,
  },
  {
    id: "bogura",
    name: "Bogura",
    bnName: "বগুড়া",
    division: "Rajshahi",
    code: "BD-BOG",
    landmark: "Mahasthangarh Ancient Citadel Ruins",
    bnLandmark: "মহাস্থানগড় প্রাচীন পুণ্ড্রনগর ধ্বংসাবশেষ",
    speciality: "Authentic Bogurar Doi (Sweet Curd)",
    rarity: "Epic",
    themeColor: "#B45309",
    gradient: ["#78350F", "#F59E0B"],
    icon: "restaurant-outline",
    xpReward: 180,
  },
  {
    id: "pabna",
    name: "Pabna",
    bnName: "পাবনা",
    division: "Rajshahi",
    code: "BD-PAB",
    landmark: "Hardinge Bridge & Suchitra Sen House",
    bnLandmark: "হার্ডিঞ্জ ব্রিজ ও সুচিত্রা সেনের স্মৃতিগৃহ",
    speciality: "Pabna Ghee & Pure Milk Sweets",
    rarity: "Rare",
    themeColor: "#0284C7",
    gradient: ["#075985", "#38BDF8"],
    icon: "train-outline",
    xpReward: 130,
  },
  {
    id: "sirajganj",
    name: "Sirajganj",
    bnName: "সিরাজগঞ্জ",
    division: "Rajshahi",
    code: "BD-SIR",
    landmark: "Bangabandhu Jamuna Bridge & Navaratna Temple",
    bnLandmark: "বঙ্গবন্ধু যমুনা সেতু ও নবরত্ন মন্দির",
    speciality: "Handloom Weaving & Sirajganj Doi",
    rarity: "Rare",
    themeColor: "#0D9488",
    gradient: ["#0F766E", "#2DD4BF"],
    icon: "git-network-outline",
    xpReward: 120,
  },
  {
    id: "naogaon",
    name: "Naogaon",
    bnName: "নওগাঁ",
    division: "Rajshahi",
    code: "BD-NAO",
    landmark: "Somapura Mahavihara Paharpur (UNESCO Heritage)",
    bnLandmark: "সোমপুর মহাবিহার পাহাড়পুর (ইউনেস্কো ওয়ার্ল্ড হেরিটেজ)",
    speciality: "Naogaon Paddy (Kataribhog Rice)",
    rarity: "Legendary",
    themeColor: "#B45309",
    gradient: ["#92400E", "#FCD34D"],
    icon: "library-outline",
    xpReward: 220,
  },
  {
    id: "natore",
    name: "Natore",
    bnName: "নাটোর",
    division: "Rajshahi",
    code: "BD-NAT",
    landmark: "Uttara Gonobhaban & Rani Bhabani Palace",
    bnLandmark: "উত্তরা গণভবন ও রাণী ভবানীর রাজবাড়ি",
    speciality: "Kachagolla of Natore",
    rarity: "Rare",
    themeColor: "#EA580C",
    gradient: ["#C2410C", "#FDBA74"],
    icon: "ribbon-outline",
    xpReward: 130,
  },
  {
    id: "chapainawabganj",
    name: "Chapainawabganj",
    bnName: "চাঁপাইনবাবগঞ্জ",
    division: "Rajshahi",
    code: "BD-CHA",
    landmark: "Choto Sona Mosque (Gour Sultanate)",
    bnLandmark: "ছোট সোনা মসজিদ ও কোতোয়ালী দরওয়াজা",
    speciality: "Fazli & Langra Premium Mangoes",
    rarity: "Rare",
    themeColor: "#EAB308",
    gradient: ["#CA8A04", "#FEF08A"],
    icon: "nutrition-outline",
    xpReward: 120,
  },
  {
    id: "joypurhat",
    name: "Joypurhat",
    bnName: "জয়পুরহাট",
    division: "Rajshahi",
    code: "BD-JOY",
    landmark: "Lockma Rajbari & Nandail Dighi",
    bnLandmark: "লকমা রাজবাড়ি ও নান্দাইল দীঘি",
    speciality: "Limestone Minerals & Molasses",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#15803D", "#86EFAC"],
    icon: "hammer-outline",
    xpReward: 100,
  },

  // ── BARISHAL DIVISION (6) ─────────────────────────────────────────────────
  {
    id: "barishal",
    name: "Barishal",
    bnName: "বরিশাল",
    division: "Barishal",
    code: "BD-BAR",
    landmark: "Backwater Guava Market & Durga Sagar Lake",
    bnLandmark: "ভাসমান পেয়ারা বাজার ও দুর্গাসাগর দীঘি",
    speciality: "River Hilsha & Balam Rice",
    rarity: "Epic",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    icon: "boat-outline",
    xpReward: 190,
  },
  {
    id: "patuakhali",
    name: "Patuakhali",
    bnName: "পটুয়াখালী",
    division: "Barishal",
    code: "BD-PAT",
    landmark: "Kuakata Beach - Daughter of Sea (Sunrise & Sunset)",
    bnLandmark: "কুয়াকাটা সমুদ্র সৈকত - সাগরকন্যা",
    speciality: "Dry Fish & Coconut Delicacies",
    rarity: "Legendary",
    themeColor: "#F59E0B",
    gradient: ["#D97706", "#FDE68A"],
    icon: "partly-sunny-outline",
    xpReward: 250,
  },
  {
    id: "bhola",
    name: "Bhola",
    bnName: "ভোলা",
    division: "Barishal",
    code: "BD-BHO",
    landmark: "Char Kukri-Mukri Island & Monpura Island",
    bnLandmark: "চর কুকরি-মুকরি ও মনপুরা দ্বীপ",
    speciality: "Bhola Buffalo Curd & Sweet Sweetmeat",
    rarity: "Rare",
    themeColor: "#059669",
    gradient: ["#047857", "#6EE7B7"],
    icon: "globe-outline",
    xpReward: 150,
  },
  {
    id: "pirojpur",
    name: "Pirojpur",
    bnName: "পিরোজপুর",
    division: "Barishal",
    code: "BD-PIR",
    landmark: "Bhasaman Peyara Haat & Rayerkathi Jamidar Bari",
    bnLandmark: "ভাসমান পেয়ারা বাজার ও রায়েরকাঠি জমিদার বাড়ি",
    speciality: "Coconut & Amra (Hog Plum)",
    rarity: "Common",
    themeColor: "#10B981",
    gradient: ["#059669", "#A7F3D0"],
    icon: "cart-outline",
    xpReward: 110,
  },
  {
    id: "barguna",
    name: "Barguna",
    bnName: "বরগুনা",
    division: "Barishal",
    code: "BD-BARG",
    landmark: "Shonarchor Island & Haringhata Mangrove",
    bnLandmark: "সোনারচর ও হরিণঘাটা ম্যানগ্রোভ বন",
    speciality: "Marine Crabs & Sweet Betel Leaves",
    rarity: "Rare",
    themeColor: "#0D9488",
    gradient: ["#0F766E", "#5EEAD4"],
    icon: "compass-outline",
    xpReward: 120,
  },
  {
    id: "jhalokati",
    name: "Jhalokati",
    bnName: "ঝালকাঠি",
    division: "Barishal",
    code: "BD-JHA",
    landmark: "Suhandal Floating Apple-Guava Orchards",
    bnLandmark: "সুগন্ধা নদী ও ভিমরুলী ভাসমান বাজার",
    speciality: "Sweet Guava & Cooling Cold Drinks",
    rarity: "Common",
    themeColor: "#84CC16",
    gradient: ["#65A30D", "#BEF264"],
    icon: "basket-outline",
    xpReward: 100,
  },

  // ── RANGPUR DIVISION (8) ──────────────────────────────────────────────────
  {
    id: "rangpur",
    name: "Rangpur",
    bnName: "রংপুর",
    division: "Rangpur",
    code: "BD-RAN-D",
    landmark: "Tajhat Palace & Chikli Lake",
    bnLandmark: "তাজহাট রাজবাড়ি ও চিকলী বিল",
    speciality: "Haribhanga Mango & Rangpur Tobacco",
    rarity: "Rare",
    themeColor: "#7C3AED",
    gradient: ["#6D28D9", "#C4B5FD"],
    icon: "home-outline",
    xpReward: 140,
  },
  {
    id: "dinajpur",
    name: "Dinajpur",
    bnName: "দিনাজপুর",
    division: "Rangpur",
    code: "BD-DIN",
    landmark: "Kantajew Terracotta Temple & Ramsagar Lake",
    bnLandmark: "কান্তজিউ টেরাকোটা মন্দির ও রামসাগর দীঘি",
    speciality: "Kataribhog Fragrant Rice & Madrasi Litchi",
    rarity: "Legendary",
    themeColor: "#DC2626",
    gradient: ["#B91C1C", "#FCA5A5"],
    icon: "flame-outline",
    xpReward: 220,
  },
  {
    id: "panchagarh",
    name: "Panchagarh",
    bnName: "পঞ্চগড়",
    division: "Rangpur",
    code: "BD-PAN",
    landmark: "Tetulia Kanchenjunga View & Plain Tea Gardens",
    bnLandmark: "তেঁতুলিয়া কাঞ্চনজঙ্ঘা ভিউ ও সমতলের চা বাগান",
    speciality: "Tetulia Mountain Tea & Rock Museum",
    rarity: "Legendary",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#BAE6FD"],
    icon: "snow-outline",
    xpReward: 250,
  },
  {
    id: "thakurgaon",
    name: "Thakurgaon",
    bnName: "ঠাকুরগাঁও",
    division: "Rangpur",
    code: "BD-THA",
    landmark: "Baliadangi Suryapuri Ancient Mango Tree",
    bnLandmark: "বালিয়াডাঙ্গী সূর্যপুরী বিশাল আমগাছ",
    speciality: "Suryapuri Sweet Mangoes",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#15803D", "#86EFAC"],
    icon: "leaf-outline",
    xpReward: 100,
  },
  {
    id: "gaibandha",
    name: "Gaibandha",
    bnName: "গাইবান্ধা",
    division: "Rangpur",
    code: "BD-GAI",
    landmark: "Bardhan Kuthi & Balashi River Ghat",
    bnLandmark: "বর্ধনকুঠী ও বালাসী ঘাট",
    speciality: "Roshmonjuri Sweet Delicacy",
    rarity: "Common",
    themeColor: "#D97706",
    gradient: ["#B45309", "#FCD34D"],
    icon: "restaurant-outline",
    xpReward: 100,
  },
  {
    id: "kurigram",
    name: "Kurigram",
    bnName: "কুড়িগ্রাম",
    division: "Rangpur",
    code: "BD-KUR",
    landmark: "Dharla River Bridge & Shahi Chandi Mosque",
    bnLandmark: "ধরণীধর দুর্গ ও ধরলা ব্রিজ",
    speciality: "Dharla River Fresh Fish",
    rarity: "Common",
    themeColor: "#0D9488",
    gradient: ["#0F766E", "#5EEAD4"],
    icon: "water-outline",
    xpReward: 100,
  },
  {
    id: "lalmonirhat",
    name: "Lalmonirhat",
    bnName: "লালমনিরহাট",
    division: "Rangpur",
    code: "BD-LAL",
    landmark: "Teesta Barrage Dam & Tin Bigha Corridor",
    bnLandmark: "তিস্তা ব্যারেজ ও তিনবিঘা করিডোর",
    speciality: "Teesta Bairagi Fish & Tobacco",
    rarity: "Common",
    themeColor: "#2563EB",
    gradient: ["#1D4ED8", "#93C5FD"],
    icon: "train-outline",
    xpReward: 100,
  },
  {
    id: "nilphamari",
    name: "Nilphamari",
    bnName: "নীলফামারী",
    division: "Rangpur",
    code: "BD-NIL",
    landmark: "Nil Sagar Lake & Chini Mosque Saidpur",
    bnLandmark: "নীলসাগর ঐতিহাসিক দীঘি ও চিনি মসজিদ সৈয়দপুর",
    speciality: "Saidpur Railway Kebab & Sweets",
    rarity: "Common",
    themeColor: "#4F46E5",
    gradient: ["#4338CA", "#A5B4FC"],
    icon: "eye-outline",
    xpReward: 100,
  },

  // ── MYMENSINGH DIVISION (4) ───────────────────────────────────────────────
  {
    id: "mymensingh",
    name: "Mymensingh",
    bnName: "ময়মনসিংহ",
    division: "Mymensingh",
    code: "BD-MYM",
    landmark: "Alexander Castle, Shashi Lodge & Agricultural Univ.",
    bnLandmark: "শশী লজ ও আলেকজান্ডার ক্যাসেল",
    speciality: "Muktagachar Pure Monda Sweets",
    rarity: "Epic",
    themeColor: "#EA580C",
    gradient: ["#C2410C", "#FDBA74"],
    icon: "ribbon-outline",
    xpReward: 170,
  },
  {
    id: "jamalpur",
    name: "Jamalpur",
    bnName: "জামালপুর",
    division: "Mymensingh",
    code: "BD-JAM",
    landmark: "Garo Hills Border & Gandhi Ashram",
    bnLandmark: "গারো পাহাড় পাদদেশ ও যমুনা নদী চর",
    speciality: "Jamalpur Nakshi Kantha Heritage",
    rarity: "Common",
    themeColor: "#16A34A",
    gradient: ["#15803D", "#86EFAC"],
    icon: "brush-outline",
    xpReward: 100,
  },
  {
    id: "netrokona",
    name: "Netrokona",
    bnName: "নেত্রকোণা",
    division: "Mymensingh",
    code: "BD-NET",
    landmark: "Birishiri Ceramic Hill & Someshwari Crystal River",
    bnLandmark: "বিরিশিরি সাদা মাটির পাহাড় ও সোমেশ্বরী নদী",
    speciality: "Netrokona Balish Mishti (Pillow Sweets)",
    rarity: "Legendary",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    icon: "diamond-outline",
    xpReward: 240,
  },
  {
    id: "sherpur",
    name: "Sherpur",
    bnName: "শেরপুর",
    division: "Mymensingh",
    code: "BD-SHE",
    landmark: "Ghazni Holiday Center & Madhutila Eco Park",
    bnLandmark: "গজনী অবকাশ কেন্দ্র ও মধুটিলা ইকোপার্ক",
    speciality: "Garo Tribal Handloom & Wild Berries",
    rarity: "Rare",
    themeColor: "#059669",
    gradient: ["#047857", "#34D399"],
    icon: "leaf-outline",
    xpReward: 120,
  },
];

// ============================================================================
// POPULAR INTERNATIONAL COUNTRIES
// ============================================================================

export const INTERNATIONAL_COUNTRIES: CountryInfo[] = [
  {
    id: "thailand",
    code: "TH",
    name: "Thailand",
    bnName: "থাইল্যান্ড",
    flag: "🇹🇭",
    capital: "Bangkok",
    landmark: "Grand Palace & Phuket Beaches",
    themeColor: "#3B82F6",
    gradient: ["#1D4ED8", "#60A5FA"],
    xpReward: 350,
  },
  {
    id: "malaysia",
    code: "MY",
    name: "Malaysia",
    bnName: "মালয়েশিয়া",
    flag: "🇲🇾",
    capital: "Kuala Lumpur",
    landmark: "Petronas Twin Towers & Langkawi",
    themeColor: "#E11D48",
    gradient: ["#BE123C", "#FB7185"],
    xpReward: 350,
  },
  {
    id: "singapore",
    code: "SG",
    name: "Singapore",
    bnName: "সিঙ্গাপুর",
    flag: "🇸🇬",
    capital: "Singapore City",
    landmark: "Marina Bay Sands & Gardens by the Bay",
    themeColor: "#DC2626",
    gradient: ["#991B1B", "#F87171"],
    xpReward: 400,
  },
  {
    id: "uae",
    code: "AE",
    name: "United Arab Emirates",
    bnName: "সংযুক্ত আরব আমিরাত",
    flag: "🇦🇪",
    capital: "Abu Dhabi",
    landmark: "Burj Khalifa & Sheikh Zayed Grand Mosque",
    themeColor: "#D97706",
    gradient: ["#92400E", "#FBBF24"],
    xpReward: 400,
  },
  {
    id: "saudi-arabia",
    code: "SA",
    name: "Saudi Arabia",
    bnName: "সৌদি আরব",
    flag: "🇸🇦",
    capital: "Riyadh",
    landmark: "Makkah Clock Tower & Al-Masjid an-Nabawi",
    themeColor: "#059669",
    gradient: ["#065F46", "#34D399"],
    xpReward: 450,
  },
  {
    id: "india",
    code: "IN",
    name: "India",
    bnName: "ভারত",
    flag: "🇮🇳",
    capital: "New Delhi",
    landmark: "Taj Mahal Agra & Kashmir Valley",
    themeColor: "#EA580C",
    gradient: ["#C2410C", "#FB923C"],
    xpReward: 300,
  },
  {
    id: "nepal",
    code: "NP",
    name: "Nepal",
    bnName: "নেপাল",
    flag: "🇳🇵",
    capital: "Kathmandu",
    landmark: "Mount Everest Base & Phewa Lake Pokhara",
    themeColor: "#DC2626",
    gradient: ["#B91C1C", "#F87171"],
    xpReward: 350,
  },
  {
    id: "bhutan",
    code: "BT",
    name: "Bhutan",
    bnName: "ভুটান",
    flag: "🇧🇹",
    capital: "Thimphu",
    landmark: "Tiger's Nest Monastery (Paro Taktsang)",
    themeColor: "#D97706",
    gradient: ["#B45309", "#FCD34D"],
    xpReward: 400,
  },
  {
    id: "maldives",
    code: "MV",
    name: "Maldives",
    bnName: "মালদ্বীপ",
    flag: "🇲🇻",
    capital: "Malé",
    landmark: "Overwater Villas & Crystal Coral Atolls",
    themeColor: "#0284C7",
    gradient: ["#0369A1", "#38BDF8"],
    xpReward: 450,
  },
  {
    id: "turkey",
    code: "TR",
    name: "Turkey",
    bnName: "তুরস্ক",
    flag: "🇹🇷",
    capital: "Ankara",
    landmark: "Hagia Sophia & Cappadocia Hot Air Balloons",
    themeColor: "#DC2626",
    gradient: ["#991B1B", "#FCA5A5"],
    xpReward: 450,
  },
  {
    id: "united-kingdom",
    code: "GB",
    name: "United Kingdom",
    bnName: "যুক্তরাজ্য",
    flag: "🇬🇧",
    capital: "London",
    landmark: "Big Ben, London Eye & Tower Bridge",
    themeColor: "#1E3A8A",
    gradient: ["#1E3A8A", "#60A5FA"],
    xpReward: 500,
  },
  {
    id: "japan",
    code: "JP",
    name: "Japan",
    bnName: "জাপান",
    flag: "🇯🇵",
    capital: "Tokyo",
    landmark: "Mount Fuji, Shibuya Crossing & Kyoto Shrines",
    themeColor: "#E11D48",
    gradient: ["#9F1239", "#FDA4AF"],
    xpReward: 550,
  },
];

// ============================================================================
// 10 TRAVELER MILESTONE LEVELS & EXCLUSIVE PERKS
// ============================================================================

export const MILESTONE_LEVELS: MilestoneLevel[] = [
  {
    level: 1,
    title: "Rookie Traveler",
    bnTitle: "নবীন পরিব্রাজক",
    minStamps: 0,
    maxStamps: 2,
    badgeTitle: "Bronze Compass Pin",
    color: "#78716C",
    gradient: ["#44403C", "#78716C"],
    discountText: "Starter Tier",
    perks: [
      {
        id: "p1_welcome",
        code: "WELCOME50",
        title: "50 TripCoins Bonus",
        description: "50 bonus coins credited directly to your travel wallet",
        icon: "gift-outline",
      },
      {
        id: "p1_map",
        code: "MAP_ACCESS",
        title: "64 District Scratch Map",
        description: "Unlimited interactive scratch map and itinerary tracker",
        icon: "map-outline",
      },
    ],
  },
  {
    level: 2,
    title: "Weekend Wanderer",
    bnTitle: "সাপ্তাহিক ভবঘুরে",
    minStamps: 3,
    maxStamps: 5,
    badgeTitle: "Silver Scout Seal",
    color: "#64748B",
    gradient: ["#334155", "#64748B"],
    discountText: "5% Off Transport",
    perks: [
      {
        id: "p2_bus",
        code: "WANDER5",
        title: "5% Off Bus & Train Tickets",
        description: "Save 5% on all intercity bus and train bookings across BD",
        discountPercentage: 5,
        icon: "bus-outline",
      },
      {
        id: "p2_cancel",
        code: "FREE_CANCEL_1",
        title: "Free Booking Cancellation",
        description: "1 free fee-waived booking cancellation every calendar month",
        icon: "shield-checkmark-outline",
      },
    ],
  },
  {
    level: 3,
    title: "District Discoverer",
    bnTitle: "জেলা আবিষ্কারক",
    minStamps: 6,
    maxStamps: 9,
    badgeTitle: "Emerald Navigator Ribbon",
    color: "#059669",
    gradient: ["#047857", "#10B981"],
    discountText: "7% Off Local Packages",
    perks: [
      {
        id: "p3_priority",
        code: "VIP_ROUTING",
        title: "Priority Support Escalation",
        description: "Fast-track VIP phone and live chat queue routing in under 60s",
        icon: "headset-outline",
      },
      {
        id: "p3_tour_disc",
        code: "DISCOVER7",
        title: "7% Off Curated Tour Packages",
        description: "Save 7% on weekend group tours and local hill excursions",
        discountPercentage: 7,
        icon: "flame-outline",
      },
    ],
  },
  {
    level: 4,
    title: "Pathfinder",
    bnTitle: "পথপ্রদর্শক",
    minStamps: 10,
    maxStamps: 14,
    badgeTitle: "Gold Horizon Emblem",
    color: "#D97706",
    gradient: ["#B45309", "#F59E0B"],
    discountText: "10% Off Hotels",
    perks: [
      {
        id: "p4_hotel",
        code: "PATH10",
        title: "10% Off 500+ Partner Hotels",
        description: "10% instant discount on premium verified hotels and eco-resorts",
        discountPercentage: 10,
        icon: "bed-outline",
      },
      {
        id: "p4_early_checkin",
        code: "EARLY_CHECKIN",
        title: "Free Early Hotel Check-in",
        description: "Complimentary early check-in at participating domestic stays",
        icon: "time-outline",
      },
    ],
  },
  {
    level: 5,
    title: "Nomad",
    bnTitle: "অভিযাত্রী নোম্যাড",
    minStamps: 15,
    maxStamps: 21,
    badgeTitle: "Nomad Crest of Honour",
    color: "#2563EB",
    gradient: ["#1D4ED8", "#60A5FA"],
    discountText: "12% Off Stays + Insurance",
    perks: [
      {
        id: "p5_insurance",
        code: "FREE_INSURANCE",
        title: "Complimentary Travel Insurance",
        description: "Free medical & lost luggage protection on all domestic flights and tours",
        icon: "shield-outline",
      },
      {
        id: "p5_multiplier",
        code: "NOMAD_COINS_15",
        title: "1.5x TripCoins Multiplier",
        description: "Earn 50% more reward coins on every single transaction",
        icon: "wallet-outline",
      },
    ],
  },
  {
    level: 6,
    title: "Voyager",
    bnTitle: "দিগন্তজয়ী পরিব্রাজক",
    minStamps: 22,
    maxStamps: 29,
    badgeTitle: "Sapphire Wings Insignia",
    color: "#7C3AED",
    gradient: ["#6D28D9", "#A78BFA"],
    discountText: "Free Airport Lounge Passes",
    perks: [
      {
        id: "p6_lounge",
        code: "DAC_LOUNGE_PASS",
        title: "2x Free Airport Lounge Access",
        description: "Complimentary passes to Dhaka International (DAC) Skylounge buffet & relaxation suites",
        icon: "airplane-outline",
      },
      {
        id: "p6_flight_disc",
        code: "VOYAGE12",
        title: "12% Flight Ticket Rebate",
        description: "Save up to 12% on domestic airlines (Biman, US-Bangla, Air Astra)",
        discountPercentage: 12,
        icon: "ticket-outline",
      },
    ],
  },
  {
    level: 7,
    title: "Trailblazer",
    bnTitle: "চিরন্তন অভিযাত্রী",
    minStamps: 30,
    maxStamps: 39,
    badgeTitle: "Ruby Constellation Badge",
    color: "#BE123C",
    gradient: ["#9F1239", "#FB7185"],
    discountText: "15% Off International",
    perks: [
      {
        id: "p7_visa",
        code: "EXPRESS_VISA",
        title: "Complimentary Express Visa Assist",
        description: "Zero service fee on international visa filing (Thailand, Malaysia, Singapore)",
        icon: "document-text-outline",
      },
      {
        id: "p7_intl_flight",
        code: "TRAIL15",
        title: "15% Off International Flights",
        description: "Flat 15% discount on international flight departures",
        discountPercentage: 15,
        icon: "globe-outline",
      },
    ],
  },
  {
    level: 8,
    title: "Epic Adventurer",
    bnTitle: "মহাকাব্যিক অভিযাত্রী",
    minStamps: 40,
    maxStamps: 49,
    badgeTitle: "Obsidian Crown Insignia",
    color: "#0F172A",
    gradient: ["#0F172A", "#334155"],
    discountText: "Dedicated WhatsApp Concierge",
    perks: [
      {
        id: "p8_concierge",
        code: "VIP_CONCIERGE",
        title: "Personal WhatsApp Travel Concierge",
        description: "Direct 24/7 dedicated travel manager for personalized booking & custom itineraries",
        icon: "chatbubbles-outline",
      },
      {
        id: "p8_upgrade",
        code: "SUITE_UPGRADE",
        title: "Free Deluxe Room Upgrades",
        description: "Automatic complimentary room tier bump at top tier boutique resorts",
        icon: "star-outline",
      },
    ],
  },
  {
    level: 9,
    title: "Globe Trotter",
    bnTitle: "বিশ্ব পর্যটক",
    minStamps: 50,
    maxStamps: 63,
    badgeTitle: "Platinum Diamond Hologram",
    color: "#0891B2",
    gradient: ["#0E7490", "#38BDF8"],
    discountText: "20% Platform VIP Discount",
    perks: [
      {
        id: "p9_vip_car",
        code: "AIRPORT_CHAUFFEUR",
        title: "Free Airport Luxury Chauffeur Ride",
        description: "Complimentary private AC sedan pickup from Hazrat Shahjalal Airport to your doorstep",
        icon: "car-outline",
      },
      {
        id: "p9_zero_fees",
        code: "ZERO_FEE",
        title: "Zero Payment Gateway Fees",
        description: "100% waiver of all credit card and mobile banking service surcharges",
        discountPercentage: 20,
        icon: "card-outline",
      },
    ],
  },
  {
    level: 10,
    title: "Legendary Wayfarer",
    bnTitle: "কিংবদন্তি বিশ্বজয়ী",
    minStamps: 64,
    maxStamps: 999,
    badgeTitle: "Celestial Sovereign Plaque",
    color: "#CA8A04",
    gradient: ["#713F12", "#EAB308"],
    discountText: "25% Lifetime Platform Discount",
    perks: [
      {
        id: "p10_lifetime",
        code: "WAYFARER25",
        title: "25% Lifetime VIP Discount",
        description: "Permanent 25% discount across all flights, stays, bus, train, and private packages",
        discountPercentage: 25,
        icon: "trophy-outline",
      },
      {
        id: "p10_certificate",
        code: "GOLD_PLAQUE",
        title: "Gold-Plated Certificate of Honour",
        description: "Custom engraved physical Certificate of Bangladesh Exploration mailed to your address",
        icon: "ribbon-outline",
      },
      {
        id: "p10_hall_of_fame",
        code: "HALL_OF_FAME",
        title: "Hall of Fame Community Badge",
        description: "Golden holographic frame on your profile and permanent Leaderboard spotlight",
        icon: "sparkles-outline",
      },
    ],
  },
];

// ============================================================================
// PASSPORT PERSISTENCE & BUSINESS LOGIC ENGINE
// ============================================================================

const PASSPORT_STORAGE_PREFIX = "@travel_digital_passport_";

/**
 * Returns user's passport data from local storage or creates a rich default state.
 */
export async function getPassportProfile(
  userId: string = "guest_traveler",
  userName: string = "Sadman Sakib"
): Promise<UserPassportProfile> {
  try {
    const storageKey = `${PASSPORT_STORAGE_PREFIX}${userId}`;
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as UserPassportProfile;
      // Refresh calculated metrics
      return syncPassportMetrics(parsed);
    }
  } catch (err) {
    console.warn("[PassportService] Error reading local passport:", err);
  }

  // Generate an engaging initial seeded passport with 4 authentic stamps
  // (Cox's Bazar, Sylhet, Bandarban, and Thailand) so the user experiences the delight immediately!
  const initialPassport = generateInitialSeedPassport(userId, userName);
  await savePassportProfile(initialPassport);
  return initialPassport;
}

/**
 * Saves passport profile into AsyncStorage
 */
export async function savePassportProfile(
  passport: UserPassportProfile
): Promise<void> {
  try {
    const updated = syncPassportMetrics(passport);
    const storageKey = `${PASSPORT_STORAGE_PREFIX}${passport.userId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn("[PassportService] Error saving passport:", err);
  }
}

/**
 * Recalculates level, badges, counts, and perks
 */
export function syncPassportMetrics(
  passport: UserPassportProfile
): UserPassportProfile {
  const stampsCount = passport.stamps.length;
  const scratchedCount = passport.scratchedDistricts.length;

  // Determine Explorer Level (1-10)
  let matchedLevel = MILESTONE_LEVELS[0];
  for (const lvl of MILESTONE_LEVELS) {
    if (stampsCount >= lvl.minStamps) {
      matchedLevel = lvl;
    }
  }

  // Calculate Total XP
  let totalXp = 0;
  for (const stamp of passport.stamps) {
    if (stamp.targetType === "district") {
      const dist = BANGLADESH_DISTRICTS.find((d) => d.id === stamp.targetId);
      totalXp += dist?.xpReward ?? 100;
    } else {
      const c = INTERNATIONAL_COUNTRIES.find((c) => c.id === stamp.targetId);
      totalXp += c?.xpReward ?? 300;
    }
  }
  // Bonus XP for scratching
  totalXp += scratchedCount * 30;

  // Aggregate unlocked perks
  const unlockedPerks: string[] = [];
  for (const lvl of MILESTONE_LEVELS) {
    if (lvl.level <= matchedLevel.level) {
      for (const p of lvl.perks) {
        unlockedPerks.push(p.id);
      }
    }
  }

  return {
    ...passport,
    currentLevel: matchedLevel.level,
    stampsCount,
    scratchedCount,
    totalXp,
    unlockedPerks,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Automatically stamps digital passport upon confirmed travel completion
 */
export async function stampPassportOnTripCompletion(params: {
  userId: string;
  destination: string; // District name or country e.g. "Cox's Bazar", "Sylhet", "Thailand"
  travelMode?: TravelMode;
  tripReference?: string;
  completionDate?: string;
}): Promise<{
  passport: UserPassportProfile;
  stamp: ImmigrationStamp;
  isNew: boolean;
  leveledUp: boolean;
  previousLevel: number;
  currentLevel: number;
}> {
  const passport = await getPassportProfile(params.userId);
  const previousLevel = passport.currentLevel;

  const destClean = params.destination.trim().toLowerCase();

  // Try matching Bangladesh District
  let matchedDistrict = BANGLADESH_DISTRICTS.find(
    (d) =>
      d.id === destClean ||
      d.name.toLowerCase() === destClean ||
      d.bnName === destClean ||
      destClean.includes(d.name.toLowerCase()) ||
      destClean.includes(d.id)
  );

  // Try matching International Country
  let matchedCountry = INTERNATIONAL_COUNTRIES.find(
    (c) =>
      c.id === destClean ||
      c.name.toLowerCase() === destClean ||
      c.code.toLowerCase() === destClean ||
      destClean.includes(c.name.toLowerCase()) ||
      destClean.includes(c.id)
  );

  // If not explicitly found, default to Cox's Bazar or a generic valid district
  if (!matchedDistrict && !matchedCountry) {
    matchedDistrict =
      BANGLADESH_DISTRICTS.find((d) => d.id === "coxs-bazar") ??
      BANGLADESH_DISTRICTS[0];
  }

  const isDistrict = Boolean(matchedDistrict);
  const targetId = isDistrict ? matchedDistrict!.id : matchedCountry!.id;
  const targetType = isDistrict ? "district" : "country";

  // Check if stamp already exists
  const existingIndex = passport.stamps.findIndex(
    (s) => s.targetId === targetId && s.targetType === targetType
  );

  const colors: StampInkColor[] = [
    "#1E3A8A",
    "#991B1B",
    "#065F46",
    "#B45309",
    "#581C87",
  ];
  const sealStyles: StampSealStyle[] = [
    "circular",
    "hexagonal",
    "oval",
    "rectangular",
  ];

  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomSeal = sealStyles[Math.floor(Math.random() * sealStyles.length)];
  const randomRotation = Number((Math.random() * 12 - 6).toFixed(1)); // -6 deg to +6 deg

  const newStamp: ImmigrationStamp = {
    id: `stamp_${targetId}_${Date.now()}`,
    targetId,
    targetType,
    title: isDistrict ? matchedDistrict!.name : matchedCountry!.name,
    subtitle: isDistrict
      ? `${matchedDistrict!.division} Division, BD`
      : `${matchedCountry!.capital}, ${matchedCountry!.code}`,
    stampedAt: params.completionDate || new Date().toISOString(),
    entryNumber: `EXP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    sealStyle: randomSeal,
    inkColor: randomColor,
    travelMode: params.travelMode || (isDistrict ? "bus" : "flight"),
    tripReference:
      params.tripReference ||
      `TRIP-${targetId.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`,
    isVerified: true,
    isScratched: false, // Ready to be scratched by user!
    rotationDeg: randomRotation,
    landmark: isDistrict
      ? matchedDistrict!.landmark
      : matchedCountry!.landmark,
    badgeCode: isDistrict
      ? matchedDistrict!.code
      : `${matchedCountry!.code}-INT`,
    division: isDistrict ? matchedDistrict!.division : undefined,
    countryCode: !isDistrict ? matchedCountry!.code : undefined,
  };

  let isNew = false;
  if (existingIndex === -1) {
    passport.stamps.unshift(newStamp);
    isNew = true;
  } else {
    // Update existing timestamp
    passport.stamps[existingIndex].stampedAt = newStamp.stampedAt;
  }

  const updatedPassport = syncPassportMetrics(passport);
  await savePassportProfile(updatedPassport);

  const leveledUp = updatedPassport.currentLevel > previousLevel;

  return {
    passport: updatedPassport,
    stamp: newStamp,
    isNew,
    leveledUp,
    previousLevel,
    currentLevel: updatedPassport.currentLevel,
  };
}

/**
 * Marks a district as scratched on the 3D map, unlocking vibrant colors
 */
export async function scratchDistrict(
  userId: string,
  districtId: string
): Promise<UserPassportProfile> {
  const passport = await getPassportProfile(userId);
  if (!passport.scratchedDistricts.includes(districtId)) {
    passport.scratchedDistricts.push(districtId);
  }

  // Also mark corresponding stamp as scratched if present
  const stamp = passport.stamps.find(
    (s) => s.targetId === districtId && s.targetType === "district"
  );
  if (stamp) {
    stamp.isScratched = true;
  }

  const updated = syncPassportMetrics(passport);
  await savePassportProfile(updated);
  return updated;
}

/**
 * Scratches all visited districts in one satisfying action
 */
export async function scratchAllVisitedDistricts(
  userId: string
): Promise<UserPassportProfile> {
  const passport = await getPassportProfile(userId);
  for (const stamp of passport.stamps) {
    if (
      stamp.targetType === "district" &&
      !passport.scratchedDistricts.includes(stamp.targetId)
    ) {
      passport.scratchedDistricts.push(stamp.targetId);
      stamp.isScratched = true;
    }
  }

  const updated = syncPassportMetrics(passport);
  await savePassportProfile(updated);
  return updated;
}

/**
 * Social Flex Sharing Engine:
 * Generates and shares a high-resolution Digital Passport Story card for Instagram / WhatsApp stories.
 * Uses `expo-sharing` with image capture ref (react-native-view-shot) and fallback SVG generator.
 */
export async function sharePassportStory(options: {
  passport: UserPassportProfile;
  capturedImageUri?: string | null;
}): Promise<boolean> {
  const { passport, capturedImageUri } = options;

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.warn("[PassportService] expo-sharing is not available on this device");
      return false;
    }

    if (capturedImageUri) {
      await Sharing.shareAsync(capturedImageUri, {
        mimeType: "image/png",
        dialogTitle: "Share your Digital Passport Story",
        UTI: "public.png",
      });
      return true;
    }

    // High-Res SVG fallback generator if no direct image capture
    const svgContent = generatePassportStorySvg(passport);
    const fileName = `DigitalPassport_${passport.holderName.replace(/\s+/g, "_")}_${Date.now()}.svg`;

    try {
      const { File, Paths } = require("expo-file-system");
      if (Paths && Paths.cache) {
        const file = new File(Paths.cache, fileName);
        file.write(svgContent);
        await Sharing.shareAsync(file.uri, {
          mimeType: "image/svg+xml",
          dialogTitle: "Share Digital Passport to Instagram / WhatsApp Stories",
          UTI: "public.svg-image",
        });
        return true;
      }
    } catch {
      // Try legacy expo-file-system if present
      try {
        const legacyFs = require("expo-file-system/legacy");
        const filePath = `${legacyFs.cacheDirectory}${fileName}`;
        await legacyFs.writeAsStringAsync(filePath, svgContent, {
          encoding: "utf8",
        });
        await Sharing.shareAsync(filePath, {
          mimeType: "image/svg+xml",
          dialogTitle: "Share Digital Passport to Instagram / WhatsApp Stories",
          UTI: "public.svg-image",
        });
        return true;
      } catch (err) {
        console.warn("[PassportService] FileSystem write error:", err);
      }
    }

    return false;
  } catch (err) {
    console.warn("[PassportService] Error sharing passport story:", err);
    return false;
  }
}

/**
 * Generates an ultra clean, high-resolution SVG artwork card for passport stories
 */
export function generatePassportStorySvg(
  passport: UserPassportProfile
): string {
  const currentLvl =
    MILESTONE_LEVELS.find((l) => l.level === passport.currentLevel) ||
    MILESTONE_LEVELS[0];
  const percent = Math.min(
    100,
    Math.round((passport.stampsCount / 64) * 100)
  );

  return `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#065F46" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="1080" height="1920" fill="url(#bgGrad)" />

  <!-- Gold Embossed Border Frame -->
  <rect x="50" y="50" width="980" height="1820" rx="40" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-dasharray="16,8" />
  <rect x="70" y="70" width="940" height="1780" rx="30" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.6" />

  <!-- Header: Official Emblem -->
  <text x="540" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#EAB308" text-anchor="middle" letter-spacing="8">PEOPLE'S REPUBLIC OF TRAVEL</text>
  <text x="540" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#94A3B8" text-anchor="middle" letter-spacing="4">BANGLADESH DIGITAL PASSPORT</text>
  <text x="540" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="#38BDF8" text-anchor="middle">বাংলাদেশ ভ্রমণ পাসপোর্ট</text>

  <!-- Gold Crest Star -->
  <circle cx="540" cy="350" r="50" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
  <text x="540" y="365" font-family="system-ui, -apple-system, sans-serif" font-size="44" fill="#EAB308" text-anchor="middle">★</text>

  <!-- Traveler Card Box -->
  <rect x="110" y="440" width="860" height="320" rx="24" fill="#1E293B" stroke="#334155" stroke-width="2" />
  
  <text x="160" y="510" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#94A3B8" letter-spacing="2">TRAVELER NAME / নাম</text>
  <text x="160" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="900" fill="#F8FAFC">${escapeXml(passport.holderName)}</text>

  <text x="160" y="630" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#94A3B8" letter-spacing="2">PASSPORT NUMBER / নম্বর</text>
  <text x="160" y="670" font-family="monospace" font-size="32" font-weight="800" fill="#38BDF8">${escapeXml(passport.passportNumber)}</text>

  <text x="620" y="510" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#94A3B8" letter-spacing="2">EXPLORER LEVEL</text>
  <rect x="620" y="530" width="310" height="54" rx="14" fill="#065F46" />
  <text x="775" y="565" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#34D399" text-anchor="middle">LVL ${passport.currentLevel} • ${escapeXml(currentLvl.title)}</text>

  <text x="620" y="630" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#94A3B8" letter-spacing="2">TOTAL EXPEDITION XP</text>
  <text x="620" y="670" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#EAB308">${passport.totalXp.toLocaleString()} XP</text>

  <!-- Scratch Map Progress Section -->
  <rect x="110" y="800" width="860" height="240" rx="24" fill="#0F172A" stroke="#334155" stroke-width="2" />
  <text x="160" y="860" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#F8FAFC">64 DISTRICT SCRATCH MAP STATUS</text>
  <text x="160" y="895" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#94A3B8">বাংলাদেশ ৬৪ জেলা ভ্রমণ অগ্রগতি</text>

  <!-- Progress Bar -->
  <rect x="160" y="930" width="760" height="28" rx="14" fill="#334155" />
  <rect x="160" y="930" width="${Math.max(28, (760 * percent) / 100)}" height="28" rx="14" fill="url(#goldGrad)" />

  <text x="160" y="995" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#38BDF8">${passport.stampsCount} / 64 Districts Stamped (${percent}%)</text>
  <text x="920" y="995" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#34D399" text-anchor="end">${passport.scratchedCount} Scratched</text>

  <!-- Top Verified Stamps Grid -->
  <text x="110" y="1090" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="800" fill="#F8FAFC" letter-spacing="1">VERIFIED IMMIGRATION STAMPS</text>
  <text x="110" y="1120" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#94A3B8">সরকারি অভিবাসন ও পর্যটন সিলসমূহ</text>

  <!-- Render 4 Stamp Badges -->
  ${passport.stamps
    .slice(0, 4)
    .map((stamp, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 110 + col * 440;
      const y = 1150 + row * 240;
      return `
    <g transform="translate(${x}, ${y}) rotate(${stamp.rotationDeg}, 205, 100)">
      <rect width="410" height="200" rx="18" fill="#1E293B" stroke="${stamp.inkColor}" stroke-width="4" stroke-dasharray="8,4" opacity="0.9" />
      <circle cx="60" cy="100" r="34" fill="${stamp.inkColor}" opacity="0.2" />
      <text x="60" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="26" fill="${stamp.inkColor}" text-anchor="middle">★</text>
      
      <text x="110" y="65" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="${stamp.inkColor}" letter-spacing="2">PASSPORT CONTROL</text>
      <text x="110" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="900" fill="#F8FAFC">${escapeXml(stamp.title)}</text>
      <text x="110" y="135" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#94A3B8">${escapeXml(stamp.subtitle.slice(0, 28))}</text>
      <text x="110" y="170" font-family="monospace" font-size="14" font-weight="700" fill="${stamp.inkColor}">DATE: ${new Date(stamp.stampedAt).toLocaleDateString()} • ${stamp.entryNumber}</text>
    </g>
    `;
    })
    .join("\n")}

  <!-- Footer Social Flex Stamp -->
  <rect x="110" y="1670" width="860" height="150" rx="20" fill="url(#accentGrad)" />
  <text x="160" y="1735" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF">TRAVEL AGENCY PLATFORM</text>
  <text x="160" y="1775" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#A7F3D0">Discover 64 Districts • Book Flights, Hotels & Tours</text>
  <text x="920" y="1755" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#FDE047" text-anchor="end">#TravelBangladesh</text>
</svg>
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// INITIAL SEED DATA GENERATOR
// ============================================================================

function generateInitialSeedPassport(
  userId: string,
  userName: string
): UserPassportProfile {
  const now = new Date();
  const dateStr = now.toISOString();

  // 4 iconic authentic starting stamps
  const seedStamps: ImmigrationStamp[] = [
    {
      id: "stamp_cxb_seed",
      targetId: "coxs-bazar",
      targetType: "district",
      title: "Cox's Bazar",
      subtitle: "Chattogram Division, BD",
      stampedAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
      entryNumber: "EXP-2026-1049",
      sealStyle: "circular",
      inkColor: "#1E3A8A",
      travelMode: "flight",
      tripReference: "TRIP-CXB-9982",
      isVerified: true,
      isScratched: true,
      rotationDeg: -3.5,
      landmark: "World's Longest Sea Beach & Saint Martin",
      badgeCode: "BD-CXB",
      division: "Chattogram",
    },
    {
      id: "stamp_syl_seed",
      targetId: "sylhet",
      targetType: "district",
      title: "Sylhet",
      subtitle: "Sylhet Division, BD",
      stampedAt: new Date(now.getTime() - 28 * 86400000).toISOString(),
      entryNumber: "EXP-2026-2411",
      sealStyle: "hexagonal",
      inkColor: "#065F46",
      travelMode: "train",
      tripReference: "TRIP-SYL-7741",
      isVerified: true,
      isScratched: true,
      rotationDeg: 4.2,
      landmark: "Hazrat Shah Jalal Shrine, Ratargul Swamp & Bichanakandi",
      badgeCode: "BD-SYL",
      division: "Sylhet",
    },
    {
      id: "stamp_bdb_seed",
      targetId: "bandarban",
      targetType: "district",
      title: "Bandarban",
      subtitle: "Chattogram Division, BD",
      stampedAt: new Date(now.getTime() - 45 * 86400000).toISOString(),
      entryNumber: "EXP-2026-3829",
      sealStyle: "oval",
      inkColor: "#991B1B",
      travelMode: "roadtrip",
      tripReference: "TRIP-BDB-1120",
      isVerified: true,
      isScratched: false, // Ready to scratch!
      rotationDeg: -5.0,
      landmark: "Nilgiri, Keokradong & Nafakhum Waterfall",
      badgeCode: "BD-BDB",
      division: "Chattogram",
    },
    {
      id: "stamp_th_seed",
      targetId: "thailand",
      targetType: "country",
      title: "Thailand",
      subtitle: "Bangkok, TH",
      stampedAt: new Date(now.getTime() - 90 * 86400000).toISOString(),
      entryNumber: "EXP-2026-8822",
      sealStyle: "rectangular",
      inkColor: "#581C87",
      travelMode: "flight",
      tripReference: "TRIP-BKK-0034",
      isVerified: true,
      isScratched: true,
      rotationDeg: 2.1,
      landmark: "Grand Palace & Phuket Beaches",
      badgeCode: "TH-INT",
      countryCode: "TH",
    },
  ];

  const profile: UserPassportProfile = {
    userId,
    passportNumber: `BD-PASS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    holderName: userName || "Sadman Sakib",
    nationality: "Bangladeshi",
    issuedDate: "2026-01-01T00:00:00.000Z",
    totalXp: 850,
    currentLevel: 2, // Weekend Wanderer
    stampsCount: 4,
    scratchedCount: 3,
    stamps: seedStamps,
    scratchedDistricts: ["coxs-bazar", "sylhet"],
    unlockedPerks: ["p1_welcome", "p1_map", "p2_bus", "p2_cancel"],
    lastUpdated: dateStr,
  };

  return profile;
}
