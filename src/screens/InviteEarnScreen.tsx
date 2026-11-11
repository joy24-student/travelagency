import React, { useState } from "react";
import { Platform,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export function InviteEarnScreen() {
  const insets = useSafeAreaInsets();

  // State management
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("রেফারেল কোড কপি হয়েছে!");
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const referralCode = "TRIP2026-X89";
  const PRE_WRITTEN_MESSAGE =
    "স্বপ্ন ট্রাভেলের সাথে যেকোনো বাস, ট্রেন বা বিমানে ভ্রমণের টিকিট বুকিংয়ে পান ২০% পর্যন্ত দারুণ ছাড়! এখনই আমার রেফারেল কোড [TRIP2026-X89] ব্যবহার করে সাইন আপ করুন: https://shopnotravel.com/invite?code=TRIP2026-X89";

  const handleCopyCode = () => {
    setToastMessage("রেফারেল কোড [TRIP2026-X89] ক্লিপবোর্ডে কপি হয়েছে!");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const handleCopyPrewrittenMessage = () => {
    setToastMessage("আগে থেকে তৈরি শেয়ার বার্তা কপি হয়েছে!");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const handleSharePrewrittenMessage = async () => {
    try {
      await Share.share({
        message: PRE_WRITTEN_MESSAGE,
        title: "স্বপ্ন ট্রাভেলে ২০% ছাড় ও রেফারেল বোনাস",
      });
    } catch (e) {
      handleCopyPrewrittenMessage();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastBox}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.toastText}>{toastMessage}</Text>
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
              onPress={handleSharePrewrittenMessage}
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
              onPress={handleSharePrewrittenMessage}
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
              onPress={handleSharePrewrittenMessage}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── PRE-WRITTEN SHARE MESSAGE CARD ──────────────────────────── */}
        <View style={styles.prewrittenCard}>
          <View style={styles.prewrittenHeaderRow}>
            <View style={styles.prewrittenIconBubble}>
              <Ionicons name="chatbubbles" size={18} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prewrittenTitle}>আগে থেকে তৈরি শেয়ার বার্তা</Text>
              <Text style={styles.prewrittenSubtitle}>বন্ধুদের পাঠাতে এক ট্যাপে কপি বা সরাসরি শেয়ার করুন</Text>
            </View>
          </View>

          <View style={styles.quoteBubble}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color="#94A3B8" style={{ marginBottom: 4 }} />
            <Text style={styles.quoteText}>{PRE_WRITTEN_MESSAGE}</Text>
          </View>

          <View style={styles.messageActionButtonsRow}>
            <TouchableOpacity
              style={styles.copyMessageBtn}
              activeOpacity={0.8}
              onPress={handleCopyPrewrittenMessage}
            >
              <Ionicons name="copy-outline" size={16} color="#0284C7" />
              <Text style={styles.copyMessageBtnText}>বার্তা কপি করুন</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareDirectBtn}
              activeOpacity={0.88}
              onPress={handleSharePrewrittenMessage}
            >
              <Ionicons name="share-social" size={16} color="#FFFFFF" />
              <Text style={styles.shareDirectBtnText}>সরাসরি শেয়ার</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── PROGRESS SUMMARY BANNER ("৩ জন আমন্ত্রিত · ১ জন যোগ দিয়েছে · ৳১০০ পেয়েছেন") ── */}
        <View style={styles.invitationsCard}>
          <View style={styles.invitationsHeaderRow}>
            <Text style={styles.invitationsTitle}>ইনভাইট-এন্ড-আর্ন অগ্রগতি</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>লাইভ ট্র্যাকিং</Text>
            </View>
          </View>

          {/* Highlight Badge: ৩ জন আমন্ত্রিত · ১ জন যোগ দিয়েছে · ৳১০০ পেয়েছেন */}
          <View style={styles.summaryHighlightPill}>
            <Ionicons name="sparkles" size={16} color="#10B981" />
            <Text style={styles.summaryHighlightText}>
              ৩ জন আমন্ত্রিত · ১ জন যোগ দিয়েছে · ৳১০০ পেয়েছেন
            </Text>
          </View>

          <View style={styles.statsRow}>
            {/* Stat 1 */}
            <View style={styles.statCol}>
              <Text style={styles.statVal}>৩</Text>
              <Text style={styles.statLabel}>আমন্ত্রিত</Text>
            </View>

            {/* Stat 2 */}
            <View style={styles.statCol}>
              <Text style={styles.statVal}>১</Text>
              <Text style={styles.statLabel}>যোগ দিয়েছে</Text>
            </View>

            {/* Stat 3 */}
            <View style={styles.statCol}>
              <View style={styles.earnedValRow}>
                <View style={styles.miniCoin}>
                  <Text style={styles.miniCoinText}>৳</Text>
                </View>
                <Text style={styles.statVal}>৳১০০</Text>
              </View>
              <Text style={styles.statLabel}>অর্জিত পুরস্কার</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Detailed Friend Tracker List */}
          <Text style={styles.trackerListHeading}>আমন্ত্রিত বন্ধুদের তালিকা ও পুরস্কার প্রাপ্তির সময়সূচী:</Text>

          {/* Friend 1: Completed & Earned */}
          <View style={styles.friendTrackerCard}>
            <View style={styles.friendTopRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendNameText}>রাকিব হাসান</Text>
                <Text style={styles.friendPhoneText}>+880 1712-***456</Text>
              </View>
              <View style={styles.rewardSuccessBadge}>
                <Text style={styles.rewardSuccessBadgeText}>৳১০০ পেয়েছেন ✓</Text>
              </View>
            </View>
            <View style={styles.stepTrackRow}>
              <Text style={styles.stepTrackPillDone}>ইনস্টল ✓</Text>
              <Ionicons name="arrow-forward" size={11} color="#10B981" />
              <Text style={styles.stepTrackPillDone}>যোগ দিয়েছে ✓</Text>
              <Ionicons name="arrow-forward" size={11} color="#10B981" />
              <Text style={styles.stepTrackPillDone}>১ম ট্রিপ সম্পন্ন ✓</Text>
            </View>
            <Text style={styles.rewardDetailStatusSuccess}>
              ✓ বন্ধু ১ম ট্রিপ সম্পন্ন করেছেন। ৳১০০ ক্যাশ পুরস্কার আপনার ওয়ালেটে ক্রেডিট হয়েছে।
            </Text>
          </View>

          {/* Friend 2: Installed, Waiting for First Booking */}
          <View style={styles.friendTrackerCard}>
            <View style={styles.friendTopRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="time" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendNameText}>সুমাইয়া আক্তার</Text>
                <Text style={styles.friendPhoneText}>+880 1823-***789</Text>
              </View>
              <View style={styles.rewardPendingBadge}>
                <Text style={styles.rewardPendingBadgeText}>৳১০০ অপেক্ষমান</Text>
              </View>
            </View>
            <View style={styles.stepTrackRow}>
              <Text style={styles.stepTrackPillDone}>ইনস্টল ✓</Text>
              <Ionicons name="arrow-forward" size={11} color="#10B981" />
              <Text style={styles.stepTrackPillDone}>যোগ দিয়েছে ✓</Text>
              <Ionicons name="arrow-forward" size={11} color="#94A3B8" />
              <Text style={styles.stepTrackPillPending}>১ম বুকিং বাকি ⏳</Text>
            </View>
            <Text style={styles.rewardDetailStatusPending}>
              ⏳ পুরস্কার কবে মিলবে: বন্ধু অ্যাপ ইনস্টল করেছেন। তিনি তার ১ম ভ্রমণ বুকিং সম্পন্ন করলেই সাথে সাথে ৳১০০ আপনার ওয়ালেটে জমা হবে।
            </Text>
          </View>

          {/* Friend 3: Invited, Not installed yet */}
          <View style={styles.friendTrackerCard}>
            <View style={styles.friendTopRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="paper-plane" size={18} color="#64748B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendNameText}>তানভীর আহমেদ</Text>
                <Text style={styles.friendPhoneText}>+880 1911-***321</Text>
              </View>
              <View style={styles.rewardInvitedBadge}>
                <Text style={styles.rewardInvitedBadgeText}>আমন্ত্রণ পাঠানো</Text>
              </View>
            </View>
            <View style={styles.stepTrackRow}>
              <Text style={styles.stepTrackPillDone}>লিংক পাঠানো ✓</Text>
              <Ionicons name="arrow-forward" size={11} color="#94A3B8" />
              <Text style={styles.stepTrackPillPending}>ইনস্টল অপেক্ষমান</Text>
              <Ionicons name="arrow-forward" size={11} color="#94A3B8" />
              <Text style={styles.stepTrackPillPending}>বুকিং অপেক্ষমান</Text>
            </View>
            <Text style={styles.rewardDetailStatusInvited}>
              ℹ️ পুরস্কার কবে মিলবে: বন্ধু আপনার রেফারেল লিংক দিয়ে অ্যাপ ইনস্টল করে প্রথম বুকিং করলেই ৳১০০ রিওয়ার্ড আনলক হবে।
            </Text>
          </View>

          {/* Bottom View Details Link */}
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            activeOpacity={0.7}
            onPress={() => setShowDetailsModal(true)}
          >
            <Text style={styles.viewDetailsText}>সম্পূর্ণ বিবরণী ও শর্তাবলী দেখুন</Text>
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

            <ScrollView style={{ maxHeight: 380, marginVertical: 10 }} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryHighlightPill}>
                <Ionicons name="sparkles" size={16} color="#10B981" />
                <Text style={styles.summaryHighlightText}>
                  ৩ জন আমন্ত্রিত · ১ জন যোগ দিয়েছে · ৳১০০ পেয়েছেন
                </Text>
              </View>

              <View style={styles.friendTrackerCard}>
                <View style={styles.friendTopRow}>
                  <View style={[styles.statusIconWrap, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendNameText}>রাকিব হাসান (০১৭১২...)</Text>
                    <Text style={styles.friendPhoneText}>অবস্থা: ১ম ট্রিপ সম্পন্ন</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>+৳১০০ অর্জিত</Text>
                </View>
                <Text style={styles.rewardDetailStatusSuccess}>
                  ✓ বন্ধু প্রথম ট্রিপ সফলভাবে সম্পন্ন করায় ৳১০০ আপনার ওয়ালেটে যুক্ত হয়েছে।
                </Text>
              </View>

              <View style={styles.friendTrackerCard}>
                <View style={styles.friendTopRow}>
                  <View style={[styles.statusIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="time" size={18} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendNameText}>সুমাইয়া আক্তার (০১৮২৩...)</Text>
                    <Text style={styles.friendPhoneText}>অবস্থা: ইনস্টল ও সাইন-আপ সম্পন্ন</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>৳১০০ অপেক্ষমান</Text>
                </View>
                <Text style={styles.rewardDetailStatusPending}>
                  ⏳ বন্ধু ১ম বুকিং সম্পন্ন করলেই সাথে সাথে ৳১০০ ওয়ালেটে পাবেন।
                </Text>
              </View>

              <View style={styles.friendTrackerCard}>
                <View style={styles.friendTopRow}>
                  <View style={[styles.statusIconWrap, { backgroundColor: "#F1F5F9" }]}>
                    <Ionicons name="paper-plane" size={18} color="#64748B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendNameText}>তানভীর আহমেদ (০১৯১১...)</Text>
                    <Text style={styles.friendPhoneText}>অবস্থা: আমন্ত্রণ পাঠানো হয়েছে</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>আমন্ত্রিত</Text>
                </View>
                <Text style={styles.rewardDetailStatusInvited}>
                  ℹ️ বন্ধু অ্যাপ ইনস্টল ও ১ম টিকিট বুকিং করলেই ৳১০০ মিলবে।
                </Text>
              </View>
            </ScrollView>

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
              <Text style={styles.codeBoxLabel}>আপনার রেফারেল কোড:</Text>
              <Text style={styles.codeBoxVal}>{referralCode}</Text>
            </View>

            <View style={[styles.quoteBubble, { marginVertical: 10 }]}>
              <Text style={styles.quoteText}>{PRE_WRITTEN_MESSAGE}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.doneBtn, { flex: 1, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }]}
                onPress={() => {
                  setShowShareModal(false);
                  handleCopyPrewrittenMessage();
                }}
              >
                <Text style={[styles.doneBtnText, { color: '#0284C7' }]}>বার্তা কপি</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.doneBtn, { flex: 1 }]}
                onPress={() => {
                  setShowShareModal(false);
                  handleSharePrewrittenMessage();
                }}
              >
                <Text style={styles.doneBtnText}>সরাসরি শেয়ার</Text>
              </TouchableOpacity>
            </View>
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.2)" } : {}),
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
    fontSize: 12,
    fontWeight: "700",
  },

  /* 3D Illustration Graphic */
  illustrationContainer: {
    width: 240,
    minHeight: 180,
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.1)" } : {}),
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
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.25)" } : {}),
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
    fontSize: 12,
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
  // Additional Styles for Invite & Earn Progress & Prewritten Message
  prewrittenCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  prewrittenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  prewrittenIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prewrittenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  prewrittenSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  quoteBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  messageActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  copyMessageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  copyMessageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  shareDirectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  shareDirectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  invitationsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  summaryHighlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
  },
  summaryHighlightText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    flex: 1,
  },
  trackerListHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  friendTrackerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendPhoneText: {
    fontSize: 11,
    color: '#64748B',
  },
  rewardSuccessBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardSuccessBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  rewardPendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardPendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  rewardInvitedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardInvitedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  stepTrackPillDone: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepTrackPillPending: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardDetailStatusSuccess: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 16,
    fontWeight: '500',
  },
  rewardDetailStatusPending: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    fontWeight: '500',
  },
  rewardDetailStatusInvited: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
});
