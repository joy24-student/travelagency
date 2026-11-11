import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode, Audio } from "../utils/safeExpoAv";
import { CallPermissionModal } from "./call/CallPermissionModal";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { FriendProfile } from "../services/repositories/friends";
import { callsRepository } from "../services/repositories/calls";


export interface ActiveCallState {
  callId?: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  status: "incoming" | "outgoing" | "connected";
  otherUser: FriendProfile;
}

interface CallModalProps {
  callState: ActiveCallState | null;
  onClose: () => void;
}

export function CallModal({ callState, onClose }: CallModalProps) {
  if (!callState) return null;

  const { callType, otherUser, status: initialStatus } = callState;

  const [callStatus, setCallStatus] = useState<"incoming" | "outgoing" | "connected">(
    initialStatus
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [cameraFacing, setCameraFacing] = useState<CameraType>("front");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Verify Audio and Video permissions
  useEffect(() => {
    let isMounted = true;
    async function checkPermissions() {
      try {
        const mic = await Audio.checkMicrophonePermissionAsync();
        const cam = callType === "video" ? permission?.granted ?? false : true;
        if ((!mic.granted || !cam) && isMounted) {
          setShowPermissionModal(true);
        }
      } catch (e) {
        console.warn("[CallModal] Permission check error:", e);
      }
    }
    checkPermissions();
    return () => {
      isMounted = false;
    };
  }, [callType, permission?.granted]);

  // Animation for ringing pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ringing / pulsing loop
  useEffect(() => {
    if (callStatus !== "connected") {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [callStatus]);

  // If outgoing, automatically simulate answer after 3 seconds for smooth interactive demo
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (callStatus === "outgoing") {
      timeout = setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCallStatus("connected");
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [callStatus]);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAcceptCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCallStatus("connected");
  };

  const handleEndCall = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      if (callState.callId) {
        await callsRepository.updateCallLog(
          callState.callId,
          callStatus === "connected" ? "completed" : "missed",
          durationSeconds
        );
      }
    } catch (e) {
      console.warn("End call log error:", e);
    }
    onClose();
  };

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  return (
    <Modal
      visible={!!callState}
      animationType="slide"
      transparent={false}
      onRequestClose={handleEndCall}
    >
      <View style={styles.container}>
        {/* =================================================================== */}
        {/* VIDEO CALL MODE */}
        {/* =================================================================== */}
        {callType === "video" && callStatus === "connected" ? (
          <View style={styles.videoStreamContainer}>
            {/* Remote Stream Video */}
            <Video
              source={{
                uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
              }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay
              isMuted={!isSpeakerOn}
            />

            {/* Remote User Top Info Overlay */}
            <LinearGradient
              colors={["rgba(0,0,0,0.7)", "transparent"]}
              style={styles.videoTopOverlay}
            >
              <View style={styles.videoUserInfoRow}>
                <Image
                  source={{ uri: otherUser.avatar_url }}
                  style={styles.videoUserMiniAvatar}
                />
                <View>
                  <Text style={styles.videoUserName}>{otherUser.display_name}</Text>
                  <View style={styles.videoLiveBadgeRow}>
                    <View style={styles.liveGreenDot} />
                    <Text style={styles.videoDurationText}>
                      {formatDuration(durationSeconds)} • HD 1080p
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Local Selfie PIP Camera */}
            {isVideoEnabled && (
              <View style={styles.pipCameraContainer}>
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
                <Pressable
                  style={styles.pipFlipBtn}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={16} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Video Call Action Controls */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.85)"]}
              style={styles.videoBottomControls}
            >
              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={[styles.callControlCircle, isMuted && styles.callControlActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsMuted(!isMuted);
                  }}
                >
                  <Ionicons
                    name={isMuted ? "mic-off" : "mic"}
                    size={24}
                    color="#fff"
                  />
                </Pressable>

                <Pressable
                  style={[
                    styles.callControlCircle,
                    !isVideoEnabled && styles.callControlActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsVideoEnabled(!isVideoEnabled);
                  }}
                >
                  <Ionicons
                    name={isVideoEnabled ? "videocam" : "videocam-off"}
                    size={24}
                    color="#fff"
                  />
                </Pressable>

                <Pressable
                  style={styles.callControlCircle}
                  onPress={toggleCameraFacing}
                >
                  <Ionicons name="camera-reverse" size={24} color="#fff" />
                </Pressable>

                <Pressable
                  style={[styles.callControlCircle, isSpeakerOn && styles.callControlActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsSpeakerOn(!isSpeakerOn);
                  }}
                >
                  <Ionicons
                    name={isSpeakerOn ? "volume-high" : "volume-mute"}
                    size={24}
                    color="#fff"
                  />
                </Pressable>

                <Pressable
                  style={[styles.callControlCircle, styles.hangupCircle]}
                  onPress={handleEndCall}
                >
                  <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        ) : (
          /* =================================================================== */
          /* AUDIO CALL MODE OR RINGING STATE */
          /* =================================================================== */
          <LinearGradient
            colors={["#0f172a", "#1e1b4b", "#0f172a"]}
            style={styles.audioContainer}
          >
            {/* Top Back / Minimize */}
            <Pressable style={styles.minimizeBtn} onPress={onClose}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>

            {/* Caller Profile Header */}
            <View style={styles.audioCenterContent}>
              <View style={styles.avatarRingsWrapper}>
                {callStatus !== "connected" && (
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        transform: [{ scale: pulseAnim }],
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.25],
                          outputRange: [0.6, 0.1],
                        }),
                      },
                    ]}
                  />
                )}
                <Image
                  source={{ uri: otherUser.avatar_url }}
                  style={styles.audioBigAvatar}
                />
              </View>

              <Text style={styles.audioCallerName}>{otherUser.display_name}</Text>
              <Text style={styles.audioCallTypeLabel}>
                {callType === "video" ? "Messenger Video Call" : "Messenger Audio Call"}
              </Text>

              <Text style={styles.audioStatusText}>
                {callStatus === "incoming"
                  ? "Incoming call..."
                  : callStatus === "outgoing"
                  ? "Ringing..."
                  : formatDuration(durationSeconds)}
              </Text>
            </View>

            {/* Bottom Controls */}
            {callStatus === "incoming" ? (
              <View style={styles.incomingButtonsRow}>
                <Pressable
                  style={[styles.largeCallBtn, styles.declineBtn]}
                  onPress={handleEndCall}
                >
                  <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
                  <Text style={styles.callBtnText}>Decline</Text>
                </Pressable>

                <Pressable
                  style={[styles.largeCallBtn, styles.acceptBtn]}
                  onPress={handleAcceptCall}
                >
                  <Ionicons name="call" size={32} color="#fff" />
                  <Text style={styles.callBtnText}>Accept</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.audioActionControls}>
                <View style={styles.actionButtonsRow}>
                  <Pressable
                    style={[styles.callControlCircle, isMuted && styles.callControlActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsMuted(!isMuted);
                    }}
                  >
                    <Ionicons
                      name={isMuted ? "mic-off" : "mic"}
                      size={24}
                      color="#fff"
                    />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.callControlCircle,
                      isSpeakerOn && styles.callControlActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsSpeakerOn(!isSpeakerOn);
                    }}
                  >
                    <Ionicons
                      name={isSpeakerOn ? "volume-high" : "volume-mute"}
                      size={24}
                      color="#fff"
                    />
                  </Pressable>

                  <Pressable
                    style={[styles.callControlCircle, styles.hangupCircle]}
                    onPress={handleEndCall}
                  >
                    <Ionicons
                      name="call"
                      size={28}
                      color="#fff"
                      style={{ transform: [{ rotate: "135deg" }] }}
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </LinearGradient>
        )}
      </View>

      <CallPermissionModal
        visible={showPermissionModal}
        callType={callType}
        onGranted={() => setShowPermissionModal(false)}
        onDenied={() => {
          setShowPermissionModal(false);
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoStreamContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoTopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 10,
  },
  videoUserInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoUserMiniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  videoUserName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  videoLiveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  videoDurationText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
  },
  pipCameraContainer: {
    position: "absolute",
    top: 110,
    right: 16,
    width: 100,
    minHeight: 140,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "#1e293b",
    zIndex: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
  videoBottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 24,
    zIndex: 10,
  },
  audioContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  minimizeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioCenterContent: {
    alignItems: "center",
  },
  avatarRingsWrapper: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#3b82f6",
  },
  audioBigAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
  },
  audioCallerName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },
  audioCallTypeLabel: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 12,
  },
  audioStatusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#38bdf8",
  },
  incomingButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  largeCallBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  declineBtn: {
    backgroundColor: "#ef4444",
  },
  acceptBtn: {
    backgroundColor: "#22c55e",
  },
  callBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  audioActionControls: {
    alignItems: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  callControlCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  callControlActive: {
    backgroundColor: "#3b82f6",
  },
  hangupCircle: {
    backgroundColor: "#ef4444",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});

