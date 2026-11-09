import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Video, ResizeMode } from "../utils/safeExpoAv";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import { callService } from "../services/callService";
import { callsRepository } from "../services/repositories/calls";
import { DEMO_USER_ID } from "../services/repositories/friends";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface InCallMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

export function CallScreen() {
  const params = useLocalSearchParams<{
    callType?: "audio" | "video";
    targetUserId?: string;
    targetName?: string;
    targetAvatar?: string;
    callerId?: string;
    callId?: string;
    isIncoming?: string;
  }>();

  const isIncoming = params.isIncoming === "true";
  const callType = params.callType === "audio" ? "audio" : "video";
  const targetUserId = params.targetUserId || "0ce5b7b9-7d51-4942-91c0-4b9b8d0132c9";
  const targetName = params.targetName || "Rahat Galiv";
  const targetAvatar =
    params.targetAvatar ||
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400";
  const callerId = params.callerId || DEMO_USER_ID;
  const initialCallId = params.callId || `call-${Date.now()}`;

  // Call Lifecycle: "calling" | "ringing" | "connected" | "ended" | "declined"
  const [callStatus, setCallStatus] = useState<
    "calling" | "ringing" | "connected" | "ended" | "declined"
  >(isIncoming ? "connected" : "calling");

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === "video");
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [cameraFacing, setCameraFacing] = useState<CameraType>("front");
  const [permission, requestPermission] = useCameraPermissions();
  const [activeCallId, setActiveCallId] = useState<string>(initialCallId);

  // In-Call Chat Drawer State
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([
    {
      id: "1",
      sender: "them",
      text: "Hey! Can you hear me clearly?",
      time: "Just now",
    },
  ]);
  const [chatInputText, setChatInputText] = useState("");

  // Equalizer animations for audio wave visualizer
  const waveAnim1 = useRef(new Animated.Value(10)).current;
  const waveAnim2 = useRef(new Animated.Value(22)).current;
  const waveAnim3 = useRef(new Animated.Value(34)).current;
  const waveAnim4 = useRef(new Animated.Value(18)).current;
  const waveAnim5 = useRef(new Animated.Value(28)).current;

  // Pulse animation for ringing avatar
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1. Initialize Signaling & Audio Routing
  useEffect(() => {
    let isMounted = true;

    // Set initial audio output mode
    callService.setAudioRoute(isSpeakerOn);

    // If outgoing call, create log and broadcast call_request
    if (!isIncoming) {
      callService.startRingingPattern("outgoing");

      callsRepository
        .createCallLog(callerId, targetUserId, callType, "calling")
        .then((log) => {
          if (isMounted && log) {
            setActiveCallId(log.id);
          }
        });

      callService.sendSignal({
        type: "call_request",
        callId: initialCallId,
        callerId,
        callerName: "Elvis Mittra",
        callerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        receiverId: targetUserId,
        callType,
      });
    } else {
      callService.playConnectedFeedback();
    }

    // Subscribe to realtime signaling
    const unsubscribeSignals = callService.subscribeToSignals((signal) => {
      if (!isMounted) return;

      if (signal.type === "call_accept") {
        setCallStatus("connected");
        callService.playConnectedFeedback();
      } else if (signal.type === "call_reject") {
        setCallStatus("declined");
        callService.playCallEndFeedback();
        setTimeout(() => router.back(), 1500);
      } else if (signal.type === "call_end") {
        setCallStatus("ended");
        callService.playCallEndFeedback();
        setTimeout(() => router.back(), 1200);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeSignals();
      callService.stopRingingPattern();
    };
  }, []);

  // 2. Outgoing Lifecycle Transitions: calling (1.5s) -> ringing (2s) -> connected (fallback for demo)
  useEffect(() => {
    if (isIncoming || callStatus !== "calling") return;

    const t1 = setTimeout(() => {
      setCallStatus("ringing");
    }, 1400);

    const t2 = setTimeout(() => {
      setCallStatus((prev) => {
        if (prev === "ringing" || prev === "calling") {
          callService.playConnectedFeedback();
          return "connected";
        }
        return prev;
      });
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isIncoming, callStatus]);

  // 3. Ringing pulse animation
  useEffect(() => {
    if (callStatus === "calling" || callStatus === "ringing") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [callStatus]);

  // 4. Equalizer animation for connected audio state
  useEffect(() => {
    if (callStatus === "connected") {
      const animateWave = (anim: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
            Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
          ])
        );
      };

      const a1 = animateWave(waveAnim1, 8, 38, 430);
      const a2 = animateWave(waveAnim2, 12, 46, 360);
      const a3 = animateWave(waveAnim3, 10, 52, 500);
      const a4 = animateWave(waveAnim4, 12, 40, 390);
      const a5 = animateWave(waveAnim5, 8, 34, 460);

      a1.start();
      a2.start();
      a3.start();
      a4.start();
      a5.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        a4.stop();
        a5.stop();
      };
    }
  }, [callStatus]);

  // 5. Call Duration Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setDurationSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // End Call Handler
  const handleEndCall = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    callService.playCallEndFeedback();
    setCallStatus("ended");

    // Broadcast signal to other peer
    callService.sendSignal({
      type: "call_end",
      callId: activeCallId,
      callerId,
      callerName: "Elvis Mittra",
      callerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      receiverId: targetUserId,
      callType,
    });

    try {
      if (activeCallId) {
        await callsRepository.updateCallLog(
          activeCallId,
          callStatus === "connected" ? "completed" : "missed",
          durationSeconds
        );
      }
    } catch (e) {
      console.warn("End call sync error:", e);
    }

    setTimeout(() => {
      router.back();
    }, 500);
  };

  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const handleToggleSpeaker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isSpeakerOn;
    setIsSpeakerOn(nextState);
    callService.setAudioRoute(nextState);
  };

  const handleToggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleFlipCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((f) => (f === "front" ? "back" : "front"));
  };

  const handleSendInCallMessage = (presetText?: string) => {
    const msg = presetText || chatInputText.trim();
    if (!msg) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: InCallMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      text: msg,
      time: "Now",
    };
    setInCallMessages((prev) => [...prev, newMsg]);
    setChatInputText("");
  };

  return (
    <View style={styles.container}>
      {/* =================================================================== */}
      {/* 1. VIDEO CALL SCREEN (When connected in video mode) */}
      {/* =================================================================== */}
      {callType === "video" && callStatus === "connected" ? (
        <View style={styles.videoStreamContainer}>
          {/* Remote Video Stream with Fallback Stream */}
          <Video
            source={{
              uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={true}
            isMuted={!isSpeakerOn}
          />

          {/* Top Bar Header with Live Quality Stats */}
          <LinearGradient
            colors={["rgba(10, 15, 30, 0.85)", "transparent"]}
            style={styles.videoHeader}
          >
            <View style={styles.videoHeaderLeft}>
              <Image source={{ uri: targetAvatar }} style={styles.videoMiniAvatar} />
              <View>
                <Text style={styles.videoNameText}>{targetName}</Text>
                <View style={styles.videoStatusRow}>
                  <View style={styles.greenLiveDot} />
                  <Text style={styles.videoTimerText}>
                    {formatTimer(durationSeconds)} • 1080p HD • 24ms
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.videoHeaderRight}>
              <View style={styles.encryptedPill}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <Text style={styles.encryptedText}>E2EE</Text>
              </View>

              <Pressable
                style={styles.headerChatBtn}
                onPress={() => setShowInCallChat(!showInCallChat)}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </LinearGradient>

          {/* Picture-In-Picture (PIP) Local Camera Preview */}
          {isVideoEnabled ? (
            <View style={styles.pipWrapper}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing={cameraFacing}
                />
              ) : (
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
                  }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Pressable style={styles.pipFlipBtn} onPress={handleFlipCamera}>
                <Ionicons name="camera-reverse" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.pipWrapper, styles.pipCameraOff]}>
              <Ionicons name="videocam-off" size={24} color="#94A3B8" />
              <Text style={styles.pipCameraOffText}>Camera off</Text>
            </View>
          )}

          {/* In-Call Instant Chat Drawer Overlay */}
          {showInCallChat && (
            <View style={styles.inCallChatTray}>
              <View style={styles.inCallChatHeader}>
                <Text style={styles.inCallChatTitle}>In-Call Chat</Text>
                <Pressable onPress={() => setShowInCallChat(false)}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView style={styles.inCallChatMessages} showsVerticalScrollIndicator={false}>
                {inCallMessages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.inCallBubble,
                      m.sender === "me" ? styles.inCallBubbleMe : styles.inCallBubbleThem,
                    ]}
                  >
                    <Text style={styles.inCallBubbleText}>{m.text}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Quick Preset Response Chips */}
              <View style={styles.quickChipsRow}>
                {["In the lobby", "Can't hear clearly", "See you soon! ✈️"].map((chip) => (
                  <Pressable
                    key={chip}
                    style={styles.quickChip}
                    onPress={() => handleSendInCallMessage(chip)}
                  >
                    <Text style={styles.quickChipText}>{chip}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.inCallInputRow}>
                <TextInput
                  style={styles.inCallInput}
                  placeholder="Type a quick message..."
                  placeholderTextColor="#64748B"
                  value={chatInputText}
                  onChangeText={setChatInputText}
                />
                <Pressable
                  style={styles.inCallSendBtn}
                  onPress={() => handleSendInCallMessage()}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Bottom Floating Control Bar */}
          <LinearGradient
            colors={["transparent", "rgba(10, 15, 30, 0.95)"]}
            style={styles.videoControlsOverlay}
          >
            <View style={styles.controlsRow}>
              {/* Mute Button */}
              <Pressable
                style={[styles.controlCircle, isMuted && styles.controlCircleActive]}
                onPress={handleToggleMute}
              >
                <Ionicons
                  name={isMuted ? "mic-off" : "mic"}
                  size={22}
                  color={isMuted ? "#EF4444" : "#fff"}
                />
              </Pressable>

              {/* Video Off/On */}
              <Pressable
                style={[
                  styles.controlCircle,
                  !isVideoEnabled && styles.controlCircleActive,
                ]}
                onPress={handleToggleVideo}
              >
                <Ionicons
                  name={isVideoEnabled ? "videocam" : "videocam-off"}
                  size={22}
                  color="#fff"
                />
              </Pressable>

              {/* Flip Camera */}
              <Pressable style={styles.controlCircle} onPress={handleFlipCamera}>
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </Pressable>

              {/* Speaker */}
              <Pressable
                style={[styles.controlCircle, isSpeakerOn && styles.controlCircleHighlight]}
                onPress={handleToggleSpeaker}
              >
                <Ionicons
                  name={isSpeakerOn ? "volume-high" : "volume-mute"}
                  size={22}
                  color={isSpeakerOn ? "#38BDF8" : "#fff"}
                />
              </Pressable>

              {/* End Call */}
              <Pressable
                style={[styles.controlCircle, styles.hangupCircle]}
                onPress={handleEndCall}
              >
                <Ionicons
                  name="call"
                  size={26}
                  color="#fff"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      ) : (
        /* =================================================================== */
        /* 2. AUDIO CALL SCREEN OR RINGING STATE */
        /* =================================================================== */
        <LinearGradient
          colors={["#090D16", "#0F172A", "#090D16"]}
          style={styles.audioContainer}
        >
          {/* Top Bar with Encrypted Badge */}
          <SafeAreaView edges={["top"]} style={styles.audioTopBar}>
            <Pressable style={styles.audioBackBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={26} color="#94A3B8" />
            </Pressable>

            <View style={styles.audioBadge}>
              <Ionicons
                name={callType === "video" ? "videocam" : "call"}
                size={13}
                color="#38BDF8"
              />
              <Text style={styles.audioBadgeText}>
                {callType === "video" ? "Video Calling" : "HD Voice Call"}
              </Text>
            </View>

            <Pressable
              style={styles.audioChatToggle}
              onPress={() => setShowInCallChat(!showInCallChat)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#94A3B8" />
            </Pressable>
          </SafeAreaView>

          {/* Center Caller Profile & Animated Equalizer */}
          <View style={styles.audioCenterBlock}>
            <View style={styles.avatarPulseWrapper}>
              {(callStatus === "calling" || callStatus === "ringing") && (
                <Animated.View
                  style={[
                    styles.pulsingRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.25],
                        outputRange: [0.5, 0],
                      }),
                    },
                  ]}
                />
              )}
              <Image source={{ uri: targetAvatar }} style={styles.audioBigAvatar} />
            </View>

            <Text style={styles.audioCallerName}>{targetName}</Text>
            <Text style={styles.audioStatusLabel}>
              {callStatus === "calling"
                ? "Connecting with traveler..."
                : callStatus === "ringing"
                ? "Ringing..."
                : callStatus === "declined"
                ? "Traveler Busy • Call Declined"
                : callStatus === "ended"
                ? "Call Ended"
                : `${formatTimer(durationSeconds)} • HD 64kbps Opus`}
            </Text>

            {/* Dynamic Equalizer Bar when Connected */}
            {callStatus === "connected" && (
              <View style={styles.equalizerRow}>
                <Animated.View style={[styles.equalizerBar, { height: waveAnim1 }]} />
                <Animated.View style={[styles.equalizerBar, { height: waveAnim2 }]} />
                <Animated.View style={[styles.equalizerBar, { height: waveAnim3 }]} />
                <Animated.View style={[styles.equalizerBar, { height: waveAnim4 }]} />
                <Animated.View style={[styles.equalizerBar, { height: waveAnim5 }]} />
              </View>
            )}
          </View>

          {/* In-Call Chat Overlay for Audio Mode */}
          {showInCallChat && (
            <View style={styles.audioChatTray}>
              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {inCallMessages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.inCallBubble,
                      m.sender === "me" ? styles.inCallBubbleMe : styles.inCallBubbleThem,
                    ]}
                  >
                    <Text style={styles.inCallBubbleText}>{m.text}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.inCallInputRow}>
                <TextInput
                  style={styles.inCallInput}
                  placeholder="Send quick note..."
                  placeholderTextColor="#64748B"
                  value={chatInputText}
                  onChangeText={setChatInputText}
                />
                <Pressable
                  style={styles.inCallSendBtn}
                  onPress={() => handleSendInCallMessage()}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Bottom Action Controls */}
          <SafeAreaView edges={["bottom"]} style={styles.audioControlsWrapper}>
            <View style={styles.audioControlsRow}>
              {/* Mute Button */}
              <Pressable
                style={[
                  styles.audioControlBtn,
                  isMuted && styles.audioControlBtnActive,
                ]}
                onPress={handleToggleMute}
              >
                <View
                  style={[
                    styles.audioControlCircle,
                    isMuted && { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                  ]}
                >
                  <Ionicons
                    name={isMuted ? "mic-off" : "mic"}
                    size={24}
                    color={isMuted ? "#EF4444" : "#FFFFFF"}
                  />
                </View>
                <Text style={styles.audioControlLabel}>
                  {isMuted ? "Muted" : "Mute"}
                </Text>
              </Pressable>

              {/* Speaker Button */}
              <Pressable
                style={styles.audioControlBtn}
                onPress={handleToggleSpeaker}
              >
                <View
                  style={[
                    styles.audioControlCircle,
                    isSpeakerOn && { backgroundColor: "rgba(56, 189, 248, 0.2)" },
                  ]}
                >
                  <Ionicons
                    name={isSpeakerOn ? "volume-high" : "volume-mute"}
                    size={24}
                    color={isSpeakerOn ? "#38BDF8" : "#94A3B8"}
                  />
                </View>
                <Text style={styles.audioControlLabel}>
                  {isSpeakerOn ? "Speaker" : "Earpiece"}
                </Text>
              </Pressable>

              {/* End Call Button */}
              <Pressable
                style={[styles.audioControlBtn, styles.audioHangupBtn]}
                onPress={handleEndCall}
              >
                <Ionicons
                  name="call"
                  size={28}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
                <Text style={[styles.audioControlLabel, { color: "#FFFFFF" }]}>End</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  videoStreamContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  videoHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  videoHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoMiniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  videoNameText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  videoStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  greenLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  videoTimerText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  encryptedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  encryptedText: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "700",
  },
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  pipWrapper: {
    position: "absolute",
    top: 130,
    right: 18,
    width: 105,
    height: 145,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "#1E293B",
    zIndex: 20,
    elevation: 8,
  },
  pipCameraOff: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E293B",
  },
  pipCameraOffText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 6,
  },
  pipFlipBtn: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  inCallChatTray: {
    position: "absolute",
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 18,
    padding: 12,
    zIndex: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inCallChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inCallChatTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  inCallChatMessages: {
    maxHeight: 120,
    marginBottom: 8,
  },
  inCallBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: "80%",
  },
  inCallBubbleMe: {
    backgroundColor: "#E5A93C",
    alignSelf: "flex-end",
  },
  inCallBubbleThem: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignSelf: "flex-start",
  },
  inCallBubbleText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  quickChip: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quickChipText: {
    color: "#CBD5E1",
    fontSize: 10,
  },
  inCallInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inCallInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#FFFFFF",
    fontSize: 12,
  },
  inCallSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5A93C",
    justifyContent: "center",
    alignItems: "center",
  },
  videoControlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 44,
    paddingTop: 30,
    zIndex: 10,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  controlCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlCircleActive: {
    backgroundColor: "#EF4444",
  },
  controlCircleHighlight: {
    backgroundColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  hangupCircle: {
    backgroundColor: "#EF4444",
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  audioContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  audioTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  audioBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  audioBadgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  audioChatToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioCenterBlock: {
    alignItems: "center",
  },
  avatarPulseWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  pulsingRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E5A93C",
  },
  audioBigAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  audioCallerName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  audioStatusLabel: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  equalizerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 60,
    marginTop: 18,
  },
  equalizerBar: {
    width: 4,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
  },
  audioChatTray: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginVertical: 10,
  },
  audioControlsWrapper: {
    paddingBottom: 24,
  },
  audioControlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  audioControlBtn: {
    alignItems: "center",
    gap: 8,
    width: 72,
  },
  audioControlCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioControlBtnActive: {
    // optional styling when active
  },
  audioControlLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  audioHangupBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
});
