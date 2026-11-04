import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { router, useLocalSearchParams } from "expo-router";

import type { UIScreen } from "../data/screens";
import { TopBar } from "./TopBar";
import { BottomNav, AiPill } from "./Navigation";
import { StoriesBar } from "../components/StoriesBar";
import { CommunityPost } from "../components/CommunityPost";
import { DirectChatModal } from "../components/DirectChatModal";
import { FriendProfile } from "../services/repositories/friends";
import { messengerRepository, ConversationItem } from "../services/repositories/messenger";
import { callsRepository } from "../services/repositories/calls";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../utils/supabase";
import { communityRepository } from "../services/repositories/community";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TRIP_BLUE = "#0055F2";
const TRIP_DARK_BLUE = "#000666";
const ACCENT_YELLOW = "#FACC15";

const DEMO_USER_ID = "5e491c34-50b4-4d2a-8cac-d09fddd7745c"; // Elvis Mittra (seeded auth.user)

const PRESET_PHOTO_IDEAS = [
  { label: "Eco Retreat", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", location: "Bogra, Bangladesh" },
  { label: "Swamp Forest", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800", location: "Sylhet, Bangladesh" },
  { label: "Coral Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", location: "Cox's Bazar, Bangladesh" },
  { label: "Kyoto Temple", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800", location: "Kyoto, Japan" },
];

const PRESET_VIDEO_IDEAS = [
  { label: "Beach Waves", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", location: "Cox's Bazar, Bangladesh" },
  { label: "Mountain Mist", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", location: "Sajek Valley, Bangladesh" },
  { label: "Island Resort", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", location: "Saint Martin, Bangladesh" },
  { label: "City Night", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", location: "Tokyo, Japan" },
];

const formatDate = (date?: string) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export function CommunitySpecializedScreen({ screen }: { screen: UIScreen }) {
  const color = screen.theme === "luxe" ? TRIP_DARK_BLUE : TRIP_BLUE;
  const { user } = useAuth();
  const activeUserId = user?.id || DEMO_USER_ID;
  const searchParams = useLocalSearchParams<{ postId?: string; q?: string }>();

  // Main Tabs: "feed" | "influencers" | "groups"
  const [activeTab, setActiveTab] = useState<"feed" | "influencers" | "groups">("feed");
  const [feedFilter, setFeedFilter] = useState<"all" | "nearby" | "trending" | "saved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Data States
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("d1111111-1111-1111-1111-111111111111");

  // Interaction States
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals & Inputs
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postMediaType, setPostMediaType] = useState<"image" | "video">("image");
  const [isPosting, setIsPosting] = useState(false);

  // Social & Messenger Interaction States
  const [activeChatConvo, setActiveChatConvo] = useState<ConversationItem | null>(null);

  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyImage, setStoryImage] = useState("");
  const [storyCaption, setStoryCaption] = useState("");
  const [storyLocation, setStoryLocation] = useState("");
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  const [activeCommentPost, setActiveCommentPost] = useState<any | null>(null);
  const [commentInputText, setCommentInputText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDestination, setNewGroupDestination] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [chatMessageText, setChatMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 1. Fetch All Community Data
  const loadCommunityData = useCallback(async () => {
    try {
      // Posts with author and media
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (postsData && postsData.length > 0) {
        setPosts(postsData);
      }

      // Stories with author
      const { data: storiesData } = await supabase
        .from("stories")
        .select("*, author:community_profiles!stories_user_id_fkey(*)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (storiesData && storiesData.length > 0) {
        setStories(
          storiesData.map((s: any) => ({
            id: s.id,
            name: s.author?.display_name || "Traveler",
            image: s.author?.avatar_url || s.media_url,
            media_url: s.media_url,
            caption: s.caption,
            location: s.location,
          }))
        );
      }

      // Groups
      const { data: groupsData } = await supabase
        .from("groups")
        .select("*, owner:community_profiles!groups_owner_id_fkey(*)")
        .order("members_count", { ascending: false });

      if (groupsData && groupsData.length > 0) {
        setGroups(groupsData);
        if (!selectedGroupId && groupsData[0]?.id) {
          setSelectedGroupId(groupsData[0].id);
        }
      }

      // Influencers
      const { data: influencerData } = await supabase
        .from("community_profiles")
        .select("*")
        .eq("is_influencer", true)
        .order("followers_count", { ascending: false });

      if (influencerData && influencerData.length > 0) {
        setInfluencers(influencerData);
      }

      // User Likes
      if (activeUserId) {
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", activeUserId);

        if (likesData) {
          setLikedPostIds(new Set(likesData.map((l: any) => l.post_id)));
        }

        const { data: savedData } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", activeUserId);

        if (savedData) {
          setSavedPostIds(new Set(savedData.map((s: any) => s.post_id)));
        }
      }

      // Preload top comments for posts
      const { data: allComments } = await supabase
        .from("post_comments")
        .select("*, author:community_profiles!post_comments_user_id_fkey(*)")
        .order("created_at", { ascending: true });

      if (allComments) {
        const cMap: Record<string, any[]> = {};
        allComments.forEach((c: any) => {
          if (!cMap[c.post_id]) cMap[c.post_id] = [];
          cMap[c.post_id].push(c);
        });
        setCommentsMap(cMap);
      }
    } catch (error) {
      console.warn("Community fetch warning:", error);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, selectedGroupId]);

  // Load group messages when active group changes
  const loadGroupMessages = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*, author:community_profiles!group_messages_user_id_fkey(*)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setGroupMessages(data);
      }
    } catch (e) {
      console.warn("Group messages load warning:", e);
    }
  }, []);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupMessages(selectedGroupId);
    }
  }, [selectedGroupId, loadGroupMessages]);

  // Realtime Subscriptions
  useEffect(() => {
    const channelId = `community-live-${Math.random().toString(36).substring(2, 9)}`;
    const liveChannel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        loadCommunityData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        loadCommunityData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, () => {
        if (selectedGroupId) loadGroupMessages(selectedGroupId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveChannel);
    };
  }, [loadCommunityData, selectedGroupId, loadGroupMessages]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadCommunityData();
    if (selectedGroupId) await loadGroupMessages(selectedGroupId);
    setIsRefreshing(false);
  };

  // Like Toggle Handler
  const handleToggleLike = async (post: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isLiked = likedPostIds.has(post.id);
    const nextLiked = !isLiked;

    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (nextLiked ? 1 : -1)) }
          : p
      )
    );

    try {
      if (nextLiked) {
        await supabase
          .from("post_likes")
          .upsert([{ post_id: post.id, user_id: activeUserId }], { onConflict: "post_id,user_id" });
      } else {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", activeUserId);
      }
      const newCount = Math.max(0, (post.likes_count || 0) + (nextLiked ? 1 : -1));
      await supabase.from("posts").update({ likes_count: newCount }).eq("id", post.id);
    } catch (e) {
      console.warn("Like sync error:", e);
    }
  };

  // Save / Bookmark Toggle Handler
  const handleToggleSave = async (post: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isSaved = savedPostIds.has(post.id);
    const nextSaved = !isSaved;

    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    try {
      if (nextSaved) {
        await supabase
          .from("saved_posts")
          .upsert([{ post_id: post.id, user_id: activeUserId }], { onConflict: "post_id,user_id" });
      } else {
        await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", activeUserId);
      }
    } catch (e) {
      console.warn("Save sync error:", e);
    }
  };

  // Follow Toggle Handler
  const handleToggleFollow = async (profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isFollowing = followingUserIds.has(profileId);
    const nextFollowing = !isFollowing;

    setFollowingUserIds((prev) => {
      const next = new Set(prev);
      if (nextFollowing) next.add(profileId);
      else next.delete(profileId);
      return next;
    });

    setInfluencers((prev) =>
      prev.map((inf) =>
        inf.id === profileId
          ? { ...inf, followers_count: (inf.followers_count || 0) + (nextFollowing ? 1 : -1) }
          : inf
      )
    );

    try {
      if (nextFollowing) {
        await supabase
          .from("user_follows")
          .upsert([{ follower_id: activeUserId, following_id: profileId }], { onConflict: "follower_id,following_id" });
      } else {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", activeUserId)
          .eq("following_id", profileId);
      }
    } catch (e) {
      console.warn("Follow error:", e);
    }
  };

  // Comment Submit Handler
  const handleAddComment = async () => {
    if (!activeCommentPost || !commentInputText.trim()) return;
    setIsSubmittingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const commentText = commentInputText.trim();
    const postId = activeCommentPost.id;

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert([
          {
            post_id: postId,
            user_id: activeUserId,
            content: commentText,
            likes_count: 0,
          },
        ])
        .select("*, author:community_profiles!post_comments_user_id_fkey(*)")
        .single();

      if (!error && data) {
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data],
        }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
        );
        setCommentInputText("");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Create Post Submit Handler
  const handleCreatePost = async () => {
    if (!postTitle.trim()) {
      Alert.alert("Required", "Please provide a trip title.");
      return;
    }
    setIsPosting(true);

    try {
      const { data: newPost, error: postErr } = await supabase
        .from("posts")
        .insert([
          {
            user_id: activeUserId,
            title: postTitle.trim(),
            content: postContent.trim() || undefined,
            location: postLocation.trim() || "Bangladesh",
            status: "published",
            visibility: "public",
            likes_count: 0,
            comments_count: 0,
          },
        ])
        .select()
        .single();

      if (postErr) throw postErr;

      if (postImage.trim() && newPost?.id) {
        await supabase.from("post_media").insert([
          {
            post_id: newPost.id,
            media_url: postImage.trim(),
            media_type: postMediaType,
            sort_order: 0,
          },
        ]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreatePostModal(false);
      setPostTitle("");
      setPostContent("");
      setPostImage("");
      setPostLocation("");
      setPostMediaType("image");
      await loadCommunityData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not publish post.");
    } finally {
      setIsPosting(false);
    }
  };

  // Messenger & Call Handlers
  const handleOpenChatWithUser = async (targetUser: FriendProfile) => {
    try {
      const convo = await messengerRepository.getOrCreateDirectConversation(
        activeUserId,
        targetUser.id
      );
      setActiveChatConvo(convo);
    } catch (e) {
      Alert.alert("Error", "Could not start chat");
    }
  };

  const handleStartCall = (
    targetUser: FriendProfile,
    callType: "audio" | "video"
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType,
        targetUserId: targetUser.id,
        targetName: targetUser.display_name,
        targetAvatar: targetUser.avatar_url,
        callerId: activeUserId,
      },
    });
  };

  // Create Story Submit Handler
  const handleCreateStory = async () => {
    if (!storyImage.trim()) {
      Alert.alert("Required", "Please provide a story photo URL.");
      return;
    }

    try {
      const { error } = await supabase.from("stories").insert([
        {
          user_id: activeUserId,
          media_url: storyImage.trim(),
          media_type: "image",
          caption: storyCaption.trim() || "Travel moment ✈️",
          location: storyLocation.trim() || undefined,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      ]);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateStoryModal(false);
      setStoryImage("");
      setStoryCaption("");
      setStoryLocation("");
      await loadCommunityData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not share story.");
    }
  };

  // Create Group Submit Handler
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert("Required", "Please provide a group name.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("groups")
        .insert([
          {
            owner_id: activeUserId,
            name: newGroupName.trim(),
            destination: newGroupDestination.trim() || "Global",
            description: newGroupDesc.trim() || "Community travel tribe.",
            avatar_url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400",
            privacy: "public",
            members_count: 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setNewGroupDestination("");
      setNewGroupDesc("");
      if (data?.id) setSelectedGroupId(data.id);
      await loadCommunityData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create group.");
    }
  };

  // Send Group Message Handler
  const handleSendGroupMessage = async () => {
    if (!chatMessageText.trim() || !selectedGroupId) return;
    setIsSendingMessage(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data, error } = await supabase
        .from("group_messages")
        .insert([
          {
            group_id: selectedGroupId,
            user_id: activeUserId,
            content: chatMessageText.trim(),
          },
        ])
        .select("*, author:community_profiles!group_messages_user_id_fkey(*)")
        .single();

      if (!error && data) {
        setGroupMessages((prev) => [...prev, data]);
        setChatMessageText("");
      }
    } catch (e) {
      console.warn("Send message error:", e);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Filtered Posts Calculation
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.author?.display_name?.toLowerCase().includes(q)
      );
    }

    if (feedFilter === "saved") {
      list = list.filter((p) => savedPostIds.has(p.id));
    } else if (feedFilter === "nearby") {
      list = list.filter(
        (p) =>
          p.location?.toLowerCase().includes("bogra") ||
          p.location?.toLowerCase().includes("sylhet") ||
          p.location?.toLowerCase().includes("cox") ||
          p.location?.toLowerCase().includes("dhaka")
      );
    } else if (feedFilter === "trending") {
      list = list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }

    return list;
  }, [posts, searchQuery, feedFilter, savedPostIds]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || groups[0],
    [groups, selectedGroupId]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header Bar */}
      <View style={styles.communityHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Travel Community</Text>
          <Text style={styles.headerSubtitle}>Discover stories, creators & trips</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => setShowSearchBar(!showSearchBar)}
          >
            <Ionicons name="search" size={20} color={TRIP_DARK_BLUE} />
          </Pressable>

          <Pressable
            style={styles.createPostBtn}
            onPress={() => setShowCreatePostModal(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createPostBtnText}>Post</Text>
          </Pressable>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearchBar && (
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search destination, creator, or topic..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      )}

      {/* Main Segmented Tabs */}
      <View style={styles.tabsSegment}>
        <Pressable
          style={[styles.tabSegmentBtn, activeTab === "feed" && styles.tabSegmentBtnActive]}
          onPress={() => setActiveTab("feed")}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={activeTab === "feed" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[styles.tabSegmentText, activeTab === "feed" && styles.tabSegmentTextActive]}
          >
            Feed
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabSegmentBtn, activeTab === "influencers" && styles.tabSegmentBtnActive]}
          onPress={() => setActiveTab("influencers")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "influencers" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[
              styles.tabSegmentText,
              activeTab === "influencers" && styles.tabSegmentTextActive,
            ]}
          >
            Influencers
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabSegmentBtn, activeTab === "groups" && styles.tabSegmentBtnActive]}
          onPress={() => setActiveTab("groups")}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === "groups" ? TRIP_BLUE : "#64748B"}
          />
          <Text
            style={[styles.tabSegmentText, activeTab === "groups" && styles.tabSegmentTextActive]}
          >
            Groups & Chat
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[TRIP_BLUE]} />}
      >
        {/* =================================================================== */}
        {/* TAB 1: FEED */}
        {/* =================================================================== */}
        {activeTab === "feed" && (
          <View>
            {/* Stories Bar */}
            <View style={styles.storiesSection}>
              <StoriesBar
                stories={stories}
                onAddStory={() => setShowCreateStoryModal(true)}
                onStoryPress={(storyName) => {
                  const match = stories.find((s) => s.name === storyName);
                  if (match) setSelectedStory(match);
                }}
              />
            </View>

            {/* Feed Sub-filters */}
            <View style={styles.feedFiltersRow}>
              {(["all", "nearby", "trending", "saved"] as const).map((filter) => (
                <Pressable
                  key={filter}
                  style={[
                    styles.feedFilterPill,
                    feedFilter === filter && styles.feedFilterPillActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFeedFilter(filter);
                  }}
                >
                  <Text
                    style={[
                      styles.feedFilterPillText,
                      feedFilter === filter && styles.feedFilterPillTextActive,
                    ]}
                  >
                    {filter === "all"
                      ? "All Posts"
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Posts Feed */}
            <View style={styles.postsListWrapper}>
              {loading && posts.length === 0 ? (
                <ActivityIndicator size="large" color={TRIP_BLUE} style={{ marginVertical: 32 }} />
              ) : filteredPosts.length === 0 ? (
                <View style={styles.emptyFeedBox}>
                  <Ionicons name="images-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyFeedTitle}>No posts found</Text>
                  <Text style={styles.emptyFeedSubtitle}>
                    Be the first traveler to share an adventure moment!
                  </Text>
                  <Pressable
                    style={styles.emptyCreateBtn}
                    onPress={() => setShowCreatePostModal(true)}
                  >
                    <Text style={styles.emptyCreateBtnText}>Create Post</Text>
                  </Pressable>
                </View>
              ) : (
                filteredPosts.map((post) => {
                  const author = post.author || {};
                  const media = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : undefined;
                  const isVideo = media?.media_type === "video";
                  const isLiked = likedPostIds.has(post.id);
                  const isSaved = savedPostIds.has(post.id);
                  const postComments = commentsMap[post.id] || [];

                  return (
                    <CommunityPost
                      key={post.id}
                      authorName={author.display_name || "Traveler"}
                      authorImage={author.avatar_url}
                      role={author.influencer_category || (author.is_influencer ? "Influencer" : undefined)}
                      isInfluencer={author.is_influencer}
                      location={post.location}
                      timestamp={formatDate(post.created_at)}
                      title={post.title}
                      description={post.content}
                      postImage={isVideo ? undefined : media?.media_url}
                      postVideo={isVideo ? media?.media_url : undefined}
                      likes={post.likes_count || 0}
                      comments={post.comments_count || postComments.length}
                      liked={isLiked}
                      saved={isSaved}
                      commentsList={postComments}
                      onLike={() => handleToggleLike(post)}
                      onSave={() => handleToggleSave(post)}
                      onComment={() => setActiveCommentPost(post)}
                      onOpenProfile={() => {
                        const targetId = author.id || post.user_id;
                        if (targetId) {
                          router.push({
                            pathname: "/screens/user-profile" as any,
                            params: { userId: targetId },
                          });
                        }
                      }}
                      onShare={async () => {
                        try {
                          await Share.share({
                            title: post.title,
                            message: `Explore "${post.title}" by ${author.display_name || "Traveler"} on Shopnojatra Travel! ✈️\n${post.location || ""}`,
                          });
                        } catch (e) {
                          console.warn(e);
                        }
                      }}
                      onExploreSpot={() => {
                        router.push({
                          pathname: "/screens/search-stays" as any,
                          params: { q: post.location || "Bangladesh" },
                        });
                      }}
                    />
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* TAB 2: INFLUENCERS & TOP CREATORS */}
        {/* =================================================================== */}
        {activeTab === "influencers" && (
          <View style={styles.influencerTabContent}>
            <Text style={styles.sectionHeading}>Top Verified Creators</Text>
            <Text style={styles.sectionSubtitle}>
              Follow curated travel photographers, food scouts & local guides
            </Text>

            <View style={styles.influencersGrid}>
              {influencers.map((inf) => {
                const isFollowing = followingUserIds.has(inf.id);
                return (
                  <View key={inf.id} style={styles.influencerHeroCard}>
                    <Pressable
                      style={styles.influencerCardHeader}
                      onPress={() =>
                        router.push({
                          pathname: "/screens/user-profile" as any,
                          params: { userId: inf.id },
                        })
                      }
                    >
                      <Image
                        source={{ uri: inf.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" }}
                        style={styles.influencerBigAvatar}
                      />
                      <View style={styles.influencerHeaderInfo}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={styles.influencerCardName}>{inf.display_name}</Text>
                          <Ionicons name="checkmark-circle" size={16} color={TRIP_BLUE} />
                        </View>
                        <Text style={styles.influencerHandle}>@{inf.username || "creator"}</Text>
                        <View style={styles.badgePillAmber}>
                          <Text style={styles.badgePillAmberText}>
                            {inf.influencer_category || "Top Creator"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    <Text style={styles.influencerBio}>{inf.bio || "Sharing breathtaking travel scenes."}</Text>

                    <View style={styles.influencerStatsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>
                          {inf.followers_count ? (inf.followers_count / 1000).toFixed(1) + "k" : "12.4k"}
                        </Text>
                        <Text style={styles.statBoxLabel}>Followers</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>{inf.posts_count || 48}</Text>
                        <Text style={styles.statBoxLabel}>Posts</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statBoxValue}>{inf.location ? inf.location.split(",")[0] : "Asia"}</Text>
                        <Text style={styles.statBoxLabel}>Based</Text>
                      </View>
                    </View>

                    <Pressable
                      style={[
                        styles.followActionBtn,
                        isFollowing && styles.followActionBtnActive,
                      ]}
                      onPress={() => handleToggleFollow(inf.id)}
                    >
                      <Ionicons
                        name={isFollowing ? "checkmark" : "person-add"}
                        size={16}
                        color={isFollowing ? "#0055F2" : "#FFFFFF"}
                      />
                      <Text
                        style={[
                          styles.followActionBtnText,
                          isFollowing && styles.followActionBtnTextActive,
                        ]}
                      >
                        {isFollowing ? "Following" : "Follow Creator"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* TAB 3: GROUPS & LIVE CHAT */}
        {/* =================================================================== */}
        {activeTab === "groups" && (
          <View style={styles.groupsTabContent}>
            <View style={styles.groupsHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Travel Tribes & Communities</Text>
                <Text style={styles.sectionSubtitle}>Join group discussions & meet travelers</Text>
              </View>
              <Pressable
                style={styles.newGroupBtn}
                onPress={() => setShowCreateGroupModal(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.newGroupBtnText}>New Group</Text>
              </Pressable>
            </View>

            {/* Horizontal Groups Picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupsChipList}
            >
              {groups.map((g) => {
                const isSelected = selectedGroupId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    style={[styles.groupCardPill, isSelected && styles.groupCardPillActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedGroupId(g.id);
                    }}
                  >
                    <Image
                      source={{ uri: g.avatar_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200" }}
                      style={styles.groupPillAvatar}
                    />
                    <View>
                      <Text style={[styles.groupPillName, isSelected && styles.groupPillNameActive]}>
                        {g.name}
                      </Text>
                      <Text style={styles.groupPillSub}>
                        {g.members_count || 120} members • {g.destination || "Asia"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Active Group Live Chat Box */}
            {activeGroup && (
              <View style={styles.groupChatContainer}>
                <View style={styles.groupChatHeader}>
                  <View>
                    <Text style={styles.groupChatTitle}>{activeGroup.name}</Text>
                    <Text style={styles.groupChatDesc}>{activeGroup.description}</Text>
                  </View>
                  <View style={styles.destinationBadge}>
                    <Ionicons name="earth" size={12} color="#0055F2" />
                    <Text style={styles.destinationBadgeText}>{activeGroup.destination || "Global"}</Text>
                  </View>
                </View>

                {/* Messages Feed */}
                <View style={styles.messagesFeed}>
                  {groupMessages.length === 0 ? (
                    <Text style={styles.emptyMessagesText}>
                      No messages yet. Say hello to the tribe!
                    </Text>
                  ) : (
                    groupMessages.map((msg) => {
                      const isMe = msg.user_id === activeUserId;
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageRow,
                            isMe ? styles.messageRowMe : styles.messageRowOther,
                          ]}
                        >
                          {!isMe && (
                            <Image
                              source={{ uri: msg.author?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" }}
                              style={styles.chatAuthorAvatar}
                            />
                          )}
                          <View
                            style={[
                              styles.messageBubble,
                              isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                            ]}
                          >
                            {!isMe && (
                              <Text style={styles.chatAuthorName}>
                                {msg.author?.display_name || "Traveler"}
                              </Text>
                            )}
                            <Text
                              style={[
                                styles.messageContentText,
                                isMe && styles.messageContentTextMe,
                              ]}
                            >
                              {msg.content}
                            </Text>
                            <Text
                              style={[
                                styles.messageTimeText,
                                isMe && styles.messageTimeTextMe,
                              ]}
                            >
                              {formatDate(msg.created_at)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Message Input Box */}
                <View style={styles.messageComposerRow}>
                  <TextInput
                    style={styles.messageComposerInput}
                    placeholder={`Message ${activeGroup.name}...`}
                    value={chatMessageText}
                    onChangeText={setChatMessageText}
                  />
                  <Pressable
                    style={[
                      styles.sendMsgBtn,
                      !chatMessageText.trim() && { opacity: 0.5 },
                    ]}
                    onPress={handleSendGroupMessage}
                    disabled={!chatMessageText.trim() || isSendingMessage}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW POST */}
      {/* =================================================================== */}
      <Modal
        visible={showCreatePostModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreatePostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalMainTitle}>Share Travel Moment</Text>
              <Pressable onPress={() => setShowCreatePostModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Media Type Switcher */}
              <View style={styles.postTypeSwitchRow}>
                <Pressable
                  style={[
                    styles.postTypeSwitchBtn,
                    postMediaType === "image" && styles.postTypeSwitchBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPostMediaType("image");
                    setPostImage(PRESET_PHOTO_IDEAS[0].url);
                  }}
                >
                  <Ionicons
                    name="image"
                    size={16}
                    color={postMediaType === "image" ? TRIP_BLUE : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.postTypeSwitchText,
                      postMediaType === "image" && styles.postTypeSwitchTextActive,
                    ]}
                  >
                    Photo Post
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.postTypeSwitchBtn,
                    postMediaType === "video" && styles.postTypeSwitchBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPostMediaType("video");
                    setPostImage(PRESET_VIDEO_IDEAS[0].url);
                  }}
                >
                  <Ionicons
                    name="videocam"
                    size={16}
                    color={postMediaType === "video" ? TRIP_BLUE : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.postTypeSwitchText,
                      postMediaType === "video" && styles.postTypeSwitchTextActive,
                    ]}
                  >
                    Video Post
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.modalInputLabel}>Trip Title</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="e.g. Momo Inn: Bogura's Hidden Garden Oasis..."
                value={postTitle}
                onChangeText={setPostTitle}
              />

              <Text style={styles.modalInputLabel}>Destination / Location</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="e.g. Bogra, Bangladesh or Kyoto, Japan"
                value={postLocation}
                onChangeText={setPostLocation}
              />

              <Text style={styles.modalInputLabel}>
                {postMediaType === "video" ? "Video URL (MP4 Stream)" : "Photo URL"}
              </Text>
              <TextInput
                style={styles.modalInputField}
                placeholder={
                  postMediaType === "video"
                    ? "https://commondatastorage.googleapis.com/...mp4"
                    : "https://images.unsplash.com/..."
                }
                value={postImage}
                onChangeText={setPostImage}
              />

              {/* Photo/Video presets for quick testing */}
              <Text style={styles.presetLabel}>
                {postMediaType === "video" ? "Quick Video Presets:" : "Quick Photo Presets:"}
              </Text>
              <View style={styles.presetsRow}>
                {(postMediaType === "video" ? PRESET_VIDEO_IDEAS : PRESET_PHOTO_IDEAS).map((preset) => (
                  <Pressable
                    key={preset.label}
                    style={styles.presetTag}
                    onPress={() => {
                      setPostImage(preset.url);
                      if (!postLocation) setPostLocation(preset.location);
                      if (!postTitle) setPostTitle(`${preset.label} Journey`);
                    }}
                  >
                    <Text style={styles.presetTagText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.modalInputLabel}>Trip Story / Travel Tips</Text>
              <TextInput
                style={[styles.modalInputField, styles.modalTextArea]}
                placeholder="Describe the experience, budget, best time to visit..."
                value={postContent}
                onChangeText={setPostContent}
                multiline
              />

              <Pressable
                style={[styles.modalSubmitBtn, isPosting && { opacity: 0.6 }]}
                onPress={handleCreatePost}
                disabled={isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Publish to Community</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: ADD STORY */}
      {/* =================================================================== */}
      <Modal
        visible={showCreateStoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalMainTitle}>Post 24h Travel Story</Text>
              <Pressable onPress={() => setShowCreateStoryModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalInputLabel}>Story Photo URL</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="https://images.unsplash.com/..."
              value={storyImage}
              onChangeText={setStoryImage}
            />

            <View style={styles.presetsRow}>
              {PRESET_PHOTO_IDEAS.map((preset) => (
                <Pressable
                  key={`story-${preset.label}`}
                  style={styles.presetTag}
                  onPress={() => {
                    setStoryImage(preset.url);
                    setStoryLocation(preset.location);
                  }}
                >
                  <Text style={styles.presetTagText}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalInputLabel}>Caption</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Gliding through Ratargul swamp on wooden canoe 🛶"
              value={storyCaption}
              onChangeText={setStoryCaption}
            />

            <Text style={styles.modalInputLabel}>Location</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Sylhet, Bangladesh"
              value={storyLocation}
              onChangeText={setStoryLocation}
            />

            <Pressable style={styles.modalSubmitBtn} onPress={handleCreateStory}>
              <Text style={styles.modalSubmitBtnText}>Share Story</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: STORY VIEWER */}
      {/* =================================================================== */}
      <Modal
        visible={!!selectedStory}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedStory(null)}
      >
        {selectedStory && (
          <View style={styles.storyViewerContainer}>
            <Image source={{ uri: selectedStory.media_url }} style={styles.storyViewerImage} resizeMode="cover" />
            <LinearGradient
              colors={["rgba(0,0,0,0.7)", "transparent", "rgba(0,0,0,0.8)"]}
              style={StyleSheet.absoluteFill}
            />

            {/* Story Top Bar */}
            <SafeAreaView style={styles.storyViewerTopBar} edges={["top"]}>
              <Pressable
                style={styles.storyViewerAuthorRow}
                onPress={() => {
                  const targetId = selectedStory.user_id || selectedStory.id;
                  setSelectedStory(null);
                  router.push({
                    pathname: "/screens/user-profile" as any,
                    params: { userId: targetId },
                  });
                }}
              >
                <Image source={{ uri: selectedStory.image }} style={styles.storyViewerAvatar} />
                <View>
                  <Text style={styles.storyViewerAuthorName}>{selectedStory.name}</Text>
                  {selectedStory.location && (
                    <Text style={styles.storyViewerLocation}>{selectedStory.location}</Text>
                  )}
                </View>
              </Pressable>

              <Pressable
                style={styles.storyCloseBtn}
                onPress={() => setSelectedStory(null)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </SafeAreaView>

            {/* Story Bottom Caption & Reaction Bar */}
            <View style={styles.storyViewerBottomCaption}>
              <Text style={styles.storyViewerCaptionText}>{selectedStory.caption}</Text>

              <View style={styles.storyReactionRow}>
                <Pressable
                  style={styles.storyReplyBubble}
                  onPress={() => {
                    const targetId = selectedStory.user_id || selectedStory.id;
                    setSelectedStory(null);
                    router.push({
                      pathname: "/screens/user-profile" as any,
                      params: { userId: targetId },
                    });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.storyReplyText}>Send message...</Text>
                </Pressable>

                <Pressable
                  style={styles.storyHeartBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Liked Story", `Sent a ❤️ to ${selectedStory.name}!`);
                  }}
                >
                  <Ionicons name="heart" size={24} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: COMMENTS SHEET */}
      {/* =================================================================== */}
      <Modal
        visible={!!activeCommentPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveCommentPost(null)}
      >
        {activeCommentPost && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: "80%" }]}>
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalMainTitle}>Comments</Text>
                  <Text style={styles.commentsPostTitle} numberOfLines={1}>
                    {activeCommentPost.title}
                  </Text>
                </View>
                <Pressable onPress={() => setActiveCommentPost(null)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginVertical: 12 }}>
                {(commentsMap[activeCommentPost.id] || []).length === 0 ? (
                  <Text style={styles.emptyCommentsText}>
                    No comments yet. Start the conversation!
                  </Text>
                ) : (
                  (commentsMap[activeCommentPost.id] || []).map((c: any) => (
                    <View key={c.id} style={styles.fullCommentItem}>
                      <Pressable
                        onPress={() => {
                          const authorId = c.author?.id || c.user_id;
                          if (authorId) {
                            setActiveCommentPost(null);
                            router.push({
                              pathname: "/screens/user-profile" as any,
                              params: { userId: authorId },
                            });
                          }
                        }}
                      >
                        <Image
                          source={{
                            uri:
                              c.author?.avatar_url ||
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
                          }}
                          style={styles.fullCommentAvatar}
                        />
                      </Pressable>
                      <View style={styles.fullCommentBody}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Pressable
                            onPress={() => {
                              const authorId = c.author?.id || c.user_id;
                              if (authorId) {
                                setActiveCommentPost(null);
                                router.push({
                                  pathname: "/screens/user-profile" as any,
                                  params: { userId: authorId },
                                });
                              }
                            }}
                          >
                            <Text style={styles.fullCommentAuthorName}>
                              {c.author?.display_name || "Traveler"}
                            </Text>
                          </Pressable>
                          <Text style={styles.fullCommentTime}>{formatDate(c.created_at)}</Text>
                        </View>
                        <Text style={styles.fullCommentText}>{c.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Add Comment Input */}
              <View style={styles.addCommentInputRow}>
                <TextInput
                  style={styles.addCommentInput}
                  placeholder="Write a comment..."
                  value={commentInputText}
                  onChangeText={setCommentInputText}
                />
                <Pressable
                  style={[
                    styles.submitCommentBtn,
                    !commentInputText.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddComment}
                  disabled={!commentInputText.trim() || isSubmittingComment}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW GROUP */}
      {/* =================================================================== */}
      <Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalMainTitle}>Create Travel Tribe</Text>
              <Pressable onPress={() => setShowCreateGroupModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalInputLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Sylhet Waterfall Trekkers"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.modalInputLabel}>Destination / Focus</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Bangladesh Nature & Treks"
              value={newGroupDestination}
              onChangeText={setNewGroupDestination}
            />

            <Text style={styles.modalInputLabel}>Description</Text>
            <TextInput
              style={[styles.modalInputField, styles.modalTextArea]}
              placeholder="What this tribe discusses, meeting plans, guidelines..."
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
              multiline
            />

            <Pressable style={styles.modalSubmitBtn} onPress={handleCreateGroup}>
              <Text style={styles.modalSubmitBtnText}>Create Group</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Direct Messenger Modal */}
      <DirectChatModal
        conversation={activeChatConvo}
        currentUserId={activeUserId}
        onClose={() => setActiveChatConvo(null)}
        onOpenProfile={(p) =>
          router.push({
            pathname: "/screens/user-profile" as any,
            params: { userId: p.id },
          })
        }
        onStartCall={(p, type) => handleStartCall(p, type)}
      />

      <AiPill color={color} />
      <BottomNav active={screen.activeTab ?? "Post"} color={color} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  postTypeSwitchRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  postTypeSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postTypeSwitchBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postTypeSwitchText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  postTypeSwitchTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  communityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: TRIP_DARK_BLUE,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  createPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: TRIP_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createPostBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  tabsSegment: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  tabSegmentBtnActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabSegmentTextActive: {
    color: TRIP_BLUE,
    fontWeight: "800",
  },
  scrollView: {
    flex: 1,
  },
  storiesSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  feedFiltersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  feedFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  feedFilterPillActive: {
    backgroundColor: TRIP_BLUE,
    borderColor: TRIP_BLUE,
  },
  feedFilterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  feedFilterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  postsListWrapper: {
    paddingHorizontal: 16,
  },
  emptyFeedBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyFeedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyFeedSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 240,
  },
  emptyCreateBtn: {
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  influencerTabContent: {
    padding: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  influencersGrid: {
    gap: 14,
  },
  influencerHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  influencerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  influencerBigAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: ACCENT_YELLOW,
  },
  influencerHeaderInfo: {
    flex: 1,
  },
  influencerCardName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  influencerHandle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  badgePillAmber: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  badgePillAmberText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "700",
  },
  influencerBio: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },
  influencerStatsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  statBoxLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  followActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: TRIP_BLUE,
    paddingVertical: 10,
    borderRadius: 12,
  },
  followActionBtnActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  followActionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  followActionBtnTextActive: {
    color: "#0055F2",
  },
  groupsTabContent: {
    padding: 16,
  },
  groupsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  newGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TRIP_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  newGroupBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  groupsChipList: {
    gap: 10,
    paddingBottom: 16,
  },
  groupCardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minWidth: 200,
  },
  groupCardPillActive: {
    borderColor: TRIP_BLUE,
    backgroundColor: "#F0F7FF",
  },
  groupPillAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  groupPillName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  groupPillNameActive: {
    color: TRIP_BLUE,
  },
  groupPillSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  groupChatContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  groupChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
    marginBottom: 12,
  },
  groupChatTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  groupChatDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  destinationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  destinationBadgeText: {
    color: "#0055F2",
    fontSize: 10,
    fontWeight: "700",
  },
  messagesFeed: {
    minHeight: 180,
    maxHeight: 280,
    gap: 10,
    marginBottom: 12,
  },
  emptyMessagesText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginVertical: 40,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  chatAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
  },
  messageBubbleMe: {
    backgroundColor: TRIP_BLUE,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 2,
  },
  chatAuthorName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0055F2",
    marginBottom: 2,
  },
  messageContentText: {
    fontSize: 13,
    color: "#1E293B",
  },
  messageContentTextMe: {
    color: "#FFFFFF",
  },
  messageTimeText: {
    fontSize: 9,
    color: "#94A3B8",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  messageTimeTextMe: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  messageComposerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  messageComposerInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendMsgBtn: {
    backgroundColor: TRIP_BLUE,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 10,
    marginBottom: 4,
  },
  modalInputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  presetTagText: {
    fontSize: 11,
    color: "#0055F2",
    fontWeight: "600",
  },
  modalSubmitBtn: {
    backgroundColor: TRIP_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  storyViewerContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  storyViewerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyViewerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  storyViewerAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storyViewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  storyViewerAuthorName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  storyViewerLocation: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
  },
  storyCloseBtn: {
    padding: 6,
  },
  storyViewerBottomCaption: {
    padding: 20,
    paddingBottom: 40,
  },
  storyViewerCaptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  storyReactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  storyReplyBubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  storyReplyText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  storyHeartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  commentsPostTitle: {
    fontSize: 11,
    color: "#64748B",
    maxWidth: 240,
  },
  emptyCommentsText: {
    textAlign: "center",
    color: "#94A3B8",
    marginVertical: 20,
  },
  fullCommentItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  fullCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fullCommentBody: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
  },
  fullCommentAuthorName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  fullCommentTime: {
    fontSize: 10,
    color: "#94A3B8",
  },
  fullCommentText: {
    fontSize: 13,
    color: "#334155",
    marginTop: 2,
  },
  addCommentInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  submitCommentBtn: {
    backgroundColor: TRIP_BLUE,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
