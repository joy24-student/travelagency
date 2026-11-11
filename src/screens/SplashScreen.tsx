import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";

const { width } = Dimensions.get("window");
const SPLASH_SEEN_KEY = "@app:has_seen_splash_anim";

export interface SplashScreenProps {
  onFinish?: () => void;
  variant?: "standard" | "advanced";
  duration?: number;
  skipIfSeen?: boolean;
}

/**
 * Unified Canonical Splash Screen - Shopno Jatra (স্বপ্নযাত্রা)
 * Fully theme-aware (Light, Dark, OLED) with smooth 60fps animations.
 * Dismisses as soon as loading finishes, max ~800-1000ms.
 * Full animation only runs on the user's first launch.
 */
export default function SplashScreen({
  onFinish,
  variant = "standard",
  duration = 800,
  skipIfSeen = true,
}: SplashScreenProps) {
  const { colors, isDark } = useTheme();

  // Animations
  const birdScale = useRef(new Animated.Value(0)).current;
  const birdY = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Particle positions for advanced variant
  const [particles] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * (width * 0.7),
      y: (Math.random() - 0.5) * 160,
      size: Math.random() * 8 + 6,
    }))
  );

  useEffect(() => {
    let isCancelled = false;

    const runLifecycle = async () => {
      if (skipIfSeen) {
        try {
          const hasSeen = await AsyncStorage.getItem(SPLASH_SEEN_KEY);
          if (hasSeen && !isCancelled) {
            // Already seen: fast exit without delaying user
            Animated.timing(containerOpacity, {
              toValue: 0,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              if (!isCancelled) onFinish?.();
            });
            return;
          }
          // Mark as seen for subsequent launches
          await AsyncStorage.setItem(SPLASH_SEEN_KEY, "true").catch(() => {});
        } catch {
          // Proceed with normal short animation if storage check fails
        }
      }

      if (isCancelled) return;

      // Effective duration capped at 1000ms max
      const effectiveDuration = Math.min(duration, 1000);

      // 1. Icon Pop & Float
      Animated.parallel([
        Animated.spring(birdScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: effectiveDuration - 150,
          useNativeDriver: false,
        }),
      ]).start();

      // Floating loop
      const floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(birdY, {
            toValue: -8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(birdY, {
            toValue: 8,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      floatLoop.start();

      // 2. Title Fade & Scale (early trigger at 100ms)
      const titleTimer = setTimeout(() => {
        if (isCancelled) return;
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(titleScale, {
            toValue: 1,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);

      // 3. Subtitle Fade (at 250ms)
      const subtitleTimer = setTimeout(() => {
        if (isCancelled) return;
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 250);

      // 4. Finish within effective duration
      const finishTimer = setTimeout(() => {
        if (isCancelled) return;
        floatLoop.stop();
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          if (!isCancelled) onFinish?.();
        });
      }, effectiveDuration);

      return () => {
        floatLoop.stop();
        clearTimeout(titleTimer);
        clearTimeout(subtitleTimer);
        clearTimeout(finishTimer);
      };
    };

    let cleanupFn: (() => void) | undefined;
    runLifecycle().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      isCancelled = true;
      cleanupFn?.();
    };
  }, [duration, onFinish, skipIfSeen]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[
        styles.rootWrapper,
        { opacity: containerOpacity, backgroundColor: colors.background },
      ]}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.content}>
          {/* Ambient Floating Particles for Advanced Variant */}
          {variant === "advanced" &&
            particles.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.particle,
                  {
                    left: width / 2 + p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: isDark ? colors.accent : colors.primaryLight,
                    opacity: isDark ? 0.25 : 0.45,
                  },
                ]}
              />
            ))}

          {/* Animated Brand Emblem */}
          <Animated.View
            style={[
              styles.birdContainer,
              {
                transform: [{ scale: birdScale }, { translateY: birdY }],
              },
            ]}
          >
            <View
              style={[
                styles.emblemCircle,
                {
                  backgroundColor: isDark ? colors.card : colors.primaryLight,
                  borderColor: isDark ? colors.border : colors.primary,
                },
              ]}
            >
              <Ionicons
                name="airplane"
                size={52}
                color={colors.primary}
              />
            </View>
          </Animated.View>

          {/* Title with Proper Bengali Typography */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleOpacity,
                transform: [{ scale: titleScale }],
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: FONTS.bengali.bold },
              ]}
            >
              স্বপ্ন <Text style={{ color: colors.primary }}>যাত্রা</Text>
            </Text>
            <Text
              style={[
                styles.englishTitle,
                { color: colors.textSecondary },
              ]}
            >
              Shopno Jatra
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View
            style={[
              styles.subtitleContainer,
              { opacity: subtitleOpacity },
            ]}
          >
            <Text
              style={[
                styles.subtitle,
                { color: colors.textMuted, fontFamily: FONTS.bengali.regular },
              ]}
            >
              আপনার স্বপ্নের ভ্রমণ সঙ্গী
            </Text>
            <View
              style={[
                styles.underline,
                { backgroundColor: colors.accent },
              ]}
            />
          </Animated.View>
        </View>

        {/* Progress Bar Track */}
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: isDark ? colors.border : colors.surface },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
  },
  birdContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emblemCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  englishTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  subtitleContainer: {
    alignItems: "center",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  underline: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  progressTrack: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
