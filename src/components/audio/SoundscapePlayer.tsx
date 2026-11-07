import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  soundscapeService,
  SOUNDSCAPE_CATALOG,
  SoundscapeTrack,
  AudioEngineState,
  SoundscapeAudioMode,
} from '../../services/audio/soundscapeService';



const triggerHaptics = async (hapticPromise: Promise<any>) => {
  try {
    await hapticPromise;
  } catch (err) {
    if (__DEV__) {
      console.warn("[SoundscapePlayer] Haptics unavailable:", err);
    }
  }
};

interface SoundscapePlayerProps {
  bottomOffset?: number;
  initialCollapsed?: boolean;
}

export function SoundscapePlayer({
  bottomOffset = 64,
  initialCollapsed = false,
}: SoundscapePlayerProps) {
  const insets = useSafeAreaInsets();

  // Engine state synced via subscription
  const [engineState, setEngineState] = useState<AudioEngineState>(
    soundscapeService.getState()
  );

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'player' | 'catalog' | 'offline'>('player');
  const [cacheSummary, setCacheSummary] = useState({
    totalBytes: 0,
    formattedSize: '0 KB',
    cachedTracksCount: 0,
  });

  // Animated equalizer bars (4 bars)
  const barAnim1 = useRef(new Animated.Value(6)).current;
  const barAnim2 = useRef(new Animated.Value(14)).current;
  const barAnim3 = useRef(new Animated.Value(10)).current;
  const barAnim4 = useRef(new Animated.Value(18)).current;

  // Mini-player entrance animation
  const miniPlayerOpacity = useRef(new Animated.Value(1)).current;
  const miniPlayerScale = useRef(new Animated.Value(1)).current;

  // Equalizer loop animation
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (engineState.isPlaying && !engineState.isBuffering) {
      const createBarAnim = (val: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: max,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: min,
              duration,
              useNativeDriver: false,
            }),
          ])
        );
      };

      animLoop = Animated.parallel([
        createBarAnim(barAnim1, 4, 18, 380),
        createBarAnim(barAnim2, 6, 22, 450),
        createBarAnim(barAnim3, 5, 20, 320),
        createBarAnim(barAnim4, 4, 24, 490),
      ]);
      if (process.env.NODE_ENV !== "test") {
        animLoop.start();
      }
    } else {
      barAnim1.setValue(6);
      barAnim2.setValue(8);
      barAnim3.setValue(6);
      barAnim4.setValue(10);
    }

    return () => {
      if (animLoop) {
        animLoop.stop();
      }
    };
  }, [engineState.isPlaying, engineState.isBuffering]);

  // Subscribe to soundscape service updates
  useEffect(() => {
    const unsubscribe = soundscapeService.subscribe((newState) => {
      setEngineState(newState);
    });

    // Refresh cache summary
    soundscapeService.getCacheStorageSummary().then(setCacheSummary);

    return () => {
      unsubscribe();
    };
  }, []);

  // Update cache summary when cached track count changes
  useEffect(() => {
    soundscapeService.getCacheStorageSummary().then(setCacheSummary);
  }, [engineState.cachedTrackIds?.length ?? 0]);

  const currentTrack = engineState.currentTrack || SOUNDSCAPE_CATALOG[0];

  // ==========================================
  // Interactions & Handlers
  // ==========================================

  const handleTogglePlay = async () => {
    await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    await soundscapeService.togglePlayPause();
  };

  const handleModeSwitch = async (mode: SoundscapeAudioMode) => {
    await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await soundscapeService.setPlaybackMode(mode);
  };

  const handleVolumeChange = async (newVol: number) => {
    await soundscapeService.setVolume(newVol);
  };

  const handleToggleMute = async () => {
    await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    if (engineState.volume > 0) {
      await soundscapeService.setVolume(0);
    } else {
      await soundscapeService.setVolume(engineState.preDuckVolume || 0.8);
    }
  };

  const handleSimulateVoiceDucking = async () => {
    await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    if (engineState.isDucked) {
      await soundscapeService.unduckVolume(400);
    } else {
      await soundscapeService.duckVolume(0.2, 300);
      // Automatically unduck after 3 seconds for demonstration
      setTimeout(() => {
        soundscapeService.unduckVolume(400);
      }, 3000);
    }
  };

  const handlePreCacheTrack = async (track: SoundscapeTrack) => {
    await triggerHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await soundscapeService.preCacheSoundscape(
      track.id,
      engineState.playbackMode
    );
    const summary = await soundscapeService.getCacheStorageSummary();
    setCacheSummary(summary);
  };

  const handlePreCacheAll = async () => {
    await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    await soundscapeService.preCacheAllSoundscapes();
    const summary = await soundscapeService.getCacheStorageSummary();
    setCacheSummary(summary);
  };

  const handleSimulateArrival = async (track: SoundscapeTrack) => {
    await triggerHaptics(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    await soundscapeService.simulateUserArrivalAt(track.id);
  };

  // Custom PanResponder for Interactive Volume Bar
  const volumeBarWidth = 380 - 96;
  const volumePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent;
        const clamped = Math.max(0, Math.min(1, locationX / volumeBarWidth));
        handleVolumeChange(clamped);
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const clamped = Math.max(0, Math.min(1, locationX / volumeBarWidth));
        handleVolumeChange(clamped);
      },
    })
  ).current;

  // Format milliseconds to mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // If dismissed, show subtle micro-orb to restore
  if (isDismissed) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
          setIsDismissed(false);
        }}
        style={[
          styles.reopenFloatingPill,
          { bottom: Math.max(16, bottomOffset) + insets.bottom },
        ]}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.reopenGradient}
        >
          <Ionicons name="musical-notes" size={18} color="#ffffff" />
          <Text style={styles.reopenText}>Soundscapes</Text>
          {engineState.isPlaying && (
            <View style={styles.reopenPlayingDot} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const isCurrentTrackCached = engineState.cachedTrackIds.includes(currentTrack.id);
  const isCurrentlyInsideGeofence =
    engineState.activeGeofenceTrack?.id === currentTrack.id;

  return (
    <>
      {/* ========================================================= */}
      {/* 1. FLOATING MINI-PLAYER (Non-intrusive bottom docking)     */}
      {/* ========================================================= */}
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            bottom: Math.max(16, bottomOffset) + insets.bottom,
            opacity: miniPlayerOpacity,
            transform: [{ scale: miniPlayerScale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
            setIsExpanded(true);
          }}
          style={styles.miniCardInner}
        >
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.miniGradientBg}
          >
            {/* Destination Thumbnail with Geo Indicator Badge */}
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: currentTrack.imageUrl }}
                style={styles.thumbnailImage}
              />
              {isCurrentlyInsideGeofence ? (
                <View style={styles.geoPillBadge}>
                  <Text style={styles.geoPillText}>GEO</Text>
                </View>
              ) : isCurrentTrackCached ? (
                <View style={styles.offlinePillBadge}>
                  <Ionicons name="cloud-offline" size={9} color="#ffffff" />
                </View>
              ) : null}
            </View>

            {/* Track Info & Equalizer */}
            <View style={styles.trackDetailsContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.miniTitleText} numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                {engineState.isDucked && (
                  <View style={styles.duckedBadge}>
                    <Text style={styles.duckedBadgeText}>DUCKED</Text>
                  </View>
                )}
              </View>

              <View style={styles.subtitleRow}>
                <Ionicons
                  name="location-sharp"
                  size={12}
                  color={isCurrentlyInsideGeofence ? '#34d399' : '#94a3b8'}
                />
                <Text style={styles.miniSubtitleText} numberOfLines={1}>
                  {currentTrack.destinationName} •{' '}
                  {engineState.playbackMode === 'ambient'
                    ? '🍃 Ambient'
                    : '🎶 Regional Folk'}
                </Text>
              </View>
            </View>

            {/* Pulsing Visual Equalizer */}
            <View style={styles.equalizerContainer}>
              <Animated.View
                style={[styles.equalizerBar, { height: barAnim1 }]}
              />
              <Animated.View
                style={[
                  styles.equalizerBar,
                  { height: barAnim2, backgroundColor: '#38bdf8' },
                ]}
              />
              <Animated.View
                style={[
                  styles.equalizerBar,
                  { height: barAnim3, backgroundColor: '#818cf8' },
                ]}
              />
              <Animated.View
                style={[styles.equalizerBar, { height: barAnim4 }]}
              />
            </View>

            {/* Mini Controls: Play/Pause */}
            <TouchableOpacity
              onPress={handleTogglePlay}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.miniPlayBtn}
            >
              {engineState.isBuffering ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <Ionicons
                  name={engineState.isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#ffffff"
                />
              )}
            </TouchableOpacity>

            {/* Quick Mute Toggle */}
            <TouchableOpacity
              onPress={handleToggleMute}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              style={styles.miniMuteBtn}
            >
              <Ionicons
                name={engineState.volume === 0 ? 'volume-mute' : 'volume-medium'}
                size={18}
                color={engineState.volume === 0 ? '#f87171' : '#94a3b8'}
              />
            </TouchableOpacity>

            {/* Dismiss / Minimize button */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                setIsDismissed(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
              style={styles.miniDismissBtn}
            >
              <Ionicons name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ========================================================= */}
      {/* 2. EXPANDED AUDIO COMMAND CENTER MODAL                    */}
      {/* ========================================================= */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetDragHandle} />
              <View style={styles.sheetTopBar}>
                <TouchableOpacity
                  onPress={() => setIsExpanded(false)}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="chevron-down" size={24} color="#f8fafc" />
                </TouchableOpacity>

                <View style={styles.sheetHeaderTitles}>
                  <Text style={styles.sheetMainTitle}>Spatial Soundscapes</Text>
                  <Text style={styles.sheetSubtitle}>
                    {engineState.autoGeoTriggerEnabled
                      ? '📍 Geo-Fencing Active'
                      : 'Manual Selection'}
                  </Text>
                </View>

                {/* Tab switcher buttons in header */}
                <View style={styles.headerTabsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedTab('player')}
                    style={[
                      styles.headerTabPill,
                      selectedTab === 'player' && styles.headerTabPillActive,
                    ]}
                  >
                    <Ionicons
                      name="musical-note"
                      size={15}
                      color={selectedTab === 'player' ? '#ffffff' : '#94a3b8'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedTab('catalog')}
                    style={[
                      styles.headerTabPill,
                      selectedTab === 'catalog' && styles.headerTabPillActive,
                    ]}
                  >
                    <Ionicons
                      name="compass-outline"
                      size={15}
                      color={selectedTab === 'catalog' ? '#ffffff' : '#94a3b8'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedTab('offline')}
                    style={[
                      styles.headerTabPill,
                      selectedTab === 'offline' && styles.headerTabPillActive,
                    ]}
                  >
                    <Ionicons
                      name="cloud-download-outline"
                      size={15}
                      color={selectedTab === 'offline' ? '#ffffff' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* TAB 1: MASTER PLAYER */}
              {selectedTab === 'player' && (
                <>
                  {/* High-Fidelity Destination Artwork Showcase */}
                  <View style={styles.artworkContainer}>
                    <Image
                      source={{ uri: currentTrack.imageUrl }}
                      style={styles.artworkImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 23, 42, 0.85)', '#0f172a']}
                      style={styles.artworkOverlayGradient}
                    />

                    {/* Geofence Alert Overlay if inside zone */}
                    {isCurrentlyInsideGeofence && (
                      <View style={styles.geofenceActiveBanner}>
                        <Ionicons name="location" size={14} color="#10b981" />
                        <Text style={styles.geofenceActiveBannerText}>
                          Inside Geofence: {currentTrack.destinationName}
                        </Text>
                      </View>
                    )}

                    <View style={styles.artworkMeta}>
                      <View style={styles.tagPillsRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {currentTrack.category.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.districtBadge}>
                          <Text style={styles.districtBadgeText}>
                            {currentTrack.district}
                          </Text>
                        </View>
                        {isCurrentTrackCached && (
                          <View style={styles.cachedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                            <Text style={styles.cachedBadgeText}>Offline Ready</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.artworkTitle}>{currentTrack.title}</Text>
                      <Text style={styles.artworkRegion}>
                        {currentTrack.destinationName} • {currentTrack.region}
                      </Text>
                    </View>
                  </View>

                  {/* Audio Mode Switcher: Ambient vs Regional Music */}
                  <View style={styles.modeSwitcherContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleModeSwitch('ambient')}
                      style={[
                        styles.modeSwitchBtn,
                        engineState.playbackMode === 'ambient' && styles.modeSwitchBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="leaf-outline"
                        size={16}
                        color={engineState.playbackMode === 'ambient' ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.modeSwitchText,
                          engineState.playbackMode === 'ambient' && styles.modeSwitchTextActive,
                        ]}
                      >
                        Ambient Soundscape
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleModeSwitch('regional_music')}
                      style={[
                        styles.modeSwitchBtn,
                        engineState.playbackMode === 'regional_music' &&
                          styles.modeSwitchBtnActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="music-clef-treble"
                        size={16}
                        color={
                          engineState.playbackMode === 'regional_music'
                            ? '#ffffff'
                            : '#94a3b8'
                        }
                      />
                      <Text
                        style={[
                          styles.modeSwitchText,
                          engineState.playbackMode === 'regional_music' &&
                            styles.modeSwitchTextActive,
                        ]}
                      >
                        Regional Folk
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Mode Description Card */}
                  <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionText}>
                      {engineState.playbackMode === 'ambient'
                        ? currentTrack.ambientDescription
                        : currentTrack.regionalMusicDescription}
                    </Text>
                    <Text style={styles.curatorText}>
                      Curated by {currentTrack.curatedBy}
                    </Text>
                  </View>

                  {/* Scrub / Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${
                              engineState.durationMillis > 0
                                ? Math.min(
                                    100,
                                    (engineState.positionMillis /
                                      engineState.durationMillis) *
                                      100
                                  )
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressTimeRow}>
                      <Text style={styles.timeText}>
                        {formatTime(engineState.positionMillis)}
                      </Text>
                      <View style={styles.loopBadgeContainer}>
                        <MaterialCommunityIcons
                          name="repeat"
                          size={13}
                          color="#38bdf8"
                        />
                        <Text style={styles.loopBadgeText}>Infinite Loop</Text>
                      </View>
                      <Text style={styles.timeText}>
                        {formatTime(engineState.durationMillis || 180000)}
                      </Text>
                    </View>
                  </View>

                  {/* Main Playback Controls: Prev / Play / Next */}
                  <View style={styles.primaryControlsRow}>
                    <TouchableOpacity
                      onPress={async () => {
                        await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                        await soundscapeService.playPreviousTrack();
                      }}
                      style={styles.skipBtn}
                    >
                      <Ionicons name="play-skip-back" size={26} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleTogglePlay}
                      style={styles.mainPlayBtn}
                    >
                      <LinearGradient
                        colors={['#2563eb', '#1d4ed8']}
                        style={styles.mainPlayGradient}
                      >
                        {engineState.isBuffering ? (
                          <ActivityIndicator size="large" color="#ffffff" />
                        ) : (
                          <Ionicons
                            name={engineState.isPlaying ? 'pause' : 'play'}
                            size={34}
                            color="#ffffff"
                          />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={async () => {
                        await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                        await soundscapeService.playNextTrack();
                      }}
                      style={styles.skipBtn}
                    >
                      <Ionicons
                        name="play-skip-forward"
                        size={26}
                        color="#cbd5e1"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Interactive Volume Slider */}
                  <View style={styles.volumeControlCard}>
                    <View style={styles.volumeHeaderRow}>
                      <View style={styles.volumeTitleRow}>
                        <Ionicons
                          name={
                            engineState.volume === 0
                              ? 'volume-mute'
                              : engineState.volume < 0.5
                              ? 'volume-low'
                              : 'volume-high'
                          }
                          size={18}
                          color="#38bdf8"
                        />
                        <Text style={styles.volumeTitleText}>
                          Soundscape Volume
                        </Text>
                      </View>
                      <Text style={styles.volumePercentText}>
                        {Math.round(engineState.volume * 100)}%
                      </Text>
                    </View>

                    {/* Touch / Pan Volume Slider Bar */}
                    <View
                      style={styles.sliderTouchArea}
                      {...volumePanResponder.panHandlers}
                    >
                      <View style={styles.sliderTrack}>
                        <LinearGradient
                          colors={['#0284c7', '#38bdf8']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.sliderFill,
                            { width: `${Math.round(engineState.volume * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Quick Preset Buttons & Ducking Simulator */}
                    <View style={styles.presetButtonsRow}>
                      <TouchableOpacity
                        onPress={() => handleVolumeChange(0)}
                        style={[
                          styles.presetPill,
                          engineState.volume === 0 && styles.presetPillActive,
                        ]}
                      >
                        <Text style={styles.presetPillText}>Mute</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleVolumeChange(0.3)}
                        style={[
                          styles.presetPill,
                          Math.abs(engineState.volume - 0.3) < 0.05 &&
                            styles.presetPillActive,
                        ]}
                      >
                        <Text style={styles.presetPillText}>30%</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleVolumeChange(0.6)}
                        style={[
                          styles.presetPill,
                          Math.abs(engineState.volume - 0.6) < 0.05 &&
                            styles.presetPillActive,
                        ]}
                      >
                        <Text style={styles.presetPillText}>60%</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleVolumeChange(1.0)}
                        style={[
                          styles.presetPill,
                          engineState.volume >= 0.95 && styles.presetPillActive,
                        ]}
                      >
                        <Text style={styles.presetPillText}>100%</Text>
                      </TouchableOpacity>

                      {/* Ducking Test Trigger */}
                      <TouchableOpacity
                        onPress={handleSimulateVoiceDucking}
                        style={[
                          styles.duckTestPill,
                          engineState.isDucked && styles.duckTestPillActive,
                        ]}
                      >
                        <Ionicons
                          name="mic-outline"
                          size={12}
                          color={engineState.isDucked ? '#f87171' : '#38bdf8'}
                        />
                        <Text
                          style={[
                            styles.duckTestPillText,
                            engineState.isDucked && styles.duckTestPillTextActive,
                          ]}
                        >
                          {engineState.isDucked ? 'Ducked' : 'Duck (Voice)'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Destination Geofence Trigger Card */}
                  <View style={styles.geofenceCard}>
                    <View style={styles.geofenceCardHeader}>
                      <View style={styles.geofenceTitleRow}>
                        <Ionicons name="radio" size={18} color="#10b981" />
                        <Text style={styles.geofenceCardTitle}>
                          Geo-Trigger Intelligence
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          soundscapeService.setAutoGeoTriggerEnabled(
                            !engineState.autoGeoTriggerEnabled
                          )
                        }
                        style={[
                          styles.autoTriggerToggle,
                          engineState.autoGeoTriggerEnabled &&
                            styles.autoTriggerToggleActive,
                        ]}
                      >
                        <Text style={styles.autoTriggerToggleText}>
                          {engineState.autoGeoTriggerEnabled
                            ? 'Auto-Trigger: ON'
                            : 'Auto-Trigger: OFF'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.geofenceCardDesc}>
                      {isCurrentlyInsideGeofence
                        ? `📍 Currently inside ${currentTrack.destinationName} radius (${currentTrack.geofenceRadiusMeters}m). Soundscape triggered automatically via GPS.`
                        : `Target boundary: ${currentTrack.geofenceRadiusMeters}m geofence radius. Audio triggers as soon as you step into the destination.`}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleSimulateArrival(currentTrack)}
                      style={styles.simulateArrivalBtn}
                    >
                      <Ionicons name="navigate-circle" size={16} color="#ffffff" />
                      <Text style={styles.simulateArrivalBtnText}>
                        Simulate GPS Arrival at {currentTrack.district}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* TAB 2: EXPLORE REGIONAL CATALOG */}
              {selectedTab === 'catalog' && (
                <View style={styles.catalogTabContent}>
                  <Text style={styles.tabSectionTitle}>
                    Curated Regional Soundscapes
                  </Text>
                  <Text style={styles.tabSectionSubtitle}>
                    Immersive nature and folk music from across Bangladesh
                  </Text>

                  {SOUNDSCAPE_CATALOG.map((item) => {
                    const isSelected = item.id === currentTrack.id;
                    const isCached = engineState.cachedTrackIds.includes(item.id);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.85}
                        onPress={async () => {
                          await triggerHaptics(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
                          await soundscapeService.playTrack(
                            item,
                            engineState.playbackMode
                          );
                          setSelectedTab('player');
                        }}
                        style={[
                          styles.catalogItemCard,
                          isSelected && styles.catalogItemCardActive,
                        ]}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.catalogItemThumb}
                        />
                        <View style={styles.catalogItemMeta}>
                          <View style={styles.catalogItemHeaderRow}>
                            <Text
                              style={[
                                styles.catalogItemTitle,
                                isSelected && styles.catalogItemTitleActive,
                              ]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            {isCached && (
                              <Ionicons
                                name="cloud-offline"
                                size={14}
                                color="#10b981"
                              />
                            )}
                          </View>

                          <Text style={styles.catalogItemDest} numberOfLines={1}>
                            {item.destinationName} • {item.region}
                          </Text>

                          <View style={styles.catalogPillsRow}>
                            <View style={styles.catalogBadge}>
                              <Text style={styles.catalogBadgeText}>
                                {item.category}
                              </Text>
                            </View>
                            <View style={styles.catalogRadiusBadge}>
                              <Text style={styles.catalogRadiusBadgeText}>
                                {item.geofenceRadiusMeters / 1000} km geofence
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.catalogActionCol}>
                          {isSelected && engineState.isPlaying ? (
                            <View style={styles.catalogPlayingPill}>
                              <Text style={styles.catalogPlayingPillText}>
                                Playing
                              </Text>
                            </View>
                          ) : (
                            <Ionicons
                              name="play-circle-outline"
                              size={28}
                              color={isSelected ? '#38bdf8' : '#64748b'}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* TAB 3: ZERO-NETWORK OFFLINE PRE-CACHING */}
              {selectedTab === 'offline' && (
                <View style={styles.offlineTabContent}>
                  <Text style={styles.tabSectionTitle}>
                    Zero-Network Offline Storage
                  </Text>
                  <Text style={styles.tabSectionSubtitle}>
                    Pre-cache high-fidelity soundscapes before entering remote national parks or deep mangrove zones without cellular signal.
                  </Text>

                  {/* Summary Metric Box */}
                  <View style={styles.storageMetricBox}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>
                        {cacheSummary.cachedTracksCount} / {SOUNDSCAPE_CATALOG.length}
                      </Text>
                      <Text style={styles.metricLabel}>Cached Zones</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>
                        {cacheSummary.formattedSize}
                      </Text>
                      <Text style={styles.metricLabel}>Disk Space</Text>
                    </View>
                  </View>

                  {/* Pre-cache All Button */}
                  <TouchableOpacity
                    onPress={handlePreCacheAll}
                    style={styles.preCacheAllBtn}
                  >
                    <LinearGradient
                      colors={['#059669', '#10b981']}
                      style={styles.preCacheAllGradient}
                    >
                      <Ionicons name="download-outline" size={20} color="#ffffff" />
                      <Text style={styles.preCacheAllText}>
                        Download All Soundscapes for Offline Use
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Per Track Cache List */}
                  <Text style={styles.offlineListTitle}>Destination Soundscape Files</Text>
                  {SOUNDSCAPE_CATALOG.map((track) => {
                    const isCached = engineState.cachedTrackIds.includes(track.id);
                    const isDownloading =
                      engineState.cacheDownloadingTrackId === track.id;

                    return (
                      <View key={track.id} style={styles.offlineTrackRow}>
                        <View style={styles.offlineTrackInfo}>
                          <Text style={styles.offlineTrackTitle}>
                            {track.title}
                          </Text>
                          <Text style={styles.offlineTrackSize}>
                            ~{(track.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB • {track.destinationName}
                          </Text>
                        </View>

                        <View style={styles.offlineActionBtn}>
                          {isDownloading ? (
                            <View style={styles.downloadProgressBadge}>
                              <ActivityIndicator size="small" color="#38bdf8" />
                              <Text style={styles.downloadProgressText}>
                                {Math.round(engineState.downloadProgress * 100)}%
                              </Text>
                            </View>
                          ) : isCached ? (
                            <TouchableOpacity
                              onPress={async () => {
                                await soundscapeService.removeCachedSoundscape(
                                  track.id
                                );
                                const s =
                                  await soundscapeService.getCacheStorageSummary();
                                setCacheSummary(s);
                              }}
                              style={styles.deleteCacheBtn}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#f87171"
                              />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handlePreCacheTrack(track)}
                              style={styles.downloadSingleBtn}
                            >
                              <Ionicons
                                name="cloud-download-outline"
                                size={18}
                                color="#38bdf8"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Clear all cache button */}
                  {cacheSummary.cachedTracksCount > 0 && (
                    <TouchableOpacity
                      onPress={async () => {
                        await soundscapeService.clearAllSoundscapeCache();
                        const s = await soundscapeService.getCacheStorageSummary();
                        setCacheSummary(s);
                      }}
                      style={styles.clearAllBtn}
                    >
                      <Text style={styles.clearAllBtnText}>
                        Purge All Cached Audio Assets
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ==========================================
// Component Stylesheet
// ==========================================
const styles = StyleSheet.create({
  // 1. Mini-player Styles
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 10px rgba(15, 23, 42, 0.35)" } : {}),
  },
  miniCardInner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  miniGradientBg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
  },
  geoPillBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#10b981',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  geoPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  offlinePillBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 4,
    padding: 2,
  },
  trackDetailsContainer: {
    flex: 1,
    marginStart: 10,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniTitleText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 380 - 220,
  },
  duckedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginStart: 6,
  },
  duckedBadgeText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniSubtitleText: {
    color: '#94a3b8',
    fontSize: 12,
    marginStart: 3,
    maxWidth: 380 - 220,
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    width: 28,
    marginEnd: 6,
    gap: 3,
  },
  equalizerBar: {
    width: 3.5,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  miniPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 4,
  },
  miniMuteBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 2,
  },
  miniDismissBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reopenFloatingPill: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 6px rgba(15, 23, 42, 0.3)" } : {}),
  },
  reopenGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  reopenText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  reopenPlayingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },

  // 2. Expanded Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: 800 * 0.92,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetHeaderTitles: {
    flex: 1,
    marginStart: 12,
  },
  sheetMainTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerTabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 3,
    gap: 4,
  },
  headerTabPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTabPillActive: {
    backgroundColor: '#2563eb',
  },
  sheetScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Artwork & Destination Card
  artworkContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  geofenceActiveBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  geofenceActiveBannerText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  artworkMeta: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  tagPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  districtBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  districtBadgeText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  cachedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cachedBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  artworkTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  artworkRegion: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 2,
  },

  // Audio Mode Switcher
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 14,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#2563eb',
  },
  modeSwitchText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modeSwitchTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Description Card
  descriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  descriptionText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
  },
  curatorText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Progress Bar
  progressContainer: {
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  progressTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  loopBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loopBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },

  // Primary Controls Row
  primaryControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  skipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 10px rgba(15, 23, 42, 0.4)" } : {}),
  },
  mainPlayGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Volume Slider Card
  volumeControlCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  volumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  volumeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volumeTitleText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  volumePercentText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sliderTouchArea: {
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  presetPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
  },
  presetPillActive: {
    backgroundColor: '#0284c7',
  },
  presetPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  duckTestPill: {
    marginStart: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  duckTestPillActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  duckTestPillText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  duckTestPillTextActive: {
    color: '#f87171',
  },

  // Geofence Trigger Card
  geofenceCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  geofenceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  geofenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  geofenceCardTitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '700',
  },
  autoTriggerToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
  },
  autoTriggerToggleActive: {
    backgroundColor: '#059669',
  },
  autoTriggerToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  geofenceCardDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  simulateArrivalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 10,
  },
  simulateArrivalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tab 2: Catalog Styles
  catalogTabContent: {
    paddingTop: 6,
  },
  tabSectionTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  tabSectionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  catalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  catalogItemCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  catalogItemThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  catalogItemMeta: {
    flex: 1,
    marginStart: 12,
  },
  catalogItemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingEnd: 6,
  },
  catalogItemTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 380 - 210,
  },
  catalogItemTitleActive: {
    color: '#38bdf8',
  },
  catalogItemDest: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  catalogPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  catalogBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catalogBadgeText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  catalogRadiusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catalogRadiusBadgeText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogActionCol: {
    paddingStart: 6,
  },
  catalogPlayingPill: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catalogPlayingPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tab 3: Offline Styles
  offlineTabContent: {
    paddingTop: 6,
  },
  storageMetricBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  preCacheAllBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  preCacheAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  preCacheAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  offlineListTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  offlineTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  offlineTrackInfo: {
    flex: 1,
    paddingEnd: 10,
  },
  offlineTrackTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  offlineTrackSize: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  offlineActionBtn: {
    minWidth: 36,
    alignItems: 'center',
  },
  downloadSingleBtn: {
    padding: 6,
  },
  deleteCacheBtn: {
    padding: 6,
  },
  downloadProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadProgressText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  clearAllBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  clearAllBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
});
