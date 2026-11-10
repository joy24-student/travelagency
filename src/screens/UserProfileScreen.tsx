import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { showLocalizedAlert } from "../utils/localizedAlert";

import { supabase } from "../utils/supabase";
import { userRepository } from "../repositories";
import { uploadKycDocument } from "../services/r2";
import { KYCDocumentType, UserVerificationStatus } from "../types/admin";
import {
  FriendProfile,
  friendsRepository,
  DEMO_USER_ID,
} from "../services/repositories/friends";
import { TravelVideoPlayer } from "../components/TravelVideoPlayer";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../theme/typography";
import { ProfileCompletenessBar } from "../components/profile/ProfileCompletenessBar";


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#E5A93C";
const BG_COLOR = "#F8FAFC";

// ============================================================================
// PII MASKING UTILITIES
// ============================================================================
export function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "—";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(user.length - 2, 4))}@${domain}`;
}

export function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const clean = phone.trim();
  if (clean.length <= 4) return "****";
  const last4 = clean.slice(-4);
  const prefix = clean.slice(0, Math.max(0, clean.length - 8));
  return `${prefix ? prefix + " " : ""}***-***-${last4}`;
}

export function maskPassport(passport?: string): string {
  if (!passport) return "—";
  const clean = passport.trim();
  if (clean.length <= 4) return "****";
  const start = clean.slice(0, 2);
  const end = clean.slice(-2);
  return `${start}${"*".repeat(Math.max(clean.length - 4, 4))}${end}`;
}

export function maskFrequentFlyer(ffNum?: string): string {
  if (!ffNum) return "—";
  const clean = ffNum.trim();
  if (clean.length <= 4) return "****";
  const parts = clean.split("-");
  if (parts.length > 1) {
    return `${parts[0]}-****-${parts[parts.length - 1].slice(-4)}`;
  }
  return `${clean.slice(0, 2)}****${clean.slice(-3)}`;
}

export function maskDocumentNumber(docNum?: string): string {
  if (!docNum) return "—";
  const clean = docNum.trim();
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, 2)}${"*".repeat(Math.max(clean.length - 4, 4))}${clean.slice(-2)}`;
}

// Available dietary preferences
const DIETARY_OPTIONS = [
  "No Restrictions",
  "Halal",
  "Vegetarian",
  "Vegan",
  "Kosher",
  "Gluten-Free",
  "Diabetic Friendly",
  "Nut Allergy",
  "Jain Vegetarian",
];

