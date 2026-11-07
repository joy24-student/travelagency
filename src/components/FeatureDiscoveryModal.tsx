import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

export interface FeatureItem {
  id: string;
  category: "booking" | "ai" | "safety" | "social" | "fintech";
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  badge?: string;
  keywords: string[];
}

export const APP_FEATURES: FeatureItem[] = [
  // ─── 1. Travel & Booking ───────────────────────────────────────────────
  {
    id: "search-stays",
    category: "booking",
    titleBn: "হোটেল ও স্টে",
    titleEn: "Hotels & Stays",
    subtitleBn: "যাচাইকৃত হোটেল, রিসোর্ট ও ভিলা বুকিং",
    subtitleEn: "Verified hotels, resorts & home stays",
    icon: "bed-outline",
    color: "#0055F2",
    route: "/screens/search-stays",
    badge: "POPULAR",
    keywords: ["hotel", "stay", "resort", "room", "হোটেল", "রিসোর্ট", "থাকা"],
  },
  {
    id: "flights",
    category: "booking",
    titleBn: "ফ্লাইট টিকিট",
    titleEn: "Flight Bookings",
    subtitleBn: "দেশি-বিদেশি এয়ারলাইন্সের সেরা ভাড়ায় টিকিট",
    subtitleEn: "Domestic & international air tickets",
    icon: "airplane-outline",
    color: "#2563EB",
    route: "/screens/flights",
    badge: "DISCOUNT",
    keywords: ["flight", "plane", "ticket", "airline", "ফ্লাইট", "বিমান", "টিকিট"],
  },
  {
    id: "trains",
    category: "booking",
    titleBn: "ট্রেন টিকিট",
    titleEn: "Train Tickets",
    subtitleBn: "বাংলাদেশ রেলওয়ের এক্সপ্রেস আসন ও বুকিং",
    subtitleEn: "Bangladesh Railway express seats & schedules",
    icon: "train-outline",
    color: "#059669",
    route: "/screens/trains",
    badge: "FAST",
    keywords: ["train", "railway", "seat", "ট্রেন", "রেল", "সিট"],
  },
  {
    id: "bus-launch",
    category: "booking",
    titleBn: "বাস ও লঞ্চ",
    titleEn: "Bus & Launch",
    subtitleBn: "এসি/নন-এসি বাস ও কেবিন বুকিং",
    subtitleEn: "Intercity bus & water launch cabin booking",
    icon: "bus-outline",
    color: "#7C3AED",
    route: "/screens/bus-launch",
    keywords: ["bus", "launch", "cabin", "বাস", "লঞ্চ", "কেবিন"],
  },
  {
    id: "packages",
    category: "booking",
    titleBn: "ট্যুর প্যাকেজ",
    titleEn: "Tour Packages",
    subtitleBn: "সম্পূর্ণ সাজানো অবকাশ যাপন প্যাকেজ",
    subtitleEn: "All-inclusive guided tour packages",
    icon: "briefcase-outline",
    color: "#D97706",
    route: "/screens/packages",
    badge: "ALL-IN-ONE",
    keywords: ["package", "tour", "holiday", "প্যাকেজ", "ভ্রমণ"],
  },
  {
    id: "recommended-tours",
    category: "booking",
    titleBn: "জনপ্রিয় ট্যুর",
    titleEn: "Recommended Tours",
    subtitleBn: "সেরা রেটিংপ্রাপ্ত ভ্রমণ গন্তব্যসমূহ",
    subtitleEn: "Top-rated destinations and tourist spots",
    icon: "sparkles-outline",
    color: "#EA580C",
    route: "/screens/recommended-tours",
    keywords: ["recommend", "tour", "popular", "সেরা", "ট্যুর"],
  },
  {
    id: "car-rentals",
    category: "booking",
    titleBn: "কার রেন্টাল",
    titleEn: "Car Rentals",
    subtitleBn: "শহরের ভেতর ও দূরপাল্লার গাড়ি ভাড়া",
    subtitleEn: "Chauffeur-driven & city rental cars",
    icon: "car-sport-outline",
    color: "#0284C7",
    route: "/screens/car-rentals",
    keywords: ["car", "rental", "drive", "গাড়ি", "রেন্ট"],
  },
  {
    id: "abroad-agency",
    category: "booking",
    titleBn: "বিদেশ গমন ও ভিসা",
    titleEn: "Abroad & Visa Agency",
    subtitleBn: "ভিসা প্রসেসিং, হজ ও ওমরাহ এজেন্সি",
    subtitleEn: "Visa processing & Hajj/Umrah agencies",
    icon: "globe-outline",
    color: "#0D9488",
    route: "/screens/abroad-agency",
    keywords: ["visa", "hajj", "umrah", "abroad", "ভিসা", "বিদেশ", "হজ"],
  },
  {
    id: "tour-guides",
    category: "booking",
    titleBn: "ভেরিফায়েড ট্যুর গাইড",
    titleEn: "Verified Tour Guides",
    subtitleBn: "অভিজ্ঞ স্থানীয় গাইডদের সাথে সরাসরি বুকিং",
    subtitleEn: "Hire certified local multilingual guides",
    icon: "compass-outline",
    color: "#16A34A",
    route: "/screens/tour-guides",
    badge: "VERIFIED",
    keywords: ["guide", "local", "tour guide", "গাইড"],
  },
  {
    id: "admission-bus",
    category: "booking",
    titleBn: "ভর্তি পরীক্ষা বাস",
    titleEn: "Student Admission Bus",
    subtitleBn: "বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থীদের স্পেশাল বাস",
    subtitleEn: "Dedicated university exam shuttle buses",
    icon: "school-outline",
    color: "#4F46E5",
    route: "/screens/admission-bus",
    keywords: ["admission", "student", "exam", "ভর্তি", "ছাত্র"],
  },

  // ─── 2. AI & Smart Tools ───────────────────────────────────────────────
  {
    id: "trip-planner",
    category: "ai",
    titleBn: "এআই ট্রিপ প্ল্যানার",
    titleEn: "AI Trip Planner",
    subtitleBn: "বাজেট ও আবহাওয়া অনুযায়ী সম্পূর্ণ ভ্রমণ পরিকল্পনা",
    subtitleEn: "Automated itinerary personalized by AI",
    icon: "color-wand-outline",
    color: "#8B5CF6",
    route: "/(tabs)/trips?tab=planner",
    badge: "AI POWERED",
    keywords: ["ai", "planner", "itinerary", "plan", "পরিকল্পনা", "এআই"],
  },
  {
    id: "landmark-scanner",
    category: "ai",
    titleBn: "ল্যান্ডমার্ক স্ক্যানার",
    titleEn: "Landmark Scanner",
    subtitleBn: "ক্যামেরা দিয়ে ঐতিহাসিক স্থান ও দর্শনীয় স্থান চিনুন",
    subtitleEn: "AI camera recognition for historic monuments",
    icon: "scan-outline",
    color: "#EC4899",
    route: "/screens/landmark-scanner",
    keywords: ["landmark", "camera", "scan", "ai", "স্ক্যান", "স্থান"],
  },
  {
    id: "luggage-measure",
    category: "ai",
    titleBn: "লাগেজ মাপক (AR)",
    titleEn: "AR Luggage Measure",
    subtitleBn: "এয়ারলাইন্সের ব্যাগেজ সাইজ এআর ক্যামেরায় মাপুন",
    subtitleEn: "Measure luggage dimensions using AR",
    icon: "cube-outline",
    color: "#F59E0B",
    route: "/screens/luggage-measure",
    keywords: ["luggage", "bag", "measure", "ar", "লাগেজ", "ব্যাগ"],
  },
  {
    id: "digital-passport",
    category: "ai",
    titleBn: "ডিজিটাল পাসপোর্ট ও ভল্ট",
    titleEn: "Digital Passport & Vault",
    subtitleBn: "সুরক্ষিত ডিজিটাল পাসপোর্ট ও ট্রাভেল ডকুমেন্টস",
    subtitleEn: "Encrypted travel documents and KYC passport",
    icon: "card-outline",
    color: "#10B981",
    route: "/screens/digital-passport",
    keywords: ["passport", "kyc", "documents", "পাসপোর্ট", "ডকুমেন্ট"],
  },
  {
    id: "travel-match",
    category: "ai",
    titleBn: "ট্রাভেল পার্টনার ম্যাচ",
    titleEn: "Travel Buddy Match",
    subtitleBn: "একই রুটের সহযাত্রীদের সাথে সহজে কানেক্ট হোন",
    subtitleEn: "Find matching travel buddies for trips",
    icon: "heart-outline",
    color: "#E11D48",
    route: "/screens/travel-match",
    keywords: ["match", "buddy", "partner", "বন্ধু", "সহযাত্রী"],
  },
  {
    id: "call-concierge",
    category: "ai",
    titleBn: "ভয়েস ও কল হেল্পলাইন",
    titleEn: "Voice & Video Helpline",
    subtitleBn: "লাইভ অডিও ও ভিডিও কলে সাপোর্ট গ্রহণ",
    subtitleEn: "High-definition travel concierge calling",
    icon: "call-outline",
    color: "#0284C7",
    route: "/screens/call",
    keywords: ["call", "voice", "video", "helpline", "কল", "হেল্প"],
  },

  // ─── 3. Safety & Survival ──────────────────────────────────────────────
  {
    id: "offline-survival",
    category: "safety",
    titleBn: "অফলাইন সারভাইভাল কিট",
    titleEn: "Offline Survival Kit",
    subtitleBn: "ইন্টারনেট ছাড়াই জরুরি গাইড, ম্যাপ ও টিপস",
    subtitleEn: "100% offline emergency maps & survival tips",
    icon: "shield-checkmark-outline",
    color: "#059669",
    route: "/screens/offline-survival",
    badge: "NO INTERNET",
    keywords: ["offline", "survival", "map", "emergency", "অফলাইন", "জরুরি"],
  },
  {
    id: "emergency-sos",
    category: "safety",
    titleBn: "জরুরি এসওএস (SOS)",
    titleEn: "Emergency SOS Services",
    subtitleBn: "পুলিশ, অ্যাম্বুলেন্স ও নিকটস্থ হাসপাতাল দ্রুত খুঁজুন",
    subtitleEn: "Instant access to 999, tourist police & hospitals",
    icon: "warning-outline",
    color: "#DC2626",
    route: "/screens/emergency",
    badge: "CRITICAL",
    keywords: ["emergency", "sos", "police", "hospital", "পুলিশ", "হাসপাতাল"],
  },
  {
    id: "customer-support",
    category: "safety",
    titleBn: "২৪/৭ কাস্টমার সাপোর্ট",
    titleEn: "24/7 Customer Support",
    subtitleBn: "যেকোনো বুকিং সমস্যায় তাৎক্ষণিক সহায়তা",
    subtitleEn: "Help center, dispute resolution & live tickets",
    icon: "headset-outline",
    color: "#2563EB",
    route: "/screens/customer-support",
    keywords: ["support", "help", "customer", "সাপোর্ট", "সাহায্য"],
  },
  {
    id: "service-chat",
    category: "safety",
    titleBn: "এজেন্সি লাইভ চ্যাট",
    titleEn: "Live Service Chat",
    subtitleBn: "হোটেল ও ট্রাভেল এজেন্সির সাথে সরাসরি চ্যাট",
    subtitleEn: "Real-time chat with hotel & travel operators",
    icon: "chatbubbles-outline",
    color: "#4F46E5",
    route: "/screens/service-chat",
    keywords: ["chat", "service", "message", "চ্যাট"],
  },

  // ─── 4. Community & Social ─────────────────────────────────────────────
  {
    id: "community-feed",
    category: "social",
    titleBn: "কমিউনিটি মোমেন্টস",
    titleEn: "Community Feed",
    subtitleBn: "ভ্রমণকারীদের ছবি, গল্প ও অভিজ্ঞতা",
    subtitleEn: "Travel stories, tips and photos from travelers",
    icon: "people-outline",
    color: "#0055F2",
    route: "/(tabs)/community",
    keywords: ["community", "feed", "social", "কমিউনিটি", "ফিড"],
  },
  {
    id: "create-post",
    category: "social",
    titleBn: "ভ্রমণ মুহূর্ত পোস্ট করুন",
    titleEn: "Share Travel Moment",
    subtitleBn: "ছবি ও গল্প শেয়ার করে কমিউনিটিতে যুক্ত হোন",
    subtitleEn: "Create a new post or 24h travel story",
    icon: "add-circle-outline",
    color: "#10B981",
    route: "/(tabs)/community?composer=open",
    keywords: ["post", "share", "story", "পোস্ট", "শেয়ার"],
  },
  {
    id: "live-broadcast",
    category: "social",
    titleBn: "লাইভ ব্রডকাস্ট",
    titleEn: "Live Travel Streams",
    subtitleBn: "দর্শনীয় স্থান থেকে সরাসরি লাইভ ভিডিও",
    subtitleEn: "Watch or broadcast live video from spots",
    icon: "videocam-outline",
    color: "#E11D48",
    route: "/screens/[slug]?slug=live",
    keywords: ["live", "stream", "video", "লাইভ"],
  },
  {
    id: "messenger",
    category: "social",
    titleBn: "মেসেঞ্জার ও ফ্রেন্ডস",
    titleEn: "Messenger & Friends",
    subtitleBn: "সহযাত্রী বন্ধুদের সাথে ব্যক্তিগত মেসেজিং",
    subtitleEn: "Direct messaging, friend requests & calls",
    icon: "chatbubble-ellipses-outline",
    color: "#0284C7",
    route: "/(tabs)/messages",
    keywords: ["message", "messenger", "friends", "বন্ধু", "মেসেজ"],
  },
  {
    id: "reviews",
    category: "social",
    titleBn: "রিভিউ ও রেটিং",
    titleEn: "Reviews & Ratings",
    subtitleBn: "প্রকৃত ব্যবহারকারীদের মতামত ও রেটিং",
    subtitleEn: "Verified ratings and reviews for services",
    icon: "star-outline",
    color: "#F59E0B",
    route: "/screens/reviews",
    keywords: ["review", "rating", "feedback", "রিভিউ", "রেটিং"],
  },

  // ─── 5. Fintech & Rewards ──────────────────────────────────────────────
  {
    id: "rewards",
    category: "fintech",
    titleBn: "রিওয়ার্ডস ও কয়েন",
    titleEn: "Rewards & Coins",
    subtitleBn: "ট্রিপ কয়েন সংগ্রহ করে ডিসকাউন্ট উপভোগ করুন",
    subtitleEn: "Earn and redeem Trip Coins for discounts",
    icon: "gift-outline",
    color: "#F59E0B",
    route: "/screens/rewards",
    badge: "FREE COINS",
    keywords: ["reward", "coins", "points", "কয়েন", "রিওয়ার্ড"],
  },
  {
    id: "invite-earn",
    category: "fintech",
    titleBn: "ইনভাইট ও আর্ন",
    titleEn: "Invite & Earn",
    subtitleBn: "বন্ধুদের আমন্ত্রণ জানিয়ে রেফারেল বোনাস পান",
    subtitleEn: "Share referral codes for bonus travel credits",
    icon: "share-social-outline",
    color: "#10B981",
    route: "/screens/invite-earn",
    keywords: ["invite", "earn", "referral", "ইনভাইট", "রেফারেল"],
  },
  {
    id: "local-marketplace",
    category: "fintech",
    titleBn: "স্থানীয় মার্কেটপ্লেস",
    titleEn: "Local Marketplace",
    subtitleBn: "ঐতিহ্যবাহী লোকজ পণ্য ও খাবারের অর্ডার",
    subtitleEn: "Authentic local goods and specialties",
    icon: "storefront-outline",
    color: "#D97706",
    route: "/screens/local-marketplace",
    keywords: ["market", "shop", "local", "মার্কেট", "পণ্য"],
  },
  {
    id: "transaction-history",
    category: "fintech",
    titleBn: "লেনদেনের ইতিহাস",
    titleEn: "Transaction History",
    subtitleBn: "সকল পেমেন্ট রসিদ, টিকিট ও ভাউচার এক নজরে",
    subtitleEn: "Complete receipts, paid ledgers & vouchers",
    icon: "receipt-outline",
    color: "#475569",
    route: "/screens/transaction-history",
    keywords: ["history", "receipt", "ledger", "লেনদেন", "রসিদ"],
  },
  {
    id: "saved-favorites",
    category: "fintech",
    titleBn: "সংরক্ষিত প্রিয় স্থান",
    titleEn: "Saved Favorites",
    subtitleBn: "আপনার বুকমার্ক করা হোটেল ও স্থানসমূহ",
    subtitleEn: "Wishlist and bookmarked travel spots",
    icon: "bookmark-outline",
    color: "#E11D48",
    route: "/screens/saved",
    keywords: ["saved", "bookmark", "favorite", "সেভড", "পছন্দ"],
  },
];

