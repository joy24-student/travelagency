/**
 * Trip Plan Export & Share Modal
 *
 * Provides:
 * 1. "PDF শেয়ার": Generates official formatted PDF via expo-print / expo-sharing (no more screenshots).
 * 2. "লিংক শেয়ার": Creates formatted web & deep link for family/friends.
 * 3. "অফলাইন কপি": Saves entire itinerary to local device for internet-free viewing.
 */

import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { TripPlan } from "../../services/ai/types";
import { tripExportService } from "../../services/trip/tripExportService";
import { useSplitBillStore } from "../../store/splitBillStore";

interface TripShareExportModalProps {
  visible: boolean;
  onClose: () => void;
  plan: TripPlan;
}

export const TripShareExportModal: React.FC<TripShareExportModalProps> = ({
  visible,
  onClose,
  plan,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isSavingOffline, setIsSavingOffline] = useState<boolean>(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState<boolean>(false);

  const { expenses, getSettlementDebts } = useSplitBillStore();

  // Check offline status when opened
  useEffect(() => {
    if (visible && plan) {
      tripExportService.isTripSavedOffline(plan.id, plan.title).then(setIsOfflineSaved);
    }
  }, [visible, plan]);

  // Handle PDF Generation & Native Share
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const debts = getSettlementDebts();
      await tripExportService.shareTripPdf(plan, expenses, debts);
    } catch (err: any) {
      Alert.alert("PDF রফতানি ত্রুটি", err?.message || "PDF তৈরি করতে সমস্যা হয়েছে।");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Link & Text Share
  const handleShareLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await tripExportService.sharePlanLink(plan);
    } catch {
      // User cancelled
    }
  };

  // Handle Save Offline Copy
  const handleToggleOffline = async () => {
    try {
      setIsSavingOffline(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const debts = getSettlementDebts();

      if (isOfflineSaved) {
        if (plan.id) {
          await tripExportService.removeOfflineTrip(plan.id);
        }
        setIsOfflineSaved(false);
        Alert.alert("অফলাইন কপি সরানো হয়েছে", "এই ট্রিপটির অফলাইন ব্যাকআপ ডিভাইস থেকে মুছে ফেলা হয়েছে।");
      } else {
        await tripExportService.saveTripOffline(plan, expenses, debts);
        setIsOfflineSaved(true);
        Alert.alert(
          "✅ অফলাইন কপি সংরক্ষিত!",
          "সম্পূর্ণ ট্রিপ প্ল্যান ও কার্যক্রম আপনার ফোনে অফলাইনে সেভ করা হয়েছে। ইন্টারনেট ছাড়াও যেকোনো সময় দেখতে পারবেন।"
        );
      }
    } catch (err: any) {
      Alert.alert("সংরক্ষণ ব্যর্থ", err?.message || "অফলাইন কপি সেভ করা সম্ভব হয়নি।");
    } finally {
      setIsSavingOffline(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>প্ল্যান শেয়ার ও অফলাইন কপি</Text>
              <Text style={styles.subtitle}>
                পরিবার বা বন্ধুদের সাথে শেয়ার করুন অথবা অফলাইনে সংরক্ষণ করুন
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Option 1: PDF Export & Share */}
          <TouchableOpacity
            style={styles.exportCard}
            activeOpacity={0.85}
            onPress={handleExportPdf}
            disabled={isExportingPdf}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
              {isExportingPdf ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="document-text" size={24} color="#2563EB" />
              )}
            </View>

            <View style={styles.exportCardContent}>
              <View style={styles.cardTitleLine}>
                <Text style={styles.cardTitle}>PDF ডাউনলোড ও পরিবারকে শেয়ার</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>প্রস্তাবিত</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>
                স্ক্রিনশটের ঝামেলা ছাড়াই সম্পূর্ণ সূচি, বাজেট ও ডাইনিং তালিকা সহ প্রিন্টযোগ্য PDF পাঠান
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Option 2: Shareable Link */}
          <TouchableOpacity
            style={styles.exportCard}
            activeOpacity={0.85}
            onPress={handleShareLink}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="link-outline" size={24} color="#16A34A" />
            </View>

            <View style={styles.exportCardContent}>
              <Text style={styles.cardTitle}>অনলাইন লিংক শেয়ার করুন</Text>
              <Text style={styles.cardSub}>
                হোয়াটসঅ্যাপ, মেসেঞ্জার বা এসএমএস-এ ট্রিপ সামারি ও ব্রাউজার ভিউ লিংক পাঠান
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Option 3: Offline Copy */}
          <TouchableOpacity
            style={[styles.exportCard, isOfflineSaved && styles.exportCardActive]}
            activeOpacity={0.85}
            onPress={handleToggleOffline}
            disabled={isSavingOffline}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: isOfflineSaved ? "#DCFCE7" : "#FEF3C7" },
              ]}
            >
              {isSavingOffline ? (
                <ActivityIndicator size="small" color="#D97706" />
              ) : (
                <Ionicons
                  name={isOfflineSaved ? "cloud-done" : "cloud-download-outline"}
                  size={24}
                  color={isOfflineSaved ? "#16A34A" : "#D97706"}
                />
              )}
            </View>

            <View style={styles.exportCardContent}>
              <View style={styles.cardTitleLine}>
                <Text style={styles.cardTitle}>
                  {isOfflineSaved ? "অফলাইন কপি সংরক্ষিত আছে" : "ফোনে অফলাইন কপি সংরক্ষণ"}
                </Text>
                {isOfflineSaved && (
                  <View style={[styles.recommendedBadge, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.recommendedBadgeText, { color: "#166534" }]}>
                      সক্রিয়
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSub}>
                ভ্রমণকালে নেট বা ওয়াইফাই না থাকলেও পুরো শিডিউল, হোটেল ও নোট দেখতে পাবেন
              </Text>
            </View>

            <Ionicons
              name={isOfflineSaved ? "checkmark-circle" : "chevron-forward"}
              size={18}
              color={isOfflineSaved ? "#16A34A" : "#94A3B8"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  exportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  exportCardActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  exportCardContent: {
    flex: 1,
  },
  cardTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  recommendedBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
});
