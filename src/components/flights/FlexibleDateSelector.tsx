import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FareCalendar } from "../common/FareCalendar";
import { ServiceType } from "../../services/priceAlertService";

interface FlexibleDateSelectorProps {
  currentDate: Date;
  basePrice: number;
  currency?: string;
  origin?: string;
  destination?: string;
  serviceType?: ServiceType;
  onSelectDate: (d: Date) => void;
}

interface DateFareItem {
  date: Date;
  dateStr: string;
  dayName: string;
  monthDay: string;
  price: number;
  isLowest: boolean;
  isSelected: boolean;
}

export const FlexibleDateSelector: React.FC<FlexibleDateSelectorProps> = ({
  currentDate,
  basePrice,
  currency = "USD",
  origin = "DAC",
  destination = "CXB",
  serviceType = "flight",
  onSelectDate,
}) => {
  const [isFlexible, setIsFlexible] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const curSymbol = currency.toUpperCase() === "BDT" ? "৳" : "$";

  // Generate ±3 days strip
  const dateStrip: DateFareItem[] = useMemo(() => {
    const list: DateFareItem[] = [];
    const baseMs = currentDate.getTime();
    let minPrice = Infinity;

    // Fixed seeded variations based on day offset for consistency
    const variations = [-0.12, 0.05, -0.05, 0.0, 0.15, -0.18, 0.08];

    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseMs + i * 86400000);
      const varPct = variations[i + 3];
      const calculatedPrice = Math.max(50, Math.round(basePrice * (1 + varPct)));
      if (calculatedPrice < minPrice) minPrice = calculatedPrice;

      const dayName = d.toLocaleDateString("bn-BD", { weekday: "short" });
      const monthDay = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      const dateStr = d.toISOString().slice(0, 10);

      list.push({
        date: d,
        dateStr,
        dayName,
        monthDay,
        price: calculatedPrice,
        isLowest: false,
        isSelected: i === 0,
      });
    }

    return list.map((item) => ({
      ...item,
      isLowest: item.price === minPrice,
    }));
  }, [currentDate, basePrice]);

  // Generate 30 days for Monthly Calendar Modal
  const monthlyDates = useMemo(() => {
    const days: DateFareItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let minPrice = Infinity;

    for (let i = 0; i < 30; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const hash = ((i * 37 + 13) % 25) - 10; // -10% to +15%
      const price = Math.max(50, Math.round(basePrice * (1 + hash / 100)));
      if (price < minPrice) minPrice = price;

      const dayName = d.toLocaleDateString("bn-BD", { weekday: "short" });
      const monthDay = d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
      const isSelected =
        d.getDate() === currentDate.getDate() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear();

      days.push({
        date: d,
        dateStr: d.toISOString().slice(0, 10),
        dayName,
        monthDay,
        price,
        isLowest: false,
        isSelected,
      });
    }

    return days.map((item) => ({
      ...item,
      isLowest: item.price === minPrice,
    }));
  }, [currentDate, basePrice]);

  return (
    <View style={styles.container}>
      {/* Top Toggle Row */}
      <View style={styles.toggleRow}>
        <View style={styles.labelCol}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="calendar" size={16} color="#0055F2" />
            <Text style={styles.title}>নমনীয় তারিখ (±৩ দিন)</Text>
          </View>
          <Text style={styles.subtitle}>
            আগের ও পরের ৩ দিনের সর্বনিম্ন ভাড়ার তুলনা করে সাশ্রয়ী দিন খুঁজুন
          </Text>
        </View>

        <Switch
          value={isFlexible}
          onValueChange={(val) => {
            Haptics.selectionAsync();
            setIsFlexible(val);
          }}
          trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
          thumbColor={isFlexible ? "#0055F2" : "#F8FAFC"}
        />
      </View>

      {/* Date Strip if Flexible is active */}
      {isFlexible && (
        <View style={styles.stripWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripScroll}
          >
            {dateStrip.map((item) => {
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[
                    styles.dateCard,
                    item.isSelected && styles.dateCardSelected,
                    item.isLowest && !item.isSelected && styles.dateCardLowest,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelectDate(item.date);
                  }}
                  activeOpacity={0.85}
                >
                  {item.isLowest && (
                    <View style={styles.lowestBadge}>
                      <Text style={styles.lowestBadgeText}>সেরা দাম</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.dayNameText,
                      item.isSelected && styles.textWhite,
                    ]}
                  >
                    {item.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.monthDayText,
                      item.isSelected && styles.textWhite,
                    ]}
                  >
                    {item.monthDay}
                  </Text>
                  <Text
                    style={[
                      styles.priceText,
                      item.isSelected
                        ? styles.textWhite
                        : item.isLowest
                        ? styles.textGreen
                        : styles.textSlate,
                    ]}
                  >
                    {curSymbol}{item.price.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Monthly Calendar Opener */}
          <TouchableOpacity
            style={styles.monthlyCalBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setShowMonthlyModal(true);
            }}
          >
            <Ionicons name="grid-outline" size={14} color="#0055F2" />
            <Text style={styles.monthlyCalBtnText}>দামের মাসিক ক্যালেন্ডার দেখুন</Text>
            <Ionicons name="chevron-forward" size={14} color="#0055F2" />
          </TouchableOpacity>
        </View>
      )}

      {/* Monthly Fare Calendar Modal */}
      <Modal
        visible={showMonthlyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMonthlyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>দামের মাসিক ক্যালেন্ডার</Text>
                <Text style={styles.modalSubtitle}>
                  আসন্ন ৩০ দিনের সর্বনিম্ন সম্ভাব্য ভাড়া (ট্যাপ করে তারিখ নির্বাচন করুন)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMonthlyModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FareCalendar
                origin={origin}
                destination={destination}
                serviceType={serviceType}
                selectedDate={currentDate.toISOString().slice(0, 10)}
                onSelectDate={(dateStr) => {
                  onSelectDate(new Date(dateStr));
                  setShowMonthlyModal(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelCol: {
    flex: 1,
    paddingEnd: 12,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  stripWrapper: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  stripScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  dateCard: {
    width: 82,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    position: "relative",
  },
  dateCardSelected: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  dateCardLowest: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  lowestBadge: {
    position: "absolute",
    top: -8,
    backgroundColor: "#10B981",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lowestBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  dayNameText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  monthDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginVertical: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "800",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  textGreen: {
    color: "#059669",
  },
  textSlate: {
    color: "#0F172A",
  },
  monthlyCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    gap: 6,
  },
  monthlyCalBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  monthlyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 24,
  },
  monthlyGridItem: {
    width: "22.5%",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  monthlyGridItemSelected: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  monthlyGridItemLowest: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  gridDayName: {
    fontSize: 10,
    color: "#64748B",
  },
  gridDateNum: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 2,
  },
  gridPrice: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniLowestTag: {
    fontSize: 9,
    color: "#059669",
    fontWeight: "800",
  },
});
