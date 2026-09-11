import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

import type { UIScreen } from "../data/screens";
import { TopBar } from "./TopBar";
import { BottomNav, AiPill } from "./Navigation";
import { StoriesBar } from "../components/StoriesBar";
import { CommunityPost } from "../components/CommunityPost";
import { useAuth } from "../hooks/useAuth";
import { communityRepository } from "../services/repositories/community";
import {
  useCreateGroup,
  useCreatePost,
  useGroupChat,
  useGroups,
  useInfluencerProfiles,
  usePostInteractions,
  usePostsFeed,
  useStories,
} from "../hooks/useCommunity";

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop";

const getCount = (value: any, fallback = 0) => {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value[0]?.count != null) return value[0].count;
  return fallback;
};

const formatDate = (date?: string) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

function LivePost({
  post,
  userId,
  onComment,
}: {
  post: any;
  userId?: string;
  onComment: (postId: string) => void;
}) {
  const { like } = usePostInteractions(post.id, userId);
  const author = post.author || {};
  const media = Array.isArray(post.media) ? post.media[0] : undefined;

  const handleLike = async () => {
    try {
      await like(undefined as never);
    } catch (error) {
      Alert.alert(
        "Sign in required",
        "Please sign in before liking community posts.",
      );
    }
  };

  return (
    <CommunityPost
      authorName={author.display_name || "Traveler"}
      authorImage={author.avatar_url || media?.media_url || fallbackImage}
      role={
        author.is_influencer
          ? author.influencer_category || "Influencer"
          : "Traveler"
      }
      location={post.location}
      timestamp={formatDate(post.created_at)}
      title={post.title}
      description={post.content}
      postImage={media?.media_url}
      likes={post.likes_count ?? getCount(post.likes)}
      comments={post.comments_count ?? getCount(post.comments)}
      onLike={handleLike}
      onComment={() => onComment(post.id)}
    />
  );
}

