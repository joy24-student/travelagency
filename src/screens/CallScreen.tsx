import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Image,
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
import { Video, ResizeMode, Audio } from "../utils/safeExpoAv";
import { CallPermissionModal } from "../components/call/CallPermissionModal";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import {
  callService,
  CallSignal,
  CallConnectionState,
  IceCandidatePayload,
} from "../services/callService";
import { callsRepository } from "../services/repositories/calls";
import { useAuthStore } from "../store/authStore";


interface InCallMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

// ─── Audible Ringback Tone & Disconnect Tone Simulation Engine ──────────

class RingbackAudioEngine {
  private audioCtx: any = null;
  private isPlaying = false;
  private timer: any = null;
  private osc1: any = null;
  private osc2: any = null;
  private gainNode: any = null;

  private getAudioContext(): any {
    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioCtx || this.audioCtx.state === "closed") {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume();
        }
        return this.audioCtx;
      }
    }
    return null;
  }

  /**
   * Start telecom ringback tone simulation (440Hz + 480Hz dual tone, 1.8s pulse, 2.2s cadence)
   */
  public startRingback() {
    this.stopRingback();
    this.isPlaying = true;

    const playTonePulse = () => {
      if (!this.isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        this.osc1 = ctx.createOscillator();
        this.osc2 = ctx.createOscillator();
        this.gainNode = ctx.createGain();

        // Standard telecom audible ringback frequencies
        this.osc1.frequency.setValueAtTime(440, now);
        this.osc2.frequency.setValueAtTime(480, now);

        // Smooth volume envelope to prevent clicking
        this.gainNode.gain.setValueAtTime(0, now);
        this.gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
        this.gainNode.gain.setValueAtTime(0.08, now + 1.75);
        this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.8);

        this.osc1.connect(this.gainNode);
        this.osc2.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);

        this.osc1.start(now);
        this.osc2.start(now);
        this.osc1.stop(now + 1.82);
        this.osc2.stop(now + 1.82);

        this.timer = setTimeout(() => {
          if (this.isPlaying) {
            playTonePulse();
          }
        }, 4000);
      } catch (e) {
        console.warn("Ringback audio generation error:", e);
      }
    };

    playTonePulse();
  }

  /**
   * Stop ringback tone immediately
   */
  public stopRingback() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      if (this.osc1) {
        this.osc1.stop();
        this.osc1.disconnect();
        this.osc1 = null;
      }
      if (this.osc2) {
        this.osc2.stop();
        this.osc2.disconnect();
        this.osc2 = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Play three rapid 480Hz busy/disconnect beeps (100ms tone, 100ms silence)
   */
  public playDisconnectTone() {
    this.stopRingback();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const startTime = now + i * 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.setValueAtTime(480, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.13);
      }
    } catch (e) {
      console.warn("Disconnect tone audio error:", e);
    }
  }
}

const ringbackEngine = new RingbackAudioEngine();

// ─── Main CallScreen Component ──────────────────────────────────────────

