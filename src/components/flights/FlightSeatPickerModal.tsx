/**
 * FlightSeatPickerModal.tsx
 *
 * Interactive Aircraft Cabin Seat Selection Modal for ShopnoJatra:
 * 1. Realistic Fuselage Structure:
 *    - Cockpit & Nosecone indicator
 *    - Forward / Aft Galleys & Lavatories
 *    - Emergency Exit Doors with Extra Legroom
 *    - Realistic Wing span indicators
 * 2. Multi-Cabin Tier Support:
 *    - Business Class (Rows 1-2, 2-2 Layout: A, C - D, F)
 *    - Economy Class (Rows 4-18, 3-3 Layout: A, B, C - Aisle - D, E, F)
 * 3. Seat Categories & Surcharges:
 *    - Standard Window / Aisle / Middle
 *    - Extra Legroom / Exit Row (+৳500 / +$5)
 *    - Real-time Addon Fee tallying
 * 4. Multi-sensory UX:
 *    - Haptic feedback on selection
 *    - Mobile Zoom & Pan (0.8x to 1.6x)
 *    - Passenger constraint enforcement
 *    - Quick Auto-Assign capability
 */

import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const ACCENT_GOLD = "#D97706";
const ACCENT_GREEN = "#10B981";

export interface FlightSeatPickerModalProps {
  visible: boolean;
  flightNumber: string;
  airlineName: string;
  aircraftType?: string;
  origin: string;
  destination: string;
  cabinClass: string;
  passengersCount: number;
  baseFare: number;
  currency?: string;
  onClose: () => void;
  onConfirmSeats: (selectedSeats: string[], seatAddonFee: number) => void;
}

type SeatType = "window" | "aisle" | "middle" | "business" | "extra_legroom";
type SeatStatus = "available" | "selected" | "booked" | "extra_legroom";

interface AirplaneSeat {
  id: string; // e.g. "12A"
  row: number;
  col: "A" | "B" | "C" | "D" | "E" | "F";
  label: string;
  type: SeatType;
  status: SeatStatus;
  fee: number; // e.g. 0 or 500
  isExitRow?: boolean;
}

