import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DetailedAmenity } from "../../data/hotelCatalog";

interface AmenityBadgeItemProps {
  amenity: DetailedAmenity | string;
  isRoomDetail?: boolean;
}

export const AmenityBadgeItem: React.FC<AmenityBadgeItemProps> = ({
  amenity,
  isRoomDetail = false,
}) => {
  // If passed as simple string, infer amenity details
  const parsedAmenity: DetailedAmenity =
    typeof amenity === "string"
      ? {
          id: amenity.toLowerCase().replace(/\s+/g, "-"),
          name: amenity,
          name_bn: amenity,
          icon: inferAmenityIcon(amenity),
          is_free: !amenity.toLowerCase().includes("paid") && !amenity.toLowerCase().includes("charge"),
          fee_note_bn: amenity.toLowerCase().includes("paid") ? "অতিরিক্ত চার্জ" : "ফ্রি",
        }
      : amenity;

  const isFree = parsedAmenity.is_free !== false;
  const iconName = (parsedAmenity.icon as any) || inferAmenityIcon(parsedAmenity.name);

  return (
    <View style={[styles.container, isRoomDetail && styles.roomDetailContainer]}>
      <View style={styles.leftInfo}>
        <View style={[styles.iconCircle, isFree ? styles.iconCircleFree : styles.iconCirclePaid]}>
          <Ionicons
            name={iconName}
            size={14}
            color={isFree ? "#059669" : "#D97706"}
          />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.nameText} numberOfLines={1}>
            {parsedAmenity.name_bn || parsedAmenity.name}
          </Text>
          {parsedAmenity.fee_note || parsedAmenity.fee_note_bn ? (
            <Text style={styles.noteText} numberOfLines={1}>
              {parsedAmenity.fee_note_bn || parsedAmenity.fee_note}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.badge, isFree ? styles.badgeFree : styles.badgePaid]}>
        <Ionicons
          name={isFree ? "checkmark-circle" : "alert-circle"}
          size={11}
          color={isFree ? "#047857" : "#B45309"}
          style={{ marginEnd: 3 }}
        />
        <Text style={[styles.badgeText, isFree ? styles.badgeTextFree : styles.badgeTextPaid]}>
          {isFree ? "ফ্রি / Free" : "অতিরিক্ত চার্জ"}
        </Text>
      </View>
    </View>
  );
};

export function inferAmenityIcon(name: string): any {
  const lower = name.toLowerCase();
  if (lower.includes("wifi") || lower.includes("wi-fi")) return "wifi";
  if (lower.includes("breakfast") || lower.includes("dining") || lower.includes("food") || lower.includes("নাস্তা"))
    return "restaurant";
  if (lower.includes("pool") || lower.includes("swimming") || lower.includes("পুকুর") || lower.includes("সুইমিং"))
    return "water";
  if (lower.includes("ac") || lower.includes("air") || lower.includes("কন্ডিশন")) return "snow";
  if (lower.includes("beach") || lower.includes("সৈকত")) return "sunny";
  if (lower.includes("shuttle") || lower.includes("airport") || lower.includes("ট্রান্সফার") || lower.includes("car"))
    return "car";
  if (lower.includes("bar") || lower.includes("wine") || lower.includes("মিনিবার")) return "wine";
  if (lower.includes("spa") || lower.includes("massage") || lower.includes("স্পা")) return "sparkles";
  if (lower.includes("jacuzzi") || lower.includes("জাকুজি") || lower.includes("bath") || lower.includes("বাথ"))
    return "water-outline";
  if (lower.includes("gym") || lower.includes("fitness")) return "barbell";
  if (lower.includes("balcony") || lower.includes("ব্যালকনি")) return "scan-outline";
  if (lower.includes("parking") || lower.includes("পার্কিং")) return "car-sport";
  return "checkmark-done-circle-outline";
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  roomDetailContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  leftInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginEnd: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 8,
  },
  iconCircleFree: {
    backgroundColor: "#ECFDF5",
  },
  iconCirclePaid: {
    backgroundColor: "#FEF3C7",
  },
  textColumn: {
    flex: 1,
  },
  nameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  noteText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeFree: {
    backgroundColor: "#D1FAE5",
    borderColor: "#A7F3D0",
  },
  badgePaid: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  badgeTextFree: {
    color: "#047857",
  },
  badgeTextPaid: {
    color: "#B45309",
  },
});
