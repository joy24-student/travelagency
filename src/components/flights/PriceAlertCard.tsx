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
import { priceAlertService, PriceAlert } from "../../services/priceAlertService";
import { showLocalizedAlert } from "../../utils/localizedAlert";

interface PriceAlertCardProps {
  originCode: string;
  destCode: string;
  originCity?: string;
  destCity?: string;
  currentLowestPrice: number;
  currency?: string;
}

export const PriceAlertCard: React.FC<PriceAlertCardProps> = ({
  originCode,
  destCode,
  originCity,
  destCity,
  currentLowestPrice,
  currency = "USD",
}) => {
  const [isActive, setIsActive] = useState(false);
  const [activeAlert, setActiveAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(false);

  const curSymbol = currency.toUpperCase() === "BDT" ? "৳" : "$";

  // Fetch current alert status
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const alert = await priceAlertService.getAlertForRoute(originCode, destCode, "flight");
      if (isMounted) {
        if (alert && alert.isActive) {
          setIsActive(true);
          setActiveAlert(alert);
        } else {
          setIsActive(false);
          setActiveAlert(null);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [originCode, destCode]);

  const handleToggle = useCallback(async () => {
    try {
      Haptics.selectionAsync();
      setLoading(true);
      const res = await priceAlertService.togglePriceAlert({
        origin: originCode,
        destination: destCode,
        originName: originCity,
        destinationName: destCity,
        currentPrice: currentLowestPrice,
        currency,
        transportType: "flight",
        resultRoute: `/screens/flights?from=${originCode}&to=${destCode}`,
      });

      setIsActive(res.isActive);
      setActiveAlert(res.alert);

      if (res.isActive) {
        showLocalizedAlert(
          "🔔 দাম কমলে জানান সক্রিয়!",
          `${originCode} ➔ ${destCode} রুটের ভাড়া ${curSymbol}${currentLowestPrice} থেকে কমলে আপনি তাত্ক্ষণিক পুশ নোটিফিকেশন পাবেন।`
        );
      } else {
        showLocalizedAlert(
          "সতর্কতা বন্ধ",
          `${originCode} ➔ ${destCode} রুটের মূল্য পর্যবেক্ষণ বন্ধ করা হয়েছে।`
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [originCode, destCode, originCity, destCity, currentLowestPrice, currency, curSymbol]);

  const handleSendTestNotification = () => {
    if (!activeAlert) {
      // fallback alert
      priceAlertService.sendPriceDropNotification({
        id: "test",
        origin: originCode,
        destination: destCode,
        currentPrice: currentLowestPrice,
        currency,
        transportType: "flight",
        isActive: true,
        resultRoute: `/screens/flights?from=${originCode}&to=${destCode}`,
        createdAt: new Date().toISOString(),
      });
      return;
    }
    priceAlertService.sendPriceDropNotification(activeAlert);
  };

  return (
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
              ? `বর্তমান সর্বনিম্ন ${curSymbol}${currentLowestPrice}। দাম আরও কমলেই পুশ নোটিফিকেশন পাবেন।`
              : `${originCode} ➔ ${destCode} রুটের টিকিটের দাম কমলে সরাসরি নোটিফিকেশন পেতে চান?`}
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

      {isActive && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleSendTestNotification}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={13} color="#0369A1" />
            <Text style={styles.testBtnText}>নোটিফিকেশন প্রিভিউ পরীক্ষা করুন</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    borderTopColor: "#E0F2FE",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  testBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0369A1",
  },
});
