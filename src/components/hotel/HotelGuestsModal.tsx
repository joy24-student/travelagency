import React, { useState } from "react";
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

export interface ChildAgeConfig {
  childIndex: number;
  age: number; // e.g. 1, 4, 8
  ageBracket: "infant" | "toddler" | "child" | "teen";
}

export interface GuestsConfigState {
  rooms: number;
  adults: number;
  children: number;
  childAges?: number[];
}

interface HotelGuestsModalProps {
  visible: boolean;
  onClose: () => void;
  config: GuestsConfigState;
  onApply: (updated: GuestsConfigState) => void;
}

const CHILD_AGE_OPTIONS = [
  { value: 1, labelBn: "০ - ২ বছর (ইনফ্যান্ট / সম্পূর্ণ বিনামূল্যে)", badge: "ফ্রি / Free", bracket: "infant" },
  { value: 4, labelBn: "৩ - ৫ বছর (টডলার / ২৫% সাপ্লিমেন্ট)", badge: "২৫% চার্জ", bracket: "toddler" },
  { value: 8, labelBn: "৬ - ১১ বছর (চাইল্ড / ৫০% সাপ্লিমেন্ট)", badge: "৫০% চার্জ", bracket: "child" },
  { value: 13, labelBn: "১২+ বছর (পূর্ণ প্রাপ্তবয়স্ক রেট)", badge: "পূর্ণ রেট", bracket: "teen" },
] as const;

