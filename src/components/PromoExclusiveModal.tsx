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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const PINK_BG = "#FFF7F8";
const PINK_BORDER = "#FFE4E8";
const PINK_ICON_COLOR = "#E11D48";

interface PromoModalProps {
  visible: boolean;
  onClose: () => void;
  onClaimAll?: () => void;
}

const PROMO_ITEMS = [
  {
    id: "p1",
    title: "Hotel Promo Code",
    discount: "10% off",
    icon: "bed-outline" as const,
  },
  {
    id: "p2",
    title: "Europe Train Promo Code",
    discount: "5% off",
    icon: "train-outline" as const,
  },
  {
    id: "p3",
    title: "Tours & Tickets promo code",
    discount: "10% off",
    icon: "ticket-outline" as const,
  },
  {
    id: "p4",
    title: "Airport transfer promo code",
    discount: "12% off",
    icon: "car-outline" as const,
  },
];

export function PromoExclusiveModal({ visible, onClose, onClaimAll }: PromoModalProps) {
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
  }, [visible]);

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

  const handleClaim = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onClaimAll) onClaimAll();
    handleClose();
  };

  // Drag down pan responder to close modal
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
        {/* Dark translucent backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Modal Sheet Sliding Content */}
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Header Bar with Close Button */}
          <View style={styles.topHeaderRow}>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#333" />
            </Pressable>
          </View>

          {/* Magic Top Hat Illustration Header */}
          <View style={styles.hatArtContainer}>
            <LinearGradient
              colors={["rgba(240, 246, 255, 0.8)", "rgba(255, 255, 255, 0)"]}
              style={styles.hatGradientGlow}
            />
            {/* Sparkles & Coin Artwork */}
            <View style={styles.sparkleRow}>
              <Text style={styles.sparkleText}>✨</Text>
            </View>
            <View style={styles.hatGraphicWrapper}>
              <View style={styles.hatBase}>
                <View style={styles.hatRibbon} />
                {/* Coin popping out */}
                <View style={styles.coinBadge}>
                  <Text style={styles.coinText}>T</Text>
                  <Text style={styles.percentText}>%</Text>
                </View>
              </View>
              <View style={styles.hatBrim} />
            </View>
          </View>

          {/* Main Title */}
          <Text style={styles.mainHeadline}>
            New user exclusives: Save up to $75
          </Text>

          {/* Voucher Ticket Items List */}
          <View style={styles.voucherList}>
            {PROMO_ITEMS.map((item) => (
              <View key={item.id} style={styles.ticketCard}>
                {/* Left Ticket Notch */}
                <View style={styles.notchLeft} />
                {/* Right Ticket Notch */}
                <View style={styles.notchRight} />

                {/* Left Icon Section */}
                <View style={styles.ticketLeftIconBox}>
                  <Ionicons name={item.icon} size={28} color={PINK_ICON_COLOR} />
                </View>

                {/* Vertical Dashed Line */}
                <View style={styles.dashedDivider} />

                {/* Right Voucher Details */}
                <View style={styles.ticketContent}>
                  <Text style={styles.ticketTitle}>{item.title}</Text>
                  <Text style={styles.ticketDiscount}>{item.discount}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Bottom Fixed Action Button */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.claimBtn,
                pressed && styles.claimBtnPressed,
              ]}
              onPress={handleClaim}
            >
              <Text style={styles.claimBtnText}>Claim All</Text>
            </Pressable>
          </View>

          {/* Bottom Drag Bar */}
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
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    zIndex: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  hatArtContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 90,
    marginTop: -20,
    position: "relative",
  },
  hatGradientGlow: {
    position: "absolute",
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  sparkleRow: {
    position: "absolute",
    top: 6,
    left: "40%",
  },
  sparkleText: {
    fontSize: 16,
  },
  hatGraphicWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  hatBase: {
    width: 76,
    height: 52,
    backgroundColor: "#818CF8",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    position: "relative",
    overflow: "visible",
    alignItems: "center",
  },
  hatRibbon: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 14,
    backgroundColor: "#3B82F6",
  },
  coinBadge: {
    position: "absolute",
    top: -22,
    backgroundColor: "#FACC15",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-10deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: "row",
  },
  coinText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
  },
  percentText: {
    color: "#E11D48",
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 1,
  },
  hatBrim: {
    width: 104,
    height: 12,
    backgroundColor: "#6366F1",
    borderRadius: 6,
    marginTop: -1,
  },
  mainHeadline: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginVertical: 14,
    letterSpacing: -0.3,
  },
  voucherList: {
    gap: 10,
    marginVertical: 4,
  },
  ticketCard: {
    backgroundColor: PINK_BG,
    borderColor: PINK_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    position: "relative",
    overflow: "hidden",
  },
  notchLeft: {
    position: "absolute",
    left: -7,
    top: "50%",
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: PINK_BORDER,
  },
  notchRight: {
    position: "absolute",
    right: -7,
    top: "50%",
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: PINK_BORDER,
  },
  ticketLeftIconBox: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  dashedDivider: {
    height: "60%",
    width: 1,
    borderWidth: 0.8,
    borderColor: "#FCA5A5",
    borderStyle: "dashed",
    marginHorizontal: 12,
  },
  ticketContent: {
    flex: 1,
    justifyContent: "center",
  },
  ticketTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 2,
  },
  ticketDiscount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  actionContainer: {
    marginTop: 18,
    marginBottom: 8,
  },
  claimBtn: {
    backgroundColor: TRIP_BLUE,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: TRIP_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  claimBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  bottomBarIndicator: {
    width: 134,
    height: 5,
    backgroundColor: "#111827",
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 12,
  },
});