export function CommunitySpecializedScreen({ screen }: { screen: UIScreen }) {
  const color = screen.theme === "luxe" ? "#000666" : "#287dfa";
  const { user } = useAuth();
  const userId = user?.id;
  const {
    posts,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = usePostsFeed();
  const { stories } = useStories();
  const { groups, refetch: refetchGroups } = useGroups();
  const { influencers } = useInfluencerProfiles();
  const { createPost, loading: creatingPost } = useCreatePost(userId);
  const { createGroup, loading: creatingGroup } = useCreateGroup(userId);

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [chatText, setChatText] = useState("");
  const [commentPostId, setCommentPostId] = useState<string | undefined>();
  const [commentText, setCommentText] = useState("");
  const {
    joinGroup,
    sendMessage,
    messages,
    isSending,
    refetch: refetchMessages,
  } = useGroupChat(selectedGroupId, userId);
  const selectedPost = posts.find((post: any) => post.id === commentPostId);
  const selectedGroup = groups.find(
    (group: any) => group.id === selectedGroupId,
  );

  const storyItems = stories.map((story: any) => ({
    name: story.author?.display_name || "Traveler",
    image: story.author?.avatar_url || story.media_url,
  }));

  const handleCreatePost = async () => {
    if (!postTitle.trim()) return;

    try {
      await createPost({
        title: postTitle.trim(),
        content: postContent.trim() || undefined,
        media: postImage.trim()
          ? [{ media_url: postImage.trim(), media_type: "image" }]
          : undefined,
      });
      setPostTitle("");
      setPostContent("");
      setPostImage("");
      refetchPosts();
    } catch (error) {
      Alert.alert(
        "Post failed",
        "Please sign in and check your Supabase community tables.",
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    try {
      const group = await createGroup({
        name: groupName.trim(),
        description: "Travelers sharing tips, plans, and live updates.",
        privacy: "public",
      });
      setGroupName("");
      setSelectedGroupId((group as any)?.id);
      refetchGroups();
    } catch (error) {
      Alert.alert("Group failed", "Please sign in before creating a group.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatText.trim()) return;

    try {
      await joinGroup(undefined as never);
      await sendMessage(chatText.trim());
      setChatText("");
      refetchMessages();
    } catch (error) {
      Alert.alert(
        "Chat unavailable",
        "Join a public group first, then send your message.",
      );
    }
  };

  const handleComment = async () => {
    if (!commentPostId || !commentText.trim() || !userId) return;

    try {
      await communityRepository.addComment(
        commentPostId,
        userId,
        commentText.trim(),
      );
      setCommentText("");
      setCommentPostId(undefined);
      refetchPosts();
    } catch (error) {
      Alert.alert("Comment failed", "Please sign in before commenting.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <TopBar screen={screen} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.storiesSection}>
          <StoriesBar stories={storyItems} />
        </View>

        <View style={styles.composer}>
          <Text style={styles.sectionTitle}>Create post</Text>
          <TextInput
            value={postTitle}
            onChangeText={setPostTitle}
            placeholder="Trip title"
            placeholderTextColor="#767683"
            style={styles.input}
          />
          <TextInput
            value={postContent}
            onChangeText={setPostContent}
            placeholder="Share a route, tip, or travel moment"
            placeholderTextColor="#767683"
            multiline
            style={[styles.input, styles.textarea]}
          />
          <TextInput
            value={postImage}
            onChangeText={setPostImage}
            placeholder="Image URL"
            placeholderTextColor="#767683"
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, { backgroundColor: color }]}
            onPress={handleCreatePost}
            disabled={creatingPost}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {creatingPost ? "Posting..." : "Post"}
            </Text>
          </Pressable>
        </View>

        {influencers.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Influencers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {influencers.map((profile: any) => (
                <View key={profile.id} style={styles.influencerCard}>
                  <Image
                    source={{ uri: profile.avatar_url || fallbackImage }}
                    style={styles.influencerImage}
                  />
                  <Text style={styles.influencerName}>
                    {profile.display_name}
                  </Text>
                  <Text style={styles.mutedText}>
                    {profile.influencer_category || "Creator"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Groups</Text>
          <View style={styles.groupComposer}>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="New group name"
              placeholderTextColor="#767683"
              style={[styles.input, styles.groupInput]}
            />
            <Pressable
              style={[styles.iconButton, { backgroundColor: color }]}
              onPress={handleCreateGroup}
              disabled={creatingGroup}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {groups.map((group: any) => (
              <Pressable
                key={group.id}
                style={[
                  styles.groupChip,
                  selectedGroupId === group.id && { borderColor: color },
                ]}
                onPress={() => setSelectedGroupId(group.id)}
              >
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.mutedText}>
                  {group.members_count || 0} members
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {selectedGroup ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedGroup.name} chat</Text>
            <View style={styles.chatBox}>
              {messages.slice(-4).map((message: any) => (
                <Text key={message.id} style={styles.chatLine}>
                  <Text style={styles.chatAuthor}>
                    {message.author?.display_name || "Traveler"}:{" "}
                  </Text>
                  {message.content}
                </Text>
              ))}
              <View style={styles.groupComposer}>
                <TextInput
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder="Message group"
                  placeholderTextColor="#767683"
                  style={[styles.input, styles.groupInput]}
                />
                <Pressable
                  style={[styles.iconButton, { backgroundColor: color }]}
                  onPress={handleSendMessage}
                  disabled={isSending}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.postsSection}>
          {postsLoading ? <ActivityIndicator color={color} /> : null}
          {postsError ? (
            <Text style={styles.errorText}>
              Community feed is waiting for the Supabase migration.
            </Text>
          ) : null}
          {posts.map((post: any) => (
            <View key={post.id}>
              <LivePost
                post={post}
                userId={userId}
                onComment={setCommentPostId}
              />
              {selectedPost?.id === post.id ? (
                <View style={styles.commentBox}>
                  <TextInput
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Write a comment"
                    placeholderTextColor="#767683"
                    style={[styles.input, styles.groupInput]}
                  />
                  <Pressable
                    style={[styles.iconButton, { backgroundColor: color }]}
                    onPress={handleComment}
                  >
                    <Ionicons name="chatbubble" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
          {!postsLoading && posts.length === 0 && !postsError ? (
            <Text style={styles.emptyText}>
              No community posts yet. Start the first travel thread.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <AiPill color={color} />
      <BottomNav active={screen.activeTab ?? "Post"} color={color} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e3e4",
  },
  composer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#191c1d",
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e3e4",
    paddingHorizontal: 12,
    color: "#191c1d",
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  horizontalList: {
    gap: 10,
    paddingRight: 16,
  },
  influencerCard: {
    width: 112,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  influencerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  influencerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#191c1d",
    textAlign: "center",
  },
  mutedText: {
    fontSize: 12,
    color: "#767683",
  },
  groupComposer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  groupInput: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupChip: {
    minWidth: 132,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e3e4",
    padding: 12,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#191c1d",
  },
  chatBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  chatLine: {
    fontSize: 13,
    color: "#454652",
    lineHeight: 19,
  },
  chatAuthor: {
    fontWeight: "700",
    color: "#191c1d",
  },
  postsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  commentBox: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#ba1a1a",
    fontSize: 13,
    textAlign: "center",
  },
  emptyText: {
    color: "#767683",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
});
