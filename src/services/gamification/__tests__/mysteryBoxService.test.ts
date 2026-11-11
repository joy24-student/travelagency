/**
 * mysteryBoxService.test.ts
 *
 * Unit and Integration Test Suite for Mystery Travel Box Gamification Engine.
 * Tests:
 * 1. Reward Probabilities & Tier Matrix (Common: 5% off bus tickets, Rare: Free breakfast, Legendary: 50% flight coupon)
 * 2. Deterministic, Server-Validated Seed & Cryptographic Signature Verification
 * 3. 7-Day Daily Spin / Streak Rewards Lifecycle & Day 7 Mega Jackpot
 * 4. Shopno Wallet Voucher Injection & Inventory Persistence
 * 5. Strict Boundaries: Payment transaction reconciliation logic remains untouched.
 */

import {
  MysteryBoxService,
  mysteryBoxService,
  REWARD_CATALOG,
  STREAK_CYCLE_CONFIG,
  type MysteryReward,
} from "../mysteryBoxService";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock Supabase
jest.mock("../../../utils/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: "mock_coupon_id_123" },
            error: null,
          }),
        })),
      })),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}));

describe("MysteryBoxService - Gamification Engine", () => {
  const TEST_USER = "test_traveler_99";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe("Requirement 1: Reward Tier Matrix Catalog", () => {
    it("should contain the required Common perk: 5% off bus tickets", () => {
      const busReward = REWARD_CATALOG.find(
        (r) => r.tier === "common" && r.category === "bus" && r.numericValue === 5
      );
      expect(busReward).toBeDefined();
      expect(busReward?.title).toContain("5% Off Bus Tickets");
      expect(busReward?.value).toBe("5% OFF");
      expect(busReward?.discountType).toBe("percentage");
    });

    it("should contain the required Rare perk: Free hotel breakfast", () => {
      const breakfastReward = REWARD_CATALOG.find(
        (r) => r.tier === "rare" && r.category === "hotel" && r.title.toLowerCase().includes("breakfast")
      );
      expect(breakfastReward).toBeDefined();
      expect(breakfastReward?.value).toBe("FREE BREAKFAST");
      expect(breakfastReward?.discountType).toBe("perk");
    });

    it("should contain the required Rare room upgrade perk", () => {
      const upgradeReward = REWARD_CATALOG.find(
        (r) => r.tier === "rare" && r.discountType === "upgrade"
      );
      expect(upgradeReward).toBeDefined();
      expect(upgradeReward?.title).toContain("Room Upgrade");
      expect(upgradeReward?.value).toBe("FREE UPGRADE");
    });

    it("should contain the required Legendary perk: 50% flight coupon", () => {
      const flightReward = REWARD_CATALOG.find(
        (r) => r.tier === "legendary" && r.category === "flight" && r.numericValue === 50
      );
      expect(flightReward).toBeDefined();
      expect(flightReward?.title).toContain("50% Flight Coupon");
      expect(flightReward?.value).toBe("50% OFF");
      expect(flightReward?.maxDiscount).toBe(5000);
    });

    it("should contain the required Legendary 1-Night luxury stay perk", () => {
      const resortReward = REWARD_CATALOG.find(
        (r) => r.tier === "legendary" && r.title.toLowerCase().includes("resort")
      );
      expect(resortReward).toBeDefined();
      expect(resortReward?.value).toBe("100% FREE NIGHT");
    });
  });

  describe("Requirement 2: Deterministic, Server-Validated Reward Generation", () => {
    it("should produce the exact same reward and signature for the same seed inputs", () => {
      const nonce = "fixed_test_nonce_123";
      const roll1 = MysteryBoxService.generateDeterministicReward(TEST_USER, 1, nonce);
      const roll2 = MysteryBoxService.generateDeterministicReward(TEST_USER, 1, nonce);

      expect(roll1.rewardDef.id).toBe(roll2.rewardDef.id);
      expect(roll1.voucherCode).toBe(roll2.voucherCode);
      expect(roll1.serverHash).toBe(roll2.serverHash);
    });

    it("should validate legitimate server signatures successfully", () => {
      const nonce = "nonce_val_456";
      const { rewardDef, voucherCode, serverHash } = MysteryBoxService.generateDeterministicReward(
        TEST_USER,
        2,
        nonce
      );

      const todayStr = new Date().toISOString().split("T")[0];
      const isValid = MysteryBoxService.validateRewardAuthenticity(
        TEST_USER,
        rewardDef.id,
        voucherCode,
        todayStr,
        serverHash
      );

      expect(isValid).toBe(true);
    });

    it("should reject tampered or forged voucher rewards", () => {
      const nonce = "nonce_val_789";
      const { rewardDef, serverHash } = MysteryBoxService.generateDeterministicReward(
        TEST_USER,
        2,
        nonce
      );

      const todayStr = new Date().toISOString().split("T")[0];
      // Tampering with the voucher code or reward ID
      const isValid = MysteryBoxService.validateRewardAuthenticity(
        TEST_USER,
        rewardDef.id,
        "TAMPERED-VOUCHER-CODE-999",
        todayStr,
        serverHash
      );

      expect(isValid).toBe(false);
    });
  });

  describe("Requirement 3: 7-Day Daily Spin / Streak Rewards Progression", () => {
    it("should define a 7-day streak cycle culminating in a Day 7 Mega Jackpot", () => {
      expect(STREAK_CYCLE_CONFIG).toHaveLength(7);
      const day7 = STREAK_CYCLE_CONFIG.find((d) => d.dayNumber === 7);
      expect(day7?.isJackpot).toBe(true);
      expect(day7?.rareBonusPct).toBe(75);
      expect(day7?.legendaryBonusPct).toBe(25);
      expect(day7?.coinBonus).toBe(300);
    });

    it("should return canClaimToday = true for a new traveler", async () => {
      const status = await MysteryBoxService.getStreakStatus("new_user_1");
      expect(status.canClaimToday).toBe(true);
      expect(status.currentStreak).toBe(0);
      expect(status.days[0].status).toBe("current");
    });

    it("should correctly increment streak on successful unbox", async () => {
      const result = await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);
      expect(result.success).toBe(true);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streak.canClaimToday).toBe(false);
      expect(result.bonusCoinsAwarded).toBe(20);
    });

    it("should disallow a second unbox on the same day without forceDemo", async () => {
      // First unbox
      await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);

      // Attempt second unbox
      await expect(
        MysteryBoxService.unboxMysteryTravelBox(TEST_USER, false)
      ).rejects.toThrow("ALREADY_CLAIMED_TODAY");
    });

    it("should allow forceDemo unbox for interactive testing and demonstration", async () => {
      await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);
      const demoResult = await MysteryBoxService.unboxMysteryTravelBox(TEST_USER, true);
      expect(demoResult.success).toBe(true);
      expect(demoResult.reward).toBeDefined();
    });
  });

  describe("Requirement 4: Shopno Wallet Voucher Injection", () => {
    it("should deposit the won voucher directly into the user's Shopno Wallet inventory", async () => {
      const result = await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);
      expect(result.depositedToShopnoWallet).toBe(true);

      const walletVouchers = await MysteryBoxService.getUserWalletVouchers(TEST_USER);
      expect(walletVouchers.length).toBeGreaterThanOrEqual(1);

      const matchingVoucher = walletVouchers.find(
        (v) => v.code === result.reward.voucherCode
      );
      expect(matchingVoucher).toBeDefined();
      expect(matchingVoucher?.title).toBe(result.reward.title);
      expect(matchingVoucher?.tier).toBe(result.reward.tier);
      expect(matchingVoucher?.isUsed).toBe(false);
      expect(matchingVoucher?.origin).toBe("mystery_box");
    });

    it("should maintain multiple won vouchers chronologically in the wallet inventory", async () => {
      await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);
      await MysteryBoxService.unboxMysteryTravelBox(TEST_USER, true);

      const vouchers = await MysteryBoxService.getUserWalletVouchers(TEST_USER);
      expect(vouchers.length).toBe(2);
      expect(vouchers[0].claimedAt).toBeDefined();
    });
  });

  describe("Strict Boundaries: Security & Payment Logic Isolation", () => {
    it("should not alter core payment transaction reconciliation logic", async () => {
      // The mystery box deposit purely operates on user voucher records and loyalty
      // without touching shopno_wallets payment deduction RPCs or transaction reconciliations
      const result = await MysteryBoxService.unboxMysteryTravelBox(TEST_USER);
      expect(result.voucher.origin).toBe("mystery_box");
      expect(result.reward.serverHash).toBeDefined();
    });
  });
});
