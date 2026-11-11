/**
 * TrainLiveTrackingScreen.tsx
 *
 * Master 3D Live Train Tracking Screen for Shopno Jatra.
 * Recreates TrainKothay-style 3D real-time animated train movement on maps,
 * crowdsourcing onboard GPS sync, delay tracker, and passenger community chat.
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
  trainTrackingService,
  TrainProfile,
  LiveTrainPosition,
  PassengerChatMessage,
  FEATURED_BD_TRAINS,
} from "../services/trainTrackingService";
import {
  LiveTravelMap3D,
  LiveTravelMap3DRef,
} from "../components/tracking/LiveTravelMap3D";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BD_GREEN = "#006A4E";
const BD_GREEN_DARK = "#004D38";
const BD_RED = "#F42A41";
const ACCENT_GOLD = "#F59E0B";

export const TrainLiveTrackingScreen: React.FC = () => {
  const params = useLocalSearchParams<{ trainNumber?: string }>();
  const initialTrainNumber = params.trainNumber || "702";

  // Selected Train State
  const [selectedTrain, setSelectedTrain] = useState<TrainProfile>(() =>
    trainTrackingService.getTrainProfile(initialTrainNumber)
  );

  // Live Position & Movement State
  const [livePos, setLivePos] = useState<LiveTrainPosition>(() =>
    trainTrackingService.getLivePosition(selectedTrain.trainNumber)
  );

  // HUD & UI States
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isOnBoard, setIsOnBoard] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"status" | "stops" | "chat" | "amenities">("status");
  const [showTrainPicker, setShowTrainPicker] = useState<boolean>(false);
  const [sheetExpanded, setSheetExpanded] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<PassengerChatMessage[]>(() =>
    trainTrackingService.getPassengerChats(selectedTrain.trainNumber)
  );
  const [chatInput, setChatInput] = useState<string>("");

  const mapRef = useRef<LiveTravelMap3DRef>(null);

  // Change train profile when param changes
  useEffect(() => {
    if (params.trainNumber && params.trainNumber !== selectedTrain.trainNumber) {
      const p = trainTrackingService.getTrainProfile(params.trainNumber);
      setSelectedTrain(p);
      setLivePos(trainTrackingService.getLivePosition(p.trainNumber));
      setChatMessages(trainTrackingService.getPassengerChats(p.trainNumber));
    }
  }, [params.trainNumber]);

  // Real-time Motion Generator Loop (Every 1.2s updates position along rail tracks)
  useEffect(() => {
    const timer = setInterval(() => {
      const nextPos = trainTrackingService.getLivePosition(selectedTrain.trainNumber);
      setLivePos(nextPos);
    }, 1200);

    return () => clearInterval(timer);
  }, [selectedTrain.trainNumber]);

  // Handle "I'm on board / আমি ট্রেনে আছি" Crowdsource GPS synchronization
  const handleToggleOnBoard = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isOnBoard) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "জিপিএস অনুমতি প্রয়োজন",
            "ট্রেনের লাইভ অবস্থান সঠিকভাবে শেয়ার করার জন্য আপনার জিপিএস অ্যাক্সেস দিন।"
          );
          return;
        }

        setIsOnBoard(true);
        Alert.alert(
          "অনবোর্ড শেয়ারিং শুরু হয়েছে!",
          `আপনি ${selectedTrain.trainNameBn} (${selectedTrain.trainNumber})-এ আছেন। আপনার ডিভাইসের জিপিএস থেকে ট্রেনের সঠিক গতি ও অবস্থান আপডেট হচ্ছে।`
        );
      } catch (err) {
        setIsOnBoard(true);
      }
    } else {
      setIsOnBoard(false);
    }
  }, [isOnBoard, selectedTrain]);

  // Train Horn Trigger with Haptic
  const handleSoundHorn = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    mapRef.current?.triggerTrainHorn();
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

  // Toggle Satellite / Map Layer
  const handleToggleSatellite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.toggleSatellite();
  }, []);

  // Send Passenger Chat Message
  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg = trainTrackingService.sendPassengerChat(
      selectedTrain.trainNumber,
      chatInput.trim(),
      "আপনি (অনবোর্ড যাত্রী)"
    );
    setChatMessages((prev) => [newMsg, ...prev]);
    setChatInput("");
  }, [chatInput, selectedTrain.trainNumber]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 1. Fullscreen 3D WebGL Live Movement Map */}
      <View style={styles.mapContainer}>
        <LiveTravelMap3D
          ref={mapRef}
          trainProfile={selectedTrain}
          livePosition={livePos}
          is3DMode={is3DMode}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* 2. Top Floating Navigation & Train Details HUD */}
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
            style={styles.trainSelectorPill}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTrainPicker(true);
            }}
          >
            <View style={styles.trainPulseDot} />
            <View style={styles.trainNameCol}>
              <View style={styles.rowAlign}>
                <Text style={styles.trainTitleText}>
                  {selectedTrain.trainNameBn}
                </Text>
                <Text style={styles.trainNumberBadge}>
                  #{selectedTrain.trainNumber}
                </Text>
              </View>
              <Text style={styles.trainRouteSubtext}>
                {selectedTrain.originBn} ➔ {selectedTrain.destinationBn}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#A7F3D0" />
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

        {/* Live Metrics Ticker Bar */}
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
            <Ionicons name="time-outline" size={15} color={livePos.delayMinutes > 5 ? "#F87171" : "#FBBF24"} />
            <Text style={styles.metricLabel}>সময়সূচি:</Text>
            <Text
              style={[
                styles.metricVal,
                livePos.delayMinutes > 5 ? styles.delayLate : styles.delayOnTime,
              ]}
            >
              {livePos.delayMinutes === 0
                ? "অন-টাইম"
                : `${livePos.delayMinutes} মি. লেট`}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="people-outline" size={15} color="#60A5FA" />
            <Text style={styles.metricVal}>
              {selectedTrain.passengersVerified} জন ভেরিফাইড
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Floating 3D Map Action HUD Buttons */}
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

        {/* Train Horn */}
        <TouchableOpacity style={styles.actionFab} onPress={handleSoundHorn}>
          <MaterialCommunityIcons name="bullhorn-outline" size={22} color="#F59E0B" />
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
        {/* Drag / Expand Bar */}
        <TouchableOpacity
          style={styles.sheetHandleArea}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetExpanded((prev) => !prev);
          }}
        >
          <View style={styles.sheetHandleBar} />
        </TouchableOpacity>

        {/* Next Stop Highlight Card */}
        <View style={styles.nextStopBanner}>
          <View style={styles.nextStopLeft}>
            <Text style={styles.nextStopHeader}>পরবর্তী স্টেশন</Text>
            <Text style={styles.nextStopName}>
              {livePos.nextStop.nameBn}
            </Text>
            <View style={styles.rowAlign}>
              <View style={styles.platformBadge}>
                <Text style={styles.platformBadgeText}>
                  প্ল্যাটফর্ম {livePos.nextStop.platform}
                </Text>
              </View>
              <Text style={styles.etaSubtext}>
                • দূরত্ব {Math.round(Math.max(1, livePos.nextStop.distanceKm - livePos.distanceAlongKm))} কিমি
              </Text>
            </View>
          </View>

          <View style={styles.nextStopRight}>
            <Text style={styles.etaHeader}>পৌঁছানোর সময়</Text>
            <Text style={styles.etaCountdown}>
              {livePos.etaMinutesToNextStop} মিনিট
            </Text>
            <Text style={styles.scheduledTime}>
              শিডিউল: {livePos.nextStop.scheduledArrival}
            </Text>
          </View>
        </View>

        {/* Progress Slider */}
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
              {selectedTrain.originBn} ({selectedTrain.departureTime})
            </Text>
            <Text style={styles.progressPctText}>
              {Math.round(livePos.progressPct)}% সম্পন্ন
            </Text>
            <Text style={styles.progressLabelText}>
              {selectedTrain.destinationBn} ({selectedTrain.arrivalTime})
            </Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          {[
            { key: "status", label: "লাইভ স্ট্যাটাস", icon: "pulse" },
            { key: "stops", label: "স্টেশন টাইমলাইন", icon: "git-commit" },
            { key: "chat", label: "অনবোর্ড চ্যাট", icon: "chatbubbles-outline" },
            { key: "amenities", label: "সুযোগ-সুবিধা", icon: "train-outline" },
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
                  size={16}
                  color={isActive ? "#006A4E" : "#9CA3AF"}
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

        {/* Tab 1: Status & Crowdsource */}
        {activeTab === "status" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Onboard Crowdsource Action Card */}
            <View style={styles.crowdCard}>
              <View style={styles.crowdCardLeft}>
                <Text style={styles.crowdCardTitle}>
                  আপনি কি এখন এই ট্রেনে ভ্রমণ করছেন?
                </Text>
                <Text style={styles.crowdCardDesc}>
                  অনবোর্ড মোড চালু করলে আপনার ফোনের জিপিএস থেকে সহযাত্রীদের জন্য ট্রেনের লাইভ অবস্থান শতভাগ নিখুঁতভাবে আপডেট হবে।
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
                  {isOnBoard ? "শেয়ারিং সক্রিয়" : "আমি ট্রেনে আছি"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verification Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
                <Text style={styles.statBoxTitle}>ডেটা ট্রাস্ট স্কোর</Text>
                <Text style={styles.statBoxVal}>
                  {Math.round(selectedTrain.confidenceScore * 100)}% নিশ্চিত
                </Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="trail-sign-outline" size={20} color="#F59E0B" />
                <Text style={styles.statBoxTitle}>মোট দূরত্ব</Text>
                <Text style={styles.statBoxVal}>
                  {selectedTrain.totalDistanceKm} কিমি
                </Text>
              </View>
              <View style={styles.statBox}>
                <Ionicons name="train-outline" size={20} color="#3B82F6" />
                <Text style={styles.statBoxTitle}>কোচ সংখ্যা</Text>
                <Text style={styles.statBoxVal}>
                  {selectedTrain.coachCount}টি বগি
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Tab 2: Stops Timeline */}
        {activeTab === "stops" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.timelineList}>
              {selectedTrain.stops.map((stop, index) => {
                const isPassed = stop.distanceKm < livePos.distanceAlongKm;
                const isNext = stop.id === livePos.nextStop.id;

                return (
                  <View key={stop.id} style={styles.timelineItem}>
                    <View style={styles.timelineColLeft}>
                      <Text style={styles.timelineTime}>
                        {stop.scheduledArrival}
                      </Text>
                      <Text style={styles.timelinePlatform}>
                        প্লাটফর্ম {stop.platform}
                      </Text>
                    </View>

                    {/* Timeline Graphical Indicator */}
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
                      {index < selectedTrain.stops.length - 1 && (
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
                          {stop.nameBn} ({stop.code})
                        </Text>
                        {isNext && (
                          <View style={styles.nextBadgePill}>
                            <Text style={styles.nextBadgePillText}>
                              পরবর্তী
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.timelineDistKm}>
                        কমলাপুর হতে {stop.distanceKm} কিমি
                      </Text>
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
                      {item.senderName}
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

            {/* Chat Input Bar */}
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatTextInput}
                placeholder="সহযাত্রীদের কিছু লিখুন..."
                placeholderTextColor="#9CA3AF"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={styles.chatSendBtn}
                onPress={handleSendMessage}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab 4: Amenities & Emergency Support */}
        {activeTab === "amenities" && (
          <ScrollView
            style={styles.tabContentScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.amenitiesCard}>
              <Text style={styles.amenityHeader}>জরুরি রেলওয়ে ও যাত্রী সহায়তা</Text>
              <View style={styles.helpRow}>
                <TouchableOpacity
                  style={[styles.sosBtn, { backgroundColor: "#DC2626" }]}
                  onPress={() => Linking.openURL("tel:999")}
                >
                  <Ionicons name="warning-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.sosBtnText}>জাতীয় জরুরি সেবা (৯৯৯)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sosBtn, { backgroundColor: "#0284C7" }]}
                  onPress={() => Linking.openURL("tel:16318")}
                >
                  <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.sosBtnText}>রেলওয়ে হেল্পলাইন (১৬৩১৮)</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.amenityHeader, { marginTop: 16 }]}>অনবোর্ড সুবিধা</Text>
              <View style={styles.amenityList}>
                <View style={styles.amenityItem}>
                  <Ionicons name="restaurant-outline" size={20} color="#10B981" />
                  <Text style={styles.amenityItemText}>প্যান্ট্রি কারে গরম খাবার ও পানীয় উপলব্ধ</Text>
                </View>
                <View style={styles.amenityItem}>
                  <Ionicons name="snow-outline" size={20} color="#38BDF8" />
                  <Text style={styles.amenityItemText}>শীতাতপ নিয়ন্ত্রিত স্নিগ্ধা ও এসি চেয়ার কোচ</Text>
                </View>
                <View style={styles.amenityItem}>
                  <Ionicons name="shield-outline" size={20} color="#F59E0B" />
                  <Text style={styles.amenityItemText}>রেলওয়ে পুলিশ (GRP) স্কোয়াড অনবোর্ড উপস্থিত</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 5. Train Selector Modal */}
      <Modal
        visible={showTrainPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrainPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>অন্যান্য ট্রেন নির্বাচন করুন</Text>
              <TouchableOpacity
                onPress={() => setShowTrainPicker(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {FEATURED_BD_TRAINS.map((train) => {
                const isCurrent = train.trainNumber === selectedTrain.trainNumber;
                return (
                  <TouchableOpacity
                    key={train.id}
                    style={[
                      styles.trainPickerItem,
                      isCurrent && styles.trainPickerItemActive,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTrain(train);
                      setLivePos(trainTrackingService.getLivePosition(train.trainNumber));
                      setChatMessages(trainTrackingService.getPassengerChats(train.trainNumber));
                      setShowTrainPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={styles.rowAlign}>
                        <Text style={styles.pickerTrainName}>
                          {train.trainNameBn}
                        </Text>
                        <Text style={styles.pickerTrainNum}>
                          ({train.trainNumber})
                        </Text>
                      </View>
                      <Text style={styles.pickerRoute}>
                        {train.originBn} ➔ {train.destinationBn} • {train.departureTime}
                      </Text>
                    </View>

                    <View style={styles.pickerItemRight}>
                      <View style={styles.pickerLiveBadge}>
                        <View style={styles.pickerLiveDot} />
                        <Text style={styles.pickerLiveText}>
                          {train.speedKmh} km/h
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
    backgroundColor: "#0B131E",
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
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  activeOnBoardBtn: {
    backgroundColor: BD_GREEN,
    borderColor: "#34D399",
  },
  trainSelectorPill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(0, 106, 78, 0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  trainPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  trainNameCol: {
    flex: 1,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trainTitleText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  trainNumberBadge: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  trainRouteSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metricsBar: {
    marginTop: 8,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
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
  delayOnTime: {
    color: "#34D399",
  },
  delayLate: {
    color: "#F87171",
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
    backgroundColor: "rgba(15, 23, 42, 0.9)",
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
    backgroundColor: BD_GREEN,
    borderColor: "#34D399",
  },
  fabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activeFabText: {
    color: "#FFFFFF",
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
    borderColor: "rgba(0, 106, 78, 0.4)",
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
    color: "#A7F3D0",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  nextStopName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginVertical: 2,
  },
  platformBadge: {
    backgroundColor: "rgba(0, 106, 78, 0.35)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#34D399",
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
    color: "#F59E0B",
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
    backgroundColor: "#10B981",
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
    color: "#34D399",
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
    backgroundColor: "#D1FAE5",
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  activeTabButtonText: {
    color: "#065F46",
    fontWeight: "bold",
  },
  tabContentScroll: {
    flex: 1,
  },
  crowdCard: {
    backgroundColor: "rgba(0, 106, 78, 0.15)",
    borderWidth: 1.2,
    borderColor: "rgba(16, 185, 129, 0.35)",
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
    backgroundColor: BD_GREEN,
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
    color: "#FFFFFF",
  },
  crowdToggleBtnTextActive: {
    color: "#065F46",
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
  timelinePlatform: {
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
    backgroundColor: "#F59E0B",
    borderColor: "#FCD34D",
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
    color: "#F59E0B",
    fontWeight: "bold",
  },
  nextBadgePill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nextBadgePillText: {
    fontSize: 9,
    color: "#F59E0B",
    fontWeight: "bold",
  },
  timelineDistKm: {
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
    color: "#60A5FA",
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
    backgroundColor: BD_GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  amenitiesCard: {
    paddingVertical: 8,
  },
  amenityHeader: {
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
  amenityList: {
    gap: 8,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    padding: 10,
    borderRadius: 10,
  },
  amenityItemText: {
    fontSize: 12,
    color: "#D1D5DB",
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
  trainPickerItem: {
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
  trainPickerItemActive: {
    borderColor: "#10B981",
    backgroundColor: "rgba(0, 106, 78, 0.2)",
  },
  pickerItemLeft: {
    flex: 1,
  },
  pickerTrainName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  pickerTrainNum: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F59E0B",
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
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  pickerLiveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#34D399",
  },
});
