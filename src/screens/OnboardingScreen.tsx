import { FocusAwareStatusBar } from "../components/ui/AppStatusBar";
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { BRAND } from "../constants/brand";

const { width } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBTfdo4CqPdaV2Gn3lAauQNk9meSVVUkJ-d_weunhuIEPYcduVl1uRgoH9roRhp4FsRf9Ff2RROeBaQCLp3Nvh9ju-jObXvDMXqEUXWLGMgXoNe9AXaENCphyOw0cWdKMirTXCSDwC9-MjAMwscElr5EY01ecIdu75xSd-qQa96lo4iIc1XRw_2MEnW-wz5lgNKrcACWm1C_f0ZHfi18_ZBI2gvDisq8aDpvm8V4b_X8GtlIHToosseHTVa-7-ehjrMRCeHl_uUk5Sc",
    badge: "১. খুঁজুন",
    title: "খুঁজুন - আপনার স্বপ্নের ট্রিপ",
    features: [
      {
        icon: "airplane-search",
        iconColor: "#00C896",
        subIcon: "clock-outline",
        subIconColor: "#FF9500",
        text: "ফ্লাইট, হোটেল ও ট্রেন খুঁজুন এক ক্লিকে"
      },
      {
        icon: "tag-outline",
        iconColor: "#FF9500",
        text: "প্রতিদিনের সেরা ডিল ও বিশেষ ছাড়"
      }
    ]
  },
  {
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=800",
    badge: "২. বুক করুন",
    title: "বুক করুন - সহজে ও নিরাপদে",
    features: [
      {
        icon: "credit-card-check-outline",
        iconColor: "#3662D8",
        text: "বিকাশ, নগদ ও কার্ডে দ্রুত পেমেন্ট"
      },
      {
        icon: "shield-check-outline",
        iconColor: "#00C896",
        text: "১০০% নিরাপদ ও নির্ভরযোগ্য বুকিং"
      }
    ]
  },
  {
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    badge: "৩. ট্র্যাক করুন",
    title: "ট্র্যাক করুন - যেকোনো সময়",
    features: [
      {
        icon: "map-marker-path",
        iconColor: "#FF9500",
        text: "লাইভ ট্রিপ স্ট্যাটাস ও আপডেট"
      },
      {
        icon: "headphones",
        iconColor: "#00C896",
        text: "২৪/৭ কাস্টমার সাপোর্ট সহায়তা"
      }
    ]
  }
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const data = ONBOARDING_DATA[step];
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { isDark, isOled } = useTheme();

  const themeBg = isOled ? "#000000" : isDark ? "#0f172a" : "#ffffff";
  const themeCardBg = isOled ? "#09090b" : isDark ? "#1e293b" : "#ffffff";
  const themeText = isDark ? "#f8fafc" : "#1A1A1A";
  const themeSub = isDark ? "#cbd5e1" : "#4A4A4A";

  const triggerHaptic = (type: "light" | "success") => {
    if (Platform.OS === "web") return;
    try {
      if (type === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  useEffect(() => {
    slideAnim.setValue(width * 0.1);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleFinish = async () => {
    triggerHaptic("success");
    try {
      await AsyncStorage.setItem("@app:has_seen_onboarding", "true");
    } catch (e) {
      console.warn("Error saving onboarding status:", e);
    }
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    triggerHaptic("light");
    if (step < ONBOARDING_DATA.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeBg }]}>
      <FocusAwareStatusBar style={isDark ? "light" : "dark"} />
      
      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={handleFinish}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>এড়িয়ে যান (Skip)</Text>
      </TouchableOpacity>

      {step > 0 && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            triggerHaptic("light");
            setStep(step - 1);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? "#ffffff" : "#1A1A1A"} />
        </TouchableOpacity>
      )}

      {/* Illustration Section */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
        <LinearGradient
          colors={isDark ? ["#1e3a8a", "#0f172a"] : ["#A1D9FF", "#E3F2FD"]}
          style={styles.illustrationSection}
        >
          <Image
            source={{ uri: data.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", themeCardBg]}
            style={styles.fadeBottom}
          />
        </LinearGradient>

        {/* Branding Content */}
        <View style={[styles.content, { backgroundColor: themeCardBg }]}>
          {/* Micro Pill Tag (Image 6 UX Pattern) */}
          <View style={[styles.pillTag, { backgroundColor: isDark ? "rgba(40, 125, 250, 0.2)" : "#E0F2FE" }]}>
            <Text style={[styles.pillTagText, { color: isDark ? "#60A5FA" : "#0284C7" }]}>
              EXPLORE • CAPTURE • TRACK
            </Text>
          </View>

          <View style={styles.branding}>
            <Text style={styles.brandName}>{BRAND.name.en}</Text>
            <Text style={[styles.brandTagline, { color: themeText }]}>{data.title}</Text>
          </View>

          {/* Features Row */}
          <View style={styles.featuresRow}>
            {data.features.map((feature, index) => (
              <React.Fragment key={feature.text || `feat-${index}`}>
                <View style={styles.featureItem}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name={feature.icon as any}
                      size={32}
                      color={feature.iconColor}
                    />
                    {feature.subIcon && (
                      <View style={styles.subIconBadge}>
                        <MaterialCommunityIcons
                          name={feature.subIcon as any}
                          size={14}
                          color={feature.subIconColor}
                        />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.featureText, { color: themeSub }]}>{feature.text}</Text>
                </View>
                {index === 0 && <View style={[styles.divider, { backgroundColor: isDark ? "#334155" : "#E5E7EB" }]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Rating Section */}
          <View style={styles.trustpilotRow}>
            <Text style={[styles.trustpilotTitle, { color: themeText }]}>Excellent</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={`star-${i}`} style={styles.starBox}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                </View>
              ))}
            </View>
            <View style={styles.trustpilotBrand}>
              <Ionicons name="star" size={16} color="#00B67A" style={{ marginEnd: 4 }} />
              <Text style={[styles.trustpilotText, { color: themeText }]}>Trustpilot</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Action Area */}
      <View style={[styles.footer, { backgroundColor: themeCardBg }]}>
        {/* Progress Indicator Dots */}
        <View style={styles.paginationDots}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={`step-dot-${index}`}
              style={[
                styles.dot,
                { backgroundColor: isDark ? "#334155" : "#E5E7EB" },
                step === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {step === ONBOARDING_DATA.length - 1 ? "শুরু করুন (Get Started)" : "পরবর্তী (Next)"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* System Nav Bar */}
      <View style={[styles.systemNav, { borderTopColor: isDark ? "#1e293b" : "#F3F4F6", backgroundColor: themeCardBg }]}>
        <View style={styles.backIndicator} />
        <View style={styles.homeIndicator} />
        <View style={styles.recentIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  illustrationSection: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%", top: 0, position: "absolute" },
  fadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 96 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
  },
  pillTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  pillTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  branding: { marginBottom: 8, alignItems: "center" },
  brandName: { color: "#3662D8", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  brandTagline: { fontSize: 22, fontWeight: "700", marginTop: 8, marginBottom: 32 },
  featuresRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 40 },
  featureItem: { flex: 1, alignItems: "center", paddingHorizontal: 16 },
  iconContainer: {
    width: 40,
    height: 40,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  subIconBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: 99 },
  featureText: { fontSize: 13, fontWeight: "500", textAlign: "center", lineHeight: 16 },
  divider: { height: 40, width: 1 },
  trustpilotRow: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  trustpilotTitle: { fontSize: 18, fontWeight: "700", marginEnd: 8 },
  starsContainer: { flexDirection: "row", gap: 2 },
  starBox: { backgroundColor: "#00B67A", padding: 2, borderRadius: 2 },
  trustpilotBrand: { flexDirection: "row", alignItems: "center", marginStart: 6 },
  trustpilotText: { fontSize: 14, fontWeight: "600" },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  nextButton: { backgroundColor: "#3662D8", width: "100%", paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nextButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  systemNav: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 16, borderTopWidth: 1 },
  backIndicator: { width: 14, height: 14, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: "#9CA3AF", transform: [{ rotate: "45deg" }] },
  homeIndicator: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#9CA3AF" },
  recentIndicator: { width: 14, height: 14, borderWidth: 2, borderColor: "#9CA3AF", borderRadius: 2 },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 8,
    borderRadius: 20,
  },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: '#3662D8', width: 20 },
});
