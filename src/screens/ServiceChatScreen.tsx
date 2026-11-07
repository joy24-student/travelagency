import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { chat } from "../services/ai/llm";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { Badge } from "../components/ui";
import {
  realtimeMessenger,
  ChatMessage,
  TypingIndicator,
} from "../services/supabase/messenger";
import { r2Service, UploadProgress } from "../services/r2";

const DEMO_USER_ID = "5e491c34-50b4-4d2a-8cac-d09fddd7745c";

// Suggested Question Batches
const SUGGESTED_BATCH_1 = [
  { id: "s1", text: "When will I receive my refund?", answer: "Refunds are processed within 3-5 business days back to your original payment method." },
  { id: "s2", text: "How can I modify my booking?", answer: "Go to My Trips -> Select Hotel Booking -> Tap 'Modify Booking' to adjust stay dates or guest count." },
  { id: "s3", text: "How can I cancel my booking?", answer: "Free cancellation is available until 48 hours prior to check-in. Tap 'Cancel Booking' in your trip details." },
  { id: "s4", text: "How can I check my booking information?", answer: "All active booking confirmations, vouchers, and invoice receipts are listed in the 'My Trips' tab." },
];

const SUGGESTED_BATCH_2 = [
  { id: "s5", text: "What is the standard check-in time?", answer: "Standard check-in is 3:00 PM, and check-out is 12:00 PM. Early check-in is subject to room availability." },
  { id: "s6", text: "How do I request an extra bed or crib?", answer: "You can send special requests directly to the property desk from your active booking summary." },
  { id: "s7", text: "Is breakfast included in my stay?", answer: "Please check your voucher details. Rooms labeled 'Breakfast Included' cover all registered guests." },
  { id: "s8", text: "How do I request a hotel VAT invoice?", answer: "E-invoices are generated automatically 2 hours after check-out and can be downloaded from My Trips." },
];

