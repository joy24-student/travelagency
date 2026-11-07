import React, { useMemo } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { OptimizedImage, DEFAULT_BLURHASH } from "./common";
import { sanitizeUserText, sanitizeMediaUrl } from "../utils/sanitizer";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { TravelVideoPlayer } from "./TravelVideoPlayer";

interface CommunityPostProps {
  authorName: string;
  authorImage?: string;
  role?: string;
  isInfluencer?: boolean;
  location?: string;
  timestamp?: string;
  title: string;
  description?: string;
  postImage?: string;
  postVideo?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
  commentsList?: Array<{
    id: string;
    content: string;
    author?: { display_name?: string; avatar_url?: string; id?: string };
    created_at?: string;
  }>;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onExploreSpot?: () => void;
  onOpenProfile?: () => void;
}

export function CommunityPost({
  authorName,
  authorImage,
  role,
  isInfluencer,
  location,
  timestamp,
  title,
  description,
  postImage,
  postVideo,
  likes = 0,
  comments = 0,
  liked = false,
  saved = false,
  commentsList = [],
  onLike,
  onComment,
  onShare,
  onSave,
  onExploreSpot,
  onOpenProfile,
}: CommunityPostProps) {
  // Sanitize all user-generated content to prevent XSS / HTML / Script injection
  const safeAuthorName = useMemo(() => sanitizeUserText(authorName) || "Traveler", [authorName]);
  const safeTitle = useMemo(() => sanitizeUserText(title), [title]);
  const safeDescription = useMemo(() => (description ? sanitizeUserText(description) : undefined), [description]);
  const safeLocation = useMemo(() => (location ? sanitizeUserText(location) : undefined), [location]);
  const safeTimestamp = useMemo(() => (timestamp ? sanitizeUserText(timestamp) : undefined), [timestamp]);
  const safeAuthorImage = useMemo(() => sanitizeMediaUrl(authorImage), [authorImage]);
  const safePostImage = useMemo(() => sanitizeMediaUrl(postImage), [postImage]);
  const safePostVideo = useMemo(() => sanitizeMediaUrl(postVideo), [postVideo]);

  const safeCommentsList = useMemo(() => {
    return (commentsList || []).map((c: any) => ({
      ...c,
      content: sanitizeUserText(c.content),
      author: {
        ...c.author,
        display_name: sanitizeUserText(c.author?.display_name || "Traveler"),
        avatar_url: sanitizeMediaUrl(c.author?.avatar_url),
      },
    }));
  }, [commentsList]);

  const handleLikePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  const handleSavePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave?.();
  };

  const [isOptionsVisible, setIsOptionsVisible] = React.useState(false);
  const [isReportVisible, setIsReportVisible] = React.useState(false);
  const [isPostHidden, setIsPostHidden] = React.useState(false);

  const handleOpenOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOptionsVisible(true);
  };

  const handleBlockUser = () => {
    setIsOptionsVisible(false);
    Alert.alert(
      "ব্যবহারকারীকে ব্লক করবেন?",
      `আপনি কি নিশ্চিত যে ${safeAuthorName}-কে ব্লক করতে চান? তাদের কোনো পোস্ট আর আপনার ফিডে প্রদর্শিত হবে না।`,
      [
        { text: "বাতিল", style: "cancel" },
        {
          text: "ব্লক করুন",
          style: "destructive",
          onPress: () => {
            setIsPostHidden(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("সফল", `${safeAuthorName}-কে সফলভাবে ব্লক করা হয়েছে।`);
          },
        },
      ]
    );
  };

  const handleReportReason = (reason: string) => {
    setIsReportVisible(false);
    setIsPostHidden(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "রিপোর্ট গৃহীত হয়েছে",
      `ধন্যবাদ। "${reason}" কারণে পোস্টটি পর্যালোচনার জন্য জমা হয়েছে। অবিলম্বে এটি আপনার ফিড থেকে সরিয়ে নেওয়া হলো।`
    );
  };

  if (isPostHidden) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.authorInfo} onPress={onOpenProfile}>
          {safeAuthorImage ? (
            <OptimizedImage
              source={{ uri: safeAuthorImage }}
              style={styles.avatar}
              blurhash={DEFAULT_BLURHASH}
              
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={20} color="#767683" />
            </View>
          )}
          <View style={styles.authorDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.authorName}>{safeAuthorName}</Text>
              {(isInfluencer || role === "Influencer") && (
                <View style={styles.influencerBadge}>
                  <Text style={styles.influencerBadgeText}>Influencer</Text>
                </View>
              )}
              <Ionicons name="checkmark-circle" size={14} color="#0055F2" />
            </View>
            <View style={styles.subMetaRow}>
              {safeLocation && (
                <View style={styles.locationPill}>
                  <Ionicons name="location-sharp" size={11} color="#0055F2" />
                  <Text style={styles.locationText}>{safeLocation}</Text>
                </View>
              )}
              {safeTimestamp && <Text style={styles.timestamp}>{safeTimestamp}</Text>}
            </View>
          </View>
        </Pressable>
        <Pressable hitSlop={8} onPress={handleOpenOptions} accessibilityLabel="Post Options">
          <Ionicons name="ellipsis-horizontal" size={20} color="#767683" />
        </Pressable>
      </View>

      {/* Post Video or Image with Explore Experience Glass Pill */}
      {safePostVideo ? (
        <View style={styles.imageContainer}>
          <TravelVideoPlayer videoUrl={safePostVideo} posterUrl={safePostImage} height={240} />
          {safeLocation && (
            <Pressable style={styles.explorePill} onPress={onExploreSpot}>
              <View style={styles.explorePillContent}>
                <Ionicons name="compass-outline" size={14} color="#000666" />
                <Text style={styles.explorePillText}>Explore Spot</Text>
                <Ionicons name="chevron-forward" size={12} color="#000666" />
              </View>
            </Pressable>
          )}
        </View>
      ) : safePostImage ? (
        <View style={styles.imageContainer}>
          <OptimizedImage
            source={{ uri: safePostImage }}
            style={styles.postImage}
            blurhash={DEFAULT_BLURHASH}
            
          />
          {safeLocation && (
            <Pressable style={styles.explorePill} onPress={onExploreSpot}>
              <View style={styles.explorePillContent}>
                <Ionicons name="compass-outline" size={14} color="#000666" />
                <Text style={styles.explorePillText}>Explore Spot</Text>
                <Ionicons name="chevron-forward" size={12} color="#000666" />
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* Title & Description */}
      <Text style={styles.title}>{safeTitle}</Text>
      {safeDescription && <Text style={styles.description}>{safeDescription}</Text>}

      {/* Actions Bar */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <Pressable style={styles.action} onPress={handleLikePress}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#EF4444" : "#454652"}
            />
            <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
              {likes}
            </Text>
          </Pressable>

          <Pressable style={styles.action} onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={20} color="#454652" />
            <Text style={styles.actionText}>{comments}</Text>
          </Pressable>

          <Pressable style={styles.action} onPress={onShare}>
            <Ionicons name="paper-plane-outline" size={20} color="#454652" />
          </Pressable>
        </View>

        <Pressable style={styles.action} onPress={handleSavePress}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={saved ? "#0055F2" : "#454652"}
          />
        </Pressable>
      </View>

      {/* Liked count social proof */}
      {likes > 0 && (
        <View style={styles.likedByRow}>
          <Ionicons name="heart" size={11} color="#EF4444" />
          <Text style={styles.likedByText}>
            Liked by <Text style={{ fontWeight: "700" }}>{likes}</Text> travelers
          </Text>
        </View>
      )}

      {/* Recent Comments Preview */}
      {safeCommentsList && safeCommentsList.length > 0 && (
        <Pressable onPress={onComment} style={styles.commentsPreviewBox}>
          {safeCommentsList.slice(0, 2).map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <Text style={styles.commentAuthor}>
                {c.author?.display_name || "Traveler"}:{" "}
                <Text style={styles.commentBody}>{c.content}</Text>
              </Text>
            </View>
          ))}
          {safeCommentsList.length > 2 ? (
            <Text style={styles.viewMoreCommentsText}>
              View all {safeCommentsList.length} comments...
            </Text>
          ) : (
            <Text style={styles.viewMoreCommentsText}>Add a comment...</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#191c1d",
  },
  role: {
    fontSize: 12,
    color: "#767683",
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#c6c5d4",
    marginTop: 2,
  },
  location: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000666",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#191c1d",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#454652",
    lineHeight: 20,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  influencerBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  influencerBadgeText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "700",
  },
  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0055F2",
  },
  imageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
  },
  explorePill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  explorePillContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  explorePillText: {
    color: "#000666",
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  actionTextLiked: {
    color: "#EF4444",
  },
  likedByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  likedByText: {
    fontSize: 12,
    color: "#64748B",
  },
  commentsPreviewBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    gap: 4,
  },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  commentBody: {
    fontWeight: "400",
    color: "#475569",
  },
  viewMoreCommentsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0055F2",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  reportItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  reportItemText: {
    fontSize: 13,
    color: "#9A3412",
    fontWeight: "500",
    flex: 1,
  },
  modalItemSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
});
