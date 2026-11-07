import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { otpSchema, OtpFormValues } from "../../src/auth/schemas";
import { AuthScreenShell } from "../../src/components/AuthScreenShell";
import { AuthSubmitButton } from "../../src/components/AuthSubmitButton";
import { AuthTextField } from "../../src/components/AuthTextField";
import { authService } from "../../src/services/auth";
import { formatNumber } from "../../src/utils/formatters";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const parts = email.split("@");
  return `${parts[0].charAt(0)}***@${parts[1]}`;
}

export default function EmailVerificationScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    email?: string;
    token_hash?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { control, getValues, handleSubmit } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { identifier: params.email ?? "", token: "" },
  });

  useEffect(() => {
    const confirmFromLink = async () => {
      try {
        if (params.code) {
          await authService.exchangeCodeForSession(params.code);
          router.replace("/(tabs)");
        } else if (params.token_hash) {
          await authService.verifyTokenHash(params.token_hash, "signup");
          router.replace("/(tabs)");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "ভেরিফিকেশন লিংকটি কাজ করছে না। অনুগ্রহ করে কোডটি লিখুন।"
        );
      }
    };

    confirmFromLink();
  }, [params.code, params.token_hash]);

  useEffect(() => {
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
  }, []);

  const resend = async () => {
    const identifier = getValues("identifier");
    if (!identifier) {
      setErrorMessage("পুনরায় কোড পাঠাতে আপনার ইমেইল লিখুন।");
      return;
    }
    setResending(true);
    setErrorMessage(null);
    try {
      await authService.resendEmailVerification(identifier);
      setSuccessMessage(`নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে ${maskEmail(identifier)}-এ`);
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "কোড পাঠানো সম্ভব হয়নি। কিছুক্ষণ পর চেষ্টা করুন।"
      );
    } finally {
      setResending(false);
    }
  };

  const onSubmit = handleSubmit(async ({ identifier, token }) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await authService.verifyOtp(identifier, token, "signup");
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে।"
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthScreenShell
      subtitle="আপনার ইমেইলে পাঠানো সাইন-আপ কোডটি নিশ্চিত করুন।"
      title="ইমেইল ভেরিফিকেশন"
    >
      {params.email ? (
        <View className="mb-4 rounded-xl bg-blue-50 p-3 items-center">
          <Text className="text-sm font-bold text-blue-800">
            কোড পাঠানো হয়েছে {maskEmail(params.email)}-এ
          </Text>
        </View>
      ) : null}

      <AuthTextField
        control={control}
        keyboardType="email-address"
        label="ইমেইল"
        name="identifier"
      />
      <AuthTextField
        control={control}
        keyboardType="number-pad"
        label="ভেরিফিকেশন কোড (OTP)"
        placeholder="কোড লিখুন"
        name="token"
      />

      {errorMessage && (
        <View className="mb-3 flex-row items-center gap-2 rounded-lg bg-red-50 p-3">
          <Ionicons name="alert-circle" size={16} color="#dc2626" />
          <Text className="flex-1 text-xs font-semibold text-red-700">{errorMessage}</Text>
        </View>
      )}

      {successMessage && (
        <View className="mb-3 flex-row items-center gap-2 rounded-lg bg-green-50 p-3">
          <Ionicons name="checkmark-circle" size={16} color="#15803d" />
          <Text className="flex-1 text-xs font-semibold text-green-700">{successMessage}</Text>
        </View>
      )}

      <AuthSubmitButton
        label="ইমেইল যাচাই করুন"
        loading={loading}
        onPress={onSubmit}
      />

      <Pressable
        className={`mt-4 items-center rounded-xl border border-gray-200 px-4 py-4 ${
          !canResend || resending ? "bg-gray-100 opacity-60" : "bg-white"
        }`}
        disabled={!canResend || resending}
        onPress={resend}
      >
        <Text className="font-extrabold text-gray-800">
          {resending
            ? "পাঠানো হচ্ছে..."
            : canResend
            ? "আবার কোড পাঠান"
            : `পুনরায় পাঠান (${formatNumber(resendTimer)} সেকেন্ড)`}
        </Text>
      </Pressable>
    </AuthScreenShell>
  );
}
