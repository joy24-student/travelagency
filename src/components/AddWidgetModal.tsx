import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";

interface AddWidgetModalProps {
  visible: boolean;
  onClose: () => void;
  onAddWidget?: () => void;
}

export function AddWidgetModal({ visible, onClose, onAddWidget }: AddWidgetModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [backdropOpacity, translateY, visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onAddWidget) onAddWidget();
    handleClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 9,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlayContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Modal Sheet Content */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Top Header Row with Close Icon */}
          <View style={styles.topHeaderRow}>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.mainHeadline}>Add Trip.com Widget</Text>
          <Text style={styles.subTitleText}>
            Effortless travel with smart tools and AI
          </Text>

          {/* Phone Mockup Illustration (Screenshot 1) */}
          <View style={styles.phoneMockupContainer}>
            <View style={styles.phoneFrame}>
              {/* Top Widget Card Preview */}
              <View style={styles.widgetCardLarge}>
                <View style={styles.widgetHeaderRow}>
                  <View>
                    <Text style={styles.widgetDateDay}>Friday</Text>
                    <Text style={styles.widgetDateNum}>21</Text>
                    <View style={styles.locationPillRow}>
                      <Ionicons name="location-sharp" size={10} color="#64748B" />
                      <Text style={styles.widgetLocationText}>Bangkok</Text>
                    </View>
                  </View>

                  <View style={styles.toolsRow}>
                    <View style={styles.toolIconBox}>
                      <Ionicons name="scan-outline" size={14} color="#111827" />
                      <Text style={styles.toolLabel}>Menu Assistant</Text>
                    </View>
                    <View style={styles.toolIconBox}>
                      <Ionicons name="language-outline" size={14} color="#111827" />
                      <Text style={styles.toolLabel}>Translate</Text>
                    </View>
                    <View style={styles.toolIconBox}>
                      <Ionicons name="cash-outline" size={14} color="#111827" />
                      <Text style={styles.toolLabel}>Currency Exchange</Text>
                    </View>
                  </View>
                </View>

                {/* Popular Attractions Search Pill */}
                <View style={styles.widgetSearchPill}>
                  <Ionicons name="chatbox-ellipses-outline" size={14} color={TRIP_BLUE} />
                  <Text style={styles.widgetSearchText}>
                    Popular Attractions in Bangkok
                  </Text>
                </View>
              </View>

              {/* Bottom Grid Preview */}
              <View style={styles.widgetGridRow}>
                {/* 2x2 Widget Card */}
                <View style={styles.widgetCardSmall}>
                  <View style={styles.smallHeaderRow}>
                    <View>
                      <Text style={styles.widgetDateDaySmall}>Friday</Text>
                      <Text style={styles.widgetDateNumSmall}>21</Text>
                    </View>
                    <Text style={styles.tripBadgeLogo}>Trip.</Text>
                  </View>

                  <View style={styles.miniIconRow}>
                    <View style={styles.miniIconBox}>
                      <Ionicons name="scan-outline" size={12} color="#111827" />
                    </View>
                    <View style={styles.miniIconBox}>
                      <Ionicons name="language-outline" size={12} color="#111827" />
                    </View>
                  </View>

                  <View style={styles.miniAskGeniePill}>
                    <Ionicons name="chatbox-ellipses" size={10} color={TRIP_BLUE} />
                    <Text style={styles.miniAskGenieText}>Ask TripGenie</Text>
                  </View>
                </View>

                {/* Placeholder Grid Items */}
                <View style={styles.placeholderColumn}>
                  <View style={styles.placeholderRow}>
                    <View style={styles.placeholderBox} />
                    <View style={styles.placeholderBox} />
                  </View>
                  <View style={styles.placeholderRow}>
                    <View style={styles.placeholderBox} />
                    <View style={styles.placeholderBox} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Carousel Page Indicator Bars */}
          <View style={styles.carouselIndicators}>
            <View style={[styles.barIndicator, styles.barActive]} />
            <View style={styles.barIndicator} />
            <View style={styles.barIndicator} />
            <View style={styles.barIndicator} />
          </View>

          {/* Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}
            onPress={handleAdd}
          >
            <Text style={styles.addBtnText}>Add to home screen</Text>
          </Pressable>

          {/* Footer Note */}
          <Text style={styles.footerNoteText}>
            For some devices, please go to the home screen to add it manually
          </Text>

          {/* Home Bar Indicator */}
          <View style={styles.bottomBarIndicator} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  closeBtn: {
    padding: 4,
  },
  mainHeadline: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 4,
    letterSpacing: -0.4,
  },
  subTitleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  phoneMockupContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  phoneFrame: {
    width: "100%",
    backgroundColor: "#EEF2FF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    gap: 12,
  },
  widgetCardLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  widgetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  widgetDateDay: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  widgetDateNum: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    lineHeight: 26,
  },
  locationPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  widgetLocationText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  toolsRow: {
    flexDirection: "row",
    gap: 6,
  },
  toolIconBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 60,
  },
  toolLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    marginTop: 2,
  },
  widgetSearchPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  widgetSearchText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  widgetGridRow: {
    flexDirection: "row",
    gap: 12,
  },
  widgetCardSmall: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  smallHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  widgetDateDaySmall: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "600",
  },
  widgetDateNumSmall: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  tripBadgeLogo: {
    color: TRIP_BLUE,
    fontWeight: "900",
    fontSize: 13,
  },
  miniIconRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 4,
  },
  miniIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAskGeniePill: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  miniAskGenieText: {
    fontSize: 9,
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  placeholderColumn: {
    flex: 1,
    gap: 8,
  },
  placeholderRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  placeholderBox: {
    flex: 1,
    backgroundColor: "#E0E7FF",
    borderRadius: 10,
    opacity: 0.7,
  },
  carouselIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginVertical: 14,
  },
  barIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
  },
  barActive: {
    backgroundColor: "#111827",
  },
  addBtn: {
    backgroundColor: TRIP_BLUE,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  addBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  footerNoteText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  bottomBarIndicator: {
    width: 134,
    height: 5,
    backgroundColor: "#111827",
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 8,
  },
});
