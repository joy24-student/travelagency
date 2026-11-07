import { FocusAwareStatusBar } from "../components/ui/AppStatusBar";
import React, { useState, useEffect } from 'react';
import { Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Defs, RadialGradient, Stop, LinearGradient, Text as SvgText } from 'react-native-svg';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabase';
import { MysteryBoxModal } from '../components/gamification/MysteryBoxModal';


const TRIP_BLUE = "#0077f5";
const SILVER_TEXT = "#4A6B9E";

export default function RewardsScreen() {
  const { user } = useAuth();
  const [loyaltyAccount, setLoyaltyAccount] = useState<{
    tier: string;
    points_balance: number;
    tier_progress_percentage: number;
    next_tier_threshold: number;
  } | null>(null);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMysteryBoxModal, setShowMysteryBoxModal] = useState(false);

  useEffect(() => {
    async function loadRewards() {
      setLoading(true);
      try {
        if (user?.id) {
          const { data: loyalty } = await supabase
            .from('loyalty_accounts')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          if (loyalty) setLoyaltyAccount(loyalty);
        }

        const { data: promos } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('is_active', true)
          .limit(4);
        if (promos) setPromoCodes(promos);
      } catch (err) {
        console.log('Error loading rewards:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRewards();
  }, [user?.id]);

  const tier = loyaltyAccount?.tier || 'bronze';
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const progressPercent = loyaltyAccount?.tier_progress_percentage || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FocusAwareStatusBar style="dark" backgroundColor="#ffffff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.navRow}>
            <Pressable style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Ionicons name="help-circle-outline" size={24} color="#1e293b" />
            </Pressable>
          </View>

          <View style={styles.tierInfoRow}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.tripDotCom}>Trip.com</Text>
                <View style={styles.rewardsBadge}>
                  <Text style={styles.rewardsBadgeText}>REWARDS</Text>
                </View>
              </View>
              <Text style={styles.tierTitle}>{tierName}</Text>
              <Text style={styles.tierSubtitle}>Your current tier</Text>
            </View>

            {/* Hexagon Badge with Glow */}
            <View style={styles.badgeVisual}>
              <Svg height="120" width="160" style={styles.glowSvg}>
                <Defs>
                  <RadialGradient id="grad" cx="80" cy="60" rx="60" ry="60" fx="80" fy="60" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.15" />
                    <Stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Path d="M20 60 Q80 0 140 60 Q80 120 20 60" fill="url(#grad)" />
              </Svg>

              <View style={styles.hexagonContainer}>
                <Svg width="100" height="50" viewBox="0 0 100 50">
                  <Defs>
                    <LinearGradient id="hexGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                      <Stop offset="1" stopColor="#f0f7ff" stopOpacity="1" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M15 5 L85 5 L95 25 L85 45 L15 45 L5 25 Z"
                    fill="url(#hexGrad)"
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                  <SvgText
                    x="50"
                    y="36"
                    fontSize="32"
                    fontWeight="bold"
                    fill="#4A6B9E"
                    textAnchor="middle"
                  >
                    T
                  </SvgText>
                </Svg>
              </View>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />
            <View style={styles.timelineDotsRow}>
              <TimelineDot label="T" active color="#fff" borderColor={TRIP_BLUE} textColor={TRIP_BLUE} />
              <TimelineDot label="T" color="#C59D5F" />
              <TimelineDot label="T" color="#1B8097" />
              <TimelineDot label="T" color="#7232B3" />
              <TimelineDot label="T" color="#253B80" />
              <TimelineDot label="T" color="#000" />
            </View>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.mainContent}>
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              Complete your bookings to unlock the next VIP tier
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressCount}>{progressPercent}% Progress</Text>
            </View>
          </View>

          {/* Profile Update Banner */}
          <Pressable style={styles.profileBanner}>
            <View style={styles.avatarIconContainer}>
              <Ionicons name="person" size={24} color="#94a3b8" />
              <View style={styles.notificationDot} />
            </View>
            <Text style={styles.profileBannerText}>
              Update your member profile to fully enjoy your benefits
            </Text>
          </Pressable>

          {/* Mystery Travel Box Gamification Banner */}
          <Pressable
            style={styles.mysteryBoxBanner}
            onPress={() => setShowMysteryBoxModal(true)}
          >
            <View style={styles.mysteryBoxBannerLeft}>
              <View style={styles.mysteryBoxIconBubble}>
                <Ionicons name="gift" size={26} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.mysteryBoxBadgeRow}>
                  <Text style={styles.mysteryBoxBadgeText}>DAILY UNBOX</Text>
                  <Text style={styles.mysteryBoxStreakTag}>7-DAY STREAK</Text>
                </View>
                <Text style={styles.mysteryBoxBannerTitle}>
                  Mystery Travel Box
                </Text>
                <Text style={styles.mysteryBoxBannerSub}>
                  Unlock 50% Flight Coupons, Free Hotel Breakfast & Room Upgrades!
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>

          {/* Active Promo Codes & Discounts */}
          <Text style={styles.sectionTitle}>Exclusive promo vouchers</Text>
          {promoCodes.length === 0 ? (
            <View style={styles.emptyCouponBox}>
              <Ionicons name="pricetag-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyCouponTitle}>No active vouchers</Text>
              <Text style={styles.emptyCouponSub}>Check back during promotional campaigns.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponContainer}>
              {promoCodes.map((promo) => (
                <CouponCard
                  key={promo.id}
                  discount={promo.discount_type === "percentage" ? `${promo.discount_amount}% off` : `$${promo.discount_amount} off`}
                  label={promo.code}
                  title={promo.title}
                  category={promo.applicable_category?.toUpperCase() || "PROMO"}
                  showInfo
                />
              ))}
            </ScrollView>
          )}

          {/* Points & Monetary Value Clarity Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>লয়্যালটি পয়েন্ট ও ট্রিপ কয়েন</Text>
            <View style={styles.conversionRatePill}>
              <Ionicons name="information-circle-outline" size={13} color="#0284C7" />
              <Text style={styles.conversionRateText}>১০০ পয়েন্ট = ৳১০</Text>
            </View>
          </View>

          {/* Points Balance Card with Explicit BDT Valuation */}
          <View style={styles.pointsBalanceCard}>
            <View style={styles.pointsCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsBalanceLabel}>মোট সংগৃহীত পয়েন্ট ব্যালেন্স</Text>
                <View style={styles.pointsNumberRow}>
                  <Text style={styles.pointsLargeNumber}>
                    {((loyaltyAccount?.points_balance && loyaltyAccount.points_balance > 0) ? loyaltyAccount.points_balance : 1200).toLocaleString()}
                  </Text>
                  <Text style={styles.pointsUnitText}>পয়েন্ট</Text>
                </View>
                <View style={styles.cashEquivalentRow}>
                  <Text style={styles.cashEquivalentPrefix}>সরাসরি নগদ সমমূল্য:</Text>
                  <Text style={styles.cashEquivalentAmount}>
                    ৳{Math.round(((loyaltyAccount?.points_balance && loyaltyAccount.points_balance > 0) ? loyaltyAccount.points_balance : 1200) * 0.1)}
                  </Text>
                </View>
              </View>

              <View style={styles.coinVisual}>
                <View style={styles.coinGlow} />
                <View style={styles.coinCircle}>
                  <Text style={styles.coinT}>T</Text>
                </View>
              </View>
            </View>

            {/* Clear Exchange Rate Guide */}
            <View style={styles.pointsRateExplainBox}>
              <Ionicons name="sparkles" size={15} color="#D97706" />
              <Text style={styles.pointsRateExplainText}>
                <Text style={{ fontWeight: '700' }}>১০০ পয়েন্ট = ৳১০</Text> (প্রতি ১০ পয়েন্টে ৳১ ক্যাশ সাশ্রয়) • চেকআউটে তাৎক্ষণিক রিডিম করুন
              </Text>
            </View>
          </View>

          {/* EXPIRING SOON ALERT BANNER */}
          <View style={styles.expiryAlertCard}>
            <View style={styles.expiryAlertHeader}>
              <View style={styles.expiryAlertIconBox}>
                <Ionicons name="time" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.expiryBadgeRow}>
                  <Text style={styles.expiryAlertBadge}>মেয়াদ সতর্কতা</Text>
                  <Text style={styles.expiryAlertDays}>১৫ দিন বাকি</Text>
                </View>
                <Text style={styles.expiryAlertTitle}>
                  ৩০০ পয়েন্ট ১৫ দিনে শেষ হয়ে যাবে!
                </Text>
                <Text style={styles.expiryAlertSubtitle}>
                  মেয়াদ শেষ হওয়ার আগে ৩০০ পয়েন্ট (নগদ মূল্য ৳৩০) আপনার পরবর্তী বাস, ট্রেন বা বিমান টিকিট বুকিংয়ে ব্যবহার করে ছাড় নিন।
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.expiryAlertActionBtn}
              onPress={() => router.push('/screens/booking-system')}
            >
              <Text style={styles.expiryAlertActionText}>বুকিংয়ে পয়েন্ট ব্যবহার করুন</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Quick How to Redeem Guide */}
          <View style={styles.howToRedeemCard}>
            <Text style={styles.howToRedeemTitle}>পয়েন্ট ব্যবহারের সহজ ৩টি ধাপ:</Text>
            <View style={styles.stepItemRow}>
              <View style={styles.stepCircleNum}><Text style={styles.stepCircleNumText}>১</Text></View>
              <Text style={styles.stepItemText}>বাস, ট্রেন, ফ্লাইট বা হোটেল পছন্দের পর বুকিং শুরু করুন।</Text>
            </View>
            <View style={styles.stepItemRow}>
              <View style={styles.stepCircleNum}><Text style={styles.stepCircleNumText}>২</Text></View>
              <Text style={styles.stepItemText}>৩য় ধাপে (সারাংশ) "পয়েন্ট ব্যবহার করুন (−৳২৫০)" সুইচটি চালু করুন।</Text>
            </View>
            <View style={styles.stepItemRow}>
              <View style={styles.stepCircleNum}><Text style={styles.stepCircleNumText}>৩</Text></View>
              <Text style={styles.stepItemText}>মোট বিল থেকে সমপরিমাণ অর্থ স্বয়ংক্রিয়ভাবে বাদ যাবে।</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <MysteryBoxModal
        visible={showMysteryBoxModal}
        onClose={() => setShowMysteryBoxModal(false)}
      />
    </SafeAreaView>
  );
}

