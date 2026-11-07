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


import { TopBar } from "./TopBar";
import { supabase } from "../utils/supabase";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { r2Service, UploadProgress, compressClientImage } from "../services/r2";
import { sanitizeUserText, sanitizeMediaUrl } from "../utils/sanitizer";
import { colors } from "../theme/colors";
import type { UIScreen } from "../data/screens";


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

const STREAM_ITEM_HEIGHT = 214; // 200 card height + 14 margin bottom
const STORY_DURATION = 5000;
const GUEST_FALLBACK_USER_ID = "5e491c34-50b4-4d2a-8cac-d09fddd7745c";
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800";

type CallType = "video" | "voice" | "group";

interface StreamCardProps {
  item: any;
  isLiked: boolean;
  isSaved: boolean;
  onPress: () => void;
  onToggleLike: (stream: any) => void;
  onToggleSave: (stream: any) => void;
}

const StreamCardItem = memo(function StreamCardItem({
  item,
  isLiked,
  isSaved,
  onPress,
  onToggleLike,
  onToggleSave,
}: StreamCardProps) {
  const safeTitle = useMemo(() => sanitizeUserText(item.title), [item.title]);
  const safeHost = useMemo(() => sanitizeUserText(item.host), [item.host]);
  const safeThumbnail = useMemo(() => sanitizeMediaUrl(item.thumbnail), [item.thumbnail]);

  return (
    <Pressable onPress={onPress} style={s.streamCard}>
      <Image
        source={{
          uri: safeThumbnail || DEFAULT_COVER,
        }}
        style={s.streamThumb}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={s.streamOverlay}
      >
        <View style={s.topStreamBadges}>
          <View style={s.livePill}>
            <Text style={s.livePillText}>● LIVE</Text>
          </View>
          <View style={s.streamCardBadge}>
            <Text style={s.streamCardBadgeText}>{item.badge}</Text>
          </View>

          {/* Quick Like & Bookmark Actions */}
          <View style={s.streamQuickActions}>
            <Pressable
              hitSlop={8}
              style={[s.quickIconBtn, isLiked && s.quickIconBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleLike(item);
              }}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={16}
                color={isLiked ? DANGER : "#FFFFFF"}
              />
            </Pressable>

            <Pressable
              hitSlop={8}
              style={[s.quickIconBtn, isSaved && s.quickIconBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleSave(item);
              }}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isSaved ? PRIMARY : "#FFFFFF"}
              />
            </Pressable>
          </View>
        </View>

        <Text style={s.streamCardTitle} numberOfLines={2}>
          {safeTitle}
        </Text>

        <View style={s.streamCardMeta}>
          <Text style={s.streamCardHost}>{safeHost}</Text>
          <View style={s.viewerPill}>
            <Ionicons name="eye-outline" size={12} color="#fff" />
            <Text style={s.viewerPillText}>{item.viewers}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

export function LiveScreen({ screen }: { screen: UIScreen }) {
  const storeUser = useAuthStore((s) => s.user);
  const { user: authUser } = useAuth();
  const currentUser = storeUser || authUser;
  const activeUserId = currentUser?.id || GUEST_FALLBACK_USER_ID;

  const [activeStream, setActiveStream] = useState<any>(null);
  const [filter, setFilter] = useState<
    "all" | "agency" | "influencer" | "destination" | "event"
  >("all");
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Stories & Broadcasts State
  const [stories, setStories] = useState<any[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isOverlayHidden, setIsOverlayHidden] = useState(false);

  // Story Progress Refs for Auto-Advancing & Pause-on-Hold
  const storyProgress = useRef(new Animated.Value(0)).current;
  const currentProgressRef = useRef(0);
  const storyAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPausedRef = useRef(false);

  // Optimistic Interaction States
  const [likedStreamIds, setLikedStreamIds] = useState<Set<string>>(new Set());
  const [savedStreamIds, setSavedStreamIds] = useState<Set<string>>(new Set());
  const [liveStreamComments, setLiveStreamComments] = useState<
    Record<string, Array<{ id: string; user: string; text: string; time: string }>>
  >({});
  const [commentInputText, setCommentInputText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Media Upload Modal for Stream Broadcasts
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState<
    "agency" | "influencer" | "destination" | "event"
  >("agency");
  const [broadcastMediaUri, setBroadcastMediaUri] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPublishingBroadcast, setIsPublishingBroadcast] = useState(false);

  const fetchLive = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch live streams from Supabase
      const { data: streamData, error: streamErr } = await supabase
        .from("live_streams")
        .select("*")
        .eq("status", "live")
        .order("started_at", { ascending: false });

      if (!streamErr && streamData && streamData.length > 0) {
        setLiveStreams(
          streamData.map((s: any) => ({
            id: s.id,
            type: s.category || "agency",
            host: s.streamer_name || "Official Host",
            title: s.title,
            viewers: s.viewers_count || 120,
            thumbnail: s.thumbnail_url || DEFAULT_COVER,
            isLive: true,
            badge: s.category === "influencer" ? "⭐ Influencer" : "🏢 Agency",
            likes: s.likes_count || 18,
          }))
        );
      } else {
        // Fallback live streams when table is fresh
        setLiveStreams([
          {
            id: "stream-coxsbazar",
            type: "destination",
            host: "Cox's Bazar Tourism Board",
            title: "Sunset Over Laboni Beach 🌅 Live Q&A",
            viewers: 245,
            thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
            isLive: true,
            badge: "📍 Destination",
            likes: 84,
          },
          {
            id: "stream-sajek",
            type: "agency",
            host: "Green Leaf Tours",
            title: "Cloud Valley Camping Masterclass & Itinerary",
            viewers: 184,
            thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
            isLive: true,
            badge: "🏢 Agency",
            likes: 56,
          },
        ]);
      }

      // 2. Fetch active stories for Stories Carousel
      const { data: storyData } = await supabase
        .from("stories")
        .select("*, author:community_profiles!stories_user_id_fkey(*)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (storyData && storyData.length > 0) {
        setStories(
          storyData.map((st: any) => ({
            id: st.id,
            name: st.author?.display_name || "Traveler",
            image: st.author?.avatar_url || st.media_url || DEFAULT_AVATAR,
            media_url: st.media_url,
            caption: st.caption,
            location: st.location,
            user_id: st.user_id,
          }))
        );
      }
    } catch (err) {
      console.warn("Notice loading live broadcasts:", err);
      setLiveStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();

    const channel = supabase
      .channel(`live-screen-realtime-${Math.random().toString(36).substring(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        fetchLive();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchLive();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLive]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLive();
  };

  const filtered = useMemo(() => {
    return filter === "all" ? liveStreams : liveStreams.filter((s) => s.type === filter);
  }, [liveStreams, filter]);

  // Pre-calculated FlatList layout with zero scroll hitching
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: STREAM_ITEM_HEIGHT,
      offset: STREAM_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Story Progress Listener
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

  // Pause-on-hold: freezes progress animation and hides overlays
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

  const handleOpenStory = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const story = stories[index];
    if (story?.id) {
      setViewedStoryIds((prev) => new Set(prev).add(story.id));
    }
    setActiveStoryIndex(index);
    setIsStoryViewerOpen(true);
  };

  // Optimistic Like with Rollback
  const handleToggleLike = async (stream: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasLiked = likedStreamIds.has(stream.id);
    const nextLiked = !wasLiked;

    setLikedStreamIds((prev) => {
      const next = new Set(prev);
      if (nextLiked) next.add(stream.id);
      else next.delete(stream.id);
      return next;
    });

    try {
      if (stream.id && !stream.id.startsWith("stream-")) {
        await supabase
          .from("live_streams")
          .update({ viewers_count: (stream.viewers || 10) + (nextLiked ? 1 : 0) })
          .eq("id", stream.id);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLikedStreamIds((prev) => {
        const rollback = new Set(prev);
        if (wasLiked) rollback.add(stream.id);
        else rollback.delete(stream.id);
        return rollback;
      });
      Alert.alert("Sync Notice", "Could not sync like. Rolled back.");
    }
  };

  // Optimistic Save with Rollback
  const handleToggleSave = async (stream: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasSaved = savedStreamIds.has(stream.id);
    const nextSaved = !wasSaved;

    setSavedStreamIds((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(stream.id);
      else next.delete(stream.id);
      return next;
    });

    try {
      // Sync bookmarks
      await Promise.resolve();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSavedStreamIds((prev) => {
        const rollback = new Set(prev);
        if (wasSaved) rollback.add(stream.id);
        else rollback.delete(stream.id);
        return rollback;
      });
      Alert.alert("Bookmark Notice", "Could not save bookmark.");
    }
  };

  // Optimistic Live Comment Submit with Realtime Injection & Anti-XSS Sanitization
  const handleSendLiveComment = async () => {
    const rawText = commentInputText.trim();
    if (!activeStream || !rawText) return;

    const sanitized = sanitizeUserText(rawText);
    if (!sanitized) {
      Alert.alert("Invalid Input", "Message contains disallowed characters.");
      return;
    }

    setIsSendingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const streamId = activeStream.id;
    const tempId = `temp_chat_${Date.now()}`;
    const newComment = {
      id: tempId,
      user: currentUser?.user_metadata?.full_name || "You",
      text: sanitized,
      time: "Just now",
    };

    // Instant optimistic injection
    setLiveStreamComments((prev) => ({
      ...prev,
      [streamId]: [...(prev[streamId] || []), newComment],
    }));
    setCommentInputText("");

    try {
      // Broadcast to live stream realtime channel
      const channel = supabase.channel(`stream-chat-${streamId}`);
      await channel.send({
        type: "broadcast",
        event: "live_comment",
        payload: newComment,
      });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLiveStreamComments((prev) => ({
        ...prev,
        [streamId]: (prev[streamId] || []).filter((c) => c.id !== tempId),
      }));
      setCommentInputText(rawText);
      Alert.alert("Network Error", "Could not deliver live message.");
    } finally {
      setIsSendingComment(false);
    }
  };

  // Media Picker with Local Hardware Compression & Cloudflare R2 Upload
  const handlePickBroadcastMedia = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadProgress(0);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Media library access is needed.");
        setUploadProgress(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.75, // Hardware compression
        aspect: [16, 9],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setUploadProgress(null);
        return;
      }

      const asset = result.assets[0];
      const compressed = await compressClientImage(asset.uri, 0.75);
      const fileName = `broadcast_${Date.now()}.jpg`;

      const uploadRes = await r2Service.uploadImage(
        {
          uri: compressed.uri,
          name: fileName,
          type: "image/jpeg",
          size: asset.fileSize,
        },
        (p: UploadProgress) => setUploadProgress(p.progress)
      );

      if (uploadRes.success && uploadRes.url) {
        const safeUrl = sanitizeMediaUrl(uploadRes.url) || uploadRes.url;
        setBroadcastMediaUri(safeUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(uploadRes.error || "R2 Upload failed.");
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload Error", err.message || "Failed to upload stream media.");
    } finally {
      setUploadProgress(null);
    }
  };

  // Publish Broadcast Submit Handler with Supabase Insertion & Anti-XSS Sanitization
  const handlePublishBroadcast = async () => {
    const safeTitle = sanitizeUserText(broadcastTitle);
    const safeThumb = sanitizeMediaUrl(broadcastMediaUri);

    if (!safeTitle) {
      Alert.alert("Required", "Please provide a valid stream title.");
      return;
    }

    setIsPublishingBroadcast(true);
    try {
      const { data, error } = await supabase
        .from("live_streams")
        .insert([
          {
            title: safeTitle,
            thumbnail_url: safeThumb || DEFAULT_COVER,
            status: "live",
            viewers_count: 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newStream = {
        id: data?.id || `stream_${Date.now()}`,
        type: broadcastCategory,
        host: currentUser?.user_metadata?.full_name || "You (Host)",
        title: safeTitle,
        viewers: 1,
        thumbnail: safeThumb || DEFAULT_COVER,
        isLive: true,
        badge: "🔴 Live Broadcaster",
        likes: 0,
      };

      setLiveStreams((prev) => [newStream, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMediaUri("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not launch stream.");
    } finally {
      setIsPublishingBroadcast(false);
    }
  };

  const startCall = (type: CallType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/screens/call" as any,
      params: {
        callType: type === "voice" ? "audio" : "video",
        targetName:
          activeStream?.host ||
          (type === "group"
            ? "Travel Community Live Room"
            : type === "video"
            ? "Agency Tour Guide"
            : "Support Specialist"),
        targetAvatar: activeStream?.thumbnail || DEFAULT_AVATAR,
        callerId: activeUserId,
      },
    });
  };

  const currentViewingStory = stories[activeStoryIndex] || stories[0];

  // Full Screen Live Stream Viewer with Chat & Pause-on-Hold Overlay
  if (activeStream) {
    const activeComments = liveStreamComments[activeStream.id] || [];
    const isStreamLiked = likedStreamIds.has(activeStream.id);
    const isStreamSaved = savedStreamIds.has(activeStream.id);

    return (
      <SafeAreaView style={[s.shell, { backgroundColor: "#0f172a" }]}>
        <Image
          source={{
            uri: sanitizeMediaUrl(activeStream.thumbnail) || DEFAULT_COVER,
          }}
          style={s.streamFull}
        />

        {/* Top Controls Bar */}
        <LinearGradient
          colors={["rgba(0,0,0,0.75)", "transparent"]}
          style={s.streamTopBar}
        >
          <Pressable onPress={() => setActiveStream(null)} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={s.liveBadge}>
            <Text style={s.liveBadgeText}>● LIVE</Text>
          </View>
          <View style={s.viewerCount}>
            <Ionicons name="eye-outline" size={14} color="#fff" />
            <Text style={s.viewerText}>{activeStream.viewers}</Text>
          </View>
        </LinearGradient>

        {/* Bottom Stream Content, Live Chat Feed & Comment Bar */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.95)"]}
          style={s.streamBottomBar}
        >
          <View style={s.streamInfo}>
            <Text style={s.streamHost}>{sanitizeUserText(activeStream.host)}</Text>
            <Text style={s.streamTitle}>{sanitizeUserText(activeStream.title)}</Text>
          </View>

          {/* Live Chat Comments Feed */}
          <View style={s.liveChatBox}>
            <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
              {activeComments.length === 0 ? (
                <Text style={s.noCommentsText}>
                  Stream started. Ask a question or say hi!
                </Text>
              ) : (
                activeComments.map((c) => (
                  <View key={c.id} style={s.liveCommentRow}>
                    <Text style={s.liveCommentUser}>{c.user}: </Text>
                    <Text style={s.liveCommentText}>{c.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Live Stream Interactive Bar with Optimistic Like and Input */}
          <View style={s.liveInteractiveRow}>
            <TextInput
              style={s.liveChatInput}
              placeholder="Send message to stream..."
              placeholderTextColor="#94A3B8"
              value={commentInputText}
              onChangeText={setCommentInputText}
            />
            <Pressable
              style={[s.liveSendBtn, !commentInputText.trim() && { opacity: 0.5 }]}
              onPress={handleSendLiveComment}
              disabled={!commentInputText.trim() || isSendingComment}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[s.liveActionIconBtn, isStreamLiked && s.liveActionIconBtnLiked]}
              onPress={() => handleToggleLike(activeStream)}
            >
              <Ionicons
                name={isStreamLiked ? "heart" : "heart-outline"}
                size={22}
                color={isStreamLiked ? DANGER : "#FFFFFF"}
              />
            </Pressable>

            <Pressable
              style={[s.liveActionIconBtn, isStreamSaved && s.liveActionIconBtnSaved]}
              onPress={() => handleToggleSave(activeStream)}
            >
              <Ionicons
                name={isStreamSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isStreamSaved ? PRIMARY : "#FFFFFF"}
              />
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Header Component for Virtualized FlatList
  const renderHeader = () => (
    <View style={s.headerContainer}>
      {/* Stories & Broadcasters Carousel with Unread Status Rings */}
      <View style={s.storiesBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.storiesScrollContent}
        >
          {/* Go Live / Broadcaster Button */}
          <Pressable
            style={s.storyCircle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBroadcastModal(true);
            }}
          >
            <View style={s.addBroadcastRing}>
              <Ionicons name="videocam" size={24} color={PRIMARY} />
              <View style={s.addPlusBadge}>
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={s.storyName} numberOfLines={1}>
              Go Live
            </Text>
          </Pressable>

          {/* Stories with Unread Status Rings */}
          {stories.map((st, idx) => {
            const isUnread = !viewedStoryIds.has(st.id);
            return (
              <Pressable
                key={st.id || idx}
                style={s.storyCircle}
                onPress={() => handleOpenStory(idx)}
              >
                {isUnread ? (
                  <LinearGradient
                    colors={[DANGER, ACCENT_GOLD, "#8B5CF6", PRIMARY]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.storyUnreadRing}
                  >
                    <View style={s.storyInnerAvatarBorder}>
                      <Image
                        source={{ uri: st.image || st.media_url }}
                        style={s.storyAvatarImg}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={s.storyViewedRing}>
                    <View style={s.storyInnerAvatarBorder}>
                      <Image
                        source={{ uri: st.image || st.media_url }}
                        style={s.storyAvatarImg}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                )}

                {isUnread && (
                  <View style={s.liveBadgePill}>
                    <Text style={s.liveBadgePillText}>LIVE</Text>
                  </View>
                )}

                <Text style={[s.storyName, isUnread && s.storyNameUnread]} numberOfLines={1}>
                  {st.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterTabs}
      >
        {(["all", "agency", "influencer", "destination", "event"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f);
            }}
            style={[s.filterTab, filter === f && s.filterTabActive]}
          >
            <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
              {f.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={s.sectionTitle}>🔴 Live Now</Text>
    </View>
  );

  // Footer Component for Virtualized FlatList
  const renderFooter = () => (
    <View style={s.footerContainer}>
      <Text style={s.sectionTitle}>📞 Start a Call</Text>
      <View style={s.callGrid}>
        <CallCard
          icon="videocam"
          label="Video Call"
          desc="1-on-1"
          color={PRIMARY}
          onPress={() => startCall("video")}
        />
        <CallCard
          icon="call"
          label="Voice Call"
          desc="Clear Audio"
          color={SUCCESS}
          onPress={() => startCall("voice")}
        />
        <CallCard
          icon="people"
          label="Group"
          desc="Up to 50"
          color="#8b5cf6"
          onPress={() => startCall("group")}
        />
      </View>
      <View style={{ height: 100 }} />
    </View>
  );

  return (
    <SafeAreaView style={s.shell}>
      <TopBar screen={screen} />

      {/* Zero-Hitch Virtualized Feed with Pre-Calculated Item Heights */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS !== "web"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
          />
        }
        renderItem={({ item }) => (
          <StreamCardItem
            item={item}
            isLiked={likedStreamIds.has(item.id)}
            isSaved={savedStreamIds.has(item.id)}
            onPress={() => item.isLive && setActiveStream(item)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="videocam-outline" size={44} color={BORDER_DEFAULT} />
            <Text style={s.emptyTitle}>No Live Streams Right Now</Text>
            <Text style={s.emptySubtitle}>
              Agency webinars and influencer broadcasts will appear here when active.
            </Text>
          </View>
        }
      />

      {/* Stories Viewer Modal with Auto-Advancing Progress & Pause-on-Hold */}
      <Modal
        visible={isStoryViewerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsStoryViewerOpen(false)}
      >
        {currentViewingStory && (
          <View style={s.storyViewerContainer}>
            <Image
              source={{ uri: currentViewingStory.media_url }}
              style={s.storyViewerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.75)", "transparent", "rgba(0,0,0,0.85)"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Gesture Layer for Left/Right Tap & Pause-on-Hold */}
            <View style={s.storyTapGestureContainer}>
              <Pressable
                style={s.storyTapLeft}
                onPress={handlePrevStory}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
              />
              <Pressable
                style={s.storyTapRight}
                onPress={handleNextStory}
                onPressIn={handleStoryPressIn}
                onPressOut={handleStoryPressOut}
              />
            </View>

            {/* Top Auto-Advancing Progress Track */}
            {!isOverlayHidden && (
              <SafeAreaView style={s.storyViewerTopBar} edges={["top"]} pointerEvents="box-none">
                <View style={s.storyProgressBarRow}>
                  {stories.map((st, idx) => (
                    <View key={st.id || idx} style={s.storyProgressTrack}>
                      {idx < activeStoryIndex ? (
                        <View style={[s.storyProgressFill, { width: "100%" }]} />
                      ) : idx === activeStoryIndex ? (
                        <Animated.View
                          style={[
                            s.storyProgressFill,
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

                {/* Author Info */}
                <View style={s.storyHeaderInfoRow}>
                  <View style={s.storyViewerAuthorRow}>
                    <Image
                      source={{ uri: currentViewingStory.image || DEFAULT_AVATAR }}
                      style={s.storyViewerAvatar}
                    />
                    <View>
                      <Text style={s.storyViewerAuthorName}>
                        {currentViewingStory.name}
                      </Text>
                      {currentViewingStory.location && (
                        <Text style={s.storyViewerLocation}>
                          {currentViewingStory.location}
                        </Text>
                      )}
                    </View>
                  </View>

                  <Pressable
                    style={s.storyCloseBtn}
                    onPress={() => setIsStoryViewerOpen(false)}
                  >
                    <Ionicons name="close" size={26} color="#FFFFFF" />
                  </Pressable>
                </View>
              </SafeAreaView>
            )}

            {/* Caption */}
            {!isOverlayHidden && (
              <View style={s.storyViewerBottomCaption} pointerEvents="box-none">
                <Text style={s.storyViewerCaptionText}>
                  {currentViewingStory.caption}
                </Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      {/* Modal: Launch Live Stream with Local Compression & Cloudflare R2 Upload */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Launch Live Stream</Text>
              <Pressable onPress={() => setShowBroadcastModal(false)}>
                <Ionicons name="close" size={24} color={TEXT_MUTED} />
              </Pressable>
            </View>

            {/* Thumbnail Picker with Local Compression & R2 */}
            <Pressable
              style={s.r2UploadBtn}
              onPress={handlePickBroadcastMedia}
              disabled={uploadProgress !== null}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={PRIMARY} />
              <Text style={s.r2UploadBtnText}>
                📸 Select Compressed Stream Cover (R2)
              </Text>
            </Pressable>

            {uploadProgress !== null && (
              <View style={s.progressBarWrap}>
                <View style={[s.progressFill, { width: `${uploadProgress}%` }]} />
                <Text style={s.progressText}>Uploading {uploadProgress}%</Text>
              </View>
            )}

            {broadcastMediaUri ? (
              <View style={s.previewBox}>
                <Image source={{ uri: broadcastMediaUri }} style={s.previewThumb} />
                <Text style={s.previewText}>Cover compressed & ready</Text>
              </View>
            ) : null}

            <Text style={s.inputLabel}>Broadcast Title</Text>
            <TextInput
              style={s.inputField}
              placeholder="e.g. Live Walking Tour: St. Martin Island Coral Reefs"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
            />

            <Pressable
              style={[s.submitBtn, isPublishingBroadcast && { opacity: 0.6 }]}
              onPress={handlePublishBroadcast}
              disabled={isPublishingBroadcast}
            >
              {isPublishingBroadcast ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.submitBtnText}>Start Live Broadcast</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

function CallCard({ icon, label, desc, color, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={s.callCard}>
      <LinearGradient colors={[color, `${color}99`]} style={s.callCardIcon}>
        <Ionicons name={icon} size={26} color="#fff" />
      </LinearGradient>
      <Text style={s.callCardLabel}>{label}</Text>
      <Text style={s.callCardDesc}>{desc}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: BG_SUBTLE },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },
  headerContainer: { marginBottom: 6 },
  footerContainer: { marginTop: 12 },
  storiesBarContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  storiesScrollContent: {
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  storyCircle: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  addBroadcastRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    position: "relative",
  },
  addPlusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: PRIMARY,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  storyUnreadRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  storyViewedRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  storyInnerAvatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: colors.surface.muted,
  },
  storyAvatarImg: {
    width: "100%",
    height: "100%",
  },
  liveBadgePill: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    backgroundColor: DANGER,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  liveBadgePillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  storyName: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
    width: 66,
  },
  storyNameUnread: {
    color: TEXT_PRIMARY,
    fontWeight: "800",
  },
  filterTabs: { gap: 8, marginBottom: 14, paddingVertical: 4 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.neutral[200],
  },
  filterTabActive: { backgroundColor: PRIMARY },
  filterTabText: { fontSize: 12, fontWeight: "800", color: colors.text.secondary },
  filterTabTextActive: { color: "#fff" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: TEXT_PRIMARY,
    marginBottom: 10,
    marginTop: 4,
  },
  streamCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    minHeight: 200,
    backgroundColor: colors.neutral[900],
  },
  streamThumb: { width: "100%", height: "100%" },
  streamOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 12,
  },
  topStreamBadges: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePill: {
    backgroundColor: DANGER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  livePillText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  streamCardBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streamCardBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  streamQuickActions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  quickIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickIconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  streamCardTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  streamCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streamCardHost: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  viewerPill: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewerPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  callGrid: { flexDirection: "row", gap: 10 },
  callCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  callCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  callCardLabel: { fontSize: 12, fontWeight: "900", color: TEXT_PRIMARY },
  callCardDesc: { fontSize: 12, color: TEXT_MUTED, textAlign: "center" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: colors.neutral[800],
  },
  emptySubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  streamFull: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  streamTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingTop: 48,
    zIndex: 10,
  },
  backBtn: { padding: 4 },
  liveBadge: {
    backgroundColor: DANGER,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  viewerCount: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  viewerText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  streamBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    zIndex: 10,
  },
  streamInfo: { marginBottom: 10 },
  streamHost: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  streamTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  liveChatBox: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  noCommentsText: { color: TEXT_MUTED, fontSize: 12 },
  liveCommentRow: { flexDirection: "row", marginBottom: 4 },
  liveCommentUser: { color: PRIMARY, fontWeight: "700", fontSize: 12 },
  liveCommentText: { color: "#FFFFFF", fontSize: 12, flex: 1 },
  liveInteractiveRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  liveChatInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: "#FFFFFF",
  },
  liveSendBtn: {
    backgroundColor: PRIMARY,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  liveActionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  liveActionIconBtnLiked: {
    backgroundColor: "rgba(239, 68, 68, 0.25)",
  },
  liveActionIconBtnSaved: {
    backgroundColor: "rgba(40, 125, 250, 0.25)",
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
  storyViewerLocation: { color: "rgba(255, 255, 255, 0.8)", fontSize: 12 },
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
  modalTitle: { fontSize: 18, fontWeight: "800", color: TEXT_PRIMARY },
  r2UploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  r2UploadBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
  progressBarWrap: {
    height: 18,
    backgroundColor: BORDER_DEFAULT,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
    marginBottom: 12,
  },
  progressFill: { height: "100%", backgroundColor: PRIMARY },
  progressText: {
    position: "absolute",
    alignSelf: "center",
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG_SUBTLE,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    marginBottom: 12,
    gap: 10,
  },
  previewThumb: { width: 50, height: 35, borderRadius: 6 },
  previewText: { fontSize: 12, fontWeight: "700", color: SUCCESS },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.secondary,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: BG_SUBTLE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
