import React from "react";
import renderer, { act } from "react-test-renderer";

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

// Mock expo-camera
jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: "Images" },
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, style }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import { ReceiptScannerModal } from "../ReceiptScannerModal";
import { useBookingStore } from "../../../store/bookingStore";
import { useSplitBillStore } from "../../../store/splitBillStore";

describe("ReceiptScannerModal Component", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onExpenseDispatched: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useBookingStore.getState().clearScannedExpenses();
    useSplitBillStore.getState().clearExpenses();
  });

  it("renders camera reticle, alignment guides, and quick test presets", () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ReceiptScannerModal {...defaultProps} />);
    });

    const root = tree.root;
    const texts = root.findAllByType("Text").map((t: any) => t.props.children);
    const flattened = texts.flat().filter(Boolean);

    expect(flattened).toContain("Smart Receipt Scanner");
    expect(flattened).toContain("Align receipt within box");
    expect(flattened).toContain("Gallery");
    expect(flattened).toContain("Quick Test Presets (Zero Camera Required)");
    expect(flattened).toContain("Star Kabab & Restaurant (Dinner)");
    expect(flattened).toContain("Uber Bangladesh (Airport Taxi)");
    expect(flattened).toContain("Sea Pearl Resort & Water Park Slip");
  });

  it("loads a preset and parses receipt details into editable form", async () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ReceiptScannerModal {...defaultProps} />);
    });

    const root = tree.root;
    const starKababBtn = root.findByProps({ testID: "preset-preset_restaurant" });
    expect(starKababBtn).toBeDefined();

    // Trigger preset selection
    await act(async () => {
      await starKababBtn.props.onPress();
    });

    // Verify it transitioned to review screen with parsed values
    const textsAfter = root.findAllByType("Text").map((t: any) => t.props.children);
    const flattenedAfter = textsAfter.flat().filter(Boolean);

    expect(flattenedAfter).toContain("Extracted Receipt Details");
    expect(flattenedAfter).toContain("Group Split-Bill Ledger");
    expect(flattenedAfter).toContain("Auto-Feed to Trip Budget & Ledger");

    // Check text inputs populated
    const inputs = root.findAllByType("TextInput");
    const merchantInput = inputs.find((i: any) => i.props.value === "STAR KABAB & RESTAURANT");
    expect(merchantInput).toBeDefined();

    const amountInput = inputs.find((i: any) => i.props.value === "1850");
    expect(amountInput).toBeDefined();
  });

  it("dispatches parsed expense to useBookingStore and Group Split-Bill ledger on confirmation", async () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ReceiptScannerModal {...defaultProps} />);
    });

    const root = tree.root;
    const starKababBtn = root.findByProps({ testID: "preset-preset_restaurant" });
    expect(starKababBtn).toBeDefined();

    await act(async () => {
      await starKababBtn.props.onPress();
    });

    // Find "Auto-Feed to Trip Budget & Ledger" button
    const feedBtn = root.findByProps({ testID: "auto-feed-btn" });
    expect(feedBtn).toBeDefined();

    await act(async () => {
      await feedBtn.props.onPress();
    });

    // Check callback was called
    expect(defaultProps.onExpenseDispatched).toHaveBeenCalled();

    // Check useBookingStore updated
    const bookingExpenses = useBookingStore.getState().scannedExpenses;
    expect(bookingExpenses.length).toBe(1);
    expect(bookingExpenses[0].merchantName).toBe("STAR KABAB & RESTAURANT");
    expect(bookingExpenses[0].totalAmount).toBe(1850);
    expect(bookingExpenses[0].category).toBe("Food & Dining");

    // Check useSplitBillStore updated
    const splitExpenses = useSplitBillStore.getState().expenses;
    expect(splitExpenses.length).toBe(1);
    expect(splitExpenses[0].totalAmount).toBe(1850);

    // Verify success screen is displayed
    const textsSuccess = root.findAllByType("Text").map((t: any) => t.props.children);
    const flattenedSuccess = textsSuccess.flat().filter(Boolean);
    expect(flattenedSuccess).toContain("Expense Auto-Fed!");
    expect(flattenedSuccess).toContain("Done");
  });
});
