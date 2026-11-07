/**
 * OfflineBanner Component
 *
 * Displays persistent top notification when offline:
 * "আপনি অফলাইন · ক্যাশ করা ডাটা দেখাচ্ছেন" along with pending sync count.
 * When connectivity is restored, shows a green reconnected status and triggers auto-refresh.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import { FONTS } from "../theme/typography";

export interface OfflineBannerProps {
  onRefresh?: () => void;
  className?: string;
}

export function OfflineBanner({ onRefresh }: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const { isOnline, isSlowConnection, refresh } = useNetworkStatus();
  const { pendingCount, syncNow, isSyncing } = useOfflineQueue();

  const [visible, setVisible] = useState(!isOnline);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasOfflineRef = useRef(!isOnline);

  const translateY = useRef(new Animated.Value(!isOnline ? 0 : -80)).current;

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setJustReconnected(false);
      setVisible(true);

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: Platform.OS !== "web",
        friction: 8,
        tension: 50,
      }).start();
    } else {
      // Transition from offline to online
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setJustReconnected(true);
        setVisible(true);

        // Auto sync pending actions
        syncNow().catch(() => {});
        onRefresh?.();

        // Slide out after 3.5 seconds
        const timer = setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -80,
            duration: 350,
            useNativeDriver: Platform.OS !== "web",
          }).start(() => {
            setVisible(false);
            setJustReconnected(false);
          });
        }, 3500);

        return () => clearTimeout(timer);
      } else {
        setVisible(false);
      }
    }
  }, [isOnline, translateY, syncNow, onRefresh]);

  const handleManualRefresh = async () => {
    await refresh();
    if (pendingCount > 0) {
      await syncNow();
    }
    onRefresh?.();
  };

  if (!visible) return null;

  const toBn = (num: number) => num.toLocaleString("bn-BD");

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 8),
          transform: [{ translateY }],
          backgroundColor: justReconnected ? "#059669" : "#B45309", // Emerald on reconnect, warm amber-amber800 on offline
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textRow}>
          <Ionicons
            name={
              justReconnected
                ? "cloud-done-outline"
                : isSlowConnection
                ? "speedometer-outline"
                : "cloud-offline-outline"
            }
            size={18}
            color="#FFFFFF"
            style={styles.icon}
          />
          <View style={styles.labelCol}>
            <Text style={styles.primaryText}>
              {justReconnected
                ? "ইন্টারনেট সংযোগ ফিরে এসেছে · ডাটা আপডেট হচ্ছে"
                : isSlowConnection
                ? "ধীরগতির ইন্টারনেট · ক্যাশ করা ডাটা দেখাচ্ছেন"
                : "আপনি অফলাইন · ক্যাশ করা ডাটা দেখাচ্ছেন"}
            </Text>
            {pendingCount > 0 && !justReconnected && (
              <View style={styles.syncBadge}>
                <Ionicons name="sync-outline" size={12} color="#FEF3C7" />
                <Text style={styles.syncText}>
                  {toBn(pendingCount)}টি কাজ সিঙ্ক বাকি
                </Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleManualRefresh}
        >
          <Ionicons
            name="refresh-outline"
            size={14}
            color="#FFFFFF"
            style={isSyncing ? styles.rotating : undefined}
          />
          <Text style={styles.refreshButtonText}>
            {isSyncing ? "সিঙ্ক..." : "চেক"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 3px 5px rgba(15, 23, 42, 0.25)" } : {}),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginEnd: 8,
  },
  icon: {
    marginEnd: 8,
  },
  labelCol: {
    flex: 1,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontFamily: FONTS.bengali.bold,
    lineHeight: 17,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  syncText: {
    color: "#FEF3C7",
    fontSize: 11,
    fontFamily: FONTS.bengali.medium,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bengali.semiBold,
  },
  rotating: {
    transform: [{ rotate: "45deg" }],
  },
});
