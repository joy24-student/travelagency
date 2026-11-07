import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { Badge } from "../components/ui";
import { supabase } from "../utils/supabase";
import {
  realtimeMessenger,
  ChatMessage,
  TypingIndicator,
} from "../services/supabase/messenger";
import { r2Service, UploadProgress } from "../services/r2";

const PRIMARY = "#287dfa";

interface AgencySummary {
  id: string;
  name: string;
  logo_url?: string;
  rating?: number;
  phone?: string;
  email?: string;
  address?: string;
}

// ─── Rich Attachment Interfaces ─────────────────────────────────────────

export interface LocationAttachment {
  type: "location";
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  landmarkType?: "airport" | "hotel" | "office" | "meeting_point" | "tourist_spot" | "custom";
}

export interface BookingVoucherAttachment {
  type: "voucher";
  voucherCode: string;
  bookingRef: string;
  tourName: string;
  category: "Hotel" | "Tour Package" | "Flight Pass" | "Resort Villa" | "Car Rental" | "Custom";
  dates: string;
  guestName: string;
  guestsCount: string;
  totalAmount: string;
  status: "CONFIRMED" | "PAID & ISSUED" | "RESERVED" | "COMPLETED";
  agencyName: string;
}

// Default certified travel transit spots if offline or unseeded
const DEFAULT_VERIFIED_LOCATIONS: LocationAttachment[] = [
  {
    type: "location",
    title: "Hazrat Shahjalal Int'l Airport (Terminal 1 VIP)",
    address: "Terminal 1 Gate 3, Airport Road, Kurmitola, Dhaka 1229",
    latitude: 23.8511,
    longitude: 90.4072,
    landmarkType: "airport",
  },
  {
    type: "location",
    title: "Official Agency Concierge Desk",
    address: "Avenue 4, Block D, Gulshan 2, Dhaka 1212",
    latitude: 23.7925,
    longitude: 90.4078,
    landmarkType: "office",
  },
  {
    type: "location",
    title: "Radisson Blu Water Garden Meeting Point",
    address: "Airport Road, Dhaka Cantonment, Dhaka 1206",
    latitude: 23.8183,
    longitude: 90.4089,
    landmarkType: "meeting_point",
  },
  {
    type: "location",
    title: "Sajek Valley Cloud Camp & Jeep Hub",
    address: "Ruilui Para, Sajek Union, Baghaichhari, Rangamati 4540",
    latitude: 23.382,
    longitude: 92.2938,
    landmarkType: "tourist_spot",
  },
  {
    type: "location",
    title: "Cox's Bazar Kolatoli Beach Pickup Zone",
    address: "Marine Drive Road, Kolatoli Point, Cox's Bazar 4700",
    latitude: 21.4272,
    longitude: 91.9702,
    landmarkType: "tourist_spot",
  },
];

// Fallback voucher presets if no user bookings exist yet
const FALLBACK_VOUCHERS: BookingVoucherAttachment[] = [
  {
    type: "voucher",
    voucherCode: "VCH-SJ-98421",
    bookingRef: "BK-2026-98421",
    tourName: "Sajek Valley Cloud Resort & 4x4 Chander Gari Tour",
    category: "Tour Package",
    dates: "14 Nov – 17 Nov 2026 (4 Days)",
    guestName: "Traveler Explorer",
    guestsCount: "2 Adults",
    totalAmount: "৳ 18,500",
    status: "CONFIRMED",
    agencyName: "Shopno Jatra Tours",
  },
  {
    type: "voucher",
    voucherCode: "VCH-CB-77310",
    bookingRef: "BK-2026-77310",
    tourName: "Sea Pearl Beach Resort & Spa Deluxe Ocean Suite",
    category: "Resort Villa",
    dates: "20 Nov – 23 Nov 2026 (3 Nights)",
    guestName: "Traveler Explorer",
    guestsCount: "2 Adults • 1 Child",
    totalAmount: "৳ 24,000",
    status: "PAID & ISSUED",
    agencyName: "Bengal Holidays Ltd",
  },
];