export const FlightSeatPickerModal: React.FC<FlightSeatPickerModalProps> = ({
  visible,
  flightNumber,
  airlineName,
  aircraftType = "Boeing 737-800",
  origin,
  destination,
  cabinClass,
  passengersCount,
  baseFare,
  currency = "BDT",
  onClose,
  onConfirmSeats,
}) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const currencySymbol = currency.toUpperCase() === "BDT" ? "৳" : "$";
  const extraLegroomFee = currency.toUpperCase() === "BDT" ? 500 : 5;

  // Generate deterministic seat grid for the aircraft
  const { businessSeats, economySeats } = useMemo(() => {
    const biz: AirplaneSeat[] = [];
    const eco: AirplaneSeat[] = [];

    // Business Class: Rows 1 to 2 (2-2 configuration: A, C | D, F)
    for (let r = 1; r <= 2; r++) {
      const cols: ("A" | "C" | "D" | "F")[] = ["A", "C", "D", "F"];
      cols.forEach((col) => {
        const id = `${r}${col}`;
        const hash = (r * 7 + col.charCodeAt(0) + 11) % 10;
        const isBooked = hash < 3;
        let status: SeatStatus = isBooked ? "booked" : "available";
        if (selectedSeats.includes(id)) {
          status = "selected";
        }

        biz.push({
          id,
          row: r,
          col: col as any,
          label: id,
          type: "business",
          status,
          fee: 0,
        });
      });
    }

    // Economy Class: Rows 4 to 18 (3-3 configuration: A, B, C | D, E, F)
    // Row 10 & 11 are Overwing Emergency Exit rows with Extra Legroom
    for (let r = 4; r <= 18; r++) {
      const isExit = r === 10 || r === 11;
      const cols: ("A" | "B" | "C" | "D" | "E" | "F")[] = ["A", "B", "C", "D", "E", "F"];

      cols.forEach((col) => {
        const id = `${r}${col}`;
        const hash = (r * 13 + col.charCodeAt(0) * 3) % 10;
        const isBooked = hash < 4;

        let status: SeatStatus = isBooked ? "booked" : "available";
        if (selectedSeats.includes(id)) {
          status = "selected";
        } else if (isExit && !isBooked) {
          status = "extra_legroom";
        }

        const seatType: SeatType = isExit
          ? "extra_legroom"
          : col === "A" || col === "F"
          ? "window"
          : col === "C" || col === "D"
          ? "aisle"
          : "middle";

        eco.push({
          id,
          row: r,
          col,
          label: id,
          type: seatType,
          status,
          fee: isExit ? extraLegroomFee : 0,
          isExitRow: isExit,
        });
      });
    }

    return { businessSeats: biz, economySeats: eco };
  }, [selectedSeats, extraLegroomFee]);

  // Calculate total fee of all selected seats
  const selectedSeatDetails = useMemo(() => {
    const all = [...businessSeats, ...economySeats];
    return selectedSeats.map((id) => all.find((s) => s.id === id)).filter(Boolean) as AirplaneSeat[];
  }, [businessSeats, economySeats, selectedSeats]);

  const totalAddonFee = useMemo(() => {
    return selectedSeatDetails.reduce((sum, seat) => sum + seat.fee, 0);
  }, [selectedSeatDetails]);

  // Tap handler
  const handleSeatPress = (seat: AirplaneSeat) => {
    if (seat.status === "booked") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (selectedSeats.includes(seat.id)) {
      // Deselect
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedSeats((prev) => prev.filter((id) => id !== seat.id));
    } else {
      // Select
      if (selectedSeats.length >= passengersCount) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedSeats((prev) => [...prev, seat.id]);
    }
  };

  // Auto-assign seats
  const handleAutoAssign = () => {
    Haptics.selectionAsync();
    const availableEco = economySeats.filter(
      (s) => s.status !== "booked" && s.type !== "extra_legroom"
    );
    const assigned: string[] = [];
    for (const s of availableEco) {
      if (assigned.length < passengersCount) {
        assigned.push(s.id);
      }
    }
    setSelectedSeats(assigned);
  };

  const handleZoom = (type: "in" | "out" | "reset") => {
    Haptics.selectionAsync();
    if (type === "in") {
      setZoomLevel((prev) => Math.min(1.5, +(prev + 0.2).toFixed(2)));
    } else if (type === "out") {
      setZoomLevel((prev) => Math.max(0.8, +(prev - 0.2).toFixed(2)));
    } else {
      setZoomLevel(1.0);
    }
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirmSeats(selectedSeats, totalAddonFee);
  };

  // Render individual seat item
  const renderSeatItem = (seat: AirplaneSeat) => {
    const isSelected = selectedSeats.includes(seat.id);
    const isBooked = seat.status === "booked";
    const isExtra = seat.type === "extra_legroom";
    const isBiz = seat.type === "business";

    let bgStyle = styles.seatAvailable;
    let iconColor = TRIP_BLUE;
    let textColor = "#1E293B";

    if (isBooked) {
      bgStyle = styles.seatBooked;
      iconColor = "#94A3B8";
      textColor = "#94A3B8";
    } else if (isSelected) {
      bgStyle = styles.seatSelected;
      iconColor = "#FFFFFF";
      textColor = "#FFFFFF";
    } else if (isExtra) {
      bgStyle = styles.seatExtraLegroom;
      iconColor = ACCENT_GOLD;
      textColor = ACCENT_GOLD;
    } else if (isBiz) {
      bgStyle = styles.seatBusiness;
      iconColor = "#6366F1";
      textColor = "#4F46E5";
    }

    return (
      <TouchableOpacity
        key={seat.id}
        onPress={() => handleSeatPress(seat)}
        activeOpacity={isBooked ? 1 : 0.75}
        disabled={isBooked}
        style={[
          styles.seatBox,
          bgStyle,
          isBiz && styles.seatBoxBiz,
        ]}
      >
        <Ionicons
          name={
            isBooked
              ? "close-circle"
              : isSelected
              ? "checkmark-circle"
              : isBiz
              ? "star"
              : isExtra
              ? "flash"
              : "airplane"
          }
          size={isBiz ? 16 : 13}
          color={iconColor}
        />
        <Text style={[styles.seatLabelText, { color: textColor }]}>{seat.id}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="airplane" size={16} color={TRIP_BLUE} />
              <Text style={styles.headerFlightTitle}>
                {airlineName} • {flightNumber}
              </Text>
            </View>
            <Text style={styles.headerRouteSubtitle}>
              {origin} → {destination} • {aircraftType}
            </Text>
          </View>

          {/* Zoom controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity onPress={() => handleZoom("out")} style={styles.zoomBtn}>
              <Ionicons name="remove" size={16} color="#334155" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleZoom("reset")} style={styles.zoomBtnTextOnly}>
              <Text style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleZoom("in")} style={styles.zoomBtn}>
              <Ionicons name="add" size={16} color="#334155" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Passenger Quota Pill */}
        <View style={styles.passengerQuotaBanner}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="people-circle" size={20} color={TRIP_BLUE} />
            <Text style={styles.quotaText}>
              আসন নির্বাচন:{" "}
              <Text style={{ fontWeight: "800", color: TRIP_BLUE }}>
                {selectedSeats.length} / {passengersCount}
              </Text>{" "}
              জন যাত্রী
            </Text>
          </View>
          <TouchableOpacity onPress={handleAutoAssign} style={styles.autoAssignBtn}>
            <Ionicons name="sparkles" size={13} color="#2563EB" />
            <Text style={styles.autoAssignBtnText}>অটো অ্যাসাইন</Text>
          </TouchableOpacity>
        </View>

        {/* Status Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }]} />
            <Text style={styles.legendLabel}>খালি</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: TRIP_BLUE, borderColor: TRIP_BLUE }]} />
            <Text style={styles.legendLabel}>নির্বাচিত</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#E2E8F0", borderColor: "#94A3B8" }]} />
            <Text style={styles.legendLabel}>বুকড</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FEF3C7", borderColor: ACCENT_GOLD }]} />
            <Text style={styles.legendLabel}>লেগরুম (+{currencySymbol}{extraLegroomFee})</Text>
          </View>
        </View>

        {/* Fuselage Cabin Scroll Area */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.fuselageShell, { transform: [{ scale: zoomLevel }] }]}>
            {/* Airplane Nosecone & Cockpit */}
            <View style={styles.nosecone}>
              <View style={styles.cockpitArea}>
                <Ionicons name="compass" size={20} color="#64748B" />
                <Text style={styles.cockpitText}>ককপিট (Cockpit)</Text>
              </View>
              <View style={styles.fuselageFrontDoors}>
                <View style={styles.exitIndicator}>
                  <Ionicons name="exit-outline" size={14} color={ACCENT_GREEN} />
                  <Text style={styles.exitText}>ডোর ১L</Text>
                </View>
                <View style={styles.frontGalley}>
                  <Ionicons name="cafe-outline" size={14} color="#64748B" />
                  <Text style={styles.galleyText}>গ্যালি</Text>
                </View>
                <View style={styles.exitIndicator}>
                  <Ionicons name="exit-outline" size={14} color={ACCENT_GREEN} />
                  <Text style={styles.exitText}>ডোর ১R</Text>
                </View>
              </View>
            </View>

            {/* Business Class Section */}
            <View style={styles.cabinDividerSection}>
              <View style={styles.dividerLine} />
              <View style={styles.cabinBadge}>
                <Ionicons name="diamond-outline" size={14} color="#4F46E5" />
                <Text style={styles.cabinBadgeText}>প্রিমিয়াম বিজনেস ক্লাস (2-2)</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            {/* Business Class Rows */}
            {[1, 2].map((rowNum) => {
              const rowSeats = businessSeats.filter((s) => s.row === rowNum);
              const leftSeats = rowSeats.filter((s) => s.col === "A" || s.col === "C");
              const rightSeats = rowSeats.filter((s) => s.col === "D" || s.col === "F");

              return (
                <View key={`biz-row-${rowNum}`} style={styles.rowWrapper}>
                  {/* Left pair (A, C) */}
                  <View style={styles.seatGroupBiz}>
                    {leftSeats.map((s) => renderSeatItem(s))}
                  </View>

                  {/* Aisle */}
                  <View style={styles.aisleBiz}>
                    <Text style={styles.rowNumberText}>{rowNum}</Text>
                  </View>

                  {/* Right pair (D, F) */}
                  <View style={styles.seatGroupBiz}>
                    {rightSeats.map((s) => renderSeatItem(s))}
                  </View>
                </View>
              );
            })}

            {/* Economy Class Section Divider */}
            <View style={styles.cabinDividerSection}>
              <View style={styles.dividerLine} />
              <View style={styles.cabinBadge}>
                <Ionicons name="people-outline" size={14} color="#0284C7" />
                <Text style={styles.cabinBadgeText}>ইকোনমি ক্লাস (3-3)</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            {/* Economy Column Headers */}
            <View style={styles.columnHeaderRow}>
              <View style={styles.columnHeaderGroup}>
                <Text style={styles.columnHeaderText}>A (উইন্ডো)</Text>
                <Text style={styles.columnHeaderText}>B</Text>
                <Text style={styles.columnHeaderText}>C (আইল)</Text>
              </View>
              <View style={styles.aisleEcoHeader}>
                <Text style={styles.aisleText}>আইল</Text>
              </View>
              <View style={styles.columnHeaderGroup}>
                <Text style={styles.columnHeaderText}>D (আইল)</Text>
                <Text style={styles.columnHeaderText}>E</Text>
                <Text style={styles.columnHeaderText}>F (উইন্ডো)</Text>
              </View>
            </View>

            {/* Economy Rows (4 to 18) */}
            {Array.from({ length: 15 }, (_, i) => i + 4).map((rowNum) => {
              const rowSeats = economySeats.filter((s) => s.row === rowNum);
              const leftSeats = rowSeats.filter(
                (s) => s.col === "A" || s.col === "B" || s.col === "C"
              );
              const rightSeats = rowSeats.filter(
                (s) => s.col === "D" || s.col === "E" || s.col === "F"
              );
              const isExitRow = rowNum === 10 || rowNum === 11;
              const hasWings = rowNum >= 8 && rowNum <= 14;

              return (
                <View key={`eco-row-${rowNum}`} style={styles.rowOuterWrapper}>
                  {/* Left Wing Indicator */}
                  {hasWings && (
                    <View style={styles.leftWingSpan}>
                      {rowNum === 11 && <Text style={styles.wingSpanText}>উইং</Text>}
                    </View>
                  )}

                  <View
                    style={[
                      styles.rowWrapper,
                      isExitRow && styles.exitRowHighlight,
                    ]}
                  >
                    {/* Overwing Exit Door Left */}
                    {isExitRow && (
                      <View style={styles.exitRowDoorIndicator}>
                        <Ionicons name="exit" size={12} color={ACCENT_GREEN} />
                      </View>
                    )}

                    {/* Left 3 seats (A, B, C) */}
                    <View style={styles.seatGroupEco}>
                      {leftSeats.map((s) => renderSeatItem(s))}
                    </View>

                    {/* Aisle */}
                    <View style={styles.aisleEco}>
                      <Text style={styles.rowNumberText}>{rowNum}</Text>
                    </View>

                    {/* Right 3 seats (D, E, F) */}
                    <View style={styles.seatGroupEco}>
                      {rightSeats.map((s) => renderSeatItem(s))}
                    </View>

                    {/* Overwing Exit Door Right */}
                    {isExitRow && (
                      <View style={styles.exitRowDoorIndicator}>
                        <Ionicons name="exit" size={12} color={ACCENT_GREEN} />
                      </View>
                    )}
                  </View>

                  {/* Right Wing Indicator */}
                  {hasWings && (
                    <View style={styles.rightWingSpan}>
                      {rowNum === 11 && <Text style={styles.wingSpanText}>উইং</Text>}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Rear Airplane Tail & Lavatories */}
            <View style={styles.rearAirplaneSection}>
              <View style={styles.rearAmenityRow}>
                <View style={styles.amenityBox}>
                  <Ionicons name="water-outline" size={16} color="#64748B" />
                  <Text style={styles.amenityText}>ওয়াশরুম</Text>
                </View>
                <View style={styles.rearTailCone}>
                  <Ionicons name="airplane" size={24} color="#CBD5E1" />
                </View>
                <View style={styles.amenityBox}>
                  <Ionicons name="restaurant-outline" size={16} color="#64748B" />
                  <Text style={styles.amenityText}>রিয়ার গ্যালি</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Booking Summary & Confirm Bar */}
        <View style={styles.footerBar}>
          <View style={styles.footerSummary}>
            <View>
              <Text style={styles.selectedCountText}>
                নির্বাচিত আসন ({selectedSeats.length}/{passengersCount}):
              </Text>
              <View style={styles.selectedChipsContainer}>
                {selectedSeats.length > 0 ? (
                  selectedSeats.map((id) => (
                    <View key={id} style={styles.selectedSeatChip}>
                      <Text style={styles.selectedSeatChipText}>{id}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noSeatsPrompt}>অনুগ্রহ করে আসন বাছাই করুন</Text>
                )}
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.totalPriceLabel}>
                {totalAddonFee > 0 ? `সিট ফি: +${currencySymbol}${totalAddonFee}` : "সিট ফি: ফ্রি"}
              </Text>
              <Text style={styles.totalPriceValue}>
                {currencySymbol}
                {baseFare + totalAddonFee}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selectedSeats.length === 0}
            style={[
              styles.confirmButton,
              selectedSeats.length === 0 && styles.confirmButtonDisabled,
            ]}
          >
            <Text style={styles.confirmButtonText}>
              {selectedSeats.length === passengersCount
                ? "আসন নিশ্চিত করে এগিয়ে যান"
                : `${passengersCount - selectedSeats.length}টি আসন বাকি আছে`}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerFlightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerRouteSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomBtn: {
    padding: 6,
  },
  zoomBtnTextOnly: {
    paddingHorizontal: 6,
  },
  zoomLevelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  passengerQuotaBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  quotaText: {
    fontSize: 13,
    color: "#1E3A8A",
  },
  autoAssignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  autoAssignBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    alignItems: "center",
  },
  fuselageShell: {
    width: Math.min(SCREEN_WIDTH - 24, 380),
    backgroundColor: "#FFFFFF",
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(0,0,0,0.08)" } : {}),
  },
  nosecone: {
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  cockpitArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },
  cockpitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  fuselageFrontDoors: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  exitIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exitText: {
    fontSize: 9,
    fontWeight: "700",
    color: ACCENT_GREEN,
  },
  frontGalley: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  galleyText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  cabinDividerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  cabinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cabinBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  columnHeaderGroup: {
    flexDirection: "row",
    width: 126,
    justifyContent: "space-around",
  },
  columnHeaderText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
  },
  aisleEcoHeader: {
    width: 36,
    alignItems: "center",
  },
  aisleText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },
  rowOuterWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  rowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  exitRowHighlight: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
  },
  exitRowDoorIndicator: {
    paddingHorizontal: 2,
  },
  leftWingSpan: {
    position: "absolute",
    left: -20,
    width: 18,
    height: 32,
    backgroundColor: "#CBD5E1",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  rightWingSpan: {
    position: "absolute",
    right: -20,
    width: 18,
    height: 32,
    backgroundColor: "#CBD5E1",
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  wingSpanText: {
    fontSize: 7,
    fontWeight: "800",
    color: "#64748B",
  },
  seatGroupBiz: {
    flexDirection: "row",
    gap: 8,
    width: 104,
    justifyContent: "center",
  },
  seatGroupEco: {
    flexDirection: "row",
    gap: 4,
    width: 126,
    justifyContent: "center",
  },
  aisleBiz: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  aisleEco: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rowNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  seatBox: {
    width: 36,
    height: 42,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  seatBoxBiz: {
    width: 46,
    height: 48,
    borderRadius: 8,
  },
  seatAvailable: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
  },
  seatSelected: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  seatBooked: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  seatExtraLegroom: {
    backgroundColor: "#FEF3C7",
    borderColor: ACCENT_GOLD,
  },
  seatBusiness: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  seatLabelText: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  rearAirplaneSection: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  rearAmenityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  amenityBox: {
    alignItems: "center",
    gap: 2,
  },
  amenityText: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
  },
  rearTailCone: {
    alignItems: "center",
  },
  footerBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  footerSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  selectedCountText: {
    fontSize: 12,
    color: "#64748B",
  },
  selectedChipsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  selectedSeatChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  selectedSeatChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  noSeatsPrompt: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#94A3B8",
    marginTop: 2,
  },
  totalPriceLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 13,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
