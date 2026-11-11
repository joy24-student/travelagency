/**
 * Unit & Integration Tests
 * PdfExportModal Component
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import PdfExportModal from "../PdfExportModal";
import * as pdfGenerator from "../../../../../src/services/pdf/itineraryPdfGenerator";

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock expo-font and expo-asset
jest.mock(
  "expo-font",
  () => ({
    isLoaded: jest.fn().mockReturnValue(true),
    loadAsync: jest.fn().mockResolvedValue(true),
  }),
  { virtual: true }
);

jest.mock(
  "expo-asset",
  () => ({
    Asset: {
      loadAsync: jest.fn().mockResolvedValue(true),
    },
  }),
  { virtual: true }
);

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
  MaterialCommunityIcons: () => null,
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///mock/image/logo.png" }],
  }),
  MediaTypeOptions: { Images: "Images" },
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock expo-print and expo-sharing
jest.mock("expo-print", () => ({
  printAsync: jest.fn().mockResolvedValue(undefined),
  printToFileAsync: jest.fn().mockResolvedValue({
    uri: "file:///mock/cache/itinerary.pdf",
    numberOfPages: 3,
  }),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("PdfExportModal Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly when visible", () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <PdfExportModal visible={true} onClose={jest.fn()} />
      );
    });

    const instance = tree.root;
    expect(instance).toBeDefined();

    // Check title in rendered tree
    const textNodes = instance.findAllByType("Text");
    const texts = textNodes.map((n: any) => n.props.children).flat();
    expect(texts).toContain("Enterprise PDF Export Studio");
    expect(texts).toContain("Branding & Assets");
    expect(texts).toContain("Voucher Sections");
  });

  it("triggers PDF sharing when Share PDF button is pressed", async () => {
    const shareSpy = jest.spyOn(pdfGenerator, "shareItineraryPdf").mockResolvedValue(undefined);

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <PdfExportModal
          visible={true}
          onClose={jest.fn()}
          bookingData={{
            bookingReference: "TEST-BK-100",
            tripTitle: "Tokyo Sakura Tour",
            destination: "Tokyo, Japan",
          }}
        />
      );
    });

    const shareBtn = tree.root.findByProps({ testID: "btn-action-share" });
    expect(shareBtn).toBeDefined();

    await act(async () => {
      await shareBtn.props.onPress();
    });

    expect(shareSpy).toHaveBeenCalled();
  });

  it("triggers Wireless Printing when Print button is pressed", async () => {
    const printSpy = jest.spyOn(pdfGenerator, "printItineraryPdf").mockResolvedValue(undefined);

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <PdfExportModal visible={true} onClose={jest.fn()} />
      );
    });

    const printBtn = tree.root.findByProps({ testID: "btn-action-print" });
    expect(printBtn).toBeDefined();

    await act(async () => {
      await printBtn.props.onPress();
    });

    expect(printSpy).toHaveBeenCalled();
  });
});
