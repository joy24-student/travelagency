/**
 * OfflineBanner Component (Common)
 *
 * Prominently displayed at the top of the viewport when offline:
 * "আপনি অফলাইন · ক্যাশ করা ডাটা দেখাচ্ছেন" with pending offline queue count.
 * Automatically synchronizes queued mutations and re-fetches active screens when connection returns.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useOfflineQueue } from "../../hooks/useOfflineQueue";
import { FONTS } from "../../theme/typography";
import { createPlatformShadow } from "../../utils/platform";

export interface OfflineBannerProps {
  onRefresh?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRefresh }) => {
  const insets = useSafeAreaInsets();
  const { isOnline, isSlowConnection, refresh } = useNetworkStatus();
  const { pendingCount, syncNow, isSyncing } = useOfflineQueue();

  const isOffline = !isOnline;
  const slideAnim = useRef(new Animated.Value(isOffline ? 0 : -90)).current;
  const [wasOffline, setWasOffline] = useState(isOffline);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowRestored(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== "web",
        friction: 8,
        tension: 50,
      }).start();
    } else if (wasOffline) {
      // Transition from offline to online: show success banner and auto-refresh!
      setShowRestored(true);

      // Automatically sync offline mutation queue and trigger refresh
      syncNow().catch(() => {});
      onRefresh?.();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -90,
          duration: 350,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          setShowRestored(false);
          setWasOffline(false);
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, slideAnim, syncNow, onRefresh]);

  if (!isOffline && !showRestored) {
    return null;
  }

  const topPosition = Math.max(insets.top, Platform.OS === "android" ? 10 : 8);

  const shadow = createPlatformShadow({
    elevation: 8,
    color: "#000000",
    opacity: 0.22,
  });

  const toBn = (num: number) => num.toLocaleString("bn-BD");

  const handleManualRetry = async () => {
    await refresh();
    if (pendingCount > 0) {
      await syncNow();
    }
    onRefresh?.();
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: topPosition,
          transform: [{ translateY: slideAnim }],
        },
        shadow,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.innerPill,
          showRestored ? styles.restoredPill : styles.offlinePill,
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
        onPress={handleManualRetry}
        accessibilityRole="alert"
        accessibilityLabel={
          showRestored
            ? "ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে"
            : "আপনি অফলাইন · ক্যাশ করা ডাটা দেখাচ্ছেন"
        }
      >
        <Ionicons
          name={
            showRestored
              ? "checkmark-circle"
              : isSlowConnection
              ? "speedometer-outline"
              : "cloud-offline"
          }
          size={18}
          color="#ffffff"
          style={{ marginEnd: 8 }}
        />

        <View style={styles.textContainer}>
          <Text style={styles.bannerText}>
            {showRestored
              ? "ইন্টারনেট সংযোগ ফিরে এসেছে · ডাটা আপডেট হচ্ছে"
              : isSlowConnection
              ? "ধীরগতির ইন্টারনেট · ক্যাশ করা ডাটা দেখাচ্ছেন"
              : "আপনি অফলাইন · ক্যাশ করা ডাটা দেখাচ্ছেন"}
          </Text>

          {pendingCount > 0 && !showRestored && (
            <View style={styles.syncBadgeRow}>
              <Ionicons name="sync-outline" size={12} color="#FEF3C7" />
              <Text style={styles.syncCountText}>
                {toBn(pendingCount)}টি কাজ সিঙ্ক বাকি
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionWrap}>
          <Ionicons
            name="refresh-outline"
            size={14}
            color="#ffffff"
            style={isSyncing ? styles.rotating : undefined}
          />
          <Text style={styles.actionText}>
            {isSyncing ? "সিঙ্ক..." : "চেক"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 99999,
    alignItems: "center",
  },
  innerPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    maxWidth: 600,
    width: "100%",
  },
  offlinePill: {
    backgroundColor: "#1E293B", // Deep slate
    borderWidth: 1,
    borderColor: "#F59E0B", // Amber accent
  },
  restoredPill: {
    backgroundColor: "#059669", // Emerald-600
    borderWidth: 1,
    borderColor: "#34D399",
  },
  textContainer: {
    flex: 1,
    marginEnd: 8,
  },
  bannerText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontFamily: FONTS.bengali.bold,
    lineHeight: 17,
  },
  syncBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  syncCountText: {
    color: "#FEF3C7",
    fontSize: 11,
    fontFamily: FONTS.bengali.medium,
  },
  actionWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontFamily: FONTS.bengali.semiBold,
  },
  rotating: {
    transform: [{ rotate: "45deg" }],
  },
});
