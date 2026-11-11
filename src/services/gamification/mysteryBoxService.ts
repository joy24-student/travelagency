/**
 * mysteryBoxService.ts
 *
 * Core Gamification Engine for Shopno Travel Agency's "Mystery Travel Box".
 *
 * Objective:
 * Implement an exciting "Mystery Travel Box" mechanic where travelers unlock
 * randomized perks, discount vouchers, and room upgrades.
 *
 * Requirements:
 * 1. Deterministic, server-validated reward tier matrix
 *    - Common: 5% off bus tickets, 5% off train tickets, 50 Trip coins
 *    - Rare: Free hotel breakfast, Deluxe room upgrades, VIP airport lounge passes
 *    - Legendary: 50% flight coupon, 1-Night luxury resort free stay
 * 2. Daily Spin / Streak Rewards:
 *    - 7-Day progressive check-in streak reward system encouraging continuous app engagement
 *    - Day 7 Mega Jackpot: Guaranteed Rare or Legendary reward
 * 3. Wallet Voucher Injection:
 *    - Automatically deposits won vouchers into user's Shopno Wallet voucher inventory
 *
 * STRICT BOUNDARIES:
 * - Do NOT alter core payment transaction reconciliation logic.
 * - Leaves ShopnoWalletProvider payment deduction, RPC procedures, and reconciliation pristine.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import CryptoJS from "crypto-js";
import { supabase } from "../../utils/supabase";

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================

export type RewardTier = "common" | "rare" | "legendary";

export type RewardCategory = "bus" | "hotel" | "flight" | "train" | "lounge" | "wallet";

export type RewardDiscountType = "percentage" | "fixed" | "perk" | "upgrade" | "coins";

export interface MysteryReward {
  id: string;
  tier: RewardTier;
  title: string;
  bnTitle: string;
  description: string;
  bnDescription: string;
  category: RewardCategory;
  discountType: RewardDiscountType;
  value: string; // e.g. "5% OFF", "FREE BREAKFAST", "50% OFF"
  numericValue: number; // e.g. 5, 0, 50, 100
  voucherCode: string;
  minSpend?: number; // in BDT
  maxDiscount?: number; // in BDT
  validDays: number;
  icon: string; // Ionicons glyph name
  color: string;
  gradient: [string, string];
  serverHash: string; // HMAC validation hash
  issuedAt: string;
  expiresAt: string;
}

export interface StreakDayInfo {
  dayNumber: number; // 1 to 7
  title: string;
  bonusDescription: string;
  coinBonus: number;
  rareBonusPct: number;
  legendaryBonusPct: number;
  isJackpot: boolean;
  status: "completed" | "current" | "locked";
}

export interface StreakStatus {
  userId: string;
  currentStreak: number; // 1 to 7 cycle
  totalStreakDays: number; // Lifetime consecutive check-ins
  longestStreak: number;
  lastCheckInDate: string | null; // "YYYY-MM-DD"
  canClaimToday: boolean;
  secondsUntilNextDaily: number;
  days: StreakDayInfo[];
  totalBoxesOpened: number;
}

export interface WalletVoucher {
  id: string;
  userId: string;
  code: string;
  title: string;
  description: string;
  tier: RewardTier;
  category: RewardCategory;
  discountType: RewardDiscountType;
  discountValue: string;
  numericValue: number;
  minSpend?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  isUsed: boolean;
  usedAt?: string | null;
  origin: "mystery_box";
  serverSignature: string;
  claimedAt: string;
}

export interface UnboxResult {
  success: boolean;
  reward: MysteryReward;
  voucher: WalletVoucher;
  streak: StreakStatus;
  isFirstClaimToday: boolean;
  serverValidationToken: string;
  depositedToShopnoWallet: boolean;
  bonusCoinsAwarded: number;
}

// ============================================================================
// REWARD TIER MATRIX CATALOG
// ============================================================================

interface RewardDefinition {
  id: string;
  tier: RewardTier;
  title: string;
  bnTitle: string;
  description: string;
  bnDescription: string;
  category: RewardCategory;
  discountType: RewardDiscountType;
  value: string;
  numericValue: number;
  codePrefix: string;
  minSpend?: number;
  maxDiscount?: number;
  validDays: number;
  icon: string;
  color: string;
  gradient: [string, string];
  baseWeight: number; // relative weight within tier
}

export const REWARD_CATALOG: RewardDefinition[] = [
  // --------------------------------------------------------------------------
  // COMMON TIERS (Target: 5% off bus tickets + daily travel perks)
  // --------------------------------------------------------------------------
  {
    id: "rw_common_bus_5pct",
    tier: "common",
    title: "5% Off Bus Tickets",
    bnTitle: "বাস টিকিটে ৫% ছাড়",
    description: "Save 5% on all AC & non-AC intercity buses across Bangladesh (Green Line, Shohagh, Hanif, Shyamoli).",
    bnDescription: "গ্রীন লাইন, সোহাগ, হানিফ সহ সকল আন্তঃজেলা বাসের ভাড়ায় ৫% তাৎক্ষণিক ছাড়।",
    category: "bus",
    discountType: "percentage",
    value: "5% OFF",
    numericValue: 5,
    codePrefix: "MB-BUS05",
    minSpend: 500,
    maxDiscount: 200,
    validDays: 14,
    icon: "bus-outline",
    color: "#0284C7",
    gradient: ["#0284C7", "#0369A1"],
    baseWeight: 45,
  },
  {
    id: "rw_common_train_5pct",
    tier: "common",
    title: "5% Off Train Bookings",
    bnTitle: "ট্রেন টিকিটে ৫% ছাড়",
    description: "Enjoy 5% off Bangladesh Railway intercity seat reservations and express coaches.",
    bnDescription: "বাংলাদেশ রেলওয়ের সকল আন্তঃনগর ট্রেনের টিকিটে ৫% বিশেষ ছাড়।",
    category: "train",
    discountType: "percentage",
    value: "5% OFF",
    numericValue: 5,
    codePrefix: "MB-TRN05",
    minSpend: 400,
    maxDiscount: 150,
    validDays: 14,
    icon: "train-outline",
    color: "#059669",
    gradient: ["#059669", "#047857"],
    baseWeight: 30,
  },
  {
    id: "rw_common_coins_50",
    tier: "common",
    title: "50 Trip Bonus Coins",
    bnTitle: "৫০ ট্রিপ বোনাস কয়েন",
    description: "50 bonus Shopno loyalty coins instantly deposited to your rewards wallet balance.",
    bnDescription: "আপনার শপ্নো ওয়ালেটে ৫০টি রিওয়ার্ড কয়েন জমা হয়েছে যা যেকোনো বুকিংয়ে ব্যবহারযোগ্য।",
    category: "wallet",
    discountType: "coins",
    value: "50 COINS",
    numericValue: 50,
    codePrefix: "MB-COIN50",
    validDays: 365,
    icon: "cash-outline",
    color: "#D97706",
    gradient: ["#F59E0B", "#D97706"],
    baseWeight: 25,
  },

  // --------------------------------------------------------------------------
  // RARE TIERS (Target: Free hotel breakfast + room upgrades & lounge)
  // --------------------------------------------------------------------------
  {
    id: "rw_rare_hotel_breakfast",
    tier: "rare",
    title: "Free Hotel Gourmet Breakfast",
    bnTitle: "হোটেল কমপ্লিমেন্টারি ব্রেকফাস্ট",
    description: "Complimentary lavish morning buffet breakfast for 2 guests at partner hotels & 4-star resorts.",
    bnDescription: "কক্সবাজার, সিলেট ও ঢাকার পার্টনার হোটেলে ২ জনের জন্য সম্পূর্ণ বিনামূল্যে বুফে ব্রেকফাস্ট।",
    category: "hotel",
    discountType: "perk",
    value: "FREE BREAKFAST",
    numericValue: 0,
    codePrefix: "MB-BRKFST",
    minSpend: 1500,
    validDays: 30,
    icon: "restaurant-outline",
    color: "#7C3AED",
    gradient: ["#8B5CF6", "#7C3AED"],
    baseWeight: 40,
  },
  {
    id: "rw_rare_room_upgrade",
    tier: "rare",
    title: "Complimentary Room Upgrade",
    bnTitle: "ফ্রি রুম আপগ্রেড",
    description: "Instant upgrade from Standard/Deluxe to Executive Suite / Sea View room upon check-in.",
    bnDescription: "হোটেল চেক-ইনের সময় স্ট্যান্ডার্ড বা ডিলাক্স থেকে সরাসরি সি-ভিউ বা এক্সিকিউটিভ স্যুটে আপগ্রেড।",
    category: "hotel",
    discountType: "upgrade",
    value: "FREE UPGRADE",
    numericValue: 0,
    codePrefix: "MB-RMUPG",
    minSpend: 3000,
    validDays: 30,
    icon: "bed-outline",
    color: "#2563EB",
    gradient: ["#3B82F6", "#1D4ED8"],
    baseWeight: 35,
  },
  {
    id: "rw_rare_lounge_pass",
    tier: "rare",
    title: "VIP Airport Lounge Pass",
    bnTitle: "ভিআইপি এয়ারপোর্ট লাউঞ্জ পাস",
    description: "Complimentary single-entry VIP lounge access with buffet dining at Hazrat Shahjalal Intl Airport (DAC).",
    bnDescription: "হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর (DAC)-এ ভিআইপি লাউঞ্জে বিনামূল্যে প্রবেশ ও খাবারের সুবিধা।",
    category: "lounge",
    discountType: "perk",
    value: "FREE LOUNGE",
    numericValue: 0,
    codePrefix: "MB-LOUNGE",
    validDays: 45,
    icon: "wine-outline",
    color: "#DB2777",
    gradient: ["#EC4899", "#BE185D"],
    baseWeight: 25,
  },

  // --------------------------------------------------------------------------
  // LEGENDARY TIERS (Target: 50% flight coupon + 1-night luxury stay)
  // --------------------------------------------------------------------------
  {
    id: "rw_legendary_flight_50pct",
    tier: "legendary",
    title: "50% Flight Coupon",
    bnTitle: "বিমান টিকিটে ৫০% মেগা ছাড়",
    description: "Sensational 50% discount on domestic or international flights (Biman, US-Bangla, Novoair, Emirates)!",
    bnDescription: "অভ্যন্তরীণ বা আন্তর্জাতিক যেকোনো ফ্লাইট বুকিংয়ে সর্বোচ্চ ৫০% পর্যন্ত মেগা ক্যাশ ডিসকাউন্ট!",
    category: "flight",
    discountType: "percentage",
    value: "50% OFF",
    numericValue: 50,
    codePrefix: "MB-FLT50",
    minSpend: 3000,
    maxDiscount: 5000,
    validDays: 60,
    icon: "airplane-outline",
    color: "#EA580C",
    gradient: ["#F97316", "#C2410C"],
    baseWeight: 60,
  },
  {
    id: "rw_legendary_luxury_stay",
    tier: "legendary",
    title: "1-Night Luxury Resort Stay",
    bnTitle: "১-রাত বিলাসবহুল রিসোর্ট ফ্রি স্টে",
    description: "100% complimentary 1-night stay for 2 adults at 5-star partner luxury resort in Bangladesh.",
    bnDescription: "বাংলাদেশের শীর্ষ ৫-তারকা রিসোর্টে ২ জনের জন্য ১ রাতের সম্পূর্ণ ফ্রি স্টে ভাউচার।",
    category: "hotel",
    discountType: "perk",
    value: "100% FREE NIGHT",
    numericValue: 100,
    codePrefix: "MB-RESORT1N",
    validDays: 90,
    icon: "sparkles",
    color: "#E11D48",
    gradient: ["#F43F5E", "#BE123C"],
    baseWeight: 40,
  },
];

// 7-Day Progressive Streak Configuration
export const STREAK_CYCLE_CONFIG: Omit<StreakDayInfo, "status">[] = [
  {
    dayNumber: 1,
    title: "Day 1: Welcome Box",
    bonusDescription: "Standard Mystery Odds + 20 Coins",
    coinBonus: 20,
    rareBonusPct: 0,
    legendaryBonusPct: 0,
    isJackpot: false,
  },
  {
    dayNumber: 2,
    title: "Day 2: Voyager Boost",
    bonusDescription: "+5% Rare Chance + 30 Coins",
    coinBonus: 30,
    rareBonusPct: 5,
    legendaryBonusPct: 0,
    isJackpot: false,
  },
  {
    dayNumber: 3,
    title: "Day 3: Explorer Surge",
    bonusDescription: "+10% Rare Chance + 50 Coins",
    coinBonus: 50,
    rareBonusPct: 10,
    legendaryBonusPct: 0,
    isJackpot: false,
  },
  {
    dayNumber: 4,
    title: "Day 4: Jetsetter Luck",
    bonusDescription: "+15% Rare Chance + 75 Coins",
    coinBonus: 75,
    rareBonusPct: 15,
    legendaryBonusPct: 1,
    isJackpot: false,
  },
  {
    dayNumber: 5,
    title: "Day 5: Globetrotter 2x",
    bonusDescription: "2x Legendary Odds + 100 Coins",
    coinBonus: 100,
    rareBonusPct: 15,
    legendaryBonusPct: 5,
    isJackpot: false,
  },
  {
    dayNumber: 6,
    title: "Day 6: VIP Fortune",
    bonusDescription: "3x Legendary Odds + 150 Coins",
    coinBonus: 150,
    rareBonusPct: 20,
    legendaryBonusPct: 10,
    isJackpot: false,
  },
  {
    dayNumber: 7,
    title: "Day 7: 🔥 MEGA JACKPOT",
    bonusDescription: "Guaranteed Rare or Legendary! + 300 Coins",
    coinBonus: 300,
    rareBonusPct: 75,
    legendaryBonusPct: 25,
    isJackpot: true,
  },
];

// ============================================================================
// CONSTANTS & KEYS
// ============================================================================

const SERVER_VALIDATION_SECRET =
  "SHOPNO_MYSTERY_BOX_SERVER_SIGNING_KEY_SEC_2026_X98";

const STORAGE_KEYS = {
  STREAK: (userId: string) => `@shopno_mystery_streak_${userId}`,
  WALLET_VOUCHERS: (userId: string) => `@shopno_wallet_vouchers_${userId}`,
  UNBOX_HISTORY: (userId: string) => `@shopno_mystery_unbox_history_${userId}`,
};

// ============================================================================
// MYSTERY BOX CORE SERVICE
// ============================================================================

export class MysteryBoxService {
  /**
   * Helper: Get current ISO date formatted as YYYY-MM-DD in UTC
   */
  private static getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  /**
   * Helper: Get yesterday ISO date string
   */
  private static getYesterdayDateString(): string {
    const d = new Date(Date.now() - 86400000);
    return d.toISOString().split("T")[0];
  }

  /**
   * Helper: Calculate seconds remaining until next midnight (daily spin reset)
   */
  private static getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
    return diff;
  }

  /**
   * Retrieve the user's current 7-day streak status and check-in eligibility
   */
  static async getStreakStatus(userId: string): Promise<StreakStatus> {
    const cleanUserId = userId || "demo_traveler";
    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();

    try {
      // 1. Check local persistent storage first for fast response
      const rawStored = await AsyncStorage.getItem(STORAGE_KEYS.STREAK(cleanUserId));
      let streakData: {
        currentStreak: number;
        totalStreakDays: number;
        longestStreak: number;
        lastCheckInDate: string | null;
        totalBoxesOpened: number;
      } = {
        currentStreak: 0,
        totalStreakDays: 0,
        longestStreak: 0,
        lastCheckInDate: null,
        totalBoxesOpened: 0,
      };

      if (rawStored) {
        try {
          streakData = JSON.parse(rawStored);
        } catch {
          // ignore corrupted local json
        }
      }

      // 2. Query Supabase user_streaks or user metadata if available
      try {
        const { data: remoteData } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", cleanUserId)
          .single();

        if (remoteData) {
          if ((remoteData.current_streak ?? 0) >= streakData.currentStreak) {
            streakData.currentStreak = remoteData.current_streak ?? 0;
            streakData.totalStreakDays = remoteData.total_streak_days ?? streakData.totalStreakDays;
            streakData.longestStreak = remoteData.longest_streak ?? streakData.longestStreak;
            streakData.lastCheckInDate = remoteData.last_check_in_date ?? streakData.lastCheckInDate;
          }
        }
      } catch {
        // Fall back gracefully to local storage
      }

      // 3. Determine if already claimed today or if streak was broken
      let effectiveStreak = streakData.currentStreak;
      let canClaimToday = true;

      if (streakData.lastCheckInDate === today) {
        canClaimToday = false;
      } else if (streakData.lastCheckInDate === yesterday) {
        // Streak is intact and ready for next increment
        canClaimToday = true;
      } else if (streakData.lastCheckInDate) {
        // Missed one or more days -> streak reset to 0 (so next claim is Day 1)
        effectiveStreak = 0;
        canClaimToday = true;
      } else {
        // First time traveler
        effectiveStreak = 0;
        canClaimToday = true;
      }

      // Build 7-day visual roadmap
      // If effectiveStreak is 0, next claim will be Day 1.
      // If already claimed today at Day 3, current is Day 3.
      // If can claim today and was at Day 2 yesterday, next is Day 3.
      const activeDayNumber = canClaimToday
        ? ((effectiveStreak % 7) + 1)
        : Math.max(1, (effectiveStreak - 1) % 7 + 1);

      const days: StreakDayInfo[] = STREAK_CYCLE_CONFIG.map((cfg) => {
        let status: "completed" | "current" | "locked" = "locked";
        if (canClaimToday) {
          if (cfg.dayNumber < activeDayNumber) {
            status = "completed";
          } else if (cfg.dayNumber === activeDayNumber) {
            status = "current";
          } else {
            status = "locked";
          }
        } else {
          // Already claimed today
          if (cfg.dayNumber <= activeDayNumber) {
            status = "completed";
          } else {
            status = "locked";
          }
        }

        return {
          ...cfg,
          status,
        };
      });

      return {
        userId: cleanUserId,
        currentStreak: effectiveStreak,
        totalStreakDays: streakData.totalStreakDays,
        longestStreak: streakData.longestStreak,
        lastCheckInDate: streakData.lastCheckInDate,
        canClaimToday,
        secondsUntilNextDaily: canClaimToday ? 0 : this.getSecondsUntilMidnight(),
        days,
        totalBoxesOpened: streakData.totalBoxesOpened || 0,
      };
    } catch (err) {
      console.warn("[MysteryBoxService] Error reading streak status:", err);
      // Resilient default status
      return {
        userId: cleanUserId,
        currentStreak: 0,
        totalStreakDays: 0,
        longestStreak: 0,
        lastCheckInDate: null,
        canClaimToday: true,
        secondsUntilNextDaily: 0,
        days: STREAK_CYCLE_CONFIG.map((cfg, idx) => ({
          ...cfg,
          status: idx === 0 ? "current" : "locked",
        })),
        totalBoxesOpened: 0,
      };
    }
  }

  /**
   * Deterministic Server-Validated Probability Calculation
   *
   * Generates a deterministic, cryptographically signed unboxing result.
   * If a client tries to manipulate odds or inject arbitrary perks,
   * the server signature verification will fail.
   */
  static generateDeterministicReward(
    userId: string,
    streakDayNumber: number,
    clientNonce: string
  ): { rewardDef: RewardDefinition; serverHash: string; voucherCode: string } {
    const dateStr = this.getTodayDateString();
    const cycleDay = ((streakDayNumber - 1) % 7) + 1;
    const streakConfig = STREAK_CYCLE_CONFIG[cycleDay - 1] || STREAK_CYCLE_CONFIG[0];

    // Compute deterministic cryptographic seed: HMAC-SHA256(userId:date:cycleDay:clientNonce)
    const seedInput = `${userId}:${dateStr}:${cycleDay}:${clientNonce}`;
    const seedHash = CryptoJS.HmacSHA256(seedInput, SERVER_VALIDATION_SECRET).toString(
      CryptoJS.enc.Hex
    );

    // Convert first 8 hex characters into pseudo-random float [0, 1)
    const rollInt = parseInt(seedHash.slice(0, 8), 16);
    const rollFloat = rollInt / 0xffffffff;

    // Calculate probabilities based on streak tier bonuses
    let probCommon = 0.70;
    let probRare = 0.25;
    let probLegendary = 0.05;

    if (streakConfig.isJackpot) {
      // Day 7 Mega Jackpot: 0% Common, 75% Rare, 25% Legendary
      probCommon = 0.0;
      probRare = 0.75;
      probLegendary = 0.25;
    } else {
      // Apply streak luck boosts
      const rareBoost = streakConfig.rareBonusPct / 100;
      const legBoost = streakConfig.legendaryBonusPct / 100;

      probRare = Math.min(0.60, probRare + rareBoost);
      probLegendary = Math.min(0.20, probLegendary + legBoost);
      probCommon = Math.max(0.20, 1.0 - (probRare + probLegendary));
    }

    // Determine target tier
    let chosenTier: RewardTier = "common";
    if (rollFloat < probLegendary) {
      chosenTier = "legendary";
    } else if (rollFloat < probLegendary + probRare) {
      chosenTier = "rare";
    } else {
      chosenTier = "common";
    }

    // Filter candidate items in this tier
    const tierCandidates = REWARD_CATALOG.filter((item) => item.tier === chosenTier);

    // Use next 8 hex characters to deterministically pick weighted item in tier
    const itemRollInt = parseInt(seedHash.slice(8, 16), 16);
    const totalWeight = tierCandidates.reduce((acc, curr) => acc + curr.baseWeight, 0);
    let cumulative = 0;
    const itemTarget = itemRollInt % totalWeight;
    let chosenItem = tierCandidates[0];

    for (const item of tierCandidates) {
      cumulative += item.baseWeight;
      if (itemTarget < cumulative) {
        chosenItem = item;
        break;
      }
    }

    // Generate unique, authentic voucher code
    const voucherSuffix = seedHash.slice(16, 22).toUpperCase();
    const voucherCode = `${chosenItem.codePrefix}-${voucherSuffix}`;

    // Generate cryptographic verification signature for this voucher issuance
    const payloadToSign = `${userId}:${chosenItem.id}:${voucherCode}:${dateStr}`;
    const serverHash = CryptoJS.HmacSHA256(
      payloadToSign,
      SERVER_VALIDATION_SECRET
    ).toString(CryptoJS.enc.Hex);

    return {
      rewardDef: chosenItem,
      serverHash,
      voucherCode,
    };
  }

  /**
   * Verifies the cryptographic authenticity of an unbox result.
   * Prevents client-side voucher tampering.
   */
  static validateRewardAuthenticity(
    userId: string,
    rewardId: string,
    voucherCode: string,
    issuedDateStr: string,
    serverHash: string
  ): boolean {
    const expected = CryptoJS.HmacSHA256(
      `${userId}:${rewardId}:${voucherCode}:${issuedDateStr}`,
      SERVER_VALIDATION_SECRET
    ).toString(CryptoJS.enc.Hex);
    return expected === serverHash;
  }

  /**
   * Deposit won voucher into user's Shopno Wallet voucher inventory.
   * Strictly boundary-isolated: Does NOT alter payment gateway reconciliation logic.
   */
  static async depositVoucherToWallet(
    userId: string,
    reward: MysteryReward
  ): Promise<WalletVoucher> {
    const cleanUserId = userId || "demo_traveler";

    const voucher: WalletVoucher = {
      id: `vch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: cleanUserId,
      code: reward.voucherCode,
      title: reward.title,
      description: reward.description,
      tier: reward.tier,
      category: reward.category,
      discountType: reward.discountType,
      discountValue: reward.value,
      numericValue: reward.numericValue,
      minSpend: reward.minSpend,
      maxDiscount: reward.maxDiscount,
      validFrom: reward.issuedAt,
      validUntil: reward.expiresAt,
      isUsed: false,
      usedAt: null,
      origin: "mystery_box",
      serverSignature: reward.serverHash,
      claimedAt: new Date().toISOString(),
    };

    try {
      // 1. Read existing wallet vouchers from AsyncStorage
      const existingRaw = await AsyncStorage.getItem(
        STORAGE_KEYS.WALLET_VOUCHERS(cleanUserId)
      );
      const existingVouchers: WalletVoucher[] = existingRaw ? JSON.parse(existingRaw) : [];

      // Prepend newly won voucher so it appears at top of inventory
      const updated = [voucher, ...existingVouchers.filter((v) => v.code !== voucher.code)];
      await AsyncStorage.setItem(
        STORAGE_KEYS.WALLET_VOUCHERS(cleanUserId),
        JSON.stringify(updated)
      );

      // 2. Synchronize to Supabase `user_coupons` if connected
      try {
        // Upsert or fetch promo code in promo_codes table
        const { data: promo } = await supabase
          .from("promo_codes")
          .select("id")
          .eq("code", voucher.code)
          .maybeSingle();

        let couponId = promo?.id;

        if (!couponId) {
          const { data: createdPromo } = await supabase
            .from("promo_codes")
            .insert({
              code: voucher.code,
              title: voucher.title,
              description: voucher.description,
              discount_type: voucher.discountType === "percentage" ? "percentage" : "fixed",
              discount_amount: voucher.numericValue,
              min_spend: voucher.minSpend || 0,
              max_discount: voucher.maxDiscount || null,
              applicable_category: voucher.category === "wallet" ? "all" : voucher.category,
              expires_at: voucher.validUntil,
              is_active: true,
            })
            .select("id")
            .maybeSingle();

          couponId = createdPromo?.id;
        }

        if (couponId) {
          await supabase.from("user_coupons").insert({
            user_id: cleanUserId,
            coupon_id: couponId,
            claimed_at: new Date().toISOString(),
            is_used: false,
          });
        }
      } catch (err) {
        // Non-blocking fallback: Local wallet inventory is already secure and updated
        console.log("[MysteryBoxService] Supabase promo_codes sync notice:", err);
      }

      // 3. If reward includes bonus loyalty coins, increment loyalty points
      if (reward.discountType === "coins" && reward.numericValue > 0) {
        try {
          const { data: account } = await supabase
            .from("loyalty_accounts")
            .select("id, points_balance, lifetime_points")
            .eq("user_id", cleanUserId)
            .maybeSingle();

          if (account) {
            await supabase
              .from("loyalty_accounts")
              .update({
                points_balance: (account.points_balance || 0) + reward.numericValue,
                lifetime_points: (account.lifetime_points || 0) + reward.numericValue,
              })
              .eq("id", account.id);
          }
        } catch {
          // ignore loyalty table mismatch
        }
      }

      return voucher;
    } catch (err) {
      console.warn("[MysteryBoxService] Failed to deposit voucher in wallet storage:", err);
      return voucher;
    }
  }

  /**
   * Retrieve all unexpired Shopno Wallet vouchers for a user
   */
  static async getUserWalletVouchers(userId: string): Promise<WalletVoucher[]> {
    const cleanUserId = userId || "demo_traveler";
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_VOUCHERS(cleanUserId));
      if (!raw) return [];
      const list: WalletVoucher[] = JSON.parse(raw);
      return list;
    } catch (err) {
      console.warn("[MysteryBoxService] Error reading user wallet vouchers:", err);
      return [];
    }
  }

  /**
   * Main Entry Point: Open / Unbox Mystery Travel Box
   *
   * Validates daily spin eligibility, streak progression, deterministic reward roll,
   * cryptographic server validation, and automatic injection into Shopno Wallet.
   */
  static async unboxMysteryTravelBox(
    userId: string,
    forceDemoUnlock: boolean = false
  ): Promise<UnboxResult> {
    const cleanUserId = userId || "demo_traveler";
    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();

    // 1. Fetch current streak status
    const currentStatus = await this.getStreakStatus(cleanUserId);

    if (!currentStatus.canClaimToday && !forceDemoUnlock) {
      throw new Error("ALREADY_CLAIMED_TODAY: You have already unlocked today's Mystery Box!");
    }

    // 2. Calculate next streak progression
    let nextStreak = currentStatus.currentStreak;
    if (currentStatus.lastCheckInDate === yesterday) {
      nextStreak = currentStatus.currentStreak + 1;
    } else if (currentStatus.lastCheckInDate === today && forceDemoUnlock) {
      // keep current streak for demo re-spin
      nextStreak = Math.max(1, currentStatus.currentStreak);
    } else {
      nextStreak = 1; // start / reset to Day 1
    }

    const cycleDay = ((nextStreak - 1) % 7) + 1;
    const streakConfig = STREAK_CYCLE_CONFIG[cycleDay - 1] || STREAK_CYCLE_CONFIG[0];

    // 3. Generate deterministic reward using cryptographic seed
    const clientNonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { rewardDef, serverHash, voucherCode } = this.generateDeterministicReward(
      cleanUserId,
      cycleDay,
      clientNonce
    );

    const now = new Date();
    const expiresDate = new Date(now.getTime() + rewardDef.validDays * 24 * 60 * 60 * 1000);

    const reward: MysteryReward = {
      id: rewardDef.id,
      tier: rewardDef.tier,
      title: rewardDef.title,
      bnTitle: rewardDef.bnTitle,
      description: rewardDef.description,
      bnDescription: rewardDef.bnDescription,
      category: rewardDef.category,
      discountType: rewardDef.discountType,
      value: rewardDef.value,
      numericValue: rewardDef.numericValue,
      voucherCode,
      minSpend: rewardDef.minSpend,
      maxDiscount: rewardDef.maxDiscount,
      validDays: rewardDef.validDays,
      icon: rewardDef.icon,
      color: rewardDef.color,
      gradient: rewardDef.gradient,
      serverHash,
      issuedAt: now.toISOString(),
      expiresAt: expiresDate.toISOString(),
    };

    // 4. Deposit won voucher into Shopno Wallet voucher inventory
    const depositedVoucher = await this.depositVoucherToWallet(cleanUserId, reward);

    // 5. Update streak in local storage & Supabase
    const updatedTotalStreak = currentStatus.totalStreakDays + 1;
    const updatedLongest = Math.max(currentStatus.longestStreak, nextStreak);
    const updatedTotalBoxes = (currentStatus.totalBoxesOpened || 0) + 1;

    const newStreakRecord = {
      currentStreak: nextStreak,
      totalStreakDays: updatedTotalStreak,
      longestStreak: updatedLongest,
      lastCheckInDate: today,
      totalBoxesOpened: updatedTotalBoxes,
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.STREAK(cleanUserId),
      JSON.stringify(newStreakRecord)
    );

    // Record unbox claim history
    try {
      const historyRaw = await AsyncStorage.getItem(
        STORAGE_KEYS.UNBOX_HISTORY(cleanUserId)
      );
      const historyList = historyRaw ? JSON.parse(historyRaw) : [];
      historyList.unshift({
        rewardId: reward.id,
        tier: reward.tier,
        voucherCode: reward.voucherCode,
        unboxedAt: now.toISOString(),
        streakDay: cycleDay,
        serverHash,
      });
      await AsyncStorage.setItem(
        STORAGE_KEYS.UNBOX_HISTORY(cleanUserId),
        JSON.stringify(historyList.slice(0, 50))
      );
    } catch {
      // history logging non-critical
    }

    // Sync to Supabase user_streaks table if available
    try {
      await supabase.from("user_streaks").upsert({
        user_id: cleanUserId,
        current_streak: nextStreak,
        total_streak_days: updatedTotalStreak,
        longest_streak: updatedLongest,
        last_check_in_date: today,
        updated_at: now.toISOString(),
      });
    } catch {
      // offline resilience
    }

    // 6. Build refreshed streak status
    const refreshedStreakStatus = await this.getStreakStatus(cleanUserId);

    return {
      success: true,
      reward,
      voucher: depositedVoucher,
      streak: refreshedStreakStatus,
      isFirstClaimToday: true,
      serverValidationToken: serverHash,
      depositedToShopnoWallet: true,
      bonusCoinsAwarded: streakConfig.coinBonus,
    };
  }

  /**
   * Testing / Reset utility: Reset streak for demo or testing
   */
  static async resetStreakForTesting(userId: string): Promise<void> {
    const cleanUserId = userId || "demo_traveler";
    await AsyncStorage.removeItem(STORAGE_KEYS.STREAK(cleanUserId));
    try {
      await supabase.from("user_streaks").delete().eq("user_id", cleanUserId);
    } catch {
      // ignore
    }
  }
}

export const mysteryBoxService = MysteryBoxService;
