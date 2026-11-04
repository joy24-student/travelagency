import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { supabase } from "../utils/supabase";
import {
  FriendProfile,
  friendsRepository,
  DEMO_USER_ID,
} from "../services/repositories/friends";
import { TravelVideoPlayer } from "./TravelVideoPlayer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";

interface UserProfileModalProps {
  userId: string | null;
  currentUserId?: string;
  onClose: () => void;
  onStartChat?: (user: FriendProfile) => void;
  onStartCall?: (user: FriendProfile, callType: "audio" | "video") => void;
}

export function UserProfileModal({
  userId,
  currentUserId = DEMO_USER_ID,
  onClose,
  onStartChat,
  onStartCall,
}: UserProfileModalProps) {
  if (!userId) return null;

  const isSelf = userId === currentUserId;

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState<{
    status: "none" | "pending_sent" | "pending_received" | "accepted";
    requestId?: string;
  }>({ status: "none" });

  const [activeTab, setActiveTab] = useState<"posts" | "friends" | "about">("posts");
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userFriends, setUserFriends] = useState<FriendProfile[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileData() {
      if (!userId) return;
      setLoading(true);
      try {
        // 1. Fetch Profile
        const { data: pData } = await supabase
          .from("community_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (isMounted && pData) {
          setProfile(pData);
        }

        // 2. Fetch Friendship Status
        if (!isSelf) {
          const status = await friendsRepository.getFriendshipStatus(currentUserId, userId);
          if (isMounted) setFriendship(status);
        }

        // 3. Fetch Posts by this user
        const { data: postsData } = await supabase
          .from("posts")
          .select("*, post_media(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (isMounted && postsData) {
          setUserPosts(postsData);
        }

        // 4. Fetch User's Friends
        const friendsList = await friendsRepository.getFriends(userId);
        if (isMounted) {
          setUserFriends(friendsList);
        }
      } catch (e) {
        console.warn("Load profile error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [userId, currentUserId, isSelf]);

  // Friend Request Actions
  const handleSendFriendRequest = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActionLoading(true);
    try {
      const { data } = await friendsRepository.sendFriendRequest(currentUserId, profile.id);
      setFriendship({ status: "pending_sent", requestId: data?.id });
      Alert.alert("Request Sent", `Friend request sent to ${profile.display_name}!`);
    } catch (e) {
      Alert.alert("Error", "Could not send friend request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!friendship.requestId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActionLoading(true);
    try {
      await friendsRepository.cancelFriendRequest(friendship.requestId);
      setFriendship({ status: "none" });
    } catch (e) {
      Alert.alert("Error", "Could not cancel request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendship.requestId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsActionLoading(true);
    try {
      await friendsRepository.acceptFriendRequest(friendship.requestId);
      setFriendship({ status: "accepted", requestId: friendship.requestId });
      Alert.alert("Connected!", `You and ${profile?.display_name} are now friends.`);
    } catch (e) {
      Alert.alert("Error", "Could not accept request");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!profile) return;
    Alert.alert("Unfriend", `Are you sure you want to remove ${profile.display_name} as a friend?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfriend",
        style: "destructive",
        onPress: async () => {
          setIsActionLoading(true);
          try {
            await friendsRepository.unfriend(currentUserId, profile.id);
            setFriendship({ status: "none" });
          } catch (e) {
            Alert.alert("Error", "Could not remove friend");
          } finally {
            setIsActionLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={!!userId} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.shell}>
        {/* Header bar */}
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </Pressable>
          <Text style={styles.navTitle}>{profile?.display_name || "Traveler Profile"}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={TRIP_BLUE} />
          </View>
        ) : profile ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Cover Photo */}
            <View style={styles.coverWrapper}>
              <Image
                source={{
                  uri:
                    profile.cover_url ||
                    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
                }}
                style={styles.coverImage}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={styles.coverGradient}
              />
            </View>

            {/* Profile Avatar & Info Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarRow}>
                <View style={styles.avatarBorder}>
                  <Image source={{ uri: profile.avatar_url }} style={styles.bigAvatar} />
                  <View style={styles.onlineBadge} />
                </View>

                {/* Quick Call shortcuts if friends */}
                {!isSelf && onStartCall && (
                  <View style={styles.quickCallRow}>
                    <Pressable
                      style={styles.callCircleBtn}
                      onPress={() => onStartCall(profile, "audio")}
                    >
                      <Ionicons name="call" size={18} color={TRIP_BLUE} />
                    </Pressable>
                    <Pressable
                      style={styles.callCircleBtn}
                      onPress={() => onStartCall(profile, "video")}
                    >
                      <Ionicons name="videocam" size={18} color={TRIP_BLUE} />
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Names & Badges */}
              <View style={styles.nameSection}>
                <View style={styles.displayNameRow}>
                  <Text style={styles.displayName}>{profile.display_name}</Text>
                  <Ionicons name="checkmark-circle" size={20} color={TRIP_BLUE} />
                </View>
                <Text style={styles.handleText}>@{profile.username || "traveler"}</Text>

                {profile.is_influencer && (
                  <View style={styles.influencerBadge}>
                    <Ionicons name="sparkles" size={12} color="#D97706" />
                    <Text style={styles.influencerBadgeText}>
                      {profile.influencer_category || "Verified Creator"}
                    </Text>
                  </View>
                )}

                {profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}

                {profile.location && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text style={styles.metaText}>{profile.location}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons Row */}
              <View style={styles.mainActionsRow}>
                {isSelf ? (
                  <Pressable style={styles.primaryActionBtn} onPress={() => Alert.alert("Profile", "Edit Profile")}>
                    <Ionicons name="create-outline" size={18} color="#fff" />
                    <Text style={styles.primaryActionText}>Edit Profile</Text>
                  </Pressable>
                ) : (
                  <>
                    {/* Friend button according to status */}
                    {friendship.status === "none" && (
                      <Pressable
                        style={[styles.primaryActionBtn, isActionLoading && { opacity: 0.6 }]}
                        onPress={handleSendFriendRequest}
                        disabled={isActionLoading}
                      >
                        <Ionicons name="person-add" size={18} color="#fff" />
                        <Text style={styles.primaryActionText}>Add Friend</Text>
                      </Pressable>
                    )}

                    {friendship.status === "pending_sent" && (
                      <Pressable
                        style={[styles.secondaryActionBtn, isActionLoading && { opacity: 0.6 }]}
                        onPress={handleCancelRequest}
                        disabled={isActionLoading}
                      >
                        <Ionicons name="time-outline" size={18} color="#475569" />
                        <Text style={styles.secondaryActionText}>Requested</Text>
                      </Pressable>
                    )}

                    {friendship.status === "pending_received" && (
                      <Pressable
                        style={[styles.primaryActionBtn, { backgroundColor: "#10B981" }]}
                        onPress={handleAcceptRequest}
                        disabled={isActionLoading}
                      >
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text style={styles.primaryActionText}>Accept Request</Text>
                      </Pressable>
                    )}

                    {friendship.status === "accepted" && (
                      <Pressable
                        style={styles.secondaryActionBtn}
                        onPress={handleUnfriend}
                        disabled={isActionLoading}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={TRIP_BLUE} />
                        <Text style={[styles.secondaryActionText, { color: TRIP_BLUE }]}>
                          Friends
                        </Text>
                      </Pressable>
                    )}

                    {/* Message Button */}
                    {onStartChat && (
                      <Pressable
                        style={styles.messageActionBtn}
                        onPress={() => onStartChat(profile)}
                      >
                        <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                        <Text style={styles.messageActionText}>Message</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>

              {/* Stats Bar */}
              <View style={styles.statsBar}>
                <View style={styles.statCol}>
                  <Text style={styles.statNum}>{userFriends.length}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statNum}>{userPosts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statNum}>{profile.followers_count || 124}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
              </View>
            </View>

            {/* Profile Tabs */}
            <View style={styles.tabsRow}>
              <Pressable
                style={[styles.tabBtn, activeTab === "posts" && styles.tabBtnActive]}
                onPress={() => setActiveTab("posts")}
              >
                <Text style={[styles.tabBtnText, activeTab === "posts" && styles.tabBtnTextActive]}>
                  Posts ({userPosts.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabBtn, activeTab === "friends" && styles.tabBtnActive]}
                onPress={() => setActiveTab("friends")}
              >
                <Text style={[styles.tabBtnText, activeTab === "friends" && styles.tabBtnTextActive]}>
                  Friends ({userFriends.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabBtn, activeTab === "about" && styles.tabBtnActive]}
                onPress={() => setActiveTab("about")}
              >
                <Text style={[styles.tabBtnText, activeTab === "about" && styles.tabBtnTextActive]}>
                  About
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Posts (Image & Video timeline) */}
            {activeTab === "posts" && (
              <View style={styles.tabContent}>
                {userPosts.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="images-outline" size={36} color="#94a3b8" />
                    <Text style={styles.emptyText}>No posts shared yet</Text>
                  </View>
                ) : (
                  userPosts.map((post) => {
                    const media = post.post_media?.[0];
                    const isVideo = media?.media_type === "video";
                    return (
                      <View key={post.id} style={styles.postTimelineCard}>
                        <View style={styles.postHeader}>
                          <Text style={styles.postTitle}>{post.title}</Text>
                          {post.location && (
                            <View style={styles.postLocRow}>
                              <Ionicons name="location-outline" size={12} color={TRIP_BLUE} />
                              <Text style={styles.postLocText}>{post.location}</Text>
                            </View>
                          )}
                        </View>

                        {post.content && (
                          <Text style={styles.postBodyText}>{post.content}</Text>
                        )}

                        {media && isVideo ? (
                          <TravelVideoPlayer videoUrl={media.media_url} height={220} />
                        ) : media ? (
                          <Image
                            source={{ uri: media.media_url }}
                            style={styles.postImage}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View style={styles.postFooterRow}>
                          <View style={styles.postSocialStat}>
                            <Ionicons name="heart" size={14} color="#EF4444" />
                            <Text style={styles.postSocialText}>
                              {post.likes_count || 0} likes
                            </Text>
                          </View>
                          <View style={styles.postSocialStat}>
                            <Ionicons name="chatbubble" size={14} color="#64748B" />
                            <Text style={styles.postSocialText}>
                              {post.comments_count || 0} comments
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Tab 2: Friends Grid */}
            {activeTab === "friends" && (
              <View style={styles.tabContent}>
                {userFriends.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="people-outline" size={36} color="#94a3b8" />
                    <Text style={styles.emptyText}>No friends yet</Text>
                  </View>
                ) : (
                  <View style={styles.friendsGrid}>
                    {userFriends.map((friend) => (
                      <View key={friend.id} style={styles.friendGridCard}>
                        <Image source={{ uri: friend.avatar_url }} style={styles.friendGridAvatar} />
                        <Text style={styles.friendGridName} numberOfLines={1}>
                          {friend.display_name}
                        </Text>
                        <Text style={styles.friendGridHandle} numberOfLines={1}>
                          @{friend.username || "traveler"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Tab 3: About */}
            {activeTab === "about" && (
              <View style={styles.tabContent}>
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutHeading}>Travel Bio</Text>
                  <Text style={styles.aboutBody}>
                    {profile.bio || "Enthusiastic explorer wandering through nature and culture."}
                  </Text>

                  <View style={styles.aboutInfoRow}>
                    <Ionicons name="globe-outline" size={18} color="#64748B" />
                    <Text style={styles.aboutInfoText}>
                      Member since {new Date(profile.created_at || Date.now()).getFullYear()}
                    </Text>
                  </View>

                  <View style={styles.aboutInfoRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                    <Text style={styles.aboutInfoText}>Verified Community Profile</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        ) : (
          <View style={styles.centerLoader}>
            <Text style={styles.emptyText}>User not found</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
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
    height: 160,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileCard: {
    backgroundColor: "#fff",
    marginTop: -40,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: -50,
    marginBottom: 12,
  },
  avatarBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: "#fff",
    position: "relative",
  },
  bigAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  quickCallRow: {
    flexDirection: "row",
    gap: 8,
  },
  callCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  nameSection: {
    marginBottom: 14,
  },
  displayNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  handleText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  influencerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  influencerBadgeText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  bioText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  mainActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  messageActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#000666",
    paddingVertical: 10,
    borderRadius: 12,
  },
  messageActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statCol: {
    alignItems: "center",
  },
  statNum: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: TRIP_BLUE,
  },
  tabContent: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  postTimelineCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  postLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  postLocText: {
    fontSize: 11,
    color: TRIP_BLUE,
    fontWeight: "700",
  },
  postBodyText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  postFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 6,
  },
  postSocialStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postSocialText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  friendGridCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    elevation: 2,
  },
  friendGridAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  friendGridName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  friendGridHandle: {
    fontSize: 10,
    color: "#64748B",
  },
  aboutCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  aboutHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  aboutBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  aboutInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aboutInfoText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
});

