/**
 * PriceAlertsScreen - Management Dashboard for Fare Drop Alerts.
 * Features:
 * - Active alert capacity meter (X / 10).
 * - Filter by status (All, Active, Triggered, Paused, Expired).
 * - Real-time Pause / Resume and Delete actions.
 * - Deep link navigation to search results with date prefilled.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  priceAlertService,
  PriceAlert,
  AlertStatus,
} from "../services/priceAlertService";
import { showLocalizedAlert } from "../utils/localizedAlert";

export const PriceAlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const loadAlerts = useCallback(async () => {
    try {
      const data = await priceAlertService.getUserAlerts();
      setAlerts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAlerts();
  }, [loadAlerts]);

  const activeCount = alerts.filter((a) => a.status === "active").length;

  const handleTogglePause = async (alert: PriceAlert) => {
    try {
      Haptics.selectionAsync();
      const success = await priceAlertService.toggleAlertStatus(alert.id, alert.status);
      if (success) {
        await loadAlerts();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = (alert: PriceAlert) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "সতর্কতা ডিলিট",
      `${alert.origin} ➔ ${alert.destination} রুটের এই মূল্য সতর্কতাটি ডিলিট করতে চান?`,
      [
        { text: "বাতিল", style: "cancel" },
        {
          text: "ডিলিট করুন",
          style: "destructive",
          onPress: async () => {
            const success = await priceAlertService.deleteAlert(alert.id);
            if (success) {
              await loadAlerts();
            }
          },
        },
      ]
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (selectedFilter === "all") return true;
    return a.status === selectedFilter;
  });

  const renderServiceIcon = (type: string) => {
    switch (type) {
      case "train":
        return <Ionicons name="train-outline" size={18} color="#0055F2" />;
      case "bus":
        return <Ionicons name="bus-outline" size={18} color="#0D9488" />;
      case "launch":
        return <Ionicons name="boat-outline" size={18} color="#0284C7" />;
      default:
        return <Ionicons name="airplane-outline" size={18} color="#0055F2" />;
    }
  };

  const renderStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case "active":
        return (
          <View style={[styles.statusBadge, styles.statusActive]}>
            <View style={[styles.statusDot, styles.dotActive]} />
            <Text style={[styles.statusText, styles.textActive]}>মনিটরিং চালু</Text>
          </View>
        );
      case "triggered":
        return (
          <View style={[styles.statusBadge, styles.statusTriggered]}>
            <Ionicons name="flash" size={10} color="#0284C7" />
            <Text style={[styles.statusText, styles.textTriggered]}>দাম কমেছে!</Text>
          </View>
        );
      case "paused":
        return (
          <View style={[styles.statusBadge, styles.statusPaused]}>
            <Text style={[styles.statusText, styles.textPaused]}>স্থগিত</Text>
          </View>
        );
      case "expired":
        return (
          <View style={[styles.statusBadge, styles.statusExpired]}>
            <Text style={[styles.statusText, styles.textExpired]}>মেয়াদোত্তীর্ণ</Text>
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: PriceAlert }) => {
    const isPaused = item.status === "paused";
    const isExpired = item.status === "expired";

    return (
      <View style={[styles.card, (isPaused || isExpired) && styles.cardDimmed]}>
        {/* Card Header: Transport, Route, Status */}
        <View style={styles.cardHeader}>
          <View style={styles.routeWrapper}>
            <View style={styles.serviceIconCircle}>
              {renderServiceIcon(item.serviceType)}
            </View>
            <View>
              <Text style={styles.routeCodes}>
                {item.origin} ➔ {item.destination}
              </Text>
              <Text style={styles.serviceTypeName}>
                {item.serviceType.toUpperCase()}
              </Text>
            </View>
          </View>

          {renderStatusBadge(item.status)}
        </View>

        {/* Card Details: Travel Date, Target Price / Drop */}
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text style={styles.detailText}>
              {item.travelDate} {item.dateFlexDays > 0 ? `(±${item.dateFlexDays} দিন)` : ""}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={14} color="#64748B" />
            <Text style={styles.detailText}>
              {item.targetPriceBDT
                ? `টার্গেট: ৳${item.targetPriceBDT.toLocaleString()}`
                : `${item.dropPercent}% দাম হ্রাস`}
            </Text>
          </View>
        </View>

        {/* Card Actions: View Results, Pause/Resume, Delete */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => priceAlertService.navigateToPrefilledSearch(item)}
            style={styles.viewDealsBtn}
          >
            <Ionicons name="search" size={14} color="#0055F2" />
            <Text style={styles.viewDealsText}>ফলাফল দেখুন</Text>
          </TouchableOpacity>

          <View style={styles.actionButtonsRow}>
            {!isExpired && (
              <TouchableOpacity
                onPress={() => handleTogglePause(item)}
                style={styles.iconActionBtn}
                accessibilityLabel={isPaused ? "Resume alert" : "Pause alert"}
              >
                <Ionicons
                  name={isPaused ? "play-circle-outline" : "pause-circle-outline"}
                  size={22}
                  color={isPaused ? "#059669" : "#D97706"}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.iconActionBtn}
              accessibilityLabel="Delete alert"
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>মূল্য সতর্কতা</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Cap Counter Bar */}
      <View style={styles.counterBar}>
        <View style={styles.counterInfo}>
          <Ionicons name="notifications" size={18} color="#0055F2" />
          <Text style={styles.counterText}>
            সক্রিয় সতর্কতা: <Text style={styles.counterBold}>{activeCount}/১০</Text>
          </Text>
        </View>
        <Text style={styles.counterSub}>সর্বোচ্চ ১০টি সক্রিয় রাখা যায়</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { key: "all", label: "সবগুলো" },
          { key: "active", label: "সক্রিয়" },
          { key: "triggered", label: "দাম কমেছে" },
          { key: "paused", label: "স্থগিত" },
          { key: "expired", label: "মেয়াদোত্তীর্ণ" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedFilter(f.key);
            }}
            style={[
              styles.filterChip,
              selectedFilter === f.key && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List / Empty State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0055F2" />
        </View>
      ) : filteredAlerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>কোনো সতর্কতা পাওয়া যায়নি</Text>
          <Text style={styles.emptySubtitle}>
            ফ্লাইট, ট্রেন বা বাস সার্চ স্ক্রিন থেকে ভাড়ার ক্যালেন্ডার দেখে দাম কমলে জানান সক্রিয় করুন।
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/screens/flights" as any)}
            style={styles.exploreBtn}
          >
            <Text style={styles.exploreBtnText}>ফ্লাইট খুঁজুন</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  counterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  counterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterText: {
    fontSize: 14,
    color: "#1E3A8A",
  },
  counterBold: {
    fontWeight: "800",
  },
  counterSub: {
    fontSize: 11,
    color: "#3B82F6",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  filterChipText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDimmed: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  routeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  routeCodes: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  serviceTypeName: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  dotActive: {
    backgroundColor: "#10B981",
  },
  textActive: {
    color: "#059669",
  },
  statusTriggered: {
    backgroundColor: "#E0F2FE",
  },
  textTriggered: {
    color: "#0284C7",
  },
  statusPaused: {
    backgroundColor: "#FEF3C7",
  },
  textPaused: {
    color: "#D97706",
  },
  statusExpired: {
    backgroundColor: "#F1F5F9",
  },
  textExpired: {
    color: "#94A3B8",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewDealsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewDealsText: {
    fontSize: 12,
    color: "#0055F2",
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconActionBtn: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: "#0055F2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreBtnText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
