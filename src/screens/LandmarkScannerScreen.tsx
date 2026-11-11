import { Dimensions } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
  Image,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Svg, { Line, Polygon, Circle, Text as SvgText, G } from "react-native-svg";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import {
  HISTORICAL_LANDMARKS,
  Landmark,
  LandmarkId,
  RecognitionResult,
  offlineNeuralLandmarkEngine,
  Hotspot3D,
} from "../services/vision/landmarkRecognition";
import { INITIAL_TOUR_GUIDES } from "../services/tourGuideService";
import { TourGuide } from "../types/tourGuide";

import { useResponsive } from "../hooks/useResponsive";

// ─── 3D PROJECTION UTILITY ───────────────────────────────────────────────────

interface ProjectedPoint {
  u: number;
  v: number;
  depth: number;
}

function projectVertex(
  vertex: [number, number, number],
  yawRad: number,
  pitchRad: number,
  zoomScale: number,
  centerX: number,
  centerY: number,
  cameraDistance: number = 3.5
): ProjectedPoint {
  const [x, y, z] = vertex;

  // Yaw rotation around Y axis
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  // Pitch rotation around X axis
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;

  // Perspective scaling
  const effectiveDistance = Math.max(0.5, cameraDistance + z2);
  const scale = (cameraDistance / effectiveDistance) * zoomScale;

  return {
    u: centerX + x1 * scale,
    v: centerY - y2 * scale,
    depth: z2,
  };
}

