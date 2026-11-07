import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../src/context/LanguageContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/hooks/useAuth";
import { showLocalizedAlert } from "../../src/utils/localizedAlert";
import { userDataExportService } from "../../src/services/userDataExportService";

export default function DeleteAccountRoute() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isConfirmed =
    confirmText.trim().toUpperCase() === "DELETE" ||
    (isBn && confirmText.trim() === "মুছুন");

  const handleDownloadBeforeDelete = async () => {
    try {
      setExporting(true);
      const payload = await userDataExportService.buildExportPayload(user?.id || "", user);
      await userDataExportService.exportAndShareData(payload);
      showLocalizedAlert(
        isBn ? "ডাটা এক্সপোর্ট" : "Data Export",
        isBn
          ? "আপনার ডাটা সফলভাবে ডাউনলোড বা শেয়ারের জন্য প্রস্তুত হয়েছে।"
          : "Your personal data export is ready."
      );
    } catch {
      showLocalizedAlert(
        isBn ? "ত্রুটি" : "Error",
        isBn ? "ডাটা এক্সপোর্ট ব্যর্থ হয়েছে।" : "Failed to export data."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const uid = user?.id || "";
      await userDataExportService.executeAccountDeletion(uid);
      await signOut();
      showLocalizedAlert(
        isBn ? "অ্যাকাউন্ট মোছার অনুরোধ সফল" : "Deletion Scheduled",
        isBn
          ? "আপনার অ্যাকাউন্ট মুছে ফেলার অনুরোধ গৃহীত হয়েছে। ৩০ দিনের মধ্যে লগইন না করলে সমস্ত ডাটা স্থায়ীভাবে ডিলিট হবে।"
          : "Your account deletion request has been submitted. All data will be permanently wiped if you do not sign back in within 30 days.",
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
        isBn ? "অ্যাকাউন্ট মোছা সম্ভব হয়নি।" : "Failed to delete account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isBn ? "অ্যাকাউন্ট মুছুন" : "Delete Account"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Warning Icon Box */}
        <View style={styles.warningHero}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={36} color="#ef4444" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isBn ? "অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা" : "Permanent Account Deletion"}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.subtext }]}>
            {isBn
              ? "Apple App Store ও Google Play নির্দেশিকা অনুযায়ী ইন-অ্যাপ সুবিধা"
              : "In-app account deletion pursuant to Apple App Store & Google Play guidelines"}
          </Text>
        </View>

        {/* Consequences Box */}
        <View style={styles.consequencesCard}>
          <Text style={styles.consequencesTitle}>
            {isBn ? "অ্যাকাউন্ট মোছার ফলাফল ও পরিণতি:" : "Consequences of Account Deletion:"}
          </Text>

          <View style={styles.itemRow}>
            <Ionicons name="airplane" size={16} color="#ef4444" style={styles.itemIcon} />
            <Text style={styles.itemText}>
              {isBn
                ? "সকল সক্রিয় ও পূর্ববর্তী ফ্লাইট, হোটেল বুকিং এবং ই-টিকেট অপ্রবেশযোগ্য হবে।"
                : "All active and past flights, hotel reservations, and e-tickets will become inaccessible."}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Ionicons name="wallet" size={16} color="#ef4444" style={styles.itemIcon} />
            <Text style={styles.itemText}>
              {isBn
                ? "ওয়ালেট ব্যালেন্স, ক্যাশব্যাক ও ট্রিপ কয়েন পয়েন্ট স্থায়ীভাবে বাজেয়াপ্ত হবে।"
                : "Trip Coins, loyalty tiers, and existing wallet balances will be permanently forfeited."}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Ionicons name="document-text" size={16} color="#ef4444" style={styles.itemIcon} />
            <Text style={styles.itemText}>
              {isBn
                ? "সংরক্ষিত পাসপোর্ট, জাতীয় পরিচয়পত্র (NID) ও কেওয়াইসি (KYC) যাচাইকরণ তথ্য মুছে যাবে।"
                : "Stored passport details, national ID, and KYC verification records will be permanently erased."}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Ionicons name="time" size={16} color="#f59e0b" style={styles.itemIcon} />
            <Text style={styles.itemText}>
              {isBn
                ? "৩০ দিনের গ্রেস পিরিয়ড: ৩০ দিনের মধ্যে পুনরায় লগইন না করলে অ্যাকাউন্ট চিরতরে মুছে যাবে।"
                : "30-Day Recovery Period: You can cancel deletion by logging back in within 30 days."}
            </Text>
          </View>
        </View>

        {/* Data Download Suggestion */}
        <TouchableOpacity
          onPress={handleDownloadBeforeDelete}
          disabled={exporting}
          style={[styles.exportCard, { backgroundColor: isDark ? "#1e293b" : "#f1f5f9", borderColor: colors.border }]}
        >
          <View style={styles.exportRow}>
            <View style={styles.downloadIconBox}>
              {exporting ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color="#2563eb" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.exportTitle, { color: colors.text }]}>
                {isBn ? "মুছে ফেলার আগে ডাটা ডাউনলোড করুন" : "Download My Data Before Deletion"}
              </Text>
              <Text style={[styles.exportDesc, { color: colors.subtext }]}>
                {isBn
                  ? "আপনার বুকিং, প্রোফাইল ও ভ্রমণ তথ্যের কপি সংরক্ষণ করুন"
                  : "Export a full archive of your profile, bookings, and preferences"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
          </View>
        </TouchableOpacity>

        {/* Confirmation Prompt */}
        <View style={styles.confirmBox}>
          <Text style={[styles.confirmPrompt, { color: colors.text }]}>
            {isBn ? "নিশ্চিত করতে নিচের বক্সে DELETE লিখুন:" : "Type DELETE below to confirm:"}
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
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
              },
            ]}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={!isConfirmed || loading}
          style={[
            styles.deleteBtn,
            { backgroundColor: isConfirmed ? "#dc2626" : "#fca5a5" },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.deleteBtnText}>
              {isBn ? "স্থায়ীভাবে অ্যাকাউন্ট মুছুন" : "Permanently Delete Account"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  warningHero: { alignItems: "center", marginVertical: 16 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  heroSubtitle: { fontSize: 12, textAlign: "center", marginTop: 4, lineHeight: 16 },
  consequencesCard: {
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginVertical: 16,
  },
  consequencesTitle: { fontSize: 14, fontWeight: "700", color: "#dc2626", marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemIcon: { marginTop: 2 },
  itemText: { fontSize: 12, lineHeight: 17, color: "#334155", flex: 1 },
  exportCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  exportRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  downloadIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  exportTitle: { fontSize: 13, fontWeight: "700" },
  exportDesc: { fontSize: 11, marginTop: 2 },
  confirmBox: { marginTop: 8, marginBottom: 16 },
  confirmPrompt: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
  },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
});
