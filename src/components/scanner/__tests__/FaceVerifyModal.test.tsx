import React from "react";
import renderer, { act } from "react-test-renderer";

// Mock @expo/vector-icons and expo-font before importing FaceVerifyModal
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));

// Mock expo-camera
jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success", Error: "Error" },
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock react-native-qrcode-svg
jest.mock("react-native-qrcode-svg", () => "QRCode");

// Mock supabase to ensure boundaries
jest.mock("../../../utils/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import { FaceVerifyModal } from "../FaceVerifyModal";

describe("FaceVerifyModal Component", () => {
  const defaultProps = {
    visible: true,
    bookingId: "BK-HOTEL-9988",
    guestId: "guest-uuid-555",
    guestName: "Robert Fox",
    hotelId: "hotel-luxury-palace",
    hotelName: "The Grand Luxe Hotel",
    roomType: "Executive Penthouse",
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    onFailure: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders biometric scan reticle and step-by-step challenge indicators", () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<FaceVerifyModal {...defaultProps} />);
    });

    const root = tree.root;
    const simBtn = root.findByProps({ testID: "simulate-challenge-btn" });
    expect(simBtn).toBeDefined();

    const texts = root.findAllByType("Text").map((t: any) => t.props.children);
    const flattened = texts.flat().filter(Boolean);
    expect(flattened).toContain("Hotel Keyless Check-In");
    expect(flattened).toContain("Local 128-D Biometrics");
    expect(flattened).toContain("1. Blink");
    expect(flattened).toContain("2. Smile");
    expect(flattened).toContain("3. Head Turn");
    expect(flattened).toContain("আলো: মুখের সামনে আলো রাখুন");
    expect(flattened).toContain("বিকল্প যাচাই (OTP/ডকুমেন্ট)");
  });

  it("provides alternative verification (OTP/Document) options and displays privacy notice", async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<FaceVerifyModal {...defaultProps} />);
    });

    const root = tree.root;
    const texts = root.findAllByType("Text").map((t: any) => t.props.children);
    const flattened = texts.flat().filter(Boolean);

    // Verify privacy guarantee message is present
    expect(
      flattened.some((t: string) => typeof t === "string" && t.includes("গোপনীয়তার নিশ্চয়তা"))
    ).toBe(true);
  });

  it(
    "triggers simulation and authorizes keyless check-in with digital room key",
    async () => {
      let tree: any;
      await act(async () => {
        tree = renderer.create(<FaceVerifyModal {...defaultProps} />);
      });

      const root = tree.root;
      const simBtn = root.findByProps({ testID: "simulate-challenge-btn" });
      expect(simBtn).toBeDefined();

      // Trigger simulation
      await act(async () => {
        await simBtn.props.onPress();
      });

      // Advance delays for simulated tensor extraction & PMS authorization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 1200));
      });

      const texts = root.findAllByType("Text").map((t: any) => t.props.children);
      const flattened = texts.flat().filter(Boolean);

      expect(flattened).toContain("Identity Verified!");
      expect(flattened).toContain("The Grand Luxe Hotel");
      expect(flattened).toContain("Robert Fox");
      expect(flattened).toContain("ASSIGNED ROOM");
      expect(flattened).toContain("Room 304");

      const saveKeyBtn = root.findByProps({ testID: "save-key-btn" });
      expect(saveKeyBtn).toBeDefined();

      await act(async () => {
        await saveKeyBtn.props.onPress();
      });

      expect(defaultProps.onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: "BK-HOTEL-9988",
          roomNumber: "Room 304",
        })
      );
    },
    15000
  );
});
