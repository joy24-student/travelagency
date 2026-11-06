/**
 * LuggageMeasureScreen.tsx - Pro Augmented Reality & Spatial Computing Tool
 * 
 * Requirements:
 * 1. Plane Detection & Edge Bounding: Estimate bag height, width, and depth in cm
 *    using surface plane tracking and camera feature points.
 * 2. Airline Specification Matrix: Compare estimated bag dimensions against airline allowances
 *    (Biman Bangladesh 56x36x23 cm, Emirates, Qatar Airways, US-Bangla, Novoair, etc.).
 * 3. Visual Status Indicator: Green 3D bounding box if compliant; Red box highlighting
 *    the dimension exceeding cabin limits.
 * 4. Ticket Addon Action: If oversized, provide a direct one-tap button:
 *    "Pre-book Extra Baggage (Save 30%)".
 */

import * as React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import Svg, {
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  G,
  Rect,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

import {
  AIRLINE_SPECIFICATIONS,
  DEFAULT_AIRLINE,
  AirlineCabinAllowance,
  CabinClass,
  LuggageType,
  LuggageDimensions,
  Vector3D,
  Rotation3D,
  SurfacePlane,
  FeaturePoint,
  BoundingBox3D,
  ExtraBaggageTier,
  buildCameraIntrinsics,
  calculateBoundingBox3D,
  evaluateLuggageAllowance,
  generateSyntheticFeaturePoints,
  defaultSmoother,
} from "../services/vision/luggageEstimator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Default initial measured luggage size: 58 x 37 x 24 cm (oversized for Biman to demonstrate alert state)
const INITIAL_DIMENSIONS: LuggageDimensions = {
  height: 58.0,
  width: 37.0,
  depth: 24.0,
};

type TrackingPhase = "SEARCHING_SURFACE" | "SURFACE_DETECTED" | "MEASURING";

export function LuggageMeasureScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [cameraFacing] = useState<CameraType>("back");

  // Selected airline & cabin class configuration
  const [selectedAirline, setSelectedAirline] = useState<AirlineCabinAllowance>(DEFAULT_AIRLINE);
  const [cabinClass, setCabinClass] = useState<CabinClass>("Economy");
  const [luggageType, setLuggageType] = useState<LuggageType>("roller");

  // AR Tracking & Spatial State
  const [trackingPhase, setTrackingPhase] = useState<TrackingPhase>("SEARCHING_SURFACE");
  const [surfaceConfidence, setSurfaceConfidence] = useState<number>(0.35);
  const [measuredDimensions, setMeasuredDimensions] = useState<LuggageDimensions>(INITIAL_DIMENSIONS);
  const [distanceMeters] = useState<number>(1.25);
  const [yawAngle, setYawAngle] = useState<number>(0.18); // 3D Orbit angle
  const [showSizingCage, setShowSizingCage] = useState<boolean>(true);
  const [isManualAdjustOpen, setIsManualAdjustOpen] = useState<boolean>(false);
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");

  // Certificate snapshot modal state
  const [isCertificateOpen, setIsCertificateOpen] = useState<boolean>(false);

  // Extra Baggage Addon Modal state
  const [isAddonModalVisible, setIsAddonModalVisible] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<ExtraBaggageTier | null>(null);
  const [addonSuccessReceipt, setAddonSuccessReceipt] = useState<{
    passId: string;
    tier: ExtraBaggageTier;
    airline: AirlineCabinAllowance;
    timestamp: string;
  } | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarScanAnim = useRef(new Animated.Value(0)).current;
  const alertBounceAnim = useRef(new Animated.Value(1)).current;
  const gridOpacityAnim = useRef(new Animated.Value(0)).current;

  // Spatial reference center in camera coordinate space
  const bagCenterRef = useRef<Vector3D>({ x: 0.0, y: -0.45, z: 1.25 });
  const surfacePlaneRef = useRef<SurfacePlane>({
    anchor: { x: 0, y: -0.45, z: 1.25 },
    normal: { x: 0, y: 1, z: 0 },
    confidence: 0.85,
    extent: { width: 1.2, depth: 1.5 },
    state: "TRACKING",
    distanceMeters: 1.25,
  });

  // Camera Intrinsics
  const intrinsics = useMemo(
    () => buildCameraIntrinsics(SCREEN_WIDTH, SCREEN_HEIGHT, 65),
    []
  );

  // Evaluate Compliance against Selected Airline and Cabin Class
  const compliance = useMemo(
    () => evaluateLuggageAllowance(measuredDimensions, selectedAirline, cabinClass),
    [measuredDimensions, selectedAirline, cabinClass]
  );

  // Calculate 3D Bounding Box in AR viewport with 3D rotation & sizing cage
  const boundingBox: BoundingBox3D = useMemo(() => {
    const rotation: Rotation3D = { yaw: yawAngle, pitch: -0.06, roll: 0.0 };
    return calculateBoundingBox3D(
      bagCenterRef.current,
      measuredDimensions,
      intrinsics,
      compliance,
      rotation,
      showSizingCage
    );
  }, [measuredDimensions, intrinsics, compliance, yawAngle, showSizingCage]);

  // Synthetic Feature Points for SLAM Floor & Bag Corner Tracking
  const [featurePoints, setFeaturePoints] = useState<FeaturePoint[]>([]);

  // Initialize tracking loop & animations
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
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

    Animated.loop(
      Animated.timing(radarScanAnim, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      })
    ).start();

    const timer1 = setTimeout(() => {
      setTrackingPhase("SURFACE_DETECTED");
      setSurfaceConfidence(0.74);
      Animated.timing(gridOpacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1200);

    const timer2 = setTimeout(() => {
      setTrackingPhase("MEASURING");
      setSurfaceConfidence(0.96);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Live Feature Points & Optical Jitter Simulation
  useEffect(() => {
    let frameId: number;
    const startTime = Date.now();

    const loop = () => {
      const elapsed = Date.now() - startTime;
      const pts = generateSyntheticFeaturePoints(
        surfacePlaneRef.current,
        bagCenterRef.current,
        measuredDimensions,
        intrinsics,
        elapsed
      );
      setFeaturePoints(pts);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [measuredDimensions, intrinsics]);

  // Alert bounce when oversized
  useEffect(() => {
    if (compliance.status === "OVERSIZED") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(alertBounceAnim, {
            toValue: 1.05,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(alertBounceAnim, {
            toValue: 1.0,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      alertBounceAnim.setValue(1);
    }
  }, [compliance.status]);

  // Dimension nudger handler
  const adjustDimension = useCallback(
    (dim: "height" | "width" | "depth", delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMeasuredDimensions((prev) => {
        const nextVal = Math.max(10, Math.min(100, Number((prev[dim] + delta).toFixed(1))));
        const updated = { ...prev, [dim]: nextVal };
        return defaultSmoother.update(updated);
      });
    },
    []
  );

  // Quick Preset Sizers
  const applyPreset = useCallback(
    (preset: "biman-max" | "oversized" | "standard-cabin" | "duffel" | "personal") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      switch (preset) {
        case "biman-max":
          setMeasuredDimensions({ height: 56.0, width: 36.0, depth: 23.0 });
          break;
        case "oversized":
          setMeasuredDimensions({ height: 60.5, width: 38.5, depth: 25.5 });
          break;
        case "standard-cabin":
          setMeasuredDimensions({ height: 52.0, width: 34.0, depth: 21.0 });
          break;
        case "duffel":
          setMeasuredDimensions({ height: 48.0, width: 32.0, depth: 20.0 });
          break;
        case "personal":
          setMeasuredDimensions({ height: 38.0, width: 28.0, depth: 14.0 });
          break;
      }
    },
    []
  );

  // Handle airline selection
  const handleSelectAirline = useCallback((airline: AirlineCabinAllowance) => {
    Haptics.selectionAsync();
    setSelectedAirline(airline);
  }, []);

  // Handle One-Tap Pre-book Extra Baggage
  const handleOpenAddonModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedTier(selectedAirline.extraBaggageTiers[0]);
    setIsAddonModalVisible(true);
  }, [selectedAirline]);

  // Confirm Extra Baggage Addon
  const handleConfirmPrebook = useCallback(() => {
    if (!selectedTier) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const passId = `${selectedAirline.iataCode}-XBAG-${Math.floor(10000 + Math.random() * 90000)}`;

    setAddonSuccessReceipt({
      passId,
      tier: selectedTier,
      airline: selectedAirline,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }, [selectedTier, selectedAirline]);

  // ─── AR PLANE GRID SVG PATH GENERATOR ─────────────────────────────────────────
  const renderArPlaneGrid = () => {
    const horizonY = SCREEN_HEIGHT * 0.42;
    const baseY = SCREEN_HEIGHT * 0.88;
    const gridLines = [];

    const rayCount = 9;
    for (let i = 0; i <= rayCount; i++) {
      const bottomX = (SCREEN_WIDTH / rayCount) * i;
      const topX = SCREEN_WIDTH * 0.35 + (SCREEN_WIDTH * 0.3 / rayCount) * i;
      gridLines.push(
        <Line
          key={`ray-${i}`}
          x1={topX}
          y1={horizonY}
          x2={bottomX}
          y2={baseY}
          stroke="rgba(0, 220, 255, 0.28)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
      );
    }

    const rungCount = 7;
    for (let j = 1; j <= rungCount; j++) {
      const ratio = Math.pow(j / rungCount, 1.6);
      const y = horizonY + (baseY - horizonY) * ratio;
      const span = SCREEN_WIDTH * (0.35 + 0.65 * ratio);
      const x1 = (SCREEN_WIDTH - span) / 2;
      const x2 = (SCREEN_WIDTH + span) / 2;
      gridLines.push(
        <Line
          key={`rung-${j}`}
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke="rgba(0, 220, 255, 0.35)"
          strokeWidth="1.5"
        />
      );
    }

    return gridLines;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* ─── LIVE CAMERA FEED / AR VIEWPORT ───────────────────────────────────── */}
      <View style={StyleSheet.absoluteFillObject}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={cameraFacing}
            enableTorch={torchEnabled}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cameraPlaceholder]}>
            <LinearGradient
              colors={["#0A0F1D", "#071325", "#020712"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.simulatedRoom}>
              <Ionicons name="camera-reverse-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.simulatedText}>AR Spatial Camera View</Text>
              {!permission && (
                <TouchableOpacity
                  style={styles.grantPermBtn}
                  onPress={() => requestPermission()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="videocam" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.grantPermText}>Enable Live AR Camera</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ─── AR SPATIAL COMPUTING OVERLAY (SVG LAYER) ────────────────────────── */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Defs>
            <SvgGradient id="compliantGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#10B981" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#059669" stopOpacity="0.15" />
            </SvgGradient>
            <SvgGradient id="oversizedGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#EF4444" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#B91C1C" stopOpacity="0.18" />
            </SvgGradient>
            <SvgGradient id="borderlineGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#D97706" stopOpacity="0.18" />
            </SvgGradient>
          </Defs>

          {/* 1. Perspective Floor Surface Grid */}
          {trackingPhase !== "SEARCHING_SURFACE" && (
            <G opacity={surfaceConfidence}>{renderArPlaneGrid()}</G>
          )}

          {/* 2. Feature Points (SLAM Keypoint Cloud) */}
          {featurePoints.map((pt) => {
            const isBagPt = pt.type === "corner" || pt.type === "edge" || pt.type === "handle";
            const color = isBagPt
              ? compliance.status === "COMPLIANT"
                ? "#10B981"
                : "#EF4444"
              : "#00E5FF";
            return (
              <G key={pt.id}>
                <Circle
                  cx={pt.screenPos.x}
                  cy={pt.screenPos.y}
                  r={isBagPt ? 3.5 : 2.0}
                  fill={color}
                  opacity={pt.confidence * 0.85}
                />
                {isBagPt && (
                  <Circle
                    cx={pt.screenPos.x}
                    cy={pt.screenPos.y}
                    r={6.5}
                    stroke={color}
                    strokeWidth={1}
                    fill="none"
                    opacity={0.6}
                  />
                )}
              </G>
            );
          })}

          {/* 3. Virtual Airline Sizing Cage (Cyan Dashed Wireframe Envelope) */}
          {boundingBox.sizingCageVertices && boundingBox.sizingCageEdges && (
            <G opacity={0.65}>
              {boundingBox.sizingCageEdges.map((cEdge, ceIdx) => {
                const cv1 = boundingBox.sizingCageVertices![cEdge.from].projected;
                const cv2 = boundingBox.sizingCageVertices![cEdge.to].projected;
                return (
                  <Line
                    key={`cage-edge-${ceIdx}`}
                    x1={cv1.x}
                    y1={cv1.y}
                    x2={cv2.x}
                    y2={cv2.y}
                    stroke="#00E5FF"
                    strokeWidth={1.4}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </G>
          )}

          {/* 4. 3D Bounding Box Translucent Faces (Depth-Sorted) */}
          {boundingBox.faces.map((face, fIdx) => {
            const pointsStr = face.points2D.map((p) => `${p.x},${p.y}`).join(" ");
            const fillGrad =
              compliance.status === "COMPLIANT"
                ? "url(#compliantGrad)"
                : compliance.status === "BORDERLINE"
                ? "url(#borderlineGrad)"
                : "url(#oversizedGrad)";

            return (
              <Polygon
                key={`face-${face.name}-${fIdx}`}
                points={pointsStr}
                fill={fillGrad}
                stroke={boundingBox.complianceColor}
                strokeWidth={0.8}
                strokeOpacity={0.4}
              />
            );
          })}

          {/* 5. 3D Bounding Box Wireframe Edges */}
          {boundingBox.edges.map((edge, eIdx) => {
            const v1 = boundingBox.vertices[edge.from].projected;
            const v2 = boundingBox.vertices[edge.to].projected;

            // Highlight exceeding dimension in pulsating Red
            const isExceeded = edge.isExceeded;
            const strokeColor = isExceeded ? "#FF1744" : boundingBox.complianceColor;
            const strokeWidth = isExceeded ? 3.8 : 2.2;

            return (
              <G key={`edge-${eIdx}`}>
                <Line
                  x1={v1.x}
                  y1={v1.y}
                  x2={v2.x}
                  y2={v2.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth + 4}
                  strokeOpacity={isExceeded ? 0.45 : 0.25}
                  strokeLinecap="round"
                />
                <Line
                  x1={v1.x}
                  y1={v1.y}
                  x2={v2.x}
                  y2={v2.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isExceeded ? "6 3" : undefined}
                  strokeLinecap="round"
                />
              </G>
            );
          })}

          {/* 6. 3D Corner Vertex Handles */}
          {boundingBox.vertices.map((vertex, vIdx) => (
            <G key={`vertex-${vIdx}`}>
              <Circle
                cx={vertex.projected.x}
                cy={vertex.projected.y}
                r={4.5}
                fill="#FFFFFF"
                stroke={boundingBox.complianceColor}
                strokeWidth={2}
              />
            </G>
          ))}

          {/* 7. Floating Edge Dimension Badges (Height, Width, Depth) */}
          {boundingBox.edges
            .filter((e) => (e.from === 0 && e.to === 4) || (e.from === 0 && e.to === 1) || (e.from === 1 && e.to === 2))
            .map((edge, idx) => {
              const label =
                edge.dimension === "height"
                  ? `H: ${measuredDimensions.height} cm`
                  : edge.dimension === "width"
                  ? `W: ${measuredDimensions.width} cm`
                  : `D: ${measuredDimensions.depth} cm`;

              const isExceeded = edge.isExceeded;
              const chipBg = isExceeded ? "#DC2626" : "#059669";
              const posX = edge.labelPosition.x;
              const posY = edge.labelPosition.y;

              return (
                <G key={`badge-${idx}`}>
                  <Rect
                    x={posX - 42}
                    y={posY - 12}
                    width={84}
                    height={24}
                    rx={12}
                    fill={chipBg}
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                    opacity={0.94}
                  />
                  <SvgText
                    x={posX}
                    y={posY + 4}
                    fill="#FFFFFF"
                    fontSize={10.5}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
                </G>
              );
            })}
        </Svg>
      </View>

      {/* ─── AR HUD HEADER & CONTROLS ────────────────────────────────────────── */}
      <SafeAreaView edges={["top"]} style={styles.topHeaderArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.arBadgeRow}>
              <View style={styles.arPulseDot} />
              <Text style={styles.headerSuperTitle}>AR SPATIAL SIZER</Text>
            </View>
            <Text style={styles.headerTitle}>Cabin Baggage Verification</Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.circleBtn, isCertificateOpen && styles.circleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsCertificateOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#00E5FF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, torchEnabled && styles.circleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTorchEnabled((prev) => !prev);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={torchEnabled ? "flash" : "flash-outline"}
                size={20}
                color={torchEnabled ? "#FBBF24" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, isManualAdjustOpen && styles.circleBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsManualAdjustOpen((prev) => !prev);
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="tune-vertical"
                size={20}
                color={isManualAdjustOpen ? "#00D2FF" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CABIN CLASS & BAG TYPE BAR ──────────────────────────────────────── */}
        <View style={styles.secondaryControlsRow}>
          <View style={styles.classToggleGroup}>
            {(["Economy", "Business"] as const).map((cls) => {
              const isSelected = cabinClass === cls;
              return (
                <TouchableOpacity
                  key={cls}
                  style={[styles.classToggleBtn, isSelected && styles.classToggleBtnActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCabinClass(cls);
                  }}
                >
                  <Text style={[styles.classToggleText, isSelected && styles.classToggleTextActive]}>
                    {cls}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.sizingCageToggleBtn, showSizingCage && styles.sizingCageToggleBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowSizingCage((prev) => !prev);
            }}
          >
            <MaterialCommunityIcons
              name="cube-scan"
              size={14}
              color={showSizingCage ? "#00E5FF" : "#94A3B8"}
            />
            <Text style={[styles.sizingCageToggleText, showSizingCage && { color: "#00E5FF" }]}>
              {showSizingCage ? "Sizing Cage: ON" : "Sizing Cage: OFF"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── AIRLINE SPECIFICATION MATRIX CAROUSEL ────────────────────────── */}
        <View style={styles.airlineSelectorWrap}>
          <Text style={styles.sectionCaption}>SELECT DEPARTURE AIRLINE FOR VERIFICATION:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.airlineScrollContent}
          >
            {AIRLINE_SPECIFICATIONS.map((airline) => {
              const isSelected = selectedAirline.id === airline.id;
              const maxDim =
                cabinClass === "Business" && airline.businessMaxDimensions
                  ? airline.businessMaxDimensions
                  : airline.maxDimensions;
              const maxWeight =
                cabinClass === "Business" && airline.businessMaxWeightKg
                  ? airline.businessMaxWeightKg
                  : airline.maxWeightKg;

              return (
                <TouchableOpacity
                  key={airline.id}
                  style={[
                    styles.airlineChip,
                    isSelected && styles.airlineChipSelected,
                  ]}
                  onPress={() => handleSelectAirline(airline)}
                  activeOpacity={0.8}
                >
                  <View style={styles.airlineIataBadge}>
                    <Text style={styles.airlineIataText}>{airline.iataCode}</Text>
                  </View>
                  <View style={styles.airlineChipTextWrap}>
                    <Text
                      style={[
                        styles.airlineChipName,
                        isSelected && styles.airlineChipNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {airline.name}
                    </Text>
                    <Text style={styles.airlineChipLimits}>
                      {maxDim.height}×{maxDim.width}×{maxDim.depth} cm • {maxWeight}kg
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#00E5FF"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ─── TRACKING PHASE HUD BANNER ───────────────────────────────────────── */}
      <View style={styles.trackingHud}>
        <View style={styles.trackingPill}>
          <MaterialCommunityIcons
            name={
              trackingPhase === "SEARCHING_SURFACE"
                ? "radar"
                : trackingPhase === "SURFACE_DETECTED"
                ? "floor-plan"
                : "cube-scan"
            }
            size={16}
            color="#00E5FF"
          />
          <Text style={styles.trackingPillText}>
            {trackingPhase === "SEARCHING_SURFACE"
              ? "Scanning Surface Plane..."
              : trackingPhase === "SURFACE_DETECTED"
              ? "Plane Locked • Aligning Bag"
              : `Tracking Bag • Dist: ${distanceMeters}m`}
          </Text>
          <View style={styles.trackingConfidenceBadge}>
            <Text style={styles.trackingConfidenceText}>
              Fit: {compliance.fitIndex}%
            </Text>
          </View>
        </View>

        {/* 3D Orbit Rotate Steppers */}
        <View style={styles.orbitPill}>
          <TouchableOpacity
            style={styles.orbitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setYawAngle((prev) => prev - 0.25);
            }}
          >
            <Ionicons name="arrow-undo-outline" size={14} color="#00E5FF" />
            <Text style={styles.orbitText}>Rotate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.orbitBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setYawAngle((prev) => prev + 0.25);
            }}
          >
            <Text style={styles.orbitText}>Orbit</Text>
            <Ionicons name="arrow-redo-outline" size={14} color="#00E5FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MANUAL PRECISION ADJUSTER PANEL (DRAWER) ────────────────────────── */}
      {isManualAdjustOpen && (
        <View style={styles.manualAdjustDrawer}>
          <View style={styles.manualAdjustHeader}>
            <Text style={styles.manualAdjustTitle}>AR Dimension Calibration (cm)</Text>
            <TouchableOpacity
              onPress={() => setIsManualAdjustOpen(false)}
              style={styles.closeDrawerBtn}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Stepper Controls */}
          <View style={styles.stepperGrid}>
            {(["height", "width", "depth"] as const).map((dim) => {
              const isExceeded = compliance.dimensions[dim].status === "EXCEEDED";
              const limit =
                cabinClass === "Business" && selectedAirline.businessMaxDimensions
                  ? selectedAirline.businessMaxDimensions[dim]
                  : selectedAirline.maxDimensions[dim];
              const value = measuredDimensions[dim];

              return (
                <View key={dim} style={styles.stepperCard}>
                  <View style={styles.stepperLabelRow}>
                    <Text style={styles.stepperDimName}>{dim.toUpperCase()}</Text>
                    <Text
                      style={[
                        styles.stepperDiffText,
                        isExceeded ? styles.textExceeded : styles.textOk,
                      ]}
                    >
                      Max: {limit} cm
                    </Text>
                  </View>
                  <Text style={[styles.stepperValueText, isExceeded && styles.textExceeded]}>
                    {value.toFixed(1)}{" "}
                    <Text style={{ fontSize: 13, color: "#94A3B8" }}>cm</Text>
                  </Text>
                  <View style={styles.stepperActionRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustDimension(dim, -1)}
                    >
                      <Ionicons name="remove" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustDimension(dim, 1)}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetRow}>
            <Text style={styles.presetLabel}>Test Presets:</Text>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset("biman-max")}
            >
              <Text style={styles.presetChipText}>Biman Limit (56x36x23)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, styles.presetChipRed]}
              onPress={() => applyPreset("oversized")}
            >
              <Text style={[styles.presetChipText, { color: "#FCA5A5" }]}>
                Oversized (+4cm)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset("standard-cabin")}
            >
              <Text style={styles.presetChipText}>Small Carry-on</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => applyPreset("personal")}
            >
              <Text style={styles.presetChipText}>Under-seat Bag</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── BOTTOM FLOATING COMPLIANCE STATUS HUD & ADDON ACTION ────────────── */}
      <View style={[styles.bottomHudContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View
          style={[
            styles.statusCard,
            compliance.status === "COMPLIANT"
              ? styles.statusCardCompliant
              : styles.statusCardOversized,
          ]}
        >
          {/* Status Header */}
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusIndicatorBadge}>
              <Ionicons
                name={
                  compliance.status === "COMPLIANT"
                    ? "checkmark-circle"
                    : "warning"
                }
                size={22}
                color={compliance.status === "COMPLIANT" ? "#10B981" : "#EF4444"}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      compliance.status === "COMPLIANT" ? "#10B981" : "#EF4444",
                  },
                ]}
              >
                {compliance.status === "COMPLIANT"
                  ? "CABIN COMPLIANT"
                  : "CABIN LIMIT EXCEEDED"}
              </Text>
            </View>

            <View style={styles.headerRightBadges}>
              <View style={styles.volumeBadge}>
                <MaterialCommunityIcons name="cube-outline" size={14} color="#94A3B8" />
                <Text style={styles.volumeText}>{compliance.volumeLiters}L</Text>
              </View>
              <View style={styles.weightBadge}>
                <MaterialCommunityIcons name="scale" size={13} color="#94A3B8" />
                <Text style={styles.volumeText}>
                  ~{compliance.estimatedWeightRangeKg.min}-{compliance.estimatedWeightRangeKg.max}kg
                </Text>
              </View>
            </View>
          </View>

          {/* Dimension Comparison Chips */}
          <View style={styles.dimensionComparisonRow}>
            {(["height", "width", "depth"] as const).map((dim) => {
              const evalItem = compliance.dimensions[dim];
              const isExceeded = evalItem.status === "EXCEEDED";

              return (
                <View
                  key={dim}
                  style={[
                    styles.dimEvalChip,
                    isExceeded ? styles.dimEvalChipExceeded : styles.dimEvalChipOk,
                  ]}
                >
                  <Text style={styles.dimEvalTitle}>{dim.toUpperCase()}</Text>
                  <Text
                    style={[
                      styles.dimEvalValue,
                      isExceeded ? styles.textExceeded : styles.textOk,
                    ]}
                  >
                    {evalItem.measuredCm} cm
                  </Text>
                  <Text style={styles.dimEvalAllowed}>
                    Max: {evalItem.allowedCm} cm
                  </Text>
                  {isExceeded && (
                    <Text style={styles.dimEvalOverBadge}>
                      +{evalItem.differenceCm} cm
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Linear Sum Bar */}
          <View style={styles.linearSumRow}>
            <View style={styles.linearTextWrap}>
              <Text style={styles.linearLabel}>Linear Total (H+W+D):</Text>
              <Text
                style={[
                  styles.linearValue,
                  compliance.totalLinearCm.isExceeded
                    ? styles.textExceeded
                    : styles.textOk,
                ]}
              >
                {compliance.totalLinearCm.measured} cm /{" "}
                {compliance.totalLinearCm.allowed} cm Max
              </Text>
            </View>
            <View style={styles.linearTrack}>
              <View
                style={[
                  styles.linearFill,
                  {
                    width: `${Math.min(
                      100,
                      (compliance.totalLinearCm.measured / compliance.totalLinearCm.allowed) * 100
                    )}%`,
                    backgroundColor:
                      compliance.totalLinearCm.isExceeded ? "#EF4444" : "#10B981",
                  },
                ]}
              />
            </View>
          </View>

          {/* Status Explanation Message */}
          <Text style={styles.summaryCaptionText}>{compliance.summaryText}</Text>

          {/* ─── TICKET ADDON ACTION: ONE-TAP PRE-BOOK EXTRA BAGGAGE ─────────── */}
          {compliance.status === "OVERSIZED" ? (
            <Animated.View style={{ transform: [{ scale: alertBounceAnim }] }}>
              <TouchableOpacity
                style={styles.addonActionBtn}
                onPress={handleOpenAddonModal}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#DC2626", "#B91C1C", "#991B1B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addonGradient}
                >
                  <View style={styles.addonLeftContent}>
                    <MaterialCommunityIcons
                      name="bag-suitcase-outline"
                      size={24}
                      color="#FFFFFF"
                    />
                    <View style={styles.addonTextGroup}>
                      <Text style={styles.addonBtnPrimaryText}>
                        Pre-book Extra Baggage (Save 30%)
                      </Text>
                      <Text style={styles.addonBtnSubText}>
                        Airport gate penalty: ৳3,500+ • Pre-book from ৳1,260
                      </Text>
                    </View>
                  </View>
                  <View style={styles.addonSaveBadge}>
                    <Text style={styles.addonSaveBadgeText}>-30%</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.compliantNoticeRow}>
              <Ionicons name="checkmark-done" size={18} color="#10B981" />
              <Text style={styles.compliantNoticeText}>
                No extra baggage fees needed. Proceed directly to security gate!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── PRE-BOOK EXTRA BAGGAGE ADDON MODAL ─────────────────────────────────── */}
      <Modal
        visible={isAddonModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddonModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.modalDiscountTag}>
                  <Text style={styles.modalDiscountTagText}>30% ADVANCE DISCOUNT APPLIED</Text>
                </View>
                <Text style={styles.modalTitle}>Pre-book Extra Baggage</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedAirline.name} ({selectedAirline.iataCode}) Allowance Addon
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setIsAddonModalVisible(false);
                  setAddonSuccessReceipt(null);
                }}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {addonSuccessReceipt ? (
              /* Success Confirmation Voucher State */
              <View style={styles.receiptContainer}>
                <View style={styles.receiptCheckCircle}>
                  <Ionicons name="checkmark-done-circle" size={56} color="#10B981" />
                </View>
                <Text style={styles.receiptTitle}>Baggage Addon Confirmed!</Text>
                <Text style={styles.receiptSubtitle}>
                  Saved to your booking pass. Save 30% by pre-booking before airport check-in.
                </Text>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pass Voucher ID:</Text>
                    <Text style={styles.receiptValueCode}>{addonSuccessReceipt.passId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Airline:</Text>
                    <Text style={styles.receiptValue}>{addonSuccessReceipt.airline.name}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Allowance Added:</Text>
                    <Text style={styles.receiptValueHighlight}>
                      +{addonSuccessReceipt.tier.weightKg} kg Checked Baggage
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Pre-book Price Paid:</Text>
                    <Text style={styles.receiptPriceText}>
                      ৳{addonSuccessReceipt.tier.preBookPriceBdt.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>You Saved:</Text>
                    <Text style={styles.receiptSavedText}>
                      ৳
                      {(
                        addonSuccessReceipt.tier.gatePriceBdt -
                        addonSuccessReceipt.tier.preBookPriceBdt
                      ).toLocaleString()}{" "}
                      (30%)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setIsAddonModalVisible(false);
                    setAddonSuccessReceipt(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Back to AR Sizer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Tier Selection & Comparison State */
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Visual Oversize Notice */}
                <View style={styles.modalOversizeNotice}>
                  <Ionicons name="alert-circle" size={24} color="#EF4444" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.modalNoticeTitle}>Your bag exceeds cabin limits</Text>
                    <Text style={styles.modalNoticeBody}>
                      Measured {measuredDimensions.height}×{measuredDimensions.width}×
                      {measuredDimensions.depth} cm vs {selectedAirline.name} max{" "}
                      {selectedAirline.maxDimensions.height}×{selectedAirline.maxDimensions.width}×
                      {selectedAirline.maxDimensions.depth} cm. Airport gate penalty fees start at ৳3,500+.
                    </Text>
                  </View>
                </View>

                {/* Baggage Tier Selection */}
                <View style={styles.tierSectionHeader}>
                  <Text style={styles.tierSectionTitle}>CHOOSE EXTRA WEIGHT TIER:</Text>
                  <TouchableOpacity
                    onPress={() => setCurrency((prev) => (prev === "BDT" ? "USD" : "BDT"))}
                    style={styles.currencyTogglePill}
                  >
                    <Text style={styles.currencyToggleText}>Currency: {currency}</Text>
                  </TouchableOpacity>
                </View>

                {selectedAirline.extraBaggageTiers.map((tier) => {
                  const isTierSelected = selectedTier?.id === tier.id;
                  const gatePrice =
                    currency === "BDT"
                      ? `৳${tier.gatePriceBdt.toLocaleString()}`
                      : `$${tier.gatePriceUsd}`;
                  const preBookPrice =
                    currency === "BDT"
                      ? `৳${tier.preBookPriceBdt.toLocaleString()}`
                      : `$${tier.preBookPriceUsd}`;
                  const savings =
                    currency === "BDT"
                      ? `৳${(tier.gatePriceBdt - tier.preBookPriceBdt).toLocaleString()}`
                      : `$${tier.gatePriceUsd - tier.preBookPriceUsd}`;

                  return (
                    <TouchableOpacity
                      key={tier.id}
                      style={[
                        styles.tierOptionCard,
                        isTierSelected && styles.tierOptionCardSelected,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedTier(tier);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.tierRadio}>
                        {isTierSelected ? (
                          <View style={styles.tierRadioSelected} />
                        ) : null}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.tierHeaderLine}>
                          <Text style={styles.tierWeightText}>+{tier.weightKg} kg</Text>
                          {tier.badge && (
                            <View style={styles.tierPopularBadge}>
                              <Text style={styles.tierPopularBadgeText}>{tier.badge}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.tierDescText}>{tier.description}</Text>
                        <Text style={styles.tierSavingsText}>
                          Save {savings} (30% vs Airport Gate)
                        </Text>
                      </View>

                      <View style={styles.tierPriceColumn}>
                        <Text style={styles.tierGatePriceStrike}>{gatePrice}</Text>
                        <Text style={styles.tierPrebookPrice}>{preBookPrice}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Instant Guarantee & Booking Integration */}
                <View style={styles.guaranteeBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#00E5FF" />
                  <Text style={styles.guaranteeText}>
                    Instant e-tag issued. Recognized at DAC (Dhaka), DXB (Dubai), DOH (Doha), and all airline check-in gates.
                  </Text>
                </View>

                {/* Confirm Action Button */}
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleConfirmPrebook}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#0055F2", "#0040B8"]}
                    style={styles.modalSubmitGradient}
                  >
                    <Text style={styles.modalSubmitText}>
                      Confirm Addon •{" "}
                      {currency === "BDT"
                        ? `৳${selectedTier?.preBookPriceBdt.toLocaleString() || "1,260"}`
                        : `$${selectedTier?.preBookPriceUsd || "11"}`}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── AR CLEARANCE CERTIFICATE MODAL ────────────────────────────────────── */}
      <Modal
        visible={isCertificateOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsCertificateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.certCard}>
            <View style={styles.certHeader}>
              <View style={styles.certBadge}>
                <Ionicons
                  name={compliance.isCompliant ? "shield-checkmark" : "shield"}
                  size={24}
                  color={compliance.isCompliant ? "#10B981" : "#EF4444"}
                />
              </View>
              <Text style={styles.certTitle}>AR Baggage Clearance Report</Text>
              <Text style={styles.certSubtitle}>Digital Pre-departure Inspection Certificate</Text>
            </View>

            <View style={styles.certBody}>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Airline Carrier:</Text>
                <Text style={styles.certValue}>{selectedAirline.name} ({selectedAirline.iataCode})</Text>
              </View>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Class of Travel:</Text>
                <Text style={styles.certValue}>{cabinClass}</Text>
              </View>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Measured Dimensions:</Text>
                <Text style={styles.certValueHighlight}>
                  {measuredDimensions.height} × {measuredDimensions.width} × {measuredDimensions.depth} cm
                </Text>
              </View>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Official Airline Limit:</Text>
                <Text style={styles.certValue}>
                  {selectedAirline.maxDimensions.height} × {selectedAirline.maxDimensions.width} × {selectedAirline.maxDimensions.depth} cm
                </Text>
              </View>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Fit Compliance Index:</Text>
                <Text
                  style={[
                    styles.certValue,
                    { color: compliance.isCompliant ? "#10B981" : "#EF4444", fontWeight: "bold" },
                  ]}
                >
                  {compliance.fitIndex}% ({compliance.status})
                </Text>
              </View>
              <View style={styles.certRow}>
                <Text style={styles.certLabel}>Displacement Volume:</Text>
                <Text style={styles.certValue}>{compliance.volumeLiters} Liters</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.certCloseBtn}
              onPress={() => setIsCertificateOpen(false)}
            >
              <Text style={styles.certCloseBtnText}>Close Certificate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLESHEET ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  simulatedRoom: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  simulatedText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  grantPermBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0055F2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 18,
  },
  grantPermText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Header
  topHeaderArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  circleBtnActive: {
    backgroundColor: "rgba(0, 85, 242, 0.85)",
    borderColor: "#00E5FF",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  arBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  arPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#00E5FF",
    marginRight: 6,
  },
  headerSuperTitle: {
    color: "#00E5FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerRightActions: {
    flexDirection: "row",
    gap: 8,
  },

  // Secondary Controls (Class & Cage)
  secondaryControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: "rgba(10, 15, 29, 0.5)",
  },
  classToggleGroup: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 8,
    padding: 2,
  },
  classToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classToggleBtnActive: {
    backgroundColor: "#0055F2",
  },
  classToggleText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  classToggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sizingCageToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sizingCageToggleBtnActive: {
    borderColor: "#00E5FF",
  },
  sizingCageToggleText: {
    color: "#94A3B8",
    fontSize: 10.5,
    fontWeight: "700",
  },

  // Airline Selector
  airlineSelectorWrap: {
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: "rgba(10, 15, 29, 0.65)",
  },
  sectionCaption: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 5,
  },
  airlineScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  airlineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  airlineChipSelected: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderColor: "#00E5FF",
  },
  airlineIataBadge: {
    backgroundColor: "#0055F2",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 6,
  },
  airlineIataText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  airlineChipTextWrap: {
    maxWidth: 130,
  },
  airlineChipName: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  airlineChipNameSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  airlineChipLimits: {
    color: "#94A3B8",
    fontSize: 9.5,
    marginTop: 1,
  },

  // Tracking HUD
  trackingHud: {
    position: "absolute",
    top: 175,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 15,
    gap: 8,
  },
  trackingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    gap: 8,
  },
  trackingPillText: {
    color: "#F8FAFC",
    fontSize: 11.5,
    fontWeight: "600",
  },
  trackingConfidenceBadge: {
    backgroundColor: "rgba(0, 229, 255, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  trackingConfidenceText: {
    color: "#00E5FF",
    fontSize: 10,
    fontWeight: "800",
  },
  orbitPill: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  orbitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orbitText: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "600",
  },

  // Manual Adjust Drawer
  manualAdjustDrawer: {
    position: "absolute",
    top: 230,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 25,
  },
  manualAdjustHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  manualAdjustTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  closeDrawerBtn: {
    padding: 4,
  },
  stepperGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  stepperCard: {
    flex: 1,
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  stepperLabelRow: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 4,
  },
  stepperDimName: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
  },
  stepperDiffText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  stepperValueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginVertical: 2,
  },
  stepperActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  presetLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  presetChip: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  presetChipRed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  presetChipText: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "600",
  },

  // Bottom HUD
  bottomHudContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  statusCard: {
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  statusCardCompliant: {
    borderColor: "#10B981",
  },
  statusCardOversized: {
    borderColor: "#EF4444",
  },
  statusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerRightBadges: {
    flexDirection: "row",
    gap: 6,
  },
  volumeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  weightBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  volumeText: {
    color: "#CBD5E1",
    fontSize: 10.5,
    fontWeight: "600",
  },

  // Dimension Comparison Grid
  dimensionComparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  dimEvalChip: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  dimEvalChipOk: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  dimEvalChipExceeded: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#EF4444",
  },
  dimEvalTitle: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "800",
  },
  dimEvalValue: {
    fontSize: 15,
    fontWeight: "bold",
    marginVertical: 1,
  },
  dimEvalAllowed: {
    color: "#64748B",
    fontSize: 9.5,
  },
  dimEvalOverBadge: {
    color: "#EF4444",
    fontSize: 9.5,
    fontWeight: "bold",
    marginTop: 2,
  },

  // Linear Sum Bar
  linearSumRow: {
    marginBottom: 8,
  },
  linearTextWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  linearLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  linearValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  linearTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 2,
    overflow: "hidden",
  },
  linearFill: {
    height: "100%",
    borderRadius: 2,
  },
  summaryCaptionText: {
    color: "#CBD5E1",
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },

  // One-Tap Pre-book Action Button
  addonActionBtn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  addonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addonLeftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  addonTextGroup: {
    flex: 1,
  },
  addonBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  addonBtnSubText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10.5,
    marginTop: 1,
  },
  addonSaveBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  addonSaveBadgeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "900",
  },
  compliantNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  compliantNoticeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },

  // Modal Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalDiscountTag: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EF4444",
    marginBottom: 4,
  },
  modalDiscountTagText: {
    color: "#EF4444",
    fontSize: 9.5,
    fontWeight: "800",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOversizeNotice: {
    flexDirection: "row",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    marginBottom: 16,
  },
  modalNoticeTitle: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
  },
  modalNoticeBody: {
    color: "#CBD5E1",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  tierSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tierSectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  currencyTogglePill: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currencyToggleText: {
    color: "#00E5FF",
    fontSize: 10,
    fontWeight: "700",
  },
  tierOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tierOptionCardSelected: {
    borderColor: "#00E5FF",
    backgroundColor: "rgba(30, 41, 59, 0.95)",
  },
  tierRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#64748B",
    justifyContent: "center",
    alignItems: "center",
  },
  tierRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00E5FF",
  },
  tierHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierWeightText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  tierPopularBadge: {
    backgroundColor: "#0055F2",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tierPopularBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  tierDescText: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  tierSavingsText: {
    color: "#10B981",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  tierPriceColumn: {
    alignItems: "flex-end",
  },
  tierGatePriceStrike: {
    color: "#64748B",
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  tierPrebookPrice: {
    color: "#00E5FF",
    fontSize: 16,
    fontWeight: "800",
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 85, 242, 0.15)",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginVertical: 14,
  },
  guaranteeText: {
    color: "#93C5FD",
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalSubmitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  modalSubmitGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Receipt confirmation
  receiptContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  receiptCheckCircle: {
    marginBottom: 8,
  },
  receiptTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  receiptSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  receiptCard: {
    width: "100%",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 18,
    gap: 8,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  receiptValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  receiptValueCode: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  receiptValueHighlight: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  receiptPriceText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  receiptSavedText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
  },
  doneBtn: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Certificate Modal
  certCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 255, 0.4)",
  },
  certHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  certBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  certTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  certSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  certBody: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  certLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
  },
  certValue: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "600",
  },
  certValueHighlight: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "700",
  },
  certCloseBtn: {
    backgroundColor: "#0055F2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  certCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Helper text colors
  textExceeded: {
    color: "#EF4444",
  },
  textOk: {
    color: "#10B981",
  },
});

export default LuggageMeasureScreen;
