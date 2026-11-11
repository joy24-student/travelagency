/**
 * BusLiveTrackingScreen.tsx
 *
 * Master 3D Live Bus Tracking Screen for Shopno Jatra.
 * Recreates procedural 3D Scania luxury multi-axle bus movement along
 * Bangladesh National Highways (N1, N2, N5), highway rest stops,
 * crowdsourced onboard GPS sync, musical air horns, and highway police helpline.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  Alert,
  Linking,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";

import {
  busTrackingService,
  BusProfile,
  LiveBusPosition,
  BusPassengerChat,
  FEATURED_BUS_TRIPS,
} from "../services/busTrackingService";
import {
  LiveBusMap3D,
  LiveBusMap3DRef,
} from "../components/tracking/LiveBusMap3D";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LUXURY_GOLD = "#F59E0B";
const BRAND_GREEN = "#006A4E";
const SLATE_BG = "#0B131E";

export const BusLiveTrackingScreen: React.FC = () => {
  const params = useLocalSearchParams<{ busId?: string }>();
  const initialBusId = params.busId || "bus-gl-1";

  // Selected Bus State
  const [selectedBus, setSelectedBus] = useState<BusProfile>(() =>
    busTrackingService.getBusProfile(initialBusId)
  );

  // Live Position & Motion State
  const [livePos, setLivePos] = useState<LiveBusPosition>(() =>
    busTrackingService.getLivePosition(selectedBus.id)
  );

  // HUD & UI States
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isOnBoard, setIsOnBoard] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"status" | "stops" | "chat" | "emergency">("status");
  const [showBusPicker, setShowBusPicker] = useState<boolean>(false);
  const [sheetExpanded, setSheetExpanded] = useState<boolean>(false);

  // Passenger Chat State
  const [chatMessages, setChatMessages] = useState<BusPassengerChat[]>(() =>
    busTrackingService.getPassengerChats(selectedBus.id)
  );
  const [chatInput, setChatInput] = useState<string>("");

  const mapRef = useRef<LiveBusMap3DRef>(null);

  // Switch bus if param changes
  useEffect(() => {
    if (params.busId && params.busId !== selectedBus.id) {
      const p = busTrackingService.getBusProfile(params.busId);
      setSelectedBus(p);
      setLivePos(busTrackingService.getLivePosition(p.id));
      setChatMessages(busTrackingService.getPassengerChats(p.id));
    }
  }, [params.busId]);

  // Real-time Highway Motion Generator Loop (Every 1.2s updates position)
  useEffect(() => {
    const timer = setInterval(() => {
      const nextPos = busTrackingService.getLivePosition(selectedBus.id);
      setLivePos(nextPos);
    }, 1200);

    return () => clearInterval(timer);
  }, [selectedBus.id]);

  // Handle "I'm on board / আমি বাসে আছি" Crowdsource GPS synchronization
  const handleToggleOnBoard = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isOnBoard) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "জিপিএস অনুমতি প্রয়োজন",
            "বাসের হাইওয়ে অবস্থান নিখুঁতভাবে শেয়ার করতে আপনার ডিভাইসের জিপিএস অ্যাক্সেস দিন।"
          );
          return;
        }

        setIsOnBoard(true);
        Alert.alert(
          "অনবোর্ড বাস ট্র্যাকিং সক্রিয়!",
          `আপনি ${selectedBus.operatorNameBn} (${selectedBus.busNumber})-এ আছেন। আপনার ফোনের জিপিএস থেকে বাসের লাইভ গতি ও অবস্থান অন্যান্য যাত্রীদের সাথে সিনক্রোনাইজ হচ্ছে।`
        );
      } catch (err) {
        setIsOnBoard(true);
      }
    } else {
      setIsOnBoard(false);
    }
  }, [isOnBoard, selectedBus]);

  // Musical Air Horn Trigger
  const handleSoundAirHorn = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    mapRef.current?.triggerBusAirHorn();
  }, []);

  // Air Brake Trigger
  const handleSoundAirBrake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    mapRef.current?.triggerAirBrake();
  }, []);

  // 2D / 3D Toggle
  const handleToggleCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIs3DMode((prev) => !prev);
  }, []);

  // Recenter Target
  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.recenterCamera();
  }, []);

  // Toggle Satellite / Vector Layer
  const handleToggleSatellite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.toggleSatellite();
  }, []);

  // Send Passenger Chat Message
  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg = busTrackingService.sendPassengerChat(
      selectedBus.id,
      chatInput.trim(),
      "আপনি (বাস যাত্রী)"
    );
    setChatMessages((prev) => [newMsg, ...prev]);
    setChatInput("");
  }, [chatInput, selectedBus.id]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 1. Fullscreen 3D WebGL Highway Bus Map */}
      <View style={styles.mapContainer}>
        <LiveBusMap3D
          ref={mapRef}
          busProfile={selectedBus}
          livePosition={livePos}
          is3DMode={is3DMode}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* 2. Top Floating Navigation & Bus Details HUD */}
      <View style={styles.topHud}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.busSelectorPill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBusPicker(true);
            }}
          >
            <View style={styles.busPulseDot} />
            <View style={styles.busNameCol}>
              <View style={styles.rowAlign}>
                <Text style={styles.busTitleText} numberOfLines={1}>
                  {selectedBus.operatorNameBn}
                </Text>
                <Text style={styles.busNumberBadge}>
                  {selectedBus.busNumber.slice(-7)}
                </Text>
              </View>
              <Text style={styles.busRouteSubtext} numberOfLines={1}>
                {selectedBus.originBn} ➔ {selectedBus.destinationBn}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#FDE68A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, isOnBoard && styles.activeOnBoardBtn]}
            onPress={handleToggleOnBoard}
          >
            <MaterialCommunityIcons
              name={isOnBoard ? "broadcast" : "broadcast-off"}
              size={20}
              color={isOnBoard ? "#FFFFFF" : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>

        {/* Live Highway Metrics Ticker */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Ionicons name="speedometer-outline" size={15} color="#34D399" />
            <Text style={styles.metricLabel}>গতি:</Text>
            <Text style={styles.metricVal}>
              {livePos.speedKmh} কিমি/ঘণ্টা
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="road-variant" size={15} color="#F59E0B" />
            <Text style={styles.metricLabel}>ট্রাফিক:</Text>
            <Text style={[styles.metricVal, { color: "#34D399" }]}>
              {livePos.trafficStatus === "clear"
                ? "ক্লিয়ার রোড"
                : livePos.trafficStatus === "moderate"
                ? "হালকা জ্যাম"
                : "টোল জ্যাম"}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="people-outline" size={15} color="#60A5FA" />
            <Text style={styles.metricVal}>
              {selectedBus.passengersVerified} জন অনবোর্ড
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Floating 3D Map Action Controls */}
      <View style={styles.mapActionControls}>
        {/* 2D / 3D Toggle */}
        <TouchableOpacity
          style={[styles.actionFab, is3DMode && styles.activeFab]}
          onPress={handleToggleCamera}
        >
          <Text style={[styles.fabText, is3DMode && styles.activeFabText]}>
            {is3DMode ? "3D" : "2D"}
          </Text>
        </TouchableOpacity>

        {/* Musical Air Horn */}
        <TouchableOpacity style={styles.actionFab} onPress={handleSoundAirHorn}>
          <MaterialCommunityIcons name="bullhorn-outline" size={22} color="#F59E0B" />
        </TouchableOpacity>

        {/* Air Brake Psshh Effect */}
        <TouchableOpacity style={styles.actionFab} onPress={handleSoundAirBrake}>
          <MaterialCommunityIcons name="weather-windy" size={22} color="#38BDF8" />
        </TouchableOpacity>

        {/* Satellite Toggle */}
        <TouchableOpacity style={styles.actionFab} onPress={handleToggleSatellite}>
          <MaterialCommunityIcons name="layers-triple-outline" size={22} color="#10B981" />
        </TouchableOpacity>

        {/* Recenter Camera */}
        <TouchableOpacity style={styles.actionFab} onPress={handleRecenter}>
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 4. Interactive Bottom Sheet HUD */}
      <View
        style={[
          styles.bottomSheet,
          sheetExpanded ? styles.bottomSheetExpanded : styles.bottomSheetCollapsed,
        ]}
      >
        <TouchableOpacity
          style={styles.sheetHandleArea}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetExpanded((prev) => !prev);
          }}
        >
          <View style={styles.sheetHandleBar} />
        </TouchableOpacity>

        {/* Next Highway Stop Highlight Banner */}
        <View style={styles.nextStopBanner}>
          <View style={styles.nextStopLeft}>
            <View style={styles.rowAlign}>
              <Text style={styles.nextStopHeader}>
                {livePos.nextStop.type === "rest_stop" ? "পরবর্তী যাত্রা বিরতি (Rest Stop)" : "পরবর্তী হাইওয়ে পয়েন্ট"}
              </Text>
              {livePos.nextStop.type === "rest_stop" && (
                <View style={styles.foodPill}>
                  <Text style={styles.foodPillText}>খাবার বিরতি</Text>
                </View>
              )}
            </View>
            <Text style={styles.nextStopName} numberOfLines={1}>
              {livePos.nextStop.nameBn}
            </Text>
            <Text style={styles.etaSubtext}>
              {selectedBus.currentHighway} • দূরত্ব {Math.round(Math.max(1, livePos.nextStop.distanceKm - livePos.distanceAlongKm))} কিমি
            </Text>
          </View>

          <View style={styles.nextStopRight}>
            <Text style={styles.etaHeader}>পৌঁছানোর সময়</Text>
            <Text style={styles.etaCountdown}>
              {livePos.etaMinutesToNextStop} মিনিট
            </Text>
            <Text style={styles.scheduledTime}>
              আনুমানিক: {livePos.nextStop.scheduledTime}
            </Text>
          </View>
        </View>

        {/* Highway Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${livePos.progressPct}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelText}>
              {selectedBus.originBn}
            </Text>
            <Text style={styles.progressPctText}>
              {Math.round(livePos.progressPct)}% সম্পন্ন ({Math.round(livePos.distanceAlongKm)}/{selectedBus.totalDistanceKm} km)
            </Text>
            <Text style={styles.progressLabelText}>
              {selectedBus.destinationBn}
            </Text>
          </View>
        </View>

        {/* Tabs Row */}
        <View style={styles.tabsRow}>
          {[
            { key: "status", label: "লাইভ স্ট্যাটাস", icon: "pulse" },
            { key: "stops", label: "হাইওয়ে রুট", icon: "trail-sign-outline" },
            { key: "chat", label: "অনবোর্ড চ্যাট", icon: "chatbubbles-outline" },
            { key: "emergency", label: "জরুরি সেবা", icon: "shield-outline" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key as any);
                  if (!sheetExpanded) setSheetExpanded(true);
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? "#92400E" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.activeTabButtonText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Live Status */}
        {activeTab === "status" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Crowdsource Action Card */}
            <View style={styles.crowdCard}>
              <View style={styles.crowdCardLeft}>
                <Text style={styles.crowdCardTitle}>
                  আপনি কি এই বাসে ভ্রমণ করছেন?
                </Text>
                <Text style={styles.crowdCardDesc}>
                  অনবোর্ড মোড চালু রাখলে আপনার ডিভাইসের জিপিএস থেকে বাসের লাইভ গতি ও হাইওয়ে লোকেশন ১০০% নির্ভুলভাবে আপডেট হবে।
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.crowdToggleBtn,
                  isOnBoard && styles.crowdToggleBtnActive,
                ]}
                onPress={handleToggleOnBoard}
              >
                <Text
                  style={[
                    styles.crowdToggleBtnText,
                    isOnBoard && styles.crowdToggleBtnTextActive,
                  ]}
                >
                  {isOnBoard ? "শেয়ারিং সক্রিয়" : "আমি বাসে আছি"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Highway Quick Info Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                <Text style={styles.statBoxTitle}>জিপিএস সঠিকতা</Text>
                <Text style={styles.statBoxVal}>
                  {Math.round(selectedBus.confidenceScore * 100)}% ভেরিফাইড
                </Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="bus-side" size={18} color="#F59E0B" />
                <Text style={styles.statBoxTitle}>কোচ ক্যাটাগরি</Text>
                <Text style={styles.statBoxVal} numberOfLines={1}>
                  {selectedBus.busType.slice(0, 15)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="location-outline" size={18} color="#3B82F6" />
                <Text style={styles.statBoxTitle}>মহাসড়ক</Text>
                <Text style={styles.statBoxVal}>
                  {selectedBus.currentHighway.split(" ")[0]}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Tab 2: Highway Stops Timeline */}
        {activeTab === "stops" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timelineList}>
              {selectedBus.stops.map((stop, index) => {
                const isPassed = stop.distanceKm < livePos.distanceAlongKm;
                const isNext = stop.id === livePos.nextStop.id;

                return (
                  <View key={stop.id} style={styles.timelineItem}>
                    <View style={styles.timelineColLeft}>
                      <Text style={styles.timelineTime}>
                        {stop.scheduledTime}
                      </Text>
                      <Text style={styles.timelineDistKm}>
                        {stop.distanceKm} কিমি
                      </Text>
                    </View>

                    <View style={styles.timelineColLine}>
                      <View
                        style={[
                          styles.timelineDot,
                          isPassed && styles.timelineDotPassed,
                          isNext && styles.timelineDotCurrent,
                        ]}
                      >
                        {isPassed && (
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        )}
                      </View>
                      {index < selectedBus.stops.length - 1 && (
                        <View
                          style={[
                            styles.timelineVerticalLine,
                            isPassed && styles.timelineVerticalLinePassed,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineColRight}>
                      <View style={styles.rowAlign}>
                        <Text
                          style={[
                            styles.timelineStationName,
                            isNext && styles.timelineStationNameHighlight,
                          ]}
                        >
                          {stop.nameBn}
                        </Text>
                        {stop.type === "rest_stop" && (
                          <View style={styles.restBadgePill}>
                            <Text style={styles.restBadgePillText}>বিরতি</Text>
                          </View>
                        )}
                        {stop.type === "toll_plaza" && (
                          <View style={styles.tollBadgePill}>
                            <Text style={styles.tollBadgePillText}>টোল</Text>
                          </View>
                        )}
                      </View>
                      {stop.amenities && (
                        <Text style={styles.amenitiesSubtext}>
                          সুবিধা: {stop.amenities.join(" • ")}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Tab 3: Onboard Passenger Chat */}
        {activeTab === "chat" && (
          <View style={styles.chatTabContainer}>
            <FlatList
              data={chatMessages}
              keyExtractor={(item) => item.id}
              inverted
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.chatBubble}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatSenderName}>
                      {item.senderName} {item.seatNumber ? `(${item.seatNumber})` : ""}
                    </Text>
                    {item.isVerifiedPassenger && (
                      <View style={styles.verifiedPassBadge}>
                        <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                        <Text style={styles.verifiedPassBadgeText}>অনবোর্ড</Text>
                      </View>
                    )}
                    <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.chatText}>{item.message}</Text>
                </View>
              )}
            />

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="সহযাত্রী ও বাসের ক্রুকে বার্তা দিন..."
                placeholderTextColor="#9CA3AF"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={styles.chatSendBtn}
                onPress={handleSendMessage}
              >
                <Ionicons name="send" size={18} color="#065F46" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab 4: Highway Emergency Support */}
        {activeTab === "emergency" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyHeader}>হাইওয়ে পুলিশ ও জরুরি সহায়তা</Text>
              <View style={styles.helpRow}>
                <TouchableOpacity
                  style={[styles.sosBtn, { backgroundColor: "#DC2626" }]}
                  onPress={() => Linking.openURL("tel:999")}
                >
                  <Ionicons name="warning-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.sosBtnText}>জরুরি সেবা (৯৯৯)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sosBtn, { backgroundColor: "#0284C7" }]}
                  onPress={() => Linking.openURL("tel:01320181001")}
                >
                  <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.sosBtnText}>হাইওয়ে পুলিশ হেল্পলাইন</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.emergencyHeader, { marginTop: 16 }]}>
                {selectedBus.operatorNameBn} সাপোর্ট
              </Text>
              <View style={styles.supportList}>
                <TouchableOpacity
                  style={styles.supportItem}
                  onPress={() => Linking.openURL("tel:01711000000")}
                >
                  <Ionicons name="call" size={18} color="#10B981" />
                  <Text style={styles.supportItemText}>
                    সেন্ট্রাল কাস্টমার কেয়ার ও কমপ্লেইন ডেস্ক
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supportItem}
                  onPress={() => Linking.openURL("tel:01811000000")}
                >
                  <MaterialCommunityIcons name="account-tie" size={20} color="#F59E0B" />
                  <Text style={styles.supportItemText}>
                    অনবোর্ড সুপারভাইজার সরাসরি কল করুন
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 5. Bus Selector Modal */}
      <Modal
        visible={showBusPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBusPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>অন্যান্য দূরপাল্লার বাস নির্বাচন করুন</Text>
              <TouchableOpacity
                onPress={() => setShowBusPicker(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {FEATURED_BUS_TRIPS.map((bus) => {
                const isCurrent = bus.id === selectedBus.id;
                return (
                  <TouchableOpacity
                    key={bus.id}
                    style={[
                      styles.busPickerItem,
                      isCurrent && styles.busPickerItemActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedBus(bus);
                      setLivePos(busTrackingService.getLivePosition(bus.id));
                      setChatMessages(busTrackingService.getPassengerChats(bus.id));
                      setShowBusPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={styles.rowAlign}>
                        <Text style={styles.pickerBusName}>
                          {bus.operatorNameBn}
                        </Text>
                        <Text style={styles.pickerBusNum}>
                          ({bus.busNumber.slice(-7)})
                        </Text>
                      </View>
                      <Text style={styles.pickerRoute}>
                        {bus.originBn} ➔ {bus.destinationBn} • {bus.departureTime}
                      </Text>
                    </View>

                    <View style={styles.pickerItemRight}>
                      <View style={styles.pickerLiveBadge}>
                        <View style={styles.pickerLiveDot} />
                        <Text style={styles.pickerLiveText}>
                          {bus.speedKmh} km/h
                        </Text>
                      </View>
                      {isCurrent && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SLATE_BG,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  topHud: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  activeOnBoardBtn: {
    backgroundColor: LUXURY_GOLD,
    borderColor: "#FDE68A",
  },
  busSelectorPill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.55)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  busPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LUXURY_GOLD,
  },
  busNameCol: {
    flex: 1,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  busTitleText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  busNumberBadge: {
    fontSize: 11,
    fontWeight: "bold",
    color: LUXURY_GOLD,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  busRouteSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metricsBar: {
    marginTop: 8,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metricVal: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  metricDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  mapActionControls: {
    position: "absolute",
    right: 16,
    top: Platform.OS === "ios" ? 170 : 150,
    gap: 12,
    zIndex: 10,
  },
  actionFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  activeFab: {
    backgroundColor: LUXURY_GOLD,
    borderColor: "#FDE68A",
  },
  fabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activeFabText: {
    color: "#0F172A",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomSheetCollapsed: {
    height: SCREEN_HEIGHT * 0.38,
  },
  bottomSheetExpanded: {
    height: SCREEN_HEIGHT * 0.72,
  },
  sheetHandleArea: {
    paddingVertical: 10,
    alignItems: "center",
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  nextStopBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  nextStopLeft: {
    flex: 1,
  },
  nextStopHeader: {
    fontSize: 11,
    color: "#FDE68A",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  foodPill: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  foodPillText: {
    fontSize: 9,
    color: "#10B981",
    fontWeight: "bold",
  },
  nextStopName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: 2,
  },
  etaSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  nextStopRight: {
    alignItems: "flex-end",
  },
  etaHeader: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  etaCountdown: {
    fontSize: 18,
    fontWeight: "bold",
    color: LUXURY_GOLD,
  },
  scheduledTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: LUXURY_GOLD,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressLabelText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  progressPctText: {
    fontSize: 10,
    fontWeight: "bold",
    color: LUXURY_GOLD,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 14,
    padding: 3,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: "#FEF3C7",
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  activeTabButtonText: {
    color: "#92400E",
    fontWeight: "bold",
  },
  tabContentScroll: {
    flex: 1,
  },
  crowdCard: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1.2,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  crowdCardLeft: {
    flex: 1,
  },
  crowdCardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  crowdCardDesc: {
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 3,
  },
  crowdToggleBtn: {
    backgroundColor: LUXURY_GOLD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  crowdToggleBtnActive: {
    backgroundColor: "#10B981",
  },
  crowdToggleBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F172A",
  },
  crowdToggleBtnTextActive: {
    color: "#FFFFFF",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statBoxTitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  statBoxVal: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 2,
  },
  timelineList: {
    paddingVertical: 6,
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 52,
  },
  timelineColLeft: {
    width: 75,
    alignItems: "flex-end",
    paddingRight: 10,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  timelineDistKm: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  timelineColLine: {
    alignItems: "center",
    width: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#4B5563",
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineDotPassed: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  timelineDotCurrent: {
    backgroundColor: LUXURY_GOLD,
    borderColor: "#FDE68A",
    transform: [{ scale: 1.2 }],
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  timelineVerticalLinePassed: {
    backgroundColor: "#10B981",
  },
  timelineColRight: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  timelineStationName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  timelineStationNameHighlight: {
    color: LUXURY_GOLD,
    fontWeight: "bold",
  },
  restBadgePill: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  restBadgePillText: {
    fontSize: 9,
    color: "#10B981",
    fontWeight: "bold",
  },
  tollBadgePill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tollBadgePillText: {
    fontSize: 9,
    color: LUXURY_GOLD,
    fontWeight: "bold",
  },
  amenitiesSubtext: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  chatTabContainer: {
    flex: 1,
    minHeight: 220,
  },
  chatBubble: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  chatSenderName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FDE68A",
  },
  verifiedPassBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedPassBadgeText: {
    fontSize: 9,
    color: "#10B981",
    fontWeight: "bold",
  },
  chatTimestamp: {
    fontSize: 9,
    color: "#9CA3AF",
    marginLeft: "auto",
  },
  chatText: {
    fontSize: 12,
    color: "#F3F4F6",
    lineHeight: 17,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  chatTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 14,
    color: "#FFFFFF",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LUXURY_GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyCard: {
    paddingVertical: 8,
  },
  emergencyHeader: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  helpRow: {
    flexDirection: "row",
    gap: 10,
  },
  sosBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sosBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  supportList: {
    gap: 8,
  },
  supportItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: 12,
    borderRadius: 12,
  },
  supportItemText: {
    fontSize: 12,
    color: "#E2E8F0",
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.65,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  busPickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  busPickerItemActive: {
    borderColor: LUXURY_GOLD,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  pickerItemLeft: {
    flex: 1,
  },
  pickerBusName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  pickerBusNum: {
    fontSize: 12,
    fontWeight: "bold",
    color: LUXURY_GOLD,
  },
  pickerRoute: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  pickerItemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  pickerLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LUXURY_GOLD,
  },
  pickerLiveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FDE68A",
  },
});
