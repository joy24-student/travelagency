import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FriendProfile, DEMO_USER_ID } from "../services/repositories/friends";
import {
  messengerRepository,
  DirectMessage,
  ConversationItem,
} from "../services/repositories/messenger";
import { TravelVideoPlayer } from "./TravelVideoPlayer";

const TRIP_BLUE = "#0055F2";

interface DirectChatModalProps {
  conversation: ConversationItem | null;
  currentUserId?: string;
  onClose: () => void;
  onOpenProfile: (profile: FriendProfile) => void;
  onStartCall: (profile: FriendProfile, callType: "audio" | "video") => void;
}

export function DirectChatModal({
  conversation,
  currentUserId = DEMO_USER_ID,
  onClose,
  onOpenProfile,
  onStartCall,
}: DirectChatModalProps) {
  if (!conversation) return null;

  const otherUser = conversation.other_participant;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video" | null>(null);

  // Load messages and subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    let subscription: any;

    async function loadData() {
      if (!conversation) return;
      setLoading(true);
      try {
        const msgs = await messengerRepository.getMessages(conversation.id);
        if (isMounted) setMessages(msgs);
      } catch (e) {
        console.warn("Load messages error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Realtime listener
      subscription = messengerRepository.subscribeToMessages(
        conversation.id,
        (newMsg) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      );
    }

    loadData();

    return () => {
      isMounted = false;
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, [conversation?.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedMediaUrl) || !conversation) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);

    const textToSend = inputText.trim() || (selectedMediaType === "video" ? "Shared a travel video clip 🎥" : "Shared a photo 📷");
    const mediaUrl = selectedMediaUrl || undefined;
    const mediaType = selectedMediaType || undefined;

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: textToSend,
      media_url: mediaUrl,
      media_type: mediaType,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSelectedMediaUrl(null);
    setSelectedMediaType(null);

    try {
      const savedMsg = await messengerRepository.sendMessage(
        conversation.id,
        currentUserId,
        textToSend,
        mediaUrl,
        mediaType
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMsg : m))
      );
    } catch (e) {
      console.warn("Send direct message error:", e);
    } finally {
      setIsSending(false);
    }
  };

  const attachPhotoPreset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMediaUrl("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800");
    setSelectedMediaType("image");
  };

  const attachVideoPreset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMediaUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    setSelectedMediaType("video");
  };

  const renderMessageItem = ({ item }: { item: DirectMessage }) => {
    const isMe = item.sender_id === currentUserId;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && (
          <Pressable onPress={() => otherUser && onOpenProfile(otherUser)}>
            <Image
              source={{
                uri:
                  otherUser?.avatar_url ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
              }}
              style={styles.senderMiniAvatar}
            />
          </Pressable>
        )}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {item.media_url && item.media_type === "video" && (
            <View style={styles.bubbleMediaWrapper}>
              <TravelVideoPlayer videoUrl={item.media_url} height={180} borderRadius={10} />
            </View>
          )}

          {item.media_url && item.media_type === "image" && (
            <View style={styles.bubbleMediaWrapper}>
              <Image
                source={{ uri: item.media_url }}
                style={styles.bubbleImage}
                resizeMode="cover"
              />
            </View>
          )}

          {item.content && (
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {item.content}
            </Text>
          )}

          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={!!conversation} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={styles.shell}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Messenger Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <Pressable
            style={styles.headerUserInfo}
            onPress={() => otherUser && onOpenProfile(otherUser)}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    otherUser?.avatar_url ||
                    conversation.avatar_url ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerOnlineDot} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {otherUser?.display_name || conversation.title}
              </Text>
              <Text style={styles.headerSub}>Active now</Text>
            </View>
          </Pressable>

          {/* Audio & Video Call Buttons */}
          <View style={styles.callBtnsRow}>
            <Pressable
              style={styles.callIconBtn}
              onPress={() => otherUser && onStartCall(otherUser, "audio")}
            >
              <Ionicons name="call" size={20} color={TRIP_BLUE} />
            </Pressable>

            <Pressable
              style={styles.callIconBtn}
              onPress={() => otherUser && onStartCall(otherUser, "video")}
            >
              <Ionicons name="videocam" size={22} color={TRIP_BLUE} />
            </Pressable>
          </View>
        </View>

        {/* Message Thread */}
        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={TRIP_BLUE} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Attached Media Preview */}
        {selectedMediaUrl && (
          <View style={styles.attachmentPreviewBar}>
            <View style={styles.attachmentTag}>
              <Ionicons
                name={selectedMediaType === "video" ? "videocam" : "image"}
                size={14}
                color={TRIP_BLUE}
              />
              <Text style={styles.attachmentText}>
                {selectedMediaType === "video" ? "Travel Clip Attached" : "Photo Attached"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedMediaUrl(null);
                setSelectedMediaType(null);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </Pressable>
          </View>
        )}

        {/* Composer Bar */}
        <View style={styles.composerBar}>
          <Pressable style={styles.mediaPickerBtn} onPress={attachPhotoPreset}>
            <Ionicons name="image-outline" size={22} color={TRIP_BLUE} />
          </Pressable>

          <Pressable style={styles.mediaPickerBtn} onPress={attachVideoPreset}>
            <Ionicons name="videocam-outline" size={22} color={TRIP_BLUE} />
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder="Aa"
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() && !selectedMediaUrl) || isSending
                ? styles.sendBtnDisabled
                : styles.sendBtnActive,
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && !selectedMediaUrl) || isSending}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    elevation: 3,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 11,
    color: "#22c55e",
    fontWeight: "700",
  },
  callBtnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  callIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  msgRowMe: {
    justifyContent: "flex-end",
  },
  msgRowThem: {
    justifyContent: "flex-start",
  },
  senderMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "76%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: TRIP_BLUE,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 4,
  },
  bubbleMediaWrapper: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: "#fff",
    fontWeight: "500",
  },
  bubbleTextThem: {
    color: "#1E293B",
  },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  msgTimeMe: {
    color: "rgba(255,255,255,0.7)",
  },
  msgTimeThem: {
    color: "#94A3B8",
  },
  attachmentPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
  },
  attachmentTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#fff",
    gap: 8,
  },
  mediaPickerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0F172A",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnActive: {
    backgroundColor: TRIP_BLUE,
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
});

