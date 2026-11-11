/**
 * Offline-Capable E-Ticket & Voucher Scanner Screen - Hotel Reception Portal
 * 
 * Features:
 * - Real-time barcode scanning via expo-camera (CameraView)
 * - Offline Ed25519 signature verification with noble-ed25519
 * - Local double-scan prevention & revocation checks
 * - Bilingual result display (Bangla & English)
 * - Audio and haptic feedback
 * - Damaged QR manual code entry lookup
 * - Offline sync queue with server reconciliation
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  hotelTicketVerificationService,
  ScanVerificationResult,
} from "../services/ticketVerificationService";

export function HotelScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [scanResult, setScanResult] = useState<ScanVerificationResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [manualCodeModalVisible, setManualCodeModalVisible] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const scanLockRef = useRef(false);

  useEffect(() => {
    updateQueueCount();
  }, []);

  const updateQueueCount = async () => {
    const count = await hotelTicketVerificationService.getPendingQueueCount();
    setPendingQueueCount(count);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLockRef.current || !isScanningActive) return;
    scanLockRef.current = true;
    setIsScanningActive(false);

    const result = await hotelTicketVerificationService.verifyTicketOffline(data);
    setScanResult(result);
    setResultModalVisible(true);
    updateQueueCount();
  };

  const handleManualLookup = async () => {
    if (!manualCodeInput.trim()) return;
    setIsManualLoading(true);
    const result = await hotelTicketVerificationService.lookupTicketManually(manualCodeInput);
    setIsManualLoading(false);
    setManualCodeModalVisible(false);
    setScanResult(result);
    setResultModalVisible(true);
    updateQueueCount();
  };

  const handleDismissResult = () => {
    setResultModalVisible(false);
    setScanResult(null);
    scanLockRef.current = false;
    setIsScanningActive(true);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await hotelTicketVerificationService.syncWithServer();
    await updateQueueCount();
    setIsSyncing(false);
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8083FF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={56} color="#8083FF" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionSubtitle}>
          Hotel Reception needs camera access to scan and verify guest booking vouchers offline.
        </Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <Text style={styles.grantButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation?.goBack ? navigation.goBack() : null)}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Front Desk Scanner</Text>
          <Text style={styles.headerSubtitle}>গেস্ট চেক-ইন স্ক্যানার (অফলাইন মোড)</Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncNow}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.syncBadgeContainer}>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              {pendingQueueCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingQueueCount}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={isScanningActive ? handleBarcodeScanned : undefined}
        />

        {/* Viewfinder Mask Overlay */}
        <View style={styles.overlayMask}>
          <View style={styles.maskTop} />
          <View style={styles.maskMiddle}>
            <View style={styles.maskSide} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLaser} />
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskBottom}>
            <Text style={styles.guideText}>
              Scan guest e-ticket or stay voucher
            </Text>
            <Text style={styles.guideTextBn}>
              ভাউচারের কিউআর কোডটি ফ্রেমের ভেতর রাখুন • স্বয়ংক্রিয়ভাবে যাচাই হবে
            </Text>

            {/* Quick Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  setManualCodeInput("");
                  setManualCodeModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="keyboard-outline" size={18} color="#FFFFFF" />
                <Text style={styles.manualEntryText}>Manual Code Entry / কোড এন্ট্রি</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Result Modal: Large Valid / Invalid with bilingual explanation */}
      <Modal
        visible={resultModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDismissResult}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.resultCard,
              scanResult?.isValid ? styles.validCardBorder : styles.invalidCardBorder,
            ]}
          >
            {/* Status Header Badge */}
            <View
              style={[
                styles.resultIconCircle,
                scanResult?.isValid ? styles.validCircle : styles.invalidCircle,
              ]}
            >
              <Ionicons
                name={scanResult?.isValid ? "checkmark-sharp" : "close-sharp"}
                size={48}
                color="#FFFFFF"
              />
            </View>

            {/* Large Bilingual Status */}
            <Text
              style={[
                styles.resultTitleEn,
                scanResult?.isValid ? styles.validText : styles.invalidText,
              ]}
            >
              {scanResult?.title_en}
            </Text>
            <Text
              style={[
                styles.resultTitleBn,
                scanResult?.isValid ? styles.validText : styles.invalidText,
              ]}
            >
              {scanResult?.title_bn}
            </Text>

            {/* Reason Explanations */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonTextEn}>{scanResult?.reason_en}</Text>
              <Text style={styles.reasonTextBn}>{scanResult?.reason_bn}</Text>
            </View>

            {/* Guest / Stay Info */}
            {scanResult?.passenger_name && (
              <View style={styles.passengerInfoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Guest Name:</Text>
                  <Text style={styles.infoVal}>{scanResult.passenger_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Room / Unit:</Text>
                  <Text style={styles.infoVal}>
                    {scanResult.seat || "Deluxe Suite / Assigned at Desk"}
                  </Text>
                </View>
                {scanResult.valid_from && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Check-In Range:</Text>
                    <Text style={styles.infoVal}>
                      {new Date(scanResult.valid_from).toLocaleDateString()} -{" "}
                      {new Date(scanResult.valid_to || "").toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Client Device Clock Disclaimer */}
            <View style={styles.clockDisclaimerRow}>
              <Ionicons name="time-outline" size={13} color="#94A3B8" />
              <Text style={styles.clockDisclaimerText}>
                {scanResult?.client_clock_note}
              </Text>
            </View>

            {/* Next Scan Action Button */}
            <TouchableOpacity
              style={[
                styles.nextScanButton,
                scanResult?.isValid ? styles.validButtonBg : styles.invalidButtonBg,
              ]}
              onPress={handleDismissResult}
            >
              <Text style={styles.nextScanButtonText}>Check-In Next Guest / পরবর্তী স্ক্যান</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Code Entry Modal for damaged QR */}
      <Modal
        visible={manualCodeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setManualCodeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>Manual Voucher Lookup</Text>
            <Text style={styles.manualModalSubtitle}>
              For damaged or unreadable QR codes, enter the Ticket ID or Booking Reference:
            </Text>

            <TextInput
              style={styles.manualTextInput}
              placeholder="e.g. SJ-20261108-A4B7 or UUID"
              placeholderTextColor="#94A3B8"
              value={manualCodeInput}
              onChangeText={setManualCodeInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.manualModalActions}>
              <TouchableOpacity
                style={styles.manualCancelBtn}
                onPress={() => setManualCodeModalVisible(false)}
              >
                <Text style={styles.manualCancelBtnText}>Cancel / বাতিল</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={handleManualLookup}
                disabled={isManualLoading}
              >
                {isManualLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.manualSubmitBtnText}>Verify / যাচাই</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#020617",
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8083FF",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  syncButton: {
    padding: 6,
  },
  syncBadgeContainer: {
    position: "relative",
  },
  pendingBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  pendingBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  overlayMask: {
    ...StyleSheet.absoluteFillObject,
  },
  maskTop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
  },
  maskMiddle: {
    flexDirection: "row",
    height: 260,
  },
  maskSide: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
  },
  viewfinder: {
    width: 260,
    height: 260,
    position: "relative",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#8083FF",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanLaser: {
    position: "absolute",
    top: "50%",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: "rgba(128, 131, 255, 0.85)",
  },
  maskBottom: {
    flex: 1.2,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  guideText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  guideTextBn: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  actionRow: {
    marginTop: 24,
  },
  manualEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 8,
  },
  manualEntryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  resultCard: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
  },
  validCardBorder: {
    borderColor: "#10B981",
  },
  invalidCardBorder: {
    borderColor: "#EF4444",
  },
  resultIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  validCircle: {
    backgroundColor: "#10B981",
  },
  invalidCircle: {
    backgroundColor: "#EF4444",
  },
  resultTitleEn: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  resultTitleBn: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  validText: {
    color: "#10B981",
  },
  invalidText: {
    color: "#EF4444",
  },
  reasonBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginVertical: 14,
    alignItems: "center",
  },
  reasonTextEn: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  reasonTextBn: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  passengerInfoBox: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  infoVal: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  clockDisclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    gap: 6,
  },
  clockDisclaimerText: {
    color: "#64748B",
    fontSize: 10,
    textAlign: "center",
    maxWidth: 280,
  },
  nextScanButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  validButtonBg: {
    backgroundColor: "#10B981",
  },
  invalidButtonBg: {
    backgroundColor: "#EF4444",
  },
  nextScanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  manualModalCard: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  manualModalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  manualModalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  manualTextInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 10,
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 16,
  },
  manualModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  manualCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  manualCancelBtnText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  manualSubmitBtn: {
    backgroundColor: "#8083FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  manualSubmitBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  permissionSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  grantButton: {
    marginTop: 20,
    backgroundColor: "#8083FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  grantButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
