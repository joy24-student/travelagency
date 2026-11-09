/**
 * CreatePriceAlertModal - Bottom Sheet for setting route price drop alerts.
 * Features:
 * - Strict integer BDT price inputs (converted to paisa).
 * - Date flex days selector (0, 1, 2, 3 days).
 * - Target price threshold OR percentage drop trigger.
 * - 10-alert cap display & enforcement.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  priceAlertService,
  PriceAlert,
  ServiceType,
} from "../../services/priceAlertService";
import { showLocalizedAlert } from "../../utils/localizedAlert";

interface CreatePriceAlertModalProps {
  visible: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  travelDate: string; // YYYY-MM-DD
  currentLowestPriceBDT?: number;
  serviceType?: ServiceType;
  onAlertCreated?: (alert: PriceAlert) => void;
}

export const CreatePriceAlertModal: React.FC<CreatePriceAlertModalProps> = ({
  visible,
  onClose,
  origin,
  destination,
  travelDate,
  currentLowestPriceBDT = 4500,
  serviceType = "flight",
  onAlertCreated,
}) => {
  const [mode, setMode] = useState<"target" | "percentage">("target");
  const [targetPriceInput, setTargetPriceInput] = useState<string>(
    String(Math.round(currentLowestPriceBDT * 0.9)) // Default 10% lower in BDT
  );
  const [selectedDropPercent, setSelectedDropPercent] = useState<number>(15);
  const [flexDays, setFlexDays] = useState<number>(1);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      priceAlertService.getActiveAlertCount().then(setActiveCount);
      setTargetPriceInput(String(Math.round(currentLowestPriceBDT * 0.9)));
    }
  }, [visible, currentLowestPriceBDT]);

  const handleSubmit = async () => {
    try {
      Haptics.selectionAsync();
      setSubmitting(true);

      let targetBDT: number | undefined = undefined;
      let dropPct: number | undefined = undefined;

      if (mode === "target") {
        const parsed = parseInt(targetPriceInput.replace(/[^0-9]/g, ""), 10);
        if (isNaN(parsed) || parsed <= 0) {
          showLocalizedAlert("ত্রুটি", "সঠিক টার্গেট মূল্য লিখুন।");
          setSubmitting(false);
          return;
        }
        targetBDT = parsed;
      } else {
        dropPct = selectedDropPercent;
      }

      const res = await priceAlertService.createPriceAlert({
        origin,
        destination,
        travelDate,
        serviceType,
        dateFlexDays: flexDays,
        targetPriceBDT: targetBDT,
        dropPercent: dropPct,
      });

      if (res.success && res.alert) {
        showLocalizedAlert(
          "🔔 মূল্য সতর্কতা সক্রিয় হয়েছে!",
          `${origin} ➔ ${destination} রুটের ভাড়া ${
            targetBDT ? `৳${targetBDT.toLocaleString()} এর নিচে নামলে` : `${dropPct}% হ্রাস পেলে`
          } আপনি তাত্ক্ষণিক পুশ নোটিফিকেশন পাবেন।`
        );
        onAlertCreated?.(res.alert);
        onClose();
      } else {
        showLocalizedAlert("সতর্কতা তৈরিতে সমস্যা", res.error || "পুনরায় চেষ্টা করুন।");
      }
    } catch (e: any) {
      showLocalizedAlert("ত্রুটি", e?.message || "কিছু সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.sheetContainer}
            >
              {/* Top Handle */}
              <View style={styles.sheetHandle} />

              {/* Title & Route Info */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>দাম কমলে জানান</Text>
                  <Text style={styles.sheetSubtitle}>
                    {origin} ➔ {destination} • {travelDate}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* 10-Alert Active Cap Indicator */}
              <View style={styles.capIndicator}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#0055F2" />
                <Text style={styles.capText}>
                  সক্রিয় সতর্কতা: <Text style={styles.capBold}>{activeCount}/১০</Text> (সর্বোচ্চ ১০টি সক্রিয় রাখা যায়)
                </Text>
              </View>

              {/* Flex Days Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>তারিখের নমনীয়তা (Flexibility):</Text>
                <View style={styles.flexRow}>
                  {[0, 1, 2, 3].map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setFlexDays(f);
                      }}
                      style={[
                        styles.flexPill,
                        flexDays === f && styles.flexPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.flexPillText,
                          flexDays === f && styles.flexPillTextSelected,
                        ]}
                      >
                        {f === 0 ? "নির্দিষ্ট তারিখ" : `±${f} দিন`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Trigger Mode Tabs */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  onPress={() => setMode("target")}
                  style={[styles.tabBtn, mode === "target" && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, mode === "target" && styles.tabBtnTextActive]}>
                    টার্গেট মূল্য (৳)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode("percentage")}
                  style={[styles.tabBtn, mode === "percentage" && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, mode === "percentage" && styles.tabBtnTextActive]}>
                    শতাংশ হ্রাস (%)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mode Input Content */}
              {mode === "target" ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    বর্তমান সর্বনিম্ন: ৳{currentLowestPriceBDT.toLocaleString()}। কোন মূল্যে নোটিফিকেশন চান?
                  </Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.takaSymbol}>৳</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="number-pad"
                      value={targetPriceInput}
                      onChangeText={setTargetPriceInput}
                      placeholder="যেমন: ৪২০০"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>বর্তমান ভাড়া থেকে কত শতাংশ কমলে জানাবো?</Text>
                  <View style={styles.dropPctRow}>
                    {[10, 15, 20, 25].map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedDropPercent(pct);
                        }}
                        style={[
                          styles.pctPill,
                          selectedDropPercent === pct && styles.pctPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pctPillText,
                            selectedDropPercent === pct && styles.pctPillTextSelected,
                          ]}
                        >
                          {pct}% ছাড়
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                disabled={submitting || activeCount >= 10}
                onPress={handleSubmit}
                style={[
                  styles.submitBtn,
                  (submitting || activeCount >= 10) && styles.submitBtnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="notifications" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {activeCount >= 10 ? "সতর্কতার সীমা পূর্ণ" : "সতর্কতা সক্রিয় করুন"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  capIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  capText: {
    fontSize: 12,
    color: "#1E40AF",
  },
  capBold: {
    fontWeight: "700",
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  flexRow: {
    flexDirection: "row",
    gap: 8,
  },
  flexPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  flexPillSelected: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  flexPillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  flexPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  tabBtnTextActive: {
    color: "#0055F2",
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0055F2",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  takaSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0055F2",
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  dropPctRow: {
    flexDirection: "row",
    gap: 8,
  },
  pctPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  pctPillSelected: {
    backgroundColor: "#0D9488",
    borderColor: "#0D9488",
  },
  pctPillText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  pctPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0055F2",
    borderRadius: 14,
    height: 50,
  },
  submitBtnDisabled: {
    backgroundColor: "#94A3B8",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
