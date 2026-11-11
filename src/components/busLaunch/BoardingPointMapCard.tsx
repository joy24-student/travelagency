import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { openLink } from "../../utils/openLink";

interface BoardingPointMapCardProps {
  boardingPoint: string;
  counterAddress?: string;
  departureTime: string;
  transportType?: "bus" | "launch";
  compact?: boolean;
}

export const BoardingPointMapCard: React.FC<BoardingPointMapCardProps> = ({
  boardingPoint,
  counterAddress,
  departureTime,
  transportType = "bus",
  compact = false,
}) => {
  // Calculate reporting time (30 minutes prior to departure)
  const calculateReportingTime = (timeStr: string): string => {
    try {
      if (!timeStr || !timeStr.includes(":")) return "যাত্রার ৩০ মিনিট আগে";
      const parts = timeStr.trim().split(" ");
      const [hStr, mStr] = parts[0].split(":");
      let hours = parseInt(hStr, 10);
      let minutes = parseInt(mStr, 10) || 0;
      const meridiem = parts[1] || "";

      // Convert to 24-hour minutes
      if (meridiem.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (meridiem.toUpperCase() === "AM" && hours === 12) hours = 0;

      let totalMinutes = hours * 60 + minutes - 30; // 30 minutes before
      if (totalMinutes < 0) totalMinutes += 24 * 60;

      let repHours = Math.floor(totalMinutes / 60);
      const repMins = totalMinutes % 60;
      const repMeridiem = repHours >= 12 ? "PM" : "AM";
      if (repHours > 12) repHours -= 12;
      if (repHours === 0) repHours = 12;

      return `${String(repHours).padStart(2, "0")}:${String(repMins).padStart(2, "0")} ${repMeridiem}`;
    } catch {
      return "যাত্রার ৩০ মিনিট আগে";
    }
  };

  const reportingTime = calculateReportingTime(departureTime);

  // Fallback enriched counter addresses if not passed
  const getFullAddress = (): string => {
    if (counterAddress) return counterAddress;
    const lower = boardingPoint.toLowerCase();
    if (transportType === "launch" || lower.includes("sadarghat") || lower.includes("সদরঘাট")) {
      return `${boardingPoint}, সদরঘাট লঞ্চ টার্মিনাল, বুড়িগঙ্গা নদী বন্দর, ঢাকা`;
    }
    if (lower.includes("gabtoli") || lower.includes("গাবতলী")) {
      return `${boardingPoint}, কাউন্টার নং ১২, গাবতলী আন্তঃজেলা বাস টার্মিনাল, ঢাকা`;
    }
    if (lower.includes("sayedabad") || lower.includes("সায়েদাবাদ") || lower.includes("সায়দাবাদ")) {
      return `${boardingPoint}, কাউন্টার নং ৮, সায়েদাবাদ বাস টার্মিনাল, ঢাকা`;
    }
    if (lower.includes("mohakali") || lower.includes("মহাখালী")) {
      return `${boardingPoint}, কাউন্টার নং ১৫, মহাখালী বাস টার্মিনাল, ঢাকা`;
    }
    if (lower.includes("arambagh") || lower.includes("আরামবাগ")) {
      return `${boardingPoint}, আরামবাগ নটরডেম কলেজের বিপরীতে, মতিঝিল, ঢাকা`;
    }
    if (lower.includes("chattogram") || lower.includes("chittagong") || lower.includes("চট্টগ্রাম")) {
      return `${boardingPoint}, দামপাড়া বাস স্ট্যান্ড, চট্টগ্রাম`;
    }
    return `${boardingPoint}, বাংলাদেশ`;
  };

  const fullAddress = getFullAddress();

  const handleOpenMap = async () => {
    try {
      Haptics.selectionAsync();
      const encodedAddress = encodeURIComponent(fullAddress);
      let mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      if (Platform.OS === "android") {
        mapUrl = `geo:0,0?q=${encodedAddress}`;
      }
      await openLink(mapUrl, { label: "বোর্ডিং পয়েন্ট", copyValue: fullAddress });
    } catch {
      await openLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, {
        label: "বোর্ডিং পয়েন্ট",
        copyValue: fullAddress,
      });
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <Ionicons name="location" size={14} color="#0055F2" />
          <Text style={styles.compactAddress} numberOfLines={1}>
            {fullAddress}
          </Text>
          <TouchableOpacity style={styles.mapPillSmall} onPress={handleOpenMap}>
            <Ionicons name="map-outline" size={12} color="#FFFFFF" />
            <Text style={styles.mapPillTextSmall}>ম্যাপ</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.advisoryBadge}>
          <Ionicons name="time-outline" size={12} color="#D97706" />
          <Text style={styles.advisoryBadgeText}>
            যাত্রার ৩০ মিনিট আগে পৌঁছান (রিপোর্টিং: {reportingTime})
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Banner: Arrive 30 minutes before */}
      <View style={styles.advisoryBanner}>
        <Ionicons name="alert-circle" size={15} color="#B45309" />
        <Text style={styles.advisoryBannerText}>
          যাত্রার ৩০ মিনিট আগে পৌঁছান · রিপোর্টিং সময়: {reportingTime}
        </Text>
      </View>

      {/* Boarding Point Details & Map CTA */}
      <View style={styles.detailsRow}>
        <View style={styles.iconBox}>
          <Ionicons
            name={transportType === "launch" ? "boat" : "location"}
            size={18}
            color="#0055F2"
          />
        </View>

        <View style={styles.addressCol}>
          <Text style={styles.titleLabel}>
            {transportType === "launch" ? "বোর্ডিং ঘাট ও পল্টুন" : "বোর্ডিং কাউন্টারের ঠিকানা"}
          </Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {fullAddress}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mapButton}
          onPress={handleOpenMap}
          activeOpacity={0.8}
        >
          <Ionicons name="map" size={14} color="#FFFFFF" />
          <Text style={styles.mapButtonText}>ম্যাপে দেখুন</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginVertical: 6,
  },
  advisoryBanner: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  advisoryBannerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#92400E",
    flex: 1,
  },
  detailsRow: {
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addressCol: {
    flex: 1,
  },
  titleLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 1,
  },
  mapButton: {
    backgroundColor: "#0055F2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    shadowColor: "#0055F2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.15)" } : {}),
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // Compact styles
  compactContainer: {
    marginVertical: 4,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactAddress: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  mapPillSmall: {
    backgroundColor: "#0284C7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  mapPillTextSmall: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  advisoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
    alignSelf: "flex-start",
  },
  advisoryBadgeText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },
});
