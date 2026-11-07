import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "../utils/safeExpoAv";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useDataSaver } from "../store/settingsStore";
import { FONTS } from "../theme/typography";

export type VideoQuality = "auto" | "1080p" | "720p" | "data_saver";

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  bn: string;
  en: string;
}

export const DEFAULT_TRAVEL_SUBTITLES: SubtitleCue[] = [
  {
    startMs: 0,
    endMs: 6000,
    bn: "স্বপ্নযাত্রায় স্বাগতম — অন্বেষণ করুন বাংলার অপরূপ সৌন্দর্য।",
    en: "Welcome to Shopno Jatra — Explore the wonders of Bangladesh.",
  },
  {
    startMs: 6000,
    endMs: 14000,
    bn: "সবুজ পাহাড়, নীল জলরাশি আর মেঘের উপত্যকায় শান্তির পরশ।",
    en: "Tranquil green hills, azure waters, and valleys of clouds.",
  },
  {
    startMs: 14000,
    endMs: 22000,
    bn: "স্থানীয় ঐতিহ্য, সংস্কৃতি ও সুস্বাদু খাবারের অনন্য অভিজ্ঞতা।",
    en: "Immerse yourself in local heritage, culture, and cuisine.",
  },
  {
    startMs: 22000,
    endMs: 32000,
    bn: "আপনার প্রতিটি ভ্রমণ হোক নিরাপদ, স্বাচ্ছন্দ্যময় ও স্মরণীয়।",
    en: "May every journey be safe, comfortable, and unforgettable.",
  },
];

interface TravelVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  height?: number;
  borderRadius?: number;
  autoPlay?: boolean;
  subtitles?: SubtitleCue[];
}

