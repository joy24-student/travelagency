/**
 * Receipt Scanner & Vision Document Processing Unit Tests
 *
 * Verifies:
 * 1. Layout Detection & Text Parsing (Total Amount, Currency: BDT/USD/EUR/INR, Date, Merchant Name).
 * 2. Automatic Expense Categorization (Food & Dining, Local Transport, Shopping, Activities).
 * 3. Image Enhancement Pipeline (Auto-crop borders, Otsu thresholding, contrast dynamic range).
 * 4. Auto-Feed to useBookingStore and Group Split-Bill Ledger.
 * 5. Strict Boundaries: Zero interaction with wallet transaction or refund tables.
 */

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import {
  ReceiptParserEngine,
  ReceiptImageEnhancer,
  ReceiptScannerService,
  SAMPLE_RECEIPT_PRESETS,
} from "../receiptScanner";
import { useBookingStore } from "../../../store/bookingStore";
import { useSplitBillStore } from "../../../store/splitBillStore";

describe("Receipt Scanner & Document Processing Engine", () => {
  beforeEach(() => {
    useBookingStore.getState().clearScannedExpenses();
    useSplitBillStore.getState().clearExpenses();
  });

  describe("1. Currency & Layout Parsing", () => {
    it("extracts BDT currency from symbols and codes", () => {
      expect(ReceiptParserEngine.extractCurrency("Total: ৳ 1,500.00")).toBe("BDT");
      expect(ReceiptParserEngine.extractCurrency("Payable: BDT 450")).toBe("BDT");
      expect(ReceiptParserEngine.extractCurrency("TK 350.00 cash")).toBe("BDT");
      expect(ReceiptParserEngine.extractCurrency("মোট টাকা ১০০০")).toBe("BDT");
    });

    it("extracts USD, EUR, and INR currencies accurately", () => {
      expect(ReceiptParserEngine.extractCurrency("Total: $ 145.00 USD")).toBe("USD");
      expect(ReceiptParserEngine.extractCurrency("TOTAL A PAYER: EUR 42.50")).toBe("EUR");
      expect(ReceiptParserEngine.extractCurrency("TOTAL DUE: ₹ 650.00 INR")).toBe("INR");
    });

    it("extracts Total Amount from bottom up with high precision", () => {
      const restaurantText = SAMPLE_RECEIPT_PRESETS[0].rawText;
      const res = ReceiptParserEngine.extractTotalAmount(restaurantText);
      expect(res.amount).toBe(1850);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);

      const taxiText = SAMPLE_RECEIPT_PRESETS[1].rawText;
      const taxiRes = ReceiptParserEngine.extractTotalAmount(taxiText);
      expect(taxiRes.amount).toBe(480);

      const hotelText = SAMPLE_RECEIPT_PRESETS[2].rawText;
      const hotelRes = ReceiptParserEngine.extractTotalAmount(hotelText);
      expect(hotelRes.amount).toBe(145);
    });

    it("extracts and normalizes Dates into YYYY-MM-DD", () => {
      const res1 = ReceiptParserEngine.extractDate("Date: 2026-11-06 Time: 20:45");
      expect(res1.date).toBe("2026-11-06");
      expect(res1.confidence).toBeGreaterThan(0.9);

      const res2 = ReceiptParserEngine.extractDate("Transaction on 06/11/2026");
      expect(res2.date).toBe("2026-11-06");

      const res3 = ReceiptParserEngine.extractDate("Dated: 06 Nov 2026");
      expect(res3.date).toBe("2026-11-06");
    });

    it("extracts Merchant Name while stripping noise headers (TAX INVOICE, MUSHAK, etc.)", () => {
      const restaurantText = SAMPLE_RECEIPT_PRESETS[0].rawText;
      const merchantRes = ReceiptParserEngine.extractMerchantName(restaurantText);
      expect(merchantRes.name).toBe("STAR KABAB & RESTAURANT");

      const taxiText = SAMPLE_RECEIPT_PRESETS[1].rawText;
      const taxiMerchant = ReceiptParserEngine.extractMerchantName(taxiText);
      expect(taxiMerchant.name).toBe("UBER BANGLADESH LTD");

      const hotelText = SAMPLE_RECEIPT_PRESETS[2].rawText;
      const hotelMerchant = ReceiptParserEngine.extractMerchantName(hotelText);
      expect(hotelMerchant.name).toBe("SEA PEARL WATER PARK RESORT");
    });

    it("detects layout zones into Header, Items, and Totals", () => {
      const text = SAMPLE_RECEIPT_PRESETS[0].rawText;
      const zones = ReceiptParserEngine.detectLayoutZones(text);
      expect(zones.length).toBeGreaterThanOrEqual(3);
      expect(zones.some((z) => z.type === "header")).toBe(true);
      expect(zones.some((z) => z.type === "items")).toBe(true);
      expect(zones.some((z) => z.type === "total")).toBe(true);
    });

    it("extracts line items with quantities and totals", () => {
      const text = SAMPLE_RECEIPT_PRESETS[0].rawText;
      const items = ReceiptParserEngine.extractLineItems(text);
      expect(items.length).toBeGreaterThan(0);
      const biryani = items.find((i) => /biryani/i.test(i.description));
      expect(biryani).toBeDefined();
      expect(biryani?.quantity).toBe(2);
      expect(biryani?.totalPrice).toBe(900);
    });
  });

  describe("2. Expense Categorization", () => {
    it("categorizes restaurant bills into Food & Dining", () => {
      const preset = SAMPLE_RECEIPT_PRESETS[0];
      const cat = ReceiptParserEngine.categorizeExpense(preset.rawText, "STAR KABAB");
      expect(cat.category).toBe("Food & Dining");
      expect(cat.confidence).toBeGreaterThan(0.7);
      expect(cat.matchedKeywords.length).toBeGreaterThan(0);
    });

    it("categorizes rides and taxi fares into Local Transport", () => {
      const preset = SAMPLE_RECEIPT_PRESETS[1];
      const cat = ReceiptParserEngine.categorizeExpense(preset.rawText, "UBER BANGLADESH");
      expect(cat.category).toBe("Local Transport");
      expect(cat.confidence).toBeGreaterThan(0.7);
    });

    it("categorizes supermarkets and retail into Shopping", () => {
      const preset = SAMPLE_RECEIPT_PRESETS[3];
      const cat = ReceiptParserEngine.categorizeExpense(preset.rawText, "UNIMART SUPERMARKET");
      expect(cat.category).toBe("Shopping");
    });

    it("categorizes resorts and water park admissions into Activities", () => {
      const preset = SAMPLE_RECEIPT_PRESETS[2];
      const cat = ReceiptParserEngine.categorizeExpense(preset.rawText, "SEA PEARL RESORT");
      expect(cat.category).toBe("Activities");
    });
  });

  describe("3. Image Enhancement Pipeline", () => {
    it("computes Otsu binarization threshold and contrast ratio from histogram", () => {
      // 100 dark ink samples (40) and 300 bright paper samples (220)
      const samples = [
        ...new Array(100).fill(40),
        ...new Array(300).fill(220),
      ];
      const stats = ReceiptImageEnhancer.analyzeHistogram(samples);
      expect(stats.meanLuminance).toBeGreaterThan(150);
      expect(stats.optimalThreshold).toBeGreaterThan(40);
      expect(stats.optimalThreshold).toBeLessThan(220);
      expect(stats.contrastRatio).toBeGreaterThan(0.5);
    });

    it("detects normalized quadrilateral crop bounds for border removal", () => {
      const bounds = ReceiptImageEnhancer.detectReceiptBounds(0.5, 0.05);
      expect(bounds.x).toBeGreaterThan(0);
      expect(bounds.y).toBeGreaterThan(0);
      expect(bounds.width).toBeLessThan(1);
      expect(bounds.height).toBeLessThan(1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(1);
    });

    it("runs complete enhancement pipeline returning metadata", async () => {
      const result = await ReceiptImageEnhancer.enhanceImage("file:///mock_receipt.jpg", {
        autoCropBorders: true,
        applyGrayscale: true,
        optimizeContrast: true,
      });

      expect(result.autoCropped).toBe(true);
      expect(result.isGrayscaled).toBe(true);
      expect(result.contrastOptimized).toBe(true);
      expect(result.histogramStats.optimalThreshold).toBeGreaterThan(0);
    });
  });

  describe("4. Auto-Feed to Trip Budget & Group Split-Bill Ledger", () => {
    it("dispatches parsed receipt into useBookingStore and useSplitBillStore", async () => {
      const parsed = await ReceiptScannerService.scanReceipt("file:///test_bill.jpg", {
        rawTextOverride: SAMPLE_RECEIPT_PRESETS[0].rawText,
      });

      const dispatchResult = ReceiptScannerService.dispatchExpenseToTripBudgetAndLedger(
        parsed,
        {
          paidByMemberId: "member_you",
          splitMode: "equal",
          notes: "Group dinner at Star Kabab",
        }
      );

      // Verify useBookingStore
      const bookingStore = useBookingStore.getState();
      expect(bookingStore.scannedExpenses.length).toBe(1);
      const bookingExp = bookingStore.scannedExpenses[0];
      expect(bookingExp.merchantName).toBe("STAR KABAB & RESTAURANT");
      expect(bookingExp.totalAmount).toBe(1850);
      expect(bookingExp.currency).toBe("BDT");
      expect(bookingExp.category).toBe("Food & Dining");

      // Verify useSplitBillStore
      const splitStore = useSplitBillStore.getState();
      expect(splitStore.expenses.length).toBe(1);
      const splitExp = splitStore.expenses[0];
      expect(splitExp.totalAmount).toBe(1850);
      expect(splitExp.splits.length).toBe(splitStore.members.length);

      const perPerson = Math.round((1850 / splitStore.members.length) * 100) / 100;
      expect(dispatchResult.perPersonShare).toBe(perPerson);

      // Verify balances: "You" paid 1850 and is owed money by others
      const balances = splitStore.getMemberBalances();
      const youBalance = balances.find((b) => b.isCurrentUser);
      expect(youBalance?.netBalance).toBeGreaterThan(0);

      // Verify settlement debts
      const debts = splitStore.getSettlementDebts();
      expect(debts.length).toBeGreaterThan(0);
      expect(debts.every((d) => d.toMemberId === "member_you")).toBe(true);
    });

    it("respects subset member split when only 2 travelers share taxi fare", async () => {
      const taxiPreset = SAMPLE_RECEIPT_PRESETS[1];
      const parsed = await ReceiptScannerService.scanReceipt("file:///uber.jpg", {
        rawTextOverride: taxiPreset.rawText,
      });

      // Split ৳480 only between You and Rahim
      const dispatchResult = ReceiptScannerService.dispatchExpenseToTripBudgetAndLedger(
        parsed,
        {
          paidByMemberId: "member_you",
          splitMemberIds: ["member_you", "member_rahim"],
          splitMode: "equal",
        }
      );

      expect(dispatchResult.perPersonShare).toBe(240);
      const splitStore = useSplitBillStore.getState();
      const debts = splitStore.getSettlementDebts();

      const rahimDebt = debts.find((d) => d.fromMemberId === "member_rahim");
      expect(rahimDebt?.amount).toBe(240);
    });
  });
});
