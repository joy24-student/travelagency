import React, { useState } from "react";
import {
  ActivityIndicator,
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

// Question Item interface
interface ServiceQuestion {
  id: string;
  question: string;
  answer: string;
  icon: "headset-outline" | "play-forward";
}

// Category Questions data
const CATEGORY_QUESTIONS: Record<string, ServiceQuestion[]> = {
  Flights: [
    {
      id: "q1",
      question: "Are there any flight ticket promotions going on?",
      answer: "Yes! Currently we offer up to 15% discount on international flight bookings with code TRIP2026.",
      icon: "headset-outline",
    },
    {
      id: "q2",
      question: "How do I change my ticket?",
      answer: "Navigate to My Trips -> Select Booking -> Modify Flight Dates. Standard rebooking fees may apply.",
      icon: "headset-outline",
    },
    {
      id: "q3",
      question: "How can I cancel my flight ticket?",
      answer: "Instant cancellation is available within 24 hours of booking for a full refund.",
      icon: "headset-outline",
    },
    {
      id: "q4",
      question: "Have a different question? Chat with us now.",
      answer: "Connect with our 24/7 AI or Live Agent immediately.",
      icon: "play-forward",
    },
  ],
  Hotels: [
    {
      id: "hq1",
      question: "How do I request early check-in?",
      answer: "Special requests can be submitted via your booking details page directly to hotel management.",
      icon: "headset-outline",
    },
    {
      id: "hq2",
      question: "What is the hotel cancellation policy?",
      answer: "Free cancellation is available up to 48 hours before check-in date for flexible rates.",
      icon: "headset-outline",
    },
  ],
  Trains: [
    {
      id: "tq1",
      question: "How do I collect my train tickets?",
      answer: "E-tickets are automatically issued with QR codes. Scan at station gates.",
      icon: "headset-outline",
    },
  ],
  Cars: [
    {
      id: "cq1",
      question: "What documents are required for car rental?",
      answer: "A valid driver's license, passport, and credit card in the driver's name.",
      icon: "headset-outline",
    },
  ],
};

const FAQ_CHIPS = [
  "Hot Topics",
  "Booking & Price",
  "Ticketing & Payment",
  "Booking Query",
  "Passenger Info",
];

export function CustomerSupportScreen() {
  const insets = useSafeAreaInsets();

  // Active Category State
  const [activeTab, setActiveTab] = useState<string>("Flights");

  // Selected Question Modal
  const [activeQuestion, setActiveQuestion] = useState<ServiceQuestion | null>(null);

  // Contact Modals
  const [showLiveChatModal, setShowLiveChatModal] = useState<boolean>(false);
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showSearchBookingModal, setShowSearchBookingModal] = useState<boolean>(false);

  // Live Chat Input state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "agent"; text: string }>>([
    { sender: "agent", text: "Hello! Welcome to 24/7 Customer Support. How can we assist your trip today?" },
  ]);
  const [chatInput, setChatInput] = useState<string>("");

  // Booking search input
  const [bookingRefInput, setBookingRefInput] = useState<string>("");
  const [foundBooking, setFoundBooking] = useState<boolean>(false);

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    // Simulate Agent response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: `Thank you for asking about "${userMsg}". A live specialist is reviewing your request now!`,
        },
      ]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Top Teal Gradient Header Banner ─────────────────────────────── */}
        <LinearGradient
          colors={["#007A78", "#009999", "#0E7490"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBanner, { paddingTop: 10 }]}
        >
          {/* Top Bar Navigation */}
          <View style={styles.headerTopBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle Badge */}
          <View style={styles.headerContentRow}>
            <View style={styles.headerLeftCol}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Customer Support</Text>
                <View style={styles.yellowDot} />
              </View>

              <View style={styles.responseBadge}>
                <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
                <Text style={styles.responseBadgeText}>Support in approx. 30s</Text>
              </View>
            </View>

            {/* Agent Illustration Graphic */}
            <View style={styles.illustrationWrap}>
              <View style={styles.avatarCircle}>
                <Ionicons name="headset" size={28} color="#007A78" />
              </View>
              <View style={styles.chatBubbleBadge}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#007A78" />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Card 1: Need help with your upcoming trip? ─────────────────── */}
        <View style={styles.cardOverlap}>
          <Text style={styles.cardOverlapTitle}>
            Need help with your upcoming trip?
          </Text>

          <View style={styles.twoBtnRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              activeOpacity={0.7}
              onPress={() => setShowSearchBookingModal(true)}
            >
              <Text style={styles.outlineBtnText}>Search Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.solidBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(auth)/login" as any)}
            >
              <Text style={styles.solidBtnText}>Sign In or Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Card 2: Service Chat ───────────────────────────────────────── */}
        <View style={styles.serviceChatCard}>
          <Text style={styles.serviceChatTitle}>Service Chat</Text>

          {/* Tab Selector Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {[
              { id: "Flights", label: "Flights", icon: "airplane-outline" },
              { id: "Hotels", label: "Hotels & Homes", icon: "bed-outline" },
              { id: "Trains", label: "Trains", icon: "train-outline" },
              { id: "Cars", label: "Cars", icon: "car-outline" },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <View key={tab.id} style={{ alignItems: "center" }}>
                  <TouchableOpacity
                    style={[
                      styles.tabItem,
                      isSelected && styles.tabItemSelected,
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={isSelected ? "#FFFFFF" : "#1E293B"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        isSelected && styles.tabTextSelected,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                  {isSelected && <View style={styles.tabIndicatorTriangle} />}
                </View>
              );
            })}
          </ScrollView>

          {/* Service Questions List */}
          <View style={styles.questionsList}>
            {(CATEGORY_QUESTIONS[activeTab] || CATEGORY_QUESTIONS["Flights"]).map(
              (item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.questionRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push("/screens/service-chat" as any);
                  }}
                >
                  <Text style={styles.questionText}>{item.question}</Text>
                  {item.id === "q4" ? (
                    <Ionicons name="play" size={14} color="#475569" />
                  ) : (
                    <Ionicons name="headset-outline" size={18} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )
            )}
          </View>

          {/* More Flights FAQ Section */}
          <Text style={styles.faqSubTitle}>More {activeTab} FAQ</Text>
          <View style={styles.faqChipsWrap}>
            {FAQ_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.faqChip}
                onPress={() => setShowLiveChatModal(true)}
              >
                <Text style={styles.faqChipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Contact Action Buttons (Full width cards) ────────────────────── */}
        <View style={styles.contactActionsSection}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => setShowLiveChatModal(true)}
          >
            <View style={styles.actionLeftRow}>
              <Ionicons name="headset-outline" size={22} color="#0F172A" />
              <Text style={styles.actionCardTitle}>Chat with us</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => setShowCallModal(true)}
          >
            <View style={styles.actionLeftRow}>
              <Ionicons name="call-outline" size={22} color="#0F172A" />
              <Text style={styles.actionCardTitle}>Call us</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => setShowEmergencyModal(true)}
          >
            <View style={styles.actionLeftRow}>
              <Ionicons name="alert-circle-outline" size={22} color="#0F172A" />
              <Text style={styles.actionCardTitle}>Emergency assistance</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* ─── Cyan Info Banner Card ("Travel Worry-free...") ───────────────── */}
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeHeader}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0891B2" />
            </View>
            <Text style={styles.guaranteeTitle}>
              Travel Worry-free With Our Reliable Support
            </Text>
          </View>

          <Text style={styles.guaranteeText}>
            Thanks to our extensive Trip.com Service Guarantee, your booking is
            protected against unexpected issues which might come up.{" "}
            <Text
              style={styles.learnMoreLink}
              onPress={() => alert("Trip.com Service Guarantee protects 100% of flight & hotel bookings against cancellations, delays, or emergency refunds.")}
            >
              Learn More
            </Text>
          </Text>
        </View>

        {/* ─── Video Guide Card ("It's easy to get help on Trip.com") ──────── */}
        <View style={styles.videoHelpCard}>
          <Text style={styles.videoHelpTitle}>It's easy to get help on Trip.com</Text>

          <TouchableOpacity
            style={styles.videoPlayerContainer}
            activeOpacity={0.9}
            onPress={() => alert("Playing Help & Support Video Walkthrough...")}
          >
            <View style={styles.videoLogoRow}>
              <Text style={styles.videoLogoText}>Trip.com</Text>
              <View style={styles.videoYellowDot} />
            </View>

            <View style={styles.playButtonCircle}>
              <Ionicons name="play" size={26} color="#2563EB" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomFooter}>
          <Text style={styles.footerText}>Service you can rely on</Text>
        </View>
      </ScrollView>

      {/* ─── MODAL: Answer Drawer ─────────────────────────────────────────── */}
      <Modal
        visible={!!activeQuestion}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveQuestion(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Support Answer</Text>
              <TouchableOpacity onPress={() => setActiveQuestion(null)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activeQuestion && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.answerQText}>Q: {activeQuestion.question}</Text>
                <Text style={styles.answerAText}>{activeQuestion.answer}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.chatWithAgentBtn}
              onPress={() => {
                setActiveQuestion(null);
                setShowLiveChatModal(true);
              }}
            >
              <Text style={styles.chatWithAgentText}>Still need help? Chat with Agent</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Live Chat Window ─────────────────────────────────────── */}
      <Modal
        visible={showLiveChatModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLiveChatModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowLiveChatModal(false)}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.chatHeaderTitle}>Live Support</Text>
              <Text style={styles.chatHeaderSub}>🟢 Agent Online (Avg 30s response)</Text>
            </View>
            <Ionicons name="ellipsis-vertical" size={20} color="#0F172A" />
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatBubble,
                  msg.sender === "user" ? styles.userBubble : styles.agentBubble,
                ]}
              >
                <Text
                  style={[
                    styles.chatBubbleText,
                    msg.sender === "user" && styles.userBubbleText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatTextInput}
              placeholder="Type message..."
              placeholderTextColor="#94A3B8"
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChatMessage}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL: Call Us Hotline ───────────────────────────────────────── */}
      <Modal
        visible={showCallModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCallModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Call Customer Support</Text>
              <TouchableOpacity onPress={() => setShowCallModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.phoneOptionRow}>
              <Ionicons name="call-outline" size={20} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.phoneOptionLabel}>International Toll-Free</Text>
                <Text style={styles.phoneOptionNumber}>+1 (800) 874-7326</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.phoneOptionRow}>
              <Ionicons name="globe-outline" size={20} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.phoneOptionLabel}>Asia-Pacific Direct Line</Text>
                <Text style={styles.phoneOptionNumber}>+852 3008 3268</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Emergency Assistance ─────────────────────────────────── */}
      <Modal
        visible={showEmergencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: "#DC2626" }]}>🚨 Emergency Assistance</Text>
              <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.emergencyDesc}>
              For urgent medical, safety, missed connection, or emergency hotel displacement while traveling, our SOS desk operates 24/7.
            </Text>

            <TouchableOpacity
              style={styles.emergencyCallBtn}
              onPress={() => {
                alert("Connecting to Emergency Hotline...");
                setShowEmergencyModal(false);
              }}
            >
              <Text style={styles.emergencyCallText}>Call Emergency Hotline Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: Search Bookings ───────────────────────────────────────── */}
      <Modal
        visible={showSearchBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Search Booking</Text>
              <TouchableOpacity onPress={() => setShowSearchBookingModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.searchBookingSub}>
              Enter your booking reference number or registered email to retrieve your itinerary.
            </Text>

            <TextInput
              style={styles.sheetSearchInput}
              placeholder="e.g. TRP-984210"
              placeholderTextColor="#94A3B8"
              value={bookingRefInput}
              onChangeText={setBookingRefInput}
            />

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setFoundBooking(true);
              }}
            >
              <Text style={styles.doneBtnText}>Retrieve Booking</Text>
            </TouchableOpacity>

            {foundBooking && (
              <View style={styles.foundBookingBox}>
                <Text style={styles.foundBookingTitle}>Booking Found: TRP-984210</Text>
                <Text style={styles.foundBookingDesc}>Flight: Dhaka ✈ Cox's Bazar (Oct 12)</Text>
                <TouchableOpacity
                  style={styles.viewBookingDetailsBtn}
                  onPress={() => {
                    setShowSearchBookingModal(false);
                    router.push("/trips" as any);
                  }}
                >
                  <Text style={styles.viewBookingDetailsText}>Manage Booking</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Top Teal Gradient Header Banner */
  headerBanner: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeftCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  yellowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginLeft: 3,
    marginTop: 6,
  },
  responseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    gap: 5,
  },
  responseBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  illustrationWrap: {
    position: "relative",
    marginLeft: 10,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  chatBubbleBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Card 1: Overlapping Search Bookings Card */
  cardOverlap: {
    marginHorizontal: 16,
    marginTop: -20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardOverlapTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  twoBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  solidBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  solidBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  /* Card 2: Service Chat Card */
  serviceChatCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  serviceChatTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  tabsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  tabItem: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  tabItemSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  tabTextSelected: {
    color: "#FFFFFF",
  },
  tabIndicatorTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#0F172A",
    marginTop: -1,
  },

  /* Questions List */
  questionsList: {
    gap: 8,
    marginBottom: 18,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    flex: 1,
    paddingRight: 10,
  },

  /* FAQ Chips */
  faqSubTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  faqChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  faqChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  faqChipText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },

  /* Action Cards Section */
  contactActionsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  actionLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* Guarantee Card */
  guaranteeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#ECFEFF",
    borderRadius: 16,
    padding: 18,
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  shieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  guaranteeText: {
    fontSize: 13.5,
    color: "#334155",
    lineHeight: 20,
  },
  learnMoreLink: {
    color: "#2563EB",
    fontWeight: "600",
  },

  /* Video Help Card */
  videoHelpCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  videoHelpTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  videoPlayerContainer: {
    height: 170,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  videoLogoRow: {
    position: "absolute",
    top: 14,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  videoLogoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  videoYellowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
    marginLeft: 3,
    marginTop: 4,
  },
  playButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  /* Bottom Footer */
  bottomFooter: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  answerQText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  answerAText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  chatWithAgentBtn: {
    backgroundColor: "#2563EB",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  chatWithAgentText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  /* Live Chat Modal */
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  chatHeaderSub: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 2,
  },
  agentBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    borderBottomLeftRadius: 2,
  },
  chatBubbleText: {
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 20,
  },
  userBubbleText: {
    color: "#FFFFFF",
  },
  chatInputRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Call Options */
  phoneOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  phoneOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  phoneOptionNumber: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  /* Emergency */
  emergencyDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  emergencyCallBtn: {
    backgroundColor: "#DC2626",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyCallText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Booking Search Sheet */
  searchBookingSub: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 12,
  },
  sheetSearchInput: {
    backgroundColor: "#F1F5F9",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  foundBookingBox: {
    marginTop: 16,
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
  },
  foundBookingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
  },
  foundBookingDesc: {
    fontSize: 13,
    color: "#1D4ED8",
    marginTop: 4,
  },
  viewBookingDetailsBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  viewBookingDetailsText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
});