export function ServiceChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Consumes user state directly from authStore with fallback to useAuth
  const storeUser = useAuthStore((s) => s.user);
  const storeProfile = useAuthStore((s) => s.profile);
  const { user: authUser } = useAuth();
  const currentUser = storeUser || authUser;
  const activeUserId = currentUser?.id || DEMO_USER_ID;
  const activeUserName = storeProfile?.full_name || currentUser?.user_metadata?.full_name || "Traveler";
  const conversationId = `service_chat_${activeUserId}`;

  // Suggested questions state
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const activeSuggestions = currentBatchIndex === 0 ? SUGGESTED_BATCH_1 : SUGGESTED_BATCH_2;

  // Real-Time Messages Stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      conversation_id: conversationId,
      sender_id: "service_bot",
      sender_name: "Trip.com AI Assistant",
      content:
        "Welcome, our valued Trip.com member!\nThanks for contacting Trip.com.\nI'm your AI Service Assistant. I can handle your stay inquiries here.\nPlease share your specific questions or booking receipt so I can assist you promptly.",
      status: "read",
      created_at: new Date(Date.now() - 60000).toISOString(),
    },
  ]);

  // Action Menu, Reply & Retry State
  const [selectedActionMessage, setSelectedActionMessage] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMessageLongPress = (msg: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedActionMessage(msg);
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    Clipboard.setString(msg.content);
    setSelectedActionMessage(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¾Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦â€¢Ã Â¦ÂªÃ Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾ Ã Â¦Â¹Ã Â§Å¸Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡");
  };

  const handleReplyMessage = (msg: ChatMessage) => {
    setReplyingToMessage(msg);
    setSelectedActionMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setSelectedActionMessage(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¾Ã Â¦Å¸Ã Â¦Â¿ Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡ Ã Â¦Â«Ã Â§â€¡Ã Â¦Â²Ã Â¦Â¾ Ã Â¦Â¹Ã Â§Å¸Ã Â§â€¡Ã Â¦â€ºÃ Â§â€¡");
  };

  const handleRetryMessage = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;
    
    // Mark as sending
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, status: "sending" as const } : m))
    );
    setSelectedActionMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      // Transition to sent then read
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, status: "sent" as const } : m))
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "read" as const } : m))
        );
      }, 1000);
    }, 800);
  };

  // Input & Typing state
  const [inputText, setInputText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState<boolean>(false);

  // Media Attachment State
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  // Modals state
  const [showRecentlyViewed, setShowRecentlyViewed] = useState<boolean>(false);
  const [showTransportModal, setShowTransportModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // 1. Subscribe to Supabase Realtime channel with Deduplication
  useEffect(() => {
    const unsubscribe = realtimeMessenger.subscribeToConversation(conversationId, {
      onMessage: (incoming) => {
        setMessages((prev) => realtimeMessenger.mergeMessages(prev, incoming));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onTyping: (typers) => {
        const botTyping = typers.some((t) => t.userId === "service_bot" && t.isTyping);
        setIsAssistantTyping(botTyping);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  // 2. Pick and upload attachment with client-side compression
  const handleAttachImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsUploading(true);
    setUploadPercent(0);

    try {
      const result = await r2Service.pickAndUploadMedia("image", {
        quality: 0.75,
        allowsEditing: true,
        onProgress: (p: UploadProgress) => {
          setUploadPercent(p.progress);
        },
      });

      if (result.success && result.url) {
        setAttachedImage(result.url);
      }
    } catch (err: any) {
      console.warn("Attachment error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Send Message with sub-100ms Optimistic UI & Deduplication
  const handleSendText = async (customText?: string, autoAnswer?: string) => {
    const textToSend = customText || inputText;
    const currentAttachment = attachedImage;

    if (!textToSend.trim() && !currentAttachment) return;

    // 1. Local Optimistic Message
    const optimisticUserMsg = realtimeMessenger.createOptimisticMessage(
      conversationId,
      activeUserId,
      textToSend.trim() || (currentAttachment ? "Shared booking document" : ""),
      activeUserName,
      undefined,
      currentAttachment || undefined,
      currentAttachment ? "image" : undefined
    );

    // Instant append (<50ms feedback)
    setMessages((prev) => [...prev, optimisticUserMsg]);
    if (!customText) setInputText("");
    setAttachedImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    // 2. Fast-track preset answer
    if (autoAnswer) {
      setIsAssistantTyping(true);
      setTimeout(() => {
        setIsAssistantTyping(false);
        const botReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: "service_bot",
          sender_name: "Trip.com AI Assistant",
          content: autoAnswer,
          status: "read",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => realtimeMessenger.mergeMessages(prev, botReply));
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }, 400);
      return;
    }

    // 3. AI Concierge Query
    setIsAssistantTyping(true);
    try {
      const response = await chat([
        {
          role: "system",
          content:
            "You are the AI Hotel & Stays concierge service assistant for Trip.com. Answer inquiries regarding hotel reservations, check-in policies, room amenities, and refunds concisely and politely.",
        },
        ...messages.map((m) => ({
          role: (m.sender_id === activeUserId ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: textToSend },
      ]);

      const replyContent =
        response.data ||
        `I have noted your inquiry regarding "${textToSend}". Our reservations desk is at your service.`;

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: "service_bot",
        sender_name: "Trip.com AI Assistant",
        content: replyContent,
        status: "read",
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => realtimeMessenger.mergeMessages(prev, botReply));
    } catch {
      const fallbackReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: "service_bot",
        sender_name: "Trip.com AI Assistant",
        content: `Thank you for reaching out regarding "${textToSend}". I have logged your request with our Hotels & Homes support team.`,
        status: "read",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => realtimeMessenger.mergeMessages(prev, fallbackReply));
    } finally {
      setIsAssistantTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleToggleBatch = () => {
    setCurrentBatchIndex((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Top Navigation Header Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.tripLogoBadge}>
            <Text style={styles.tripLogoText}>Trip</Text>
            <View style={styles.logoYellowDot} />
          </View>

          <Text style={styles.headerTitle}>Hotels & Homes Service Chat</Text>
        </View>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setShowHistoryModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="time-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Keyboard Avoiding Wrapper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.keyboardContainer}
      >
        {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Chat Scroll Container Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.timestampText}>Live Real-Time Support</Text>
          <Text style={styles.senderLabel}>Trip.com Support Verified</Text>

          {/* Messages Stream */}
          {messages.map((msg) => {
            const isMe = msg.sender_id === activeUserId;
            return (
              <TouchableOpacity
                key={msg.id}
                activeOpacity={0.9}
                onLongPress={() => handleMessageLongPress(msg)}
                style={[
                  styles.messageBubble,
                  isMe ? styles.userBubble : styles.botBubble,
                ]}
              >
                {/* Media Attachment Preview */}
                {msg.media_url && (
                  <View style={styles.bubbleMediaWrap}>
                    <Image
                      source={{ uri: msg.media_url }}
                      style={styles.bubbleImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    isMe && styles.userMessageText,
                  ]}
                >
                  {msg.content}
                </Text>

                <View style={styles.bubbleMetaRow}>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {isMe && (
                    <View style={styles.statusIconWrap}>
                      {msg.status === "sending" && (
                        <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                      )}
                      {msg.status === "sent" && (
                        <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.7)" />
                      )}
                      {msg.status === "delivered" && (
                        <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.7)" />
                      )}
                      {msg.status === "read" && (
                        <Ionicons name="checkmark-done" size={13} color="#93C5FD" />
                      )}
                      {msg.status === "failed" && (
                        <Ionicons name="alert-circle" size={13} color="#EF4444" />
                      )}
                    </View>
                  )}
                </View>

                {/* Failed Message Retry Pill */}
                {isMe && msg.status === "failed" && (
                  <TouchableOpacity
                    style={styles.retryPill}
                    onPress={() => handleRetryMessage(msg.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={12} color="#EF4444" />
                    <Text style={styles.retryPillText}>ব্যর্থ • আবার পাঠান</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Typing Indicator */}
          {isAssistantTyping && (
            <View style={styles.assistantTypingBubble}>
              <View style={styles.typingDotBox}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
              <Text style={styles.assistantTypingText}>Assistant is drafting a response...</Text>
            </View>
          )}

          {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Card "You might want to ask" Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>You might want to ask</Text>

            {activeSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionRow}
                activeOpacity={0.7}
                onPress={() => handleSendText(item.text, item.answer)}
              >
                <Text style={styles.suggestionText}>{item.text}</Text>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.changeBtn}
              activeOpacity={0.7}
              onPress={handleToggleBatch}
            >
              <Ionicons name="sync-outline" size={16} color="#2563EB" />
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Chip: Transport Info */}
          <View style={styles.quickChipRow}>
            <TouchableOpacity
              style={styles.transportChip}
              activeOpacity={0.8}
              onPress={() => setShowTransportModal(true)}
            >
              <Ionicons name="car" size={16} color="#2563EB" />
              <Text style={styles.transportChipText}>Transport Info</Text>
              <View style={styles.badgeOne}>
                <Text style={styles.badgeOneText}>1</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Attachment Preview Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        {attachedImage && (
          <View style={styles.attachedPreviewBar}>
            <Image source={{ uri: attachedImage }} style={styles.attachedThumb} />
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={styles.attachedTitle}>Image attached</Text>
              <Text style={styles.attachedSubtitle}>Ready to send to support</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAttachedImage(null)}
              style={styles.clearAttachmentBtn}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Upload Progress Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        {isUploading && (
          <View style={styles.uploadProgressRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.uploadProgressLabel}>
              Compressing & uploading media ({uploadPercent}%)...
            </Text>
          </View>
        )}

        {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Active Reply Preview Bar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        {replyingToMessage && (
          <View style={styles.replyPreviewBar}>
            <View style={styles.replyBarIndicator} />
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarAuthor}>
                {replyingToMessage.sender_name || (replyingToMessage.sender_id === activeUserId ? "Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¿" : "Assistant")} Ã Â¦â€¢Ã Â§â€¡ Ã Â¦â€°Ã Â¦Â¤Ã Â§ÂÃ Â¦Â¤Ã Â¦Â° Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Å¡Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡Ã Â¦Â¨
              </Text>
              <Text style={styles.replyBarSnippet} numberOfLines={1}>
                {replyingToMessage.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyingToMessage(null)}
              style={styles.replyBarCloseBtn}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Bottom Fixed Toolbar & Input Area Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <View style={styles.bottomToolArea}>
          {/* Recently Viewed Chip */}
          <View style={styles.recentlyViewedWrap}>
            <TouchableOpacity
              style={styles.recentlyViewedChip}
              activeOpacity={0.8}
              onPress={() => setShowRecentlyViewed(true)}
            >
              <Text style={styles.recentlyViewedText}>Recently viewed</Text>
            </TouchableOpacity>
          </View>

          {/* Rounded Input Pill Bar */}
          <View style={styles.inputBarPill}>
            <TouchableOpacity
              onPress={() => setIsRecording(!isRecording)}
              style={styles.micBtn}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={22}
                color={isRecording ? "#DC2626" : "#0F172A"}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAttachImage} style={styles.attachIconBtn}>
              <Ionicons name="image-outline" size={21} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.verticalDivider} />

            <TextInput
              style={styles.inputField}
              placeholder={isRecording ? "Listening..." : "Please describe your question..."}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendText()}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => handleSendText()}
              disabled={!inputText.trim() && !attachedImage}
            >
              <Ionicons
                name={inputText.trim() || attachedImage ? "send" : "add-circle-outline"}
                size={24}
                color={inputText.trim() || attachedImage ? "#2563EB" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MODAL: Recently Viewed Hotels Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Modal
        visible={showRecentlyViewed}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecentlyViewed(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Recently Viewed Properties</Text>
              <TouchableOpacity onPress={() => setShowRecentlyViewed(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { name: "Grand Beach Resort & Spa", city: "Cox's Bazar", price: "$120/night" },
              { name: "The Westin Dhaka", city: "Gulshan, Dhaka", price: "$180/night" },
              { name: "Pan Pacific Sonargaon", city: "Dhaka Central", price: "$150/night" },
            ].map((item, idx) => (
              <TouchableOpacity
                key={item.name}
                style={styles.recentItemRow}
                onPress={() => {
                  setShowRecentlyViewed(false);
                  handleSendText(`Inquiry regarding ${item.name}`);
                }}
              >
                <Ionicons name="bed-outline" size={20} color="#2563EB" />
                <View style={{ flex: 1, marginStart: 12 }}>
                  <Text style={styles.recentItemName}>{item.name}</Text>
                  <Text style={styles.recentItemCity}>{item.city}</Text>
                </View>
                <Text style={styles.recentItemPrice}>{item.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MODAL: Transport Info Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Modal
        visible={showTransportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ã°Å¸Å¡Ëœ Transport Info</Text>
              <TouchableOpacity onPress={() => setShowTransportModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 10 }}>
              <View style={styles.transportBox}>
                <Text style={styles.transportBoxTitle}>Airport Transfer Shuttle</Text>
                <Text style={styles.transportBoxText}>
                  Complimentary pickup available at Terminal 1 & 2 every 30 minutes for hotel guests.
                </Text>
              </View>

              <View style={styles.transportBox}>
                <Text style={styles.transportBoxTitle}>Metro & Railway Access</Text>
                <Text style={styles.transportBoxText}>
                  Closest Station: Central Express Gate 3 (200m walking distance).
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ MODAL: Chat History Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Modal
        visible={showHistoryModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Support Chat History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.historyRow}>
              <Ionicons name="chatbubbles-outline" size={20} color="#2563EB" />
              <View style={{ flex: 1, marginStart: 12 }}>
                <Text style={styles.historyTitle}>Hotels & Homes Inquiry</Text>
                <Text style={styles.historyDate}>Today, Live</Text>
              </View>
              <Text style={styles.historyBadge}>Active</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
          {/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Long Press Context Action Menu Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Modal
        visible={!!selectedActionMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedActionMessage(null)}
      >
        <Pressable
          style={styles.actionMenuBackdrop}
          onPress={() => setSelectedActionMessage(null)}
        >
          <View style={styles.actionMenuCard}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle}>Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â°Ã Â§ÂÃ Â¦Â¤Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¬Ã Â¦Â¿Ã Â¦â€¢Ã Â¦Â²Ã Â§ÂÃ Â¦Âª / Message Options</Text>
              <Text style={styles.actionMenuSnippet} numberOfLines={2}>
                "{selectedActionMessage?.content}"
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => selectedActionMessage && handleCopyMessage(selectedActionMessage)}
            >
              <Ionicons name="copy-outline" size={20} color="#2563EB" />
              <Text style={styles.actionMenuText}>Ã Â¦â€¢Ã Â¦ÂªÃ Â¦Â¿ Ã Â¦â€¢Ã Â¦Â°Ã Â§ÂÃ Â¦Â¨ (Copy)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => selectedActionMessage && handleReplyMessage(selectedActionMessage)}
            >
              <Ionicons name="arrow-undo-outline" size={20} color="#0D9488" />
              <Text style={styles.actionMenuText}>Ã Â¦â€°Ã Â¦Â¤Ã Â§ÂÃ Â¦Â¤Ã Â¦Â° Ã Â¦Â¦Ã Â¦Â¿Ã Â¦Â¨ (Reply)</Text>
            </TouchableOpacity>

            {selectedActionMessage?.sender_id === activeUserId && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => selectedActionMessage && handleRetryMessage(selectedActionMessage.id)}
              >
                <Ionicons name="refresh-outline" size={20} color="#D97706" />
                <Text style={styles.actionMenuText}>Ã Â¦â€ Ã Â¦Â¬Ã Â¦Â¾Ã Â¦Â° Ã Â¦ÂªÃ Â¦Â¾Ã Â¦Â Ã Â¦Â¾Ã Â¦Â¨ (Resend / Retry)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemDestructive]}
              onPress={() => selectedActionMessage && handleDeleteMessage(selectedActionMessage.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionMenuText, { color: "#EF4444" }]}>
                Ã Â¦Â®Ã Â§ÂÃ Â¦â€ºÃ Â§â€¡ Ã Â¦Â«Ã Â§â€¡Ã Â¦Â²Ã Â§ÂÃ Â¦Â¨ (Delete)
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Action Toast Feedback */}
      {toastMessage && (
        <View style={styles.toastWrap}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardContainer: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  backBtn: {
    padding: 2,
  },
  tripLogoBadge: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tripLogoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  logoYellowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F59E0B",
    marginStart: 2,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  historyBtn: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  timestampText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 2,
  },
  senderLabel: {
    fontSize: 12,
    textAlign: "center",
    color: "#64748B",
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderTopRightRadius: 4,
  },
  bubbleMediaWrap: {
    width: 200,
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  bubbleImage: {
    width: "100%",
    height: "100%",
  },
  messageText: {
    fontSize: 14.5,
    color: "#0F172A",
    lineHeight: 21,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  bubbleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 12,
    color: "#94A3B8",
  },
  bubbleTimeMe: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  assistantTypingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 10,
  },
  typingDotBox: {
    flexDirection: "row",
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2563EB",
  },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1.0 },
  assistantTypingText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  suggestionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginTop: 8,
    marginBottom: 14,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionText: {
    fontSize: 14,
    color: "#1E293B",
    flex: 1,
    paddingEnd: 10,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 14,
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  quickChipRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 12,
  },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  transportChipText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  badgeOne: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOneText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  attachedPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 6,
  },
  attachedThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  attachedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  attachedSubtitle: {
    fontSize: 12,
    color: "#3B82F6",
  },
  clearAttachmentBtn: {
    padding: 4,
  },
  uploadProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  uploadProgressLabel: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  bottomToolArea: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  recentlyViewedWrap: {
    marginBottom: 8,
  },
  recentlyViewedChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  recentlyViewedText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
  },
  inputBarPill: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 8px rgba(15, 23, 42, 0.04)" } : {}),
  },
  micBtn: {
    padding: 2,
  },
  attachIconBtn: {
    padding: 2,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  iconBtn: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  recentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  recentItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  recentItemCity: {
    fontSize: 13,
    color: "#64748B",
  },
  recentItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  transportBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
  },
  transportBoxTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 4,
  },
  transportBoxText: {
    fontSize: 13.5,
    color: "#1D4ED8",
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  historyDate: {
    fontSize: 13,
    color: "#64748B",
  },
  historyBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusIconWrap: {
    marginStart: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  retryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
  },
  retryPillText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  replyBarIndicator: {
    width: 3,
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 2,
    marginEnd: 10,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 2,
  },
  replyBarSnippet: {
    fontSize: 12,
    color: "#64748B",
  },
  replyBarCloseBtn: {
    padding: 6,
    marginStart: 8,
  },
  actionMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionMenuCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  actionMenuHeader: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  actionMenuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  actionMenuSnippet: {
    fontSize: 12.5,
    color: "#64748B",
    fontStyle: "italic",
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  actionMenuItemDestructive: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 4,
  },
  actionMenuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  toastWrap: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 999,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
});
