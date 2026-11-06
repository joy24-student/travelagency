import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import type { UIScreen } from "../data/screens";
import { TopBar } from "./TopBar";
import { BottomNav, AiPill } from "./Navigation";
import { CommunityPost } from "../components/CommunityPost";
import { DirectChatModal } from "../components/DirectChatModal";
import { ConversationItem } from "../services/repositories/messenger";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../utils/supabase";
import { r2Service, UploadProgress, compressClientImage } from "../services/r2";
import { sanitizeUserText, sanitizeMediaUrl } from "../utils/sanitizer";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Design system tokens
const PRIMARY = colors.primary.DEFAULT;
const LUXE_NAVY = colors.secondary[900];
const ACCENT_GOLD = colors.accent.DEFAULT;
const DANGER = colors.status.danger.main;
const SUCCESS = colors.status.success.main;
const TEXT_PRIMARY = colors.text.primary;
const TEXT_MUTED = colors.text.muted;
const BG_SUBTLE = colors.surface.subtle;
const BORDER_DEFAULT = colors.border.default;

// Fallback guest identifier for unauthenticated feed exploration
const GUEST_FALLBACK_USER_ID = "5e491c34-50b4-4d2a-8cac-d09fddd7745c";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200";
const STORY_DURATION = 5000;

// Travel Inspiration Templates (Configurable Presets)
const INSPIRATION_PHOTO_PRESETS = [
  { label: "Eco Retreat", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", location: "Bogra, Bangladesh" },
  { label: "Swamp Forest", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800", location: "Sylhet, Bangladesh" },
  { label: "Coral Beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", location: "Cox's Bazar, Bangladesh" },
  { label: "Bamboo Forest", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800", location: "Kyoto, Japan" },
];

const INSPIRATION_VIDEO_PRESETS = [
  { label: "Marine Drive Waves", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", location: "Cox's Bazar, Bangladesh" },
  { label: "Cloud Valley Trek", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", location: "Sajek Valley, Bangladesh" },
  { label: "Island Lagoon", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", location: "Saint Martin, Bangladesh" },
];

const POPULAR_NEARBY_REGIONS = ["bogra", "sylhet", "cox's bazar", "dhaka", "sajek", "chittagong", "bandarban"];

const formatDate = (date?: string) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * Deterministically calculates the exact layout height of a community post card.
 * Used by getItemLayout to completely eliminate scroll hitching and blank frames.
 */
export function calculatePostItemHeight(post: any, commentsCount: number = 0): number {
  const media = Array.isArray(post?.media) && post.media.length > 0 ? post.media[0] : undefined;
  const hasMedia = Boolean(media?.media_url || post?.postImage || post?.postVideo);

  let height = 24; // Card container vertical padding (12 top + 12 bottom)
  height += 16;   // Margin bottom
  height += 52;   // Author avatar header (40 + 12 margin)

  if (hasMedia) {
    height += 252; // Media preview (240 + 12 margin)
  }

  // Title layout height
  const titleLen = (post?.title || "").length;
  if (titleLen > 38) {
    height += 52; // 2 lines with 22 line-height + 8 margin
  } else {
    height += 30; // 1 line with 22 line-height + 8 margin
  }

  // Description layout height (capped at 3 lines in UI)
  const content = post?.content || post?.description || "";
  if (content.length > 0) {
    const lines = Math.min(3, Math.max(1, Math.ceil(content.length / 42)));
    height += lines * 20 + 12;
  }

  // Actions bar (paddingTop 10 + action buttons 32 + border)
  height += 43;

  // Social proof liked-by row
  if ((post?.likes_count || 0) > 0) {
    height += 24;
  }

  // Comments preview container
  if (commentsCount > 0) {
    const previewCount = Math.min(2, commentsCount);
    height += 16 + previewCount * 22 + 20; // Padding (16) + comments (22 each) + footer (20)
  }

  return Math.round(height);
}

// Memoized Post Item for 60fps smooth scrolling
interface PostFeedItemProps {
  post: any;
  isLiked: boolean;
  isSaved: boolean;
  comments: any[];
  onToggleLike: (post: any) => void;
  onToggleSave: (post: any) => void;
  onComment: (post: any) => void;
  onOpenProfile: (userId: string) => void;
}

const PostFeedItem = memo(function PostFeedItem({
  post,
  isLiked,
  isSaved,
  comments,
  onToggleLike,
  onToggleSave,
  onComment,
  onOpenProfile,
}: PostFeedItemProps) {
  const author = post.author || {};
  const media = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : undefined;
  const isVideo = media?.media_type === "video";

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <CommunityPost
        key={post.id}
        authorName={author.display_name || "Traveler"}
        authorImage={author.avatar_url || DEFAULT_AVATAR}
        role={author.influencer_category || (author.is_influencer ? "Influencer" : undefined)}
        isInfluencer={author.is_influencer}
        location={post.location}
        timestamp={formatDate(post.created_at)}
        title={post.title}
        description={post.content}
        postImage={isVideo ? undefined : media?.media_url}
        postVideo={isVideo ? media?.media_url : undefined}
        likes={post.likes_count || 0}
        comments={post.comments_count || comments.length}
        liked={isLiked}
        saved={isSaved}
        commentsList={comments}
        onLike={() => onToggleLike(post)}
        onSave={() => onToggleSave(post)}
        onComment={() => onComment(post)}
        onOpenProfile={() => onOpenProfile(author.id || post.user_id)}
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
    </View>
  );
});

export function CommunitySpecializedScreen({ screen }: { screen: UIScreen }) {
  const themeColor = screen.theme === "luxe" ? LUXE_NAVY : PRIMARY;

  // Authenticated User Context
  const storeUser = useAuthStore((s) => s.user);
  const { user: authUser } = useAuth();
  const currentUser = storeUser || authUser;
  const activeUserId = currentUser?.id || GUEST_FALLBACK_USER_ID;
  const isGuest = !currentUser?.id;

  // Main Navigation Tabs: "feed" | "influencers" | "groups"
  const [activeTab, setActiveTab] = useState<"feed" | "influencers" | "groups">("feed");
  const [feedFilter, setFeedFilter] = useState<"all" | "nearby" | "trending" | "saved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Core Data States
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Interaction Sets
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [followingUserIds, setFollowingUserIds] = useState<Set<string>>(new Set());
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals & User Input Form States
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postMediaType, setPostMediaType] = useState<"image" | "video">("image");
  const [isPosting, setIsPosting] = useState(false);
  const [postUploadProgress, setPostUploadProgress] = useState<number | null>(null);

  const [activeChatConvo, setActiveChatConvo] = useState<ConversationItem | null>(null);

  // Stories Carousel & Full-Screen Viewer States
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyImage, setStoryImage] = useState("");
  const [storyCaption, setStoryCaption] = useState("");
  const [storyLocation, setStoryLocation] = useState("");
  const [storyUploadProgress, setStoryUploadProgress] = useState<number | null>(null);

  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);

  const storyProgress = useRef(new Animated.Value(0)).current;
  const currentProgressRef = useRef(0);
  const storyAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPausedRef = useRef(false);

  // Comments Sheet State
  const [activeCommentPost, setActiveCommentPost] = useState<any | null>(null);
  const [commentInputText, setCommentInputText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Create Group Modal State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDestination, setNewGroupDestination] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [chatMessageText, setChatMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // 1. Fetch Dynamic Data from Supabase
  const loadCommunityData = useCallback(async () => {
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, author:community_profiles!posts_user_id_fkey(*), media:post_media(*)")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (postsData && postsData.length > 0) {
        setPosts(postsData);
      }

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
            image: s.author?.avatar_url || s.media_url || DEFAULT_AVATAR,
            media_url: s.media_url,
            caption: s.caption,
            location: s.location,
            user_id: s.user_id,
          }))
        );
      }

      const { data: groupsData } = await supabase
        .from("groups")
        .select("*, owner:community_profiles!groups_owner_id_fkey(*)")
        .order("members_count", { ascending: false });

      if (groupsData && groupsData.length > 0) {
        setGroups(groupsData);
        setSelectedGroupId((prev) => prev || groupsData[0].id);
      }

      const { data: influencerData } = await supabase
        .from("community_profiles")
        .select("*")
        .eq("is_influencer", true)
        .order("followers_count", { ascending: false });

      if (influencerData && influencerData.length > 0) {
        setInfluencers(influencerData);
      }

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
      console.warn("Community fetch notice:", error);
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  const loadGroupMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
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
      console.warn("Group messages load notice:", e);
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

  // Realtime Subscriptions with Auto-Cleanup
  useEffect(() => {
    const channelId = `community-realtime-${Math.random().toString(36).substring(2, 9)}`;
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

  // 2. Stories Auto-Advancing Progress Animation with Precise Pause-on-Hold
  useEffect(() => {
    const listenerId = storyProgress.addListener(({ value }) => {
      currentProgressRef.current = value;
    });
    return () => {
      storyProgress.removeListener(listenerId);
    };
  }, [storyProgress]);

  const startStoryProgress = useCallback(
    (index: number, startFrom: number = 0) => {
      storyAnimationRef.current?.stop();
      storyProgress.setValue(startFrom);
      currentProgressRef.current = startFrom;
      isPausedRef.current = false;

      const remainingDuration = Math.max(200, (1 - startFrom) * STORY_DURATION);

      storyAnimationRef.current = Animated.timing(storyProgress, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      storyAnimationRef.current.start(({ finished }) => {
        if (finished && !isPausedRef.current) {
          if (index < stories.length - 1) {
            const nextIdx = index + 1;
            setActiveStoryIndex(nextIdx);
            if (stories[nextIdx]?.id) {
              setViewedStoryIds((prev) => new Set(prev).add(stories[nextIdx].id));
            }
          } else {
            setIsStoryViewerOpen(false);
          }
        }
      });
    },
    [stories, storyProgress]
  );

  useEffect(() => {
    if (isStoryViewerOpen && stories.length > 0) {
      startStoryProgress(activeStoryIndex, 0);
    } else {
      storyAnimationRef.current?.stop();
      storyProgress.setValue(0);
      currentProgressRef.current = 0;
    }
    return () => {
      storyAnimationRef.current?.stop();
    };
  }, [isStoryViewerOpen, activeStoryIndex, startStoryProgress, stories.length, storyProgress]);

  const handleNextStory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeStoryIndex < stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      if (stories[nextIdx]?.id) {
        setViewedStoryIds((prev) => new Set(prev).add(stories[nextIdx].id));
      }
    } else {
      setIsStoryViewerOpen(false);
    }
  };

  const handlePrevStory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentProgressRef.current > 0.25 || activeStoryIndex === 0) {
      startStoryProgress(activeStoryIndex, 0);
    } else {
      const prevIdx = Math.max(0, activeStoryIndex - 1);
      setActiveStoryIndex(prevIdx);
      if (stories[prevIdx]?.id) {
        setViewedStoryIds((prev) => new Set(prev).add(stories[prevIdx].id));
      }
    }
  };

  // Pause-on-hold: freezes progress animation and hides UI overlays
  const handleStoryPressIn = () => {
    isPausedRef.current = true;
    storyAnimationRef.current?.stop();
    setIsOverlayHidden(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStoryPressOut = () => {
    isPausedRef.current = false;
    setIsOverlayHidden(false);
    startStoryProgress(activeStoryIndex, currentProgressRef.current);
  };

  const handleOpenStoryAtIndex = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const story = stories[index];
    if (story?.id) {
      setViewedStoryIds((prev) => new Set(prev).add(story.id));
    }
    setActiveStoryIndex(index);
    setIsStoryViewerOpen(true);
  };

  // 3. Optimistic Like Toggle with Network Rollback
  const handleToggleLike = async (post: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasLiked = likedPostIds.has(post.id);
    const prevLikesCount = post.likes_count || 0;
    const nextLiked = !wasLiked;
    const nextLikesCount = Math.max(0, prevLikesCount + (nextLiked ? 1 : -1));

    // Immediate UI update (<16ms)
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes_count: nextLikesCount } : p))
    );

    try {
      if (nextLiked) {
        const { error } = await supabase
          .from("post_likes")
          .upsert([{ post_id: post.id, user_id: activeUserId }], { onConflict: "post_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", activeUserId);
        if (error) throw error;
      }

      await supabase.from("posts").update({ likes_count: nextLikesCount }).eq("id", post.id);
    } catch (e: any) {
      // Rollback on network failure
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLikedPostIds((prev) => {
        const rollback = new Set(prev);
        if (wasLiked) rollback.add(post.id);
        else rollback.delete(post.id);
        return rollback;
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes_count: prevLikesCount } : p))
      );
      Alert.alert("Network Failure", "Could not sync like. Rolled back to previous state.");
    }
  };

  // 4. Optimistic Save / Bookmark Toggle with Rollback
  const handleToggleSave = async (post: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasSaved = savedPostIds.has(post.id);
    const nextSaved = !wasSaved;

    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(post.id);
      else next.delete(post.id);
      return next;
    });

    try {
      if (nextSaved) {
        const { error } = await supabase
          .from("saved_posts")
          .upsert([{ post_id: post.id, user_id: activeUserId }], { onConflict: "post_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", activeUserId);
        if (error) throw error;
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSavedPostIds((prev) => {
        const rollback = new Set(prev);
        if (wasSaved) rollback.add(post.id);
        else rollback.delete(post.id);
        return rollback;
      });
      Alert.alert("Bookmark Error", "Could not update bookmark. Changes rolled back.");
    }
  };

  // 5. Optimistic Comment Submit with Anti-XSS Sanitization & Rollback
  const handleAddComment = async () => {
    const rawText = commentInputText.trim();
    if (!activeCommentPost || !rawText) return;

    // Strict XSS Sanitization
    const sanitizedText = sanitizeUserText(rawText);
    if (!sanitizedText) {
      Alert.alert("Invalid Input", "Comment contains disallowed script or markup.");
      return;
    }

    setIsSubmittingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const postId = activeCommentPost.id;
    const tempId = `temp_comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const prevComments = commentsMap[postId] || [];
    const prevCommentsCount = activeCommentPost.comments_count || prevComments.length;

    // Optimistic comment item
    const optimisticComment = {
      id: tempId,
      post_id: postId,
      user_id: activeUserId,
      content: sanitizedText,
      created_at: new Date().toISOString(),
      author: {
        id: activeUserId,
        display_name: sanitizeUserText(currentUser?.user_metadata?.full_name || "You"),
        avatar_url: sanitizeMediaUrl(currentUser?.user_metadata?.avatar_url) || DEFAULT_AVATAR,
      },
    };

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment],
    }));

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: prevCommentsCount + 1 } : p
      )
    );
    setCommentInputText("");

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert([
          {
            post_id: postId,
            user_id: activeUserId,
            content: sanitizedText,
            likes_count: 0,
          },
        ])
        .select("*, author:community_profiles!post_comments_user_id_fkey(*)")
        .single();

      if (error || !data) throw (error || new Error("Failed to insert comment."));

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === tempId ? data : c)),
      }));
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== tempId),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: prevCommentsCount } : p
        )
      );
      setCommentInputText(rawText);
      Alert.alert("Comment Error", e.message || "Failed to publish comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 6. Media Picker with Hardware Local Compression & Cloudflare R2 Upload
  const handlePickMediaWithCompression = async (type: "image" | "video") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPostUploadProgress(0);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Media library access is needed to select files.");
        setPostUploadProgress(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          type === "video"
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75, // Local client hardware-accelerated compression
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setPostUploadProgress(null);
        return;
      }

      const asset = result.assets[0];
      let uploadUri = asset.uri;

      if (type === "image") {
        const compressed = await compressClientImage(asset.uri, 0.75);
        uploadUri = compressed.uri;
      }

      const fileName =
        asset.fileName || `upload_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`;
      const mimeType =
        asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg");

      const uploadFn = type === "video" ? r2Service.uploadVideo : r2Service.uploadImage;
      const uploadRes = await uploadFn(
        {
          uri: uploadUri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize,
        },
        (progress: UploadProgress) => {
          setPostUploadProgress(progress.progress);
        }
      );

      if (uploadRes.success && uploadRes.url) {
        const sanitizedUrl = sanitizeMediaUrl(uploadRes.url) || uploadRes.url;
        setPostImage(sanitizedUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(uploadRes.error || "Cloudflare R2 presigned upload failed.");
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload Error", err.message || "Failed to upload file to R2 cloud.");
    } finally {
      setPostUploadProgress(null);
    }
  };

  // Camera capture with client compression
  const handleCameraCapture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Camera permission is required to capture photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.75,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setPostUploadProgress(0);

      const compressed = await compressClientImage(asset.uri, 0.75);
      const fileName = `camera_${Date.now()}.jpg`;

      const uploadRes = await r2Service.uploadImage(
        {
          uri: compressed.uri,
          name: fileName,
          type: "image/jpeg",
          size: asset.fileSize,
        },
        (p: UploadProgress) => setPostUploadProgress(p.progress)
      );

      if (uploadRes.success && uploadRes.url) {
        const sanitizedUrl = sanitizeMediaUrl(uploadRes.url) || uploadRes.url;
        setPostImage(sanitizedUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(uploadRes.error || "Camera photo upload failed.");
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e.message || "Could not take photo.");
    } finally {
      setPostUploadProgress(null);
    }
  };

  // Story Media Picker with Compression & R2
  const handlePickStoryMedia = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStoryUploadProgress(0);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Media library access required.");
        setStoryUploadProgress(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75,
        aspect: [9, 16],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setStoryUploadProgress(null);
        return;
      }

      const asset = result.assets[0];
      const compressed = await compressClientImage(asset.uri, 0.75);
      const fileName = `story_${Date.now()}.jpg`;

      const uploadRes = await r2Service.uploadImage(
        {
          uri: compressed.uri,
          name: fileName,
          type: "image/jpeg",
          size: asset.fileSize,
        },
        (p: UploadProgress) => setStoryUploadProgress(p.progress)
      );

      if (uploadRes.success && uploadRes.url) {
        const sanitizedUrl = sanitizeMediaUrl(uploadRes.url) || uploadRes.url;
        setStoryImage(sanitizedUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(uploadRes.error || "Story R2 upload failed.");
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Story Upload Error", err.message || "Failed to upload story photo.");
    } finally {
      setStoryUploadProgress(null);
    }
  };

  // Create Post Submit Handler with Anti-XSS Sanitization
  const handleCreatePost = async () => {
    const safeTitle = sanitizeUserText(postTitle);
    const safeContent = sanitizeUserText(postContent);
    const safeLocation = sanitizeUserText(postLocation) || "Bangladesh";
    const safeImage = sanitizeMediaUrl(postImage);

    if (!safeTitle) {
      Alert.alert("Required", "Please provide a valid trip title.");
      return;
    }
    setIsPosting(true);

    try {
      const { data: newPost, error: postErr } = await supabase
        .from("posts")
        .insert([
          {
            user_id: activeUserId,
            title: safeTitle,
            content: safeContent || undefined,
            location: safeLocation,
            status: "published",
            visibility: "public",
            likes_count: 0,
            comments_count: 0,
          },
        ])
        .select()
        .single();

      if (postErr) throw postErr;

      if (safeImage && newPost?.id) {
        await supabase.from("post_media").insert([
          {
            post_id: newPost.id,
            media_url: safeImage,
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

  // Create Story Submit Handler with Anti-XSS Sanitization
  const handleCreateStory = async () => {
    const safeImage = sanitizeMediaUrl(storyImage);
    const safeCaption = sanitizeUserText(storyCaption) || "Travel moment ✈️";
    const safeLocation = sanitizeUserText(storyLocation);

    if (!safeImage) {
      Alert.alert("Required", "Please select or upload a story photo.");
      return;
    }

    try {
      const { error } = await supabase.from("stories").insert([
        {
          user_id: activeUserId,
          media_url: safeImage,
          media_type: "image",
          caption: safeCaption,
          location: safeLocation || undefined,
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
      list = list.filter((p) => {
        const loc = p.location?.toLowerCase() || "";
        return POPULAR_NEARBY_REGIONS.some((reg) => loc.includes(reg));
      });
    } else if (feedFilter === "trending") {
      list = list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }

    return list;
  }, [posts, searchQuery, feedFilter, savedPostIds]);

  // Pre-calculated layout offsets for zero-hitch FlatList virtualization
  const postLayouts = useMemo(() => {
    let offset = 0;
    return filteredPosts.map((post, index) => {
      const comments = commentsMap[post.id]?.length || post.comments_count || 0;
      const length = calculatePostItemHeight(post, comments);
      const layout = { length, offset, index };
      offset += length;
      return layout;
    });
  }, [filteredPosts, commentsMap]);

  const getItemLayout = useCallback(
    (_data: any, index: number) => {
      if (postLayouts[index]) {
        return postLayouts[index];
      }
      const fallbackHeight = 460;
      return {
        length: fallbackHeight,
        offset: fallbackHeight * index,
        index,
      };
    },
    [postLayouts]
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || groups[0],
    [groups, selectedGroupId]
  );

  const currentViewingStory = stories[activeStoryIndex] || stories[0];

  // Stories Carousel with Unread Status Rings
  const renderStoriesCarousel = () => {
    return (
      <View style={styles.storiesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesScrollContent}
        >
          {/* Add Story Button */}
          <Pressable
            style={styles.storyCircleContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCreateStoryModal(true);
            }}
          >
            <View style={styles.addStoryRing}>
              <Image
                source={{
                  uri:
                    currentUser?.user_metadata?.avatar_url || DEFAULT_AVATAR,
                }}
                style={styles.addStoryUserAvatar}
              />
              <View style={styles.addStoryBadge}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.storyNameText} numberOfLines={1}>
              Your Story
            </Text>
          </Pressable>

          {/* Stories List with Unread vs Viewed Status Rings */}
          {stories.map((story, idx) => {
            const isUnread = !viewedStoryIds.has(story.id);
            return (
              <Pressable
                key={story.id || idx}
                style={styles.storyCircleContainer}
                onPress={() => handleOpenStoryAtIndex(idx)}
              >
                {isUnread ? (
                  <LinearGradient
                    colors={[PRIMARY, "#7C3AED", "#EC4899", ACCENT_GOLD]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyGradientRing}
                  >
                    <View style={styles.storyInnerBorder}>
                      <Image
                        source={{ uri: story.image || story.media_url }}
                        style={styles.storyAvatar}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.storyViewedRing}>
                    <View style={styles.storyInnerBorder}>
                      <Image
                        source={{ uri: story.image || story.media_url }}
                        style={styles.storyAvatar}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                )}

                {isUnread && (
                  <View style={styles.unreadStatusPill}>
                    <Text style={styles.unreadStatusPillText}>NEW</Text>
                  </View>
                )}

                <Text
                  style={[styles.storyNameText, isUnread && styles.storyNameUnread]}
                  numberOfLines={1}
                >
                  {story.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Header Component for Virtualized Feed FlatList
  const renderFeedHeader = () => (
    <View>
      {renderStoriesCarousel()}

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
    </View>
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
            <Ionicons name="search" size={20} color={LUXE_NAVY} />
          </Pressable>

          <Pressable
            style={styles.createPostBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCreatePostModal(true);
            }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createPostBtnText}>Post</Text>
          </Pressable>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearchBar && (
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search destination, creator, or topic..."
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(sanitizeUserText(text))}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
            </Pressable>
          )}
        </View>
      )}

      {/* Main Segmented Tabs */}
      <View style={styles.tabsSegment}>
        <Pressable
          style={[styles.tabSegmentBtn, activeTab === "feed" && styles.tabSegmentBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("feed");
          }}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={activeTab === "feed" ? PRIMARY : TEXT_MUTED}
          />
          <Text
            style={[styles.tabSegmentText, activeTab === "feed" && styles.tabSegmentTextActive]}
          >
            Feed
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabSegmentBtn, activeTab === "influencers" && styles.tabSegmentBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("influencers");
          }}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "influencers" ? PRIMARY : TEXT_MUTED}
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
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("groups");
          }}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === "groups" ? PRIMARY : TEXT_MUTED}
          />
          <Text
            style={[styles.tabSegmentText, activeTab === "groups" && styles.tabSegmentTextActive]}
          >
            Groups & Chat
          </Text>
        </Pressable>
      </View>

      {/* =================================================================== */}
      {/* TAB 1: ZERO-HITCH VIRTUALIZED FEED WITH PRE-CALCULATED ITEM HEIGHTS */}
      {/* =================================================================== */}
      {activeTab === "feed" && (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          ListHeaderComponent={renderFeedHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS !== "web"}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY]}
            />
          }
          renderItem={({ item: post }) => (
            <PostFeedItem
              post={post}
              isLiked={likedPostIds.has(post.id)}
              isSaved={savedPostIds.has(post.id)}
              comments={commentsMap[post.id] || []}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onComment={setActiveCommentPost}
              onOpenProfile={(uid) => {
                if (uid) {
                  router.push({
                    pathname: "/screens/user-profile" as any,
                    params: { userId: uid },
                  });
                }
              }}
            />
          )}
          ListEmptyComponent={
            loading && posts.length === 0 ? (
              <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 32 }} />
            ) : (
              <View style={styles.emptyFeedBox}>
                <Ionicons name="images-outline" size={48} color={BORDER_DEFAULT} />
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
            )
          }
        />
      )}

      {/* =================================================================== */}
      {/* TAB 2: INFLUENCERS & TOP CREATORS */}
      {/* =================================================================== */}
      {activeTab === "influencers" && (
        <FlatList
          data={influencers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionHeading}>Top Verified Creators</Text>
              <Text style={styles.sectionSubtitle}>
                Follow curated travel photographers, food scouts & local guides
              </Text>
            </View>
          }
          renderItem={({ item: inf }) => {
            const isFollowing = followingUserIds.has(inf.id);
            return (
              <View key={inf.id} style={[styles.influencerHeroCard, { marginBottom: 14 }]}>
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
                    source={{ uri: inf.avatar_url || DEFAULT_AVATAR }}
                    style={styles.influencerBigAvatar}
                  />
                  <View style={styles.influencerHeaderInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.influencerCardName}>{inf.display_name}</Text>
                      <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />
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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFollowingUserIds((prev) => {
                      const next = new Set(prev);
                      if (isFollowing) next.delete(inf.id);
                      else next.add(inf.id);
                      return next;
                    });
                  }}
                >
                  <Ionicons
                    name={isFollowing ? "checkmark" : "person-add"}
                    size={16}
                    color={isFollowing ? PRIMARY : "#FFFFFF"}
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
          }}
        />
      )}

      {/* =================================================================== */}
      {/* TAB 3: GROUPS & LIVE CHAT */}
      {/* =================================================================== */}
      {activeTab === "groups" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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

          {/* Groups Picker */}
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
                    source={{ uri: g.avatar_url || DEFAULT_AVATAR }}
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

          {/* Active Group Chat Box */}
          {activeGroup && (
            <View style={styles.groupChatContainer}>
              <View style={styles.groupChatHeader}>
                <View>
                  <Text style={styles.groupChatTitle}>{activeGroup.name}</Text>
                  <Text style={styles.groupChatDesc}>{activeGroup.description}</Text>
                </View>
                <View style={styles.destinationBadge}>
                  <Ionicons name="earth" size={12} color={PRIMARY} />
                  <Text style={styles.destinationBadgeText}>{activeGroup.destination || "Global"}</Text>
                </View>
              </View>

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
                            source={{ uri: msg.author?.avatar_url || DEFAULT_AVATAR }}
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
                  onPress={async () => {
                    const cleanMsg = sanitizeUserText(chatMessageText);
                    if (!cleanMsg || !selectedGroupId) return;
                    setIsSendingMessage(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    try {
                      const { data } = await supabase
                        .from("group_messages")
                        .insert([
                          {
                            group_id: selectedGroupId,
                            user_id: activeUserId,
                            content: cleanMsg,
                          },
                        ])
                        .select("*, author:community_profiles!group_messages_user_id_fkey(*)")
                        .single();

                      if (data) {
                        setGroupMessages((prev) => [...prev, data]);
                        setChatMessageText("");
                      }
                    } catch (e) {
                      console.warn(e);
                    } finally {
                      setIsSendingMessage(false);
                    }
                  }}
                  disabled={!chatMessageText.trim() || isSendingMessage}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* =================================================================== */}
      {/* MODAL: STORIES VIEWER WITH AUTO-ADVANCING PROGRESS & PAUSE-ON-HOLD */}
      {/* =================================================================== */}
      <Modal
        visible={isStoryViewerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsStoryViewerOpen(false)}
      >
        {currentViewingStory && (
          <View style={styles.storyViewerContainer}>
            <Image
              source={{ uri: currentViewingStory.media_url }}
              style={styles.storyViewerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.75)", "transparent", "rgba(0,0,0,0.85)"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Gesture Layer for Tap Navigation & Pause-on-Hold */}
            <View style={styles.storyTapGestureContainer}>
              <Pressable
                style={styles.storyTapLeft}
                onPress={handlePrevStory}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
              />
              <Pressable
                style={styles.storyTapRight}
                onPress={handleNextStory}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
              />
            </View>

            {/* Top Auto-Advancing Segmented Progress Bar & Header */}
            {!isOverlayHidden && (
              <SafeAreaView style={styles.storyViewerTopBar} edges={["top"]} pointerEvents="box-none">
                <View style={styles.storyProgressBarRow}>
                  {stories.map((st, idx) => (
                    <View key={st.id || idx} style={styles.storyProgressTrack}>
                      {idx < activeStoryIndex ? (
                        <View style={[styles.storyProgressFill, { width: "100%" }]} />
                      ) : idx === activeStoryIndex ? (
                        <Animated.View
                          style={[
                            styles.storyProgressFill,
                            {
                              width: storyProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", "100%"],
                              }),
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Author Info & Close Button */}
                <View style={styles.storyHeaderInfoRow}>
                  <Pressable
                    style={styles.storyViewerAuthorRow}
                    onPress={() => {
                      const targetId = currentViewingStory.user_id || currentViewingStory.id;
                      setIsStoryViewerOpen(false);
                      router.push({
                        pathname: "/screens/user-profile" as any,
                        params: { userId: targetId },
                      });
                    }}
                  >
                    <Image
                      source={{ uri: currentViewingStory.image || DEFAULT_AVATAR }}
                      style={styles.storyViewerAvatar}
                    />
                    <View>
                      <Text style={styles.storyViewerAuthorName}>
                        {currentViewingStory.name}
                      </Text>
                      {currentViewingStory.location && (
                        <Text style={styles.storyViewerLocation}>
                          {currentViewingStory.location}
                        </Text>
                      )}
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.storyCloseBtn}
                    onPress={() => setIsStoryViewerOpen(false)}
                  >
                    <Ionicons name="close" size={26} color="#FFFFFF" />
                  </Pressable>
                </View>
              </SafeAreaView>
            )}

            {/* Story Bottom Caption & Reaction Bar */}
            {!isOverlayHidden && (
              <View style={styles.storyViewerBottomCaption} pointerEvents="box-none">
                <Text style={styles.storyViewerCaptionText}>
                  {currentViewingStory.caption}
                </Text>

                <View style={styles.storyReactionRow}>
                  <Pressable
                    style={styles.storyReplyBubble}
                    onPress={() => {
                      const targetId = currentViewingStory.user_id || currentViewingStory.id;
                      setIsStoryViewerOpen(false);
                      router.push({
                        pathname: "/screens/user-profile" as any,
                        params: { userId: targetId },
                      });
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.storyReplyText}>Send message to traveler...</Text>
                  </Pressable>

                  <Pressable
                    style={styles.storyHeartBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      Alert.alert("Liked Story", `Sent a ❤️ to ${currentViewingStory.name}!`);
                    }}
                  >
                    <Ionicons name="heart" size={24} color={DANGER} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW POST WITH LOCAL COMPRESSION & R2 UPLOAD */}
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
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
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
                    setPostImage(INSPIRATION_PHOTO_PRESETS[0].url);
                  }}
                >
                  <Ionicons
                    name="image"
                    size={16}
                    color={postMediaType === "image" ? PRIMARY : TEXT_MUTED}
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
                    setPostImage(INSPIRATION_VIDEO_PRESETS[0].url);
                  }}
                >
                  <Ionicons
                    name="videocam"
                    size={16}
                    color={postMediaType === "video" ? PRIMARY : TEXT_MUTED}
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

              {/* R2 Media Upload Options with Local Client Compression */}
              <View style={styles.uploadOptionsRow}>
                <Pressable
                  style={[styles.r2UploadBtn, { flex: 1 }]}
                  onPress={() => handlePickMediaWithCompression(postMediaType)}
                  disabled={postUploadProgress !== null}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={PRIMARY} />
                  <Text style={styles.r2UploadBtnText}>Device Gallery</Text>
                </Pressable>

                {postMediaType === "image" && (
                  <Pressable
                    style={[styles.r2UploadBtn, { flex: 1, backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
                    onPress={handleCameraCapture}
                    disabled={postUploadProgress !== null}
                  >
                    <Ionicons name="camera-outline" size={18} color={SUCCESS} />
                    <Text style={[styles.r2UploadBtnText, { color: SUCCESS }]}>Take Photo</Text>
                  </Pressable>
                )}
              </View>

              {/* Upload Progress Bar */}
              {postUploadProgress !== null && (
                <View style={styles.modalProgressBarWrap}>
                  <View style={[styles.modalProgressFill, { width: `${postUploadProgress}%` }]} />
                  <Text style={styles.modalProgressText}>
                    Compressing & uploading to R2 {postUploadProgress}%
                  </Text>
                </View>
              )}

              {/* Media Preview if Uploaded */}
              {postImage ? (
                <View style={styles.uploadedPreviewBox}>
                  <Image source={{ uri: postImage }} style={styles.uploadedThumb} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.uploadedSuccessText}>Media Compressed & Ready</Text>
                    <Text style={styles.uploadedUrlText} numberOfLines={1}>
                      {postImage}
                    </Text>
                  </View>
                  <Pressable onPress={() => setPostImage("")}>
                    <Ionicons name="trash-outline" size={20} color={DANGER} />
                  </Pressable>
                </View>
              ) : null}

              <Text style={styles.modalInputLabel}>Trip Title</Text>
              <TextInput
                style={styles.modalInputField}
                placeholder="e.g. Hidden Garden Oasis Retreat..."
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

              <Text style={styles.modalInputLabel}>Or Preset Ideas:</Text>
              <View style={styles.presetsRow}>
                {(postMediaType === "video" ? INSPIRATION_VIDEO_PRESETS : INSPIRATION_PHOTO_PRESETS).map((preset) => (
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
      {/* MODAL: ADD 24H STORY WITH R2 UPLOAD & COMPRESSION */}
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
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
              </Pressable>
            </View>

            {/* Upload Button */}
            <Pressable
              style={styles.r2UploadBtn}
              onPress={handlePickStoryMedia}
              disabled={storyUploadProgress !== null}
            >
              <Ionicons name="camera-outline" size={20} color={PRIMARY} />
              <Text style={styles.r2UploadBtnText}>📸 Pick Story Photo (Compressed & R2 Upload)</Text>
            </Pressable>

            {storyUploadProgress !== null && (
              <View style={styles.modalProgressBarWrap}>
                <View style={[styles.modalProgressFill, { width: `${storyUploadProgress}%` }]} />
                <Text style={styles.modalProgressText}>Uploading {storyUploadProgress}%</Text>
              </View>
            )}

            {storyImage ? (
              <View style={styles.uploadedPreviewBox}>
                <Image source={{ uri: storyImage }} style={styles.uploadedThumb} />
                <Text style={styles.uploadedSuccessText}>Photo compressed & attached</Text>
              </View>
            ) : null}

            <Text style={styles.modalInputLabel}>Or Quick Presets:</Text>
            <View style={styles.presetsRow}>
              {INSPIRATION_PHOTO_PRESETS.map((preset) => (
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
                  <Ionicons name="close" size={24} color={TEXT_MUTED} />
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
                      <Image
                        source={{
                          uri: c.author?.avatar_url || DEFAULT_AVATAR,
                        }}
                        style={styles.fullCommentAvatar}
                      />
                      <View style={styles.fullCommentBody}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={styles.fullCommentAuthorName}>
                            {c.author?.display_name || "Traveler"}
                          </Text>
                          <Text style={styles.fullCommentTime}>{formatDate(c.created_at)}</Text>
                        </View>
                        <Text style={styles.fullCommentText}>{c.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

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
      {/* MODAL: CREATE GROUP */}
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
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
              </Pressable>
            </View>

            <Text style={styles.modalInputLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Waterfall Trekkers Club"
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

            <Pressable
              style={styles.modalSubmitBtn}
              onPress={async () => {
                const safeName = sanitizeUserText(newGroupName);
                const safeDest = sanitizeUserText(newGroupDestination) || "Global";
                const safeDesc = sanitizeUserText(newGroupDesc) || "Community travel tribe.";

                if (!safeName) {
                  Alert.alert("Required", "Please provide a valid group name.");
                  return;
                }
                try {
                  const { data, error } = await supabase
                    .from("groups")
                    .insert([
                      {
                        owner_id: activeUserId,
                        name: safeName,
                        destination: safeDest,
                        description: safeDesc,
                        avatar_url: DEFAULT_AVATAR,
                        privacy: "public",
                        members_count: 1,
                      },
                    ])
                    .select()
                    .single();

                  if (error) throw error;
                  setShowCreateGroupModal(false);
                  setNewGroupName("");
                  setNewGroupDestination("");
                  setNewGroupDesc("");
                  if (data?.id) setSelectedGroupId(data.id);
                  await loadCommunityData();
                } catch (e: any) {
                  Alert.alert("Error", e.message || "Could not create group.");
                }
              }}
            >
              <Text style={styles.modalSubmitBtnText}>Create Group</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
        onStartCall={(p, type) => {
          router.push({
            pathname: "/screens/call" as any,
            params: {
              callType: type,
              targetUserId: p.id,
              targetName: p.display_name,
              targetAvatar: p.avatar_url,
              callerId: activeUserId,
            },
          });
        }}
      />

      <AiPill color={themeColor} />
      <BottomNav active={screen.activeTab ?? "Post"} color={themeColor} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_SUBTLE,
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
    borderBottomColor: colors.border.subtle,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: LUXE_NAVY,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
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
    backgroundColor: colors.surface.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  createPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
    borderColor: BORDER_DEFAULT,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  tabsSegment: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: BG_SUBTLE,
  },
  tabSegmentBtnActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  tabSegmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  tabSegmentTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },
  storiesSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  storiesScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    alignItems: "center",
  },
  storyCircleContainer: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  addStoryRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  addStoryUserAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  addStoryBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: PRIMARY,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  storyGradientRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  storyViewedRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  storyInnerBorder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: colors.surface.muted,
  },
  storyAvatar: {
    width: "100%",
    height: "100%",
  },
  unreadStatusPill: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#EC4899",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  unreadStatusPillText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  storyNameText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: "500",
    textAlign: "center",
    width: 66,
  },
  storyNameUnread: {
    color: TEXT_PRIMARY,
    fontWeight: "700",
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
    borderColor: BORDER_DEFAULT,
  },
  feedFilterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  feedFilterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  feedFilterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyFeedBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyFeedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.neutral[800],
  },
  emptyFeedSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    maxWidth: 240,
  },
  emptyCreateBtn: {
    backgroundColor: PRIMARY,
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
  influencerHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
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
    borderColor: ACCENT_GOLD,
  },
  influencerHeaderInfo: { flex: 1 },
  influencerCardName: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  influencerHandle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  badgePillAmber: {
    alignSelf: "flex-start",
    backgroundColor: colors.status.warning.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  badgePillAmberText: {
    color: colors.status.warning.dark,
    fontSize: 10,
    fontWeight: "700",
  },
  influencerBio: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  influencerStatsRow: {
    flexDirection: "row",
    backgroundColor: BG_SUBTLE,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statBox: { flex: 1, alignItems: "center" },
  statBoxValue: { fontSize: 15, fontWeight: "800", color: TEXT_PRIMARY },
  statBoxLabel: { fontSize: 10, color: TEXT_MUTED, marginTop: 1 },
  followActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    borderRadius: 12,
  },
  followActionBtnActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  followActionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  followActionBtnTextActive: { color: PRIMARY },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: TEXT_PRIMARY },
  sectionSubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2, marginBottom: 16 },
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
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  newGroupBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  groupsChipList: { gap: 10, paddingBottom: 16 },
  groupCardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: BORDER_DEFAULT,
    minWidth: 200,
  },
  groupCardPillActive: { borderColor: PRIMARY, backgroundColor: colors.primary[50] },
  groupPillAvatar: { width: 40, height: 40, borderRadius: 10 },
  groupPillName: { fontSize: 13, fontWeight: "700", color: colors.neutral[800] },
  groupPillNameActive: { color: PRIMARY },
  groupPillSub: { fontSize: 10, color: TEXT_MUTED, marginTop: 2 },
  groupChatContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  groupChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: 12,
    marginBottom: 12,
  },
  groupChatTitle: { fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY },
  groupChatDesc: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  destinationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  destinationBadgeText: { color: PRIMARY, fontSize: 10, fontWeight: "700" },
  messagesFeed: { minHeight: 180, maxHeight: 280, gap: 10, marginBottom: 12 },
  emptyMessagesText: {
    textAlign: "center",
    color: TEXT_MUTED,
    fontSize: 12,
    marginVertical: 40,
  },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  chatAuthorAvatar: { width: 24, height: 24, borderRadius: 12, marginBottom: 4 },
  messageBubble: { maxWidth: "80%", padding: 10, borderRadius: 12 },
  messageBubbleMe: { backgroundColor: PRIMARY, borderBottomRightRadius: 2 },
  messageBubbleOther: { backgroundColor: colors.surface.muted, borderBottomLeftRadius: 2 },
  chatAuthorName: { fontSize: 10, fontWeight: "700", color: PRIMARY, marginBottom: 2 },
  messageContentText: { fontSize: 13, color: colors.neutral[800] },
  messageContentTextMe: { color: "#FFFFFF" },
  messageTimeText: { fontSize: 9, color: TEXT_MUTED, alignSelf: "flex-end", marginTop: 4 },
  messageTimeTextMe: { color: "rgba(255, 255, 255, 0.7)" },
  messageComposerRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  messageComposerInput: {
    flex: 1,
    backgroundColor: BG_SUBTLE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendMsgBtn: {
    backgroundColor: PRIMARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  storyViewerContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  storyViewerImage: { ...StyleSheet.absoluteFillObject },
  storyTapGestureContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 5,
  },
  storyTapLeft: { width: "35%", height: "100%" },
  storyTapRight: { width: "65%", height: "100%" },
  storyViewerTopBar: {
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  storyProgressBarRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10,
  },
  storyProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  storyProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  storyHeaderInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storyViewerAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  storyViewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  storyViewerAuthorName: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  storyViewerLocation: { color: "rgba(255, 255, 255, 0.8)", fontSize: 11 },
  storyCloseBtn: { padding: 6 },
  storyViewerBottomCaption: {
    zIndex: 10,
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
  storyReplyText: { color: "#FFFFFF", fontSize: 13 },
  storyHeartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
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
  modalMainTitle: { fontSize: 18, fontWeight: "800", color: TEXT_PRIMARY },
  postTypeSwitchRow: {
    flexDirection: "row",
    backgroundColor: colors.surface.muted,
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
  postTypeSwitchBtnActive: { backgroundColor: "#FFFFFF" },
  postTypeSwitchText: { fontSize: 13, fontWeight: "700", color: TEXT_MUTED },
  postTypeSwitchTextActive: { color: PRIMARY, fontWeight: "800" },
  uploadOptionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  r2UploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  r2UploadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  modalProgressBarWrap: {
    height: 18,
    backgroundColor: BORDER_DEFAULT,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalProgressFill: { height: "100%", backgroundColor: PRIMARY },
  modalProgressText: {
    position: "absolute",
    alignSelf: "center",
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
  },
  uploadedPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG_SUBTLE,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    marginBottom: 12,
  },
  uploadedThumb: { width: 44, height: 44, borderRadius: 8 },
  uploadedSuccessText: { fontSize: 13, fontWeight: "700", color: SUCCESS },
  uploadedUrlText: { fontSize: 11, color: TEXT_MUTED },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.secondary,
    marginTop: 10,
    marginBottom: 4,
  },
  modalInputField: {
    backgroundColor: BG_SUBTLE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  modalTextArea: { minHeight: 80, textAlignVertical: "top" },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  presetTag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  presetTagText: { fontSize: 11, color: PRIMARY, fontWeight: "600" },
  modalSubmitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  modalSubmitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  commentsPostTitle: { fontSize: 11, color: TEXT_MUTED, maxWidth: 240 },
  emptyCommentsText: { textAlign: "center", color: TEXT_MUTED, marginVertical: 20 },
  fullCommentItem: { flexDirection: "row", gap: 10, marginBottom: 12 },
  fullCommentAvatar: { width: 32, height: 32, borderRadius: 16 },
  fullCommentBody: { flex: 1, backgroundColor: BG_SUBTLE, padding: 10, borderRadius: 12 },
  fullCommentAuthorName: { fontSize: 12, fontWeight: "700", color: TEXT_PRIMARY },
  fullCommentTime: { fontSize: 10, color: TEXT_MUTED },
  fullCommentText: { fontSize: 13, color: colors.neutral[700], marginTop: 2 },
  addCommentInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: 10,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: BG_SUBTLE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  submitCommentBtn: {
    backgroundColor: PRIMARY,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
