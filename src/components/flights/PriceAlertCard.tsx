import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { priceAlertService, PriceAlert, ServiceType } from "../../services/priceAlertService";
import { CreatePriceAlertModal } from "./CreatePriceAlertModal";
import { showLocalizedAlert } from "../../utils/localizedAlert";

interface PriceAlertCardProps {
  originCode: string;
  destCode: string;
  originCity?: string;
  destCity?: string;
  travelDate?: string; // YYYY-MM-DD
  currentLowestPrice: number;
  currency?: string;
  serviceType?: ServiceType;
}

export const PriceAlertCard: React.FC<PriceAlertCardProps> = ({
  originCode,
  destCode,
  originCity,
  destCity,
  travelDate,
  currentLowestPrice,
  currency = "BDT",
  serviceType = "flight",
}) => {
  const [isActive, setIsActive] = useState(false);
  const [activeAlert, setActiveAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const curSymbol = currency.toUpperCase() === "BDT" ? "৳" : "$";

  // Compute default travel date if not provided (tomorrow)
  const defaultTravelDate = React.useMemo(() => {
    if (travelDate) return travelDate;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [travelDate]);

  // Fetch current alert status
  const loadAlertStatus = useCallback(async () => {
    const alert = await priceAlertService.getAlertForRoute(
      originCode,
      destCode,
      serviceType,
      travelDate
    );
    if (alert && (alert.status === "active" || alert.status === "triggered")) {
      setIsActive(true);
      setActiveAlert(alert);
    } else {
      setIsActive(false);
      setActiveAlert(alert || null);
    }
  }, [originCode, destCode, serviceType, travelDate]);

  useEffect(() => {
    loadAlertStatus();
  }, [loadAlertStatus]);

  const handleToggle = useCallback(async (value: boolean) => {
    Haptics.selectionAsync();

    if (value) {
      if (!activeAlert) {
        // Open modal to configure target price & flex days
        setShowModal(true);
      } else {
        // Resume existing paused alert
        setLoading(true);
        const success = await priceAlertService.toggleAlertStatus(activeAlert.id, activeAlert.status);
        if (success) {
          setIsActive(true);
          await loadAlertStatus();
        }
        setLoading(false);
      }
    } else {
      if (activeAlert) {
        // Pause active alert
        setLoading(true);
        const success = await priceAlertService.toggleAlertStatus(activeAlert.id, activeAlert.status);
        if (success) {
          setIsActive(false);
          await loadAlertStatus();
        }
        setLoading(false);
      }
    }
  }, [activeAlert, loadAlertStatus]);

  return (
    <>
      <View style={[styles.container, isActive ? styles.containerActive : styles.containerInactive]}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isActive ? "notifications" : "notifications-outline"}
              size={18}
              color={isActive ? "#0284C7" : "#64748B"}
            />
          </View>

          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>দাম কমলে জানান</Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>মনিটরিং চালু</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitleText}>
              {isActive
                ? `বর্তমান সর্বনিম্ন ${curSymbol}${currentLowestPrice}। লক্ষ্যমূল্যে নামলেই পুশ নোটিফিকেশন পাবেন।`
                : `${originCode} ➔ ${destCode} রুটের ভাড়া কমলে সরাসরি নোটিফিকেশন পেতে চান?`}
            </Text>
          </View>

          <Switch
            value={isActive}
            onValueChange={handleToggle}
            trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
            thumbColor={isActive ? "#0055F2" : "#F8FAFC"}
            disabled={loading}
          />
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.manageAlertsBtn}
            onPress={() => router.push("/screens/price-alerts" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={13} color="#0055F2" />
            <Text style={styles.manageAlertsText}>সব সতর্কতা পরিচালনা করুন</Text>
          </TouchableOpacity>

          {!isActive && (
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={13} color="#0369A1" />
              <Text style={styles.setupBtnText}>টার্গেট সেট করুন</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <CreatePriceAlertModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        origin={originCode}
        destination={destCode}
        travelDate={defaultTravelDate}
        currentLowestPriceBDT={currentLowestPrice}
        serviceType={serviceType}
        onAlertCreated={() => {
          loadAlertStatus();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  containerInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  containerActive: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  activeBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284C7",
  },
  subtitleText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  bottomActions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manageAlertsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manageAlertsText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#0055F2",
  },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  setupBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
  },
});
