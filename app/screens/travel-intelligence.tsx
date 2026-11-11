import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../src/theme";
import { FONTS } from "../../src/theme/typography";
import { ROUTES } from "../../src/constants/routes";
import { travelIntelligenceService } from "../../src/services/travelIntelligenceService";
import {
  JourneyMonitor,
  DisruptionEvent,
  AlternativeRecommendation,
} from "../../src/types/travelIntelligence";
import { formatPrice } from "../../src/utils/currency";

export default function TravelIntelligenceScreen() {
  const { colors, isDark } = useTheme();

  const [monitors, setMonitors] = useState<JourneyMonitor[]>([]);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "disruptions" | "settings">("active");
  const [verifyingMonitorId, setVerifyingMonitorId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mList, eList] = await Promise.all([
        travelIntelligenceService.getActiveMonitors(),
        travelIntelligenceService.getDisruptionEvents(),
      ]);

      // If no active monitors exist yet, create a default realistic one for demo & verification
      if (!mList || mList.length === 0) {
        const created = await travelIntelligenceService.createMonitor({
          serviceType: "flight",
          providerCode: "BG",
          serviceNumber: "BG-433",
          origin: "Hazrat Shahjalal International Airport (DAC)",
          destination: "Cox's Bazar Airport (CXB)",
          scheduledDeparture: new Date(Date.now() + 3600000 * 4).toISOString(),
          scheduledArrival: new Date(Date.now() + 3600000 * 5.25).toISOString(),
          terminal: "Terminal 1",
          gate: "Gate 04",
        });
        if (created) setMonitors([created]);
      } else {
        setMonitors(mList);
      }

      setEvents(eList || []);
    } catch (err) {
      console.error("Error loading travel intelligence:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleVerifyNow = async (monitor: JourneyMonitor, simulateDelay: boolean = false) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setVerifyingMonitorId(monitor.id);

      const delayToSimulate = simulateDelay ? 60 : undefined;
      const detectedEvent = await travelIntelligenceService.checkJourneyStatus(
        monitor.id,
        delayToSimulate
      );

      if (detectedEvent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Disruption Detected!",
          `Flight ${monitor.service_number} is delayed by ${detectedEvent.delay_minutes} minutes. AI has formulated alternative options and hotel check-in notices.`
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Status Verified", `${monitor.service_number} is running strictly ON TIME.`);
      }

      await loadData();
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Failed to query carrier telemetry.");
    } finally {
      setVerifyingMonitorId(null);
    }
  };

  const handleAlternativeDecision = async (
    rec: AlternativeRecommendation,
    decision: "accepted" | "rejected"
  ) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await travelIntelligenceService.submitAlternativeDecision(rec.id, decision);

      if (decision === "accepted") {
        Alert.alert(
          "Alternative Authorized",
          `You have accepted the alternative: ${rec.title}. Proceeding to booking re-allocation.`,
          [
            {
              text: "Review Booking",
              onPress: () =>
                router.push({
                  pathname: ROUTES.SCREENS.TRIP_CHECKOUT,
                  params: {
                    itineraryTitle: `Alternative Transfer: ${rec.title}`,
                    destination: "Cox's Bazar",
                    travelerCount: 1,
                  },
                }),
            },
          ]
        );
      } else {
        Alert.alert("Alternative Declined", "We will continue surveillance on your primary scheduled trip.");
      }

      await loadData();
    } catch (e: any) {
      Alert.alert("Action Failed", e?.message || "Failed to record decision.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? colors.card : "#F1F5F9" }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Travel Intelligence</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            24/7 AI Disruption Monitoring & Live Alternatives
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: "active", label: "Active Journeys", icon: "shield-checkmark-outline" },
          { key: "disruptions", label: "Disruptions & Alternatives", icon: "alert-circle-outline" },
          { key: "settings", label: "Preferences", icon: "settings-outline" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                { borderBottomColor: isActive ? colors.primary : "transparent" },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key as any);
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontFamily: isActive ? FONTS.bold : FONTS.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* TAB 1: ACTIVE JOURNEYS */}
        {activeTab === "active" && (
          <View style={styles.tabContent}>
            {monitors.map((mon) => {
              const isDelayed = mon.delay_minutes > 0 || mon.current_status === "delayed";
              const isVerifying = verifyingMonitorId === mon.id;

              return (
                <View
                  key={mon.id}
                  style={[
                    styles.monitorCard,
                    {
                      backgroundColor: isDark ? colors.card : "#FFFFFF",
                      borderColor: isDelayed ? "#EF4444" : colors.border,
                    },
                  ]}
                >
                  {/* Status Banner */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.serviceIdent}>
                      <Ionicons
                        name={mon.service_type === "flight" ? "airplane" : "train"}
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={[styles.serviceNumber, { color: colors.text }]}>
                        {mon.service_number}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: isDelayed ? "#FEF2F2" : "#ECFDF5" },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isDelayed ? "#EF4444" : "#10B981" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: isDelayed ? "#DC2626" : "#059669" },
                        ]}
                      >
                        {isDelayed ? `DELAYED ${mon.delay_minutes} MIN` : "ON TIME"}
                      </Text>
                    </View>
                  </View>

                  {/* Route & Times */}
                  <View style={styles.routeContainer}>
                    <View style={styles.stationBlock}>
                      <Text style={[styles.stationCode, { color: colors.text }]}>DAC</Text>
                      <Text style={[styles.stationName, { color: colors.textSecondary }]}>
                        Dhaka (T1)
                      </Text>
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {new Date(mon.scheduled_departure).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    <View style={styles.routeArrowCol}>
                      <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
                      <Text style={styles.flightDuration}>1h 15m</Text>
                    </View>

                    <View style={styles.stationBlock}>
                      <Text style={[styles.stationCode, { color: colors.text }]}>CXB</Text>
                      <Text style={[styles.stationName, { color: colors.textSecondary }]}>
                        Cox's Bazar
                      </Text>
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {new Date(mon.scheduled_arrival).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Verification Telemetry Info */}
                  <View style={[styles.telemetryBox, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                    <View style={styles.telemetryRow}>
                      <Ionicons name="server-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.telemetryText, { color: colors.textSecondary }]}>
                        Source: {mon.data_source} • Confidence: {(mon.confidence_score * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <Text style={[styles.telemetryText, { color: colors.textSecondary }]}>
                      Last Checked:{" "}
                      {mon.last_checked_at
                        ? new Date(mon.last_checked_at).toLocaleTimeString()
                        : "Just now"}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.verifyBtn, { borderColor: colors.primary }]}
                      onPress={() => handleVerifyNow(mon, false)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                          <Text style={[styles.verifyBtnText, { color: colors.primary }]}>
                            Verify Live Feed
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.simulateBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                      onPress={() => handleVerifyNow(mon, true)}
                    >
                      <Ionicons name="bug-outline" size={14} color="#EA580C" />
                      <Text style={styles.simulateBtnText}>Simulate 60m Delay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: DISRUPTIONS & ALTERNATIVES */}
        {activeTab === "disruptions" && (
          <View style={styles.tabContent}>
            {events.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Disruptions</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  All scheduled flights, trains, and coaches are running normally.
                </Text>
              </View>
            ) : (
              events.map((ev) => (
                <View
                  key={ev.id}
                  style={[
                    styles.disruptionCard,
                    { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: "#FCA5A5" },
                  ]}
                >
                  <View style={styles.disruptionHeader}>
                    <Ionicons name="warning" size={20} color="#DC2626" />
                    <Text style={styles.disruptionTitle}>
                      {ev.event_type.replace(/_/g, " ")} ({ev.delay_minutes} min delay)
                    </Text>
                  </View>

                  {/* AI Impact Explanation */}
                  {ev.impacts && ev.impacts.length > 0 && (
                    <View style={styles.impactBox}>
                      <Text style={styles.impactHeading}>🤖 AI Travel Guardian Advisory:</Text>
                      <Text style={styles.impactExplanation}>
                        {ev.impacts[0].ai_explanation || ev.impacts[0].impact_summary}
                      </Text>
                    </View>
                  )}

                  {/* Alternative Options */}
                  <Text style={[styles.alternativesSectionTitle, { color: colors.text }]}>
                    Verified Alternative Solutions:
                  </Text>

                  {ev.alternatives?.map((alt) => (
                    <View
                      key={alt.id}
                      style={[
                        styles.altItemCard,
                        { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border },
                      ]}
                    >
                      <View style={styles.altHeaderRow}>
                        <Text style={[styles.altTitle, { color: colors.text }]}>{alt.title}</Text>
                        <Text style={[styles.altPrice, { color: colors.primary }]}>
                          ৳{alt.estimated_price?.toLocaleString()}
                        </Text>
                      </View>

                      <Text style={[styles.altDesc, { color: colors.textSecondary }]}>
                        {alt.route_description}
                      </Text>

                      <View style={styles.altBadgeRow}>
                        {alt.verified_availability && (
                          <View style={styles.liveVerifiedPill}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.liveVerifiedText}>Verified Seat Inventory</Text>
                          </View>
                        )}
                        <Text style={[styles.decisionStatusText, { color: colors.textSecondary }]}>
                          Status: {alt.user_decision.toUpperCase()}
                        </Text>
                      </View>

                      {/* Approval Actions */}
                      {alt.user_decision === "pending" && (
                        <View style={styles.altButtonsRow}>
                          <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleAlternativeDecision(alt, "accepted")}
                          >
                            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                            <Text style={styles.acceptBtnText}>Accept Alternative</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.declineBtn, { borderColor: colors.border }]}
                            onPress={() => handleAlternativeDecision(alt, "rejected")}
                          >
                            <Text style={[styles.declineBtnText, { color: colors.textSecondary }]}>
                              Decline
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: PREFERENCES & MONITORING CONTROLS */}
        {activeTab === "settings" && (
          <View style={styles.tabContent}>
            <View style={[styles.card, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monitoring Controls</Text>

              <View style={styles.prefSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefSettingTitle, { color: colors.text }]}>Critical Push Alerts</Text>
                  <Text style={[styles.prefSettingSub, { color: colors.textSecondary }]}>
                    Instant alerts for delays exceeding 30 minutes
                  </Text>
                </View>
                <Ionicons name="toggle" size={32} color={colors.primary} />
              </View>

              <View style={styles.prefSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefSettingTitle, { color: colors.text }]}>Hotel Notice Automation</Text>
                  <Text style={[styles.prefSettingSub, { color: colors.textSecondary }]}>
                    Automatically prepare late check-in notification drafts
                  </Text>
                </View>
                <Ionicons name="toggle" size={32} color={colors.primary} />
              </View>

              <View style={styles.prefSettingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prefSettingTitle, { color: colors.text }]}>Bangladesh Railway Tracking</Text>
                  <Text style={[styles.prefSettingSub, { color: colors.textSecondary }]}>
                    Monitor official station master bulletins and delay signals
                  </Text>
                </View>
                <Ionicons name="toggle" size={32} color={colors.primary} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginRight: 18,
    borderBottomWidth: 2,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  monitorCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceIdent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceNumber: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  routeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stationBlock: {
    width: "40%",
    gap: 2,
  },
  stationCode: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  stationName: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  timeText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginTop: 2,
  },
  routeArrowCol: {
    alignItems: "center",
    gap: 2,
  },
  flightDuration: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: FONTS.medium,
  },
  telemetryBox: {
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  telemetryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  telemetryText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  verifyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    gap: 6,
  },
  verifyBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  simulateBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: "#EA580C",
  },
  disruptionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
  },
  disruptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disruptionTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: "#DC2626",
  },
  impactBox: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  impactHeading: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: "#991B1B",
  },
  impactExplanation: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: "#991B1B",
    lineHeight: 18,
  },
  alternativesSectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  altItemCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  altHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  altTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  altPrice: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  altDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  altBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  liveVerifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveVerifiedText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: "#059669",
  },
  decisionStatusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  altButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  declineBtnText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  prefSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prefSettingTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
  },
  prefSettingSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
});
