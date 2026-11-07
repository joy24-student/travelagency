import React, { useState } from "react";
import { Platform,
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import {
  calculateProfileCompleteness,
  ProfileCompletenessResult,
} from "../../utils/profileCompleteness";

interface ProfileCompletenessBarProps {
  profile: any;
  kycDocuments?: any[];
  onAddPassportPress?: () => void;
  style?: any;
  compact?: boolean;
}

export function ProfileCompletenessBar({
  profile,
  kycDocuments = [],
  onAddPassportPress,
  style,
  compact = false,
}: ProfileCompletenessBarProps) {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [detailsVisible, setDetailsVisible] = useState(false);

  const result: ProfileCompletenessResult = calculateProfileCompleteness(
    profile,
    kycDocuments
  );

  // If already 100% complete and compact, we can render a small badge or hide
  if (result.isComplete && compact) {
    return null;
  }

  const headline = isBn ? result.headlineBn : result.headlineEn;
  const nextActionLabel = result.nextAction
    ? isBn
      ? result.nextAction.actionBn
      : result.nextAction.actionEn
    : isBn
    ? "তথ্য পূরণ করুন"
    : "Complete Info";

  // Dynamic color palette based on completeness
  const barColor =
    result.percent >= 80
      ? "#10b981" // green
      : result.percent >= 50
      ? "#2563eb" // blue
      : "#f59e0b"; // amber

  const bgTint =
    result.percent >= 80
      ? "#ecfdf5"
      : result.percent >= 50
      ? "#eff6ff"
      : "#fffbeb";

  const borderColor =
    result.percent >= 80
      ? "#a7f3d0"
      : result.percent >= 50
      ? "#bfdbfe"
      : "#fde68a";

  const handleAction = () => {
    if (result.nextAction?.key === "passport" && onAddPassportPress) {
      onAddPassportPress();
      return;
    }

    // Default: navigate to profile screen with relevant tab
    if (result.nextAction?.key === "passport") {
      router.push("/screens/profile?tab=identity" as any);
    } else {
      router.push("/screens/profile?tab=travel_info" as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgTint, borderColor }, style]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.iconAndTitle}>
          <View style={[styles.iconBadge, { backgroundColor: barColor }]}>
            <Ionicons
              name={result.isComplete ? "shield-checkmark" : "shield-half"}
              size={18}
              color="#ffffff"
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.headlineText} numberOfLines={1}>
              {headline}
            </Text>
            <Text style={styles.subtext}>
              {isBn
                ? "অসম্পূর্ণ তথ্যে ফ্লাইট ও ট্রাভেল বুকিং ব্যর্থ হতে পারে।"
                : "Incomplete profile may cause travel bookings to fail."}
            </Text>
          </View>
        </View>

        <View style={[styles.percentBadge, { backgroundColor: barColor + "20" }]}>
          <Text style={[styles.percentText, { color: barColor }]}>
            {result.percent}%
          </Text>
        </View>
      </View>

      {/* Visual Progress Bar Track */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${result.percent}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {/* Action Footer */}
      {!result.isComplete && (
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => setDetailsVisible(true)}
            style={styles.detailsBtn}
            hitSlop={6}
          >
            <Ionicons name="list-outline" size={14} color="#64748b" />
            <Text style={styles.detailsBtnText}>
              {isBn ? "বিস্তারিত দেখুন" : "View Checklist"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAction}
            style={[styles.actionBtn, { backgroundColor: barColor }]}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          >
            <Text style={styles.actionBtnText}>
              {nextActionLabel.charAt(0).toUpperCase() + nextActionLabel.slice(1)}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#ffffff" />
          </Pressable>
        </View>
      )}

      {/* Details & Checklist Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={barColor} />
                <Text style={styles.modalTitle}>
                  {isBn ? "প্রোফাইল সম্পূর্ণতার চেকলিস্ট" : "Profile Completeness Checklist"}
                </Text>
              </View>
              <Pressable
                onPress={() => setDetailsVisible(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            <Text style={styles.modalNotice}>
              {isBn
                ? "বুকিং যাতে কোনো ত্রুটি ছাড়াই সফল হয়, তার জন্য নিচের তথ্যগুলো যুক্ত করা প্রয়োজন:"
                : "To prevent booking rejections, complete the following travel requirements:"}
            </Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Missing items first */}
              {result.missingFields.map((field) => (
                <View key={field.key} style={styles.fieldItem}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="alert" size={14} color="#ef4444" />
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldName}>
                      {isBn ? field.labelBn : field.labelEn}
                    </Text>
                    <Text style={styles.fieldWeight}>
                      {isBn ? `+${field.weight}% মান` : `+${field.weight}% value`}
                      {field.key === "passport"
                        ? isBn
                          ? " • বুকিংয়ের জন্য আবশ্যক"
                          : " • Required for booking"
                        : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setDetailsVisible(false);
                      handleAction();
                    }}
                    style={[styles.smallAddBtn, { backgroundColor: barColor }]}
                  >
                    <Text style={styles.smallAddBtnText}>
                      {isBn ? "যোগ করুন" : "Add"}
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Completed items */}
              {result.completedFields.map((field) => (
                <View key={field.key} style={[styles.fieldItem, { opacity: 0.75 }]}>
                  <View style={[styles.statusIconBox, { backgroundColor: "#dcfce7" }]}>
                    <Ionicons name="checkmark" size={14} color="#10b981" />
                  </View>
                  <View style={styles.fieldInfo}>
                    <Text style={[styles.fieldName, styles.completedFieldName]}>
                      {isBn ? field.labelBn : field.labelEn}
                    </Text>
                    <Text style={styles.fieldWeight}>
                      {isBn ? "সম্পন্ন হয়েছে" : "Completed"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => {
                setDetailsVisible(false);
                handleAction();
              }}
              style={[styles.modalPrimaryBtn, { backgroundColor: barColor }]}
            >
              <Text style={styles.modalPrimaryBtnText}>
                {isBn ? "প্রোফাইল আপডেট করুন" : "Update Profile Now"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.04)" } : {}),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginEnd: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  titleWrap: {
    flex: 1,
  },
  headlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  subtext: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 12,
    fontWeight: "800",
  },
  track: {
    height: 7,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 10,
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.15)" } : {}),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 12,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalNotice: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 10,
    marginBottom: 12,
    lineHeight: 17,
  },
  modalList: {
    maxHeight: 280,
  },
  fieldItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  statusIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 10,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  completedFieldName: {
    color: "#64748b",
    textDecorationLine: "line-through",
  },
  fieldWeight: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  smallAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallAddBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalPrimaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