export function AgencyChatScreen() {
  const insets = useSafeAreaInsets();
  const storeUser = useAuthStore((s) => s.user);
  const storeProfile = useAuthStore((s) => s.profile);
  const { user: authUser } = useAuth();
  const currentUser = storeUser || authUser;

  // Derive stable dynamic user credentials
  const activeUserId =
    currentUser?.id ||
    storeProfile?.id ||
    "guest-traveler-" + (Math.abs(Number(storeUser?.created_at?.slice(-4))) || "01");
  const activeUserName =
    storeProfile?.full_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Traveler";

  const params = useLocalSearchParams<{ agencyId?: string; agencyName?: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(params.agencyId || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Dynamic user bookings from database
  const [userBookings, setUserBookings] = useState<BookingVoucherAttachment[]>([]);
  const [locationsList, setLocationsList] = useState<LocationAttachment[]>(DEFAULT_VERIFIED_LOCATIONS);

  // Custom attachment input state
  const [isCustomLocationMode, setIsCustomLocationMode] = useState(false);
  const [customLocTitle, setCustomLocTitle] = useState("");
  const [customLocAddress, setCustomLocAddress] = useState("");
  const [customLocCoords, setCustomLocCoords] = useState("23.8103, 90.4125");

  const [isCustomVoucherMode, setIsCustomVoucherMode] = useState(false);
  const [customVoucherCode, setCustomVoucherCode] = useState("");
  const [customTourName, setCustomTourName] = useState("");
  const [customVoucherPrice, setCustomVoucherPrice] = useState("");

  // Typing & Presence
  const [activeTypers, setActiveTypers] = useState<TypingIndicator[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Media Attachment State
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<"image" | "video">("image");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Rich Attachment Modals & Sheets
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedContextMenuMsg, setSelectedContextMenuMsg] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  const handleMessageLongPress = (msg: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedContextMenuMsg(msg);
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    Clipboard.setString(msg.content);
    setSelectedContextMenuMsg(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("বার্তা ক্লিপবোর্ডে কপি করা হয়েছে");
  };

  const handleReplyMessage = (msg: ChatMessage) => {
    setReplyingToMessage(msg);
    setSelectedContextMenuMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteMessage = (msg: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setSelectedContextMenuMsg(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    showToast("বার্তা মুছে ফেলা হয়েছে");
  };
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showVoucherPicker, setShowVoucherPicker] = useState(false);
  const [activeVoucherDetails, setActiveVoucherDetails] = useState<BookingVoucherAttachment | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);

  // Staged non-media rich attachments before send
  const [stagedLocation, setStagedLocation] = useState<LocationAttachment | null>(null);
  const [stagedVoucher, setStagedVoucher] = useState<BookingVoucherAttachment | null>(null);

  // Action Menu, Reply & Reassurance states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<ChatMessage | null>(null);
  const [showActionMenuModal, setShowActionMenuModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [incomingPushToast, setIncomingPushToast] = useState<{ title: string; body: string } | null>(null);
  const [isAgencyOnline, setIsAgencyOnline] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  // Helper: Scroll to bottom with layout safeguard
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // 1. Load available certified agencies from database
  useEffect(() => {
    async function loadAgencies() {
      try {
        const { data, error } = await supabase
          .from("agencies")
          .select("id, name, logo_url, address, rating, phone, email")
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          setAgencies(data);
          if (!selectedAgencyId) {
            setSelectedAgencyId(params.agencyId || data[0].id);
          }
        } else if (params.agencyId || params.agencyName) {
          setAgencies([
            {
              id: params.agencyId || "agency-main",
              name: params.agencyName || "Verified Travel Agency",
              logo_url: undefined,
            },
          ]);
          setSelectedAgencyId(params.agencyId || "agency-main");
        }
      } catch (err) {
        console.warn("Error loading agencies:", err);
      }
    }
    loadAgencies();
  }, [params.agencyId, params.agencyName]);

  // 2. Load dynamic user bookings from Supabase
  useEffect(() => {
    async function loadUserBookings() {
      if (!activeUserId) return;
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_reference,
            product_type,
            destination_city,
            start_date,
            end_date,
            number_of_guests,
            final_price,
            currency,
            status,
            vouchers (
              voucher_code,
              status
            )
          `)
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false })
          .limit(8);

        if (!error && data && data.length > 0) {
          const dynamicVouchers: BookingVoucherAttachment[] = data.map((b: any) => ({
            type: "voucher",
            voucherCode:
              b.vouchers?.[0]?.voucher_code || `VCH-${b.booking_reference || b.id.slice(0, 8)}`,
            bookingRef: b.booking_reference || b.id.slice(0, 10),
            tourName: `${b.destination_city || "Bangladesh Destination"} ${
              b.product_type ? b.product_type.toUpperCase() : "Tour"
            }`,
            category:
              b.product_type === "hotel"
                ? "Hotel"
                : b.product_type === "flight"
                ? "Flight Pass"
                : "Tour Package",
            dates: `${b.start_date || "Upcoming"} – ${b.end_date || "Flexible"}`,
            guestName: activeUserName,
            guestsCount: `${b.number_of_guests || 1} Traveler${
              (b.number_of_guests || 1) > 1 ? "s" : ""
            }`,
            totalAmount: `${b.currency === "BDT" ? "৳" : "$"} ${Number(
              b.final_price || 0
            ).toLocaleString()}`,
            status: b.status === "confirmed" ? "CONFIRMED" : "RESERVED",
            agencyName: agencies.find((a) => a.id === selectedAgencyId)?.name || "Partner Agency",
          }));
          setUserBookings(dynamicVouchers);
        } else {
          setUserBookings(FALLBACK_VOUCHERS);
        }
      } catch (e) {
        setUserBookings(FALLBACK_VOUCHERS);
      }
    }
    loadUserBookings();
  }, [activeUserId, agencies, selectedAgencyId, activeUserName]);

  // Active Conversation ID
  const conversationId = selectedAgencyId
    ? `agency_chat_${selectedAgencyId}_${activeUserId}`
    : `agency_chat_general_${activeUserId}`;

  // 3. Load Initial Messages from Supabase
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        setMessages(
          data.map((d: any) => ({
            id: d.id,
            client_id: d.client_id || d.id,
            conversation_id: d.conversation_id,
            sender_id: d.sender_id,
            sender_name: d.sender_id === activeUserId ? activeUserName : "Agency Rep",
            content: d.content || d.message || "",
            media_url: d.media_url,
            media_type: d.media_type,
            status: d.is_read ? "read" : "delivered",
            created_at: d.created_at,
          }))
        );
      } else {
        const agency = agencies.find((a) => a.id === selectedAgencyId);
        setMessages([
          {
            id: "initial-greet",
            conversation_id: conversationId,
            sender_id: selectedAgencyId || "agency-system",
            sender_name: agency?.name || "Agency Concierge",
            content: `Hello ${activeUserName}! Welcome to ${
              agency?.name || "our concierge service"
            }. How may we assist your upcoming trip?`,
            status: "read",
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.warn("Error loading conversation messages:", err);
    } finally {
      setLoading(false);
      scrollToBottom(false);
    }
  }, [conversationId, activeUserId, selectedAgencyId, agencies, activeUserName, scrollToBottom]);

  useEffect(() => {
    if (selectedAgencyId) {
      loadMessages();
    }
  }, [selectedAgencyId, loadMessages]);

  // 4. Supabase Realtime Sync: Postgres changes on `messages` table + Deduplication against Optimistic State
  useEffect(() => {
    if (!conversationId) return;

    // Deduplication logic against local optimistic messages
    const deduplicateAndMerge = (incomingMsg: ChatMessage) => {
      setMessages((prevList) => {
        // Match 1: Exact ID
        const exactIndex = prevList.findIndex((m) => m.id === incomingMsg.id);
        if (exactIndex !== -1) {
          const updated = [...prevList];
          updated[exactIndex] = {
            ...updated[exactIndex],
            ...incomingMsg,
            is_optimistic: false,
          };
          return updated;
        }

        // Match 2: Optimistic item by client_id or (sender + content + timestamp within 30s)
        const optIndex = prevList.findIndex((m) => {
          if (!m.is_optimistic && !m.client_id) return false;
          if (incomingMsg.client_id && m.client_id === incomingMsg.client_id) {
            return true;
          }
          if (
            m.sender_id === incomingMsg.sender_id &&
            m.content === incomingMsg.content &&
            Math.abs(
              new Date(m.created_at).getTime() - new Date(incomingMsg.created_at).getTime()
            ) < 30000
          ) {
            return true;
          }
          return false;
        });

        if (optIndex !== -1) {
          const updated = [...prevList];
          updated[optIndex] = {
            ...incomingMsg,
            status: incomingMsg.status || "delivered",
            is_optimistic: false,
          };
          return updated;
        }

        // Match 3: New record -> chronological append
        return [...prevList, incomingMsg];
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToBottom(true);
    };

    const channelName = `realtime_agency_chat_${conversationId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Postgres changes on `messages` table filtered by `conversation_id=eq.${conversationId}`
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (!payload.new) return;
        const raw = payload.new as any;
        const msg: ChatMessage = {
          id: raw.id,
          conversation_id: raw.conversation_id,
          sender_id: raw.sender_id,
          sender_name: raw.sender_id === activeUserId ? activeUserName : "Agency Rep",
          content: raw.content || raw.message || "",
          media_url: raw.media_url,
          media_type: raw.media_type,
          status: raw.is_read ? "read" : "delivered",
          created_at: raw.created_at || new Date().toISOString(),
          client_id: raw.client_id,
        };
        deduplicateAndMerge(msg);
      }
    );

    // Fast peer broadcast delivery
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      if (!payload) return;
      deduplicateAndMerge(payload as ChatMessage);
    });

    // Ephemeral typing indicator
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!payload) return;
      const typer = payload as TypingIndicator;
      if (typer.userId !== activeUserId) {
        if (typer.isTyping) {
          setActiveTypers((prev) => {
            const filtered = prev.filter((t) => t.userId !== typer.userId);
            return [...filtered, typer];
          });
        } else {
          setActiveTypers((prev) => prev.filter((t) => t.userId !== typer.userId));
        }
      }
    });

    // Read receipt broadcast
    channel.on("broadcast", { event: "read_receipt" }, ({ payload }) => {
      if (!payload) return;
      const { messageId } = payload as { messageId: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m.client_id === messageId
            ? { ...m, status: "read" }
            : m
        )
      );
    });

    channel.subscribe();

    // realtimeMessenger bridge
    const messengerUnsub = realtimeMessenger.subscribeToConversation(conversationId, {
      onMessage: (incoming) => {
        deduplicateAndMerge(incoming);
      },
      onTyping: (typers) => {
        setActiveTypers(typers.filter((t) => t.userId !== activeUserId));
      },
      onReadReceipt: (receipt) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === receipt.messageId || m.client_id === receipt.messageId
              ? { ...m, status: "read" }
              : m
          )
        );
      },
    });

    return () => {
      channel.unsubscribe();
      messengerUnsub();
    };
  }, [conversationId, activeUserId, activeUserName, scrollToBottom]);

  // 5. Keyboard Listener: Keeps latest message pinned to bottom on keyboard reveal
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        scrollToBottom(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        scrollToBottom(false);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // 6. Typing Input Handler
  const handleInputChange = (text: string) => {
    setMessageText(text);

    if (text.trim().length > 0) {
      realtimeMessenger.sendTypingState(conversationId, activeUserId, activeUserName, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        realtimeMessenger.sendTypingState(conversationId, activeUserId, activeUserName, false);
      }, 2500);
    } else {
      realtimeMessenger.sendTypingState(conversationId, activeUserId, activeUserName, false);
    }
  };

  // 7. Pick Image from Gallery or Camera
  const handlePickAttachment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachmentMenu(false);

    try {
      const result = await r2Service.pickAndUploadMedia("image", {
        quality: 0.8,
        allowsEditing: true,
        onProgress: (p: UploadProgress) => {
          setUploadProgress(p.progress);
        },
      });

      if (result.success && result.url) {
        setAttachmentUri(result.url);
        setAttachmentType("image");
      }
    } catch {
      try {
        const pickRes = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
        });

        if (!pickRes.canceled && pickRes.assets?.[0]?.uri) {
          setAttachmentUri(pickRes.assets[0].uri);
          setAttachmentType("image");
        }
      } catch (e: any) {
        Alert.alert("Attachment Failed", e.message || "Could not pick image");
      }
    } finally {
      setUploadProgress(null);
    }
  };

  // 8. Select or Create Location Pin
  const handleSelectLocationPin = (loc: LocationAttachment) => {
    Haptics.selectionAsync();
    setStagedLocation(loc);
    setShowLocationPicker(false);
    setShowAttachmentMenu(false);
    setIsCustomLocationMode(false);
  };

  const handleCreateCustomLocation = () => {
    if (!customLocTitle.trim() || !customLocAddress.trim()) {
      Alert.alert("Incomplete Location", "Please provide a location title and address.");
      return;
    }
    const [latStr, lngStr] = customLocCoords.split(",").map((s) => s.trim());
    const lat = parseFloat(latStr) || 23.8103;
    const lng = parseFloat(lngStr) || 90.4125;

    const newLoc: LocationAttachment = {
      type: "location",
      title: customLocTitle.trim(),
      address: customLocAddress.trim(),
      latitude: lat,
      longitude: lng,
      landmarkType: "custom",
    };

    setLocationsList((prev) => [newLoc, ...prev]);
    handleSelectLocationPin(newLoc);
    setCustomLocTitle("");
    setCustomLocAddress("");
  };

  // 9. Select or Create Booking Voucher
  const handleSelectBookingVoucher = (voucher: BookingVoucherAttachment) => {
    Haptics.selectionAsync();
    setStagedVoucher(voucher);
    setShowVoucherPicker(false);
    setShowAttachmentMenu(false);
    setIsCustomVoucherMode(false);
  };

  const handleCreateCustomVoucher = () => {
    if (!customTourName.trim() || !customVoucherCode.trim()) {
      Alert.alert("Incomplete Voucher", "Please provide a tour/booking title and voucher code.");
      return;
    }

    const newVoucher: BookingVoucherAttachment = {
      type: "voucher",
      voucherCode: customVoucherCode.trim().toUpperCase(),
      bookingRef: `BK-${Date.now().toString().slice(-6)}`,
      tourName: customTourName.trim(),
      category: "Custom",
      dates: "Confirmed Schedule",
      guestName: activeUserName,
      guestsCount: "1-2 Guests",
      totalAmount: customVoucherPrice.trim() ? `৳ ${customVoucherPrice.trim()}` : "৳ Paid",
      status: "CONFIRMED",
      agencyName: agencies.find((a) => a.id === selectedAgencyId)?.name || "Certified Agency",
    };

    setUserBookings((prev) => [newVoucher, ...prev]);
    handleSelectBookingVoucher(newVoucher);
    setCustomTourName("");
    setCustomVoucherCode("");
    setCustomVoucherPrice("");
  };

  // 10. Send Message with Deduplicated Optimistic State & Rich Payload Support
  const handleSend = async () => {
    const text = messageText.trim();
    const hasMedia = !!attachmentUri;
    const hasLocation = !!stagedLocation;
    const hasVoucher = !!stagedVoucher;

    if (!text && !hasMedia && !hasLocation && !hasVoucher) return;

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let finalContent = text;
    let finalMediaUrl = attachmentUri || undefined;
    let finalMediaType: ChatMessage["media_type"] = hasMedia ? "image" : undefined;

    if (replyingToMessage) {
      finalContent = `[রিপ্লাই: "${replyingToMessage.content.slice(0, 40)}..."]\n${finalContent}`;
      setReplyingToMessage(null);
    }

    if (hasLocation && stagedLocation) {
      finalContent = JSON.stringify(stagedLocation);
    } else if (hasVoucher && stagedVoucher) {
      finalContent = JSON.stringify(stagedVoucher);
    }

    // 1. Create optimistic message
    const optimisticMsg = realtimeMessenger.createOptimisticMessage(
      conversationId,
      activeUserId,
      finalContent,
      activeUserName,
      undefined,
      finalMediaUrl,
      finalMediaType
    );

    // 2. Append optimistic UI message immediately
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setAttachmentUri(null);
    setStagedLocation(null);
    setStagedVoucher(null);
    realtimeMessenger.sendTypingState(conversationId, activeUserId, activeUserName, false);
    scrollToBottom(true);

    try {
      // 3. Dispatch to Supabase Realtime & DB
      const confirmed = await realtimeMessenger.sendMessage(
        conversationId,
        activeUserId,
        optimisticMsg.content,
        {
          senderName: activeUserName,
          mediaUrl: finalMediaUrl,
          mediaType: finalMediaType,
          clientId: optimisticMsg.client_id,
        }
      );

      // 4. Merge confirmed server message seamlessly
      setMessages((prev) => realtimeMessenger.mergeMessages(prev, confirmed));

      // Automated agency concierge response & push notification simulation
      setTimeout(() => {
        const agencyName = selectedAgency?.name || "Shopno Jatra Concierge";
        const replyText = `ধন্যবাদ! আপনার বার্তা পেয়েছি। আমাদের স্পেশালিস্ট এখনই আপনার বুকিং ও তথ্য যাচাই করে নিশ্চিত করছেন।`;
        const autoMsg: ChatMessage = {
          id: `agency-reply-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: selectedAgencyId || "agency-concierge",
          sender_name: agencyName,
          content: replyText,
          status: "delivered",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === autoMsg.id)) return prev;
          return [...prev, autoMsg];
        });
        useNotificationStore.getState().addNotification({
          title: `${agencyName}: নতুন উত্তর এসেছে`,
          body: replyText,
          type: "chat",
          data: { conversationId, agencyId: selectedAgencyId },
        });
        setIncomingPushToast({
          title: `${agencyName} উত্তর দিয়েছেন`,
          body: replyText,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 5000);
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, status: "failed" } : m
        )
      );
      Alert.alert("Failed to send", "Message could not be delivered. Tap to retry.");
    } finally {
      setSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryFailedMessage = async (failedMsg: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m))
    );

    try {
      const confirmed = await realtimeMessenger.sendMessage(
        conversationId,
        activeUserId,
        failedMsg.content,
        {
          senderName: activeUserName,
          mediaUrl: failedMsg.media_url,
          mediaType: failedMsg.media_type,
          clientId: failedMsg.client_id || failedMsg.id,
        }
      );
      setMessages((prev) => realtimeMessenger.mergeMessages(prev, confirmed));

      // Automated agency concierge response & push notification simulation
      setTimeout(() => {
        const agencyName = selectedAgency?.name || "Shopno Jatra Concierge";
        const replyText = `ধন্যবাদ! আপনার বার্তা পেয়েছি। আমাদের স্পেশালিস্ট এখনই আপনার বুকিং ও তথ্য যাচাই করে নিশ্চিত করছেন।`;
        const autoMsg: ChatMessage = {
          id: `agency-reply-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: selectedAgencyId || "agency-concierge",
          sender_name: agencyName,
          content: replyText,
          status: "delivered",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === autoMsg.id)) return prev;
          return [...prev, autoMsg];
        });
        useNotificationStore.getState().addNotification({
          title: `${agencyName}: নতুন উত্তর এসেছে`,
          body: replyText,
          type: "chat",
          data: { conversationId, agencyId: selectedAgencyId },
        });
        setIncomingPushToast({
          title: `${agencyName} উত্তর দিয়েছেন`,
          body: replyText,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 5000);
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m))
      );
    }
  };

  // Open Coordinates in Native Maps
  const handleOpenMapCoordinates = (lat: number, lng: number, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scheme = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(scheme as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);

  // Render Read Receipt Status
  const renderReadReceipt = (status: ChatMessage["status"], msgItem?: ChatMessage) => {
    switch (status) {
      case "sending":
        return <Ionicons name="time-outline" size={13} color="#94A3B8" />;
      case "sent":
        return <Ionicons name="checkmark" size={14} color="#94A3B8" />;
      case "delivered":
        return <Ionicons name="checkmark-done" size={14} color="#94A3B8" />;
      case "read":
        return <Ionicons name="checkmark-done" size={14} color="#38BDF8" />;
      case "failed":
        return (
          <Pressable
            style={s.failedReceiptRow}
            onPress={() => msgItem && handleRetryFailedMessage(msgItem)}
            hitSlop={6}
          >
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={s.retryLinkText}>আবার পাঠান</Text>
          </Pressable>
        );
      default:
        return null;
    }
  };

  const handleLongPressMessage = (msg: ChatMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedActionMessage(msg);
    setShowActionMenuModal(true);
  };

  // Parse Rich Attachments
  const parseRichAttachment = (content: string): LocationAttachment | BookingVoucherAttachment | null => {
    if (!content || typeof content !== "string") return null;
    if (content.startsWith("{") && content.endsWith("}")) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.type === "location" || parsed.type === "voucher") {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  // Check if date header should be shown between messages
  const shouldShowDateHeader = (currentMsg: ChatMessage, prevMsg?: ChatMessage) => {
    if (!prevMsg) return true;
    const curDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return curDate !== prevDate;
  };

  const formatDateHeader = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (date.toDateString() === today) return "Today";
    if (date.toDateString() === yesterday) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <SafeAreaView style={s.shell} edges={["top", "left", "right"]}>
      {/* ─── Top Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </Pressable>

        <View style={s.agencyHeaderAvatar}>
          {selectedAgency?.logo_url ? (
            <Image source={{ uri: selectedAgency.logo_url }} style={s.headerLogo} />
          ) : (
            <Text style={s.avatarInitialText}>
              {(selectedAgency?.name || "TA").slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.title} numberOfLines={1}>
              {selectedAgency?.name || "Travel Concierge"}
            </Text>
            <Badge status="verified" size="sm" variant="subtle" label="Partner" />
          </View>
          <View style={s.onlineRow}>
            <View style={[s.onlineDot, !isAgencyOnline && { backgroundColor: "#94A3B8" }]} />
            <Text style={s.subtitle}>
              {activeTypers.length > 0 ? "টাইপ করছেন..." : (isAgencyOnline ? "অনলাইন • Online" : "অফলাইন • Offline")}
            </Text>
          </View>
        </View>

        {/* Audio / Video Calling Action Buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={s.callActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/screens/call" as any,
                params: {
                  callType: "audio",
                  targetName: selectedAgency?.name || "Agency Tour Rep",
                  targetAvatar: selectedAgency?.logo_url || "",
                  targetUserId: selectedAgencyId || "agency-rep",
                },
              });
            }}
          >
            <Ionicons name="call" size={18} color={PRIMARY} />
          </Pressable>

          <Pressable
            style={s.callActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/screens/call" as any,
                params: {
                  callType: "video",
                  targetName: selectedAgency?.name || "Agency Tour Rep",
                  targetAvatar: selectedAgency?.logo_url || "",
                  targetUserId: selectedAgencyId || "agency-rep",
                },
              });
            }}
          >
            <Ionicons name="videocam" size={18} color={PRIMARY} />
          </Pressable>
        </View>
      </View>

      {/* ─── In-App Push Notification Banner for Agency Reply ─ */}
      {incomingPushToast && (
        <Pressable
          style={s.pushToastBanner}
          onPress={() => setIncomingPushToast(null)}
        >
          <View style={s.pushToastIconWrap}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.pushToastTitle}>{incomingPushToast.title}</Text>
              <Text style={s.pushToastTime}>এখনই</Text>
            </View>
            <Text style={s.pushToastBody} numberOfLines={2}>
              {incomingPushToast.body}
            </Text>
          </View>
          <Pressable onPress={() => setIncomingPushToast(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color="#94A3B8" />
          </Pressable>
        </Pressable>
      )}

      {/* ─── Agency Response Time & Push Notification Banner ──────── */}
      <View style={s.agencyResponseCard}>
        <View style={s.agencyResponseRow}>
          <Ionicons name="time" size={14} color="#0284C7" />
          <Text style={s.agencyResponseText}>
            সাধারণত ১০ মিনিটে উত্তর দেয় (Usually replies in ~10 mins)
          </Text>
        </View>
        <View style={s.agencyPushNoticeRow}>
          <Ionicons name="notifications" size={13} color="#059669" />
          <Text style={s.agencyPushNoticeText}>
            উত্তর এলে পুশ নোটিফিকেশন পাবেন, অপেক্ষা করতে হবে না
          </Text>
        </View>
      </View>

      {/* ─── Agency Switcher Carousel ───────────────────────────── */}
      {agencies.length > 1 && (
        <View style={s.agencyPickerWrap}>
          <Text style={s.pickerLabel}>Switch Agency Concierge:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={agencies}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.pickerList}
            renderItem={({ item }) => {
              const active = item.id === selectedAgencyId;
              return (
                <Pressable
                  style={[s.agencyChip, active && s.agencyChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedAgencyId(item.id);
                  }}
                >
                  <Ionicons
                    name="business"
                    size={13}
                    color={active ? "#FFFFFF" : PRIMARY}
                  />
                  <Text style={[s.agencyChipText, active && s.agencyChipTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* ─── Messages List & Keyboard Avoiding View ─────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 46 : 0}
        style={s.keyboardWrap}
      >
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={s.loadingText}>Syncing real-time customer conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id ? String(item.id) : (item.client_id ? String(item.client_id) : `msg-${index}`)}
            contentContainerStyle={s.listContent}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            renderItem={({ item, index }) => {
              const prevMsg = index > 0 ? messages[index - 1] : undefined;
              const showDate = shouldShowDateHeader(item, prevMsg);
              const isMe = item.sender_id === activeUserId;
              const richPayload = parseRichAttachment(item.content);

              return (
                <View key={item.id || item.client_id || index}>
                  {/* Date Separator Pill */}
                  {showDate && (
                    <View style={s.datePillRow}>
                      <View style={s.datePill}>
                        <Text style={s.datePillText}>{formatDateHeader(item.created_at)}</Text>
                      </View>
                    </View>
                  )}

                  <View
                    style={[
                      s.messageRow,
                      isMe ? s.messageRowMe : s.messageRowOther,
                    ]}
                  >
                    {!isMe && (
                      <View style={s.bubbleAvatar}>
                        {selectedAgency?.logo_url ? (
                          <Image source={{ uri: selectedAgency.logo_url }} style={s.bubbleAvatarImg} />
                        ) : (
                          <Ionicons name="business" size={14} color={PRIMARY} />
                        )}
                      </View>
                    )}

                    <Pressable
                      onLongPress={() => handleMessageLongPress(item)}
                      delayLongPress={280}
                      style={({ pressed }) => [
                        s.bubbleCard,
                        isMe ? s.bubbleMe : s.bubbleOther,
                        richPayload?.type === "voucher" && s.bubbleVoucherCard,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      {!isMe && (
                        <Text style={s.senderNameLabel}>{item.sender_name || "Agency"}</Text>
                      )}

                      {/* 1. Rich Attachment: Image Preview with Fullscreen Viewer */}
                      {item.media_url && (
                        <Pressable
                          style={s.mediaPreviewWrap}
                          onPress={() => setFullscreenImageUri(item.media_url!)}
                        >
                          <Image
                            source={{ uri: item.media_url }}
                            style={s.mediaBubbleImg}
                            resizeMode="cover"
                          />
                          <View style={s.imageZoomIcon}>
                            <Ionicons name="expand" size={14} color="#FFFFFF" />
                          </View>
                        </Pressable>
                      )}

                      {/* 2. Rich Attachment: Location Pin Card */}
                      {richPayload?.type === "location" ? (
                        <View style={s.locationCard}>
                          <View style={s.locationHeaderRow}>
                            <View style={s.locationIconBadge}>
                              <Ionicons name="location" size={16} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.locationVerifiedTag}>VERIFIED MEETING PIN</Text>
                              <Text style={s.locationTitleText}>{richPayload.title}</Text>
                            </View>
                          </View>

                          <Text style={s.locationAddressText}>{richPayload.address}</Text>

                          <View style={s.coordsBadge}>
                            <Ionicons name="navigate-outline" size={12} color="#2563EB" />
                            <Text style={s.coordsText}>
                              {richPayload.latitude.toFixed(4)}° N, {richPayload.longitude.toFixed(4)}° E
                            </Text>
                          </View>

                          <Pressable
                            style={s.openMapBtn}
                            onPress={() =>
                              handleOpenMapCoordinates(
                                richPayload.latitude,
                                richPayload.longitude,
                                richPayload.title
                              )
                            }
                          >
                            <Ionicons name="map-outline" size={14} color="#FFFFFF" />
                            <Text style={s.openMapBtnText}>Open in Maps</Text>
                          </Pressable>
                        </View>
                      ) : richPayload?.type === "voucher" ? (
                        /* 3. Rich Attachment: Booking Voucher Card */
                        <View style={s.voucherCard}>
                          <View style={s.voucherHeader}>
                            <View style={s.voucherHeaderBadge}>
                              <Ionicons name="ticket" size={13} color="#2563EB" />
                              <Text style={s.voucherHeaderText}>OFFICIAL BOOKING VOUCHER</Text>
                            </View>
                            <View style={s.voucherStatusPill}>
                              <Text style={s.voucherStatusText}>{richPayload.status}</Text>
                            </View>
                          </View>

                          <Text style={s.voucherTourTitle}>{richPayload.tourName}</Text>

                          <View style={s.voucherDetailsGrid}>
                            <View style={s.voucherGridItem}>
                              <Text style={s.voucherGridLabel}>VOUCHER NO</Text>
                              <Text style={s.voucherGridValue}>{richPayload.voucherCode}</Text>
                            </View>
                            <View style={s.voucherGridItem}>
                              <Text style={s.voucherGridLabel}>CATEGORY</Text>
                              <Text style={s.voucherGridValue}>{richPayload.category}</Text>
                            </View>
                            <View style={s.voucherGridItem}>
                              <Text style={s.voucherGridLabel}>TRAVEL DATES</Text>
                              <Text style={s.voucherGridValue}>{richPayload.dates}</Text>
                            </View>
                            <View style={s.voucherGridItem}>
                              <Text style={s.voucherGridLabel}>GUESTS</Text>
                              <Text style={s.voucherGridValue}>{richPayload.guestsCount}</Text>
                            </View>
                          </View>

                          <View style={s.voucherDividerRow}>
                            <View style={s.notchLeft} />
                            <View style={s.dashedLine} />
                            <View style={s.notchRight} />
                          </View>

                          <View style={s.voucherFooterRow}>
                            <View>
                              <Text style={s.voucherTotalLabel}>TOTAL PAID</Text>
                              <Text style={s.voucherTotalValue}>{richPayload.totalAmount}</Text>
                            </View>

                            <Pressable
                              style={s.viewVoucherBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveVoucherDetails(richPayload);
                              }}
                            >
                              <Ionicons name="qr-code-outline" size={14} color="#FFFFFF" />
                              <Text style={s.viewVoucherBtnText}>View Voucher</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        /* Standard Text Message */
                        item.content.length > 0 && (
                          <Text style={[s.messageText, isMe && s.messageTextMe]}>
                            {item.content}
                          </Text>
                        )
                      )}

                      <View style={s.bubbleFooter}>
                        <Text style={[s.timeText, isMe && s.timeTextMe]}>
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        {isMe && renderReadReceipt(item.status, item)}
                      </View>
                    </Pressable>

                    {/* Retry button for failed messages */}
                    {item.status === "failed" && isMe && (
                      <Pressable
                        style={s.retryBtn}
                        onPress={() => handleRetryFailedMessage(item)}
                      >
                        <Ionicons name="refresh" size={16} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* ─── Typing Indicator Bar ────────────────────────────── */}
        {activeTypers.length > 0 && (
          <View style={s.typingRow}>
            <View style={s.typingDotBox}>
              <View style={[s.typingDot, s.typingDot1]} />
              <View style={[s.typingDot, s.typingDot2]} />
              <View style={[s.typingDot, s.typingDot3]} />
            </View>
            <Text style={s.typingText}>
              {selectedAgency?.name || "Agency"} is typing...
            </Text>
          </View>
        )}

        {/* ─── Staged Image Attachment Preview ─────────────────── */}
        {attachmentUri && (
          <View style={s.attachmentPreviewBox}>
            <Image source={{ uri: attachmentUri }} style={s.attachmentThumbnail} />
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={s.attachmentName}>Photo attached</Text>
              <Text style={s.attachmentReady}>Ready to send with conversation</Text>
            </View>
            <Pressable
              onPress={() => setAttachmentUri(null)}
              style={s.removeAttachmentBtn}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* ─── Staged Location Pin Preview ──────────────────────── */}
        {stagedLocation && (
          <View style={s.attachmentPreviewBox}>
            <View style={[s.attachmentThumbnail, s.locationThumbnail]}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={s.attachmentName}>Location Pin Staged</Text>
              <Text style={s.attachmentReady} numberOfLines={1}>
                {stagedLocation.title}
              </Text>
            </View>
            <Pressable
              onPress={() => setStagedLocation(null)}
              style={s.removeAttachmentBtn}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* ─── Staged Booking Voucher Preview ───────────────────── */}
        {stagedVoucher && (
          <View style={s.attachmentPreviewBox}>
            <View style={[s.attachmentThumbnail, s.voucherThumbnail]}>
              <Ionicons name="ticket" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={s.attachmentName}>Booking Voucher Staged</Text>
              <Text style={s.attachmentReady} numberOfLines={1}>
                {stagedVoucher.tourName} ({stagedVoucher.voucherCode})
              </Text>
            </View>
            <Pressable
              onPress={() => setStagedVoucher(null)}
              style={s.removeAttachmentBtn}
            >
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* ─── Upload Progress Bar ────────────────────────────── */}
        {uploadProgress !== null && (
          <View style={s.uploadProgressBar}>
            <View style={[s.uploadProgressFill, { width: `${uploadProgress}%` }]} />
            <Text style={s.uploadProgressText}>Uploading media {uploadProgress}%</Text>
          </View>
        )}

        {/* ─── Quick Prompt Chips ──────────────────────────────── */}
        <View style={s.quickPromptsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickPromptsContent}>
            {[
              { label: "Share Pickup Pin 📍", action: () => setShowLocationPicker(true) },
              { label: "Send Voucher 🎟️", action: () => setShowVoucherPicker(true) },
              { label: "Flight Details ✈️", text: "Could you please check our flight departure status?" },
              { label: "Hotel Check-in 🏨", text: "What time is standard hotel check-in today?" },
            ].map((chip) => (
              <Pressable
                key={chip.label}
                style={s.quickPromptChip}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (chip.action) {
                    chip.action();
                  } else if (chip.text) {
                    setMessageText(chip.text);
                  }
                }}
              >
                <Text style={s.quickPromptText}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ─── Attachment Selection Tray (Expandable) ─────────── */}
        {showAttachmentMenu && (
          <View style={s.attachmentActionTray}>
            <Pressable style={s.actionTrayItem} onPress={handlePickAttachment}>
              <View style={[s.actionTrayCircle, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="image" size={22} color={PRIMARY} />
              </View>
              <Text style={s.actionTrayLabel}>Photo</Text>
            </Pressable>

            <Pressable
              style={s.actionTrayItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLocationPicker(true);
              }}
            >
              <View style={[s.actionTrayCircle, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="location" size={22} color="#D97706" />
              </View>
              <Text style={s.actionTrayLabel}>Location</Text>
            </Pressable>

            <Pressable
              style={s.actionTrayItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowVoucherPicker(true);
              }}
            >
              <View style={[s.actionTrayCircle, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="ticket" size={22} color="#059669" />
              </View>
              <Text style={s.actionTrayLabel}>Voucher</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Replying To Preview Banner ─────────────────────── */}
        {replyingToMessage && (
          <View style={s.replyingPreviewBar}>
            <View style={s.replyingBarLeft}>
              <Ionicons name="return-up-back" size={16} color={PRIMARY} />
              <View style={{ flex: 1 }}>
                <Text style={s.replyingToName}>
                  Replying to {replyingToMessage.sender_name || "message"}
                </Text>
                <Text style={s.replyingSnippet} numberOfLines={1}>
                  {replyingToMessage.content}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setReplyingToMessage(null)}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          </View>
        )}

        {/* ─── Message Input Composer ─────────────────────────── */}
        <View style={s.inputRow}>
          <Pressable
            style={[s.attachBtn, showAttachmentMenu && s.attachBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAttachmentMenu(!showAttachmentMenu);
            }}
            disabled={uploadProgress !== null}
          >
            <Ionicons
              name={showAttachmentMenu ? "close" : "add"}
              size={24}
              color={showAttachmentMenu ? "#EF4444" : "#64748B"}
            />
          </Pressable>

          <TextInput
            placeholder={`Message ${selectedAgency?.name || "concierge"}...`}
            placeholderTextColor="#94A3B8"
            style={s.input}
            value={messageText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
            onFocus={() => scrollToBottom(true)}
          />

          <Pressable
            style={[
              s.sendBtn,
              !messageText.trim() &&
                !attachmentUri &&
                !stagedLocation &&
                !stagedVoucher &&
                s.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={
              (!messageText.trim() &&
                !attachmentUri &&
                !stagedLocation &&
                !stagedVoucher) ||
              sending
            }
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Modal 1: Location Pin Picker Modal (Preset + Custom) ── */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.pickerSheetContainer}>
            <View style={s.pickerSheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="location" size={20} color="#D97706" />
                <Text style={s.pickerSheetTitle}>Share Location Pin</Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowLocationPicker(false);
                  setIsCustomLocationMode(false);
                }}
                style={s.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Custom Location Toggle */}
            <View style={s.modeToggleRow}>
              <Pressable
                style={[s.modeToggleBtn, !isCustomLocationMode && s.modeToggleBtnActive]}
                onPress={() => setIsCustomLocationMode(false)}
              >
                <Text style={[s.modeToggleText, !isCustomLocationMode && s.modeToggleTextActive]}>
                  Verified Transit Points
                </Text>
              </Pressable>
              <Pressable
                style={[s.modeToggleBtn, isCustomLocationMode && s.modeToggleBtnActive]}
                onPress={() => setIsCustomLocationMode(true)}
              >
                <Text style={[s.modeToggleText, isCustomLocationMode && s.modeToggleTextActive]}>
                  + Custom Pin
                </Text>
              </Pressable>
            </View>

            {isCustomLocationMode ? (
              <View style={s.customInputBox}>
                <Text style={s.customInputLabel}>Location Title</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="e.g. Hotel Lobby, Terminal 2 Entrance"
                  placeholderTextColor="#94A3B8"
                  value={customLocTitle}
                  onChangeText={setCustomLocTitle}
                />

                <Text style={s.customInputLabel}>Detailed Address</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="e.g. Gulshan Avenue, Dhaka"
                  placeholderTextColor="#94A3B8"
                  value={customLocAddress}
                  onChangeText={setCustomLocAddress}
                />

                <Text style={s.customInputLabel}>GPS Coordinates (Latitude, Longitude)</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="23.8103, 90.4125"
                  placeholderTextColor="#94A3B8"
                  value={customLocCoords}
                  onChangeText={setCustomLocCoords}
                />

                <Pressable
                  style={s.createCustomBtn}
                  onPress={handleCreateCustomLocation}
                >
                  <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                  <Text style={s.createCustomBtnText}>Attach Custom Location</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {locationsList.map((loc) => (
                  <Pressable
                    key={loc.title}
                    style={s.presetItemRow}
                    onPress={() => handleSelectLocationPin(loc)}
                  >
                    <View style={s.presetIconCircle}>
                      <Ionicons
                        name={
                          loc.landmarkType === "airport"
                            ? "airplane"
                            : loc.landmarkType === "office"
                            ? "business"
                            : loc.landmarkType === "meeting_point"
                            ? "people"
                            : "compass"
                        }
                        size={18}
                        color="#2563EB"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.presetItemTitle}>{loc.title}</Text>
                      <Text style={s.presetItemSubtitle}>{loc.address}</Text>
                      <Text style={s.presetItemCoords}>
                        {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal 2: Booking Voucher Picker Modal (Real DB + Custom) */}
      <Modal
        visible={showVoucherPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoucherPicker(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.pickerSheetContainer}>
            <View style={s.pickerSheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="ticket" size={20} color="#059669" />
                <Text style={s.pickerSheetTitle}>Attach Booking Voucher</Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowVoucherPicker(false);
                  setIsCustomVoucherMode(false);
                }}
                style={s.pickerCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Custom Voucher Mode Toggle */}
            <View style={s.modeToggleRow}>
              <Pressable
                style={[s.modeToggleBtn, !isCustomVoucherMode && s.modeToggleBtnActive]}
                onPress={() => setIsCustomVoucherMode(false)}
              >
                <Text style={[s.modeToggleText, !isCustomVoucherMode && s.modeToggleTextActive]}>
                  My Active Bookings ({userBookings.length})
                </Text>
              </Pressable>
              <Pressable
                style={[s.modeToggleBtn, isCustomVoucherMode && s.modeToggleBtnActive]}
                onPress={() => setIsCustomVoucherMode(true)}
              >
                <Text style={[s.modeToggleText, isCustomVoucherMode && s.modeToggleTextActive]}>
                  + Enter Voucher Code
                </Text>
              </Pressable>
            </View>

            {isCustomVoucherMode ? (
              <View style={s.customInputBox}>
                <Text style={s.customInputLabel}>Voucher / Reference Code</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="e.g. VCH-SJ-99412 or BK-2026-001"
                  placeholderTextColor="#94A3B8"
                  value={customVoucherCode}
                  onChangeText={setCustomVoucherCode}
                  autoCapitalize="characters"
                />

                <Text style={s.customInputLabel}>Package or Stay Name</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="e.g. Sajek Cloud Camp or Cox's Bazar Villa"
                  placeholderTextColor="#94A3B8"
                  value={customTourName}
                  onChangeText={setCustomTourName}
                />

                <Text style={s.customInputLabel}>Total Paid Amount (Optional)</Text>
                <TextInput
                  style={s.customTextInput}
                  placeholder="e.g. 18,500"
                  placeholderTextColor="#94A3B8"
                  value={customVoucherPrice}
                  onChangeText={setCustomVoucherPrice}
                  keyboardType="numeric"
                />

                <Pressable
                  style={s.createCustomBtn}
                  onPress={handleCreateCustomVoucher}
                >
                  <Ionicons name="ticket-outline" size={16} color="#FFFFFF" />
                  <Text style={s.createCustomBtnText}>Attach Booking Voucher</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {userBookings.map((voucher) => (
                  <Pressable
                    key={voucher.voucherCode}
                    style={s.voucherPickRow}
                    onPress={() => handleSelectBookingVoucher(voucher)}
                  >
                    <View style={s.voucherPickLeft}>
                      <View style={s.voucherPickIconWrap}>
                        <Ionicons name="airplane" size={16} color="#FFFFFF" />
                      </View>
                    </View>

                    <View style={{ flex: 1, paddingStart: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={s.voucherCodeText}>{voucher.voucherCode}</Text>
                        <Text style={s.voucherAmountPill}>{voucher.totalAmount}</Text>
                      </View>
                      <Text style={s.voucherTitlePick}>{voucher.tourName}</Text>
                      <Text style={s.voucherMetaPick}>
                        {voucher.dates} • {voucher.guestsCount}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal 3: Fullscreen Voucher Details Inspection ───── */}
      <Modal
        visible={!!activeVoucherDetails}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveVoucherDetails(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.fullVoucherDialog}>
            <View style={s.fullVoucherHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="ticket-outline" size={24} color="#2563EB" />
                <Text style={s.fullVoucherTitle}>Confirmed E-Voucher Pass</Text>
              </View>
              <Pressable onPress={() => setActiveVoucherDetails(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {activeVoucherDetails && (
              <ScrollView style={{ padding: 16 }}>
                <View style={s.passHeroBox}>
                  <Text style={s.passAgencyName}>{activeVoucherDetails.agencyName}</Text>
                  <Text style={s.passTourName}>{activeVoucherDetails.tourName}</Text>
                  <View style={s.passStatusBadge}>
                    <Text style={s.passStatusBadgeText}>{activeVoucherDetails.status}</Text>
                  </View>
                </View>

                <View style={s.passDataGrid}>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>GUEST NAME</Text>
                    <Text style={s.passCellValue}>{activeVoucherDetails.guestName}</Text>
                  </View>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>BOOKING REF</Text>
                    <Text style={s.passCellValue}>{activeVoucherDetails.bookingRef}</Text>
                  </View>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>DATES</Text>
                    <Text style={s.passCellValue}>{activeVoucherDetails.dates}</Text>
                  </View>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>CAPACITY</Text>
                    <Text style={s.passCellValue}>{activeVoucherDetails.guestsCount}</Text>
                  </View>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>VOUCHER CODE</Text>
                    <Text style={s.passCellValue}>{activeVoucherDetails.voucherCode}</Text>
                  </View>
                  <View style={s.passGridCell}>
                    <Text style={s.passCellLabel}>TOTAL FARE</Text>
                    <Text style={[s.passCellValue, { color: "#10B981" }]}>
                      {activeVoucherDetails.totalAmount}
                    </Text>
                  </View>
                </View>

                {/* Simulated QR Code Box */}
                <View style={s.qrSimBox}>
                  <Ionicons name="qr-code" size={100} color="#0F172A" />
                  <Text style={s.qrSimLabel}>Scan at Concierge Check-in Desk</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Modal 4: Fullscreen Image Zoom ────────────────────── */}
      <Modal
        visible={!!fullscreenImageUri}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFullscreenImageUri(null)}
      >
        <View style={s.imageZoomBackdrop}>
          <SafeAreaView style={s.imageZoomHeader} edges={["top"]}>
            <Pressable
              style={s.imageZoomCloseBtn}
              onPress={() => setFullscreenImageUri(null)}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>

          {fullscreenImageUri && (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={s.fullscreenZoomImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ─── Message Long-Press Context Menu Modal ───────────── */}
      <Modal
        visible={!!selectedContextMenuMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedContextMenuMsg(null)}
      >
        <Pressable
          style={s.contextMenuBackdrop}
          onPress={() => setSelectedContextMenuMsg(null)}
        >
          {selectedContextMenuMsg && (
            <View style={s.contextMenuCard}>
              <View style={s.contextMenuHeader}>
                <Text style={s.contextMenuHeaderTitle}>Message Actions</Text>
                <Text style={s.contextMenuSnippet} numberOfLines={2}>
                  "{selectedContextMenuMsg.content}"
                </Text>
              </View>

              <View style={s.contextMenuActions}>
                <Pressable
                  style={s.contextMenuItem}
                  onPress={() => handleCopyMessage(selectedContextMenuMsg)}
                >
                  <Ionicons name="copy-outline" size={18} color="#0F172A" />
                  <Text style={s.contextMenuItemText}>কপি করুন (Copy)</Text>
                </Pressable>

                <Pressable
                  style={s.contextMenuItem}
                  onPress={() => handleReplyMessage(selectedContextMenuMsg)}
                >
                  <Ionicons name="arrow-undo-outline" size={18} color="#287DFA" />
                  <Text style={[s.contextMenuItemText, { color: "#287DFA" }]}>উত্তর দিন (Reply)</Text>
                </Pressable>

                {selectedContextMenuMsg.status === "failed" && (
                  <Pressable
                    style={s.contextMenuItem}
                    onPress={() => {
                      const msg = selectedContextMenuMsg;
                      setSelectedContextMenuMsg(null);
                      handleRetryFailedMessage(msg);
                    }}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#D97706" />
                    <Text style={[s.contextMenuItemText, { color: "#D97706" }]}>পুনরায় পাঠান (Retry)</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[s.contextMenuItem, { borderBottomWidth: 0 }]}
                  onPress={() => handleDeleteMessage(selectedContextMenuMsg)}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={[s.contextMenuItemText, { color: "#DC2626" }]}>মুছে ফেলুন (Delete)</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 4 },
  agencyHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitialText: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
  },
  headerLogo: { width: 42, height: 42 },
  title: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#10B981" },
  subtitle: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  callActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  agencyPickerWrap: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  pickerList: { paddingHorizontal: 16, gap: 8 },
  agencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  agencyChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  agencyChipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  agencyChipTextActive: { color: "#FFFFFF" },
  keyboardWrap: { flex: 1 },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  listContent: { padding: 16, paddingBottom: 24 },
  datePillRow: { alignItems: "center", marginVertical: 12 },
  datePill: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  datePillText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  messageRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end", gap: 8 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bubbleAvatarImg: { width: 28, height: 28 },
  bubbleCard: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleVoucherCard: {
    maxWidth: "92%",
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  bubbleMe: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  senderNameLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
  },
  messageText: { fontSize: 14, color: "#1E293B", lineHeight: 20 },
  messageTextMe: { color: "#FFFFFF" },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
  },
  timeText: { fontSize: 12, color: "#94A3B8" },
  timeTextMe: { color: "rgba(255, 255, 255, 0.75)" },
  retryBtn: { padding: 4, marginBottom: 4 },
  mediaPreviewWrap: {
    width: 220,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  mediaBubbleImg: { width: "100%", height: "100%" },
  imageZoomIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
  },
  typingDotBox: { flexDirection: "row", gap: 3 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#64748B" },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1.0 },
  typingText: { fontSize: 12, color: "#64748B", fontStyle: "italic" },
  attachmentPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  attachmentThumbnail: { width: 44, height: 44, borderRadius: 8 },
  locationThumbnail: {
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  voucherThumbnail: {
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  attachmentReady: { fontSize: 12, color: "#64748B" },
  removeAttachmentBtn: { padding: 4 },
  uploadProgressBar: {
    height: 18,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
  },
  uploadProgressFill: { height: "100%", backgroundColor: PRIMARY },
  uploadProgressText: {
    position: "absolute",
    alignSelf: "center",
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  quickPromptsBar: { backgroundColor: "#FFFFFF", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  quickPromptsContent: { paddingHorizontal: 14, gap: 8 },
  quickPromptChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickPromptText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  attachmentActionTray: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  actionTrayItem: { alignItems: "center", gap: 4 },
  actionTrayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTrayLabel: { fontSize: 12, fontWeight: "600", color: "#475569" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnActive: { backgroundColor: "#FEE2E2" },
  input: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0F172A",
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Location Pin Card Styles
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 240,
  },
  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  locationIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  locationVerifiedTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.5,
  },
  locationTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 17,
  },
  locationAddressText: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 15,
    marginBottom: 8,
  },
  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  coordsText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openMapBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  // Booking Voucher Card Styles
  voucherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
    width: 270,
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#DBEAFE",
  },
  voucherHeaderBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  voucherHeaderText: { fontSize: 12, fontWeight: "800", color: "#1D4ED8" },
  replyingPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyingBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginEnd: 10,
  },
  replyingToName: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },
  replyingSnippet: {
    fontSize: 12,
    color: "#64748B",
  },
  contextMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contextMenuCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 10px 16px rgba(15, 23, 42, 0.2)" } : {}),
  },
  contextMenuHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 8,
  },
  contextMenuHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  contextMenuSnippet: {
    fontSize: 13,
    color: "#334155",
    marginTop: 4,
    fontStyle: "italic",
  },
  contextMenuActions: {
    gap: 2,
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  contextMenuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  voucherStatusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  voucherStatusText: { fontSize: 12, fontWeight: "800", color: "#15803D" },
  voucherTourTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  voucherDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  voucherGridItem: { width: "47%" },
  voucherGridLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  voucherGridValue: { fontSize: 12, fontWeight: "600", color: "#1E293B" },
  voucherDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    position: "relative",
  },
  notchLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    marginStart: -6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
  },
  notchRight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F8FAFC",
    marginEnd: -6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  voucherFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  voucherTotalLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  voucherTotalValue: { fontSize: 14, fontWeight: "900", color: "#0F172A" },
  viewVoucherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewVoucherBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  // Modals Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  pickerSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  pickerSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  pickerCloseBtn: { padding: 4 },
  modeToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 10,
  },
  modeToggleBtnActive: { backgroundColor: "#FFFFFF" },
  modeToggleText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  modeToggleTextActive: { color: "#0F172A", fontWeight: "800" },
  customInputBox: { paddingVertical: 6 },
  customInputLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 4, marginTop: 8 },
  customTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  createCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  createCustomBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  presetItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  presetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  presetItemTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  presetItemSubtitle: { fontSize: 12, color: "#64748B", marginTop: 1 },
  presetItemCoords: { fontSize: 12, color: "#2563EB", fontWeight: "600", marginTop: 2 },

  // Voucher Picker Item
  voucherPickRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  voucherPickLeft: { justifyContent: "center" },
  voucherPickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  voucherCodeText: { fontSize: 12, fontWeight: "800", color: "#059669" },
  voucherAmountPill: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  voucherTitlePick: { fontSize: 13, fontWeight: "700", color: "#0F172A", marginTop: 2 },
  voucherMetaPick: { fontSize: 12, color: "#64748B", marginTop: 2 },

  // Fullscreen Voucher Dialog
  fullVoucherDialog: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "85%",
  },
  fullVoucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  fullVoucherTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  passHeroBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  passAgencyName: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  passTourName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  passStatusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  passStatusBadgeText: { fontSize: 12, fontWeight: "800", color: "#166534" },
  passDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  passGridCell: { width: "46%" },
  passCellLabel: { fontSize: 12, fontWeight: "800", color: "#94A3B8" },
  passCellValue: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginTop: 2 },
  qrSimBox: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  qrSimLabel: { fontSize: 12, color: "#64748B", fontWeight: "600", marginTop: 8 },

  // Fullscreen Image Zoom
  imageZoomBackdrop: { flex: 1, backgroundColor: "#000000", justifyContent: "center" },
  imageZoomHeader: { position: "absolute", top: 10, right: 16, zIndex: 10 },
  imageZoomCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenZoomImg: { width: "100%", height: "85%" },
  failedReceiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginStart: 4,
  },
  retryLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  agencyResponseCard: {
    backgroundColor: "#F0F9FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BAE6FD",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  agencyResponseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  agencyResponseText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
  },
  agencyPushNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  agencyPushNoticeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  pushToastBanner: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === "web" ? { boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.25)" } : {}),
  },
  pushToastIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  pushToastTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pushToastTime: {
    fontSize: 10,
    color: "#94A3B8",
  },
  pushToastBody: {
    fontSize: 12,
    color: "#CBD5E1",
    marginTop: 2,
  },
});