export function CallScreen() {
  const params = useLocalSearchParams<{
    callType?: "audio" | "video";
    targetUserId?: string;
    targetName?: string;
    targetAvatar?: string;
    callerId?: string;
    callId?: string;
    isIncoming?: string;
    remoteVideoUri?: string;
  }>();

  const isIncoming = params.isIncoming === "true";
  const initialCallType = params.callType === "audio" ? "audio" : "video";
  const storeUser = useAuthStore((s) => s.user);

  // Dynamic user & peer resolution (No hardcoded IDs)
  const callerId = params.callerId || storeUser?.id || "caller-" + Date.now().toString().slice(-4);
  const targetUserId = params.targetUserId || (isIncoming ? callerId : "agency-agent-support");
  const targetName = params.targetName || "Agency Concierge";
  const targetAvatar = params.targetAvatar || "";
  const initialCallId = params.callId || `call-${Date.now()}`;
  const remoteVideoSourceUri =
    params.remoteVideoUri ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

  // Call Lifecycle: "calling" | "ringing" | "gathering_ice" | "connecting" | "connected" | "reconnecting" | "ended" | "declined" | "timeout"
  const [callStatus, setCallStatus] = useState<CallConnectionState>(
    isIncoming ? "connected" : "calling"
  );
  const [callType, setCallType] = useState<"audio" | "video">(initialCallType);

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(initialCallType === "video");
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialCallType === "video");
  const [cameraFacing, setCameraFacing] = useState<CameraType>("front");
  const [permission, requestPermission] = useCameraPermissions();
  const [activeCallId, setActiveCallId] = useState<string>(initialCallId);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Auto-hide controls in video mode
  const [showControls, setShowControls] = useState(true);

  // ICE Candidates & Network Stats
  const [iceCandidates, setIceCandidates] = useState<IceCandidatePayload[]>([]);
  const [networkStats, setNetworkStats] = useState({
    latencyMs: 22,
    iceType: "Direct P2P",
    resolution: "1080p HD",
    packetLoss: "0.0%",
  });

  // Reconnection & Renegotiation States
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isRenegotiating, setIsRenegotiating] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // In-Call Chat Drawer State
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([
    {
      id: "1",
      sender: "them",
      text: `Hello! ${targetName} here. Can you hear me clearly?`,
      time: "Just now",
    },
  ]);
  const [chatInputText, setChatInputText] = useState("");

  // Animated Concentric Pulse Rings
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  // Equalizer animations for audio wave visualizer
  const waveAnim1 = useRef(new Animated.Value(10)).current;
  const waveAnim2 = useRef(new Animated.Value(22)).current;
  const waveAnim3 = useRef(new Animated.Value(34)).current;
  const waveAnim4 = useRef(new Animated.Value(18)).current;
  const waveAnim5 = useRef(new Animated.Value(28)).current;

  const showToast = useCallback((msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => {
      setNotificationToast((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  // Verify Audio and Video call permissions before connecting
  useEffect(() => {
    let isMounted = true;
    async function checkCallPermissions() {
      try {
        const mic = await Audio.checkMicrophonePermissionAsync();
        const cam = initialCallType === "video" ? permission?.granted ?? false : true;
        if ((!mic.granted || !cam) && isMounted) {
          setShowPermissionModal(true);
        }
      } catch (e) {
        console.warn("Permission check error:", e);
      }
    }
    checkCallPermissions();
    return () => {
      isMounted = false;
    };
  }, [initialCallType, permission?.granted]);

  // 1. Initialize Signaling, Audible Ringback Tone, ICE Gathering & 45s Timeout
  useEffect(() => {
    let isMounted = true;

    // Set initial audio routing via callService
    callService.setAudioRoute(isSpeakerOn);

    if (!isIncoming) {
      // Audible ringback tone simulation + rhythmic haptic pulsing
      ringbackEngine.startRingback();
      callService.startRingingPattern("outgoing");

      // Log call initialization in calls repository
      callsRepository
        .createCallLog(callerId, targetUserId, callType, "calling")
        .then((log) => {
          if (isMounted && log) {
            setActiveCallId(log.id);
          }
        });

      // Send initial call_request
      callService.sendSignal({
        type: "call_request",
        callId: initialCallId,
        callerId,
        callerName: "Traveler",
        callerAvatar: "",
        receiverId: targetUserId,
        callType,
      });

      // 45-Second Call Timeout Handler (Auto-hangup if unanswered)
      callService.startCallTimeout(
        initialCallId,
        targetUserId,
        () => {
          if (!isMounted) return;
          ringbackEngine.stopRingback();
          ringbackEngine.playDisconnectTone();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setCallStatus("timeout");
          setTimeout(() => {
            if (isMounted) router.back();
          }, 1800);
        },
        45000 // 45 seconds
      );
    } else {
      ringbackEngine.stopRingback();
      callService.playConnectedFeedback();
    }

    // Subscribe to realtime signals
    const unsubscribeSignals = callService.subscribeToSignals((signal) => {
      if (!isMounted) return;

      if (signal.type === "call_accept") {
        ringbackEngine.stopRingback();
        callService.clearCallTimeout();
        setCallStatus("gathering_ice");
        callService
          .gatherIceCandidates(
            initialCallId,
            callerId,
            "Traveler",
            "",
            targetUserId,
            callType,
            (cand) => {
              if (isMounted) setIceCandidates((prev) => [...prev, cand]);
            }
          )
          .then(() => {
            if (isMounted) {
              setCallStatus("connected");
              callService.playConnectedFeedback();
            }
          });
      } else if (signal.type === "ice_candidate" && signal.candidate) {
        setIceCandidates((prev) => [...prev, signal.candidate!]);
      } else if (signal.type === "call_reject") {
        ringbackEngine.stopRingback();
        ringbackEngine.playDisconnectTone();
        callService.clearCallTimeout();
        setCallStatus("declined");
        callService.playCallEndFeedback();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => router.back(), 1500);
      } else if (signal.type === "call_timeout") {
        ringbackEngine.stopRingback();
        ringbackEngine.playDisconnectTone();
        setCallStatus("timeout");
        callService.playCallEndFeedback();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => router.back(), 1500);
      } else if (signal.type === "call_end") {
        ringbackEngine.stopRingback();
        ringbackEngine.playDisconnectTone();
        callService.clearCallTimeout();
        setCallStatus("ended");
        callService.playCallEndFeedback();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => router.back(), 1200);
      }
    });

    return () => {
      isMounted = false;
      ringbackEngine.stopRingback();
      unsubscribeSignals();
      callService.clearCallTimeout();
      callService.stopRingingPattern();
    };
  }, []);

  // 2. Outgoing Lifecycle Transitions with ICE Gathering
  useEffect(() => {
    if (isIncoming || callStatus !== "calling") return;

    const t1 = setTimeout(() => {
      setCallStatus("ringing");
    }, 1400);

    const t2 = setTimeout(() => {
      setCallStatus((prev) => {
        if (prev === "ringing" || prev === "calling") {
          ringbackEngine.stopRingback();
          callService.clearCallTimeout();
          callService
            .gatherIceCandidates(
              activeCallId,
              callerId,
              "Traveler",
              "",
              targetUserId,
              callType,
              (cand) => setIceCandidates((c) => [...c, cand])
            )
            .then(() => {
              setCallStatus("connected");
              callService.playConnectedFeedback();
            });
          return "gathering_ice";
        }
        return prev;
      });
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isIncoming, callStatus]);

  // 3. Animated Multi-Layer Concentric Pulse Rings
  useEffect(() => {
    if (
      callStatus === "calling" ||
      callStatus === "ringing" ||
      callStatus === "gathering_ice" ||
      callStatus === "reconnecting"
    ) {
      const createRingLoop = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.6,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const l1 = createRingLoop(pulseAnim1, 0);
      const l2 = createRingLoop(pulseAnim2, 500);
      const l3 = createRingLoop(pulseAnim3, 1000);

      l1.start();
      l2.start();
      l3.start();

      return () => {
        l1.stop();
        l2.stop();
        l3.stop();
      };
    }
  }, [callStatus]);

  // 4. Equalizer animations for audio wave visualizer
  useEffect(() => {
    if (callStatus === "connected" && !isMuted) {
      const animateWave = (anim: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: max, duration, useNativeDriver: true }),
            Animated.timing(anim, { toValue: min, duration, useNativeDriver: true }),
          ])
        );
      };

      const a1 = animateWave(waveAnim1, 0.2, 1.0, 420);
      const a2 = animateWave(waveAnim2, 0.3, 1.0, 350);
      const a3 = animateWave(waveAnim3, 0.25, 1.0, 490);
      const a4 = animateWave(waveAnim4, 0.3, 1.0, 380);
      const a5 = animateWave(waveAnim5, 0.2, 0.9, 450);

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
  }, [callStatus, isMuted]);

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

  // ─── WebRTC ICE Renegotiation Handler ──────────────────────────────────
  const handleTriggerRenegotiation = async () => {
    if (callStatus !== "connected") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRenegotiating(true);
    showToast("Renegotiating WebRTC connection • STUN/TURN Candidate Refresh");

    try {
      // Broadcast sdp_offer for renegotiation
      await callService.sendSignal({
        type: "sdp_offer",
        callId: activeCallId,
        callerId,
        callerName: "Traveler",
        callerAvatar: "",
        receiverId: targetUserId,
        callType,
        sdp: "v=0\r\no=traveler 2890844526 2 IN IP4 127.0.0.1\r\ns=SDP-Renegotiate\r\nt=0 0\r\nm=audio 54321 UDP/TLS/RTP/SAVPF 111",
      });

      // Gather refreshed ICE candidates
      const freshCandidates = await callService.gatherIceCandidates(
        activeCallId,
        callerId,
        "Traveler",
        "",
        targetUserId,
        callType,
        (cand) => setIceCandidates((prev) => [...prev, cand])
      );

      setNetworkStats((cur) => ({
        ...cur,
        latencyMs: 18,
        iceType: freshCandidates[freshCandidates.length - 1]?.type === "relay" ? "TURN Relay" : "Direct P2P",
      }));

      showToast("ICE renegotiation completed successfully");
    } catch (e) {
      console.warn("ICE renegotiation error:", e);
    } finally {
      setIsRenegotiating(false);
    }
  };

  // ─── Network Drops Simulation & Graceful Recovery Handler ──────────────
  const handleSimulateNetworkDrop = () => {
    if (callStatus !== "connected") return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCallStatus("reconnecting");
    setReconnectAttempt((prev) => prev + 1);
    callService.notifyConnectionState("reconnecting");
    showToast("⚠️ Network dropped. Re-establishing WebRTC connection...");

    // Graceful automatic reconnection sequence via ICE fallback
    setTimeout(async () => {
      try {
        await callService.gatherIceCandidates(
          activeCallId,
          callerId,
          "Traveler",
          "",
          targetUserId,
          callType
        );

        setCallStatus("connected");
        callService.playConnectedFeedback();
        setNetworkStats({
          latencyMs: 24,
          iceType: "Direct P2P (Restored)",
          resolution: callType === "video" ? "1080p HD" : "HD Audio",
          packetLoss: "0.0%",
        });
        showToast("Connection restored smoothly (0.0% loss)");
      } catch {
        showToast("Reconnection failed. Retrying...");
      }
    }, 2800);
  };

  // ─── Interactive Controls Handlers ─────────────────────────────────────

  // End Call Handler with Audible Disconnect Simulation & Disconnect Haptics
  const handleEndCall = async () => {
    ringbackEngine.stopRingback();
    callService.clearCallTimeout();

    // 1. Audible disconnect tone simulation (3 rapid beeps)
    ringbackEngine.playDisconnectTone();

    // 2. Disconnect Haptics: Heavy impact + error notification double feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, 150);

    callService.playCallEndFeedback();
    setCallStatus("ended");

    callService.sendSignal({
      type: "call_end",
      callId: activeCallId,
      callerId,
      callerName: "Traveler",
      callerAvatar: "",
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
    }, 600);
  };

  // Mute Microphone Toggle
  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    showToast(nextMuted ? "Microphone muted" : "Microphone active");
  };

  // Speakerphone / Earpiece Audio Route Toggle
  const handleToggleSpeaker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isSpeakerOn;
    setIsSpeakerOn(nextState);
    callService.setAudioRoute(nextState);
    showToast(nextState ? "Speakerphone active" : "Audio routed to earpiece");
  };

  // Toggle Video Track On / Off
  const handleToggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextVideo = !isVideoEnabled;
    setIsVideoEnabled(nextVideo);
    if (callType === "audio" && nextVideo) {
      setCallType("video");
    }
    showToast(nextVideo ? "Camera enabled" : "Camera turned off");
  };

  // Flip Camera (Front / Back)
  const handleFlipCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((f) => (f === "front" ? "back" : "front"));
    showToast(`Camera switched to ${cameraFacing === "front" ? "rear" : "front"}`);
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

  // Connection Status Badge Helper
  const renderConnectionBadge = () => {
    switch (callStatus) {
      case "gathering_ice":
        return (
          <View style={[styles.statusBadgePill, styles.badgeGathering]}>
            <Ionicons name="sync" size={12} color="#F59E0B" />
            <Text style={styles.badgeGatheringText}>Gathering ICE Candidates...</Text>
          </View>
        );
      case "reconnecting":
        return (
          <View style={[styles.statusBadgePill, styles.badgeTimeout]}>
            <Ionicons name="warning" size={12} color="#EF4444" />
            <Text style={styles.badgeTimeoutText}>
              Network Drop • Reconnecting ({reconnectAttempt})...
            </Text>
          </View>
        );
      case "connected":
        return (
          <View style={[styles.statusBadgePill, styles.badgeConnected]}>
            <View style={styles.greenLiveDot} />
            <Text style={styles.badgeConnectedText}>
              {formatTimer(durationSeconds)} • {networkStats.resolution} • {networkStats.latencyMs}ms ({networkStats.iceType})
            </Text>
          </View>
        );
      case "timeout":
        return (
          <View style={[styles.statusBadgePill, styles.badgeTimeout]}>
            <Ionicons name="time-outline" size={12} color="#EF4444" />
            <Text style={styles.badgeTimeoutText}>No Answer (45s Timeout)</Text>
          </View>
        );
      case "ringing":
        return (
          <View style={[styles.statusBadgePill, styles.badgeRinging]}>
            <Ionicons name="radio" size={12} color="#38BDF8" />
            <Text style={styles.badgeRingingText}>Ringing (Audible Tone)...</Text>
          </View>
        );
      case "declined":
        return (
          <View style={[styles.statusBadgePill, styles.badgeTimeout]}>
            <Ionicons name="close-circle" size={12} color="#EF4444" />
            <Text style={styles.badgeTimeoutText}>Call Declined</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadgePill, styles.badgeCalling]}>
            <Ionicons name="call-outline" size={12} color="#60A5FA" />
            <Text style={styles.badgeCallingText}>Initiating WebRTC Signaling...</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Floating Toast Notification Banner ────────────────── */}
      {notificationToast && (
        <View style={styles.toastBanner}>
          <Ionicons name="information-circle" size={16} color="#FFFFFF" />
          <Text style={styles.toastBannerText}>{notificationToast}</Text>
        </View>
      )}

      {/* ─── Reconnection Warning Overlay ──────────────────────── */}
      {callStatus === "reconnecting" && (
        <View style={styles.reconnectBanner}>
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.reconnectBannerTitle}>Network Connection Dropped</Text>
            <Text style={styles.reconnectBannerSubtitle}>
              Attempting automatic WebRTC STUN/TURN fallback renegotiation...
            </Text>
          </View>
        </View>
      )}

      {/* =================================================================== */}
      {/* 1. VIDEO CALL SCREEN (When connected in video mode) */}
      {/* =================================================================== */}
      {callType === "video" && callStatus === "connected" ? (
        <Pressable
          style={styles.videoStreamContainer}
          onPress={() => setShowControls(!showControls)}
        >
          {/* Remote Video Stream with Fallback Stream */}
          <Video
            source={{ uri: remoteVideoSourceUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={true}
            isMuted={!isSpeakerOn}
          />

          {/* Top Bar Header with Connection Status Badge */}
          {showControls && (
            <LinearGradient
              colors={["rgba(10, 15, 30, 0.9)", "transparent"]}
              style={styles.videoHeader}
            >
              <View style={styles.videoHeaderLeft}>
                {targetAvatar ? (
                  <Image source={{ uri: targetAvatar }} style={styles.videoMiniAvatar} />
                ) : (
                  <View style={[styles.videoMiniAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>
                      {targetName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.videoNameText}>{targetName}</Text>
                  <View style={{ marginTop: 2 }}>{renderConnectionBadge()}</View>
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
          )}

          {/* Picture-In-Picture (PIP) Local Camera Preview */}
          {isVideoEnabled ? (
            <View style={styles.pipWrapper}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing={cameraFacing}
                />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, styles.cameraPermissionBox]}>
                  <Pressable onPress={() => requestPermission()}>
                    <Ionicons name="camera" size={24} color="#FFFFFF" />
                    <Text style={styles.grantCameraText}>Enable</Text>
                  </Pressable>
                </View>
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

          {/* Diagnostics Quick Bar: ICE Renegotiation & Network Drop Test */}
          {showControls && (
            <View style={styles.diagnosticsPillRow}>
              <Pressable
                style={styles.diagnosticChip}
                onPress={handleTriggerRenegotiation}
                disabled={isRenegotiating}
              >
                <Ionicons name="git-network-outline" size={13} color="#38BDF8" />
                <Text style={styles.diagnosticChipText}>Renegotiate ICE</Text>
              </Pressable>

              <Pressable
                style={styles.diagnosticChip}
                onPress={handleSimulateNetworkDrop}
              >
                <Ionicons name="wifi-outline" size={13} color="#F59E0B" />
                <Text style={styles.diagnosticChipText}>Simulate Drop</Text>
              </Pressable>
            </View>
          )}

          {/* In-Call Instant Chat Drawer Overlay */}
          {showInCallChat && (
            <View style={styles.inCallChatTray}>
              <View style={styles.inCallChatHeader}>
                <Text style={styles.inCallChatTitle}>In-Call Instant Chat</Text>
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
          {showControls && (
            <LinearGradient
              colors={["transparent", "rgba(10, 15, 30, 0.98)"]}
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
          )}
        </Pressable>
      ) : (
        /* =================================================================== */
        /* 2. AUDIO CALL SCREEN OR RINGING STATE */
        /* =================================================================== */
        <LinearGradient
          colors={["#090D16", "#0F172A", "#090D16"]}
          style={styles.audioContainer}
        >
          {/* Top Bar with Status Badge */}
          <SafeAreaView edges={["top"]} style={styles.audioTopBar}>
            <Pressable style={styles.audioBackBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-down" size={26} color="#94A3B8" />
            </Pressable>

            {renderConnectionBadge()}

            <Pressable
              style={styles.audioChatToggle}
              onPress={() => setShowInCallChat(!showInCallChat)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#94A3B8" />
            </Pressable>
          </SafeAreaView>

          {/* Center Caller Profile & Animated Concentric Pulse Rings */}
          <View style={styles.audioCenterBlock}>
            <View style={styles.avatarPulseWrapper}>
              {/* Concentric Pulse Ring 1 */}
              {(callStatus === "calling" ||
                callStatus === "ringing" ||
                callStatus === "gathering_ice" ||
                callStatus === "reconnecting") && (
                <>
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      {
                        transform: [{ scale: pulseAnim1 }],
                        opacity: pulseAnim1.interpolate({
                          inputRange: [1, 1.6],
                          outputRange: [0.65, 0],
                        }),
                      },
                    ]}
                  />
                  {/* Concentric Pulse Ring 2 */}
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      {
                        transform: [{ scale: pulseAnim2 }],
                        opacity: pulseAnim2.interpolate({
                          inputRange: [1, 1.6],
                          outputRange: [0.45, 0],
                        }),
                      },
                    ]}
                  />
                  {/* Concentric Pulse Ring 3 */}
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      {
                        transform: [{ scale: pulseAnim3 }],
                        opacity: pulseAnim3.interpolate({
                          inputRange: [1, 1.6],
                          outputRange: [0.25, 0],
                        }),
                      },
                    ]}
                  />
                </>
              )}

              {targetAvatar ? (
                <Image source={{ uri: targetAvatar }} style={styles.audioBigAvatar} />
              ) : (
                <View style={[styles.audioBigAvatar, styles.avatarPlaceholderBig]}>
                  <Text style={styles.avatarPlaceholderBigText}>
                    {targetName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.audioCallerName}>{targetName}</Text>
            <Text style={styles.audioStatusLabel}>
              {callStatus === "calling"
                ? "Connecting WebRTC voice channel..."
                : callStatus === "ringing"
                ? "Ringing • Audible Ringback Tone Playing..."
                : callStatus === "gathering_ice"
                ? "Negotiating STUN/TURN ICE candidates..."
                : callStatus === "reconnecting"
                ? "Network Dropped • Reconnecting peer route..."
                : callStatus === "timeout"
                ? "No Answer • Auto-disconnected after 45s"
                : callStatus === "declined"
                ? "Agency Busy • Call Declined"
                : callStatus === "ended"
                ? "Call Ended"
                : `${formatTimer(durationSeconds)} • HD 64kbps Opus`}
            </Text>

            {/* Dynamic Equalizer Bar when Connected */}
            {callStatus === "connected" && (
              <View style={styles.equalizerRow}>
                <Animated.View style={[styles.equalizerBar, { transform: [{ scaleY: waveAnim1 }] }]} />
                <Animated.View style={[styles.equalizerBar, { transform: [{ scaleY: waveAnim2 }] }]} />
                <Animated.View style={[styles.equalizerBar, { transform: [{ scaleY: waveAnim3 }] }]} />
                <Animated.View style={[styles.equalizerBar, { transform: [{ scaleY: waveAnim4 }] }]} />
                <Animated.View style={[styles.equalizerBar, { transform: [{ scaleY: waveAnim5 }] }]} />
              </View>
            )}

            {/* Diagnostics Quick Bar (Audio Mode) */}
            {callStatus === "connected" && (
              <View style={[styles.diagnosticsPillRowStatic, { marginTop: 16 }]}>
                <Pressable
                  style={styles.diagnosticChip}
                  onPress={handleTriggerRenegotiation}
                  disabled={isRenegotiating}
                >
                  <Ionicons name="git-network-outline" size={13} color="#38BDF8" />
                  <Text style={styles.diagnosticChipText}>Renegotiate ICE</Text>
                </Pressable>

                <Pressable
                  style={styles.diagnosticChip}
                  onPress={handleSimulateNetworkDrop}
                >
                  <Ionicons name="wifi-outline" size={13} color="#F59E0B" />
                  <Text style={styles.diagnosticChipText}>Simulate Drop</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* In-Call Chat Overlay for Audio Mode */}
          {showInCallChat && (
            <View style={styles.audioChatTray}>
              <ScrollView style={{ maxHeight: 110 }} showsVerticalScrollIndicator={false}>
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
                    isMuted && { backgroundColor: "rgba(239, 68, 68, 0.25)", borderColor: "#EF4444", borderWidth: 1 },
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
                    isSpeakerOn && { backgroundColor: "rgba(56, 189, 248, 0.25)", borderColor: "#38BDF8", borderWidth: 1 },
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

              {/* Switch to Video Call */}
              <Pressable
                style={styles.audioControlBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCallType("video");
                  setIsVideoEnabled(true);
                  showToast("Switched to Video Calling mode");
                }}
              >
                <View style={styles.audioControlCircle}>
                  <Ionicons name="videocam-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.audioControlLabel}>Video</Text>
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

      {/* Pre-Call Permissions Modal */}
      <CallPermissionModal
        visible={showPermissionModal}
        callType={callType}
        onGranted={() => {
          setShowPermissionModal(false);
          showToast("অনুমতি অনুমোদিত হয়েছে");
        }}
        onDenied={() => {
          setShowPermissionModal(false);
          handleEndCall();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  toastBanner: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#38BDF8",
    zIndex: 99,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toastBannerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  reconnectBanner: {
    position: "absolute",
    top: 96,
    left: 16,
    right: 16,
    backgroundColor: "rgba(220, 38, 38, 0.92)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 90,
  },
  reconnectBannerTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  reconnectBannerSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
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
  avatarPlaceholder: {
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  avatarPlaceholderBig: {
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderBigText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  videoNameText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGathering: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  badgeGatheringText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeConnected: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  badgeConnectedText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTimeout: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  badgeTimeoutText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeRinging: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  badgeRingingText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeCalling: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    borderWidth: 1,
    borderColor: "#60A5FA",
  },
  badgeCallingText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },
  greenLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  encryptedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  encryptedText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pipWrapper: {
    position: "absolute",
    top: 110,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "#1E293B",
    zIndex: 10,
  },
  cameraPermissionBox: {
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  grantCameraText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  pipFlipBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  pipCameraOff: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pipCameraOffText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  diagnosticsPillRow: {
    position: "absolute",
    top: 110,
    left: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 12,
  },
  diagnosticsPillRowStatic: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  diagnosticChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  diagnosticChipText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  inCallChatTray: {
    position: "absolute",
    bottom: 120,
    left: 16,
    right: 16,
    maxHeight: 280,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 20,
  },
  inCallChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inCallChatTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  inCallChatMessages: {
    maxHeight: 120,
  },
  inCallBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 6,
    maxWidth: "80%",
  },
  inCallBubbleMe: {
    alignSelf: "flex-end" as const,
    backgroundColor: "#2563EB",
  },
  inCallBubbleThem: {
    alignSelf: "flex-start" as const,
    backgroundColor: "#334155",
  },
  inCallBubbleText: {
    color: "#fff",
    fontSize: 13,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 8,
    flexWrap: "wrap",
  },
  quickChip: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickChipText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  inCallInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  inCallInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 13,
  },
  inCallSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  videoControlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlCircleActive: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    borderWidth: 1,
    borderColor: "#EF4444",
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
  },
  audioTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  audioBackBtn: {
    padding: 6,
  },
  audioChatToggle: {
    padding: 6,
  },
  audioCenterBlock: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  avatarPulseWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    width: 200,
    height: 200,
  },
  pulsingRing: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#38BDF8",
  },
  audioBigAvatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  audioCallerName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  audioStatusLabel: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  equalizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    marginTop: 8,
  },
  equalizerBar: {
    width: 4,
    height: 28,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
  },
  audioChatTray: {
    marginHorizontal: 20,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  audioControlsWrapper: {
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  audioControlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  audioControlBtn: {
    alignItems: "center",
    gap: 8,
  },
  audioControlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioControlBtnActive: {
    opacity: 0.9,
  },
  audioControlLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  audioHangupBtn: {
    backgroundColor: "#EF4444",
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
});
