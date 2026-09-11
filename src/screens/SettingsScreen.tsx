import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Options datasets
const LANGUAGES = ["English", "Spanish", "French", "German", "Japanese", "Chinese", "Arabic", "Bengali"];
const COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "Bangladesh", "Japan", "Germany", "France"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "BDT"];
const UNITS = ["Imperial (miles, ft², lb)", "Metric (km, m², kg)"];
const TEMPS = ["Fahrenheit (°F)", "Celsius (°C)"];
const TIME_FORMATS = ["12-hour (am/pm)", "24-hour"];

export function SettingsScreen() {
  // Settings values state matching user screenshot defaults
  const [language, setLanguage] = useState<string>("English");
  const [country, setCountry] = useState<string>("United States");
  const [currency, setCurrency] = useState<string>("USD");
  const [units, setUnits] = useState<string>("Imperial (miles, ft², lb)");
  const [tempScale, setTempScale] = useState<string>("Fahrenheit (°F)");
  const [timeFormat, setTimeFormat] = useState<string>("12-hour (am/pm)");
  const [darkTheme, setDarkTheme] = useState<boolean>(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ─── Top Navigation Header ───────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Group 1: Preferences / Localization ───────────────────────── */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("language")}
          >
            <Text style={styles.rowLabel}>Language</Text>
            <Text style={styles.rowValueText}>{language}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("country")}
          >
            <Text style={styles.rowLabel}>Country or Region</Text>
            <Text style={styles.rowValueText}>{country}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("currency")}
          >
            <Text style={styles.rowLabel}>Currency</Text>
            <Text style={styles.rowValueText}>{currency}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("units")}
          >
            <Text style={styles.rowLabel}>Units</Text>
            <Text style={styles.rowValueText}>{units}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("tempScale")}
          >
            <Text style={styles.rowLabel}>Temperature Scale</Text>
            <Text style={styles.rowValueText}>{tempScale}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setActiveModal("timeFormat")}
          >
            <Text style={styles.rowLabel}>Time format</Text>
            <Text style={styles.rowValueText}>{timeFormat}</Text>
          </TouchableOpacity>
        </View>

        {/* Separator 1 */}
        <View style={styles.groupSeparator} />

        {/* ─── Group 2: Account ────────────────────────────────────────────── */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/account" as any)}
          >
            <Text style={styles.rowLabel}>Manage my account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowQRModal(true)}
          >
            <Text style={styles.rowLabel}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Separator 2 */}
        <View style={styles.groupSeparator} />

        {/* ─── Group 3: Preferences & Accessibility ────────────────────────── */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => router.push("/screens/customer-support" as any)}
          >
            <Text style={styles.rowLabel}>Notifications</Text>
          </TouchableOpacity>

          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>Dark Theme</Text>
            <Switch
              value={darkTheme}
              onValueChange={setDarkTheme}
              trackColor={{ false: "#E2E8F0", true: "#2563EB" }}
              thumbColor={darkTheme ? "#FFFFFF" : "#F8FAFC"}
            />
          </View>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Accessibility", "Accessibility features enabled: High contrast, screen reader compatibility, and font scaling.")}
          >
            <Text style={styles.rowLabel}>Accessibility</Text>
          </TouchableOpacity>
        </View>

        {/* Separator 3 */}
        <View style={styles.groupSeparator} />

        {/* ─── Group 4: Legal & Version Info ──────────────────────────────── */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Terms & Conditions", "Trip.com Terms of Use version 2026.1")}
          >
            <Text style={styles.rowLabel}>Terms & Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Privacy Statement", "Trip.com Global Privacy Statement version 2026.1")}
          >
            <Text style={styles.rowLabel}>Privacy Statement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Targeted Ads Opt-Out", "You have opted out of cross-site targeted advertising.")}
          >
            <Text style={styles.rowLabel}>Opt-out of Sales and Targeted Advertising</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => setShowVersionModal(true)}
          >
            <Text style={styles.rowLabel}>Version</Text>
            <View style={styles.versionValueRight}>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW!</Text>
              </View>
              <Text style={styles.versionNumberText}>8.55.2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── MODAL: Selection Drawer ──────────────────────────────────────── */}
      <Modal
        visible={!!activeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select {activeModal}</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {activeModal === "language" &&
                LANGUAGES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setLanguage(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {language === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "country" &&
                COUNTRIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setCountry(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {country === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "currency" &&
                CURRENCIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setCurrency(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {currency === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "units" &&
                UNITS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setUnits(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {units === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "tempScale" &&
                TEMPS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setTempScale(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {tempScale === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}

              {activeModal === "timeFormat" &&
                TIME_FORMATS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.optionRow}
                    onPress={() => {
                      setTimeFormat(item);
                      setActiveModal(null);
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                    {timeFormat === item && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: QR Scanner ───────────────────────────────────────────── */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrScannerBox}>
              <Ionicons name="qr-code-outline" size={120} color="#2563EB" />
              <Text style={styles.qrScannerText}>Align QR code within the frame to scan</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Version Details ──────────────────────────────────────── */}
      <Modal
        visible={showVersionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVersionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>App Version 8.55.2</Text>
              <TouchableOpacity onPress={() => setShowVersionModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.versionDesc}>
              You are running the latest production build 8.55.2 with AI Trip Planner, Live Chat Support, and Enhanced Security.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    padding: 2,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Scroll Container */
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Section Groups */
  sectionGroup: {
    paddingHorizontal: 16,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  rowLabel: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "400",
    flex: 1,
    paddingRight: 10,
  },
  rowValueText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "400",
  },

  /* Separators */
  groupSeparator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
    marginVertical: 4,
  },

  /* Version Badge */
  versionValueRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newBadge: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  versionNumberText: {
    fontSize: 15,
    color: "#64748B",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "capitalize",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  optionText: {
    fontSize: 16,
    color: "#0F172A",
  },
  qrScannerBox: {
    alignItems: "center",
    paddingVertical: 30,
  },
  qrScannerText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 14,
  },
  versionDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
});
