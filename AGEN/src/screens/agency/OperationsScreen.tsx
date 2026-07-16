/**
 * Operations Screen
 * Live tours, operational status, and activity feed
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../App";
import { Card, SectionHeader, Badge, ActivityItem } from "../ui/UIComponents";

const { width } = Dimensions.get("window");

const THEME = {
  dark: "#0B0E14",
  surface: "#151921",
  card: "#1C212B",
  accent: "#6366F1",
  cyan: "#22D3EE",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  textSecondary: "#94A3B8",
  border: "rgba(255, 255, 255, 0.05)",
};

interface Tour {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: "In Progress" | "Scheduled" | "Completed";
  capacity: { current: number; total: number };
  location: string;
}

export default function OperationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form, setForm] = useState({
    title: "",
    location: "",
    dates: "",
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const liveTours: Tour[] = [
    {
      id: "1",
      title: "Bali Explorer Pack",
      startDate: "24 May",
      endDate: "30 May 2024",
      status: "In Progress",
      capacity: { current: 18, total: 20 },
      location: "Bali, Indonesia",
    },
    {
      id: "2",
      title: "Swiss Alps Adventure",
      startDate: "25 May",
      endDate: "02 Jun",
      status: "In Progress",
      capacity: { current: 14, total: 15 },
      location: "Switzerland",
    },
  ];

  const operationalStatus = {
    onTime: 18,
    delayed: 2,
    cancelled: 1,
    completed: 12,
  };

  const recentActivities = [
    {
      icon: "map-marker",
      title: "Tour 'Bali Explorer Pack' has started",
      time: "10:30 AM",
      color: COLORS.secondary,
    },
    {
      icon: "account-check",
      title: "Jane Cooper checked in at Airport",
      description: "Booking ID: BK-8821",
      time: "09:15 AM",
      color: COLORS.primary,
    },
    {
      icon: "file-document",
      title: "New booking received",
      description: "#SJ-8832",
      time: "08:45 AM",
      color: COLORS.warning,
    },
    {
      icon: "credit-card",
      title: "Payment received from Robert Fox",
      description: "$2,450",
      time: "08:30 AM",
      color: COLORS.success,
    },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <SafeAreaView style={[styles.container, styles.safeArea]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.dark} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Operations</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addScheduleBtn}
            onPress={() => setIsModalVisible(true)}
          >
            <Feather name="plus" size={18} color="white" />
            <Text style={styles.addScheduleText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn}>
            <Feather name="bell" size={22} color={THEME.textSecondary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.accent}
          />
        }
      >
        {/* Live Tours */}
        <View style={styles.section}>
          <SectionHeader title="Live Tours" action="View All" />
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {liveTours.map((tour, idx) => (
              <TouchableOpacity key={tour.id} activeOpacity={0.9}>
                <View style={styles.tourCard}>
                  {/* Glow Effect */}
                  <View
                    style={[
                      styles.cardGlow,
                      {
                        backgroundColor: idx === 0 ? THEME.accent : THEME.cyan,
                      },
                    ]}
                  />
                  <View style={styles.tourCardContent}>
                    <Text style={styles.tourTitle}>{tour.title}</Text>
                    <Text style={styles.tourDate}>
                      {tour.startDate} - {tour.endDate}
                    </Text>
                    <View style={styles.statusBadgeRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${THEME.accent}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: THEME.accent },
                          ]}
                        >
                          IN PROGRESS
                        </Text>
                      </View>
                      <View style={styles.timerBox}>
                        <MaterialCommunityIcons
                          name="timer-outline"
                          size={14}
                          color={THEME.textSecondary}
                        />
                        <Text style={styles.timerText}>04h 22m</Text>
                      </View>
                    </View>
                    <View style={styles.capacityRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.capacityText}>
                          {tour.capacity.current} / {tour.capacity.total}
                        </Text>
                        <View style={styles.capacityBar}>
                          <View
                            style={[
                              styles.capacityFill,
                              {
                                width: `${(tour.capacity.current / tour.capacity.total) * 100}%`,
                                backgroundColor:
                                  idx === 0 ? THEME.accent : THEME.cyan,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.locationIconBox}>
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={18}
                          color={THEME.danger}
                        />
                      </View>
                    </View>

                    {/* Tour Management Actions */}
                    <View style={styles.tourActions}>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.finishBtn]}
                      >
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.cardActionText}>Finish</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.cancelBtn]}
                      >
                        <MaterialCommunityIcons
                          name="close-circle-outline"
                          size={16}
                          color={THEME.danger}
                        />
                        <Text
                          style={[
                            styles.cardActionText,
                            { color: THEME.danger },
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.ScrollView>
        </View>

        {/* Operational Status */}
        <View style={styles.section}>
          <SectionHeader title="Operational Status" />
          <View style={styles.statusGrid}>
            {[
              {
                label: "On Time",
                val: operationalStatus.onTime,
                color: THEME.success,
              },
              {
                label: "Delayed",
                val: operationalStatus.delayed,
                color: THEME.warning,
              },
              {
                label: "Cancelled",
                val: operationalStatus.cancelled,
                color: THEME.danger,
              },
              {
                label: "Completed",
                val: operationalStatus.completed,
                color: THEME.success,
              },
            ].map((status, i) => (
              <View key={i} style={styles.statusCard}>
                <Text style={[styles.statusLabel, { color: status.color }]}>
                  {status.label}
                </Text>
                <Text style={styles.statusValue}>{status.val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Live Activity */}
        <View style={styles.section}>
          <SectionHeader title="Live Activity" />
          <View style={styles.activityList}>
            {recentActivities.map((activity, index) => {
              // Mapping HTML icons to RN Feather/Material
              let iconName: any = "info";
              if (activity.icon === "map-marker") iconName = "navigation";
              if (activity.icon === "account-check") iconName = "user-check";
              if (activity.icon === "file-document") iconName = "file-text";
              if (activity.icon === "credit-card") iconName = "credit-card";

              return (
                <View key={index} style={styles.activityCard}>
                  <View style={styles.activityLeft}>
                    <View
                      style={[
                        styles.activityIconBox,
                        {
                          backgroundColor: `${activity.color || THEME.accent}15`,
                        },
                      ]}
                    >
                      <Feather
                        name={iconName}
                        size={18}
                        color={activity.color || THEME.accent}
                      />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      {activity.description && (
                        <Text style={styles.activityDesc}>
                          {activity.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Creation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Schedule</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tour Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Bali Explorer Pack"
                  placeholderTextColor={THEME.textSecondary}
                  value={form.title}
                  onChangeText={(text) => setForm({ ...form, title: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ubud, Bali"
                  placeholderTextColor={THEME.textSecondary}
                  value={form.location}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date Range</Text>
                <TouchableOpacity style={styles.datePickerPlaceholder}>
                  <Feather
                    name="calendar"
                    size={18}
                    color={THEME.textSecondary}
                  />
                  <Text style={styles.datePickerText}>Select Dates</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Create Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.dark,
  },
  safeArea: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addScheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.accent,
  },
  addScheduleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.danger,
    borderWidth: 2,
    borderColor: THEME.dark,
  },

  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
    marginTop: 0,
  },

  tourTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },

  horizontalScroll: {
    paddingRight: 20,
    gap: 16,
  },
  tourCard: {
    width: 200,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 12,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.05,
  },
  tourCardContent: {
    zIndex: 1,
  },
  tourDate: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  statusBadgeRow: {
    marginTop: 12,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  timerText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  capacityRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 15,
  },
  capacityText: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  capacityBar: {
    height: 5,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    borderRadius: 3,
  },
  tourActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  finishBtn: {
    backgroundColor: THEME.success,
  },
  cancelBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statusCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
  },
  activityDesc: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: THEME.textSecondary,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  modalForm: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: THEME.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: "auto",
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 15,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  datePickerPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  datePickerText: {
    color: THEME.textSecondary,
    fontSize: 15,
  },
});
