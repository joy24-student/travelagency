import { AppImage } from "../../src/components/ui/AppImage";
import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LocalProduct } from "../../src/types/localMarketplace";
import { localMarketplaceService } from "../../src/services/localMarketplaceService";
import { ErrorStateCard, EmptyStateView } from "../../src/components/common";

import { useResponsive } from "../../src/hooks/useResponsive";

// Palette
const THEME_PRIMARY = "#78350F"; // Amber-900 / Warm Terracotta
const THEME_ACCENT = "#D97706"; // Amber-600 Honey
const THEME_GOLD = "#F59E0B";
const THEME_EMERALD = "#059669";
const THEME_DARK = "#0F172A";

// Regional Origin Filters
const REGION_FILTERS = [
  { id: "All", label: "সব অঞ্চল", icon: "earth" },
  { id: "নারায়ণগঞ্জ", label: "নারায়ণগঞ্জ (Jamdani)", icon: "ribbon-outline" },
  { id: "সুন্দরবন", label: "সুন্দরবন (Honey)", icon: "leaf-outline" },
  { id: "জামালপুর", label: "জামালপুর (Nakshi Kantha)", icon: "flower-outline" },
  { id: "রাজশাহী", label: "রাজশাহী (Silk)", icon: "sparkles-outline" },
  { id: "টাঙ্গাইল", label: "টাঙ্গাইল (Handloom)", icon: "shirt-outline" },
  { id: "সিলেট", label: "সিলেট (Tea)", icon: "cafe-outline" },
  { id: "বগুড়া", label: "বগুড়া (Doi)", icon: "nutrition-outline" },
  { id: "কক্সবাজার", label: "কক্সবাজার (Shutki)", icon: "fish-outline" },
  { id: "নাটোর", label: "নাটোর (Kanchagolla)", icon: "restaurant-outline" },
];

const CATEGORY_TABS = [
  { id: "all", label: "সব পণ্য" },
  { id: "handicraft", label: "হস্তশিল্প ও নকশিকাঁথা" },
  { id: "clothing", label: "ঐতিহ্যবাহী বস্ত্র ও সিল্ক" },
  { id: "tea_honey", label: "সুন্দরবনের মধু ও চা" },
  { id: "food", label: "আঞ্চলিক মুখরোচক খাবার" },
];

// Rich Artisan, Dimension, Certificate, and Review Interfaces
export interface ArtisanProfile {
  name: string;
  banglaName: string;
  role: string;
  experienceYears: number;
  location: string;
  avatar: string;
  story: string;
  cooperative: string;
  contactPhone: string;
  award?: string;
}

export interface MaterialCertificate {
  id: string;
  name: string;
  issuer: string;
  code: string;
  badgeType: "gi" | "bsti" | "handloom" | "forest";
}

export interface ProductDimensions {
  dimensions: string;
  weightGrams: number;
  weightFormatted: string;
  materials: string;
  craftMethod: string;
  packaging: string;
}

export interface CustomerReviewItem {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  verifiedBuyer: boolean;
}

export interface VendorPayoutMeta {
  merchantName: string;
  merchantAccount: string;
  cooperativeGuild: string;
  artisanSharePct: number;
  paymentGatewayNotice: string;
}

export interface EnrichedProduct extends LocalProduct {
  giTag: string;
  giCertified: boolean;
  giCode: string;
  weightKg: number;
  galleryImages: string[];
  dimensionsMeta: ProductDimensions;
  artisan: ArtisanProfile;
  certificates: MaterialCertificate[];
  customerReviews: CustomerReviewItem[];
  vendorPayout: VendorPayoutMeta;
}

export interface CartItem {
  product: EnrichedProduct;
  quantity: number;
}

