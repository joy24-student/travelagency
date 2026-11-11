import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";

import { AuthScreenShell } from "../../src/components/AuthScreenShell";
import { authService } from "../../src/services/auth";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useLanguage } from "../../src/context/LanguageContext";

export default function BiometricLoginScreen() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toggleBiometric } = useSettingsStore();

  const signIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Shopnojatra-তে সাইন ইন করতে বায়োমেট্রিক ব্যবহার করুন",
          fallbackLabel: "পাসওয়ার্ড ব্যবহার করুন",
        });

        if (result.success) {
          const session = await authService.getSession();
          if (session?.user) {
            router.replace("/(tabs)");
            return;
          }
        }
      }

      // Fallback to WebAuthn / Passkey
      await authService.signInWithBiometric();
      router.replace("/(tabs)");
    } catch (error: any) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "বায়োমেট্রিক লগইন সম্ভব হয়নি। দয়া করে ইমেইল দিয়ে লগইন করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "ডিভাইস বায়োমেট্রিক চালু করতে নিশ্চিত করুন",
        });

        if (result.success) {
          toggleBiometric(true);
          setSuccessMessage("বায়োমেট্রিক লগইন সফলভাবে সক্রিয় করা হয়েছে।");
          return;
        }
      }

      await authService.registerBiometric();
      setSuccessMessage("বায়োমেট্রিক লগইন সফলভাবে সক্রিয় করা হয়েছে।");
    } catch (error: any) {
      setErrorMessage(
        error instanceof Error ? error.message : "বায়োমেট্রিক চালু করতে প্রথমে লগইন করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      subtitle="দ্রুত এবং নিরাপদে এক ক্লিকে ফেস বা আঙুলের ছাপ দিয়ে লগইন করুন।"
      title="বায়োমেট্রিক লগইন"
    >
      <View style={{ alignItems: "center", marginVertical: 20 }}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print" size={54} color="#3166ee" />
        </View>
      </View>

      {/* Inline Notifications (Item 4) */}
      {errorMessage && (
        <View style={styles.inlineErrorBox}>
          <Ionicons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View style={styles.inlineSuccessBox}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.inlineSuccessText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.btnStack}>
        <Pressable
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={signIn}
        >
          <Ionicons name="finger-print-outline" size={20} color="#ffffff" />
          <Text style={styles.primaryBtnText}>
            {loading ? "অপেক্ষা করুন..." : "বায়োমেট্রিক দিয়ে সাইন ইন করুন"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={register}
        >
          <Text style={styles.secondaryBtnText}>
            এই অ্যাকাউন্টের জন্য বায়োমেট্রিক চালু করুন
          </Text>
        </Pressable>

        <Pressable
          style={styles.backLink}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.backLinkText}>ইমেইল দিয়ে লগইন করতে ফিরে যান</Text>
        </Pressable>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  btnStack: {
    gap: 12,
    marginTop: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3166ee",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backLinkText: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "500",
  },
  inlineErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  inlineErrorText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  inlineSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  inlineSuccessText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