export interface FeatureDiscoveryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeatureDiscoveryModal({ visible, onClose }: FeatureDiscoveryModalProps) {
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);
  const { language } = useLanguage();
  const isBn = language === "bn";
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", labelBn: "সকল ফিচার (৪০+)", labelEn: "All Features (40+)" },
    { id: "booking", labelBn: "✈️ বুকিং", labelEn: "✈️ Booking" },
    { id: "ai", labelBn: "🤖 এআই টুলস", labelEn: "🤖 AI Tools" },
    { id: "safety", labelBn: "🛡️ নিরাপত্তা", labelEn: "🛡️ Safety" },
    { id: "social", labelBn: "👥 সোশ্যাল", labelEn: "👥 Social" },
    { id: "fintech", labelBn: "🎁 রিওয়ার্ডস", labelEn: "🎁 Rewards" },
  ];

  const filteredFeatures = useMemo(() => {
    let list = APP_FEATURES;
    if (selectedCategory !== "all") {
      list = list.filter((f) => f.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.titleBn.toLowerCase().includes(q) ||
          f.titleEn.toLowerCase().includes(q) ||
          f.subtitleBn.toLowerCase().includes(q) ||
          f.subtitleEn.toLowerCase().includes(q) ||
          f.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const handleNavigate = (route: string) => {
    onClose();
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {isBn ? "অ্যাপের ৪০+ ফিচার ডিরেক্টরি" : "Explore 40+ App Features"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isBn
                  ? "যেখানে যা খুঁজছেন, এক ক্লিকে সরাসরি প্রবেশ করুন"
                  : "All travel features and services at your fingertips"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={24} color="#64748B" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={isBn ? "ফিচার খুঁজুন (হোটেল, ফ্লাইট, এআই, ম্যাপ...)" : "Search features (flight, ai, stays, sos...)"}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryScrollWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      isActive && styles.categoryPillActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {isBn ? cat.labelBn : cat.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Feature List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <Text style={styles.resultsCount}>
              {isBn
                ? `${filteredFeatures.length}টি ফিচার পাওয়া গেছে`
                : `Showing ${filteredFeatures.length} features`}
            </Text>

            {filteredFeatures.map((feat) => (
              <Pressable
                key={feat.id}
                style={({ pressed }) => [
                  styles.featureCard,
                  pressed && styles.featureCardPressed,
                ]}
                onPress={() => handleNavigate(feat.route)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${feat.color}15` },
                  ]}
                >
                  <Ionicons name={feat.icon} size={24} color={feat.color} />
                </View>

                <View style={styles.featureInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.featureTitle}>
                      {isBn ? feat.titleBn : feat.titleEn}
                    </Text>
                    {feat.badge && (
                      <View
                        style={[
                          styles.badgePill,
                          { backgroundColor: `${feat.color}20` },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: feat.color }]}>
                          {feat.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.featureSubtitle}>
                    {isBn ? feat.subtitleBn : feat.subtitleEn}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                  style={styles.chevron}
                />
              </Pressable>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  categoryScrollWrap: {
    marginBottom: 10,
  },
  categoryRow: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  categoryPillActive: {
    backgroundColor: "#0055F2",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 10,
    marginHorizontal: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.04)" } : {}),
  },
  featureCardPressed: {
    backgroundColor: "#F8FAFC",
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  featureSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  chevron: {
    marginStart: 4,
  },
});
