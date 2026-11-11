import React, { useState, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { toBengaliNumber } from "./HotelGalleryModal";

interface HotelDateRangeCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  checkInDate: Date;
  checkOutDate: Date;
  onApplyDates: (checkIn: Date, checkOut: Date) => void;
  basePrice?: number;
}

const WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const MONTH_NAMES_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

export const HotelDateRangeCalendarModal: React.FC<HotelDateRangeCalendarModalProps> = ({
  visible,
  onClose,
  checkInDate,
  checkOutDate,
  onApplyDates,
  basePrice = 8500,
}) => {
  // Local temporary dates while inside modal
  const [selectedStart, setSelectedStart] = useState<Date>(checkInDate);
  const [selectedEnd, setSelectedEnd] = useState<Date>(checkOutDate);

  // Month navigation (starts on checkInDate's month)
  const [currentYear, setCurrentYear] = useState<number>(() => checkInDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => checkInDate.getMonth());

  // Generate calendar days for the current displayed month
  const { days, cheapestRate } = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    const list: {
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      dailyPrice: number;
      isCheapest?: boolean;
    }[] = [];

    // Prior month padding
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(currentYear, currentMonth, 1 - (startDayOfWeek - i));
      list.push({
        date: prevDate,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        dailyPrice: getDayRate(prevDate, basePrice),
      });
    }

    // Days in current month
    let minRate = Infinity;
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const price = getDayRate(d, basePrice);
      if (price < minRate) minRate = price;
      list.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        dailyPrice: price,
      });
    }

    // Mark the cheapest day
    list.forEach((item) => {
      if (item.isCurrentMonth && item.dailyPrice === minRate) {
        item.isCheapest = true;
      }
    });

    return { days: list, cheapestRate: minRate };
  }, [currentYear, currentMonth, basePrice]);

  const handleDayPress = useCallback((targetDate: Date) => {
    Haptics.selectionAsync();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clicked = new Date(targetDate);
    clicked.setHours(0, 0, 0, 0);

    if (clicked < today) return; // Cannot select past dates

    // If no start date or both already selected, start a new selection
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(clicked);
      setSelectedEnd(undefined as any);
      return;
    }

    // If start date exists but no end date
    if (selectedStart && !selectedEnd) {
      if (clicked.getTime() > selectedStart.getTime()) {
        setSelectedEnd(clicked);
      } else {
        // Clicked before start: update start date
        setSelectedStart(clicked);
        setSelectedEnd(undefined as any);
      }
    }
  }, [selectedStart, selectedEnd]);

  // Quick preset shortcuts
  const selectQuickRange = useCallback((nights: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const start = selectedStart || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + nights);
    setSelectedStart(start);
    setSelectedEnd(end);
  }, [selectedStart]);

  const selectWeekend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    setSelectedStart(friday);
    setSelectedEnd(sunday);
  }, []);

  const nightsCount = useMemo(() => {
    if (!selectedStart || !selectedEnd) return 1;
    const diff = selectedEnd.getTime() - selectedStart.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [selectedStart, selectedEnd]);

  const totalEstimate = useMemo(() => {
    return nightsCount * basePrice;
  }, [nightsCount, basePrice]);

  const handleNextMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalStart = selectedStart || new Date();
    let finalEnd = selectedEnd;
    if (!finalEnd || finalEnd <= finalStart) {
      finalEnd = new Date(finalStart);
      finalEnd.setDate(finalEnd.getDate() + 1);
    }
    onApplyDates(finalStart, finalEnd);
    onClose();
  }, [selectedStart, selectedEnd, onApplyDates, onClose]);

  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>চেক-ইন ও চেক-আউট রেঞ্জ</Text>
              <Text style={styles.modalSubTitle}>
                প্রতিদিনের রেট দেখে সবচেয়ে সাশ্রয়ী দিন নির্বাচন করুন
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Quick Shortcuts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
            <Pressable style={styles.presetChip} onPress={selectWeekend}>
              <Ionicons name="sunny-outline" size={12} color="#0055F2" style={{ marginEnd: 4 }} />
              <Text style={styles.presetChipText}>এই সপ্তাহান্ত (শুক্র-রবি)</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => selectQuickRange(2)}>
              <Text style={styles.presetChipText}>২ রাত</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => selectQuickRange(3)}>
              <Text style={styles.presetChipText}>৩ রাত</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => selectQuickRange(5)}>
              <Text style={styles.presetChipText}>৫ রাত</Text>
            </Pressable>
            <Pressable style={styles.presetChip} onPress={() => selectQuickRange(7)}>
              <Text style={styles.presetChipText}>১ সপ্তাহ (৭ রাত)</Text>
            </Pressable>
          </ScrollView>

          {/* Month Navigation Row */}
          <View style={styles.monthNavRow}>
            <Pressable style={styles.monthNavBtn} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color="#1E293B" />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES_BN[currentMonth]} {toBengaliNumber(currentYear)}
            </Text>
            <Pressable style={styles.monthNavBtn} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#1E293B" />
            </Pressable>
          </View>

          {/* Weekday Names */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((wd, i) => (
              <Text key={`wd-${i}`} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.daysGrid}>
            {days.map((item, idx) => {
              const itemDate = new Date(item.date);
              itemDate.setHours(0, 0, 0, 0);

              const isPast = itemDate < todayZero;
              const isStart =
                selectedStart && itemDate.getTime() === selectedStart.getTime();
              const isEnd =
                selectedEnd && itemDate.getTime() === selectedEnd.getTime();
              const isInRange =
                selectedStart &&
                selectedEnd &&
                itemDate.getTime() > selectedStart.getTime() &&
                itemDate.getTime() < selectedEnd.getTime();

              return (
                <Pressable
                  key={`day-${idx}`}
                  style={[
                    styles.dayCell,
                    isInRange && styles.dayCellInRange,
                    isStart && styles.dayCellStart,
                    isEnd && styles.dayCellEnd,
                    !item.isCurrentMonth && styles.dayCellOtherMonth,
                    isPast && styles.dayCellDisabled,
                  ]}
                  onPress={() => !isPast && handleDayPress(item.date)}
                  disabled={isPast || !item.isCurrentMonth}
                >
                  {/* Day Number */}
                  <Text
                    style={[
                      styles.dayNumberText,
                      (isStart || isEnd) && styles.dayNumberTextActive,
                      isInRange && styles.dayNumberTextRange,
                      isPast && styles.dayNumberTextDisabled,
                    ]}
                  >
                    {toBengaliNumber(item.dayNumber)}
                  </Text>

                  {/* Daily Rate */}
                  {item.isCurrentMonth && !isPast && (
                    <Text
                      style={[
                        styles.dayPriceText,
                        (isStart || isEnd) && styles.dayPriceTextActive,
                        item.isCheapest && styles.dayPriceTextCheapest,
                      ]}
                      numberOfLines={1}
                    >
                      ৳{(item.dailyPrice / 1000).toFixed(1)}k
                    </Text>
                  )}

                  {/* Cheapest Day Badge */}
                  {item.isCheapest && !isPast && item.isCurrentMonth && (
                    <View style={styles.cheapestBadge}>
                      <Text style={styles.cheapestBadgeText}>সস্তা</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Footer Selection Summary & Action Button */}
          <SafeAreaView style={styles.footerContainer}>
            <View style={styles.summaryBar}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>চেক-ইন</Text>
                <Text style={styles.summaryDate}>
                  {selectedStart
                    ? `${selectedStart.getDate()} ${MONTH_NAMES_BN[selectedStart.getMonth()]}`
                    : "তারিখ দিন"}
                </Text>
              </View>

              <View style={styles.nightsBadge}>
                <Ionicons name="moon" size={12} color="#0055F2" />
                <Text style={styles.nightsBadgeText}>
                  {toBengaliNumber(nightsCount)} রাত
                </Text>
              </View>

              <View style={styles.summaryColRight}>
                <Text style={styles.summaryLabel}>চেক-আউট</Text>
                <Text style={styles.summaryDate}>
                  {selectedEnd
                    ? `${selectedEnd.getDate()} ${MONTH_NAMES_BN[selectedEnd.getMonth()]}`
                    : "তারিখ দিন"}
                </Text>
              </View>
            </View>

            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>
                তারিখ নিশ্চিত করুন ({toBengaliNumber(nightsCount)} রাত • আনুমানিক ৳{totalEstimate.toLocaleString()})
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

// Generates dynamic variation in rates (weekends higher, midweek cheaper)
function getDayRate(date: Date, base: number): number {
  const day = date.getDay();
  // Friday & Saturday in Bangladesh are weekends
  if (day === 5 || day === 6) {
    return Math.round(base * 1.25);
  }
  // Tuesday / Wednesday are typically the cheapest off-peak
  if (day === 2 || day === 3) {
    return Math.round(base * 0.88);
  }
  return base;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  presetsRow: {
    marginVertical: 8,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginEnd: 6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0055F2",
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
    paddingHorizontal: 6,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    width: 42,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    borderRadius: 10,
  },
  dayCellStart: {
    backgroundColor: "#0055F2",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  dayCellEnd: {
    backgroundColor: "#0055F2",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  dayCellInRange: {
    backgroundColor: "#DBEAFE",
    borderRadius: 0,
  },
  dayCellOtherMonth: {
    opacity: 0.25,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  dayNumberTextActive: {
    color: "#FFFFFF",
  },
  dayNumberTextRange: {
    color: "#1D4ED8",
  },
  dayNumberTextDisabled: {
    color: "#94A3B8",
  },
  dayPriceText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  dayPriceTextActive: {
    color: "#BAE6FD",
  },
  dayPriceTextCheapest: {
    color: "#059669",
    fontWeight: "900",
  },
  cheapestBadge: {
    position: "absolute",
    top: 2,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cheapestBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#047857",
  },
  footerContainer: {
    marginTop: 14,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  summaryCol: {
    flex: 1,
  },
  summaryColRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryDate: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  nightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nightsBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
    marginStart: 4,
  },
  confirmBtn: {
    backgroundColor: "#0055F2",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
