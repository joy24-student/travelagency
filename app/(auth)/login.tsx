import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { 
  Alert, 
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
  NativeSyntheticEvent, 
  TextInputKeyPressEventData, 
  PanResponder, 
  Animated 
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../src/utils/supabase"; // Keeping the supabase import
import { useAuth } from "../../src/hooks/useAuth"; // Using the auth hook instead of direct service
import { loginSchema, LoginFormValues } from "../../src/auth/schemas";

// Safe import for Google Sign-in to prevent crash in Expo Go
let GoogleSignin: any;
try {
  const GoogleSigninModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = GoogleSigninModule.GoogleSignin;
} catch (e) {
  // Silent catch, handled in component
}

WebBrowser.maybeCompleteAuthSession();

const TRIP_BLUE = "#3166ee";

export default function LoginScreen() {
  const { signIn, signInWithOAuth, sendOtp, verifyOtp, updatePassword } = useAuth(); // Using auth context
  const [loading, setLoading] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false);
  const [passwordCreateModalVisible, setPasswordCreateModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
      });
    }
  }, []);

  // Modal Pan/Drag logic
  const pan = useRef(new Animated.ValueXY()).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;
  const emailIconPulseAnim = useRef(new Animated.Value(1)).current;
  const referralIconPulseAnim = useRef(new Animated.Value(1)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  const resendRotateAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(500)).current;

  const createPanResponder = (closeHandler: () => void) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) {
          Animated.timing(pan.y, {
            toValue: 1000,
            duration: 300,
            useNativeDriver: true,
          }).start(closeHandler);
        } else {
          Animated.spring(pan.y, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    });

  const emailPan = useRef(createPanResponder(() => setEmailModalVisible(false))).current;
  const otpPan = useRef(createPanResponder(() => setOtpModalVisible(false))).current;
  const couponPan = useRef(createPanResponder(() => setCouponModalVisible(false))).current;
  const passwordCreatePan = useRef(createPanResponder(() => setPasswordCreateModalVisible(false))).current;

  useEffect(() => { 
    pan.setValue({ x: 0, y: 0 }); 
  }, [emailModalVisible, otpModalVisible, couponModalVisible, passwordCreateModalVisible]);

  useEffect(() => {
    if (!emailModalVisible) {
      setUserExists(null);
      setCheckingUser(false);
    }
  }, [emailModalVisible]);

  const otpRefs = useRef<TextInput[]>([]);

  // Unified animation trigger for all modals
  useEffect(() => {
    const isVisible = emailModalVisible || otpModalVisible || couponModalVisible || passwordCreateModalVisible;
    if (isVisible) {
      pan.setValue({ x: 0, y: 0 }); // Reset manual drag position
      Animated.parallel([
        Animated.timing(modalFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(modalSlideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      modalSlideAnim.setValue(500);
      modalFadeAnim.setValue(0);
    }
  }, [emailModalVisible, otpModalVisible, couponModalVisible, passwordCreateModalVisible]);

useEffect(() => {
    if (otpModalVisible) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(iconPulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      );
      anim.start();

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
      return () => {
        clearInterval(interval);
        anim.stop();
      };
    }
  }, [otpModalVisible]);

  useEffect(() => {
    if (emailModalVisible) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(emailIconPulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(emailIconPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [emailModalVisible]);

  useEffect(() => {
    if (couponModalVisible) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(referralIconPulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(referralIconPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [couponModalVisible]);

  const animateSuccess = () => {
    successScaleAnim.setValue(0);
    Animated.spring(successScaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleResend = () => {
    if (!canResend) return;
    setResendTimer(30);
    setCanResend(false);
    setOtpValue(['', '', '', '', '', '']);
    Animated.timing(resendRotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => resendRotateAnim.setValue(0));
  };

  const handleOtpChange = (val: string, index: number) => {
    const nextOtp = [...otpValue];
    nextOtp[index] = val;
    setOtpValue(nextOtp);
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleApplyReferral = () => {
    if (!referralCode.trim()) {
      setReferralError("Please enter a referral code.");
      return;
    }
    // Simulated validation logic
    setReferralError(null);
    setReferralSuccess(true);
    animateSuccess();
    
    setTimeout(() => {
      setCouponModalVisible(false);
      // Reset for next time
      setTimeout(() => {
        setReferralSuccess(false);
        setReferralCode("");
      }, 500);
    }, 1500);
  };

  const [otpEmail, setOtpEmail] = useState("");

  const handleOtpVerify = async () => {
    const token = otpValue.join("");
    if (token.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }
    try {
      await verifyOtp(otpEmail || "", token, "email"); // Using auth context
      setOtpSuccess(true);
      animateSuccess();
      setTimeout(() => {
        if (isNewUserFlow) {
          setOtpModalVisible(false);
          setOtpSuccess(false);
          setPasswordCreateModalVisible(true);
        } else {
          router.replace("/(tabs)" as any);
          setOtpModalVisible(false);
          setOtpSuccess(false);
        }
      }, 1500);
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "Invalid code.");
    }
  };

  // Check if user exists when email is entered
  const handleEmailCheck = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setCheckingUser(true);
    try {
      // Try to sign in with a fake password to determine if user exists
      // This is the fallback approach from the authService.checkUserExists method
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: '__check__' + Math.random().toString(36),
      });

      let exists = false;
      if (signInError) {
        // Check error message to determine if user exists
        const msg = signInError.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('password') || msg.includes('credentials')) {
          exists = true; // User exists, wrong password
        }
        // If the error is about unconfirmed email or other non-credential issues, 
        // we still consider the user as existing
      } else {
        // If no error, then somehow the fake password worked (highly unlikely)
        exists = true;
      }
      
      setUserExists(exists);

      if (!exists) {
        setOtpEmail(email);
        setIsNewUserFlow(true);
        // Using the auth context's sendOtp method
        await sendOtp(email); // Using auth context
        setEmailModalVisible(false);
        // Wait a small bit for modal transition
        setTimeout(() => {
          setOtpModalVisible(true);
        }, 300);
      } else {
        setIsNewUserFlow(false);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      Alert.alert("Error", "Could not verify email. Please try again.");
    } finally {
      setCheckingUser(false);
    }
  };

  const { control, handleSubmit, getValues } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setLoading(true);
    try {
      await signIn({ email, password }); // Using auth context
      router.replace("/(tabs)" as any);
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  });

  const onSocialSignIn = async (provider: "google" | "facebook") => {
    setLoading(true);
    try {
      if (provider === 'google') {
        if (!GoogleSignin) {
          Alert.alert("Error", "Google Sign-in is not available in this environment. Please use a development build.");
          return;
        }
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        if (userInfo.idToken) {
          // Use the auth context method for Google sign-in
          await signInWithOAuth(provider); // Using auth context
          router.replace("/(tabs)" as any);
          return;
        } else {
          throw new Error("No ID token present from Google");
        }
      }

      // Use the auth context method for social sign-in
      await signInWithOAuth(provider); // Using auth context
      router.push("/(auth)/callback");
    } catch (error) {
      Alert.alert("Login failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    // Clear previous errors
    setPasswordError("");
    
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword); // Using auth context
      Alert.alert("Success", "Account created successfully!");
      setPasswordCreateModalVisible(false);
      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
      router.replace("/(tabs)" as any);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Trip.com</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        {/* Hero Illustration */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBYXXSGwkHAwAgx2VS2n6p36E09qxeRLWzKJMVoF7cJ1NqKbckZuHaEA0cL-GZ8VkOQCl5LK3RP1prOQPyH9YpTWWwSSUSCP8P8Pno6fvvjqe4nrDwifkbdxyPhMDR-Hlm-is9CBKMg5iLAfCqYAwUN4Rdehr_a70jrHuKQ99PKhUh6sqJcWPuRsWvri3zpj_ZfpSmASsoNoypxAYZPdGNhi2m8bLc38u5tuVPHPAEWsO5D2KSKVO5PgjHzPNbQlc4CRPZU1-1j3qE" }}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Title Content */}
        <View style={styles.textContainer}>
          <View style={styles.topIconWrapper}>
            <View style={styles.topIconCircle}>
              <Svg width={16} height={16} viewBox="0 0 20 20" fill="#fff">
                <Path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.3 1.047a1 1 0 01.897.95l.003.053v1.547l.004.053a1 1 0 01-.897.95l-.003.053H9.7l-.003-.053a1 1 0 01-.897-.95l-.004-.053V2.05a1 1 0 011.003-1.003h1.5zm3.037 2.155l.044.032 1.094 1.094.044.032a1 1 0 010 1.414l-.044.032-1.094 1.094-.044.032a1 1 0 01-1.414 0l-.044-.032-1.094-1.094-.044-.032a1 1 0 010-1.414l.044-.032 1.094-1.094.044-.032a1 1 0 011.414 0zM5.663 3.202l.044.032 1.094 1.094.044.032a1 1 0 01-1.414 1.414l-.044-.032-1.094-1.094-.044-.032a1 1 0 011.414-1.414zM10 7a3 3 0 100 6 3 3 0 000-6z"
                />
              </Svg>
            </View>
          </View>
          <Text style={styles.mainTitle}>Sign in for member rewards</Text>
          <View style={styles.benefitRow}>
            <View style={[styles.topIconCircle, { padding: 2, marginRight: 6, borderRadius: 3 }]}>
              <Svg width={12} height={12} viewBox="0 0 20 20" fill="#fff">
                <Path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.3 1.047a1 1 0 01.897.95l.003.053v1.547l.004.053a1 1 0 01-.897.95l-.003.053H9.7l-.003-.053a1 1 0 01-.897-.95l-.004-.053V2.05a1 1 0 011.003-1.003h1.5zm3.037 2.155l.044.032 1.094 1.094.044.032a1 1 0 010 1.414l-.044.032-1.094 1.094-.044.032a1 1 0 01-1.414 0l-.044-.032-1.094-1.094-.044-.032a1 1 0 010-1.414l.044-.032 1.094-1.094.044-.032a1 1 0 011.414 0zM5.663 3.202l.044.032 1.094 1.094.044.032a1 1 0 01-1.414 1.414l-.044-.032-1.094-1.094-.044-.032a1 1 0 011.414-1.414zM10 7a3 3 0 100 6 3 3 0 000-6z"
                />
              </Svg>
            </View>
            <Text style={styles.benefitText}>Get Member Benefits</Text>
          </View>
        </View>

        {/* Auth Options */}
        <View style={styles.authOptions}>
          <View style={styles.buttonList}>
            <Pressable 
              style={[styles.actionButton, styles.googleButton]} 
              onPress={() => onSocialSignIn('google')}
            >
              <Ionicons name="logo-google" size={22} color="#000" style={styles.buttonIcon} />
              <Text style={[styles.actionButtonText, styles.googleButtonText]}>Continue with Google</Text>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={() => {
              setUserExists(null);
              setCheckingUser(false);
              setEmailModalVisible(true);
            }}>
              <Ionicons name="mail-outline" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Continue with email</Text>
            </Pressable>

            <Pressable 
              style={[styles.actionButton, styles.facebookButton]} 
              onPress={() => onSocialSignIn('facebook')}
            >
              <Ionicons name="logo-facebook" size={22} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Continue with Facebook</Text>
            </Pressable>
          </View>
        </View>

        {/* Referral Link */}
        <Pressable style={styles.referralLink} onPress={() => setCouponModalVisible(true)}>
          <Text style={styles.referralText}>I have a referral code for registration</Text>
          <Ionicons name="chevron-forward" size={16} color={TRIP_BLUE} />
        </Pressable>

        {/* Legal Footer */}
        <View style={styles.footer}>
          <Text style={styles.legalText}>
            By proceeding, I acknowledge that I have read and agree to Trip.com's{" "}
            <Text style={styles.legalLink}>Terms & Conditions</Text> and{" "}
            <Text style={styles.legalLink}>Privacy Statement</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Email Login Modal */}
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
              style={[styles.modalContent, { transform: [{ translateY: Animated.add(modalSlideAnim, pan.y) }] }]}
            >
              <View style={styles.modalHandle} {...emailPan.panHandlers} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sign In</Text>
                <Pressable onPress={() => setEmailModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#111" />
                </Pressable>
              </View>
              <ScrollView style={styles.modalScrollView} bounces={false}>
                <View style={styles.modalIllustrationContainer}>
                  <Animated.View style={{ transform: [{ scale: emailIconPulseAnim }] }}>
                    <View style={styles.modalIconCircle}>
                      <MaterialCommunityIcons name="email-lock" size={42} color={TRIP_BLUE} />
                    </View>
                  </Animated.View>
                </View>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.label}>Email</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.leftIconContainer}>
                          <MaterialCommunityIcons name="email-outline" size={20} color="#9ca3af" />
                        </View>
                        <TextInput
                          style={[styles.modalInput, error && styles.modalInputError, { paddingLeft: 44 }]}
                          placeholder="Enter your email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor="#9ca3af"
                          value={value}
                          onChangeText={onChange}
                          onBlur={() => {
                            onBlur(); // Call react-hook-form's onBlur
                            handleEmailCheck(value); // Pass the current value
                          }}
                        />
                      </View>
                      {error?.message && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </View>
                  )}
                />

                {userExists === null && (
                  <Pressable 
                    style={[styles.actionButton, checkingUser && styles.buttonDisabled]}
                    onPress={() => handleEmailCheck(getValues('email'))}
                    disabled={checkingUser}
                  >
                    <Text style={styles.actionButtonText}>
                      {checkingUser ? "Checking..." : "Continue"}
                    </Text>
                    {!checkingUser && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                  </Pressable>
                )}

                {userExists !== null && (
                  <>
                    {userExists ? (
                      <>
                        <Controller
                          control={control}
                          name="password"
                          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                            <View style={{ marginBottom: 16 }}>
                              <Text style={styles.label}>Password</Text>
                              <View style={styles.inputWrapper}>
                                <View style={styles.leftIconContainer}>
                                  <MaterialCommunityIcons name="lock-outline" size={20} color="#9ca3af" />
                                </View>
                                <TextInput
                                  style={[styles.modalInput, error && styles.modalInputError, { paddingLeft: 44, paddingRight: 44 }]}
                                  placeholder="Enter your password"
                                  secureTextEntry={!showPassword}
                                  autoCapitalize="none"
                                  placeholderTextColor="#9ca3af"
                                  value={value}
                                  onChangeText={onChange}
                                  onBlur={onBlur}
                                />
                                <Pressable
                                  onPress={() => setShowPassword(!showPassword)}
                                  hitSlop={8}
                                  style={styles.rightIconContainer}
                                >
                                  <Ionicons
                                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#9ca3af"
                                  />
                                </Pressable>
                              </View>
                              {error?.message && (
                                <Text style={styles.errorText}>{error.message}</Text>
                              )}
                            </View>
                          )}
                        />
                        <Pressable 
                          onPress={() => {
                            setEmailModalVisible(false);
                            router.push("/(auth)/forgot-password");
                          }} 
                          style={styles.forgotPasswordBtn}
                        >
                          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </Pressable>
                        <Pressable 
                          style={[styles.actionButton, loading && styles.buttonDisabled]} 
                          onPress={onSubmit}
                          disabled={loading}
                        >
                          <Text style={styles.actionButtonText}>
                            {loading ? "Signing in..." : "Sign In"}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <View style={styles.newUserMessage}>
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text style={styles.newUserText}>Verification code sent!</Text>
                        <Text style={styles.newUserSubtext}>Check your email to verify and create your account.</Text>
                      </View>
                    )}
                  </>
                )}

                {userExists === null && checkingUser && (
                  <View style={styles.checkingMessage}>
                    <Text style={styles.checkingText}>Checking email...</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOtpModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
            <Animated.View
              style={[styles.modalContent, { transform: [{ translateY: Animated.add(modalSlideAnim, pan.y) }] }]}
            >
              <View style={styles.modalHandle} {...otpPan.panHandlers} />
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleRow}>
                  <Animated.View style={{ transform: [{ scale: iconPulseAnim }] }}>
                    <Ionicons name="shield-checkmark" size={20} color={TRIP_BLUE} style={{ marginRight: 8 }} />
                  </Animated.View>
                  <Text style={styles.modalTitle}>Verify Email</Text>
                </View>
                <Pressable onPress={() => setOtpModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#111" />
                </Pressable>
              </View>
              <View style={styles.modalBodyContent}>
                {otpSuccess ? (
                  <View style={styles.successContainer}>
                    <Animated.View style={{ transform: [{ scale: successScaleAnim }] }}>
                      <View style={[styles.modalIconCircle, styles.successCircle]}>
                        <Ionicons name="checkmark-sharp" size={48} color="#22c55e" />
                      </View>
                    </Animated.View>
                    <Text style={styles.successText}>Verification Successful!</Text>
                  </View>
                ) : (
                  <>
                <View style={styles.modalIllustrationContainer}>
                  <Animated.View style={{ transform: [{ scale: iconPulseAnim }] }}>
                    <View style={[styles.modalIconCircle, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                      <MaterialCommunityIcons name="shield-check" size={42} color="#22c55e" />
                    </View>
                  </Animated.View>
                </View>
                <Text style={styles.modalDescription}>Enter the 6-digit code sent to your email address to continue.</Text>
                <View style={styles.otpInputContainer}>
                  {otpValue.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el!; }}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, i)}
                      onKeyPress={(e) => handleOtpKeyPress(e, i)}
                      autoFocus={i === 0}
                    />
                  ))}
                </View>
                
                <View style={styles.timerRow}>
                  {canResend ? (
                    <Pressable onPress={handleResend} style={styles.resendBtn}>
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

                <Pressable 
                  style={styles.actionButton} 
                  onPress={handleOtpVerify}
                >
                  <Text style={styles.actionButtonText}>Verify & Continue</Text>
                </Pressable>
                  </>
                )}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Coupon / Referral Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={couponModalVisible}
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]} onStartShouldSetResponder={() => true}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCouponModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: Animated.add(modalSlideAnim, pan.y) }] }]}>
              <View style={styles.modalHandle} {...couponPan.panHandlers} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Referral Code</Text>
                <Pressable onPress={() => setCouponModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#111" />
                </Pressable>
              </View>
              <View style={styles.modalBodyContent}>
                {referralSuccess ? (
                  <View style={styles.successContainer}>
                    <Animated.View style={{ transform: [{ scale: successScaleAnim }] }}>
                      <View style={[styles.modalIconCircle, styles.successCircle]}>
                        <Ionicons name="checkmark-sharp" size={48} color="#22c55e" />
                      </View>
                    </Animated.View>
                    <Text style={styles.successText}>Code Applied Successfully!</Text>
                  </View>
                ) : (
                  <>
                <View style={styles.modalIllustrationContainer}>
                  <Animated.View style={{ transform: [{ scale: referralIconPulseAnim }] }}>
                    <View style={[styles.modalIconCircle, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
                      <MaterialCommunityIcons name="ticket-percent" size={42} color="#f97316" />
                    </View>
                  </Animated.View>
                </View>
                <Text style={styles.modalDescription}>Enter your referral code below to unlock exclusive member rewards.</Text>
                <TextInput
                  style={[styles.modalInput, referralError && styles.modalInputError]}
                  placeholder="e.g. TRIP2024"
                  value={referralCode}
                  onChangeText={(text) => {
                    setReferralCode(text);
                    if (referralError) setReferralError(null);
                  }}
                  autoCapitalize="characters"
                />
                {referralError && <Text style={styles.errorText}>{referralError}</Text>}
                <Pressable style={styles.actionButton} onPress={handleApplyReferral}>
                  <Text style={styles.actionButtonText}>Apply Code</Text>
                </Pressable>
                  </>)}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Password Creation Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={passwordCreateModalVisible}
        onRequestClose={() => setPasswordCreateModalVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPasswordCreateModalVisible(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[styles.modalContent, { transform: [{ translateY: Animated.add(modalSlideAnim, pan.y) }] }]}
            >
              <View style={styles.modalHandle} {...passwordCreatePan.panHandlers} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Your Password</Text>
                <Pressable onPress={() => setPasswordCreateModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color="#111" />
                </Pressable>
              </View>
              <ScrollView style={styles.modalScrollView} bounces={false}>
                <View style={styles.modalIllustrationContainer}>
                  <View style={[styles.modalIconCircle, { backgroundColor: '#fdf2f8', borderColor: '#fce7f3' }]}>
                    <MaterialCommunityIcons name="lock-plus" size={42} color="#db2777" />
                  </View>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.leftIconContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      style={[styles.modalInput, { paddingLeft: 44, paddingRight: 44 }]}
                      placeholder="At least 6 characters"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (passwordError) setPasswordError("");
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={8}
                      style={styles.rightIconContainer}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color="#9ca3af"
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.leftIconContainer}>
                      <MaterialCommunityIcons name="lock-check-outline" size={20} color="#9ca3af" />
                    </View>
                    <TextInput
                      style={[styles.modalInput, { paddingLeft: 44 }]}
                      placeholder="Repeat your password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (passwordError) setPasswordError("");
                      }}
                    />
                  </View>
                </View>
                
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}

                <Pressable
                  style={[styles.actionButton, loading && styles.buttonDisabled]}
                  onPress={handleCreatePassword}
                  disabled={loading}
                >
                  <Text style={styles.actionButtonText}>
                    {loading ? "Creating Account..." : "Complete Sign Up"}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
      
      {/* Home Indicator Spacer */}
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: TRIP_BLUE,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 0,
    marginBottom: 30,
  },
  heroImage: {
    width: 300,
    height: 200,
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
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: "#6b7280",
  },
  authOptions: {
    marginBottom: 30,
  },
  buttonList: {
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TRIP_BLUE,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 12,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  googleButtonText: {
    color: "#1f2937",
    fontWeight: "500",
  },
  facebookButton: {
    backgroundColor: "#1877f2",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonIcon: {
    marginLeft: 12,
  },
  referralLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  referralText: {
    fontSize: 14,
    color: TRIP_BLUE,
  },
  footer: {
    marginTop: "auto",
    paddingVertical: 20,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },
  underline: {
    textDecorationLine: "underline",
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
  closeButton: {
    padding: 8,
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
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  checkboxText: {
    color: TRIP_BLUE,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: TRIP_BLUE,
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  otpModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: "#6b7280",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resendButtonText: {
    color: TRIP_BLUE,
    fontWeight: "500",
  },
  successCheckmark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [
      { translateX: -12 },
      { translateY: -12 },
    ],
  },
  // Add all missing styles
  legalLink: {
    textDecorationLine: "underline",
    color: TRIP_BLUE,
  },
  modalContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalScrollView: {
    flexGrow: 1, // Allows the ScrollView to expand and enable scrolling
  },
  modalIllustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: TRIP_BLUE,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#166534',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: [{ translateX: -25 }],
    width: 50,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  modalInputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: -8,
    marginBottom: 12,
  },
  modalBodyContent: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  newUserMessage: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  newUserText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
  },
  newUserSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  checkingMessage: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  topIconWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  topIconCircle: {
    backgroundColor: '#ff9d00',
    padding: 2,
    borderRadius: 4,
  },
});