/**
 * OTP Verification Screen
 * Real-time OTP code entry for signup and recovery
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "../../config/theme";
import { AuthStackParamList } from "../../navigation/types";
import { Button } from "../ui/UIComponents";
import { useAuth } from "../../hooks/useAuth";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerification">;

type FlowDisplay = {
  [key in "login" | "signup" | "recovery"]: string;
};

const flowTitle: FlowDisplay = {
  login: "OTP Login",
  signup: "Verify Your Email",
  recovery: "Reset Password",
};

const flowDescription: FlowDisplay = {
  login: "Enter the 6-digit code sent to your email address.",
  signup:
    "A verification code was sent to your inbox to activate your account.",
  recovery: "Use the code from your email to complete password recovery.",
};

export default function OtpScreen({ navigation, route }: Props) {
  const { email, mode } = route.params;
  const { sendOtp, verifyOtp } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (secondsLeft > 0) {
      timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    }

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleVerify = async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length < 4) {
      setError("Enter the verification code from your email.");
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);

      await verifyOtp(email, trimmedCode, mode === "login" ? "otp" : mode);

      setMessage("Verification successful. Redirecting...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0) {
      return;
    }

    try {
      setError("");
      setMessage("Sending a new code...");
      await sendOtp(email);
      setSecondsLeft(60);
      setMessage("A fresh verification code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code");
      setMessage("");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4F46E5", "#06B6D4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color="white"
            />
          </TouchableOpacity>
          <Text style={styles.title}>{flowTitle[mode]}</Text>
          <Text style={styles.subtitle}>{flowDescription[mode]}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.codeInputSection}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              textContentType="oneTimeCode"
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ""))}
              maxLength={6}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? "Verifying..." : "Verify Code"}
            onPress={handleVerify}
            disabled={loading}
            loading={loading}
            size="large"
            style={styles.actionButton}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>
              Didn’t receive a code?{" "}
              {secondsLeft > 0 ? `Retry in ${secondsLeft}s` : ""}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={secondsLeft > 0}>
              <Text
                style={[
                  styles.resendLink,
                  secondsLeft > 0 && styles.resendLinkDisabled,
                ]}
              >
                Resend code
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBg: {
    position: "absolute",
    width: "100%",
    height: 340,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: "90%",
    marginBottom: 6,
  },
  emailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  codeInputSection: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  codeInput: {
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontSize: 20,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: `${COLORS.danger}20`,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
  successBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: `${COLORS.success}15`,
    marginBottom: 16,
  },
  successText: {
    color: COLORS.success,
    fontSize: 13,
  },
  actionButton: {
    marginBottom: 16,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  resendLinkDisabled: {
    color: `${COLORS.textTertiary}`,
  },
  linkRow: {
    alignItems: "center",
    marginTop: 6,
  },
  linkLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
