/**
 * Geospatial Demand Heatmap & Predictive Surge Screen - Enterprise Admin Systems
 * Visualizes real-time travel search demand, route congestion, and hotel occupancy density.
 * Provides live search velocity tracking, algorithmic surge recommendations, and one-click financial CSV/Excel export.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
  Rect,
} from "react-native-svg";

import {
  heatmapService,
  DistrictHeatmapPoint,
  RouteCongestionData,
  SearchVelocityRecord,
  SurgeRecommendation,
  HeatmapOverviewMetrics,
  HeatDensityStatus,
  HeatLayerMode,
  TimeWindow,
} from "@/services/admin/heatmapService";
import { AdminUser } from "@/types/admin";


// Major transit routes connecting Bangladesh travel corridors for map visualization
const MAP_CORRIDOR_VECTORS = [
  // Dhaka to Chittagong to Cox's Bazar
  { from: { x: 205, y: 180 }, to: { x: 310, y: 285 }, name: "Dhaka - Ctg", congestion: "critical" },
  { from: { x: 310, y: 285 }, to: { x: 342, y: 350 }, name: "Ctg - Cox's Bazar", congestion: "critical" },
  // Dhaka to Sylhet and Moulvibazar
  { from: { x: 205, y: 180 }, to: { x: 300, y: 130 }, name: "Dhaka - Sreemangal", congestion: "heavy" },
  { from: { x: 300, y: 130 }, to: { x: 310, y: 95 }, name: "Sreemangal - Sylhet", congestion: "heavy" },
  { from: { x: 310, y: 95 }, to: { x: 275, y: 80 }, name: "Sylhet - Tanguar Haor", congestion: "moderate" },
  // Dhaka to Padma Bridge / Barisal / Kuakata
  { from: { x: 205, y: 180 }, to: { x: 200, y: 265 }, name: "Dhaka - Barisal Expressway", congestion: "heavy" },
  { from: { x: 200, y: 265 }, to: { x: 190, y: 320 }, name: "Barisal - Kuakata Beach", congestion: "critical" },
  // Dhaka to Khulna / Sundarbans
  { from: { x: 205, y: 180 }, to: { x: 140, y: 260 }, name: "Dhaka - Khulna", congestion: "moderate" },
  // Dhaka to Bogura and North
  { from: { x: 205, y: 180 }, to: { x: 135, y: 105 }, name: "Dhaka - Bogura Highway", congestion: "moderate" },
  { from: { x: 135, y: 105 }, to: { x: 125, y: 55 }, name: "Bogura - Rangpur", congestion: "normal" },
  { from: { x: 125, y: 55 }, to: { x: 80, y: 20 }, name: "Rangpur - Panchagarh Tetulia", congestion: "moderate" },
  // Chittagong to Bandarban / Rangamati
  { from: { x: 310, y: 285 }, to: { x: 345, y: 295 }, name: "Ctg - Bandarban Hills", congestion: "moderate" },
  { from: { x: 310, y: 285 }, to: { x: 340, y: 245 }, name: "Ctg - Rangamati Kaptai", congestion: "normal" },
];

interface DemandHeatmapScreenProps {
  admin?: AdminUser | null;
  onNavigateTab?: (tab: string) => void;
}

export const DemandHeatmapScreen: React.FC<DemandHeatmapScreenProps> = ({
  admin,
  onNavigateTab,
}) => {
  // State: Data
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [points, setPoints] = useState<DistrictHeatmapPoint[]>([]);
  const [overview, setOverview] = useState<HeatmapOverviewMetrics | null>(null);
  const [routes, setRoutes] = useState<RouteCongestionData[]>([]);
  const [velocityRecords, setVelocityRecords] = useState<SearchVelocityRecord[]>([]);
  const [recommendations, setRecommendations] = useState<SurgeRecommendation[]>([]);

  // State: Filter & Control
  const [activeLayer, setActiveLayer] = useState<HeatLayerMode>("combined");
  const [selectedDivision, setSelectedDivision] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [velocityWindow, setVelocityWindow] = useState<TimeWindow>("1h");
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictHeatmapPoint | null>(null);
  const [mapScale, setMapScale] = useState<number>(1.0);

  // State: Modals & Actions
  const [selectedRecForAction, setSelectedRecForAction] = useState<SurgeRecommendation | null>(null);
  const [customCommissionDelta, setCustomCommissionDelta] = useState<string>("");
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [exportProcessing, setExportProcessing] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (notificationMessage) {
      const timer = setTimeout(() => setNotificationMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notificationMessage]);

  // Load initial data
  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [fetchedPoints, fetchedOverview, fetchedRoutes, fetchedVelocity, fetchedRecs] =
        await Promise.all([
          heatmapService.getDistrictHeatmapData(),
          heatmapService.getHeatmapOverviewMetrics(),
          heatmapService.getRouteCongestionCorridors(),
          heatmapService.getLiveSearchVelocity(velocityWindow),
          heatmapService.getSurgeRecommendations(),
        ]);

      setPoints(fetchedPoints);
      setOverview(fetchedOverview);
      setRoutes(fetchedRoutes);
      setVelocityRecords(fetchedVelocity);
      setRecommendations(fetchedRecs);
    } catch (err) {
      console.error("[DemandHeatmapScreen] Failed to load data:", err);
      Alert.alert("Data Error", "Unable to load live geospatial telemetry. Using cached dataset.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Re-fetch velocity when window changes
  useEffect(() => {
    const fetchVelocity = async () => {
      try {
        const records = await heatmapService.getLiveSearchVelocity(velocityWindow);
        setVelocityRecords(records);
      } catch (err) {
        console.error("Error refreshing velocity:", err);
      }
    };
    fetchVelocity();
  }, [velocityWindow]);

  // Divisions list for filters
  const divisions = ["All", "Dhaka", "Chittagong", "Sylhet", "Khulna", "Barisal", "Rajshahi", "Rangpur", "Mymensingh"];

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return points.filter((p) => {
      const matchesDivision = selectedDivision === "All" || p.division.toLowerCase() === selectedDivision.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        p.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.districtBn.includes(searchQuery) ||
        p.division.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDivision && matchesSearch;
    });
  }, [points, selectedDivision, searchQuery]);

  // Handle recommendation action
  const handleOpenActionModal = (rec: SurgeRecommendation) => {
    setSelectedRecForAction(rec);
    setCustomCommissionDelta(String(rec.commissionDelta));
  };

  const handleApplySurgePolicy = async () => {
    if (!selectedRecForAction) return;
    setActionSubmitting(true);
    try {
      const res = await heatmapService.applyRecommendation(
        selectedRecForAction.id,
        admin?.id || "super-admin"
      );
      if (res.success) {
        setNotificationMessage(res.message);
        // Refresh recommendations
        const updated = await heatmapService.getSurgeRecommendations();
        setRecommendations(updated);
        setSelectedRecForAction(null);
      } else {
        Alert.alert("Policy Application Failed", res.message);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update commission bounds.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDismissPolicy = async (recId: string) => {
    await heatmapService.dismissRecommendation(recId);
    const updated = await heatmapService.getSurgeRecommendations();
    setRecommendations(updated);
    setNotificationMessage("Surge policy recommendation dismissed.");
  };

  // Export handlers
  const handleExportCSV = async (type: "master" | "districts" | "velocity" | "recommendations") => {
    setExportProcessing(true);
    try {
      let filename = "";
      let content = "";

      if (type === "master") {
        const res = await heatmapService.exportMasterExecutiveReport();
        filename = res.filename;
        content = res.content;
      } else if (type === "districts") {
        filename = `Shopno_Jatra_District_Heatmap_${Date.now()}.csv`;
        content = "\uFEFF" + (await heatmapService.exportDistrictHeatmapCSV());
      } else if (type === "velocity") {
        filename = `Shopno_Jatra_Search_Velocity_${velocityWindow}_${Date.now()}.csv`;
        content = "\uFEFF" + (await heatmapService.exportSearchVelocityCSV(velocityWindow));
      } else if (type === "recommendations") {
        filename = `Shopno_Jatra_Surge_Recommendations_${Date.now()}.csv`;
        content = "\uFEFF" + (await heatmapService.exportSurgeRecommendationsCSV());
      }

      const result = await heatmapService.downloadOrShareExport(filename, content);
      if (result.success) {
        setExportModalVisible(false);
        setNotificationMessage(`Export successfully generated: ${filename}`);
      } else {
        Alert.alert("Export Error", "Could not complete file download. Please check storage permissions.");
      }
    } catch (err: any) {
      Alert.alert("Export Failed", err.message || "Could not generate CSV export.");
    } finally {
      setExportProcessing(false);
    }
  };

  // Helper color functions for layer rendering
  const getNodeColor = (point: DistrictHeatmapPoint) => {
    if (activeLayer === "hotel_occupancy") {
      if (point.hotelOccupancyRate >= 85) return "#ef4444"; // High occupancy (Red)
      if (point.hotelOccupancyRate >= 60) return "#10b981"; // Balanced (Green)
      return "#3b82f6"; // Low occupancy (Blue)
    }

    if (activeLayer === "route_congestion") {
      if (point.routeCongestionIndex >= 75) return "#ef4444";
      if (point.routeCongestionIndex >= 50) return "#f59e0b";
      return "#10b981";
    }

    if (activeLayer === "search_demand") {
      if (point.searchVolume >= 5000) return "#ef4444";
      if (point.searchVolume >= 2000) return "#10b981";
      return "#3b82f6";
    }

    // Default "combined": Red = High demand / low supply, Green = Balanced, Blue = Low demand
    if (point.status === "high_demand_low_supply") return "#ef4444";
    if (point.status === "balanced") return "#10b981";
    return "#3b82f6";
  };

  const getNodeRadius = (point: DistrictHeatmapPoint) => {
    if (point.status === "high_demand_low_supply") return 11;
    if (point.isPopularTouristHub) return 9;
    return 6;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Initializing Geospatial Analytics Engine...</Text>
        <Text style={styles.loadingSubtext}>Aggregating live searches, hotel capacity & route telemetry</Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      {/* Toast Notification Banner */}
      {notificationMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.toastText}>{notificationMessage}</Text>
          <TouchableOpacity onPress={() => setNotificationMessage(null)}>
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} colors={["#4f46e5"]} />
        }
      >
        {/* ==================================================================== */}
        {/* HEADER & EXECUTIVE TOOLBAR */}
        {/* ==================================================================== */}
        <View style={styles.headerRow}>
          <View>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.screenTitle}>Geospatial Demand Heatmap</Text>
              <View style={styles.livePill}>
                <View style={styles.livePillDot} />
                <Text style={styles.livePillText}>LIVE TELEMETRY</Text>
              </View>
            </View>
            <Text style={styles.screenSubtitle}>
              Real-time travel search velocity, route bottlenecks, and predictive B2B surge balancing
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.exportHeaderBtn}
              onPress={() => setExportModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="file-excel-box" size={18} color="#ffffff" />
              <Text style={styles.exportHeaderBtnText}>Export Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => loadAllData(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================================== */}
        {/* EXECUTIVE KPI SUMMARY CARDS */}
        {/* ==================================================================== */}
        {overview && (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>Active Searches (24h)</Text>
                <MaterialCommunityIcons name="radar" size={16} color="#4f46e5" />
              </View>
              <Text style={styles.kpiValue}>{overview.totalActiveSearches.toLocaleString()}</Text>
              <View style={styles.kpiFooter}>
                <Feather name="trending-up" size={12} color="#10b981" />
                <Text style={styles.kpiFooterText}>~{overview.velocityPerHour} searches/hr</Text>
              </View>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardRed]}>
              <View style={styles.kpiHeaderRow}>
                <Text style={[styles.kpiLabel, { color: "#dc2626" }]}>Bottleneck Zones (Red)</Text>
                <MaterialCommunityIcons name="fire-alert" size={16} color="#ef4444" />
              </View>
              <Text style={[styles.kpiValue, { color: "#b91c1c" }]}>{overview.highDemandDistrictsCount} Districts</Text>
              <Text style={styles.kpiSubdetail}>High search surge / low supply</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardGreen]}>
              <View style={styles.kpiHeaderRow}>
                <Text style={[styles.kpiLabel, { color: "#15803d" }]}>Balanced Supply (Green)</Text>
                <MaterialCommunityIcons name="scale-balance" size={16} color="#10b981" />
              </View>
              <Text style={[styles.kpiValue, { color: "#166534" }]}>{overview.balancedDistrictsCount} Districts</Text>
              <Text style={styles.kpiSubdetail}>Healthy 1:1 capacity equilibrium</Text>
            </View>

            <View style={[styles.kpiCard, styles.kpiCardBlue]}>
              <View style={styles.kpiHeaderRow}>
                <Text style={[styles.kpiLabel, { color: "#1d4ed8" }]}>Hotel Occupancy Avg</Text>
                <MaterialCommunityIcons name="bed-king-outline" size={16} color="#3b82f6" />
              </View>
              <Text style={[styles.kpiValue, { color: "#1e40af" }]}>{overview.averageOccupancyRate}%</Text>
              <Text style={styles.kpiSubdetail}>
                {overview.criticalRoutesCount} critical transit bottlenecks
              </Text>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* REQUIREMENT 1: GEOSPATIAL HEATMAP VIEW */}
        {/* ==================================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#4f46e5" />
                <Text style={styles.sectionTitle}>District Heat Density Map</Text>
              </View>
              <Text style={styles.sectionSub}>
                Interactive 64-district matrix with heat density layers over national corridors
              </Text>
            </View>

            {/* Map Scale / Reset Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity
                style={styles.scaleBtn}
                onPress={() => setMapScale((prev) => Math.min(1.4, prev + 0.1))}
              >
                <Ionicons name="add" size={16} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scaleBtn}
                onPress={() => setMapScale((prev) => Math.max(0.8, prev - 0.1))}
              >
                <Ionicons name="remove" size={16} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.scaleBtn} onPress={() => setMapScale(1.0)}>
                <Ionicons name="scan-outline" size={14} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Layer Selector Bar */}
          <View style={styles.layerSelectorBar}>
            <Text style={styles.layerBarLabel}>Density Layer:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerPills}>
              {[
                { id: "combined", label: "Demand/Supply Pressure", icon: "layers-triple" },
                { id: "search_demand", label: "Live Search Demand", icon: "magnify-expand" },
                { id: "route_congestion", label: "Route Congestion Index", icon: "road-variant" },
                { id: "hotel_occupancy", label: "Hotel Occupancy Density", icon: "office-building-marker" },
              ].map((layer) => {
                const isActive = activeLayer === layer.id;
                return (
                  <TouchableOpacity
                    key={layer.id}
                    style={[styles.layerPill, isActive && styles.layerPillActive]}
                    onPress={() => setActiveLayer(layer.id as HeatLayerMode)}
                  >
                    <MaterialCommunityIcons
                      name={layer.icon as any}
                      size={14}
                      color={isActive ? "#ffffff" : "#475569"}
                    />
                    <Text style={[styles.layerPillText, isActive && styles.layerPillTextActive]}>
                      {layer.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Division Filter & District Search */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.divisionPills}>
              {divisions.map((div) => {
                const isSelected = selectedDivision === div;
                return (
                  <TouchableOpacity
                    key={div}
                    style={[styles.divPill, isSelected && styles.divPillActive]}
                    onPress={() => setSelectedDivision(div)}
                  >
                    <Text style={[styles.divPillText, isSelected && styles.divPillTextActive]}>{div}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={14} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search district / hub..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Heatmap Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
              <Text style={styles.legendText}>
                {activeLayer === "hotel_occupancy"
                  ? "Occupancy >= 85%"
                  : activeLayer === "route_congestion"
                  ? "Severe Delay (Index > 75)"
                  : "Red: High Demand / Low Supply (Bottleneck)"}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
              <Text style={styles.legendText}>
                {activeLayer === "hotel_occupancy"
                  ? "Occupancy 60% - 84%"
                  : activeLayer === "route_congestion"
                  ? "Fluid (Index < 50)"
                  : "Green: Balanced Equilibrium"}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#3b82f6" }]} />
              <Text style={styles.legendText}>
                {activeLayer === "hotel_occupancy"
                  ? "Occupancy < 60%"
                  : activeLayer === "route_congestion"
                  ? "Minimal Traffic"
                  : "Blue: Low Demand / Surplus Capacity"}
              </Text>
            </View>
          </View>

          {/* SVG Map Canvas */}
          <View style={styles.mapCanvasWrapper}>
            <View
              style={[
                styles.mapSvgContainer,
                {
                  transform: [{ scale: mapScale }],
                },
              ]}
            >
              <Svg width={380} height={380} viewBox="0 0 380 380">
                <Defs>
                  <SvgLinearGradient id="mapBgGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#0f172a" />
                    <Stop offset="100%" stopColor="#1e293b" />
                  </SvgLinearGradient>
                  {/* Glowing filter gradients for heat nodes */}
                  <SvgLinearGradient id="redGlow" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                    <Stop offset="100%" stopColor="#dc2626" stopOpacity="0.1" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="greenGlow" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <Stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="blueGlow" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <Stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
                  </SvgLinearGradient>
                </Defs>

                {/* Map Geographic Backdrop Canvas */}
                <Rect x="0" y="0" width="380" height="380" rx="14" fill="url(#mapBgGrad)" />

                {/* Coordinate Grid Guidelines */}
                {[60, 120, 180, 240, 300].map((coord) => (
                  <Line
                    key={`grid-x-${coord}`}
                    x1={coord}
                    y1={10}
                    x2={coord}
                    y2={370}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3,4"
                  />
                ))}
                {[60, 120, 180, 240, 300].map((coord) => (
                  <Line
                    key={`grid-y-${coord}`}
                    x1={10}
                    y1={coord}
                    x2={370}
                    y2={coord}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3,4"
                  />
                ))}

                {/* Country Geographic Boundary Silhouette (Abstract outline of Bangladesh) */}
                <Path
                  d="M 80 20 L 140 35 L 180 75 L 235 90 L 310 95 L 340 140 L 310 180 L 340 240 L 350 355 L 310 320 L 250 250 L 200 330 L 170 310 L 140 280 L 100 270 L 75 190 L 70 120 L 80 20 Z"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeOpacity="0.6"
                />

                {/* Major Transit Corridor Vectors */}
                {MAP_CORRIDOR_VECTORS.map((vec, idx) => {
                  const isCongested = vec.congestion === "critical";
                  const lineColor =
                    vec.congestion === "critical"
                      ? "#ef4444"
                      : vec.congestion === "heavy"
                      ? "#f59e0b"
                      : "#38bdf8";
                  return (
                    <Line
                      key={`vec-${idx}`}
                      x1={vec.from.x}
                      y1={vec.from.y}
                      x2={vec.to.x}
                      y2={vec.to.y}
                      stroke={lineColor}
                      strokeWidth={isCongested ? 2.2 : 1.2}
                      strokeDasharray={isCongested ? "4,3" : "none"}
                      opacity={0.7}
                    />
                  );
                })}

                {/* District Heat Nodes */}
                {filteredDistricts.map((point) => {
                  const color = getNodeColor(point);
                  const radius = getNodeRadius(point);
                  const isSelected = selectedDistrict?.districtId === point.districtId;

                  return (
                    <G key={point.districtId}>
                      {/* Outer pulse/glow halo for surging districts */}
                      {(point.status === "high_demand_low_supply" || isSelected) && (
                        <Circle
                          cx={point.svgCoord.x}
                          cy={point.svgCoord.y}
                          r={radius * 1.8}
                          fill={color}
                          opacity={0.22}
                        />
                      )}

                      {/* Main node dot */}
                      <Circle
                        cx={point.svgCoord.x}
                        cy={point.svgCoord.y}
                        r={radius}
                        fill={color}
                        stroke={isSelected ? "#ffffff" : "#0f172a"}
                        strokeWidth={isSelected ? 2.5 : 1.2}
                      />

                      {/* District Label (for key hubs or when selected) */}
                      {(point.isPopularTouristHub || isSelected || filteredDistricts.length < 15) && (
                        <SvgText
                          x={point.svgCoord.x}
                          y={point.svgCoord.y - radius - 3}
                          fill={isSelected ? "#38bdf8" : "#cbd5e1"}
                          fontSize={isSelected ? "9" : "8"}
                          fontWeight={isSelected ? "bold" : "600"}
                          textAnchor="middle"
                        >
                          {point.districtName}
                        </SvgText>
                      )}
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Quick Map Instruction Banner */}
            <View style={styles.mapCanvasFooter}>
              <Text style={styles.mapCanvasFooterText}>
                Showing {filteredDistricts.length} active districts in {selectedDivision} division • Tap a district below for full telemetry
              </Text>
            </View>
          </View>

          {/* District Quick-Select Carousel / Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtChipsContainer}
          >
            {filteredDistricts.map((point) => {
              const isSelected = selectedDistrict?.districtId === point.districtId;
              const color = getNodeColor(point);
              return (
                <TouchableOpacity
                  key={point.districtId}
                  style={[
                    styles.districtChip,
                    isSelected && styles.districtChipActive,
                    { borderLeftColor: color, borderLeftWidth: 3 },
                  ]}
                  onPress={() => setSelectedDistrict(point)}
                >
                  <View style={styles.districtChipHeader}>
                    <Text style={[styles.districtChipName, isSelected && styles.districtChipNameActive]}>
                      {point.districtName}
                    </Text>
                    <View style={[styles.statusMiniDot, { backgroundColor: color }]} />
                  </View>
                  <Text style={styles.districtChipSub}>
                    {point.searchVolume.toLocaleString()} searches • {point.hotelOccupancyRate}% Occ
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected District Telemetry Drawer */}
          {selectedDistrict && (
            <View style={styles.districtTelemetryDrawer}>
              <View style={styles.drawerHeader}>
                <View>
                  <View style={styles.drawerTitleRow}>
                    <Text style={styles.drawerDistrictTitle}>{selectedDistrict.districtName}</Text>
                    <Text style={styles.drawerDistrictBn}>({selectedDistrict.districtBn})</Text>
                    <View
                      style={[
                        styles.drawerStatusBadge,
                        {
                          backgroundColor:
                            selectedDistrict.status === "high_demand_low_supply"
                              ? "#fee2e2"
                              : selectedDistrict.status === "balanced"
                              ? "#dcfce7"
                              : "#dbeafe",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.drawerStatusText,
                          {
                            color:
                              selectedDistrict.status === "high_demand_low_supply"
                                ? "#dc2626"
                                : selectedDistrict.status === "balanced"
                                ? "#16a34a"
                                : "#2563eb",
                          },
                        ]}
                      >
                        {selectedDistrict.status === "high_demand_low_supply"
                          ? "CRITICAL BOTTLENECK"
                          : selectedDistrict.status === "balanced"
                          ? "BALANCED EQUILIBRIUM"
                          : "SURPLUS CAPACITY"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.drawerCategoryText}>
                    {selectedDistrict.topTravelCategory} • {selectedDistrict.division} Division
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setSelectedDistrict(null)}>
                  <Ionicons name="close-circle-outline" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* District Metrics Grid */}
              <View style={styles.drawerMetricsGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Search Volume (24h)</Text>
                  <Text style={styles.metricBigVal}>{selectedDistrict.searchVolume.toLocaleString()}</Text>
                  <Text style={styles.metricSubVal}>~{selectedDistrict.searchVelocity} searches/hr</Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Total Supply</Text>
                  <Text style={styles.metricBigVal}>{selectedDistrict.availableSupply.toLocaleString()}</Text>
                  <Text style={styles.metricSubVal}>Rooms & Transit seats</Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Demand/Supply Ratio</Text>
                  <Text
                    style={[
                      styles.metricBigVal,
                      {
                        color:
                          selectedDistrict.demandSupplyRatio >= 1.7
                            ? "#dc2626"
                            : selectedDistrict.demandSupplyRatio >= 0.8
                            ? "#16a34a"
                            : "#2563eb",
                      },
                    ]}
                  >
                    {selectedDistrict.demandSupplyRatio}x
                  </Text>
                  <Text style={styles.metricSubVal}>
                    {selectedDistrict.demandSupplyRatio >= 1.7 ? "High supply deficit" : "Adequate capacity"}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Hotel Occupancy</Text>
                  <Text style={styles.metricBigVal}>{selectedDistrict.hotelOccupancyRate}%</Text>
                  <Text style={styles.metricSubVal}>
                    {selectedDistrict.bookedRooms}/{selectedDistrict.totalHotelRooms} rooms booked
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Route Congestion Index</Text>
                  <Text
                    style={[
                      styles.metricBigVal,
                      {
                        color:
                          selectedDistrict.routeCongestionIndex >= 75
                            ? "#dc2626"
                            : selectedDistrict.routeCongestionIndex >= 50
                            ? "#d97706"
                            : "#16a34a",
                      },
                    ]}
                  >
                    {selectedDistrict.routeCongestionIndex}/100
                  </Text>
                  <Text style={styles.metricSubVal}>
                    {selectedDistrict.activeTransitCorridors} active transit arteries
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Revenue Opportunity</Text>
                  <Text style={[styles.metricBigVal, { color: "#4f46e5" }]}>
                    BDT {Math.round(selectedDistrict.revenueOpportunityBDT / 1000)}k
                  </Text>
                  <Text style={styles.metricSubVal}>Dynamic surge potential</Text>
                </View>
              </View>

              {/* Predictive Surge Incentive Box */}
              {selectedDistrict.status === "high_demand_low_supply" && (
                <View style={styles.surgeIncentiveAlert}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#b45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.surgeAlertTitle}>Recommended Action: Increase Agency Commission</Text>
                    <Text style={styles.surgeAlertBody}>
                      Suggest adjusting local agency commission by{" "}
                      <Text style={{ fontWeight: "bold" }}>
                        +{selectedDistrict.recommendedCommissionAdjustment}%
                      </Text>{" "}
                      to unlock reserved room blocks and alleviate inventory shortage.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.surgeActionBtn}
                    onPress={() => {
                      const rec = recommendations.find((r) => r.districtId === selectedDistrict.districtId);
                      if (rec) handleOpenActionModal(rec);
                      else {
                        Alert.alert("Notice", "Surge policy already aligned with current inventory.");
                      }
                    }}
                  >
                    <Text style={styles.surgeActionBtnText}>Adjust Policy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ==================================================================== */}
        {/* REQUIREMENT 2: LIVE SEARCH VELOCITY TRACKER */}
        {/* ==================================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color="#4f46e5" />
                <Text style={styles.sectionTitle}>Live Search Velocity Tracker</Text>
              </View>
              <Text style={styles.sectionSub}>
                Real-time destination search frequency, velocity surges, and conversion rates
              </Text>
            </View>

            {/* Time Window Selector (1h, 6h, 24h) */}
            <View style={styles.windowToggle}>
              {(["1h", "6h", "24h"] as TimeWindow[]).map((win) => {
                const isActive = velocityWindow === win;
                return (
                  <TouchableOpacity
                    key={win}
                    style={[styles.windowBtn, isActive && styles.windowBtnActive]}
                    onPress={() => setVelocityWindow(win)}
                  >
                    <Text style={[styles.windowBtnText, isActive && styles.windowBtnTextActive]}>
                      Past {win}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Velocity Cards List */}
          <View style={styles.velocityList}>
            {velocityRecords.map((item, idx) => (
              <View key={item.destinationId} style={styles.velocityCard}>
                <View style={styles.velocityCardHeader}>
                  <View style={styles.destRankBadge}>
                    <Text style={styles.destRankText}>#{idx + 1}</Text>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={styles.destNameRow}>
                      <Text style={styles.destNameText}>{item.destinationName}</Text>
                      {item.isSurging && (
                        <View style={styles.surgeTag}>
                          <Ionicons name="flame" size={12} color="#dc2626" />
                          <Text style={styles.surgeTagText}>SURGE +{item.changePercent}%</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.destCategoryText}>
                      {item.category} • {item.district}, {item.division}
                    </Text>
                  </View>

                  <View style={styles.velocityMetricsRight}>
                    <Text style={styles.searchCountBig}>{item.searchCount.toLocaleString()}</Text>
                    <Text style={styles.velocitySubText}>{item.velocityPerHour} searches/hr</Text>
                  </View>
                </View>

                {/* Sub-row: Origins & Conversion Rate */}
                <View style={styles.velocityCardFooter}>
                  <View style={styles.originsRow}>
                    <Text style={styles.originsLabel}>Top Search Origins:</Text>
                    {item.topOrigins.map((orig, oIdx) => (
                      <View key={oIdx} style={styles.originPill}>
                        <Text style={styles.originPillText}>
                          {orig.city} ({orig.sharePercent}%)
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.conversionBadge}>
                    <MaterialCommunityIcons name="cart-check" size={14} color="#16a34a" />
                    <Text style={styles.conversionText}>{item.conversionRatePercent}% Conversion</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ==================================================================== */}
        {/* MAJOR TRANSIT CORRIDOR CONGESTION MONITOR */}
        {/* ==================================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="highway" size={20} color="#4f46e5" />
                <Text style={styles.sectionTitle}>Inter-District Route Congestion</Text>
              </View>
              <Text style={styles.sectionSub}>
                Live highway, railway, domestic aviation, and river transit saturation levels
              </Text>
            </View>
          </View>

          <View style={styles.routesGrid}>
            {routes.map((rt) => {
              const isCritical = rt.congestionLevel === "critical";
              const isHeavy = rt.congestionLevel === "heavy";
              const levelColor = isCritical ? "#ef4444" : isHeavy ? "#f59e0b" : "#10b981";

              return (
                <View key={rt.id} style={styles.routeCard}>
                  <View style={styles.routeCardHeader}>
                    <View style={styles.routeIconBox}>
                      <MaterialCommunityIcons
                        name={
                          rt.transitType === "domestic_flight"
                            ? "airplane"
                            : rt.transitType === "railway"
                            ? "train"
                            : rt.transitType === "water_launch"
                            ? "ferry"
                            : "bus"
                        }
                        size={20}
                        color="#4f46e5"
                      />
                    </View>
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.routeNameText}>{rt.routeName}</Text>
                      <Text style={styles.routeTerminalsText}>
                        {rt.origin} ➔ {rt.destination}
                      </Text>
                    </View>

                    <View style={[styles.congestionBadge, { backgroundColor: `${levelColor}15` }]}>
                      <View style={[styles.statusMiniDot, { backgroundColor: levelColor }]} />
                      <Text style={[styles.congestionBadgeText, { color: levelColor }]}>
                        {rt.congestionLevel.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeProgressRow}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, rt.occupancyPercent)}%`,
                            backgroundColor: levelColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.occupancyPercentText}>{rt.occupancyPercent}% Booked</Text>
                  </View>

                  <View style={styles.routeStatsRow}>
                    <View style={styles.routeStatItem}>
                      <Text style={styles.routeStatLabel}>Capacity</Text>
                      <Text style={styles.routeStatVal}>
                        {rt.bookedSeats.toLocaleString()} / {rt.capacitySeats.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.routeStatItem}>
                      <Text style={styles.routeStatLabel}>Est. Delay</Text>
                      <Text style={[styles.routeStatVal, { color: isCritical ? "#dc2626" : "#334155" }]}>
                        +{rt.avgDelayMinutes} mins
                      </Text>
                    </View>
                    <View style={styles.routeStatItem}>
                      <Text style={styles.routeStatLabel}>Dynamic Surge</Text>
                      <Text style={[styles.routeStatVal, { color: "#4f46e5", fontWeight: "700" }]}>
                        {rt.ticketSurgeMultiplier}x
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ==================================================================== */}
        {/* REQUIREMENT 3: PREDICTIVE SURGE RECOMMENDER */}
        {/* ==================================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="brain" size={20} color="#4f46e5" />
                <Text style={styles.sectionTitle}>Predictive Surge Recommender</Text>
              </View>
              <Text style={styles.sectionSub}>
                Algorithmic commission and pricing recommendations to balance supplier inventory in high-demand zones
              </Text>
            </View>
          </View>

          <View style={styles.recsList}>
            {recommendations.map((rec) => {
              const isApplied = rec.status === "applied";
              const isDismissed = rec.status === "dismissed";
              const isCritical = rec.severity === "critical";

              return (
                <View
                  key={rec.id}
                  style={[
                    styles.recCard,
                    isCritical && styles.recCardCritical,
                    isApplied && styles.recCardApplied,
                  ]}
                >
                  <View style={styles.recHeaderRow}>
                    <View style={styles.recZoneInfo}>
                      <View style={styles.recZonePill}>
                        <MaterialCommunityIcons name="map-marker" size={14} color="#ffffff" />
                        <Text style={styles.recZoneText}>
                          {rec.districtName} ({rec.division})
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.severityPill,
                          {
                            backgroundColor:
                              rec.severity === "critical"
                                ? "#fee2e2"
                                : rec.severity === "warning"
                                ? "#fef3c7"
                                : "#dbeafe",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                rec.severity === "critical"
                                  ? "#dc2626"
                                  : rec.severity === "warning"
                                  ? "#d97706"
                                  : "#2563eb",
                            },
                          ]}
                        >
                          {rec.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recStatusBadge}>
                      <Text
                        style={[
                          styles.recStatusText,
                          {
                            color: isApplied ? "#16a34a" : isDismissed ? "#94a3b8" : "#d97706",
                          },
                        ]}
                      >
                        {rec.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.recHeadline}>{rec.headline}</Text>
                  <Text style={styles.recRationale}>{rec.rationale}</Text>

                  {/* Recommendation Metric Breakdown */}
                  <View style={styles.recMetricsTable}>
                    <View style={styles.recMetricColumn}>
                      <Text style={styles.recMetricHeader}>Current Agency Comm.</Text>
                      <Text style={styles.recMetricVal}>{rec.currentCommissionPercent}%</Text>
                    </View>

                    <View style={styles.recMetricColumn}>
                      <Text style={styles.recMetricHeader}>Suggested Comm.</Text>
                      <Text style={[styles.recMetricVal, { color: "#16a34a", fontWeight: "800" }]}>
                        {rec.suggestedCommissionPercent}% ({rec.commissionDelta > 0 ? "+" : ""}
                        {rec.commissionDelta}%)
                      </Text>
                    </View>

                    <View style={styles.recMetricColumn}>
                      <Text style={styles.recMetricHeader}>Projected Supply Boost</Text>
                      <Text style={styles.recMetricVal}>+{rec.projectedSupplyBoostUnits} units</Text>
                    </View>

                    <View style={styles.recMetricColumn}>
                      <Text style={styles.recMetricHeader}>Est. GMV Lift</Text>
                      <Text style={[styles.recMetricVal, { color: "#4f46e5", fontWeight: "700" }]}>
                        BDT {Math.round(rec.projectedGmvLiftBDT / 1000)}k
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.recActionRow}>
                    {isApplied ? (
                      <View style={styles.appliedSuccessBadge}>
                        <Ionicons name="checkmark-done-circle" size={16} color="#16a34a" />
                        <Text style={styles.appliedSuccessText}>
                          Policy Active • Agency commission bounds broadcasted
                        </Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.applyRecBtn}
                          onPress={() => handleOpenActionModal(rec)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="flash" size={14} color="#ffffff" />
                          <Text style={styles.applyRecBtnText}>Apply Commission Policy</Text>
                        </TouchableOpacity>

                        {!isDismissed && (
                          <TouchableOpacity
                            style={styles.dismissRecBtn}
                            onPress={() => handleDismissPolicy(rec.id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.dismissRecBtnText}>Dismiss</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ==================================================================== */}
      {/* REQUIREMENT 4: EXPORT ANALYTICS MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="file-export-outline" size={22} color="#4f46e5" />
                <Text style={styles.modalTitle}>Export Financial & Geospatial Analytics</Text>
              </View>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              One-click export formatted for Microsoft Excel & Google Sheets with UTF-8 Unicode support.
            </Text>

            {exportProcessing ? (
              <View style={styles.exportProgressBox}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={styles.exportProgressText}>Generating CSV dataset and compiling metrics...</Text>
              </View>
            ) : (
              <View style={styles.exportOptionsList}>
                <TouchableOpacity
                  style={[styles.exportOptionCard, styles.exportOptionPrimary]}
                  onPress={() => handleExportCSV("master")}
                  activeOpacity={0.8}
                >
                  <View style={styles.exportOptionIconBox}>
                    <MaterialCommunityIcons name="file-table-box-multiple" size={24} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionPrimaryTitle}>Executive Master Geospatial Report (All Sheets)</Text>
                    <Text style={styles.exportOptionPrimarySub}>
                      Comprehensive package containing District Heatmap, Transit Congestion, and Commission Surge Matrices.
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExportCSV("districts")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.exportOptionIconBox, { backgroundColor: "#fee2e2" }]}>
                    <MaterialCommunityIcons name="map-marker-distance" size={22} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>District Heatmap & Occupancy (.csv)</Text>
                    <Text style={styles.exportOptionSub}>
                      All 64 districts with search counts, occupancy %, demand-to-supply ratios, and revenue opportunities.
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="download" size={18} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExportCSV("velocity")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.exportOptionIconBox, { backgroundColor: "#dbeafe" }]}>
                    <MaterialCommunityIcons name="speedometer" size={22} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>Live Search Velocity ({velocityWindow}) (.csv)</Text>
                    <Text style={styles.exportOptionSub}>
                      Destination surge velocity per hour, conversion %, and primary traveler origin cities.
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="download" size={18} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportOptionCard}
                  onPress={() => handleExportCSV("recommendations")}
                  activeOpacity={0.8}
                >
                  <View style={[styles.exportOptionIconBox, { backgroundColor: "#dcfce7" }]}>
                    <MaterialCommunityIcons name="scale-balance" size={22} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportOptionTitle}>Surge Commission Recommendations (.csv)</Text>
                    <Text style={styles.exportOptionSub}>
                      Automated B2B commission deltas, rationale, projected inventory unlocks, and financial GMV lift.
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="download" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setExportModalVisible(false)}
                disabled={exportProcessing}
              >
                <Text style={styles.cancelModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================================== */}
      {/* COMMISSION ADJUSTMENT POLICY MODAL */}
      {/* ==================================================================== */}
      <Modal
        visible={!!selectedRecForAction}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRecForAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedRecForAction && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={22} color="#4f46e5" />
                    <Text style={styles.modalTitle}>Enforce Surge Commission Policy</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRecForAction(null)}>
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  Target Zone:{" "}
                  <Text style={{ fontWeight: "bold", color: "#0f172a" }}>
                    {selectedRecForAction.districtName} ({selectedRecForAction.division})
                  </Text>
                </Text>

                <View style={styles.policySummaryBox}>
                  <Text style={styles.policySummaryText}>
                    Demand is outpacing regional room availability with a ratio of{" "}
                    <Text style={{ fontWeight: "bold", color: "#dc2626" }}>
                      {selectedRecForAction.demandSupplyRatio}x
                    </Text>{" "}
                    and hotel occupancy at{" "}
                    <Text style={{ fontWeight: "bold" }}>{selectedRecForAction.hotelOccupancyRate}%</Text>.
                  </Text>
                </View>

                <View style={styles.policyInputGroup}>
                  <Text style={styles.policyInputLabel}>Agency Commission Delta Adjustment (%):</Text>
                  <View style={styles.inputWithUnit}>
                    <TextInput
                      style={styles.policyTextInput}
                      keyboardType="numeric"
                      value={customCommissionDelta}
                      onChangeText={setCustomCommissionDelta}
                      placeholder="+3.5"
                    />
                    <Text style={styles.unitText}>%</Text>
                  </View>
                  <Text style={styles.policyInputHelp}>
                    New Commission Split:{" "}
                    <Text style={{ fontWeight: "bold", color: "#16a34a" }}>
                      {(
                        selectedRecForAction.currentCommissionPercent +
                        (parseFloat(customCommissionDelta) || 0)
                      ).toFixed(1)}
                      %
                    </Text>{" "}
                    (Base: {selectedRecForAction.currentCommissionPercent}%)
                  </Text>
                </View>

                <View style={styles.policyImpactCard}>
                  <View style={styles.impactRow}>
                    <Text style={styles.impactLabel}>Projected Supply Unlocked:</Text>
                    <Text style={styles.impactValue}>+{selectedRecForAction.projectedSupplyBoostUnits} rooms/seats</Text>
                  </View>
                  <View style={styles.impactRow}>
                    <Text style={styles.impactLabel}>Projected GMV Lift:</Text>
                    <Text style={[styles.impactValue, { color: "#4f46e5" }]}>
                      BDT {Math.round(selectedRecForAction.projectedGmvLiftBDT / 1000)}k
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setSelectedRecForAction(null)}
                    disabled={actionSubmitting}
                  >
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmPolicyBtn}
                    onPress={handleApplySurgePolicy}
                    disabled={actionSubmitting}
                  >
                    {actionSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                        <Text style={styles.confirmPolicyBtnText}>Broadcast & Apply Policy</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },

  // Toast
  toastContainer: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.15)" } : {}),
    gap: 10,
  },
  toastText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  livePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#dc2626",
  },
  livePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    maxWidth: 620,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.2)" } : {}),
  },
  exportHeaderBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  refreshIconBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 8,
    borderRadius: 8,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.04)" } : {}),
  },
  kpiCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  kpiCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  kpiCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  kpiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginVertical: 4,
  },
  kpiFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  kpiFooterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  kpiSubdetail: {
    fontSize: 12,
    color: "#94a3b8",
  },

  // Section Card
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 4px rgba(15, 23, 42, 0.04)" } : {}),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  // Map Controls
  mapControls: {
    flexDirection: "row",
    gap: 6,
  },
  scaleBtn: {
    backgroundColor: "#f1f5f9",
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  // Layer Selector Bar
  layerSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  layerBarLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginEnd: 10,
  },
  layerPills: {
    gap: 8,
  },
  layerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  layerPillActive: {
    backgroundColor: "#4f46e5",
  },
  layerPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  layerPillTextActive: {
    color: "#ffffff",
  },

  // Division Filter & Search
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
    flexWrap: "wrap",
  },
  divisionPills: {
    gap: 6,
  },
  divPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  divPillActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  divPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  divPillTextActive: {
    color: "#ffffff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 180,
    gap: 6,
  },
  searchInput: {
    fontSize: 12,
    color: "#0f172a",
    padding: 0,
    flex: 1,
  },

  // Map Legend
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  // Map Canvas
  mapCanvasWrapper: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    borderRadius: 14,
    paddingVertical: 12,
    overflow: "hidden",
  },
  mapSvgContainer: {
    width: 380,
    minHeight: 380,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCanvasFooter: {
    marginTop: 8,
    paddingHorizontal: 12,
  },
  mapCanvasFooterText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },

  // District Chips Carousel
  districtChipsContainer: {
    gap: 8,
    paddingVertical: 12,
  },
  districtChip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 130,
  },
  districtChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  districtChipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  districtChipName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
  },
  districtChipNameActive: {
    color: "#1d4ed8",
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  districtChipSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 3,
  },

  // Selected District Drawer
  districtTelemetryDrawer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 6,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  drawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  drawerDistrictTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerDistrictBn: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  drawerStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  drawerStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  drawerCategoryText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 3,
  },
  drawerMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCell: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  metricBigVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 3,
  },
  metricSubVal: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  surgeIncentiveAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 10,
  },
  surgeAlertTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  surgeAlertBody: {
    fontSize: 12,
    color: "#78350f",
    marginTop: 2,
  },
  surgeActionBtn: {
    backgroundColor: "#b45309",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  surgeActionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Velocity Section
  windowToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  windowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  windowBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.1)" } : {}),
  },
  windowBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  windowBtnTextActive: {
    color: "#4f46e5",
    fontWeight: "700",
  },
  velocityList: {
    gap: 10,
  },
  velocityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  velocityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  destRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  destRankText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },
  destNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  destNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  surgeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  surgeTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
  },
  destCategoryText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  velocityMetricsRight: {
    alignItems: "flex-end",
  },
  searchCountBig: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  velocitySubText: {
    fontSize: 12,
    color: "#64748b",
  },
  velocityCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    flexWrap: "wrap",
    gap: 8,
  },
  originsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  originsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  originPill: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  originPillText: {
    fontSize: 12,
    color: "#475569",
  },
  conversionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  conversionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },

  // Routes Grid
  routesGrid: {
    gap: 10,
  },
  routeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  routeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  routeNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  routeTerminalsText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  congestionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  congestionBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  routeProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  occupancyPercentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  routeStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
  },
  routeStatItem: {
    alignItems: "center",
  },
  routeStatLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  routeStatVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },

  // Recommendations
  recsList: {
    gap: 12,
  },
  recCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  recCardCritical: {
    borderColor: "#fca5a5",
    backgroundColor: "#fffafa",
  },
  recCardApplied: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  recHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recZoneInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recZonePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  recZoneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  severityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "800",
  },
  recStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  recHeadline: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  recRationale: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  recMetricsTable: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recMetricColumn: {
    alignItems: "center",
  },
  recMetricHeader: {
    fontSize: 12,
    color: "#64748b",
  },
  recMetricVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },
  recActionRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  applyRecBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  applyRecBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  dismissRecBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  dismissRecBtnText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  appliedSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appliedSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.25)" } : {}),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
  },
  exportProgressBox: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 12,
  },
  exportProgressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  exportOptionsList: {
    gap: 10,
    marginBottom: 16,
  },
  exportOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  exportOptionPrimary: {
    backgroundColor: "#4f46e5",
    borderColor: "#4338ca",
  },
  exportOptionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  exportOptionPrimaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  exportOptionPrimarySub: {
    fontSize: 12,
    color: "#e0e7ff",
    marginTop: 2,
  },
  exportOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  exportOptionSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  modalFooter: {
    alignItems: "flex-end",
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },

  // Policy Modal
  policySummaryBox: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  policySummaryText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  policyInputGroup: {
    marginBottom: 14,
  },
  policyInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  policyTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    paddingVertical: 8,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  policyInputHelp: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  policyImpactCard: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  impactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  impactLabel: {
    fontSize: 12,
    color: "#1e40af",
  },
  impactValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  modalActionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    alignItems: "center",
  },
  confirmPolicyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  confirmPolicyBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default DemandHeatmapScreen;
