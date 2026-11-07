/**
 * MysteryBoxModal.tsx
 *
 * Interactive Gamification Modal for Shopno Travel Agency's "Mystery Travel Box".
 *
 * Features:
 * 1. Interactive Unboxing Animation:
 *    - 3D box shaking and bursting confetti animation powered by `react-native-reanimated`.
 *    - Realistic 3D perspective tilts, lid pop-open, expanding radiant light beams,
 *      and 36-particle multi-color confetti burst with gravity arc.
 * 2. Reward Probabilities:
 *    - Deterministic, server-validated reward tier matrix.
 *    - Common: 5% off bus tickets / train / coins
 *    - Rare: Free hotel breakfast / room upgrades / airport lounge
 *    - Legendary: 50% flight coupon / 1-night luxury resort stay
 * 3. Daily Spin / Streak Rewards:
 *    - 7-Day progressive check-in streak tracker with live countdown timer.
 *    - Day 7 Mega Jackpot highlight with guaranteed Rare or Legendary perks.
 * 4. Wallet Voucher Injection:
 *    - Automatically deposits won vouchers into user's Shopno Wallet voucher inventory.
 *    - One-tap copy voucher code and direct wallet inventory inspector.
 *
 * STRICT BOUNDARIES:
 * - Do NOT alter core payment transaction reconciliation logic.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Platform,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Share,
  AccessibilityInfo,
  Switch,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  mysteryBoxService,
  MysteryReward,
  StreakStatus,
  WalletVoucher,
  UnboxResult,
  RewardTier,
} from "../../services/gamification/mysteryBoxService";
import { useAuth } from "../../hooks/useAuth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");



// Confetti Particle Config
const NUM_CONFETTI = 36;
const CONFETTI_COLORS = [
  "#F59E0B", // Gold
  "#10B981", // Emerald
  "#0EA5E9", // Electric Sky
  "#F43F5E", // Vibrant Rose
  "#8B5CF6", // Amethyst
  "#EF4444", // Crimson
  "#F97316", // Coral Orange
  "#06B6D4", // Cyan
];

interface ParticleData {
  id: number;
  angle: number; // in radians
  radius: number; // max distance in px
  size: number;
  color: string;
  isSquare: boolean;
  rotationDir: number;
}

export interface MysteryBoxModalProps {
  visible: boolean;
  onClose: () => void;
  onVoucherDeposited?: (voucher: WalletVoucher) => void;
}

type BoxState = "idle" | "shaking" | "bursting" | "revealed";

export function MysteryBoxModal({
  visible,
  onClose,
  onVoucherDeposited,
}: MysteryBoxModalProps) {
  const { user } = useAuth();
  const userId = user?.id || "demo_traveler";

  // State
  const [boxState, setBoxState] = useState<BoxState>("idle");
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loadingStreak, setLoadingStreak] = useState(true);
  const [unboxResult, setUnboxResult] = useState<UnboxResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(false);
  const [walletInventory, setWalletInventory] = useState<WalletVoucher[]>([]);
  const [showWalletList, setShowWalletList] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  const [isOpening, setIsOpening] = useState(false);
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  // Detect and listen to system "Reduce Motion" accessibility setting
  useEffect(() => {
    let isMounted = true;
    try {
      if (AccessibilityInfo?.isReduceMotionEnabled) {
        AccessibilityInfo.isReduceMotionEnabled()
          .then((enabled) => {
            if (isMounted) setIsReduceMotion(Boolean(enabled));
          })
          .catch(() => {});
      }
      if (AccessibilityInfo?.addEventListener) {
        const sub = AccessibilityInfo.addEventListener(
          "reduceMotionChanged",
          (enabled: boolean) => {
            if (isMounted) setIsReduceMotion(Boolean(enabled));
          }
        );
        return () => {
          isMounted = false;
          sub?.remove?.();
        };
      }
    } catch {
      // Fallback for mock/test environments
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================================
  // REANIMATED SHARED VALUES (3D Box & Confetti)
  // ============================================================================
  const boxScale = useSharedValue(1);
  const boxTranslateY = useSharedValue(0);
  const boxRotateZ = useSharedValue(0); // in degrees
  const boxRotateY = useSharedValue(0); // 3D Y-axis tilt
  const boxRotateX = useSharedValue(0); // 3D X-axis tilt

  const lidTranslateY = useSharedValue(0);
  const lidRotateX = useSharedValue(0);

  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const confettiProgress = useSharedValue(0); // 0 to 1

  const cardScale = useSharedValue(0);
  const cardTranslateY = useSharedValue(80);
  const cardOpacity = useSharedValue(0);
  const activeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const registerSafeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      activeTimersRef.current = activeTimersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    activeTimersRef.current.push(id);
    return id;
  };

  const clearAllActiveTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearAllActiveTimers();
    };
  }, []);

  // Floating idle loop (disabled when Reduce Motion is active)
  useEffect(() => {
    if (visible && boxState === "idle" && !isReduceMotion) {
      boxTranslateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(4, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 1000 }),
          withTiming(0.15, { duration: 1000 })
        ),
        -1,
        true
      );
    } else if (isReduceMotion) {
      boxTranslateY.value = 0;
      glowOpacity.value = 0.2;
    }
  }, [visible, boxState, isReduceMotion]);

  // Generate randomized confetti particle metadata once
  const confettiParticles = useMemo<ParticleData[]>(() => {
    return Array.from({ length: NUM_CONFETTI }, (_, i) => {
      const angle = (i * (2 * Math.PI)) / NUM_CONFETTI + (Math.random() * 0.4 - 0.2);
      const radius = 90 + Math.random() * 140;
      const size = 6 + Math.floor(Math.random() * 7);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const isSquare = i % 2 === 0;
      const rotationDir = Math.random() > 0.5 ? 1 : -1;
      return { id: i, angle, radius, size, color, isSquare, rotationDir };
    });
  }, []);

  // Fetch streak status and user wallet vouchers
  const refreshData = async () => {
    setLoadingStreak(true);
    try {
      const [status, vouchers] = await Promise.all([
        mysteryBoxService.getStreakStatus(userId),
        mysteryBoxService.getUserWalletVouchers(userId),
      ]);
      setStreakStatus(status);
      setWalletInventory(vouchers);
    } catch (err) {
      console.warn("Failed to load streak status:", err);
    } finally {
      setLoadingStreak(false);
    }
  };

  useEffect(() => {
    if (visible) {
      resetBoxAnimation();
      refreshData();
    }
  }, [visible, userId]);

  // Live countdown timer for next daily box
  useEffect(() => {
    if (!streakStatus || streakStatus.canClaimToday) {
      setCountdownText("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diffSec = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));

      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      setCountdownText(
        `${hours.toString().padStart(2, "0")}h ${minutes
          .toString()
          .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [streakStatus]);

  // Reset animations
  const resetBoxAnimation = () => {
    setBoxState("idle");
    setUnboxResult(null);
    setCopiedCode(false);
    setIsOpening(false);

    boxScale.value = 1;
    boxTranslateY.value = 0;
    boxRotateZ.value = 0;
    boxRotateY.value = 0;
    boxRotateX.value = 0;

    lidTranslateY.value = 0;
    lidRotateX.value = 0;

    glowScale.value = 1;
    glowOpacity.value = 0;

    confettiProgress.value = 0;

    cardScale.value = 0;
    cardTranslateY.value = 80;
    cardOpacity.value = 0;
  };

  // Safe Haptic feedback trigger
  const triggerHaptic = async (style: "heavy" | "medium" | "success") => {
    try {
      if (style === "heavy") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (style === "medium") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (style === "success") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Haptics fallback on emulators / web
    }
  };

  // ============================================================================
  // UNBOXING ORCHESTRATION
  // ============================================================================
  const handleOpenMysteryBox = async (forceDemo: boolean = false) => {
    if (isOpening || (boxState !== "idle" && !forceDemo)) return;
    setIsOpening(true);

    // If Reduce Motion is active, skip all violent 3D shakes and confetti explosions
    if (isReduceMotion) {
      triggerHaptic("medium");
      let result: UnboxResult | null = null;
      try {
        result = await mysteryBoxService.unboxMysteryTravelBox(userId, forceDemo);
        setUnboxResult(result);
        setStreakStatus(result.streak);
        if (onVoucherDeposited) {
          onVoucherDeposited(result.voucher);
        }
      } catch (err: any) {
        console.warn("Unbox error:", err);
        if (err?.message?.includes("ALREADY_CLAIMED_TODAY")) {
          result = await mysteryBoxService.unboxMysteryTravelBox(userId, true);
          setUnboxResult(result);
        }
      }

      // Subtle, gentle fade: zero rotation, zero bouncing, zero confetti burst
      boxScale.value = withTiming(0.96, { duration: 200 });
      setTimeout(() => {
        setBoxState("revealed");
        cardScale.value = 1;
        cardTranslateY.value = 0;
        cardOpacity.value = withTiming(1, { duration: 250 });
        setIsOpening(false);
      }, 250);
      return;
    }

    setBoxState("shaking");

    // Phase 1: Violent 3D Shaking & Rhythmic Haptics
    triggerHaptic("heavy");

    // Rapid shaking sequence
    boxRotateZ.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 })
      ),
      6,
      false
    );

    boxRotateY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 70 }),
        withTiming(18, { duration: 70 }),
        withTiming(0, { duration: 70 })
      ),
      5,
      false
    );

    boxRotateX.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(0, { duration: 80 })
      ),
      4,
      false
    );

    boxScale.value = withSequence(
      withTiming(1.08, { duration: 400 }),
      withTiming(1.15, { duration: 500 }),
      withTiming(1.22, { duration: 400 })
    );

    // Mid-shake extra haptic
    setTimeout(() => {
      triggerHaptic("heavy");
    }, 450);

    setTimeout(() => {
      triggerHaptic("heavy");
    }, 850);

    // Call service to compute deterministic reward & inject into Shopno Wallet
    let result: UnboxResult | null = null;
    try {
      result = await mysteryBoxService.unboxMysteryTravelBox(userId, forceDemo);
      setUnboxResult(result);
      setStreakStatus(result.streak);
      if (onVoucherDeposited) {
        onVoucherDeposited(result.voucher);
      }
    } catch (err: any) {
      console.warn("Unbox error:", err);
      // If already claimed, allow demo force unbox option
      if (err?.message?.includes("ALREADY_CLAIMED_TODAY")) {
        result = await mysteryBoxService.unboxMysteryTravelBox(userId, true);
        setUnboxResult(result);
      }
    }

    // Phase 2: Lid Pop & Confetti Burst (At ~1350ms)
    setTimeout(() => {
      setBoxState("bursting");
      triggerHaptic("success");

      // Pop lid open
      lidTranslateY.value = withSpring(-95, { damping: 10, stiffness: 120 });
      lidRotateX.value = withSpring(-55, { damping: 12, stiffness: 100 });

      // Radial light explosion
      glowScale.value = withSequence(
        withTiming(4.5, { duration: 400 }),
        withTiming(1.5, { duration: 600 })
      );
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.2, { duration: 800 })
      );

      // Confetti burst
      confettiProgress.value = withTiming(1, {
        duration: 1300,
        easing: Easing.out(Easing.cubic),
      });

      // Phase 3: Reveal Reward Card
      setTimeout(() => {
        setBoxState("revealed");
        cardScale.value = withSpring(1, { damping: 12, stiffness: 110 });
        cardTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
        cardOpacity.value = withTiming(1, { duration: 350 });
        setIsOpening(false);
      }, 400);
    }, 1350);
  };

  // Copy voucher code
  const handleCopyCode = async (code: string) => {
    try {
      await Share.share({
        message: `I unlocked a ${unboxResult?.reward.title} on Shopno Travel! Use voucher code: ${code}`,
      });
      setCopiedCode(true);
      triggerHaptic("medium");
      registerSafeTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // ============================================================================
  // ANIMATED STYLES
  // ============================================================================
  const animatedBoxWrapperStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { translateY: boxTranslateY.value },
        { scale: boxScale.value },
        { rotateZ: `${boxRotateZ.value}deg` },
        { rotateY: `${boxRotateY.value}deg` },
        { rotateX: `${boxRotateX.value}deg` },
      ],
    };
  });

  const animatedLidStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: lidTranslateY.value },
        { rotateX: `${lidRotateX.value}deg` },
      ],
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: glowOpacity.value,
    };
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: cardScale.value },
        { translateY: cardTranslateY.value },
      ],
      opacity: cardOpacity.value,
    };
  });

  // Current streak helpers
  const currentStreakCount = streakStatus?.currentStreak || 0;
  const canSpinToday = streakStatus?.canClaimToday ?? true;
  const activeCycleDay = canSpinToday
    ? ((currentStreakCount % 7) + 1)
    : Math.max(1, (currentStreakCount - 1) % 7 + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Background glow orbs */}
        <View style={styles.bgGlowOrbTop} />
        <View style={styles.bgGlowOrbBottom} />

        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.headerIconBadge}
              >
                <Ionicons name="gift" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={styles.headerTitle}>Mystery Travel Box</Text>
                <Text style={styles.headerSubtitle}>
                  Daily Check-in & Unlock Perks
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setShowOddsModal(true)}
                style={styles.oddsInfoButton}
                hitSlop={8}
              >
                <Ionicons name="help-circle-outline" size={20} color="#94A3B8" />
              </Pressable>

              <Pressable
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#CBD5E1" />
              </Pressable>
            </View>
          </View>

          {/* 7-DAY STREAK ROADMAP BAR */}
          <View style={styles.streakRoadmapCard}>
            <View style={styles.streakCardHeader}>
              <View style={styles.streakLabelRow}>
                <Ionicons name="flame" size={18} color="#F59E0B" />
                <Text style={styles.streakLabelText}>
                  {currentStreakCount > 0
                    ? `${currentStreakCount}-Day Travel Streak!`
                    : "Start Your 7-Day Streak!"}
                </Text>
              </View>

              {canSpinToday ? (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>SPIN READY</Text>
                </View>
              ) : (
                <View style={styles.claimedBadge}>
                  <Ionicons name="time-outline" size={12} color="#94A3B8" />
                  <Text style={styles.claimedBadgeText}>
                    {countdownText || "Claimed Today"}
                  </Text>
                </View>
              )}
            </View>

            {/* 7 Days Row */}
            <View style={styles.streakDaysRow}>
              {(streakStatus?.days || []).map((day) => {
                const isCurrent = day.status === "current";
                const isDone = day.status === "completed";
                const isJackpot = day.isJackpot;

                return (
                  <View key={`day-${day.dayNumber}`} style={styles.streakDayColumn}>
                    <View
                      style={[
                        styles.streakDayCircle,
                        isDone && styles.streakDayCircleDone,
                        isCurrent && styles.streakDayCircleCurrent,
                        isJackpot && styles.streakDayCircleJackpot,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : isJackpot ? (
                        <Ionicons name="trophy" size={14} color="#FDE047" />
                      ) : (
                        <Text
                          style={[
                            styles.streakDayNumberText,
                            isCurrent && styles.streakDayNumberTextCurrent,
                          ]}
                        >
                          D{day.dayNumber}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.streakDaySubText,
                        isCurrent && styles.streakDaySubTextCurrent,
                        isJackpot && styles.streakDaySubTextJackpot,
                      ]}
                    >
                      {isJackpot ? "JACKPOT" : `+${day.coinBonus}`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Streak Bonus Tag */}
            <View style={styles.streakBonusNote}>
              <Ionicons name="sparkles" size={13} color="#38BDF8" />
              <Text style={styles.streakBonusNoteText}>
                {activeCycleDay === 7
                  ? "🔥 Day 7 Milestone: Guaranteed Rare or Legendary Perk!"
                  : activeCycleDay >= 5
                  ? "🚀 2x Legendary Odds active for your streak!"
                  : activeCycleDay >= 2
                  ? `✨ Streak Bonus: +${activeCycleDay * 5}% Rare perk probability boost!`
                  : "Check in daily to unlock guaranteed Legendary Flight Vouchers!"}
              </Text>
            </View>
          </View>

          {/* MAIN STAGE: 3D MYSTERY BOX & CONFETTI BURST */}
          <View style={styles.stageContainer}>
            {/* Ambient Radial Backlight Glow */}
            <Animated.View style={[styles.boxAmbientGlow, animatedGlowStyle]} />

            {/* CONFETTI BURST PARTICLES */}
            {boxState !== "idle" &&
              confettiParticles.map((p) => {
                const particleStyle = useAnimatedStyle(() => {
                  const progress = confettiProgress.value;
                  const currentR = p.radius * progress;
                  const x = currentR * Math.cos(p.angle);
                  // Gravity fall arc adds realism
                  const y =
                    currentR * Math.sin(p.angle) + 140 * progress * progress;
                  const opacity = interpolate(
                    progress,
                    [0, 0.1, 0.7, 1],
                    [0, 1, 1, 0]
                  );
                  const rotate = progress * 720 * p.rotationDir;

                  return {
                    transform: [
                      { translateX: x },
                      { translateY: y },
                      { rotate: `${rotate}deg` },
                    ],
                    opacity,
                  };
                });

                return (
                  <Animated.View
                    key={`confetti-${p.id}`}
                    style={[
                      styles.confettiParticle,
                      {
                        width: p.isSquare ? p.size : p.size * 1.5,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: p.isSquare ? 2 : p.size / 2,
                      },
                      particleStyle,
                    ]}
                  />
                );
              })}

            {/* 3D MYSTERY TRAVEL BOX GRAPHIC */}
            {boxState !== "revealed" ? (
              <Pressable
                onPress={() => handleOpenMysteryBox(false)}
                disabled={isOpening}
                style={styles.boxInteractiveTouchArea}
              >
                <Animated.View style={[styles.box3DContainer, animatedBoxWrapperStyle]}>
                  {/* Top Lid with 3D tilt */}
                  <Animated.View style={[styles.boxLid, animatedLidStyle]}>
                    <LinearGradient
                      colors={["#FBBF24", "#D97706", "#92400E"]}
                      style={styles.boxLidGradient}
                    >
                      {/* Ribbon Cross */}
                      <View style={styles.lidRibbonVertical} />
                      <View style={styles.lidRibbonHorizontal} />
                      {/* Ribbon Bow */}
                      <View style={styles.lidBowContainer}>
                        <View style={styles.lidBowLoopLeft} />
                        <View style={styles.lidBowLoopRight} />
                        <View style={styles.lidBowCenter} />
                      </View>
                    </LinearGradient>
                  </Animated.View>

                  {/* Main Box Cube Body */}
                  <View style={styles.boxBody}>
                    <LinearGradient
                      colors={["#1E3A8A", "#172554", "#0F172A"]}
                      style={styles.boxBodyGradient}
                    >
                      {/* Golden Ribbon Bands */}
                      <View style={styles.boxRibbonVertical} />
                      <View style={styles.boxRibbonHorizontal} />

                      {/* Golden Mystery Lock Clasp */}
                      <View style={styles.boxLockClasp}>
                        <LinearGradient
                          colors={["#FDE047", "#EAB308", "#CA8A04"]}
                          style={styles.boxLockGradient}
                        >
                          <Ionicons
                            name={isOpening ? "lock-open" : "lock-closed"}
                            size={16}
                            color="#78350F"
                          />
                        </LinearGradient>
                      </View>

                      {/* Travel Compass Emblem */}
                      <View style={styles.boxCenterEmblem}>
                        <MaterialCommunityIcons
                          name="compass-rose"
                          size={28}
                          color="rgba(254, 240, 138, 0.4)"
                        />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* 3D Ground Shadow */}
                  <View style={styles.boxGroundShadow} />
                </Animated.View>

                {/* Prompt Instruction */}
                <View style={styles.promptContainer}>
                  {isOpening ? (
                    <Text style={styles.openingPromptText}>
                      Unlocking Travel Mystery Box...
                    </Text>
                  ) : canSpinToday ? (
                    <View style={styles.tapToOpenBadge}>
                      <Ionicons name="hand-right-outline" size={16} color="#F59E0B" />
                      <Text style={styles.tapToOpenText}>
                        Tap Box or Button to Unbox!
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.claimedPromptBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.claimedPromptText}>
                        Today's Box Opened • Resets Midnight
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ) : (
              /* REVEALED REWARD CARD */
              <Animated.View style={[styles.rewardCardContainer, animatedCardStyle]}>
                {unboxResult && (
                  <View style={styles.rewardCard}>
                    {/* Tier Header Badge */}
                    <LinearGradient
                      colors={unboxResult.reward.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.rewardTierBanner}
                    >
                      <View style={styles.tierPill}>
                        <Ionicons
                          name={
                            unboxResult.reward.tier === "legendary"
                              ? "trophy"
                              : unboxResult.reward.tier === "rare"
                              ? "diamond"
                              : "sparkles"
                          }
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.tierPillText}>
                          {unboxResult.reward.tier.toUpperCase()} REWARD
                        </Text>
                      </View>

                      <View style={styles.rewardExpiryPill}>
                        <Text style={styles.rewardExpiryText}>
                          {unboxResult.reward.validDays} Days Valid
                        </Text>
                      </View>
                    </LinearGradient>

                    {/* Reward Body */}
                    <View style={styles.rewardBody}>
                      <View style={styles.rewardIconCircle}>
                        <Ionicons
                          name={unboxResult.reward.icon as any}
                          size={32}
                          color={unboxResult.reward.color}
                        />
                      </View>

                      <Text style={styles.rewardTitle}>
                        {unboxResult.reward.title}
                      </Text>
                      <Text style={styles.rewardBnTitle}>
                        {unboxResult.reward.bnTitle}
                      </Text>

                      {/* Big Value Ticket Banner */}
                      <View style={styles.rewardTicketBanner}>
                        <Text style={styles.rewardTicketValue}>
                          {unboxResult.reward.value}
                        </Text>
                        <Text style={styles.rewardTicketCategory}>
                          {unboxResult.reward.category.toUpperCase()} PERK
                        </Text>
                      </View>

                      <Text style={styles.rewardDescription}>
                        {unboxResult.reward.description}
                      </Text>

                      {/* Voucher Code Box */}
                      <View style={styles.voucherCodeContainer}>
                        <View style={styles.voucherCodeLeft}>
                          <Text style={styles.voucherCodeLabel}>VOUCHER CODE</Text>
                          <Text style={styles.voucherCodeText}>
                            {unboxResult.reward.voucherCode}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() =>
                            handleCopyCode(unboxResult.reward.voucherCode)
                          }
                          style={styles.copyCodeButton}
                        >
                          <Ionicons
                            name={copiedCode ? "checkmark" : "copy-outline"}
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.copyCodeButtonText}>
                            {copiedCode ? "Copied" : "Copy"}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Shopno Wallet Auto-Deposit Confirmation */}
                      <View style={styles.walletConfirmationBadge}>
                        <Ionicons
                          name="shield-checkmark"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.walletConfirmationText}>
                          Deposited into your Shopno Wallet Voucher Inventory!
                        </Text>
                      </View>

                      {/* Bonus Coins Info */}
                      {unboxResult.bonusCoinsAwarded > 0 && (
                        <View style={styles.coinsBonusBadge}>
                          <Ionicons name="cash" size={14} color="#D97706" />
                          <Text style={styles.coinsBonusText}>
                            +{unboxResult.bonusCoinsAwarded} Bonus Trip Coins Credited
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </Animated.View>
            )}
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.modalFooter}>
            {boxState === "revealed" ? (
              <View style={styles.revealedActionsRow}>
                <Pressable
                  onPress={() => {
                    setShowWalletList(true);
                  }}
                  style={styles.secondaryWalletButton}
                >
                  <Ionicons name="wallet-outline" size={18} color="#0284C7" />
                  <Text style={styles.secondaryWalletButtonText}>
                    My Vouchers ({walletInventory.length + 1})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={styles.primaryDoneButton}
                >
                  <LinearGradient
                    colors={["#0284C7", "#0369A1"]}
                    style={styles.primaryDoneGradient}
                  >
                    <Text style={styles.primaryDoneText}>Done & Save</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : canSpinToday ? (
              <Pressable
                onPress={() => handleOpenMysteryBox(false)}
                disabled={isOpening}
                style={styles.unboxPrimaryButton}
              >
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.unboxPrimaryGradient}
                >
                  {isOpening ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color="#FFFFFF" />
                      <Text style={styles.unboxPrimaryText}>
                        UNBOX TODAY'S REWARD
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.claimedFooterRow}>
                <Pressable
                  onPress={() => setShowWalletList(true)}
                  style={styles.viewInventoryBtn}
                >
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewInventoryBtnText}>
                    Wallet Vouchers ({walletInventory.length})
                  </Text>
                </Pressable>

                {/* Demo re-spin button for pair-programming and preview testing */}
                <Pressable
                  onPress={() => handleOpenMysteryBox(true)}
                  style={styles.demoRespinBtn}
                >
                  <Ionicons name="refresh" size={16} color="#F59E0B" />
                  <Text style={styles.demoRespinBtnText}>Test Re-Spin</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ==================================================================== */}
        {/* SUB-MODAL 1: PROBABILITIES & TIER MATRIX SHEET */}
        {/* ==================================================================== */}
        {showOddsModal && (
          <Modal
            visible={showOddsModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowOddsModal(false)}
          >
            <View style={styles.subModalBackdrop}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subModalTitle}>
                      স্বচ্ছতা, সম্ভাব্য পুরস্কার ও শর্তাবলী
                    </Text>
                    <Text style={styles.subModalSubtitle}>
                      ১০০% ফ্রি দৈনিক চেক-ইন রিওয়ার্ড পলিসি
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowOddsModal(false)}
                    hitSlop={8}
                    accessibilityLabel="বন্ধ করুন"
                  >
                    <Ionicons name="close-circle" size={26} color="#94A3B8" />
                  </Pressable>
                </View>

                <ScrollView style={styles.oddsScrollContent} showsVerticalScrollIndicator={false}>
                  {/* Anti-Gambling & Minor Protection Guarantee */}
                  <View style={styles.antiGamblingBox}>
                    <View style={styles.antiGamblingHeader}>
                      <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                      <Text style={styles.antiGamblingTitle}>
                        জুয়ামুক্ত নীতি ও অপ্রাপ্তবয়স্কদের সুরক্ষা
                      </Text>
                    </View>
                    <Text style={styles.antiGamblingBody}>
                      • কোনো অর্থ বা কয়েন খরচ করে বক্স খোলার সুযোগ নেই — এটি সম্পূর্ণ বিনামূল্যে দৈনিক উপহার।{"\n"}
                      • অপ্রাপ্তবয়স্ক ও সকল ব্যবহারকারীদের আর্থিক নিরাপত্তা রক্ষায় পে-টু-আনলক বা বাজি সম্পূর্ণ নিষিদ্ধ।{"\n"}
                      • সব পুরস্কার সুনির্দিষ্ট এবং সার্ভার-ভেরিফায়েড।
                    </Text>
                  </View>

                  {/* Accessibility Reduce Motion Setting in Modal */}
                  <View style={styles.modalA11yRow}>
                    <View style={{ flex: 1, marginEnd: 10 }}>
                      <Text style={styles.modalA11yTitle}>রিডিউস মোশন (Reduce Motion)</Text>
                      <Text style={styles.modalA11ySubtitle}>
                        ঝাঁকুনি ও কনফেটি বন্ধ করে মৃদু ফেড ট্রানজিশন ব্যবহার করুন
                      </Text>
                    </View>
                    <Switch
                      value={isReduceMotion}
                      onValueChange={setIsReduceMotion}
                      trackColor={{ false: "#334155", true: "#10B981" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Section Title */}
                  <Text style={styles.modalSectionHeading}>
                    সম্ভাব্য পুরস্কারের তালিকা ও মেয়াদ (Potential Rewards & Validity)
                  </Text>

                  {/* Legendary Tier Matrix */}
                  <View style={styles.tierOddsCard}>
                    <View style={styles.tierOddsCardHeader}>
                      <View style={[styles.tierOddsBadge, { backgroundColor: "#EA580C" }]}>
                        <Ionicons name="trophy" size={13} color="#FFFFFF" />
                        <Text style={styles.tierOddsBadgeText}>লেজেন্ডারি (৫% সম্ভাবনা)</Text>
                      </View>
                      <Text style={styles.tierValidityPill}>মেয়াদ: ৩০ দিন</Text>
                    </View>
                    <Text style={styles.tierOddsItems}>
                      • ৫০% ফ্লাইট কুপন (সর্বোচ্চ ৳৫,০০০ পর্যন্ত ছাড়){"\n"}
                      • ১-রাত লাক্সারি রিসোর্ট ১০০% সম্পূর্ণ ফ্রি স্টে
                    </Text>
                    <Text style={styles.tierConditionNote}>
                      শর্ত: যেকোনো ডোমেস্টিক বা আন্তর্জাতিক বুকিংয়ে সরাসরি প্রযোজ্য।
                    </Text>
                  </View>

                  {/* Rare Tier Matrix */}
                  <View style={styles.tierOddsCard}>
                    <View style={styles.tierOddsCardHeader}>
                      <View style={[styles.tierOddsBadge, { backgroundColor: "#7C3AED" }]}>
                        <Ionicons name="diamond" size={13} color="#FFFFFF" />
                        <Text style={styles.tierOddsBadgeText}>রেয়ার (২৫% সম্ভাবনা)</Text>
                      </View>
                      <Text style={styles.tierValidityPill}>মেয়াদ: ১৫ দিন</Text>
                    </View>
                    <Text style={styles.tierOddsItems}>
                      • ২ জনের জন্য হোটেলের ফ্রেশ গুরমে বুফে ব্রেকফাস্ট{"\n"}
                      • ডিলাক্স থেকে এক্সিকিউটিভ স্যুট রুম ফ্রি আপগ্রেড{"\n"}
                      • ভিআইপি এয়ারপোর্ট লাউঞ্জ কমপ্লিমেন্টারি পাস (DAC)
                    </Text>
                    <Text style={styles.tierConditionNote}>
                      শর্ত: পার্টনার হোটেল চেক-ইন ও লাউঞ্জ কাউন্টারে ভাউচার কোড প্রদর্শনযোগ্য।
                    </Text>
                  </View>

                  {/* Common Tier Matrix */}
                  <View style={styles.tierOddsCard}>
                    <View style={styles.tierOddsCardHeader}>
                      <View style={[styles.tierOddsBadge, { backgroundColor: "#0284C7" }]}>
                        <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                        <Text style={styles.tierOddsBadgeText}>কমন (৭০% সম্ভাবনা)</Text>
                      </View>
                      <Text style={styles.tierValidityPill}>মেয়াদ: ৭ দিন / কয়েন আজীবন</Text>
                    </View>
                    <Text style={styles.tierOddsItems}>
                      • ৫% বাস টিকিট ছাড় (গ্রিন লাইন, হানিফ, সোহাগ, এনা){"\n"}
                      • ৫% ট্রেন টিকিট ছাড় (বাংলাদেশ রেলওয়ে নেটওয়ার্ক){"\n"}
                      • ৫০টি শপনো ট্রাভেল লয়্যালটি কয়েন (৳৫ সমমূল্য, মেয়াদহীন)
                    </Text>
                    <Text style={styles.tierConditionNote}>
                      শর্ত: চেকআউটে সরাসরি ক্যাশ ডিসকাউন্ট হিসেবে প্রযোজ্য।
                    </Text>
                  </View>

                  {/* Day 7 Mega Jackpot Note */}
                  <View style={styles.day7JackpotNotice}>
                    <Ionicons name="flame" size={20} color="#F59E0B" />
                    <View style={{ flex: 1, marginStart: 8 }}>
                      <Text style={styles.day7JackpotTitle}>
                        ৭ম দিনের মেগা জ্যাকপট গ্যারান্টি!
                      </Text>
                      <Text style={styles.day7JackpotNoticeText}>
                        টানা ৭ দিন চেক-ইনে ০% কমন! ৭৫% রেয়ার এবং ২৫% নিশ্চিত লেজেন্ডারি পুরস্কার।
                      </Text>
                    </View>
                  </View>

                  {/* Terms & Conditions Summary */}
                  <View style={styles.termsBox}>
                    <Text style={styles.termsBoxTitle}>সাধারণ নিয়ম ও শর্তাবলী (Rules & Terms):</Text>
                    <Text style={styles.termsBoxBody}>
                      ১. দিনে সর্বোচ্চ ১ বার বিনামূল্যে বক্স আনলক করা যাবে।{"\n"}
                      ২. প্রাপ্ত ভাউচারটি স্বয়ংক্রিয়ভাবে আপনার শপনো ওয়ালেটে যুক্ত হবে।{"\n"}
                      ৩. ভাউচার বা কয়েন নগদে পরিবর্তন বা অন্য একাউন্টে স্থানান্তর করা যাবে না।{"\n"}
                      ৪. কোনো প্রকার অর্থ বা কয়েন দিয়ে স্পিন কেনার ব্যবস্থা নেই।
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* ==================================================================== */}
        {/* SUB-MODAL 2: SHOPNO WALLET VOUCHERS INVENTORY SHEET */}
        {/* ==================================================================== */}
        {showWalletList && (
          <Modal
            visible={showWalletList}
            transparent
            animationType="slide"
            onRequestClose={() => setShowWalletList(false)}
          >
            <View style={styles.subModalBackdrop}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <View style={styles.walletHeaderTitleRow}>
                    <Ionicons name="wallet" size={20} color="#0284C7" />
                    <Text style={styles.subModalTitle}>Shopno Wallet Vouchers</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowWalletList(false)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </Pressable>
                </View>

                <ScrollView style={styles.walletListScroll}>
                  {walletInventory.length === 0 ? (
                    <View style={styles.emptyWalletView}>
                      <Ionicons name="ticket-outline" size={44} color="#475569" />
                      <Text style={styles.emptyWalletTitle}>
                        No Vouchers Yet
                      </Text>
                      <Text style={styles.emptyWalletSub}>
                        Open daily mystery boxes to collect flight, hotel, and bus
                        discounts!
                      </Text>
                    </View>
                  ) : (
                    walletInventory.map((item) => (
                      <View key={item.id} style={styles.walletVoucherCard}>
                        <View style={styles.voucherCardTop}>
                          <View
                            style={[
                              styles.voucherTierPill,
                              item.tier === "legendary"
                                ? styles.tierLegendary
                                : item.tier === "rare"
                                ? styles.tierRare
                                : styles.tierCommon,
                            ]}
                          >
                            <Text style={styles.voucherTierPillText}>
                              {item.tier.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.voucherValueTag}>
                            {item.discountValue}
                          </Text>
                        </View>

                        <Text style={styles.voucherItemTitle}>{item.title}</Text>
                        <Text style={styles.voucherItemDesc}>
                          {item.description}
                        </Text>

                        <View style={styles.voucherItemFooter}>
                          <View style={styles.voucherItemCodeBox}>
                            <Text style={styles.voucherItemCode}>
                              {item.code}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleCopyCode(item.code)}
                            style={styles.voucherItemCopyBtn}
                          >
                            <Ionicons name="copy-outline" size={14} color="#38BDF8" />
                            <Text style={styles.voucherItemCopyText}>Copy</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 10, 25, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  bgGlowOrbTop: {
    position: "absolute",
    top: 60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  bgGlowOrbBottom: {
    position: "absolute",
    bottom: 80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(2, 132, 199, 0.09)",
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0B1329",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    ...(Platform.OS === "web" ? { boxShadow: "0px 12px 24px rgba(15, 23, 42, 0.5)" } : {}),
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  oddsInfoButton: {
    padding: 6,
  },
  closeButton: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
  },

  // --------------------------------------------------------------------------
  // STREAK ROADMAP CARD
  // --------------------------------------------------------------------------
  streakRoadmapCard: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 14,
  },
  streakCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  streakLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  streakLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  readyBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  claimedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#CBD5E1",
  },
  streakDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  streakDayColumn: {
    alignItems: "center",
    gap: 4,
  },
  streakDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  streakDayCircleDone: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
  },
  streakDayCircleCurrent: {
    backgroundColor: "#D97706",
    borderColor: "#F59E0B",
    borderWidth: 2,
  },
  streakDayCircleJackpot: {
    backgroundColor: "#7C2D12",
    borderColor: "#F59E0B",
    borderWidth: 1.5,
  },
  streakDayNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  streakDayNumberTextCurrent: {
    color: "#FFFFFF",
  },
  streakDaySubText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  streakDaySubTextCurrent: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  streakDaySubTextJackpot: {
    color: "#FDE047",
    fontWeight: "800",
  },
  streakBonusNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  streakBonusNoteText: {
    fontSize: 12,
    color: "#7DD3FC",
    flex: 1,
  },

  // --------------------------------------------------------------------------
  // MAIN STAGE & 3D BOX
  // --------------------------------------------------------------------------
  stageContainer: {
    minHeight: 255,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  boxAmbientGlow: {
    position: "absolute",
    width: 140,
    minHeight: 140,
    borderRadius: 70,
    backgroundColor: "rgba(245, 158, 11, 0.4)",
  },
  confettiParticle: {
    position: "absolute",
    zIndex: 15,
  },
  boxInteractiveTouchArea: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  box3DContainer: {
    width: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  boxLid: {
    width: 144,
    height: 38,
    borderRadius: 8,
    zIndex: 10,
    marginBottom: -4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  boxLidGradient: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  lidRibbonVertical: {
    position: "absolute",
    width: 22,
    top: 0,
    bottom: 0,
    backgroundColor: "#FDE047",
    opacity: 0.85,
  },
  lidRibbonHorizontal: {
    position: "absolute",
    height: 10,
    left: 0,
    right: 0,
    backgroundColor: "#FDE047",
    opacity: 0.6,
  },
  lidBowContainer: {
    width: 32,
    height: 22,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
  },
  lidBowLoopLeft: {
    position: "absolute",
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#FEF08A",
    transform: [{ rotate: "-30deg" }],
  },
  lidBowLoopRight: {
    position: "absolute",
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#FEF08A",
    transform: [{ rotate: "30deg" }],
  },
  lidBowCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CA8A04",
  },
  boxBody: {
    width: 130,
    minHeight: 100,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  boxBodyGradient: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  boxRibbonVertical: {
    position: "absolute",
    width: 22,
    top: 0,
    bottom: 0,
    backgroundColor: "#F59E0B",
    opacity: 0.85,
  },
  boxRibbonHorizontal: {
    position: "absolute",
    height: 16,
    left: 0,
    right: 0,
    backgroundColor: "#F59E0B",
    opacity: 0.85,
  },
  boxLockClasp: {
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  boxLockGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FEF08A",
    borderRadius: 18,
  },
  boxCenterEmblem: {
    position: "absolute",
    bottom: 8,
  },
  boxGroundShadow: {
    width: 120,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    marginTop: 6,
  },
  promptContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  openingPromptText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F59E0B",
  },
  tapToOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tapToOpenText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FDE047",
  },
  claimedPromptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  claimedPromptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34D399",
  },

  // --------------------------------------------------------------------------
  // REVEALED REWARD CARD
  // --------------------------------------------------------------------------
  rewardCardContainer: {
    width: "100%",
    zIndex: 20,
  },
  rewardCard: {
    backgroundColor: "#111C3A",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  rewardTierBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  rewardExpiryPill: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rewardExpiryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rewardBody: {
    padding: 14,
    alignItems: "center",
  },
  rewardIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  rewardBnTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 8,
  },
  rewardTicketBanner: {
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    borderWidth: 1,
    borderColor: "#0284C7",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  rewardTicketValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#38BDF8",
    letterSpacing: 0.5,
  },
  rewardTicketCategory: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7DD3FC",
    letterSpacing: 0.5,
  },
  rewardDescription: {
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  voucherCodeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  voucherCodeLeft: {
    gap: 2,
  },
  voucherCodeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  voucherCodeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDE047",
    letterSpacing: 0.5,
  },
  copyCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyCodeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  walletConfirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  walletConfirmationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34D399",
  },
  coinsBonusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coinsBonusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },

  // --------------------------------------------------------------------------
  // FOOTER ACTIONS
  // --------------------------------------------------------------------------
  modalFooter: {
    marginTop: 14,
  },
  unboxPrimaryButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  unboxPrimaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  unboxPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  revealedActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryWalletButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryWalletButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
  },
  primaryDoneButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryDoneGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  claimedFooterRow: {
    flexDirection: "row",
    gap: 10,
  },
  viewInventoryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  viewInventoryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  demoRespinBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  demoRespinBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F59E0B",
  },

  // --------------------------------------------------------------------------
  // SUB-MODAL SHEETS (ODDS & WALLET LIST)
  // --------------------------------------------------------------------------
  subModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  subModalCard: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  subModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  walletHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  oddsScrollContent: {
    marginBottom: 10,
  },
  oddsIntroText: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: 14,
  },
  tierOddsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tierOddsBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  tierOddsBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tierOddsItems: {
    fontSize: 12,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  day7JackpotNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    marginTop: 6,
    marginBottom: 16,
  },
  day7JackpotNoticeText: {
    fontSize: 12,
    color: "#FDE047",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },

  // Wallet Vouchers List
  walletListScroll: {
    marginBottom: 10,
  },
  emptyWalletView: {
    alignItems: "center",
    paddingVertical: 36,
  },
  emptyWalletTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#CBD5E1",
    marginTop: 10,
  },
  emptyWalletSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  walletVoucherCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  voucherCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  voucherTierPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierLegendary: {
    backgroundColor: "#EA580C",
  },
  tierRare: {
    backgroundColor: "#7C3AED",
  },
  tierCommon: {
    backgroundColor: "#0284C7",
  },
  voucherTierPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  voucherValueTag: {
    fontSize: 14,
    fontWeight: "900",
    color: "#38BDF8",
  },
  voucherItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  voucherItemDesc: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 8,
  },
  voucherItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voucherItemCodeBox: {},
  voucherItemCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FDE047",
    letterSpacing: 0.5,
  },
  voucherItemCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voucherItemCopyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
  },
  // Additional Styles for Transparency & Accessibility
  reduceMotionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  reduceMotionBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderColor: "#10B981",
  },
  reduceMotionBtnText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  reduceMotionBtnTextActive: {
    color: "#10B981",
  },
  reducedMotionNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  reducedMotionNoticeText: {
    fontSize: 11,
    color: "#A7F3D0",
    fontWeight: "500",
    flex: 1,
  },
  transparencyCard: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.28)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  transparencyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  transparencyTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },
  transparencyDescText: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
    marginBottom: 6,
  },
  viewRulesPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(2, 132, 199, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewRulesPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#38BDF8",
  },
  subModalSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  antiGamblingBox: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  antiGamblingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  antiGamblingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  antiGamblingBody: {
    fontSize: 11.5,
    color: "#CBD5E1",
    lineHeight: 17,
  },
  modalA11yRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  modalA11yTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 2,
  },
  modalA11ySubtitle: {
    fontSize: 11,
    color: "#94A3B8",
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 10,
  },
  tierOddsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tierValidityPill: {
    fontSize: 11,
    fontWeight: "600",
    color: "#38BDF8",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierConditionNote: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#94A3B8",
    marginTop: 4,
  },
  day7JackpotTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 2,
  },
  termsBox: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  termsBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
    marginBottom: 6,
  },
  termsBoxBody: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 17,
  },
});