// ─── BENGALI NUMERAL CONVERTER ──────────────────────────────────────────────
export function toBengaliNumber(num: number | string): string {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

// ─── MAIN LANDMARK SCANNER COMPONENT ─────────────────────────────────────────

export function LandmarkScannerScreen() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useResponsive();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Camera hardware controls
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0); // 0.0 to 1.0 for CameraView
  const [simulatedFeedIndex, setSimulatedFeedIndex] = useState(0);
  const [useSimulatedFeed, setUseSimulatedFeed] = useState(false);

  // Recognition state
  const [currentLandmark, setCurrentLandmark] = useState<Landmark>(HISTORICAL_LANDMARKS[0]);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [isContinuousScanning, setIsContinuousScanning] = useState(true);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Modals & Panels
  const [activeModal, setActiveModal] = useState<
    "audio" | "3d" | "guide" | "ticket" | "history" | "reportWrong" | "consent" | "alternatives" | null
  >(null);

  // Cloud AI & Image Transmission Consent State
  const [cloudConsentGranted, setCloudConsentGranted] = useState<boolean>(false);
  const [rememberConsent, setRememberConsent] = useState<boolean>(true);
  const [isCloudScanMode, setIsCloudScanMode] = useState<boolean>(false);

  // User Feedback / "ভুল? জানান" State
  const [selectedCorrectionLandmarkId, setSelectedCorrectionLandmarkId] = useState<LandmarkId>(HISTORICAL_LANDMARKS[1].id);
  const [feedbackReason, setFeedbackReason] = useState<string>("ছবিটি অস্পষ্ট বা কম আলো ছিল");
  const [feedbackToastMessage, setFeedbackToastMessage] = useState<string | null>(null);

  // Audio Guide State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackPositionSec, setAudioPlaybackPositionSec] = useState(0);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3D Viewer Orbit State
  const [yaw, setYaw] = useState(-0.4);
  const [pitch, setPitch] = useState(0.25);
  const [modelZoom, setModelZoom] = useState(130);
  const [renderMode, setRenderMode] = useState<"wireframe" | "shaded" | "vertices">("shaded");
  const [activeHotspot, setActiveHotspot] = useState<Hotspot3D | null>(null);

  // Ticket booking state
  const [ticketQuantityDomestic, setTicketQuantityDomestic] = useState(2);
  const [ticketQuantityForeign, setTicketQuantityForeign] = useState(0);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Guide booking state
  const [selectedGuide, setSelectedGuide] = useState<TourGuide | null>(null);
  const [guideBookingSuccess, setGuideBookingSuccess] = useState(false);

  // Laser scanner animation
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardSlideAnim = useRef(new Animated.Value(50)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;

  // ─── INITIALIZATION & SCANNING LOOP ────────────────────────────────────────

  useEffect(() => {
    // Laser line up-and-down oscillation
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for AR lock reticle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Initial inference run
    triggerInference(HISTORICAL_LANDMARKS[0].id);
  }, []);

  // Animate card entrance when landmark changes
  useEffect(() => {
    cardSlideAnim.setValue(30);
    cardOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentLandmark]);

  // Periodic offline neural inference simulation loop
  useEffect(() => {
    if (!isContinuousScanning) return;

    const interval = setInterval(() => {
      // Simulate live jitter and on-device feature extraction
      const currentId = HISTORICAL_LANDMARKS[simulatedFeedIndex % HISTORICAL_LANDMARKS.length].id;
      const result = offlineNeuralLandmarkEngine.simulateRecognition(currentId);
      setRecognitionResult(result);
    }, 2800);

    return () => clearInterval(interval);
  }, [isContinuousScanning, simulatedFeedIndex]);

  const triggerInference = useCallback((targetId: LandmarkId) => {
    setIsRecognizing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    setTimeout(() => {
      const result = offlineNeuralLandmarkEngine.simulateRecognition(targetId);
      setRecognitionResult(result);
      setCurrentLandmark(result.topMatch.landmark);
      setIsRecognizing(false);
    }, 180);
  }, []);

  const switchLandmarkPreset = (index: number) => {
    const nextLandmark = HISTORICAL_LANDMARKS[index];
    setSimulatedFeedIndex(index);
    setCurrentLandmark(nextLandmark);
    triggerInference(nextLandmark.id);
  };

  // ─── ALTERNATIVE RESULTS & ERROR REPORTING ────────────────────────────────
  const alternativeCandidates = useMemo(() => {
    if (!recognitionResult || !recognitionResult.candidates || recognitionResult.candidates.length === 0) {
      return HISTORICAL_LANDMARKS.filter((l) => l.id !== currentLandmark.id)
        .slice(0, 3)
        .map((l, idx) => ({
          landmark: l,
          confidence: Math.max(0.48, 0.85 - (idx + 1) * 0.14),
          similarityScore: Math.max(0.52, 0.88 - (idx + 1) * 0.12),
          distance: 0.25 + idx * 0.08,
        }));
    }
    const filtered = recognitionResult.candidates.filter(
      (c) => c.landmark.id !== currentLandmark.id
    );
    if (filtered.length > 0) return filtered;
    return HISTORICAL_LANDMARKS.filter((l) => l.id !== currentLandmark.id)
      .slice(0, 3)
      .map((l, idx) => ({
        landmark: l,
        confidence: Math.max(0.5, 0.85 - (idx + 1) * 0.15),
        similarityScore: Math.max(0.55, 0.85 - (idx + 1) * 0.12),
        distance: 0.3,
      }));
  }, [recognitionResult, currentLandmark]);

  const handleSelectAlternative = (candLandmark: Landmark) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setCurrentLandmark(candLandmark);
    triggerInference(candLandmark.id);
    setFeedbackToastMessage(`বিকল্প শনাক্তকরণ সক্রিয়: ${candLandmark.name}`);
    setTimeout(() => setFeedbackToastMessage(null), 3500);
  };

  const handleOpenReportWrong = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const fallbackId = alternativeCandidates[0]?.landmark?.id || HISTORICAL_LANDMARKS[1].id;
    setSelectedCorrectionLandmarkId(fallbackId);
    setActiveModal("reportWrong");
  };

  const handleSubmitCorrection = () => {
    const correctedLandmark = HISTORICAL_LANDMARKS.find((l) => l.id === selectedCorrectionLandmarkId);
    if (correctedLandmark) {
      setCurrentLandmark(correctedLandmark);
      triggerInference(correctedLandmark.id);
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setActiveModal(null);
    setFeedbackToastMessage("ধন্যবাদ! আপনার ফিডব্যাক গৃহীত হয়েছে এবং এআই মডেল আপডেট করা হয়েছে।");
    setTimeout(() => setFeedbackToastMessage(null), 4000);
  };

  const handleTriggerCloudAiScan = () => {
    if (!cloudConsentGranted) {
      setActiveModal("consent");
    } else {
      setIsCloudScanMode(true);
      triggerInference(currentLandmark.id);
      setFeedbackToastMessage("ক্লাউড AI দ্বারা ৮৫%+ নিশ্চিততায় বিশ্লেষণ সম্পন্ন হয়েছে।");
      setTimeout(() => setFeedbackToastMessage(null), 3000);
    }
  };

  const handleConfirmConsent = () => {
    setCloudConsentGranted(true);
    setActiveModal(null);
    setIsCloudScanMode(true);
    triggerInference(currentLandmark.id);
    setFeedbackToastMessage("ক্লাউড AI সম্মতি সক্রিয়। বিশ্লেষণ চলছে...");
    setTimeout(() => setFeedbackToastMessage(null), 3500);
  };

  // ─── AUDIO GUIDE TIMER & SYNTHESIS ─────────────────────────────────────────

  const toggleAudioGuide = () => {
    if (isPlayingAudio) {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      audioTimerRef.current = setInterval(() => {
        setAudioPlaybackPositionSec((prev) => {
          if (prev >= currentLandmark.audioGuide.durationSeconds) {
            if (audioTimerRef.current) clearInterval(audioTimerRef.current);
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const closeAudioModal = () => {
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    setIsPlayingAudio(false);
    setActiveModal(null);
  };

  const currentTranscript = useMemo(() => {
    const list = currentLandmark.audioGuide.transcript;
    for (let i = list.length - 1; i >= 0; i--) {
      if (audioPlaybackPositionSec >= list[i].timeSec) {
        return list[i].text;
      }
    }
    return list[0]?.text || "";
  }, [audioPlaybackPositionSec, currentLandmark]);

  // ─── 3D MODEL ROTATION PAN RESPONDER ───────────────────────────────────────

  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder3D = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          lastTouchRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          };
        },
        onPanResponderMove: (evt) => {
          if (!lastTouchRef.current) return;
          const dx = evt.nativeEvent.pageX - lastTouchRef.current.x;
          const dy = evt.nativeEvent.pageY - lastTouchRef.current.y;
          lastTouchRef.current = {
            x: evt.nativeEvent.pageX,
            y: evt.nativeEvent.pageY,
          };

          setYaw((prev) => prev + dx * 0.012);
          setPitch((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.012)));
        },
        onPanResponderRelease: () => {
          lastTouchRef.current = null;
        },
      }),
    []
  );

  // ─── NEARBY TOUR GUIDES FILTERING ──────────────────────────────────────────

  const nearbyGuides = useMemo(() => {
    const landmarkCity = currentLandmark.location.city.toLowerCase();
    const landmarkDiv = currentLandmark.location.division.toLowerCase();

    // Match guides whose primary area or covered areas match the monument's city/division
    const matched = INITIAL_TOUR_GUIDES.filter((guide) => {
      const area = guide.primary_area.toLowerCase();
      const covered = guide.covered_areas.map((c) => c.toLowerCase()).join(" ");
      return (
        area.includes("dhaka") && landmarkCity.includes("dhaka") ||
        covered.includes(landmarkCity) ||
        covered.includes(landmarkDiv) ||
        guide.specialties.some((s) => s.toLowerCase().includes("history"))
      );
    });

    return matched.length > 0 ? matched : INITIAL_TOUR_GUIDES.slice(0, 3);
  }, [currentLandmark]);

  // ─── TICKET PRICING CALCULATIONS ───────────────────────────────────────────

  const ticketTotalBDT = useMemo(() => {
    const dom = currentLandmark.ticketInfo.domesticPrice * ticketQuantityDomestic;
    const intl = currentLandmark.ticketInfo.internationalPrice * ticketQuantityForeign;
    return dom + intl;
  }, [currentLandmark, ticketQuantityDomestic, ticketQuantityForeign]);

  // ─── PINCH-TO-ZOOM GESTURE FOR CAMERA ──────────────────────────────────────

  const handleZoomStep = (targetZoom: number) => {
    setZoomLevel(targetZoom);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const toggleTorch = () => {
    setIsTorchOn((prev) => !prev);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "back" ? "front" : "back"));
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  // ─── RENDER CAMERA OR SIMULATED MONUMENT FEED ──────────────────────────────

  const renderCameraFeed = () => {
    // If user prefers camera roll / monument scene simulation or permission not granted yet
    if (useSimulatedFeed || !permission?.granted) {
      return (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            source={{ uri: currentLandmark.sampleImageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          {/* Subtle live grain overlay */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(10, 15, 30, 0.25)" }]} />
        </View>
      );
    }

    return (
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={cameraFacing}
        enableTorch={isTorchOn}
        zoom={zoomLevel}
      />
    );
  };

  // ─── RENDER AR HUD OVERLAYS ────────────────────────────────────────────────

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.18, SCREEN_HEIGHT * 0.58],
  });

  return (
    <View style={styles.container}>
      {/* 1. Underlying Camera Feed */}
      {renderCameraFeed()}

      {/* 2. Top Vignette & AR Telemetry Header */}
      <LinearGradient
        colors={["rgba(3, 7, 18, 0.85)", "rgba(3, 7, 18, 0.4)", "transparent"]}
        style={[styles.topGradient, { paddingTop: insets.top + 8 }]}
      >
        {/* Top Navigation & Status Row */}
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.circleIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Offline Edge Neural Telemetry Badge */}
          <View style={styles.npuTelemetryBadge}>
            <View style={styles.npuPulseDot} />
            <Text style={styles.npuTelemetryText}>
              Edge NPU • {recognitionResult?.inferenceTimeMs || 24}ms • Offline INT8
            </Text>
          </View>

          {/* Torch & Flip Buttons */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.circleIconButton, isTorchOn && styles.circleIconButtonActive]}
              onPress={toggleTorch}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isTorchOn ? "flashlight" : "flashlight-outline"}
                size={18}
                color={isTorchOn ? "#F59E0B" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={flipCamera}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cloud AI Consent & Image Transmission Status Bar */}
        <View style={styles.cloudAiConsentRow}>
          <TouchableOpacity
            style={[
              styles.cloudConsentPill,
              cloudConsentGranted ? styles.cloudConsentPillActive : styles.cloudConsentPillPending,
            ]}
            onPress={handleTriggerCloudAiScan}
            activeOpacity={0.8}
          >
            <Ionicons
              name={cloudConsentGranted ? "shield-checkmark" : "cloud-upload-outline"}
              size={13}
              color={cloudConsentGranted ? "#10B981" : "#38BDF8"}
            />
            <Text
              style={[
                styles.cloudConsentPillText,
                cloudConsentGranted && styles.cloudConsentPillTextActive,
              ]}
            >
              {cloudConsentGranted
                ? "ক্লাউড AI সক্রিয় (ছবি প্রেরণে সম্মতি প্রাপ্ত)"
                : "ক্লাউড AI বিশ্লেষণ • ছবি পাঠানোর পূর্বে সম্মতি দিন"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={cloudConsentGranted ? "#10B981" : "#38BDF8"}
            />
          </TouchableOpacity>
        </View>

        {/* Permission Banner if camera is not active */}
        {!permission?.granted && !useSimulatedFeed && (
          <View style={styles.permissionBanner}>
            <Ionicons name="camera-outline" size={16} color="#38BDF8" />
            <Text style={styles.permissionText}>Camera access required for live AR scan</Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={() => requestPermission()}
            >
              <Text style={styles.permissionBtnText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permissionBtn, { backgroundColor: "#0284C7" }]}
              onPress={() => setUseSimulatedFeed(true)}
            >
              <Text style={styles.permissionBtnText}>Simulate</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* 3. AR Targeting Reticle & Scanning Laser */}
      <View style={styles.arReticleContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.arBoundingBox,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* 4 Glowing Corner Brackets */}
          <View style={[styles.cornerBracket, styles.bracketTopLeft]} />
          <View style={[styles.cornerBracket, styles.bracketTopRight]} />
          <View style={[styles.cornerBracket, styles.bracketBottomLeft]} />
          <View style={[styles.cornerBracket, styles.bracketBottomRight]} />

          {/* Center Target Crosshair */}
          <View style={styles.centerCrosshair}>
            <View style={styles.crosshairVertical} />
            <View style={styles.crosshairHorizontal} />
            <View style={styles.crosshairCircle} />
          </View>

          {/* Live Feature Lock Indicator */}
          <View style={styles.arLockTag}>
            <Ionicons name="scan-circle" size={14} color="#06B6D4" />
            <Text style={styles.arLockTagText}>
              {recognitionResult
                ? `${Math.round(recognitionResult.topMatch.similarityScore * 100)}% Cosine Lock`
                : "Tracking Monument..."}
            </Text>
          </View>
        </Animated.View>

        {/* Animated Scanning Laser Line */}
        <Animated.View
          style={[
            styles.laserScanLine,
            {
              transform: [{ translateY: laserTranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={["transparent", "rgba(6, 182, 212, 0.9)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.laserGradient}
          />
        </Animated.View>
      </View>

      {/* 4. Zoom Control Bar & Landmark Preset Switcher */}
      <View style={styles.quickControlsFloatingBar}>
        {/* Pinch-to-zoom presets */}
        <View style={styles.zoomStepContainer}>
          {[0, 0.25, 0.5, 0.8].map((val, idx) => {
            const label = idx === 0 ? "1x" : idx === 1 ? "2x" : idx === 2 ? "3x" : "5x";
            const isActive = zoomLevel === val;
            return (
              <TouchableOpacity
                key={label}
                style={[styles.zoomButton, isActive && styles.zoomButtonActive]}
                onPress={() => handleZoomStep(val)}
                activeOpacity={0.8}
              >
                <Text style={[styles.zoomButtonText, isActive && styles.zoomButtonTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Monument Scene Switcher (Allows testing all 5 landmarks seamlessly) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScrollContent}
        >
          {HISTORICAL_LANDMARKS.map((item, idx) => {
            const isSelected = item.id === currentLandmark.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                onPress={() => switchLandmarkPreset(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. FLOATING AR ANNOTATION CARD (Translucent NativeWind Glassmorphism) */}
      <Animated.View
        style={[
          styles.floatingCardWrapper,
          {
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: cardSlideAnim }],
            opacity: cardOpacityAnim,
          },
        ]}
      >
        <View className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-4 shadow-2xl backdrop-blur-xl">
          {/* Feedback Toast Notification */}
          {feedbackToastMessage && (
            <View style={styles.feedbackToastBanner}>
              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
              <Text style={styles.feedbackToastText}>{feedbackToastMessage}</Text>
            </View>
          )}

          {/* Card Header: Category & Bengali Native Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.badgeRow}>
              {currentLandmark.unescoWorldHeritage && (
                <View style={styles.unescoBadge}>
                  <Ionicons name="ribbon-outline" size={11} color="#38BDF8" />
                  <Text style={styles.unescoBadgeText}>UNESCO</Text>
                </View>
              )}
              <View style={styles.banglaBadge}>
                <Text style={styles.banglaBadgeText}>{currentLandmark.nativeName}</Text>
              </View>
            </View>

            {/* Neural confidence percentage indicator & "ভুল? জানান" Button */}
            <View style={styles.headerRightBadgeGroup}>
              <View style={styles.confidenceBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                <Text style={styles.confidenceText}>
                  {toBengaliNumber(
                    recognitionResult
                      ? Math.round(recognitionResult.topMatch.confidence * 100)
                      : 85
                  )}% নিশ্চিত
                </Text>
              </View>
              <TouchableOpacity
                style={styles.wrongReportButton}
                onPress={handleOpenReportWrong}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={13} color="#F87171" />
                <Text style={styles.wrongReportButtonText}>ভুল? জানান</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Monument Name & Construction Metadata */}
          <View style={styles.monumentTitleBlock}>
            <View style={{ flex: 1 }}>
              <Text className="text-xl font-bold text-white tracking-tight">
                {currentLandmark.name}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={12} color="#06B6D4" />
                <Text style={styles.locationText}>
                  {currentLandmark.location.city}, {currentLandmark.location.district}
                </Text>
              </View>
            </View>

            {/* Tap to expand full history overview */}
            <TouchableOpacity
              style={styles.expandHistoryBtn}
              onPress={() => setActiveModal("history")}
            >
              <Ionicons name="information-circle-outline" size={20} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Architecture & Year Badges */}
          <View style={styles.metaChipsRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={styles.metaChipText}>Built: {currentLandmark.constructionYear} CE</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="business-outline" size={13} color="#A78BFA" />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {currentLandmark.architectureStyle.split(" ")[0]} Style
              </Text>
            </View>
          </View>

          {/* Instant History Teaser */}
          <Text style={styles.summaryText} numberOfLines={2}>
            {currentLandmark.summary}
          </Text>

          {/* ─── ALTERNATIVE RESULTS (বিকল্প ফল) ────────────────────────────── */}
          <View style={styles.alternativeResultsSection}>
            <View style={styles.alternativeHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="git-branch-outline" size={13} color="#38BDF8" />
                <Text style={styles.alternativeSectionTitle}>বিকল্প ফল:</Text>
              </View>
              <Text style={styles.alternativeHintText}>ভুল হলে ট্যাপ করে পরিবর্তন করুন</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alternativeScrollContent}
            >
              {alternativeCandidates.map((cand) => {
                const altPct = Math.round(cand.confidence * 100);
                return (
                  <TouchableOpacity
                    key={cand.landmark.id}
                    style={styles.alternativeChip}
                    onPress={() => handleSelectAlternative(cand.landmark)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.alternativeChipTitle} numberOfLines={1}>
                      {cand.landmark.name}
                    </Text>
                    <View style={styles.alternativePctBadge}>
                      <Text style={styles.alternativePctText}>
                        {toBengaliNumber(altPct)}% নিশ্চিত
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 6. QUICK-ACTION SHORTCUTS (Audio, 3D, Guide Booking, Ticket Pass) */}
          <View style={styles.shortcutsRow}>
            {/* Action 1: Listen to 1-Min Audio Guide */}
            <TouchableOpacity
              style={styles.actionShortcutAudio}
              onPress={() => {
                setActiveModal("audio");
                if (!isPlayingAudio) toggleAudioGuide();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#0284C7", "#0369A1"]}
                style={styles.actionShortcutGradient}
              >
                <Ionicons name="headset" size={16} color="#FFFFFF" />
                <View style={styles.shortcutTextWrap}>
                  <Text style={styles.actionShortcutTitle}>1-Min Audio Guide</Text>
                  <Text style={styles.actionShortcutSub}>68s • Narrated</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Action 2: View 3D Model */}
            <TouchableOpacity
              style={styles.actionShortcut3D}
              onPress={() => {
                setActiveHotspot(null);
                setActiveModal("3d");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#7C3AED", "#6D28D9"]}
                style={styles.actionShortcutGradient}
              >
                <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
                <View style={styles.shortcutTextWrap}>
                  <Text style={styles.actionShortcutTitle}>View 3D Model</Text>
                  <Text style={styles.actionShortcutSub}>360° Wireframe</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Secondary Action Row: Book Nearby Tour Guide & Entry Tickets */}
          <View style={styles.secondaryShortcutsRow}>
            <TouchableOpacity
              style={styles.secondaryShortcutBtn}
              onPress={() => setActiveModal("guide")}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={15} color="#34D399" />
              <Text style={styles.secondaryShortcutText}>Book Nearby Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryShortcutBtn, { borderColor: "#F59E0B" }]}
              onPress={() => setActiveModal("ticket")}
              activeOpacity={0.8}
            >
              <Ionicons name="ticket-outline" size={15} color="#FBBF24" />
              <Text style={[styles.secondaryShortcutText, { color: "#FBBF24" }]}>
                {currentLandmark.ticketInfo.domesticPrice === 0
                  ? "Free Entry Pass"
                  : `Tickets ৳${currentLandmark.ticketInfo.domesticPrice}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: 1-MINUTE AUDIO GUIDE PLAYER                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "audio"}
        animationType="slide"
        transparent
        onRequestClose={closeAudioModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.audioModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Sheet Handle */}
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>IMMERSIVE AUDIO EXPERIENCE</Text>
                <Text style={styles.modalMainTitle}>{currentLandmark.audioGuide.title}</Text>
                <Text style={styles.audioNarratorText}>
                  Narrated by {currentLandmark.audioGuide.narrator}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={closeAudioModal}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Dynamic Waveform Visualizer simulation */}
            <View style={styles.waveformContainer}>
              {Array.from({ length: 28 }).map((_, i) => {
                const height = isPlayingAudio
                  ? 12 + Math.abs(Math.sin((audioPlaybackPositionSec * 2 + i * 0.4)) * 34)
                  : 8;
                return (
                  <View
                    key={`wave-${i}`}
                    style={[
                      styles.waveformBar,
                      {
                        height,
                        backgroundColor: i < (audioPlaybackPositionSec / currentLandmark.audioGuide.durationSeconds) * 28
                          ? "#06B6D4"
                          : "#334155",
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Audio Progress Scrubber */}
            <View style={styles.audioProgressRow}>
              <Text style={styles.audioTimeText}>
                {String(Math.floor(audioPlaybackPositionSec / 60)).padStart(2, "0")}:
                {String(audioPlaybackPositionSec % 60).padStart(2, "0")}
              </Text>
              <View style={styles.audioTrackBg}>
                <View
                  style={[
                    styles.audioTrackFill,
                    {
                      width: `${(audioPlaybackPositionSec / currentLandmark.audioGuide.durationSeconds) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.audioTimeText}>
                {String(Math.floor(currentLandmark.audioGuide.durationSeconds / 60)).padStart(2, "0")}:
                {String(currentLandmark.audioGuide.durationSeconds % 60).padStart(2, "0")}
              </Text>
            </View>

            {/* Real-Time Synced Audio Transcript Box */}
            <View style={styles.transcriptBox}>
              <View style={styles.transcriptTag}>
                <Ionicons name="chatbubble-ellipses-outline" size={12} color="#38BDF8" />
                <Text style={styles.transcriptTagText}>Live Transcript</Text>
              </View>
              <Text style={styles.transcriptActiveText}>"{currentTranscript}"</Text>
            </View>

            {/* Playback Controls */}
            <View style={styles.audioControlsRow}>
              <TouchableOpacity
                style={styles.audioStepButton}
                onPress={() => setAudioPlaybackPositionSec((p) => Math.max(0, p - 15))}
              >
                <Ionicons name="play-back" size={20} color="#FFFFFF" />
                <Text style={styles.audioStepText}>-15s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioMainPlayBtn}
                onPress={toggleAudioGuide}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPlayingAudio ? "pause" : "play"}
                  size={30}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioStepButton}
                onPress={() =>
                  setAudioPlaybackPositionSec((p) =>
                    Math.min(currentLandmark.audioGuide.durationSeconds, p + 15)
                  )
                }
              >
                <Ionicons name="play-forward" size={20} color="#FFFFFF" />
                <Text style={styles.audioStepText}>+15s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: INTERACTIVE 3D MONUMENT VIEWER (360° ORBIT)               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "3d"}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.viewer3DModal, { paddingBottom: insets.bottom + 8 }]}>
            {/* Top 3D Viewer Header */}
            <View style={styles.viewer3DHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.viewer3DTagRow}>
                  <Ionicons name="cube" size={13} color="#06B6D4" />
                  <Text style={styles.viewer3DTagText}>SPATIAL 3D WIREFRAME</Text>
                </View>
                <Text style={styles.viewer3DTitle}>{currentLandmark.model3D.name}</Text>
                <Text style={styles.viewer3DSub}>
                  Drag with finger to orbit 360° • Pinch / Zoom
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setActiveModal(null)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Interactive 3D Canvas with SVG Projection */}
            <View style={styles.canvas3DContainer} {...panResponder3D.panHandlers}>
              {(() => {
                const model = currentLandmark.model3D;
                const canvasW = SCREEN_WIDTH - 32;
                const canvasH = SCREEN_HEIGHT * 0.44;
                const cX = canvasW / 2;
                const cY = canvasH / 2;

                // Project all vertices
                const projected = model.vertices.map((v) =>
                  projectVertex(v, yaw, pitch, modelZoom, cX, cY)
                );

                return (
                  <Svg width={canvasW} height={canvasH}>
                    {/* Background Grid Lines for architectural drafting look */}
                    <G opacity={0.15}>
                      <Line x1={0} y1={cY} x2={canvasW} y2={cY} stroke="#38BDF8" strokeWidth={1} strokeDasharray="4, 4" />
                      <Line x1={cX} y1={0} x2={cX} y2={canvasH} stroke="#38BDF8" strokeWidth={1} strokeDasharray="4, 4" />
                    </G>

                    {/* Shaded Faces (if mode === 'shaded') */}
                    {renderMode === "shaded" &&
                      model.faces.map((face, fIdx) => {
                        const p0 = projected[face[0]];
                        const p1 = projected[face[1]];
                        const p2 = projected[face[2]];
                        if (!p0 || !p1 || !p2) return null;
                        const pointsStr = `${p0.u},${p0.v} ${p1.u},${p1.v} ${p2.u},${p2.v}`;
                        const avgDepth = (p0.depth + p1.depth + p2.depth) / 3;
                        const alpha = Math.max(0.12, Math.min(0.55, 0.35 + avgDepth * 0.1));

                        return (
                          <Polygon
                            key={`face-${fIdx}`}
                            points={pointsStr}
                            fill="#0284C7"
                            fillOpacity={alpha}
                            stroke="#38BDF8"
                            strokeWidth={0.5}
                          />
                        );
                      })}

                    {/* Wireframe Edge Lines */}
                    {model.edges.map((edge, eIdx) => {
                      const pA = projected[edge[0]];
                      const pB = projected[edge[1]];
                      if (!pA || !pB) return null;
                      return (
                        <Line
                          key={`edge-${eIdx}`}
                          x1={pA.u}
                          y1={pA.v}
                          x2={pB.u}
                          y2={pB.v}
                          stroke="#38BDF8"
                          strokeWidth={1.4}
                          strokeOpacity={0.85}
                        />
                      );
                    })}

                    {/* Structural Vertices */}
                    {renderMode === "vertices" &&
                      projected.map((pt, pIdx) => (
                        <Circle
                          key={`vertex-${pIdx}`}
                          cx={pt.u}
                          cy={pt.v}
                          r={2.5}
                          fill="#F43F5E"
                        />
                      ))}

                    {/* Architectural Hotspots */}
                    {model.hotspots.map((spot) => {
                      const pos = projectVertex(spot.position, yaw, pitch, modelZoom, cX, cY);
                      const isSelected = activeHotspot?.id === spot.id;
                      return (
                        <G key={spot.id}>
                          <Circle
                            cx={pos.u}
                            cy={pos.v}
                            r={isSelected ? 9 : 6}
                            fill={isSelected ? "#F59E0B" : "#10B981"}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        </G>
                      );
                    })}
                  </Svg>
                );
              })()}

              {/* Angle & Rotation Readout */}
              <View style={styles.viewerTelemetryPill}>
                <Text style={styles.viewerTelemetryText}>
                  Yaw: {Math.round((yaw * 180) / Math.PI)}° • Pitch: {Math.round((pitch * 180) / Math.PI)}° • Scale: {modelZoom}
                </Text>
              </View>
            </View>

            {/* 3D Mode Switcher (Shaded vs Wireframe vs Vertices) */}
            <View style={styles.renderModeBar}>
              {(["shaded", "wireframe", "vertices"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.renderModeBtn, renderMode === mode && styles.renderModeBtnActive]}
                  onPress={() => setRenderMode(mode)}
                >
                  <Text
                    style={[
                      styles.renderModeBtnText,
                      renderMode === mode && styles.renderModeBtnTextActive,
                    ]}
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.recenterBtn}
                onPress={() => {
                  setYaw(-0.4);
                  setPitch(0.25);
                  setModelZoom(130);
                }}
              >
                <Ionicons name="refresh" size={14} color="#38BDF8" />
                <Text style={styles.recenterBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Architectural Hotspots Carousel */}
            <View style={styles.hotspotsSection}>
              <Text style={styles.hotspotsSectionTitle}>ARCHITECTURAL HOTSPOTS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {currentLandmark.model3D.hotspots.map((spot) => {
                  const isSelected = activeHotspot?.id === spot.id;
                  return (
                    <TouchableOpacity
                      key={spot.id}
                      style={[styles.hotspotChip, isSelected && styles.hotspotChipSelected]}
                      onPress={() => setActiveHotspot(spot)}
                    >
                      <Ionicons
                        name="navigate-circle"
                        size={14}
                        color={isSelected ? "#F59E0B" : "#38BDF8"}
                      />
                      <Text
                        style={[
                          styles.hotspotChipText,
                          isSelected && styles.hotspotChipTextSelected,
                        ]}
                      >
                        {spot.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Hotspot details card */}
              {activeHotspot && (
                <View style={styles.hotspotDetailCard}>
                  <Text style={styles.hotspotDetailTitle}>{activeHotspot.title}</Text>
                  <Text style={styles.hotspotDetailDesc}>{activeHotspot.description}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: BOOK NEARBY TOUR GUIDE                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "guide"}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setActiveModal(null);
          setGuideBookingSuccess(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.guideModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>CERTIFIED LOCAL HISTORIANS</Text>
                <Text style={styles.modalMainTitle}>Book Nearby Guide</Text>
                <Text style={styles.guideSubtitle}>
                  Specialized in {currentLandmark.name} & {currentLandmark.location.city}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setActiveModal(null);
                  setGuideBookingSuccess(false);
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {guideBookingSuccess ? (
              <View style={styles.successStateWrap}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
                <Text style={styles.successStateTitle}>Tour Guide Booked!</Text>
                <Text style={styles.successStateSub}>
                  {selectedGuide?.full_name} will meet you at the {currentLandmark.name} entrance. A confirmation SMS with details has been sent.
                </Text>
                <TouchableOpacity
                  style={styles.confirmActionButton}
                  onPress={() => {
                    setActiveModal(null);
                    setGuideBookingSuccess(false);
                  }}
                >
                  <Text style={styles.confirmActionText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.55 }} showsVerticalScrollIndicator={false}>
                {nearbyGuides.map((guide) => (
                  <View key={guide.id} style={styles.guideCard}>
                    <Image
                      source={{ uri: guide.avatar_url }}
                      style={styles.guideAvatar}
                    />
                    <View style={styles.guideInfo}>
                      <View style={styles.guideNameRow}>
                        <Text style={styles.guideName}>{guide.full_name}</Text>
                        <Ionicons name="checkmark-circle" size={15} color="#0284C7" />
                      </View>
                      <Text style={styles.guideBio} numberOfLines={2}>{guide.bio}</Text>
                      <View style={styles.guideMetricsRow}>
                        <View style={styles.guideMetric}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.guideMetricText}>{guide.rating} ({guide.reviews_count})</Text>
                        </View>
                        <View style={styles.guideMetric}>
                          <Ionicons name="briefcase-outline" size={12} color="#94A3B8" />
                          <Text style={styles.guideMetricText}>{guide.experience_years} yrs exp</Text>
                        </View>
                        <View style={styles.guideMetric}>
                          <Ionicons name="cash-outline" size={12} color="#34D399" />
                          <Text style={[styles.guideMetricText, { color: "#34D399", fontWeight: "700" }]}>
                            ৳{guide.daily_rate}/day
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookGuideActionBtn}
                        onPress={() => {
                          setSelectedGuide(guide);
                          if (Platform.OS !== "web") {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                          }
                          setGuideBookingSuccess(true);
                        }}
                      >
                        <Text style={styles.bookGuideActionText}>Reserve Guide for Today</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: ENTRY TICKET & FAST-PASS BOOKING                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "ticket"}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setActiveModal(null);
          setBookingConfirmed(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.ticketModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>OFFICIAL ENTRY E-PASS</Text>
                <Text style={styles.modalMainTitle}>{currentLandmark.name} Ticket</Text>
                <Text style={styles.guideSubtitle}>
                  Valid for: Today • {currentLandmark.ticketInfo.openingHours}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => {
                  setActiveModal(null);
                  setBookingConfirmed(false);
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {bookingConfirmed ? (
              <View style={styles.successStateWrap}>
                <Ionicons name="qr-code-outline" size={72} color="#06B6D4" />
                <Text style={styles.successStateTitle}>Entry E-Ticket Issued!</Text>
                <Text style={styles.successStateSub}>
                  Pass #{currentLandmark.id.substring(0, 3).toUpperCase()}-{Math.floor(100000 + Math.random() * 900000)} • Total: ৳{ticketTotalBDT}
                </Text>
                <Text style={styles.qrInstructions}>
                  Scan this QR code directly at the security gate turnstile for fast-track entry.
                </Text>
                <TouchableOpacity
                  style={styles.confirmActionButton}
                  onPress={() => {
                    setActiveModal(null);
                    setBookingConfirmed(false);
                  }}
                >
                  <Text style={styles.confirmActionText}>Save to My Trips</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* Domestic Visitor Quantity */}
                <View style={styles.ticketSelectorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketTypeTitle}>Domestic Citizen</Text>
                    <Text style={styles.ticketTypePrice}>
                      {currentLandmark.ticketInfo.domesticPrice === 0
                        ? "Free Admission"
                        : `৳${currentLandmark.ticketInfo.domesticPrice} per person`}
                    </Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setTicketQuantityDomestic((q) => Math.max(0, q - 1))}
                    >
                      <Ionicons name="remove" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{ticketQuantityDomestic}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setTicketQuantityDomestic((q) => q + 1)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* International Tourist Quantity */}
                <View style={styles.ticketSelectorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketTypeTitle}>International Foreigner</Text>
                    <Text style={styles.ticketTypePrice}>
                      {currentLandmark.ticketInfo.internationalPrice === 0
                        ? "Free Admission"
                        : `৳${currentLandmark.ticketInfo.internationalPrice} per person`}
                    </Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setTicketQuantityForeign((q) => Math.max(0, q - 1))}
                    >
                      <Ionicons name="remove" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{ticketQuantityForeign}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setTicketQuantityForeign((q) => q + 1)}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Total & Checkout Button */}
                <View style={styles.totalSummaryRow}>
                  <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValueBDT}>৳{ticketTotalBDT} BDT</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.confirmActionButton}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                      }
                      setBookingConfirmed(true);
                    }}
                  >
                    <Text style={styles.confirmActionText}>
                      {ticketTotalBDT === 0 ? "Get Free E-Pass" : "Instant Buy Ticket"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: DETAILED HISTORICAL BACKGROUND OVERVIEW                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "history"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.historyModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>HISTORICAL DOCUMENTATION</Text>
                <Text style={styles.modalMainTitle}>{currentLandmark.name}</Text>
                <Text style={styles.guideSubtitle}>{currentLandmark.constructionEra}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.55 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fullHistoryParagraph}>{currentLandmark.fullHistory}</Text>

              <Text style={styles.sectionHeaderTitle}>ARCHITECTURAL HIGHLIGHTS</Text>
              {currentLandmark.architecturalHighlights.map((feat, i) => (
                <View key={`arch-${feat.title || i}`} style={styles.archHighlightItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#06B6D4" />
                  <View style={{ flex: 1, marginStart: 10 }}>
                    <Text style={styles.archHighlightTitle}>{feat.title}</Text>
                    <Text style={styles.archHighlightDesc}>{feat.description}</Text>
                  </View>
                </View>
              ))}

              <Text style={styles.sectionHeaderTitle}>VISUAL FEATURE VECTOR PROFILE</Text>
              <View style={styles.featureProfileBox}>
                <Text style={styles.featureProfileText}>
                  • Edge Density: {currentLandmark.visualFeatures.edgeComplexity * 100}%
                </Text>
                <Text style={styles.featureProfileText}>
                  • Symmetry Index: {currentLandmark.visualFeatures.symmetryScore * 100}%
                </Text>
                <Text style={styles.featureProfileText}>
                  • Primary Hex: {currentLandmark.visualFeatures.dominantPaletteHex.join(", ")}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: REPORT WRONG RESULT & CORRECT LANDMARK ("ভুল? জানান")    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "reportWrong"}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportModalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCategoryTitle}>ভুল ফলাফল সংশোধন ও ফিডব্যাক</Text>
                <Text style={styles.modalMainTitle}>সঠিক স্থাপনা নির্বাচন করুন</Text>
                <Text style={styles.reportAiDetectedText}>
                  AI বর্তমানে শনাক্ত করেছে: <Text style={{ color: "#38BDF8", fontWeight: "700" }}>{currentLandmark.name}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.45 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.reportSectionLabel}>এটি আসলে কোন ঐতিহাসিক স্থাপনা?</Text>
              <View style={styles.reportLandmarkList}>
                {HISTORICAL_LANDMARKS.map((landmark) => {
                  const isSelected = selectedCorrectionLandmarkId === landmark.id;
                  return (
                    <TouchableOpacity
                      key={landmark.id}
                      style={[styles.correctionCard, isSelected && styles.correctionCardSelected]}
                      onPress={() => setSelectedCorrectionLandmarkId(landmark.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.correctionName, isSelected && styles.correctionNameSelected]}>
                          {landmark.name}
                        </Text>
                        <Text style={styles.correctionBanglaName}>{landmark.nativeName}</Text>
                        <Text style={styles.correctionCity}>{landmark.location.city}, {landmark.location.district}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? "#10B981" : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.reportSectionLabel}>ভুল হওয়ার কারণ (ঐচ্ছিক):</Text>
              <View style={styles.feedbackReasonsWrap}>
                {[
                  "ছবিটি অস্পষ্ট বা কম আলো ছিল",
                  "দূরত্ব বেশি বা কোণ ভিন্ন ছিল",
                  "স্থাপনার কেবল আংশিক অংশ দৃশ্যমান",
                  "সাদৃশ্যপূর্ণ স্থাপত্য শৈলী",
                ].map((reason) => {
                  const isChosen = feedbackReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonChip, isChosen && styles.reasonChipChosen]}
                      onPress={() => setFeedbackReason(reason)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reasonChipText, isChosen && styles.reasonChipTextChosen]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmCorrectionBtn}
              onPress={handleSubmitCorrection}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#0284C7", "#0369A1"]} style={styles.confirmCorrectionGradient}>
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.confirmCorrectionBtnText}>সঠিক স্থাপনা নির্বাচন ও ফিডব্যাক জমা দিন</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 7: CLOUD AI IMAGE TRANSMISSION CONSENT DIALOG                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={activeModal === "consent"}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.consentCard}>
            <View style={styles.consentIconWrap}>
              <Ionicons name="cloud-upload" size={38} color="#06B6D4" />
            </View>

            <Text style={styles.consentTitle}>ছবি পাঠানোর সম্মতি বার্তা</Text>
            <Text style={styles.consentSubtitle}>
              উন্নত ক্লাউড AI বিশ্লেষণের জন্য ছবির ফ্রেম প্রেরণ
            </Text>

            <View style={styles.consentDivider} />

            <Text style={styles.consentBody}>
              ল্যান্ডমার্ক স্ক্যানারে ৮৫%+ নিশ্চয়তার সাথে সঠিক স্মৃতিস্তম্ভ ও তথ্য পেতে আপনার ক্যামেরার ছবি সুরক্ষিত ক্লাউড AI সার্ভারে বিশ্লেষণ করা হবে।
            </Text>

            <View style={styles.consentHighlights}>
              <View style={styles.consentHighlightRow}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.consentHighlightText}>ছবি কোনো সার্ভারে স্থায়ী সংরক্ষণ বা শেয়ার করা হয় না</Text>
              </View>
              <View style={styles.consentHighlightRow}>
                <Ionicons name="lock-closed" size={16} color="#10B981" />
                <Text style={styles.consentHighlightText}>TLS 1.3 সুরক্ষিত যোগাযোগ মাধ্যম ব্যবহৃত হয়</Text>
              </View>
              <View style={styles.consentHighlightRow}>
                <Ionicons name="flash" size={16} color="#10B981" />
                <Text style={styles.consentHighlightText}>স্মৃতিস্তম্ভ শনাক্ত হওয়ার পর তথ্য আপনার স্ক্রিনে আসবে</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.rememberToggleRow}
              onPress={() => setRememberConsent(!rememberConsent)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={rememberConsent ? "checkbox" : "square-outline"}
                size={20}
                color={rememberConsent ? "#06B6D4" : "#94A3B8"}
              />
              <Text style={styles.rememberToggleText}>পরবর্তী স্ক্যানের জন্যও এই সম্মতি মনে রাখুন</Text>
            </TouchableOpacity>

            <View style={styles.consentActionRow}>
              <TouchableOpacity
                style={styles.consentCancelBtn}
                onPress={() => setActiveModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.consentCancelBtnText}>অফলাইনে থাকুন</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentConfirmBtn}
                onPress={handleConfirmConsent}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#06B6D4", "#0284C7"]}
                  style={styles.consentConfirmGradient}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.consentConfirmBtnText}>সম্মত হয়ে পাঠান</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLESHEET ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    zIndex: 20,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleIconButtonActive: {
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    borderColor: "#F59E0B",
  },
  npuTelemetryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.4)",
  },
  npuPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
    marginEnd: 7,
  },
  npuTelemetryText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionBanner: {
    marginTop: 10,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  permissionText: {
    color: "#E2E8F0",
    fontSize: 12,
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // AR Reticle HUD
  arReticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  arBoundingBox: {
    width: SCREEN_WIDTH * 0.76,
    height: SCREEN_HEIGHT * 0.42,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerBracket: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#06B6D4",
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  centerCrosshair: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairVertical: {
    position: "absolute",
    width: 1.5,
    height: 30,
    backgroundColor: "rgba(6, 182, 212, 0.6)",
  },
  crosshairHorizontal: {
    position: "absolute",
    height: 1.5,
    width: 30,
    backgroundColor: "rgba(6, 182, 212, 0.6)",
  },
  crosshairCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(6, 182, 212, 0.8)",
  },
  arLockTag: {
    position: "absolute",
    bottom: -28,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.4)",
  },
  arLockTagText: {
    color: "#E2E8F0",
    fontSize: 12.5,
    fontWeight: "600",
  },
  laserScanLine: {
    position: "absolute",
    left: SCREEN_WIDTH * 0.12,
    width: SCREEN_WIDTH * 0.76,
    height: 2,
    zIndex: 12,
  },
  laserGradient: {
    width: "100%",
    height: 3,
    borderRadius: 1.5,
  },

  // Zoom Bar & Presets
  quickControlsFloatingBar: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.38,
    left: 0,
    right: 0,
    zIndex: 15,
    paddingHorizontal: 16,
  },
  zoomStepContainer: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 3,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 10,
  },
  zoomButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  zoomButtonActive: {
    backgroundColor: "#0284C7",
  },
  zoomButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  zoomButtonTextActive: {
    color: "#FFFFFF",
  },
  presetScrollContent: {
    gap: 8,
    paddingHorizontal: 8,
  },
  presetChip: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  presetChipSelected: {
    backgroundColor: "#0369A1",
    borderColor: "#38BDF8",
  },
  presetChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  presetChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Floating AR Card
  floatingCardWrapper: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    zIndex: 25,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unescoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#38BDF8",
    gap: 3,
  },
  unescoBadgeText: {
    color: "#38BDF8",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  banglaBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  banglaBadgeText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    gap: 4,
  },
  confidenceText: {
    color: "#34D399",
    fontSize: 12.5,
    fontWeight: "700",
  },
  monumentTitleBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    color: "#94A3B8",
    fontSize: 12.5,
  },
  expandHistoryBtn: {
    padding: 4,
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  metaChipText: {
    color: "#CBD5E1",
    fontSize: 12.5,
    fontWeight: "600",
  },
  summaryText: {
    color: "#94A3B8",
    fontSize: 12.5,
    lineHeight: 16,
    marginBottom: 12,
  },

  // Shortcuts Buttons
  shortcutsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  actionShortcutAudio: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionShortcut3D: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionShortcutGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  shortcutTextWrap: {
    flex: 1,
  },
  actionShortcutTitle: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionShortcutSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12.5,
  },
  secondaryShortcutsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryShortcutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34D399",
    gap: 6,
  },
  secondaryShortcutText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
  },

  // Modals Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    justifyContent: "flex-end",
  },
  modalSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalCategoryTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  modalMainTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Audio Modal
  audioModalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  audioNarratorText: {
    color: "#94A3B8",
    fontSize: 12.5,
    marginTop: 3,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
  },
  audioProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  audioTimeText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  audioTrackBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
  },
  audioTrackFill: {
    height: "100%",
    backgroundColor: "#06B6D4",
    borderRadius: 2,
  },
  transcriptBox: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  transcriptTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  transcriptTagText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  transcriptActiveText: {
    color: "#F1F5F9",
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
  },
  audioControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  audioStepButton: {
    alignItems: "center",
    gap: 2,
  },
  audioStepText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  audioMainPlayBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.4)" } : {}),
  },

  // 3D Viewer Modal
  viewer3DModal: {
    backgroundColor: "#0B1329",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    height: SCREEN_HEIGHT * 0.88,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  viewer3DHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  viewer3DTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  viewer3DTagText: {
    color: "#06B6D4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  viewer3DTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  viewer3DSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 1,
  },
  canvas3DContainer: {
    height: SCREEN_HEIGHT * 0.44,
    backgroundColor: "#050C1F",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerTelemetryPill: {
    position: "absolute",
    bottom: 8,
    backgroundColor: "rgba(11, 19, 41, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  viewerTelemetryText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  renderModeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  renderModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
  },
  renderModeBtnActive: {
    backgroundColor: "#0284C7",
  },
  renderModeBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  renderModeBtnTextActive: {
    color: "#FFFFFF",
  },
  recenterBtn: {
    marginStart: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  recenterBtnText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  hotspotsSection: {
    flex: 1,
  },
  hotspotsSectionTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  hotspotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginEnd: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  hotspotChipSelected: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  hotspotChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  hotspotChipTextSelected: {
    color: "#F59E0B",
    fontWeight: "700",
  },
  hotspotDetailCard: {
    marginTop: 10,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  hotspotDetailTitle: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  hotspotDetailDesc: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 16,
  },

  // Guide Modal
  guideModalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.25)",
  },
  guideSubtitle: {
    color: "#94A3B8",
    fontSize: 12.5,
    marginTop: 2,
  },
  guideCard: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  guideAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginEnd: 12,
  },
  guideInfo: {
    flex: 1,
  },
  guideNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  guideName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  guideBio: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 6,
  },
  guideMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  guideMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  guideMetricText: {
    color: "#CBD5E1",
    fontSize: 12.5,
    fontWeight: "600",
  },
  bookGuideActionBtn: {
    backgroundColor: "#0284C7",
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
  },
  bookGuideActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Ticket Modal
  ticketModalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  ticketSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  ticketTypeTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  ticketTypePrice: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 12,
    padding: 4,
    gap: 12,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    minWidth: 16,
    textAlign: "center",
  },
  totalSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  totalLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  totalValueBDT: {
    color: "#34D399",
    fontSize: 18,
    fontWeight: "900",
  },
  confirmActionButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  confirmActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // History Modal
  historyModalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  fullHistoryParagraph: {
    color: "#E2E8F0",
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 10,
  },
  archHighlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: 10,
    borderRadius: 12,
  },
  archHighlightTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  archHighlightDesc: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 15,
    marginTop: 2,
  },
  featureProfileBox: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    padding: 12,
    borderRadius: 12,
    gap: 4,
    marginBottom: 20,
  },
  featureProfileText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Success States
  successStateWrap: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 10,
  },
  successStateTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  successStateSub: {
    color: "#CBD5E1",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  qrInstructions: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },

  // ─── NEW STYLES: CONFIDENCE, WRONG REPORT, ALTERNATIVES, CONSENT ───────────
  headerRightBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wrongReportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  wrongReportButtonText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "600",
  },
  feedbackToastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderWidth: 1,
    borderColor: "#06B6D4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  feedbackToastText: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  alternativeResultsSection: {
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.18)",
  },
  alternativeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  alternativeSectionTitle: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  alternativeHintText: {
    color: "#94A3B8",
    fontSize: 10.5,
  },
  alternativeScrollContent: {
    gap: 8,
  },
  alternativeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  alternativeChipTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  alternativePctBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  alternativePctText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "700",
  },
  cloudAiConsentRow: {
    marginTop: 8,
  },
  cloudConsentPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cloudConsentPillActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.5)",
  },
  cloudConsentPillPending: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  cloudConsentPillText: {
    color: "#38BDF8",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
    marginHorizontal: 8,
  },
  cloudConsentPillTextActive: {
    color: "#10B981",
  },
  reportModalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  reportAiDetectedText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },
  reportSectionLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
  },
  reportLandmarkList: {
    gap: 8,
  },
  correctionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  correctionCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  correctionName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  correctionNameSelected: {
    color: "#34D399",
  },
  correctionBanglaName: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  correctionCity: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  feedbackReasonsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reasonChipChosen: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  reasonChipText: {
    color: "#CBD5E1",
    fontSize: 11.5,
  },
  reasonChipTextChosen: {
    color: "#38BDF8",
    fontWeight: "600",
  },
  confirmCorrectionBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmCorrectionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  confirmCorrectionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  consentCard: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 22,
    width: "88%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.35)",
    alignItems: "center",
  },
  consentIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  consentTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  consentSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  consentDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    marginVertical: 14,
  },
  consentBody: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 14,
  },
  consentHighlights: {
    width: "100%",
    gap: 8,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  consentHighlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  consentHighlightText: {
    color: "#E2E8F0",
    fontSize: 11.5,
    flex: 1,
  },
  rememberToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  rememberToggleText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  consentActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  consentCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  consentCancelBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  consentConfirmBtn: {
    flex: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  consentConfirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  consentConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default LandmarkScannerScreen;
