import React, { useState, useEffect, useRef } from "react";
import { Platform,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  soundscapeService,
  AudioEngineState,
  SoundscapeTrack,
} from "../../services/audio/soundscapeService";
import { useTheme } from "../../context/ThemeContext";
import { FONTS } from "../../theme/typography";
import { SoundscapePlayer } from "./SoundscapePlayer";

interface AudioMiniBarProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export function AudioMiniBar({ onVisibilityChange }: AudioMiniBarProps) {
  const { colors, isDark } = useTheme();
  const [engineState, setEngineState] = useState<AudioEngineState>(
    soundscapeService.getState()
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Equalizer animation bars
  const barAnim1 = useRef(new Animated.Value(4)).current;
  const barAnim2 = useRef(new Animated.Value(10)).current;
  const barAnim3 = useRef(new Animated.Value(6)).current;

  // Slide-up entrance animation
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = soundscapeService.subscribe((state) => {
      setEngineState(state);
      // Auto-restore visibility if a new track starts playing
      if (state.isPlaying && isDismissed) {
        setIsDismissed(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isDismissed]);

  // Animate Equalizer bars
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (engineState.isPlaying && !engineState.isBuffering) {
      const createBar = (val: Animated.Value, max: number, duration: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: max,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: 3,
              duration,
              useNativeDriver: false,
            }),
          ])
        );

      loop = Animated.parallel([
        createBar(barAnim1, 14, 300),
        createBar(barAnim2, 18, 420),
        createBar(barAnim3, 12, 360),
      ]);
      loop.start();
    } else {
      barAnim1.setValue(4);
      barAnim2.setValue(6);
      barAnim3.setValue(4);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [engineState.isPlaying, engineState.isBuffering]);

  // Entrance animation when active track is available
  const hasActiveTrack = !!engineState.currentTrack;
  const isVisible = hasActiveTrack && !isDismissed;

  useEffect(() => {
    onVisibilityChange?.(isVisible);
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!hasActiveTrack || isDismissed) {
    return null;
  }

  const track: SoundscapeTrack = engineState.currentTrack!;

  const handleTogglePlay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await soundscapeService.togglePlayPause();
  };

  const handleToggleMute = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (engineState.volume > 0) {
      await soundscapeService.setVolume(0);
    } else {
      await soundscapeService.setVolume(engineState.preDuckVolume || 0.8);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDismissed(true);
  };

  const progressPercent =
    engineState.durationMillis > 0
      ? (engineState.positionMillis / engineState.durationMillis) * 100
      : 0;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(226, 232, 240, 0.9)",
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Subtle top progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.innerTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsExpanded(true);
          }}
          accessibilityLabel={`Currently playing soundscape: ${track.title}. Tap to open full player.`}
        >
          {/* Destination Thumbnail with Equalizer Overlay */}
          <View style={styles.thumbWrapper}>
            <Image source={{ uri: track.imageUrl }} style={styles.thumbImage} />
            {engineState.isPlaying && (
              <View style={styles.equalizerOverlay}>
                <Animated.View style={[styles.eqBar, { height: barAnim1 }]} />
                <Animated.View style={[styles.eqBar, { height: barAnim2 }]} />
                <Animated.View style={[styles.eqBar, { height: barAnim3 }]} />
              </View>
            )}
          </View>

          {/* Track Information */}
          <View style={styles.infoWrapper}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.trackTitle,
                  { color: isDark ? "#f8fafc" : "#0f172a" },
                ]}
                numberOfLines={1}
              >
                {track.title}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons
                name="location-sharp"
                size={11}
                color={colors.primary}
                style={{ marginTop: 1 }}
              />
              <Text
                style={[
                  styles.destinationName,
                  { color: isDark ? "#94a3b8" : "#64748b" },
                ]}
                numberOfLines={1}
              >
                {track.destinationName} •{" "}
                {engineState.playbackMode === "ambient" ? "অ্যাম্বিয়েন্ট" : "আঞ্চলিক গান"}
              </Text>
            </View>
          </View>

          {/* Action Buttons: Play/Pause, Mute, Close */}
          <View style={styles.controlsWrapper}>
            {/* Play/Pause Button */}
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleTogglePlay}
              hitSlop={6}
              accessibilityLabel={engineState.isPlaying ? "Pause audio" : "Play audio"}
            >
              <Ionicons
                name={engineState.isPlaying ? "pause" : "play"}
                size={16}
                color="#ffffff"
                style={!engineState.isPlaying ? { marginStart: 1.5 } : undefined}
              />
            </Pressable>

            {/* Mute Button */}
            <Pressable
              style={styles.iconBtn}
              onPress={handleToggleMute}
              hitSlop={6}
              accessibilityLabel={engineState.volume === 0 ? "Unmute" : "Mute"}
            >
              <Ionicons
                name={engineState.volume === 0 ? "volume-mute" : "volume-medium-outline"}
                size={18}
                color={isDark ? "#94a3b8" : "#64748b"}
              />
            </Pressable>

            {/* Dismiss Button */}
            <Pressable
              style={styles.iconBtn}
              onPress={handleDismiss}
              hitSlop={8}
              accessibilityLabel="Dismiss mini player"
            >
              <Ionicons
                name="close"
                size={18}
                color={isDark ? "#94a3b8" : "#94a3b8"}
              />
            </Pressable>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Full Expanded Soundscape Modal if opened from Mini Bar */}
      {isExpanded && (
        <SoundscapePlayer
          bottomOffset={0}
          initialCollapsed={false}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.15)" } : {}),
  },
  progressBarBg: {
    height: 2.5,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
  },
  innerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  thumbWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1e293b",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  equalizerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2.5,
    paddingBottom: 4,
  },
  eqBar: {
    width: 3,
    backgroundColor: "#38bdf8",
    borderRadius: 1.5,
  },
  infoWrapper: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackTitle: {
    fontSize: 13,
    fontFamily: FONTS.bengali.bold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  destinationName: {
    fontSize: 11,
    fontFamily: FONTS.bengali.medium,
  },
  controlsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