function TimelineDot({ label, active, color, borderColor, textColor }: any) {
  return (
    <View style={[
      styles.timelineDot,
      { backgroundColor: color },
      borderColor && { borderWidth: 2, borderColor: borderColor }
    ]}>
      <Text style={[styles.timelineDotText, textColor && { color: textColor }]}>{label}</Text>
    </View>
  );
}

function CouponCard({ discount, label, title, category, showInfo }: any) {
  return (
    <View style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <MaterialCommunityIcons name="tag-outline" size={16} color="#ec4899" />
        <Text style={styles.couponTypeText}>{category || "PROMO"}</Text>
        {showInfo && <Ionicons name="information-circle-outline" size={14} color="#cbd5e1" style={{ marginStart: 4 }} />}
      </View>
      <View style={styles.couponBody}>
        <Text style={styles.couponLabel}>{label}</Text>
        <Text style={styles.couponDiscount}>{discount}</Text>
        {title && <Text style={styles.couponTitle} numberOfLines={1}>{title}</Text>}
        <Pressable style={styles.useNowBtn}>
          <Text style={styles.useNowText}>Use Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconButton: {
    padding: 4,
  },
  tierInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  tripDotCom: {
    color: TRIP_BLUE,
    fontWeight: 'bold',
    fontSize: 16,
  },
  rewardsBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  rewardsBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tierTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A6B9E',
    marginBottom: 4,
  },
  tierSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  badgeVisual: {
    width: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowSvg: {
    position: 'absolute',
  },
  hexagonContainer: {
    zIndex: 1,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timelineContainer: {
    marginTop: 40,
    paddingHorizontal: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  timelineLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: '#e2e8f0',
    top: 14,
  },
  timelineDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  timelineDotText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.05)" } : {}),
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  progressBarContainer: {
    gap: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  progressCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  profileBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.05)" } : {}),
    marginBottom: 32,
  },
  avatarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    backgroundColor: '#f97316',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  couponContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  couponCard: {
    width: 175,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.05)" } : {}),
    marginEnd: 12,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  couponTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ec4899',
    marginStart: 6,
  },
  couponBody: {
    alignItems: 'center',
  },
  couponLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  couponDiscount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  couponTitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCouponBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  emptyCouponTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCouponSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  useNowBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#60a5fa',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  useNowText: {
    color: TRIP_BLUE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  multiplierBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  multiplierText: {
    color: TRIP_BLUE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.05)" } : {}),
  },
  rewardCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  coinVisual: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  coinGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fef9c3',
    borderRadius: 30,
    opacity: 0.8,
  },
  coinCircle: {
    width: 40,
    height: 40,
    backgroundColor: '#facc15',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mysteryBoxBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.15)" } : {}),
  },
  mysteryBoxBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginEnd: 10,
  },
  mysteryBoxIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  mysteryBoxBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  mysteryBoxBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  mysteryBoxStreakTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mysteryBoxBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  mysteryBoxBannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 15,
  },
  coinT: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Additional Styles for Points Valuation & Expiry Alerts
  conversionRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  conversionRateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  pointsBalanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.05)" } : {}),
    marginBottom: 16,
  },
  pointsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pointsBalanceLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  pointsNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  pointsLargeNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  pointsUnitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3b82f6',
  },
  cashEquivalentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashEquivalentPrefix: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  cashEquivalentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  pointsRateExplainBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  pointsRateExplainText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 17,
  },
  expiryAlertCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.06)" } : {}),
  },
  expiryAlertHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  expiryAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  expiryAlertBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiryAlertDays: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  expiryAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9a3412',
    marginBottom: 4,
  },
  expiryAlertSubtitle: {
    fontSize: 12,
    color: '#7c2d12',
    lineHeight: 17,
  },
  expiryAlertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  expiryAlertActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  howToRedeemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  howToRedeemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepCircleNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepCircleNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  stepItemText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
});
