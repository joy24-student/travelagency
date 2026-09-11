import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Chat Message Interface
interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  cards?: any[];
}

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

  // Suggested questions state
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const activeSuggestions = currentBatchIndex === 0 ? SUGGESTED_BATCH_1 : SUGGESTED_BATCH_2;

  // Messages list
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "bot",
      time: "8:55 PM",
      text: "Welcome, our valued Trip.com member!\nThanks for contacting Trip.com.\nI'm your AI Service Assistant. I can handle your stay inquiries here.\nPlease share your specific questions so I can assist you more efficiently.",
    },
  ]);

  // Input state
  const [inputText, setInputText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showRecentlyViewed, setShowRecentlyViewed] = useState<boolean>(false);
  const [showTransportModal, setShowTransportModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const handleSendText = (customText?: string, autoAnswer?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const newTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      time: newTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText("");

    // Auto scroll down
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // AI Response
    setTimeout(() => {
      const botMsgText =
        autoAnswer ||
        `Thank you for reaching out regarding "${textToSend}". I have logged your request with our Hotels & Homes support team. An instant update will be posted here!`;

      const botReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botMsgText,
        time: newTime,
      };

      setMessages((prev) => [...prev, botReply]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);
  };

  const handleToggleBatch = () => {
    setCurrentBatchIndex((prev) => (prev === 0 ? 1 : 0));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ─── Top Navigation Header ───────────────────────────────────────── */}
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

          {/* Solid Blue Trip. Badge */}
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

      {/* ─── Chat Scroll Container ──────────────────────────────────────── */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Timestamp */}
        <Text style={styles.timestampText}>8:55 PM</Text>

        {/* Sender Label */}
        <Text style={styles.senderLabel}>Trip.com Chatbot</Text>

        {/* Messages Stream */}
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === "user" ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.sender === "user" && styles.userMessageText,
              ]}
            >
              {msg.text}
            </Text>
          </View>
        ))}

        {/* ─── Card "You might want to ask" ─────────────────────────────── */}
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

          {/* Change Refresh Button */}
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

      {/* ─── Bottom Fixed Toolbar & Input Area ─────────────────────────── */}
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

          <View style={styles.verticalDivider} />

          <TextInput
            style={styles.inputField}
            placeholder={isRecording ? "Listening..." : "Please describe your issu..."}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendText()}
            returnKeyType="send"
          />

          <TouchableOpacity style={styles.iconBtn} onPress={() => setInputText("😊 ")}>
            <Ionicons name="happy-outline" size={22} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleSendText()}
          >
            <Ionicons
              name={inputText.trim() ? "send" : "add-circle-outline"}
              size={24}
              color={inputText.trim() ? "#2563EB" : "#0F172A"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── MODAL: Recently Viewed Hotels ──────────────────────────────── */}
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
                key={idx}
                style={styles.recentItemRow}
                onPress={() => {
                  setShowRecentlyViewed(false);
                  handleSendText(`Inquiry regarding ${item.name}`);
                }}
              >
                <Ionicons name="bed-outline" size={20} color="#2563EB" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.recentItemName}>{item.name}</Text>
                  <Text style={styles.recentItemCity}>{item.city}</Text>
                </View>
                <Text style={styles.recentItemPrice}>{item.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Transport Info ───────────────────────────────────────── */}
      <Modal
        visible={showTransportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTransportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>🚘 Transport Info</Text>
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

      {/* ─── MODAL: Chat History ─────────────────────────────────────────── */}
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
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.historyTitle}>Hotels & Homes Inquiry</Text>
                <Text style={styles.historyDate}>Today, 8:55 PM</Text>
              </View>
              <Text style={styles.historyBadge}>Active</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    marginLeft: 2,
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

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  timestampText: {
    textAlign: "center",
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 4,
  },
  senderLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },

  /* Message Bubbles */
  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: "#0F172A",
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFFFFF",
  },

  /* Card: You might want to ask */
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
    fontSize: 14.5,
    color: "#1E293B",
    flex: 1,
    paddingRight: 10,
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

  /* Quick Chip Row */
  quickChipRow: {
    flexDirection: "row",
    marginTop: 4,
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
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* Bottom Tool & Input Bar */
  bottomToolArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
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
    fontSize: 13.5,
    color: "#2563EB",
    fontWeight: "500",
  },

  /* Input Pill Bar */
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
  },
  micBtn: {
    padding: 2,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  iconBtn: {
    padding: 2,
  },

  /* Modals */
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
});
