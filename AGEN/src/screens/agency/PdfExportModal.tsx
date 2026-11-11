/**
 * Enterprise Document & B2B Solutions Studio
 * PdfExportModal.tsx
 *
 * Enables travel agencies to customize, brand, preview, print, and share
 * professional PDF travel itineraries, flight tickets, hotel vouchers, and payment receipts.
 *
 * Supports English and Bengali typography with zero font clipping guarantee.
 * Direct integration with expo-print and expo-sharing.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  Share,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  generateItineraryPdf,
  printItineraryPdf,
  shareItineraryPdf,
  shareItineraryViaWhatsApp,
  createSampleItineraryData,
  ItineraryDocumentData,
  AgencyBranding,
  SupportedLanguage,
  DocumentRenderOptions,
} from "../../../../src/services/pdf/itineraryPdfGenerator";

// Storage key for persisting agency customization preferences
const STORAGE_KEY_BRANDING = "@agency_pdf_branding_config_v1";

// ShopnoJatra Ultra / AGEN Palette
const THEME = {
  background: "#0B1326",
  surface: "#171F33",
  surfaceHigh: "#232D45",
  surfaceCard: "#1C253B",
  primary: "#C3C0FF",
  primaryBrand: "#4F46E5",
  secondary: "#4CD7F6",
  accent: "#818CF8",
  text: "#DAE2FD",
  textMuted: "#918FA0",
  textLight: "#64748B",
  border: "rgba(255, 255, 255, 0.10)",
  borderActive: "#818CF8",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  whatsapp: "#25D366",
};

// Preset Brand Colors for Agencies
const COLOR_PRESETS = [
  { label: "Indigo", hex: "#4F46E5" },
  { label: "Navy", hex: "#1E3A8A" },
  { label: "Teal", hex: "#0D9488" },
  { label: "Emerald", hex: "#059669" },
  { label: "Crimson", hex: "#DC2626" },
  { label: "Slate", hex: "#334155" },
];

export interface PdfExportModalProps {
  visible: boolean;
  onClose: () => void;
  bookingData?: Partial<ItineraryDocumentData>;
  onExportSuccess?: (pdfUri: string) => void;
}

export default function PdfExportModal({
  visible,
  onClose,
  bookingData,
  onExportSuccess,
}: PdfExportModalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"branding" | "sections" | "language">("branding");

  // Document Render Options
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [useBnNumerals, setUseBnNumerals] = useState<boolean>(true);
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [includeFlights, setIncludeFlights] = useState(true);
  const [includeHotels, setIncludeHotels] = useState(true);
  const [includePaymentReceipt, setIncludePaymentReceipt] = useState(true);
  const [includeTerms, setIncludeTerms] = useState(true);

  // Agency Customization State
  const [agencyBranding, setAgencyBranding] = useState<AgencyBranding>({
    agencyName: "Global Travels Ltd.",
    tagline: "Ultra Luxury Bespoke Travel Solutions",
    logoUrl: undefined,
    watermarkUrl: undefined,
    watermarkText: "GLOBAL TRAVELS OFFICIAL",
    watermarkOpacity: 0.06,
    showWatermark: true,
    signatureStampUrl: undefined,
    signatoryName: "M. Anisur Rahman",
    signatoryTitle: "Director of Travel Operations",
    emergencyHotline: "+880 1800-746766 (24/7 Helpline)",
    emergencyEmail: "emergency@globaltravels.com",
    supportPhone: "+880 2 9882190",
    supportEmail: "reservations@globaltravels.com",
    address: "Gulshan-2, Dhaka-1212, Bangladesh",
    website: "www.globaltravels.com",
    licenseNumber: "Govt. Reg. #TRV-88219 / IATA: 91-2384",
    primaryColor: "#1E3A8A",
    secondaryColor: "#0D9488",
  });

  // Client info for WhatsApp dispatch
  const [clientWhatsApp, setClientWhatsApp] = useState("+880 1711-234567");

  // Operational states
  const [isExporting, setIsExporting] = useState(false);
  const [exportAction, setExportAction] = useState<string | null>(null);
  const [lastGeneratedUri, setLastGeneratedUri] = useState<string | null>(null);

  // Load saved branding from AsyncStorage on mount
  useEffect(() => {
    loadSavedBranding();
  }, []);

  const loadSavedBranding = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_BRANDING);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAgencyBranding((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore reading error
    }
  };

  const handleSaveDefaults = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_BRANDING,
        JSON.stringify({
          agencyName: agencyBranding.agencyName,
          tagline: agencyBranding.tagline,
          logoUrl: agencyBranding.logoUrl,
          watermarkText: agencyBranding.watermarkText,
          watermarkOpacity: agencyBranding.watermarkOpacity,
          showWatermark: agencyBranding.showWatermark,
          signatureStampUrl: agencyBranding.signatureStampUrl,
          signatoryName: agencyBranding.signatoryName,
          signatoryTitle: agencyBranding.signatoryTitle,
          emergencyHotline: agencyBranding.emergencyHotline,
          emergencyEmail: agencyBranding.emergencyEmail,
          supportPhone: agencyBranding.supportPhone,
          supportEmail: agencyBranding.supportEmail,
          address: agencyBranding.address,
          website: agencyBranding.website,
          licenseNumber: agencyBranding.licenseNumber,
          primaryColor: agencyBranding.primaryColor,
          secondaryColor: agencyBranding.secondaryColor,
        }),
      );
      Alert.alert(
        "Branding Saved",
        "Your agency logo, watermark, stamp, and hotline preferences have been saved as default.",
      );
    } catch {
      Alert.alert("Save Failed", "Could not persist branding preferences.");
    }
  };

  // Image Picker for Logo, Watermark, and Signature Stamp
  const handlePickAsset = async (type: "logo" | "watermark" | "stamp") => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Media gallery permissions are required to pick agency branding assets.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "logo" ? [1, 1] : type === "stamp" ? [3, 2] : [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const pickedUri = result.assets[0].uri;
        if (type === "logo") {
          setAgencyBranding((prev) => ({ ...prev, logoUrl: pickedUri }));
        } else if (type === "watermark") {
          setAgencyBranding((prev) => ({ ...prev, watermarkUrl: pickedUri }));
        } else if (type === "stamp") {
          setAgencyBranding((prev) => ({ ...prev, signatureStampUrl: pickedUri }));
        }
      }
    } catch (err) {
      Alert.alert("Picker Error", "Failed to select image from device library.");
    }
  };

  // Construct complete payload merging booking data + custom agency branding
  const getDocumentData = (): ItineraryDocumentData => {
    const base = createSampleItineraryData(bookingData);
    return {
      ...base,
      agency: {
        ...base.agency,
        ...agencyBranding,
      },
      traveler: {
        ...base.traveler,
        ...(bookingData?.traveler || {}),
      },
    };
  };

  const getRenderOptions = (): DocumentRenderOptions => ({
    language,
    useBengaliNumerals: useBnNumerals,
    includeItinerary,
    includeFlights,
    includeHotels,
    includePaymentReceipt,
    includeTerms,
  });

  // Action: Share via expo-sharing
  const handleSharePdf = async () => {
    try {
      setIsExporting(true);
      setExportAction("share");
      const docData = getDocumentData();
      const options = getRenderOptions();
      await shareItineraryPdf(docData, options);
    } catch (error) {
      Alert.alert(
        "Export Failed",
        error instanceof Error ? error.message : "Could not export PDF document.",
      );
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  // Action: Wireless Print via expo-print
  const handlePrintPdf = async () => {
    try {
      setIsExporting(true);
      setExportAction("print");
      const docData = getDocumentData();
      const options = getRenderOptions();
      await printItineraryPdf(docData, options);
    } catch (error) {
      Alert.alert(
        "Print Failed",
        error instanceof Error ? error.message : "Could not print PDF document.",
      );
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  // Action: Send to WhatsApp
  const handleWhatsAppSend = async () => {
    try {
      setIsExporting(true);
      setExportAction("whatsapp");
      const docData = getDocumentData();
      const options = getRenderOptions();
      await shareItineraryViaWhatsApp(docData, clientWhatsApp, options);
    } catch (error) {
      Alert.alert(
        "WhatsApp Dispatch Failed",
        error instanceof Error ? error.message : "Could not dispatch PDF to WhatsApp.",
      );
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  // Action: Generate and save local PDF
  const handleGeneratePdf = async () => {
    try {
      setIsExporting(true);
      setExportAction("generate");
      const docData = getDocumentData();
      const options = getRenderOptions();
      const { uri, numberOfPages } = await generateItineraryPdf(docData, options);
      setLastGeneratedUri(uri);
      onExportSuccess?.(uri);
      Alert.alert(
        "PDF Generated Successfully",
        `Created ${numberOfPages}-page branded document.\nSaved to: ${uri.split("/").pop()}`,
      );
    } catch (error) {
      Alert.alert("Generation Failed", "Could not render document.");
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
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
          <LinearGradient
            colors={[THEME.surfaceHigh, THEME.surface]}
            style={styles.headerBar}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <MaterialCommunityIcons
                  name="file-document-edit-outline"
                  size={24}
                  color={THEME.primary}
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>Enterprise PDF Export Studio</Text>
                <Text style={styles.headerSubtitle}>
                  Branded Itineraries, Flight Vouchers & Tax Receipts
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={THEME.text} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Quick Language & Typography Bar */}
          <View style={styles.topControlStrip}>
            <View style={styles.langSelectorRow}>
              <TouchableOpacity
                onPress={() => setLanguage("en")}
                style={[
                  styles.langPill,
                  language === "en" && styles.langPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.langPillText,
                    language === "en" && styles.langPillTextActive,
                  ]}
                >
                  English (EN)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLanguage("bn")}
                style={[
                  styles.langPill,
                  language === "bn" && styles.langPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.langPillText,
                    language === "bn" && styles.langPillTextActive,
                  ]}
                >
                  বাংলা (BN)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fontZeroBadge}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color={THEME.success}
              />
              <Text style={styles.fontZeroBadgeText}>
                Zero Font Clipping • Hind Siliguri
              </Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab("branding")}
              style={[
                styles.tabItem,
                activeTab === "branding" && styles.tabItemActive,
              ]}
            >
              <MaterialCommunityIcons
                name="palette-outline"
                size={18}
                color={activeTab === "branding" ? THEME.secondary : THEME.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "branding" && styles.tabLabelActive,
                ]}
              >
                Branding & Assets
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("sections")}
              style={[
                styles.tabItem,
                activeTab === "sections" && styles.tabItemActive,
              ]}
            >
              <MaterialCommunityIcons
                name="view-list"
                size={18}
                color={activeTab === "sections" ? THEME.secondary : THEME.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "sections" && styles.tabLabelActive,
                ]}
              >
                Voucher Sections
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("language")}
              style={[
                styles.tabItem,
                activeTab === "language" && styles.tabItemActive,
              ]}
            >
              <MaterialCommunityIcons
                name="translate"
                size={18}
                color={activeTab === "language" ? THEME.secondary : THEME.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === "language" && styles.tabLabelActive,
                ]}
              >
                Typography & Client
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 1: BRANDING & CUSTOMIZATION */}
            {activeTab === "branding" && (
              <View style={styles.tabPane}>
                {/* Agency Name & Tagline */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Agency Identity</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Agency Legal Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.agencyName}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, agencyName: t })
                      }
                      placeholder="e.g. Skyline Voyages Ltd."
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Corporate Tagline</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.tagline}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, tagline: t })
                      }
                      placeholder="e.g. Ultra Luxury Bespoke Travel"
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Govt Reg. / IATA Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.licenseNumber}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, licenseNumber: t })
                      }
                      placeholder="e.g. Govt. Reg. #TRV-88219"
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>
                </View>

                {/* 24/7 Emergency Hotline Card */}
                <View style={[styles.card, styles.emergencyCardHighlight]}>
                  <View style={styles.emergencyCardHeader}>
                    <MaterialCommunityIcons
                      name="phone-alert"
                      size={20}
                      color={THEME.danger}
                    />
                    <Text style={styles.emergencyCardTitle}>
                      24/7 Emergency Assistance Hotline
                    </Text>
                  </View>
                  <Text style={styles.emergencyCardDesc}>
                    Printed in high-visibility bold red badge at the top header and
                    in the on-ground traveler protection footer.
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.emergencyInput]}
                    value={agencyBranding.emergencyHotline}
                    onChangeText={(t) =>
                      setAgencyBranding({ ...agencyBranding, emergencyHotline: t })
                    }
                    placeholder="+880 1800-746766 (24/7 Support)"
                    placeholderTextColor={THEME.textLight}
                  />

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>Emergency Escalation Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.emergencyEmail}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, emergencyEmail: t })
                      }
                      placeholder="emergency@agency.com"
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>
                </View>

                {/* Agency Brand Assets (Logo, Stamp, Watermark) */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Custom Brand Assets</Text>

                  {/* Agency Logo */}
                  <View style={styles.assetRow}>
                    <View style={styles.assetThumbBox}>
                      {agencyBranding.logoUrl ? (
                        <Image
                          source={{ uri: agencyBranding.logoUrl }}
                          style={styles.assetThumb}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={28}
                          color={THEME.textMuted}
                        />
                      )}
                    </View>
                    <View style={styles.assetMeta}>
                      <Text style={styles.assetTitle}>Agency Logo</Text>
                      <Text style={styles.assetSubtitle}>
                        Crisp vector/high-res header placement
                      </Text>
                      <View style={styles.assetBtnRow}>
                        <TouchableOpacity
                          style={styles.assetBtn}
                          onPress={() => handlePickAsset("logo")}
                        >
                          <MaterialIcons
                            name="cloud-upload"
                            size={14}
                            color={THEME.secondary}
                          />
                          <Text style={styles.assetBtnText}>
                            {agencyBranding.logoUrl ? "Change Logo" : "Upload Logo"}
                          </Text>
                        </TouchableOpacity>
                        {agencyBranding.logoUrl && (
                          <TouchableOpacity
                            style={styles.assetRemoveBtn}
                            onPress={() =>
                              setAgencyBranding({ ...agencyBranding, logoUrl: undefined })
                            }
                          >
                            <Text style={styles.assetRemoveBtnText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Signature & Official Seal Stamp */}
                  <View style={styles.assetRow}>
                    <View style={styles.assetThumbBox}>
                      {agencyBranding.signatureStampUrl ? (
                        <Image
                          source={{ uri: agencyBranding.signatureStampUrl }}
                          style={styles.assetThumb}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="seal"
                          size={28}
                          color={THEME.textMuted}
                        />
                      )}
                    </View>
                    <View style={styles.assetMeta}>
                      <Text style={styles.assetTitle}>Signature & Official Stamp</Text>
                      <Text style={styles.assetSubtitle}>
                        Authenticates vouchers & tax invoices
                      </Text>
                      <View style={styles.assetBtnRow}>
                        <TouchableOpacity
                          style={styles.assetBtn}
                          onPress={() => handlePickAsset("stamp")}
                        >
                          <MaterialIcons
                            name="cloud-upload"
                            size={14}
                            color={THEME.secondary}
                          />
                          <Text style={styles.assetBtnText}>
                            {agencyBranding.signatureStampUrl
                              ? "Change Stamp"
                              : "Upload Stamp"}
                          </Text>
                        </TouchableOpacity>
                        {agencyBranding.signatureStampUrl && (
                          <TouchableOpacity
                            style={styles.assetRemoveBtn}
                            onPress={() =>
                              setAgencyBranding({
                                ...agencyBranding,
                                signatureStampUrl: undefined,
                              })
                            }
                          >
                            <Text style={styles.assetRemoveBtnText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.inputLabel}>Signatory Officer Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.signatoryName}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, signatoryName: t })
                      }
                      placeholder="e.g. M. Anisur Rahman"
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>Signatory Designation</Text>
                    <TextInput
                      style={styles.textInput}
                      value={agencyBranding.signatoryTitle}
                      onChangeText={(t) =>
                        setAgencyBranding({ ...agencyBranding, signatoryTitle: t })
                      }
                      placeholder="e.g. Director of Travel Operations"
                      placeholderTextColor={THEME.textLight}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Watermark Configuration */}
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchLabel}>Background Watermark</Text>
                      <Text style={styles.switchSub}>
                        Semi-transparent diagonal document security layer
                      </Text>
                    </View>
                    <Switch
                      value={agencyBranding.showWatermark}
                      onValueChange={(v) =>
                        setAgencyBranding({ ...agencyBranding, showWatermark: v })
                      }
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>

                  {agencyBranding.showWatermark && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.inputLabel}>Watermark Text</Text>
                      <TextInput
                        style={styles.textInput}
                        value={agencyBranding.watermarkText}
                        onChangeText={(t) =>
                          setAgencyBranding({ ...agencyBranding, watermarkText: t })
                        }
                        placeholder="OFFICIAL ITINERARY"
                        placeholderTextColor={THEME.textLight}
                      />

                      <View style={styles.opacitySelectorRow}>
                        <Text style={styles.opacityLabel}>Watermark Opacity:</Text>
                        {[
                          { label: "Subtle (5%)", val: 0.05 },
                          { label: "Medium (8%)", val: 0.08 },
                          { label: "Bold (12%)", val: 0.12 },
                        ].map((op) => (
                          <TouchableOpacity
                            key={op.label}
                            onPress={() =>
                              setAgencyBranding({
                                ...agencyBranding,
                                watermarkOpacity: op.val,
                              })
                            }
                            style={[
                              styles.opacityPill,
                              agencyBranding.watermarkOpacity === op.val &&
                                styles.opacityPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.opacityPillText,
                                agencyBranding.watermarkOpacity === op.val &&
                                  styles.opacityPillTextActive,
                              ]}
                            >
                              {op.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Brand Primary Color Selection */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Brand Theme Color</Text>
                  <Text style={styles.cardSubtitle}>
                    Applies to document headers, timeline badges, and borders
                  </Text>

                  <View style={styles.colorPresetsGrid}>
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = agencyBranding.primaryColor === preset.hex;
                      return (
                        <TouchableOpacity
                          key={preset.hex}
                          style={[
                            styles.colorPresetBtn,
                            isSelected && styles.colorPresetBtnActive,
                          ]}
                          onPress={() =>
                            setAgencyBranding({
                              ...agencyBranding,
                              primaryColor: preset.hex,
                            })
                          }
                        >
                          <View
                            style={[
                              styles.colorSwatch,
                              { backgroundColor: preset.hex },
                            ]}
                          />
                          <Text
                            style={[
                              styles.colorPresetText,
                              isSelected && { color: THEME.primary },
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Save defaults button */}
                <TouchableOpacity
                  style={styles.saveDefaultsBtn}
                  onPress={handleSaveDefaults}
                >
                  <MaterialIcons name="save" size={18} color="#FFFFFF" />
                  <Text style={styles.saveDefaultsBtnText}>
                    Save Preferences as Agency Default
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: VOUCHER SECTIONS */}
            {activeTab === "sections" && (
              <View style={styles.tabPane}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Select Modules for Export</Text>
                  <Text style={styles.cardSubtitle}>
                    Choose which travel vouchers to bundle into this customer PDF
                  </Text>

                  {/* Day-by-day Itinerary */}
                  <View style={styles.sectionToggleItem}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="map-clock-outline"
                        size={22}
                        color={THEME.secondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionItemTitle}>
                        Day-by-Day Comprehensive Itinerary
                      </Text>
                      <Text style={styles.sectionItemSub}>
                        Daily schedules, activities, meal plan indicators & hotel stays
                      </Text>
                    </View>
                    <Switch
                      value={includeItinerary}
                      onValueChange={setIncludeItinerary}
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Flight Confirmations */}
                  <View style={styles.sectionToggleItem}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="airplane"
                        size={22}
                        color={THEME.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionItemTitle}>
                        Flight Ticket Confirmations
                      </Text>
                      <Text style={styles.sectionItemSub}>
                        Airline PNR codes, e-ticket vouchers, baggage & gate details
                      </Text>
                    </View>
                    <Switch
                      value={includeFlights}
                      onValueChange={setIncludeFlights}
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Hotel Vouchers */}
                  <View style={styles.sectionToggleItem}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="office-building"
                        size={22}
                        color="#F59E0B"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionItemTitle}>
                        Hotel Accommodation Vouchers
                      </Text>
                      <Text style={styles.sectionItemSub}>
                        Official room category, check-in voucher #, and complimentary perks
                      </Text>
                    </View>
                    <Switch
                      value={includeHotels}
                      onValueChange={setIncludeHotels}
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Payment Receipt */}
                  <View style={styles.sectionToggleItem}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="receipt"
                        size={22}
                        color={THEME.success}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionItemTitle}>
                        Payment Receipt & Tax Invoice
                      </Text>
                      <Text style={styles.sectionItemSub}>
                        Itemized breakdown, govt. VAT / taxes, and transaction ID
                      </Text>
                    </View>
                    <Switch
                      value={includePaymentReceipt}
                      onValueChange={setIncludePaymentReceipt}
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* Terms & Conditions */}
                  <View style={styles.sectionToggleItem}>
                    <View style={styles.sectionIconWrap}>
                      <MaterialCommunityIcons
                        name="file-certificate-outline"
                        size={22}
                        color={THEME.textLight}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionItemTitle}>
                        Terms & Cancellation Policies
                      </Text>
                      <Text style={styles.sectionItemSub}>
                        Passport validity, baggage guidelines, and legal disclaimer
                      </Text>
                    </View>
                    <Switch
                      value={includeTerms}
                      onValueChange={setIncludeTerms}
                      trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: TYPOGRAPHY & CLIENT DISPATCH */}
            {activeTab === "language" && (
              <View style={styles.tabPane}>
                {/* Bengali Typography Showcase */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Multi-Language Engine</Text>
                  <Text style={styles.cardSubtitle}>
                    Google Fonts integration with zero character / diacritic clipping
                  </Text>

                  <View style={styles.typographyPreviewCard}>
                    <View style={styles.typographyHeader}>
                      <Text style={styles.typographyLangBadge}>
                        {language === "bn" ? "বাংলা ফন্ট প্রিভিউ" : "English Font Preview"}
                      </Text>
                      <Text style={styles.typographySubLabel}>
                        Hind Siliguri • Noto Sans Bengali
                      </Text>
                    </View>
                    <Text style={styles.typographySampleHeadline}>
                      {language === "bn"
                        ? "অফিসিয়াল ভ্রমণ বিবরণী ও বুকিং ভাউচার"
                        : "OFFICIAL TRAVEL ITINERARY & VOUCHERS"}
                    </Text>
                    <Text style={styles.typographySampleBody}>
                      {language === "bn"
                        ? "যাত্রী: ডা. ফারহানা আহমেদ • গন্তব্য: বালি, ইন্দোনেশিয়া • সম্পূর্ণ যুক্তবর্ণ ও কারচিহ্নযুক্ত বাংলা।"
                        : "Lead Passenger: Dr. Farhana Ahmed • Destination: Bali, Indonesia • High-res print typography."}
                    </Text>
                  </View>

                  {language === "bn" && (
                    <View style={[styles.switchRow, { marginTop: 12 }]}>
                      <View>
                        <Text style={styles.switchLabel}>Bengali Numerals</Text>
                        <Text style={styles.switchSub}>
                          Format dates, amounts & days as ১, ২, ৩...
                        </Text>
                      </View>
                      <Switch
                        value={useBnNumerals}
                        onValueChange={setUseBnNumerals}
                        trackColor={{ false: "#334155", true: THEME.primaryBrand }}
                      />
                    </View>
                  )}
                </View>

                {/* WhatsApp Direct Dispatch Card */}
                <View style={styles.card}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialCommunityIcons
                      name="whatsapp"
                      size={24}
                      color={THEME.whatsapp}
                    />
                    <Text style={styles.cardTitle}>WhatsApp Direct Dispatch</Text>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    Send official itinerary and PDF attachment directly to traveler
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Client WhatsApp Number (with Country Code)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={clientWhatsApp}
                      onChangeText={setClientWhatsApp}
                      placeholder="+880 1711-234567"
                      placeholderTextColor={THEME.textLight}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footerActionContainer}>
            {isExporting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={THEME.secondary} />
                <Text style={styles.loadingText}>
                  {exportAction === "whatsapp"
                    ? "Preparing WhatsApp Dispatch..."
                    : exportAction === "print"
                      ? "Initializing Wireless Spooler..."
                      : "Rendering High-Resolution PDF..."}
                </Text>
              </View>
            ) : (
              <View style={styles.actionButtonsRow}>
                {/* Wireless Print Button */}
                <TouchableOpacity
                  testID="btn-action-print"
                  style={styles.btnActionPrint}
                  onPress={handlePrintPdf}
                >
                  <MaterialCommunityIcons
                    name="printer-outline"
                    size={20}
                    color={THEME.text}
                  />
                  <Text style={styles.btnActionPrintText}>Print</Text>
                </TouchableOpacity>

                {/* WhatsApp Dispatch Button */}
                <TouchableOpacity
                  testID="btn-action-whatsapp"
                  style={styles.btnActionWhatsApp}
                  onPress={handleWhatsAppSend}
                >
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.btnActionWhatsAppText}>WhatsApp</Text>
                </TouchableOpacity>

                {/* Share PDF Button */}
                <TouchableOpacity
                  testID="btn-action-share"
                  style={styles.btnActionShare}
                  onPress={handleSharePdf}
                >
                  <LinearGradient
                    colors={[THEME.primaryBrand, "#4338CA"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <MaterialCommunityIcons
                      name="share-variant-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.btnActionShareText}>Share PDF</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    height: "90%",
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: "hidden",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(195, 192, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.text,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-medium",
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  topControlStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  langSelectorRow: {
    flexDirection: "row",
    gap: 6,
  },
  langPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  langPillActive: {
    backgroundColor: "rgba(76, 215, 246, 0.15)",
    borderColor: THEME.secondary,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  langPillTextActive: {
    color: THEME.secondary,
  },
  fontZeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52, 211, 153, 0.10)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.25)",
  },
  fontZeroBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.success,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: THEME.secondary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  tabLabelActive: {
    color: THEME.secondary,
  },
  modalBody: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  tabPane: {
    gap: 14,
  },
  card: {
    backgroundColor: THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 10,
  },
  emergencyCardHighlight: {
    borderColor: "rgba(248, 113, 113, 0.4)",
    backgroundColor: "rgba(248, 113, 113, 0.06)",
  },
  emergencyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  emergencyCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.danger,
  },
  emergencyCardDesc: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 8,
  },
  emergencyInput: {
    borderColor: "rgba(248, 113, 113, 0.5)",
    color: THEME.danger,
    fontWeight: "700",
  },
  inputGroup: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.text,
    fontSize: 13,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  assetThumbBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  assetThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  assetMeta: {
    flex: 1,
  },
  assetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  assetSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 6,
  },
  assetBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  assetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76, 215, 246, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(76, 215, 246, 0.3)",
  },
  assetBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.secondary,
  },
  assetRemoveBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  assetRemoveBtnText: {
    fontSize: 11,
    color: THEME.danger,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  switchSub: {
    fontSize: 11,
    color: THEME.textMuted,
    maxWidth: 240,
  },
  opacitySelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  opacityLabel: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  opacityPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  opacityPillActive: {
    backgroundColor: "rgba(195, 192, 255, 0.15)",
    borderColor: THEME.primary,
  },
  opacityPillText: {
    fontSize: 10,
    color: THEME.textMuted,
  },
  opacityPillTextActive: {
    color: THEME.primary,
    fontWeight: "700",
  },
  colorPresetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  colorPresetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  colorPresetBtnActive: {
    borderColor: THEME.secondary,
    backgroundColor: "rgba(76, 215, 246, 0.1)",
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  colorPresetText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.textMuted,
  },
  saveDefaultsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(79, 70, 229, 0.3)",
    borderWidth: 1,
    borderColor: THEME.primaryBrand,
    paddingVertical: 11,
    borderRadius: 10,
  },
  saveDefaultsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionToggleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  sectionItemSub: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  typographyPreviewCard: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 6,
  },
  typographyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  typographyLangBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.secondary,
  },
  typographySubLabel: {
    fontSize: 10,
    color: THEME.textLight,
  },
  typographySampleHeadline: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  typographySampleBody: {
    fontSize: 12,
    color: THEME.textMuted,
    lineHeight: 19,
  },
  footerActionContainer: {
    padding: 14,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.secondary,
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  btnActionPrint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  btnActionPrintText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.text,
  },
  btnActionWhatsApp: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.whatsapp,
    borderRadius: 12,
    paddingVertical: 12,
  },
  btnActionWhatsAppText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnActionShare: {
    flex: 1.4,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    width: "100%",
  },
  btnActionShareText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
