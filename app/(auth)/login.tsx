import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as LocalAuthentication from "expo-local-authentication";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAuth } from "../../src/hooks/useAuth";
import { authService } from "../../src/services/auth";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useTheme } from "../../src/context/ThemeContext";
import { deviceSessionService } from "../../src/services/deviceSessionService";
import { OTPInput, PasswordStrengthMeter } from "../../src/components/ui";
import { BRAND } from "../../src/constants/brand";

// Safe import for Google Sign-in to prevent crash in unsupported environments
let GoogleSignin: any;
try {
  const GoogleSigninModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = GoogleSigninModule.GoogleSignin;
} catch (e) {
  // Silent fallback
}

WebBrowser.maybeCompleteAuthSession();

const TRIP_BLUE = "#3166ee";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "";
  const parts = email.split("@");
  const name = parts[0];
  const domain = parts[1];
  const first = name.charAt(0);
  return `${first}***@${domain}`;
}

export default function LoginScreen() {
  const { signIn, signInWithOAuth, sendOtp, verifyOtp, updatePassword, loginAsDemo } = useAuth();
  const searchParams = useLocalSearchParams<{ expired?: string; returnTo?: string }>();
  const { security, toggleBiometric } = useSettingsStore();
  const { isDark, isOled } = useTheme();

  // Root states
  const [loading, setLoading] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  // Email step modal & form states
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);

  // Password fields
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Lockout / Rate limit counter (30s)
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  // OTP Verification modal & states
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLength, setOtpLength] = useState<6 | 8>(6);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false);

  // Magic link state
  const [magicLinkNotice, setMagicLinkNotice] = useState<string | null>(null);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  // Password creation for new users
  const [passwordCreateModalVisible, setPasswordCreateModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createPasswordError, setCreatePasswordError] = useState<string | null>(null);

  // Biometrics prompt modal after first login
  const [biometricPromptVisible, setBiometricPromptVisible] = useState(false);
  const [biometricPendingRedirect, setBiometricPendingRedirect] = useState<string | null>(null);

  // Social & Referral
  const [socialError, setSocialError] = useState<string | null>(null);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralMessage, setReferralMessage] = useState<string | null>(null);

  // Animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(400)).current;

  // Adaptive theme colors
  const themeStyles = {
    bg: isOled ? "#000000" : isDark ? "#0f172a" : "#ffffff",
    cardBg: isOled ? "#09090b" : isDark ? "#1e293b" : "#ffffff",
    textPrimary: isDark ? "#f8fafc" : "#111827",
    textSecondary: isDark ? "#94a3b8" : "#4b5563",
    inputBg: isDark ? "#0f172a" : "#f9fafb",
    inputBorder: isDark ? "#334155" : "#e5e7eb",
    modalOverlay: "rgba(0, 0, 0, 0.65)",
    bannerBg: isDark ? "#292524" : "#fef3c7",
    bannerBorder: isDark ? "#44403c" : "#fde68a",
    bannerText: isDark ? "#fcd34d" : "#92400e",
    googleBtnBg: isDark ? "#1e293b" : "#ffffff",
    googleBtnBorder: isDark ? "#334155" : "#e5e7eb",
    googleBtnText: isDark ? "#f8fafc" : "#1f2937",
    biometricBtnBg: isDark ? "#1e3a8a33" : "#eff6ff",
    biometricBtnBorder: isDark ? "#1e40af" : "#bfdbfe",
  };

  // Safe Haptic feedback trigger
  const triggerHaptic = (type: "light" | "success" | "error") => {
    if (Platform.OS === "web") return;
    try {
      if (type === "light") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {}
  };

  // Initialize Google Sign-in if configured
  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          offlineAccess: true,
        });
      } catch (err) {
        console.warn("GoogleSignin configuration skipped:", err);
      }
    }
  }, []);

  // Check for expired session notification
  useEffect(() => {
    const checkExpiredNotice = async () => {
      if (searchParams.expired === "1" || searchParams.expired === "true") {
        setSessionExpiredMessage("⚠️ আপনার সেশন শেষ হয়ে গেছে, দয়া করে আবার লগইন করুন।");
        return;
      }
      try {
        const storedMsg = await AsyncStorage.getItem("@app:session_expired_message");
        if (storedMsg) {
          setSessionExpiredMessage(storedMsg);
          await AsyncStorage.removeItem("@app:session_expired_message");
        }
      } catch {}
    };
    checkExpiredNotice();
  }, [searchParams.expired]);

  // Lockout countdown timer (30s)
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // 60-second OTP resend timer
  useEffect(() => {
    if (!otpModalVisible) return;
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
  }, [otpModalVisible, otpEmail]);

  // Modal animation
  const showModalAnimation = () => {
    modalFadeAnim.setValue(0);
    modalSlideAnim.setValue(400);
    Animated.parallel([
      Animated.timing(modalFadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(modalSlideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  };

  const openEmailModal = () => {
    triggerHaptic("light");
    setEmailError(null);
    setPasswordError(null);
    setUserExists(null);
    setMagicLinkNotice(null);
    setEmailModalVisible(true);
    showModalAnimation();
  };

  // Check email safely without fake passwords
  const handleEmailCheck = async () => {
    triggerHaptic("light");
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      triggerHaptic("error");
      setEmailError("সঠিক ইমেইল অ্যাড্রেস লিখুন (যেমন: name@example.com)");
      return;
    }

    setEmailError(null);
    setPasswordError(null);
    setMagicLinkNotice(null);
    setCheckingUser(true);

    try {
      const exists = await authService.checkUserExists(cleanEmail);
      setUserExists(exists);

      if (!exists) {
        // New user! Initiate clean OTP signup
        setIsNewUserFlow(true);
        setOtpEmail(cleanEmail);
        try {
          await sendOtp(cleanEmail);
        } catch (otpErr: any) {
          console.warn("OTP send notice:", otpErr);
        }
        setEmailModalVisible(false);
        setOtpCode("");
        setOtpError(null);
        setTimeout(() => {
          setOtpModalVisible(true);
          showModalAnimation();
        }, 200);
      } else {
        // Existing user: Show password input + OTP login option
        setIsNewUserFlow(false);
        setOtpEmail(cleanEmail);
      }
    } catch (err) {
      console.error("Error during email check:", err);
      setUserExists(true);
      setOtpEmail(cleanEmail);
    } finally {
      setCheckingUser(false);
    }
  };

  // Sign in with password
  const handlePasswordSignIn = async () => {
    if (lockoutTimer > 0) return;
    triggerHaptic("light");

    if (!passwordInput) {
      triggerHaptic("error");
      setPasswordError("আপনার পাসওয়ার্ড লিখুন");
      return;
    }

    setPasswordError(null);
    setLoading(true);

    try {
      await signIn({ email: emailInput.trim().toLowerCase(), password: passwordInput });
      triggerHaptic("success");
      setEmailModalVisible(false);
      await handlePostLoginSuccess();
    } catch (err: any) {
      triggerHaptic("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("Sign in error:", errMsg);

      const isRateLimit =
        errMsg.toLowerCase().includes("rate") ||
        errMsg.toLowerCase().includes("too many") ||
        err?.status === 429;

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (isRateLimit || nextAttempts >= 5) {
        setLockoutTimer(30);
        setFailedAttempts(0);
        setPasswordError("অনেক চেষ্টা হয়েছে, ৩০ সেকেন্ড পরে চেষ্টা করুন");
      } else if (
        errMsg.toLowerCase().includes("invalid login credentials") ||
        errMsg.toLowerCase().includes("invalid grant")
      ) {
        setPasswordError("পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন অথবা OTP দিয়ে লগইন করুন।");
      } else if (errMsg.toLowerCase().includes("not found")) {
        setEmailError("এই ইমেইলে অ্যাকাউন্ট পাওয়া যায়নি, সাইন আপ করুন");
        setUserExists(false);
      } else {
        setPasswordError(errMsg || "লগইন ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  // Switch to OTP login flow
  const handleSwitchToOtpLogin = async () => {
    triggerHaptic("light");
    const cleanEmail = emailInput.trim().toLowerCase() || otpEmail;
    if (!cleanEmail) {
      setEmailError("দয়া করে ইমেইল অ্যাড্রেস লিখুন");
      return;
    }

    setLoading(true);
    setEmailError(null);
    setPasswordError(null);

    try {
      await sendOtp(cleanEmail);
      setOtpEmail(cleanEmail);
      setIsNewUserFlow(false);
      setEmailModalVisible(false);
      setOtpCode("");
      setOtpError(null);
      setTimeout(() => {
        setOtpModalVisible(true);
        showModalAnimation();
      }, 200);
    } catch (err: any) {
      setPasswordError(err?.message || "OTP কোড পাঠাতে সমস্যা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Send Magic Link (Passwordless One-Click Link)
  const handleSendMagicLink = async () => {
    triggerHaptic("light");
    const targetEmail = (emailInput || otpEmail).trim().toLowerCase();
    if (!targetEmail) {
      setEmailError("দয়া করে ইমেইল অ্যাড্রেস লিখুন");
      return;
    }

    setSendingMagicLink(true);
    setMagicLinkNotice(null);
    setEmailError(null);

    try {
      await authService.sendMagicLink(targetEmail);
      triggerHaptic("success");
      setMagicLinkNotice(
        `✉️ ${maskEmail(targetEmail)}-এ ম্যাজিক লিংক পাঠানো হয়েছে! লিংকে ক্লিক করলেই পাসওয়ার্ড ছাড়া লগইন হয়ে যাবে।`
      );
    } catch (err: any) {
      triggerHaptic("error");
      setEmailError(err?.message || "ম্যাজিক লিংক পাঠানো সম্ভব হয়নি। OTP দিয়ে চেষ্টা করুন।");
    } finally {
      setSendingMagicLink(false);
    }
  };

  // Verify OTP code
  const handleOtpVerify = async (codeToVerify?: string) => {
    const token = (codeToVerify || otpCode).trim();
    if (!token || token.length < 6) {
      triggerHaptic("error");
      setOtpError("দয়া করে সঠিক ভেরিফিকেশন কোড লিখুন");
      return;
    }

    setOtpError(null);
    setLoading(true);

    try {
      await verifyOtp(otpEmail, token, "email");
      triggerHaptic("success");

      if (isNewUserFlow) {
        setOtpModalVisible(false);
        setPasswordCreateModalVisible(true);
        showModalAnimation();
      } else {
        setOtpModalVisible(false);
        await handlePostLoginSuccess();
      }
    } catch (err: any) {
      triggerHaptic("error");
      console.warn("OTP verification error:", err);
      setOtpError("কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। পুনরায় কোড পাঠানোর চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    triggerHaptic("light");
    setCanResend(false);
    setResendTimer(60);
    setOtpError(null);

    try {
      await sendOtp(otpEmail);
    } catch (err: any) {
      triggerHaptic("error");
      setOtpError(err?.message || "কোড পুনরায় পাঠাতে সমস্যা হয়েছে।");
    }
  };

  // Return from OTP to Email step to fix typo
  const handleBackToEmailFromOtp = () => {
    triggerHaptic("light");
    setOtpModalVisible(false);
    setOtpCode("");
    setOtpError(null);
    openEmailModal();
  };

  // Complete password creation for new accounts
  const handleCreatePasswordSubmit = async () => {
    setCreatePasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      triggerHaptic("error");
      setCreatePasswordError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerHaptic("error");
      setCreatePasswordError("উভয় পাসওয়ার্ড একই হতে হবে");
      return;
    }

    setLoading(true);
    triggerHaptic("light");
    try {
      await updatePassword(newPassword);
      triggerHaptic("success");
      setPasswordCreateModalVisible(false);
      await handlePostLoginSuccess();
    } catch (err: any) {
      triggerHaptic("error");
      setCreatePasswordError(err?.message || "পাসওয়ার্ড সেট করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    triggerHaptic("light");
    setSocialError(null);
    setLoading(true);

    try {
      if (GoogleSignin) {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        if (userInfo.idToken) {
          await signInWithOAuth("google");
          triggerHaptic("success");
          await handlePostLoginSuccess();
          return;
        }
      }
      // Web / fallback browser flow
      await signInWithOAuth("google");
      router.push("/(auth)/callback");
    } catch (err: any) {
      console.warn("Google sign in notice:", err);
      setSocialError("Google সাইন-ইন সম্পন্ন করা সম্ভব হয়নি। ইমেইল দিয়ে চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Apple OAuth sign-in (Required for iOS App Store compliance)
  const handleAppleSignIn = async () => {
    triggerHaptic("light");
    setSocialError(null);
    setLoading(true);

    try {
      await signInWithOAuth("apple");
      router.push("/(auth)/callback");
    } catch (err: any) {
      console.warn("Apple sign in notice:", err);
      setSocialError("Apple সাইন-ইন সম্পন্ন করা সম্ভব হয়নি। ইমেইল দিয়ে চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-tap biometric login if already enabled on device
  const handleBiometricQuickLogin = async () => {
    triggerHaptic("light");
    setLoading(true);
    setSocialError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setSocialError("এই ডিভাইসে বায়োমেট্রিক সাপোর্ট পাওয়া যায়নি।");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `${BRAND.name.bn}-তে লগইন করতে আপনার আঙুল বা ফেস স্ক্যান করুন`,
        fallbackLabel: "ইমেইল দিয়ে লগইন করুন",
      });

      if (result.success) {
        triggerHaptic("success");
        const session = await authService.getSession();
        if (session?.user) {
          await handlePostLoginSuccess();
        } else {
          openEmailModal();
          setEmailError("সেশনের মেয়াদ শেষ। দয়া করে একবার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।");
        }
      }
    } catch (err: any) {
      setSocialError("বায়োমেট্রিক যাচাইকরণ ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  // Post-login workflow: Register device session + Biometric prompt + return-to navigation
  const handlePostLoginSuccess = async () => {
    // 1. Register active device session in backend/store
    try {
      const user = await authService.getCurrentUser();
      if (user?.id) {
        deviceSessionService.registerOrUpdateSession(user.id).catch(() => {});
      }
    } catch {}

    // 2. Check return destination
    const returnTo =
      searchParams.returnTo || (await AsyncStorage.getItem("@app:return_to_after_login"));

    if (returnTo) {
      await AsyncStorage.removeItem("@app:return_to_after_login");
    }

    // 3. Check if eligible for first-time Biometric enrollment prompt
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const alreadyPrompted = await AsyncStorage.getItem("@app:biometrics_prompted");

      if (hasHardware && isEnrolled && !alreadyPrompted && !security.biometricLockEnabled) {
        setBiometricPendingRedirect(returnTo || "/(tabs)");
        setBiometricPromptVisible(true);
        return;
      }
    } catch (e) {
      console.warn("Biometric check error:", e);
    }

    if (returnTo) {
      router.replace(returnTo as any);
    } else {
      router.replace("/(tabs)");
    }
  };

  // Enable biometrics from first-login prompt
  const handleEnableBiometrics = async () => {
    triggerHaptic("light");
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "বায়োমেট্রিক লগইন সক্রিয় করতে নিশ্চিত করুন",
        fallbackLabel: "বাতিল করুন",
      });

      if (authResult.success) {
        triggerHaptic("success");
        toggleBiometric(true);
      }
    } catch (err) {
      console.warn("Biometric setup error:", err);
    } finally {
      await AsyncStorage.setItem("@app:biometrics_prompted", "true");
      setBiometricPromptVisible(false);
      const dest = biometricPendingRedirect || "/(tabs)";
      router.replace(dest as any);
    }
  };

  // Skip biometrics from prompt
  const handleSkipBiometrics = async () => {
    triggerHaptic("light");
    await AsyncStorage.setItem("@app:biometrics_prompted", "true");
    setBiometricPromptVisible(false);
    const dest = biometricPendingRedirect || "/(tabs)";
    router.replace(dest as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={themeStyles.bg}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.brandTitle}>{BRAND.name.en}</Text>
          <Text style={[styles.brandSub, { color: themeStyles.textSecondary }]}>
            {BRAND.tagline.bn}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Expired Notice Banner (Item 8) */}
        {sessionExpiredMessage && (
          <View
            style={[
              styles.expiredBanner,
              {
                backgroundColor: themeStyles.bannerBg,
                borderColor: themeStyles.bannerBorder,
              },
            ]}
          >
            <Ionicons name="warning" size={20} color="#b45309" />
            <Text style={[styles.expiredBannerText, { color: themeStyles.bannerText }]}>
              {sessionExpiredMessage}
            </Text>
          </View>
        )}

        {/* Hero Illustration */}
        <View style={styles.heroSection}>
          <Image
            source={{
              uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYXXSGwkHAwAgx2VS2n6p36E09qxeRLWzKJMVoF7cJ1NqKbckZuHaEA0cL-GZ8VkOQCl5LK3RP1prOQPyH9YpTWWwSSUSCP8P8Pno6fvvjqe4nrDwifkbdxyPhMDR-Hlm-is9CBKMg5iLAfCqYAwUN4Rdehr_a70jrHuKQ99PKhUh6sqJcWPuRsWvri3zpj_ZfpSmASsoNoypxAYZPdGNhi2m8bLc38u5tuVPHPAEWsO5D2KSKVO5PgjHzPNbQlc4CRPZU1-1j3qE",
            }}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Title Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.mainTitle, { color: themeStyles.textPrimary }]}>
            লগইন করে বিশেষ অফার উপভোগ করুন
          </Text>
          <Text style={[styles.subTitle, { color: themeStyles.textSecondary }]}>
            সহজে হোটেল, ফ্লাইট ও ট্রেন বুকিং শুরু করুন
          </Text>
        </View>

        {/* Social Error inline */}
        {socialError && (
          <View style={styles.inlineErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.inlineErrorText}>{socialError}</Text>
          </View>
        )}

        {/* Auth Primary Actions */}
        <View style={styles.authOptions}>
          {/* Main Primary Button: Continue with Email */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={openEmailModal}
            disabled={loading}
          >
            <Ionicons name="mail" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>ইমেইল দিয়ে চালিয়ে যান</Text>
          </Pressable>

          {/* Secondary Button: Continue with Google */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: themeStyles.googleBtnBg,
                borderColor: themeStyles.googleBtnBorder,
              },
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#ea4335" />
            <Text style={[styles.googleButtonText, { color: themeStyles.googleBtnText }]}>
              Google দিয়ে চালিয়ে যান
            </Text>
          </Pressable>

          {/* iOS Compliance: Continue with Apple */}
          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [
                styles.appleButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={20} color="#ffffff" />
              <Text style={styles.appleButtonText}>Apple দিয়ে চালিয়ে যান</Text>
            </Pressable>
          )}

          {/* Quick Biometric Login if enabled on this device */}
          {security.biometricLockEnabled && (
            <Pressable
              style={({ pressed }) => [
                styles.biometricButton,
                {
                  backgroundColor: themeStyles.biometricBtnBg,
                  borderColor: themeStyles.biometricBtnBorder,
                },
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleBiometricQuickLogin}
              disabled={loading}
            >
              <Ionicons name="finger-print" size={22} color={TRIP_BLUE} />
              <Text style={styles.biometricButtonText}>বায়োমেট্রিক দিয়ে দ্রুত লগইন</Text>
            </Pressable>
          )}

          {/* Quick Access / Direct Dashboard Access without external OAuth dependency */}
          <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? "#334155" : "#e2e8f0", width: "100%" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: themeStyles.textSecondary, marginBottom: 12, textAlign: "center" }}>
              🛠️ সরাসরি ড্যাশবোর্ডে প্রবেশ করুন (Quick Access)
            </Text>

            {/* Direct Traveler Dashboard */}
            <Pressable
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                  paddingVertical: 14,
                  borderRadius: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isDark ? "#475569" : "#cbd5e1",
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={async () => {
                triggerHaptic("success");
                if (loginAsDemo) {
                  await loginAsDemo("user");
                }
                router.replace("/(tabs)");
              }}
            >
              <Ionicons name="compass" size={20} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#f8fafc" : "#0f172a" }}>
                মেইন ট্রাভেলার ড্যাশবোর্ড (Guest / Demo)
              </Text>
            </Pressable>

            {/* Direct Admin Portal */}
            <Pressable
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "#0284c7",
                },
                pressed && { opacity: 0.8 },
              ]}
              onPress={async () => {
                triggerHaptic("success");
                if (loginAsDemo) {
                  await loginAsDemo("admin");
                }
                router.replace("/admin");
              }}
            >
              <Ionicons name="shield-checkmark" size={18} color="#0284c7" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0284c7" }}>
                অ্যাডমিন ড্যাশবোর্ড (Admin Portal)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Referral Link Toggle */}
        <View style={styles.referralContainer}>
          <Pressable
            style={styles.referralHeader}
            onPress={() => {
              triggerHaptic("light");
              setShowReferralInput(!showReferralInput);
            }}
          >
            <Ionicons name="pricetag-outline" size={16} color={TRIP_BLUE} />
            <Text style={styles.referralLinkText}>
              রেফারাল কোড আছে? {showReferralInput ? "বন্ধ করুন" : "যোগ করুন"}
            </Text>
            <Ionicons
              name={showReferralInput ? "chevron-up" : "chevron-down"}
              size={16}
              color={TRIP_BLUE}
            />
          </Pressable>

          {showReferralInput && (
            <View style={styles.referralInputCard}>
              <TextInput
                style={[
                  styles.referralInput,
                  {
                    backgroundColor: themeStyles.inputBg,
                    borderColor: themeStyles.inputBorder,
                    color: themeStyles.textPrimary,
                  },
                ]}
                placeholder="রেফারাল কোড লিখুন (যেমন: TRIP2024)"
                placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                value={referralCode}
                onChangeText={(val) => {
                  setReferralCode(val);
                  setReferralMessage(null);
                }}
                autoCapitalize="characters"
              />
              <Pressable
                style={styles.referralApplyBtn}
                onPress={() => {
                  triggerHaptic("light");
                  if (referralCode.trim()) {
                    triggerHaptic("success");
                    setReferralMessage("রেফারাল কোড সফলভাবে যুক্ত হয়েছে!");
                  }
                }}
              >
                <Text style={styles.referralApplyText}>প্রয়োগ</Text>
              </Pressable>
            </View>
          )}
          {referralMessage && (
            <Text style={styles.referralSuccessText}>{referralMessage}</Text>
          )}
        </View>

        {/* Terms Footer */}
        <View style={styles.footer}>
          <Text style={[styles.legalText, { color: isDark ? "#64748b" : "#9ca3af" }]}>
            চালিয়ে যাওয়ার মাধ্যমে আপনি {BRAND.name.bn}-এর{" "}
            <Text style={styles.legalLink}>নিয়ম ও শর্তাবলী</Text> এবং{" "}
            <Text style={styles.legalLink}>গোপনীয়তা নীতি</Text> মেনে নিচ্ছেন।
          </Text>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* EMAIL / PASSWORD SHEET MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={emailModalVisible}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEmailModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardBg,
                  transform: [{ translateY: modalSlideAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: isDark ? "#334155" : "#e5e7eb" },
                ]}
              />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeStyles.textPrimary }]}>
                  {userExists === true ? "লগইন করুন" : "ইমেইল দিয়ে শুরু করুন"}
                </Text>
                <Pressable
                  onPress={() => setEmailModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#94a3b8" : "#374151"}
                  />
                </Pressable>
              </View>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Magic Link Banner Notice */}
                {magicLinkNotice && (
                  <View style={styles.magicLinkBox}>
                    <Ionicons name="mail-open" size={18} color="#15803d" />
                    <Text style={styles.magicLinkText}>{magicLinkNotice}</Text>
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: themeStyles.textPrimary }]}>
                    আপনার ইমেইল অ্যাড্রেস
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: themeStyles.inputBg,
                        borderColor: themeStyles.inputBorder,
                      },
                      emailError ? styles.inputWrapperError : null,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={isDark ? "#94a3b8" : "#6b7280"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, { color: themeStyles.textPrimary }]}
                      placeholder="name@example.com"
                      placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      value={emailInput}
                      onChangeText={(val) => {
                        setEmailInput(val);
                        if (emailError) setEmailError(null);
                        if (userExists !== null) setUserExists(null);
                      }}
                      editable={!checkingUser && !loading}
                      returnKeyType={userExists ? "next" : "go"}
                      onSubmitEditing={() => {
                        if (userExists === null) handleEmailCheck();
                      }}
                    />
                  </View>
                  {/* Inline Email Error */}
                  {emailError && (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text style={styles.fieldErrorText}>{emailError}</Text>
                    </View>
                  )}
                </View>

                {/* If email not yet verified/checked */}
                {userExists === null && (
                  <View style={{ gap: 10 }}>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        checkingUser && styles.buttonDisabled,
                      ]}
                      onPress={handleEmailCheck}
                      disabled={checkingUser}
                    >
                      <Text style={styles.primaryButtonText}>
                        {checkingUser ? "যাচাই করা হচ্ছে..." : "চালিয়ে যান"}
                      </Text>
                      {!checkingUser && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                    </Pressable>

                    {/* Magic Link Option */}
                    <Pressable
                      style={styles.magicLinkBtn}
                      onPress={handleSendMagicLink}
                      disabled={sendingMagicLink || checkingUser}
                    >
                      <Ionicons name="paper-plane-outline" size={16} color={TRIP_BLUE} />
                      <Text style={styles.magicLinkBtnText}>
                        {sendingMagicLink ? "লিংক পাঠানো হচ্ছে..." : "ম্যাজিক লিংক পাঠান (এক ক্লিকে লগইন)"}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* If User Exists: Password entry or OTP toggle */}
                {userExists === true && (
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.fieldLabel, { color: themeStyles.textPrimary }]}>
                        পাসওয়ার্ড
                      </Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          {
                            backgroundColor: themeStyles.inputBg,
                            borderColor: themeStyles.inputBorder,
                          },
                          passwordError ? styles.inputWrapperError : null,
                        ]}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={isDark ? "#94a3b8" : "#6b7280"}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[styles.textInput, { color: themeStyles.textPrimary }]}
                          placeholder="আপনার পাসওয়ার্ড লিখুন"
                          placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          value={passwordInput}
                          onChangeText={(val) => {
                            setPasswordInput(val);
                            if (passwordError) setPasswordError(null);
                          }}
                          editable={!loading && lockoutTimer === 0}
                          returnKeyType="done"
                          onSubmitEditing={handlePasswordSignIn}
                        />
                        <Pressable
                          onPress={() => {
                            triggerHaptic("light");
                            setShowPassword(!showPassword);
                          }}
                          style={styles.eyeBtn}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={isDark ? "#94a3b8" : "#6b7280"}
                          />
                        </Pressable>
                      </View>

                      {/* Inline Password Error */}
                      {passwordError && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={14} color="#dc2626" />
                          <Text style={styles.fieldErrorText}>{passwordError}</Text>
                        </View>
                      )}
                    </View>

                    {/* Rate Limit Lockout Banner */}
                    {lockoutTimer > 0 && (
                      <View style={styles.lockoutBox}>
                        <Ionicons name="time-outline" size={16} color="#b91c1c" />
                        <Text style={styles.lockoutText}>
                          অনেক চেষ্টা হয়েছে, {lockoutTimer} সেকেন্ড পরে চেষ্টা করুন
                        </Text>
                      </View>
                    )}

                    {/* Password Sign In Button */}
                    <Pressable
                      style={[
                        styles.primaryButton,
                        (loading || lockoutTimer > 0) && styles.buttonDisabled,
                      ]}
                      onPress={handlePasswordSignIn}
                      disabled={loading || lockoutTimer > 0}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loading ? "লগইন হচ্ছে..." : "সাইন ইন করুন"}
                      </Text>
                    </Pressable>

                    {/* Secondary Option: Or Sign in with OTP without password */}
                    <Pressable
                      style={styles.switchAuthMethodBtn}
                      onPress={handleSwitchToOtpLogin}
                      disabled={loading}
                    >
                      <Ionicons name="key-outline" size={18} color={TRIP_BLUE} />
                      <Text style={styles.switchAuthMethodText}>
                        পাসওয়ার্ড মনে নেই? OTP কোড দিয়ে লগইন করুন
                      </Text>
                    </Pressable>

                    {/* Passwordless Magic link option */}
                    <Pressable
                      style={styles.magicLinkBtn}
                      onPress={handleSendMagicLink}
                      disabled={sendingMagicLink || loading}
                    >
                      <Ionicons name="paper-plane-outline" size={16} color={TRIP_BLUE} />
                      <Text style={styles.magicLinkBtnText}>
                        {sendingMagicLink ? "পাঠানো হচ্ছে..." : "ইমেইলে সরাসরি লগইন লিংক পাঠান"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* ========================================================================= */}
      {/* OTP VERIFICATION SHEET MODAL                                              */}
      {/* ========================================================================= */}
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
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardBg,
                  transform: [{ translateY: modalSlideAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: isDark ? "#334155" : "#e5e7eb" },
                ]}
              />
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="shield-checkmark" size={22} color={TRIP_BLUE} />
                  <Text style={[styles.modalTitle, { color: themeStyles.textPrimary }]}>
                    ইমেইল ভেরিফিকেশন
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOtpModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#94a3b8" : "#374151"}
                  />
                </Pressable>
              </View>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Prominently show Masked Email */}
                <View
                  style={[
                    styles.otpNoticeCard,
                    { backgroundColor: isDark ? "#1e293b" : "#eff6ff" },
                  ]}
                >
                  <Text
                    style={[
                      styles.otpNoticeTitle,
                      { color: isDark ? "#93c5fd" : "#1e40af" },
                    ]}
                  >
                    কোড পাঠানো হয়েছে {maskEmail(otpEmail)}-এ
                  </Text>
                  {/* Wrong email? Change it link */}
                  <Pressable onPress={handleBackToEmailFromOtp} style={styles.changeEmailRow}>
                    <Ionicons name="create-outline" size={14} color={TRIP_BLUE} />
                    <Text style={styles.changeEmailText}>ভুল ইমেইল? পরিবর্তন করুন</Text>
                  </Pressable>
                </View>

                {/* OTP Input (supports 6 or 8 digits, SMS & clipboard autofill) */}
                <View style={{ marginVertical: 12 }}>
                  <OTPInput
                    length={otpLength}
                    value={otpCode}
                    onChangeText={(val) => {
                      setOtpCode(val);
                      if (otpError) setOtpError(null);
                      if (val.length === 8 && otpLength === 6) {
                        setOtpLength(8);
                      }
                      if (val.length === otpLength) {
                        setTimeout(() => handleOtpVerify(val), 100);
                      }
                    }}
                    autoFocus
                  />
                </View>

                {/* Inline OTP Error */}
                {otpError && (
                  <View style={styles.fieldErrorRowCentered}>
                    <Ionicons name="alert-circle" size={16} color="#dc2626" />
                    <Text style={styles.fieldErrorText}>{otpError}</Text>
                  </View>
                )}

                {/* 60s Resend Timer */}
                <View style={styles.timerRow}>
                  {canResend ? (
                    <Pressable
                      onPress={handleResendOtp}
                      style={styles.resendActiveBtn}
                      disabled={loading}
                    >
                      <Ionicons name="refresh" size={16} color={TRIP_BLUE} />
                      <Text style={styles.resendActiveText}>আবার কোড পাঠান</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.resendDisabledText, { color: themeStyles.textSecondary }]}>
                      আবার পাঠান ({resendTimer} সেকেন্ড)
                    </Text>
                  )}
                </View>

                {/* Verify Submit Button */}
                <Pressable
                  style={[
                    styles.primaryButton,
                    (loading || otpCode.length < 6) && styles.buttonDisabled,
                  ]}
                  onPress={() => handleOtpVerify()}
                  disabled={loading || otpCode.length < 6}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "যাচাই হচ্ছে..." : "যাচাই করুন ও এগিয়ে যান"}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* ========================================================================= */}
      {/* NEW USER PASSWORD CREATION MODAL                                          */}
      {/* ========================================================================= */}
      <Modal
        animationType="none"
        transparent={true}
        visible={passwordCreateModalVisible}
        onRequestClose={() => setPasswordCreateModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPasswordCreateModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: themeStyles.cardBg,
                  transform: [{ translateY: modalSlideAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: isDark ? "#334155" : "#e5e7eb" },
                ]}
              />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeStyles.textPrimary }]}>
                  নতুন পাসওয়ার্ড সেট করুন
                </Text>
                <Pressable
                  onPress={() => setPasswordCreateModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#94a3b8" : "#374151"}
                  />
                </Pressable>
              </View>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: themeStyles.textPrimary }]}>
                    নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: themeStyles.inputBg,
                        borderColor: themeStyles.inputBorder,
                      },
                      createPasswordError ? styles.inputWrapperError : null,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={isDark ? "#94a3b8" : "#6b7280"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, { color: themeStyles.textPrimary }]}
                      placeholder="পাসওয়ার্ড লিখুন"
                      placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        if (createPasswordError) setCreatePasswordError(null);
                      }}
                    />
                    <Pressable
                      onPress={() => {
                        triggerHaptic("light");
                        setShowNewPassword(!showNewPassword);
                      }}
                      style={styles.eyeBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={isDark ? "#94a3b8" : "#6b7280"}
                      />
                    </Pressable>
                  </View>
                  <PasswordStrengthMeter password={newPassword} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: themeStyles.textPrimary }]}>
                    পাসওয়ার্ড নিশ্চিত করুন
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: themeStyles.inputBg,
                        borderColor: themeStyles.inputBorder,
                      },
                      createPasswordError ? styles.inputWrapperError : null,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={isDark ? "#94a3b8" : "#6b7280"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, { color: themeStyles.textPrimary }]}
                      placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                      placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (createPasswordError) setCreatePasswordError(null);
                      }}
                    />
                  </View>
                  {createPasswordError && (
                    <View style={styles.fieldErrorRow}>
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text style={styles.fieldErrorText}>{createPasswordError}</Text>
                    </View>
                  )}
                </View>

                <Pressable
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleCreatePasswordSubmit}
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "সাইন আপ সম্পন্ন করুন"}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* ========================================================================= */}
      {/* BIOMETRIC ONBOARDING PROMPT                                               */}
      {/* ========================================================================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={biometricPromptVisible}
        onRequestClose={handleSkipBiometrics}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.biometricCard,
              { backgroundColor: themeStyles.cardBg },
            ]}
          >
            <View style={styles.biometricIconCircle}>
              <Ionicons name="finger-print" size={48} color={TRIP_BLUE} />
            </View>
            <Text style={[styles.biometricTitle, { color: themeStyles.textPrimary }]}>
              ফেস / আঙুলের ছাপ চালু করবেন?
            </Text>
            <Text style={[styles.biometricDesc, { color: themeStyles.textSecondary }]}>
              পরের বার দ্রুত ও নিরাপদে লগইন করতে বায়োমেট্রিক সুবিধা চালু রাখুন। এটি যেকোনো সময় সেটিংস থেকে বন্ধ করা যাবে।
            </Text>
            <View style={styles.biometricActionRow}>
              <Pressable
                style={[styles.biometricBtn, styles.biometricPrimaryBtn]}
                onPress={handleEnableBiometrics}
              >
                <Text style={styles.biometricPrimaryBtnText}>চালু করুন</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.biometricBtn,
                  styles.biometricSecondaryBtn,
                  { backgroundColor: isDark ? "#334155" : "#f3f4f6" },
                ]}
                onPress={handleSkipBiometrics}
              >
                <Text
                  style={[
                    styles.biometricSecondaryBtnText,
                    { color: isDark ? "#cbd5e1" : "#4b5563" },
                  ]}
                >
                  পরে করব
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TRIP_BLUE,
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: "500",
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  expiredBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  heroSection: {
    alignItems: "center",
    marginVertical: 12,
  },
  heroImage: {
    width: 260,
    height: 160,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    textAlign: "center",
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
    flex: 1,
    fontWeight: "500",
  },
  authOptions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TRIP_BLUE,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#262626",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  appleButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 10,
  },
  biometricButtonText: {
    color: TRIP_BLUE,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  referralContainer: {
    marginVertical: 12,
    alignItems: "center",
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  referralLinkText: {
    fontSize: 14,
    color: TRIP_BLUE,
    fontWeight: "600",
  },
  referralInputCard: {
    flexDirection: "row",
    width: "100%",
    marginTop: 8,
    gap: 8,
  },
  referralInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  referralApplyBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  referralApplyText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  referralSuccessText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 6,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 24,
    alignItems: "center",
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  legalLink: {
    color: TRIP_BLUE,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "88%",
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  inputIcon: {
    marginEnd: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  fieldErrorRowCentered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
    gap: 6,
  },
  fieldErrorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  lockoutBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  lockoutText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  switchAuthMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 10,
    gap: 6,
  },
  switchAuthMethodText: {
    color: TRIP_BLUE,
    fontSize: 14,
    fontWeight: "600",
  },
  magicLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 10,
    gap: 6,
  },
  magicLinkBtnText: {
    color: TRIP_BLUE,
    fontSize: 13,
    fontWeight: "600",
  },
  magicLinkBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  magicLinkText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  // OTP Card & Timers
  otpNoticeCard: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  otpNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  changeEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 2,
  },
  changeEmailText: {
    fontSize: 13,
    color: TRIP_BLUE,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  timerRow: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  resendActiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendActiveText: {
    color: TRIP_BLUE,
    fontSize: 14,
    fontWeight: "700",
  },
  resendDisabledText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Biometric Dialog Prompt
  biometricCard: {
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: "auto",
    marginTop: "auto",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 15px rgba(15, 23, 42, 0.25)" } : {}),
  },
  biometricIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  biometricDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  biometricActionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  biometricBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  biometricPrimaryBtn: {
    backgroundColor: TRIP_BLUE,
  },
  biometricPrimaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  biometricSecondaryBtn: {},
  biometricSecondaryBtnText: {
    fontWeight: "600",
    fontSize: 15,
  },
});
