import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Text, TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "../../src/auth/schemas";
import { AuthScreenShell } from "../../src/components/AuthScreenShell";
import { AuthSubmitButton } from "../../src/components/AuthSubmitButton";
import { AuthTextField } from "../../src/components/AuthTextField";
import { authService } from "../../src/services/auth";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    code?: string;
    email?: string;
    token_hash?: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const tokenRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const { control, handleSubmit } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: params.email ?? "",
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const prepareRecoverySession = async () => {
      try {
        if (params.code) {
          await authService.exchangeCodeForSession(params.code);
          setSessionReady(true);
        } else if (params.token_hash) {
          await authService.verifyTokenHash(params.token_hash, "recovery");
          setSessionReady(true);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : t("recoveryLinkInvalid", "রিকভারি লিংক মেয়াদোত্তীর্ণ বা অকার্যকর।")
        );
      }
    };

    prepareRecoverySession();
  }, [params.code, params.token_hash, t]);

  const onSubmit = handleSubmit(async ({ email, token, password }) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!sessionReady && email && token) {
        await authService.verifyOtp(email, token, "recovery");
      }
      await authService.updatePassword(password);
      router.replace("/(auth)/login");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("passwordUpdateFailed", "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।")
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthScreenShell
      subtitle={t("resetPasswordSubtitle", "Open the recovery link, or enter the recovery code, then set a new password.")}
      title={t("resetPassword", "Reset Password")}
    >
      {!sessionReady ? (
        <>
          <AuthTextField
            control={control}
            inputRef={emailRef}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => tokenRef.current?.focus()}
            label={t("email", "Email")}
            name="email"
          />
          <AuthTextField
            control={control}
            inputRef={tokenRef}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            label={t("recoveryCode", "Recovery code")}
            placeholder={t("enterVerificationCode", "Enter verification code")}
            name="token"
          />
          <Text className="mb-4 text-xs leading-5 text-gray-500">
            {t("emptyRecoveryNote", "If you opened the recovery link directly, you can leave these fields empty.")}
          </Text>
        </>
      ) : null}
      <AuthTextField
        control={control}
        inputRef={passwordRef}
        label={t("newPassword", "New password")}
        name="password"
        secureTextEntry
        isNewPassword
        showStrengthMeter
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
      />
      <AuthTextField
        control={control}
        inputRef={confirmPasswordRef}
        label={t("confirmNewPassword", "Confirm new password")}
        name="confirmPassword"
        secureTextEntry
        isNewPassword
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      {errorMessage && (
        <Text style={{ color: "#dc2626", fontSize: 13, fontWeight: "500", marginBottom: 12 }}>
          {errorMessage}
        </Text>
      )}
      <AuthSubmitButton
        label={t("updatePassword", "Update password")}
        loading={loading}
        onPress={onSubmit}
      />
    </AuthScreenShell>
  );
}
