import { toast } from "../../src/components/ui/Toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Alert, Text, View, Pressable, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, ScrollView, Animated, PanResponder, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { emailOnlySchema, EmailOnlyFormValues } from "../../src/auth/schemas";
import { AuthTextField } from "../../src/components/AuthTextField";
import { authService } from "../../src/services/auth";
import { OTPInput, PasswordStrengthMeter } from "../../src/components/ui";

const TRIP_BLUE = "#3166ee";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const parts = email.split("@");
  const first = parts[0].charAt(0);
  return `${first}***@${parts[1]}`;
}

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLength, setOtpLength] = useState<6 | 8>(8);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resendRotateAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordRef = useRef<TextInput>(null);

  // Modal Animation and Pan Logic
  const pan = useRef(new Animated.ValueXY()).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(500)).current;

  const otpPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) pan.y.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 120) {
        Animated.timing(pan.y, { toValue: 1000, duration: 300, useNativeDriver: true }).start(() => setOtpModalVisible(false));
      } else {
        Animated.spring(pan.y, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
      }
    },
  })).current;

  useEffect(() => {
    if (otpModalVisible) {
      pan.setValue({ x: 0, y: 0 });
      Animated.parallel([
        Animated.timing(modalFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(modalSlideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      modalSlideAnim.setValue(500);
    }
  }, [otpModalVisible]);

  // Native iPhone edge-swipe back navigation logic
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Detect left-to-right swipe starting from the left edge
        return gestureState.dx > 10 && gestureState.x0 < 50 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) router.back();
      },
    })
  ).current;

  const { control, handleSubmit } = useForm<EmailOnlyFormValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // Timer effect for OTP resend
  useEffect(() => {
    if (otpModalVisible && !canResend) {
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
    } else if (!otpModalVisible) {
      setResendTimer(60);
      setCanResend(false);
    }
  }, [otpModalVisible, canResend]);

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setOtpError(null);
    try {
      await authService.resetPassword(userEmail);
      setResendTimer(60);
      setCanResend(false);
      setOtpCode("");
      
      Animated.timing(resendRotateAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => resendRotateAnim.setValue(0));
      
      toast.success("একটি নতুন কোড আপনার ইমেইলে পাঠানো হয়েছে।");
    } catch (error) {
      setOtpError("OTP পুনরায় পাঠাতে সমস্যা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);
    setFormError(null);
    try {
      await authService.resetPassword(email);
      setUserEmail(email);
      setOtpCode("");
      setOtpModalVisible(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "পাসওয়ার্ড রিকভারি সম্ভব হয়নি। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  });

  const handleVerifyAndReset = async () => {
    const token = otpCode.trim();
    setOtpError(null);
    setPasswordError(null);
    setConfirmError(null);

    let hasError = false;
    if (token.length < 6) {
      setOtpError("Please enter the complete verification code.");
      hasError = true;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      await authService.verifyPasswordResetOtp(userEmail, token, newPassword);
      toast.success("Password reset successfully!");
      setOtpModalVisible(false);
      router.push("/(auth)/login");
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Invalid code or password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header} {...panResponder.panHandlers}>
        <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={28} color={TRIP_BLUE} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Trip.com</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.illustrationSection}>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="mail-open-outline" size={40} color={TRIP_BLUE} />
            </Animated.View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.mainTitle}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Don't worry! Enter your email below and we'll send you instructions to reset your password.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <AuthTextField
              control={control}
              keyboardType="email-address"
              label="Email Address"
              name="email"
              placeholder="Enter your registered email"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />

            {formError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 8 }}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "500" }}>{formError}</Text>
              </View>
            )}

            <Pressable 
              style={[styles.actionButton, loading && styles.buttonDisabled]} 
              onPress={onSubmit}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>
                {loading ? "Sending..." : "Send Verification Code"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP & Password Reset Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOtpModalVisible(false)} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: Animated.add(modalSlideAnim, pan.y) }] }]}>
              <View style={styles.modalHandle} {...otpPan.panHandlers} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Pressable onPress={() => setOtpModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#111" />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.modalForm}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalDescription}>
                  Enter the {otpLength}-digit code sent to {maskEmail(userEmail)}
                </Text>
                
                <OTPInput
                  length={otpLength}
                  value={otpCode}
                  onChangeText={(val) => {
                    setOtpCode(val);
                    if (otpError) setOtpError(null);
                  }}
                  error={otpError}
                  supportsAlpha={true}
                  autoFocus
                />

                <View style={styles.codeFormatToggleRow}>
                  <Pressable
                    onPress={() => {
                      setOtpLength((prev) => (prev === 8 ? 6 : 8));
                      setOtpCode("");
                      setOtpError(null);
                    }}
                    style={styles.codeFormatToggleBtn}
                  >
                    <Text style={styles.codeFormatToggleText}>
                      {otpLength === 8 ? "Need 6-digit input? Tap here" : "Need 8-digit input? Tap here"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.timerRow}>
                  {canResend ? (
                    <Pressable onPress={handleResendOtp} style={[styles.resendBtn, loading && { opacity: 0.5 }]} disabled={loading}>
                      <Animated.View style={{
                        transform: [{
                          rotate: resendRotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }]
                      }}>
                        <Ionicons name="refresh" size={18} color={TRIP_BLUE} />
                      </Animated.View>
                      <Text style={styles.resendText}>Resend Code</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={[styles.passwordInput, passwordError && styles.passwordInputError]}
                      placeholder="Enter new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); if (passwordError) setPasswordError(null); }}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      accessible
                      accessibilityLabel="New Password"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                  <PasswordStrengthMeter password={newPassword} />
                  {passwordError && (
                    <View style={styles.inlineErrorRow}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.inlineErrorText}>{passwordError}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      ref={confirmPasswordRef}
                      style={[styles.passwordInput, confirmError && styles.passwordInputError]}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (confirmError) setConfirmError(null); }}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyAndReset}
                      accessible
                      accessibilityLabel="Confirm Password"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={8}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                  {confirmError && (
                    <View style={styles.inlineErrorRow}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.inlineErrorText}>{confirmError}</Text>
                    </View>
                  )}
                </View>

                <Pressable 
                  style={[styles.actionButton, loading && styles.buttonDisabled]} 
                  onPress={handleVerifyAndReset}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    paddingVertical: 4,
    marginStart: -8,
  },
  backButtonText: {
    fontSize: 17,
    color: TRIP_BLUE,
    marginStart: -6,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: TRIP_BLUE,
  },
  headerRightSpacer: {
    width: 80, // Matches back button width for perfect centering
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  illustrationSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    textAlign: 'center',
  },
  formContainer: {
    gap: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TRIP_BLUE,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: "80%",
    width: '100%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalForm: {
    paddingBottom: 24,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeFormatToggleRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  codeFormatToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
  },
  codeFormatToggleText: {
    fontSize: 12,
    color: TRIP_BLUE,
    fontWeight: '600',
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    gap: 6,
    flexWrap: "wrap",
  },
  otpInput: {
    width: 40,
    height: 52,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  inlineErrorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  passwordInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    color: TRIP_BLUE,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
