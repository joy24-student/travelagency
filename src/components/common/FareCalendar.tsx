/**
 * FareCalendar Component - Shopno Jatra (স্বপ্নযাত্রা)
 * 
 * Features:
 * 1. Month Grid calendar displaying lowest fare per day.
 * 2. Cheapest day of the month highlighted prominently.
 * 3. Tap to select a travel date.
 * 4. Bilingual: English and Bengali month names.
 * 5. Bangla digits option (১, ২, ৩, ৳৪,৫০০ vs 1, 2, 3, ৳4,500).
 * 6. Predictive AI price trend hint badge (BUY_NOW, WAIT, STABLE).
 * 7. Quick access button to create price drop alerts.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  priceAlertService,
  FareCalendarData,
  FareCalendarDay,
  ServiceType,
} from "../../services/priceAlertService";

interface FareCalendarProps {
  origin: string;
  destination: string;
  serviceType?: ServiceType;
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string, priceBDT: number | null) => void;
  onOpenAlertModal?: () => void;
  defaultUseBanglaDigits?: boolean;
}

const MONTH_NAMES_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FareCalendar: React.FC<FareCalendarProps> = ({
  origin,
  destination,
  serviceType = "flight",
  selectedDate,
  onSelectDate,
  onOpenAlertModal,
  defaultUseBanglaDigits = true,
}) => {
  // Current visible month (default to selected date or current month)
  const initialDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDateObj.getMonth() + 1); // 1-12
  const [useBanglaDigits, setUseBanglaDigits] = useState<boolean>(defaultUseBanglaDigits);
  const [calendarData, setCalendarData] = useState<FareCalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const monthParam = useMemo(() => {
    return `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  }, [currentYear, currentMonth]);

  // Load calendar data when route or month changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const data = await priceAlertService.fetchFareCalendar(
        origin,
        destination,
        monthParam,
        serviceType
      );
      if (isMounted) {
        setCalendarData(data);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [origin, destination, monthParam, serviceType]);

  const handlePrevMonth = useCallback(() => {
    Haptics.selectionAsync();
    const today = new Date();
    // Prevent going before current month
    if (currentYear === today.getFullYear() && currentMonth <= today.getMonth() + 1) {
      return;
    }
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentYear, currentMonth]);

  const handleNextMonth = useCallback(() => {
    Haptics.selectionAsync();
    // Allow up to 12 months ahead
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  // Generate 7-column calendar cells with empty offsets
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
    const days: (FareCalendarDay | null)[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    if (calendarData && calendarData.days) {
      calendarData.days.forEach((dayItem) => {
        days.push(dayItem);
      });
    }

    return days;
  }, [currentYear, currentMonth, calendarData]);

  const todayStr = useMemo(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const monthTitleBn = MONTH_NAMES_BN[currentMonth - 1];
  const monthTitleEn = MONTH_NAMES_EN[currentMonth - 1];
  const yearStr = priceAlertService.formatDigits(currentYear, useBanglaDigits);

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navButton}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={20} color="#0055F2" />
        </TouchableOpacity>

        <View style={styles.monthTitleWrapper}>
          <Text style={styles.monthTitleBn}>
            {monthTitleBn} {yearStr}
          </Text>
          <Text style={styles.monthTitleEn}>
            {monthTitleEn} {currentYear}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navButton}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={20} color="#0055F2" />
        </TouchableOpacity>
      </View>

      {/* Subheader: Digit toggle & Trend Hint */}
      <View style={styles.subHeader}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setUseBanglaDigits((prev) => !prev);
          }}
          style={styles.digitToggleBtn}
        >
          <Ionicons name="language" size={14} color="#475569" />
          <Text style={styles.digitToggleText}>
            {useBanglaDigits ? "বাংলা সংখ্যা (অন)" : "English Digits"}
          </Text>
        </TouchableOpacity>

        {calendarData?.trendHint && (
          <View
            style={[
              styles.trendBadge,
              calendarData.trendHint.verdict === "BUY_NOW"
                ? styles.trendBadgeSurge
                : calendarData.trendHint.verdict === "WAIT"
                ? styles.trendBadgeDrop
                : styles.trendBadgeStable,
            ]}
          >
            <Ionicons
              name={
                calendarData.trendHint.verdict === "BUY_NOW"
                  ? "trending-up"
                  : calendarData.trendHint.verdict === "WAIT"
                  ? "trending-down"
                  : "remove-outline"
              }
              size={13}
              color={
                calendarData.trendHint.verdict === "BUY_NOW"
                  ? "#DC2626"
                  : calendarData.trendHint.verdict === "WAIT"
                  ? "#0D9488"
                  : "#475569"
              }
            />
            <Text
              style={[
                styles.trendBadgeText,
                calendarData.trendHint.verdict === "BUY_NOW"
                  ? styles.trendTextSurge
                  : calendarData.trendHint.verdict === "WAIT"
                  ? styles.trendTextDrop
                  : styles.trendTextStable,
              ]}
            >
              {calendarData.trendHint.verdict === "BUY_NOW"
                ? "দাম বাড়তে পারে"
                : calendarData.trendHint.verdict === "WAIT"
                ? "দাম কমতে পারে"
                : "ভাড়া স্থিতিশীল"}
            </Text>
          </View>
        )}
      </View>

      {/* Weekday Column Headers */}
      <View style={styles.weekdaysRow}>
        {(useBanglaDigits ? WEEKDAYS_BN : WEEKDAYS_EN).map((dayName, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                (idx === 4 || idx === 5) && styles.weekendText, // Thu/Fri in BD
              ]}
            >
              {dayName}
            </Text>
          </View>
        ))}
      </View>

      {/* Loading state or Calendar Month Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0055F2" />
          <Text style={styles.loadingText}>ভাড়ার তালিকা লোড হচ্ছে...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {calendarGrid.map((dayItem, index) => {
            if (!dayItem) {
              return <View key={`empty-${index}`} style={styles.emptyCell} />;
            }

            const isPast = dayItem.date < todayStr;
            const isSelected = selectedDate === dayItem.date;
            const isCheapest = dayItem.isCheapest && !isPast;
            const dayNumStr = priceAlertService.formatDigits(dayItem.day, useBanglaDigits);
            const priceStr = dayItem.lowestPriceBDT
              ? `৳${priceAlertService.formatDigits(dayItem.lowestPriceBDT, useBanglaDigits)}`
              : "--";

            return (
              <TouchableOpacity
                key={dayItem.date}
                disabled={isPast}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectDate(dayItem.date, dayItem.lowestPriceBDT);
                }}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isCheapest && !isSelected && styles.dayCellCheapest,
                  isPast && styles.dayCellDisabled,
                ]}
              >
                {/* Cheapest day indicator badge */}
                {isCheapest && (
                  <View style={styles.cheapestPill}>
                    <Text style={styles.cheapestPillText}>
                      {useBanglaDigits ? "কম" : "Low"}
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && styles.dayNumTextSelected,
                    isCheapest && !isSelected && styles.dayNumTextCheapest,
                    isPast && styles.dayNumTextDisabled,
                  ]}
                >
                  {dayNumStr}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.dayPriceText,
                    isSelected && styles.dayPriceTextSelected,
                    isCheapest && !isSelected && styles.dayPriceTextCheapest,
                    isPast && styles.dayPriceTextDisabled,
                  ]}
                >
                  {priceStr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Footer Info: Cheapest Fare Highlight & Alert Creation Link */}
      <View style={styles.footerRow}>
        <View style={styles.legendWrapper}>
          <View style={styles.legendDotCheapest} />
          <Text style={styles.legendText}>
            {useBanglaDigits ? "সর্বনিম্ন ভাড়া চিহ্নিত" : "Cheapest Day Highlighted"}
          </Text>
        </View>

        {onOpenAlertModal && (
          <TouchableOpacity onPress={onOpenAlertModal} style={styles.alertActionBtn}>
            <Ionicons name="notifications-outline" size={14} color="#0055F2" />
            <Text style={styles.alertActionText}>দাম কমলে জানান</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleWrapper: {
    alignItems: "center",
  },
  monthTitleBn: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  monthTitleEn: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  digitToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  digitToggleText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendBadgeSurge: {
    backgroundColor: "#FEE2E2",
  },
  trendBadgeDrop: {
    backgroundColor: "#CCFBF1",
  },
  trendBadgeStable: {
    backgroundColor: "#F1F5F9",
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  trendTextSurge: {
    color: "#B91C1C",
  },
  trendTextDrop: {
    color: "#0F766E",
  },
  trendTextStable: {
    color: "#475569",
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  weekendText: {
    color: "#0284C7",
  },
  loadingContainer: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyCell: {
    width: "14.285%",
    height: 52,
  },
  dayCell: {
    width: "14.285%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    padding: 2,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: "#0055F2",
  },
  dayCellCheapest: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  cheapestPill: {
    position: "absolute",
    top: 1,
    right: 2,
    backgroundColor: "#10B981",
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  cheapestPillText: {
    fontSize: 8,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayNumText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  dayNumTextSelected: {
    color: "#FFFFFF",
  },
  dayNumTextCheapest: {
    color: "#047857",
  },
  dayNumTextDisabled: {
    color: "#94A3B8",
  },
  dayPriceText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "500",
  },
  dayPriceTextSelected: {
    color: "#EFF6FF",
    fontWeight: "700",
  },
  dayPriceTextCheapest: {
    color: "#059669",
    fontWeight: "700",
  },
  dayPriceTextDisabled: {
    color: "#CBD5E1",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDotCheapest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
  },
  alertActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertActionText: {
    fontSize: 12,
    color: "#0055F2",
    fontWeight: "600",
  },
});
