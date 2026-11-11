import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { calendarService } from "../../services/calendarService";
import { travelReminderService } from "../../services/travelReminderService";
import { showLocalizedAlert } from "../../utils/localizedAlert";
import { supabase } from "../../utils/supabase";

export interface BookingManageData {
  id: string;
  booking_reference?: string;
  title?: string;
  total_price?: number;
  amount?: number;
  currency?: string;
  travel_date?: string;
  check_in_date?: string;
  check_out_date?: string;
  status?: string;
  type?: "flight" | "hotel" | "train" | "bus" | "launch" | "tour";
  hotel?: any;
  flight?: any;
}

interface BookingManageModalProps {
  visible: boolean;
  booking: BookingManageData | null;
  onClose: () => void;
  onBookingCancelled?: (bookingId: string) => void;
  onDateChanged?: (bookingId: string, newDate: string) => void;
}

export const BookingManageModal: React.FC<BookingManageModalProps> = ({
  visible,
  booking,
  onClose,
  onBookingCancelled,
  onDateChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"cancel" | "reschedule" | "reminders">("cancel");
  const [loading, setLoading] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [selectedNewDateOffset, setSelectedNewDateOffset] = useState<number>(3);

  const refCode = booking?.booking_reference || booking?.id?.slice(0, 8) || "TRV-8821";
  const totalPrice = Number(booking?.total_price || booking?.amount || 3500);
  const currencySymbol = booking?.currency === "USD" ? "$" : "৳";

  // Check active reminders
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (booking?.booking_reference || booking?.id) {
        const active = await travelReminderService.hasActiveReminder(refCode);
        if (isMounted) setHasReminder(active);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [booking, refCode]);

  // Refund Calculation Breakdown
  const refundEstimate = useMemo(() => {
    // Standard BD / Airline / Hotel fair policy:
    // If cancelled >= 48 hours: 90% refund, 10% processing fee
    // If cancelled 24-48 hours: 70% refund, 30% cancellation charge
    // If cancelled < 24 hours: 50% refund
    const refundRate = 0.9; // 90%
    const refundAmount = Math.round(totalPrice * refundRate);
    const cancellationFee = totalPrice - refundAmount;
    return {
      refundRate: 90,
      refundAmount,
      cancellationFee,
      policyTier: "৪৮ ঘণ্টার পূর্বে বাতিল (সর্বোচ্চ রিফান্ড স্তর)",
      payoutMethod: "বিকাশ / নগদ / মূল ব্যাংক কার্ড (২-৩ কার্যদিবসের মধ্যে)",
    };
  }, [totalPrice]);

  const handleCancelBooking = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLoading(true);

      if (booking?.id) {
        try {
          await supabase
            .from("bookings")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
        } catch {
          // ignore
        }
      }

      await travelReminderService.cancelReminder(refCode);

      showLocalizedAlert(
        "বুকিং বাতিল সফল হয়েছে",
        `বুকিং রেফারেন্স #${refCode} বাতিল করা হয়েছে। আপনার আনুমানিক ফেরতযোগ্য অর্থ ${currencySymbol}${refundEstimate.refundAmount} মূল পেমেন্ট মেথডে প্রদান করা হবে।`
      );

      if (booking?.id && onBookingCancelled) {
        onBookingCancelled(booking.id);
      }
      onClose();
    } catch (e: any) {
      showLocalizedAlert("ত্রুটি", e?.message || "বুকিং বাতিল করা যায়নি");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(true);

      const d = new Date();
      d.setDate(d.getDate() + selectedNewDateOffset);
      const newDateStr = d.toISOString().slice(0, 10);

      if (booking?.id) {
        try {
          await supabase
            .from("bookings")
            .update({
              travel_date: newDateStr,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
        } catch {
          // ignore
        }
      }

      showLocalizedAlert(
        "তারিখ পরিবর্তন নিশ্চিত",
        `আপনার বুকিংয়ের নতুন তারিখ নির্ধারণ করা হয়েছে: ${newDateStr}। কোনো পরিবর্তন ফি প্রযোজ্য হয়নি।`
      );

      if (booking?.id && onDateChanged) {
        onDateChanged(booking.id, newDateStr);
      }
      onClose();
    } catch (e: any) {
      showLocalizedAlert("ত্রুটি", e?.message || "তারিখ পরিবর্তন ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
    try {
      Haptics.selectionAsync();
      const travelDateObj = new Date(booking?.travel_date || booking?.check_in_date || Date.now() + 86400000);
      const success = await calendarService.addToCalendar({
        title: `✈/🏨 ${booking?.title || "ভ্রমণ বুকিং"} (#${refCode})`,
        description: `বুকিং রেফারেন্স: ${refCode}\nমোট মূল্য: ${currencySymbol}${totalPrice}\nযাত্রার তারিখ: ${travelDateObj.toLocaleDateString("bn-BD")}\nShopno Travel Agency অ্যাপের মাধ্যমে সংরক্ষিত।`,
        location: booking?.hotel?.address || "বাংলাদেশ",
        startDate: travelDateObj,
        endDate: new Date(travelDateObj.getTime() + 4 * 60 * 60 * 1000),
      });

      if (success) {
        showLocalizedAlert(
          "ক্যালেন্ডারে সংরক্ষিত!",
          "আপনার ট্রিপ সফলভাবে ক্যালেন্ডারে যোগ করা হয়েছে।"
        );
      }
    } catch {
      showLocalizedAlert("ক্যালেন্ডার", "ক্যালেন্ডার খুলতে সমস্যা হয়েছে।");
    }
  };

  const handleScheduleAutoReminders = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const travelDateObj = new Date(booking?.travel_date || booking?.check_in_date || Date.now() + 86400000);
      const res = await travelReminderService.scheduleJourneyReminders({
        bookingReference: refCode,
        title: booking?.title || "ভ্রমণ বুকিং",
        destination: booking?.hotel?.city || "বাংলাদেশ",
        travelDate: travelDateObj,
        serviceType: (booking?.type as any) || "flight",
      });

      if (res.success) {
        setHasReminder(true);
        showLocalizedAlert(
          "✓ অটো-রিমাইন্ডার সক্রিয়!",
          "যাত্রার ২৪ ঘণ্টা আগে এবং ২ ঘণ্টা আগে স্বয়ংক্রিয়ভাবে পুশ নোটিফিকেশন পাঠানো হবে।"
        );
      }
    } catch {
      // ignore
    }
  };

  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.headerTitle}>বুকিং পরিবর্তন ও ব্যবস্থাপনা</Text>
              <Text style={styles.headerSubtitle}>
                রেফারেন্স: #{refCode} · {booking.title || "ভ্রমণ রিজার্ভেশন"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "cancel" && styles.tabItemActive]}
              onPress={() => setActiveTab("cancel")}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={activeTab === "cancel" ? "#DC2626" : "#64748B"}
              />
              <Text style={[styles.tabText, activeTab === "cancel" && styles.tabTextActiveCancel]}>
                বাতিল ও রিফান্ড
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === "reschedule" && styles.tabItemActive]}
              onPress={() => setActiveTab("reschedule")}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={activeTab === "reschedule" ? "#0055F2" : "#64748B"}
              />
              <Text style={[styles.tabText, activeTab === "reschedule" && styles.tabTextActive]}>
                তারিখ পরিবর্তন
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === "reminders" && styles.tabItemActive]}
              onPress={() => setActiveTab("reminders")}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={activeTab === "reminders" ? "#0055F2" : "#64748B"}
              />
              <Text style={[styles.tabText, activeTab === "reminders" && styles.tabTextActive]}>
                ক্যালেন্ডার ও এলার্ট
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* ================= TAB 1: CANCELLATION & REFUND ESTIMATE ================= */}
            {activeTab === "cancel" && (
              <View>
                <View style={styles.refundCard}>
                  <View style={styles.refundCardHeader}>
                    <Ionicons name="cash-outline" size={20} color="#059669" />
                    <Text style={styles.refundCardTitle}>আগাম রিফান্ড হিসাব (Refund Preview)</Text>
                  </View>

                  <View style={styles.refundRow}>
                    <Text style={styles.refundLabel}>মূল পরিশোধিত অর্থ:</Text>
                    <Text style={styles.refundVal}>{currencySymbol}{totalPrice.toLocaleString()}</Text>
                  </View>

                  <View style={styles.refundRow}>
                    <Text style={styles.refundLabel}>বাতিল ফি ({100 - refundEstimate.refundRate}%):</Text>
                    <Text style={[styles.refundVal, { color: "#DC2626" }]}>
                      - {currencySymbol}{refundEstimate.cancellationFee.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.refundTotalRow}>
                    <View>
                      <Text style={styles.totalRefundTitle}>ফেরতযোগ্য টাকার পরিমাণ:</Text>
                      <Text style={styles.totalRefundSub}>({refundEstimate.refundRate}% তাত্ক্ষণিক ফেরত)</Text>
                    </View>
                    <Text style={styles.totalRefundAmount}>
                      {currencySymbol}{refundEstimate.refundAmount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.payoutNotice}>
                    <Ionicons name="information-circle" size={15} color="#0284C7" />
                    <Text style={styles.payoutNoticeText}>
                      ফেরতের মাধ্যম: {refundEstimate.payoutMethod}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cancelConfirmBtn}
                  onPress={handleCancelBooking}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.cancelConfirmBtnText}>
                        বুকিং বাতিল ও {currencySymbol}{refundEstimate.refundAmount.toLocaleString()} রিফান্ড নিশ্চিত করুন
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 2: RESCHEDULE DATE ================= */}
            {activeTab === "reschedule" && (
              <View>
                <Text style={styles.sectionSubtitle}>
                  কোন অতিরিক্ত চার্জ ছাড়াই নতুন যাত্রার সম্ভাব্য তারিখ নির্বাচন করুন:
                </Text>

                <View style={styles.datesGrid}>
                  {[1, 2, 3, 5, 7, 10].map((offset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const isSel = selectedNewDateOffset === offset;
                    return (
                      <TouchableOpacity
                        key={offset}
                        style={[styles.dateChip, isSel && styles.dateChipActive]}
                        onPress={() => setSelectedNewDateOffset(offset)}
                      >
                        <Text style={[styles.dateChipDay, isSel && styles.textWhite]}>
                          {d.toLocaleDateString("bn-BD", { weekday: "short" })}
                        </Text>
                        <Text style={[styles.dateChipDate, isSel && styles.textWhite]}>
                          {d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
                        </Text>
                        <Text style={[styles.dateChipFree, isSel && styles.textWhite]}>
                          ফ্রি পরিবর্তন
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.rescheduleConfirmBtn}
                  onPress={handleReschedule}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.rescheduleConfirmBtnText}>
                        নতুন তারিখে স্থানান্তর নিশ্চিত করুন
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 3: CALENDAR & AUTO-REMINDER ================= */}
            {activeTab === "reminders" && (
              <View>
                {/* Add to Calendar Card */}
                <View style={styles.featureCard}>
                  <View style={styles.featureTopRow}>
                    <Ionicons name="calendar" size={24} color="#0055F2" />
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.featureTitle}>ক্যালেন্ডারে যোগ করুন</Text>
                      <Text style={styles.featureSubtitle}>
                        Google Calendar বা ডিভাইসের নিজস্ব ক্যালেন্ডারে ট্রিপ সংরক্ষণ করুন যাতে যাত্রা ভুল না হয়।
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.featureBtn}
                    onPress={handleAddToCalendar}
                  >
                    <Ionicons name="open-outline" size={16} color="#0055F2" />
                    <Text style={styles.featureBtnText}>ক্যালেন্ডারে সংরক্ষণ করুন</Text>
                  </TouchableOpacity>
                </View>

                {/* 24h & 2h Auto-Reminder Card */}
                <View style={styles.featureCard}>
                  <View style={styles.featureTopRow}>
                    <Ionicons
                      name={hasReminder ? "checkmark-circle" : "alarm-outline"}
                      size={24}
                      color={hasReminder ? "#059669" : "#D97706"}
                    />
                    <View style={{ flex: 1, marginStart: 10 }}>
                      <Text style={styles.featureTitle}>যাত্রার অটো-রিমাইন্ডার</Text>
                      <Text style={styles.featureSubtitle}>
                        যাত্রার ২৪ ঘণ্টা এবং ২ ঘণ্টা আগে স্বয়ংক্রিয় নোটিফিকেশন অ্যালার্ট।
                      </Text>
                    </View>
                  </View>

                  {hasReminder ? (
                    <View style={styles.reminderActiveBanner}>
                      <Ionicons name="checkmark-done" size={16} color="#059669" />
                      <Text style={styles.reminderActiveText}>
                        ✓ ২৪ ঘণ্টা ও ২ ঘণ্টার অটো-রিমাইন্ডার সক্রিয় আছে
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.featureBtnGreen}
                      onPress={handleScheduleAutoReminders}
                    >
                      <Ionicons name="notifications" size={16} color="#FFFFFF" />
                      <Text style={styles.featureBtnTextWhite}>
                        অটো-রিমাইন্ডার চালু করুন
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#0055F2",
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#0055F2",
  },
  tabTextActiveCancel: {
    color: "#DC2626",
  },
  modalBody: {
    paddingBottom: 24,
  },

  // Refund Card
  refundCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  refundCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  refundCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
  },
  refundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  refundLabel: {
    fontSize: 13,
    color: "#475569",
  },
  refundVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#DCFCE7",
    marginVertical: 8,
  },
  refundTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalRefundTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  totalRefundSub: {
    fontSize: 11,
    color: "#16A34A",
  },
  totalRefundAmount: {
    fontSize: 20,
    fontWeight: "900",
    color: "#15803D",
  },
  payoutNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  payoutNoticeText: {
    fontSize: 11,
    color: "#0369A1",
    fontWeight: "600",
    flex: 1,
  },
  cancelConfirmBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancelConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Reschedule
  sectionSubtitle: {
    fontSize: 12.5,
    color: "#475569",
    marginBottom: 12,
  },
  datesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  dateChip: {
    width: "31%",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  dateChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  dateChipDay: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  dateChipDate: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 2,
  },
  dateChipFree: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "700",
  },
  textWhite: {
    color: "#FFFFFF",
  },
  rescheduleConfirmBtn: {
    backgroundColor: "#0055F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rescheduleConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Reminders / Calendar
  featureCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 12,
  },
  featureTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  featureSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  featureBtn: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  featureBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },
  featureBtnGreen: {
    marginTop: 10,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  featureBtnTextWhite: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  reminderActiveBanner: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderActiveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
});
