import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { callService } from "../services/callService";
import { CallSignal, callsRepository } from "../services/repositories/calls";
import { DEMO_USER_ID } from "../services/repositories/friends";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function IncomingCallBanner() {
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = callService.subscribeToSignals((signal) => {
      // Incoming call for current user
      if (signal.type === "call_request" && signal.receiverId === DEMO_USER_ID) {
        showCallBanner(signal);
      } else if (
        (signal.type === "call_end" || signal.type === "call_reject") &&
        incomingCall?.callId === signal.callId
      ) {
        dismissCallBanner();
      }
    });

    return () => {
      unsubscribe();
      callService.stopRingingPattern();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [incomingCall?.callId]);

  const showCallBanner = (signal: CallSignal) => {
    setIncomingCall(signal);
    callService.startRingingPattern("incoming");

    // Animate banner sliding down
    Animated.spring(slideAnim, {
      toValue: 12,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    // Pulse animation for answer button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Auto-timeout after 30 seconds -> Missed Call
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleDecline(true);
    }, 30000);
  };

  const dismissCallBanner = () => {
    callService.stopRingingPattern();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIncomingCall(null);
    });
  };

  const handleAccept = () => {
    if (!incomingCall) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    callService.stopRingingPattern();

    // Send accept signal
    callService.sendSignal({
      type: "call_accept",
      callId: incomingCall.callId,
      callerId: incomingCall.callerId,
      callerName: incomingCall.callerName,
      callerAvatar: incomingCall.callerAvatar,
      receiverId: DEMO_USER_ID,
      callType: incomingCall.callType,
    });

    const currentCall = incomingCall;
    dismissCallBanner();

    // Navigate directly into CallScreen in incoming mode
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType: currentCall.callType,
        targetUserId: currentCall.callerId,
        targetName: currentCall.callerName,
        targetAvatar: currentCall.callerAvatar,
        callerId: currentCall.callerId,
        callId: currentCall.callId,
        isIncoming: "true",
      },
    });
  };

  const handleDecline = (isTimeout: boolean = false) => {
    if (!incomingCall) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Send reject signal
    callService.sendSignal({
      type: "call_reject",
      callId: incomingCall.callId,
      callerId: incomingCall.callerId,
      callerName: incomingCall.callerName,
      callerAvatar: incomingCall.callerAvatar,
      receiverId: DEMO_USER_ID,
      callType: incomingCall.callType,
    });

    // Record missed/rejected call
    callsRepository.createCallLog(
      incomingCall.callerId,
      DEMO_USER_ID,
      incomingCall.callType,
      isTimeout ? "missed" : "rejected",
      0
    );

    dismissCallBanner();
  };

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.bannerCard}>
        <View style={styles.callerInfoRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: incomingCall.callerAvatar }}
              style={styles.avatar}
            />
            <View style={[styles.typeIconBadge, isVideo && { backgroundColor: "#0055F2" }]}>
              <Ionicons
                name={isVideo ? "videocam" : "call"}
                size={11}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.callerName} numberOfLines={1}>
              {incomingCall.callerName}
            </Text>
            <View style={styles.callTypeRow}>
              <Text style={styles.callTypeLabel}>
                {isVideo ? "Incoming Video Call..." : "Incoming Audio Call..."}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons: Decline & Accept */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.declineBtn}
            onPress={() => handleDecline(false)}
          >
            <Ionicons
              name="call"
              size={18}
              color="#FFFFFF"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </Pressable>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable style={styles.acceptBtn} onPress={handleAccept}>
              <Ionicons
                name={isVideo ? "videocam" : "call"}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 40,
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  callerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#38BDF8",
  },
  typeIconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  nameBlock: {
    flex: 1,
  },
  callerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  callTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  callTypeLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  declineBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
});

