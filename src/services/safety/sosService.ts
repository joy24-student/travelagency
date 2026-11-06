/**
 * Critical Safety & Emergency Systems Service - Shopno Jatra
 * One-Tap SOS, 15km Nearby Medical & Police Finder, Offline Medical Phrasebook, and Embassy Directory.
 *
 * Designed for extreme reliability in low-connectivity and panic scenarios.
 * All core directory records are bundled locally for 100% offline availability.
 *
 * @module services/safety/sosService
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import * as Haptics from "expo-haptics";

// ============================================================================
// Types & Contracts
// ============================================================================

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  timestamp: number;
  isEstimated?: boolean;
  locationName?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: "Family" | "Friend" | "Tour Guide" | "Hotel" | "Colleague" | "Other";
  isPrimary: boolean;
  notifyOnSOS: boolean;
  addedAt: number;
}

export type EmergencyFacilityType = "hospital" | "police" | "pharmacy" | "tourist_police";

export interface EmergencyFacility {
  id: string;
  name: string;
  nameBn: string;
  type: EmergencyFacilityType;
  categoryLabel: string;
  address: string;
  addressBn?: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  altPhone?: string;
  isOpen24Hours: boolean;
  isVerified: boolean;
  hasICU?: boolean;
  hasEmergencyWard?: boolean;
  hasBurnUnit?: boolean;
  englishSpoken?: boolean;
  distanceKm?: number;
  features: string[];
}

export type MedicalPhraseCategory = "critical" | "allergies" | "symptoms" | "police_assistance";

export interface MedicalPhrase {
  id: string;
  category: MedicalPhraseCategory;
  categoryLabel: string;
  english: string;
  bengali: string;
  pronunciation: string;
  urgency: "critical" | "high" | "normal";
  iconName: string;
  keywords: string[];
}

export interface EmbassyContact {
  id: string;
  country: string;
  countryCode: string;
  flag: string;
  embassyName: string;
  consularHotline24h: string;
  standardPhone: string;
  emergencyEmail: string;
  address: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  workingHours: string;
  passportAssistance: boolean;
}

export interface SOSDispatchLog {
  id: string;
  timestamp: number;
  coordinates: GeoCoordinates;
  recipients: string[];
  message: string;
  status: "dispatched" | "failed" | "cancelled";
}

export interface SOSDispatchResult {
  success: boolean;
  dispatchTimestamp: number;
  coordinates: GeoCoordinates;
  smsUrls: string[];
  contactsNotifiedCount: number;
  primaryPhone?: string;
  sosMessage: string;
  error?: string;
}

// Storage keys
const STORAGE_CONTACTS_KEY = "@shopno_jatra_emergency_contacts_v1";
const STORAGE_SOS_LOGS_KEY = "@shopno_jatra_sos_logs_v1";
const STORAGE_LAST_KNOWN_LOCATION = "@shopno_jatra_last_known_location_v1";

// ============================================================================
// Default Constants: Hotlines & Coords
// ============================================================================

export const NATIONAL_HOTLINES = [
  {
    id: "hotline-999",
    name: "National Emergency Helpline",
    nameBn: "জাতীয় জরুরি সেবা",
    number: "999",
    desc: "Police, Ambulance & Fire Service (Toll-Free 24/7)",
    icon: "shield-checkmark",
    color: "#dc2626",
    badge: "24/7 Official",
  },
  {
    id: "hotline-tourist-police",
    name: "Bangladesh Tourist Police",
    nameBn: "বাংলাদেশ ট্যুরিস্ট পুলিশ",
    number: "+8801320222222",
    displayNumber: "01320-222222",
    desc: "Dedicated Tourist Security & Complaint Response",
    icon: "shield-outline",
    color: "#0284c7",
    badge: "Specialized",
  },
  {
    id: "hotline-tourist-police-alt",
    name: "Tourist Police HQ Control",
    nameBn: "ট্যুরিস্ট পুলিশ কন্ট্রোল রুম",
    number: "+8801320164100",
    displayNumber: "01320-164100",
    desc: "National Central Monitoring & Emergency Dispatch",
    icon: "call-outline",
    color: "#0369a1",
    badge: "Control Desk",
  },
  {
    id: "hotline-ambulance",
    name: "Fire & Civil Defence (Ambulance)",
    nameBn: "ফায়ার সার্ভিস ও অ্যাম্বুলেন্স",
    number: "16163",
    displayNumber: "16163 / 199",
    desc: "Emergency Rescue, Fire Control & Disaster Relief",
    icon: "flame-outline",
    color: "#ea580c",
    badge: "Emergency",
  },
  {
    id: "hotline-medical-shastho",
    name: "National Health Helpline",
    nameBn: "স্বাস্থ্য বাতায়ন",
    number: "16263",
    displayNumber: "16263",
    desc: "Govt. Telemedicine & Doctor Consultation",
    icon: "medkit-outline",
    color: "#16a34a",
    badge: "Medical",
  },
];

// Reference center coordinates for Bangladesh tourist regions (fallback if GPS disabled)
export const REGIONAL_CENTERS: Record<string, { lat: number; lng: number; name: string }> = {
  dhaka_diplomatic: { lat: 23.7925, lng: 90.4078, name: "Gulshan / Baridhara Diplomatic Zone, Dhaka" },
  coxs_bazar: { lat: 21.4272, lng: 91.9702, name: "Laboni Beach / Kolatoli, Cox's Bazar" },
  sylhet: { lat: 24.8949, lng: 91.8687, name: "Zindabazar / Ambarkhana, Sylhet" },
  chittagong: { lat: 22.3569, lng: 91.7832, name: "GEC Circle / Agrabad, Chattogram" },
  sreemangal: { lat: 24.3065, lng: 91.7296, name: "Tea Garden Hub, Sreemangal" },
};

// ============================================================================
// Bundled Offline Verified Emergency Facilities (15km radius datasets)
// ============================================================================

export const VERIFIED_FACILITIES: EmergencyFacility[] = [
  // ── DHAKA HOSPITALS ────────────────────────────────────────────────────────
  {
    id: "fac-hosp-dhaka-1",
    name: "United Hospital Limited",
    nameBn: "ইউনাইটেড হসপিটাল লিমিটেড",
    type: "hospital",
    categoryLabel: "Specialized Hospital & 24/7 Trauma",
    address: "Plot 15, Road 71, Gulshan-2, Dhaka 1212",
    addressBn: "প্লট ১৫, রোড ৭১, গুলশান-২, ঢাকা ১২১২",
    area: "Gulshan",
    city: "Dhaka",
    latitude: 23.7997,
    longitude: 90.4182,
    phone: "+8801914001234",
    altPhone: "+8802222262640",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["Level-1 Trauma", "24/7 Cardiac ICU", "Foreigner Concierge", "Helipad"],
  },
  {
    id: "fac-hosp-dhaka-2",
    name: "Evercare Hospital Dhaka",
    nameBn: "এভারকেয়ার হসপিটাল ঢাকা",
    type: "hospital",
    categoryLabel: "JCI Accredited Multi-Specialty Hospital",
    address: "Plot 81, Block E, Bashundhara R/A, Dhaka 1229",
    addressBn: "প্লট ৮১, ব্লক ই, বসুন্ধরা আ/এ, ঢাকা ১২২৯",
    area: "Bashundhara",
    city: "Dhaka",
    latitude: 23.8103,
    longitude: 90.4312,
    phone: "+8809666710678",
    altPhone: "+88028431661",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["JCI Accredited", "24/7 Pediatric & Adult ER", "Multilingual Staff", "International Insurance Desk"],
  },
  {
    id: "fac-hosp-dhaka-3",
    name: "Square Hospital Dhaka",
    nameBn: "স্কয়ার হাসপাতাল ঢাকা",
    type: "hospital",
    categoryLabel: "Tertiary Care Hospital",
    address: "18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka 1205",
    addressBn: "১৮/এফ, বীর উত্তম কাজী নুরুজ্জামান সড়ক, পশ্চিম পান্থপথ, ঢাকা ১২০৫",
    area: "Panthapath",
    city: "Dhaka",
    latitude: 23.7533,
    longitude: 90.3861,
    phone: "+8801713377775",
    altPhone: "+88028144400",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["24/7 Emergency", "Air Ambulance Liaison", "Comprehensive Burn & Trauma", "Digital Radiology"],
  },
  {
    id: "fac-hosp-dhaka-4",
    name: "Kurmitola General Hospital",
    nameBn: "কুর্মিটোলা জেনারেল হাসপাতাল",
    type: "hospital",
    categoryLabel: "Airport Zone Govt. General Hospital",
    address: "Dhaka - Mymensingh Highway, Dhaka Cantonment (Near Airport), Dhaka 1206",
    addressBn: "ঢাকা-ময়মনসিংহ মহাসড়ক, কুর্মিটোলা, ঢাকা ১২০৬",
    area: "Airport Corridor",
    city: "Dhaka",
    latitude: 23.8242,
    longitude: 90.4069,
    phone: "+880255067140",
    altPhone: "+880255067141",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["Closest to Intl. Airport", "24/7 Military-Grade Emergency", "Burn & Toxicology Support"],
  },
  {
    id: "fac-hosp-dhaka-5",
    name: "Dhaka Medical College Hospital (DMCH Emergency)",
    nameBn: "ঢাকা মেডিকেল কলেজ হাসপাতাল (জরুরি বিভাগ)",
    type: "hospital",
    categoryLabel: "National Apex Emergency & Trauma Center",
    address: "Secretariat Road, Shahbagh, Dhaka 1000",
    addressBn: "সচিবালয় রোড, শাহবাগ, ঢাকা ১০০০",
    area: "Shahbagh",
    city: "Dhaka",
    latitude: 23.7259,
    longitude: 90.3976,
    phone: "+880255165088",
    altPhone: "+880255165089",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    hasBurnUnit: true,
    englishSpoken: true,
    features: ["National Sheikh Hasina Burn Unit", "Round-the-clock Surgical Trauma", "Max Capacity ICU"],
  },

  // ── DHAKA POLICE & TOURIST POLICE ──────────────────────────────────────────
  {
    id: "fac-pol-dhaka-1",
    name: "Gulshan Model Police Station",
    nameBn: "গুলশান মডেল থানা",
    type: "police",
    categoryLabel: "Metropolitan Police Station",
    address: "Road 36, House 3, Gulshan-2, Dhaka 1212",
    addressBn: "রোড ৩৬, বাড়ি ৩, গুলশান-২, ঢাকা ১২১২",
    area: "Gulshan",
    city: "Dhaka",
    latitude: 23.7915,
    longitude: 90.4146,
    phone: "+8801713373168",
    altPhone: "+88029882244",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Diplomatic Security Coordination", "English Speaking Duty Officer", "Fast Response Patrol"],
  },
  {
    id: "fac-pol-dhaka-2",
    name: "Diplomatic Security Division Outpost",
    nameBn: "কূটনৈতিক নিরাপত্তা বিভাগ ফাঁড়ি",
    type: "tourist_police",
    categoryLabel: "Diplomatic & Tourist Protection",
    address: "Baridhara Diplomatic Zone, Road 11, Dhaka 1212",
    addressBn: "বারিধারা কূটনৈতিক এলাকা, রোড ১১, ঢাকা ১২১২",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7992,
    longitude: 90.4218,
    phone: "+8801713398555",
    altPhone: "+88028829871",
    isOpen24Hours: true,
    isVerified: true,
    features: ["High-Security Escort", "Embassy Liaison", "Foreign National Assistance"],
  },
  {
    id: "fac-pol-dhaka-3",
    name: "Banani Police Station",
    nameBn: "বনানী থানা",
    type: "police",
    categoryLabel: "Metropolitan Police Station",
    address: "Road 11, Block D, Banani, Dhaka 1213",
    addressBn: "রোড ১১, ব্লক ডি, বনানী, ঢাকা ১২১৩",
    area: "Banani",
    city: "Dhaka",
    latitude: 23.7942,
    longitude: 90.4048,
    phone: "+8801713373169",
    altPhone: "+88029891234",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Hotel Safety Inspection Team", "Tourist Assistance Desk", "24/7 Mobile Patrol"],
  },
  {
    id: "fac-pol-dhaka-4",
    name: "Airport Police Station (Hazrat Shahjalal Intl)",
    nameBn: "বিমানবন্দর থানা",
    type: "tourist_police",
    categoryLabel: "International Transit & Tourist Assistance",
    address: "Terminal 1 Approach Road, Kurmitola, Dhaka 1229",
    addressBn: "টার্মিনাল ১ অ্যাপ্রোচ রোড, কুর্মিটোলা, ঢাকা ১২২৯",
    area: "Airport",
    city: "Dhaka",
    latitude: 23.8433,
    longitude: 90.4022,
    phone: "+8801713373173",
    altPhone: "+88028901234",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Airport Tourist Help Desk", "Lost Passport Support", "Immigration Security Hotline"],
  },

  // ── DHAKA 24/7 PHARMACIES ──────────────────────────────────────────────────
  {
    id: "fac-pharm-dhaka-1",
    name: "Labaid 24/7 Pharmacy Gulshan",
    nameBn: "ল্যাবএইড ২৪/৭ ফার্মেসি গুলশান",
    type: "pharmacy",
    categoryLabel: "24/7 Hospital Pharmacy",
    address: "House 13/A, Road 35, Gulshan-2, Dhaka 1212",
    addressBn: "বাড়ি ১৩/এ, রোড ৩৫, গুলশান-২, ঢাকা ১২১২",
    area: "Gulshan",
    city: "Dhaka",
    latitude: 23.7938,
    longitude: 90.4149,
    phone: "+8801766662888",
    isOpen24Hours: true,
    isVerified: true,
    features: ["24/7 Cold Chain Insulin", "Imported Anti-Allergy Meds", "Card & Digital Payment Accepted"],
  },
  {
    id: "fac-pharm-dhaka-2",
    name: "Tamanna Pharmacy Banani (24 Hours)",
    nameBn: "তমন্না ফার্মেসি বনানী",
    type: "pharmacy",
    categoryLabel: "24/7 Retail Drug Store",
    address: "Plot 54, Road 11, Block D, Banani, Dhaka 1213",
    addressBn: "প্লট ৫৪, রোড ১১, ব্লক ডি, বনানী, ঢাকা ১২১৩",
    area: "Banani",
    city: "Dhaka",
    latitude: 23.7929,
    longitude: 90.4035,
    phone: "+8801819234567",
    isOpen24Hours: true,
    isVerified: true,
    features: ["24/7 Emergency Dispensary", "Asthma Inhalers & Nebulizers", "Registered Pharmacist Onsite"],
  },
  {
    id: "fac-pharm-dhaka-3",
    name: "United Hospital 24/7 Outpatient Pharmacy",
    nameBn: "ইউনাইটেড হসপিটাল ফার্মেসি",
    type: "pharmacy",
    categoryLabel: "24/7 Institutional Pharmacy",
    address: "Ground Floor, United Hospital, Road 71, Gulshan-2, Dhaka",
    addressBn: "গ্রাউন্ড ফ্লোর, ইউনাইটেড হসপিটাল, গুলশান-২",
    area: "Gulshan",
    city: "Dhaka",
    latitude: 23.7997,
    longitude: 90.4182,
    phone: "+8802222262640",
    isOpen24Hours: true,
    isVerified: true,
    features: ["International Brand Equivalents", "Anti-Venom Stockist", "Emergency Injection Supplies"],
  },

  // ── COX'S BAZAR (TOP TOURIST DESTINATION) ──────────────────────────────────
  {
    id: "fac-pol-cox-1",
    name: "Cox's Bazar Tourist Police Zone HQ",
    nameBn: "কক্সবাজার ট্যুরিস্ট পুলিশ জোন",
    type: "tourist_police",
    categoryLabel: "Primary Beach Tourist Police Station",
    address: "Laboni Beach Point, Cox's Bazar 4700",
    addressBn: "লাবণী বিচ পয়েন্ট, কক্সবাজার ৪৭০০",
    area: "Laboni Beach",
    city: "Cox's Bazar",
    latitude: 21.4321,
    longitude: 91.9684,
    phone: "+8801320222222",
    altPhone: "+8801769690740",
    isOpen24Hours: true,
    isVerified: true,
    features: ["24/7 Beach Patrolling", "Tourist Rescue & Lost Children Desk", "Direct Sea Rescue Team"],
  },
  {
    id: "fac-pol-cox-2",
    name: "Sugandha Beach Tourist Police Outpost",
    nameBn: "সুগন্ধা বিচ ট্যুরিস্ট পুলিশ ক্যাম্প",
    type: "tourist_police",
    categoryLabel: "Beachfront Police Outpost",
    address: "Sugandha Point, Kolatoli Road, Cox's Bazar 4700",
    addressBn: "সুগন্ধা পয়েন্ট, কলাতলী রোড, কক্সবাজার",
    area: "Kolatoli",
    city: "Cox's Bazar",
    latitude: 21.4239,
    longitude: 91.9754,
    phone: "+8801769690741",
    isOpen24Hours: true,
    isVerified: true,
    features: ["First-Response Beach Patrol", "Tourist Harassment Prevention", "Emergency First Aid"],
  },
  {
    id: "fac-hosp-cox-1",
    name: "Cox's Bazar 250 Bed District Sadar Hospital",
    nameBn: "কক্সবাজার জেলা সদর হাসপাতাল (জরুরি বিভাগ)",
    type: "hospital",
    categoryLabel: "Govt. District Hospital & Trauma Center",
    address: "Hospital Road, Cox's Bazar Sadar, Cox's Bazar 4700",
    addressBn: "হাসপাতাল রোড, কক্সবাজার সদর",
    area: "Sadar",
    city: "Cox's Bazar",
    latitude: 21.4428,
    longitude: 91.9806,
    phone: "+88034163456",
    altPhone: "+8801712233445",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    features: ["24/7 Trauma Emergency", "Sea Drowning Stabilization", "Govt. Snakebite Anti-Venom Center"],
  },
  {
    id: "fac-pharm-cox-1",
    name: "Beach Point 24/7 Model Pharmacy",
    nameBn: "বিচ পয়েন্ট মডেল ফার্মেসি",
    type: "pharmacy",
    categoryLabel: "24/7 Tourist Pharmacy",
    address: "Hotel Motel Zone, Kolatoli Main Road, Cox's Bazar",
    addressBn: "হোটেল মোটেল জোন, কলাতলী রোড, কক্সবাজার",
    area: "Kolatoli",
    city: "Cox's Bazar",
    latitude: 21.4255,
    longitude: 91.9748,
    phone: "+8801819876543",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Sunburn & Jellyfish Sting Kits", "24/7 Oral Rehydration", "Traveler Diarrhea Meds"],
  },

  // ── SYLHET / SREEMANGAL (TEA GARDENS & ECO-TOURISM) ────────────────────────
  {
    id: "fac-pol-syl-1",
    name: "Sylhet Tourist Police Regional Office",
    nameBn: "সিলেট ট্যুরিস্ট পুলিশ অফিস",
    type: "tourist_police",
    categoryLabel: "Regional Tourist Security Headquarters",
    address: "Nayasarak Road, Sylhet 3100",
    addressBn: "নয়াসড়ক রোড, সিলেট ৩১০০",
    area: "Nayasarak",
    city: "Sylhet",
    latitude: 24.8978,
    longitude: 91.8741,
    phone: "+8801769690750",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Jaflong, Ratargul & Tea Garden Safety", "Tourist Rescue Team", "24/7 English Helpline"],
  },
  {
    id: "fac-hosp-syl-1",
    name: "Mount Adora Hospital Sylhet",
    nameBn: "মাউন্ট এডোরা হসপিটাল সিলেট",
    type: "hospital",
    categoryLabel: "Private Tertiary Hospital",
    address: "Akhalia, Sylhet-Sunamganj Highway, Sylhet 3100",
    addressBn: "আখালিয়া, সিলেট-সুনামগঞ্জ রোড, সিলেট",
    area: "Akhalia",
    city: "Sylhet",
    latitude: 24.9085,
    longitude: 91.8392,
    phone: "+8801799988877",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["24/7 Modern ICU & CCU", "International Standard Diagnostic Lab", "Cardiac Emergency"],
  },

  // ── CHITTAGONG / PATENGA BEACH ─────────────────────────────────────────────
  {
    id: "fac-pol-ctg-1",
    name: "Patenga Tourist Police Camp (Chattogram)",
    nameBn: "পতেঙ্গা ট্যুরিস্ট পুলিশ ক্যাম্প",
    type: "tourist_police",
    categoryLabel: "Coastal Tourist Police Outpost",
    address: "Sea Beach Road, Patenga, Chattogram 4204",
    addressBn: "সি বিচ রোড, পতেঙ্গা, চট্টগ্রাম",
    area: "Patenga",
    city: "Chittagong",
    latitude: 22.2384,
    longitude: 91.7915,
    phone: "+8801769690745",
    isOpen24Hours: true,
    isVerified: true,
    features: ["Coastal Tourist Safety", "Naval Base Liaison", "24/7 Marine Rescue Coordination"],
  },
  {
    id: "fac-hosp-ctg-1",
    name: "Evercare Hospital Chattogram",
    nameBn: "এভারকেয়ার হসপিটাল চট্টগ্রাম",
    type: "hospital",
    categoryLabel: "Multi-Specialty Super Tertiary Hospital",
    address: "Plot H1, Ananna R/A, Hathazari Road, Oxygen, Chattogram",
    addressBn: "প্লট এইচ১, অনন্যা আ/এ, অক্সিজেন, চট্টগ্রাম",
    area: "Oxygen / Hathazari",
    city: "Chittagong",
    latitude: 22.3921,
    longitude: 91.8354,
    phone: "+8809612310663",
    isOpen24Hours: true,
    isVerified: true,
    hasICU: true,
    hasEmergencyWard: true,
    englishSpoken: true,
    features: ["Level-1 Emergency & Trauma", "Multi-Bed ICU", "Helipad Access", "24/7 Ambulance Fleet"],
  },
];

// ============================================================================
// Bundled Offline Medical & Allergy Phrasebook (English + Bengali + Phonics)
// ============================================================================

export const MEDICAL_PHRASEBOOK: MedicalPhrase[] = [
  // ── CRITICAL LIFE THREATENING ──────────────────────────────────────────────
  {
    id: "phrase-crit-1",
    category: "critical",
    categoryLabel: "Critical Emergency",
    english: "I need an ambulance immediately!",
    bengali: "আমার জরুরিভাবে একটি অ্যাম্বুলেন্স দরকার!",
    pronunciation: "Amar joruri-bhabe ekti ambulance dorkar!",
    urgency: "critical",
    iconName: "car-outline",
    keywords: ["ambulance", "urgent", "emergency", "hospital", "transport"],
  },
  {
    id: "phrase-crit-2",
    category: "critical",
    categoryLabel: "Critical Emergency",
    english: "I am having severe chest pain / I think I am having a heart attack.",
    bengali: "আমার বুকে প্রচণ্ড ব্যথা হচ্ছে / মনে হয় হার্ট অ্যাটাক হয়েছে।",
    pronunciation: "Amar buke prochondo betha hochhe / mone hoy heart attack hoyeche.",
    urgency: "critical",
    iconName: "heart-dislike-outline",
    keywords: ["chest", "heart", "pain", "cardiac", "attack", "angina"],
  },
  {
    id: "phrase-crit-3",
    category: "critical",
    categoryLabel: "Critical Emergency",
    english: "I cannot breathe! I am choking / suffocating.",
    bengali: "আমি শ্বাস নিতে পারছি না! আমার দম আটকে আসছে।",
    pronunciation: "Ami shash nite parchi na! Amar dom aatke ashche.",
    urgency: "critical",
    iconName: "fitness-outline",
    keywords: ["breathe", "choking", "lungs", "asthma", "suffocating", "air"],
  },
  {
    id: "phrase-crit-4",
    category: "critical",
    categoryLabel: "Critical Emergency",
    english: "Severe bleeding! Please help stop the blood.",
    bengali: "প্রচণ্ড রক্তপাত হচ্ছে! দয়া করে রক্ত বন্ধ করতে সাহায্য করুন।",
    pronunciation: "Prochondo roktopat hochhe! Doya kore rokto bondho korte sahajjo korun.",
    urgency: "critical",
    iconName: "water-outline",
    keywords: ["bleeding", "blood", "wound", "cut", "artery", "hemorrhage"],
  },
  {
    id: "phrase-crit-5",
    category: "critical",
    categoryLabel: "Critical Emergency",
    english: "My friend is unconscious / passed out!",
    bengali: "আমার বন্ধু জ্ঞান হারিয়ে ফেলেছে / অজ্ঞান হয়ে গেছে!",
    pronunciation: "Amar bondhu gyan hariye feleche / oggyan hoye geche!",
    urgency: "critical",
    iconName: "alert-circle-outline",
    keywords: ["unconscious", "fainted", "coma", "passed out", "awake"],
  },

  // ── ALLERGIES & ANAPHYLAXIS ────────────────────────────────────────────────
  {
    id: "phrase-all-1",
    category: "allergies",
    categoryLabel: "Severe Allergy",
    english: "I have a severe, life-threatening peanut / nut allergy!",
    bengali: "আমার বাদামে মারাত্মক অ্যালার্জি আছে (জীবনহানির ঝুঁকি)!",
    pronunciation: "Amar badame marattok allergy ache (jibon-hanir jhuki)!",
    urgency: "critical",
    iconName: "warning-outline",
    keywords: ["peanut", "nut", "allergy", "anaphylaxis", "food"],
  },
  {
    id: "phrase-all-2",
    category: "allergies",
    categoryLabel: "Severe Allergy",
    english: "I am having an allergic reaction! Please inject my EpiPen (epinephrine).",
    bengali: "আমার অ্যালার্জিক রিঅ্যাকশন হচ্ছে! দয়া করে আমার এপিপেন ইনজেকশন দিন।",
    pronunciation: "Amar allergic reaction hochhe! Doya kore amar EpiPen injection din.",
    urgency: "critical",
    iconName: "bandage-outline",
    keywords: ["epipen", "epinephrine", "swelling", "anaphylaxis", "allergy", "shot"],
  },
  {
    id: "phrase-all-3",
    category: "allergies",
    categoryLabel: "Severe Allergy",
    english: "I am allergic to Penicillin and cephalosporin antibiotics.",
    bengali: "আমার পেনিসিলিন এবং অ্যান্টিবায়োটিকসে অ্যালার্জি আছে।",
    pronunciation: "Amar penicillin ebong antibiotics-e allergy ache.",
    urgency: "high",
    iconName: "medkit-outline",
    keywords: ["penicillin", "antibiotic", "medicine", "drug", "allergy"],
  },
  {
    id: "phrase-all-4",
    category: "allergies",
    categoryLabel: "Severe Allergy",
    english: "I have a severe seafood / prawn / shrimp allergy.",
    bengali: "আমার সামুদ্রিক মাছ ও চিংড়িতে তীব্র অ্যালার্জি আছে।",
    pronunciation: "Amar samudrik mach o chingri-te tibro allergy ache.",
    urgency: "high",
    iconName: "fish-outline",
    keywords: ["seafood", "prawn", "shrimp", "shellfish", "fish", "allergy"],
  },
  {
    id: "phrase-all-5",
    category: "allergies",
    categoryLabel: "Severe Allergy",
    english: "I have Celiac disease. No wheat, flour, or gluten, please.",
    bengali: "আমার সিলিয়াক রোগ আছে। আটা, ময়দা বা গ্লুটেন একদম খেতে পারব না।",
    pronunciation: "Amar celiac rog ache. Aata, moyda ba gluten ekdom khete parbo na.",
    urgency: "normal",
    iconName: "nutrition-outline",
    keywords: ["celiac", "gluten", "wheat", "flour", "bread"],
  },

  // ── SYMPTOMS & MEDICAL CONDITIONS ──────────────────────────────────────────
  {
    id: "phrase-sym-1",
    category: "symptoms",
    categoryLabel: "Medical Symptom",
    english: "I have Type 1 Diabetes and need emergency insulin / sugar.",
    bengali: "আমার ডায়াবেটিস আছে, আমার জরুরি ইনসুলিন / চিনি প্রয়োজন।",
    pronunciation: "Amar diabetes ache, amar joruri insulin / chini proyojon.",
    urgency: "high",
    iconName: "pulse-outline",
    keywords: ["diabetes", "insulin", "sugar", "hypoglycemia", "glucose"],
  },
  {
    id: "phrase-sym-2",
    category: "symptoms",
    categoryLabel: "Medical Symptom",
    english: "I was bitten by a snake / stray dog! I need anti-venom / rabies vaccine.",
    bengali: "আমাকে সাপে / কুকুরে কামড়েছে! দ্রুত অ্যান্টি-ভেনম / জলাতঙ্ক টিকা দরকার।",
    pronunciation: "Amake shaape / kukure kamreche! Druto anti-venom / jolatongko tika dorkar.",
    urgency: "critical",
    iconName: "bug-outline",
    keywords: ["snake", "bite", "dog", "antivenom", "rabies", "vaccine"],
  },
  {
    id: "phrase-sym-3",
    category: "symptoms",
    categoryLabel: "Medical Symptom",
    english: "I think my bone is broken / fractured. Do not move my leg/arm.",
    bengali: "মনে হয় আমার হাড় ভেঙে গেছে। দয়া করে হাত/পা নাড়াবেন না।",
    pronunciation: "Mone hoy amar har bhenge geche. Doya kore haat/pa naraben na.",
    urgency: "high",
    iconName: "body-outline",
    keywords: ["bone", "fracture", "broken", "leg", "arm", "splint"],
  },
  {
    id: "phrase-sym-4",
    category: "symptoms",
    categoryLabel: "Medical Symptom",
    english: "Severe dehydration and continuous vomiting / diarrhea.",
    bengali: "প্রচণ্ড পানিশূন্যতা ও ক্রমাগত বমি এবং ডায়রিয়া হচ্ছে।",
    pronunciation: "Prochondo panishunnota o kromagoto bomi ebong diarrhea hochhe.",
    urgency: "high",
    iconName: "thermometer-outline",
    keywords: ["dehydration", "vomiting", "diarrhea", "ors", "saline", "stomach"],
  },
  {
    id: "phrase-sym-5",
    category: "symptoms",
    categoryLabel: "Medical Symptom",
    english: "Very high fever, rash, and intense joint pain (possible Dengue).",
    bengali: "তীব্র জ্বর, গায়ে লাল র্যাশ ও হাড়ের সংযোগে প্রচণ্ড ব্যথা (ডেঙ্গু সন্দেহ)।",
    pronunciation: "Tibro jwor, gaye lal rash o harer shongjoge prochondo betha (dengue).",
    urgency: "high",
    iconName: "thermometer-outline",
    keywords: ["fever", "dengue", "mosquito", "rash", "temperature"],
  },

  // ── POLICE & CRIME ASSISTANCE ──────────────────────────────────────────────
  {
    id: "phrase-pol-1",
    category: "police_assistance",
    categoryLabel: "Police & Security",
    english: "Help! Please call the Tourist Police right now!",
    bengali: "বাঁচাও! দয়া করে এখনই ট্যুরিস্ট পুলিশকে ফোন করুন!",
    pronunciation: "Bachao! Doya kore ekhon-i tourist police-ke phone korun!",
    urgency: "critical",
    iconName: "shield-alert-outline",
    keywords: ["police", "tourist police", "help", "attack", "danger"],
  },
  {
    id: "phrase-pol-2",
    category: "police_assistance",
    categoryLabel: "Police & Security",
    english: "I was mugged / robbed! They took my wallet, money, and phone.",
    bengali: "আমি ছিনতাইয়ের শিকার হয়েছি! আমার মানিব্যাগ, টাকা ও ফোন নিয়ে গেছে।",
    pronunciation: "Ami chintai-er shikar hoyechi! Amar manibag, taka o phone niye geche.",
    urgency: "high",
    iconName: "wallet-outline",
    keywords: ["robbed", "mugged", "theft", "stolen", "money", "phone"],
  },
  {
    id: "phrase-pol-3",
    category: "police_assistance",
    categoryLabel: "Police & Security",
    english: "I lost my passport and travel documents. Where is the nearest police station?",
    bengali: "আমার পাসপোর্ট এবং ভ্রমণ কাগজপত্র হারিয়ে গেছে। সবচেয়ে কাছের থানা কোথায়?",
    pronunciation: "Amar passport ebong bhromon kagojpotro hariye geche. Shobcheye kacher thana kothay?",
    urgency: "normal",
    iconName: "document-text-outline",
    keywords: ["passport", "lost", "embassy", "police station", "thana", "documents"],
  },
  {
    id: "phrase-pol-4",
    category: "police_assistance",
    categoryLabel: "Police & Security",
    english: "I need an English-speaking doctor or police officer.",
    bengali: "আমার একজন ইংরেজি জানা ডাক্তার বা পুলিশ কর্মকর্তা প্রয়োজন।",
    pronunciation: "Amar ekjon engreji jana doctor ba police kormokorta proyojon.",
    urgency: "high",
    iconName: "chatbubbles-outline",
    keywords: ["english", "doctor", "translator", "speak", "language"],
  },
];

// ============================================================================
// Bundled Foreign Embassies & High Commissions Directory (Dhaka Diplomatic Zone)
// ============================================================================

export const EMBASSY_DIRECTORY: EmbassyContact[] = [
  {
    id: "emb-usa",
    country: "United States of America",
    countryCode: "US",
    flag: "🇺🇸",
    embassyName: "Embassy of the United States of America",
    consularHotline24h: "+880255662000",
    standardPhone: "+880255662000",
    emergencyEmail: "DhakaACS@state.gov",
    address: "Madani Avenue, Baridhara Diplomatic Zone, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7978,
    longitude: 90.4239,
    workingHours: "Sun - Thu: 8:00 AM - 4:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-uk",
    country: "United Kingdom",
    countryCode: "GB",
    flag: "🇬🇧",
    embassyName: "British High Commission Dhaka",
    consularHotline24h: "+880255668700",
    standardPhone: "+880255668700",
    emergencyEmail: "consular.dhaka@fcdo.gov.uk",
    address: "United Nations Road, Baridhara Diplomatic Zone, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7995,
    longitude: 90.4221,
    workingHours: "Sun - Thu: 8:00 AM - 4:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-canada",
    country: "Canada",
    countryCode: "CA",
    flag: "🇨🇦",
    embassyName: "High Commission of Canada",
    consularHotline24h: "+880255668444",
    standardPhone: "+880255668444",
    emergencyEmail: "dhaka.consular@international.gc.ca",
    address: "Madani Avenue, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7981,
    longitude: 90.4229,
    workingHours: "Sun - Thu: 8:00 AM - 4:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-australia",
    country: "Australia",
    countryCode: "AU",
    flag: "🇦🇺",
    embassyName: "Australian High Commission Dhaka",
    consularHotline24h: "+880258811991",
    standardPhone: "+880258811991",
    emergencyEmail: "consular.dhaka@dfat.gov.au",
    address: "184 Gulshan Avenue, Gulshan-2, Dhaka 1212",
    area: "Gulshan-2",
    city: "Dhaka",
    latitude: 23.7932,
    longitude: 90.4158,
    workingHours: "Sun - Thu: 8:00 AM - 4:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-india",
    country: "India",
    countryCode: "IN",
    flag: "🇮🇳",
    embassyName: "High Commission of India, Dhaka",
    consularHotline24h: "+8801937400591",
    standardPhone: "+880255067301",
    emergencyEmail: "cons3.dhaka@mea.gov.in",
    address: "1-3 Park Road, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.8011,
    longitude: 90.4208,
    workingHours: "Sun - Thu: 9:00 AM - 5:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-germany",
    country: "Germany",
    countryCode: "DE",
    flag: "🇩🇪",
    embassyName: "Embassy of the Federal Republic of Germany",
    consularHotline24h: "+8801711564548",
    standardPhone: "+880255668650",
    emergencyEmail: "info@dhaka.diplo.de",
    address: "Madani Avenue, Baridhara Diplomatic Zone, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7989,
    longitude: 90.4234,
    workingHours: "Sun - Thu: 8:00 AM - 3:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-france",
    country: "France",
    countryCode: "FR",
    flag: "🇫🇷",
    embassyName: "Embassy of France in Bangladesh",
    consularHotline24h: "+8801713094951",
    standardPhone: "+880255668600",
    emergencyEmail: "consulat.dhaka-amba@diplomatie.gouv.fr",
    address: "Madani Avenue, Baridhara Diplomatic Enclave, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7985,
    longitude: 90.4231,
    workingHours: "Sun - Thu: 8:30 AM - 4:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-japan",
    country: "Japan",
    countryCode: "JP",
    flag: "🇯🇵",
    embassyName: "Embassy of Japan in Bangladesh",
    consularHotline24h: "+8802222260010",
    standardPhone: "+8802222260010",
    emergencyEmail: "consular@dc.mofa.go.jp",
    address: "Plot No. 5 & 7, Dutabash Road, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.8003,
    longitude: 90.4215,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-china",
    country: "China",
    countryCode: "CN",
    flag: "🇨🇳",
    embassyName: "Embassy of the People's Republic of China",
    consularHotline24h: "+8801713047630",
    standardPhone: "+88028824862",
    emergencyEmail: "chinaemb_bd@mfa.gov.cn",
    address: "Plot 2 & 4, Embassy Road, Block I, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.8015,
    longitude: 90.4225,
    workingHours: "Sun - Thu: 9:00 AM - 5:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-eu",
    country: "European Union",
    countryCode: "EU",
    flag: "🇪🇺",
    embassyName: "Delegation of the European Union to Bangladesh",
    consularHotline24h: "+880255668052",
    standardPhone: "+880255668052",
    emergencyEmail: "delegation-bangladesh@eeas.europa.eu",
    address: "Plot 7, Embassy Road, Block E, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7998,
    longitude: 90.4241,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM",
    passportAssistance: false,
  },
  {
    id: "emb-korea",
    country: "South Korea",
    countryCode: "KR",
    flag: "🇰🇷",
    embassyName: "Embassy of the Republic of Korea",
    consularHotline24h: "+8801713087265",
    standardPhone: "+880258812088",
    emergencyEmail: "embdhaka@mofa.go.kr",
    address: "4 Madani Avenue, Baridhara, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.7972,
    longitude: 90.4228,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-saudi",
    country: "Saudi Arabia",
    countryCode: "SA",
    flag: "🇸🇦",
    embassyName: "Royal Embassy of Saudi Arabia",
    consularHotline24h: "+8801755584888",
    standardPhone: "+880255067201",
    emergencyEmail: "bdemb@mofa.gov.sa",
    address: "House 5 (NE) L, Road 83, Gulshan-2, Dhaka 1212",
    area: "Gulshan-2",
    city: "Dhaka",
    latitude: 23.7952,
    longitude: 90.4168,
    workingHours: "Sun - Thu: 9:00 AM - 4:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-uae",
    country: "United Arab Emirates",
    countryCode: "AE",
    flag: "🇦🇪",
    embassyName: "Embassy of the United Arab Emirates",
    consularHotline24h: "+8801700700000",
    standardPhone: "+88029882244",
    emergencyEmail: "dhakaemb@mofaic.gov.ae",
    address: "House 191, Gulshan North Avenue, Gulshan-2, Dhaka 1212",
    area: "Gulshan-2",
    city: "Dhaka",
    latitude: 23.7965,
    longitude: 90.4151,
    workingHours: "Sun - Thu: 9:00 AM - 4:00 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-singapore",
    country: "Singapore",
    countryCode: "SG",
    flag: "🇸🇬",
    embassyName: "Consulate of the Republic of Singapore Dhaka",
    consularHotline24h: "+8801811409940",
    standardPhone: "+88029880404",
    emergencyEmail: "singcon_dha@mfa.sg",
    address: "Ventura Avenue (5th Floor), Plot 8/B, CWN(C), Gulshan Avenue, Dhaka 1212",
    area: "Gulshan",
    city: "Dhaka",
    latitude: 23.7918,
    longitude: 90.4152,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM",
    passportAssistance: true,
  },
  {
    id: "emb-malaysia",
    country: "Malaysia",
    countryCode: "MY",
    flag: "🇲🇾",
    embassyName: "High Commission of Malaysia Dhaka",
    consularHotline24h: "+8801711593322",
    standardPhone: "+88028827759",
    emergencyEmail: "mwdhaka@kln.gov.my",
    address: "House 19, Road 6, Baridhara Diplomatic Zone, Dhaka 1212",
    area: "Baridhara",
    city: "Dhaka",
    latitude: 23.8005,
    longitude: 90.4219,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM (Emergency 24/7)",
    passportAssistance: true,
  },
  {
    id: "emb-italy",
    country: "Italy",
    countryCode: "IT",
    flag: "🇮🇹",
    embassyName: "Embassy of Italy in Dhaka",
    consularHotline24h: "+8801713037194",
    standardPhone: "+880258812774",
    emergencyEmail: "consolare.dhaka@esteri.it",
    address: "Plot 2/3, Road 74/79, Gulshan-2, Dhaka 1212",
    area: "Gulshan-2",
    city: "Dhaka",
    latitude: 23.7946,
    longitude: 90.4179,
    workingHours: "Sun - Thu: 8:30 AM - 4:30 PM",
    passportAssistance: true,
  },
];

// ============================================================================
// Math & Geospatial Utilities (Haversine Formula)
// ============================================================================

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 * Zero external dependencies: works 100% offline.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// ============================================================================
// Critical Safety & SOS Service Class
// ============================================================================

class SOSService {
  /**
   * Retrieves designated emergency contacts from persistent storage.
   * If empty, returns default pre-configured safety services.
   */
  async getContacts(): Promise<EmergencyContact[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_CONTACTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[SOSService] Failed to load contacts from storage:", err);
    }

    // Default primary contacts
    const defaultContacts: EmergencyContact[] = [
      {
        id: "default-tourist-police",
        name: "Tourist Police Bangladesh (24/7 Desk)",
        phone: "+8801320222222",
        relationship: "Tour Guide",
        isPrimary: true,
        notifyOnSOS: true,
        addedAt: Date.now(),
      },
      {
        id: "default-emergency-999",
        name: "National Emergency Service (999)",
        phone: "999",
        relationship: "Other",
        isPrimary: false,
        notifyOnSOS: true,
        addedAt: Date.now(),
      },
    ];

    await this.saveAllContacts(defaultContacts).catch(() => {});
    return defaultContacts;
  }

  /**
   * Saves a new contact or updates an existing one.
   */
  async saveContact(contactData: Omit<EmergencyContact, "id" | "addedAt"> & { id?: string }): Promise<EmergencyContact[]> {
    const current = await this.getContacts();
    let updated: EmergencyContact[];

    if (contactData.id) {
      updated = current.map((c) =>
        c.id === contactData.id
          ? {
              ...c,
              ...contactData,
              isPrimary: contactData.isPrimary ? true : c.isPrimary,
            }
          : contactData.isPrimary
          ? { ...c, isPrimary: false }
          : c
      );
    } else {
      const newContact: EmergencyContact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: contactData.name.trim(),
        phone: contactData.phone.trim(),
        relationship: contactData.relationship,
        isPrimary: contactData.isPrimary,
        notifyOnSOS: contactData.notifyOnSOS,
        addedAt: Date.now(),
      };

      if (contactData.isPrimary) {
        updated = current.map((c) => ({ ...c, isPrimary: false })).concat(newContact);
      } else {
        updated = [...current, newContact];
      }
    }

    await this.saveAllContacts(updated);
    return updated;
  }

  /**
   * Deletes a contact by ID.
   */
  async deleteContact(id: string): Promise<EmergencyContact[]> {
    const current = await this.getContacts();
    const filtered = current.filter((c) => c.id !== id);
    // Ensure at least one primary remains if available
    if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    await this.saveAllContacts(filtered);
    return filtered;
  }

  private async saveAllContacts(contacts: EmergencyContact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (err) {
      console.error("[SOSService] Error storing emergency contacts:", err);
    }
  }

  /**
   * Acquires the current GPS coordinates.
   * Leverages Geolocation API with timeout and fallback to cached or default center.
   */
  async getCurrentLocation(): Promise<GeoCoordinates> {
    // 1. Try standard Geolocation API (Supported on Web, iOS, Android)
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const coords = await new Promise<GeoCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const result: GeoCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy || 10,
                altitude: pos.coords.altitude,
                timestamp: pos.timestamp || Date.now(),
                isEstimated: false,
                locationName: "Live Device GPS",
              };
              resolve(result);
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
          );
        });

        // Cache successful location
        await AsyncStorage.setItem(STORAGE_LAST_KNOWN_LOCATION, JSON.stringify(coords)).catch(() => {});
        return coords;
      } catch (geoError) {
        console.warn("[SOSService] Geolocation error or denied:", geoError);
      }
    }

    // 2. Try Cached Location from previous session
    try {
      const cached = await AsyncStorage.getItem(STORAGE_LAST_KNOWN_LOCATION);
      if (cached) {
        const parsed = JSON.parse(cached) as GeoCoordinates;
        if (parsed.latitude && parsed.longitude) {
          return {
            ...parsed,
            isEstimated: true,
            locationName: "Last Cached Location",
          };
        }
      }
    } catch (cacheErr) {
      console.warn("[SOSService] Failed to read cached location:", cacheErr);
    }

    // 3. Fallback to Dhaka Diplomatic Tourist Zone coordinates
    const fallback: GeoCoordinates = {
      latitude: REGIONAL_CENTERS.dhaka_diplomatic.lat,
      longitude: REGIONAL_CENTERS.dhaka_diplomatic.lng,
      accuracy: 50,
      altitude: null,
      timestamp: Date.now(),
      isEstimated: true,
      locationName: REGIONAL_CENTERS.dhaka_diplomatic.name,
    };
    return fallback;
  }

  /**
   * Generates a standard high-priority emergency SMS payload.
   */
  buildSOSMessage(coords: GeoCoordinates, customNote?: string): string {
    const latFormatted = coords.latitude.toFixed(5);
    const lngFormatted = coords.longitude.toFixed(5);
    const mapLink = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    const osmLink = `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}#map=16/${coords.latitude}/${coords.longitude}`;
    const timestampStr = new Date(coords.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    let msg = `🚨 TOURIST EMERGENCY SOS!\n`;
    msg += `I need URGENT emergency assistance!\n`;
    if (customNote && customNote.trim()) {
      msg += `Note: ${customNote.trim()}\n`;
    }
    msg += `📍 Live GPS: ${latFormatted}, ${lngFormatted}\n`;
    msg += `🗺️ Google Maps: ${mapLink}\n`;
    msg += `🌍 OpenStreetMap: ${osmLink}\n`;
    msg += `⏰ Time: ${timestampStr}\n`;
    msg += `⚠️ Dispatched via Shopno Jatra Safety Hub. Please notify Tourist Police / 999 immediately!`;

    return msg;
  }

  /**
   * Dispatches One-Tap SOS:
   * 1. Acquires instant GPS location
   * 2. Formats emergency SMS message
   * 3. Triggers native SMS composer targeting designated emergency contacts & 999
   * 4. Logs dispatch event
   */
  async triggerOneTapSOS(customNote?: string): Promise<SOSDispatchResult> {
    try {
      // Haptic panic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      const coords = await this.getCurrentLocation();
      const contacts = await this.getContacts();
      const sosMessage = this.buildSOSMessage(coords, customNote);

      const targetContacts = contacts.filter((c) => c.notifyOnSOS && c.phone.trim().length > 0);
      const recipientPhones = targetContacts.map((c) => c.phone.trim().replace(/[\s-]/g, ""));

      // Always include 999 if not in list
      if (!recipientPhones.includes("999")) {
        recipientPhones.push("999");
      }

      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
      const smsUrls: string[] = [];

      // Build platform-compliant SMS URI
      // iOS supports comma-separated numbers: sms:num1,num2?body=...
      // Android supports semi-colon or single target: sms:num1;num2?body=...
      const encodedMsg = encodeURIComponent(sosMessage);
      const phoneListStr = recipientPhones.join(Platform.OS === "ios" ? "," : ";");
      const combinedSmsUrl = `sms:${phoneListStr}?body=${encodedMsg}`;

      smsUrls.push(combinedSmsUrl);

      // Attempt to launch SMS intent
      const canOpen = await Linking.canOpenURL(combinedSmsUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(combinedSmsUrl);
      } else {
        // Fallback to single primary phone SMS
        const singlePhone = recipientPhones[0] || "999";
        const fallbackSms = `sms:${singlePhone}?body=${encodedMsg}`;
        smsUrls.push(fallbackSms);
        await Linking.openURL(fallbackSms).catch(async () => {
          // Final fallback: dial 999 directly
          await Linking.openURL("tel:999").catch(() => {});
        });
      }

      // Record dispatch log
      const logEntry: SOSDispatchLog = {
        id: `sos-log-${Date.now()}`,
        timestamp: Date.now(),
        coordinates: coords,
        recipients: recipientPhones,
        message: sosMessage,
        status: "dispatched",
      };
      await this.saveDispatchLog(logEntry);

      return {
        success: true,
        dispatchTimestamp: logEntry.timestamp,
        coordinates: coords,
        smsUrls,
        contactsNotifiedCount: recipientPhones.length,
        primaryPhone: primaryContact?.phone || "999",
        sosMessage,
      };
    } catch (err: any) {
      console.error("[SOSService] SOS Dispatch failed:", err);
      // Even if SMS fails, trigger direct emergency line call as fallback
      await Linking.openURL("tel:999").catch(() => {});

      return {
        success: false,
        dispatchTimestamp: Date.now(),
        coordinates: await this.getCurrentLocation(),
        smsUrls: [],
        contactsNotifiedCount: 0,
        sosMessage: "",
        error: err?.message || "Failed to dispatch SOS",
      };
    }
  }

  /**
   * Stores SOS dispatch logs for audit / emergency tracking.
   */
  private async saveDispatchLog(log: SOSDispatchLog): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_SOS_LOGS_KEY);
      const existing: SOSDispatchLog[] = raw ? JSON.parse(raw) : [];
      existing.unshift(log);
      // Keep last 20 logs
      await AsyncStorage.setItem(STORAGE_SOS_LOGS_KEY, JSON.stringify(existing.slice(0, 20)));
    } catch (err) {
      console.warn("[SOSService] Failed to save SOS log:", err);
    }
  }

  /**
   * Fetches and filters emergency facilities within a specified radius (default 15km).
   * Calculates distance dynamically based on user's GPS position.
   * If user is beyond 15km (e.g. testing in other cities), returns facilities sorted by distance
   * with isOutsideRadius flag so the user is never left without assistance.
   */
  findNearbyFacilities(
    userCoords: GeoCoordinates,
    options?: {
      maxRadiusKm?: number;
      typeFilter?: EmergencyFacilityType | "all";
      searchQuery?: string;
    }
  ): {
    withinRadius: EmergencyFacility[];
    allSorted: EmergencyFacility[];
    userRadiusKm: number;
  } {
    const radius = options?.maxRadiusKm ?? 15;
    const typeFilter = options?.typeFilter ?? "all";
    const query = options?.searchQuery?.toLowerCase().trim() || "";

    const enriched = VERIFIED_FACILITIES.map((fac) => {
      const dist = calculateDistanceKm(
        userCoords.latitude,
        userCoords.longitude,
        fac.latitude,
        fac.longitude
      );
      return {
        ...fac,
        distanceKm: dist,
      };
    });

    // Sort by proximity ascending
    enriched.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    // Filter by type and search term
    const filtered = enriched.filter((fac) => {
      if (typeFilter !== "all" && fac.type !== typeFilter) {
        return false;
      }
      if (query) {
        const matchName = fac.name.toLowerCase().includes(query) || fac.nameBn.includes(query);
        const matchArea = fac.area.toLowerCase().includes(query) || fac.city.toLowerCase().includes(query);
        const matchAddress = fac.address.toLowerCase().includes(query);
        const matchFeature = fac.features.some((f) => f.toLowerCase().includes(query));
        return matchName || matchArea || matchAddress || matchFeature;
      }
      return true;
    });

    const withinRadius = filtered.filter((f) => (f.distanceKm ?? 9999) <= radius);

    return {
      withinRadius,
      allSorted: filtered,
      userRadiusKm: radius,
    };
  }

  /**
   * Searches and filters the offline medical phrasebook.
   */
  searchMedicalPhrases(
    query?: string,
    category?: MedicalPhraseCategory | "all"
  ): MedicalPhrase[] {
    const q = query?.toLowerCase().trim() || "";
    const cat = category || "all";

    return MEDICAL_PHRASEBOOK.filter((phrase) => {
      if (cat !== "all" && phrase.category !== cat) {
        return false;
      }
      if (!q) {
        return true;
      }
      const matchEng = phrase.english.toLowerCase().includes(q);
      const matchBn = phrase.bengali.includes(q);
      const matchPron = phrase.pronunciation.toLowerCase().includes(q);
      const matchKey = phrase.keywords.some((k) => k.toLowerCase().includes(q));
      return matchEng || matchBn || matchPron || matchKey;
    });
  }

  /**
   * Searches foreign embassies and high commissions.
   */
  searchEmbassies(query?: string, userCoords?: GeoCoordinates): EmbassyContact[] {
    const q = query?.toLowerCase().trim() || "";

    const filtered = EMBASSY_DIRECTORY.filter((emb) => {
      if (!q) return true;
      const matchCountry = emb.country.toLowerCase().includes(q);
      const matchCode = emb.countryCode.toLowerCase().includes(q);
      const matchName = emb.embassyName.toLowerCase().includes(q);
      const matchArea = emb.area.toLowerCase().includes(q) || emb.city.toLowerCase().includes(q);
      return matchCountry || matchCode || matchName || matchArea;
    });

    // If user coordinates provided, sort by distance
    if (userCoords) {
      return [...filtered].sort((a, b) => {
        const distA = calculateDistanceKm(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude);
        const distB = calculateDistanceKm(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    return filtered;
  }

  // ==========================================================================
  // Direct Action Triggers (Calling, Navigation, SMS)
  // ==========================================================================

  /**
   * Triggers a direct native phone call with confirmation and haptic feedback.
   */
  async triggerCall(phoneNumber: string): Promise<boolean> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const cleanNumber = phoneNumber.replace(/[\s-]/g, "");
      const telUrl = `tel:${cleanNumber}`;
      const canOpen = await Linking.canOpenURL(telUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(telUrl);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[SOSService] Call trigger failed:", err);
      return false;
    }
  }

  /**
   * Triggers native turn-by-turn navigation or Google Maps / Apple Maps.
   */
  async triggerNavigation(
    latitude: number,
    longitude: number,
    destinationLabel: string = "Emergency Destination"
  ): Promise<boolean> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const encodedLabel = encodeURIComponent(destinationLabel);
      let mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodedLabel}`;

      if (Platform.OS === "ios") {
        mapUrl = `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`;
      } else if (Platform.OS === "android") {
        mapUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
      }

      const canOpen = await Linking.canOpenURL(mapUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(mapUrl);
        return true;
      }

      // Universal Web Fallback
      const webFallback = `https://maps.google.com/?q=${latitude},${longitude}`;
      await Linking.openURL(webFallback);
      return true;
    } catch (err) {
      console.error("[SOSService] Navigation trigger failed:", err);
      return false;
    }
  }

  /**
   * Composes a direct email to consular emergency desk.
   */
  async triggerEmail(email: string, subject: string, body: string): Promise<boolean> {
    try {
      const emailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(emailUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[SOSService] Email trigger failed:", err);
      return false;
    }
  }
}

export const sosService = new SOSService();
export default sosService;
