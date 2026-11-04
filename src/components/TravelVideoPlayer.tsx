import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "../utils/safeExpoAv";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TravelVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  height?: number;
  borderRadius?: number;
  autoPlay?: boolean;
}

export function TravelVideoPlayer({
  videoUrl,
  posterUrl,
  height = 240,
  borderRadius = 12,
  autoPlay = false,
}: TravelVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const fullscreenVideoRef = useRef<Video>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleTogglePlay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const handleToggleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    await videoRef.current.setIsMutedAsync(nextMute);
    setIsMuted(nextMute);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis || 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercent = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  if (hasError) {
    return (
      <View style={[styles.container, { height, borderRadius, backgroundColor: "#1e293b" }]}>
        <Ionicons name="videocam-off-outline" size={36} color="#94a3b8" />
        <Text style={styles.errorText}>Video format unsupported</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, borderRadius }]}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        posterSource={posterUrl ? { uri: posterUrl } : undefined}
        usePoster={!!posterUrl}
        posterStyle={{ resizeMode: "cover" }}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={autoPlay}
        isMuted={isMuted}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Gradient Bottom Vignette */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Center Play/Pause Touch Target */}
      <Pressable style={styles.centerTouchOverlay} onPress={handleTogglePlay}>
        {!isPlaying && !isLoading && (
          <View style={styles.playButtonBadge}>
            <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        )}
      </Pressable>

      {/* Top Left Video Badge */}
      <View style={styles.videoBadge}>
        <Ionicons name="videocam" size={12} color="#fff" />
        <Text style={styles.videoBadgeText}>VIDEO</Text>
      </View>

      {/* Top Right Controls (Mute / Fullscreen) */}
      <View style={styles.topRightControls}>
        <Pressable style={styles.controlPill} onPress={handleToggleMute}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#fff"
          />
        </Pressable>

        <Pressable
          style={styles.controlPill}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsFullscreen(true);
          }}
        >
          <Ionicons name="expand" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom Progress Bar & Time */}
      <View style={styles.bottomBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.timeText}>
          {formatTime(positionMillis)} / {formatTime(durationMillis || 30000)}
        </Text>
      </View>

      {/* Fullscreen Video Modal */}
      <Modal visible={isFullscreen} animationType="fade" transparent={false}>
        <View style={styles.fullscreenContainer}>
          <Video
            ref={fullscreenVideoRef}
            source={{ uri: videoUrl }}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={true}
            isMuted={false}
            useNativeControls
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable
            style={styles.fullscreenCloseBtn}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTouchOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  videoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  topRightControls: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0055F2",
    borderRadius: 2,
  },
  timeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  errorText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});