// Curated Showcase Enrichments for Regional & GI Products
const CURATED_GI_METADATA: Record<string, Partial<EnrichedProduct>> = {
  // 1. Narayanganj Jamdani Saree
  "prod-jamdani-narayanganj": {
    id: "prod-jamdani-narayanganj",
    name: "Traditional Dhakai Jamdani Handloom Saree",
    bangla_name: "নারায়ণগঞ্জের ঐতিহ্যবাহী জামদানি শাড়ি",
    region: "নারায়ণগঞ্জ",
    category: "handicraft",
    price: 4850,
    original_price: 5600,
    weight_or_unit: "১২ হাত শাড়ি (৮৪ কাউন্ট সুতি)",
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900",
    rating: 4.98,
    reviews_count: 312,
    seller_name: "রূপগঞ্জ জামদানি তাঁতী কারিগর সমিতি",
    seller_phone: "+8801711884422",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 14,
    description: "শীতলক্ষ্যা নদীর অববাহিকায় নারায়ণগঞ্জের রূপগঞ্জের উস্তাদ তাঁতিদের হাতে বোনা জিআই সনদপ্রাপ্ত আসল ঢাকাই জামদানি। খাঁটি ৮৪ কাউন্ট সুতি সুতায় হাতে বোনা মনোরম পান্না হাজার ও ময়ূরপঙ্খী নকশা।",
    features: [
      "১০০% জিআই সনদপ্রাপ্ত ঢাকাই জামদানি (GI-01)",
      "হাতে টানা পিটলুম কারিগরি",
      "৮৪ কাউন্ট প্রিমিয়াম সুতি সুতা",
      "বাংলাদেশ তাঁত বোর্ড প্রত্যয়িত",
    ],
    giTag: "GI Certified: BD-01 • Narayanganj",
    giCertified: true,
    giCode: "BD-GI-01/NRG",
    weightKg: 0.45,
    galleryImages: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900",
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=900",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900",
    ],
    dimensionsMeta: {
      dimensions: "৫.৫ মিটার দৈর্ঘ্য × ১.২ মিটার প্রস্থ (১২ হাত রানিং ব্লাউজ পিসসহ)",
      weightGrams: 450,
      weightFormatted: "৪৫০ গ্রাম (হালকা ও অত্যন্ত আরামদায়ক)",
      materials: "১০০% খাঁটি প্রাকৃতিক অর্গানিক সুতি ও সোনালী জরি",
      craftMethod: "বংশানুক্রমিক কাঠের পিটলুমে নন-কন্টিনিউয়াস ওয়েফট টেকনিক",
      packaging: "হস্তশিল্পীদের খাঁটি কাঠের গিফট বক্সে সুরক্ষিত সিলসহ",
    },
    artisan: {
      name: "Ustad Al-Amin Mia",
      banglaName: "উস্তাদ আল-আমিন মিয়া",
      role: "৪র্থ প্রজন্মের মাস্টার জামদানি কারিগর",
      experienceYears: 32,
      location: "তারাবো, রূপগঞ্জ, নারায়ণগঞ্জ",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      story: "উস্তাদ আল-আমিনের পরিবার গত ১২০ বছর ধরে শীতলক্ষ্যার তীরে খাঁটি ঢাকাই জামদানি বুনন শিল্প বাঁচিয়ে রেখেছেন। একটি শাড়ি সমাপ্ত করতে তাঁতি ও সহকারীর একটানা ৩ থেকে ৪ সপ্তাহ সময় লাগে।",
      cooperative: "রূপগঞ্জ জামদানি কারিগর কল্যাণ সমবায় সমিতি",
      contactPhone: "+8801711884422",
      award: "জাতীয় কারুশিল্প রৌপ্য পদকপ্রাপ্ত ২০২১",
    },
    certificates: [
      {
        id: "cert-gi-1",
        name: "ভৌগোলিক নির্দেশক (GI) সনদপত্র",
        issuer: "ডিপার্টমেন্ট অব পেটেন্টস, ডিজাইনস অ্যান্ড ট্রেডমার্কস (DPDT)",
        code: "GI-REG-BD-001/NRG",
        badgeType: "gi",
      },
      {
        id: "cert-hl-1",
        name: "খাঁটি তাঁতশিল্প প্রমাণীকরণ সনদ",
        issuer: "বাংলাদেশ তাঁত বোর্ড (BHB)",
        code: "BHB-JAM-8842",
        badgeType: "handloom",
      },
    ],
    customerReviews: [
      {
        id: "rev-j-1",
        author: "নুসরাত জাহান",
        location: "ধানমন্ডি, ঢাকা",
        rating: 5,
        date: "৩ দিন আগে",
        comment: "শাড়িটি হাতে পেয়ে মুগ্ধ হয়ে গেলাম! বুনন এতটাই নিখুঁত এবং ওজনে হালকা। প্যাকেজিংয়ের সাথে কারিগরের পরিচয়পত্র পেয়ে আরও ভালো লাগলো।",
        verifiedBuyer: true,
      },
      {
        id: "rev-j-2",
        author: "সামিরা ফারহানা",
        location: "গুলশান, ঢাকা",
        rating: 5,
        date: "১ সপ্তাহ আগে",
        comment: "আসল নারায়ণগঞ্জের জামদানি চেনা যায় এর মোলায়েম ফিনিশিং দেখে। খাঁটি জিনিস সরবরাহ করার জন্য ধন্যবাদ।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Rupganj Jamdani Guild",
      merchantAccount: "bKash Merchant #01711884422",
      cooperativeGuild: "রূপগঞ্জ জামদানি তাঁতী কল্যাণ ট্রাস্ট",
      artisanSharePct: 92,
      paymentGatewayNotice: "এই অর্ডারের ৯২% অর্থ সরাসরি স্থানীয় তাঁতি পরিবারে পৌঁছে যায়।",
    },
  },

  // 2. Sundarbans Khulna Honey
  "prod-honey-1": {
    giTag: "GI Certified: BD-04 • Sundarbans (Khulna)",
    giCertified: true,
    giCode: "BD-GI-04/SDN",
    weightKg: 1.25, // with glass jar
    galleryImages: [
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=900",
      "https://images.unsplash.com/photo-1471943311424-646960669fbc?w=900",
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=900",
    ],
    dimensionsMeta: {
      dimensions: "১৫ সেমি উচ্চতা × ৮ সেমি ব্যাস (১ কেজি নেট মধু)",
      weightGrams: 1250,
      weightFormatted: "১.২৫ কেজি (১ কেজি খাঁটি মধু + ফুড গ্রেড কাঁচের জার)",
      materials: "১০০% সুন্দরবনের খলিশা ও গরান ফুলের খাঁটি বুনো মধু",
      craftMethod: "বন বিভাগের অনুমতিতে মৌয়ালদের দ্বারা হস্তচালিত প্রাকৃতিক মধু সংগ্রহ",
      packaging: "বায়ুরোধী লিকপ্রুফ এয়ার-টাইট কাঁচের জার ও থার্মোকল প্রটেকশন",
    },
    artisan: {
      name: "Mohammad Ismail Mouyal",
      banglaName: "মোঃ ইসমাইল মৌয়াল",
      role: "দলনেতা, সুন্দরবন মৌয়াল সমিতি",
      experienceYears: 24,
      location: "মোংলা, সুন্দরবন পূর্ব বন বিভাগ, খুলনা",
      avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=300",
      story: "প্রতি বছর বৈশাখ ও জ্যৈষ্ঠ মাসে সুন্দরবনের গভীরে বাঘ ও কুমিরের ভয় উপেক্ষা করে মৌচাক খুঁজে বের করে খাঁটি মধু আহরণ করেন ইসমাইল ও তাঁর সহকর্মীরা। কোনো হিটিং বা ভেজাল ছাড়া কাঁচা মধু সরাসরি ছাঁকা হয়।",
      cooperative: "মোংলা মৌয়াল সমবায় সমিতি লিঃ",
      contactPhone: "+8801711224466",
      award: "বন বিভাগ প্রশংসাপত্র ও পরিবেশ সুরক্ষা সম্মাননা",
    },
    certificates: [
      {
        id: "cert-gi-2",
        name: "সুন্দরবন প্রাকৃতিক মধু জিআই নিবন্ধন",
        issuer: "বাংলাদেশ ভৌগোলিক নির্দেশক কর্তৃপক্ষ (DPDT)",
        code: "GI-REG-BD-004/SDN",
        badgeType: "gi",
      },
      {
        id: "cert-bsti-1",
        name: "বিএসটিআই মান সনদ (BSTI Certification)",
        issuer: "বাংলাদেশ স্ট্যান্ডার্ডস অ্যান্ড টেস্টিং ইনস্টিটিউশন",
        code: "BSTI-HON-2026-99",
        badgeType: "bsti",
      },
      {
        id: "cert-fd-1",
        name: "সুন্দরবন বন অধিদপ্তর আহরণ লাইসেন্স",
        issuer: "খুলনা সার্কেল বন বিভাগ",
        code: "FD-PERMIT-409/2026",
        badgeType: "forest",
      },
    ],
    customerReviews: [
      {
        id: "rev-h-1",
        author: "ড. শফিকুর রহমান",
        location: "উত্তরা, ঢাকা",
        rating: 5,
        date: "২ দিন আগে",
        comment: "ল্যাব টেস্টেড খাঁটি সুন্দরবনের মধু। হালকা টক-মিষ্টি বুনো সুগন্ধ প্রমাণ করে এটি একদম অরিজিনাল। কাঁচের বোতল হওয়া সত্ত্বেও প্যাকেজিং চমৎকার ছিল।",
        verifiedBuyer: true,
      },
      {
        id: "rev-h-2",
        author: "মাহমুদা আক্তার",
        location: "খুলনা সদর",
        rating: 5,
        date: "৫ দিন আগে",
        comment: "আমাদের সুন্দরবনের খাঁটি মধু এভাবে সরাসরি হোম ডেলিভারিতে পাওয়া সৌভাগ্যের বিষয়।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Mongla Mouyal Somobay",
      merchantAccount: "Nagad Merchant #01711224466",
      cooperativeGuild: "সুন্দরবন মৌয়াল সমবায় সমিতি",
      artisanSharePct: 90,
      paymentGatewayNotice: "মৌয়ালদের জীবনঝুঁকির সঠিক মূল্যায়ন নিশ্চিত করতে বিক্রির ৯০% সরাসরি সমবায়ে জমা হয়।",
    },
  },

  // 3. Jamalpur Nakshi Kantha
  "prod-nakshi-kantha-jamalpur": {
    id: "prod-nakshi-kantha-jamalpur",
    name: "Heritage Jamalpur Hand-Embroidered Nakshi Kantha",
    bangla_name: "জামালপুরের ঐতিহ্যবাহী হাতে সেলাই নকশিকাঁথা",
    region: "জামালপুর",
    category: "handicraft",
    price: 3400,
    original_price: 3950,
    weight_or_unit: "৮ ফুট × ৬ ফুট ডাবল বেড সাইজ",
    image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900",
    rating: 4.96,
    reviews_count: 184,
    seller_name: "জামালপুর পল্লী নারী হস্তশিল্প সমবায়",
    seller_phone: "+8801912334455",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 12,
    description: "জামালপুরের গ্রামীণ দক্ষ কারুশিল্পীদের হাতে তৈরি জাতীয় জিআই স্বীকৃতিপ্রাপ্ত খাঁটি নকশিকাঁথা। কয়েক স্তরের সুতি কাপড়ে রঙিন সুতায় ফোকলোর, মাছ, পদ্ম ও লোকজ জীবনচিত্রের সুনিপুণ ফোঁড়।",
    features: [
      "জিআই সনদপ্রাপ্ত জামালপুর নকশিকাঁথা (GI-11)",
      "১০০% হাতের সূক্ষ্ম সুই-সুতার কাজ",
      "ধোয়ার পরও রঙ নষ্ট না হওয়ার গ্যারান্টি",
      "ডাবল বেড প্রিমিয়াম কাভার সাইজ",
    ],
    giTag: "GI Certified: BD-11 • Jamalpur",
    giCertified: true,
    giCode: "BD-GI-11/JMP",
    weightKg: 0.85,
    galleryImages: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900",
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=900",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=900",
    ],
    dimensionsMeta: {
      dimensions: "২৪০ সেমি × ১৮০ সেমি (৮ ফুট × ৬ ফুট কিং সাইজ বেডস্প্রেড)",
      weightGrams: 850,
      weightFormatted: "৮৫০ গ্রাম (ভারী কার্পেট ফিনিশ সুতি কাঁথা)",
      materials: "লেয়ার্ড রিফাইনড হ্যান্ডলুম কটন ও ওয়াশাবেল কটন সিল্ক থ্রেড",
      craftMethod: "ঐতিহ্যবাহী জামালপুরী রানিং স্টিচ ও ভরাট সেলাই পদ্ধতি",
      packaging: "সুরক্ষিত পরিবেশবান্ধব জুট ব্যাগ ও সুতি ড্রস্ট্রিং পাউচ",
    },
    artisan: {
      name: "Fatema Begum",
      banglaName: "ফাতেমা বেগম",
      role: "সভাপতি ও কারুশিল্পী, জামালপুর কারু পল্লী",
      experienceYears: 28,
      location: "ইসলামপুর, জামালপুর",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300",
      story: "ফাতেমা বেগমের নেতৃত্বে জামালপুরের ইসলামপুরের প্রায় ৬০ জন গ্রামীণ নারী গৃহস্থালির কাজের ফাঁকে এই অপরূপ কাঁথা তৈরি করেন। প্রতিটি কাঁথায় একেকজন নারীর লোকগাথা ও স্বপ্ন বোনা থাকে।",
      cooperative: "জামালপুর নারী হস্তশিল্প উন্নয়ন ট্রাস্ট",
      contactPhone: "+8801912334455",
      award: "ইউনেস্কো ক্রাফট অ্যাওয়ার্ড অব এক্সিলেন্স প্রতিযোগী",
    },
    certificates: [
      {
        id: "cert-gi-3",
        name: "ভৌগোলিক নির্দেশক (GI) সনদপত্র",
        issuer: "ডিপার্টমেন্ট অব পেটেন্টস, ডিজাইনস অ্যান্ড ট্রেডমার্কস",
        code: "GI-REG-BD-011/JMP",
        badgeType: "gi",
      },
      {
        id: "cert-ncc-1",
        name: "জাতীয় কারুশিল্প পরিষদ কোয়ালিটি সিল",
        issuer: "National Crafts Council of Bangladesh",
        code: "NCCB-NKS-2026",
        badgeType: "handloom",
      },
    ],
    customerReviews: [
      {
        id: "rev-nk-1",
        author: "তানজিলা আনোয়ার",
        location: "বনানী, ঢাকা",
        rating: 5,
        date: "৪ দিন আগে",
        comment: "কী অসাধারণ হাতের কাজ! প্রতিটি সেলাই নিখুঁত। ঘরের বসার রুমে অথবা খাটে বিছালে পুরো ঘরের পরিবেশ বদলে যায়।",
        verifiedBuyer: true,
      },
      {
        id: "rev-nk-2",
        author: "সাকিব চৌধুরী",
        location: "চট্টগ্রাম",
        rating: 5,
        date: "১ সপ্তাহ আগে",
        comment: "বিদেশি অতিথির জন্য গিফট নিয়েছিলাম, উনি দেখে মুগ্ধ হয়ে গেছেন। জামালপুরের আসল কাজ।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Jamalpur Women Craft Welfare",
      merchantAccount: "bKash Merchant #01912334455",
      cooperativeGuild: "জামালপুর পল্লী নারী হস্তশিল্প সমবায়",
      artisanSharePct: 94,
      paymentGatewayNotice: "এই ক্রয়ের ৯৪% টাকা সরাসরি জামালপুরের প্রান্তিক নারী কারুশিল্পীদের একাউন্টে প্রদান করা হয়।",
    },
  },

  // 4. Rajshahi Silk
  "prod-silk-rajshahi": {
    id: "prod-silk-rajshahi",
    name: "Pure Mulberry Rajshahi Silk Heritage Saree",
    bangla_name: "রাজশাহীর খাঁটি তুঁত রেশম সিল্ক শাড়ি",
    region: "রাজশাহী",
    category: "clothing",
    price: 5400,
    original_price: 6200,
    weight_or_unit: "১২ হাত খাঁটি সিল্ক + ব্লাউজ পিস",
    image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900",
    rating: 4.94,
    reviews_count: 142,
    seller_name: "সোপুরা সিল্ক উইভার্স গিল্ড, রাজশাহী",
    seller_phone: "+8801819445566",
    seller_verified: true,
    in_stock: true,
    stock_quantity: 10,
    description: "পদ্মা তীরের রাজশাহীর শতাব্দী প্রাচীন ঐতিহ্যবাহী খাঁটি তুঁত রেশম থেকে প্রস্তুত জিআই সনদপ্রাপ্ত প্রিমিয়াম সিল্ক শাড়ি। পালকের মতো হালকা, প্রাকৃতিক উজ্জ্বলতা ও রাজকীয় আভিজাত্যের প্রতীক।",
    features: [
      "জিআই সনদপ্রাপ্ত রাজশাহী সিল্ক (GI-03)",
      "১০০% খাঁটি মালবেরি রেশম সুতা",
      "বাংলাদেশ রেশম উন্নয়ন বোর্ড প্রত্যয়ন",
      "প্রাকৃতিক শাইন ও রিং টেস্ট পাসড",
    ],
    giTag: "GI Certified: BD-03 • Rajshahi",
    giCertified: true,
    giCode: "BD-GI-03/RAJ",
    weightKg: 0.35,
    galleryImages: [
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900",
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=900",
    ],
    dimensionsMeta: {
      dimensions: "৫.৫ মিটার দৈর্ঘ্য × ১.১৫ মিটার প্রস্থ (১২ হাত রানিং ব্লাউজ পিসসহ)",
      weightGrams: 350,
      weightFormatted: "৩৫০ গ্রাম (অত্যন্ত হালকা ও সফট টেক্সচার)",
      materials: "১০০% খাঁটি রাজশাহী মালবেরি স্পান ও ফিলামেন্ট রেশম",
      craftMethod: "তুঁত পোকার গুটি থেকে সুতা কেটে ঐতিহ্যবাহী হস্তচালিত রেশম তাঁত",
      packaging: "ব্র্যান্ডেড প্রিমিয়াম হার্ডবোর্ড বক্স ও বাটার পেপার র‍্যাপ",
    },
    artisan: {
      name: "Master Weaver Shafiur Rahman",
      banglaName: "ওস্তাদ শফিউর রহমান",
      role: "প্রধান বুনন শিল্পী, রাজশাহী রেশম পল্লি",
      experienceYears: 35,
      location: "সোপুরা, বোয়ালিয়া, রাজশাহী",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
      story: "শফিউর রহমান রাজশাহীর রেশম তাঁতে ৩৫ বছর ধরে নিরলস কাজ করছেন। গুটি থেকে সুতা বের করা থেকে শুরু করে তাঁতে বুনন পর্যন্ত প্রতি ধাপে তিনি ঐতিহ্য বজায় রাখেন।",
      cooperative: "রাজশাহী রেশম তাঁতী সমবায় সমিতি",
      contactPhone: "+8801819445566",
      award: "জাতীয় রেশম মেলা সেরা কারিগর পুরস্কার ২০১৮",
    },
    certificates: [
      {
        id: "cert-gi-4",
        name: "ভৌগোলিক নির্দেশক (GI) সনদপত্র",
        issuer: "ডিপার্টমেন্ট অব পেটেন্টস, ডিজাইনস অ্যান্ড ট্রেডমার্কস",
        code: "GI-REG-BD-003/RAJ",
        badgeType: "gi",
      },
      {
        id: "cert-silk-1",
        name: "বাংলাদেশ রেশম বোর্ড কোয়ালিটি মার্ক",
        issuer: "বাংলাদেশ রেশম উন্নয়ন বোর্ড (BSDB)",
        code: "BSDB-RS-9921",
        badgeType: "handloom",
      },
    ],
    customerReviews: [
      {
        id: "rev-s-1",
        author: "অধ্যাপিকা রাবেয়া বেগম",
        location: "রাজশাহী বিশ্ববিদ্যালয়",
        rating: 5,
        date: "৩ দিন আগে",
        comment: "রাজশাহীর আসল তুঁত রেশমের যে নরম অনুভূতি, সেটি এই শাড়িতে পুরোপুরি বিদ্যমান। আভিজাত্যে কোনো তুলনা হয় না।",
        verifiedBuyer: true,
      },
      {
        id: "rev-s-2",
        author: "ফারহানা কবীর",
        location: "মিরপুর, ঢাকা",
        rating: 5,
        date: "১ সপ্তাহ আগে",
        comment: "খুব দ্রুত ডেলিভারি পেয়েছি। শাড়িটির বুনন ও রঙ ছবির চেয়েও বাস্তবে সুন্দর।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Sopura Silk Artisans Guild",
      merchantAccount: "bKash Merchant #01819445566",
      cooperativeGuild: "রাজশাহী রেশম তাঁতী সমবায়",
      artisanSharePct: 91,
      paymentGatewayNotice: "তুঁত চাষী ও তাঁতীদের জীবনমান উন্নয়নে এই বিক্রির ৯১% রেশম তাঁতীদের তহবিলে চলে যায়।",
    },
  },

  // 5. Tangail Saree
  "prod-saree-1": {
    giTag: "GI Heritage: Tangail Handloom",
    giCertified: true,
    giCode: "BD-GI-HERITAGE/TGL",
    weightKg: 0.5,
    galleryImages: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900",
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=900",
    ],
    dimensionsMeta: {
      dimensions: "৫.৫ মিটার দৈর্ঘ্য × ১.২ মিটার প্রস্থ",
      weightGrams: 500,
      weightFormatted: "৫০০ গ্রাম",
      materials: "১০০% পিওর কটন ও জাকার্ড পাড়",
      craftMethod: "বাজিতপুর তাঁতী সমিতির হস্তচালিত তাঁত",
      packaging: "হস্তশিল্পীদের ইকো-বক্স",
    },
    artisan: {
      name: "Nani Gopal Basak",
      banglaName: "ননী গোপাল বসাক",
      role: "মাস্টার উইভার, বাজিতপুর তাঁতী সমিতি",
      experienceYears: 30,
      location: "বাজিতপুর, টাঙ্গাইল",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      story: "টাঙ্গাইলের বসাক পরিবারের ঐতিহ্যবাহী সুতি তাঁতে বোনা মনমাতানো আরামদায়ক শাড়ি।",
      cooperative: "বাজিতপুর তাঁতী সমিতি, টাঙ্গাইল",
      contactPhone: "+8801911443322",
    },
    certificates: [
      {
        id: "cert-tgl-1",
        name: "ঐতিহ্যবাহী টাঙ্গাইল তাঁতশিল্প প্রত্যয়ন",
        issuer: "টাঙ্গাইল তাঁতী সমিতি পরিষদ",
        code: "TGL-WEAVE-08",
        badgeType: "handloom",
      },
    ],
    customerReviews: [
      {
        id: "rev-t-1",
        author: "রোকসানা পারভীন",
        location: "যাত্রাবাড়ী, ঢাকা",
        rating: 5,
        date: "৪ দিন আগে",
        comment: "গরমে পরার জন্য এর চেয়ে আরামদায়ক সুতি শাড়ি আর হয় না। রঙ পাকা।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Bajitpur Tanti Samiti",
      merchantAccount: "Nagad Merchant #01911443322",
      cooperativeGuild: "বাজিতপুর তাঁতী সমিতি",
      artisanSharePct: 92,
      paymentGatewayNotice: "৯২% অর্থ টাঙ্গাইলের তাঁতিদের প্রত্যক্ষ তহবিলে জমা হয়।",
    },
  },

  // 6. Sreemangal Tea
  "prod-tea-1": {
    giTag: "Origin Protected: Sylhet (Sreemangal)",
    giCertified: true,
    giCode: "SYL-TEA-ORIGIN",
    weightKg: 0.45,
    galleryImages: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900",
      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=900",
    ],
    dimensionsMeta: {
      dimensions: "ফয়েল সিলড ভ্যাকুয়াম পাউচ (৪০০ গ্রাম)",
      weightGrams: 420,
      weightFormatted: "৪২০ গ্রাম",
      materials: "প্রথম পাতার কোমল দুটি পাতা ও একটি কুঁড়ি",
      craftMethod: "অরগানিক বাগান ও ঐতিহ্যবাহী রোলার প্রসেস",
      packaging: "অ্যারোমা লক গোল্ড ফয়েল প্যাকেজিং",
    },
    artisan: {
      name: "Master Planter Faruk Ahmed",
      banglaName: "ফারুক আহমেদ",
      role: "টি প্ল্যান্টেশন বিশেষজ্ঞ",
      experienceYears: 20,
      location: "শ্রীমঙ্গল, মৌলভীবাজার",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
      story: "শ্রীমঙ্গলের পাহাড়ি মাটির ঘ্রাণ ও সকালের শিশিরে সিক্ত চা পাতা সংগ্রহ করে তৈরি কড়া লিকারের স্পেশাল ব্ল্যাক টি।",
      cooperative: "মৌলভীবাজার টি গার্ডেন ডিরেক্ট কো-অপ",
      contactPhone: "+8801733556677",
    },
    certificates: [
      {
        id: "cert-tea-1",
        name: "বাংলাদেশ চা বোর্ড এক্সপোর্ট গ্রেড সিল",
        issuer: "বাংলাদেশ চা বোর্ড (BTB)",
        code: "BTB-SRM-4412",
        badgeType: "bsti",
      },
    ],
    customerReviews: [
      {
        id: "rev-tea-1",
        author: "আনিসুল ইসলাম",
        location: "মোহাম্মদপুর, ঢাকা",
        rating: 5,
        date: "১ দিন আগে",
        comment: "চা পাতা ফুটতেই পুরো ঘর সুগন্ধে ভরে গেল! কড়া লিকার ও চমৎকার ফ্লেভার।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Moulvibazar Tea Co-op",
      merchantAccount: "bKash Merchant #01733556677",
      cooperativeGuild: "শ্রীমঙ্গল চা চাষী সমবায়",
      artisanSharePct: 90,
      paymentGatewayNotice: "সরাসরি বাগান কর্মীদের সমবায়ে লভ্যাংশ প্রদান।",
    },
  },

  // 7. Bogura Doi
  "prod-doi-1": {
    giTag: "GI Certified: BD • Bogura Special Doi",
    giCertified: true,
    giCode: "BD-GI-BGR/DOI",
    weightKg: 1.45,
    galleryImages: [
      "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=900",
    ],
    dimensionsMeta: {
      dimensions: "পোড়ামাটির সরা (১ কেজি মিষ্টি দই)",
      weightGrams: 1450,
      weightFormatted: "১.৪৫ কেজি (দই ও ঐতিহ্যবাহী মাটির সরা)",
      materials: "খাঁটি গাভীর ঘন দুধ ও ক্ষীরসা",
      craftMethod: "ঐতিহাসিক শতবর্ষী পদ্ধতিতে মাটির সরায় জ্বাল দেয়া",
      packaging: "বিশেষ ড্রাই কুলিং থার্মাল বক্স যাতে নষ্ট না হয়",
    },
    artisan: {
      name: "Gouranga Ghosh",
      banglaName: "গৌরাঙ্গ ঘোষ",
      role: "দধি বিশেষজ্ঞ কারিগর",
      experienceYears: 27,
      location: "বগুড়া সদর, বগুড়া",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      story: "বগুড়ার নবাববাড়ী ও আকবরিয়া ঘরানার আসল শাহী মিষ্টি দই। ঘন দুধ ঘণ্টার পর ঘণ্টা জ্বাল দিয়ে তৈরি।",
      cooperative: "আকবরিয়া দধি কারিগর পরিষদ",
      contactPhone: "+8801712998855",
    },
    certificates: [
      {
        id: "cert-doi-1",
        name: "বিএসটিআই ডেইরি স্ট্যান্ডার্ড সার্টিফিকেট",
        issuer: "BSTI খাদ্য মান বিভাগ",
        code: "BSTI-DAIRY-801",
        badgeType: "bsti",
      },
    ],
    customerReviews: [
      {
        id: "rev-doi-1",
        author: "শাহেদ বিন কামাল",
        location: "গুলশান-২, ঢাকা",
        rating: 5,
        date: "২ দিন আগে",
        comment: "কুলিং বক্সে একদম ঠান্ডা ও ফ্রেশ পেয়েছি। মুখে দিলেই মিলিয়ে যায় এমন খাঁটি স্বাদ।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Akboria Dairy Heritage",
      merchantAccount: "bKash Merchant #01712998855",
      cooperativeGuild: "বগুড়া মিষ্টি কারিগর সমিতি",
      artisanSharePct: 92,
      paymentGatewayNotice: "সরাসরি স্থানীয় খামারী ও দধি কারিগরদের একাউন্টে জমা হয়।",
    },
  },

  // 8. Cox's Bazar Shutki
  "prod-shutki-1": {
    giTag: "Coast Origin: Cox's Bazar (Nazirartek)",
    giCertified: true,
    giCode: "COAST-SHUTKI-01",
    weightKg: 0.55,
    galleryImages: [
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900",
    ],
    dimensionsMeta: {
      dimensions: "ভ্যাকুয়াম সিলড পাউচ (৫০০ গ্রাম)",
      weightGrams: 550,
      weightFormatted: "৫৫০ গ্রাম",
      materials: "বঙ্গোপসাগরের তাজা রূপচাঁদা মাছ",
      craftMethod: "কীটনাশকমুক্ত রোদে শুকানো বৈজ্ঞানিক ড্রায়িং মাচা",
      packaging: "অ্যারোমা সিল নো-স্মেল ভ্যাকুয়াম প্যাক",
    },
    artisan: {
      name: "Hafizur Rahman",
      banglaName: "হাফিজুর রহমান",
      role: "ড্রাই ফিশ প্রসেসর",
      experienceYears: 18,
      location: "নাজিরারটেক, কক্সবাজার",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
      story: "নাজিরারটেকের ঐতিহ্যবাহী সমুদ্রের লবণাক্ত হাওয়ায় বিষমুক্ত শুকানো প্রিমিয়াম সামুদ্রিক শুঁটকি।",
      cooperative: "নাজিরারটেক ড্রাই ফিশ হাফিজ ট্রেডার্স",
      contactPhone: "+8801819887766",
    },
    certificates: [
      {
        id: "cert-shut-1",
        name: "কীটনাশকমুক্ত সামুদ্রিক মৎস্য সনদ",
        issuer: "মৎস্য ও প্রাণিসম্পদ অধিদপ্তর",
        code: "FISH-ORG-442",
        badgeType: "bsti",
      },
    ],
    customerReviews: [
      {
        id: "rev-sh-1",
        author: "আফরোজা শিমু",
        location: "কুমিল্লা সদর",
        rating: 5,
        date: "৫ দিন আগে",
        comment: "প্যাকেট কাটলে কোনো বাজে গন্ধ নেই, রান্নার পর চমৎকার স্বাদ। খাঁটি বিষমুক্ত শুঁটকি।",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Nazirartek Fishermen Guild",
      merchantAccount: "Nagad Merchant #01819887766",
      cooperativeGuild: "কক্সবাজার মৎস্যজীবী কল্যাণ সমবায়",
      artisanSharePct: 90,
      paymentGatewayNotice: "উপকূলীয় জেলে পরিবারের কল্যাণে ৯০% মূল্য প্রত্যক্ষ হস্তান্তর।",
    },
  },

  // 9. Natore Kanchagolla
  "prod-kanchagolla-1": {
    giTag: "GI Certified: BD • Natore Kanchagolla",
    giCertified: true,
    giCode: "BD-GI-NAT/KCG",
    weightKg: 1.1,
    galleryImages: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900",
    ],
    dimensionsMeta: {
      dimensions: "মিষ্টি বক্স (১ কেজি কাঁচাগোল্লা)",
      weightGrams: 1100,
      weightFormatted: "১.১ কেজি",
      materials: "তাজা খাঁটি ছানা ও এলাচ",
      craftMethod: "রাজবাড়ির আদি কাঁচাগোল্লা রেসিপি",
      packaging: "এয়ার টাইট ফুডগ্রেড লক বক্স",
    },
    artisan: {
      name: "Shambhu Das",
      banglaName: "শম্ভু দাস",
      role: "মিষ্টান্ন কারিগর",
      experienceYears: 22,
      location: "নাটোর রাজবাড়ি মোড়, নাটোর",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
      story: "নাটোরের মহারানী ভবানীর সময়কার ঐতিহাসিক রেসিপিতে তৈরি তাজা খাঁটি ছানার মিষ্টি।",
      cooperative: "নাটোর মিষ্টান্ন ভান্ডার সমবায়",
      contactPhone: "+8801822339900",
    },
    certificates: [
      {
        id: "cert-kcg-1",
        name: "ভৌগোলিক নির্দেশক (GI) সনদপত্র",
        issuer: "DPDT ভৌগোলিক নির্দেশক উইং",
        code: "GI-REG-BD-NAT-09",
        badgeType: "gi",
      },
    ],
    customerReviews: [
      {
        id: "rev-k-1",
        author: "মিজানুর রহমান",
        location: "মিরপুর, ঢাকা",
        rating: 5,
        date: "৩ দিন আগে",
        comment: "কাঁচাগোল্লার হালকা মিষ্টি আর ছানার গন্ধটা মন ছুঁয়ে যায়। ধন্যবাদ!",
        verifiedBuyer: true,
      },
    ],
    vendorPayout: {
      merchantName: "Natore Sweetmakers Co-op",
      merchantAccount: "bKash Merchant #01822339900",
      cooperativeGuild: "নাটোর মিষ্টান্ন কারিগর সমিতি",
      artisanSharePct: 91,
      paymentGatewayNotice: "সরাসরি নাটোরের মিষ্টি কারিগরদের তহবিলে পাঠানো হয়।",
    },
  },
};

// Courier Partners for Domestic Logistics
const COURIER_PARTNERS = [
  {
    id: "pathao",
    name: "Pathao Courier",
    tagline: "এক্সপ্রেস ডোরস্টেপ হোম ডেলিভারি",
    icon: "flash-outline",
    badge: "Fastest",
  },
  {
    id: "steadfast",
    name: "Steadfast Courier",
    tagline: "দেশব্যাপী নির্ভরযোগ্য ক্যাশ-অন ডেলিভারি",
    icon: "shield-checkmark-outline",
    badge: "Popular",
  },
  {
    id: "sundarban",
    name: "Sundarban Courier",
    tagline: "ঐতিহ্যবাহী পার্সেল সার্ভিস ও ডোর ড্রপ",
    icon: "cube-outline",
    badge: "Trusted",
  },
  {
    id: "redx",
    name: "RedX Logistics",
    tagline: "রিমোট এরিয়া দ্রুত শিপিং",
    icon: "bicycle-outline",
    badge: "Wide Network",
  },
];

export default function LocalMarketplaceScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useResponsive();
  // Inventory state
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart State (Optimistic)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animated values for sliding drawer and cart badge
  const cartScaleAnim = useRef(new Animated.Value(1)).current;
  const drawerSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const drawerBackdropAnim = useRef(new Animated.Value(0)).current;

  // Product Detail Modal State
  const [detailProduct, setDetailProduct] = useState<EnrichedProduct | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [detailQuantity, setDetailQuantity] = useState(1);

  // Delivery & Courier Form State
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("Dhaka");
  const [isDhaka, setIsDhaka] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState("pathao");
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Sell Listing Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellName, setSellName] = useState("");
  const [sellBanglaName, setSellBanglaName] = useState("");
  const [sellRegion, setSellRegion] = useState("নারায়ণগঞ্জ");
  const [sellCategory, setSellCategory] = useState<"food" | "handicraft" | "clothing" | "tea_honey">("handicraft");
  const [sellPrice, setSellPrice] = useState("2800");
  const [sellUnit, setSellUnit] = useState("১টি হস্তশিল্প");
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellDesc, setSellDesc] = useState("");
  const [submittingListing, setSubmittingListing] = useState(false);

  // Total cart item counter (for optimistic badge)
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to trigger optimistic cart badge bounce
  const triggerCartBadgeAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(cartScaleAnim, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(cartScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cartScaleAnim]);

  // Show temporary toast message
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Enrich LocalProduct with GI, artisan, dimensions, reviews, and vendor payout
  const enrichProduct = useCallback((prod: LocalProduct): EnrichedProduct => {
    const meta = CURATED_GI_METADATA[prod.id] || {};

    const fallbackGiTag = meta.giTag || `GI Tagged • ${prod.region}`;
    const fallbackWeightKg = meta.weightKg || (prod.category === "food" ? 1.0 : prod.category === "tea_honey" ? 0.45 : 0.6);

    return {
      ...prod,
      giTag: meta.giTag || fallbackGiTag,
      giCertified: meta.giCertified !== undefined ? meta.giCertified : true,
      giCode: meta.giCode || `BD-GI-${prod.region.substring(0, 3).toUpperCase()}`,
      weightKg: fallbackWeightKg,
      galleryImages: meta.galleryImages || [
        prod.image_url,
        "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=900",
      ],
      dimensionsMeta: meta.dimensionsMeta || {
        dimensions: prod.weight_or_unit || "স্ট্যান্ডার্ড সাইজ",
        weightGrams: Math.round(fallbackWeightKg * 1000),
        weightFormatted: `${fallbackWeightKg} কেজি`,
        materials: "১০০% খাঁটি ও প্রাকৃতিক হস্তশিল্প উপাদান",
        craftMethod: "বংশানুক্রমিক স্থানীয় কারিগরদের ঐতিহ্যবাহী পদ্ধতি",
        packaging: "সুরক্ষিত ইকো-ফ্রেন্ডলি বক্স ও উপহার প্যাকেট",
      },
      artisan: meta.artisan || {
        name: prod.seller_name,
        banglaName: prod.seller_name,
        role: "স্থানীয় ঐতিহ্যবাহী কারুশিল্পী",
        experienceYears: 15,
        location: `${prod.region}, বাংলাদেশ`,
        avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=300",
        story: prod.description || "বংশপরম্পরায় খাঁটি স্থানীয় পণ্য তৈরি ও সরবরাহকারী কারিগর।",
        cooperative: `${prod.region} কারুশিল্পী সমবায়`,
        contactPhone: prod.seller_phone,
      },
      certificates: meta.certificates || [
        {
          id: `cert-gen-${prod.id}`,
          name: "ভৌগোলিক নির্দেশক (GI) সত্যতা সনদ",
          issuer: "বাংলাদেশ কারুশিল্প পরিষদ ও স্থানীয় প্রশাসন",
          code: `GI-AUTH-${prod.id}`,
          badgeType: "gi",
        },
      ],
      customerReviews: meta.customerReviews || [
        {
          id: `rev-gen-${prod.id}`,
          author: "সাদিয়া আহমেদ",
          location: "ঢাকা",
          rating: 5,
          date: "৪ দিন আগে",
          comment: "পণ্যটির কোয়ালিটি সত্যি অসাধারণ। খাঁটি স্থানীয় আঞ্চলিক স্বাদের আসল অনুভূতি পেলাম।",
          verifiedBuyer: true,
        },
      ],
      vendorPayout: meta.vendorPayout || {
        merchantName: prod.seller_name,
        merchantAccount: `bKash/Nagad #${prod.seller_phone}`,
        cooperativeGuild: `${prod.region} কারুশিল্পী সমিতি`,
        artisanSharePct: 92,
        paymentGatewayNotice: "এই মূল্যের ৯২% সরাসরি স্থানীয় কারিগরের একাউন্টে পরিশোধিত হয়।",
      },
    };
  }, []);

  // Load Inventory from localMarketplaceService
  const loadInventory = useCallback(async () => {
    try {
      setFetchError(null);
      const baseProducts = await localMarketplaceService.getProducts({
        region: selectedRegion === "All" ? undefined : selectedRegion,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        query: searchQuery,
      });

      // Also ensure showcase GI tagged items (Jamdani Narayanganj, Nakshi Kantha Jamalpur, Rajshahi Silk) are available
      const existingIds = new Set(baseProducts.map((p) => p.id));
      const supplementaryProducts: LocalProduct[] = [];

      // Ensure Narayanganj Jamdani Saree is present
      if (!existingIds.has("prod-jamdani-narayanganj")) {
        supplementaryProducts.push({
          id: "prod-jamdani-narayanganj",
          name: "Traditional Dhakai Jamdani Handloom Saree",
          bangla_name: "নারায়ণগঞ্জের ঐতিহ্যবাহী জামদানি শাড়ি",
          region: "নারায়ণগঞ্জ",
          category: "handicraft",
          price: 4850,
          original_price: 5600,
          weight_or_unit: "১২ হাত শাড়ি (৮৪ কাউন্ট সুতি)",
          image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900",
          rating: 4.98,
          reviews_count: 312,
          seller_name: "রূপগঞ্জ জামদানি তাঁতী কারিগর সমিতি",
          seller_phone: "+8801711884422",
          seller_verified: true,
          in_stock: true,
          stock_quantity: 14,
          description: "শীতলক্ষ্যা নদীর অববাহিকায় নারায়ণগঞ্জের রূপগঞ্জের উস্তাদ তাঁতিদের হাতে বোনা জিআই সনদপ্রাপ্ত আসল ঢাকাই জামদানি।",
          features: ["১০০% জিআই সনদপ্রাপ্ত ঢাকাই জামদানি (GI-01)", "হাতে টানা পিটলুম কারিগরি", "৮৪ কাউন্ট সুতি"],
        });
      }

      // Ensure Jamalpur Nakshi Kantha is present
      if (!existingIds.has("prod-nakshi-kantha-jamalpur")) {
        supplementaryProducts.push({
          id: "prod-nakshi-kantha-jamalpur",
          name: "Heritage Jamalpur Hand-Embroidered Nakshi Kantha",
          bangla_name: "জামালপুরের ঐতিহ্যবাহী হাতে সেলাই নকশিকাঁথা",
          region: "জামালপুর",
          category: "handicraft",
          price: 3400,
          original_price: 3950,
          weight_or_unit: "৮ ফুট × ৬ ফুট ডাবল বেড সাইজ",
          image_url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900",
          rating: 4.96,
          reviews_count: 184,
          seller_name: "জামালপুর পল্লী নারী হস্তশিল্প সমবায়",
          seller_phone: "+8801912334455",
          seller_verified: true,
          in_stock: true,
          stock_quantity: 12,
          description: "জামালপুরের গ্রামীণ দক্ষ কারুশিল্পীদের হাতে তৈরি জাতীয় জিআই স্বীকৃতিপ্রাপ্ত খাঁটি নকশিকাঁথা।",
          features: ["জিআই সনদপ্রাপ্ত জামালপুর নকশিকাঁথা (GI-11)", "১০০% হাতের সূক্ষ্ম সেলাই", "ডাবল বেড সাইজ"],
        });
      }

      // Ensure Rajshahi Silk is present
      if (!existingIds.has("prod-silk-rajshahi")) {
        supplementaryProducts.push({
          id: "prod-silk-rajshahi",
          name: "Pure Mulberry Rajshahi Silk Heritage Saree",
          bangla_name: "রাজশাহীর খাঁটি তুঁত রেশম সিল্ক শাড়ি",
          region: "রাজশাহী",
          category: "clothing",
          price: 5400,
          original_price: 6200,
          weight_or_unit: "১২ হাত খাঁটি সিল্ক + ব্লাউজ পিস",
          image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900",
          rating: 4.94,
          reviews_count: 142,
          seller_name: "সোপুরা সিল্ক উইভার্স গিল্ড, রাজশাহী",
          seller_phone: "+8801819445566",
          seller_verified: true,
          in_stock: true,
          stock_quantity: 10,
          description: "পদ্মা তীরের রাজশাহীর শতাব্দী প্রাচীন ঐতিহ্যবাহী খাঁটি তুঁত রেশম থেকে প্রস্তুত জিআই সনদপ্রাপ্ত প্রিমিয়াম সিল্ক শাড়ি।",
          features: ["জিআই সনদপ্রাপ্ত রাজশাহী সিল্ক (GI-03)", "১০০% খাঁটি তুঁত রেশম", "রেশম বোর্ড প্রত্যয়ন"],
        });
      }

      const mergedList = [...supplementaryProducts, ...baseProducts];

      // Apply filtering
      let filtered = mergedList;
      if (selectedRegion !== "All") {
        filtered = filtered.filter((p) => p.region.includes(selectedRegion));
      }
      if (selectedCategory !== "all") {
        filtered = filtered.filter((p) => p.category === selectedCategory);
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.bangla_name.toLowerCase().includes(q) ||
            p.region.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
      }

      const enriched = filtered.map(enrichProduct);
      setProducts(enriched);
    } catch (e: any) {
      console.warn("Failed to load inventory:", e);
      setFetchError(e?.message || "ঐতিহ্যবাহী পণ্যসম্ভার লোড করতে সাময়িক সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRegion, selectedCategory, searchQuery, enrichProduct]);

  useEffect(() => {
    setLoading(true);
    loadInventory();
  }, [loadInventory]);

  // Pull-to-refresh handler
  const onPullToRefresh = useCallback(() => {
    setRefreshing(true);
    loadInventory();
    showToast("পণ্য তালিকা রিফ্রেশ সম্পন্ন হয়েছে ✓");
  }, [loadInventory, showToast]);

  // Optimistic Cart Methods
  const addToCartOptimistic = useCallback(
    (product: EnrichedProduct, qty: number = 1) => {
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + qty,
          };
          return updated;
        } else {
          return [...prev, { product, quantity: qty }];
        }
      });

      triggerCartBadgeAnimation();
      showToast(`কার্টে যোগ হয়েছে: ${product.bangla_name}`);
    },
    [triggerCartBadgeAnimation, showToast]
  );

  const updateCartQuantityOptimistic = useCallback(
    (productId: string, delta: number) => {
      setCart((prev) => {
        return prev
          .map((item) => {
            if (item.product.id === productId) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];
      });
      triggerCartBadgeAnimation();
    },
    [triggerCartBadgeAnimation]
  );

  const removeCartItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  // Sliding Drawer Open/Close Animations
  const openCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerBackdropAnim, {
        toValue: 0.6,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(drawerSlideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerBackdropAnim, drawerSlideAnim]);

  const closeCartDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerBackdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(drawerSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsCartDrawerOpen(false);
    });
  }, [drawerBackdropAnim, drawerSlideAnim]);

  // Open Product Detail Modal
  const openProductDetail = (product: EnrichedProduct) => {
    setDetailProduct(product);
    setActiveGalleryIndex(0);
    setDetailQuantity(1);
    setDetailModalVisible(true);
  };

  // Weight-based Delivery Calculation
  // Cart Subtotal
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Total Parcel Weight (kg)
  const totalCartWeightKg = cart.reduce(
    (sum, item) => sum + item.product.weightKg * item.quantity,
    0
  );

  // Delivery Fee Calculation based on District and Weight:
  // Inside Dhaka: Base ৳60 (up to 1kg) + ৳30 per extra kg
  // Outside Dhaka: Base ৳120 (up to 1kg) + ৳40 per extra kg
  const calculateDeliveryFee = (weightKg: number, inDhaka: boolean) => {
    if (cart.length === 0) return 0;
    const baseFee = inDhaka ? 60 : 120;
    const extraRate = inDhaka ? 30 : 40;
    const extraWeight = Math.max(0, weightKg - 1.0);
    const weightSurcharge = Math.ceil(extraWeight) * extraRate;
    return baseFee + weightSurcharge;
  };

  const deliveryFee = calculateDeliveryFee(totalCartWeightKg, isDhaka);
  const totalOrderValue = cartSubtotal + deliveryFee;

  // Primary Vendor Payout Summary for Checkout Pipeline
  const primaryVendorPayout = cart.length > 0
    ? `${cart[0].product.artisan.cooperative} (${cart[0].product.vendorPayout.merchantAccount})`
    : "Local Craftsmen Cooperative Guild";

  // Checkout Handler: Transition from Cart Drawer to `payments-enhanced.tsx`
  const handleProceedToCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert("কার্ট খালি", "দয়া করে অর্ডারের জন্য পণ্য কার্টে যুক্ত করুন।");
      return;
    }

    if (!recipientName.trim() || !recipientPhone.trim() || !deliveryAddress.trim()) {
      Alert.alert(
        "ডেলিভারি তথ্য আবশ্যক",
        "দয়া করে প্রাপকের পুরো নাম, সচল মোবাইল নম্বর এবং পূর্ণাঙ্গ কুরিয়ার ঠিকানা লিখুন।"
      );
      return;
    }

    // Phone validation
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 11) {
      Alert.alert("সঠিক মোবাইল নম্বর", "দয়া করে ১১ ডিজিটের সঠিক মোবাইল নম্বর প্রদান করুন।");
      return;
    }

    try {
      setSubmittingCheckout(true);

      // Record orders in localMarketplaceService for persistence
      for (const item of cart) {
        await localMarketplaceService.placeProductOrder({
          product_id: item.product.id,
          product_name: `${item.product.bangla_name} [${item.product.giTag}]`,
          product_image: item.product.image_url,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          customer_name: recipientName.trim(),
          customer_phone: recipientPhone.trim(),
          delivery_address: `${deliveryAddress.trim()}, জেলা: ${deliveryDistrict} (${isDhaka ? "ঢাকা সিটি" : "ঢাকার বাইরে"}) | কুরিয়ার: ${selectedCourier.toUpperCase()}`,
          delivery_district: deliveryDistrict,
          payment_method: "bkash",
        });
      }

      // Close drawer smoothly
      closeCartDrawer();

      // Concise order summary for reference
      const orderRef = `MKT-${Date.now().toString().slice(-6)}: ${cart[0].product.bangla_name}${
        cart.length > 1 ? ` +${cart.length - 1} items` : ""
      }`;

      // Transition smoothly into payments.tsx passing order value and vendor payout details
      router.push({
        pathname: "/screens/payments" as any,
        params: {
          amount: totalOrderValue.toString(),
          reference: orderRef,
          provider: primaryVendorPayout,
          productType: "local_marketplace_handicrafts",
          packageTitle: `আঞ্চলিক হস্তশিল্প ও স্যুভেনির অর্ডার (${totalCartCount} টি আইটেম)`,
          duration: `${selectedCourier.toUpperCase()} (${isDhaka ? "১-২ কার্যদিবস" : "২-৩ কার্যদিবস"})`,
          travelers: `${recipientName.trim()} (${deliveryDistrict})`,
          flightInfo: `পার্সেল মোট ওজন: ${totalCartWeightKg.toFixed(2)} কেজি`,
        },
      });

      // Clear cart optimistically
      setCart([]);
    } catch (e) {
      Alert.alert("ত্রুটি", "পেমেন্ট গেটওয়েতে যেতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।");
    } finally {
      setSubmittingCheckout(false);
    }
  };

  // Submit New Listing by Local Artisan
  const handleCreateListingSubmit = async () => {
    if (!sellBanglaName.trim() || !sellPrice.trim() || !sellerName.trim() || !sellerPhone.trim()) {
      Alert.alert("অসম্পূর্ণ তথ্য", "দয়া করে পণ্যের নাম, বিক্রয় মূল্য, কারিগরের নাম ও মোবাইল নম্বর পূরণ করুন।");
      return;
    }

    try {
      setSubmittingListing(true);
      const newProd = await localMarketplaceService.createProductListing({
        name: sellName.trim() || sellBanglaName.trim(),
        bangla_name: sellBanglaName.trim(),
        region: sellRegion,
        category: sellCategory,
        price: parseInt(sellPrice, 10) || 1200,
        weight_or_unit: sellUnit.trim() || "১টি আইটেম",
        seller_name: sellerName.trim(),
        seller_phone: sellerPhone.trim(),
        description: sellDesc.trim() || "আঞ্চলিক হস্তশিল্পীদের হাতে তৈরি খাঁটি স্থানীয় পণ্য।",
      });

      Alert.alert(
        "🎉 লিস্টিং সফল হয়েছে!",
        `ধন্যবাদ! আপনার পণ্য "${newProd.bangla_name}" মার্কেটপ্লেসে যুক্ত হয়েছে।`,
        [
          {
            text: "ঠিক আছে",
            onPress: () => {
              setShowSellModal(false);
              loadInventory();
              setSellName("");
              setSellBanglaName("");
              setSellDesc("");
            },
          },
        ]
      );
    } catch {
      Alert.alert("ত্রুটি", "পণ্য যোগ করা সম্ভব হয়নি।");
    } finally {
      setSubmittingListing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#582408" />

      {/* Floating Optimistic Cart Toast */}
      {toastMessage && (
        <View style={styles.floatingToast}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.floatingToastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Main Header with Heritage Theme & Optimistic Cart Badge */}
      <LinearGradient colors={["#582408", THEME_PRIMARY, THEME_ACCENT]} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginStart: 12 }}>
            <View style={styles.badgeGov}>
              <Ionicons name="shield-checkmark" size={12} color="#FEF3C7" />
              <Text style={styles.badgeGovText}>ভৌগোলিক নির্দেশক (GI) সংরক্ষিত</Text>
            </View>
            <Text style={styles.headerTitle}>আঞ্চলিক হস্তশিল্প ও স্যুভেনির</Text>
            <Text style={styles.headerSubtitle}>
              সরাসরি স্থানীয় তাঁতি ও কারিগরদের থেকে ১০০% আসল পণ্য
            </Text>
          </View>

          {/* Sell Button */}
          <TouchableOpacity
            style={styles.sellBtnHeader}
            onPress={() => setShowSellModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={16} color="#78350F" />
            <Text style={styles.sellBtnHeaderText}>পণ্য বেচুন</Text>
          </TouchableOpacity>

          {/* Optimistic Cart Button with Pulse Animation */}
          <TouchableOpacity
            style={styles.cartHeaderBtn}
            onPress={openCartDrawer}
            activeOpacity={0.85}
          >
            <Ionicons name="bag-handle" size={24} color="#FFFFFF" />
            {totalCartCount > 0 && (
              <Animated.View
                style={[
                  styles.cartBadgePill,
                  {
                    transform: [{ scale: cartScaleAnim }],
                  },
                ]}
              >
                <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#78350F" />
          <TextInput
            style={styles.searchInput}
            placeholder="জামদানি, মধু, নকশিকাঁথা, সিল্ক বা অঞ্চল খুঁজুন..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Region Category Chips Scroll */}
      <View style={styles.regionScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionChipsRow}
        >
          {REGION_FILTERS.map((reg) => {
            const active = selectedRegion === reg.id;
            return (
              <TouchableOpacity
                key={reg.id}
                style={[styles.regionChip, active && styles.regionChipActive]}
                onPress={() => setSelectedRegion(reg.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={reg.icon as any}
                  size={14}
                  color={active ? "#FFFFFF" : "#78350F"}
                />
                <Text
                  style={[
                    styles.regionChipText,
                    active && styles.regionChipTextActive,
                  ]}
                >
                  {reg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsRow}
        >
          {CATEGORY_TABS.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTab, active && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    active && styles.categoryTabTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content ScrollView with Pull-to-Refresh */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            colors={[THEME_ACCENT, THEME_PRIMARY]}
            tintColor={THEME_ACCENT}
          />
        }
      >
        {/* Heritage Geographic Indication (GI) Spotlight Banner */}
        <View style={styles.spotlightBannerCard}>
          <LinearGradient
            colors={["#92400E", "#78350F", "#451A03"]}
            style={styles.spotlightGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={{ flex: 1, paddingEnd: 10 }}>
              <View style={styles.spotlightTagRow}>
                <View style={styles.giGoldPill}>
                  <Ionicons name="ribbon" size={12} color="#78350F" />
                  <Text style={styles.giGoldPillText}>GI Authentic Verified</Text>
                </View>
                <Text style={styles.spotlightSubtext}>ন্যায্যমূল্যে কারিগর উন্নয়ন</Text>
              </View>
              <Text style={styles.spotlightTitle}>
                বাংলাদেশের গৌরবোজ্জ্বল জিআই হস্তশিল্প সম্ভার
              </Text>
              <Text style={styles.spotlightDesc}>
                নারায়ণগঞ্জের জামদানি, সুন্দরবনের মধু, জামালপুরের নকশিকাঁথা ও রাজশাহীর খাঁটি সিল্ক। কোনো মধ্যস্বত্বভোগী ছাড়া সরাসরি তাঁতি ও মৌয়ালদের হাতে আর্থিক মূল্য পৌঁছে দিন।
              </Text>
            </View>
            <View style={styles.spotlightIconWrapper}>
              <MaterialCommunityIcons name="seal-variant" size={44} color="#FDE68A" />
              <Text style={styles.spotlightIconLabel}>১০০% খাঁটি</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Products Grid Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              আঞ্চলিক হস্তশিল্প ও ঐতিহ্য ({products.length})
            </Text>
            <Text style={styles.sectionSub}>
              ট্যাপ করে কারিগরের বায়ো ও সনদপত্র দেখুন
            </Text>
          </View>
          <View style={styles.deliveryBadge}>
            <Ionicons name="cube-outline" size={13} color="#059669" />
            <Text style={styles.deliveryBadgeText}>ওজন অনুযায়ী হোম কুরিয়ার</Text>
          </View>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME_ACCENT} />
            <Text style={styles.loadingText}>ঐতিহ্যবাহী পণ্যসম্ভার লোড হচ্ছে...</Text>
          </View>
        ) : fetchError ? (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <ErrorStateCard
              title="পণ্য লোড করা সম্ভব হয়নি"
              message={fetchError}
              retryText="পুনরায় চেষ্টা করুন"
              onRetry={loadInventory}
            />
          </View>
        ) : products.length === 0 ? (
          <View style={{ marginHorizontal: 16, marginVertical: 20 }}>
            <EmptyStateView
              icon="basket-outline"
              title="কোনো পণ্য খুঁজে পাওয়া যায়নি"
              description="অন্য অঞ্চল বা কি-ওয়ার্ড দিয়ে সার্চ করে দেখুন।"
              actionText="সব পণ্য প্রদর্শন করুন"
              onAction={() => {
                setSelectedRegion("All");
                setSelectedCategory("all");
                setSearchQuery("");
              }}
            />
          </View>
        ) : (
          /* Requirement 1: Regional Origin Showcase Product Cards */
          <View style={styles.productsGrid}>
            {products.map((prod) => (
              <TouchableOpacity
                key={prod.id}
                style={styles.productCard}
                onPress={() => openProductDetail(prod)}
                activeOpacity={0.92}
              >
                {/* Image & Badges */}
                <View style={styles.prodImgWrapper}>
                  <AppImage placeholderCategory="package"
                    source={{ uri: prod.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />

                  {/* Geographic Indication (GI) Ribbon Tag */}
                  <View style={styles.giRibbonBadge}>
                    <Ionicons name="ribbon" size={11} color="#FFFFFF" />
                    <Text style={styles.giRibbonText} numberOfLines={1}>
                      {prod.giTag}
                    </Text>
                  </View>

                  {/* Region Pill */}
                  <View style={styles.regionPill}>
                    <Text style={styles.regionPillText}>📍 {prod.region}</Text>
                  </View>

                  {/* Parcel Weight Indicator */}
                  <View style={styles.weightBadge}>
                    <Ionicons name="scale-outline" size={10} color="#F1F5F9" />
                    <Text style={styles.weightBadgeText}>{prod.weightKg} kg</Text>
                  </View>
                </View>

                {/* Info Container */}
                <View style={styles.productInfo}>
                  <Text style={styles.productBanglaName} numberOfLines={2}>
                    {prod.bangla_name}
                  </Text>
                  <Text style={styles.productEnglishName} numberOfLines={1}>
                    {prod.name}
                  </Text>

                  {/* Artisan & Lineage */}
                  <View style={styles.artisanSnippetRow}>
                    <AppImage placeholderCategory="package"
                      source={{ uri: prod.artisan.avatar }}
                      style={styles.artisanSnippetAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.artisanSnippetName} numberOfLines={1}>
                        {prod.artisan.banglaName}
                      </Text>
                      <Text style={styles.artisanSnippetCoop} numberOfLines={1}>
                        {prod.artisan.cooperative}
                      </Text>
                    </View>
                  </View>

                  {/* Ratings & Cert Badge */}
                  <View style={styles.ratingAndCertRow}>
                    <View style={styles.ratingBox}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingNum}>{prod.rating.toFixed(1)}</Text>
                      <Text style={styles.ratingCount}>({prod.reviews_count})</Text>
                    </View>
                    <View style={styles.verifiedArtisanBadge}>
                      <Ionicons name="shield-checkmark" size={11} color="#059669" />
                      <Text style={styles.verifiedArtisanText}>ভেরিফাইড কারিগর</Text>
                    </View>
                  </View>

                  {/* Price Row & Quick Add Button */}
                  <View style={styles.priceRow}>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                        <Text style={styles.priceCurrent}>৳{prod.price}</Text>
                        {prod.original_price && (
                          <Text style={styles.priceOld}>৳{prod.original_price}</Text>
                        )}
                      </View>
                      <Text style={styles.payoutArtisanTag}>
                        {prod.vendorPayout.artisanSharePct}% কারিগর লভ্যাংশ
                      </Text>
                    </View>

                    {/* Quick Add Optimistic Button */}
                    <TouchableOpacity
                      style={styles.quickAddBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        addToCartOptimistic(prod, 1);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cart" size={14} color="#FFFFFF" />
                      <Text style={styles.quickAddBtnText}>+ কার্ট</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Requirement 2: Product Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {detailProduct && (
          <SafeAreaView style={styles.modalDetailContainer} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Modal Header */}
            <View style={styles.modalDetailHeader}>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.modalDetailHeaderTitle} numberOfLines={1}>
                  {detailProduct.bangla_name}
                </Text>
                <Text style={styles.modalDetailHeaderSub}>
                  {detailProduct.giTag}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCartHeaderBtn}
                onPress={() => {
                  setDetailModalVisible(false);
                  openCartDrawer();
                }}
              >
                <Ionicons name="bag-handle-outline" size={22} color="#78350F" />
                {totalCartCount > 0 && (
                  <View style={styles.modalCartBadge}>
                    <Text style={styles.modalCartBadgeText}>{totalCartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* High Resolution Gallery Carousel */}
              <View style={styles.galleryContainer}>
                <AppImage placeholderCategory="package"
                  source={{ uri: detailProduct.galleryImages[activeGalleryIndex] || detailProduct.image_url }}
                  style={styles.galleryMainImage}
                  resizeMode="cover"
                />
                {/* GI Certified Official Floating Watermark */}
                <View style={styles.galleryGiOverlay}>
                  <Ionicons name="shield-checkmark" size={14} color="#FEF3C7" />
                  <Text style={styles.galleryGiOverlayText}>
                    {detailProduct.giCode}
                  </Text>
                </View>

                {/* Thumbnails */}
                {detailProduct.galleryImages.length > 1 && (
                  <View style={styles.thumbnailsRow}>
                    {detailProduct.galleryImages.map((img, idx) => (
                      <TouchableOpacity
                        key={`thumb-${img}-${idx}`}
                        style={[
                          styles.thumbnailBox,
                          activeGalleryIndex === idx && styles.thumbnailBoxActive,
                        ]}
                        onPress={() => setActiveGalleryIndex(idx)}
                      >
                        <AppImage placeholderCategory="package" source={{ uri: img }} style={styles.thumbnailImg} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.detailBody}>
                {/* Title and GI Tag Banner */}
                <View style={styles.giDetailBanner}>
                  <LinearGradient
                    colors={["#FFFBEB", "#FEF3C7"]}
                    style={styles.giDetailBannerGrad}
                  >
                    <Ionicons name="ribbon" size={24} color="#D97706" />
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.giDetailTitle}>
                        ভৌগোলিক নির্দেশক (GI) সনদপ্রাপ্ত স্থানীয় হস্তশিল্প
                      </Text>
                      <Text style={styles.giDetailSub}>
                        অঞ্চল: {detailProduct.region} • ট্র্যাকিং কোড: {detailProduct.giCode}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                <Text style={styles.detailBanglaName}>{detailProduct.bangla_name}</Text>
                <Text style={styles.detailEnglishName}>{detailProduct.name}</Text>

                {/* Price and Stock Row */}
                <View style={styles.detailPriceRow}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                      <Text style={styles.detailPriceCurrent}>৳{detailProduct.price}</Text>
                      {detailProduct.original_price && (
                        <Text style={styles.detailPriceOld}>৳{detailProduct.original_price}</Text>
                      )}
                    </View>
                    <Text style={styles.detailWeightText}>
                      প্যাকেজ ওজন: {detailProduct.dimensionsMeta.weightFormatted}
                    </Text>
                  </View>

                  <View style={styles.stockBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.stockBadgeText}>
                      স্টকে আছে ({detailProduct.stock_quantity} টি অবশিষ্ট)
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>পণ্যের বিশেষত্ব ও বিবরণ</Text>
                  <Text style={styles.detailDescriptionText}>
                    {detailProduct.description}
                  </Text>
                  <View style={styles.featurePillsRow}>
                    {detailProduct.features.map((feat, fidx) => (
                      <View key={fidx} style={styles.featurePill}>
                        <Ionicons name="checkmark-done" size={12} color="#047857" />
                        <Text style={styles.featurePillText}>{feat}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Specifications & Dimensions */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>সাইজ ও উপাদান স্পেসিফিকেশন</Text>
                  <View style={styles.specsTable}>
                    <View style={styles.specsTableRow}>
                      <Text style={styles.specKey}>পরিমাপ / সাইজ</Text>
                      <Text style={styles.specVal}>{detailProduct.dimensionsMeta.dimensions}</Text>
                    </View>
                    <View style={styles.specsTableRow}>
                      <Text style={styles.specKey}>উপাদান (Materials)</Text>
                      <Text style={styles.specVal}>{detailProduct.dimensionsMeta.materials}</Text>
                    </View>
                    <View style={styles.specsTableRow}>
                      <Text style={styles.specKey}>তৈরির পদ্ধতি</Text>
                      <Text style={styles.specVal}>{detailProduct.dimensionsMeta.craftMethod}</Text>
                    </View>
                    <View style={styles.specsTableRow}>
                      <Text style={styles.specKey}>প্যাকেজিং ধরন</Text>
                      <Text style={styles.specVal}>{detailProduct.dimensionsMeta.packaging}</Text>
                    </View>
                  </View>
                </View>

                {/* Artisan Biography Card */}
                <View style={styles.artisanBioCard}>
                  <LinearGradient
                    colors={["#FAF5FF", "#F3E8FF"]}
                    style={styles.artisanBioGradient}
                  >
                    <View style={styles.artisanBioTop}>
                      <AppImage placeholderCategory="package"
                        source={{ uri: detailProduct.artisan.avatar }}
                        style={styles.artisanBioAvatar}
                      />
                      <View style={{ flex: 1, marginStart: 12 }}>
                        <Text style={styles.artisanBioName}>
                          {detailProduct.artisan.banglaName}
                        </Text>
                        <Text style={styles.artisanBioRole}>
                          {detailProduct.artisan.role} • {detailProduct.artisan.experienceYears} বছরের অভিজ্ঞতা
                        </Text>
                        <Text style={styles.artisanBioLoc}>
                          📍 {detailProduct.artisan.location}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.artisanBioStory}>
                      "{detailProduct.artisan.story}"
                    </Text>

                    {detailProduct.artisan.award && (
                      <View style={styles.artisanAwardRow}>
                        <Ionicons name="trophy" size={14} color="#D97706" />
                        <Text style={styles.artisanAwardText}>
                          {detailProduct.artisan.award}
                        </Text>
                      </View>
                    )}

                    <View style={styles.artisanCoopFooter}>
                      <Ionicons name="people-outline" size={14} color="#7E22CE" />
                      <Text style={styles.artisanCoopFooterText}>
                        সমবায়: {detailProduct.artisan.cooperative}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Material Certificates */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>প্রমাণিত সনদপত্র ও মান নিয়ন্ত্রণ</Text>
                  {detailProduct.certificates.map((cert) => (
                    <View key={cert.id} style={styles.certCard}>
                      <View style={styles.certIconBox}>
                        <Ionicons name="ribbon-outline" size={20} color="#D97706" />
                      </View>
                      <View style={{ flex: 1, marginStart: 10 }}>
                        <Text style={styles.certName}>{cert.name}</Text>
                        <Text style={styles.certIssuer}>প্রদানকারী: {cert.issuer}</Text>
                        <Text style={styles.certCode}>সনদ নং: {cert.code}</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    </View>
                  ))}
                </View>

                {/* Customer Reviews & Ratings */}
                <View style={styles.detailSectionBox}>
                  <View style={styles.reviewsHeaderRow}>
                    <Text style={styles.detailSectionHeader}>ক্রেতাদের অভিজ্ঞতা ও রিভিউ</Text>
                    <View style={styles.ratingBadgeLarge}>
                      <Ionicons name="star" size={14} color="#FFFFFF" />
                      <Text style={styles.ratingBadgeLargeText}>
                        {detailProduct.rating.toFixed(1)} / ৫.০ ({detailProduct.reviews_count})
                      </Text>
                    </View>
                  </View>

                  {detailProduct.customerReviews.map((rev) => (
                    <View key={rev.id} style={styles.reviewItemCard}>
                      <View style={styles.reviewAuthorRow}>
                        <View style={styles.reviewAvatarCircle}>
                          <Text style={styles.reviewAvatarInitial}>
                            {rev.author.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginStart: 8 }}>
                          <Text style={styles.reviewAuthorName}>{rev.author}</Text>
                          <Text style={styles.reviewLocation}>
                            {rev.location} • {rev.date}
                          </Text>
                        </View>
                        {rev.verifiedBuyer && (
                          <View style={styles.verifiedBuyerPill}>
                            <Ionicons name="checkmark-circle" size={11} color="#059669" />
                            <Text style={styles.verifiedBuyerText}>সরাসরি ক্রেতা</Text>
                          </View>
                        )}
                      </View>

                      {/* Stars */}
                      <View style={styles.reviewStarsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= rev.rating ? "star" : "star-outline"}
                            size={13}
                            color="#F59E0B"
                          />
                        ))}
                      </View>

                      <Text style={styles.reviewCommentText}>{rev.comment}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 100 }} />
              </View>
            </ScrollView>

            {/* Bottom Bar: Quantity and Add to Cart */}
            <View style={styles.detailBottomBar}>
              <View style={styles.detailQtyControls}>
                <TouchableOpacity
                  style={styles.detailQtyBtn}
                  onPress={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                >
                  <Ionicons name="remove" size={18} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.detailQtyVal}>{detailQuantity}</Text>
                <TouchableOpacity
                  style={styles.detailQtyBtn}
                  onPress={() => setDetailQuantity(detailQuantity + 1)}
                >
                  <Ionicons name="add" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.detailAddToCartBtn}
                onPress={() => {
                  addToCartOptimistic(detailProduct, detailQuantity);
                  setDetailModalVisible(false);
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="cart" size={18} color="#FFFFFF" />
                <Text style={styles.detailAddToCartText}>
                  কার্টে যোগ করুন (৳{detailProduct.price * detailQuantity})
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* Requirement 3: Cart & Delivery Drawer (Sliding Bottom Sheet) */}
      <Modal
        visible={isCartDrawerOpen}
        transparent={true}
        animationType="none"
        onRequestClose={closeCartDrawer}
      >
        <View style={styles.drawerBackdrop}>
          <Animated.View
            style={[
              styles.drawerBackdropDismissArea,
              { opacity: drawerBackdropAnim },
            ]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeCartDrawer}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawerSheetContainer,
              {
                transform: [{ translateY: drawerSlideAnim }],
              },
            ]}
          >
            {/* Drawer Handle */}
            <View style={styles.drawerHandleBar} />

            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>শপিং কার্ট ও কুরিয়ার ডেলিভারি</Text>
                <Text style={styles.drawerSub}>
                  {cart.length} টি আইটেম • পার্সেল ওজন: {totalCartWeightKg.toFixed(2)} কেজি
                </Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={closeCartDrawer}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Cart Items List */}
              {cart.length === 0 ? (
                <View style={styles.drawerEmptyBox}>
                  <Ionicons name="basket-outline" size={48} color="#94A3B8" />
                  <Text style={styles.drawerEmptyText}>আপনার কার্ট এখনো খালি</Text>
                  <Text style={styles.drawerEmptySub}>
                    ঐতিহ্যবাহী পণ্য নির্বাচন করে কার্টে যোগ করুন।
                  </Text>
                </View>
              ) : (
                <View style={styles.cartItemsSection}>
                  {cart.map((item) => (
                    <View key={item.product.id} style={styles.cartItemRow}>
                      <AppImage placeholderCategory="package"
                        source={{ uri: item.product.image_url }}
                        style={styles.cartItemImg}
                      />
                      <View style={{ flex: 1, marginStart: 10 }}>
                        <Text style={styles.cartItemName} numberOfLines={1}>
                          {item.product.bangla_name}
                        </Text>
                        <Text style={styles.cartItemRegion}>
                          {item.product.giTag}
                        </Text>
                        <Text style={styles.cartItemUnitPrice}>
                          ৳{item.product.price} × {item.quantity} = ৳{item.product.price * item.quantity}
                        </Text>
                        <Text style={styles.cartItemWeight}>
                          ওজন: {(item.product.weightKg * item.quantity).toFixed(2)} কেজি
                        </Text>
                      </View>

                      {/* Stepper */}
                      <View style={styles.cartStepperBox}>
                        <TouchableOpacity
                          style={styles.cartStepBtn}
                          onPress={() => updateCartQuantityOptimistic(item.product.id, -1)}
                        >
                          <Ionicons name="remove" size={14} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.cartStepVal}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.cartStepBtn}
                          onPress={() => updateCartQuantityOptimistic(item.product.id, 1)}
                        >
                          <Ionicons name="add" size={14} color="#0F172A" />
                        </TouchableOpacity>
                      </View>

                      {/* Trash */}
                      <TouchableOpacity
                        style={styles.cartDeleteBtn}
                        onPress={() => removeCartItem(item.product.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Local Courier Delivery Address Section */}
              {cart.length > 0 && (
                <View style={styles.deliveryFormSection}>
                  <View style={styles.deliverySectionHeaderRow}>
                    <Ionicons name="location" size={18} color="#D97706" />
                    <Text style={styles.deliverySectionTitle}>কুরিয়ার ডেলিভারি ঠিকানা</Text>
                  </View>

                  {/* Recipient Name */}
                  <Text style={styles.inputLabel}>প্রাপকের পুরো নাম *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: তানভীর আহমেদ"
                    placeholderTextColor="#94A3B8"
                    value={recipientName}
                    onChangeText={setRecipientName}
                  />

                  {/* Recipient Phone */}
                  <Text style={styles.inputLabel}>সচল মোবাইল নম্বর *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: 01712345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                  />

                  {/* Delivery District Switcher */}
                  <Text style={styles.inputLabel}>ডেলিভারি এলাকা নির্বাচন করুন</Text>
                  <View style={styles.districtToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.districtTogglePill,
                        isDhaka && styles.districtTogglePillActive,
                      ]}
                      onPress={() => {
                        setIsDhaka(true);
                        setDeliveryDistrict("Dhaka City");
                      }}
                    >
                      <Ionicons
                        name="business-outline"
                        size={16}
                        color={isDhaka ? "#FFFFFF" : "#475569"}
                      />
                      <Text
                        style={[
                          styles.districtToggleText,
                          isDhaka && styles.districtToggleTextActive,
                        ]}
                      >
                        ঢাকা সিটি (Base ৳৬০)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.districtTogglePill,
                        !isDhaka && styles.districtTogglePillActive,
                      ]}
                      onPress={() => {
                        setIsDhaka(false);
                        setDeliveryDistrict("ঢাকার বাইরে / অন্য জেলা");
                      }}
                    >
                      <Ionicons
                        name="map-outline"
                        size={16}
                        color={!isDhaka ? "#FFFFFF" : "#475569"}
                      />
                      <Text
                        style={[
                          styles.districtToggleText,
                          !isDhaka && styles.districtToggleTextActive,
                        ]}
                      >
                        ঢাকার বাইরে (Base ৳১২০)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Address input */}
                  <Text style={styles.inputLabel}>সম্পূর্ণ ডেলিভারি ঠিকানা *</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: "top" }]}
                    placeholder="বাসা নম্বর, রোড, এলাকা, থানা ও ল্যান্ডমার্ক..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                  />

                  {/* Local Courier Partner Selector */}
                  <Text style={styles.inputLabel}>কুরিয়ার পার্টনার নির্বাচন করুন</Text>
                  <View style={styles.couriersRow}>
                    {COURIER_PARTNERS.map((cp) => {
                      const isSelected = selectedCourier === cp.id;
                      return (
                        <TouchableOpacity
                          key={cp.id}
                          style={[
                            styles.courierCard,
                            isSelected && styles.courierCardSelected,
                          ]}
                          onPress={() => setSelectedCourier(cp.id)}
                        >
                          <Ionicons
                            name={cp.icon as any}
                            size={16}
                            color={isSelected ? "#78350F" : "#64748B"}
                          />
                          <Text
                            style={[
                              styles.courierName,
                              isSelected && styles.courierNameSelected,
                            ]}
                          >
                            {cp.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Weight-based Delivery Calculation Breakdown */}
                  <View style={styles.costCalculationCard}>
                    <Text style={styles.costCalculationTitle}>
                      ওজন-ভিত্তিক ডেলিভারি ও বিল বিবরণী
                    </Text>

                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>পণ্যের মোট মূল্য</Text>
                      <Text style={styles.costVal}>৳{cartSubtotal.toLocaleString("en-BD")}</Text>
                    </View>

                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
                        মোট ওজন ({totalCartWeightKg.toFixed(2)} kg)
                      </Text>
                      <Text style={styles.costWeightNote}>
                        {totalCartWeightKg <= 1.0
                          ? "বেস প্যাকেজ (১ কেজি পর্যন্ত)"
                          : `অতিরিক্ত ${(totalCartWeightKg - 1.0).toFixed(2)} kg চার্জযুক্ত`}
                      </Text>
                    </View>

                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>
                        কুরিয়ার ডেলিভারি চার্জ ({isDhaka ? "ঢাকা সিটি" : "সারাদেশ"})
                      </Text>
                      <Text style={styles.costVal}>৳{deliveryFee}</Text>
                    </View>

                    <View style={styles.costDivider} />

                    <View style={styles.costRow}>
                      <Text style={styles.costTotalLabel}>সর্বমোট প্রদেয় বিল</Text>
                      <Text style={styles.costTotalVal}>
                        ৳{totalOrderValue.toLocaleString("en-BD")}
                      </Text>
                    </View>

                    {/* Vendor Payout Notice */}
                    <View style={styles.vendorPayoutCard}>
                      <Ionicons name="information-circle" size={16} color="#059669" />
                      <Text style={styles.vendorPayoutNoticeText}>
                        {primaryVendorPayout}
                      </Text>
                    </View>
                  </View>

                  {/* Requirement 4: Checkout Pipeline to payments-enhanced.tsx */}
                  <TouchableOpacity
                    style={styles.checkoutSubmitBtn}
                    onPress={handleProceedToCheckout}
                    disabled={submittingCheckout}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={[THEME_ACCENT, THEME_PRIMARY]}
                      style={styles.checkoutSubmitGrad}
                    >
                      {submittingCheckout ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="card" size={18} color="#FFFFFF" />
                          <Text style={styles.checkoutSubmitText}>
                            পেমেন্টে এগিয়ে যান (৳{totalOrderValue.toLocaleString("en-BD")})
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={{ height: 35 }} />
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Local Artisan Listing Registration Modal */}
      <Modal
        visible={showSellModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSellModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>স্থানীয় হস্তশিল্প লিস্টিং</Text>
                <Text style={styles.modalSubHeader}>
                  আপনার এলাকার খাঁটি হস্তশিল্প বা খাদ্যপণ্য বিক্রি করুন
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSellModal(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>পণ্যের বাংলা নাম *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: জামালপুরের আসল নকশিকাঁথা"
                placeholderTextColor="#94A3B8"
                value={sellBanglaName}
                onChangeText={setSellBanglaName}
              />

              <Text style={styles.inputLabel}>অঞ্চল / জেলা *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: নারায়ণগঞ্জ, সুন্দরবন, জামালপুর, রাজশাহী"
                placeholderTextColor="#94A3B8"
                value={sellRegion}
                onChangeText={setSellRegion}
              />

              <View style={styles.twoColsRow}>
                <View style={{ flex: 1, marginEnd: 6 }}>
                  <Text style={styles.inputLabel}>বিক্রয় মূল্য (৳) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: 2800"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={sellPrice}
                    onChangeText={setSellPrice}
                  />
                </View>

                <View style={{ flex: 1, marginStart: 6 }}>
                  <Text style={styles.inputLabel}>ওজন / সাইজ</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="যেমন: ৮৫০ গ্রাম / ১ কেজি"
                    placeholderTextColor="#94A3B8"
                    value={sellUnit}
                    onChangeText={setSellUnit}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>কারিগর বা সমবায়ের নাম *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: রূপগঞ্জ তাঁতী কল্যাণ পরিষদ"
                placeholderTextColor="#94A3B8"
                value={sellerName}
                onChangeText={setSellerName}
              />

              <Text style={styles.inputLabel}>মোবাইল নম্বর (পেমেন্ট একাউন্ট) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="যেমন: 017XXXXXXXX (বিকাশ / নগদ একাউন্ট)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={sellerPhone}
                onChangeText={setSellerPhone}
              />

              <Text style={styles.inputLabel}>পণ্যের বিশেষত্ব ও কারিগরি বিবরণ</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                placeholder="বুনন পদ্ধতি, উপাদান ও ভৌগোলিক বিশেষত্ব লিখুন..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={sellDesc}
                onChangeText={setSellDesc}
              />

              <TouchableOpacity
                style={styles.checkoutSubmitBtn}
                onPress={handleCreateListingSubmit}
                disabled={submittingListing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#059669", "#047857"]}
                  style={styles.checkoutSubmitGrad}
                >
                  {submittingListing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.checkoutSubmitText}>
                      মার্কেটপ্লেসে পণ্য যুক্ত করুন
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  floatingToast: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.25)" } : {}),
  },
  floatingToastText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGov: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  badgeGovText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FEF3C7",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#FEF3C7",
    marginTop: 1,
  },
  sellBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginEnd: 8,
  },
  sellBtnHeaderText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#78350F",
  },
  cartHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadgePill: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#DC2626",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  regionScrollWrapper: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  regionChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  regionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  regionChipActive: {
    backgroundColor: THEME_ACCENT,
    borderColor: THEME_ACCENT,
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#78350F",
  },
  regionChipTextActive: {
    color: "#FFFFFF",
  },
  categoryTabsContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryTabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  categoryTabActive: {
    backgroundColor: "#78350F",
  },
  categoryTabText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  spotlightBannerCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 8px rgba(15, 23, 42, 0.1)" } : {}),
  },
  spotlightGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  spotlightTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  giGoldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  giGoldPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#78350F",
  },
  spotlightSubtext: {
    fontSize: 10.5,
    color: "#FDE68A",
  },
  spotlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  spotlightDesc: {
    fontSize: 11,
    color: "#FEF3C7",
    marginTop: 4,
    lineHeight: 15,
  },
  spotlightIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  spotlightIconLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FDE68A",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 10,
  },
  emptyBox: {
    paddingVertical: 50,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  resetFilterBtn: {
    marginTop: 16,
    backgroundColor: THEME_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetFilterBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 5px rgba(15, 23, 42, 0.05)" } : {}),
  },
  prodImgWrapper: {
    position: "relative",
    width: "100%",
    height: 130,
  },
  productImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
  },
  giRibbonBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(120, 53, 15, 0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  giRibbonText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  regionPill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  regionPillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  weightBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weightBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  productInfo: {
    padding: 10,
  },
  productBanglaName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 17,
    minHeight: 34,
  },
  productEnglishName: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  artisanSnippetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 4,
    borderRadius: 8,
  },
  artisanSnippetAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  artisanSnippetName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  artisanSnippetCoop: {
    fontSize: 8.5,
    color: "#64748B",
  },
  ratingAndCertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingNum: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingCount: {
    fontSize: 9.5,
    color: "#64748B",
  },
  verifiedArtisanBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  verifiedArtisanText: {
    fontSize: 8.5,
    color: "#059669",
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  priceCurrent: {
    fontSize: 14.5,
    fontWeight: "900",
    color: THEME_ACCENT,
  },
  priceOld: {
    fontSize: 10,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    marginStart: 4,
  },
  payoutArtisanTag: {
    fontSize: 8.5,
    color: "#059669",
    fontWeight: "700",
    marginTop: 1,
  },
  quickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: THEME_PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickAddBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Product Detail Modal Styles
  modalDetailContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  modalCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDetailHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalDetailHeaderSub: {
    fontSize: 10.5,
    color: "#78350F",
    fontWeight: "700",
  },
  modalCartHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  modalCartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#DC2626",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCartBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  galleryContainer: {
    width: "100%",
    backgroundColor: "#F1F5F9",
  },
  galleryMainImage: {
    width: "100%",
    height: 250,
  },
  galleryGiOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(120, 53, 15, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  galleryGiOverlayText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  thumbnailsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  thumbnailBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailBoxActive: {
    borderColor: THEME_ACCENT,
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
  },
  detailBody: {
    padding: 16,
  },
  giDetailBanner: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  giDetailBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  giDetailTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#78350F",
  },
  giDetailSub: {
    fontSize: 10.5,
    color: "#B45309",
    marginTop: 2,
  },
  detailBanglaName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 26,
  },
  detailEnglishName: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  detailPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailPriceCurrent: {
    fontSize: 22,
    fontWeight: "900",
    color: THEME_ACCENT,
  },
  detailPriceOld: {
    fontSize: 14,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    marginStart: 8,
  },
  detailWeightText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#059669",
  },
  detailSectionBox: {
    marginTop: 16,
  },
  detailSectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  detailDescriptionText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  featurePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  specsTable: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  specsTableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  specKey: {
    width: "35%",
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  specVal: {
    flex: 1,
    fontSize: 11.5,
    color: "#0F172A",
  },
  artisanBioCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  artisanBioGradient: {
    padding: 14,
  },
  artisanBioTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  artisanBioAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#A855F7",
  },
  artisanBioName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#581C87",
  },
  artisanBioRole: {
    fontSize: 11,
    color: "#7E22CE",
    marginTop: 1,
  },
  artisanBioLoc: {
    fontSize: 10.5,
    color: "#6B21A8",
  },
  artisanBioStory: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#3B0764",
    lineHeight: 18,
    marginTop: 10,
  },
  artisanAwardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  artisanAwardText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#78350F",
  },
  artisanCoopFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  artisanCoopFooterText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#6B21A8",
  },
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  certIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  certName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  certIssuer: {
    fontSize: 10.5,
    color: "#475569",
  },
  certCode: {
    fontSize: 10,
    color: "#78350F",
    fontWeight: "700",
    marginTop: 1,
  },
  reviewsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ratingBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME_ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingBadgeLargeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  reviewItemCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarInitial: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewAuthorName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  reviewLocation: {
    fontSize: 10,
    color: "#64748B",
  },
  verifiedBuyerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBuyerText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#059669",
  },
  reviewStarsRow: {
    flexDirection: "row",
    gap: 2,
    marginVertical: 4,
  },
  reviewCommentText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },
  detailBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  detailQtyControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 8,
  },
  detailQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailQtyVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 18,
    textAlign: "center",
  },
  detailAddToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME_PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
  },
  detailAddToCartText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Drawer Bottom Sheet Styles
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  drawerBackdropDismissArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  drawerSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    ...(Platform.OS === "web" ? { boxShadow: "0px -6px 12px rgba(15, 23, 42, 0.15)" } : {}),
  },
  drawerHandleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  drawerSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerEmptyBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  drawerEmptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
  },
  drawerEmptySub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cartItemsSection: {
    paddingVertical: 10,
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  cartItemImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  cartItemName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  cartItemRegion: {
    fontSize: 10,
    color: "#78350F",
    fontWeight: "700",
  },
  cartItemUnitPrice: {
    fontSize: 11.5,
    fontWeight: "800",
    color: THEME_ACCENT,
    marginTop: 1,
  },
  cartItemWeight: {
    fontSize: 9.5,
    color: "#64748B",
  },
  cartStepperBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 2,
    gap: 6,
  },
  cartStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cartStepVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 14,
    textAlign: "center",
  },
  cartDeleteBtn: {
    marginStart: 8,
    padding: 6,
  },

  // Courier & Delivery Form Styles
  deliveryFormSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  deliverySectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  deliverySectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  districtToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  districtTogglePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  districtTogglePillActive: {
    backgroundColor: THEME_PRIMARY,
    borderColor: THEME_PRIMARY,
  },
  districtToggleText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
  },
  districtToggleTextActive: {
    color: "#FFFFFF",
  },
  couriersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  courierCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  courierCardSelected: {
    backgroundColor: "#FEF3C7",
    borderColor: THEME_ACCENT,
  },
  courierName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  courierNameSelected: {
    color: "#78350F",
  },
  costCalculationCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  costCalculationTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#78350F",
    marginBottom: 8,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  costLabel: {
    fontSize: 12,
    color: "#78350F",
  },
  costVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  costWeightNote: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#D97706",
  },
  costDivider: {
    height: 1,
    backgroundColor: "#FCD34D",
    marginVertical: 6,
  },
  costTotalLabel: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#78350F",
  },
  costTotalVal: {
    fontSize: 16,
    fontWeight: "900",
    color: THEME_ACCENT,
  },
  vendorPayoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  vendorPayoutNoticeText: {
    fontSize: 10,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
  },
  checkoutSubmitBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 14,
  },
  checkoutSubmitGrad: {
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutSubmitText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Modal Generic Form Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentLarge: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubHeader: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  twoColsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