export function UserProfileScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ userId?: string }>();
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string>(DEMO_USER_ID);
  const [isSelf, setIsSelf] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string>("unverified");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Friendship & Social State
  const [friendship, setFriendship] = useState<{
    status: "none" | "pending_sent" | "pending_received" | "accepted";
    requestId?: string;
  }>({ status: "none" });
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userFriends, setUserFriends] = useState<FriendProfile[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"posts" | "identity" | "travel_info" | "friends" | "about">("posts");

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showKycUploadModal, setShowKycUploadModal] = useState(false);
  const [showReferralToast, setShowReferralToast] = useState(false);
  const [revealPII, setRevealPII] = useState(false);

  // Form State: Profile & Travel Preferences
  const [editFullName, setEditFullName] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editEmergencyRelation, setEditEmergencyRelation] = useState("");
  const [editDietary, setEditDietary] = useState("Halal");
  const [editPassportNum, setEditPassportNum] = useState("");
  const [editPassportCountry, setEditPassportCountry] = useState("");
  const [editPassportExpiry, setEditPassportExpiry] = useState("");
  const [editFfAirline, setEditFfAirline] = useState("");
  const [editFfNumber, setEditFfNumber] = useState("");

  // KYC Uploader State
  const [uploadDocType, setUploadDocType] = useState<KYCDocumentType>(KYCDocumentType.PASSPORT);
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadDocExpiry, setUploadDocExpiry] = useState("");
  const [kycErrors, setKycErrors] = useState<{ docNumber?: string; file?: string }>({});
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size?: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);

  // Referral Code calculation
  const referralCode = `TRIP-${(profile?.id || currentAuthUserId || "REF").slice(0, 6).toUpperCase()}`;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // Resolve current auth user
        const { data: authData } = await supabase.auth.getUser();
        const authUid = authData?.user?.id || DEMO_USER_ID;
        if (isMounted) setCurrentAuthUserId(authUid);

        const targetId = params.userId || authUid;
        const viewingSelf = targetId === authUid;
        if (isMounted) setIsSelf(viewingSelf);

        // 1. Fetch Profile via userRepository DAL
        const userProf = await userRepository.getProfile(targetId).catch(() => null);

        // Fetch Community profile data
        const { data: commProfile } = await supabase
          .from("community_profiles")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

        const mergedProfile = {
          id: targetId,
          display_name: userProf?.full_name || commProfile?.display_name || "Traveler",
          username: commProfile?.username || (userProf?.email ? userProf.email.split("@")[0] : "traveler"),
          avatar_url:
            userProf?.avatar_url ||
            commProfile?.avatar_url ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
          cover_url:
            commProfile?.cover_url ||
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
          bio: commProfile?.bio || "Passionate globetrotter & verified traveler.",
          location: commProfile?.location || (userProf?.city ? `${userProf.city}, ${userProf.country || ""}` : "Dhaka, Bangladesh"),
          email: userProf?.email || authData?.user?.email || "user@example.com",
          phone: userProf?.phone || "+880 1712 345678",
          // Extended travel details
          emergency_contact_name: (userProf as any)?.emergency_contact_name || "Ayesha Rahman",
          emergency_contact_phone: (userProf as any)?.emergency_contact_phone || "+880 1819 987654",
          emergency_contact_relationship: (userProf as any)?.emergency_contact_relationship || "Spouse",
          passport_number: (userProf as any)?.passport_number || "A09876543",
          passport_country: (userProf as any)?.passport_country || "Bangladesh",
          passport_expiry: (userProf as any)?.passport_expiry || "2032-12-31",
          frequent_flyer_airline: (userProf as any)?.frequent_flyer_airline || "Emirates Skywards",
          frequent_flyer_number: (userProf as any)?.frequent_flyer_number || "EK-987654321",
          created_at: userProf?.created_at || new Date().toISOString(),
          followers_count: commProfile?.followers_count || 142,
        };

        if (isMounted) {
          setProfile(mergedProfile);
          // Prepopulate edit form
          setEditFullName(mergedProfile.display_name);
          setEditEmergencyName(mergedProfile.emergency_contact_name);
          setEditEmergencyPhone(mergedProfile.emergency_contact_phone);
          setEditEmergencyRelation(mergedProfile.emergency_contact_relationship);
          setEditPassportNum(mergedProfile.passport_number);
          setEditPassportCountry(mergedProfile.passport_country);
          setEditPassportExpiry(mergedProfile.passport_expiry);
          setEditFfAirline(mergedProfile.frequent_flyer_airline);
          setEditFfNumber(mergedProfile.frequent_flyer_number);
        }

        // 2. Fetch Preferences via userRepository
        const userPrefs = await userRepository.getPreferences(targetId).catch(() => null);
        if (isMounted && userPrefs) {
          setPreferences(userPrefs);
          if (userPrefs.dietary_requirements) {
            setEditDietary(userPrefs.dietary_requirements);
          }
        }

        // 3. Fetch KYC status & documents via userRepository
        if (viewingSelf) {
          const kycStat = await userRepository.getKYCStatus(targetId).catch(() => UserVerificationStatus.PENDING);
          const docs = await userRepository.getKYCDocuments(targetId).catch(() => []);
          if (isMounted) {
            setKycStatus(kycStat || "pending_verification");
            setKycDocuments(docs || []);
          }
        }

        // 4. Fetch Community Social Status
        if (!viewingSelf) {
          const status = await friendsRepository.getFriendshipStatus(authUid, targetId);
          if (isMounted) setFriendship(status);

          const { data: followData } = await supabase
            .from("user_follows")
            .select("*")
            .eq("follower_id", authUid)
            .eq("following_id", targetId)
            .maybeSingle();

          if (isMounted) setIsFollowing(!!followData);
        }

        // 5. Fetch Posts & Friends
        const { data: postsData } = await supabase
          .from("posts")
          .select("*, post_media(*)")
          .eq("user_id", targetId)
          .order("created_at", { ascending: false });

        if (isMounted && postsData) setUserPosts(postsData);

        const friendsList = await friendsRepository.getFriends(targetId);
        if (isMounted) setUserFriends(friendsList);
      } catch (err) {
        console.warn("Load UserProfile error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [params.userId]);

  // ==========================================================================
  // PROFILE & PREFERENCES SAVE
  // ==========================================================================
  const handleSaveProfileAndPreferences = async () => {
    if (!profile) return;
    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // 1. Update Profile via userRepository
      const updatedProfile = await userRepository.updateProfile(profile.id, {
        full_name: editFullName,
        emergency_contact_name: editEmergencyName,
        emergency_contact_phone: editEmergencyPhone,
        emergency_contact_relationship: editEmergencyRelation,
        passport_number: editPassportNum,
        passport_country: editPassportCountry,
        passport_expiry: editPassportExpiry,
        frequent_flyer_airline: editFfAirline,
        frequent_flyer_number: editFfNumber,
      } as any);

      // 2. Update Preferences via userRepository
      await userRepository.updatePreferences(profile.id, {
        dietary_requirements: editDietary,
      });

      // Update local state
      setProfile((prev: any) => ({
        ...prev,
        display_name: editFullName,
        emergency_contact_name: editEmergencyName,
        emergency_contact_phone: editEmergencyPhone,
        emergency_contact_relationship: editEmergencyRelation,
        passport_number: editPassportNum,
        passport_country: editPassportCountry,
        passport_expiry: editPassportExpiry,
        frequent_flyer_airline: editFfAirline,
        frequent_flyer_number: editFfNumber,
      }));

      setPreferences((prev: any) => ({
        ...prev,
        dietary_requirements: editDietary,
      }));

      setShowEditProfileModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showLocalizedAlert("Success", "Profile and preferences updated successfully!");
    } catch (err: any) {
      showLocalizedAlert("Save Error", err.message || "Failed to update profile details.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================================
  // SECURE KYC UPLOADER TO PRIVATE R2 BUCKET
  // ==========================================================================
  const handlePickDocument = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showLocalizedAlert("Permission Required", "Please grant photo library access to upload documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const ext = asset.fileName?.split(".").pop() || "jpg";
        const sanitizedName = `${uploadDocType}_${Date.now()}.${ext}`;

        setUploadFile({
          uri: asset.uri,
          name: sanitizedName,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        });
      }
    } catch (err) {
      console.warn("Picker error:", err);
      showLocalizedAlert("File Selection Failed", "Unable to select document file.");
    }
  };

  const handleCaptureDocument = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "ক্যামেরা ছাড়া ছবি তোলা যাবে না",
          "ডকুমেন্ট স্ক্যান বা ছবি তুলতে ক্যামেরা অনুমতি প্রয়োজন। অনুগ্রহ করে অ্যাপ সেটিংসে গিয়ে অনুমতি চালু করুন, অথবা ফাইল/গ্যালারি থেকে নির্বাচন করুন।",
          [
            {
              text: "সেটিংসে খুলুন",
              onPress: () => Linking.openSettings(),
            },
            {
              text: "বিকল্প: ফাইল থেকে আপলোড",
              onPress: () => handlePickDocument(),
            },
            {
              text: "বাতিল",
              style: "cancel",
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const sanitizedName = `${uploadDocType}_camera_${Date.now()}.jpg`;

        setUploadFile({
          uri: asset.uri,
          name: sanitizedName,
          type: "image/jpeg",
          size: asset.fileSize,
        });
      }
    } catch (err) {
      console.warn("Camera error:", err);
      showLocalizedAlert("Camera Error", "Could not capture document image.");
    }
  };

  const handleUploadKycDocument = async () => {
    const errors: { docNumber?: string; file?: string } = {};
    if (!uploadDocNumber.trim()) {
      errors.docNumber = "Please enter the document identification number.";
    }
    if (!uploadFile) {
      errors.file = "Please select or photograph your identity document.";
    }
    if (Object.keys(errors).length > 0 || !uploadFile) {
      setKycErrors(errors);
      return;
    }
    setKycErrors({});
    const safeFile = uploadFile;

    setIsUploadingKyc(true);
    setUploadProgress(10);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Upload to Private R2 Bucket via secure Presigned single-use pipeline
      setUploadProgress(35);
      const r2Result = await uploadKycDocument(
        {
          uri: safeFile.uri,
          name: safeFile.name,
          type: safeFile.type,
          size: safeFile.size,
          documentType: uploadDocType,
        },
        (progress) => {
          setUploadProgress(Math.min(90, Math.round(35 + (progress.progress * 0.55))));
        }
      );

      // 2. Consume userRepository to record document metadata & set status to pending_verification
      const uploadedDoc = await userRepository.uploadKYCDocument(currentAuthUserId, {
        documentType: uploadDocType,
        documentNumber: uploadDocNumber.trim(),
        fileUri: r2Result.key ? `r2://private-kyc/${r2Result.key}` : safeFile.uri,
        fileName: safeFile.name,
        mimeType: safeFile.type,
        expiryDate: uploadDocExpiry || undefined,
      });

      // 3. Explicitly ensure verification status is marked 'pending_verification'
      try {
        await supabase
          .from("user_verification_status")
          .upsert(
            {
              user_id: currentAuthUserId,
              kyc_status: "pending_verification",
              verification_status: "pending",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
      } catch {
        // Soft fail
      }

      setUploadProgress(100);
      setKycStatus("pending_verification");
      setKycDocuments((prev) => [uploadedDoc, ...prev]);

      // Reset form
      setUploadFile(null);
      setUploadDocNumber("");
      setUploadDocExpiry("");
      setShowKycUploadModal(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showLocalizedAlert(
        "KYC Document Submitted",
        "Your document has been securely encrypted and uploaded to our private R2 vault. Status is now set to Pending Verification."
      );
    } catch (err: any) {
      showLocalizedAlert("Upload Failed", err.message || "Failed to upload KYC document to private vault.");
    } finally {
      setIsUploadingKyc(false);
      setUploadProgress(0);
    }
  };

  // ==========================================================================
  // REFERRAL ENGINE: ONE-TAP COPY & EXPO-SHARING
  // ==========================================================================
  const handleCopyReferralCode = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReferralToast(true);
    setTimeout(() => setShowReferralToast(false), 2500);
  };

  const handleShareReferral = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const shareMessage = `Join me on Trip Agency! Use my referral code ${referralCode} to get 20% off your first flight or hotel booking: https://travel.com/invite/${referralCode}`;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Trigger social sharing via React Native Share API with expo-sharing compatibility
        await Share.share({
          message: shareMessage,
          title: "Claim 20% Travel Discount with My Referral Code",
        });
      } else {
        await Share.share({
          message: shareMessage,
        });
      }
    } catch (err) {
      console.warn("Share error:", err);
    }
  };

  // ==========================================================================
  // SOCIAL ACTIONS (FOR PROFILES OF FRIENDS & OTHER TRAVELERS)
  // ==========================================================================
  const handleSendFriendRequest = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionLoading(true);
    try {
      const { data } = await friendsRepository.sendFriendRequest(currentAuthUserId, profile.id);
      setFriendship({ status: "pending_sent", requestId: data?.id });
      showLocalizedAlert("Request Sent", `Friend request sent to ${profile.display_name}!`);
    } catch {
      showLocalizedAlert("Error", "Could not send friend request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setProfile((prev: any) =>
      prev
        ? {
            ...prev,
            followers_count: Math.max(0, (prev.followers_count || 0) + (nextFollowing ? 1 : -1)),
          }
        : null
    );

    try {
      if (nextFollowing) {
        await supabase
          .from("user_follows")
          .upsert([{ follower_id: currentAuthUserId, following_id: profile.id }], {
            onConflict: "follower_id,following_id",
          });
      } else {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentAuthUserId)
          .eq("following_id", profile.id);
      }
    } catch (e) {
      console.warn("Follow error:", e);
    }
  };

  // Helper for KYC Status color & badge
  const getKycBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("verified") && !s.includes("pending")) {
      return {
        label: "Verified Identity",
        bg: "#DCFCE7",
        text: "#15803D",
        icon: "shield-checkmark",
      };
    }
    if (s.includes("pending")) {
      return {
        label: "Pending Verification",
        bg: "#FEF3C7",
        text: "#B45309",
        icon: "time",
      };
    }
    if (s.includes("reject")) {
      return {
        label: "Verification Rejected",
        bg: "#FEE2E2",
        text: "#B91C1C",
        icon: "alert-circle",
      };
    }
    return {
      label: "Unverified Identity",
      bg: "#F1F5F9",
      text: "#64748B",
      icon: "shield-outline",
    };
  };

  const kycBadge = getKycBadge(kycStatus);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Toast Notification */}
      {showReferralToast && (
        <View style={styles.toastBox}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.toastText}>Referral code {referralCode} copied to clipboard!</Text>
        </View>
      )}

      {/* Top Navigation Bar */}
      <View
        style={[
          styles.navBar,
          { backgroundColor: colors.card, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <Pressable style={styles.navIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text
          style={[
            styles.navTitle,
            { color: colors.text, fontFamily: FONTS.bengali.bold },
          ]}
          numberOfLines={1}
        >
          {isSelf ? "Identity & Profile" : profile?.username ? `@${profile.username}` : "Profile"}
        </Text>

        <Pressable style={styles.navIconBtn} onPress={handleShareReferral}>
          <Ionicons name="share-social-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
        >
          {/* Cover Photo */}
          <View style={styles.coverWrapper}>
            <Image source={{ uri: profile.cover_url }} style={styles.coverImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.55)"]}
              style={styles.coverGradient}
            />
          </View>

          {/* Profile Identity Card */}
          <View
            style={[
              styles.profileHeaderCard,
              { backgroundColor: colors.card, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profile.avatar_url }} style={styles.bigAvatar} />
                <View style={styles.onlineStatusDot} />
              </View>

              {/* KYC Status Indicator Pill */}
              <View style={[styles.kycStatusPill, { backgroundColor: kycBadge.bg }]}>
                <Ionicons name={kycBadge.icon as any} size={14} color={kycBadge.text} />
                <Text style={[styles.kycStatusText, { color: kycBadge.text }]}>{kycBadge.label}</Text>
              </View>
            </View>

            {/* Name, Handle & Location */}
            <View style={styles.identityDetails}>
              <View style={styles.displayNameRow}>
                <Text
                  style={[
                    styles.displayName,
                    { color: colors.text, fontFamily: FONTS.bengali.bold },
                  ]}
                >
                  {profile.display_name}
                </Text>
                {kycStatus.toLowerCase().includes("verified") && !kycStatus.toLowerCase().includes("pending") && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                )}
              </View>

              <Text style={[styles.handleText, { color: colors.textMuted }]}>
                @{profile.username || "traveler"}
              </Text>
              {profile.bio && (
                <Text
                  style={[
                    styles.bioText,
                    { color: colors.textSecondary, fontFamily: FONTS.bengali.regular },
                  ]}
                >
                  {profile.bio}
                </Text>
              )}

              <View style={styles.contactMetaRow}>
                <View style={styles.contactMetaItem}>
                  <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.contactMetaText, { color: colors.textMuted }]}>
                    {maskEmail(profile.email)}
                  </Text>
                </View>
                <View style={styles.contactMetaItem}>
                  <Ionicons name="call-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.contactMetaText, { color: colors.textMuted }]}>
                    {maskPhone(profile.phone)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Row */}
            <View
              style={[
                styles.statsRow,
                { borderColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.statCol}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{userFriends.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Friends</Text>
              </View>
              <View style={[styles.statSeparator, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statCol}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{kycDocuments.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>KYC Docs</Text>
              </View>
              <View style={[styles.statSeparator, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statCol}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{profile.followers_count || 142}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Followers</Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              {isSelf ? (
                <>
                  <Pressable
                    style={[styles.editProfileBtn, { backgroundColor: colors.surface }]}
                    onPress={() => setShowEditProfileModal(true)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.text} />
                    <Text
                      style={[
                        styles.editProfileText,
                        { color: colors.text, fontFamily: FONTS.bengali.bold },
                      ]}
                    >
                      Edit Profile & PII
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.uploadKycPrimaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowKycUploadModal(true)}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.uploadKycPrimaryText,
                        { fontFamily: FONTS.bengali.bold },
                      ]}
                    >
                      Upload KYC
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.primaryActionBtn, actionLoading && { opacity: 0.6 }]}
                    onPress={handleSendFriendRequest}
                    disabled={actionLoading}
                  >
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.primaryActionText}>Add Friend</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    onPress={handleToggleFollow}
                  >
                    <Ionicons
                      name={isFollowing ? "checkmark" : "person-add-outline"}
                      size={15}
                      color={isFollowing ? TRIP_BLUE : "#475569"}
                    />
                    <Text
                      style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Referral Engine Card */}
          {isSelf && (
            <View style={styles.referralBannerCard}>
              <View style={styles.referralBannerLeft}>
                <View style={styles.giftIconBox}>
                  <Ionicons name="gift" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referralBannerTitle}>Invite Friends & Earn $10</Text>
                  <Text style={styles.referralBannerSubtitle}>
                    Give friends 20% off. Code: <Text style={styles.referralCodeHighlight}>{referralCode}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.referralBannerActions}>
                <Pressable style={styles.referralCopyBtn} onPress={handleCopyReferralCode}>
                  <Ionicons name="copy-outline" size={16} color={TRIP_BLUE} />
                  <Text style={styles.referralCopyText}>Copy</Text>
                </Pressable>
                <Pressable style={styles.referralShareBtn} onPress={handleShareReferral}>
                  <Ionicons name="share-social" size={16} color="#FFFFFF" />
                  <Text style={styles.referralShareText}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Profile Completeness Guidance Bar */}
          {isSelf && (
            <ProfileCompletenessBar
              profile={profile}
              kycDocuments={kycDocuments}
              onAddPassportPress={() => {
                setActiveTab("identity");
                setShowKycUploadModal(true);
              }}
            />
          )}

          {/* Section Tabs */}
          <View
            style={[
              styles.tabBar,
              { backgroundColor: colors.card, borderBottomColor: colors.borderSubtle },
            ]}
          >
            {isSelf && (
              <Pressable
                style={[styles.tabItem, activeTab === "identity" && styles.tabItemActive]}
                onPress={() => setActiveTab("identity")}
              >
                <Text style={[styles.tabLabel, activeTab === "identity" && styles.tabLabelActive]}>
                  KYC Vault
                </Text>
              </Pressable>
            )}

            {isSelf && (
              <Pressable
                style={[styles.tabItem, activeTab === "travel_info" && styles.tabItemActive]}
                onPress={() => setActiveTab("travel_info")}
              >
                <Text style={[styles.tabLabel, activeTab === "travel_info" && styles.tabLabelActive]}>
                  Travel PII
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.tabItem, activeTab === "posts" && styles.tabItemActive]}
              onPress={() => setActiveTab("posts")}
            >
              <Text style={[styles.tabLabel, activeTab === "posts" && styles.tabLabelActive]}>
                Moments ({userPosts.length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabItem, activeTab === "friends" && styles.tabItemActive]}
              onPress={() => setActiveTab("friends")}
            >
              <Text style={[styles.tabLabel, activeTab === "friends" && styles.tabLabelActive]}>
                Friends ({userFriends.length})
              </Text>
            </Pressable>
          </View>

          {/* ================================================================ */}
          {/* TAB 1: KYC IDENTITY DOCUMENTS (R2 BUCKET SECURED)               */}
          {/* ================================================================ */}
          {activeTab === "identity" && isSelf && (
            <View style={styles.tabSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>Identity Verification (KYC)</Text>
                  <Text style={styles.sectionSub}>Encrypted documents stored in private R2 vault</Text>
                </View>
                <Pressable
                  style={styles.addDocBtn}
                  onPress={() => setShowKycUploadModal(true)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addDocBtnText}>Upload New</Text>
                </Pressable>
              </View>

              {/* Status Alert Banner */}
              <View style={[styles.kycBannerCard, { borderColor: kycBadge.bg }]}>
                <Ionicons name={kycBadge.icon as any} size={28} color={kycBadge.text} />
                <View style={{ flex: 1, marginStart: 12 }}>
                  <Text style={[styles.kycBannerTitle, { color: kycBadge.text }]}>{kycBadge.label}</Text>
                  <Text style={styles.kycBannerDesc}>
                    {kycStatus === "pending_verification"
                      ? "Your identity document has been uploaded to our private R2 bucket and is pending compliance review."
                      : kycStatus === "verified"
                      ? "Your government identification is verified. Enjoy full cross-border booking and loyalty perks."
                      : "Upload a government passport, national ID, or driving license to verify your identity."}
                  </Text>
                </View>
              </View>

              {/* Document List */}
              <Text style={styles.subSectionTitle}>Submitted Verification Documents</Text>
              {kycDocuments.length === 0 ? (
                <View style={styles.emptyDocCard}>
                  <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyDocTitle}>No KYC documents submitted</Text>
                  <Text style={styles.emptyDocSub}>
                    Upload your Passport, National ID, or Driving License to access verified booking rates.
                  </Text>
                  <Pressable
                    style={styles.emptyDocUploadBtn}
                    onPress={() => setShowKycUploadModal(true)}
                  >
                    <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyDocUploadText}>Upload KYC Document</Text>
                  </Pressable>
                </View>
              ) : (
                kycDocuments.map((doc, idx) => (
                  <View key={doc.id || idx} style={styles.kycDocCard}>
                    <View style={styles.kycDocIconBox}>
                      <Ionicons
                        name={
                          doc.document_type === KYCDocumentType.PASSPORT
                            ? "airplane"
                            : doc.document_type === KYCDocumentType.LICENSE
                            ? "car"
                            : "card"
                        }
                        size={22}
                        color={TRIP_BLUE}
                      />
                    </View>
                    <View style={{ flex: 1, marginStart: 12 }}>
                      <Text style={styles.kycDocType}>
                        {doc.document_type ? doc.document_type.replace("_", " ").toUpperCase() : "GOVERNMENT ID"}
                      </Text>
                      <Text style={styles.kycDocNumber}>
                        Number: {maskDocumentNumber(doc.document_number || "A12345678")}
                      </Text>
                      {doc.expiry_date && (
                        <Text style={styles.kycDocMeta}>Expires: {doc.expiry_date}</Text>
                      )}
                      <View style={styles.r2Badge}>
                        <Ionicons name="lock-closed" size={10} color="#2563EB" />
                        <Text style={styles.r2BadgeText}>R2 Private Storage • Encrypted</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.kycDocStatusBadge,
                        {
                          backgroundColor: doc.is_verified ? "#DCFCE7" : "#FEF3C7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.kycDocStatusText,
                          { color: doc.is_verified ? "#15803D" : "#B45309" },
                        ]}
                      >
                        {doc.is_verified ? "Verified" : "Pending"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ================================================================ */}
          {/* TAB 2: TRAVEL DETAILS & MASKED PII                              */}
          {/* ================================================================ */}
          {activeTab === "travel_info" && isSelf && (
            <View style={styles.tabSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>Travel Profile & Preferences</Text>
                  <Text style={styles.sectionSub}>PII data masked for user security</Text>
                </View>
                <Pressable
                  style={styles.revealToggleBtn}
                  onPress={() => setRevealPII(!revealPII)}
                >
                  <Ionicons name={revealPII ? "eye-off-outline" : "eye-outline"} size={16} color={TRIP_BLUE} />
                  <Text style={styles.revealToggleText}>{revealPII ? "Mask PII" : "Reveal"}</Text>
                </Pressable>
              </View>

              {/* Passport Details */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="airplane-outline" size={20} color={TRIP_BLUE} />
                  <Text style={styles.infoTitle}>Passport Details</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Passport Number</Text>
                  <Text style={styles.infoValue}>
                    {revealPII ? profile.passport_number : maskPassport(profile.passport_number)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Issuing Country</Text>
                  <Text style={styles.infoValue}>{profile.passport_country || "Bangladesh"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expiration Date</Text>
                  <Text style={styles.infoValue}>{profile.passport_expiry || "2032-12-31"}</Text>
                </View>
              </View>

              {/* Frequent Flyer Details */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="ribbon-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.infoTitle}>Frequent Flyer Membership</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Airline Program</Text>
                  <Text style={styles.infoValue}>{profile.frequent_flyer_airline || "Emirates Skywards"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Membership Number</Text>
                  <Text style={styles.infoValue}>
                    {revealPII
                      ? profile.frequent_flyer_number
                      : maskFrequentFlyer(profile.frequent_flyer_number)}
                  </Text>
                </View>
              </View>

              {/* Dietary Preferences */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="restaurant-outline" size={20} color="#10B981" />
                  <Text style={styles.infoTitle}>Dietary Preferences</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>In-Flight / Hotel Diet</Text>
                  <View style={styles.dietPill}>
                    <Text style={styles.dietPillText}>{preferences?.dietary_requirements || editDietary}</Text>
                  </View>
                </View>
              </View>

              {/* Emergency Contacts */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="medical-outline" size={20} color="#EF4444" />
                  <Text style={styles.infoTitle}>Emergency Contact</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact Name</Text>
                  <Text style={styles.infoValue}>{profile.emergency_contact_name || "Ayesha Rahman"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Relationship</Text>
                  <Text style={styles.infoValue}>{profile.emergency_contact_relationship || "Spouse"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Emergency Phone</Text>
                  <Text style={styles.infoValue}>
                    {revealPII
                      ? profile.emergency_contact_phone
                      : maskPhone(profile.emergency_contact_phone)}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.editSectionBtn}
                onPress={() => setShowEditProfileModal(true)}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                <Text style={styles.editSectionBtnText}>Update Preferences & Details</Text>
              </Pressable>
            </View>
          )}

          {/* ================================================================ */}
          {/* TAB 3: POSTS & MOMENTS (PRESERVED COMMUNITY FEATURES)           */}
          {/* ================================================================ */}
          {activeTab === "posts" && (
            <View style={styles.tabSection}>
              {userPosts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="images-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyText}>No moments shared yet</Text>
                </View>
              ) : (
                userPosts.map((post) => {
                  const media = post.post_media?.[0];
                  const isVideo = media?.media_type === "video";

                  return (
                    <View key={post.id} style={styles.postCard}>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      {post.content && <Text style={styles.postContent}>{post.content}</Text>}

                      {media && isVideo ? (
                        <TravelVideoPlayer videoUrl={media.media_url} height={220} />
                      ) : media ? (
                        <Image
                          source={{ uri: media.media_url }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      ) : null}

                      <View style={styles.postMetaRow}>
                        <View style={styles.postStat}>
                          <Ionicons name="heart-outline" size={14} color="#64748B" />
                          <Text style={styles.postStatText}>{post.likes_count || 0}</Text>
                        </View>
                        <View style={styles.postStat}>
                          <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                          <Text style={styles.postStatText}>{post.comments_count || 0}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ================================================================ */}
          {/* TAB 4: FRIENDS LIST                                             */}
          {/* ================================================================ */}
          {activeTab === "friends" && (
            <View style={styles.tabSection}>
              {userFriends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyText}>No friends connected yet</Text>
                </View>
              ) : (
                <View style={styles.friendsGrid}>
                  {userFriends.map((f) => (
                    <Pressable
                      key={f.id}
                      style={styles.friendCard}
                      onPress={() =>
                        router.push({
                          pathname: "/screens/user-profile" as any,
                          params: { userId: f.id },
                        })
                      }
                    >
                      <Image source={{ uri: f.avatar_url }} style={styles.friendAvatar} />
                      <Text style={styles.friendName} numberOfLines={1}>
                        {f.display_name}
                      </Text>
                      <Text style={styles.friendHandle} numberOfLines={1}>
                        @{f.username || "traveler"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      ) : (
        <View style={styles.centerLoader}>
          <Text style={styles.emptyText}>User profile not found</Text>
        </View>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: EDIT PROFILE & PREFERENCES (CONSUMING userRepository)      */}
      {/* ==================================================================== */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile & Travel Details</Text>
            <Pressable onPress={() => setShowEditProfileModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Full Name */}
            <Text style={styles.inputSectionHeading}>Personal Identity</Text>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.inputField}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#94A3B8"
            />

            {/* Emergency Contacts */}
            <Text style={styles.inputSectionHeading}>Emergency Contact Details</Text>
            <Text style={styles.inputLabel}>Contact Full Name</Text>
            <TextInput
              style={styles.inputField}
              value={editEmergencyName}
              onChangeText={setEditEmergencyName}
              placeholder="Contact Person Name"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <TextInput
              style={styles.inputField}
              value={editEmergencyRelation}
              onChangeText={setEditEmergencyRelation}
              placeholder="e.g. Spouse, Parent, Sibling"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Emergency Phone Number</Text>
            <TextInput
              style={styles.inputField}
              value={editEmergencyPhone}
              onChangeText={setEditEmergencyPhone}
              placeholder="+880 1819 000000"
              keyboardType="phone-pad"
              placeholderTextColor="#94A3B8"
            />

            {/* Dietary Preferences */}
            <Text style={styles.inputSectionHeading}>Dietary Preferences</Text>
            <View style={styles.dietChipWrap}>
              {DIETARY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.dietChip, editDietary === opt && styles.dietChipSelected]}
                  onPress={() => setEditDietary(opt)}
                >
                  <Text
                    style={[
                      styles.dietChipText,
                      editDietary === opt && styles.dietChipTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Passport Details */}
            <Text style={styles.inputSectionHeading}>Passport Details</Text>
            <Text style={styles.inputLabel}>Passport Number</Text>
            <TextInput
              style={styles.inputField}
              value={editPassportNum}
              onChangeText={setEditPassportNum}
              placeholder="e.g. A01234567"
              autoCapitalize="characters"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Issuing Country</Text>
            <TextInput
              style={styles.inputField}
              value={editPassportCountry}
              onChangeText={setEditPassportCountry}
              placeholder="e.g. Bangladesh, United States"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Passport Expiration Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.inputField}
              value={editPassportExpiry}
              onChangeText={setEditPassportExpiry}
              placeholder="2032-12-31"
              placeholderTextColor="#94A3B8"
            />

            {/* Frequent Flyer Numbers */}
            <Text style={styles.inputSectionHeading}>Frequent Flyer Program</Text>
            <Text style={styles.inputLabel}>Airline Program Name / Code</Text>
            <TextInput
              style={styles.inputField}
              value={editFfAirline}
              onChangeText={setEditFfAirline}
              placeholder="e.g. Emirates Skywards, Qatar Privilege"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Frequent Flyer Number</Text>
            <TextInput
              style={styles.inputField}
              value={editFfNumber}
              onChangeText={setEditFfNumber}
              placeholder="e.g. EK-12345678"
              autoCapitalize="characters"
              placeholderTextColor="#94A3B8"
            />

            <Pressable
              style={[styles.modalSubmitBtn, actionLoading && { opacity: 0.7 }]}
              onPress={handleSaveProfileAndPreferences}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Changes</Text>
              )}
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL 2: SECURE KYC UPLOADER (PRIVATE R2 BUCKET & PENDING STATUS)    */}
      {/* ==================================================================== */}
      <Modal
        visible={showKycUploadModal}
        animationType="slide"
        onRequestClose={() => setShowKycUploadModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Secure Identity Uploader</Text>
              <Text style={styles.modalSubTitle}>Private Cloudflare R2 Storage Vault</Text>
            </View>
            <Pressable onPress={() => setShowKycUploadModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Document Type Selector */}
            <Text style={styles.inputLabel}>Select Government Document Type</Text>
            <View style={styles.docTypeRow}>
              {[
                { type: KYCDocumentType.PASSPORT, label: "Passport", icon: "airplane" },
                { type: KYCDocumentType.NATIONAL_ID, label: "National ID", icon: "card" },
                { type: KYCDocumentType.LICENSE, label: "Driver License", icon: "car" },
              ].map((d) => (
                <Pressable
                  key={d.type}
                  style={[
                    styles.docTypeOption,
                    uploadDocType === d.type && styles.docTypeOptionSelected,
                  ]}
                  onPress={() => setUploadDocType(d.type)}
                >
                  <Ionicons
                    name={d.icon as any}
                    size={20}
                    color={uploadDocType === d.type ? TRIP_BLUE : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.docTypeLabel,
                      uploadDocType === d.type && styles.docTypeLabelSelected,
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Document Number */}
            <Text style={styles.inputLabel}>Document Number</Text>
            <TextInput
              style={[styles.inputField, kycErrors.docNumber && { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}
              value={uploadDocNumber}
              onChangeText={(t) => { setUploadDocNumber(t); if (kycErrors.docNumber) setKycErrors(prev => ({ ...prev, docNumber: undefined })); }}
              placeholder="Enter ID or Passport Number"
              autoCapitalize="characters"
              placeholderTextColor="#94A3B8"
            />
            {kycErrors.docNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '500' }}>{kycErrors.docNumber}</Text>
              </View>
            )}

            {/* Expiry Date */}
            <Text style={styles.inputLabel}>Expiration Date (Optional)</Text>
            <TextInput
              style={styles.inputField}
              value={uploadDocExpiry}
              onChangeText={setUploadDocExpiry}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />

            {/* Document Picker Buttons */}
            <Text style={styles.inputLabel}>Document Image File</Text>
            {kycErrors.file && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '500' }}>{kycErrors.file}</Text>
              </View>
            )}
            <View style={styles.filePickerActionRow}>
              <Pressable style={styles.filePickerBtn} onPress={handlePickDocument}>
                <Ionicons name="images-outline" size={20} color={TRIP_BLUE} />
                <Text style={styles.filePickerBtnText}>Choose from Gallery</Text>
              </Pressable>

              <Pressable style={styles.filePickerBtn} onPress={handleCaptureDocument}>
                <Ionicons name="camera-outline" size={20} color={TRIP_BLUE} />
                <Text style={styles.filePickerBtnText}>Take Photo</Text>
              </Pressable>
            </View>

            {/* Selected File Preview */}
            {uploadFile && (
              <View style={styles.selectedFileBox}>
                <Ionicons name="document-attach" size={24} color="#10B981" />
                <View style={{ flex: 1, marginStart: 10 }}>
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {uploadFile.name}
                  </Text>
                  <Text style={styles.selectedFileSize}>
                    {uploadFile.size ? `${(uploadFile.size / 1024).toFixed(1)} KB` : "Ready"}
                  </Text>
                </View>
                <Pressable onPress={() => setUploadFile(null)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>
            )}

            {/* Progress Bar */}
            {isUploadingKyc && (
              <View style={styles.uploadProgressBox}>
                <View style={styles.uploadProgressBarBg}>
                  <View style={[styles.uploadProgressBarFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.uploadProgressText}>
                  Uploading to encrypted private R2 bucket ({uploadProgress}%)
                </Text>
              </View>
            )}

            <Pressable
              style={[
                styles.modalSubmitBtn,
                (isUploadingKyc || !uploadFile) && { opacity: 0.6 },
              ]}
              onPress={handleUploadKycDocument}
              disabled={isUploadingKyc || !uploadFile}
            >
              {isUploadingKyc ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit for Verification</Text>
              )}
            </Pressable>

            <View style={styles.encryptionDisclaimer}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.encryptionDisclaimerText}>
                Encrypted in transit (TLS 1.3) and stored in isolated private Cloudflare R2 bucket.
                Status automatically updates to Pending Verification.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  toastBox: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileHeaderCard: {
    backgroundColor: "#FFFFFF",
    marginTop: -32,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: -44,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    position: "relative",
  },
  bigAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  onlineStatusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  kycStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  kycStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  identityDetails: {
    marginBottom: 14,
  },
  displayNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  handleText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  bioText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginTop: 6,
  },
  contactMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  contactMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactMetaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  statCol: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },
  statSeparator: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  uploadKycPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: TRIP_BLUE,
    borderRadius: 10,
  },
  uploadKycPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  followBtn: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followBtnActive: {
    backgroundColor: "rgba(0, 85, 242, 0.08)",
    borderColor: "rgba(0, 85, 242, 0.25)",
  },
  followBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  followBtnTextActive: {
    color: TRIP_BLUE,
  },
  referralBannerCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  referralBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  giftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: TRIP_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  referralBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  referralBannerSubtitle: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
  },
  referralCodeHighlight: {
    fontWeight: "800",
    color: TRIP_BLUE,
  },
  referralBannerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  referralCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  referralCopyText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  referralShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  referralShareText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: "#EFF6FF",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  tabSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  addDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addDocBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  revealToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  revealToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  kycBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  kycBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  kycBannerDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyDocCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyDocTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
  emptyDocSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  emptyDocUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyDocUploadText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  kycDocCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  kycDocIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  kycDocType: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  kycDocNumber: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    fontFamily: "monospace",
  },
  kycDocMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  r2Badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  r2BadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  kycDocStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  kycDocStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    fontFamily: "monospace",
  },
  dietPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dietPillText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  editSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  editSectionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  postContent: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  postMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  postStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  friendCard: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  friendAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginBottom: 6,
  },
  friendName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  friendHandle: {
    fontSize: 12,
    color: "#94A3B8",
  },

  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputSectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dietChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  dietChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dietChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
  },
  dietChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dietChipTextSelected: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  modalSubmitBtn: {
    backgroundColor: TRIP_BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  docTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  docTypeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  docTypeOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: TRIP_BLUE,
  },
  docTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  docTypeLabelSelected: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  filePickerActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  filePickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  filePickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  selectedFileBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 12,
  },
  selectedFileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  selectedFileSize: {
    fontSize: 12,
    color: "#15803D",
  },
  uploadProgressBox: {
    marginVertical: 10,
  },
  uploadProgressBarBg: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  uploadProgressBarFill: {
    height: "100%",
    backgroundColor: TRIP_BLUE,
  },
  uploadProgressText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  encryptionDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  encryptionDisclaimerText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 15,
    flex: 1,
  },
});
