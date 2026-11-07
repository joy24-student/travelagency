import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { AuthScreenShell } from "../../src/components/AuthScreenShell";
import { AuthSubmitButton } from "../../src/components/AuthSubmitButton";
import { authService } from "../../src/services/auth";
import { useTheme } from "../../src/context/ThemeContext";
import { OTPInput } from "../../src/components/ui";

function maskIdentifier(id: string): string {
  if (!id) return "";
  if (id.includes("@")) {
    const [local, domain] = id.split("@");
    return `${local.charAt(0)}***@${domain}`;
  }
  if (id.length > 5) {
    return `${id.slice(0, 3)}****${id.slice(-2)}`;
  }
  return id;
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{ email?: string; identifier?: string }>();
  const initialId = params.email || params.identifier || "";
  const { isDark, isOled } = useTheme();

  const [identifier, setIdentifier] = useState(initialId);
  const [token, setToken] = useState("");
  const [otpLength, setOtpLength] = useState<6 | 8>(6);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 60-second resend countdown timer
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isEditingId, setIsEditingId] = useState(!initialId);

  const triggerHaptic = (type: "light" | "success" | "error") => {
    if (Platform.OS === "web") return;
    try {
      if (type === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  };

  useEffect(() => {
    if (isEditingId) return;
    setResendTimer(60);
    setCanResend(false);

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEditingId, identifier]);

  const sendCode = async () => {
    triggerHaptic("light");
    const cleanId = identifier.trim();
    if (!cleanId) {
      triggerHaptic("error");
      setErrorMessage("দয়া করে ইমেইল বা ফোন নম্বর লিখুন");
      return;
    }
    setErrorMessage(null);
    setSending(true);

    try {
      await authService.sendOtp(cleanId);
      triggerHaptic("success");
      setSuccessNotice(`কোড পাঠানো হয়েছে ${maskIdentifier(cleanId)}-এ`);
      setIsEditingId(false);
      setResendTimer(60);
      setCanResend(false);
    } catch (error: any) {
      triggerHaptic("error");
      setErrorMessage(
        error instanceof Error ? error.message : "কোড পাঠাতে সমস্যা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।"
      );
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (codeToVerify?: string) => {
    triggerHaptic("light");
    const code = (codeToVerify || token).trim();
    const cleanId = identifier.trim();

    if (!cleanId) {
      triggerHaptic("error");
      setErrorMessage("দয়া করে ইমেইল বা ফোন নম্বর লিখুন");
      return;
    }
    if (!code || code.length < 6) {
      triggerHaptic("error");
      setErrorMessage("দয়া করে সম্পূর্ণ ভেরিফিকেশন কোড লিখুন");
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const isPhone = /^\+?[0-9\s()-]+$/.test(cleanId);
      await authService.verifyOtp(cleanId, code, isPhone ? "sms" : "email");
      triggerHaptic("success");
      router.replace("/(tabs)");
    } catch (error: any) {
      triggerHaptic("error");
      setErrorMessage(
        error instanceof Error ? error.message : "কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে।"
      );
    } finally {
      setLoading(false);
    }
  };

  const themeTextColor = isDark ? "#f8fafc" : "#111827";
  const themeSubColor = isDark ? "#94a3b8" : "#4b5563";
  const themeInputBg = isDark ? "#0f172a" : "#f9fafb";
  const themeInputBorder = isDark ? "#334155" : "#e5e7eb";

  return (
    <AuthScreenShell
      subtitle="আপনার ইমেইল বা ফোনে পাঠানো কোড দিয়ে নিরাপদে লগইন করুন।"
      title="OTP যাচাইকরণ"
    >
      {/* Masked identifier display & Change link */}
      {!isEditingId && identifier ? (
        <View
          style={[
            styles.identifierBox,
            { backgroundColor: isDark ? "#1e293b" : "#eff6ff" },
          ]}
        >
          <View style={styles.idRow}>
            <Ionicons name="mail-open-outline" size={18} color="#3166ee" />
            <Text
              style={[
                styles.idText,
                { color: isDark ? "#93c5fd" : "#1e40af" },
              ]}
            >
              কোড পাঠানো হয়েছে {maskIdentifier(identifier)}-এ
            </Text>
          </View>
          <Pressable
            onPress={() => {
              triggerHaptic("light");
              setIsEditingId(true);
              setSuccessNotice(null);
              setErrorMessage(null);
            }}
            style={styles.changeLink}
          >
            <Text style={styles.changeLinkText}>ভুল ইমেইল? পরিবর্তন করুন</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.label, { color: themeTextColor }]}>ইমেইল বা ফোন নম্বর</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeInputBg,
                borderColor: themeInputBorder,
                color: themeTextColor,
              },
            ]}
            placeholder="name@example.com বা +8801..."
            placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
            value={identifier}
            onChangeText={(val) => {
              setIdentifier(val);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.sendOtpBtn, sending && styles.btnDisabled]}
            onPress={sendCode}
            disabled={sending}
          >
            <Text style={styles.sendOtpBtnText}>
              {sending ? "কোড পাঠানো হচ্ছে..." : "কোড পাঠান"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Success notice */}
      {successNotice && !isEditingId && (
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.successText}>{successNotice}</Text>
        </View>
      )}

      {/* OTP Code input with 6 / 8 digit support */}
      {!isEditingId && (
        <View style={{ marginVertical: 14 }}>
          <Text style={[styles.label, { color: themeTextColor }]}>ভেরিফিকেশন কোড (OTP)</Text>
          <OTPInput
            length={otpLength}
            value={token}
            onChangeText={(val) => {
              setToken(val);
              if (errorMessage) setErrorMessage(null);
              if (val.length === 8 && otpLength === 6) {
                setOtpLength(8);
              }
              if (val.length === otpLength) {
                onSubmit(val);
              }
            }}
            autoFocus
          />

          {/* 60s Resend Timer */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <Pressable onPress={sendCode} style={styles.resendActive}>
                <Ionicons name="refresh" size={16} color="#3166ee" />
                <Text style={styles.resendActiveText}>আবার কোড পাঠান</Text>
              </Pressable>
            ) : (
              <Text style={[styles.resendDisabledText, { color: themeSubColor }]}>
                আবার পাঠান ({resendTimer} সেকেন্ড)
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Inline Error Message */}
      {errorMessage && (
        <View style={styles.inlineErrorBox}>
          <Ionicons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      )}

      {!isEditingId && (
        <AuthSubmitButton
          label="যাচাই করুন ও সাইন ইন করুন"
          loading={loading}
          onPress={() => onSubmit()}
        />
      )}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  identifierBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  idText: {
    fontSize: 14,
    fontWeight: "700",
  },
  changeLink: {
    paddingVertical: 4,
  },
  changeLinkText: {
    fontSize: 13,
    color: "#3166ee",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  sendOtpBtn: {
    backgroundColor: "#3166ee",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  sendOtpBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  successText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "500",
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  resendActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  resendActiveText: {
    color: "#3166ee",
    fontSize: 14,
    fontWeight: "700",
  },
  resendDisabledText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inlineErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  inlineErrorText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
