import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video" | null>(null);
  const [selectedContextMenuMsg, setSelectedContextMenuMsg] = useState<DirectMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null);

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

    let textToSend = inputText.trim() || (selectedMediaType === "video" ? "Shared a travel video clip 🎥" : "Shared a photo 📷");
    if (replyingToMessage) {
      textToSend = `[রিপ্লাই: "${replyingToMessage.content.slice(0, 35)}..."]\n${textToSend}`;
      setReplyingToMessage(null);
    }
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
      status: "sending",
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
        prev.map((m) => (m.id === tempId ? { ...savedMsg, status: "sent" } : m))
      );
    } catch (e) {
      console.warn("Send direct message error:", e);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailedMessage = async (msg: DirectMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, status: "sending" } : m))
    );
    try {
      const savedMsg = await messengerRepository.sendMessage(
        conversation.id,
        currentUserId,
        msg.content,
        msg.media_url,
        msg.media_type
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...savedMsg, status: "sent" } : m))
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: "failed" } : m))
      );
    }
  };

  const renderStatus = (status?: DirectMessage["status"], msgItem?: DirectMessage) => {
    switch (status) {
      case "sending":
        return <Ionicons name="time-outline" size={12} color="#94A3B8" />;
      case "sent":
        return <Ionicons name="checkmark" size={13} color="#94A3B8" />;
      case "delivered":
        return <Ionicons name="checkmark-done" size={13} color="#94A3B8" />;
      case "read":
        return <Ionicons name="checkmark-done" size={13} color="#38BDF8" />;
      case "failed":
        return (
          <Pressable
            style={styles.failedStatusRow}
            onPress={() => msgItem && handleRetryFailedMessage(msgItem)}
            hitSlop={6}
          >
            <Ionicons name="alert-circle" size={13} color="#EF4444" />
            <Text style={styles.retryStatusText}>আবার পাঠান</Text>
          </Pressable>
        );
      default:
        return <Ionicons name="checkmark" size={13} color="#94A3B8" />;
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

        <Pressable
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedContextMenuMsg(item);
          }}
          delayLongPress={280}
          style={({ pressed }) => [
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleThem,
            pressed && { opacity: 0.9 },
          ]}
        >
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

          <View style={styles.msgFooterRow}>
            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isMe && renderStatus(item.status || "sent", item)}
          </View>
        </Pressable>
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

        {/* Reply Preview Bar */}
        {replyingToMessage && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyBarLeft}>
              <Ionicons name="arrow-undo" size={16} color={TRIP_BLUE} />
              <View style={{ flex: 1, marginStart: 8 }}>
                <Text style={styles.replySenderText}>
                  {replyingToMessage.sender_id === currentUserId ? "আপনাকে" : (otherUser?.display_name || "বার্তা")} রিপ্লাই করছেন
                </Text>
                <Text style={styles.replySnippetText} numberOfLines={1}>
                  {replyingToMessage.content}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setReplyingToMessage(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
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

        {/* Long-Press Context Menu Modal */}
        <Modal
          visible={!!selectedContextMenuMsg}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedContextMenuMsg(null)}
        >
          <Pressable
            style={styles.contextModalOverlay}
            onPress={() => setSelectedContextMenuMsg(null)}
          >
            {selectedContextMenuMsg && (
              <View style={styles.contextModalCard}>
                <View style={styles.contextModalHeader}>
                  <Text style={styles.contextModalTitle}>বার্তার বিকল্প</Text>
                  <Text style={styles.contextModalSnippet} numberOfLines={1}>
                    "{selectedContextMenuMsg.content}"
                  </Text>
                </View>

                <Pressable
                  style={styles.contextActionRow}
                  onPress={() => {
                    Clipboard.setString(selectedContextMenuMsg.content);
                    setSelectedContextMenuMsg(null);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("কপি সম্পন্ন", "বার্তা ক্লিপবোর্ডে কপি করা হয়েছে 📋");
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color="#0F172A" />
                  <Text style={styles.contextActionText}>কপি করুন (Copy)</Text>
                </Pressable>

                <Pressable
                  style={styles.contextActionRow}
                  onPress={() => {
                    setReplyingToMessage(selectedContextMenuMsg);
                    setSelectedContextMenuMsg(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="arrow-undo-outline" size={18} color={TRIP_BLUE} />
                  <Text style={[styles.contextActionText, { color: TRIP_BLUE }]}>রিপ্লাই দিন (Reply)</Text>
                </Pressable>

                {selectedContextMenuMsg.status === "failed" && (
                  <Pressable
                    style={styles.contextActionRow}
                    onPress={() => {
                      const target = selectedContextMenuMsg;
                      setSelectedContextMenuMsg(null);
                      handleRetryFailedMessage(target);
                    }}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#DC2626" />
                    <Text style={[styles.contextActionText, { color: "#DC2626" }]}>আবার পাঠান (Retry)</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.contextActionRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    const targetId = selectedContextMenuMsg.id;
                    setSelectedContextMenuMsg(null);
                    setMessages((prev) => prev.filter((m) => m.id !== targetId));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={[styles.contextActionText, { color: "#EF4444" }]}>মুছুন (Delete)</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Modal>
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
    marginEnd: 6,
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
  msgFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  failedStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  retryStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
  },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 3,
    borderLeftColor: TRIP_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 8,
  },
  replyBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  replySenderText: {
    fontSize: 11,
    fontWeight: "700",
    color: TRIP_BLUE,
  },
  replySnippetText: {
    fontSize: 12,
    color: "#475569",
    marginTop: 1,
  },
  contextModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contextModalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.15)" } : {}),
  },
  contextModalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
    marginBottom: 8,
  },
  contextModalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  contextModalSnippet: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 2,
  },
  contextActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  contextActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
});