export const HotelGuestsModal: React.FC<HotelGuestsModalProps> = ({
  visible,
  onClose,
  config,
  onApply,
}) => {
  const [rooms, setRooms] = useState(config.rooms || 1);
  const [adults, setAdults] = useState(config.adults || 2);
  const [children, setChildren] = useState(config.children || 0);

  // Initialize child ages array
  const [childAges, setChildAges] = useState<number[]>(() => {
    if (config.childAges && config.childAges.length === config.children) {
      return [...config.childAges];
    }
    return Array(config.children || 0).fill(4); // default age 4
  });

  const handleChildrenChange = (newCount: number) => {
    Haptics.selectionAsync();
    setChildren(newCount);
    if (newCount > childAges.length) {
      // Add default age 4 for new children
      setChildAges((prev) => [...prev, ...Array(newCount - prev.length).fill(4)]);
    } else {
      // Trim
      setChildAges((prev) => prev.slice(0, newCount));
    }
  };

  const setAgeForChild = (index: number, age: number) => {
    Haptics.selectionAsync();
    setChildAges((prev) => {
      const copy = [...prev];
      copy[index] = age;
      return copy;
    });
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply({
      rooms,
      adults,
      children,
      childAges,
    });
    onClose();
  };

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
              <Text style={styles.modalTitle}>অতিথি ও রুম সংখ্যা</Text>
              <Text style={styles.modalSubTitle}>
                সঠিক ভাড়া নির্ধারণে প্রতিটি শিশুর বয়স উল্লেখ করুন
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Stepper 1: Rooms */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>রুম সংখ্যা</Text>
                <Text style={styles.stepperSub}>হোটেল বা রিসোর্ট রুম</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={[styles.stepBtn, rooms <= 1 && styles.stepBtnDisabled]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRooms((r) => Math.max(1, r - 1));
                  }}
                  disabled={rooms <= 1}
                >
                  <Ionicons name="remove" size={16} color={rooms <= 1 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
                <Text style={styles.stepValue}>{toBengaliNumber(rooms)}</Text>
                <Pressable
                  style={[styles.stepBtn, rooms >= 5 && styles.stepBtnDisabled]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRooms((r) => Math.min(5, r + 1));
                  }}
                  disabled={rooms >= 5}
                >
                  <Ionicons name="add" size={16} color={rooms >= 5 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
              </View>
            </View>

            {/* Stepper 2: Adults */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>প্রাপ্তবয়স্ক</Text>
                <Text style={styles.stepperSub}>বয়স ১২ বছর বা তদূর্ধ্ব</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={[styles.stepBtn, adults <= 1 && styles.stepBtnDisabled]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAdults((a) => Math.max(1, a - 1));
                  }}
                  disabled={adults <= 1}
                >
                  <Ionicons name="remove" size={16} color={adults <= 1 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
                <Text style={styles.stepValue}>{toBengaliNumber(adults)}</Text>
                <Pressable
                  style={[styles.stepBtn, adults >= 10 && styles.stepBtnDisabled]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAdults((a) => Math.min(10, a + 1));
                  }}
                  disabled={adults >= 10}
                >
                  <Ionicons name="add" size={16} color={adults >= 10 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
              </View>
            </View>

            {/* Stepper 3: Children */}
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.stepperTitle}>শিশু সংখ্যা</Text>
                <Text style={styles.stepperSub}>বয়স ০ থেকে ১১ বছর</Text>
              </View>
              <View style={styles.stepperControl}>
                <Pressable
                  style={[styles.stepBtn, children <= 0 && styles.stepBtnDisabled]}
                  onPress={() => handleChildrenChange(Math.max(0, children - 1))}
                  disabled={children <= 0}
                >
                  <Ionicons name="remove" size={16} color={children <= 0 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
                <Text style={styles.stepValue}>{toBengaliNumber(children)}</Text>
                <Pressable
                  style={[styles.stepBtn, children >= 6 && styles.stepBtnDisabled]}
                  onPress={() => handleChildrenChange(Math.min(6, children + 1))}
                  disabled={children >= 6}
                >
                  <Ionicons name="add" size={16} color={children >= 6 ? "#94A3B8" : "#0F172A"} />
                </Pressable>
              </View>
            </View>

            {/* Dynamic Child Age Selectors */}
            {children > 0 && (
              <View style={styles.childAgesCard}>
                <View style={styles.childHeader}>
                  <Ionicons name="information-circle" size={18} color="#0055F2" />
                  <Text style={styles.childSectionTitle}>
                    প্রতিটি শিশুর সঠিক বয়স নির্বাচন করুন ({toBengaliNumber(children)} জন শিশু)
                  </Text>
                </View>

                {Array.from({ length: children }).map((_, childIdx) => {
                  const currentAge = childAges[childIdx] ?? 4;
                  return (
                    <View key={`child-block-${childIdx}`} style={styles.singleChildRow}>
                      <Text style={styles.childLabel}>
                        শিশু {toBengaliNumber(childIdx + 1)} এর বয়স:
                      </Text>

                      <View style={styles.ageOptionsWrap}>
                        {CHILD_AGE_OPTIONS.map((opt) => {
                          const isSelected =
                            opt.bracket === "infant"
                              ? currentAge <= 2
                              : opt.bracket === "toddler"
                              ? currentAge >= 3 && currentAge <= 5
                              : opt.bracket === "child"
                              ? currentAge >= 6 && currentAge <= 11
                              : currentAge >= 12;

                          return (
                            <Pressable
                              key={`child-${childIdx}-${opt.bracket}`}
                              style={[styles.ageOptionChip, isSelected && styles.ageOptionChipActive]}
                              onPress={() => setAgeForChild(childIdx, opt.value)}
                            >
                              <Text
                                style={[
                                  styles.ageOptionText,
                                  isSelected && styles.ageOptionTextActive,
                                ]}
                              >
                                {opt.badge}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {/* Child Policy Explainer */}
                <View style={styles.policyNotice}>
                  <Text style={styles.policyNoticeText}>
                    💡 <Text style={{ fontWeight: "700" }}>শিশু পলিসি:</Text> ০-২ বছরের শিশুরা সম্পূর্ণ বিনামূল্যে। ৩-১১ বছরের শিশুদের জন্য অতিরিক্ত বেড ও ব্রেকফাস্ট বাবদ বিশেষ ৫০% ছাড় প্রযোজ্য।
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <SafeAreaView style={styles.footerArea}>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>
                অতিথি নির্বাচন সম্পন্ন করুন ({toBengaliNumber(rooms)} রুম • {toBengaliNumber(adults)} প্রাপ্তবয়স্ক{children > 0 ? ` • ${toBengaliNumber(children)} শিশু` : ""})
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

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
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  scrollContent: {
    maxHeight: 460,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  stepperSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  stepperControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepValue: {
    width: 36,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  childAgesCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  childHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  childSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0055F2",
    marginStart: 6,
    flex: 1,
  },
  singleChildRow: {
    marginBottom: 12,
  },
  childLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  ageOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ageOptionChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ageOptionChipActive: {
    backgroundColor: "#0055F2",
    borderColor: "#0055F2",
  },
  ageOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  ageOptionTextActive: {
    color: "#FFFFFF",
  },
  policyNotice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  policyNoticeText: {
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 16,
  },
  footerArea: {
    marginTop: 14,
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
