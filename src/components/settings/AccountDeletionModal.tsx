import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { showLocalizedAlert } from "../../utils/localizedAlert";
import { userDataExportService } from "../../services/userDataExportService";

interface AccountDeletionModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AccountDeletionModal({
  visible,
  onClose,
}: AccountDeletionModalProps) {
  const { language, t } = useLanguage();
  const isBn = language === "bn";
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const isConfirmed =
    confirmText.trim().toUpperCase() === "DELETE" ||
    (isBn && confirmText.trim() === "মুছুন");

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const uid = user?.id || "";
      await userDataExportService.executeAccountDeletion(uid);
      await signOut();
      onClose();
      showLocalizedAlert(
        isBn ? "অ্যাকাউন্ট মোছার অনুরোধ সম্পন্ন" : "Account Deletion Scheduled",
        isBn
          ? "আপনার অ্যাকাউন্ট মুছে ফেলার অনুরোধ গৃহীত হয়েছে। ৩০ দিনের গ্রেস পিরিয়ডের মধ্যে লগইন না করলে সমস্ত ডাটা স্থায়ীভাবে বিলুপ্ত হবে।"
          : "Your account deletion request has been scheduled. If you do not log in within the 30-day grace period, all your data will be permanently wiped.",
        [
          {
            text: isBn ? "ঠিক আছে" : "OK",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch {
      showLocalizedAlert(
        isBn ? "ত্রুটি" : "Error",
        isBn ? "অ্যাকাউন্ট মোছা সম্ভব হয়নি। আবার চেষ্টা করুন।" : "Failed to process account deletion."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={26} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isBn ? "অ্যাকাউন্ট মুছুন" : "Delete Account"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                {isBn ? "Apple ও Google প্লে স্টোর নির্দেশিকা নীতি" : "Complies with Apple & Google Play policies"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Detailed Explanation of Consequences */}
            <Text style={[styles.consequencesHeading, { color: colors.text }]}>
              {isBn ? "অ্যাকাউন্ট মোছার ফলাফল ও পরিণতি:" : "Consequences of Account Deletion:"}
            </Text>

            <View style={styles.consequenceList}>
              <View style={styles.consequenceItem}>
                <Ionicons name="airplane-outline" size={16} color="#ef4444" style={styles.conseqIcon} />
                <Text style={[styles.consequenceText, { color: colors.text }]}>
                  {isBn
                    ? "আপনার সকল বর্তমান ও পূর্ববর্তী বুকিং, ই-টিকেট এবং হোটেল ভাউচার অপ্রবেশযোগ্য হবে।"
                    : "All active and past bookings, flight tickets, and hotel vouchers will become inaccessible."}
                </Text>
              </View>

              <View style={styles.consequenceItem}>
                <Ionicons name="wallet-outline" size={16} color="#ef4444" style={styles.conseqIcon} />
                <Text style={[styles.consequenceText, { color: colors.text }]}>
                  {isBn
                    ? "ওয়ালেট ব্যালেন্স, ক্যাশব্যাক ও ট্রিপ কয়েন পয়েন্ট সম্পূর্ণভাবে বাজেয়াপ্ত হবে।"
                    : "Trip Coins, reward points, and existing wallet balances will be permanently forfeited."}
                </Text>
              </View>

              <View style={styles.consequenceItem}>
                <Ionicons name="document-text-outline" size={16} color="#ef4444" style={styles.conseqIcon} />
                <Text style={[styles.consequenceText, { color: colors.text }]}>
                  {isBn
                    ? "সংরক্ষিত পাসপোর্ট, এনআইডি ও কেওয়াইসি (KYC) যাচাইকরণ তথ্য সিস্টেম থেকে মুছে ফেলা হবে।"
                    : "Stored passport, national ID, and KYC verification records will be permanently wiped."}
                </Text>
              </View>

              <View style={styles.consequenceItem}>
                <Ionicons name="time-outline" size={16} color="#f59e0b" style={styles.conseqIcon} />
                <Text style={[styles.consequenceText, { color: colors.text }]}>
                  {isBn
                    ? "৩০ দিনের গ্রেস পিরিয়ড: ৩০ দিনের মধ্যে আর লগইন না করলে এটি চিরতরে মুছে যাবে।"
                    : "30-Day Recovery Period: Logging in within 30 days will cancel deletion. Afterward, recovery is impossible."}
                </Text>
              </View>
            </View>

            {/* Confirmation Input */}
            <View style={styles.confirmBox}>
              <Text style={[styles.confirmPrompt, { color: colors.text }]}>
                {isBn
                  ? "নিশ্চিত করতে নিচের বক্সে DELETE লিখুন:"
                  : "Type DELETE below to confirm:"}
              </Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="DELETE"
                placeholderTextColor={colors.subtext}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: isConfirmed ? "#ef4444" : colors.border,
                    backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  },
                ]}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: isDark ? "#334155" : "#f1f5f9" },
                ]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                  {isBn ? "বাতিল করুন" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                disabled={!isConfirmed || loading}
                style={[
                  styles.deleteBtn,
                  {
                    backgroundColor: isConfirmed ? "#dc2626" : "#fca5a5",
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteBtnText}>
                    {isBn ? "অ্যাকাউন্ট মুছুন" : "Confirm Delete"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.2)" } : {}),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    marginTop: 14,
  },
  consequencesHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  consequenceList: {
    gap: 10,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  consequenceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  conseqIcon: {
    marginTop: 2,
  },
  consequenceText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  confirmBox: {
    marginTop: 16,
  },
  confirmPrompt: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
