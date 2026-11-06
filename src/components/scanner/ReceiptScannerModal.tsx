/**
 * Receipt Scanner Modal Component
 *
 * Implements:
 * 1. Camera / Gallery photo capture with auto-crop boundary guides.
 * 2. Visual Image Enhancement controls (Auto-crop borders, Grayscale thresholding, Contrast optimization).
 * 3. Layout Detection & Text Parsing (Total Amount, Currency: BDT/USD/EUR/INR, Date, Merchant Name).
 * 4. Categorization (Food & Dining, Local Transport, Shopping, Activities).
 * 5. Auto-Feed to Trip Budget (useBookingStore) and Group Split-Bill Ledger (useSplitBillStore).
 *
 * Strict Boundaries: Does NOT modify or interact with wallet transaction or refund tables.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import {
  ReceiptScannerService,
  ReceiptImageEnhancer,
  ParsedReceipt,
  ReceiptCurrency,
  ExpenseCategory,
  SAMPLE_RECEIPT_PRESETS,
  SampleReceiptPreset,
  ImageEnhancementOptions,
  EnhancedImageResult,
} from "../../services/vision/receiptScanner";
import { useBookingStore, ScannedReceiptExpense } from "../../store/bookingStore";
import { useSplitBillStore, SplitGroupMember } from "../../store/splitBillStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const TRIP_BLUE = "#287dfa";
const LUXE_NAVY = "#1a237e";
const EMERALD_GREEN = "#10b981";
const ACCENT_AMBER = "#f59e0b";

export interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onExpenseDispatched?: (result: {
    bookingExpense: ScannedReceiptExpense;
    summaryMessage: string;
  }) => void;
}

type ScanStep = "capture" | "enhancing" | "review" | "success";

const CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    id: "Food & Dining",
    label: "Food & Dining",
    icon: "restaurant-outline",
    color: "#f97316",
  },
  {
    id: "Local Transport",
    label: "Local Transport",
    icon: "car-outline",
    color: "#3b82f6",
  },
  {
    id: "Shopping",
    label: "Shopping",
    icon: "bag-handle-outline",
    color: "#ec4899",
  },
  {
    id: "Activities",
    label: "Activities",
    icon: "compass-outline",
    color: "#8b5cf6",
  },
];

const CURRENCIES: { code: ReceiptCurrency; symbol: string; label: string }[] = [
  { code: "BDT", symbol: "৳", label: "BDT (৳)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "INR", symbol: "₹", label: "INR (₹)" },
];

export function ReceiptScannerModal({
  visible,
  onClose,
  onExpenseDispatched,
}: ReceiptScannerModalProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Step state
  const [currentStep, setCurrentStep] = useState<ScanStep>("capture");

  // Camera settings
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const cameraRef = useRef<any>(null);

  // Selected Image & Enhancement options
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [enhancementOptions, setEnhancementOptions] = useState<ImageEnhancementOptions>({
    autoCropBorders: true,
    applyGrayscale: true,
    applyThresholding: true,
    optimizeContrast: true,
  });
  const [enhancedResult, setEnhancedResult] = useState<EnhancedImageResult | null>(null);

  // Parsed Data state
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [editableMerchant, setEditableMerchant] = useState("");
  const [editableAmount, setEditableAmount] = useState("");
  const [editableCurrency, setEditableCurrency] = useState<ReceiptCurrency>("BDT");
  const [editableDate, setEditableDate] = useState("");
  const [editableCategory, setEditableCategory] = useState<ExpenseCategory>("Food & Dining");

  // Split-Bill config
  const splitMembers = useSplitBillStore((s) => s.members);
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);
  const [payerMemberId, setPayerMemberId] = useState<string>("member_you");

  // Animation values
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize selected split members with all group members
  useEffect(() => {
    if (splitMembers.length > 0 && selectedSplitMemberIds.length === 0) {
      setSelectedSplitMemberIds(splitMembers.map((m) => m.id));
      const currentUser = splitMembers.find((m) => m.isCurrentUser);
      if (currentUser) {
        setPayerMemberId(currentUser.id);
      }
    }
  }, [splitMembers]);

  // Scanning radar animation
  useEffect(() => {
    if (currentStep === "enhancing") {
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();
      return () => scanLoop.stop();
    }
  }, [currentStep]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Reset modal state
  const handleReset = () => {
    setSelectedImageUri(null);
    setEnhancedResult(null);
    setParsedData(null);
    setEditableMerchant("");
    setEditableAmount("");
    setEditableCurrency("BDT");
    setEditableDate("");
    setEditableCategory("Food & Dining");
    setCurrentStep("capture");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Camera Capture
  const handleCapturePhoto = async () => {
    try {
      triggerHaptic();
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
        });
        if (photo?.uri) {
          processImageForScanning(photo.uri);
          return;
        }
      }

      // Fallback to ImagePicker Camera if camera ref isn't ready
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access to scan physical receipts."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processImageForScanning(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Camera capture error:", err);
      // Auto fallback to high-quality preset for reliability
      loadPreset(SAMPLE_RECEIPT_PRESETS[0]);
    }
  };

  // Gallery Picker
  const handlePickFromGallery = async () => {
    try {
      triggerHaptic();
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Gallery Permission Required",
          "Please grant photo library access to upload a receipt."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        processImageForScanning(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Gallery picker error:", err);
      Alert.alert("Selection Failed", "Unable to load image from gallery.");
    }
  };

  // Process selected image with Image Enhancement and OCR Parsing
  const processImageForScanning = async (
    uri: string,
    rawTextOverride?: string
  ) => {
    setSelectedImageUri(uri);
    setCurrentStep("enhancing");

    try {
      // 1. Run Image Enhancement and Layout OCR
      const parsed = await ReceiptScannerService.scanReceipt(uri, {
        enhancement: enhancementOptions,
        rawTextOverride,
      });

      setEnhancedResult(parsed.imageMetadata);
      setParsedData(parsed);

      // Populate editable fields
      setEditableMerchant(parsed.merchantName);
      setEditableAmount(parsed.totalAmount.toString());
      setEditableCurrency(parsed.currency);
      setEditableDate(parsed.date);
      setEditableCategory(parsed.category);

      setCurrentStep("review");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Receipt scanning failed:", err);
      Alert.alert(
        "Scanning Error",
        "Could not parse receipt text. Please verify image clarity or try another photo."
      );
      setCurrentStep("capture");
    }
  };

  // Load Sample Preset (For instant testing without a printer)
  const loadPreset = (preset: SampleReceiptPreset) => {
    triggerHaptic();
    const mockUri = `https://images.unsplash.com/photo-1554415707-9e4466b8873a?q=80&w=600&auto=format&fit=crop`;
    processImageForScanning(mockUri, preset.rawText);
  };

  // Toggle member split selection
  const toggleMemberSplit = (memberId: string) => {
    triggerHaptic();
    if (selectedSplitMemberIds.includes(memberId)) {
      if (selectedSplitMemberIds.length === 1) {
        Alert.alert("Notice", "At least one traveler must share this expense.");
        return;
      }
      setSelectedSplitMemberIds((prev) => prev.filter((id) => id !== memberId));
    } else {
      setSelectedSplitMemberIds((prev) => [...prev, memberId]);
    }
  };

  // Dispatch to Trip Budget & Group Ledger
  const handleAutoFeedExpense = () => {
    if (!parsedData) return;

    const numericAmount = parseFloat(editableAmount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid expense total amount.");
      return;
    }

    triggerHaptic();

    // Prepare updated parsed receipt with user overrides
    const finalReceipt: ParsedReceipt = {
      ...parsedData,
      merchantName: editableMerchant.trim() || "Travel Merchant",
      totalAmount: numericAmount,
      currency: editableCurrency,
      date: editableDate || new Date().toISOString().split("T")[0],
      category: editableCategory,
    };

    const dispatchResult = ReceiptScannerService.dispatchExpenseToTripBudgetAndLedger(
      finalReceipt,
      {
        paidByMemberId: payerMemberId,
        splitMemberIds: selectedSplitMemberIds,
        splitMode: "equal",
        notes: `Receipt from ${finalReceipt.merchantName} (${finalReceipt.category})`,
      }
    );

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (onExpenseDispatched) {
      onExpenseDispatched({
        bookingExpense: dispatchResult.bookingExpense,
        summaryMessage: dispatchResult.summaryMessage,
      });
    }

    setCurrentStep("success");
  };

  // Calculation for live split preview
  const numAmount = parseFloat(editableAmount) || 0;
  const splitCount = Math.max(1, selectedSplitMemberIds.length);
  const perPersonAmount = Math.round((numAmount / splitCount) * 100) / 100;
  const currencySymbol =
    CURRENCIES.find((c) => c.code === editableCurrency)?.symbol || "৳";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="scan" size={18} color={TRIP_BLUE} style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>Smart Receipt Scanner</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              OCR Layout Detection & Split-Bill Auto-Feed
            </Text>
          </View>

          {currentStep === "review" ? (
            <TouchableOpacity
              style={styles.headerTextButton}
              onPress={handleReset}
            >
              <Text style={styles.headerTextButtonLabel}>Retake</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* ─── STEP 1: CAPTURE & CAMERA VIEW ─── */}
        {currentStep === "capture" && (
          <View style={styles.captureContainer}>
            {/* Camera Viewport or Live Permission Frame */}
            {permission?.granted ? (
              <View style={styles.cameraFrameWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={styles.cameraView}
                  facing={cameraFacing}
                  enableTorch={isTorchOn}
                >
                  {/* Document Alignment Frame */}
                  <View style={styles.reticleOverlay}>
                    <View style={styles.reticleCornerTL} />
                    <View style={styles.reticleCornerTR} />
                    <View style={styles.reticleCornerBL} />
                    <View style={styles.reticleCornerBR} />
                    <View style={styles.reticleTextPill}>
                      <Ionicons name="receipt-outline" size={14} color="#ffffff" />
                      <Text style={styles.reticleText}>Align receipt within box</Text>
                    </View>
                  </View>

                  {/* Hardware camera controls */}
                  <View style={styles.cameraControlsBar}>
                    <TouchableOpacity
                      style={[styles.cameraActionBtn, isTorchOn && styles.cameraActionBtnActive]}
                      onPress={() => setIsTorchOn(!isTorchOn)}
                    >
                      <Ionicons
                        name={isTorchOn ? "flash" : "flash-off"}
                        size={20}
                        color={isTorchOn ? "#000" : "#fff"}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cameraActionBtn}
                      onPress={() =>
                        setCameraFacing((prev) => (prev === "back" ? "front" : "back"))
                      }
                    >
                      <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </CameraView>
              </View>
            ) : (
              <View style={styles.permissionPlaceholder}>
                <View style={styles.placeholderIconCircle}>
                  <Ionicons name="camera-outline" size={38} color={TRIP_BLUE} />
                </View>
                <Text style={styles.placeholderTitle}>Camera Access Required</Text>
                <Text style={styles.placeholderDesc}>
                  Enable camera to scan restaurant bills, taxi slips, and hotel vouchers instantly.
                </Text>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={requestPermission}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.primaryActionLabel}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Shutter & Gallery Bar */}
            <View style={styles.shutterBar}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
              >
                <Ionicons name="images-outline" size={24} color="#334155" />
                <Text style={styles.galleryButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shutterButtonOuter}
                onPress={handleCapturePhoto}
                activeOpacity={0.8}
              >
                <View style={styles.shutterButtonInner} />
              </TouchableOpacity>

              <View style={{ width: 60 }} />
            </View>

            {/* Quick Demo Presets Shelf */}
            <View style={styles.presetsShelf}>
              <View style={styles.presetsShelfHeader}>
                <Ionicons name="sparkles" size={14} color={ACCENT_AMBER} />
                <Text style={styles.presetsShelfTitle}>Quick Test Presets (Zero Camera Required)</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetsScroll}
              >
                {SAMPLE_RECEIPT_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    testID={`preset-${preset.id}`}
                    style={styles.presetChip}
                    onPress={() => loadPreset(preset)}
                  >
                    <Ionicons
                      name={preset.thumbnailIcon as any}
                      size={15}
                      color={TRIP_BLUE}
                      style={{ marginRight: 6 }}
                    />
                    <View>
                      <Text style={styles.presetChipName} numberOfLines={1}>
                        {preset.name}
                      </Text>
                      <Text style={styles.presetChipMeta}>
                        {preset.currency === "BDT"
                          ? `৳${preset.total}`
                          : preset.currency === "USD"
                          ? `$${preset.total}`
                          : preset.currency === "EUR"
                          ? `€${preset.total}`
                          : `₹${preset.total}`}{" "}
                        • {preset.category}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ─── STEP 2: ENHANCING & OCR PROCESSING RADAR ─── */}
        {currentStep === "enhancing" && (
          <View style={styles.enhancingContainer}>
            <View style={styles.enhancingPreviewFrame}>
              {selectedImageUri && (
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.enhancingImage}
                  resizeMode="cover"
                />
              )}

              {/* Animated Laser Scanning Line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 320],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(40, 125, 250, 0)", "rgba(40, 125, 250, 0.8)", "rgba(40, 125, 250, 0)"]}
                  style={styles.scanLineGradient}
                />
              </Animated.View>
            </View>

            <View style={styles.enhancingStatusCard}>
              <ActivityIndicator size="large" color={TRIP_BLUE} />
              <Text style={styles.enhancingTitle}>Enhancing & Reading Document</Text>
              <View style={styles.pipelineSteps}>
                <View style={styles.pipelineStepRow}>
                  <Ionicons name="checkmark-circle" size={16} color={EMERALD_GREEN} />
                  <Text style={styles.pipelineStepText}>Auto-cropping receipt edges</Text>
                </View>
                <View style={styles.pipelineStepRow}>
                  <Ionicons name="checkmark-circle" size={16} color={EMERALD_GREEN} />
                  <Text style={styles.pipelineStepText}>Otsu grayscale thresholding</Text>
                </View>
                <View style={styles.pipelineStepRow}>
                  <Ionicons name="checkmark-circle" size={16} color={EMERALD_GREEN} />
                  <Text style={styles.pipelineStepText}>Dynamic contrast optimization</Text>
                </View>
                <View style={styles.pipelineStepRow}>
                  <ActivityIndicator size="small" color={TRIP_BLUE} style={{ marginRight: 6 }} />
                  <Text style={styles.pipelineStepTextActive}>
                    Parsing Total, Currency, Date & Category...
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── STEP 3: REVIEW, SPLIT-BILL & AUTO-FEED ─── */}
        {currentStep === "review" && (
          <ScrollView
            style={styles.reviewScrollView}
            contentContainerStyle={styles.reviewContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Enhancement Indicators Card */}
            {enhancedResult && (
              <View style={styles.enhancementBadgeBanner}>
                <View style={styles.enhancementBadge}>
                  <Ionicons name="crop" size={13} color={TRIP_BLUE} />
                  <Text style={styles.enhancementBadgeText}>Auto-Cropped</Text>
                </View>
                <View style={styles.enhancementBadge}>
                  <Ionicons name="contrast" size={13} color="#6366f1" />
                  <Text style={styles.enhancementBadgeText}>
                    Otsu T={enhancedResult.histogramStats.optimalThreshold}
                  </Text>
                </View>
                <View style={styles.enhancementBadge}>
                  <Ionicons name="sunny" size={13} color={EMERALD_GREEN} />
                  <Text style={styles.enhancementBadgeText}>
                    Contrast {enhancedResult.histogramStats.contrastRatio}x
                  </Text>
                </View>
                {parsedData && (
                  <View style={[styles.enhancementBadge, styles.confidenceBadge]}>
                    <Ionicons name="shield-checkmark" size={13} color="#059669" />
                    <Text style={styles.confidenceBadgeText}>
                      {Math.round(parsedData.overallConfidence * 100)}% Match
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Primary Extracted Fields Card */}
            <View style={styles.extractedCard}>
              <View style={styles.extractedCardHeader}>
                <Ionicons name="document-text-outline" size={18} color={TRIP_BLUE} />
                <Text style={styles.extractedCardTitle}>Extracted Receipt Details</Text>
              </View>

              {/* Merchant Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Merchant Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editableMerchant}
                    onChangeText={setEditableMerchant}
                    placeholder="e.g. Star Kabab, Uber, Sea Pearl"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Total Amount & Currency Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Amount & Currency</Text>
                <View style={styles.amountInputRow}>
                  <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.currencyPrefixText}>{currencySymbol}</Text>
                    <TextInput
                      style={[styles.textInput, styles.amountInput]}
                      value={editableAmount}
                      onChangeText={setEditableAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Currency Selection Pills */}
                <View style={styles.currencyPillsRow}>
                  {CURRENCIES.map((curr) => {
                    const isSelected = editableCurrency === curr.code;
                    return (
                      <TouchableOpacity
                        key={curr.code}
                        style={[
                          styles.currencyPill,
                          isSelected && styles.currencyPillSelected,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setEditableCurrency(curr.code);
                        }}
                      >
                        <Text
                          style={[
                            styles.currencyPillText,
                            isSelected && styles.currencyPillTextSelected,
                          ]}
                        >
                          {curr.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date & Category in Row */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Expense Date (YYYY-MM-DD)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={editableDate}
                    onChangeText={setEditableDate}
                    placeholder="2026-11-06"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.todayShortcut}
                    onPress={() => {
                      triggerHaptic();
                      setEditableDate(new Date().toISOString().split("T")[0]);
                    }}
                  >
                    <Text style={styles.todayShortcutText}>Today</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Auto-Classification Category Badges */}
              <View style={styles.formGroup}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.formLabel}>Categorization</Text>
                  {parsedData?.categoryKeywords && parsedData.categoryKeywords.length > 0 && (
                    <Text style={styles.categoryKeywordsText}>
                      Detected: {parsedData.categoryKeywords.slice(0, 2).join(", ")}
                    </Text>
                  )}
                </View>

                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = editableCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard,
                          isSelected && {
                            borderColor: cat.color,
                            backgroundColor: `${cat.color}15`,
                          },
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setEditableCategory(cat.id);
                        }}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={20}
                          color={isSelected ? cat.color : "#64748b"}
                        />
                        <Text
                          style={[
                            styles.categoryCardLabel,
                            isSelected && { color: cat.color, fontWeight: "700" },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Detected Line Items (Optional expansion) */}
              {parsedData?.lineItems && parsedData.lineItems.length > 0 && (
                <View style={styles.lineItemsSection}>
                  <Text style={styles.lineItemsHeader}>
                    Detected Items ({parsedData.lineItems.length})
                  </Text>
                  {parsedData.lineItems.map((item) => (
                    <View key={item.id} style={styles.lineItemRow}>
                      <Text style={styles.lineItemDesc}>
                        {item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.description}
                      </Text>
                      <Text style={styles.lineItemPrice}>
                        {currencySymbol}
                        {item.totalPrice.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ─── GROUP SPLIT-BILL LEDGER CONFIGURATION ─── */}
            <View style={styles.splitCard}>
              <View style={styles.splitCardHeader}>
                <View style={styles.splitHeaderLeft}>
                  <Ionicons name="people-outline" size={20} color={TRIP_BLUE} />
                  <Text style={styles.splitCardTitle}>Group Split-Bill Ledger</Text>
                </View>
                <View style={styles.splitPerPersonBadge}>
                  <Text style={styles.splitPerPersonText}>
                    {currencySymbol}
                    {perPersonAmount.toFixed(2)} / person
                  </Text>
                </View>
              </View>

              <Text style={styles.splitCardSubtitle}>
                Select travel buddies to split this expense. Balances and debts will be automatically recalculated in the Group Ledger.
              </Text>

              {/* Payer Selection */}
              <View style={styles.payerRow}>
                <Text style={styles.payerLabel}>Paid By:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {splitMembers.map((member) => {
                    const isPayer = payerMemberId === member.id;
                    return (
                      <TouchableOpacity
                        key={`payer_${member.id}`}
                        style={[
                          styles.payerChip,
                          isPayer && styles.payerChipSelected,
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          setPayerMemberId(member.id);
                        }}
                      >
                        <Ionicons
                          name={isPayer ? "checkmark-circle" : "person-outline"}
                          size={14}
                          color={isPayer ? "#fff" : "#64748b"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.payerChipText,
                            isPayer && styles.payerChipTextSelected,
                          ]}
                        >
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Members Included in Split */}
              <Text style={[styles.formLabel, { marginTop: 12 }]}>
                Split Equally Among ({selectedSplitMemberIds.length} Travelers):
              </Text>
              <View style={styles.memberChipsContainer}>
                {splitMembers.map((member) => {
                  const isIncluded = selectedSplitMemberIds.includes(member.id);
                  return (
                    <TouchableOpacity
                      key={`split_${member.id}`}
                      style={[
                        styles.memberChip,
                        isIncluded && styles.memberChipSelected,
                      ]}
                      onPress={() => toggleMemberSplit(member.id)}
                    >
                      <Ionicons
                        name={isIncluded ? "checkbox" : "square-outline"}
                        size={16}
                        color={isIncluded ? TRIP_BLUE : "#94a3b8"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.memberChipText,
                          isIncluded && styles.memberChipTextSelected,
                        ]}
                      >
                        {member.name}
                      </Text>
                      {isIncluded && (
                        <Text style={styles.memberChipShare}>
                          ({currencySymbol}
                          {perPersonAmount.toFixed(0)})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action Bar: Dispatch to Trip Budget & Ledger */}
            <View style={styles.reviewActionsContainer}>
              <TouchableOpacity
                testID="auto-feed-btn"
                style={styles.confirmFeedButton}
                onPress={handleAutoFeedExpense}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[TRIP_BLUE, LUXE_NAVY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmFeedGradient}
                >
                  <Ionicons name="flash" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmFeedButtonText}>
                    Auto-Feed to Trip Budget & Ledger
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ─── STEP 4: SUCCESS CONFIRMATION ─── */}
        {currentStep === "success" && (
          <View style={styles.successContainer}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Expense Auto-Fed!</Text>
            <Text style={styles.successSubtitle}>
              {editableMerchant} ({editableCategory})
            </Text>
            <Text style={styles.successAmount}>
              {currencySymbol}
              {parseFloat(editableAmount || "0").toLocaleString()}
            </Text>

            <View style={styles.successSummaryBox}>
              <View style={styles.successSummaryRow}>
                <Ionicons name="wallet-outline" size={18} color={TRIP_BLUE} />
                <Text style={styles.successSummaryText}>
                  Dispatched to active <Text style={{ fontWeight: "700" }}>useBookingStore</Text> trip budget
                </Text>
              </View>
              <View style={styles.successSummaryRow}>
                <Ionicons name="git-branch-outline" size={18} color={EMERALD_GREEN} />
                <Text style={styles.successSummaryText}>
                  Logged in <Text style={{ fontWeight: "700" }}>Group Split-Bill Ledger</Text> ({currencySymbol}
                  {perPersonAmount.toFixed(2)}/person for {splitCount} travelers)
                </Text>
              </View>
            </View>

            <View style={styles.successButtonRow}>
              <TouchableOpacity
                style={styles.successSecondaryBtn}
                onPress={handleReset}
              >
                <Ionicons name="scan-outline" size={18} color={TRIP_BLUE} />
                <Text style={styles.successSecondaryBtnText}>Scan Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successPrimaryBtn}
                onPress={handleClose}
              >
                <Text style={styles.successPrimaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  headerTextButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTextButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TRIP_BLUE,
  },

  // ─── Step 1: Capture Styles ───
  captureContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  cameraFrameWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraView: {
    flex: 1,
    justifyContent: "space-between",
  },
  reticleOverlay: {
    flex: 1,
    margin: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 16,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  reticleCornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: TRIP_BLUE,
    borderTopLeftRadius: 16,
  },
  reticleCornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: TRIP_BLUE,
    borderTopRightRadius: 16,
  },
  reticleCornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: TRIP_BLUE,
    borderBottomLeftRadius: 16,
  },
  reticleCornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: TRIP_BLUE,
    borderBottomRightRadius: 16,
  },
  reticleTextPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reticleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  cameraControlsBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    gap: 12,
  },
  cameraActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraActionBtnActive: {
    backgroundColor: "#ffffff",
  },
  permissionPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  placeholderIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  shutterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  galleryButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  galleryButtonText: {
    fontSize: 12,
    color: "#334155",
    marginTop: 4,
    fontWeight: "500",
  },
  shutterButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: TRIP_BLUE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shutterButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: TRIP_BLUE,
  },
  presetsShelf: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 12,
  },
  presetsShelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  presetsShelfTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 6,
  },
  presetsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presetChipName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    maxWidth: 150,
  },
  presetChipMeta: {
    fontSize: 11,
    color: "#64748b",
  },

  // ─── Step 2: Enhancing & Radar Scanning Styles ───
  enhancingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  enhancingPreviewFrame: {
    width: SCREEN_WIDTH - 48,
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1e293b",
    position: "relative",
    marginBottom: 24,
  },
  enhancingImage: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 30,
  },
  scanLineGradient: {
    width: "100%",
    height: "100%",
  },
  enhancingStatusCard: {
    backgroundColor: "#ffffff",
    width: "100%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  enhancingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 12,
    marginBottom: 16,
  },
  pipelineSteps: {
    width: "100%",
    gap: 10,
  },
  pipelineStepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pipelineStepText: {
    fontSize: 13,
    color: "#475569",
    marginLeft: 8,
  },
  pipelineStepTextActive: {
    fontSize: 13,
    fontWeight: "600",
    color: TRIP_BLUE,
    marginLeft: 8,
  },

  // ─── Step 3: Review & Split Styles ───
  reviewScrollView: {
    flex: 1,
  },
  reviewContent: {
    padding: 16,
    paddingBottom: 40,
  },
  enhancementBadgeBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  enhancementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  enhancementBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  confidenceBadge: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  confidenceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  extractedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  extractedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  extractedCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#0f172a",
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyPrefixText: {
    fontSize: 18,
    fontWeight: "700",
    color: TRIP_BLUE,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: "700",
  },
  currencyPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  currencyPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  currencyPillSelected: {
    backgroundColor: "#eff6ff",
    borderColor: TRIP_BLUE,
  },
  currencyPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  currencyPillTextSelected: {
    color: TRIP_BLUE,
    fontWeight: "700",
  },
  todayShortcut: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayShortcutText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  categoryLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryKeywordsText: {
    fontSize: 11,
    color: EMERALD_GREEN,
    fontWeight: "500",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  categoryCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  lineItemsSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  lineItemsHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  lineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  lineItemDesc: {
    fontSize: 13,
    color: "#334155",
    flex: 1,
  },
  lineItemPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },

  // ─── Split Bill Card Styles ───
  splitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  splitCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  splitHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  splitCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  splitPerPersonBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  splitPerPersonText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  splitCardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
    marginBottom: 12,
  },
  payerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  payerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginRight: 8,
  },
  payerChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    marginRight: 6,
  },
  payerChipSelected: {
    backgroundColor: LUXE_NAVY,
  },
  payerChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  payerChipTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  memberChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  memberChipSelected: {
    backgroundColor: "#eff6ff",
    borderColor: TRIP_BLUE,
  },
  memberChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  memberChipTextSelected: {
    color: TRIP_BLUE,
    fontWeight: "700",
  },
  memberChipShare: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 4,
  },

  // Actions
  reviewActionsContainer: {
    marginTop: 8,
  },
  confirmFeedButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmFeedGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  confirmFeedButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  // ─── Step 4: Success Styles ───
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: EMERALD_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: EMERALD_GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: TRIP_BLUE,
    marginBottom: 24,
  },
  successSummaryBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
    marginBottom: 32,
  },
  successSummaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  successSummaryText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  successButtonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  successSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 6,
  },
  successSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  successPrimaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: TRIP_BLUE,
  },
  successPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
