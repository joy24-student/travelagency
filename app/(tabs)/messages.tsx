import { AppImage } from "../../src/components/ui/AppImage";
import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,

  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import {
  friendsRepository,
  FriendProfile,
  FriendRequest,
  DEMO_USER_ID,
} from "../../src/services/repositories/friends";
import {
  messengerRepository,
  ConversationItem,
} from "../../src/services/repositories/messenger";
import {
  callsRepository,
  CallLog,
} from "../../src/services/repositories/calls";
import { callService } from "../../src/services/callService";
import { DirectChatModal } from "../../src/components/DirectChatModal";
import { supabase } from "../../src/utils/supabase";

const PRIMARY = "#E5A93C";
const DARK_BLUE = "#121622";

export interface LiveNotification {
  id: string;
  icon: string;
  color: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  category?: "booking" | "promo" | "community";
  route?: string;
}

export default function MessagesTab() {
  const currentUserId = DEMO_USER_ID;

  // Tabs: "chats" | "friends" | "calls" | "notifications"
  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "calls" | "notifications">("chats");
  const [notifCategory, setNotifCategory] = useState<"all" | "booking" | "promo" | "community">("all");

  // Messenger State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatConvo, setActiveChatConvo] = useState<ConversationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Friends State
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<FriendProfile[]>([]);

  // Calls State
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // Live Notifications State
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load All Messenger & Social Data
  const loadAllData = useCallback(async () => {
    try {
      const [convos, friendsList, reqs, suggestions, logs] = await Promise.all([
        messengerRepository.getConversations(currentUserId),
        friendsRepository.getFriends(currentUserId),
        friendsRepository.getFriendRequests(currentUserId),
        friendsRepository.getSuggestedFriends(currentUserId),
        callsRepository.getCallLogs(currentUserId),
      ]);

      setConversations(convos);
      setFriends(friendsList);
      setIncomingRequests(reqs.incoming);
      setOutgoingRequests(reqs.outgoing);
      setSuggestedFriends(suggestions);
      setCallLogs(logs);

      // Load live notifications from real bookings
      const { data: userBookings } = await supabase
        .from("bookings")
        .select("*, hotel:hotels(*), flight:flights(*)")
        .order("created_at", { ascending: false })
        .limit(5);

      const dynamicNotifs: LiveNotification[] = [];
      if (userBookings && userBookings.length > 0) {
        userBookings.forEach((b: any, idx: number) => {
          const isHotel = !!b.hotel;
          dynamicNotifs.push({
            id: b.id,
            icon: isHotel ? "bed" : "airplane",
            color: isHotel ? "#10b981" : "#0055F2",
            title: isHotel
              ? `Hotel booking ${b.status || "confirmed"}`
              : `Flight ${b.flight?.flight_number || "trip"} ${b.status || "confirmed"}`,
            body: isHotel
              ? `${b.hotel?.name || "Stay"} — Check-in ${b.check_in_date || "upcoming"}`
              : `Booking Reference: ${b.booking_reference || b.id.slice(0, 8)}`,
            time: idx === 0 ? "Recent" : `${idx + 1}d ago`,
            unread: idx === 0,
            category: "booking",
            route: "/(tabs)/trips",
          });
        });
      }

      const { data: liveAds } = await supabase
        .from("advertisements")
        .select("*")
        .eq("status", "active")
        .limit(2);

      if (liveAds) {
        liveAds.forEach((ad: any) => {
          dynamicNotifs.push({
            id: ad.id,
            icon: "pricetag",
            color: "#f59e0b",
            title: ad.title.split("—")[0].trim(),
            body: ad.title,
            time: "Promo",
            unread: false,
            category: "promo",
            route: "/screens/rewards",
          });
        });
      }

      dynamicNotifs.push({
        id: "notif-community-buddy",
        icon: "people",
        color: "#8B5CF6",
        title: "কমিউনিটি ভ্রমণসঙ্গী আপডেট",
        body: "আপনার ভ্রমণ পরিকল্পনার সাথে মিলে যাওয়া নতুন সহযাত্রী গ্রুপে যুক্ত হয়েছেন।",
        time: "Today",
        unread: true,
        category: "community",
        route: "/screens/community",
      });

      setNotifications(dynamicNotifs);
    } catch (e) {
      console.warn("Load social & messenger data error:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  // Friend Request Actions
  const handleAcceptFriendRequest = async (requestId: string, senderName: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await friendsRepository.acceptFriendRequest(requestId);
      Alert.alert("Friend Request Accepted", `You are now friends with ${senderName}!`);
      loadAllData();
    } catch (e) {
      Alert.alert("Error", "Could not accept request");
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await friendsRepository.declineFriendRequest(requestId);
      loadAllData();
    } catch (e) {
      Alert.alert("Error", "Could not decline request");
    }
  };

  const handleCancelOutgoingRequest = async (requestId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await friendsRepository.cancelFriendRequest(requestId);
      loadAllData();
    } catch (e) {
      Alert.alert("Error", "Could not cancel request");
    }
  };

  const handleSendFriendRequest = async (targetUserId: string, targetName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await friendsRepository.sendFriendRequest(currentUserId, targetUserId);
      Alert.alert("Request Sent", `Friend request sent to ${targetName}!`);
      loadAllData();
    } catch (e) {
      Alert.alert("Error", "Could not send friend request");
    }
  };

  // Chat Actions
  const handleStartChatWithFriend = async (friend: FriendProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const convo = await messengerRepository.getOrCreateDirectConversation(
        currentUserId,
        friend.id
      );
      setActiveChatConvo(convo);
    } catch (e) {
      Alert.alert("Error", "Could not open conversation");
    }
  };

  // Call Actions - Navigates directly to dedicated CallScreen
  const handleStartCall = (targetUser: FriendProfile, callType: "audio" | "video") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType,
        targetUserId: targetUser.id,
        targetName: targetUser.display_name,
        targetAvatar: targetUser.avatar_url,
        callerId: currentUserId,
      },
    });
  };

  // Open Profile - Navigates directly to dedicated UserProfileScreen
  const handleOpenProfile = (userId: string) => {
    router.push({
      pathname: "/screens/user-profile" as any,
      params: { userId },
    });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.last_message_text?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messenger & Social</Text>
          <Text style={styles.headerSubtitle}>Direct chats, friends & calls</Text>
        </View>

        <Pressable
          style={styles.communityBtn}
          onPress={() => router.push("/(tabs)/community" as any)}
        >
          <Ionicons name="people" size={16} color={PRIMARY} />
          <Text style={styles.communityBtnText}>Feed</Text>
        </Pressable>
      </View>

      {/* Main Tab Segment Bar */}
      <View style={styles.tabSegmentsRow}>
        <Pressable
          style={[styles.segmentBtn, activeTab === "chats" && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("chats");
          }}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === "chats" ? PRIMARY : "#64748B"}
          />
          <Text
            style={[styles.segmentText, activeTab === "chats" && styles.segmentTextActive]}
          >
            Chats
          </Text>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeTab === "friends" && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("friends");
          }}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "friends" ? PRIMARY : "#64748B"}
          />
          <Text
            style={[styles.segmentText, activeTab === "friends" && styles.segmentTextActive]}
          >
            Friends
          </Text>
          {incomingRequests.length > 0 && (
            <View style={styles.badgeCountPill}>
              <Text style={styles.badgeCountText}>{incomingRequests.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeTab === "calls" && styles.segmentBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("calls");
          }}
        >
          <Ionicons
            name="call"
            size={16}
            color={activeTab === "calls" ? PRIMARY : "#64748B"}
          />
          <Text
            style={[styles.segmentText, activeTab === "calls" && styles.segmentTextActive]}
          >
            Calls
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            activeTab === "notifications" && styles.segmentBtnActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("notifications");
          }}
        >
          <Ionicons
            name="notifications"
            size={16}
            color={activeTab === "notifications" ? PRIMARY : "#64748B"}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === "notifications" && styles.segmentTextActive,
            ]}
          >
            Alerts
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
      >
        {/* =================================================================== */}
        {/* TAB 1: CHATS (MESSENGER DIRECT MESSAGES) */}
        {/* =================================================================== */}
        {activeTab === "chats" && (
          <View>
            {/* Active Online Friends Row */}
            <View style={styles.onlineSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.onlineScroll}
              >
                {/* Self Story / Status Pill */}
                <View style={styles.onlineItem}>
                  <View style={styles.selfAvatarWrap}>
                    <AppImage placeholderCategory="avatar"
                      source={{
                        uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                      }}
                      style={styles.onlineAvatar}
                    />
                    <View style={styles.addStoryPlusBadge}>
                      <Ionicons name="add" size={12} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.onlineName} numberOfLines={1}>
                    Your Story
                  </Text>
                </View>

                {friends.map((friend) => (
                  <Pressable
                    key={friend.id}
                    style={styles.onlineItem}
                    onPress={() => handleStartChatWithFriend(friend)}
                  >
                    <View style={styles.onlineAvatarWrap}>
                      <AppImage placeholderCategory="avatar" source={{ uri: friend.avatar_url }} style={styles.onlineAvatar} />
                      <View style={styles.activeGreenDot} />
                    </View>
                    <Text style={styles.onlineName} numberOfLines={1}>
                      {friend.display_name.split(" ")[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Search Chats Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94A3B8"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            {/* Conversation List */}
            <Text style={styles.sectionTitle}>Recent Conversations</Text>
            {filteredConversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  Connect with friends below to start a live conversation!
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredConversations}
                keyExtractor={(convo) => convo.id}
                scrollEnabled={false}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                renderItem={({ item: convo }) => (
                <Pressable
                  key={convo.id}
                  style={styles.convoCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveChatConvo(convo);
                  }}
                >
                  <Pressable
                    style={styles.convoAvatarWrapper}
                    onPress={() => convo.other_participant && handleOpenProfile(convo.other_participant.id)}
                  >
                    <AppImage placeholderCategory="avatar"
                      source={{
                        uri:
                          convo.avatar_url ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                      }}
                      style={styles.convoAvatar}
                    />
                    <View style={styles.activeGreenDot} />
                  </Pressable>

                  <View style={styles.convoInfo}>
                    <View style={styles.convoTitleRow}>
                      <Text style={styles.convoName}>{convo.title}</Text>
                      <Text style={styles.convoTime}>
                        {new Date(convo.last_message_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    <Text style={styles.convoLastMsg} numberOfLines={1}>
                      {convo.last_message_text || "Started conversation"}
                    </Text>
                  </View>

                  {/* Quick Call Action Buttons */}
                  {convo.other_participant && (
                    <View style={styles.convoActions}>
                      <Pressable
                        style={styles.convoCallBtn}
                        onPress={() => handleStartCall(convo.other_participant!, "audio")}
                      >
                        <Ionicons name="call" size={16} color={PRIMARY} />
                      </Pressable>
                      <Pressable
                        style={styles.convoCallBtn}
                        onPress={() => handleStartCall(convo.other_participant!, "video")}
                      >
                        <Ionicons name="videocam" size={16} color={PRIMARY} />
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              )}
              />
            )}
          </View>
        )}

        {/* =================================================================== */}
        {/* TAB 2: FRIENDS (FACEBOOK FRIEND REQUESTS & DIRECTORY) */}
        {/* =================================================================== */}
        {activeTab === "friends" && (
          <View>
            {/* Received Friend Requests */}
            {incomingRequests.length > 0 && (
              <View style={styles.friendSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  <View style={styles.badgeCountPill}>
                    <Text style={styles.badgeCountText}>{incomingRequests.length}</Text>
                  </View>
                </View>

                {incomingRequests.map((req) => (
                  <View key={req.id} style={styles.friendRequestCard}>
                    <Pressable
                      onPress={() => req.sender && handleOpenProfile(req.sender.id)}
                    >
                      <AppImage placeholderCategory="avatar"
                        source={{
                          uri:
                            req.sender?.avatar_url ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                        }}
                        style={styles.requestAvatar}
                      />
                    </Pressable>

                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>
                        {req.sender?.display_name || "Traveler"}
                      </Text>
                      <Text style={styles.requestSubtitle}>
                        {req.sender?.bio || "Wants to connect with you"}
                      </Text>

                      <View style={styles.requestButtonsRow}>
                        <Pressable
                          style={styles.acceptBtn}
                          onPress={() =>
                            handleAcceptFriendRequest(
                              req.id,
                              req.sender?.display_name || "friend"
                            )
                          }
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.acceptBtnText}>Confirm</Text>
                        </Pressable>

                        <Pressable
                          style={styles.declineBtn}
                          onPress={() => handleDeclineFriendRequest(req.id)}
                        >
                          <Text style={styles.declineBtnText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Outgoing Pending Requests */}
            {outgoingRequests.length > 0 && (
              <View style={styles.friendSection}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {outgoingRequests.map((req) => (
                  <View key={req.id} style={styles.sentReqCard}>
                    <AppImage placeholderCategory="avatar"
                      source={{
                        uri:
                          req.receiver?.avatar_url ||
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                      }}
                      style={styles.sentReqAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sentReqName}>{req.receiver?.display_name}</Text>
                      <Text style={styles.sentReqTime}>Request sent</Text>
                    </View>
                    <Pressable
                      style={styles.cancelReqBtn}
                      onPress={() => handleCancelOutgoingRequest(req.id)}
                    >
                      <Text style={styles.cancelReqText}>Cancel</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* All Friends List */}
            <View style={styles.friendSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>All Friends</Text>
                <Text style={styles.sectionCountText}>({friends.length})</Text>
              </View>

              {friends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-add-outline" size={36} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No friends added yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Add friends from suggestions below!
                  </Text>
                </View>
              ) : (
                friends.map((friend) => (
                  <View key={friend.id} style={styles.friendCard}>
                    <Pressable onPress={() => handleOpenProfile(friend.id)}>
                      <AppImage placeholderCategory="avatar" source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                    </Pressable>

                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => handleOpenProfile(friend.id)}
                    >
                      <Text style={styles.friendName}>{friend.display_name}</Text>
                      <Text style={styles.friendHandle}>@{friend.username || "traveler"}</Text>
                    </Pressable>

                    <View style={styles.friendActionsRow}>
                      <Pressable
                        style={styles.messageFriendBtn}
                        onPress={() => handleStartChatWithFriend(friend)}
                      >
                        <Ionicons name="chatbubble" size={16} color={PRIMARY} />
                      </Pressable>

                      <Pressable
                        style={styles.callFriendBtn}
                        onPress={() => handleStartCall(friend, "video")}
                      >
                        <Ionicons name="videocam" size={16} color="#10B981" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Suggested Friends */}
            {suggestedFriends.length > 0 && (
              <View style={styles.friendSection}>
                <Text style={styles.sectionTitle}>People You May Know</Text>
                {suggestedFriends.map((person) => (
                  <View key={person.id} style={styles.friendCard}>
                    <Pressable onPress={() => handleOpenProfile(person.id)}>
                      <AppImage placeholderCategory="avatar" source={{ uri: person.avatar_url }} style={styles.friendAvatar} />
                    </Pressable>

                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => handleOpenProfile(person.id)}
                    >
                      <Text style={styles.friendName}>{person.display_name}</Text>
                      <Text style={styles.friendHandle}>
                        {person.location || `@${person.username}`}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.addFriendBtn}
                      onPress={() => handleSendFriendRequest(person.id, person.display_name)}
                    >
                      <Ionicons name="person-add" size={14} color="#fff" />
                      <Text style={styles.addFriendBtnText}>Add Friend</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CALLS (AUDIO & VIDEO CALL LOGS) */}
        {/* =================================================================== */}
        {activeTab === "calls" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Calls</Text>
              <Pressable
                style={styles.simulateCallBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  callService.triggerTestIncomingCall("video");
                }}
              >
                <Ionicons name="call" size={13} color="#0055F2" />
                <Text style={styles.simulateCallBtnText}>Test Incoming</Text>
              </Pressable>
            </View>
            {callLogs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="call-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No call logs yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start an audio or video call with any traveler from chat!
                </Text>
              </View>
            ) : (
              callLogs.map((log) => {
                const other = log.other_party;
                const isVideo = log.call_type === "video";
                const isMissed = log.status === "missed";

                return (
                  <View key={log.id} style={styles.callLogCard}>
                    <Pressable onPress={() => other && handleOpenProfile(other.id)}>
                      <AppImage placeholderCategory="avatar"
                        source={{
                          uri:
                            other?.avatar_url ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                        }}
                        style={styles.callAvatar}
                      />
                    </Pressable>

                    <View style={styles.callInfo}>
                      <Text style={[styles.callName, isMissed && styles.callNameMissed]}>
                        {other?.display_name || "Traveler"}
                      </Text>

                      <View style={styles.callMetaRow}>
                        <Ionicons
                          name={
                            log.is_outgoing
                              ? "arrow-up-circle"
                              : isMissed
                              ? "arrow-down-circle"
                              : "arrow-down-circle"
                          }
                          size={14}
                          color={isMissed ? "#EF4444" : log.is_outgoing ? "#0055F2" : "#10B981"}
                        />
                        <Text style={[styles.callMetaText, isMissed && { color: "#EF4444" }]}>
                          {isVideo ? "Video Call" : "Audio Call"}
                          {log.duration_seconds > 0 && ` • ${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s`}
                        </Text>
                      </View>
                    </View>

                    {other && (
                      <Pressable
                        style={styles.callBackBtn}
                        onPress={() => handleStartCall(other, log.call_type)}
                      >
                        <Ionicons
                          name={isVideo ? "videocam" : "call"}
                          size={18}
                          color={PRIMARY}
                        />
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* =================================================================== */}
        {/* TAB 4: NOTIFICATIONS & ALERTS */}
        {/* =================================================================== */}
        {activeTab === "notifications" && (
          <View>
            <Text style={styles.sectionTitle}>Booking & System Alerts</Text>

            {/* Category Filter Pills (Point 4) */}
            <View style={styles.notifFilterRow}>
              {(
                [
                  { key: "all", label: "সব (All)" },
                  { key: "booking", label: "✈️ বুকিং" },
                  { key: "promo", label: "🏷️ অফার" },
                  { key: "community", label: "👥 কমিউনিটি" },
                ] as const
              ).map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[
                    styles.notifFilterChip,
                    notifCategory === cat.key && styles.notifFilterChipActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNotifCategory(cat.key);
                  }}
                >
                  <Text
                    style={[
                      styles.notifFilterText,
                      notifCategory === cat.key && styles.notifFilterTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {notifications.filter((n) => notifCategory === "all" || n.category === notifCategory).length > 0 ? (
              <FlatList
                data={notifications.filter((n) => notifCategory === "all" || n.category === notifCategory)}
                keyExtractor={(n) => n.id}
                scrollEnabled={false}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                renderItem={({ item: n }) => (
                <Pressable key={n.id} style={[styles.notifCard, n.unread && styles.notifUnread]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNotifications((prev) =>
                      prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                    );
                    if (n.route) {
                      router.push(n.route as any);
                    } else if (n.category === "booking") {
                      router.push("/(tabs)/trips" as any);
                    } else if (n.category === "promo") {
                      router.push("/screens/rewards" as any);
                    } else if (n.category === "community") {
                      router.push("/screens/community" as any);
                    }
                  }}
                >
                  <View style={[styles.notifIcon, { backgroundColor: `${n.color}15` }]}>
                    <Ionicons name={n.icon as any} size={20} color={n.color} />
                  </View>
                  <View style={styles.notifBody}>
                    <View style={styles.notifTitleRow}>
                      <Text style={[styles.notifTitle, n.unread && styles.notifTitleUnread]}>
                        {n.title}
                      </Text>
                      {n.unread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifText} numberOfLines={2}>
                      {n.body}
                    </Text>
                    <Text style={styles.notifTime}>{n.time}</Text>
                  </View>
                </Pressable>
              )}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>All Caught Up</Text>
                <Text style={styles.emptySubtitle}>You have no new alerts or booking notifications.</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* =================================================================== */}
      {/* DIRECT CHAT MODAL */}
      {/* =================================================================== */}
      <DirectChatModal
        conversation={activeChatConvo}
        currentUserId={currentUserId}
        onClose={() => {
          setActiveChatConvo(null);
          loadAllData();
        }}
        onOpenProfile={(p) => handleOpenProfile(p.id)}
        onStartCall={(p, type) => handleStartCall(p, type)}
      />
      </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  communityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  communityBtnText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  tabSegmentsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    position: "relative",
  },
  segmentBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },
  badgeCountPill: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: "center",
  },
  badgeCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  scroll: {
    padding: 16,
  },
  onlineSection: {
    marginBottom: 16,
  },
  onlineScroll: {
    gap: 14,
    paddingVertical: 4,
  },
  onlineItem: {
    alignItems: "center",
    width: 62,
    gap: 4,
  },
  selfAvatarWrap: {
    position: "relative",
  },
  onlineAvatarWrap: {
    position: "relative",
  },
  onlineAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  addStoryPlusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  activeGreenDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  convoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  convoAvatarWrapper: {
    position: "relative",
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  convoInfo: {
    flex: 1,
  },
  convoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  convoName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  convoTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  convoLastMsg: {
    fontSize: 12,
    color: "#64748B",
  },
  convoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  convoCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  friendSection: {
    marginBottom: 20,
  },
  friendRequestCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    elevation: 2,
  },
  requestAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  requestSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 8,
  },
  requestButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: PRIMARY,
    paddingVertical: 7,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  declineBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 7,
    borderRadius: 8,
  },
  declineBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  sentReqCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  sentReqAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sentReqName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  sentReqTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  cancelReqBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelReqText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  friendHandle: {
    fontSize: 11,
    color: "#64748B",
  },
  friendActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  messageFriendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  callFriendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addFriendBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  callLogCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  callAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  callNameMissed: {
    color: "#EF4444",
  },
  callMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  callMetaText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  callBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  notifFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  notifFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  notifFilterChipActive: {
    backgroundColor: PRIMARY,
  },
  notifFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  notifFilterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    elevation: 2,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    flex: 1,
  },
  notifTitleUnread: {
    color: "#111827",
    fontWeight: "900",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  notifText: {
    fontSize: 12,
    color: "#667085",
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
  },
  simulateCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 85, 242, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 85, 242, 0.2)",
  },
  simulateCallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0055F2",
  },
});
