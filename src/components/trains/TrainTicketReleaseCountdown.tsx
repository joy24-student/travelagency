import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showLocalizedAlert } from "../../utils/localizedAlert";
import { calendarService } from "../../services/calendarService";

interface TrainTicketReleaseCountdownProps {
  travelDate: Date;
  originStationName?: string;
  destStationName?: string;
  onRemindSet?: (reminderTime: Date) => void;
}

const STORAGE_KEY_PREFIX = "@shopno_train_reminder_";

export const TrainTicketReleaseCountdown: React.FC<TrainTicketReleaseCountdownProps> = ({
  travelDate,
  originStationName = "ঢাকা",
  destStationName = "চট্টগ্রাম",
  onRemindSet,
}) => {
  // Bangladesh Railway advance ticket rule:
  // Tickets for travelDate open exactly 10 days in advance at 08:00 AM BD time.
  const releaseTime = useMemo(() => {
    const d = new Date(travelDate);
    d.setDate(d.getDate() - 10);
    d.setHours(8, 0, 0, 0);
    return d;
  }, [travelDate]);

  const storageKey = useMemo(() => {
    return `${STORAGE_KEY_PREFIX}${releaseTime.toISOString().slice(0, 10)}`;
  }, [releaseTime]);

  const [hasReminder, setHasReminder] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Check stored reminder
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored && isMounted) {
          setHasReminder(true);
        } else if (isMounted) {
          setHasReminder(false);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // Live 1-second ticking countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const diffMs = releaseTime.getTime() - now;
  const isReleased = diffMs <= 0;

  // Breakdown remaining time
  const timeRemaining = useMemo(() => {
    if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return { days, hours, minutes, seconds };
  }, [diffMs]);

  // Check if release is today or tomorrow
  const releaseTitle = useMemo(() => {
    if (isReleased) {
      return "✓ এই যাত্রার টিকিট উন্মুক্ত (বিক্রি চলছে)";
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const relDay = new Date(releaseTime);
    relDay.setHours(0, 0, 0, 0);

    const dayDiff = Math.round((relDay.getTime() - today.getTime()) / 86400000);

    if (dayDiff === 0) {
      return "টিকিট ছাড়বে আজ সকাল ৮টায়";
    }
    if (dayDiff === 1) {
      return "টিকিট ছাড়বে আগামীকাল সকাল ৮টায়";
    }
    const formattedDate = releaseTime.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "short",
    });
    return `টিকিট ছাড়বে ${formattedDate} সকাল ৮টায়`;
  }, [isReleased, releaseTime]);

  const handleToggleReminder = useCallback(async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (hasReminder) {
        await AsyncStorage.removeItem(storageKey);
        setHasReminder(false);
        showLocalizedAlert(
          "রিমাইন্ডার বাতিল",
          "ট্রেন টিকিটের রিমাইন্ডার বন্ধ করা হয়েছে।"
        );
      } else {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            releaseTime: releaseTime.toISOString(),
            travelDate: travelDate.toISOString(),
            route: `${originStationName} -> ${destStationName}`,
            createdAt: new Date().toISOString(),
          })
        );
        setHasReminder(true);

        // Schedule notification time: 15 minutes before 8:00 AM (7:45 AM)
        const remindMoment = new Date(releaseTime.getTime() - 15 * 60 * 1000);
        if (onRemindSet) {
          onRemindSet(remindMoment);
        }

        // Add to calendar
        try {
          await calendarService.addToCalendar({
            title: `🚂 বাংলাদেশ রেলওয়ে টিকিট ছাড়বে: ${originStationName} - ${destStationName}`,
            description: `যাত্রার তারিখ: ${travelDate.toLocaleDateString('bn-BD')}. সকাল ৮টায় টিকিট বিক্রি শুরু হবে। দ্রুত আসন বুক করতে অ্যাপে আসুন।`,
            location: "বাংলাদেশ রেলওয়ে (eticket.railway.gov.bd)",
            startDate: releaseTime,
            endDate: new Date(releaseTime.getTime() + 30 * 60 * 1000),
          });
        } catch {
          // Calendar addition is optional / fallback alert shown
        }

        showLocalizedAlert(
          "🔔 রিমাইন্ডার সেট করা হয়েছে!",
          `টিকিট ছাড়ার ১৫ মিনিট আগে (সকাল ৭:৪৫ মিনিটে) আপনাকে স্মরণ করিয়ে দেওয়া হবে যাতে আপনি সহজেই আসন বুক করতে পারেন।`
        );
      }
    } catch (e: any) {
      Alert.alert("ত্রুটি", e?.message || "রিমাইন্ডার সেট করা যায়নি");
    }
  }, [
    hasReminder,
    storageKey,
    releaseTime,
    travelDate,
    originStationName,
    destStationName,
    onRemindSet,
  ]);

  return (
    <View style={[styles.container, isReleased ? styles.containerReleased : styles.containerPending]}>
      <View style={styles.headerRow}>
        <View style={styles.badgeWrapper}>
          <Ionicons
            name={isReleased ? "checkmark-circle" : "alarm-outline"}
            size={18}
            color={isReleased ? "#059669" : "#D97706"}
          />
          <Text style={[styles.badgeText, isReleased ? styles.textReleased : styles.textPending]}>
            {releaseTitle}
          </Text>
        </View>

        {!isReleased && (
          <View style={styles.pillAdvise}>
            <Text style={styles.pillAdviseText}>১০ দিন পূর্বে ৮:০০ AM</Text>
          </View>
        )}
      </View>

      {!isReleased ? (
        <>
          <View style={styles.timerRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeNumber}>{String(timeRemaining.days).padStart(2, "0")}</Text>
              <Text style={styles.timeLabel}>দিন</Text>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeBox}>
              <Text style={styles.timeNumber}>{String(timeRemaining.hours).padStart(2, "0")}</Text>
              <Text style={styles.timeLabel}>ঘণ্টা</Text>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeBox}>
              <Text style={styles.timeNumber}>{String(timeRemaining.minutes).padStart(2, "0")}</Text>
              <Text style={styles.timeLabel}>মিনিট</Text>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeBox}>
              <Text style={styles.timeNumber}>{String(timeRemaining.seconds).padStart(2, "0")}</Text>
              <Text style={styles.timeLabel}>সেকেন্ড</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Text style={styles.routeHintText} numberOfLines={1}>
              {originStationName} ➔ {destStationName} ({travelDate.toLocaleDateString("bn-BD")})
            </Text>

            <Pressable
              style={[styles.remindButton, hasReminder && styles.remindButtonActive]}
              onPress={handleToggleReminder}
            >
              <Ionicons
                name={hasReminder ? "notifications" : "notifications-outline"}
                size={16}
                color={hasReminder ? "#FFFFFF" : "#0055F2"}
              />
              <Text style={[styles.remindButtonText, hasReminder && styles.remindButtonTextActive]}>
                {hasReminder ? "✓ রিমাইন্ডার সক্রিয়" : "মনে করিয়ে দিন"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.releasedRow}>
          <Text style={styles.releasedInfoText}>
            এই তারিখের জন্য অনলাইন টিকিট বিক্রয় উন্মুক্ত আছে। দ্রুত পছন্দের বগি ও আসন নির্বাচন করে বুকিং সম্পন্ন করুন।
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  containerPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  containerReleased: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  textPending: {
    color: "#B45309",
  },
  textReleased: {
    color: "#047857",
  },
  pillAdvise: {
    backgroundColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillAdviseText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78350F",
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
    gap: 4,
  },
  timeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 48,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === "web" ? { boxShadow: "0px 1px 2px rgba(15, 23, 42, 0.06)" } : {}),
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  timeNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#B45309",
    fontVariant: ["tabular-nums"],
  },
  timeLabel: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "600",
    marginTop: 1,
  },
  timeColon: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D97706",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(245, 158, 11, 0.2)",
    paddingTop: 10,
    marginTop: 2,
    gap: 8,
  },
  routeHintText: {
    fontSize: 12,
    color: "#78350F",
    fontWeight: "500",
    flex: 1,
  },
  remindButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  remindButtonActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  remindButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0055F2",
  },
  remindButtonTextActive: {
    color: "#FFFFFF",
  },
  releasedRow: {
    marginTop: 8,
  },
  releasedInfoText: {
    fontSize: 12.5,
    color: "#065F46",
    lineHeight: 18,
  },
});
