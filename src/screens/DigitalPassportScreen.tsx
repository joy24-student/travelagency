import { RTLIcon } from "../components/ui";
import { formatLocalizedDate } from "../utils/formatters";
import { FocusAwareStatusBar } from "../components/ui/AppStatusBar";
/**
 * DigitalPassportScreen.tsx
 *
 * Gamified "Digital Passport" celebrating user travels with:
 * 1. Virtual Immigration Stamps (Bangladesh 64 districts & International).
 * 2. 3D Interactive Scratch Map (Grayscale unvisited -> vibrant full-color art).
 * 3. 10-Tier Traveler Milestone Progression ("Rookie Traveler" -> "Nomad" -> "Globe Trotter").
 * 4. High-Res Social Flex Sharing for Instagram & WhatsApp stories via `expo-sharing`.
 *
 * STRICT BOUNDARIES: Does NOT edit user account security or authentication tokens.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Share,
  Clipboard,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import * as LocalAuthentication from "expo-local-authentication";
import { GlassView } from '../components/ui/GlassView';
import { captureRef } from "react-native-view-shot";
import { router } from "expo-router";

import {
  BANGLADESH_DISTRICTS,
  INTERNATIONAL_COUNTRIES,
  MILESTONE_LEVELS,
  DivisionName,
  DistrictInfo,
  CountryInfo,
  ImmigrationStamp,
  MilestoneLevel,
  UserPassportProfile,
  getPassportProfile,
  savePassportProfile,
  stampPassportOnTripCompletion,
  scratchDistrict,
  scratchAllVisitedDistricts,
  sharePassportStory,
} from "../services/gamification/passportService";



type TabType = "map" | "stamps" | "milestones";

export default function DigitalPassportScreen() {
  const insets = useSafeAreaInsets();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [passport, setPassport] = useState<UserPassportProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [selectedDivision, setSelectedDivision] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictInfo | null>(null);
  const [selectedStamp, setSelectedStamp] = useState<ImmigrationStamp | null>(null);
  const [showLevelModal, setShowLevelModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showSimulateModal, setShowSimulateModal] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  // Privacy & Biometric State
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [isAppBlurred, setIsAppBlurred] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const remaskTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AppState listener for App Switcher / Background Privacy Shield
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        setIsAppBlurred(true);
        setIsMasked(true); // Always re-mask when switching away
      } else if (nextAppState === "active") {
        setIsAppBlurred(false);
      }
    });

    return () => {
      sub.remove();
      if (remaskTimeoutRef.current) clearTimeout(remaskTimeoutRef.current);
    };
  }, []);

  const maskIdentityNumber = (rawNumber?: string, visibleLastDigits: number = 4) => {
    if (!rawNumber) return "•••• •••• ••••";
    const trimmed = rawNumber.trim();
    if (trimmed.length <= visibleLastDigits) return trimmed;
    const prefix = trimmed.includes("-") ? trimmed.split("-")[0] + "-" : "";
    const lastDigits = trimmed.slice(-visibleLastDigits);
    return `${prefix}•••• •••• ${lastDigits}`;
  };

  const scheduleAutoRemask = () => {
    if (remaskTimeoutRef.current) clearTimeout(remaskTimeoutRef.current);
    remaskTimeoutRef.current = setTimeout(() => {
      setIsMasked(true);
    }, 30000);
  };

  const handleToggleMask = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isMasked) {
      setIsMasked(true);
      triggerToast("পাসপোর্ট নম্বর পুনরায় মাস্ক করা হয়েছে");
      return;
    }

    try {
      setIsAuthenticating(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsMasked(false);
        triggerToast("পাসপোর্ট তথ্য প্রদর্শিত হচ্ছে (৩০ সেকেন্ড)");
        scheduleAutoRemask();
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "ডিজিটাল পাসপোর্ট ও সংবেদনশীল তথ্য দেখতে বায়োমেট্রিক নিশ্চিত করুন",
        fallbackLabel: "ডিভাইস পাসকোড ব্যবহার করুন",
        cancelLabel: "বাতিল",
        disableDeviceFallback: false,
      });

      if (authResult.success) {
        setIsMasked(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerToast("বায়োমেট্রিক সফল: পাসপোর্ট তথ্য উন্মোচিত");
        scheduleAutoRemask();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        triggerToast("বায়োমেট্রিক প্রমাণীকরণ ব্যর্থ হয়েছে");
      }
    } catch (err) {
      console.warn("Biometric auth error:", err);
      triggerToast("প্রমাণীকরণ ত্রুটি ঘটেছে");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // New level unlocked celebration banner
  const [celebrationLevel, setCelebrationLevel] = useState<MilestoneLevel | null>(null);

  // Animation values
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const stampScaleAnim = useRef(new Animated.Value(1)).current;
  const storyCardRef = useRef<View>(null);

  // Load Passport Data
  useEffect(() => {
    loadPassport();
  }, []);

  const loadPassport = async () => {
    try {
      setLoading(true);
      const data = await getPassportProfile("user_traveler", "Sadman Sakib");
      setPassport(data);
    } catch (err) {
      console.warn("Error loading passport:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toast Helper
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // 3D Card Tilt Interaction
  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(tiltAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(tiltAnim, {
        toValue: 0,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const cardRotate = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "4deg"],
  });

  const cardScale = tiltAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.97, 1],
  });

  // Current Level & Next Level Info
  const currentMilestone = useMemo(() => {
    if (!passport) return MILESTONE_LEVELS[0];
    return (
      MILESTONE_LEVELS.find((l) => l.level === passport.currentLevel) ||
      MILESTONE_LEVELS[0]
    );
  }, [passport]);

  const nextMilestone = useMemo(() => {
    if (!passport) return MILESTONE_LEVELS[1];
    return (
      MILESTONE_LEVELS.find((l) => l.level === passport.currentLevel + 1) || null
    );
  }, [passport]);

  const levelProgress = useMemo(() => {
    if (!passport || !nextMilestone) return 100;
    const prevMin = currentMilestone.minStamps;
    const nextMin = nextMilestone.minStamps;
    const diff = nextMin - prevMin;
    if (diff <= 0) return 100;
    const current = passport.stampsCount - prevMin;
    return Math.min(100, Math.max(0, Math.round((current / diff) * 100)));
  }, [passport, currentMilestone, nextMilestone]);

  // Divisions filter list
  const divisions = useMemo(() => {
    return [
      "All",
      "Dhaka",
      "Chattogram",
      "Sylhet",
      "Khulna",
      "Rajshahi",
      "Barishal",
      "Rangpur",
      "Mymensingh",
      "International",
    ];
  }, []);

  // Filtered districts list
  const filteredDistricts = useMemo(() => {
    if (selectedDivision === "International") {
      return [];
    }
    return BANGLADESH_DISTRICTS.filter((d) => {
      const matchDivision =
        selectedDivision === "All" || d.division === selectedDivision;
      const matchSearch =
        searchQuery.trim() === "" ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.bnName.includes(searchQuery) ||
        d.landmark.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDivision && matchSearch;
    });
  }, [selectedDivision, searchQuery]);

  // Handle Scratch District Action
  const handleScratch = async (district: DistrictInfo) => {
    if (!passport) return;

    // Check if visited
    const isVisited = passport.stamps.some(
      (s) => s.targetId === district.id && s.targetType === "district"
    );

    if (!isVisited) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      triggerToast(`🔒 Travel to ${district.name} first to unlock scratching!`);
      return;
    }

    const isAlreadyScratched = passport.scratchedDistricts.includes(district.id);
    if (isAlreadyScratched) {
      setSelectedDistrict(district);
      return;
    }

    // Scratch it!
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await scratchDistrict(passport.userId, district.id);
    setPassport(updated);
    setSelectedDistrict(district);
    triggerToast(`✨ Scratched ${district.name}! +30 XP gained!`);
  };

  // Scratch All Visited
  const handleScratchAll = async () => {
    if (!passport) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await scratchAllVisitedDistricts(passport.userId);
    setPassport(updated);
    triggerToast("🎉 All visited districts successfully scratched & revealed!");
  };

  // Simulate Stamping Live Travel
  const handleSimulateTravel = async (destinationName: string) => {
    if (!passport) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate stamp landing
    stampScaleAnim.setValue(1.8);
    Animated.spring(stampScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();

    const res = await stampPassportOnTripCompletion({
      userId: passport.userId,
      destination: destinationName,
      travelMode: "flight",
    });

    setPassport(res.passport);
    setShowSimulateModal(false);

    if (res.leveledUp) {
      const newLvl =
        MILESTONE_LEVELS.find((l) => l.level === res.currentLevel) ||
        MILESTONE_LEVELS[0];
      setCelebrationLevel(newLvl);
      triggerToast(`🎖️ LEVEL UP! You reached ${newLvl.title}!`);
    } else {
      triggerToast(
        `🛂 Stamped: ${res.stamp.title}! Serial: ${res.stamp.entryNumber}`
      );
    }
  };

  // Social Flex Sharing (Instagram / WhatsApp Story Export via expo-sharing)
  const handleExportShare = async () => {
    if (!passport) return;
    setIsSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let captureUri: string | null = null;
      if (storyCardRef.current) {
        try {
          captureUri = await captureRef(storyCardRef, {
            format: "png",
            quality: 1.0,
            result: "tmpfile",
          });
        } catch (captureErr) {
          console.warn("ViewShot capture fallback to SVG:", captureErr);
        }
      }

      const success = await sharePassportStory({
        passport,
        capturedImageUri: captureUri,
      });

      if (!success) {
        // Fallback to native text share
        await Share.share({
          message: `Check out my Digital Travel Passport! 🌍 I've unlocked Explorer Level ${passport.currentLevel}: ${currentMilestone.title} and stamped ${passport.stampsCount}/64 districts! #TravelAgency #BangladeshTravel`,
          title: "My Digital Travel Passport",
        });
      }
    } catch (err) {
      console.warn("Share error:", err);
      triggerToast("Could not export passport story. Please try again.");
    } finally {
      setIsSharing(false);
      setShowShareModal(false);
    }
  };

  // Copy Promo Code
  const handleCopyPerk = (code: string) => {
    Clipboard.setString(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    triggerToast(`Copied perk coupon ${code} to clipboard!`);
  };

  if (loading || !passport) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={styles.loadingText}>Loading Digital Passport...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FocusAwareStatusBar style="light" backgroundColor="#0B1329" />

      {/* ── TOAST NOTIFICATION ── */}
      {showToast && (
        <View style={[styles.toastContainer, { top: insets.top + 10 }]}>
          <Ionicons name="sparkles" size={18} color="#FDE047" />
          <Text style={styles.toastText}>{showToast}</Text>
        </View>
      )}

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RTLIcon name="chevron-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Digital Passport</Text>
          <Text style={styles.headerSubtitle}>ডিজিটাল ভ্রমণ পাসপোর্ট</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.storyShareBtn}
            onPress={() => setShowShareModal(true)}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.storyShareGradient}
            >
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              <Text style={styles.storyShareText}>Flex Story</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* ── 3D PASSPORT BOOKLET TILT CARD ── */}
        <Animated.View
          style={[
            styles.passportCardWrap,
            {
              transform: [{ rotateZ: cardRotate }, { scale: cardScale }],
            },
          ]}
        >
          <Pressable onPress={handleCardPress}>
            <LinearGradient
              colors={["#0F2042", "#081226", "#040914"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.passportCard}
            >
              {/* Gold Foil Border */}
              <View style={styles.cardGoldBorder}>
                {/* Top Authority Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.emblemContainer}>
                    <Text style={styles.emblemStar}>★</Text>
                  </View>
                  <View style={styles.cardAuthorityText}>
                    <Text style={styles.cardGovEn}>PEOPLE'S REPUBLIC OF TRAVEL</Text>
                    <Text style={styles.cardGovBn}>
                      বাংলাদেশ ডিজিটাল ভ্রমণ পাসপোর্ট
                    </Text>
                  </View>
                  <View style={styles.biometricChip}>
                    <Ionicons name="hardware-chip-outline" size={20} color="#FDE047" />
                  </View>
                </View>

                {/* Identity Middle Section */}
                <View style={styles.cardIdentityRow}>
                  {/* Holographic Traveler Avatar */}
                  <View style={styles.avatarWrap}>
                    <LinearGradient
                      colors={["#1E3A8A", "#3B82F6"]}
                      style={styles.avatarGradient}
                    >
                      <Ionicons name="person" size={44} color="#F8FAFC" />
                    </LinearGradient>
                    <View style={styles.verifiedCheckBadge}>
                      <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* Traveler Details */}
                  <View style={styles.identityDetails}>
                    <Text style={styles.labelMuted}>HOLDER / নাম</Text>
                    <Text style={styles.holderName} numberOfLines={1}>
                      {passport.holderName}
                    </Text>

                    <View style={styles.passportNoHeaderRow}>
                      <Text style={styles.labelMuted}>PASSPORT NO / নম্বর</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleToggleMask}
                        style={styles.maskToggleBtn}
                        accessibilityRole="button"
                        accessibilityLabel={isMasked ? "Reveal passport number" : "Mask passport number"}
                      >
                        {isAuthenticating ? (
                          <ActivityIndicator size="small" color="#FDE047" />
                        ) : (
                          <>
                            <Ionicons
                              name={isMasked ? "eye-outline" : "eye-off-outline"}
                              size={13}
                              color="#FDE047"
                            />
                            <Text style={styles.maskToggleBtnText}>
                              {isMasked ? "বায়োমেট্রিক আনলক" : "লুকান"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.passportNumber}>
                      {isMasked
                        ? maskIdentityNumber(passport.passportNumber)
                        : passport.passportNumber}
                    </Text>
                    <View style={styles.securitySubRow}>
                      <Ionicons
                        name={isMasked ? "shield-checkmark" : "shield-half"}
                        size={11}
                        color={isMasked ? "#4ADE80" : "#FDE047"}
                      />
                      <Text style={styles.securitySubText}>
                        {isMasked ? "এনক্রিপ্টেড ও মাস্ক করা (E-Passport)" : "বায়োমেট্রিক যাচাইকৃত (সক্রিয়)"}
                      </Text>
                    </View>

                    <View style={styles.badgeRow}>
                      <View style={styles.nationalityBadge}>
                        <Text style={styles.nationalityText}>BANGLADESH 🇧🇩</Text>
                      </View>
                      <View style={styles.xpBadge}>
                        <Ionicons name="flash" size={11} color="#FDE047" />
                        <Text style={styles.xpText}>{passport.totalXp} XP</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Card Footer: Current Level & Hologram Seal */}
                <View style={styles.cardFooter}>
                  <View style={styles.levelPill}>
                    <LinearGradient
                      colors={currentMilestone.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.levelPillGradient}
                    >
                      <Ionicons name="compass" size={14} color="#FFFFFF" />
                      <Text style={styles.levelPillText}>
                        Lvl {passport.currentLevel} • {currentMilestone.title}
                      </Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.cardFooterStats}>
                    <Text style={styles.footerStatText}>
                      <Text style={styles.footerStatBold}>
                        {passport.stampsCount}
                      </Text>{" "}
                      Stamps •{" "}
                      <Text style={styles.footerStatBold}>
                        {passport.scratchedCount}
                      </Text>{" "}
                      Scratched
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── TRAVELER MILESTONE PROGRESSION TRACK ── */}
        <View style={styles.milestoneSection}>
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneTitleWrap}>
              <Text style={styles.milestoneSectionTitle}>
                Explorer Level Progression
              </Text>
              <Text style={styles.milestoneSub}>
                {nextMilestone
                  ? `${nextMilestone.minStamps - passport.stampsCount} more stamps to unlock Level ${nextMilestone.level}: ${nextMilestone.title}`
                  : "Max Level 10 Champion!"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewPerksBtn}
              onPress={() => setShowLevelModal(true)}
            >
              <Text style={styles.viewPerksText}>All 10 Levels</Text>
              <RTLIcon name="chevron-forward" size={14} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <LinearGradient
              colors={["#F59E0B", "#EAB308", "#10B981"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${Math.max(8, levelProgress)}%` },
              ]}
            />
          </View>

          {/* Active Perk Highlight */}
          <View style={styles.activePerkCallout}>
            <Ionicons name="sparkles" size={16} color="#F59E0B" />
            <Text style={styles.activePerkText}>
              Current Perk:{" "}
              <Text style={styles.activePerkBold}>
                {currentMilestone.discountText}
              </Text>{" "}
              + {currentMilestone.perks[0]?.title}
            </Text>
          </View>
        </View>

        {/* ── 3-WAY SEGMENTED TABS ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "map" && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("map");
            }}
          >
            <Ionicons
              name={activeTab === "map" ? "map" : "map-outline"}
              size={18}
              color={activeTab === "map" ? "#FDE047" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "map" && styles.tabTextActive,
              ]}
            >
              Scratch Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "stamps" && styles.tabButtonActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("stamps");
            }}
          >
            <Ionicons
              name={activeTab === "stamps" ? "shield" : "shield-outline"}
              size={18}
              color={activeTab === "stamps" ? "#FDE047" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "stamps" && styles.tabTextActive,
              ]}
            >
              Stamps ({passport.stampsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "milestones" && styles.tabButtonActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("milestones");
            }}
          >
            <Ionicons
              name={activeTab === "milestones" ? "gift" : "gift-outline"}
              size={18}
              color={activeTab === "milestones" ? "#FDE047" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "milestones" && styles.tabTextActive,
              ]}
            >
              Perks ({passport.unlockedPerks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: 3D SCRATCH MAP ── */}
        {activeTab === "map" && (
          <View style={styles.tabContentContainer}>
            {/* Quick Stats & Scratch All Action */}
            <View style={styles.scratchActionBar}>
              <View>
                <Text style={styles.scratchStatsText}>
                  <Text style={styles.scratchStatsAccent}>
                    {passport.scratchedCount}
                  </Text>{" "}
                  / 64 Districts Scratched (
                  {Math.round((passport.scratchedCount / 64) * 100)}%)
                </Text>
                <Text style={styles.scratchStatsSub}>
                  Unvisited districts appear grayscale • Visited glow with art!
                </Text>
              </View>

              <TouchableOpacity
                style={styles.scratchAllBtn}
                onPress={handleScratchAll}
              >
                <Ionicons name="color-wand-outline" size={14} color="#FFFFFF" />
                <Text style={styles.scratchAllBtnText}>Scratch All</Text>
              </TouchableOpacity>
            </View>

            {/* Division Filter Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.divisionCarousel}
            >
              {divisions.map((div) => {
                const isSelected = selectedDivision === div;
                return (
                  <TouchableOpacity
                    key={div}
                    style={[
                      styles.divisionPill,
                      isSelected && styles.divisionPillActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedDivision(div);
                    }}
                  >
                    <Text
                      style={[
                        styles.divisionText,
                        isSelected && styles.divisionTextActive,
                      ]}
                    >
                      {div}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* International Countries View (if selected) */}
            {selectedDivision === "International" ? (
              <View style={styles.internationalGrid}>
                {INTERNATIONAL_COUNTRIES.map((country) => {
                  const stamp = passport.stamps.find(
                    (s) => s.targetId === country.id && s.targetType === "country"
                  );
                  const isVisited = Boolean(stamp);

                  return (
                    <View
                      key={country.id}
                      style={[
                        styles.countryCard,
                        !isVisited && styles.countryCardLocked,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isVisited
                            ? country.gradient
                            : (["#1E293B", "#0F172A"] as [string, string])
                        }
                        style={styles.countryCardGradient}
                      >
                        <View style={styles.countryHeader}>
                          <Text style={styles.countryFlag}>{country.flag}</Text>
                          {isVisited ? (
                            <View style={styles.visitedPill}>
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color="#FFFFFF"
                              />
                              <Text style={styles.visitedPillText}>Visited</Text>
                            </View>
                          ) : (
                            <View style={styles.lockPill}>
                              <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                              <Text style={styles.lockPillText}>Unvisited</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.countryName}>{country.name}</Text>
                        <Text style={styles.countryBn}>{country.bnName}</Text>
                        <Text style={styles.countryLandmark} numberOfLines={1}>
                          {country.landmark}
                        </Text>

                        {isVisited && stamp && (
                          <View style={styles.stampSerialBadge}>
                            <Text style={styles.stampSerialText}>
                              Seal: {stamp.entryNumber}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Bangladesh 64 Districts Scratch Grid */
              <View style={styles.districtsGrid}>
                {filteredDistricts.map((district) => {
                  const stamp = passport.stamps.find(
                    (s) =>
                      s.targetId === district.id && s.targetType === "district"
                  );
                  const isVisited = Boolean(stamp);
                  const isScratched = passport.scratchedDistricts.includes(
                    district.id
                  );

                  return (
                    <TouchableOpacity
                      key={district.id}
                      activeOpacity={0.85}
                      style={styles.districtTileWrap}
                      onPress={() => handleScratch(district)}
                    >
                      {/* CARD STATE 1: Unvisited (Grayscale vintage paper with padlock) */}
                      {!isVisited && (
                        <View style={styles.unvisitedTile}>
                          <View style={styles.unvisitedLock}>
                            <Ionicons
                              name="lock-closed-outline"
                              size={18}
                              color="#64748B"
                            />
                          </View>
                          <Ionicons
                            name={district.icon as any}
                            size={28}
                            color="#475569"
                            style={styles.faintIcon}
                          />
                          <Text style={styles.unvisitedTitle} numberOfLines={1}>
                            {district.name}
                          </Text>
                          <Text style={styles.unvisitedBn}>{district.bnName}</Text>
                          <Text style={styles.unvisitedCode}>{district.code}</Text>
                        </View>
                      )}

                      {/* CARD STATE 2: Visited BUT NOT YET SCRATCHED (Golden foil with tap to reveal) */}
                      {isVisited && !isScratched && (
                        <LinearGradient
                          colors={["#D97706", "#F59E0B", "#B45309"]}
                          style={styles.scratchableTile}
                        >
                          <View style={styles.sparkleBadge}>
                            <Ionicons name="sparkles" size={14} color="#FDE047" />
                          </View>
                          <Text style={styles.scratchPillTitle}>READY TO SCRATCH</Text>
                          <Text style={styles.scratchDistrictName} numberOfLines={1}>
                            {district.name}
                          </Text>
                          <View style={styles.tapToRevealBtn}>
                            <Text style={styles.tapToRevealText}>Tap to Reveal</Text>
                          </View>
                        </LinearGradient>
                      )}

                      {/* CARD STATE 3: Visited & Scratched (Vibrant Full-Color Unlocked Art!) */}
                      {isVisited && isScratched && (
                        <LinearGradient
                          colors={district.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.scratchedTile}
                        >
                          <View style={styles.scratchedHeader}>
                            <View style={styles.rarityPill}>
                              <Text style={styles.rarityText}>
                                {district.rarity}
                              </Text>
                            </View>
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#FFFFFF"
                            />
                          </View>

                          <Ionicons
                            name={district.icon as any}
                            size={32}
                            color="#FFFFFF"
                            style={styles.scratchedIcon}
                          />

                          <Text style={styles.scratchedName} numberOfLines={1}>
                            {district.name}
                          </Text>
                          <Text style={styles.scratchedBn}>{district.bnName}</Text>
                          <Text style={styles.scratchedLandmark} numberOfLines={1}>
                            {district.landmark}
                          </Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── TAB 2: VIRTUAL IMMIGRATION STAMPS ── */}
        {activeTab === "stamps" && (
          <View style={styles.tabContentContainer}>
            {/* Header info & Simulation test trigger */}
            <View style={styles.stampsHeaderBar}>
              <View>
                <Text style={styles.stampsMainTitle}>Passport Visa Page</Text>
                <Text style={styles.stampsSubTitle}>
                  Authentic ink border seals awarded on travel completion
                </Text>
              </View>

              <TouchableOpacity
                style={styles.simulateTravelBtn}
                onPress={() => setShowSimulateModal(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.simulateTravelText}>Add Stamp</Text>
              </TouchableOpacity>
            </View>

            {/* Vintage Parchment Passport Page */}
            <View style={styles.parchmentPage}>
              <View style={styles.parchmentHeader}>
                <Text style={styles.parchmentTitle}>
                  VISAS / অভিবাসন ও অনুমোদন
                </Text>
                <Text style={styles.parchmentPageNo}>PAGE 04</Text>
              </View>

              {passport.stamps.length === 0 ? (
                <View style={styles.emptyStampsWrap}>
                  <Ionicons name="airplane-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyStampsTitle}>No Stamps Yet</Text>
                  <Text style={styles.emptyStampsSub}>
                    Book a flight, bus, train, or hotel to any district to get your
                    first official stamp!
                  </Text>
                </View>
              ) : (
                <View style={styles.stampsGrid}>
                  {passport.stamps.map((stamp) => {
                    return (
                      <TouchableOpacity
                        key={stamp.id}
                        activeOpacity={0.8}
                        style={[
                          styles.stampItemWrap,
                          {
                            transform: [{ rotate: `${stamp.rotationDeg}deg` }],
                          },
                        ]}
                        onPress={() => setSelectedStamp(stamp)}
                      >
                        {/* Authentic Ink Stamp Seal */}
                        <View
                          style={[
                            styles.stampBox,
                            { borderColor: stamp.inkColor },
                            stamp.sealStyle === "circular" &&
                              styles.stampSealCircular,
                            stamp.sealStyle === "oval" && styles.stampSealOval,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stampAuthority,
                              { color: stamp.inkColor },
                            ]}
                          >
                            IMMIGRATION BD
                          </Text>

                          <View style={styles.stampCenterRow}>
                            <Ionicons
                              name={
                                stamp.travelMode === "flight"
                                  ? "airplane"
                                  : stamp.travelMode === "train"
                                    ? "train"
                                    : stamp.travelMode === "bus"
                                      ? "bus"
                                      : "car"
                              }
                              size={16}
                              color={stamp.inkColor}
                            />
                            <Text
                              style={[styles.stampDest, { color: stamp.inkColor }]}
                              numberOfLines={1}
                            >
                              {stamp.title.toUpperCase()}
                            </Text>
                          </View>

                          <Text
                            style={[styles.stampDate, { color: stamp.inkColor }]}
                          >
                            {formatLocalizedDate(stamp.stampedAt)}
                          </Text>

                          <Text
                            style={[styles.stampSerial, { color: stamp.inkColor }]}
                          >
                            {stamp.entryNumber}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── TAB 3: EXPLORER PERKS & REWARDS ── */}
        {activeTab === "milestones" && (
          <View style={styles.tabContentContainer}>
            <View style={styles.perksHeaderBar}>
              <Text style={styles.perksHeaderTitle}>Exclusive Platform Perks</Text>
              <Text style={styles.perksHeaderSub}>
                Unlocked as your Explorer Level increases from your travels
              </Text>
            </View>

            {MILESTONE_LEVELS.map((lvl) => {
              const isUnlocked = passport.currentLevel >= lvl.level;

              return (
                <View
                  key={lvl.level}
                  style={[
                    styles.milestoneLevelCard,
                    !isUnlocked && styles.milestoneLevelCardLocked,
                  ]}
                >
                  <View style={styles.milestoneCardTop}>
                    <View style={styles.milestoneBadgePill}>
                      <LinearGradient
                        colors={
                          isUnlocked
                            ? lvl.gradient
                            : (["#334155", "#475569"] as [string, string])
                        }
                        style={styles.milestoneBadgeGradient}
                      >
                        <Text style={styles.milestoneLevelNumber}>
                          LVL {lvl.level}
                        </Text>
                      </LinearGradient>
                      <View>
                        <Text style={styles.milestoneLevelTitle}>
                          {lvl.title}
                        </Text>
                        <Text style={styles.milestoneLevelBn}>{lvl.bnTitle}</Text>
                      </View>
                    </View>

                    <View>
                      {isUnlocked ? (
                        <View style={styles.unlockedTag}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10B981"
                          />
                          <Text style={styles.unlockedTagText}>Unlocked</Text>
                        </View>
                      ) : (
                        <View style={styles.lockedTag}>
                          <Ionicons
                            name="lock-closed"
                            size={12}
                            color="#94A3B8"
                          />
                          <Text style={styles.lockedTagText}>
                            {lvl.minStamps} Stamps
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Perks list */}
                  <View style={styles.perksListWrap}>
                    {lvl.perks.map((perk) => {
                      return (
                        <View key={perk.id} style={styles.perkRowItem}>
                          <View
                            style={[
                              styles.perkIconWrap,
                              {
                                backgroundColor: isUnlocked
                                  ? "#0F766E22"
                                  : "#33415533",
                              },
                            ]}
                          >
                            <Ionicons
                              name={perk.icon as any}
                              size={18}
                              color={isUnlocked ? "#14B8A6" : "#64748B"}
                            />
                          </View>
                          <View style={styles.perkDetailsWrap}>
                            <Text
                              style={[
                                styles.perkTitle,
                                !isUnlocked && styles.perkTitleLocked,
                              ]}
                            >
                              {perk.title}
                            </Text>
                            <Text style={styles.perkDesc}>
                              {perk.description}
                            </Text>
                          </View>

                          {isUnlocked && (
                            <TouchableOpacity
                              style={styles.copyCouponBtn}
                              onPress={() => handleCopyPerk(perk.code)}
                            >
                              <Text style={styles.copyCouponText}>
                                {perk.code}
                              </Text>
                              <Ionicons
                                name="copy-outline"
                                size={12}
                                color="#38BDF8"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── DISTRICT DETAILS MODAL ── */}
      <Modal
        visible={Boolean(selectedDistrict)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDistrict(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.districtModalContent}>
            {selectedDistrict && (
              <>
                <LinearGradient
                  colors={selectedDistrict.gradient}
                  style={styles.districtModalHeader}
                >
                  <View style={styles.modalIconCircle}>
                    <Ionicons
                      name={selectedDistrict.icon as any}
                      size={36}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.modalDistrictName}>
                    {selectedDistrict.name}
                  </Text>
                  <Text style={styles.modalDistrictBn}>
                    {selectedDistrict.bnName}
                  </Text>
                  <View style={styles.modalRarityBadge}>
                    <Text style={styles.modalRarityText}>
                      {selectedDistrict.rarity} Exploration Target
                    </Text>
                  </View>
                </LinearGradient>

                <View style={styles.districtModalBody}>
                  <View style={styles.modalFieldRow}>
                    <Ionicons name="map-outline" size={18} color="#38BDF8" />
                    <View style={styles.modalFieldText}>
                      <Text style={styles.modalFieldLabel}>DIVISION</Text>
                      <Text style={styles.modalFieldValue}>
                        {selectedDistrict.division} Division, Bangladesh
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalFieldRow}>
                    <Ionicons name="trail-sign-outline" size={18} color="#F59E0B" />
                    <View style={styles.modalFieldText}>
                      <Text style={styles.modalFieldLabel}>FAMOUS LANDMARK</Text>
                      <Text style={styles.modalFieldValue}>
                        {selectedDistrict.landmark}
                      </Text>
                      <Text style={styles.modalFieldBnSub}>
                        {selectedDistrict.bnLandmark}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalFieldRow}>
                    <Ionicons name="restaurant-outline" size={18} color="#10B981" />
                    <View style={styles.modalFieldText}>
                      <Text style={styles.modalFieldLabel}>LOCAL DELICACY</Text>
                      <Text style={styles.modalFieldValue}>
                        {selectedDistrict.speciality}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalFieldRow}>
                    <Ionicons name="flash-outline" size={18} color="#EAB308" />
                    <View style={styles.modalFieldText}>
                      <Text style={styles.modalFieldLabel}>XP REWARD</Text>
                      <Text style={styles.modalFieldValue}>
                        +{selectedDistrict.xpReward} Explorer XP
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedDistrict(null)}
                  >
                    <Text style={styles.modalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── STAMP INSPECTION MODAL ── */}
      <Modal
        visible={Boolean(selectedStamp)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedStamp(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.stampModalCard}>
            {selectedStamp && (
              <>
                <View
                  style={[
                    styles.stampModalHeader,
                    { borderColor: selectedStamp.inkColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.stampModalAuthority,
                      { color: selectedStamp.inkColor },
                    ]}
                  >
                    PEOPLE'S REPUBLIC OF TRAVEL IMMIGRATION
                  </Text>
                  <Text
                    style={[
                      styles.stampModalDest,
                      { color: selectedStamp.inkColor },
                    ]}
                  >
                    {selectedStamp.title.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.stampModalSub,
                      { color: selectedStamp.inkColor },
                    ]}
                  >
                    {selectedStamp.subtitle}
                  </Text>
                </View>

                <View style={styles.stampModalBody}>
                  <View style={styles.stampInfoRow}>
                    <Text style={styles.stampInfoLabel}>ENTRY SERIAL:</Text>
                    <Text style={styles.stampInfoValue}>
                      {selectedStamp.entryNumber}
                    </Text>
                  </View>

                  <View style={styles.stampInfoRow}>
                    <Text style={styles.stampInfoLabel}>DATE OF TRAVEL:</Text>
                    <Text style={styles.stampInfoValue}>
                      {formatLocalizedDate(selectedStamp.stampedAt, { dateStyle: "medium", timeStyle: "short" })}
                    </Text>
                  </View>

                  <View style={styles.stampInfoRow}>
                    <Text style={styles.stampInfoLabel}>TRAVEL MODE:</Text>
                    <Text style={styles.stampInfoValue}>
                      {selectedStamp.travelMode.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.stampInfoRow}>
                    <Text style={styles.stampInfoLabel}>TRIP REFERENCE:</Text>
                    <Text style={styles.stampInfoValue}>
                      {selectedStamp.tripReference}
                    </Text>
                  </View>

                  <View style={styles.stampInfoRow}>
                    <Text style={styles.stampInfoLabel}>VERIFICATION:</Text>
                    <Text style={styles.stampVerifiedBadge}>
                      OFFICIALLY VERIFIED
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.stampModalCloseBtn}
                  onPress={() => setSelectedStamp(null)}
                >
                  <Text style={styles.stampModalCloseText}>Close Stamp</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── SIMULATE TRAVEL STAMP MODAL (LIVE DEMO) ── */}
      <Modal
        visible={showSimulateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSimulateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.simulateModalContent}>
            <View style={styles.simulateModalHeader}>
              <Ionicons name="airplane" size={24} color="#F59E0B" />
              <Text style={styles.simulateModalTitle}>Simulate Completed Travel</Text>
              <Text style={styles.simulateModalSubtitle}>
                Select a destination to simulate booking completion & receive your
                official stamp!
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={styles.simulateGroupTitle}>Popular Bangladesh Districts</Text>
              {[
                "Dhaka",
                "Cox's Bazar",
                "Sylhet",
                "Bandarban",
                "Bagerhat",
                "Panchagarh",
                "Rangpur",
                "Barishal",
                "Dinajpur",
                "Mymensingh",
              ].map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.simulateOption}
                  onPress={() => handleSimulateTravel(name)}
                >
                  <Ionicons name="location-outline" size={18} color="#38BDF8" />
                  <Text style={styles.simulateOptionText}>{name}</Text>
                  <Ionicons name="add" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}

              <Text style={styles.simulateGroupTitle}>International Destinations</Text>
              {["Thailand", "Malaysia", "Singapore", "Saudi Arabia", "UAE"].map(
                (name) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.simulateOption}
                    onPress={() => handleSimulateTravel(name)}
                  >
                    <Ionicons name="globe-outline" size={18} color="#10B981" />
                    <Text style={styles.simulateOptionText}>{name}</Text>
                    <Ionicons name="add" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSimulateModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ALL 10 MILESTONE LEVELS MODAL ── */}
      <Modal
        visible={showLevelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.levelsModalContent}>
            <View style={styles.levelsModalHeader}>
              <Ionicons name="trophy" size={26} color="#EAB308" />
              <Text style={styles.levelsModalTitle}>Explorer Milestone Track</Text>
              <Text style={styles.levelsModalSub}>
                10 Legendary Traveler Tiers from Rookie to Sovereign
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {MILESTONE_LEVELS.map((lvl) => {
                const isCurrent = passport.currentLevel === lvl.level;
                const isPast = passport.currentLevel > lvl.level;

                return (
                  <View
                    key={lvl.level}
                    style={[
                      styles.levelTrackItem,
                      isCurrent && styles.levelTrackItemCurrent,
                    ]}
                  >
                    <View style={styles.levelTrackBadge}>
                      <LinearGradient
                        colors={lvl.gradient}
                        style={styles.levelTrackGradient}
                      >
                        <Text style={styles.levelTrackNum}>{lvl.level}</Text>
                      </LinearGradient>
                    </View>

                    <View style={styles.levelTrackInfo}>
                      <View style={styles.levelTrackTitleRow}>
                        <Text style={styles.levelTrackTitle}>{lvl.title}</Text>
                        {isCurrent && (
                          <View style={styles.currentLvlTag}>
                            <Text style={styles.currentLvlTagText}>CURRENT</Text>
                          </View>
                        )}
                        {isPast && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                          />
                        )}
                      </View>
                      <Text style={styles.levelTrackBn}>{lvl.bnTitle}</Text>
                      <Text style={styles.levelTrackRequirement}>
                        Requires {lvl.minStamps} Confirmed Stamps
                      </Text>
                      <Text style={styles.levelTrackDiscount}>
                        Perk: {lvl.discountText}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowLevelModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── SOCIAL FLEX STORY PREVIEW & EXPORT MODAL ── */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Ionicons name="sparkles" size={22} color="#F59E0B" />
              <Text style={styles.shareModalTitle}>Passport Story Flex</Text>
              <Text style={styles.shareModalSub}>
                Export high-resolution passport summary for Instagram & WhatsApp
              </Text>
            </View>

            {/* Beautiful 9:16 Story Card View to Capture via ViewShot */}
            <View style={styles.storyCardPreviewWrapper}>
              <View ref={storyCardRef} collapsable={false} style={styles.storyCard}>
                <LinearGradient
                  colors={["#0F172A", "#1E293B", "#020617"]}
                  style={styles.storyCardGradient}
                >
                  {/* Gold Border */}
                  <View style={styles.storyGoldBorder}>
                    <Text style={styles.storyGovEn}>
                      PEOPLE'S REPUBLIC OF TRAVEL
                    </Text>
                    <Text style={styles.storyGovBn}>
                      বাংলাদেশ ডিজিটাল ভ্রমণ পাসপোর্ট
                    </Text>

                    <View style={styles.storyProfileSection}>
                      <View style={styles.storyAvatarWrap}>
                        <Ionicons name="person" size={26} color="#FFFFFF" />
                      </View>
                      <View style={{ marginStart: 12 }}>
                        <Text style={styles.storyHolderName}>
                          {passport.holderName}
                        </Text>
                        <Text style={styles.storyPassNo}>
                          {maskIdentityNumber(passport.passportNumber)}
                        </Text>
                      </View>
                    </View>

                    {/* Milestone Highlight */}
                    <View style={styles.storyMilestonePill}>
                      <Text style={styles.storyMilestoneText}>
                        LEVEL {passport.currentLevel} • {currentMilestone.title}
                      </Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.storyStatsRow}>
                      <View style={styles.storyStatItem}>
                        <Text style={styles.storyStatVal}>
                          {passport.stampsCount}/64
                        </Text>
                        <Text style={styles.storyStatLbl}>Districts</Text>
                      </View>
                      <View style={styles.storyStatDivider} />
                      <View style={styles.storyStatItem}>
                        <Text style={styles.storyStatVal}>
                          {passport.scratchedCount}
                        </Text>
                        <Text style={styles.storyStatLbl}>Scratched</Text>
                      </View>
                      <View style={styles.storyStatDivider} />
                      <View style={styles.storyStatItem}>
                        <Text style={styles.storyStatVal}>{passport.totalXp}</Text>
                        <Text style={styles.storyStatLbl}>Total XP</Text>
                      </View>
                    </View>

                    {/* Mini Verified Stamps Preview */}
                    <Text style={styles.storyRecentTitle}>
                      VERIFIED RECENT STAMPS
                    </Text>
                    <View style={styles.storyMiniStampsRow}>
                      {passport.stamps.slice(0, 3).map((st) => (
                        <View
                          key={st.id}
                          style={[
                            styles.storyMiniStampBadge,
                            { borderColor: st.inkColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.storyMiniStampText,
                              { color: st.inkColor },
                            ]}
                            numberOfLines={1}
                          >
                            {st.title}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Footer */}
                    <View style={styles.storyFooter}>
                      <Text style={styles.storyBrand}>TRAVEL AGENCY APP</Text>
                      <Text style={styles.storyTag}>#ExploreBangladesh</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.shareButtonsRow}>
              <TouchableOpacity
                style={styles.igShareBtn}
                disabled={isSharing}
                onPress={handleExportShare}
              >
                <LinearGradient
                  colors={["#E1306C", "#F77737", "#FCAF45"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.igGradient}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-instagram" size={18} color="#FFFFFF" />
                      <Text style={styles.igShareText}>Share to Story</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.waShareBtn}
                disabled={isSharing}
                onPress={handleExportShare}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                <Text style={styles.waShareText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* App-Switcher / Background Privacy Shield Overlay */}
      {isAppBlurred && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
          <GlassView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject}>
            <View style={styles.privacyShieldContainer}>
              <View style={styles.privacyShieldCard}>
                <Ionicons name="shield-checkmark" size={46} color="#10B981" />
                <Text style={styles.privacyShieldTitle}>ডিজিটাল পাসপোর্ট গোপনীয়তা সক্রিয়</Text>
                <Text style={styles.privacyShieldDesc}>
                  স্ক্রিনশট ও অ্যাপ-সুইচারে সংবেদনশীল পাসপোর্ট তথ্য সুরক্ষিত রাখতে ঝাপসা করা হয়েছে
                </Text>
              </View>
            </View>
          </GlassView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060D1E",
  },
  passportNoHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  maskToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(253, 224, 71, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.3)",
  },
  maskToggleBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FDE047",
  },
  securitySubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  securitySubText: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "500",
  },
  privacyShieldContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(6, 13, 30, 0.85)",
  },
  privacyShieldCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.5)" } : {}),
  },
  privacyShieldTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
    marginTop: 14,
    textAlign: "center",
  },
  privacyShieldDesc: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#060D1E",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#E2E8F0",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#1E293B",
    borderColor: "#EAB308",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 9999,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.3)" } : {}),
  },
  toastText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    marginStart: 10,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0B1329",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  storyShareBtn: {
    borderRadius: 20,
    overflow: "hidden",
  },
  storyShareGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  storyShareText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // 3D Passport Card
  passportCardWrap: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 16px rgba(15, 23, 42, 0.45)" } : {}),
  },
  passportCard: {
    borderRadius: 20,
    padding: 2,
    overflow: "hidden",
  },
  cardGoldBorder: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#EAB308",
    borderStyle: "dashed",
    padding: 16,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(234, 179, 8, 0.25)",
    paddingBottom: 10,
  },
  emblemContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
  },
  emblemStar: {
    color: "#FDE047",
    fontSize: 16,
    fontWeight: "900",
  },
  cardAuthorityText: {
    alignItems: "center",
  },
  cardGovEn: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  cardGovBn: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  biometricChip: {
    width: 28,
    alignItems: "center",
  },
  cardIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarGradient: {
    width: 68,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EAB308",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedCheckBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#10B981",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  identityDetails: {
    marginStart: 16,
    flex: 1,
  },
  labelMuted: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  holderName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  passportNumber: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nationalityBadge: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginEnd: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  nationalityText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  xpText: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "800",
    marginStart: 3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  levelPill: {
    borderRadius: 20,
    overflow: "hidden",
  },
  levelPillGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    marginStart: 5,
  },
  cardFooterStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerStatText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  footerStatBold: {
    color: "#FDE047",
    fontWeight: "800",
  },

  // Milestone Progression Section
  milestoneSection: {
    backgroundColor: "#0B1329",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 20,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  milestoneTitleWrap: {
    flex: 1,
  },
  milestoneSectionTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  milestoneSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  viewPerksBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewPerksText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    marginEnd: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#1E293B",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  activePerkCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  activePerkText: {
    color: "#CBD5E1",
    fontSize: 12,
    marginStart: 6,
  },
  activePerkBold: {
    color: "#F59E0B",
    fontWeight: "700",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0B1329",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#1E293B",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginStart: 6,
  },
  tabTextActive: {
    color: "#FDE047",
    fontWeight: "800",
  },

  tabContentContainer: {
    marginBottom: 20,
  },

  // Scratch Map Sub-components
  scratchActionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B1329",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 12,
  },
  scratchStatsText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  scratchStatsAccent: {
    color: "#FDE047",
    fontWeight: "800",
  },
  scratchStatsSub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  scratchAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scratchAllBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 4,
  },

  // Division Carousel
  divisionCarousel: {
    paddingVertical: 4,
    marginBottom: 16,
  },
  divisionPill: {
    backgroundColor: "#0B1329",
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginEnd: 8,
  },
  divisionPillActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  divisionText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  divisionTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },

  // Districts Grid
  districtsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  districtTileWrap: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  unvisitedTile: {
    backgroundColor: "#0B1329",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    minHeight: 135,
    justifyContent: "center",
  },
  unvisitedLock: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  faintIcon: {
    opacity: 0.35,
    marginBottom: 6,
  },
  unvisitedTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  unvisitedBn: {
    color: "#475569",
    fontSize: 12,
  },
  unvisitedCode: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 1,
  },

  // Scratchable Visited Tile (Gold foil)
  scratchableTile: {
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 135,
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  sparkleBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  scratchPillTitle: {
    color: "#FEF08A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  scratchDistrictName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 6,
  },
  tapToRevealBtn: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tapToRevealText: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "800",
  },

  // Scratched Unlocked Tile
  scratchedTile: {
    borderRadius: 16,
    padding: 12,
    minHeight: 135,
    justifyContent: "space-between",
  },
  scratchedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rarityPill: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  scratchedIcon: {
    alignSelf: "center",
    marginVertical: 2,
  },
  scratchedName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  scratchedBn: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  scratchedLandmark: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },

  // International Grid
  internationalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  countryCard: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  countryCardLocked: {
    opacity: 0.65,
  },
  countryCardGradient: {
    padding: 14,
    minHeight: 140,
    justifyContent: "space-between",
    borderRadius: 16,
  },
  countryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryFlag: {
    fontSize: 26,
  },
  visitedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  visitedPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 3,
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lockPillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 3,
  },
  countryName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  countryBn: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  countryLandmark: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  stampSerialBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  stampSerialText: {
    color: "#FDE047",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "700",
  },

  // Stamps Tab & Vintage Parchment Page
  stampsHeaderBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  stampsMainTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  stampsSubTitle: {
    color: "#94A3B8",
    fontSize: 12,
  },
  simulateTravelBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  simulateTravelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 4,
  },
  parchmentPage: {
    backgroundColor: "#FDFBF7",
    borderRadius: 16,
    padding: 16,
    minHeight: 400,
    borderWidth: 2,
    borderColor: "#D6D3D1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.25)" } : {}),
  },
  parchmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
    paddingBottom: 8,
    marginBottom: 16,
  },
  parchmentTitle: {
    color: "#78716C",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  parchmentPageNo: {
    color: "#A8A29E",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyStampsWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStampsTitle: {
    color: "#78716C",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyStampsSub: {
    color: "#A8A29E",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  stampItemWrap: {
    width: "48%",
    marginBottom: 16,
  },
  stampBox: {
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  stampSealCircular: {
    borderRadius: 28,
  },
  stampSealOval: {
    borderRadius: 20,
  },
  stampAuthority: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  stampCenterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  stampDest: {
    fontSize: 13,
    fontWeight: "900",
    marginStart: 4,
  },
  stampDate: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  stampSerial: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
    marginTop: 2,
  },

  // Perks Tab
  perksHeaderBar: {
    marginBottom: 14,
  },
  perksHeaderTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  perksHeaderSub: {
    color: "#94A3B8",
    fontSize: 12,
  },
  milestoneLevelCard: {
    backgroundColor: "#0B1329",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 12,
  },
  milestoneLevelCardLocked: {
    opacity: 0.55,
  },
  milestoneCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 10,
    marginBottom: 10,
  },
  milestoneBadgePill: {
    flexDirection: "row",
    alignItems: "center",
  },
  milestoneBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginEnd: 10,
  },
  milestoneLevelNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  milestoneLevelTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  milestoneLevelBn: {
    color: "#94A3B8",
    fontSize: 12,
  },
  unlockedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  unlockedTagText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 3,
  },
  lockedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  lockedTagText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginStart: 4,
  },
  perksListWrap: {},
  perkRowItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  perkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  perkDetailsWrap: {
    marginStart: 10,
    flex: 1,
  },
  perkTitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  perkTitleLocked: {
    color: "#64748B",
  },
  perkDesc: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 1,
  },
  copyCouponBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  copyCouponText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
    marginEnd: 4,
  },

  // Modals common
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  districtModalContent: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  districtModalHeader: {
    padding: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  modalDistrictName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  modalDistrictBn: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    marginTop: 2,
  },
  modalRarityBadge: {
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 10,
  },
  modalRarityText: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "800",
  },
  districtModalBody: {
    padding: 20,
  },
  modalFieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalFieldText: {
    marginStart: 12,
    flex: 1,
  },
  modalFieldLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalFieldValue: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  modalFieldBnSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseBtnText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },

  // Stamp Details Modal
  stampModalCard: {
    backgroundColor: "#FDFBF7",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#D6D3D1",
  },
  stampModalHeader: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  stampModalAuthority: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  stampModalDest: {
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 4,
  },
  stampModalSub: {
    fontSize: 12,
    fontWeight: "700",
  },
  stampModalBody: {
    marginBottom: 16,
  },
  stampInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
  },
  stampInfoLabel: {
    color: "#78716C",
    fontSize: 12,
    fontWeight: "800",
  },
  stampInfoValue: {
    color: "#1C1917",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  stampVerifiedBadge: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stampModalCloseBtn: {
    backgroundColor: "#1C1917",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  stampModalCloseText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Simulate Modal
  simulateModalContent: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  simulateModalHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  simulateModalTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },
  simulateModalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 10,
  },
  simulateGroupTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  simulateOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  simulateOptionText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginStart: 10,
  },

  // Levels Modal
  levelsModalContent: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  levelsModalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  levelsModalTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  levelsModalSub: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  levelTrackItem: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  levelTrackItemCurrent: {
    borderColor: "#EAB308",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
  },
  levelTrackBadge: {
    marginEnd: 12,
  },
  levelTrackGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  levelTrackNum: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  levelTrackInfo: {
    flex: 1,
  },
  levelTrackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelTrackTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  currentLvlTag: {
    backgroundColor: "#EAB308",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentLvlTagText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "900",
  },
  levelTrackBn: {
    color: "#94A3B8",
    fontSize: 12,
  },
  levelTrackRequirement: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  levelTrackDiscount: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },

  // Social Flex Modal & Story View
  shareModalContent: {
    backgroundColor: "#0B1329",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    maxHeight: "90%",
  },
  shareModalHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  shareModalTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  shareModalSub: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  storyCardPreviewWrapper: {
    alignItems: "center",
    marginVertical: 10,
  },
  storyCard: {
    width: 290,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 10px rgba(15, 23, 42, 0.5)" } : {}),
  },
  storyCardGradient: {
    padding: 4,
  },
  storyGoldBorder: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EAB308",
    borderStyle: "dashed",
    padding: 14,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  storyGovEn: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  storyGovBn: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  storyProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#1E293B",
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  storyAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  storyHolderName: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
  },
  storyPassNo: {
    color: "#38BDF8",
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  storyMilestonePill: {
    backgroundColor: "#065F46",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  storyMilestoneText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800",
  },
  storyStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  storyStatItem: {
    alignItems: "center",
  },
  storyStatVal: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "900",
  },
  storyStatLbl: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  storyStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#334155",
  },
  storyRecentTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  storyMiniStampsRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginBottom: 8,
  },
  storyMiniStampBadge: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 3,
  },
  storyMiniStampText: {
    fontSize: 12,
    fontWeight: "800",
  },
  storyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 6,
  },
  storyBrand: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  storyTag: {
    color: "#FDE047",
    fontSize: 12,
    fontWeight: "800",
  },

  // Share Buttons
  shareButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  igShareBtn: {
    flex: 1,
    marginEnd: 6,
    borderRadius: 14,
    overflow: "hidden",
  },
  igGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  igShareText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginStart: 6,
  },
  waShareBtn: {
    flex: 1,
    marginStart: 6,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  waShareText: {
    color: "#25D366",
    fontSize: 13,
    fontWeight: "800",
    marginStart: 6,
  },
});
