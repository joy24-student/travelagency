import React, { useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export function InviteEarnScreen() {
  const insets = useSafeAreaInsets();

  // State management
  const [showToast, setShowToast] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const referralCode = "TRIP2026-X89";

  const handleCopyCode = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastBox}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.toastText}>Referral Code copied to clipboard!</Text>
        </View>
      )}

      {/* ─── Top Navigation Header ───────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Invite & earn</Text>

        <TouchableOpacity
          style={styles.shareHeaderBtn}
          onPress={() => setShowShareModal(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="share-social-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Sky-Blue Hero Section ──────────────────────────────────────── */}
        <LinearGradient
          colors={["#E0F2FE", "#F0F9FF", "#FFFFFF"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Main Title & T&C Badge */}
          <View style={styles.heroTitleBox}>
            <Text style={styles.heroTitleLine1}>Refer friends.</Text>
            <View style={styles.heroTitleLine2Row}>
              <Text style={styles.heroTitleLine2}>Earn up to $100.</Text>
              <TouchableOpacity
                style={styles.tcBadge}
                activeOpacity={0.7}
                onPress={() => setShowTermsModal(true)}
              >
                <Ionicons name="information-circle-outline" size={13} color="#FFFFFF" />
                <Text style={styles.tcBadgeText}>T&C</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3D Illustration Graphics Container */}
          <View style={styles.illustrationContainer}>
            <View style={styles.phoneGraphicFrame}>
              <View style={styles.phoneScreen}>
                <View style={styles.giftBoxIconWrap}>
                  <Ionicons name="gift-outline" size={36} color="#FFFFFF" />
                </View>
                <View style={styles.phoneBtnBar} />
              </View>
            </View>

            {/* Floating Gold Coin Badges */}
            <View style={[styles.goldCoinBadge, styles.coinLeft]}>
              <Text style={styles.coinSymbol}>T</Text>
            </View>
            <View style={[styles.goldCoinBadge, styles.coinRight]}>
              <Text style={styles.coinSymbol}>T</Text>
            </View>

            {/* Friends Avatars Graphic */}
            <View style={[styles.friendAvatarBox, styles.avatarLeft]}>
              <Ionicons name="person" size={24} color="#3B82F6" />
            </View>
            <View style={[styles.friendAvatarBox, styles.avatarRight]}>
              <Ionicons name="person" size={22} color="#EC4899" />
            </View>
          </View>
        </LinearGradient>

        {/* ─── Subtitle Description ────────────────────────────────────────── */}
        <View style={styles.valuePropBox}>
          <Text style={styles.valuePropText}>
            Give your friend up to 20% off their first booking.
          </Text>
          <Text style={styles.valuePropText}>
            You earn $10 each time they book.
          </Text>
        </View>

        {/* ─── Action Buttons ──────────────────────────────────────────────── */}
        <View style={styles.actionButtonsContainer}>
          {/* Primary CTA Button: Invite Friends */}
          <TouchableOpacity
            style={styles.primaryPillBtn}
            activeOpacity={0.88}
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.primaryPillText}>Invite friends</Text>
          </TouchableOpacity>

          {/* Secondary CTA Button: Copy Refer Code */}
          <TouchableOpacity
            style={styles.outlinePillBtn}
            activeOpacity={0.7}
            onPress={handleCopyCode}
          >
            <Text style={styles.outlinePillText}>Copy Refer Code</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Share to Social Row ────────────────────────────────────────── */}
        <View style={styles.shareToRow}>
          <Text style={styles.shareToLabel}>Share to</Text>

          <View style={styles.socialIconsRow}>
            {/* WhatsApp */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: "#25D366" }]}
              onPress={handleCopyCode}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Instagram */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: "#E4405F" }]}
              onPress={handleCopyCode}
            >
              <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Facebook */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: "#1877F2" }]}
              onPress={handleCopyCode}
            >
              <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Telegram */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: "#229ED9" }]}
              onPress={handleCopyCode}
            >
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Messenger */}
            <TouchableOpacity
              style={[styles.socialCircle, { backgroundColor: "#0084FF" }]}
              onPress={handleCopyCode}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── "Your invitations" Dashboard Card ──────────────────────────── */}
        <View style={styles.invitationsCard}>
          <Text style={styles.invitationsTitle}>Your invitations</Text>

          <View style={styles.statsRow}>
            {/* Stat 1 */}
            <View style={styles.statCol}>
              <Text style={styles.statVal}>0</Text>
              <Text style={styles.statLabel}>In progress</Text>
            </View>

            {/* Stat 2 */}
            <View style={styles.statCol}>
              <Text style={styles.statVal}>0</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            {/* Stat 3 */}
            <View style={styles.statCol}>
              <View style={styles.earnedValRow}>
                <View style={styles.miniCoin}>
                  <Text style={styles.miniCoinText}>T</Text>
                </View>
                <Text style={styles.statVal}>0 ($0)</Text>
              </View>
              <Text style={styles.statLabel}>Total earned</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Bottom View Details Link */}
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            activeOpacity={0.7}
            onPress={() => setShowDetailsModal(true)}
          >
            <Text style={styles.viewDetailsText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── MODAL: Terms & Conditions ───────────────────────────────────── */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: 10 }}>
              <Text style={styles.tcText}>
                1. **Eligibility**: Existing Trip.com users can invite new users who have not previously made a booking.
              </Text>
              <Text style={styles.tcText}>
                2. **Friend Reward**: Referred friends receive a 20% discount coupon (up to $50 max value) applicable on hotel or flight bookings.
              </Text>
              <Text style={styles.tcText}>
                3. **Referrer Reward**: Referrers receive a $10 cash reward or equivalent Trip Coins upon successful completion of the referred friend's first travel booking.
              </Text>
              <Text style={styles.tcText}>
                4. **Cap**: Users can earn up to $100 per calendar month through referral bonuses.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Invitation Details Drawer ────────────────────────────── */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Invitation Breakdown</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.emptyDetailsState}>
              <Ionicons name="people-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No invitations yet</Text>
              <Text style={styles.emptySub}>
                Share your referral link with friends to start earning up to $100!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowDetailsModal(false);
                setShowShareModal(true);
              }}
            >
              <Text style={styles.doneBtnText}>Invite Friends Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Share Drawer ─────────────────────────────────────────── */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share Referral Link</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.codeBox}>
              <Text style={styles.codeBoxLabel}>Your Referral Code:</Text>
              <Text style={styles.codeBoxVal}>{referralCode}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowShareModal(false);
                handleCopyCode();
              }}
            >
              <Text style={styles.doneBtnText}>Copy Link & Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Toast Notification */
  toastBox: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 999,
    backgroundColor: "#0F172A",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Top Navigation Header */
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  shareHeaderBtn: {
    padding: 4,
  },

  /* Hero Banner */
  heroBanner: {
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  heroTitleBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitleLine1: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  heroTitleLine2Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  heroTitleLine2: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  tcBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#94A3B8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  tcBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  /* 3D Illustration Graphic */
  illustrationContainer: {
    width: 240,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 10,
  },
  phoneGraphicFrame: {
    width: 110,
    height: 160,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#93C5FD",
    backgroundColor: "#FFFFFF",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  phoneScreen: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  giftBoxIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneBtnBar: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3B82F6",
    marginTop: 12,
  },
  goldCoinBadge: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F59E0B",
    borderWidth: 2,
    borderColor: "#FCD34D",
    alignItems: "center",
    justifyContent: "center",
  },
  coinLeft: {
    top: 25,
    right: 48,
  },
  coinRight: {
    bottom: 30,
    left: 45,
  },
  coinSymbol: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  friendAvatarBox: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLeft: {
    left: 10,
    top: 40,
  },
  avatarRight: {
    right: 10,
    top: 35,
  },

  /* Subtitle Description */
  valuePropBox: {
    paddingHorizontal: 24,
    marginVertical: 16,
    alignItems: "center",
  },
  valuePropText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },

  /* Action Buttons */
  actionButtonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 4,
  },
  primaryPillBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryPillText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  outlinePillBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  outlinePillText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Share to Social Row */
  shareToRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  shareToLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
  socialIconsRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Dashboard Card: Your invitations */
  invitationsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    padding: 20,
  },
  invitationsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  earnedValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniCoin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  miniCoinText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  statVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#DBEAFE",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 14,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  tcText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 10,
  },
  emptyDetailsState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  codeBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginVertical: 12,
  },
  codeBoxLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  codeBoxVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 1,
    marginTop: 4,
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
