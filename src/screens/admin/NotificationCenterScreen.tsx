/**
 * Notification Center Screen - Admin Portal & Command Center
 * Comprehensive Notification Dispatcher, Campaign Scheduler, Target Segmentation,
 * and Live Interactive Device Preview.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { notificationAdminService } from "@/services/adminService";
import { ScheduledNotificationItem } from "@/types/admin";

const { width } = Dimensions.get("window");

type TabType = "composer" | "scheduled" | "history";
type ChannelType = "push" | "in_app" | "email" | "sms";
type TargetAudienceType = "all" | "travelers" | "agencies" | "inactive" | "vip";

export const NotificationCenterScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("composer");

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<ChannelType>("push");
  const [targetAudience, setTargetAudience] = useState<TargetAudienceType>("all");
  const [deepLink, setDeepLink] = useState("/(tabs)");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateStr, setScheduledDateStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queues State
  const [scheduledQueue, setScheduledQueue] = useState<ScheduledNotificationItem[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load queues
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduled, history] = await Promise.all([
        notificationAdminService.getScheduledNotifications(),
        notificationAdminService.getBroadcastHistory(),
      ]);
      setScheduledQueue(scheduled || []);
      setHistoryList(history || []);
    } catch (err) {
      console.warn("Failed to load notifications queue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Schedule Quick Preset Helpers
  const setPresetDate = (hoursFromNow: number) => {
    const target = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    // Format YYYY-MM-DD HH:mm
    const iso = target.toISOString().replace("T", " ").substring(0, 16);
    setScheduledDateStr(iso);
    setIsScheduled(true);
  };

  const handleDispatchOrSchedule = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please enter both a notification title and message.");
      return;
    }

    if (isScheduled && !scheduledDateStr.trim()) {
      Alert.alert("Schedule Date Required", "Please select or enter a scheduled date and time.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isScheduled) {
        // Parse date
        const targetDate = new Date(scheduledDateStr.replace(" ", "T")).toISOString();
        await notificationAdminService.scheduleNotification({
          title: title.trim(),
          message: message.trim(),
          channel,
          target_audience: targetAudience,
          deep_link: deepLink,
          scheduled_time: targetDate,
        });

        Alert.alert(
          "Notification Scheduled! 📅",
          `Your ${channel.toUpperCase()} broadcast is queued for ${scheduledDateStr} targeting ${targetAudience.toUpperCase()}.`,
          [{ text: "View Queue", onPress: () => setActiveTab("scheduled") }]
        );
      } else {
        await notificationAdminService.sendBroadcast({
          title: title.trim(),
          message: message.trim(),
          channel,
          target_audience: targetAudience,
          deep_link: deepLink,
        });

        Alert.alert(
          "Broadcast Dispatched! 🚀",
          `Live ${channel.toUpperCase()} notification delivered to ${targetAudience.toUpperCase()} recipients.`,
          [{ text: "View History", onPress: () => setActiveTab("history") }]
        );
      }

      // Reset form
      setTitle("");
      setMessage("");
      setIsScheduled(false);
      setScheduledDateStr("");
      await loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to dispatch notification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendScheduledNow = (item: ScheduledNotificationItem) => {
    Alert.alert(
      "Dispatch Now?",
      `Trigger scheduled notification "${item.title}" immediately to all ${item.target_audience} users?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Now",
          onPress: async () => {
            try {
              await notificationAdminService.sendScheduledNow(item.id);
              Alert.alert("Dispatched", "Notification has been sent successfully!");
              await loadData();
            } catch {
              Alert.alert("Error", "Could not dispatch scheduled item.");
            }
          },
        },
      ]
    );
  };

  const handleCancelScheduled = (item: ScheduledNotificationItem) => {
    Alert.alert(
      "Cancel Scheduled Notification",
      `Are you sure you want to cancel "${item.title}"?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Notification",
          style: "destructive",
          onPress: async () => {
            try {
              await notificationAdminService.cancelScheduledNotification(item.id);
              await loadData();
            } catch {
              Alert.alert("Error", "Could not cancel notification.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <LinearGradient
        colors={["#4338ca", "#6366f1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Notification Center</Text>
            <Text style={styles.headerSubtitle}>
              Broadcast live alerts, schedule campaigns & manage queues
            </Text>
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.activeBadgeText}>FCM Engine Live</Text>
          </View>
        </View>

        {/* Sub-Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "composer" && styles.tabBtnActive]}
            onPress={() => setActiveTab("composer")}
          >
            <MaterialCommunityIcons
              name="send"
              size={16}
              color={activeTab === "composer" ? "#4338ca" : "#e0e7ff"}
            />
            <Text style={[styles.tabText, activeTab === "composer" && styles.tabTextActive]}>
              Composer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "scheduled" && styles.tabBtnActive]}
            onPress={() => setActiveTab("scheduled")}
          >
            <MaterialCommunityIcons
              name="clock-time-four"
              size={16}
              color={activeTab === "scheduled" ? "#4338ca" : "#e0e7ff"}
            />
            <Text style={[styles.tabText, activeTab === "scheduled" && styles.tabTextActive]}>
              Scheduled ({scheduledQueue.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
            onPress={() => setActiveTab("history")}
          >
            <MaterialCommunityIcons
              name="history"
              size={16}
              color={activeTab === "history" ? "#4338ca" : "#e0e7ff"}
            />
            <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
              History ({historyList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === "composer" && (
          <View style={styles.composerWrapper}>
            {/* Delivery Channel Selector */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>1. Delivery Channel</Text>
              <View style={styles.channelGrid}>
                {[
                  { id: "push", label: "Push Notification", icon: "cellphone-message", badge: "Instant" },
                  { id: "in_app", label: "In-App Dialog", icon: "bell-ring-outline", badge: "Modal" },
                  { id: "email", label: "Email Newsletter", icon: "email-outline", badge: "HTML" },
                  { id: "sms", label: "SMS Urgent Alert", icon: "message-processing-outline", badge: "Carrier" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.channelOption, channel === item.id && styles.channelOptionActive]}
                    onPress={() => setChannel(item.id as ChannelType)}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={22}
                      color={channel === item.id ? "#4338ca" : "#64748b"}
                    />
                    <Text style={[styles.channelOptionTitle, channel === item.id && styles.channelOptionTitleActive]}>
                      {item.label}
                    </Text>
                    <View style={[styles.channelBadge, channel === item.id && styles.channelBadgeActive]}>
                      <Text style={[styles.channelBadgeText, channel === item.id && styles.channelBadgeTextActive]}>
                        {item.badge}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Audience Selector */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>2. Target Audience Segmentation</Text>
              <View style={styles.targetRow}>
                {[
                  { id: "all", label: "All Users", icon: "earth" },
                  { id: "travelers", label: "Active Travelers", icon: "airplane" },
                  { id: "agencies", label: "Partner Agencies", icon: "domain" },
                  { id: "vip", label: "VIP Bookers", icon: "crown" },
                  { id: "inactive", label: "Inactive (>30d)", icon: "account-clock" },
                ].map((aud) => (
                  <TouchableOpacity
                    key={aud.id}
                    style={[styles.targetChip, targetAudience === aud.id && styles.targetChipActive]}
                    onPress={() => setTargetAudience(aud.id as TargetAudienceType)}
                  >
                    <MaterialCommunityIcons
                      name={aud.icon as any}
                      size={16}
                      color={targetAudience === aud.id ? "#ffffff" : "#475569"}
                    />
                    <Text style={[styles.targetChipText, targetAudience === aud.id && styles.targetChipTextActive]}>
                      {aud.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Payload */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>3. Notification Payload</Text>

              <Text style={styles.inputLabel}>Title / Headline</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Flash Sale: 25% Off International Flights! ✈️"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
              <Text style={styles.charCount}>{title.length}/80 characters</Text>

              <Text style={styles.inputLabel}>Message Content</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Book before midnight tonight to unlock exclusive promotional fares to Dubai, Bangkok & Singapore."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={message}
                onChangeText={setMessage}
                maxLength={240}
              />
              <Text style={styles.charCount}>{message.length}/240 characters</Text>

              <Text style={styles.inputLabel}>Deep Link Action Route</Text>
              <View style={styles.routePillRow}>
                {[
                  { label: "Home", route: "/(tabs)" },
                  { label: "Flights", route: "/screens/flights" },
                  { label: "Hotels", route: "/screens/search-stays" },
                  { label: "Promo & Deals", route: "/screens/rewards" },
                  { label: "Packages", route: "/screens/packages" },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.label}
                    style={[styles.routePill, deepLink === r.route && styles.routePillActive]}
                    onPress={() => setDeepLink(r.route)}
                  >
                    <Text style={[styles.routePillText, deepLink === r.route && styles.routePillTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scheduling & Trigger Time */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>4. Timing & Scheduling</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.timingToggleBtn, !isScheduled && styles.timingToggleBtnActive]}
                    onPress={() => setIsScheduled(false)}
                  >
                    <Text style={[styles.timingToggleText, !isScheduled && styles.timingToggleTextActive]}>
                      Send Immediately
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timingToggleBtn, isScheduled && styles.timingToggleBtnActive]}
                    onPress={() => setIsScheduled(true)}
                  >
                    <Text style={[styles.timingToggleText, isScheduled && styles.timingToggleTextActive]}>
                      Schedule For Later ⏰
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isScheduled && (
                <View style={styles.scheduleBox}>
                  <Text style={styles.inputLabel}>Quick Presets</Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetDate(1)}>
                      <Text style={styles.presetBtnText}>+1 Hour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetDate(24)}>
                      <Text style={styles.presetBtnText}>Tomorrow 9 AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetDate(72)}>
                      <Text style={styles.presetBtnText}>In 3 Days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetBtn} onPress={() => setPresetDate(168)}>
                      <Text style={styles.presetBtnText}>Next Week</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Scheduled Date & Time (YYYY-MM-DD HH:mm)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-11-12 18:00"
                    placeholderTextColor="#94a3b8"
                    value={scheduledDateStr}
                    onChangeText={setScheduledDateStr}
                  />
                </View>
              )}
            </View>

            {/* Live Mobile Lock-Screen Device Mockup */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>5. Live Device Notification Preview</Text>
              <View style={styles.mockupContainer}>
                <View style={styles.mockupHeader}>
                  <Ionicons name="lock-closed" size={14} color="#64748b" />
                  <Text style={styles.mockupTime}>10:42 AM</Text>
                </View>

                <View style={styles.notificationBubble}>
                  <View style={styles.bubbleTop}>
                    <View style={styles.appIconWrap}>
                      <Ionicons name="airplane" size={12} color="#ffffff" />
                    </View>
                    <Text style={styles.appName}>SHOPNOJATRA</Text>
                    <Text style={styles.notifTime}>NOW</Text>
                  </View>

                  <Text style={styles.bubbleTitle}>
                    {title || "Special Flight Drop: 20% Off Weekend Deals!"}
                  </Text>
                  <Text style={styles.bubbleBody} numberOfLines={2}>
                    {message || "Tap to book your holiday stays and flight tickets before tickets sell out."}
                  </Text>

                  <View style={styles.bubbleActionRow}>
                    <Text style={styles.bubbleActionText}>Tap to open: {deepLink}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
                  </View>
                </View>
              </View>
            </View>

            {/* Submit CTA */}
            <TouchableOpacity
              style={[styles.dispatchSubmitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleDispatchOrSchedule}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={isScheduled ? "clock-check-outline" : "rocket-launch"}
                    size={20}
                    color="#ffffff"
                  />
                  <Text style={styles.dispatchSubmitText}>
                    {isScheduled ? "Schedule Notification Campaign" : "Dispatch Broadcast Now"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Scheduled Queue Tab */}
        {activeTab === "scheduled" && (
          <View style={styles.queueWrapper}>
            <Text style={styles.queueHeaderTitle}>Active Scheduled Campaigns ({scheduledQueue.length})</Text>

            {scheduledQueue.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="calendar-clock" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Scheduled Notifications</Text>
                <Text style={styles.emptySubtitle}>
                  Schedule future notifications in the Composer tab to see them queued here.
                </Text>
              </View>
            ) : (
              scheduledQueue.map((item) => (
                <View key={item.id} style={styles.scheduledCard}>
                  <View style={styles.scheduledCardHeader}>
                    <View style={styles.scheduledBadge}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#4338ca" />
                      <Text style={styles.scheduledBadgeText}>
                        {new Date(item.scheduled_time).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.targetAudienceBadge}>
                      <Text style={styles.targetAudienceText}>{item.target_audience.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.scheduledCardTitle}>{item.title}</Text>
                  <Text style={styles.scheduledCardMessage}>{item.message}</Text>

                  <View style={styles.scheduledMetaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="link" size={12} color="#64748b" />
                      <Text style={styles.metaText}>{item.deep_link || "/(tabs)"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="cellphone-text" size={14} color="#64748b" />
                      <Text style={styles.metaText}>{item.channel.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.scheduledActionRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSendNow}
                      onPress={() => handleSendScheduledNow(item)}
                    >
                      <MaterialCommunityIcons name="send" size={14} color="#059669" />
                      <Text style={styles.actionBtnSendNowText}>Send Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnCancel}
                      onPress={() => handleCancelScheduled(item)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                      <Text style={styles.actionBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <View style={styles.queueWrapper}>
            <Text style={styles.queueHeaderTitle}>Broadcast Delivery History</Text>

            {historyList.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="history" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Broadcast History</Text>
                <Text style={styles.emptySubtitle}>Dispatched notifications will be tracked here.</Text>
              </View>
            ) : (
              historyList.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <View style={styles.statusIndicator}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              item.status === "sent"
                                ? "#10b981"
                                : item.status === "cancelled"
                                ? "#dc2626"
                                : "#4338ca",
                          },
                        ]}
                      />
                      <Text style={styles.historyStatusText}>{(item.status || "SENT").toUpperCase()}</Text>
                    </View>
                    <Text style={styles.historyTime}>
                      {new Date(item.sent_at || item.created_at).toLocaleString()}
                    </Text>
                  </View>

                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyMessage} numberOfLines={2}>
                    {item.message}
                  </Text>

                  <View style={styles.historyStatsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Channel</Text>
                      <Text style={styles.statVal}>{(item.channel || "push").toUpperCase()}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Target</Text>
                      <Text style={styles.statVal}>{(item.target_audience || "all").toUpperCase()}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Delivered</Text>
                      <Text style={[styles.statVal, { color: "#059669" }]}>
                        {item.sent_count ? `${item.sent_count}` : "Delivered"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    maxWidth: width * 0.7,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399",
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#e0e7ff",
  },
  tabTextActive: {
    color: "#4338ca",
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  channelOption: {
    width: (width - 64 - 10) / 2,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  channelOptionActive: {
    borderColor: "#4338ca",
    backgroundColor: "#eef2ff",
  },
  channelOptionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },
  channelOptionTitleActive: {
    color: "#4338ca",
  },
  channelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  channelBadgeActive: {
    backgroundColor: "#c7d2fe",
  },
  channelBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  channelBadgeTextActive: {
    color: "#3730a3",
  },
  targetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  targetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  targetChipActive: {
    backgroundColor: "#4338ca",
    borderColor: "#4338ca",
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  targetChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
  },
  textAreaInput: {
    height: 75,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 4,
  },
  routePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  routePill: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  routePillActive: {
    backgroundColor: "#e0e7ff",
    borderColor: "#6366f1",
  },
  routePillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  routePillTextActive: {
    color: "#4338ca",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  timingToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timingToggleBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  timingToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  timingToggleTextActive: {
    color: "#4338ca",
    fontWeight: "700",
  },
  scheduleBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  presetRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338ca",
  },
  mockupContainer: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
  },
  mockupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mockupTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  notificationBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bubbleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  appIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#0055F2",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  notifTime: {
    fontSize: 9,
    color: "#94a3b8",
    marginLeft: "auto",
  },
  bubbleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  bubbleBody: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  bubbleActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bubbleActionText: {
    fontSize: 10,
    color: "#6366f1",
    fontWeight: "600",
  },
  dispatchSubmitBtn: {
    flexDirection: "row",
    backgroundColor: "#4338ca",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#4338ca",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  dispatchSubmitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  queueHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  scheduledCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scheduledCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3730a3",
  },
  targetAudienceBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  targetAudienceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  scheduledCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  scheduledCardMessage: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 8,
  },
  scheduledMetaRow: {
    flexDirection: "row",
    gap: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
  },
  scheduledActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnSendNow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnSendNowText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  actionBtnCancel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  historyTime: {
    fontSize: 10,
    color: "#94a3b8",
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  historyMessage: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    marginBottom: 8,
  },
  historyStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
  },
  statBox: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  composerWrapper: {
    flexDirection: "column" as const,
    marginBottom: 16,
  },
  queueWrapper: {
    flexDirection: "column" as const,
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
});