export function TravelVideoPlayer({
  videoUrl,
  posterUrl,
  height = 240,
  borderRadius = 12,
  autoPlay = false,
  subtitles = DEFAULT_TRAVEL_SUBTITLES,
}: TravelVideoPlayerProps) {
  const globalDataSaver = useDataSaver();
  const videoRef = useRef<Video>(null);
  const fullscreenVideoRef = useRef<Video>(null);

  // Quality & Data Saver State
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>(
    globalDataSaver ? "data_saver" : "auto"
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Subtitle State ('bn' | 'en' | 'off')
  const [subtitleMode, setSubtitleMode] = useState<"bn" | "en" | "off">("bn");
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");

  // Playback & Buffering State
  const effectiveAutoPlay = globalDataSaver || selectedQuality === "data_saver" ? false : autoPlay;
  const [isPlaying, setIsPlaying] = useState(effectiveAutoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(effectiveAutoPlay);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUserTapped, setHasUserTapped] = useState(effectiveAutoPlay);

  // Sync subtitle cue based on position
  useEffect(() => {
    if (subtitleMode === "off" || !subtitles || subtitles.length === 0) {
      setCurrentSubtitle("");
      return;
    }

    const activeCue = subtitles.find(
      (cue) => positionMillis >= cue.startMs && positionMillis < cue.endMs
    );

    if (activeCue) {
      setCurrentSubtitle(subtitleMode === "bn" ? activeCue.bn : activeCue.en);
    } else {
      setCurrentSubtitle("");
    }
  }, [positionMillis, subtitleMode, subtitles]);

  const handleTogglePlay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasUserTapped(true);
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

  const handleCycleSubtitles = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubtitleMode((prev) => {
      if (prev === "bn") return "en";
      if (prev === "en") return "off";
      return "bn";
    });
  };

  const handleSelectQuality = (q: VideoQuality) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedQuality(q);
    setShowQualityMenu(false);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setIsLoading(false);
        setIsBuffering(false);
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis || 0);

    // Track buffering state
    const buffering = (status as any).isBuffering ?? false;
    setIsBuffering(buffering);

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
        <Text style={styles.errorText}>ভিডিও ফরম্যাট সমর্থিত নয় (Video format unsupported)</Text>
      </View>
    );
  }

  const isDataSaverActive = globalDataSaver || selectedQuality === "data_saver";

  const getQualityBadgeLabel = () => {
    switch (selectedQuality) {
      case "1080p":
        return "1080p HD";
      case "720p":
        return "720p";
      case "data_saver":
        return "ডাটা সেভার";
      case "auto":
      default:
        return "অটো";
    }
  };

  return (
    <View style={[styles.container, { height, borderRadius }]}>
      {/* Video View */}
      {(!isDataSaverActive || hasUserTapped) && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          posterSource={posterUrl ? { uri: posterUrl } : undefined}
          usePoster={!!posterUrl}
          posterStyle={{ resizeMode: "cover" }}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isPlaying}
          isMuted={isMuted}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Gradient Bottom Vignette */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Loading Spinner */}
      {isLoading && hasUserTapped && !isBuffering && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Buffering Indicator ("বাফার হচ্ছে...") */}
      {isBuffering && (
        <View style={styles.bufferingPill} pointerEvents="none">
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.bufferingText}>বাফার হচ্ছে...</Text>
        </View>
      )}

      {/* Center Play/Pause Touch Target */}
      <Pressable style={styles.centerTouchOverlay} onPress={handleTogglePlay}>
        {!isPlaying && (!isLoading || !hasUserTapped) && (
          <View style={styles.playButtonBadge}>
            <Ionicons name="play" size={28} color="#fff" style={{ marginStart: 3 }} />
          </View>
        )}
      </Pressable>

      {/* Top Left Badges: Video Badge + Data Saver Indicator */}
      <View style={styles.topLeftBadgeRow}>
        <View style={styles.videoBadge}>
          <Ionicons name="videocam" size={12} color="#fff" />
          <Text style={styles.videoBadgeText}>VIDEO</Text>
        </View>
        {isDataSaverActive && (
          <View style={styles.dataSaverBadge}>
            <Ionicons name="cellular-outline" size={11} color="#FEF3C7" />
            <Text style={styles.dataSaverText}>ডাটা সেভার (ট্যাপে প্লে)</Text>
          </View>
        )}
      </View>

      {/* Top Right Controls: CC (Subtitles) + Quality + Mute + Fullscreen */}
      <View style={styles.topRightControls}>
        {/* Subtitles Button */}
        <Pressable
          style={[styles.controlPill, subtitleMode !== "off" && styles.controlPillActive]}
          onPress={handleCycleSubtitles}
          accessibilityLabel="Toggle subtitles"
        >
          <Text
            style={[
              styles.ccText,
              { color: subtitleMode !== "off" ? "#38bdf8" : "#fff" },
            ]}
          >
            {subtitleMode === "bn" ? "বাং" : subtitleMode === "en" ? "EN" : "CC"}
          </Text>
        </Pressable>

        {/* Quality Selector Button */}
        <Pressable
          style={styles.controlPill}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowQualityMenu((v) => !v);
          }}
          accessibilityLabel="Video quality options"
        >
          <Ionicons name="settings-outline" size={14} color="#fff" />
        </Pressable>

        {/* Mute Button */}
        <Pressable style={styles.controlPill} onPress={handleToggleMute}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#fff"
          />
        </Pressable>

        {/* Fullscreen Button */}
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

      {/* Quality Picker Dropdown Menu */}
      {showQualityMenu && (
        <View style={styles.qualityDropdown}>
          <Text style={styles.qualityDropdownTitle}>ভিডিও কোয়ালিটি</Text>
          {(
            [
              { id: "auto", label: "অটো (স্বয়ংক্রিয়)", note: "নেটওয়ার্ক অনুযায়ী" },
              { id: "1080p", label: "১০৮০p (Full HD)", note: "সর্বোচ্চ স্পষ্টতা" },
              { id: "720p", label: "৭২০p (HD)", note: "স্ট্যান্ডার্ড HD" },
              { id: "data_saver", label: "ডাটা সেভার (৩৬০p)", note: "মেগাবাইট সাশ্রয়ী" },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.qualityItem,
                selectedQuality === item.id && styles.qualityItemActive,
              ]}
              onPress={() => handleSelectQuality(item.id)}
            >
              <View style={styles.qualityItemLeft}>
                <Ionicons
                  name={
                    selectedQuality === item.id
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={15}
                  color={selectedQuality === item.id ? "#38bdf8" : "#94a3b8"}
                />
                <Text
                  style={[
                    styles.qualityItemLabel,
                    selectedQuality === item.id && styles.qualityItemLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <Text style={styles.qualityItemNote}>{item.note}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Subtitle Banner (বাংলা / English) */}
      {subtitleMode !== "off" && currentSubtitle ? (
        <View style={styles.subtitleContainer} pointerEvents="none">
          <View style={styles.subtitlePill}>
            <Text style={styles.subtitleText}>{currentSubtitle}</Text>
          </View>
        </View>
      ) : null}

      {/* Bottom Progress Bar & Time */}
      <View style={styles.bottomBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {formatTime(positionMillis)} / {formatTime(durationMillis)}
          </Text>
          <View style={styles.bottomStatusRow}>
            <Text style={styles.activeQualityLabel}>{getQualityBadgeLabel()}</Text>
            <Pressable onPress={handleTogglePlay} hitSlop={8}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={14}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Fullscreen Video Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <Video
            ref={fullscreenVideoRef}
            source={{ uri: videoUrl }}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={isPlaying} // Respects current pause/play status; no auto-play when paused!
            isMuted={isMuted}
            style={StyleSheet.absoluteFillObject}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          />

          {/* Fullscreen Buffering Indicator */}
          {isBuffering && (
            <View style={styles.fullscreenBufferingPill} pointerEvents="none">
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text style={styles.bufferingText}>বাফার হচ্ছে...</Text>
            </View>
          )}

          {/* Fullscreen Subtitle Display */}
          {subtitleMode !== "off" && currentSubtitle ? (
            <View style={styles.fullscreenSubtitleContainer} pointerEvents="none">
              <View style={styles.subtitlePillLarge}>
                <Text style={styles.subtitleTextLarge}>{currentSubtitle}</Text>
              </View>
            </View>
          ) : null}

          {/* Top Controls in Fullscreen */}
          <View style={styles.fullscreenTopBar}>
            <View style={styles.fullscreenBadges}>
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={12} color="#fff" />
                <Text style={styles.videoBadgeText}>VIDEO</Text>
              </View>
              <Text style={styles.fullscreenQualityText}>{getQualityBadgeLabel()}</Text>
            </View>

            <View style={styles.fullscreenActionRow}>
              {/* CC Toggle in Fullscreen */}
              <Pressable
                style={[styles.controlPill, subtitleMode !== "off" && styles.controlPillActive]}
                onPress={handleCycleSubtitles}
              >
                <Text
                  style={[
                    styles.ccText,
                    { color: subtitleMode !== "off" ? "#38bdf8" : "#fff" },
                  ]}
                >
                  {subtitleMode === "bn" ? "বাং" : subtitleMode === "en" ? "EN" : "CC"}
                </Text>
              </Pressable>

              {/* Mute in Fullscreen */}
              <Pressable style={styles.controlPill} onPress={handleToggleMute}>
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={18}
                  color="#fff"
                />
              </Pressable>

              {/* Close Fullscreen */}
              <Pressable
                style={styles.fullscreenCloseBtn}
                onPress={() => setIsFullscreen(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Fullscreen Center Touch Play/Pause */}
          <Pressable style={styles.centerTouchOverlay} onPress={handleTogglePlay}>
            {!isPlaying && !isBuffering && (
              <View style={styles.playButtonBadgeLarge}>
                <Ionicons name="play" size={38} color="#fff" style={{ marginStart: 4 }} />
              </View>
            )}
          </Pressable>

          {/* Fullscreen Bottom Progress */}
          <View style={styles.fullscreenBottomBar}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>
                {formatTime(positionMillis)} / {formatTime(durationMillis)}
              </Text>
              <Pressable onPress={handleTogglePlay} hitSlop={10}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonBadgeLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  bufferingPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    zIndex: 10,
  },
  bufferingText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontFamily: FONTS.bengali.medium,
  },
  fullscreenBufferingPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    zIndex: 10,
  },
  subtitleContainer: {
    position: "absolute",
    bottom: 34,
    left: 12,
    right: 12,
    alignItems: "center",
    zIndex: 5,
  },
  subtitlePill: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: "94%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  subtitleText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: FONTS.bengali.medium,
    textAlign: "center",
    lineHeight: 17,
  },
  fullscreenSubtitleContainer: {
    position: "absolute",
    bottom: 74,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 5,
  },
  subtitlePillLarge: {
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  subtitleTextLarge: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: FONTS.bengali.semiBold,
    textAlign: "center",
    lineHeight: 22,
  },
  topLeftBadgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 6,
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dataSaverBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217, 119, 6, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  dataSaverText: {
    color: "#FEF3C7",
    fontSize: 10,
    fontFamily: FONTS.bengali.bold,
  },
  topRightControls: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 6,
  },
  controlPill: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  controlPillActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(14, 165, 233, 0.25)",
  },
  ccText: {
    fontSize: 10,
    fontFamily: FONTS.bengali.bold,
  },
  qualityDropdown: {
    position: "absolute",
    top: 48,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 20,
    minWidth: 210,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  qualityDropdownTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: FONTS.bengali.bold,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  qualityItem: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginVertical: 2,
  },
  qualityItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  qualityItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qualityItemLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontFamily: FONTS.bengali.medium,
  },
  qualityItemLabelActive: {
    color: "#38bdf8",
    fontFamily: FONTS.bengali.bold,
  },
  qualityItemNote: {
    color: "#64748b",
    fontSize: 10,
    marginStart: 23,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1.5,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#287dfa",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  bottomStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeQualityLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontFamily: FONTS.bengali.medium,
  },
  errorText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 8,
    fontFamily: FONTS.bengali.medium,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenTopBar: {
    position: "absolute",
    top: 44,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  fullscreenBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullscreenQualityText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontFamily: FONTS.bengali.medium,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullscreenActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fullscreenCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  fullscreenBottomBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 10,
  },
});
