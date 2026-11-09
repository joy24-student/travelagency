import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";

import { supabase } from "../utils/supabase";
import {
  FriendProfile,
  friendsRepository,
  DEMO_USER_ID,
} from "../services/repositories/friends";
import { TravelVideoPlayer } from "../components/TravelVideoPlayer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#E5A93C";

export function UserProfileScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId || DEMO_USER_ID;
  const currentUserId = DEMO_USER_ID;
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
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

        // 2. Fetch Friendship Status & Follow Status
        if (!isSelf) {
          const status = await friendsRepository.getFriendshipStatus(currentUserId, userId);
          if (isMounted) setFriendship(status);

          const { data: followData } = await supabase
            .from("user_follows")
            .select("*")
            .eq("follower_id", currentUserId)
            .eq("following_id", userId)
            .maybeSingle();

          if (isMounted) setIsFollowing(!!followData);
        }

        // 3. Fetch User Posts
        const { data: postsData } = await supabase
          .from("posts")
          .select("*, post_media(*)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (isMounted && postsData) {
          setUserPosts(postsData);
        }

        // 4. Fetch User Friends
        const friendsList = await friendsRepository.getFriends(userId);
        if (isMounted) {
          setUserFriends(friendsList);
        }
      } catch (e) {
        console.warn("Load profile data error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, isSelf]);

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
    Alert.alert("Unfriend", `Remove ${profile.display_name} as a friend?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
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

  const handleToggleFollow = async () => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextFollowing = !isFollowing;
    setIsFollowing(nextFollowing);
    setProfile((prev) =>
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
          .upsert(
            [{ follower_id: currentUserId, following_id: profile.id }],
            { onConflict: "follower_id,following_id" }
          );
      } else {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profile.id);
      }
    } catch (e) {
      console.warn("Follow error:", e);
    }
  };

  const handleLaunchCall = (callType: "audio" | "video") => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType,
        targetUserId: profile.id,
        targetName: profile.display_name,
        targetAvatar: profile.avatar_url,
        callerId: currentUserId,
      },
    });
  };

  const handleOpenMessages = () => {
    router.push("/(tabs)/messages" as any);
  };

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <Pressable style={styles.navIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <Text style={styles.navTitle} numberOfLines={1}>
          {profile?.username ? `@${profile.username}` : "Profile"}
        </Text>

        <Pressable
          style={styles.navIconBtn}
          onPress={() => Alert.alert("Share", `Shared @${profile?.username || "traveler"}'s profile!`)}
        >
          <Ionicons name="share-outline" size={20} color="#0F172A" />
        </Pressable>
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
              colors={["transparent", "rgba(0,0,0,0.45)"]}
              style={styles.coverGradient}
            />
          </View>

          {/* Profile Identity Card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profile.avatar_url }} style={styles.bigAvatar} />
                <View style={styles.onlineStatusDot} />
              </View>

              {/* Call Shortcuts */}
              {!isSelf && (
                <View style={styles.callShortcutGroup}>
                  <Pressable
                    style={styles.callShortcutBtn}
                    onPress={() => handleLaunchCall("audio")}
                  >
                    <Ionicons name="call-outline" size={18} color="#0F172A" />
                  </Pressable>

                  <Pressable
                    style={styles.callShortcutBtn}
                    onPress={() => handleLaunchCall("video")}
                  >
                    <Ionicons name="videocam-outline" size={18} color="#0F172A" />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Name, Handle & Bio */}
            <View style={styles.identityDetails}>
              <View style={styles.displayNameRow}>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <Ionicons name="checkmark-circle" size={18} color={TRIP_BLUE} />
              </View>

              <Text style={styles.handleText}>@{profile.username || "traveler"}</Text>

              {profile.bio && <Text style={styles.bioText}>{profile.bio}</Text>}

              {profile.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#64748B" />
                  <Text style={styles.locationText}>{profile.location}</Text>
                </View>
              )}
            </View>

            {/* Clean Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{userFriends.length}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.statSeparator} />
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statSeparator} />
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{profile.followers_count || 128}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              {isSelf ? (
                <Pressable
                  style={styles.editProfileBtn}
                  onPress={() => Alert.alert("Profile", "Edit Profile Settings")}
                >
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </Pressable>
              ) : (
                <>
                  {/* Dynamic Friend Button */}
                  {friendship.status === "none" && (
                    <Pressable
                      style={[styles.primaryActionBtn, isActionLoading && { opacity: 0.6 }]}
                      onPress={handleSendFriendRequest}
                      disabled={isActionLoading}
                    >
                      <Ionicons name="person-add" size={16} color="#fff" />
                      <Text style={styles.primaryActionText}>Add Friend</Text>
                    </Pressable>
                  )}

                  {friendship.status === "pending_sent" && (
                    <Pressable
                      style={[styles.secondaryActionBtn, isActionLoading && { opacity: 0.6 }]}
                      onPress={handleCancelRequest}
                      disabled={isActionLoading}
                    >
                      <Ionicons name="time-outline" size={16} color="#475569" />
                      <Text style={styles.secondaryActionText}>Requested</Text>
                    </Pressable>
                  )}

                  {friendship.status === "pending_received" && (
                    <Pressable
                      style={[styles.primaryActionBtn, { backgroundColor: "#10B981" }]}
                      onPress={handleAcceptRequest}
                      disabled={isActionLoading}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#fff" />
                      <Text style={styles.primaryActionText}>Accept Request</Text>
                    </Pressable>
                  )}

                  {friendship.status === "accepted" && (
                    <Pressable
                      style={styles.secondaryActionBtn}
                      onPress={handleUnfriend}
                      disabled={isActionLoading}
                    >
                      <Ionicons name="checkmark-circle" size={16} color={TRIP_BLUE} />
                      <Text style={[styles.secondaryActionText, { color: TRIP_BLUE }]}>
                        Friends
                      </Text>
                    </Pressable>
                  )}

                  {/* Message Button */}
                  <Pressable style={styles.messageBtn} onPress={handleOpenMessages}>
                    <Ionicons name="chatbubble-outline" size={16} color="#0F172A" />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </Pressable>

                  {/* Follow Button */}
                  <Pressable
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    onPress={handleToggleFollow}
                  >
                    <Ionicons
                      name={isFollowing ? "checkmark" : "person-add-outline"}
                      size={15}
                      color={isFollowing ? "#0055F2" : "#475569"}
                    />
                    <Text
                      style={[
                        styles.followBtnText,
                        isFollowing && styles.followBtnTextActive,
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Minimal Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabItem, activeTab === "posts" && styles.tabItemActive]}
              onPress={() => setActiveTab("posts")}
            >
              <Text style={[styles.tabLabel, activeTab === "posts" && styles.tabLabelActive]}>
                Posts ({userPosts.length})
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

            <Pressable
              style={[styles.tabItem, activeTab === "about" && styles.tabItemActive]}
              onPress={() => setActiveTab("about")}
            >
              <Text style={[styles.tabLabel, activeTab === "about" && styles.tabLabelActive]}>
                About
              </Text>
            </Pressable>
          </View>

          {/* Tab 1: Posts (Image & Video timeline) */}
          {activeTab === "posts" && (
            <View style={styles.tabContent}>
              {userPosts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="images-outline" size={36} color="#94A3B8" />
                  <Text style={styles.emptyText}>No posts yet</Text>
                </View>
              ) : (
                userPosts.map((post) => {
                  const media = post.post_media?.[0];
                  const isVideo = media?.media_type === "video";

                  return (
                    <View key={post.id} style={styles.postCard}>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      {post.content && (
                        <Text style={styles.postContent}>{post.content}</Text>
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

          {/* Tab 2: Friends Grid */}
          {activeTab === "friends" && (
            <View style={styles.tabContent}>
              {userFriends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={36} color="#94A3B8" />
                  <Text style={styles.emptyText}>No friends yet</Text>
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

          {/* Tab 3: About */}
          {activeTab === "about" && (
            <View style={styles.tabContent}>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutHeading}>Bio</Text>
                <Text style={styles.aboutText}>
                  {profile.bio || "No biography provided yet."}
                </Text>

                <View style={styles.aboutRow}>
                  <Ionicons name="calendar-outline" size={16} color="#64748B" />
                  <Text style={styles.aboutRowText}>
                    Joined {new Date(profile.created_at || Date.now()).getFullYear()}
                  </Text>
                </View>

                <View style={styles.aboutRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                  <Text style={styles.aboutRowText}>Verified Community Profile</Text>
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
    </SafeAreaView>
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
  callShortcutGroup: {
    flexDirection: "row",
    gap: 8,
  },
  callShortcutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 19,
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
    marginTop: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: {
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
    fontSize: 11,
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
    paddingVertical: 9,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    alignItems: "center",
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 9,
    borderRadius: 10,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 9,
    borderRadius: 10,
  },
  secondaryActionText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
  },
  messageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 9,
    borderRadius: 10,
  },
  messageBtnText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  followBtn: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingVertical: 9,
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
    color: "#0055F2",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
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
  tabContent: {
    paddingHorizontal: 16,
    marginTop: 12,
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
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  friendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  friendCard: {
    width: (SCREEN_WIDTH - 52) / 3,
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
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  friendHandle: {
    fontSize: 10,
    color: "#94A3B8",
  },
  aboutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  aboutHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  aboutText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aboutRowText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
});

